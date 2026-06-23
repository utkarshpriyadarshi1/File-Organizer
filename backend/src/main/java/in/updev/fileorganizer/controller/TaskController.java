package in.updev.fileorganizer.controller;

import in.updev.fileorganizer.entities.BackgroundTask;
import in.updev.fileorganizer.repositories.BackgroundTaskRepository;
import in.updev.fileorganizer.services.BackgroundTaskManager;
import in.updev.fileorganizer.services.ReportSerializationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TaskController {
    private static final Logger logger = LoggerFactory.getLogger(TaskController.class);

    private final BackgroundTaskManager backgroundTaskManager;
    private final BackgroundTaskRepository backgroundTaskRepository;
    private final ReportSerializationService reportSerializationService;

    @GetMapping("/active")
    public List<BackgroundTask> getActiveTasks() {
        logger.info("Request received to fetch all active background tasks");
        List<BackgroundTask> active = backgroundTaskManager.getActiveTasks();
        logger.debug("Found {} active tasks", active.size());
        return active;
    }

    @GetMapping("/history")
    public List<BackgroundTask> getHistory() {
        logger.info("Request received to fetch tasks execution history");
        List<BackgroundTask> history = backgroundTaskRepository.findAll();
        logger.debug("Found {} historical execution records", history.size());
        return history;
    }

    @GetMapping(value = "/{id}/results", produces = "application/json")
    public String getResults(@PathVariable String id) {
        logger.info("Request received to retrieve report results for task ID: {}", id);
        String report = reportSerializationService.readReport(id);
        if (report == null) {
            logger.warn("No report serialization file found for task ID: {}", id);
            return "[]";
        }
        logger.debug("Successfully read report for task ID: {}, length: {}", id, report.length());
        return report;
    }

    @PostMapping("/{id}/cancel")
    public String cancelTask(@PathVariable String id) {
        logger.info("Received request to cancel task ID: {}", id);
        backgroundTaskManager.cancelTask(id);
        logger.info("Cancel signal successfully routed for task ID: {}", id);
        return "Task cancel signaled.";
    }

    @PostMapping("/cancel")
    public String cancelTasksBulk(@RequestBody Map<String, List<String>> payload) {
        List<String> taskIds = payload.get("taskIds");
        logger.info("Received request to cancel tasks in bulk. Task IDs: {}", taskIds);
        if (taskIds != null) {
            for (String id : taskIds) {
                logger.debug("Routing cancel signal for task ID in bulk loop: {}", id);
                backgroundTaskManager.cancelTask(id);
            }
            logger.info("Processed bulk cancellation signals for {} tasks", taskIds.size());
        } else {
            logger.warn("Bulk cancel request payload has null taskIds list");
        }
        return "Cancellations signaled.";
    }

    @PostMapping("/{id}/action")
    @SuppressWarnings("unchecked")
    public String executeAction(@PathVariable String id, @RequestBody Map<String, Object> payload) {
        String actionType = (String) payload.get("actionType");
        List<String> targetPaths = (List<String>) payload.get("targetPaths");
        logger.info("Received request to execute reversal action. Task ID: {}, Action Type: {}, Target Paths count: {}", 
                id, actionType, (targetPaths != null ? targetPaths.size() : 0));
        String result = backgroundTaskManager.executeReversalAction(id, actionType, targetPaths);
        logger.info("Reversal action execution result for task ID {}: {}", id, result);
        return result;
    }
}

