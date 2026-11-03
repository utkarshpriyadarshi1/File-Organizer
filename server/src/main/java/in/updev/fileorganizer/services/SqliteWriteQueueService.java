package in.updev.fileorganizer.services;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

@Service
public class SqliteWriteQueueService {
    private static final Logger logger = LoggerFactory.getLogger(SqliteWriteQueueService.class);
    private final BlockingQueue<Runnable> writeQueue = new LinkedBlockingQueue<>();
    private final TransactionTemplate transactionTemplate;
    private Thread consumerThread;
    private volatile boolean running = true;

    public SqliteWriteQueueService(PlatformTransactionManager transactionManager) {
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @PostConstruct
    public void startConsumer() {
        consumerThread = new Thread(() -> {
            while (running) {
                try {
                    Runnable firstTask = writeQueue.take();
                    java.util.List<Runnable> batch = new java.util.ArrayList<>();
                    batch.add(firstTask);
                    writeQueue.drainTo(batch, 99); // Drain up to 99 more pending write tasks (up to 100 total)

                    try {
                        transactionTemplate.execute(status -> {
                            for (Runnable task : batch) {
                                task.run();
                            }
                            return null;
                        });
                    } catch (Exception batchEx) {
                        logger.warn("Batched SQLite transaction failed. Retrying items individually: {}", batchEx.getMessage());
                        // Fallback: run each task in its own isolated transaction so valid tasks still succeed
                        for (Runnable task : batch) {
                            try {
                                transactionTemplate.execute(status -> {
                                    task.run();
                                    return null;
                                });
                            } catch (Exception itemEx) {
                                logger.error("Individual fallback SQLite write failed", itemEx);
                            }
                        }
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                } catch (Exception e) {
                    logger.error("Error executing SQLite database write loop", e);
                }
            }
        }, "sqlite-write-consumer");
        consumerThread.start();
    }

    @PreDestroy
    public void stopConsumer() {
        running = false;
        if (consumerThread != null) {
            consumerThread.interrupt();
        }
    }

    public void submitWrite(Runnable task) {
        if (Thread.currentThread() == consumerThread) {
            task.run();
            return;
        }
        writeQueue.add(task);
    }

    public <T> T executeWrite(java.util.concurrent.Callable<T> task) throws Exception {
        if (Thread.currentThread() == consumerThread) {
            return task.call();
        }
        java.util.concurrent.CompletableFuture<T> future = new java.util.concurrent.CompletableFuture<>();
        submitWrite(() -> {
            try {
                future.complete(task.call());
            } catch (Exception e) {
                future.completeExceptionally(e);
            }
        });
        return future.get();
    }

    public int getQueueSize() {
        return writeQueue.size();
    }
}
