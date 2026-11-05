package com.gamel.dashboard.config;

import com.gamel.dashboard.model.*;
import com.gamel.dashboard.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Fills the database with fictional data, only with the "demo" profile.
 * Every name, email and phone number below is made up.
 */
@Component
@Profile("demo")
public class DemoDataSeeder implements CommandLineRunner {

    private final UserRepository users;
    private final GameRepository games;
    private final ConsoleRepository consoles;
    private final ConsoleModelRepository consoleModels;
    private final ConsoleRentalRepository consoleRentals;
    private final BookingRepository bookings;
    private final EventRepository events;
    private final FinancialTransactionRepository transactions;
    private final RentalTransactionRepository rentalTransactions;
    private final SessionRepository sessions;
    private final NotificationRepository notifications;

    public DemoDataSeeder(UserRepository users, GameRepository games, ConsoleRepository consoles,
                          ConsoleModelRepository consoleModels, ConsoleRentalRepository consoleRentals,
                          BookingRepository bookings, EventRepository events,
                          FinancialTransactionRepository transactions,
                          RentalTransactionRepository rentalTransactions,
                          SessionRepository sessions, NotificationRepository notifications) {
        this.users = users;
        this.games = games;
        this.consoles = consoles;
        this.consoleModels = consoleModels;
        this.consoleRentals = consoleRentals;
        this.bookings = bookings;
        this.events = events;
        this.transactions = transactions;
        this.rentalTransactions = rentalTransactions;
        this.sessions = sessions;
        this.notifications = notifications;
    }

