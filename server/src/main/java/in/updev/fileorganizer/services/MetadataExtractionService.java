package in.updev.fileorganizer.services;

import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.Directory;
import com.drew.metadata.Metadata;
import com.drew.metadata.Tag;
import in.updev.fileorganizer.entities.DbFile;
import in.updev.fileorganizer.repositories.DbFileRepository;
import in.updev.fileorganizer.repositories.TagRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MetadataExtractionService {
    private static final Logger logger = LoggerFactory.getLogger(MetadataExtractionService.class);

    private final DbFileRepository dbFileRepository;
    private final TagRepository tagRepository;
    private final SqliteWriteQueueService sqliteWriteQueueService;

    public DbFile extractAndSaveMetadata(Long fileId) {
        Optional<DbFile> optDbFile = dbFileRepository.findById(fileId);
        if (optDbFile.isEmpty()) {
            throw new IllegalArgumentException("File not found with ID: " + fileId);
        }
        return processExtraction(optDbFile.get());
    }

    public DbFile extractAndSaveMetadataByPath(String path) {
        Optional<DbFile> optDbFile = dbFileRepository.findByPath(path);
        DbFile dbFile;
        if (optDbFile.isEmpty()) {
            File actualFile = new File(path);
            if (!actualFile.exists()) {
                throw new IllegalArgumentException("Physical file not found: " + path);
            }
            DbFile newFile = new DbFile();
            newFile.setPath(path);
            newFile.setName(actualFile.getName());
            newFile.setSize(actualFile.length());
            newFile.setCreatedAt(java.time.LocalDateTime.now());
            try {
                dbFile = sqliteWriteQueueService.executeWrite(() -> dbFileRepository.save(newFile));
            } catch (Exception e) {
                logger.error("Failed to save new file entry for metadata extraction: {}", path, e);
                dbFile = newFile;
            }
        } else {
            dbFile = optDbFile.get();
        }
        return processExtraction(dbFile);
    }

    private DbFile processExtraction(DbFile dbFile) {
        File actualFile = new File(dbFile.getPath());

        if (!actualFile.exists()) {
            throw new IllegalArgumentException("Physical file not found: " + dbFile.getPath());
        }

        try {
            Metadata metadata = ImageMetadataReader.readMetadata(actualFile);
            StringBuilder descriptionBuilder = new StringBuilder();
            
            for (Directory directory : metadata.getDirectories()) {
                for (Tag tag : directory.getTags()) {
                    String tagName = tag.getTagName();
                    String desc = tag.getDescription();
                    
                    if (desc != null && !desc.trim().isEmpty()) {
                        String metadataKey = directory.getName() + " - " + tagName;
                        
                        descriptionBuilder.append(metadataKey).append(": ").append(desc).append("\n");

                        if (tagName.equalsIgnoreCase("Expected File Name Extension") || 
                            tagName.equalsIgnoreCase("Detected File Type Name")) {
                            continue;
                        }
                        
                        if (tagName.equalsIgnoreCase("Date/Time Original") || tagName.equalsIgnoreCase("Year")) {
                            if (desc.length() >= 4) {
                                String year = desc.substring(0, 4);
                                addTagToFile(dbFile, "Year: " + year);
                            }
                        }

                        if (tagName.equalsIgnoreCase("Artist") || tagName.equalsIgnoreCase("Lead performer(s)/Soloist(s)")) {
                            addTagToFile(dbFile, "Artist: " + desc);
                        }
                    }
                }
            }
            
            if (dbFile.getDescription() == null || dbFile.getDescription().isEmpty()) {
                dbFile.setDescription(descriptionBuilder.toString());
            } else {
                dbFile.setDescription(dbFile.getDescription() + "\n" + descriptionBuilder.toString());
            }

            return sqliteWriteQueueService.executeWrite(() -> dbFileRepository.save(dbFile));

        } catch (Exception e) {
            logger.warn("Could not extract metadata for file {}: {}", actualFile.getName(), e.getMessage());
            throw new RuntimeException("Failed to extract metadata: " + e.getMessage(), e);
        }
    }

    private void addTagToFile(DbFile dbFile, String tagName) {
        try {
            Optional<in.updev.fileorganizer.entities.Tag> existingTag = tagRepository.findByName(tagName);
            in.updev.fileorganizer.entities.Tag tagToSave;
            if (existingTag.isPresent()) {
                tagToSave = existingTag.get();
            } else {
                in.updev.fileorganizer.entities.Tag newTag = new in.updev.fileorganizer.entities.Tag();
                newTag.setName(tagName);
                tagToSave = sqliteWriteQueueService.executeWrite(() -> tagRepository.save(newTag));
            }
            dbFile.getTags().add(tagToSave);
        } catch (Exception e) {
            logger.error("Failed to add tag to file: {}", tagName, e);
        }
    }
}
