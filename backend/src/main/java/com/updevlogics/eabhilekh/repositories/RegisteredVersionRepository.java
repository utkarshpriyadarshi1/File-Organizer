package com.updevlogics.eabhilekh.repositories;

import com.updevlogics.eabhilekh.entities.RegisteredVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RegisteredVersionRepository extends JpaRepository<RegisteredVersion, Long> {
    Optional<RegisteredVersion> findByVersion(String version);
}
