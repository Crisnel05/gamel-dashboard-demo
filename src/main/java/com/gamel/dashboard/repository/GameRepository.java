package com.gamel.dashboard.repository;

import com.gamel.dashboard.model.Game;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface GameRepository extends JpaRepository<Game, String> {
    List<Game> findAllByOrderByPopularityRankAsc();
    List<Game> findByConsole(String console);
    List<Game> findByGenre(String genre);
}

