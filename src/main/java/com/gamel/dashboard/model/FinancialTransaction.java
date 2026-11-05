package com.gamel.dashboard.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "financial_transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FinancialTransaction {
    @Id
    private String id;
    
    @Column(nullable = false)
    private String type; // "income", "expense"
    
    @Column(nullable = false)
    private String category; // "Sessions & Postes", "Locations", "Ventes Boutique", "Tournois", "Maintenance & Matériel", "Charges & Électricité", "Snacks & Boissons", "Autre"
    
    @Column(nullable = false)
    private String title;
    
    @Column(nullable = false)
    private Double amount;
    
    private String paymentMethod; // "Wave", "Orange Money", "Espèces", "Carte Bancaire", "Virement"
    
    private String referenceId; // Associated ID (booking, rental, etc.)
    
    private String performedBy = "Admin";
    
    @Column(columnDefinition = "TEXT")
    private String notes;
    
    private LocalDateTime createdAt = LocalDateTime.now();
}
