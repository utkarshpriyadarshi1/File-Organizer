package in.updev.fileorganizer.repositories;

import in.updev.fileorganizer.entities.AnalysisFileRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnalysisFileRecordRepository extends JpaRepository<AnalysisFileRecord, Long> {
    Page<AnalysisFileRecord> findByTaskIdAndCategory(String taskId, String category, Pageable pageable);
    void deleteByTaskId(String taskId);
}
