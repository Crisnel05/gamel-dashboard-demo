package com.gamel.dashboard.repository;

import com.gamel.dashboard.model.Console;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConsoleRepository extends JpaRepository<Console, String> {
}
