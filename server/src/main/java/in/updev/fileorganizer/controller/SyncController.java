package in.updev.fileorganizer.controller;

import in.updev.fileorganizer.entities.SyncJob;
import in.updev.fileorganizer.repositories.SyncJobRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/sync")
public class SyncController {

    private final SyncJobRepository syncJobRepository;

    @Autowired
    public SyncController(SyncJobRepository syncJobRepository) {
        this.syncJobRepository = syncJobRepository;
    }

    @GetMapping("/jobs")
    public List<SyncJob> getAllSyncJobs() {
        return syncJobRepository.findAll();
    }
}
