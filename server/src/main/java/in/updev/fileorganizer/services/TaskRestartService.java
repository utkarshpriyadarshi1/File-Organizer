package in.updev.fileorganizer.services;

import in.updev.fileorganizer.entities.BackgroundTask;
import in.updev.fileorganizer.enums.TaskType;
import in.updev.fileorganizer.repositories.BackgroundTaskRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TaskRestartService {
    private static final Logger logger = LoggerFactory.getLogger(TaskRestartService.class);

    private final BackgroundTaskRepository backgroundTaskRepository;
    private final OrganizerService organizerService;
    private final DuplicateService duplicateService;
    private final BackgroundTaskManager backgroundTaskManager;

    public String restartTask(String taskId) throws Exception {
        Optional<BackgroundTask> optTask = backgroundTaskRepository.findById(taskId);
        if (optTask.isEmpty()) {
            throw new IllegalArgumentException("Task not found for restart: " + taskId);
        }

        BackgroundTask task = optTask.get();
        TaskType type = task.getTaskType();
        String source = task.getSourcePath();
        String destination = task.getDestinationPath();
        String details = task.getActionDetails();

        logger.info("Restarting task ID: {}, Type: {}", taskId, type);

        switch (type) {
            case ORGANIZE:
                boolean dryRun = details != null && details.contains("Dry run");
                return organizerService.organizeFiles(source, destination, dryRun);
            case BACKUP:
            case SYNC:
                throw new UnsupportedOperationException("Restart not supported for task type: " + type);
            case DUPLICATE_SCAN:
                return duplicateService.findDuplicates(source);
            case REVERSAL:
                if (details != null && details.contains("Undo operations for task: ")) {
                    String originalId = details.replace("Undo operations for task: ", "").trim();
                    return backgroundTaskManager.executeReversalAction(originalId, "REVERT_MOVES", null);
                }
                throw new IllegalArgumentException("Cannot determine original task ID for reversal restart.");
            default:
                throw new UnsupportedOperationException("Restart not supported for task type: " + type);
        }
    }
}
