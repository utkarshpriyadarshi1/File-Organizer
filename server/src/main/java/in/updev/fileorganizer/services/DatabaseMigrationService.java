package in.updev.fileorganizer.services;

import java.io.File;
import java.nio.file.Files;
import java.util.Arrays;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class DatabaseMigrationService implements ApplicationRunner {
    private static final Logger logger = LoggerFactory.getLogger(DatabaseMigrationService.class);

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        logger.info("Initializing dynamic database schema migration check...");
        try {
            // Find schema.sql from local project structure (development or root execution)
            File schemaFile = new File("../database/schema.sql");
            if (!schemaFile.exists()) {
                schemaFile = new File("database/schema.sql");
            }

            if (!schemaFile.exists()) {
                logger.warn("schema.sql not found at standard paths. Dynamic schema sync skipped.");
                return;
            }

            logger.info("Found schema file at: {}", schemaFile.getAbsolutePath());
            String sqlContent = Files.readString(schemaFile.toPath());

            // Clean content: remove SQL comments and split by semi-colons
            String[] rawStatements = sqlContent.split(";");
            int executedCount = 0;
            int skippedCount = 0;

            for (String rawStatement : rawStatements) {
                String sql = cleanSql(rawStatement);
                if (sql.isEmpty()) {
                    continue;
                }

                try {
                    jdbcTemplate.execute(sql);
                    executedCount++;
                } catch (Exception e) {
                    String msg = e.getMessage().toLowerCase();
                    if (msg.contains("already exists") || msg.contains("duplicate")) {
                        skippedCount++;
                        logger.debug("Database element already exists, skipping statement: {}", sql);
                    } else {
                        logger.error("Failed to execute migration statement: {}", sql, e);
                    }
                }
            }

            logger.info("Database schema migration completed. Executed {} statements, skipped {} (already existing).",
                    executedCount, skippedCount);

        } catch (Exception e) {
            logger.error("Error occurred during database schema migration", e);
        }
    }

    private String cleanSql(String sql) {
        if (sql == null)
            return "";
        return Arrays.stream(sql.split("\n"))
                .map(line -> {
                    int commentIdx = line.indexOf("--");
                    if (commentIdx >= 0) {
                        return line.substring(0, commentIdx);
                    }
                    return line;
                })
                .map(String::trim)
                .filter(line -> !line.isEmpty())
                .reduce((a, b) -> a + " " + b)
                .orElse("")
                .trim();
    }
}
