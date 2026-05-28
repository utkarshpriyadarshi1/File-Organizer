package com.updevlogics.fmo.controller;

import com.updevlogics.fmo.entities.BackgroundTask;
import com.updevlogics.fmo.repositories.BackgroundTaskRepository;
import com.updevlogics.fmo.services.BackgroundTaskManager;
import com.updevlogics.fmo.services.ReportSerializationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TaskController {
    private final BackgroundTaskManager backgroundTaskManager;
    private final BackgroundTaskRepository backgroundTaskRepository;
    private final ReportSerializationService reportSerializationService;

    @GetMapping("/active")
    public List<BackgroundTask> getActiveTasks() {
        return backgroundTaskManager.getActiveTasks();
    }

    @GetMapping("/history")
    public List<BackgroundTask> getHistory() {
        return backgroundTaskRepository.findAll();
    }

    @GetMapping("/{id}/results")
    public String getResults(@PathVariable String id) {
        String report = reportSerializationService.readReport(id);
        return report != null ? report : "[]";
    }

    @PostMapping("/{id}/cancel")
    public String cancelTask(@PathVariable String id) {
        backgroundTaskManager.cancelTask(id);
        return "Task cancel signaled.";
    }

    @PostMapping("/cancel")
    public String cancelTasksBulk(@RequestBody Map<String, List<String>> payload) {
        List<String> taskIds = payload.get("taskIds");
        if (taskIds != null) {
            for (String id : taskIds) {
                backgroundTaskManager.cancelTask(id);
            }
        }
        return "Cancellations signaled.";
    }

    @PostMapping("/{id}/action")
    @SuppressWarnings("unchecked")
    public String executeAction(@PathVariable String id, @RequestBody Map<String, Object> payload) {
        String actionType = (String) payload.get("actionType");
        List<String> targetPaths = (List<String>) payload.get("targetPaths");
        return backgroundTaskManager.executeReversalAction(id, actionType, targetPaths);
    }
}
