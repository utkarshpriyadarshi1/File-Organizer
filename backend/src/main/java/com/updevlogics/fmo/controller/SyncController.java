package com.updevlogics.fmo.controller;

import com.updevlogics.fmo.entities.SyncJob;
import com.updevlogics.fmo.repositories.SyncJobRepository;
import com.updevlogics.fmo.services.SyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sync")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SyncController {
    private final SyncService syncService;
    private final SyncJobRepository syncJobRepository;

    @PostMapping("/create")
    public SyncJob createSyncJob(@RequestBody Map<String, String> request) throws Exception {
        String sourceFolder = request.get("sourceFolder");
        String destinationFolder = request.get("destinationFolder");
        String syncType = request.get("syncType");
        return syncService.createSyncJob(sourceFolder, destinationFolder, syncType);
    }

    @PostMapping("/{id}/run")
    public String runSyncJob(@PathVariable Long id) {
        return syncService.runSyncJob(id);
    }

    @GetMapping("/jobs")
    public List<SyncJob> getSyncJobs() {
        return syncJobRepository.findAll();
    }
}
