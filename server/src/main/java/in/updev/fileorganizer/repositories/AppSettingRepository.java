package in.updev.fileorganizer.repositories;

import in.updev.fileorganizer.entities.AppSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AppSettingRepository extends JpaRepository<AppSetting, Long> {
    Optional<AppSetting> findByKey(String key);
}
