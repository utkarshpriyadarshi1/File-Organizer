package in.updev.fileorganizer.services;

import in.updev.fileorganizer.entities.SyncJob;
import in.updev.fileorganizer.enums.SyncType;
import in.updev.fileorganizer.enums.TaskType;
import in.updev.fileorganizer.repositories.SyncJobRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SyncService {
    private static final Logger logger = LoggerFactory.getLogger(SyncService.class);

    private final SyncJobRepository syncJobRepository;
    private final SqliteWriteQueueService sqliteWriteQueueService;
    private final AuditLogService auditLogService;
    private final BackgroundTaskManager backgroundTaskManager;
    private final SecureStorageService secureStorageService;

    public SyncJob createSyncJob(String sourceFolder, String destinationFolder, String syncTypeStr) throws Exception {
        SyncJob job = SyncJob.builder()
                .jobName("Sync " + LocalDateTime.now())
                .sourcePath(sourceFolder)
                .destinationPath(destinationFolder)
                .syncType(syncTypeStr != null ? SyncType.valueOf(syncTypeStr.toUpperCase()) : SyncType.ONE_WAY)
                .status("CREATED")
                .createdAt(LocalDateTime.now())
                .build();
        return sqliteWriteQueueService.executeWrite(() -> syncJobRepository.save(job));
    }

    public String runSyncJob(Long jobId) {
        SyncJob job = syncJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Sync job not found: " + jobId));

        return backgroundTaskManager.submitTask(TaskType.SYNC, (taskId, reporter) -> {
            sqliteWriteQueueService.executeWrite(() -> {
                job.setStatus("RUNNING");
                return syncJobRepository.save(job);
            });

            Path sourcePath = Paths.get(job.getSourcePath());
            Path destPath = Paths.get(job.getDestinationPath());

            if (!Files.exists(sourcePath) || !Files.isDirectory(sourcePath)) {
                throw new IOException("Source path is invalid or is not a directory.");
            }
            Files.createDirectories(destPath);

            if (SyncType.TWO_WAY == job.getSyncType()) {
                runTwoWaySync(sourcePath, destPath, reporter);
            } else {
                runOneWaySync(sourcePath, destPath, reporter);
            }

            sqliteWriteQueueService.executeWrite(() -> {
                job.setStatus("COMPLETED");
                job.setLastRun(LocalDateTime.now());
                return syncJobRepository.save(job);
            });

            auditLogService.logAction("SYNC_JOB_COMPLETED", null, "Sync job completed: " + job.getJobName());
        });
    }

    private void runOneWaySync(Path source, Path destination, BackgroundTaskManager.TaskProgressReporter reporter) throws IOException {
        List<Path> allFiles = new ArrayList<>();
        Files.walkFileTree(source, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                String name = dir.getFileName() != null ? dir.getFileName().toString() : "";
                if (name.equals("node_modules") || name.equals(".git") || name.equals("target") || name.equals(".idea") || name.equals("build")) {
                    return FileVisitResult.SKIP_SUBTREE;
                }
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                if (attrs.isRegularFile()) {
                    allFiles.add(file);
                }
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFileFailed(Path file, IOException exc) throws IOException {
                logger.warn("Sync scan (source) skipping path due to restriction: {} ({})", file, exc.getMessage());
                Map<String, Object> errorItem = new HashMap<>();
                errorItem.put("filePath", file.toAbsolutePath().toString());
                errorItem.put("action", "SYNC_SKIP");
                errorItem.put("failed", true);
                errorItem.put("error", "Access Denied (Source): " + exc.getMessage());
                reporter.appendResult(errorItem);
                return FileVisitResult.CONTINUE;
            }
        });

        int total = allFiles.size();
        int count = 0;

        for (Path file : allFiles) {
            if (reporter.isCancelled()) break;

            Map<String, Object> fileResult = new HashMap<>();
            fileResult.put("filePath", file.toAbsolutePath().toString());

            try {
                Path rel = source.relativize(file);
                Path target = destination.resolve(rel);
                Files.createDirectories(target.getParent());

                boolean copyRequired = true;
                if (Files.exists(target)) {
                    long sourceSize = Files.size(file);
                    long targetSize = Files.size(target);
                    long sourceTime = Files.getLastModifiedTime(file).toMillis();
                    long targetTime = Files.getLastModifiedTime(target).toMillis();

                    if (sourceSize == targetSize && Math.abs(sourceTime - targetTime) < 2000) {
                        copyRequired = false;
                    }
                }

                if (copyRequired) {
                    secureStorageService.secureCopy(file, target, false, null);
                    fileResult.put("action", "COPY");
                } else {
                    fileResult.put("action", "SKIP");
                }
                fileResult.put("failed", false);
            } catch (Exception e) {
                logger.error("Error in sync copy: {}", file, e);
                fileResult.put("failed", true);
                fileResult.put("error", e.getMessage());
            }

            reporter.appendResult(fileResult);
            count++;
            reporter.reportProgress(((double) count / total) * 100, "Synced: " + file.getFileName());
        }

        // Delete target files not in source (mirroring)
        List<Path> destFiles = new ArrayList<>();
        Files.walkFileTree(destination, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                String name = dir.getFileName() != null ? dir.getFileName().toString() : "";
                if (name.equals("node_modules") || name.equals(".git") || name.equals("target") || name.equals(".idea") || name.equals("build")) {
                    return FileVisitResult.SKIP_SUBTREE;
                }
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                if (attrs.isRegularFile()) {
                    destFiles.add(file);
                }
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFileFailed(Path file, IOException exc) throws IOException {
                logger.warn("Sync scan (destination) skipping path due to restriction: {} ({})", file, exc.getMessage());
                Map<String, Object> errorItem = new HashMap<>();
                errorItem.put("filePath", file.toAbsolutePath().toString());
                errorItem.put("action", "CLEANUP_SKIP");
                errorItem.put("failed", true);
                errorItem.put("error", "Access Denied (Destination): " + exc.getMessage());
                reporter.appendResult(errorItem);
                return FileVisitResult.CONTINUE;
            }
        });

        for (Path target : destFiles) {
            if (reporter.isCancelled()) break;
            try {
                Path rel = destination.relativize(target);
                Path file = source.resolve(rel);
                if (!Files.exists(file)) {
                    Files.delete(target);
                    Map<String, Object> fileResult = new HashMap<>();
                    fileResult.put("filePath", target.toAbsolutePath().toString());
                    fileResult.put("action", "DELETE");
                    fileResult.put("failed", false);
                    reporter.appendResult(fileResult);
                }
            } catch (IOException e) {
                logger.error("Error in sync cleanup: {}", target, e);
            }
        }
    }

    private void runTwoWaySync(Path source, Path destination, BackgroundTaskManager.TaskProgressReporter reporter) throws IOException {
        List<Path> sourceFiles = new ArrayList<>();
        Files.walkFileTree(source, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                String name = dir.getFileName() != null ? dir.getFileName().toString() : "";
                if (name.equals("node_modules") || name.equals(".git") || name.equals("target") || name.equals(".idea") || name.equals("build")) {
                    return FileVisitResult.SKIP_SUBTREE;
                }
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                if (attrs.isRegularFile()) {
                    sourceFiles.add(file);
                }
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFileFailed(Path file, IOException exc) throws IOException {
                logger.warn("Sync scan (source) skipping path due to restriction: {} ({})", file, exc.getMessage());
                Map<String, Object> errorItem = new HashMap<>();
                errorItem.put("filePath", file.toAbsolutePath().toString());
                errorItem.put("action", "SYNC_SKIP");
                errorItem.put("failed", true);
                errorItem.put("error", "Access Denied (Source): " + exc.getMessage());
                reporter.appendResult(errorItem);
                return FileVisitResult.CONTINUE;
            }
        });

        List<Path> destFiles = new ArrayList<>();
        Files.walkFileTree(destination, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                String name = dir.getFileName() != null ? dir.getFileName().toString() : "";
                if (name.equals("node_modules") || name.equals(".git") || name.equals("target") || name.equals(".idea") || name.equals("build")) {
                    return FileVisitResult.SKIP_SUBTREE;
                }
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                if (attrs.isRegularFile()) {
                    destFiles.add(file);
                }
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFileFailed(Path file, IOException exc) throws IOException {
                logger.warn("Sync scan (destination) skipping path due to restriction: {} ({})", file, exc.getMessage());
                Map<String, Object> errorItem = new HashMap<>();
                errorItem.put("filePath", file.toAbsolutePath().toString());
                errorItem.put("action", "CLEANUP_SKIP");
                errorItem.put("failed", true);
                errorItem.put("error", "Access Denied (Destination): " + exc.getMessage());
                reporter.appendResult(errorItem);
                return FileVisitResult.CONTINUE;
            }
        });

        int total = sourceFiles.size() + destFiles.size();
        int count = 0;

        // 1. Copy source files that are new or newer to destination
        for (Path file : sourceFiles) {
            if (reporter.isCancelled()) break;

            Map<String, Object> fileResult = new HashMap<>();
            fileResult.put("filePath", file.toAbsolutePath().toString());

            try {
                Path rel = source.relativize(file);
                Path target = destination.resolve(rel);
                Files.createDirectories(target.getParent());

                boolean copyToTarget = true;
                if (Files.exists(target)) {
                    long sourceTime = Files.getLastModifiedTime(file).toMillis();
                    long targetTime = Files.getLastModifiedTime(target).toMillis();
                    if (sourceTime <= targetTime) {
                        copyToTarget = false;
                    }
                }

                if (copyToTarget) {
                    secureStorageService.secureCopy(file, target, false, null);
                    fileResult.put("action", "COPY_TO_DEST");
                } else {
                    fileResult.put("action", "SKIP");
                }
                fileResult.put("failed", false);
            } catch (Exception e) {
                logger.error("Error in two-way sync: {}", file, e);
                fileResult.put("failed", true);
                fileResult.put("error", e.getMessage());
            }

            reporter.appendResult(fileResult);
            count++;
            reporter.reportProgress(((double) count / total) * 100, "Two-way synced (Source): " + file.getFileName());
        }

        // 2. Copy destination files that are new or newer to source
        for (Path target : destFiles) {
            if (reporter.isCancelled()) break;

            Map<String, Object> fileResult = new HashMap<>();
            fileResult.put("filePath", target.toAbsolutePath().toString());

            try {
                Path rel = destination.relativize(target);
                Path file = source.resolve(rel);
                Files.createDirectories(file.getParent());

                boolean copyToSource = true;
                if (Files.exists(file)) {
                    long sourceTime = Files.getLastModifiedTime(file).toMillis();
                    long targetTime = Files.getLastModifiedTime(target).toMillis();
                    if (targetTime <= sourceTime) {
                        copyToSource = false;
                    }
                }

                if (copyToSource) {
                    secureStorageService.secureCopy(target, file, false, null);
                    fileResult.put("action", "COPY_TO_SRC");
                } else {
                    fileResult.put("action", "SKIP");
                }
                fileResult.put("failed", false);
            } catch (Exception e) {
                logger.error("Error in two-way sync: {}", target, e);
                fileResult.put("failed", true);
                fileResult.put("error", e.getMessage());
            }

            reporter.appendResult(fileResult);
            count++;
            reporter.reportProgress(((double) count / total) * 100, "Two-way synced (Dest): " + target.getFileName());
        }
    }
}
