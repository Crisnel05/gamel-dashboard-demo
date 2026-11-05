package com.gamel.dashboard.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "avatar_presets")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AvatarPreset {
    @Id
    private String id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false)
    private String category; // "Portraits", "Gaming", "Cyberpunk", "Anime", "Robots"
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String imageUrl;
}
