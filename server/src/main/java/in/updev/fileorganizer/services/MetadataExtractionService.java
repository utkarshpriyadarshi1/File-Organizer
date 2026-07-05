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
            dbFile = new DbFile();
            dbFile.setPath(path);
            dbFile.setName(actualFile.getName());
            dbFile.setSize(actualFile.length());
            dbFile.setCreatedAt(java.time.LocalDateTime.now());
            dbFile = dbFileRepository.save(dbFile);
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
                        
                        // We can append this to the file's description
                        descriptionBuilder.append(metadataKey).append(": ").append(desc).append("\n");

                        // We can also create a tag for important metadata like Year or Artist
                        if (tagName.equalsIgnoreCase("Expected File Name Extension") || 
                            tagName.equalsIgnoreCase("Detected File Type Name")) {
                            continue;
                        }
                        
                        // E.g., tagging by Year
                        if (tagName.equalsIgnoreCase("Date/Time Original") || tagName.equalsIgnoreCase("Year")) {
                            if (desc.length() >= 4) {
                                String year = desc.substring(0, 4);
                                addTagToFile(dbFile, "Year: " + year);
                            }
                        }

                        // E.g., Audio Artist
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

            return dbFileRepository.save(dbFile);

        } catch (Exception e) {
            logger.warn("Could not extract metadata for file {}: {}", actualFile.getName(), e.getMessage());
            throw new RuntimeException("Failed to extract metadata: " + e.getMessage());
        }
    }

    private void addTagToFile(DbFile dbFile, String tagName) {
        Optional<in.updev.fileorganizer.entities.Tag> existingTag = tagRepository.findByName(tagName);
        in.updev.fileorganizer.entities.Tag tagToSave;
        if (existingTag.isPresent()) {
            tagToSave = existingTag.get();
        } else {
            in.updev.fileorganizer.entities.Tag newTag = new in.updev.fileorganizer.entities.Tag();
            newTag.setName(tagName);
            tagToSave = tagRepository.save(newTag);
        }
        dbFile.getTags().add(tagToSave);
    }
}
