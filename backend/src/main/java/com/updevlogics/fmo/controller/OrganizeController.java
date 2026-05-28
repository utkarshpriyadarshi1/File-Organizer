package com.updevlogics.fmo.controller;

import com.updevlogics.fmo.services.OrganizerService;
import lombok.RequiredArgsConstructor;
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
    private final OrganizerService organizerService;

    @PostMapping
    public String organizeFiles(@RequestBody Map<String, String> request) {
        String sourceFolder = request.get("sourceFolder");
        String destinationFolder = request.get("destinationFolder");
        return organizerService.organizeFiles(sourceFolder, destinationFolder);
    }
}
