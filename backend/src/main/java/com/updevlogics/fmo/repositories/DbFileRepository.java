package com.updevlogics.fmo.repositories;

import com.updevlogics.fmo.entities.DbFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import java.util.Optional;

@Repository
public interface DbFileRepository extends JpaRepository<DbFile, Long> {
    @Cacheable(value = "files-by-path", key = "#path", unless = "#result == null")
    Optional<DbFile> findByPath(String path);

    @Override
    @Cacheable(value = "files-by-id", key = "#id", unless = "#result == null")
    Optional<DbFile> findById(Long id);

    @Override
    @Caching(evict = {
        @CacheEvict(value = "files-by-path", key = "#entity.path"),
        @CacheEvict(value = "files-by-id", key = "#entity.id")
    })
    <S extends DbFile> S save(S entity);

    @Override
    @Caching(evict = {
        @CacheEvict(value = "files-by-path", key = "#entity.path"),
        @CacheEvict(value = "files-by-id", key = "#entity.id")
    })
    void delete(DbFile entity);
}
