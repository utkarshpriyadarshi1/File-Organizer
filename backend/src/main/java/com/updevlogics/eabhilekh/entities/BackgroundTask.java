package com.updevlogics.eabhilekh.entities;

import com.updevlogics.eabhilekh.enums.TaskType;
import com.updevlogics.eabhilekh.enums.TaskStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.io.Serializable;

@Entity
@Table(name = "background_tasks")
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

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
