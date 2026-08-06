package in.updev.fileorganizer.repositories;

import in.updev.fileorganizer.entities.BackgroundTask;
import in.updev.fileorganizer.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Collection;

@Repository
public interface BackgroundTaskRepository extends JpaRepository<BackgroundTask, String> {
    List<BackgroundTask> findByStatusIn(Collection<TaskStatus> statuses);
    long countByStatus(TaskStatus status);
}
