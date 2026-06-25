package in.updev.fileorganizer.repositories;

import in.updev.fileorganizer.entities.BackupJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BackupJobRepository extends JpaRepository<BackupJob, Long> {
}
