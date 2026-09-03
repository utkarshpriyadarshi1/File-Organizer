package in.updev.fileorganizer.controller;

import in.updev.fileorganizer.services.OrganizerService;
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
    public String organizeFiles(@RequestBody Map<String, Object> request) {
        String sourceFolder = (String) request.get("sourceFolder");
        String destinationFolder = (String) request.get("destinationFolder");
        boolean dryRun = request.containsKey("dryRun") && Boolean.parseBoolean(String.valueOf(request.get("dryRun")));
        String patternGroup = (String) request.get("patternGroup");
        String layoutPatternOverride = (String) request.get("layoutPatternOverride");
        boolean cleanEmptyFolders = request.containsKey("cleanEmptyFolders") && Boolean.parseBoolean(String.valueOf(request.get("cleanEmptyFolders")));
        logger.info("Request received to organize files. Source: {}, Destination: {}, Dry Run: {}, PatternGroup: {}, CleanEmptyFolders: {}", sourceFolder, destinationFolder, dryRun, patternGroup, cleanEmptyFolders);
        try {
            String taskId = organizerService.organizeFiles(sourceFolder, destinationFolder, dryRun, patternGroup, layoutPatternOverride, cleanEmptyFolders);
            logger.info("Successfully triggered organizer task. ID: {}", taskId);
            return taskId;
        } catch (Exception e) {
            logger.error("Failed to trigger organization. Source: {}, Destination: {}", sourceFolder, destinationFolder, e);
            throw e;
        }
    }
}

