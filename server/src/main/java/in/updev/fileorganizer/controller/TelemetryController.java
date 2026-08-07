package in.updev.fileorganizer.controller;

import in.updev.fileorganizer.services.TelemetryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.util.Map;

@RestController
@RequestMapping("/api/telemetry")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class TelemetryController {

    private final TelemetryService telemetryService;

    @GetMapping("/report")
    public ResponseEntity<Map<String, Object>> getUsageReport() {
        return ResponseEntity.ok(telemetryService.generateUsageReport());
    }

    @PostMapping("/crash")
    public ResponseEntity<Void> reportCrash(@RequestBody Map<String, String> payload) {
        telemetryService.saveCrashReport(payload);
        return ResponseEntity.ok().build();
    }
    
    @GetMapping("/heartbeat")
    public ResponseEntity<Map<String, Object>> getHeartbeat() {
        return ResponseEntity.ok(telemetryService.getHeartbeat());
    }
}
