package in.updev.fileorganizer.services;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import in.updev.fileorganizer.config.WebSocketHandler;
import in.updev.fileorganizer.entities.BackgroundTask;
import in.updev.fileorganizer.entities.FileReversal;
import in.updev.fileorganizer.enums.TaskStatus;
import in.updev.fileorganizer.enums.TaskType;
import in.updev.fileorganizer.repositories.BackgroundTaskRepository;
import in.updev.fileorganizer.repositories.DbFileRepository;
import in.updev.fileorganizer.repositories.FileReversalRepository;
import lombok.RequiredArgsConstructor;

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

    private final ExecutorService executorService = Executors.newFixedThreadPool(MAX_CONCURRENT_TASKS);
    private final Map<String, Future<?>> activeFutures = new ConcurrentHashMap<>();
    private final Queue<String> localTaskQueue = new ConcurrentLinkedQueue<>();
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @lombok.Data
    @lombok.AllArgsConstructor
    private static class TaskMeta {
        private String sourcePath;
        private String destinationPath;
        private String actionDetails;
    }

    private final Map<String, TaskMeta> taskMetaCache = new ConcurrentHashMap<>();

    @FunctionalInterface
    public interface TaskAction {
        void execute(String taskId, TaskProgressReporter reporter) throws Exception;
    }

    public interface TaskProgressReporter {
        void reportProgress(double progress, String currentMessage);

        void appendResult(Object resultItem);

        boolean isCancelled();

        void checkPauseState() throws InterruptedException;
    }

    public String submitTask(TaskType taskType, TaskAction action) {
        return submitTask(taskType, null, null, null, action);
    }

    public String submitTask(TaskType taskType, String sourcePath, String destinationPath, String actionDetails,
            TaskAction action) {
        String taskId = UUID.randomUUID().toString();

        if (sourcePath != null || destinationPath != null || actionDetails != null) {
            taskMetaCache.put(taskId, new TaskMeta(sourcePath, destinationPath, actionDetails));
        }

        sqliteWriteQueueService.submitWrite(() -> {
            BackgroundTask task = BackgroundTask.builder()
                    .id(taskId)
                    .taskType(taskType)
                    .status(TaskStatus.QUEUED)
                    .summary("Waiting in queue...")
                    .sourcePath(sourcePath)
                    .destinationPath(destinationPath)
                    .actionDetails(actionDetails)
                    .createdAt(LocalDateTime.now())
                    .build();
            backgroundTaskRepository.save(task);
        });

        localTaskQueue.add(taskId);
        broadcastStatus(taskId, taskType, TaskStatus.QUEUED, 0.0, "Task queued...");

        triggerNextTask(taskType, action);

        return taskId;
    }

    private void triggerNextTask(TaskType taskType, TaskAction action) {
        executorService.submit(() -> {
            String taskId = localTaskQueue.poll();
            if (taskId == null)
                return;

            final String finalTaskId = taskId;
            sqliteWriteQueueService.submitWrite(() -> {
                backgroundTaskRepository.findById(finalTaskId).ifPresent(task -> {
                    task.setStatus(TaskStatus.RUNNING);
                    task.setSummary("Task started...");
                    backgroundTaskRepository.save(task);
                });
            });
            broadcastStatus(finalTaskId, taskType, TaskStatus.RUNNING, 0.0, "Starting execution...");

            List<Object> resultList = Collections.synchronizedList(new ArrayList<>());
            TaskProgressReporter reporter = new TaskProgressReporter() {
                private long lastCheckpointTime = System.currentTimeMillis();
                private int itemsSinceCheckpoint = 0;
                private long lastProgressTime = 0;

                @Override
                public void reportProgress(double progress, String currentMessage) {
                    long now = System.currentTimeMillis();
                    if (now - lastProgressTime > 200 || progress >= 100.0) {
                        broadcastStatus(finalTaskId, taskType, TaskStatus.RUNNING, progress, currentMessage);
                        lastProgressTime = now;
                    }
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

                @Override
                public void checkPauseState() throws InterruptedException {
                    boolean wasPaused = false;
                    while (taskCancellationManager.isPaused(finalTaskId) && !taskCancellationManager.isCancelled(finalTaskId)) {
                        if (!wasPaused) {
                            wasPaused = true;
                            broadcastStatus(finalTaskId, taskType, TaskStatus.PAUSED, -1.0, "Task paused. Waiting to resume...");
                            sqliteWriteQueueService.submitWrite(() -> {
                                backgroundTaskRepository.findById(finalTaskId).ifPresent(task -> {
                                    task.setStatus(TaskStatus.PAUSED);
                                    backgroundTaskRepository.save(task);
                                });
                            });
                        }
                        Thread.sleep(1000);
                    }
                    if (wasPaused && !taskCancellationManager.isCancelled(finalTaskId)) {
                        broadcastStatus(finalTaskId, taskType, TaskStatus.RUNNING, -1.0, "Task resumed...");
                        sqliteWriteQueueService.submitWrite(() -> {
                            backgroundTaskRepository.findById(finalTaskId).ifPresent(task -> {
                                task.setStatus(TaskStatus.RUNNING);
                                backgroundTaskRepository.save(task);
                            });
                        });
                    }
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
                    if (reporter.isCancelled()) {
                        logger.info("Task {} interrupted/canceled during execution", finalTaskId);
                        handleCancellation(finalTaskId, taskType, resultList);
                    } else {
                        logger.error("Error executing task: {}", finalTaskId, e);
                        handleCompletion(finalTaskId, taskType, resultList, e);
                    }
                } finally {
                    activeFutures.remove(finalTaskId);
                    taskCancellationManager.cleanCancellationKey(finalTaskId);
                    taskMetaCache.remove(finalTaskId);
                }
            });

            activeFutures.put(finalTaskId, future);
        });
    }

    private void handleCancellation(String taskId, TaskType taskType, List<Object> results) {
        String reportPath = serializeResults(taskId, results);
        sqliteWriteQueueService.submitWrite(() -> {
            backgroundTaskRepository.findById(taskId).ifPresent(task -> {
                task.setStatus(TaskStatus.CANCELED);
                task.setCompletedAt(LocalDateTime.now());
                task.setSummary("Task was force-canceled by user. Partially processed " + results.size() + " items.");
                task.setReportFilePath(reportPath);
                backgroundTaskRepository.save(task);
            });
        });
        broadcastStatus(taskId, taskType, TaskStatus.CANCELED, 100.0, "Task force-canceled by user.");
    }

    private void handleCompletion(String taskId, TaskType taskType, List<Object> results, Exception error) {
        TaskStatus status;
        String summary;
        if (error != null) {
            status = TaskStatus.FAILED;
            summary = "Task failed: " + error.getMessage();
        } else {
            boolean hasFailures = results.stream().anyMatch(r -> {
                if (r instanceof Map) {
                    Map<?, ?> map = (Map<?, ?>) r;
                    return Boolean.TRUE.equals(map.get("failed")) || map.containsKey("error");
                }
                return false;
            });
            status = hasFailures ? TaskStatus.COMPLETED_WITH_FAILURES : TaskStatus.COMPLETED;
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
        localTaskQueue.remove(taskId);
        taskCancellationManager.setCancelFlag(taskId);

        Future<?> future = activeFutures.get(taskId);
        if (future != null) {
            future.cancel(true);
        }

        sqliteWriteQueueService.submitWrite(() -> {
            backgroundTaskRepository.findById(taskId).ifPresent(task -> {
                if (TaskStatus.QUEUED == task.getStatus()) {
                    task.setStatus(TaskStatus.CANCELED);
                    task.setCompletedAt(LocalDateTime.now());
                    task.setSummary("Task canceled from queue.");
                    backgroundTaskRepository.save(task);
                    broadcastStatus(taskId, task.getTaskType(), TaskStatus.CANCELED, 0.0, "Task canceled from queue.");
                }
            });
        });
    }

    public void pauseTask(String taskId) {
        if (!activeFutures.containsKey(taskId)) return;
        taskCancellationManager.setPauseFlag(taskId);
    }

    public void resumeTask(String taskId) {
        if (!activeFutures.containsKey(taskId)) return;
        taskCancellationManager.clearPauseFlag(taskId);
    }

    public String executeReversalAction(String originalTaskId, String actionType, List<String> targetPaths) {
        String actionDetails = "Undo operations for task: " + originalTaskId;
        return submitTask(TaskType.REVERSAL, null, null, actionDetails, (taskId, reporter) -> {
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
                    if (reporter.isCancelled())
                        break;

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
                    reporter.reportProgress(((double) count / total) * 100,
                            "Reverted: " + Paths.get(rev.getOriginalPath()).getFileName());
                }
            }
        });
    }

    private void broadcastStatus(String taskId, TaskType taskType, TaskStatus status, double progress, String message) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("taskId", taskId);
            payload.put("taskType", taskType.name());
            payload.put("status", status.name());
            payload.put("progress", progress);
            payload.put("message", message);

            TaskMeta meta = taskMetaCache.get(taskId);
            if (meta != null) {
                payload.put("sourcePath", meta.getSourcePath());
                payload.put("destinationPath", meta.getDestinationPath());
                payload.put("actionDetails", meta.getActionDetails());
            }

            WebSocketHandler.broadcastMessage(objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            logger.error("Failed to broadcast task status", e);
        }
    }

    public List<BackgroundTask> getActiveTasks() {
        return backgroundTaskRepository.findByStatusIn(List.of(TaskStatus.RUNNING, TaskStatus.QUEUED));
    }
}
