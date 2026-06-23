package in.updev.fileorganizer.services;

import in.updev.fileorganizer.repositories.BackgroundTaskRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class BackupServiceTest {

    @Autowired
    private BackupService backupService;

    @Autowired
    private BackgroundTaskRepository backgroundTaskRepository;

    @TempDir
    Path tempSource;

    @TempDir
    Path tempBackup;

    @Test
    public void testIncrementalBackup() throws Exception {
        // Create initial dummy files in temporary source directory
        Path file1 = tempSource.resolve("file1.txt");
        Files.writeString(file1, "Original Content for File 1");

        Path file2 = tempSource.resolve("file2.jpg");
        Files.writeString(file2, "Original Content for File 2");

        // Trigger first backup task
        String taskId1 = backupService.createBackup(tempSource.toString(), tempBackup.toString());
        assertNotNull(taskId1);

        // Wait for the task to complete
        waitForTaskCompletion(taskId1);

        // Verify that files were successfully copied to backup directory
        Path backupFile1 = tempBackup.resolve("file1.txt");
        Path backupFile2 = tempBackup.resolve("file2.jpg");
        assertTrue(Files.exists(backupFile1), "file1 should exist in backup");
        assertTrue(Files.exists(backupFile2), "file2 should exist in backup");
        assertEquals("Original Content for File 1", Files.readString(backupFile1));

        // Trigger second backup without modifications - should skip copying
        String taskId2 = backupService.createBackup(tempSource.toString(), tempBackup.toString());
        waitForTaskCompletion(taskId2);

        // Modify file1 content (changing size) and timestamp to trigger incremental update
        Files.writeString(file1, "Modified Content for File 1 with different size");
        long newModTime = System.currentTimeMillis() + 5000;
        Files.setLastModifiedTime(file1, FileTime.fromMillis(newModTime));

        // Trigger third backup task
        String taskId3 = backupService.createBackup(tempSource.toString(), tempBackup.toString());
        waitForTaskCompletion(taskId3);

        // Verify only modified file was copied and updated, others remained unchanged
        assertEquals("Modified Content for File 1 with different size", Files.readString(backupFile1), "file1 should be updated in backup");
        assertEquals("Original Content for File 2", Files.readString(backupFile2), "file2 should remain original in backup");
    }

    private void waitForTaskCompletion(String taskId) throws InterruptedException {
        int retries = 50;
        while (retries > 0) {
            var taskOpt = backgroundTaskRepository.findById(taskId);
            if (taskOpt.isPresent()) {
                var status = taskOpt.get().getStatus();
                if (status == in.updev.fileorganizer.enums.TaskStatus.COMPLETED || 
                    status == in.updev.fileorganizer.enums.TaskStatus.COMPLETED_WITH_FAILURES ||
                    status == in.updev.fileorganizer.enums.TaskStatus.FAILED || 
                    status == in.updev.fileorganizer.enums.TaskStatus.CANCELED) {
                    break;
                }
            }
            Thread.sleep(200);
            retries--;
        }
    }
}
