package in.updev.fileorganizer.services;
import in.updev.fileorganizer.enums.TaskType;

import in.updev.fileorganizer.entities.FileVersion;
import in.updev.fileorganizer.repositories.FileVersionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RestoreService {
    private static final Logger logger = LoggerFactory.getLogger(RestoreService.class);

    private final FileVersionRepository fileVersionRepository;
    private final AuditLogService auditLogService;
    private final BackgroundTaskManager backgroundTaskManager;
    private final SecureStorageService secureStorageService;

    public List<FileVersion> getVersionsForFile(Long fileId) {
        return fileVersionRepository.findByFileId(fileId);
    }

    public String restoreVersion(Long versionId, String targetPathOverride) {
        FileVersion version = fileVersionRepository.findById(versionId)
                .orElseThrow(() -> new IllegalArgumentException("File version not found: " + versionId));

        String destPathStr = (targetPathOverride != null && !targetPathOverride.trim().isEmpty())
                ? targetPathOverride.trim()
                : version.getFile().getPath();
        String actionDetails = "Restore version " + version.getVersionNumber() + " of " + (version.getFile() != null ? version.getFile().getName() : "file");

        final String finalDestPathStr = destPathStr;

        return backgroundTaskManager.submitTask(TaskType.RESTORE, version.getBackupPath(), destPathStr, actionDetails, (taskId, reporter) -> {
            Path backupFile = Paths.get(version.getBackupPath());
            if (!Files.exists(backupFile)) {
                throw new IOException("Backup file does not exist at location: " + version.getBackupPath());
            }

            Path destination = Paths.get(finalDestPathStr);

            Map<String, Object> fileResult = new HashMap<>();
            fileResult.put("versionId", versionId);
            fileResult.put("backupPath", version.getBackupPath());
            fileResult.put("destinationPath", finalDestPathStr);

            try {
                // Restore copy & integrity verify
                secureStorageService.secureCopy(backupFile, destination, false, null);
                fileResult.put("failed", false);

                auditLogService.logAction("FILE_RESTORED", version.getFile(), 
                        "Restored version " + version.getVersionNumber() + " to " + finalDestPathStr);
                
                logger.info("Restored version {} of file {} to {}", version.getVersionNumber(), version.getFile().getId(), finalDestPathStr);
            } catch (Exception e) {
                logger.error("Restore failed for version: {}", versionId, e);
                fileResult.put("failed", true);
                fileResult.put("error", e.getMessage());
            }

            reporter.appendResult(fileResult);
            reporter.reportProgress(100.0, "Restore completed.");
        });
    }
}
