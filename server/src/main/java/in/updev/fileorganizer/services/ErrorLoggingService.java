package in.updev.fileorganizer.services;

import in.updev.fileorganizer.entities.ErrorLog;
import in.updev.fileorganizer.repositories.ErrorLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ErrorLoggingService {
    private static final Logger logger = LoggerFactory.getLogger(ErrorLoggingService.class);

    @Autowired
    private ErrorLogRepository errorLogRepository;

    public void logError(String service, String message) {
        logger.error("[Database Error Log] Service: {}, Message: {}", service, message);
        errorLogRepository.save(new ErrorLog(service, message));
    }
}

