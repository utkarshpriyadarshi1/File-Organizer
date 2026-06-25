package in.updev.fileorganizer.entities;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;

@Entity
@Table(name = "ignore_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IgnoreRule implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, columnDefinition = "TEXT")
    private String pattern;
}
