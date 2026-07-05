package in.updev.fileorganizer.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class SearchRequest {
    private String keyword;
    private Long minSize;
    private Long maxSize;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private List<String> tags;
}
