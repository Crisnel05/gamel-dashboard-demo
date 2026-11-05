package com.gamel.dashboard.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "rental_transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RentalTransaction {
    @Id
    private String id;
    
    @Column(nullable = false)
    private String userId;
    
    private String userName;
    
    @Column(nullable = false)
    private String itemType; // "game" or "console"
    
    @Column(nullable = false)
    private String itemId;
    
    @Column(nullable = false)
    private String itemName;
    
    private double dailyPrice;
    
    private int rentalDays;
    
    private double totalAmount;
    
    @Column(nullable = false)
    private String paymentMethod; // "wave" or "orangeMoney"
    
    @Column(nullable = false)
    private String paymentStatus = "PAID_UPFRONT";
    
    private LocalDate startDate;
    
    private LocalDate endDate;
    
    private String deliveryAddress;
    
    private String status; // "confirmed", "active", "returned"
    
    private String validationCode;
    
    private LocalDateTime createdAt = LocalDateTime.now();
}
