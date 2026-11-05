package com.gamel.dashboard.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    private String id;
    
    @Column(nullable = false)
    private String phone;
    
    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false, unique = true)
    private String email;
    
    private String pin;
    
    @Column(columnDefinition = "TEXT")
    private String avatarUrl;
    
    private LocalDate birthDate;
    
    @Column(nullable = false)
    private String role; // "player", "admin"
    
    private Integer level = 1;
    private Integer xp = 0;
    private Integer maxXp = 1000;
    
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_badges", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "badge")
    private List<String> badges;
    
    private LocalDateTime createdAt = LocalDateTime.now();
}
