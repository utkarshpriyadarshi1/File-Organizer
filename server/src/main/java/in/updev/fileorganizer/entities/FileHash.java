package in.updev.fileorganizer.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "file_hashes", indexes = {
    @Index(name = "idx_filehash_hash", columnList = "hash")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileHash {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "file_id", nullable = false)
    private DbFile file;

    @Column(nullable = false, length = 64)
    private String hash;

    @Column(name = "hash_type", nullable = false, columnDefinition = "TEXT")
    private String hashType;

    @Column(name = "indexed_at", nullable = false)
    @Builder.Default
    private LocalDateTime indexedAt = LocalDateTime.now();
}
