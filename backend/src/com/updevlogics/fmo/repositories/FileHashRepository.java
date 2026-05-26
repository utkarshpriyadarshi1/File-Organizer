package com.updevlogics.fmo.repositories;

import com.updevlogics.fmo.entities.FileHash;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface FileHashRepository extends JpaRepository<FileHash, Long> {
    Optional<FileHash> findByFileId(Long fileId);
    List<FileHash> findByHash(String hash);
}
