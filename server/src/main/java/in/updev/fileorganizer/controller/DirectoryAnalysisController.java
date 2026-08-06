package in.updev.fileorganizer.controller;

import in.updev.fileorganizer.entities.AnalysisFileRecord;
import in.updev.fileorganizer.entities.AppSetting;
import in.updev.fileorganizer.enums.TaskType;
import in.updev.fileorganizer.repositories.AnalysisFileRecordRepository;
import in.updev.fileorganizer.repositories.AppSettingRepository;
import in.updev.fileorganizer.services.BackgroundTaskManager;
import in.updev.fileorganizer.dto.DiskAnalyzerConfigDto;
import in.updev.fileorganizer.dto.CategoryConfigDto;
import org.springframework.util.AntPathMatcher;
import in.updev.fileorganizer.dto.PerformanceConfigDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analysis")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class DirectoryAnalysisController {
    private static final Logger logger = LoggerFactory.getLogger(DirectoryAnalysisController.class);

    private final BackgroundTaskManager backgroundTaskManager;
    private final AnalysisFileRecordRepository fileRecordRepository;
    private final AppSettingRepository appSettingRepository;
    private final ObjectMapper objectMapper;

    private static final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryStats {
        private String category;
        private int fileCount = 0;
        private long totalSize = 0L;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnalysisResponse {
        private String folderPath;
        private int totalFiles = 0;
        private long totalSize = 0L;
        private Map<String, CategoryStats> categories = new HashMap<>();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FolderItem {
        private String name;
        private String path;
        private boolean accessible;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BrowseResponse {
        private String currentPath;
        private java.util.List<FolderItem> folders;
        private java.util.List<String> drives;
        private String error;
    }

    private boolean isDirectoryAccessible(Path path) {
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(path)) {
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @GetMapping("/browse")
    public BrowseResponse browseFolders(@RequestParam(required = false) String path) {
        java.util.List<FolderItem> folders = new java.util.ArrayList<>();
        java.util.List<String> drives = new java.util.ArrayList<>();
        String errorMsg = null;

        for (Path root : FileSystems.getDefault().getRootDirectories()) {
            if (isDirectoryAccessible(root)) {
                drives.add(root.toString());
            }
        }

        Path targetPath;
        try {
            if (path == null || path.trim().isEmpty()) {
                targetPath = Paths.get(System.getProperty("user.home"));
            } else {
                targetPath = Paths.get(path);
            }

            if (!Files.exists(targetPath) || !Files.isDirectory(targetPath)) {
                targetPath = Paths.get(System.getProperty("user.home"));
            }
        } catch (Exception e) {
            logger.warn("Invalid path or home directory inaccessible: {}", path, e);
            if (!drives.isEmpty()) {
                targetPath = Paths.get(drives.get(0));
            } else {
                targetPath = Paths.get("/");
            }
            errorMsg = "Invalid or restricted directory path specified.";
        }

        try {
            Path parent = targetPath.getParent();
            if (parent != null) {
                folders.add(new FolderItem("..", parent.toAbsolutePath().toString(), true));
            }
        } catch (Exception e) {
            // Ignore parent resolution errors
        }

        try (DirectoryStream<Path> stream = Files.newDirectoryStream(targetPath)) {
            for (Path entry : stream) {
                try {
                    if (Files.isDirectory(entry) && !Files.isHidden(entry)) {
                        boolean accessible = isDirectoryAccessible(entry);
                        folders.add(new FolderItem(entry.getFileName().toString(), entry.toAbsolutePath().toString(), accessible));
                    }
                } catch (Exception e) {
                    // Ignore inaccessible subdirectories
                }
            }
        } catch (Exception e) {
            logger.error("Error browsing directory: {}", targetPath, e);
            errorMsg = "Access Denied: You do not have permission to read this directory.";
        }

        try {
            folders.sort((a, b) -> {
                if (a.getName().equals("..")) return -1;
                if (b.getName().equals("..")) return 1;
                return a.getName().compareToIgnoreCase(b.getName());
            });
        } catch (Exception e) {
            // Ignore sorting errors
        }

        return new BrowseResponse(targetPath.toAbsolutePath().toString(), folders, drives, errorMsg);
    }

    // Keep the old synchronous endpoint just in case, though the UI will use /analyze now
    @GetMapping("/directory")
    public AnalysisResponse analyzeDirectory(@RequestParam String folderPath) throws IOException {
        logger.info("Request received to analyze directory sizes synchronously: {}", folderPath);
        Path rootPath = Paths.get(folderPath);
        if (!Files.exists(rootPath) || !Files.isDirectory(rootPath)) {
            logger.warn("Invalid directory path requested for analysis: {}", folderPath);
            throw new IllegalArgumentException("Invalid directory path.");
        }

        AnalysisResponse response = new AnalysisResponse();
        response.setFolderPath(rootPath.toAbsolutePath().toString());

        DiskAnalyzerConfigDto config = getDiskAnalyzerConfig();
        Map<String, CategoryStats> catMap = response.getCategories();
        initCategoryStats(catMap, config);

        Files.walkFileTree(rootPath, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                if (attrs.isRegularFile()) {
                    long size = attrs.size();
                    response.setTotalFiles(response.getTotalFiles() + 1);
                    response.setTotalSize(response.getTotalSize() + size);
                    String matchedCat = getFileCategory(file.getFileName().toString().toLowerCase(), config);
                    CategoryStats stats = catMap.get(matchedCat);
                    stats.setFileCount(stats.getFileCount() + 1);
                    stats.setTotalSize(stats.getTotalSize() + size);
                }
                return FileVisitResult.CONTINUE;
            }
            @Override
            public FileVisitResult visitFileFailed(Path file, IOException exc) throws IOException {
                return FileVisitResult.CONTINUE;
            }
        });
        return response;
    }

    @PostMapping("/analyze")
    public String analyzeDirectoryAsync(@RequestBody Map<String, String> payload) {
        String folderPath = payload.get("folderPath");
        logger.info("Request received to analyze directory asynchronously: {}", folderPath);
        
        return backgroundTaskManager.submitTask(TaskType.DISK_ANALYSIS, folderPath, null, "Analyze Disk Space", (taskId, reporter) -> {
            Path rootPath = Paths.get(folderPath);
            if (!Files.exists(rootPath) || !Files.isDirectory(rootPath)) {
                throw new IllegalArgumentException("Invalid directory path.");
            }

            AnalysisResponse response = new AnalysisResponse();
            response.setFolderPath(rootPath.toAbsolutePath().toString());
            
            DiskAnalyzerConfigDto config = getDiskAnalyzerConfig();
            PerformanceConfigDto perfConfig = getPerformanceConfig();
            Map<String, CategoryStats> catMap = response.getCategories();
            initCategoryStats(catMap, config);
            
            List<AnalysisFileRecord> batch = new ArrayList<>();
            final int BATCH_SIZE = perfConfig.getBatchSize();
            long startTime = System.currentTimeMillis();

            try {
                Files.walkFileTree(rootPath, new SimpleFileVisitor<Path>() {
                    @Override
                    public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                        if (reporter.isCancelled()) {
                            return FileVisitResult.TERMINATE;
                        }
                        if (attrs.isRegularFile()) {
                            long size = attrs.size();
                            response.setTotalFiles(response.getTotalFiles() + 1);
                            response.setTotalSize(response.getTotalSize() + size);

                            String matchedCat = getFileCategory(file.getFileName().toString().toLowerCase(), config);
                            CategoryStats stats = catMap.get(matchedCat);
                            stats.setFileCount(stats.getFileCount() + 1);
                            stats.setTotalSize(stats.getTotalSize() + size);

                            LocalDateTime modifiedTime = LocalDateTime.ofInstant(
                                attrs.lastModifiedTime().toInstant(), ZoneId.systemDefault()
                            );
                            
                            AnalysisFileRecord record = new AnalysisFileRecord();
                            record.setTaskId(taskId);
                            record.setCategory(matchedCat);
                            record.setFilePath(file.toAbsolutePath().toString());
                            record.setSize(size);
                            record.setModifiedAt(modifiedTime);
                            batch.add(record);

                            if (batch.size() >= BATCH_SIZE) {
                                fileRecordRepository.saveAll(batch);
                                batch.clear();
                                reporter.reportProgress(0.0, "Analyzed " + response.getTotalFiles() + " files...");
                            }
                        }
                        return FileVisitResult.CONTINUE;
                    }

                    @Override
                    public FileVisitResult visitFileFailed(Path file, IOException exc) throws IOException {
                        return reporter.isCancelled() ? FileVisitResult.TERMINATE : FileVisitResult.CONTINUE;
                    }
                });
                
                if (!batch.isEmpty()) {
                    fileRecordRepository.saveAll(batch);
                    batch.clear();
                }

                if (!reporter.isCancelled()) {
                    long duration = System.currentTimeMillis() - startTime;
                    logger.info("Disk analysis completed in {} ms for {} files with batch size {}", duration, response.getTotalFiles(), BATCH_SIZE);
                    reporter.appendResult(response);
                    reporter.reportProgress(100.0, "Completed analysis of " + response.getTotalFiles() + " files in " + duration + " ms.");
                }

            } catch (Exception e) {
                logger.error("Disk analysis failed", e);
                throw new RuntimeException("Disk analysis failed", e);
            }
        });
    }

    @GetMapping("/{taskId}/files")
    public Page<AnalysisFileRecord> getTaskFiles(
            @PathVariable String taskId,
            @RequestParam String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        return fileRecordRepository.findByTaskIdAndCategory(taskId, category, pageable);
    }

    private DiskAnalyzerConfigDto getDiskAnalyzerConfig() {
        try {
            java.util.Optional<AppSetting> settingOpt = appSettingRepository.findByKey("disk_analyzer_config");
            if (settingOpt.isPresent()) {
                return objectMapper.readValue(settingOpt.get().getValue(), DiskAnalyzerConfigDto.class);
            }
        } catch (Exception e) {
            logger.error("Failed to parse disk analyzer config", e);
        }
        
        DiskAnalyzerConfigDto defaultConfig = new DiskAnalyzerConfigDto();
        List<CategoryConfigDto> cats = new ArrayList<>();
        cats.add(new CategoryConfigDto("Images", List.of("*.jpg", "*.jpeg", "*.png", "*.gif", "*.bmp", "*.webp", "*.svg", "*.tiff")));
        cats.add(new CategoryConfigDto("Media", List.of("*.mp4", "*.mkv", "*.avi", "*.mov", "*.wmv", "*.flv", "*.mp3", "*.wav", "*.flac", "*.aac", "*.m4a")));
        cats.add(new CategoryConfigDto("Documents", List.of("*.pdf", "*.doc", "*.docx", "*.xls", "*.xlsx", "*.ppt", "*.pptx", "*.txt", "*.rtf", "*.odt", "*.csv")));
        cats.add(new CategoryConfigDto("Archives", List.of("*.zip", "*.rar", "*.7z", "*.tar", "*.gz", "*.bz2")));
        cats.add(new CategoryConfigDto("Code/Text", List.of("*.java", "*.js", "*.jsx", "*.ts", "*.tsx", "*.html", "*.css", "*.json", "*.xml", "*.yml", "*.yaml", "*.py", "*.c", "*.cpp", "*.sh", "*.bat")));
        defaultConfig.setCategories(cats);
        return defaultConfig;
    }

    private PerformanceConfigDto getPerformanceConfig() {
        try {
            java.util.Optional<AppSetting> settingOpt = appSettingRepository.findByKey("performance_config");
            if (settingOpt.isPresent()) {
                return objectMapper.readValue(settingOpt.get().getValue(), PerformanceConfigDto.class);
            }
        } catch (Exception e) {
            logger.error("Failed to parse performance config", e);
        }
        return new PerformanceConfigDto(1000);
    }

    private void initCategoryStats(Map<String, CategoryStats> catMap, DiskAnalyzerConfigDto config) {
        if (config != null && config.getCategories() != null) {
            for (CategoryConfigDto cat : config.getCategories()) {
                catMap.put(cat.getName(), new CategoryStats(cat.getName(), 0, 0L));
            }
        }
        catMap.put("Others", new CategoryStats("Others", 0, 0L));
    }

    private String getFileCategory(String filename, DiskAnalyzerConfigDto config) {
        if (config != null && config.getCategories() != null) {
            for (CategoryConfigDto cat : config.getCategories()) {
                if (matchesPattern(filename, cat.getPatterns())) {
                    return cat.getName();
                }
            }
        }
        return "Others";
    }

    private boolean matchesPattern(String filename, List<String> patterns) {
        if (patterns == null) return false;
        for (String pattern : patterns) {
            // Case-insensitive match or match directly
            if (pathMatcher.match(pattern.toLowerCase(), filename.toLowerCase())) {
                return true;
            }
        }
        return false;
    }
}
