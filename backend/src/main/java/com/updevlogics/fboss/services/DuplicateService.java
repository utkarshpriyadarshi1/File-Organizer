package com.updevlogics.fboss.services;
import com.updevlogics.fboss.enums.TaskType;

import com.updevlogics.fboss.entities.DbFile;
import com.updevlogics.fboss.entities.FileHash;
import com.updevlogics.fboss.repositories.DbFileRepository;
import com.updevlogics.fboss.repositories.FileHashRepository;
import com.updevlogics.fboss.repositories.IgnoreRuleRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DuplicateService {
    private static final Logger logger = LoggerFactory.getLogger(DuplicateService.class);

    private final DbFileRepository dbFileRepository;
    private final FileHashRepository fileHashRepository;
    private final SqliteWriteQueueService sqliteWriteQueueService;
    private final RedisCacheService redisCacheService;
    
    private final BackgroundTaskManager backgroundTaskManager;
    private final SecureStorageService secureStorageService;
    private final IgnoreRuleRepository ignoreRuleRepository;

    public String findDuplicates(String folderPath) {
        return backgroundTaskManager.submitTask(TaskType.DUPLICATE_SCAN, (taskId, reporter) -> {
            Path rootPath = Paths.get(folderPath);
            if (!Files.exists(rootPath) || !Files.isDirectory(rootPath)) {
                throw new IllegalArgumentException("Invalid folder path.");
            }

            List<String> ignoredPatterns = ignoreRuleRepository.findAll().stream()
                    .map(rule -> rule.getPattern().toLowerCase())
                    .collect(Collectors.toList());

            // 1. Collect all files
            List<Path> allFiles = new ArrayList<>();
            Files.walkFileTree(rootPath, new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                    String name = dir.getFileName() != null ? dir.getFileName().toString() : "";
                    if (ignoredPatterns.contains(name.toLowerCase())) {
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
                    logger.warn("Skipping file/directory due to access restriction: {} ({})", file, exc.getMessage());
                    Map<String, Object> errorItem = new HashMap<>();
                    errorItem.put("path", file.toAbsolutePath().toString());
                    errorItem.put("failed", true);
                    errorItem.put("error", "Access Denied: " + exc.getMessage());
                    reporter.appendResult(errorItem);
                    return FileVisitResult.CONTINUE;
                }
            });

            String folderPrefix = rootPath.toAbsolutePath().toString();
            if (!folderPrefix.endsWith(java.io.File.separator)) {
                folderPrefix += java.io.File.separator;
            }
            List<DbFile> existingFiles = dbFileRepository.findByPathStartingWith(folderPrefix);
            Map<String, DbFile> existingFilesMap = existingFiles.stream()
                    .collect(Collectors.toMap(DbFile::getPath, f -> f, (a, b) -> a));

            List<FileHash> existingHashes = fileHashRepository.findByFilePathStartingWith(folderPrefix);
            Map<Long, FileHash> existingHashesMap = existingHashes.stream()
                    .collect(Collectors.toMap(fh -> fh.getFile().getId(), fh -> fh, (a, b) -> a));

            int totalFiles = allFiles.size();
            reporter.reportProgress(0.0, "Discovered " + totalFiles + " files. Grouping by size...");

            // 2. Group by size
            Map<Long, List<Path>> filesBySize = new HashMap<>();
            for (Path path : allFiles) {
                if (reporter.isCancelled()) break;
                try {
                    long size = Files.size(path);
                    filesBySize.computeIfAbsent(size, k -> new ArrayList<>()).add(path);
                } catch (IOException e) {
                    logger.error("Failed to read size for file: {}", path, e);
                }
            }

            // 3. Process potential duplicates (size groups > 1)
            Map<String, List<Map<String, Object>>> fileHashes = new HashMap<>();
            int processedCount = 0;

            for (Map.Entry<Long, List<Path>> entry : filesBySize.entrySet()) {
                if (reporter.isCancelled()) break;
                
                long fileSize = entry.getKey();
                List<Path> paths = entry.getValue();

                if (paths.size() > 1) {
                    for (Path path : paths) {
                        if (reporter.isCancelled()) break;
                        
                        try {
                            String absolutePath = path.toAbsolutePath().toString();
                            LocalDateTime modifiedTime = LocalDateTime.ofInstant(
                                Files.getLastModifiedTime(path).toInstant(),
                                ZoneId.systemDefault()
                            );
                            
                            String hash = null;
                            DbFile existingFile = existingFilesMap.get(absolutePath);
                            
                            if (existingFile != null) {
                                if (existingFile.getSize().equals(fileSize) && 
                                    (existingFile.getModifiedAt() != null && 
                                     Math.abs(existingFile.getModifiedAt().atZone(ZoneId.systemDefault()).toEpochSecond() - 
                                              modifiedTime.atZone(ZoneId.systemDefault()).toEpochSecond()) < 2)) {
                                    
                                    FileHash existingHash = existingHashesMap.get(existingFile.getId());
                                    if (existingHash != null) {
                                        hash = existingHash.getHash();
                                        redisCacheService.cacheFile(existingFile);
                                        redisCacheService.cacheFileHash(hash, existingFile.getId());
                                    }
                                }
                            }

                            if (hash == null) {
                                hash = secureStorageService.getSha256(path);
                                final String finalHash = hash;
                                final DbFile finalExistingFile = existingFile;
                                
                                sqliteWriteQueueService.submitWrite(() -> {
                                    DbFile dbFile = finalExistingFile != null ? finalExistingFile : new DbFile();
                                    dbFile.setPath(absolutePath);
                                    dbFile.setName(path.getFileName().toString());
                                    dbFile.setSize(fileSize);
                                    dbFile.setModifiedAt(modifiedTime);
                                    dbFile.setCreatedAt(dbFile.getCreatedAt() != null ? dbFile.getCreatedAt() : LocalDateTime.now());
                                    dbFile.setIsActive(true);
                                    
                                    DbFile savedFile = dbFileRepository.save(dbFile);
                                    
                                    FileHash fileHash = fileHashRepository.findByFileId(savedFile.getId())
                                        .orElse(new FileHash());
                                    fileHash.setFile(savedFile);
                                    fileHash.setHash(finalHash);
                                    fileHash.setHashType("SHA-256");
                                    fileHashRepository.save(fileHash);
                                    
                                    redisCacheService.cacheFile(savedFile);
                                    redisCacheService.cacheFileHash(finalHash, savedFile.getId());
                                });
                            }

                            Map<String, Object> fileDetail = new HashMap<>();
                            fileDetail.put("path", absolutePath);
                            fileDetail.put("modifiedAt", modifiedTime.toString());
                            fileHashes.computeIfAbsent(hash, k -> new ArrayList<>()).add(fileDetail);
                        } catch (Exception e) {
                            logger.error("Failed to hash file: {}", path, e);
                        } finally {
                            processedCount++;
                            reporter.reportProgress(((double) processedCount / totalFiles) * 100, "Hashed: " + path.getFileName());
                        }
                    }
                } else {
                    // Unique size
                    Path path = paths.get(0);
                    try {
                        String absolutePath = path.toAbsolutePath().toString();
                        LocalDateTime modifiedTime = LocalDateTime.ofInstant(
                            Files.getLastModifiedTime(path).toInstant(),
                            ZoneId.systemDefault()
                        );

                        DbFile existingFile = existingFilesMap.get(absolutePath);
                        boolean needsUpdate = true;
                        if (existingFile != null) {
                            if (existingFile.getSize().equals(fileSize) && 
                                (existingFile.getModifiedAt() != null && 
                                 Math.abs(existingFile.getModifiedAt().atZone(ZoneId.systemDefault()).toEpochSecond() - 
                                          modifiedTime.atZone(ZoneId.systemDefault()).toEpochSecond()) < 2) &&
                                Boolean.TRUE.equals(existingFile.getIsActive())) {
                                needsUpdate = false;
                                redisCacheService.cacheFile(existingFile);
                            }
                        }

                        if (needsUpdate) {
                            final DbFile finalExistingFile = existingFile;
                            sqliteWriteQueueService.submitWrite(() -> {
                                DbFile dbFile = finalExistingFile != null ? finalExistingFile : new DbFile();
                                dbFile.setPath(absolutePath);
                                dbFile.setName(path.getFileName().toString());
                                dbFile.setSize(fileSize);
                                dbFile.setModifiedAt(modifiedTime);
                                dbFile.setCreatedAt(dbFile.getCreatedAt() != null ? dbFile.getCreatedAt() : LocalDateTime.now());
                                dbFile.setIsActive(true);
                                
                                DbFile savedFile = dbFileRepository.save(dbFile);
                                redisCacheService.cacheFile(savedFile);
                            });
                        }
                    } catch (Exception e) {
                        logger.error("Failed to index unique file: {}", path, e);
                    } finally {
                        processedCount++;
                        reporter.reportProgress(((double) processedCount / totalFiles) * 100, "Skipped unique: " + path.getFileName());
                    }
                }
            }

            // Group duplicates as output results
            for (Map.Entry<String, List<Map<String, Object>>> entry : fileHashes.entrySet()) {
                if (entry.getValue().size() > 1) {
                    Map<String, Object> duplicateSet = new HashMap<>();
                    duplicateSet.put("hash", entry.getKey());
                    duplicateSet.put("files", entry.getValue());
                    reporter.appendResult(duplicateSet);
                }
            }
        });
    }

    public String removeDuplicates(List<String> filesToDelete, boolean dryRun) {
        return backgroundTaskManager.submitTask(TaskType.DUPLICATE_CLEAN, (taskId, reporter) -> {
            int total = filesToDelete.size();
            int count = 0;

            for (String filePath : filesToDelete) {
                if (reporter.isCancelled()) break;

                Map<String, Object> fileResult = new HashMap<>();
                fileResult.put("filePath", filePath);
                fileResult.put("dryRun", dryRun);

                try {
                    if (!dryRun) {
                        Files.deleteIfExists(Paths.get(filePath));
                    }
                    fileResult.put("failed", false);
                    
                    if (!dryRun) {
                        sqliteWriteQueueService.submitWrite(() -> {
                            dbFileRepository.findByPath(filePath).ifPresent(dbFile -> {
                                dbFile.setIsActive(false);
                                dbFileRepository.save(dbFile);
                                redisCacheService.deleteFileCache(dbFile.getId());
                            });
                        });
                    }
                } catch (Exception e) {
                    logger.error("Failed to delete duplicate file: {}", filePath, e);
                    fileResult.put("failed", true);
                    fileResult.put("error", e.getMessage());
                }

                reporter.appendResult(fileResult);
                count++;
                reporter.reportProgress(((double) count / total) * 100, (dryRun ? "Virtually deleted duplicate: " : "Deleted duplicate: ") + Paths.get(filePath).getFileName());
            }
        });
    }
}
