package com.updevlogics.fmo.controller;

import com.updevlogics.fmo.services.BackupService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/backup")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BackupController {

    private final BackupService backupService;

    @PostMapping("/create")
    public String createBackup(@RequestBody Map<String, String> request) {
        String sourceFolder = request.get("sourceFolder");
        String backupFolder = request.get("backupFolder");
        return backupService.createBackup(sourceFolder, backupFolder);
    }

    @PostMapping("/update")
    public String updateBackup(@RequestBody Map<String, String> request) {
        String sourceFolder = request.get("sourceFolder");
        String backupFolder = request.get("backupFolder");
        return backupService.updateBackup(sourceFolder, backupFolder);
    }
}
