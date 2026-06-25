package in.updev.fileorganizer.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.io.Serializable;

@Entity
@Table(name = "file_reversals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileReversal implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_id", nullable = false, length = 36)
    private String taskId;

    @Column(name = "operation_type", nullable = false, columnDefinition = "TEXT")
    private String operationType;

    @Column(name = "source_path", nullable = false, columnDefinition = "TEXT")
    private String sourcePath;

    @Column(name = "original_path", nullable = false, columnDefinition = "TEXT")
    private String originalPath;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
