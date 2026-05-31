package com.updevlogics.fboss.repositories;

import com.updevlogics.fboss.entities.IgnoreRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IgnoreRuleRepository extends JpaRepository<IgnoreRule, Long> {
    Optional<IgnoreRule> findByPattern(String pattern);
}
