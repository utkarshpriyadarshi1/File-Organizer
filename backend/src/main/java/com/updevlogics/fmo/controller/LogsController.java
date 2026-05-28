package com.updevlogics.fmo.controller;

import com.updevlogics.fmo.entities.ErrorLog;
import com.updevlogics.fmo.repositories.ErrorLogRepository;
import lombok.RequiredArgsConstructor;
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

    private final ErrorLogRepository errorLogRepository;

    @GetMapping
    public List<String> getLogs() {
        return errorLogRepository.findAll().stream()
                .map(log -> "[" + log.getTimestamp() + "] [" + log.getService() + "] " + log.getMessage())
                .collect(Collectors.toList());
    }
}
