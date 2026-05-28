package com.updevlogics.fmo.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.updevlogics.fmo.config.WebSocketHandler;
import com.updevlogics.fmo.entities.BackgroundTask;
import com.updevlogics.fmo.entities.FileReversal;
import com.updevlogics.fmo.repositories.BackgroundTaskRepository;
import com.updevlogics.fmo.repositories.DbFileRepository;
import com.updevlogics.fmo.repositories.FileReversalRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

@Service
@RequiredArgsConstructor
public class BackgroundTaskManager {
    private static final Logger logger = LoggerFactory.getLogger(BackgroundTaskManager.class);
    private static final int MAX_CONCURRENT_TASKS = 2;

    private final BackgroundTaskRepository backgroundTaskRepository;
    private final FileReversalRepository fileReversalRepository;
    private final DbFileRepository dbFileRepository;
    private final TaskCancellationManager taskCancellationManager;
    private final ReportSerializationService reportSerializationService;
    private final SqliteWriteQueueService sqliteWriteQueueService;
    private final SecureStorageService secureStorageService;
    private final RedisCacheService redisCacheService;
    private final StringRedisTemplate redisTemplate;

    private final ExecutorService executorService = Executors.newFixedThreadPool(MAX_CONCURRENT_TASKS);
    private final Map<String, Future<?>> activeFutures = new ConcurrentHashMap<>();
    private final Queue<String> localTaskQueue = new ConcurrentLinkedQueue<>();
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @FunctionalInterface
    public interface TaskAction {
        void execute(String taskId, TaskProgressReporter reporter) throws Exception;
    }

    public interface TaskProgressReporter {
        void reportProgress(double progress, String currentMessage);
        void appendResult(Object resultItem);
        boolean isCancelled();
    }

    public String submitTask(String taskType, TaskAction action) {
        String taskId = UUID.randomUUID().toString();
        
        sqliteWriteQueueService.submitWrite(() -> {
            BackgroundTask task = BackgroundTask.builder()
                    .id(taskId)
                    .taskType(taskType)
                    .status("QUEUED")
                    .summary("Waiting in queue...")
                    .createdAt(LocalDateTime.now())
                    .build();
            backgroundTaskRepository.save(task);
        });

        try {
            redisTemplate.opsForList().rightPush("task_queue", taskId);
        } catch (Exception e) {
            logger.warn("Redis is unavailable. Queueing task locally. Error: {}", e.getMessage());
            localTaskQueue.add(taskId);
        }
        broadcastStatus(taskId, taskType, "QUEUED", 0.0, "Task queued...");

        triggerNextTask(taskType, action);

        return taskId;
    }

    private void triggerNextTask(String taskType, TaskAction action) {
        executorService.submit(() -> {
            String taskId = null;
            try {
                taskId = redisTemplate.opsForList().leftPop("task_queue");
            } catch (Exception e) {
                logger.warn("Redis leftPop failed, checking in-memory queue. Error: {}", e.getMessage());
            }
            if (taskId == null) {
                taskId = localTaskQueue.poll();
            }
            if (taskId == null) return;

            final String finalTaskId = taskId;
            sqliteWriteQueueService.submitWrite(() -> {
                backgroundTaskRepository.findById(finalTaskId).ifPresent(task -> {
                    task.setStatus("RUNNING");
                    task.setSummary("Task started...");
                    backgroundTaskRepository.save(task);
                });
            });
            broadcastStatus(finalTaskId, taskType, "RUNNING", 0.0, "Starting execution...");

            List<Object> resultList = Collections.synchronizedList(new ArrayList<>());
            TaskProgressReporter reporter = new TaskProgressReporter() {
                private long lastCheckpointTime = System.currentTimeMillis();
                private int itemsSinceCheckpoint = 0;

                @Override
                public void reportProgress(double progress, String currentMessage) {
                    try {
                        redisTemplate.opsForValue().set("task:" + finalTaskId + ":processed", String.valueOf((int) progress));
                    } catch (Exception e) {
                        logger.warn("Redis progress report failed for task {}: {}", finalTaskId, e.getMessage());
                    }
                    broadcastStatus(finalTaskId, taskType, "RUNNING", progress, currentMessage);
                }

                @Override
                public void appendResult(Object resultItem) {
                    resultList.add(resultItem);
                    itemsSinceCheckpoint++;
                    long elapsed = System.currentTimeMillis() - lastCheckpointTime;
                    
                    if (itemsSinceCheckpoint >= 500 || elapsed >= 30000) {
                        doCheckpoint();
                    }
                }

                @Override
                public boolean isCancelled() {
                    return taskCancellationManager.isCancelled(finalTaskId);
                }

                private synchronized void doCheckpoint() {
                    itemsSinceCheckpoint = 0;
                    lastCheckpointTime = System.currentTimeMillis();
                    final int count = resultList.size();
                    sqliteWriteQueueService.submitWrite(() -> {
                        backgroundTaskRepository.findById(finalTaskId).ifPresent(task -> {
                            task.setSummary("Processed " + count + " items so far...");
                            backgroundTaskRepository.save(task);
                        });
                    });
                }
            };

            Future<?> future = CompletableFuture.runAsync(() -> {
                try {
                    action.execute(finalTaskId, reporter);
                    
                    if (reporter.isCancelled()) {
                        handleCancellation(finalTaskId, taskType, resultList);
                    } else {
                        handleCompletion(finalTaskId, taskType, resultList, null);
                    }
                } catch (Exception e) {
                    logger.error("Error executing task: {}", finalTaskId, e);
                    handleCompletion(finalTaskId, taskType, resultList, e);
                } finally {
                    activeFutures.remove(finalTaskId);
                    taskCancellationManager.cleanCancellationKey(finalTaskId);
                }
            });

            activeFutures.put(finalTaskId, future);
        });
    }

