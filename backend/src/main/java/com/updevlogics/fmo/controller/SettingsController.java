package com.updevlogics.fmo.controller;

import com.updevlogics.fmo.entities.BackgroundTask;
import com.updevlogics.fmo.repositories.BackgroundTaskRepository;
import com.updevlogics.fmo.services.DirectoryStatsProvider;
import com.updevlogics.fmo.services.DirectoryStatsProvider.FolderStats;
import com.updevlogics.fmo.services.FilePurgeService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SettingsController {
    private static final Logger logger = LoggerFactory.getLogger(SettingsController.class);

    private final DirectoryStatsProvider directoryStatsProvider;
    private final FilePurgeService filePurgeService;
    private final BackgroundTaskRepository backgroundTaskRepository;

    private static final String REPORTS_DIR = System.getProperty("user.home") + "/AppData/Local/FBOSS/reports";
    private static final String TEMP_DIR = System.getProperty("user.home") + "/AppData/Local/FBOSS/temp";
    private static final String LOGS_DIR = System.getProperty("user.home") + "/AppData/Local/FBOSS/logs";

    @GetMapping("/cache")
    public List<FolderStats> getCacheStats() {
        logger.info("Request received to check folder cache sizes");
        List<FolderStats> stats = new ArrayList<>();
        stats.add(directoryStatsProvider.getStats(Paths.get(REPORTS_DIR), "reports"));
        stats.add(directoryStatsProvider.getStats(Paths.get(TEMP_DIR), "temp"));
        stats.add(directoryStatsProvider.getStats(Paths.get(LOGS_DIR), "logs"));
        logger.debug("Compiled folder cache stats: reports={}, temp={}, logs={}", 
                stats.get(0).getFileCount(), stats.get(1).getFileCount(), stats.get(2).getFileCount());
        return stats;
    }

    @DeleteMapping("/cache")
    public String clearCache(@RequestParam String folderName) {
        logger.info("Request received to clear cache for folder: {}", folderName);
        if ("reports".equalsIgnoreCase(folderName)) {
            List<String> activeTaskIds = backgroundTaskRepository.findAll().stream()
                    .filter(t -> "RUNNING".equals(t.getStatus()) || "QUEUED".equals(t.getStatus()))
                    .map(BackgroundTask::getId)
                    .map(id -> id + ".json")
                    .collect(Collectors.toList());

            logger.info("Purging reports directory. Excluding active tasks' logs: {}", activeTaskIds);
            filePurgeService.purgeFolder(Paths.get(REPORTS_DIR), activeTaskIds);
            logger.info("Successfully cleared reports cache.");
            return "Reports cache cleared (active task logs preserved).";
        } else if ("temp".equalsIgnoreCase(folderName)) {
            logger.info("Purging temp decryption directory.");
            filePurgeService.purgeFolder(Paths.get(TEMP_DIR), null);
            logger.info("Successfully cleared temp cache.");
            return "Temp decryption folder cleared.";
        } else if ("logs".equalsIgnoreCase(folderName)) {
            logger.info("Purging logs directory.");
            filePurgeService.purgeFolder(Paths.get(LOGS_DIR), null);
            logger.info("Successfully cleared diagnostic logs cache.");
            return "Logs folder cleared.";
        } else {
            logger.error("Unknown folder prune request: {}", folderName);
            throw new IllegalArgumentException("Unknown folder name: " + folderName);
        }
    }
}

