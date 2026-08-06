package in.updev.fileorganizer.services;

import in.updev.fileorganizer.repositories.BackgroundTaskRepository;
import in.updev.fileorganizer.repositories.DbFileRepository;
import in.updev.fileorganizer.enums.TaskStatus;
import in.updev.fileorganizer.entities.BackgroundTask;
import in.updev.fileorganizer.entities.ErrorLog;
import in.updev.fileorganizer.repositories.ErrorLogRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TelemetryService {

    private final BackgroundTaskRepository taskRepository;
    private final DbFileRepository fileRepository;
    private final ErrorLogRepository errorLogRepository;
    
    private final LocalDateTime serverStartTime = LocalDateTime.now();

    public Map<String, Object> generateUsageReport() {
        Map<String, Object> report = new HashMap<>();
        
        long totalTasks = taskRepository.count();
        long completedTasks = taskRepository.countByStatus(TaskStatus.COMPLETED);
        long failedTasks = taskRepository.countByStatus(TaskStatus.FAILED);
        long totalFilesManaged = fileRepository.count();
        long appCrashes = errorLogRepository.count();
        
        // Calculate average execution time
        List<BackgroundTask> completed = taskRepository.findByStatusIn(java.util.List.of(TaskStatus.COMPLETED));
        long totalExecutionTime = 0;
        long tasksWithTime = 0;
        for (BackgroundTask task : completed) {
            if (task.getExecutionTimeMs() != null) {
                totalExecutionTime += task.getExecutionTimeMs();
                tasksWithTime++;
            }
        }
        long avgExecutionTimeMs = tasksWithTime > 0 ? totalExecutionTime / tasksWithTime : 0;

        report.put("total_tasks_run", totalTasks);
        report.put("tasks_completed_successfully", completedTasks);
        report.put("tasks_failed", failedTasks);
        report.put("total_files_indexed", totalFilesManaged);
        report.put("app_crashes", appCrashes);
        report.put("avg_task_execution_time_ms", avgExecutionTimeMs);
        report.put("app_version", "1.0.0");
        report.put("generated_at", LocalDateTime.now().toString());

        return report;
    }

    public void saveCrashReport(Map<String, String> payload) {
        String errorMsg = payload.getOrDefault("error", "Unknown Error");
        String stackTrace = payload.getOrDefault("stackTrace", "");
        
        ErrorLog errorLog = new ErrorLog("FRONTEND_UI", errorMsg + "\n\nStack:\n" + stackTrace);
        errorLogRepository.save(errorLog);
    }
    
    public Map<String, Object> getHeartbeat() {
        Map<String, Object> heartbeat = new HashMap<>();
        heartbeat.put("status", "UP");
        heartbeat.put("serverStartTime", serverStartTime.toString());
        
        Runtime runtime = Runtime.getRuntime();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;
        
        heartbeat.put("memoryUsedMb", usedMemory / (1024 * 1024));
        heartbeat.put("memoryTotalMb", totalMemory / (1024 * 1024));
        
        long activeTasks = taskRepository.countByStatus(TaskStatus.RUNNING);
        heartbeat.put("activeTasks", activeTasks);
        
        return heartbeat;
    }
}
