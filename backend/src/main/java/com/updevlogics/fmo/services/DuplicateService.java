package com.updevlogics.fmo.services;

import com.updevlogics.fmo.entities.DbFile;
import com.updevlogics.fmo.entities.FileHash;
import com.updevlogics.fmo.repositories.DbFileRepository;
import com.updevlogics.fmo.repositories.FileHashRepository;
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

    public String findDuplicates(String folderPath) {
        return backgroundTaskManager.submitTask("DUPLICATE_SCAN", (taskId, reporter) -> {
            Path rootPath = Paths.get(folderPath);
            if (!Files.exists(rootPath) || !Files.isDirectory(rootPath)) {
                throw new IllegalArgumentException("Invalid folder path.");
            }

            // 1. Collect all files
            List<Path> allFiles = new ArrayList<>();
            Files.walkFileTree(rootPath, new SimpleFileVisitor<Path>() {
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
            Map<String, List<String>> fileHashes = new HashMap<>();
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
                            var existingFileOpt = dbFileRepository.findByPath(absolutePath);
                            
                            if (existingFileOpt.isPresent()) {
                                DbFile existingFile = existingFileOpt.get();
                                if (existingFile.getSize().equals(fileSize) && 
                                    (existingFile.getModifiedAt() != null && 
                                     Math.abs(existingFile.getModifiedAt().atZone(ZoneId.systemDefault()).toEpochSecond() - 
                                              modifiedTime.atZone(ZoneId.systemDefault()).toEpochSecond()) < 2)) {
                                    
                                    var existingHashOpt = fileHashRepository.findByFileId(existingFile.getId());
                                    if (existingHashOpt.isPresent()) {
                                        hash = existingHashOpt.get().getHash();
                                        redisCacheService.cacheFile(existingFile);
                                        redisCacheService.cacheFileHash(hash, existingFile.getId());
                                    }
                                }
                            }

                            if (hash == null) {
                                hash = secureStorageService.getSha256(path);
                                final String finalHash = hash;
                                final DbFile existingFile = existingFileOpt.orElse(null);
                                
                                sqliteWriteQueueService.submitWrite(() -> {
                                    DbFile dbFile = existingFile != null ? existingFile : new DbFile();
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

                            fileHashes.computeIfAbsent(hash, k -> new ArrayList<>()).add(absolutePath);
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

                        var existingFileOpt = dbFileRepository.findByPath(absolutePath);
                        boolean needsUpdate = true;
                        if (existingFileOpt.isPresent()) {
                            DbFile existingFile = existingFileOpt.get();
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
                            final DbFile existingFile = existingFileOpt.orElse(null);
                            sqliteWriteQueueService.submitWrite(() -> {
                                DbFile dbFile = existingFile != null ? existingFile : new DbFile();
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
            for (Map.Entry<String, List<String>> entry : fileHashes.entrySet()) {
                if (entry.getValue().size() > 1) {
                    Map<String, Object> duplicateSet = new HashMap<>();
                    duplicateSet.put("hash", entry.getKey());
                    duplicateSet.put("files", entry.getValue());
                    reporter.appendResult(duplicateSet);
                }
            }
        });
    }

    public String removeDuplicates(List<String> filesToDelete) {
        return backgroundTaskManager.submitTask("DUPLICATE_CLEAN", (taskId, reporter) -> {
            int total = filesToDelete.size();
            int count = 0;

            for (String filePath : filesToDelete) {
                if (reporter.isCancelled()) break;

                Map<String, Object> fileResult = new HashMap<>();
                fileResult.put("filePath", filePath);

                try {
                    Files.deleteIfExists(Paths.get(filePath));
                    fileResult.put("failed", false);
                    
                    sqliteWriteQueueService.submitWrite(() -> {
                        dbFileRepository.findByPath(filePath).ifPresent(dbFile -> {
                            dbFile.setIsActive(false);
                            dbFileRepository.save(dbFile);
                            redisCacheService.deleteFileCache(dbFile.getId());
                        });
                    });
                } catch (Exception e) {
                    logger.error("Failed to delete duplicate file: {}", filePath, e);
                    fileResult.put("failed", true);
                    fileResult.put("error", e.getMessage());
                }

                reporter.appendResult(fileResult);
                count++;
                reporter.reportProgress(((double) count / total) * 100, "Deleted duplicate: " + Paths.get(filePath).getFileName());
            }
        });
    }
}
