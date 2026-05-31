package com.updevlogics.fboss.services;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Service
public class DirectoryStatsProvider {
    private static final Logger logger = LoggerFactory.getLogger(DirectoryStatsProvider.class);

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FolderStats {
        private String folderName;
        private String absolutePath;
        private long totalSizeBytes;
        private int fileCount;
        private LocalDateTime lastModified;
    }

    public FolderStats getStats(Path path, String folderName) {
        if (path == null || !Files.exists(path)) {
            return FolderStats.builder()
                    .folderName(folderName)
                    .absolutePath(path != null ? path.toAbsolutePath().toString() : "")
                    .totalSizeBytes(0L)
                    .fileCount(0)
                    .lastModified(LocalDateTime.now())
                    .build();
        }

        final long[] totalSize = {0L};
        final int[] fileCount = {0};
        final long[] maxModified = {0L};

        try {
            Files.walkFileTree(path, new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    totalSize[0] += attrs.size();
                    fileCount[0]++;
                    long modTime = attrs.lastModifiedTime().toMillis();
                    if (modTime > maxModified[0]) {
                        maxModified[0] = modTime;
                    }
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult visitFileFailed(Path file, IOException exc) throws IOException {
                    return FileVisitResult.CONTINUE;
                }
            });
        } catch (IOException e) {
            logger.error("Failed to walk directory for stats: {}", path, e);
        }

        LocalDateTime lastModTime = maxModified[0] > 0
                ? LocalDateTime.ofInstant(java.time.Instant.ofEpochMilli(maxModified[0]), ZoneId.systemDefault())
                : LocalDateTime.now();

        return FolderStats.builder()
                .folderName(folderName)
                .absolutePath(path.toAbsolutePath().toString())
                .totalSizeBytes(totalSize[0])
                .fileCount(fileCount[0])
                .lastModified(lastModTime)
                .build();
    }
}
