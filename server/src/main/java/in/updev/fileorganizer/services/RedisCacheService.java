package in.updev.fileorganizer.services;

import in.updev.fileorganizer.entities.DbFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RedisCacheService {
    private static final Logger logger = LoggerFactory.getLogger(RedisCacheService.class);
    private static final int MAX_FILE_CACHE_ENTRIES = 50000;
    
    // In-memory cache storage replacing Redis with bounded size protection
    private final Map<Long, Map<String, String>> fileCache = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> hashCache = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> tagCache = new ConcurrentHashMap<>();

    public void cacheFile(DbFile file) {
        if (file == null || file.getId() == null) return;
        try {
            // Memory guard: prevent unbounded heap inflation
            if (fileCache.size() >= MAX_FILE_CACHE_ENTRIES) {
                logger.info("Cache entry limit reached ({}), clearing half of the in-memory cache", MAX_FILE_CACHE_ENTRIES);
                int removed = 0;
                var iterator = fileCache.keySet().iterator();
                while (iterator.hasNext() && removed < MAX_FILE_CACHE_ENTRIES / 2) {
                    iterator.next();
                    iterator.remove();
                    removed++;
                }
            }

            Map<String, String> fileData = new ConcurrentHashMap<>();
            fileData.put("id", String.valueOf(file.getId()));
            fileData.put("path", file.getPath() != null ? file.getPath() : "");
            fileData.put("name", file.getName() != null ? file.getName() : "");
            fileData.put("size", String.valueOf(file.getSize()));
            fileData.put("type", file.getType() != null ? file.getType() : "");
            
            fileCache.put(file.getId(), fileData);
            logger.debug("Cached file ID locally: {}", file.getId());
            
            try {
                if (file.getTags() != null) {
                    for (var tag : file.getTags()) {
                        cacheFileTag(tag.getName(), file.getId());
                    }
                }
            } catch (Exception ex) {
                // Ignore lazy initialization if outside transactional persistence session
            }
        } catch (Exception e) {
            logger.warn("In-memory operation failed. Caching skipped for file ID: {}. Error: {}", file.getId(), e.getMessage());
        }
    }

    public void cacheFileHash(String hash, Long fileId) {
        if (hash == null || fileId == null) return;
        try {
            hashCache.computeIfAbsent(hash, k -> ConcurrentHashMap.newKeySet())
                     .add(String.valueOf(fileId));
            logger.debug("Cached hash locally: {} -> {}", hash, fileId);
        } catch (Exception e) {
            logger.warn("In-memory operation failed. Caching hash failed. Error: {}", e.getMessage());
        }
    }

    public void cacheFileTag(String tagName, Long fileId) {
        if (tagName == null || fileId == null) return;
        try {
            tagCache.computeIfAbsent(tagName, k -> ConcurrentHashMap.newKeySet())
                    .add(String.valueOf(fileId));
            logger.debug("Cached tag locally: {} -> {}", tagName, fileId);
        } catch (Exception e) {
            logger.warn("In-memory operation failed. Caching tag failed. Error: {}", e.getMessage());
        }
    }

    public Set<String> getFilesByHash(String hash) {
        if (hash == null) return Set.of();
        Set<String> files = hashCache.get(hash);
        return files != null ? Set.copyOf(files) : Set.of();
    }

    public Set<String> getFilesByTag(String tagName) {
        if (tagName == null) return Set.of();
        Set<String> files = tagCache.get(tagName);
        return files != null ? Set.copyOf(files) : Set.of();
    }
    
    public void deleteFileCache(Long fileId) {
        if (fileId == null) return;
        try {
            fileCache.remove(fileId);
            String fileIdStr = String.valueOf(fileId);
            hashCache.values().forEach(set -> set.remove(fileIdStr));
            tagCache.values().forEach(set -> set.remove(fileIdStr));
            logger.debug("Deleted file cache locally for ID: {}", fileId);
        } catch (Exception e) {
            logger.warn("In-memory delete operation failed for file ID: {}. Error: {}", fileId, e.getMessage());
        }
    }

    public void clearCache() {
        try {
            fileCache.clear();
            hashCache.clear();
            tagCache.clear();
            logger.info("Cleared in-memory caches successfully.");
        } catch (Exception e) {
            logger.warn("Failed to clear in-memory caches. Error: {}", e.getMessage());
        }
    }
}
