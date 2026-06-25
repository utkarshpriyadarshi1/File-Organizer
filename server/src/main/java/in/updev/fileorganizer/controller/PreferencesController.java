package in.updev.fileorganizer.controller;

import in.updev.fileorganizer.services.PreferencesService;
import in.updev.fileorganizer.services.PreferencesService.AppPreferences;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/preferences")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PreferencesController {
    private static final Logger logger = LoggerFactory.getLogger(PreferencesController.class);

    private final PreferencesService preferencesService;

    @GetMapping
    public AppPreferences getPreferences() {
        logger.info("Request received to fetch app preferences");
        return preferencesService.getPreferences();
    }

    @PostMapping
    public AppPreferences savePreferences(@RequestBody AppPreferences preferences) {
        logger.info("Request received to update app preferences: LayoutPattern={}", 
                preferences.getFolderLayoutPattern());
        preferencesService.savePreferences(preferences);
        return preferencesService.getPreferences();
    }
}
