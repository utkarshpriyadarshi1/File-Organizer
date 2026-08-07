package in.updev.fileorganizer.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PatternGroupDto {
    private String name;
    private boolean isDefault;
    private List<CategoryConfigDto> categories;
}
