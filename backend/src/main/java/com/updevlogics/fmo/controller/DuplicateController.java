package com.updevlogics.fmo.controller;

import com.updevlogics.fmo.services.DuplicateService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/duplicates")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DuplicateController {
    private static final Logger logger = LoggerFactory.getLogger(DuplicateController.class);

    private final DuplicateService duplicateService;

    @PostMapping("/find")
    public String findDuplicates(@RequestBody Map<String, String> request) {
        String folderPath = request.get("folderPath");
        logger.info("Request received to find duplicates in folder: {}", folderPath);
        try {
            String taskId = duplicateService.findDuplicates(folderPath);
            logger.info("Successfully triggered duplicates scan task. ID: {}", taskId);
            return taskId;
        } catch (Exception e) {
            logger.error("Failed to trigger duplicate find for path: {}", folderPath, e);
            throw e;
        }
    }

    @PostMapping("/remove")
    @SuppressWarnings("unchecked")
    public String removeDuplicates(@RequestBody Map<String, Object> request) {
        List<String> filesToDelete = (List<String>) request.get("filesToDelete");
        logger.info("Request received to remove duplicate files. Files count: {}", 
                (filesToDelete != null ? filesToDelete.size() : 0));
        if (filesToDelete != null) {
            logger.debug("Files flagged for deletion: {}", filesToDelete);
        }
        try {
            String taskId = duplicateService.removeDuplicates(filesToDelete);
            logger.info("Successfully triggered duplicate removal task. ID: {}", taskId);
            return taskId;
        } catch (Exception e) {
            logger.error("Failed to trigger duplicate removal", e);
            throw e;
        }
    }
}

