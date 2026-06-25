package in.updev.fileorganizer.config;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Converter(autoApply = false)
public class LocalDateTimeTextConverter implements AttributeConverter<LocalDateTime, String> {

    @Override
    public String convertToDatabaseColumn(LocalDateTime locDateTime) {
        if (locDateTime == null) {
            return null;
        }
        return locDateTime.toString();
    }

    @Override
    public LocalDateTime convertToEntityAttribute(String sqlTimestamp) {
        if (sqlTimestamp == null || sqlTimestamp.trim().isEmpty()) {
            return null;
        }
        sqlTimestamp = sqlTimestamp.trim();
        try {
            // Check if it's a numeric timestamp in milliseconds (e.g. 1782241164019)
            if (sqlTimestamp.matches("\\d+")) {
                long epochMilli = Long.parseLong(sqlTimestamp);
                return LocalDateTime.ofInstant(Instant.ofEpochMilli(epochMilli), ZoneId.systemDefault());
            }
            // Otherwise try parsing as ISO LocalDateTime (e.g. 2026-06-24T00:45:19.875943)
            return LocalDateTime.parse(sqlTimestamp);
        } catch (Exception e) {
            try {
                // Try parsing as ISO OffsetDateTime
                return java.time.OffsetDateTime.parse(sqlTimestamp).toLocalDateTime();
            } catch (Exception ex) {
                try {
                    // Try parsing with space instead of T (standard JDBC format)
                    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss[.SSS]");
                    return LocalDateTime.parse(sqlTimestamp, formatter);
                } catch (Exception ex2) {
                    return null;
                }
            }
        }
    }
}