    @Override
    public void run(String... args) {
        if (users.count() > 0) {
            return;
        }
        LocalDateTime now = LocalDateTime.now().withSecond(0).withNano(0);

        // Players
        String[][] players = {
                {"p1", "Joueur Démo Alpha", "alpha@example.com", "4", "2350"},
                {"p2", "Joueur Démo Bravo", "bravo@example.com", "7", "6100"},
                {"p3", "Joueur Démo Charlie", "charlie@example.com", "2", "900"},
                {"p4", "Joueur Démo Delta", "delta@example.com", "5", "4200"},
                {"p5", "Joueur Démo Echo", "echo@example.com", "1", "150"},
        };
        for (int i = 0; i < players.length; i++) {
            String[] p = players[i];
            User u = new User();
            u.setId(p[0]);
            u.setName(p[1]);
            u.setEmail(p[2]);
            u.setPhone("00 00 00 0" + (i + 1));
            u.setRole("player");
            u.setLevel(Integer.parseInt(p[3]));
            u.setXp(Integer.parseInt(p[4]) % 1000);
            u.setMaxXp(1000);
            u.setBadges(new ArrayList<>(i % 2 == 0 ? List.of("Premier match") : List.of("Premier match", "Habitué")));
            u.setAvatarUrl("https://api.dicebear.com/7.x/bottts/svg?seed=" + p[0]);
            u.setCreatedAt(now.minusDays(30 - i * 5L));
            users.save(u);
        }

        // Console models
        String[][] models = {
                {"m1", "PlayStation 5", "Sony"},
                {"m2", "Xbox Series X", "Microsoft"},
                {"m3", "Borne Arcade", "Custom"},
        };
        for (String[] m : models) {
            ConsoleModel cm = new ConsoleModel();
            cm.setId(m[0]);
            cm.setName(m[1]);
            cm.setManufacturer(m[2]);
            cm.setDescription("Modèle de démonstration");
            consoleModels.save(cm);
        }

        // Consoles (gaming stations)
        String[][] stations = {
                {"c1", "PS5 #1", "Poste 1", "ps5", "occupied", "Jeu de foot"},
                {"c2", "PS5 #2", "Poste 2", "ps5", "available", null},
                {"c3", "Xbox #1", "Poste 3", "xboxSeries", "available", null},
                {"c4", "Arcade #1", "Poste 4", "arcade", "broken", null},
        };
        for (String[] s : stations) {
            Console c = new Console();
            c.setId(s[0]);
            c.setName(s[1]);
            c.setPostNumber(s[2]);
            c.setType(s[3]);
            c.setStatus(s[4]);
            c.setCurrentGameName(s[5]);
            if ("occupied".equals(s[4])) {
                c.setFreeAt(now.plusMinutes(45));
            }
            consoles.save(c);
        }

        // Games (generic titles)
        Object[][] gameRows = {
                {"g1", "Jeu de foot", "Sport", "ps5", "inUse", "#22c55e", 1500.0, 1},
                {"g2", "Jeu de course", "Course", "ps5", "available", "#ef4444", 1500.0, 2},
                {"g3", "Jeu de combat", "Combat", "xboxSeries", "available", "#f59e0b", 1000.0, 3},
                {"g4", "Jeu d'aventure", "Aventure", "ps5", "available", "#8b5cf6", 1000.0, 4},
                {"g5", "Jeu rétro", "Arcade", "arcade", "maintenance", "#06b6d4", 500.0, 5},
        };
        for (Object[] g : gameRows) {
            Game game = new Game();
            game.setId((String) g[0]);
            game.setName((String) g[1]);
            game.setGenre((String) g[2]);
            game.setConsole((String) g[3]);
            game.setStatus((String) g[4]);
            game.setAccentColor((String) g[5]);
            game.setPricePerHour((Double) g[6]);
            game.setDailyRentalPrice(2000);
            game.setPopularityRank((Integer) g[7]);
            game.setDescription("Jeu fictif pour la démonstration.");
            games.save(game);
        }

        // Rental catalogue
        ConsoleRental rental = new ConsoleRental();
        rental.setId("r1");
        rental.setName("Pack PS5 week-end");
        rental.setConsoleType("ps5");
        rental.setDailyPrice(10000);
        rental.setForRental(true);
        rental.setItemCondition("Occasion");
        rental.setDescription("Console + 2 manettes, idéal pour un week-end entre amis.");
        rental.setIncludes(new ArrayList<>(List.of("Console", "2 manettes", "Câble HDMI")));
        rental.setAvailableUnits(2);
        rental.setStatus("available");
        rental.setAccentColor("#3b82f6");
        consoleRentals.save(rental);

        // Bookings
        String[][] bookingRows = {
                {"b1", "p1", "g1", "c1", "active", "wave", "success"},
                {"b2", "p2", "g3", "c3", "confirmed", "orangeMoney", "success"},
                {"b3", "p3", "g2", "c2", "pending", "wave", "pending"},
                {"b4", "p4", "g4", "c2", "completed", "orangeMoney", "success"},
        };
        int hourOffset = 0;
        for (String[] b : bookingRows) {
            Booking bk = new Booking();
            bk.setId(b[0]);
            bk.setUserId(b[1]);
            bk.setUserName(users.findById(b[1]).map(User::getName).orElse(""));
            bk.setGameId(b[2]);
            bk.setGameName(games.findById(b[2]).map(Game::getName).orElse(""));
            bk.setConsoleId(b[3]);
            bk.setConsoleName(consoles.findById(b[3]).map(Console::getName).orElse(""));
            bk.setPosteName(consoles.findById(b[3]).map(Console::getPostNumber).orElse(""));
            bk.setStartTime(now.plusHours(hourOffset - 1));
            bk.setEndTime(now.plusHours(hourOffset + 1));
            bk.setTotalAmount(3000);
            bk.setStatus(b[4]);
            bk.setPaymentMethod(b[5]);
            bk.setPaymentStatus(b[6]);
            bk.setValidationCode("DEMO" + b[0].toUpperCase());
            bk.setCreatedAt(now.minusHours(3 - hourOffset));
            bookings.save(bk);
            hourOffset++;
        }

        // Event
        Event ev = new Event();
        ev.setId("e1");
        ev.setName("Tournoi démo du samedi");
        ev.setDescription("Tournoi fictif pour montrer la gestion des événements.");
        ev.setRules("Élimination directe, matchs de 6 minutes.");
        ev.setGameName("Jeu de foot");
        ev.setPlatform("ps5");
        ev.setDate(LocalDate.now().plusDays(3));
        ev.setStartTime(now.plusDays(3).withHour(15).withMinute(0));
        ev.setEndTime(now.plusDays(3).withHour(19).withMinute(0));
        ev.setEntryFee(2000);
        ev.setMaxParticipants(16);
        ev.setParticipantIds(new ArrayList<>(List.of("p1", "p2", "p4")));
        ev.setStatus("upcoming");
        ev.setColor("#22c55e");
        ev.setPrize("Un mois de sessions offert");
        ev.setEmoji("🏆");
        events.save(ev);

        // Finance
        Object[][] tx = {
                {"t1", "income", "Sessions & Postes", "Session PS5 - Poste 1", 3000.0, "Wave", 0},
                {"t2", "income", "Sessions & Postes", "Session Xbox - Poste 3", 2000.0, "Orange Money", 0},
                {"t3", "income", "Locations", "Location Pack PS5 (2 jours)", 20000.0, "Wave", 1},
                {"t4", "income", "Snacks & Boissons", "Boissons", 1500.0, "Espèces", 1},
                {"t5", "expense", "Charges & Électricité", "Facture électricité", 15000.0, "Espèces", 2},
                {"t6", "expense", "Maintenance & Matériel", "Manette de rechange", 8000.0, "Espèces", 4},
                {"t7", "income", "Tournois", "Inscriptions tournoi", 6000.0, "Orange Money", 5},
        };
        for (Object[] t : tx) {
            FinancialTransaction ft = new FinancialTransaction();
            ft.setId((String) t[0]);
            ft.setType((String) t[1]);
            ft.setCategory((String) t[2]);
            ft.setTitle((String) t[3]);
            ft.setAmount((Double) t[4]);
            ft.setPaymentMethod((String) t[5]);
            ft.setPerformedBy("Admin");
            ft.setCreatedAt(now.minusDays((Integer) t[6]));
            transactions.save(ft);
        }

        RentalTransaction rt = new RentalTransaction();
        rt.setId("rt1");
        rt.setUserId("p2");
        rt.setUserName("Joueur Démo Bravo");
        rt.setItemType("console");
        rt.setItemId("r1");
        rt.setItemName("Pack PS5 week-end");
        rt.setDailyPrice(10000);
        rt.setRentalDays(2);
        rt.setTotalAmount(20000);
        rt.setPaymentMethod("wave");
        rt.setStartDate(LocalDate.now().minusDays(1));
        rt.setEndDate(LocalDate.now().plusDays(1));
        rt.setDeliveryAddress("Adresse fictive");
        rt.setStatus("active");
        rt.setValidationCode("DEMORT1");
        rentalTransactions.save(rt);

        // Sessions (play history)
        for (int i = 0; i < 6; i++) {
            Session s = new Session();
            s.setId("s" + i);
            s.setDate(LocalDate.now().minusDays(i));
            s.setStartTime(now.minusDays(i).withHour(14).withMinute(0));
            s.setEndTime(now.minusDays(i).withHour(16).withMinute(0));
            s.setGameName(i % 2 == 0 ? "Jeu de foot" : "Jeu de course");
            s.setGameGenre(i % 2 == 0 ? "Sport" : "Course");
            s.setConsole("ps5");
            s.setPosteName("Poste " + (i % 2 + 1));
            s.setAmount(3000);
            s.setAccentColor(i % 2 == 0 ? "#22c55e" : "#ef4444");
            sessions.save(s);
        }

        // Notifications
        Notification n = new Notification();
        n.setId("n1");
        n.setTitle("Nouvelle réservation");
        n.setMessage("Joueur Démo Charlie a réservé le Poste 2.");
        n.setType("booking");
        n.setRead(false);
        notifications.save(n);
    }
}
