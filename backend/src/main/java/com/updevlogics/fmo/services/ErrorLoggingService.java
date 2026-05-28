package com.updevlogics.fmo.services;

import com.updevlogics.fmo.entities.ErrorLog;
import com.updevlogics.fmo.repositories.ErrorLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ErrorLoggingService {
    @Autowired
    private ErrorLogRepository errorLogRepository;

    public void logError(String service, String message) {
        errorLogRepository.save(new ErrorLog(service, message));
    }
}
