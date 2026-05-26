package com.updevlogics.fmo.repositories;

import com.updevlogics.fmo.entities.DbFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface DbFileRepository extends JpaRepository<DbFile, Long> {
    Optional<DbFile> findByPath(String path);
}
