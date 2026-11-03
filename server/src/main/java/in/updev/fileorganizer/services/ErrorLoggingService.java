package in.updev.fileorganizer.services;

import in.updev.fileorganizer.entities.ErrorLog;
import in.updev.fileorganizer.repositories.ErrorLogRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ErrorLoggingService {
    private static final Logger logger = LoggerFactory.getLogger(ErrorLoggingService.class);

    private final ErrorLogRepository errorLogRepository;
    private final SqliteWriteQueueService sqliteWriteQueueService;

    public void logError(String service, String message) {
        logger.error("[Database Error Log] Service: {}, Message: {}", service, message);
        sqliteWriteQueueService.submitWrite(() -> {
            try {
                errorLogRepository.save(new ErrorLog(service, message));
            } catch (Exception e) {
                logger.error("Failed to save error log to SQLite: {}", e.getMessage());
            }
        });
    }
}
