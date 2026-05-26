package com.updevlogics.fmo.services;

import com.updevlogics.fmo.config.WebSocketHandler;
import com.updevlogics.fmo.entities.DbFile;
import com.updevlogics.fmo.repositories.DbFileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class OrganizerService {

    private static final int THREAD_POOL_SIZE = 5;

    private final DbFileRepository dbFileRepository;
    private final SqliteWriteQueueService sqliteWriteQueueService;
    private final RedisCacheService redisCacheService;

    public String organizeFiles(String sourceFolder, String destinationFolder) {
        ExecutorService executor = Executors.newFixedThreadPool(THREAD_POOL_SIZE);
        try {
            WebSocketHandler.broadcastMessage("Organizing started...");

            Path sourcePath = Paths.get(sourceFolder);
            Path destPath = Paths.get(destinationFolder);
            Files.createDirectories(destPath);

            Files.walk(sourcePath).filter(Files::isRegularFile).forEach(file -> {
                executor.execute(() -> {
                    try {
                        String fileType = Files.probeContentType(file);
                        if (fileType == null) {
                            fileType = "unknown";
                        }
                        String yearMonth = Files.getLastModifiedTime(file).toString().substring(0, 7);
                        Path targetDir = destPath.resolve(fileType).resolve(yearMonth);
                        Files.createDirectories(targetDir);
                        Path targetPath = targetDir.resolve(file.getFileName());
                        
                        String oldPath = file.toAbsolutePath().toString();
                        String newPath = targetPath.toAbsolutePath().toString();
                        String fileName = targetPath.getFileName().toString();
                        long fileSize = Files.size(file);

                        Files.move(file, targetPath, StandardCopyOption.REPLACE_EXISTING);

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
                        });

                        WebSocketHandler.broadcastMessage("Organized: " + file);
                    } catch (IOException e) {
                        WebSocketHandler.broadcastMessage("Error organizing: " + file);
                    }
                });
            });

            executor.shutdown();
            executor.awaitTermination(10, TimeUnit.MINUTES);
            WebSocketHandler.broadcastMessage("Organizing completed.");
            return "Files organized successfully.";
        } catch (Exception e) {
            WebSocketHandler.broadcastMessage("Organizing failed: " + e.getMessage());
            return "Organizing failed: " + e.getMessage();
        }
    }

}
