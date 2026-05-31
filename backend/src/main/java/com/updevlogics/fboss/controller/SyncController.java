package com.updevlogics.fboss.controller;

import com.updevlogics.fboss.entities.SyncJob;
import com.updevlogics.fboss.repositories.SyncJobRepository;
import com.updevlogics.fboss.services.SyncService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sync")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SyncController {
    private static final Logger logger = LoggerFactory.getLogger(SyncController.class);

    private final SyncService syncService;
    private final SyncJobRepository syncJobRepository;

    @PostMapping("/create")
    public SyncJob createSyncJob(@RequestBody Map<String, String> request) throws Exception {
        String sourceFolder = request.get("sourceFolder");
        String destinationFolder = request.get("destinationFolder");
        String syncType = request.get("syncType");
        logger.info("Request received to register new sync job. Source: {}, Destination: {}, SyncType: {}", 
                sourceFolder, destinationFolder, syncType);
        try {
            SyncJob job = syncService.createSyncJob(sourceFolder, destinationFolder, syncType);
            logger.info("Successfully created sync job. ID: {}, Name: {}", job.getId(), job.getJobName());
            return job;
        } catch (Exception e) {
            logger.error("Failed to create sync job. Source: {}, Destination: {}", sourceFolder, destinationFolder, e);
            throw e;
        }
    }

    @PostMapping("/{id}/run")
    public String runSyncJob(@PathVariable Long id) {
        logger.info("Request received to execute sync job ID: {}", id);
        try {
            String result = syncService.runSyncJob(id);
            logger.info("Sync job execution triggered for ID: {}. Task ID: {}", id, result);
            return result;
        } catch (Exception e) {
            logger.error("Failed to run sync job ID: {}", id, e);
            throw e;
        }
    }

    @GetMapping("/jobs")
    public List<SyncJob> getSyncJobs() {
        logger.info("Request received to fetch all registered sync jobs");
        List<SyncJob> jobs = syncJobRepository.findAll();
        logger.debug("Found {} sync jobs", jobs.size());
        return jobs;
    }
}

