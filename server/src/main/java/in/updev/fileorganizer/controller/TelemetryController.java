package in.updev.fileorganizer.controller;

import in.updev.fileorganizer.services.TelemetryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/telemetry")
@RequiredArgsConstructor
public class TelemetryController {

    private final TelemetryService telemetryService;

    @GetMapping("/report")
    public ResponseEntity<Map<String, Object>> getUsageReport() {
        return ResponseEntity.ok(telemetryService.generateUsageReport());
    }
}
