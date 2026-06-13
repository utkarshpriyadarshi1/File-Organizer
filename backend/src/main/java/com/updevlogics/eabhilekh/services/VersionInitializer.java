package com.updevlogics.eabhilekh.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.updevlogics.eabhilekh.entities.RegisteredVersion;
import com.updevlogics.eabhilekh.repositories.RegisteredVersionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class VersionInitializer implements ApplicationRunner {
    private static final Logger logger = LoggerFactory.getLogger(VersionInitializer.class);

    private final RegisteredVersionRepository registeredVersionRepository;
    private final ObjectMapper objectMapper;

    @Override
    public void run(ApplicationArguments args) {
        logger.info("Checking current app version for registration...");
        try {
            ClassPathResource resource = new ClassPathResource("version.json");
            if (resource.exists()) {
                try (InputStream is = resource.getInputStream()) {
                    Map<String, Object> data = objectMapper.readValue(is, Map.class);
                    String version = (String) data.get("version");
                    if (version != null && !version.trim().isEmpty()) {
                        version = version.trim();
                        logger.info("Current app version detected: {}", version);

                        if (registeredVersionRepository.findByVersion(version).isEmpty()) {
                            RegisteredVersion registered = RegisteredVersion.builder()
                                    .version(version)
                                    .registeredAt(LocalDateTime.now())
                                    .build();
                            registeredVersionRepository.save(registered);
                            logger.info("Registered new app version: {} in SQLite database.", version);
                        } else {
                            logger.debug("App version {} already registered.", version);
                        }
                    }
                }
            } else {
                logger.warn("version.json not found in classpath. Skipping runtime version registration.");
            }
        } catch (Exception e) {
            logger.error("Failed to read or register app version on startup", e);
        }
    }
}
