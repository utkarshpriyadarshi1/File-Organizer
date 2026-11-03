package in.updev.fileorganizer.services;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class SecureStorageService {
    private static final Logger logger = LoggerFactory.getLogger(SecureStorageService.class);
    private static final int BUFFER_SIZE = 65536; // 64 KB for fast streaming I/O
    private final EncryptionService encryptionService;

    public void secureCopy(Path source, Path destination, boolean encrypt, String password) throws Exception {
        Files.createDirectories(destination.getParent());
        if (encrypt) {
            encryptionService.encryptFile(source.toFile(), destination.toFile(), password);
            logger.info("Copied and encrypted file from {} to {}", source, destination);
        } else {
            Files.copy(source, destination, StandardCopyOption.REPLACE_EXISTING);
            logger.info("Copied file from {} to {}", source, destination);
            // Verify integrity
            String sourceHash = getSha256(source);
            String destHash = getSha256(destination);
            if (!sourceHash.equals(destHash)) {
                Files.deleteIfExists(destination);
                throw new IOException("Integrity check failed: Destination hash does not match source hash.");
            }
        }
    }

    public void secureMove(Path source, Path destination, boolean encrypt, String password) throws Exception {
        Files.createDirectories(destination.getParent());
        if (encrypt) {
            encryptionService.encryptFile(source.toFile(), destination.toFile(), password);
            Files.delete(source);
            logger.info("Moved and encrypted file from {} to {}", source, destination);
        } else {
            boolean sameStore = false;
            try {
                Path destParent = destination.getParent() != null ? destination.getParent() : destination;
                sameStore = Files.getFileStore(source).equals(Files.getFileStore(destParent));
            } catch (Exception e) {
                // If FileStore comparison fails, default to conservative behavior
                sameStore = false;
            }

            if (sameStore) {
                // Same volume move: atomic rename managed by filesystem kernel without data copying
                Files.move(source, destination, StandardCopyOption.REPLACE_EXISTING);
                logger.debug("Fast atomic moved file from {} to {}", source, destination);
            } else {
                // Cross-volume move: copy + delete with SHA-256 data validation
                String sourceHash = getSha256(source);
                Files.move(source, destination, StandardCopyOption.REPLACE_EXISTING);
                String destHash = getSha256(destination);
                if (!sourceHash.equals(destHash)) {
                    throw new IOException("Integrity check failed during cross-volume move: Destination hash does not match source hash.");
                }
                logger.info("Cross-volume moved and verified file from {} to {}", source, destination);
            }
        }
    }

    public String getSha256(Path file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (FileInputStream fis = new FileInputStream(file.toFile())) {
            byte[] byteArray = new byte[BUFFER_SIZE];
            int bytesRead;
            while ((bytesRead = fis.read(byteArray)) != -1) {
                digest.update(byteArray, 0, bytesRead);
            }
            return HexFormat.of().formatHex(digest.digest());
        }
    }
}
