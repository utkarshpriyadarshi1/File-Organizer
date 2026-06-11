package com.updevlogics.eabhilekh.controller;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/analysis")
@CrossOrigin(origins = "*")
public class DirectoryAnalysisController {
    private static final Logger logger = LoggerFactory.getLogger(DirectoryAnalysisController.class);

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

    @GetMapping("/directory")
    public AnalysisResponse analyzeDirectory(@RequestParam String folderPath) throws IOException {
        logger.info("Request received to analyze directory sizes: {}", folderPath);
        Path rootPath = Paths.get(folderPath);
        if (!Files.exists(rootPath) || !Files.isDirectory(rootPath)) {
            logger.warn("Invalid directory path requested for analysis: {}", folderPath);
            throw new IllegalArgumentException("Invalid directory path.");
        }

        AnalysisResponse response = new AnalysisResponse();
        response.setFolderPath(rootPath.toAbsolutePath().toString());

        // Prepare categories
        String[] imageExts = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg", ".tiff"};
        String[] mediaExts = {".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".mp3", ".wav", ".flac", ".aac", ".m4a"};
        String[] docExts = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".rtf", ".odt", ".csv"};
        String[] archiveExts = {".zip", ".rar", ".7z", ".tar", ".gz", ".bz2"};
        String[] codeExts = {".java", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".json", ".xml", ".yml", ".yaml", ".py", ".c", ".cpp", ".sh", ".bat"};

        Map<String, CategoryStats> catMap = response.getCategories();
        catMap.put("Images", new CategoryStats("Images", 0, 0L));
        catMap.put("Media", new CategoryStats("Media", 0, 0L));
        catMap.put("Documents", new CategoryStats("Documents", 0, 0L));
        catMap.put("Archives", new CategoryStats("Archives", 0, 0L));
        catMap.put("Code/Text", new CategoryStats("Code/Text", 0, 0L));
        catMap.put("Others", new CategoryStats("Others", 0, 0L));

        Files.walkFileTree(rootPath, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                if (attrs.isRegularFile()) {
                    long size = attrs.size();
                    response.setTotalFiles(response.getTotalFiles() + 1);
                    response.setTotalSize(response.getTotalSize() + size);

                    String filename = file.getFileName().toString().toLowerCase();
                    String matchedCat = "Others";

                    if (matchesExtension(filename, imageExts)) matchedCat = "Images";
                    else if (matchesExtension(filename, mediaExts)) matchedCat = "Media";
                    else if (matchesExtension(filename, docExts)) matchedCat = "Documents";
                    else if (matchesExtension(filename, archiveExts)) matchedCat = "Archives";
                    else if (matchesExtension(filename, codeExts)) matchedCat = "Code/Text";

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

        logger.info("Completed analysis for directory: {}. Found {} files, total size: {} bytes", 
                folderPath, response.getTotalFiles(), response.getTotalSize());
        return response;
    }

    private boolean matchesExtension(String filename, String[] extensions) {
        for (String ext : extensions) {
            if (filename.endsWith(ext)) {
                return true;
            }
        }
        return false;
    }
}
