package com.updevlogics.fmo.controller;

import com.updevlogics.fmo.services.OrganizerService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/organize")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class OrganizeController {
    private static final Logger logger = LoggerFactory.getLogger(OrganizeController.class);

    private final OrganizerService organizerService;

    @PostMapping
    public String organizeFiles(@RequestBody Map<String, String> request) {
        String sourceFolder = request.get("sourceFolder");
        String destinationFolder = request.get("destinationFolder");
        logger.info("Request received to organize files. Source: {}, Destination: {}", sourceFolder, destinationFolder);
        try {
            String taskId = organizerService.organizeFiles(sourceFolder, destinationFolder);
            logger.info("Successfully triggered organizer task. ID: {}", taskId);
            return taskId;
        } catch (Exception e) {
            logger.error("Failed to trigger organization. Source: {}, Destination: {}", sourceFolder, destinationFolder, e);
            throw e;
        }
    }
}

