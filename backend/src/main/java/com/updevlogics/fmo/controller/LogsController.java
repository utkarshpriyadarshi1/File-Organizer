package com.updevlogics.fmo.controller;

import com.updevlogics.fmo.entities.ActivityLog;
import com.updevlogics.fmo.entities.ErrorLog;
import com.updevlogics.fmo.repositories.ActivityLogRepository;
import com.updevlogics.fmo.repositories.ErrorLogRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/logs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LogsController {
    private static final Logger logger = LoggerFactory.getLogger(LogsController.class);

    private final ErrorLogRepository errorLogRepository;
    private final ActivityLogRepository activityLogRepository;

    @GetMapping
    public List<String> getLogs() {
        logger.info("Request received to fetch all SQLite stored logs");
        
        List<ErrorLog> errorLogs = errorLogRepository.findAll();
        List<ActivityLog> activityLogs = activityLogRepository.findAll();
        
        List<LogEntry> combined = new java.util.ArrayList<>();
        for (ErrorLog e : errorLogs) {
            combined.add(new LogEntry(e.getTimestamp(), "ERROR", "[" + e.getService() + "] " + e.getMessage()));
        }
        for (ActivityLog a : activityLogs) {
            combined.add(new LogEntry(a.getTimestamp(), a.getActionType(), a.getDetails()));
        }
        
        // Sort by timestamp ascending
        combined.sort(java.util.Comparator.comparing(LogEntry::getTimestamp));
        
        return combined.stream()
                .map(log -> "[" + log.getTimestamp() + "] [" + log.getType() + "] " + log.getMessage())
                .collect(Collectors.toList());
    }

    @lombok.Getter
    @lombok.AllArgsConstructor
    private static class LogEntry {
        private final java.time.LocalDateTime timestamp;
        private final String type;
        private final String message;
    }
}

