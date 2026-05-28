package com.updevlogics.fmo.controller;

import com.updevlogics.fmo.entities.BackgroundTask;
import com.updevlogics.fmo.repositories.BackgroundTaskRepository;
import com.updevlogics.fmo.services.DirectoryStatsProvider;
import com.updevlogics.fmo.services.DirectoryStatsProvider.FolderStats;
import com.updevlogics.fmo.services.FilePurgeService;
import lombok.RequiredArgsConstructor;
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
    private final DirectoryStatsProvider directoryStatsProvider;
    private final FilePurgeService filePurgeService;
    private final BackgroundTaskRepository backgroundTaskRepository;

    private static final String REPORTS_DIR = System.getProperty("user.home") + "/AppData/Local/FBOSS/reports";
    private static final String TEMP_DIR = System.getProperty("user.home") + "/AppData/Local/FBOSS/temp";
    private static final String LOGS_DIR = System.getProperty("user.home") + "/AppData/Local/FBOSS/logs";

    @GetMapping("/cache")
    public List<FolderStats> getCacheStats() {
        List<FolderStats> stats = new ArrayList<>();
        stats.add(directoryStatsProvider.getStats(Paths.get(REPORTS_DIR), "reports"));
        stats.add(directoryStatsProvider.getStats(Paths.get(TEMP_DIR), "temp"));
        stats.add(directoryStatsProvider.getStats(Paths.get(LOGS_DIR), "logs"));
        return stats;
    }

    @DeleteMapping("/cache")
    public String clearCache(@RequestParam String folderName) {
        if ("reports".equalsIgnoreCase(folderName)) {
            List<String> activeTaskIds = backgroundTaskRepository.findAll().stream()
                    .filter(t -> "RUNNING".equals(t.getStatus()) || "QUEUED".equals(t.getStatus()))
                    .map(BackgroundTask::getId)
                    .map(id -> id + ".json")
                    .collect(Collectors.toList());

            filePurgeService.purgeFolder(Paths.get(REPORTS_DIR), activeTaskIds);
            return "Reports cache cleared (active task logs preserved).";
        } else if ("temp".equalsIgnoreCase(folderName)) {
            filePurgeService.purgeFolder(Paths.get(TEMP_DIR), null);
            return "Temp decryption folder cleared.";
        } else if ("logs".equalsIgnoreCase(folderName)) {
            filePurgeService.purgeFolder(Paths.get(LOGS_DIR), null);
            return "Logs folder cleared.";
        } else {
            throw new IllegalArgumentException("Unknown folder name: " + folderName);
        }
    }
}
