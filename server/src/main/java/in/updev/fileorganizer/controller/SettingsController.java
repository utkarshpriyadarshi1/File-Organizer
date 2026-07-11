package in.updev.fileorganizer.controller;

import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import in.updev.fileorganizer.entities.AppSetting;
import in.updev.fileorganizer.entities.BackgroundTask;
import in.updev.fileorganizer.entities.IgnoreRule;
import in.updev.fileorganizer.entities.RegisteredVersion;
import in.updev.fileorganizer.repositories.ActivityLogRepository;
import in.updev.fileorganizer.repositories.AppSettingRepository;
import in.updev.fileorganizer.repositories.BackgroundTaskRepository;
import in.updev.fileorganizer.repositories.BackupJobRepository;
import in.updev.fileorganizer.repositories.DbFileRepository;
import in.updev.fileorganizer.repositories.ErrorLogRepository;
import in.updev.fileorganizer.repositories.FileHashRepository;
import in.updev.fileorganizer.repositories.FileReversalRepository;
import in.updev.fileorganizer.repositories.FileVersionRepository;
import in.updev.fileorganizer.repositories.IgnoreRuleRepository;
import in.updev.fileorganizer.repositories.RegisteredVersionRepository;
import in.updev.fileorganizer.repositories.SyncJobRepository;
import in.updev.fileorganizer.repositories.TagRepository;
import in.updev.fileorganizer.services.DirectoryStatsProvider;
import in.updev.fileorganizer.services.DirectoryStatsProvider.FolderStats;
import in.updev.fileorganizer.services.FilePurgeService;
import in.updev.fileorganizer.services.RedisCacheService;
import in.updev.fileorganizer.services.SqliteWriteQueueService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SettingsController {
    private static final Logger logger = LoggerFactory.getLogger(SettingsController.class);

    private final DirectoryStatsProvider directoryStatsProvider;
    private final FilePurgeService filePurgeService;
    private final BackgroundTaskRepository backgroundTaskRepository;
    private final IgnoreRuleRepository ignoreRuleRepository;
    private final AppSettingRepository appSettingRepository;

    private final ActivityLogRepository activityLogRepository;
    private final BackupJobRepository backupJobRepository;
    private final DbFileRepository dbFileRepository;
    private final ErrorLogRepository errorLogRepository;
    private final FileHashRepository fileHashRepository;
    private final FileReversalRepository fileReversalRepository;
    private final FileVersionRepository fileVersionRepository;
    private final SyncJobRepository syncJobRepository;
    private final TagRepository tagRepository;
    private final RedisCacheService redisCacheService;
    private final SqliteWriteQueueService sqliteWriteQueueService;
    private final RegisteredVersionRepository registeredVersionRepository;

    @GetMapping("/default-path")
    public Map<String, String> getDefaultPathSetting() {
        logger.info("Request received to fetch default path setting");
        String path = appSettingRepository.findByKey("default_path")
                .map(AppSetting::getValue)
                .orElse(System.getProperty("user.home"));
        Map<String, String> response = new HashMap<>();
        response.put("defaultPath", path);
        return response;
    }

    @PostMapping("/default-path")
    public Map<String, String> setDefaultPathSetting(@RequestBody Map<String, String> payload) {
        String path = payload.get("path");
        logger.info("Request received to set default path setting: {}", path);
        if (path == null || path.trim().isEmpty()) {
            throw new IllegalArgumentException("Path cannot be empty.");
        }

        String targetPath = path.trim();
        AppSetting setting = appSettingRepository.findByKey("default_path")
                .orElse(new AppSetting());
        setting.setKey("default_path");
        setting.setValue(targetPath);
        appSettingRepository.save(setting);

        Map<String, String> response = new HashMap<>();
        response.put("defaultPath", targetPath);
        return response;
    }

    @GetMapping("/ignore-rules")
    public List<IgnoreRule> getIgnoreRules() {
        logger.info("Request received to fetch all ignore rules");
        return ignoreRuleRepository.findAll();
    }

    @PostMapping("/ignore-rules")
    public IgnoreRule addIgnoreRule(@RequestBody Map<String, String> payload) {
        String pattern = payload.get("pattern");
        logger.info("Request received to add ignore rule: {}", pattern);
        if (pattern == null || pattern.trim().isEmpty()) {
            throw new IllegalArgumentException("Pattern cannot be empty.");
        }
        Optional<IgnoreRule> existing = ignoreRuleRepository.findByPattern(pattern.trim());
        if (existing.isPresent()) {
            return existing.get();
        }
        return ignoreRuleRepository.save(IgnoreRule.builder().pattern(pattern.trim()).build());
    }

    @DeleteMapping("/ignore-rules/{id}")
    public String deleteIgnoreRule(@PathVariable Long id) {
        logger.info("Request received to delete ignore rule ID: {}", id);
        ignoreRuleRepository.deleteById(id);
        return "Ignore rule deleted.";
    }

    private static final String REPORTS_DIR = System.getProperty("user.home") + "/AppData/Local/file-organizer/reports";
    private static final String TEMP_DIR = System.getProperty("user.home") + "/AppData/Local/file-organizer/temp";
    private static final String LOGS_DIR = System.getProperty("user.home") + "/AppData/Local/file-organizer/logs";

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

    @DeleteMapping("/database")
    public String clearSelectedDatabaseTables(@RequestParam String tables) throws Exception {
        logger.info("Request received to clear selected database tables: {}", tables);
        String[] tableList = tables.split(",");

        sqliteWriteQueueService.executeWrite(() -> {
            for (String table : tableList) {
                switch (table.trim().toLowerCase()) {
                    case "tasks":
                        backgroundTaskRepository.deleteAll();
                        break;
                    case "files":
                        dbFileRepository.deleteAll();
                        break;
                    case "reversals":
                        fileReversalRepository.deleteAll();
                        break;
                    case "audit":
                        activityLogRepository.deleteAll();
                        break;
                    default:
                        logger.warn("Unknown table requested for clearing: {}", table);
                }
            }
            return null;
        });

        return "Selected database tables cleared successfully.";
    }

    @PostMapping("/reset")
    public String resetApplication() throws Exception {
        logger.info("Request received to factory reset application databases & cache");

        sqliteWriteQueueService.executeWrite(() -> {
            activityLogRepository.deleteAll();
            fileHashRepository.deleteAll();
            fileVersionRepository.deleteAll();
            dbFileRepository.deleteAll();
            tagRepository.deleteAll();
            backupJobRepository.deleteAll();
            fileReversalRepository.deleteAll();
            errorLogRepository.deleteAll();
            ignoreRuleRepository.deleteAll();
            appSettingRepository.deleteAll();
            backgroundTaskRepository.deleteAll();
            syncJobRepository.deleteAll();
            return null;
        });

        redisCacheService.clearCache();
        logger.info("Application factory reset complete.");
        return "Application state has been fully reset.";
    }

    @PostMapping("/shutdown")
    public String shutdownApplication() {
        logger.info("Request received to shutdown backend application");
        new Thread(() -> {
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                // Ignore
            }
            System.exit(0);
        }).start();
        return "Backend shutdown initiated.";
    }

    @GetMapping("/versions")
    public List<RegisteredVersion> getRegisteredVersions() {
        logger.info("Request received to fetch all registered app versions");
        return registeredVersionRepository.findAll();
    }
}
