package com.gamel.dashboard.repository;

import com.gamel.dashboard.model.FinancialTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FinancialTransactionRepository extends JpaRepository<FinancialTransaction, String> {
    List<FinancialTransaction> findAllByOrderByCreatedAtDesc();
    List<FinancialTransaction> findByTypeOrderByCreatedAtDesc(String type);
}
