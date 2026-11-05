package com.gamel.dashboard.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * DataSeeder - Désactivé pour la production et pour éviter
 * la réinjection d'utilisateurs factices si la base est vide.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    @Override
    public void run(String... args) {
        // Le contenu a été commenté/désactivé pour empêcher l'écrasement
        // ou la réinjection automatique de données mockées lors des démarrages.
    }
}
