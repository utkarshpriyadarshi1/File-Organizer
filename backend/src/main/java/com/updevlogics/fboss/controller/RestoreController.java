package com.updevlogics.fboss.controller;

import com.updevlogics.fboss.entities.FileVersion;
import com.updevlogics.fboss.services.RestoreService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/restore")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RestoreController {
    private static final Logger logger = LoggerFactory.getLogger(RestoreController.class);

    private final RestoreService restoreService;

    @GetMapping("/versions/{fileId}")
    public List<FileVersion> getVersionsForFile(@PathVariable Long fileId) {
        logger.info("Request received to fetch backup versions for file ID: {}", fileId);
        List<FileVersion> versions = restoreService.getVersionsForFile(fileId);
        logger.debug("Discovered {} versions for file ID: {}", versions.size(), fileId);
        return versions;
    }

    @PostMapping("/{versionId}")
    public String restoreVersion(@PathVariable Long versionId, @RequestBody Map<String, String> request) {
        String targetPathOverride = request.get("targetPathOverride");
        logger.info("Request received to restore version ID: {}. Path override: {}", versionId, targetPathOverride);
        try {
            String taskId = restoreService.restoreVersion(versionId, targetPathOverride);
            logger.info("Successfully triggered restore for version ID: {}. Task ID: {}", versionId, taskId);
            return taskId;
        } catch (Exception e) {
            logger.error("Failed to restore version ID: {}", versionId, e);
            throw e;
        }
    }
}

