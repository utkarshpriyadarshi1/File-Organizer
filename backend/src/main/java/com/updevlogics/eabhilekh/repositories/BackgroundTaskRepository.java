package com.updevlogics.eabhilekh.repositories;

import com.updevlogics.eabhilekh.entities.BackgroundTask;
import com.updevlogics.eabhilekh.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Collection;

@Repository
public interface BackgroundTaskRepository extends JpaRepository<BackgroundTask, String> {
    List<BackgroundTask> findByStatusIn(Collection<TaskStatus> statuses);
}
