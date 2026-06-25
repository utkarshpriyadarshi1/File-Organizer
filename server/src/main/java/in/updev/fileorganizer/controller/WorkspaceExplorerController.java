package in.updev.fileorganizer.controller;

import in.updev.fileorganizer.services.PreferencesService;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/workspace")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WorkspaceExplorerController {
    private static final Logger logger = LoggerFactory.getLogger(WorkspaceExplorerController.class);

    private final PreferencesService preferencesService;

    @Data
    @Builder
    public static class TreeNode {
        private String name;
        private String path;
        private String type; // "directory" or "file"
        private Long size;
        private String modified;
        private List<TreeNode> children;
    }

    @GetMapping("/explorer")
    public TreeNode getWorkspaceTree(
            @RequestParam String folderPath,
            @RequestParam(required = false, defaultValue = "false") boolean virtual) {
        
        logger.info("Workspace explorer request received. Path: {}, Virtual: {}", folderPath, virtual);
        if (folderPath == null || folderPath.trim().isEmpty()) {
            throw new IllegalArgumentException("Folder path is required.");
        }

        Path rootPath = Paths.get(folderPath.trim());
        if (!Files.exists(rootPath) || !Files.isDirectory(rootPath)) {
            throw new IllegalArgumentException("Folder path does not exist or is not a directory.");
        }

        try {
            if (virtual) {
                return buildVirtualTree(rootPath);
            } else {
                return buildPhysicalTree(rootPath);
            }
        } catch (Exception e) {
            logger.error("Failed to construct workspace explorer tree for path: {}", folderPath, e);
            throw new RuntimeException("Failed to scan folder tree: " + e.getMessage(), e);
        }
    }

    private TreeNode buildPhysicalTree(Path rootPath) throws IOException {
        String rootName = rootPath.getFileName() != null ? rootPath.getFileName().toString() : rootPath.toString();
        TreeNode rootNode = TreeNode.builder()
                .name(rootName)
                .path(rootPath.toAbsolutePath().toString())
                .type("directory")
                .children(new ArrayList<>())
                .build();

        Map<Path, TreeNode> nodeMap = new HashMap<>();
        nodeMap.put(rootPath.toAbsolutePath(), rootNode);

        Files.walkFileTree(rootPath, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                if (dir.equals(rootPath)) {
                    return FileVisitResult.CONTINUE;
                }
                
                String name = dir.getFileName() != null ? dir.getFileName().toString() : "";
                if (name.equals("node_modules") || name.equals(".git") || name.equals("target") || name.equals("build")) {
                    return FileVisitResult.SKIP_SUBTREE;
                }

                TreeNode node = TreeNode.builder()
                        .name(name)
                        .path(dir.toAbsolutePath().toString())
                        .type("directory")
                        .children(new ArrayList<>())
                        .build();

                nodeMap.put(dir.toAbsolutePath(), node);

                Path parent = dir.getParent().toAbsolutePath();
                TreeNode parentNode = nodeMap.get(parent);
                if (parentNode != null) {
                    parentNode.getChildren().add(node);
                }

                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                if (attrs.isRegularFile()) {
                    String name = file.getFileName().toString();
                    String modifiedStr = LocalDateTime.ofInstant(attrs.lastModifiedTime().toInstant(), ZoneId.systemDefault())
                            .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

                    TreeNode fileNode = TreeNode.builder()
                            .name(name)
                            .path(file.toAbsolutePath().toString())
                            .type("file")
                            .size(attrs.size())
                            .modified(modifiedStr)
                            .build();

                    Path parent = file.getParent().toAbsolutePath();
                    TreeNode parentNode = nodeMap.get(parent);
                    if (parentNode != null) {
                        parentNode.getChildren().add(fileNode);
                    }
                }
                return FileVisitResult.CONTINUE;
            }
        });

        return rootNode;
    }

    private TreeNode buildVirtualTree(Path rootPath) throws IOException {
        String pattern = preferencesService.getPreferences().getFolderLayoutPattern();
        String rootName = rootPath.getFileName() != null ? rootPath.getFileName().toString() : rootPath.toString();
        
        TreeNode rootNode = TreeNode.builder()
                .name(rootName + " (Virtual Preview)")
                .path(rootPath.toAbsolutePath().toString())
                .type("directory")
                .children(new ArrayList<>())
                .build();

        List<Path> allFiles = new ArrayList<>();
        Files.walkFileTree(rootPath, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                String name = dir.getFileName() != null ? dir.getFileName().toString() : "";
                if (name.equals("node_modules") || name.equals(".git") || name.equals("target") || name.equals("build")) {
                    return FileVisitResult.SKIP_SUBTREE;
                }
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                if (attrs.isRegularFile()) {
                    allFiles.add(file);
                }
                return FileVisitResult.CONTINUE;
            }
        });

        for (Path file : allFiles) {
            String fileName = file.getFileName().toString();
            int lastDot = fileName.lastIndexOf('.');
            String ext = lastDot > 0 ? fileName.substring(lastDot + 1).toLowerCase() : "no_ext";

            String probedType = null;
            try {
                probedType = Files.probeContentType(file);
            } catch (IOException e) {
                // ignore
            }
            String fileType = probedType != null ? probedType : "unknown";

            String lastModified = Files.getLastModifiedTime(file).toString();
            String yearMonth = lastModified.substring(0, Math.min(7, lastModified.length()));
            String year = lastModified.substring(0, Math.min(4, lastModified.length()));
            String month = lastModified.length() > 7 ? lastModified.substring(5, 7) : "01";
            String day = lastModified.length() > 10 ? lastModified.substring(8, 10) : "01";

            String resolvedLayout = pattern
                    .replace("{fileType}", fileType)
                    .replace("{extension}", ext)
                    .replace("{yearMonth}", yearMonth)
                    .replace("{year}", year)
                    .replace("{month}", month)
                    .replace("{day}", day);

            String[] segments = resolvedLayout.split("/");
            TreeNode currentNode = rootNode;

            for (String segment : segments) {
                segment = segment.trim();
                if (segment.isEmpty()) continue;

                TreeNode childNode = findChildDirectory(currentNode, segment);
                if (childNode == null) {
                    String subPath = currentNode.getPath() + "/" + segment;
                    childNode = TreeNode.builder()
                            .name(segment)
                            .path(subPath)
                            .type("directory")
                            .children(new ArrayList<>())
                            .build();
                    currentNode.getChildren().add(childNode);
                }
                currentNode = childNode;
            }

            String modifiedStr = Files.getLastModifiedTime(file).toInstant()
                    .atZone(ZoneId.systemDefault())
                    .toLocalDateTime()
                    .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

            TreeNode fileNode = TreeNode.builder()
                    .name(fileName)
                    .path(file.toAbsolutePath().toString())
                    .type("file")
                    .size(Files.size(file))
                    .modified(modifiedStr)
                    .build();
            currentNode.getChildren().add(fileNode);
        }

        return rootNode;
    }

    private TreeNode findChildDirectory(TreeNode parent, String name) {
        if (parent.getChildren() == null) return null;
        for (TreeNode child : parent.getChildren()) {
            if ("directory".equals(child.getType()) && name.equalsIgnoreCase(child.getName())) {
                return child;
            }
        }
        return null;
    }
}
