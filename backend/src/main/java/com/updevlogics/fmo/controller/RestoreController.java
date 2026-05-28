package com.updevlogics.fmo.controller;

import com.updevlogics.fmo.entities.FileVersion;
import com.updevlogics.fmo.services.RestoreService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/restore")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RestoreController {
    private final RestoreService restoreService;

    @GetMapping("/versions/{fileId}")
    public List<FileVersion> getVersionsForFile(@PathVariable Long fileId) {
        return restoreService.getVersionsForFile(fileId);
    }

    @PostMapping("/{versionId}")
    public String restoreVersion(@PathVariable Long versionId, @RequestBody Map<String, String> request) {
        String targetPathOverride = request.get("targetPathOverride");
        return restoreService.restoreVersion(versionId, targetPathOverride);
    }
}
