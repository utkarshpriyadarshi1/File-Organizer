package com.updevlogics.eabhilekh.services;
import com.updevlogics.eabhilekh.enums.TaskType;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BackupService {
    private static final Logger logger = LoggerFactory.getLogger(BackupService.class);

    private final BackgroundTaskManager backgroundTaskManager;
    private final SecureStorageService secureStorageService;

    public String createBackup(String sourceFolder, String backupFolder) {
        return backgroundTaskManager.submitTask(TaskType.BACKUP, (taskId, reporter) -> {
            Path sourcePath = Paths.get(sourceFolder);
            Path backupPath = Paths.get(backupFolder);
            Files.createDirectories(backupPath);

            List<Path> allFiles = new ArrayList<>();
            Files.walkFileTree(sourcePath, new SimpleFileVisitor<Path>() {
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
                    logger.warn("Backup scan skipping path due to restriction: {} ({})", file, exc.getMessage());
                    Map<String, Object> errorItem = new HashMap<>();
                    errorItem.put("sourcePath", file.toAbsolutePath().toString());
                    errorItem.put("failed", true);
                    errorItem.put("error", "Access Denied: " + exc.getMessage());
                    reporter.appendResult(errorItem);
                    return FileVisitResult.CONTINUE;
                }
            });

            int total = allFiles.size();
            int count = 0;

            for (Path source : allFiles) {
                if (reporter.isCancelled()) {
                    logger.info("Backup job {} canceled at copy loop.", taskId);
                    break;
                }

                Path target = backupPath.resolve(sourcePath.relativize(source));
                boolean isNewOrChanged = true;
                long fileSize = Files.size(source);

                if (Files.exists(target)) {
                    long targetSize = Files.size(target);
                    long sourceModified = Files.getLastModifiedTime(source).toMillis();
                    long targetModified = Files.getLastModifiedTime(target).toMillis();
                    if (fileSize == targetSize && Math.abs(sourceModified - targetModified) < 2000) {
                        isNewOrChanged = false;
                    }
                }

                Map<String, Object> fileResult = new HashMap<>();
                fileResult.put("sourcePath", source.toAbsolutePath().toString());
                fileResult.put("backupPath", target.toAbsolutePath().toString());

                if (isNewOrChanged) {
                    try {
                        secureStorageService.secureCopy(source, target, false, null);
                        fileResult.put("failed", false);
                    } catch (Exception e) {
                        logger.error("Failed to back up file: {}", source, e);
                        fileResult.put("failed", true);
                        fileResult.put("error", e.getMessage());
                    }
                } else {
                    fileResult.put("failed", false);
                    fileResult.put("skipped", true);
                }

                reporter.appendResult(fileResult);
                count++;
                reporter.reportProgress(((double) count / total) * 100, "Backed up: " + source.getFileName());
            }
        });
    }

    public String updateBackup(String sourceFolder, String backupFolder) {
        return createBackup(sourceFolder, backupFolder);
    }
}
