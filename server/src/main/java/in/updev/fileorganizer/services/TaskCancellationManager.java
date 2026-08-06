package in.updev.fileorganizer.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TaskCancellationManager {
    private static final Logger logger = LoggerFactory.getLogger(TaskCancellationManager.class);

    private final Set<String> localCancelledTasks = ConcurrentHashMap.newKeySet();
    private final Set<String> localPausedTasks = ConcurrentHashMap.newKeySet();

    public void setCancelFlag(String taskId) {
        logger.info("Setting cancel flag locally for task ID: {}", taskId);
        localCancelledTasks.add(taskId);
    }

    public boolean isCancelled(String taskId) {
        if (taskId == null) return false;
        return localCancelledTasks.contains(taskId);
    }

    public void evictFromQueue(String taskId) {
        logger.info("Evicting task ID from queue locally: {}", taskId);
        // Queue eviction will also be handled by the BackgroundTaskManager's local queue removal
    }

    public void cleanCancellationKey(String taskId) {
        logger.info("Cleaning cancellation flag locally for task ID: {}", taskId);
        localCancelledTasks.remove(taskId);
        localPausedTasks.remove(taskId);
    }

    public void setPauseFlag(String taskId) {
        logger.info("Setting pause flag locally for task ID: {}", taskId);
        localPausedTasks.add(taskId);
    }

    public void clearPauseFlag(String taskId) {
        logger.info("Clearing pause flag locally for task ID: {}", taskId);
        localPausedTasks.remove(taskId);
    }

    public boolean isPaused(String taskId) {
        if (taskId == null) return false;
        return localPausedTasks.contains(taskId);
    }
}
