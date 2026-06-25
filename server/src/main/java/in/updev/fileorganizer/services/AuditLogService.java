package in.updev.fileorganizer.services;

import in.updev.fileorganizer.entities.ActivityLog;
import in.updev.fileorganizer.entities.DbFile;
import in.updev.fileorganizer.repositories.ActivityLogRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuditLogService {
    private static final Logger logger = LoggerFactory.getLogger(AuditLogService.class);

    private final ActivityLogRepository activityLogRepository;
    private final SqliteWriteQueueService sqliteWriteQueueService;

    public void logAction(String actionType, DbFile file, String details) {
        logger.info("[Audit Log Request] Action Type: {}, Details: {}, File: {}", 
                actionType, details, (file != null ? file.getPath() : "None"));
        sqliteWriteQueueService.submitWrite(() -> {
            try {
                ActivityLog log = ActivityLog.builder()
                        .actionType(actionType)
                        .file(file)
                        .details(details)
                        .timestamp(LocalDateTime.now())
                        .build();
                activityLogRepository.save(log);
                logger.debug("Successfully saved audit log for action: {}", actionType);
            } catch (Exception e) {
                logger.error("Failed to persist audit log to SQLite. Action: {}, Error: {}", actionType, e.getMessage(), e);
            }
        });
    }
}

