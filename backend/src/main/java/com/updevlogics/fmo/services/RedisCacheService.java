package com.updevlogics.fmo.services;

import com.updevlogics.fmo.entities.DbFile;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class RedisCacheService {
    private static final Logger logger = LoggerFactory.getLogger(RedisCacheService.class);
    
    private final StringRedisTemplate redisTemplate;

    public void cacheFile(DbFile file) {
        if (file == null || file.getId() == null) return;
        try {
            String key = "file:" + file.getId();
            redisTemplate.opsForHash().put(key, "id", String.valueOf(file.getId()));
            redisTemplate.opsForHash().put(key, "path", file.getPath());
            redisTemplate.opsForHash().put(key, "name", file.getName());
            redisTemplate.opsForHash().put(key, "size", String.valueOf(file.getSize()));
            redisTemplate.opsForHash().put(key, "type", file.getType() != null ? file.getType() : "");
            
            if (file.getTags() != null) {
                for (var tag : file.getTags()) {
                    cacheFileTag(tag.getName(), file.getId());
                }
            }
        } catch (Exception e) {
            logger.warn("Redis operation failed. Caching skipped for file ID: {}. Error: {}", file.getId(), e.getMessage());
        }
    }

    public void cacheFileHash(String hash, Long fileId) {
        if (hash == null || fileId == null) return;
        try {
            String key = "hash:" + hash;
            redisTemplate.opsForSet().add(key, String.valueOf(fileId));
        } catch (Exception e) {
            logger.warn("Redis operation failed. Caching hash failed. Error: {}", e.getMessage());
        }
    }

    public void cacheFileTag(String tagName, Long fileId) {
        if (tagName == null || fileId == null) return;
        try {
            String key = "tag:" + tagName + ":files";
            redisTemplate.opsForSet().add(key, String.valueOf(fileId));
        } catch (Exception e) {
            logger.warn("Redis operation failed. Caching tag failed. Error: {}", e.getMessage());
        }
    }

    public Set<String> getFilesByHash(String hash) {
        if (hash == null) return Set.of();
        try {
            return redisTemplate.opsForSet().members("hash:" + hash);
        } catch (Exception e) {
            logger.warn("Redis lookup failed for hash: {}. Error: {}", hash, e.getMessage());
            return Set.of();
        }
    }

    public Set<String> getFilesByTag(String tagName) {
        if (tagName == null) return Set.of();
        try {
            return redisTemplate.opsForSet().members("tag:" + tagName + ":files");
        } catch (Exception e) {
            logger.warn("Redis lookup failed for tag: {}. Error: {}", tagName, e.getMessage());
            return Set.of();
        }
    }
    
    public void deleteFileCache(Long fileId) {
        if (fileId == null) return;
        try {
            String fileKey = "file:" + fileId;
            redisTemplate.delete(fileKey);
        } catch (Exception e) {
            logger.warn("Redis delete operation failed for file ID: {}. Error: {}", fileId, e.getMessage());
        }
    }
}
