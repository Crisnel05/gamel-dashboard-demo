package com.gamel.dashboard.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "games")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Game {
    @Id
    private String id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false)
    private String genre;
    
    @Column(nullable = false)
    private String console; // "ps5", "xboxSeries", "playStation", "arcade"
    
    @Column(nullable = false)
    private String status; // "available", "inUse", "maintenance"
    
    private String accentColor;
    
    private double pricePerHour;

    private double dailyRentalPrice; // in FCFA
    
    private boolean availableForRental = true;
    
    private boolean availableForSale = false;
    
    private double salePrice; // in FCFA
    
    private int saleStock = 0;
    
    private int popularityRank;
    
    private LocalDateTime busyUntil;
    
    @Column(columnDefinition = "TEXT")
    private String description;
}
