package com.updevlogics.fboss.services;

import com.updevlogics.fboss.entities.DbFile;
import com.updevlogics.fboss.repositories.DbFileRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.function.Consumer;

@Service
@RequiredArgsConstructor
public class FileScannerService {
    private static final Logger logger = LoggerFactory.getLogger(FileScannerService.class);

    private final DbFileRepository dbFileRepository;
    private final SqliteWriteQueueService sqliteWriteQueueService;
    private final RedisCacheService redisCacheService;

    public void scanAndIndex(Path folderPath, Consumer<DbFile> onFileIndexed) throws IOException {
        if (folderPath == null || !Files.exists(folderPath) || !Files.isDirectory(folderPath)) {
            throw new IllegalArgumentException("Invalid scan folder path.");
        }

        List<Path> paths = new ArrayList<>();
        Files.walkFileTree(folderPath, new SimpleFileVisitor<Path>() {
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
                    paths.add(file);
                }
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFileFailed(Path file, IOException exc) throws IOException {
                logger.warn("Scanner skipping path due to restriction: {} ({})", file, exc.getMessage());
                return FileVisitResult.CONTINUE;
            }
        });

        String folderPrefix = folderPath.toAbsolutePath().toString();
        if (!folderPrefix.endsWith(java.io.File.separator)) {
            folderPrefix += java.io.File.separator;
        }
        List<DbFile> existingFiles = dbFileRepository.findByPathStartingWith(folderPrefix);
        Map<String, DbFile> existingFilesMap = existingFiles.stream()
                .collect(Collectors.toMap(DbFile::getPath, f -> f, (a, b) -> a));

        for (Path path : paths) {
            try {
                String absolutePath = path.toAbsolutePath().toString();
                LocalDateTime modifiedTime = LocalDateTime.ofInstant(
                        Files.getLastModifiedTime(path).toInstant(),
                        ZoneId.systemDefault()
                );
                long fileSize = Files.size(path);
                String fileName = path.getFileName().toString();
                String fileType = fileName.contains(".") ? fileName.substring(fileName.lastIndexOf(".") + 1) : "unknown";

                DbFile existingFile = existingFilesMap.get(absolutePath);
                boolean needsUpdate = true;
                DbFile targetFile = null;

                if (existingFile != null) {
                    if (existingFile.getSize().equals(fileSize) &&
                        (existingFile.getModifiedAt() != null &&
                         Math.abs(existingFile.getModifiedAt().atZone(ZoneId.systemDefault()).toEpochSecond() -
                                  modifiedTime.atZone(ZoneId.systemDefault()).toEpochSecond()) < 2) &&
                        Boolean.TRUE.equals(existingFile.getIsActive())) {
                        needsUpdate = false;
                        targetFile = existingFile;
                        redisCacheService.cacheFile(existingFile);
                    }
                }

                if (needsUpdate) {
                    DbFile dbFile = existingFile != null ? existingFile : new DbFile();
                    dbFile.setPath(absolutePath);
                    dbFile.setName(fileName);
                    dbFile.setSize(fileSize);
                    dbFile.setType(fileType);
                    dbFile.setModifiedAt(modifiedTime);
                    dbFile.setCreatedAt(dbFile.getCreatedAt() != null ? dbFile.getCreatedAt() : LocalDateTime.now());
                    dbFile.setIsActive(true);

                    sqliteWriteQueueService.submitWrite(() -> {
                        DbFile savedFile = dbFileRepository.save(dbFile);
                        redisCacheService.cacheFile(savedFile);
                        if (onFileIndexed != null) {
                            onFileIndexed.accept(savedFile);
                        }
                    });
                } else {
                    if (onFileIndexed != null) {
                        onFileIndexed.accept(targetFile);
                    }
                }
            } catch (Exception e) {
                logger.error("Failed to scan and index file: {}", path, e);
            }
        }
    }
}
