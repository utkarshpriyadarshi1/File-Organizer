package in.updev.fileorganizer.services;

import in.updev.fileorganizer.entities.BackgroundTask;
import in.updev.fileorganizer.enums.TaskStatus;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SystemResourceMonitorService {
    private static final Logger logger = LoggerFactory.getLogger(SystemResourceMonitorService.class);

    private final BackgroundTaskManager backgroundTaskManager;
    private final TaskCancellationManager taskCancellationManager;

    // Thresholds
    private static final long MIN_FREE_MEMORY_MB = 100; // Minimal buffer
    private static final double MIN_FREE_MEMORY_PERCENTAGE = 0.10; // 10%
    private static final long MIN_FREE_DISK_SPACE_MB = 1024; // 1 GB

    // Flag to avoid spamming logs/UI when already paused
    private boolean currentlyThrottling = false;

    @Scheduled(fixedDelay = 5000) // Runs every 5 seconds
    public void monitorSystemResources() {
        List<BackgroundTask> activeTasks = backgroundTaskManager.getActiveTasks();
        if (activeTasks.isEmpty()) {
            currentlyThrottling = false; // Reset if no tasks are running
            return;
        }

        boolean shouldPause = false;
        String reason = "";

        // 1. Check RAM
        long maxMemory = Runtime.getRuntime().maxMemory();
        long allocatedMemory = Runtime.getRuntime().totalMemory();
        long freeMemory = Runtime.getRuntime().freeMemory();
        long totalFreeMemory = freeMemory + (maxMemory - allocatedMemory);

        double freeMemoryPercentage = (double) totalFreeMemory / maxMemory;
        long freeMemoryMb = totalFreeMemory / (1024 * 1024);

        if (freeMemoryPercentage < MIN_FREE_MEMORY_PERCENTAGE || freeMemoryMb < MIN_FREE_MEMORY_MB) {
            shouldPause = true;
            reason = String.format("Low Memory (Free: %d MB)", freeMemoryMb);
        }

        // 2. Check Disk Space (Assume primary drive is where app runs, or generic root)
        if (!shouldPause) {
            File root = new File("/");
            long freeSpaceMb = root.getUsableSpace() / (1024 * 1024);
            if (freeSpaceMb < MIN_FREE_DISK_SPACE_MB) {
                shouldPause = true;
                reason = String.format("Low Disk Space (Free: %d MB)", freeSpaceMb);
            }
        }

        if (shouldPause) {
            if (!currentlyThrottling) {
                logger.warn("System resources critically low: {}. Pausing all active tasks.", reason);
                currentlyThrottling = true;
                
                for (BackgroundTask task : activeTasks) {
                    if (task.getStatus() == TaskStatus.RUNNING || task.getStatus() == TaskStatus.QUEUED) {
                        backgroundTaskManager.pauseTask(task.getId());
                    }
                }
            }
        } else {
            if (currentlyThrottling) {
                logger.info("System resources recovered. Resuming tasks.");
                currentlyThrottling = false;
                
                for (BackgroundTask task : activeTasks) {
                    if (taskCancellationManager.isPaused(task.getId())) {
                        backgroundTaskManager.resumeTask(task.getId());
                    }
                }
            }
        }
    }
}
