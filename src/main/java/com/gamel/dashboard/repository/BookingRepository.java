package com.gamel.dashboard.repository;

import com.gamel.dashboard.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, String> {
    List<Booking> findByUserId(String userId);
    List<Booking> findByConsoleId(String consoleId);
    List<Booking> findAllByOrderByCreatedAtDesc();
}

