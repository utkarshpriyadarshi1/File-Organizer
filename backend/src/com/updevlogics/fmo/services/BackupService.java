package com.updevlogics.fmo.services;

import com.updevlogics.fmo.config.WebSocketHandler;
import com.updevlogics.fmo.entities.BackupJob;
import com.updevlogics.fmo.entities.DbFile;
import com.updevlogics.fmo.entities.FileVersion;
import com.updevlogics.fmo.repositories.BackupJobRepository;
import com.updevlogics.fmo.repositories.DbFileRepository;
import com.updevlogics.fmo.repositories.FileVersionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class BackupService {
    private static final Logger logger = LoggerFactory.getLogger(BackupService.class);
    private static final int THREAD_POOL_SIZE = 5;

    private final BackupJobRepository backupJobRepository;
    private final FileVersionRepository fileVersionRepository;
    private final DbFileRepository dbFileRepository;
    private final SqliteWriteQueueService sqliteWriteQueueService;
    private final RedisCacheService redisCacheService;

    public String createBackup(String sourceFolder, String backupFolder) {
        ExecutorService executor = Executors.newFixedThreadPool(THREAD_POOL_SIZE);
        try {
            WebSocketHandler.broadcastMessage("Backup started...");
            logger.info("Backup started for folder: {}", sourceFolder);

            Path sourcePath = Paths.get(sourceFolder);
            Path backupPath = Paths.get(backupFolder);
            Files.createDirectories(backupPath);

            final BackupJob initialJob = BackupJob.builder()
                .jobName("Backup " + LocalDateTime.now())
                .jobType("FULL")
                .sourcePath(sourceFolder)
                .destinationPath(backupFolder)
                .status("RUNNING")
                .createdAt(LocalDateTime.now())
                .build();
            
            final BackupJob savedJob = sqliteWriteQueueService.executeWrite(() -> backupJobRepository.save(initialJob));

            Files.walk(sourcePath).filter(Files::isRegularFile).forEach(source -> {
                executor.execute(() -> {
                    try {
                        Path target = backupPath.resolve(sourcePath.relativize(source));
                        
                        boolean isNewOrChanged = true;
                        String absoluteSourcePath = source.toAbsolutePath().toString();
                        long fileSize = Files.size(source);
                        
                        if (Files.exists(target)) {
                            long targetSize = Files.size(target);
                            long sourceModified = Files.getLastModifiedTime(source).toMillis();
                            long targetModified = Files.getLastModifiedTime(target).toMillis();
                            if (fileSize == targetSize && Math.abs(sourceModified - targetModified) < 2000) {
                                isNewOrChanged = false;
                            }
                        }

                        if (isNewOrChanged) {
                            Files.createDirectories(target.getParent());
                            Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING);
                            WebSocketHandler.broadcastMessage("Copied: " + source);
                            logger.info("Copied file: {}", source);
                        } else {
                            WebSocketHandler.broadcastMessage("Skipped (unchanged): " + source);
                            logger.info("Skipped unchanged file: {}", source);
                        }

                        sqliteWriteQueueService.submitWrite(() -> {
                            try {
                                DbFile dbFile = dbFileRepository.findByPath(absoluteSourcePath)
                                    .orElseGet(() -> {
                                        String fileName = source.getFileName().toString();
                                        String type = fileName.contains(".") ? fileName.substring(fileName.lastIndexOf(".") + 1) : "unknown";
                                        DbFile newFile = DbFile.builder()
                                            .path(absoluteSourcePath)
                                            .name(fileName)
                                            .size(fileSize)
                                            .type(type)
                                            .isActive(true)
                                            .createdAt(LocalDateTime.now())
                                            .modifiedAt(LocalDateTime.now())
                                            .build();
                                        return dbFileRepository.save(newFile);
                                    });
                                
                                List<FileVersion> existingVersions = fileVersionRepository.findByFileId(dbFile.getId());
                                int nextVersion = existingVersions.size() + 1;
                                
                                FileVersion version = FileVersion.builder()
                                    .file(dbFile)
                                    .backupJob(savedJob)
                                    .versionNumber(nextVersion)
                                    .backupPath(target.toAbsolutePath().toString())
                                    .backedUpAt(LocalDateTime.now())
                                    .build();
                                fileVersionRepository.save(version);
                                
                                redisCacheService.cacheFile(dbFile);
                            } catch (Exception e) {
                                logger.error("Failed to log file version in backup for: " + source, e);
                            }
                        });

                    } catch (IOException e) {
                        WebSocketHandler.broadcastMessage("Error copying: " + source);
                        logger.error("Failed to copy file: {}", source, e);
                    }
                });
            });

            executor.shutdown();
            executor.awaitTermination(10, TimeUnit.MINUTES);
            
            sqliteWriteQueueService.submitWrite(() -> {
                savedJob.setStatus("COMPLETED");
                savedJob.setLastRun(LocalDateTime.now());
                backupJobRepository.save(savedJob);
            });

            WebSocketHandler.broadcastMessage("Backup completed.");
            logger.info("Backup completed successfully.");
            return "Backup created successfully.";
        } catch (Exception e) {
            WebSocketHandler.broadcastMessage("Backup failed: " + e.getMessage());
            logger.error("Unexpected error during backup", e);
            return "Backup failed: " + e.getMessage();
        }
    }

    public String updateBackup(String sourceFolder, String backupFolder) {
        // Reuse createBackup as it naturally handles incremental syncing
        return createBackup(sourceFolder, backupFolder);
    }
}
