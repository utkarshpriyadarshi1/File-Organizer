package in.updev.fileorganizer.entities;

import in.updev.fileorganizer.enums.TaskType;
import in.updev.fileorganizer.enums.TaskStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.io.Serializable;

@Entity
@Table(name = "background_tasks", indexes = {
    @Index(name = "idx_bgtask_status", columnList = "status"),
    @Index(name = "idx_bgtask_type", columnList = "task_type")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BackgroundTask implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_type", nullable = false, columnDefinition = "TEXT")
    private TaskType taskType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "TEXT")
    private TaskStatus status;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String summary;

    @Column(name = "report_file_path", columnDefinition = "TEXT")
    private String reportFilePath;

    @Column(name = "source_path", columnDefinition = "TEXT")
    private String sourcePath;

    @Column(name = "destination_path", columnDefinition = "TEXT")
    private String destinationPath;

    @Column(name = "action_details", columnDefinition = "TEXT")
    private String actionDetails;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "execution_time_ms")
    private Long executionTimeMs;
}
