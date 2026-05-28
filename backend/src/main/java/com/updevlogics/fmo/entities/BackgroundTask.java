package com.updevlogics.fmo.entities;

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

    @Column(name = "task_type", nullable = false, columnDefinition = "TEXT")
    private String taskType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String status;

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
