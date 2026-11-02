package in.updev.fileorganizer.services;

import in.updev.fileorganizer.enums.TaskType;
import in.updev.fileorganizer.entities.DbFile;
import in.updev.fileorganizer.entities.FileHash;
import in.updev.fileorganizer.repositories.DbFileRepository;
import in.updev.fileorganizer.repositories.FileHashRepository;
import in.updev.fileorganizer.repositories.IgnoreRuleRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DuplicateService {
    private static final Logger logger = LoggerFactory.getLogger(DuplicateService.class);
    private static final int PARTIAL_SAMPLE_SIZE = 16384; // 16 KB

    private final DbFileRepository dbFileRepository;
    private final FileHashRepository fileHashRepository;
    private final SqliteWriteQueueService sqliteWriteQueueService;
    private final RedisCacheService redisCacheService;
    
    private final BackgroundTaskManager backgroundTaskManager;
    private final SecureStorageService secureStorageService;
    private final IgnoreRuleRepository ignoreRuleRepository;

    private static class PendingHashRecord {
        final Path path;
        final String absolutePath;
        final long fileSize;
        final LocalDateTime modifiedTime;
        final String hash;
        final DbFile existingFile;

        PendingHashRecord(Path path, String absolutePath, long fileSize, LocalDateTime modifiedTime, String hash, DbFile existingFile) {
            this.path = path;
            this.absolutePath = absolutePath;
            this.fileSize = fileSize;
            this.modifiedTime = modifiedTime;
            this.hash = hash;
            this.existingFile = existingFile;
        }
    }

    private static class PendingIndexRecord {
        final Path path;
        final String absolutePath;
        final long fileSize;
        final LocalDateTime modifiedTime;
        final DbFile existingFile;

        PendingIndexRecord(Path path, String absolutePath, long fileSize, LocalDateTime modifiedTime, DbFile existingFile) {
            this.path = path;
            this.absolutePath = absolutePath;
            this.fileSize = fileSize;
            this.modifiedTime = modifiedTime;
            this.existingFile = existingFile;
        }
    }

    private String getPartialHash(Path path, long fileSize) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            if (fileSize <= PARTIAL_SAMPLE_SIZE * 2L) {
                byte[] allBytes = Files.readAllBytes(path);
                digest.update(allBytes);
            } else {
                try (FileChannel channel = FileChannel.open(path, StandardOpenOption.READ)) {
                    ByteBuffer headerBuffer = ByteBuffer.allocate(PARTIAL_SAMPLE_SIZE);
                    while (headerBuffer.hasRemaining()) {
                        if (channel.read(headerBuffer) == -1) break;
                    }
                    headerBuffer.flip();
                    digest.update(headerBuffer);

                    ByteBuffer footerBuffer = ByteBuffer.allocate(PARTIAL_SAMPLE_SIZE);
                    long footerPosition = Math.max(0, fileSize - PARTIAL_SAMPLE_SIZE);
                    channel.position(footerPosition);
                    while (footerBuffer.hasRemaining()) {
                        if (channel.read(footerBuffer) == -1) break;
                    }
                    footerBuffer.flip();
                    digest.update(footerBuffer);
                }
            }
            byte[] hashBytes = digest.digest();
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            logger.warn("Could not compute partial hash for {}: {}", path, e.getMessage());
            return null;
        }
    }

    private void flushPendingHashBatch(List<PendingHashRecord> batch) {
        if (batch.isEmpty()) return;
        List<PendingHashRecord> copy = new ArrayList<>(batch);
        batch.clear();
        sqliteWriteQueueService.submitWrite(() -> {
            for (PendingHashRecord item : copy) {
                DbFile dbFile = item.existingFile != null ? item.existingFile : new DbFile();
                dbFile.setPath(item.absolutePath);
                dbFile.setName(item.path.getFileName().toString());
                dbFile.setSize(item.fileSize);
                dbFile.setModifiedAt(item.modifiedTime);
                if (dbFile.getCreatedAt() == null) {
                    dbFile.setCreatedAt(LocalDateTime.now());
                }
                dbFile.setIsActive(true);
                DbFile savedFile = dbFileRepository.save(dbFile);

                FileHash fileHash = fileHashRepository.findByFileId(savedFile.getId())
                        .orElse(new FileHash());
                fileHash.setFile(savedFile);
                fileHash.setHash(item.hash);
                fileHash.setHashType("SHA-256");
                fileHashRepository.save(fileHash);

                redisCacheService.cacheFile(savedFile);
                redisCacheService.cacheFileHash(item.hash, savedFile.getId());
            }
        });
    }

    private void flushPendingIndexBatch(List<PendingIndexRecord> batch) {
        if (batch.isEmpty()) return;
        List<PendingIndexRecord> copy = new ArrayList<>(batch);
        batch.clear();
        sqliteWriteQueueService.submitWrite(() -> {
            for (PendingIndexRecord item : copy) {
                DbFile dbFile = item.existingFile != null ? item.existingFile : new DbFile();
                dbFile.setPath(item.absolutePath);
                dbFile.setName(item.path.getFileName().toString());
                dbFile.setSize(item.fileSize);
                dbFile.setModifiedAt(item.modifiedTime);
                if (dbFile.getCreatedAt() == null) {
                    dbFile.setCreatedAt(LocalDateTime.now());
                }
                dbFile.setIsActive(true);
                DbFile savedFile = dbFileRepository.save(dbFile);
                redisCacheService.cacheFile(savedFile);
            }
        });
    }

    public String findDuplicates(String folderPath) {
        return backgroundTaskManager.submitTask(TaskType.DUPLICATE_SCAN, folderPath, null, "Scan for Duplicate Files", (taskId, reporter) -> {
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
                    if (reporter.isCancelled()) {
                        return FileVisitResult.TERMINATE;
                    }
                    String name = dir.getFileName() != null ? dir.getFileName().toString() : "";
                    if (ignoredPatterns.contains(name.toLowerCase())) {
                        return FileVisitResult.SKIP_SUBTREE;
                    }
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    if (reporter.isCancelled()) {
                        return FileVisitResult.TERMINATE;
                    }
                    if (attrs.isRegularFile()) {
                        allFiles.add(file);
                    }
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult visitFileFailed(Path file, IOException exc) throws IOException {
                    if (reporter.isCancelled()) {
                        return FileVisitResult.TERMINATE;
                    }
                    logger.warn("Skipping file/directory due to access restriction: {} ({})", file, exc.getMessage());
                    Map<String, Object> errorItem = new HashMap<>();
                    errorItem.put("path", file.toAbsolutePath().toString());
                    errorItem.put("failed", true);
                    errorItem.put("error", "Access Denied: " + exc.getMessage());
                    reporter.appendResult(errorItem);
                    return FileVisitResult.CONTINUE;
                }
            });

            if (reporter.isCancelled()) {
                return;
            }

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

            // Tier 1: Group by file size
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

            Map<String, List<Map<String, Object>>> duplicateGroups = new HashMap<>();
            List<PendingHashRecord> pendingHashes = new ArrayList<>();
            List<PendingIndexRecord> pendingIndices = new ArrayList<>();
            int processedCount = 0;

            for (Map.Entry<Long, List<Path>> sizeEntry : filesBySize.entrySet()) {
                if (reporter.isCancelled()) break;

                long fileSize = sizeEntry.getKey();
                List<Path> sameSizePaths = sizeEntry.getValue();

                if (sameSizePaths.size() == 1) {
                    // Unique size: completely unique file
                    Path path = sameSizePaths.get(0);
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
                            pendingIndices.add(new PendingIndexRecord(path, absolutePath, fileSize, modifiedTime, existingFile));
                            if (pendingIndices.size() >= 50) {
                                flushPendingIndexBatch(pendingIndices);
                            }
                        }
                    } catch (Exception e) {
                        logger.error("Failed to index unique file: {}", path, e);
                    } finally {
                        processedCount++;
                        reporter.reportProgress(((double) processedCount / totalFiles) * 100, "Skipped unique: " + path.getFileName());
                    }
                } else {
                    // Tier 2: Size match found (>1 files with same size).
                    // Compute 16KB header + 16KB footer partial hash.
                    Map<String, List<Path>> filesByPartialHash = new HashMap<>();
                    for (Path path : sameSizePaths) {
                        if (reporter.isCancelled()) break;
                        String partialHash = getPartialHash(path, fileSize);
                        if (partialHash != null) {
                            filesByPartialHash.computeIfAbsent(partialHash, k -> new ArrayList<>()).add(path);
                        } else {
                            // If partial hash failed, treat as isolated candidate
                            filesByPartialHash.computeIfAbsent(UUID.randomUUID().toString(), k -> new ArrayList<>()).add(path);
                        }
                    }

                    // Process partial hash groups
                    for (Map.Entry<String, List<Path>> partialEntry : filesByPartialHash.entrySet()) {
                        if (reporter.isCancelled()) break;

                        List<Path> candidatePaths = partialEntry.getValue();
                        if (candidatePaths.size() == 1) {
                            // Partial hash is unique: file cannot be a duplicate, skip full SHA-256!
                            Path path = candidatePaths.get(0);
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
                                    pendingIndices.add(new PendingIndexRecord(path, absolutePath, fileSize, modifiedTime, existingFile));
                                    if (pendingIndices.size() >= 50) {
                                        flushPendingIndexBatch(pendingIndices);
                                    }
                                }
                            } catch (Exception e) {
                                logger.error("Failed to index candidate file: {}", path, e);
                            } finally {
                                processedCount++;
                                reporter.reportProgress(((double) processedCount / totalFiles) * 100, "Skipped partial mismatch: " + path.getFileName());
                            }
                        } else {
                            // Tier 3: Candidates match both size AND partial hash!
                            // Compute or retrieve full SHA-256 hash.
                            for (Path path : candidatePaths) {
                                if (reporter.isCancelled()) break;
                                try {
                                    String absolutePath = path.toAbsolutePath().toString();
                                    LocalDateTime modifiedTime = LocalDateTime.ofInstant(
                                            Files.getLastModifiedTime(path).toInstant(),
                                            ZoneId.systemDefault()
                                    );

                                    String fullHash = null;
                                    DbFile existingFile = existingFilesMap.get(absolutePath);

                                    if (existingFile != null) {
                                        if (existingFile.getSize().equals(fileSize) &&
                                                (existingFile.getModifiedAt() != null &&
                                                        Math.abs(existingFile.getModifiedAt().atZone(ZoneId.systemDefault()).toEpochSecond() -
                                                                modifiedTime.atZone(ZoneId.systemDefault()).toEpochSecond()) < 2)) {

                                            FileHash existingHash = existingHashesMap.get(existingFile.getId());
                                            if (existingHash != null) {
                                                fullHash = existingHash.getHash();
                                                redisCacheService.cacheFile(existingFile);
                                                redisCacheService.cacheFileHash(fullHash, existingFile.getId());
                                            }
                                        }
                                    }

                                    if (fullHash == null) {
                                        fullHash = secureStorageService.getSha256(path);
                                        pendingHashes.add(new PendingHashRecord(path, absolutePath, fileSize, modifiedTime, fullHash, existingFile));
                                        if (pendingHashes.size() >= 50) {
                                            flushPendingHashBatch(pendingHashes);
                                        }
                                    }

                                    Map<String, Object> fileDetail = new HashMap<>();
                                    fileDetail.put("path", absolutePath);
                                    fileDetail.put("modifiedAt", modifiedTime.toString());
                                    duplicateGroups.computeIfAbsent(fullHash, k -> new ArrayList<>()).add(fileDetail);
                                } catch (Exception e) {
                                    logger.error("Failed to hash file: {}", path, e);
                                } finally {
                                    processedCount++;
                                    reporter.reportProgress(((double) processedCount / totalFiles) * 100, "Hashed: " + path.getFileName());
                                }
                            }
                        }
                    }
                }
            }

            // Flush remaining pending batches
            flushPendingHashBatch(pendingHashes);
            flushPendingIndexBatch(pendingIndices);

            // Group confirmed duplicates as output results
            for (Map.Entry<String, List<Map<String, Object>>> entry : duplicateGroups.entrySet()) {
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
        String actionDetails = (dryRun ? "Dry Run: " : "") + "Clean Duplicate Files (" + filesToDelete.size() + " files)";
        return backgroundTaskManager.submitTask(TaskType.DUPLICATE_CLEAN, null, null, actionDetails, (taskId, reporter) -> {
            int total = filesToDelete.size();
            int count = 0;
            List<String> deletedBatch = new ArrayList<>();

            for (String filePath : filesToDelete) {
                if (reporter.isCancelled()) break;

                Map<String, Object> fileResult = new HashMap<>();
                fileResult.put("filePath", filePath);
                fileResult.put("dryRun", dryRun);

                try {
                    if (!dryRun) {
                        Files.deleteIfExists(Paths.get(filePath));
                        deletedBatch.add(filePath);
                        if (deletedBatch.size() >= 50) {
                            flushDeletedBatch(deletedBatch);
                        }
                    }
                    fileResult.put("failed", false);
                } catch (Exception e) {
                    logger.error("Failed to delete duplicate file: {}", filePath, e);
                    fileResult.put("failed", true);
                    fileResult.put("error", e.getMessage());
                }

                reporter.appendResult(fileResult);
                count++;
                reporter.reportProgress(((double) count / total) * 100, (dryRun ? "Virtually deleted duplicate: " : "Deleted duplicate: ") + Paths.get(filePath).getFileName());
            }

            if (!dryRun && !deletedBatch.isEmpty()) {
                flushDeletedBatch(deletedBatch);
            }
        });
    }

    private void flushDeletedBatch(List<String> deletedBatch) {
        List<String> copy = new ArrayList<>(deletedBatch);
        deletedBatch.clear();
        sqliteWriteQueueService.submitWrite(() -> {
            for (String path : copy) {
                dbFileRepository.findByPath(path).ifPresent(dbFile -> {
                    dbFile.setIsActive(false);
                    dbFileRepository.save(dbFile);
                    redisCacheService.deleteFileCache(dbFile.getId());
                });
            }
        });
    }
}
