package com.gamel.dashboard.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Entity
@Table(name = "console_rentals")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConsoleRental {
    @Id
    private String id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false)
    private String consoleType; // "ps5", "xboxSeries", "switch_", "arcade", "vr"
    
    @Column(nullable = false)
    private double dailyPrice;
    
    private boolean forRental = true;
    
    private boolean forSale = false;
    
    private double salePrice; // in FCFA
    
    private String itemCondition; // "Neuf", "Occasion", "Reconditionné"
    
    @Column(columnDefinition = "TEXT")
    private String description;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "rental_includes", joinColumns = @JoinColumn(name = "rental_id"))
    @Column(name = "item")
    private List<String> includes;
    
    private int availableUnits;
    
    private String status; // "available", "out_of_stock"
    
    private String imageUrl;
    
    private String accentColor;
}
