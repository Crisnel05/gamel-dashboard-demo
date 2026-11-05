package com.gamel.dashboard.repository;

import com.gamel.dashboard.model.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, String> {
    List<Event> findByStatus(String status);
    List<Event> findByPlatform(String platform);
    List<Event> findByStatusAndPlatform(String status, String platform);
}
