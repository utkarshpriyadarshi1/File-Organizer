package in.updev.fileorganizer.controller;

import in.updev.fileorganizer.entities.DbFile;
import in.updev.fileorganizer.services.MetadataExtractionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/metadata")
@RequiredArgsConstructor
public class MetadataController {
    
    private final MetadataExtractionService metadataExtractionService;
    
    @PostMapping("/extract/{fileId}")
    public ResponseEntity<DbFile> extractMetadata(@PathVariable Long fileId) {
        try {
            DbFile updatedFile = metadataExtractionService.extractAndSaveMetadata(fileId);
            return ResponseEntity.ok(updatedFile);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/extract-by-path")
    public ResponseEntity<DbFile> extractMetadataByPath(@RequestParam String path) {
        try {
            DbFile updatedFile = metadataExtractionService.extractAndSaveMetadataByPath(path);
            return ResponseEntity.ok(updatedFile);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
