package com.updevlogics.fboss.repositories;

import com.updevlogics.fboss.entities.BackgroundTask;
import com.updevlogics.fboss.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Collection;

@Repository
public interface BackgroundTaskRepository extends JpaRepository<BackgroundTask, String> {
    List<BackgroundTask> findByStatusIn(Collection<TaskStatus> statuses);
}
