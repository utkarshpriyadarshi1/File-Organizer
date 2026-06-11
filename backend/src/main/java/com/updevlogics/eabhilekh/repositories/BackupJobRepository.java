package com.updevlogics.eabhilekh.repositories;

import com.updevlogics.eabhilekh.entities.BackupJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BackupJobRepository extends JpaRepository<BackupJob, Long> {
}
