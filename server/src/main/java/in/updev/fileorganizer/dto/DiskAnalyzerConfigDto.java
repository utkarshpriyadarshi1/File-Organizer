package in.updev.fileorganizer.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DiskAnalyzerConfigDto {
    private List<CategoryConfigDto> categories;
}
