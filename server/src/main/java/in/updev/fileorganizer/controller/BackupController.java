package in.updev.fileorganizer.controller;

import in.updev.fileorganizer.services.BackupService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/backup")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BackupController {
    private static final Logger logger = LoggerFactory.getLogger(BackupController.class);

    private final BackupService backupService;

    @PostMapping("/create")
    public String createBackup(@RequestBody Map<String, String> request) {
        String sourceFolder = request.get("sourceFolder");
        String backupFolder = request.get("backupFolder");
        logger.info("Request received to create full backup. Source: {}, Destination: {}", sourceFolder, backupFolder);
        try {
            String taskId = backupService.createBackup(sourceFolder, backupFolder);
            logger.info("Successfully triggered full backup task. ID: {}", taskId);
            return taskId;
        } catch (Exception e) {
            logger.error("Failed to trigger full backup. Source: {}, Destination: {}", sourceFolder, backupFolder, e);
            throw e;
        }
    }

    @PostMapping("/update")
    public String updateBackup(@RequestBody Map<String, String> request) {
        String sourceFolder = request.get("sourceFolder");
        String backupFolder = request.get("backupFolder");
        logger.info("Request received to update backup. Source: {}, Destination: {}", sourceFolder, backupFolder);
        try {
            String taskId = backupService.updateBackup(sourceFolder, backupFolder);
            logger.info("Successfully triggered update backup task. ID: {}", taskId);
            return taskId;
        } catch (Exception e) {
            logger.error("Failed to trigger update backup. Source: {}, Destination: {}", sourceFolder, backupFolder, e);
            throw e;
        }
    }
}

