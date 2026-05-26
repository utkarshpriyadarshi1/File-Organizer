package com.updevlogics.fmo.services;

import com.updevlogics.fmo.config.WebSocketHandler;
import com.updevlogics.fmo.entities.DbFile;
import com.updevlogics.fmo.entities.FileHash;
import com.updevlogics.fmo.repositories.DbFileRepository;
import com.updevlogics.fmo.repositories.FileHashRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.*;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
public class DuplicateService {
    private static final int THREAD_POOL_SIZE = 5;
    private static final Logger logger = LoggerFactory.getLogger(DuplicateService.class);

    private final DbFileRepository dbFileRepository;
    private final FileHashRepository fileHashRepository;
    private final SqliteWriteQueueService sqliteWriteQueueService;
    private final RedisCacheService redisCacheService;

    public List<Map<String, Object>> findDuplicates(String folderPath) {
        Map<String, List<String>> fileHashes = new HashMap<>();
        List<Map<String, Object>> duplicates = new ArrayList<>();

        try {
            Path rootPath = Paths.get(folderPath);
            if (!Files.exists(rootPath) || !Files.isDirectory(rootPath)) {
                throw new IllegalArgumentException("Invalid folder path.");
            }

            MessageDigest md = MessageDigest.getInstance("SHA-256");

            try (java.util.stream.Stream<Path> stream = Files.walk(rootPath)) {
                stream.filter(Files::isRegularFile).forEach(path -> {
                    try {
                        String absolutePath = path.toAbsolutePath().toString();
                        long fileSize = Files.size(path);
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
                            hash = getFileChecksum(md, path.toFile());
                            final String finalHash = hash;
                            
                            sqliteWriteQueueService.submitWrite(() -> {
                                DbFile dbFile = existingFileOpt.orElse(new DbFile());
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

                        fileHashes.putIfAbsent(hash, new ArrayList<>());
                        fileHashes.get(hash).add(absolutePath);
                    } catch (Exception e) {
                        logger.error("Failed to process duplicate check for file: {}", path, e);
                    }
                });
            }

            // Collect only duplicate sets
            for (Map.Entry<String, List<String>> entry : fileHashes.entrySet()) {
                if (entry.getValue().size() > 1) {
                    Map<String, Object> duplicateSet = new HashMap<>();
                    duplicateSet.put("hash", entry.getKey());
                    duplicateSet.put("files", entry.getValue());
                    duplicates.add(duplicateSet);
                }
            }
        } catch (Exception e) {
            logger.error("Error finding duplicates", e);
        }
        return duplicates;
    }

    public String removeDuplicates(List<String> filesToDelete) {
        ExecutorService executor = Executors.newFixedThreadPool(THREAD_POOL_SIZE);
        try {
            List<List<String>> batches = batchFiles(filesToDelete, 10);
            WebSocketHandler.broadcastMessage("Duplicate removal started...");
            logger.info("Removing duplicates from {} files", filesToDelete.size());

            for (List<String> batch : batches) {
                executor.execute(() -> {
                    for (String filePath : batch) {
                        try {
                            Files.deleteIfExists(Paths.get(filePath));
                            WebSocketHandler.broadcastMessage("Deleted: " + filePath);
                            logger.info("Deleted duplicate file: {}", filePath);
                            
                            sqliteWriteQueueService.submitWrite(() -> {
                                dbFileRepository.findByPath(filePath).ifPresent(dbFile -> {
                                    dbFile.setIsActive(false);
                                    dbFileRepository.save(dbFile);
                                    redisCacheService.deleteFileCache(dbFile.getId());
                                });
                            });
                        } catch (NoSuchFileException e) {
                            WebSocketHandler.broadcastMessage("File not found: " + filePath);
                            logger.warn("File not found: {}", filePath);
                            
                            sqliteWriteQueueService.submitWrite(() -> {
                                dbFileRepository.findByPath(filePath).ifPresent(dbFile -> {
                                    dbFile.setIsActive(false);
                                    dbFileRepository.save(dbFile);
                                    redisCacheService.deleteFileCache(dbFile.getId());
                                });
                            });
                        } catch (IOException e) {
                            WebSocketHandler.broadcastMessage("Error deleting: " + filePath);
                            logger.error("Failed to delete file: {}", filePath, e);
                        }
                    }
                });
            }

            executor.shutdown();
            executor.awaitTermination(5, TimeUnit.MINUTES);
            WebSocketHandler.broadcastMessage("Duplicate removal completed.");
            logger.info("Duplicate removal completed successfully.");
            return "Selected duplicate files have been removed.";
        } catch (Exception e) {
            WebSocketHandler.broadcastMessage("Error removing duplicates: " + e.getMessage());
            logger.error("Error during duplicate removal", e);
            return "Error removing duplicates: " + e.getMessage();
        }
    }

    private String getFileChecksum(MessageDigest digest, File file) throws Exception {
        try (FileInputStream fis = new FileInputStream(file)) {
            byte[] byteArray = new byte[1024];
            int bytesRead;
            while ((bytesRead = fis.read(byteArray)) != -1) {
                digest.update(byteArray, 0, bytesRead);
            }
            byte[] hashBytes = digest.digest();

            // Convert hash bytes to hex
            StringBuilder sb = new StringBuilder();
            for (byte b : hashBytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        }
    }

    private List<List<String>> batchFiles(List<String> files, int batchSize) {
        return IntStream.range(0, (files.size() + batchSize - 1) / batchSize)
                .mapToObj(i -> files.subList(i * batchSize, Math.min((i + 1) * batchSize, files.size())))
                .collect(Collectors.toList());
    }
}
