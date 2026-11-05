package com.gamel.dashboard.repository;

import com.gamel.dashboard.model.ConsoleModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConsoleModelRepository extends JpaRepository<ConsoleModel, String> {
}
