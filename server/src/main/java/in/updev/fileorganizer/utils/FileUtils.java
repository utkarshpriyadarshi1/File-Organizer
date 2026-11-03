package in.updev.fileorganizer.utils;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.List;
import java.util.function.BiConsumer;

public class FileUtils {
    private static final Logger logger = LoggerFactory.getLogger(FileUtils.class);

    public static class FileEntry {
        private final Path path;
        private final long size;
        private final long lastModifiedMillis;

        public FileEntry(Path path, long size, long lastModifiedMillis) {
            this.path = path;
            this.size = size;
            this.lastModifiedMillis = lastModifiedMillis;
        }

        public Path getPath() {
            return path;
        }

        public long getSize() {
            return size;
        }

        public long getLastModifiedMillis() {
            return lastModifiedMillis;
        }
    }

    public static List<Path> getAllRegularFiles(Path sourceDir, BiConsumer<Path, IOException> errorHandler) throws IOException {
        return getAllRegularFiles(sourceDir, new ArrayList<>(), errorHandler, () -> false);
    }

    public static List<Path> getAllRegularFiles(Path sourceDir, BiConsumer<Path, IOException> errorHandler, java.util.function.Supplier<Boolean> cancelChecker) throws IOException {
        return getAllRegularFiles(sourceDir, new ArrayList<>(), errorHandler, cancelChecker);
    }

    public static List<Path> getAllRegularFiles(Path sourceDir, List<String> extraIgnoredDirs, BiConsumer<Path, IOException> errorHandler) throws IOException {
        return getAllRegularFiles(sourceDir, extraIgnoredDirs, errorHandler, () -> false);
    }

    public static List<Path> getAllRegularFiles(Path sourceDir, List<String> extraIgnoredDirs, BiConsumer<Path, IOException> errorHandler, java.util.function.Supplier<Boolean> cancelChecker) throws IOException {
        List<Path> paths = new ArrayList<>();
        List<FileEntry> entries = getAllRegularFileEntries(sourceDir, extraIgnoredDirs, errorHandler, cancelChecker);
        for (FileEntry entry : entries) {
            paths.add(entry.getPath());
        }
        return paths;
    }

    public static List<FileEntry> getAllRegularFileEntries(Path sourceDir, List<String> extraIgnoredDirs, BiConsumer<Path, IOException> errorHandler, java.util.function.Supplier<Boolean> cancelChecker) throws IOException {
        List<FileEntry> allFiles = new ArrayList<>();
        if (!Files.exists(sourceDir)) {
            return allFiles;
        }

        Files.walkFileTree(sourceDir, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                if (cancelChecker != null && cancelChecker.get()) {
                    return FileVisitResult.TERMINATE;
                }
                String name = dir.getFileName() != null ? dir.getFileName().toString() : "";
                String lowerName = name.toLowerCase();
                if (lowerName.equals("node_modules") || lowerName.equals(".git") || lowerName.equals("target") || lowerName.equals(".idea") || lowerName.equals("build")) {
                    return FileVisitResult.SKIP_SUBTREE;
                }
                
                // OS-based global exclusions
                if (lowerName.equals("system volume information") || 
                    lowerName.equals("$recycle.bin") || 
                    lowerName.equals("windows") || 
                    lowerName.equals("program files") || 
                    lowerName.equals("program files (x86)") || 
                    lowerName.equals("programdata") || 
                    lowerName.equals("appdata")) {
                    return FileVisitResult.SKIP_SUBTREE;
                }

                if (extraIgnoredDirs != null && extraIgnoredDirs.contains(lowerName)) {
                    return FileVisitResult.SKIP_SUBTREE;
                }
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                if (cancelChecker != null && cancelChecker.get()) {
                    return FileVisitResult.TERMINATE;
                }
                if (attrs.isRegularFile()) {
                    allFiles.add(new FileEntry(file, attrs.size(), attrs.lastModifiedTime().toMillis()));
                }
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFileFailed(Path file, IOException exc) throws IOException {
                logger.warn("Scan skipping path due to restriction: {} ({})", file, exc.getMessage());
                if (errorHandler != null) {
                    errorHandler.accept(file, exc);
                }
                return FileVisitResult.CONTINUE;
            }
        });
        return allFiles;
    }
}
