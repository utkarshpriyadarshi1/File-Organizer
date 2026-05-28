package com.updevlogics.fmo.repositories;

import com.updevlogics.fmo.entities.BackgroundTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BackgroundTaskRepository extends JpaRepository<BackgroundTask, String> {
}
