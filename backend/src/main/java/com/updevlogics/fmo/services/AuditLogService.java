package com.updevlogics.fmo.services;

import com.updevlogics.fmo.entities.ActivityLog;
import com.updevlogics.fmo.entities.DbFile;
import com.updevlogics.fmo.repositories.ActivityLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final ActivityLogRepository activityLogRepository;
    private final SqliteWriteQueueService sqliteWriteQueueService;

    public void logAction(String actionType, DbFile file, String details) {
        sqliteWriteQueueService.submitWrite(() -> {
            ActivityLog log = ActivityLog.builder()
                    .actionType(actionType)
                    .file(file)
                    .details(details)
                    .timestamp(LocalDateTime.now())
                    .build();
            activityLogRepository.save(log);
        });
    }
}
