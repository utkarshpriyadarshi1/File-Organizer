package com.updevlogics.fboss.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

import java.io.Serializable;

@Entity
@Table(name = "backup_jobs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BackupJob implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_name", nullable = false, columnDefinition = "TEXT")
    private String jobName;

    @Column(name = "job_type", nullable = false, columnDefinition = "TEXT")
    private String jobType;

    @Column(name = "source_path", nullable = false, columnDefinition = "TEXT")
    private String sourcePath;

    @Column(name = "destination_path", nullable = false, columnDefinition = "TEXT")
    private String destinationPath;

    @Column(columnDefinition = "TEXT")
    private String schedule;

    @Column(columnDefinition = "TEXT")
    private String status;

    @Column(name = "last_run")
    private LocalDateTime lastRun;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
