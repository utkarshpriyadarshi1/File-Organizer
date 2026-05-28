package com.updevlogics.fmo.services;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TaskCancellationManager {
    private static final Logger logger = LoggerFactory.getLogger(TaskCancellationManager.class);

    private final StringRedisTemplate redisTemplate;

    private final java.util.Set<String> localCancelledTasks = java.util.concurrent.ConcurrentHashMap.newKeySet();

    public void setCancelFlag(String taskId) {
        String key = "task:" + taskId + ":cancel";
        logger.info("Setting cancel flag for task ID: {}", taskId);
        try {
            redisTemplate.opsForValue().set(key, "1");
        } catch (Exception e) {
            logger.warn("Redis is unavailable. Setting cancel flag locally. Error: {}", e.getMessage());
        }
        localCancelledTasks.add(taskId);
    }

    public boolean isCancelled(String taskId) {
        if (taskId == null) return false;
        if (localCancelledTasks.contains(taskId)) return true;
        
        String key = "task:" + taskId + ":cancel";
        try {
            boolean cancelled = Boolean.TRUE.equals(redisTemplate.hasKey(key));
            if (cancelled) {
                logger.debug("Cancellation flag detected in Redis for task ID: {}", taskId);
            }
            return cancelled;
        } catch (Exception e) {
            logger.warn("Redis lookup failed for cancellation key of task {}: {}", taskId, e.getMessage());
            return false;
        }
    }

    public void evictFromQueue(String taskId) {
        logger.info("Evicting task ID from queue: {}", taskId);
        try {
            redisTemplate.opsForList().remove("task_queue", 0, taskId);
        } catch (Exception e) {
            logger.warn("Redis remove from queue failed: {}", e.getMessage());
        }
    }

    public void cleanCancellationKey(String taskId) {
        String key = "task:" + taskId + ":cancel";
        logger.info("Cleaning cancellation flag for task ID: {}", taskId);
        try {
            redisTemplate.delete(key);
        } catch (Exception e) {
            logger.warn("Redis delete cancellation key failed: {}", e.getMessage());
        }
        localCancelledTasks.remove(taskId);
    }
}

