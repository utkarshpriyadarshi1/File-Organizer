package com.updevlogics.fmo.repositories;

import com.updevlogics.fmo.entities.BackupJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BackupJobRepository extends JpaRepository<BackupJob, Long> {
}
