package in.updev.fileorganizer.services;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import in.updev.fileorganizer.entities.DbFile;
import in.updev.fileorganizer.repositories.DbFileRepository;
import in.updev.fileorganizer.utils.FileUtils;
import in.updev.fileorganizer.utils.FileUtils.FileEntry;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FileScannerService {
    private static final Logger logger = LoggerFactory.getLogger(FileScannerService.class);
    private static final int BATCH_SIZE = 200;

    private final DbFileRepository dbFileRepository;
    private final SqliteWriteQueueService sqliteWriteQueueService;
    private final RedisCacheService redisCacheService;

    public void scanAndIndex(Path folderPath, Consumer<DbFile> onFileIndexed) throws IOException {
        if (folderPath == null || !Files.exists(folderPath) || !Files.isDirectory(folderPath)) {
            throw new IllegalArgumentException("Invalid scan folder path.");
        }

        // Retrieve file entries with pre-read file attributes (size, modified time) in a single pass
        List<FileEntry> entries = FileUtils.getAllRegularFileEntries(folderPath, null, null, () -> false);

        String folderPrefix = folderPath.toAbsolutePath().toString();
        if (!folderPrefix.endsWith(java.io.File.separator)) {
            folderPrefix += java.io.File.separator;
        }
        List<DbFile> existingFiles = dbFileRepository.findByPathStartingWith(folderPrefix);
        Map<String, DbFile> existingFilesMap = existingFiles.stream()
                .collect(Collectors.toMap(DbFile::getPath, f -> f, (a, b) -> a));

        List<DbFile> pendingBatch = new ArrayList<>();

        for (FileEntry entry : entries) {
            try {
                Path path = entry.getPath();
                String absolutePath = path.toAbsolutePath().toString();
                long fileSize = entry.getSize();
                long lastModMillis = entry.getLastModifiedMillis();
                LocalDateTime modifiedTime = LocalDateTime.ofInstant(
                        Instant.ofEpochMilli(lastModMillis),
                        ZoneId.systemDefault());

                String fileName = path.getFileName() != null ? path.getFileName().toString() : "";
                int dotIdx = fileName.lastIndexOf(".");
                String fileType = dotIdx > 0 ? fileName.substring(dotIdx + 1).toLowerCase() : "unknown";

                DbFile existingFile = existingFilesMap.get(absolutePath);
                boolean needsUpdate = true;
                DbFile targetFile = null;

                if (existingFile != null) {
                    if (existingFile.getSize().equals(fileSize) &&
                            (existingFile.getModifiedAt() != null &&
                                    Math.abs(existingFile.getModifiedAt().atZone(ZoneId.systemDefault()).toEpochSecond()
                                            - (lastModMillis / 1000)) < 2)
                            &&
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

                    pendingBatch.add(dbFile);
                    if (pendingBatch.size() >= BATCH_SIZE) {
                        flushScannerBatch(pendingBatch, onFileIndexed);
                    }
                } else {
                    if (onFileIndexed != null) {
                        onFileIndexed.accept(targetFile);
                    }
                }
            } catch (Exception e) {
                logger.error("Failed to process scan entry: {}", entry.getPath(), e);
            }
        }

        if (!pendingBatch.isEmpty()) {
            flushScannerBatch(pendingBatch, onFileIndexed);
        }
    }

    private void flushScannerBatch(List<DbFile> batch, Consumer<DbFile> onFileIndexed) {
        List<DbFile> copy = new ArrayList<>(batch);
        batch.clear();
        sqliteWriteQueueService.submitWrite(() -> {
            try {
                List<DbFile> savedFiles = dbFileRepository.saveAll(copy);
                for (DbFile saved : savedFiles) {
                    redisCacheService.cacheFile(saved);
                    if (onFileIndexed != null) {
                        onFileIndexed.accept(saved);
                    }
                }
            } catch (Exception e) {
                logger.error("Failed to save batched scanned files", e);
            }
        });
    }
}
