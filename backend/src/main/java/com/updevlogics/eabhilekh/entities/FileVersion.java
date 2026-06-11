package com.updevlogics.eabhilekh.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

import java.io.Serializable;

@Entity
@Table(name = "file_versions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileVersion implements Serializable {
    private static final long serialVersionUID = 1L;
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
