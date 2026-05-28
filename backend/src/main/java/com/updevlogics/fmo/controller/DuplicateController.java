package com.updevlogics.fmo.controller;

import com.updevlogics.fmo.services.DuplicateService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/duplicates")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DuplicateController {

    private final DuplicateService duplicateService;

    @PostMapping("/find")
    public String findDuplicates(@RequestBody Map<String, String> request) {
        String folderPath = request.get("folderPath");
        return duplicateService.findDuplicates(folderPath);
    }

    @PostMapping("/remove")
    @SuppressWarnings("unchecked")
    public String removeDuplicates(@RequestBody Map<String, Object> request) {
        List<String> filesToDelete = (List<String>) request.get("filesToDelete");
        return duplicateService.removeDuplicates(filesToDelete);
    }
}
