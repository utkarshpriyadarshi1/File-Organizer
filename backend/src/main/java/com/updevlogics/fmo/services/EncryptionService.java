package com.updevlogics.fmo.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.CipherInputStream;
import javax.crypto.CipherOutputStream;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.*;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.security.spec.KeySpec;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class EncryptionService {
    private static final Logger logger = LoggerFactory.getLogger(EncryptionService.class);

    private static final String ALGORITHM = "AES/CBC/PKCS5Padding";
    private static final int IV_LENGTH_BYTE = 16;
    private static final int SALT_LENGTH_BYTE = 16;
    private static final int ITERATION_COUNT = 65536;
    private static final int KEY_LENGTH_BIT = 256;

    private static final String DEFAULT_SECRET = "FBOSSSecureSecretKeyMasterTokenChangeThisInProd";

    // Cache to hold derived secret keys to prevent expensive PBKDF2 operations on every file.
    // Bounded thread-safe LRU cache.
    private static final int MAX_CACHE_SIZE = 100;
    private static final Map<KeyCacheKey, SecretKey> KEY_CACHE = java.util.Collections.synchronizedMap(
        new LinkedHashMap<KeyCacheKey, SecretKey>(MAX_CACHE_SIZE, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<KeyCacheKey, SecretKey> eldest) {
                return size() > MAX_CACHE_SIZE;
            }
        }
    );

    public void encryptFile(File source, File destination, String password) throws Exception {
        logger.info("Starting encryption: {} -> {}", source.getAbsolutePath(), destination.getAbsolutePath());
        String pass = (password != null && !password.isEmpty()) ? password : DEFAULT_SECRET;
        
        try {
            // Derive deterministic salt based on password to reuse cached keys for the same password,
            // while still using random IV for cryptographic security.
            byte[] salt = deriveSalt(pass);
            SecretKey secretKey = deriveKey(pass, salt);

            byte[] iv = new byte[IV_LENGTH_BYTE];
            SecureRandom random = new SecureRandom();
            random.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new IvParameterSpec(iv));

            // Use larger buffer (8KB) for improved I/O throughput
            try (FileOutputStream fos = new FileOutputStream(destination);
                 BufferedOutputStream bos = new BufferedOutputStream(fos);
                 FileInputStream fis = new FileInputStream(source);
                 BufferedInputStream bis = new BufferedInputStream(fis)) {

                // Write salt and IV first so they are stored with the encrypted file
                bos.write(salt);
                bos.write(iv);

                try (CipherOutputStream cos = new CipherOutputStream(bos, cipher)) {
                    byte[] buffer = new byte[8192];
                    int bytesRead;
                    while ((bytesRead = bis.read(buffer)) != -1) {
                        cos.write(buffer, 0, bytesRead);
                    }
                }
            }
            logger.info("Successfully encrypted file: {} -> {}", source.getName(), destination.getName());
        } catch (Exception e) {
            logger.error("Failed to encrypt file: {} -> {}. Error: {}", source.getAbsolutePath(), destination.getAbsolutePath(), e.getMessage(), e);
            throw e;
        }
    }

    public void decryptFile(File source, File destination, String password) throws Exception {
        logger.info("Starting decryption: {} -> {}", source.getAbsolutePath(), destination.getAbsolutePath());
        try (FileInputStream fis = new FileInputStream(source);
             BufferedInputStream bis = new BufferedInputStream(fis)) {

            byte[] salt = new byte[SALT_LENGTH_BYTE];
            byte[] iv = new byte[IV_LENGTH_BYTE];

            // Read the salt and IV from the beginning of the file
            if (bis.read(salt) < salt.length || bis.read(iv) < iv.length) {
                logger.error("Invalid or corrupted encrypted file format. Source: {}", source.getAbsolutePath());
                throw new IOException("Invalid or corrupted encrypted file format.");
            }

            String pass = (password != null && !password.isEmpty()) ? password : DEFAULT_SECRET;
            SecretKey secretKey = deriveKey(pass, salt);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new IvParameterSpec(iv));

            // Use larger buffer (8KB) for improved I/O throughput
            try (FileOutputStream fos = new FileOutputStream(destination);
                 BufferedOutputStream bos = new BufferedOutputStream(fos);
                 CipherInputStream cis = new CipherInputStream(bis, cipher)) {

                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = cis.read(buffer)) != -1) {
                    bos.write(buffer, 0, bytesRead);
                }
            }
            logger.info("Successfully decrypted file: {} -> {}", source.getName(), destination.getName());
        } catch (Exception e) {
            logger.error("Failed to decrypt file: {} -> {}. Error: {}", source.getAbsolutePath(), destination.getAbsolutePath(), e.getMessage(), e);
            throw e;
        }
    }

    private byte[] deriveSalt(String password) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(password.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        byte[] salt = new byte[SALT_LENGTH_BYTE];
        System.arraycopy(hash, 0, salt, 0, SALT_LENGTH_BYTE);
        return salt;
    }

    private SecretKey deriveKey(String password, byte[] salt) throws Exception {
        KeyCacheKey cacheKey = new KeyCacheKey(password, salt);
        SecretKey cachedKey = KEY_CACHE.get(cacheKey);
        if (cachedKey != null) {
            logger.debug("PBKDF2 key cache hit");
            return cachedKey;
        }

        logger.debug("PBKDF2 key cache miss. Performing PBKDF2 key derivation (expensive)...");
        SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
        KeySpec spec = new PBEKeySpec(password.toCharArray(), salt, ITERATION_COUNT, KEY_LENGTH_BIT);
        SecretKey tmp = factory.generateSecret(spec);
        SecretKey derivedKey = new SecretKeySpec(tmp.getEncoded(), "AES");
        
        KEY_CACHE.put(cacheKey, derivedKey);
        logger.debug("Successfully derived and cached secret key");
        return derivedKey;
    }

    private static class KeyCacheKey {
        private final String password;
        private final byte[] salt;

        public KeyCacheKey(String password, byte[] salt) {
            this.password = password;
            this.salt = salt.clone();
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            KeyCacheKey that = (KeyCacheKey) o;
            return java.util.Objects.equals(password, that.password) &&
                    java.util.Arrays.equals(salt, that.salt);
        }

        @Override
        public int hashCode() {
            int result = java.util.Objects.hash(password);
            result = 31 * result + java.util.Arrays.hashCode(salt);
            return result;
        }
    }
}

