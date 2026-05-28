package com.updevlogics.fmo.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.List;

@Service
public class FilePurgeService {
    private static final Logger logger = LoggerFactory.getLogger(FilePurgeService.class);

    public void purgeFolder(Path path, List<String> excludedFileNames) {
        if (path == null || !Files.exists(path) || !Files.isDirectory(path)) {
            return;
        }

        try {
            Files.walkFileTree(path, new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    String fileName = file.getFileName().toString();
                    if (excludedFileNames != null && excludedFileNames.contains(fileName)) {
                        logger.info("Excluding file from purge: {}", file);
                        return FileVisitResult.CONTINUE;
                    }
                    try {
                        Files.delete(file);
                        logger.info("Purged file: {}", file);
                    } catch (IOException e) {
                        logger.warn("Failed to delete file during purge (locked or open): {}", file, e);
                    }
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult postVisitDirectory(Path dir, IOException exc) throws IOException {
                    if (!dir.equals(path)) {
                        try (DirectoryStream<Path> stream = Files.newDirectoryStream(dir)) {
                            if (!stream.iterator().hasNext()) {
                                Files.delete(dir);
                                logger.info("Purged empty directory: {}", dir);
                            }
                        } catch (IOException e) {
                            // Ignored if directory isn't empty
                        }
                    }
                    return FileVisitResult.CONTINUE;
                }
            });
        } catch (IOException e) {
            logger.error("Failed to complete directory purge: {}", path, e);
        }
    }
}
