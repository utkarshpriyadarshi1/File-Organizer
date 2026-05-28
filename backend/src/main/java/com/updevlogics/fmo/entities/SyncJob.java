package com.updevlogics.fmo.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

import java.io.Serializable;

@Entity
@Table(name = "sync_jobs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SyncJob implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_name", nullable = false, columnDefinition = "TEXT")
    private String jobName;

    @Column(name = "source_path", nullable = false, columnDefinition = "TEXT")
    private String sourcePath;

    @Column(name = "destination_path", nullable = false, columnDefinition = "TEXT")
    private String destinationPath;

    @Column(name = "sync_type", nullable = false, columnDefinition = "TEXT")
    private String syncType;

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
