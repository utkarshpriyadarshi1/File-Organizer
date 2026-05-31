package com.updevlogics.fboss.repositories;

import com.updevlogics.fboss.entities.BackupJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BackupJobRepository extends JpaRepository<BackupJob, Long> {
}
