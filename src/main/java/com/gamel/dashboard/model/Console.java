package com.gamel.dashboard.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "consoles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Console {
    @Id
    private String id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false)
    private String postNumber;
    
    @Column(nullable = false)
    private String type; // "ps5", "xboxSeries", "playStation", "arcade"
    
    @Column(nullable = false)
    private String status; // "available", "occupied", "broken"
    
    private String currentGameName;
    
    private LocalDateTime freeAt;
}
