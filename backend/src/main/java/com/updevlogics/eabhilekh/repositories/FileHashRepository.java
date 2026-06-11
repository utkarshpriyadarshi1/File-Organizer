package com.updevlogics.eabhilekh.repositories;

import com.updevlogics.eabhilekh.entities.FileHash;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface FileHashRepository extends JpaRepository<FileHash, Long> {
    Optional<FileHash> findByFileId(Long fileId);
    List<FileHash> findByHash(String hash);

    @Query("SELECT fh FROM FileHash fh WHERE fh.file.path LIKE concat(:prefix, '%')")
    List<FileHash> findByFilePathStartingWith(@Param("prefix") String prefix);
}

