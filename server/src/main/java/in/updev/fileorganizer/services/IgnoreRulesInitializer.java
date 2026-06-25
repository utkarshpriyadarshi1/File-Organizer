package in.updev.fileorganizer.services;

import in.updev.fileorganizer.entities.IgnoreRule;
import in.updev.fileorganizer.repositories.IgnoreRuleRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
public class IgnoreRulesInitializer implements ApplicationRunner {
    private static final Logger logger = LoggerFactory.getLogger(IgnoreRulesInitializer.class);

    private final IgnoreRuleRepository ignoreRuleRepository;

    @Override
    public void run(ApplicationArguments args) {
        logger.info("Checking default ignore patterns seeding...");
        if (ignoreRuleRepository.count() == 0) {
            logger.info("No ignore patterns found. Seeding database with default patterns.");
            List<String> defaults = Arrays.asList(
                    "node_modules",
                    ".git",
                    ".idea",
                    "target",
                    "build",
                    ".DS_Store"
            );
            for (String pattern : defaults) {
                ignoreRuleRepository.save(IgnoreRule.builder().pattern(pattern).build());
            }
            logger.info("Successfully seeded {} default ignore rules.", defaults.size());
        } else {
            logger.debug("Ignore patterns already populated in local SQLite database.");
        }
    }
}
