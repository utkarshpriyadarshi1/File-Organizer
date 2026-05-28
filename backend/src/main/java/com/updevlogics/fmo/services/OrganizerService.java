package com.updevlogics.fmo.services;

import com.updevlogics.fmo.entities.DbFile;
import com.updevlogics.fmo.entities.FileReversal;
import com.updevlogics.fmo.repositories.DbFileRepository;
import com.updevlogics.fmo.repositories.FileReversalRepository;
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
public class OrganizerService {
    private static final Logger logger = LoggerFactory.getLogger(OrganizerService.class);

    private final DbFileRepository dbFileRepository;
    private final FileReversalRepository fileReversalRepository;
    private final SqliteWriteQueueService sqliteWriteQueueService;
    private final RedisCacheService redisCacheService;
    private final AuditLogService auditLogService;
    
    private final BackgroundTaskManager backgroundTaskManager;
    private final SecureStorageService secureStorageService;

    public String organizeFiles(String sourceFolder, String destinationFolder) {
        return backgroundTaskManager.submitTask("ORGANIZE", (taskId, reporter) -> {
            Path sourcePath = Paths.get(sourceFolder);
            Path destPath = Paths.get(destinationFolder);
            Files.createDirectories(destPath);

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
            });

            int total = allFiles.size();
            int count = 0;

            for (Path file : allFiles) {
                if (reporter.isCancelled()) {
                    logger.info("Organize files task {} canceled at file loop.", taskId);
                    break;
                }

                Map<String, Object> fileResult = new HashMap<>();
                String oldPath = file.toAbsolutePath().toString();
                fileResult.put("oldPath", oldPath);

                try {
                    String probedType = Files.probeContentType(file);
                    String fileType = probedType != null ? probedType : "unknown";
                    String yearMonth = Files.getLastModifiedTime(file).toString().substring(0, 7);
                    Path targetDir = destPath.resolve(fileType).resolve(yearMonth);
                    Files.createDirectories(targetDir);
                    Path targetPath = targetDir.resolve(file.getFileName());

                    String newPath = targetPath.toAbsolutePath().toString();
                    String fileName = targetPath.getFileName().toString();
                    long fileSize = Files.size(file);

                    // Move file and verify integrity
                    secureStorageService.secureMove(file, targetPath, false, null);
                    fileResult.put("newPath", newPath);
                    fileResult.put("failed", false);

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
                        dbFile.setCreatedAt(dbFile.getCreatedAt() != null ? dbFile.getCreatedAt() : LocalDateTime.now());
                        
                        DbFile savedFile = dbFileRepository.save(dbFile);
                        redisCacheService.cacheFile(savedFile);
                        auditLogService.logAction("FILE_ORGANIZED", savedFile, "Moved from " + oldPath + " to " + newPath);
                        
                        // Register reversal log for undo action
                        fileReversalRepository.save(FileReversal.builder()
                                .taskId(taskId)
                                .operationType("MOVE")
                                .sourcePath(newPath)
                                .originalPath(oldPath)
                                .build());
                    });

                } catch (Exception e) {
                    logger.error("Failed to organize file: {}", file, e);
                    fileResult.put("failed", true);
                    fileResult.put("error", e.getMessage());
                }

                reporter.appendResult(fileResult);
                count++;
                reporter.reportProgress(((double) count / total) * 100, "Organized: " + file.getFileName());
            }
        });
    }
}
