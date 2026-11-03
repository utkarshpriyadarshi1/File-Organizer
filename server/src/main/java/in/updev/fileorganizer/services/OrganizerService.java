package in.updev.fileorganizer.services;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import in.updev.fileorganizer.entities.DbFile;
import in.updev.fileorganizer.entities.FileReversal;
import in.updev.fileorganizer.enums.TaskType;
import in.updev.fileorganizer.repositories.DbFileRepository;
import in.updev.fileorganizer.repositories.FileReversalRepository;
import in.updev.fileorganizer.repositories.IgnoreRuleRepository;
import in.updev.fileorganizer.repositories.AppSettingRepository;
import in.updev.fileorganizer.utils.FileUtils;
import in.updev.fileorganizer.utils.FileUtils.FileEntry;
import in.updev.fileorganizer.dto.DiskAnalyzerConfigDto;
import in.updev.fileorganizer.dto.PatternGroupDto;
import in.updev.fileorganizer.dto.CategoryConfigDto;
import in.updev.fileorganizer.entities.AppSetting;
import org.springframework.util.AntPathMatcher;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;
import java.util.ArrayList;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OrganizerService {
    private static final Logger logger = LoggerFactory.getLogger(OrganizerService.class);

    private final DbFileRepository dbFileRepository;
    private final FileReversalRepository fileReversalRepository;
    private final SqliteWriteQueueService sqliteWriteQueueService;
    private final RedisCacheService redisCacheService;
    private final AuditLogService auditLogService;

    private final BackgroundTaskManager backgroundTaskManager;
    private final SecureStorageService secureStorageService;
    private final IgnoreRuleRepository ignoreRuleRepository;
    private final PreferencesService preferencesService;
    private final AppSettingRepository appSettingRepository;
    private final ObjectMapper objectMapper;

    private static final AntPathMatcher pathMatcher = new AntPathMatcher();

    private final Map<String, String> mimeTypeCache = new ConcurrentHashMap<>();

    private String getMimeType(Path file, String ext) {
        if (mimeTypeCache.containsKey(ext)) {
            return mimeTypeCache.get(ext);
        }
        try {
            String probed = Files.probeContentType(file);
            if (probed != null) {
                mimeTypeCache.put(ext, probed);
                return probed;
            }
        } catch (IOException e) {
            // ignore
        }
        return "unknown";
    }

    private static class OrganizeBatchRecord {
        final String oldPath;
        final String newPath;
        final String fileName;
        final long fileSize;
        final String fileType;

        OrganizeBatchRecord(String oldPath, String newPath, String fileName, long fileSize, String fileType) {
            this.oldPath = oldPath;
            this.newPath = newPath;
            this.fileName = fileName;
            this.fileSize = fileSize;
            this.fileType = fileType;
        }
    }

    private void flushOrganizeBatch(List<OrganizeBatchRecord> batch, String taskId) {
        if (batch.isEmpty()) return;
        List<OrganizeBatchRecord> copy = new ArrayList<>(batch);
        batch.clear();
        sqliteWriteQueueService.submitWrite(() -> {
            List<DbFile> filesToSave = new ArrayList<>();
            List<FileReversal> reversalsToSave = new ArrayList<>();

            for (OrganizeBatchRecord record : copy) {
                DbFile dbFile = dbFileRepository.findByPath(record.oldPath)
                        .orElse(new DbFile());

                dbFile.setPath(record.newPath);
                dbFile.setName(record.fileName);
                dbFile.setSize(record.fileSize);
                dbFile.setType(record.fileType);
                dbFile.setIsActive(true);
                dbFile.setModifiedAt(LocalDateTime.now());
                if (dbFile.getCreatedAt() == null) {
                    dbFile.setCreatedAt(LocalDateTime.now());
                }

                filesToSave.add(dbFile);
                reversalsToSave.add(FileReversal.builder()
                        .taskId(taskId)
                        .operationType("MOVE")
                        .sourcePath(record.newPath)
                        .originalPath(record.oldPath)
                        .build());
            }

            List<DbFile> savedFiles = dbFileRepository.saveAll(filesToSave);
            fileReversalRepository.saveAll(reversalsToSave);

            for (int i = 0; i < savedFiles.size(); i++) {
                DbFile savedFile = savedFiles.get(i);
                OrganizeBatchRecord record = copy.get(i);
                redisCacheService.cacheFile(savedFile);
                auditLogService.logAction("FILE_ORGANIZED", savedFile,
                        "Moved from " + record.oldPath + " to " + record.newPath);
            }
        });
    }

    public String organizeFiles(String sourceFolder, String destinationFolder, boolean dryRun) {
        return organizeFiles(sourceFolder, destinationFolder, dryRun, null, null, false);
    }

    public String organizeFiles(String sourceFolder, String destinationFolder, boolean dryRun, String patternGroupName, String layoutPatternOverride, boolean cleanEmptyFolders) {
        String actionDetails = (dryRun ? "Dry run: Organize " : "Organize ") + "files";
        return backgroundTaskManager.submitTask(TaskType.ORGANIZE, sourceFolder, destinationFolder, actionDetails,
                (taskId, reporter) -> {
                    Path sourcePath = Paths.get(sourceFolder);
                    Path destPath = Paths.get(destinationFolder);
                    if (!dryRun) {
                        Files.createDirectories(destPath);
                    }

                    List<String> ignoredPatterns = ignoreRuleRepository.findAll().stream()
                            .map(rule -> rule.getPattern().toLowerCase())
                            .collect(Collectors.toList());

                    // Gather file entries with metadata in a single filesystem pass
                    List<FileEntry> allFiles = FileUtils.getAllRegularFileEntries(sourcePath, ignoredPatterns, (file, exc) -> {
                        Map<String, Object> errorItem = new HashMap<>();
                        errorItem.put("oldPath", file.toAbsolutePath().toString());
                        errorItem.put("failed", true);
                        errorItem.put("error", "Access Denied: " + exc.getMessage());
                        reporter.appendResult(errorItem);
                    }, reporter::isCancelled);

                    int total = allFiles.size();
                    int count = 0;
                    List<OrganizeBatchRecord> pendingBatch = new ArrayList<>();
                    Set<Path> createdDirs = ConcurrentHashMap.newKeySet();

                    List<CategoryConfigDto> categories = new ArrayList<>();
                    try {
                        Optional<AppSetting> settingOpt = appSettingRepository.findByKey("disk_analyzer_config");
                        if (settingOpt.isPresent()) {
                            DiskAnalyzerConfigDto config = objectMapper.readValue(settingOpt.get().getValue(), DiskAnalyzerConfigDto.class);
                            if (config != null && config.getPatternGroups() != null && !config.getPatternGroups().isEmpty()) {
                                PatternGroupDto activeGroup = null;
                                if (patternGroupName != null) {
                                    activeGroup = config.getPatternGroups().stream()
                                            .filter(g -> patternGroupName.equals(g.getName()))
                                            .findFirst().orElse(null);
                                }
                                if (activeGroup == null) activeGroup = config.getPatternGroups().get(0);
                                if (activeGroup.getCategories() != null) {
                                    categories = activeGroup.getCategories();
                                }
                            }
                        }
                    } catch (Exception e) {
                        logger.error("Failed to parse disk analyzer config in organizer", e);
                    }

                    // Pre-resolve layout pattern once outside loop
                    String layoutPattern = (layoutPatternOverride != null && !layoutPatternOverride.trim().isEmpty())
                            ? layoutPatternOverride
                            : preferencesService.getPreferences().getFolderLayoutPattern();

                    for (FileEntry entry : allFiles) {
                        if (reporter.isCancelled()) {
                            logger.info("Organize files task {} canceled at file loop.", taskId);
                            break;
                        }
                        reporter.checkPauseState();

                        Path file = entry.getPath();
                        Map<String, Object> fileResult = new HashMap<>();
                        String oldPath = file.toAbsolutePath().toString();
                        fileResult.put("oldPath", oldPath);
                        fileResult.put("dryRun", dryRun);

                        try {
                            long fileSize = entry.getSize();
                            long lastModMillis = entry.getLastModifiedMillis();

                            Path targetDir = resolveTargetDirectory(file, fileSize, lastModMillis, layoutPattern, destPath, categories);
                            Path targetPath = targetDir.resolve(file.getFileName());

                            String fileName = targetPath.getFileName().toString();
                            int lastDot = fileName.lastIndexOf('.');
                            String ext = lastDot > 0 ? fileName.substring(lastDot + 1).toLowerCase() : "no_ext";
                            String fileType = getMimeType(file, ext);
                            String newPath = targetPath.toAbsolutePath().toString();

                            if (dryRun) {
                                if (!Files.isReadable(file) || !Files.isWritable(file)) {
                                    throw new java.nio.file.AccessDeniedException(file.toString(), null, "Insufficient permissions to read or write file");
                                }
                                Path checkDir = targetDir;
                                while (checkDir != null && !Files.exists(checkDir)) {
                                    checkDir = checkDir.getParent();
                                }
                                if (checkDir != null && !Files.isWritable(checkDir)) {
                                    throw new java.nio.file.AccessDeniedException(checkDir.toString(), null, "Insufficient permissions to write to destination directory");
                                }
                            } else {
                                if (createdDirs.add(targetDir)) {
                                    Files.createDirectories(targetDir);
                                }
                                // Fast secure move
                                secureStorageService.secureMove(file, targetPath, false, null);
                            }

                            fileResult.put("newPath", newPath);
                            fileResult.put("failed", false);

                            if (!dryRun) {
                                pendingBatch.add(new OrganizeBatchRecord(oldPath, newPath, fileName, fileSize, fileType));
                                if (pendingBatch.size() >= 50) {
                                    flushOrganizeBatch(pendingBatch, taskId);
                                }
                            }

                        } catch (Exception e) {
                            logger.error("Failed to organize file: {}", file, e);
                            fileResult.put("failed", true);
                            fileResult.put("error", e.getMessage());
                        }

                        reporter.appendResult(fileResult);
                        count++;
                        reporter.reportProgress(((double) count / total) * 100,
                                (dryRun ? "Virtually organized: " : "Organized: ") + file.getFileName());
                    }

                    if (!dryRun && !pendingBatch.isEmpty()) {
                        flushOrganizeBatch(pendingBatch, taskId);
                    }

                    if (cleanEmptyFolders) {
                        try {
                            Files.walkFileTree(sourcePath, new java.nio.file.SimpleFileVisitor<Path>() {
                                @Override
                                public java.nio.file.FileVisitResult postVisitDirectory(Path dir, IOException exc) throws IOException {
                                    if (reporter.isCancelled()) return java.nio.file.FileVisitResult.TERMINATE;
                                    
                                    if (dir.equals(sourcePath) || dir.equals(destPath)) return java.nio.file.FileVisitResult.CONTINUE;

                                    try (java.nio.file.DirectoryStream<Path> stream = Files.newDirectoryStream(dir)) {
                                        if (!stream.iterator().hasNext()) { 
                                            Map<String, Object> cleanupResult = new HashMap<>();
                                            cleanupResult.put("oldPath", dir.toAbsolutePath().toString());
                                            cleanupResult.put("dryRun", dryRun);
                                            cleanupResult.put("isFolder", true);
                                            
                                            if (!dryRun) {
                                                Files.delete(dir);
                                                cleanupResult.put("failed", false);
                                                cleanupResult.put("newPath", "DELETED");
                                            } else {
                                                cleanupResult.put("failed", false);
                                                cleanupResult.put("newPath", "WILL_DELETE");
                                            }
                                            reporter.appendResult(cleanupResult);
                                            reporter.reportProgress(100.0, (dryRun ? "Virtually cleaned empty folder: " : "Cleaned empty folder: ") + dir.getFileName());
                                        }
                                    } catch (Exception e) {
                                        logger.error("Failed to check or delete empty folder: {}", dir, e);
                                    }
                                    return java.nio.file.FileVisitResult.CONTINUE;
                                }
                            });
                        } catch (IOException e) {
                            logger.error("Error during empty folder cleanup", e);
                        }
                    }
                });
    }

    public Path resolveTargetDirectory(Path file, String pattern, Path destPath, List<CategoryConfigDto> categories) {
        long size = 0L;
        long lastMod = System.currentTimeMillis();
        try {
            size = Files.size(file);
            lastMod = Files.getLastModifiedTime(file).toMillis();
        } catch (Exception e) {
            // ignore
        }
        return resolveTargetDirectory(file, size, lastMod, pattern, destPath, categories);
    }

    public Path resolveTargetDirectory(Path file, long fileSize, long lastModifiedMillis, String pattern, Path destPath, List<CategoryConfigDto> categories) {
        String fileName = file.getFileName().toString();
        int lastDot = fileName.lastIndexOf('.');
        String ext = lastDot > 0 ? fileName.substring(lastDot + 1).toLowerCase() : "no_ext";
        String fileType = getMimeType(file, ext);

        LocalDateTime lastModified;
        try {
            lastModified = LocalDateTime.ofInstant(Instant.ofEpochMilli(lastModifiedMillis), ZoneId.systemDefault());
        } catch (Exception e) {
            lastModified = LocalDateTime.now();
        }

        String year = String.format("%04d", lastModified.getYear());
        String month = String.format("%02d", lastModified.getMonthValue());
        String day = String.format("%02d", lastModified.getDayOfMonth());
        String yearMonth = year + "-" + month;
        String quarter = "Q" + ((lastModified.getMonthValue() - 1) / 3 + 1);
        String decade = (lastModified.getYear() / 10 * 10) + "s";

        String alpha = "#";
        if (!fileName.isEmpty()) {
            char first = Character.toUpperCase(fileName.charAt(0));
            if (first >= 'A' && first <= 'Z') alpha = String.valueOf(first);
        }

        String sizeCategory;
        if (fileSize < 1024 * 1024) sizeCategory = "01_Tiny";
        else if (fileSize < 10 * 1024 * 1024) sizeCategory = "02_Small";
        else if (fileSize < 100 * 1024 * 1024) sizeCategory = "03_Medium";
        else if (fileSize < 1024 * 1024 * 1024) sizeCategory = "04_Large";
        else sizeCategory = "05_Huge";

        String category = "Others";
        for (CategoryConfigDto cat : categories) {
            if (cat.getPatterns() != null) {
                boolean matched = false;
                for (String catPattern : cat.getPatterns()) {
                    if (pathMatcher.match(catPattern.toLowerCase(), fileName.toLowerCase())) {
                        matched = true;
                        break;
                    }
                }
                if (matched) {
                    category = cat.getName();
                    break;
                }
            }
        }

        Path resolved = destPath;
        String[] segments = pattern.split("/");
        for (String segment : segments) {
            segment = segment.trim();
            if (segment.isEmpty())
                continue;
            String resolvedSegment = segment
                    .replace("{fileType}", fileType)
                    .replace("{extension}", ext)
                    .replace("{yearMonth}", yearMonth)
                    .replace("{year}", year)
                    .replace("{month}", month)
                    .replace("{day}", day)
                    .replace("{quarter}", quarter)
                    .replace("{decade}", decade)
                    .replace("{alpha}", alpha)
                    .replace("{sizeCategory}", sizeCategory)
                    .replace("{category}", category);
            resolved = resolved.resolve(resolvedSegment);
        }
        return resolved;
    }
}
