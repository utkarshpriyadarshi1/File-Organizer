package com.updevlogics.fboss.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
public class ReportSerializationService {
    private static final Logger logger = LoggerFactory.getLogger(ReportSerializationService.class);
    private static final String REPORTS_DIR = System.getProperty("user.home") + "/AppData/Local/e-Abhilekh/reports";

    public ReportSerializationService() {
        try {
            Files.createDirectories(Paths.get(REPORTS_DIR));
        } catch (IOException e) {
            logger.error("Failed to create reports directory: {}", REPORTS_DIR, e);
        }
    }

    public String getReportsDirectoryPath() {
        return REPORTS_DIR;
    }

    public String writeReport(String taskId, String jsonPayload) {
        Path reportFile = Paths.get(REPORTS_DIR, taskId + ".json");
        try {
            Files.createDirectories(reportFile.getParent());
            Files.writeString(reportFile, jsonPayload, StandardCharsets.UTF_8);
            logger.info("Wrote report for task {}: {}", taskId, reportFile);
            return reportFile.toAbsolutePath().toString();
        } catch (IOException e) {
            logger.error("Failed to write JSON report for task: {}", taskId, e);
            return null;
        }
    }

    public String readReport(String taskId) {
        Path reportFile = Paths.get(REPORTS_DIR, taskId + ".json");
        if (!Files.exists(reportFile)) {
            logger.warn("Report file not found for task: {}", taskId);
            return null;
        }
        try {
            return Files.readString(reportFile, StandardCharsets.UTF_8);
        } catch (IOException e) {
            logger.error("Failed to read JSON report for task: {}", taskId, e);
            return null;
        }
    }

    public void deleteReport(String taskId) {
        Path reportFile = Paths.get(REPORTS_DIR, taskId + ".json");
        try {
            Files.deleteIfExists(reportFile);
            logger.info("Deleted report file for task: {}", taskId);
        } catch (IOException e) {
            logger.error("Failed to delete report file: {}", reportFile, e);
        }
    }
}
