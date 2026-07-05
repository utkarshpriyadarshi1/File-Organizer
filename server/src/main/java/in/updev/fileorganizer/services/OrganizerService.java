package in.updev.fileorganizer.services;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import in.updev.fileorganizer.entities.DbFile;
import in.updev.fileorganizer.entities.FileReversal;
import in.updev.fileorganizer.enums.TaskType;
import in.updev.fileorganizer.repositories.DbFileRepository;
import in.updev.fileorganizer.repositories.FileReversalRepository;
import in.updev.fileorganizer.repositories.IgnoreRuleRepository;
import in.updev.fileorganizer.utils.FileUtils;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OrganizerService {
    private static final Logger logger = LoggerFactory.getLogger(OrganizerService.class);

    private final DbFileRepository dbFileRepository;
    private final FileReversalRepository fileReversalRepository;
    private final SqliteWriteQueueService sqliteWriteQueueService;
    private final RedisCacheService redisCacheService;
    private final AuditLogService auditLogService;

    private final BackgroundTaskManager backgroundTaskManager;
    private final SecureStorageService secureStorageService;
    private final IgnoreRuleRepository ignoreRuleRepository;
    private final PreferencesService preferencesService;

    public String organizeFiles(String sourceFolder, String destinationFolder, boolean dryRun) {
        String actionDetails = (dryRun ? "Dry run: Organize " : "Organize ") + "files";
        return backgroundTaskManager.submitTask(TaskType.ORGANIZE, sourceFolder, destinationFolder, actionDetails,
                (taskId, reporter) -> {
                    Path sourcePath = Paths.get(sourceFolder);
                    Path destPath = Paths.get(destinationFolder);
                    if (!dryRun) {
                        Files.createDirectories(destPath);
                    }

                    List<String> ignoredPatterns = ignoreRuleRepository.findAll().stream()
                            .map(rule -> rule.getPattern().toLowerCase())
                            .collect(Collectors.toList());

                    List<Path> allFiles = FileUtils.getAllRegularFiles(sourcePath, ignoredPatterns, (file, exc) -> {
                        Map<String, Object> errorItem = new HashMap<>();
                        errorItem.put("oldPath", file.toAbsolutePath().toString());
                        errorItem.put("failed", true);
                        errorItem.put("error", "Access Denied: " + exc.getMessage());
                        reporter.appendResult(errorItem);
                    });

                    int total = allFiles.size();
                    int count = 0;

                    for (Path file : allFiles) {
                        if (reporter.isCancelled()) {
                            logger.info("Organize files task {} canceled at file loop.", taskId);
                            break;
                        }
                        reporter.checkPauseState();

                        Map<String, Object> fileResult = new HashMap<>();
                        String oldPath = file.toAbsolutePath().toString();
                        fileResult.put("oldPath", oldPath);
                        fileResult.put("dryRun", dryRun);

                        try {
                            String layoutPattern = preferencesService.getPreferences().getFolderLayoutPattern();
                            Path targetDir = resolveTargetDirectory(file, layoutPattern, destPath);
                            Path targetPath = targetDir.resolve(file.getFileName());

                            String probedType = Files.probeContentType(file);
                            String fileType = probedType != null ? probedType : "unknown";
                            String newPath = targetPath.toAbsolutePath().toString();
                            String fileName = targetPath.getFileName().toString();
                            long fileSize = Files.size(file);

                            if (dryRun) {
                                if (!Files.isReadable(file) || !Files.isWritable(file)) {
                                    throw new java.nio.file.AccessDeniedException(file.toString(), null, "Insufficient permissions to read or write file");
                                }
                                Path checkDir = targetDir;
                                while (checkDir != null && !Files.exists(checkDir)) {
                                    checkDir = checkDir.getParent();
                                }
                                if (checkDir != null && !Files.isWritable(checkDir)) {
                                    throw new java.nio.file.AccessDeniedException(checkDir.toString(), null, "Insufficient permissions to write to destination directory");
                                }
                            } else {
                                Files.createDirectories(targetDir);
                                // Move file and verify integrity
                                secureStorageService.secureMove(file, targetPath, false, null);
                            }

                            fileResult.put("newPath", newPath);
                            fileResult.put("failed", false);

                            if (!dryRun) {
                                // Database index updates
                                sqliteWriteQueueService.submitWrite(() -> {
                                    DbFile dbFile = dbFileRepository.findByPath(oldPath)
                                            .orElse(new DbFile());

                                    dbFile.setPath(newPath);
                                    dbFile.setName(fileName);
                                    dbFile.setSize(fileSize);
                                    dbFile.setType(fileType);
                                    dbFile.setIsActive(true);
                                    dbFile.setModifiedAt(LocalDateTime.now());
                                    dbFile.setCreatedAt(dbFile.getCreatedAt() != null ? dbFile.getCreatedAt()
                                            : LocalDateTime.now());

                                    DbFile savedFile = dbFileRepository.save(dbFile);
                                    redisCacheService.cacheFile(savedFile);
                                    auditLogService.logAction("FILE_ORGANIZED", savedFile,
                                            "Moved from " + oldPath + " to " + newPath);

                                    // Register reversal log for undo action
                                    fileReversalRepository.save(FileReversal.builder()
                                            .taskId(taskId)
                                            .operationType("MOVE")
                                            .sourcePath(newPath)
                                            .originalPath(oldPath)
                                            .build());
                                });
                            }

                        } catch (Exception e) {
                            logger.error("Failed to organize file: {}", file, e);
                            fileResult.put("failed", true);
                            fileResult.put("error", e.getMessage());
                        }

                        reporter.appendResult(fileResult);
                        count++;
                        reporter.reportProgress(((double) count / total) * 100,
                                (dryRun ? "Virtually organized: " : "Organized: ") + file.getFileName());
                    }
                });
    }

    public Path resolveTargetDirectory(Path file, String pattern, Path destPath) {
        String fileName = file.getFileName().toString();
        int lastDot = fileName.lastIndexOf('.');
        String ext = lastDot > 0 ? fileName.substring(lastDot + 1).toLowerCase() : "no_ext";

        String probedType = null;
        try {
            probedType = Files.probeContentType(file);
        } catch (IOException e) {
            // ignore
        }
        String fileType = probedType != null ? probedType : "unknown";

        String lastModified = "";
        try {
            lastModified = Files.getLastModifiedTime(file).toString();
        } catch (IOException e) {
            lastModified = java.time.LocalDateTime.now().toString();
        }
        String yearMonth = lastModified.substring(0, Math.min(7, lastModified.length()));
        String year = lastModified.substring(0, Math.min(4, lastModified.length()));
        String month = lastModified.length() > 7 ? lastModified.substring(5, 7) : "01";
        String day = lastModified.length() > 10 ? lastModified.substring(8, 10) : "01";

        Path resolved = destPath;
        String[] segments = pattern.split("/");
        for (String segment : segments) {
            segment = segment.trim();
            if (segment.isEmpty())
                continue;
            String resolvedSegment = segment
                    .replace("{fileType}", fileType)
                    .replace("{extension}", ext)
                    .replace("{yearMonth}", yearMonth)
                    .replace("{year}", year)
                    .replace("{month}", month)
                    .replace("{day}", day);
            resolved = resolved.resolve(resolvedSegment);
        }
        return resolved;
    }
}
