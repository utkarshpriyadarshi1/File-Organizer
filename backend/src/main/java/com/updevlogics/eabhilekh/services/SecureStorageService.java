package com.updevlogics.eabhilekh.services;

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

@Service
@RequiredArgsConstructor
public class SecureStorageService {
    private static final Logger logger = LoggerFactory.getLogger(SecureStorageService.class);
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
            String sourceHash = getSha256(source);
            Files.move(source, destination, StandardCopyOption.REPLACE_EXISTING);
            String destHash = getSha256(destination);
            if (!sourceHash.equals(destHash)) {
                throw new IOException("Integrity check failed during move: Destination hash does not match source hash.");
            }
            logger.info("Moved file from {} to {}", source, destination);
        }
    }

    public String getSha256(Path file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (FileInputStream fis = new FileInputStream(file.toFile())) {
            byte[] byteArray = new byte[16384];
            int bytesRead;
            while ((bytesRead = fis.read(byteArray)) != -1) {
                digest.update(byteArray, 0, bytesRead);
            }
            byte[] hashBytes = digest.digest();
            StringBuilder sb = new StringBuilder();
            for (byte b : hashBytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        }
    }
}