    private void handleCancellation(String taskId, String taskType, List<Object> results) {
        String reportPath = serializeResults(taskId, results);
        sqliteWriteQueueService.submitWrite(() -> {
            backgroundTaskRepository.findById(taskId).ifPresent(task -> {
                task.setStatus("CANCELED");
                task.setCompletedAt(LocalDateTime.now());
                task.setSummary("Task was force-canceled by user. Partially processed " + results.size() + " items.");
                task.setReportFilePath(reportPath);
                backgroundTaskRepository.save(task);
            });
        });
        broadcastStatus(taskId, taskType, "CANCELED", 100.0, "Task force-canceled by user.");
    }

    private void handleCompletion(String taskId, String taskType, List<Object> results, Exception error) {
        String status;
        String summary;
        if (error != null) {
            status = "FAILED";
            summary = "Task failed: " + error.getMessage();
        } else {
            boolean hasFailures = results.stream().anyMatch(r -> {
                if (r instanceof Map) {
                    Map<?, ?> map = (Map<?, ?>) r;
                    return Boolean.TRUE.equals(map.get("failed")) || map.containsKey("error");
                }
                return false;
            });
            status = hasFailures ? "COMPLETED_WITH_FAILURES" : "COMPLETED";
            summary = "Processed " + results.size() + " items successfully.";
        }

        String reportPath = serializeResults(taskId, results);
        sqliteWriteQueueService.submitWrite(() -> {
            backgroundTaskRepository.findById(taskId).ifPresent(task -> {
                task.setStatus(status);
                task.setCompletedAt(LocalDateTime.now());
                task.setSummary(summary);
                task.setReportFilePath(reportPath);
                backgroundTaskRepository.save(task);
            });
        });
        broadcastStatus(taskId, taskType, status, 100.0, summary);
    }

    private String serializeResults(String taskId, List<Object> results) {
        try {
            String json = objectMapper.writeValueAsString(results);
            return reportSerializationService.writeReport(taskId, json);
        } catch (Exception e) {
            logger.error("Failed to serialize results for task: {}", taskId, e);
            return null;
        }
    }

    public void cancelTask(String taskId) {
        taskCancellationManager.evictFromQueue(taskId);
        taskCancellationManager.setCancelFlag(taskId);

        Future<?> future = activeFutures.get(taskId);
        if (future != null) {
            future.cancel(true);
        }

        sqliteWriteQueueService.submitWrite(() -> {
            backgroundTaskRepository.findById(taskId).ifPresent(task -> {
                if ("QUEUED".equals(task.getStatus())) {
                    task.setStatus("CANCELED");
                    task.setCompletedAt(LocalDateTime.now());
                    task.setSummary("Task canceled from queue.");
                    backgroundTaskRepository.save(task);
                    broadcastStatus(taskId, task.getTaskType(), "CANCELED", 0.0, "Task canceled from queue.");
                }
            });
        });
    }

    public String executeReversalAction(String originalTaskId, String actionType, List<String> targetPaths) {
        return submitTask("REVERSAL", (taskId, reporter) -> {
            if ("REVERT_MOVES".equals(actionType)) {
                List<FileReversal> reversals = fileReversalRepository.findByTaskId(originalTaskId);
                if (targetPaths != null && !targetPaths.isEmpty()) {
                    reversals = reversals.stream()
                            .filter(r -> targetPaths.contains(r.getSourcePath()))
                            .toList();
                }

                int total = reversals.size();
                int count = 0;

                for (FileReversal rev : reversals) {
                    if (reporter.isCancelled()) break;

                    Map<String, Object> fileResult = new HashMap<>();
                    fileResult.put("sourcePath", rev.getSourcePath());
                    fileResult.put("originalPath", rev.getOriginalPath());

                    try {
                        Path source = Paths.get(rev.getSourcePath());
                        Path dest = Paths.get(rev.getOriginalPath());
                        
                        // Perform the aggressive revert move
                        secureStorageService.secureMove(source, dest, false, null);
                        fileResult.put("failed", false);

                        sqliteWriteQueueService.submitWrite(() -> {
                            dbFileRepository.findByPath(rev.getSourcePath()).ifPresent(dbFile -> {
                                dbFile.setPath(rev.getOriginalPath());
                                dbFile.setName(dest.getFileName().toString());
                                dbFileRepository.save(dbFile);
                                redisCacheService.cacheFile(dbFile);
                            });
                            fileReversalRepository.delete(rev);
                        });
                    } catch (Exception e) {
                        logger.error("Reversal move failed for path: {}", rev.getSourcePath(), e);
                        fileResult.put("failed", true);
                        fileResult.put("error", e.getMessage());
                    }

                    reporter.appendResult(fileResult);
                    count++;
                    reporter.reportProgress(((double) count / total) * 100, "Reverted: " + Paths.get(rev.getOriginalPath()).getFileName());
                }
            }
        });
    }

    private void broadcastStatus(String taskId, String taskType, String status, double progress, String message) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("taskId", taskId);
            payload.put("taskType", taskType);
            payload.put("status", status);
            payload.put("progress", progress);
            payload.put("message", message);
            WebSocketHandler.broadcastMessage(objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            logger.error("Failed to broadcast task status", e);
        }
    }

    public List<BackgroundTask> getActiveTasks() {
        return backgroundTaskRepository.findAll().stream()
                .filter(t -> "RUNNING".equals(t.getStatus()) || "QUEUED".equals(t.getStatus()))
                .toList();
    }
}
