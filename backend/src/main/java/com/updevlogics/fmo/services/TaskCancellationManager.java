package com.updevlogics.fmo.services;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TaskCancellationManager {
    private final StringRedisTemplate redisTemplate;

    public void setCancelFlag(String taskId) {
        String key = "task:" + taskId + ":cancel";
        redisTemplate.opsForValue().set(key, "1");
    }

    public boolean isCancelled(String taskId) {
        if (taskId == null) return false;
        String key = "task:" + taskId + ":cancel";
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }

    public void evictFromQueue(String taskId) {
        redisTemplate.opsForList().remove("task_queue", 0, taskId);
    }

    public void cleanCancellationKey(String taskId) {
        String key = "task:" + taskId + ":cancel";
        redisTemplate.delete(key);
    }
}
