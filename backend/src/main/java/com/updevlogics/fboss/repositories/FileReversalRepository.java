package com.updevlogics.fboss.repositories;

import com.updevlogics.fboss.entities.FileReversal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FileReversalRepository extends JpaRepository<FileReversal, Long> {
    List<FileReversal> findByTaskId(String taskId);
}
