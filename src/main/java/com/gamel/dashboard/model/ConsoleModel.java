package com.gamel.dashboard.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "console_models")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConsoleModel {
    @Id
    private String id;

    @Column(nullable = false, unique = true)
    private String name; // e.g. "PlayStation 5", "Xbox Series X", "Switch OLED", "PC Gamer RTX"

    private String manufacturer; // e.g. "Sony", "Microsoft", "Nintendo", "Custom"

    private String description;

    private LocalDateTime createdAt = LocalDateTime.now();
}
