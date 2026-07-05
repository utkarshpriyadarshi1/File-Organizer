package in.updev.fileorganizer.services;

import in.updev.fileorganizer.repositories.BackgroundTaskRepository;
import in.updev.fileorganizer.repositories.DbFileRepository;
import in.updev.fileorganizer.enums.TaskStatus;
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

    public Map<String, Object> generateUsageReport() {
        Map<String, Object> report = new HashMap<>();
        
        long totalTasks = taskRepository.count();
        long completedTasks = taskRepository.countByStatus(TaskStatus.COMPLETED);
        long failedTasks = taskRepository.countByStatus(TaskStatus.FAILED);
        long totalFilesManaged = fileRepository.count();

        report.put("total_tasks_run", totalTasks);
        report.put("tasks_completed_successfully", completedTasks);
        report.put("tasks_failed", failedTasks);
        report.put("total_files_indexed", totalFilesManaged);
        report.put("app_version", "1.0.0");
        report.put("generated_at", LocalDateTime.now().toString());

        return report;
    }
}
