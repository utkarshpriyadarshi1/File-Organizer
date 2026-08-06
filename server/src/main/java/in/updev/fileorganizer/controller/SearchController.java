package in.updev.fileorganizer.controller;

import in.updev.fileorganizer.dto.SearchRequest;
import in.updev.fileorganizer.entities.DbFile;
import in.updev.fileorganizer.entities.Tag;
import in.updev.fileorganizer.repositories.DbFileRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final DbFileRepository dbFileRepository;

    @PostMapping
    public ResponseEntity<Page<DbFile>> searchFiles(
            @RequestBody SearchRequest request,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        
        Specification<DbFile> spec = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            if (request.getKeyword() != null && !request.getKeyword().trim().isEmpty()) {
                String likePattern = "%" + request.getKeyword().toLowerCase() + "%";
                Predicate namePredicate = criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), likePattern);
                Predicate titlePredicate = criteriaBuilder.like(criteriaBuilder.lower(root.get("title")), likePattern);
                Predicate descPredicate = criteriaBuilder.like(criteriaBuilder.lower(root.get("description")), likePattern);
                predicates.add(criteriaBuilder.or(namePredicate, titlePredicate, descPredicate));
            }

            if (request.getMinSize() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("size"), request.getMinSize()));
            }

            if (request.getMaxSize() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("size"), request.getMaxSize()));
            }

            if (request.getStartDate() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), request.getStartDate()));
            }

            if (request.getEndDate() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("createdAt"), request.getEndDate()));
            }

            if (request.getTags() != null && !request.getTags().isEmpty()) {
                Join<DbFile, Tag> tagsJoin = root.join("tags");
                predicates.add(tagsJoin.get("name").in(request.getTags()));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };

        Pageable pageable = PageRequest.of(page, size);
        Page<DbFile> result = dbFileRepository.findAll(spec, pageable);
        
        return ResponseEntity.ok(result);
    }
}
