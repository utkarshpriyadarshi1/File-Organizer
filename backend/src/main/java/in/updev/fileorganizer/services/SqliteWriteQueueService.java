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
                    Runnable task = writeQueue.take();
                    transactionTemplate.execute(status -> {
                        task.run();
                        return null;
                    });
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                } catch (Exception e) {
                    logger.error("Error executing SQLite database write task", e);
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
        writeQueue.add(task);
    }

    public <T> T executeWrite(java.util.concurrent.Callable<T> task) throws Exception {
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
}
