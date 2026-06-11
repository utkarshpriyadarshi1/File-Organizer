package com.updevlogics.eabhilekh.repositories;

import com.updevlogics.eabhilekh.entities.SyncJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SyncJobRepository extends JpaRepository<SyncJob, Long> {
}
