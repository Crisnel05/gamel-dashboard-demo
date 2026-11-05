package com.gamel.dashboard.repository;

import com.gamel.dashboard.model.ConsoleRental;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConsoleRentalRepository extends JpaRepository<ConsoleRental, String> {
}
