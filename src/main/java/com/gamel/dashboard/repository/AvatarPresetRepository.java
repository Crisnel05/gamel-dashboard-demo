package com.gamel.dashboard.repository;

import com.gamel.dashboard.model.AvatarPreset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AvatarPresetRepository extends JpaRepository<AvatarPreset, String> {
    List<AvatarPreset> findByCategory(String category);
}
