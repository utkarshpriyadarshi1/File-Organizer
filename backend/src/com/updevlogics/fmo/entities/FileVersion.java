package com.updevlogics.fmo.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "file_versions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileVersion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "file_id", nullable = false)
    private DbFile file;

    @ManyToOne
    @JoinColumn(name = "backup_job_id")
    private BackupJob backupJob;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "backup_path", nullable = false, columnDefinition = "TEXT")
    private String backupPath;

    @Column(name = "backed_up_at", nullable = false)
    @Builder.Default
    private LocalDateTime backedUpAt = LocalDateTime.now();
}
