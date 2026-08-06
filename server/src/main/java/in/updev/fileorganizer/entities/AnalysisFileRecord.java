package in.updev.fileorganizer.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "analysis_file_records", indexes = {
    @Index(name = "idx_task_category", columnList = "taskId, category")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AnalysisFileRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String taskId;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false, length = 2000)
    private String filePath;

    @Column(nullable = false)
    private Long size;

    @Column
    private LocalDateTime modifiedAt;
}
