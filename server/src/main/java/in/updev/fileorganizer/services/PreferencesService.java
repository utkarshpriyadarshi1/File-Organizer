package in.updev.fileorganizer.services;

import java.io.File;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PreferencesService {
    private static final Logger logger = LoggerFactory.getLogger(PreferencesService.class);

    private final ObjectMapper objectMapper;
    private static final String PREF_DIR = System.getProperty("user.home") + "/AppData/Local/file-organizer";
    private static final String PREF_FILE = PREF_DIR + "/preferences.json";

    @Data
    public static class AppPreferences {
        private String folderLayoutPattern = "{fileType}/{yearMonth}";
    }

    private AppPreferences preferences = new AppPreferences();

    @PostConstruct
    public void init() {
        loadPreferences();
    }

    public synchronized AppPreferences getPreferences() {
        return preferences;
    }

    public synchronized void savePreferences(AppPreferences newPrefs) {
        if (newPrefs == null)
            return;
        this.preferences = newPrefs;
        try {
            File dir = new File(PREF_DIR);
            if (!dir.exists()) {
                dir.mkdirs();
            }
            File file = new File(PREF_FILE);
            objectMapper.writeValue(file, preferences);
            logger.info("Preferences successfully saved to: {}", PREF_FILE);
        } catch (Exception e) {
            logger.error("Failed to save preferences to file: {}", PREF_FILE, e);
        }
    }

    private void loadPreferences() {
        try {
            File file = new File(PREF_FILE);
            if (file.exists()) {
                this.preferences = objectMapper.readValue(file, AppPreferences.class);
                logger.info("Preferences loaded from: {}", PREF_FILE);
            } else {
                logger.info("No preferences.json found. Using default layout preference: {}",
                        preferences.getFolderLayoutPattern());
                // Save default preference immediately
                savePreferences(this.preferences);
            }
        } catch (Exception e) {
            logger.error("Failed to load preferences from file, resetting to defaults", e);
            this.preferences = new AppPreferences();
        }
    }
}
