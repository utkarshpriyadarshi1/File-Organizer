package com.updevlogics.fmo.services;

import com.updevlogics.fmo.entities.BackgroundTask;
import com.updevlogics.fmo.repositories.BackgroundTaskRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MaintenanceService {
    private static final Logger logger = LoggerFactory.getLogger(MaintenanceService.class);

    private final BackgroundTaskRepository backgroundTaskRepository;
    private final FilePurgeService filePurgeService;

    private static final String TEMP_DIR = System.getProperty("user.home") + "/AppData/Local/FBOSS/temp";

    @Scheduled(fixedRate = 86400000)
    public void runDailyMaintenance() {
        logger.info("Executing scheduled daily storage maintenance...");

        LocalDateTime threshold = LocalDateTime.now().minusDays(30);

        List<BackgroundTask> oldTasks = backgroundTaskRepository.findAll().stream()
                .filter(t -> t.getCompletedAt() != null && t.getCompletedAt().isBefore(threshold))
                .toList();

        for (BackgroundTask task : oldTasks) {
            if (task.getReportFilePath() != null) {
                Path reportPath = Paths.get(task.getReportFilePath());
                try {
                    if (Files.deleteIfExists(reportPath)) {
                        logger.info("Maintenance purged old report file: {}", reportPath);
                    }
                } catch (IOException e) {
                    logger.error("Failed to delete old report file: {}", reportPath, e);
                }
                
                task.setReportFilePath(null);
                backgroundTaskRepository.save(task);
            }
        }

        filePurgeService.purgeFolder(Paths.get(TEMP_DIR), null);
        logger.info("Maintenance complete.");
    }
}
