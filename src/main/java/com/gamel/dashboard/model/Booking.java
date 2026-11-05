package com.gamel.dashboard.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Booking {
    @Id
    private String id;
    
    @Column(nullable = false)
    private String userId;
    
    private String userName;
    
    @Column(nullable = false)
    private String gameId;
    
    private String gameName;
    
    @Column(nullable = false)
    private String consoleId;
    
    private String consoleName;
    
    private String posteName;
    
    @Column(nullable = false)
    private LocalDateTime startTime;
    
    @Column(nullable = false)
    private LocalDateTime endTime;
    
    private double totalAmount;
    
    @Column(nullable = false)
    private String status; // "pending", "confirmed", "active", "completed", "cancelled"
    
    private String paymentMethod; // "orangeMoney", "wave"
    
    private String paymentStatus; // "pending", "success", "failed"
    
    private String validationCode;
    
    private LocalDateTime createdAt = LocalDateTime.now();
}
