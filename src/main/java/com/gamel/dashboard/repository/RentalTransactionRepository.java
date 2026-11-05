package com.gamel.dashboard.repository;

import com.gamel.dashboard.model.RentalTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RentalTransactionRepository extends JpaRepository<RentalTransaction, String> {
    List<RentalTransaction> findByUserId(String userId);
    List<RentalTransaction> findAllByOrderByCreatedAtDesc();
}

