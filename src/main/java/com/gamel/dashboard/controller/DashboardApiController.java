package com.gamel.dashboard.controller;

import com.gamel.dashboard.model.*;
import com.gamel.dashboard.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardApiController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private ConsoleRepository consoleRepository;

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private ConsoleRentalRepository consoleRentalRepository;

    @Autowired
    private RentalTransactionRepository rentalTransactionRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private ConsoleModelRepository consoleModelRepository;

    @Autowired
    private AvatarPresetRepository avatarPresetRepository;

    @Autowired
    private FinancialTransactionRepository financialTransactionRepository;

    // ==========================================
    // 1. OVERVIEW STATISTICS & GLOBAL SEARCH
    // ==========================================

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();

        List<Booking> bookings = bookingRepository.findAll();
        List<RentalTransaction> transactions = rentalTransactionRepository.findAll();
        List<User> users = userRepository.findAll();
        List<Console> consoles = consoleRepository.findAll();
        List<Event> events = eventRepository.findAll();
        List<Game> games = gameRepository.findAll();
        List<ConsoleRental> rentalPacks = consoleRentalRepository.findAll();

        // Calculate Total Revenue
        double bookingsRevenue = bookings.stream()
                .filter(b -> "confirmed".equalsIgnoreCase(b.getStatus()) || 
                             "active".equalsIgnoreCase(b.getStatus()) || 
                             "completed".equalsIgnoreCase(b.getStatus()))
                .mapToDouble(Booking::getTotalAmount)
                .sum();

        double transactionsRevenue = transactions.stream()
                .filter(t -> "confirmed".equalsIgnoreCase(t.getStatus()) || 
                             "active".equalsIgnoreCase(t.getStatus()) || 
                             "returned".equalsIgnoreCase(t.getStatus()))
                .mapToDouble(RentalTransaction::getTotalAmount)
                .sum();

        double totalRevenue = bookingsRevenue + transactionsRevenue;

        // Active players
        long activePlayers = users.stream()
                .filter(u -> "player".equalsIgnoreCase(u.getRole()))
                .count();

        // Console capacities
        long totalConsoles = consoles.size();
        long busyConsoles = consoles.stream()
                .filter(c -> "occupied".equalsIgnoreCase(c.getStatus()) || "busy".equalsIgnoreCase(c.getStatus()))
                .count();

        // Total Bookings count
        long totalBookingsCount = bookings.size();

        // Active Tournaments
        long activeTournaments = events.stream()
                .filter(e -> "ongoing".equalsIgnoreCase(e.getStatus()) || "upcoming".equalsIgnoreCase(e.getStatus()))
                .count();

        // Total Games & Rental packs
        long totalGames = games.size();
        long totalRentalPacks = rentalPacks.size();

        // Notifications count
        long unreadNotifications = notificationRepository.findAll().stream()
                .filter(n -> !n.isRead())
                .count();

        stats.put("totalRevenue", totalRevenue);
        stats.put("activePlayers", activePlayers);
        stats.put("busyConsoles", busyConsoles);
        stats.put("totalConsoles", totalConsoles);
        stats.put("totalBookings", totalBookingsCount);
        stats.put("activeTournaments", activeTournaments);
        stats.put("totalEvents", events.size());
        stats.put("totalGames", totalGames);
        stats.put("totalRentalPacks", totalRentalPacks);
        stats.put("unreadNotifications", unreadNotifications);

        // Recent Bookings (limit 8)
        List<Booking> recentBookings = bookings.stream()
                .sorted(Comparator.comparing(Booking::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(8)
                .collect(Collectors.toList());
        stats.put("recentBookings", recentBookings);

        // Recent Tournaments (limit 4)
        List<Event> recentEvents = events.stream()
                .sorted(Comparator.comparing(Event::getDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(4)
                .collect(Collectors.toList());
        stats.put("recentEvents", recentEvents);

        // Console Usage Breakdown by Type
        Map<String, Map<String, Long>> consoleUsage = new HashMap<>();
        for (Console c : consoles) {
            String type = (c.getType() != null ? c.getType() : "AUTRE").toUpperCase();
            consoleUsage.putIfAbsent(type, new HashMap<>());
            Map<String, Long> subMap = consoleUsage.get(type);
            subMap.put("total", subMap.getOrDefault("total", 0L) + 1);
            if ("occupied".equalsIgnoreCase(c.getStatus()) || "busy".equalsIgnoreCase(c.getStatus())) {
                subMap.put("busy", subMap.getOrDefault("busy", 0L) + 1);
            } else {
                subMap.put("busy", subMap.getOrDefault("busy", 0L));
            }
        }
        stats.put("consoleUsage", consoleUsage);

        // Weekly Revenue Chart Data (Last 7 Days)
        List<Map<String, Object>> weeklyRevenueData = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd");
        for (int i = 6; i >= 0; i--) {
            LocalDate targetDate = LocalDate.now().minusDays(i);
            String label = targetDate.format(formatter);
            
            double dailyBookings = bookings.stream()
                    .filter(b -> b.getCreatedAt() != null && b.getCreatedAt().toLocalDate().isEqual(targetDate))
                    .filter(b -> "confirmed".equalsIgnoreCase(b.getStatus()) || 
                                 "active".equalsIgnoreCase(b.getStatus()) || 
                                 "completed".equalsIgnoreCase(b.getStatus()))
                    .mapToDouble(Booking::getTotalAmount)
                    .sum();

            double dailyTransactions = transactions.stream()
                    .filter(t -> t.getCreatedAt() != null && t.getCreatedAt().toLocalDate().isEqual(targetDate))
                    .filter(t -> "confirmed".equalsIgnoreCase(t.getStatus()) || 
                                 "active".equalsIgnoreCase(t.getStatus()) || 
                                 "returned".equalsIgnoreCase(t.getStatus()))
                    .mapToDouble(RentalTransaction::getTotalAmount)
                    .sum();

            Map<String, Object> dayData = new HashMap<>();
            dayData.put("label", label);
            dayData.put("value", dailyBookings + dailyTransactions);
            weeklyRevenueData.add(dayData);
        }
        stats.put("weeklyRevenue", weeklyRevenueData);

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> globalSearch(@RequestParam("q") String query) {
        Map<String, Object> results = new HashMap<>();
        if (query == null || query.trim().length() < 2) {
            return ResponseEntity.ok(results);
        }
        String q = query.trim().toLowerCase();

        // Search players
        List<User> matchedPlayers = userRepository.findAll().stream()
                .filter(u -> (u.getName() != null && u.getName().toLowerCase().contains(q)) ||
                             (u.getEmail() != null && u.getEmail().toLowerCase().contains(q)) ||
                             (u.getPhone() != null && u.getPhone().toLowerCase().contains(q)))
                .limit(5)
                .collect(Collectors.toList());

        // Search games
        List<Game> matchedGames = gameRepository.findAll().stream()
                .filter(g -> (g.getName() != null && g.getName().toLowerCase().contains(q)) ||
                             (g.getGenre() != null && g.getGenre().toLowerCase().contains(q)))
                .limit(5)
                .collect(Collectors.toList());

        // Search events
        List<Event> matchedEvents = eventRepository.findAll().stream()
                .filter(e -> (e.getName() != null && e.getName().toLowerCase().contains(q)) ||
                             (e.getGameName() != null && e.getGameName().toLowerCase().contains(q)))
                .limit(5)
                .collect(Collectors.toList());

        // Search bookings
        List<Booking> matchedBookings = bookingRepository.findAll().stream()
                .filter(b -> (b.getUserName() != null && b.getUserName().toLowerCase().contains(q)) ||
                             (b.getGameName() != null && b.getGameName().toLowerCase().contains(q)) ||
                             (b.getId() != null && b.getId().toLowerCase().contains(q)))
                .limit(5)
                .collect(Collectors.toList());

        // Search consoles
        List<Console> matchedConsoles = consoleRepository.findAll().stream()
                .filter(c -> (c.getName() != null && c.getName().toLowerCase().contains(q)) ||
                             (c.getId() != null && c.getId().toLowerCase().contains(q)))
                .limit(5)
                .collect(Collectors.toList());

        results.put("players", matchedPlayers);
        results.put("games", matchedGames);
        results.put("events", matchedEvents);
        results.put("bookings", matchedBookings);
        results.put("consoles", matchedConsoles);

        return ResponseEntity.ok(results);
    }

    // ==========================================
    // 2. BOOKINGS API
    // ==========================================

    @GetMapping("/bookings")
    public ResponseEntity<List<Booking>> getAllBookings() {
        List<Booking> bookings = bookingRepository.findAll().stream()
                .sorted(Comparator.comparing(Booking::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
        return ResponseEntity.ok(bookings);
    }

    @PostMapping("/bookings")
    public ResponseEntity<Booking> createBooking(@RequestBody Booking booking) {
        if (booking.getId() == null || booking.getId().isEmpty()) {
            booking.setId("BKG" + System.currentTimeMillis() % 1000000);
        }
        if (booking.getCreatedAt() == null) {
            booking.setCreatedAt(LocalDateTime.now());
        }
        if (booking.getStatus() == null) {
            booking.setStatus("confirmed");
        }
        if (booking.getValidationCode() == null || booking.getValidationCode().isEmpty()) {
            booking.setValidationCode(String.format("%04d", new Random().nextInt(10000)));
        }
        bookingRepository.save(booking);

        sendNotification(booking.getUserId(), "Nouvelle Réservation",
                "Votre réservation pour " + booking.getGameName() + " sur " + booking.getConsoleName() + " est enregistrée.", "booking");

        return ResponseEntity.ok(booking);
    }

    @PutMapping("/bookings/{id}")
    public ResponseEntity<?> updateBooking(@PathVariable String id, @RequestBody Booking updated) {
        Optional<Booking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isPresent()) {
            Booking booking = bookingOpt.get();
            if (updated.getUserId() != null) booking.setUserId(updated.getUserId());
            if (updated.getUserName() != null) booking.setUserName(updated.getUserName());
            if (updated.getGameId() != null) booking.setGameId(updated.getGameId());
            if (updated.getGameName() != null) booking.setGameName(updated.getGameName());
            if (updated.getConsoleId() != null) booking.setConsoleId(updated.getConsoleId());
            if (updated.getConsoleName() != null) booking.setConsoleName(updated.getConsoleName());
            if (updated.getPosteName() != null) booking.setPosteName(updated.getPosteName());
            if (updated.getStartTime() != null) booking.setStartTime(updated.getStartTime());
            if (updated.getEndTime() != null) booking.setEndTime(updated.getEndTime());
            if (updated.getTotalAmount() > 0) booking.setTotalAmount(updated.getTotalAmount());
            if (updated.getStatus() != null) booking.setStatus(updated.getStatus());
            if (updated.getPaymentMethod() != null) booking.setPaymentMethod(updated.getPaymentMethod());
            if (updated.getPaymentStatus() != null) booking.setPaymentStatus(updated.getPaymentStatus());
            if (updated.getValidationCode() != null && !updated.getValidationCode().isEmpty()) booking.setValidationCode(updated.getValidationCode());

            bookingRepository.save(booking);
            return ResponseEntity.ok(booking);
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/bookings/{id}/confirm")
    public ResponseEntity<Booking> confirmBooking(@PathVariable String id) {
        Optional<Booking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isPresent()) {
            Booking booking = bookingOpt.get();
            booking.setStatus("confirmed");
            booking.setPaymentStatus("success");
            bookingRepository.save(booking);

            sendNotification(booking.getUserId(), "Réservation Confirmée", 
                    "Votre réservation pour " + booking.getGameName() + " sur " + booking.getConsoleName() + " est confirmée !", "booking");

            return ResponseEntity.ok(booking);
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/bookings/{id}/cancel")
    public ResponseEntity<Booking> cancelBooking(@PathVariable String id) {
        Optional<Booking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isPresent()) {
            Booking booking = bookingOpt.get();
            booking.setStatus("cancelled");
            bookingRepository.save(booking);

            sendNotification(booking.getUserId(), "Réservation Annulée", 
                    "Votre réservation pour " + booking.getGameName() + " a été annulée.", "booking");

            return ResponseEntity.ok(booking);
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/bookings/{id}/validate")
    public ResponseEntity<?> validateBooking(@PathVariable String id, @RequestParam String code) {
        Optional<Booking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isPresent()) {
            Booking booking = bookingOpt.get();
            if (code.equals(booking.getValidationCode())) {
                booking.setStatus("active");
                bookingRepository.save(booking);

                Optional<Console> consoleOpt = consoleRepository.findById(booking.getConsoleId());
                if (consoleOpt.isPresent()) {
                    Console console = consoleOpt.get();
                    console.setStatus("occupied");
                    console.setCurrentGameName(booking.getGameName());
                    console.setFreeAt(booking.getEndTime());
                    consoleRepository.save(console);
                }

                sendNotification(booking.getUserId(), "Session Activée", 
                        "Votre session a commencé pour " + booking.getGameName() + ".", "booking");

                return ResponseEntity.ok(booking);
            } else {
                return ResponseEntity.badRequest().body(Map.of("message", "Code de validation incorrect."));
            }
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/bookings/{id}/complete")
    public ResponseEntity<Booking> completeBooking(@PathVariable String id) {
        Optional<Booking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isPresent()) {
            Booking booking = bookingOpt.get();
            booking.setStatus("completed");
            bookingRepository.save(booking);

            Optional<Console> consoleOpt = consoleRepository.findById(booking.getConsoleId());
            if (consoleOpt.isPresent()) {
                Console console = consoleOpt.get();
                console.setStatus("available");
                console.setCurrentGameName(null);
                console.setFreeAt(null);
                consoleRepository.save(console);
            }

            // Award XP to player
            Optional<User> userOpt = userRepository.findById(booking.getUserId());
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                addXpToUser(user, 150);
            }

            sendNotification(booking.getUserId(), "Session Terminée", 
                    "Merci d'avoir joué ! Vous avez gagné +150 XP.", "level");

            return ResponseEntity.ok(booking);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/bookings/{id}")
    public ResponseEntity<?> deleteBooking(@PathVariable String id) {
        Optional<Booking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isPresent()) {
            Booking booking = bookingOpt.get();
            // If session was active on a console, free the console
            if ("active".equalsIgnoreCase(booking.getStatus()) && booking.getConsoleId() != null) {
                Optional<Console> consoleOpt = consoleRepository.findById(booking.getConsoleId());
                if (consoleOpt.isPresent()) {
                    Console console = consoleOpt.get();
                    console.setStatus("available");
                    console.setCurrentGameName(null);
                    console.setFreeAt(null);
                    consoleRepository.save(console);
                }
            }
            bookingRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Réservation supprimée avec succès"));
        }
        return ResponseEntity.notFound().build();
    }

    // ==========================================
    // 3. CONSOLES API
    // ==========================================

    @GetMapping("/consoles")
    public ResponseEntity<List<Console>> getAllConsoles() {
        return ResponseEntity.ok(consoleRepository.findAll());
    }

    @PostMapping("/consoles")
    public ResponseEntity<Console> addConsole(@RequestBody Console console) {
        long nextNum = consoleRepository.count() + 1;
        if (console.getId() == null || console.getId().isEmpty()) {
            console.setId("CNS" + String.format("%03d", nextNum));
        }
        if (console.getPostNumber() == null || console.getPostNumber().trim().isEmpty()) {
            console.setPostNumber("POST-" + String.format("%02d", nextNum));
        }
        if (console.getStatus() == null || console.getStatus().isEmpty()) {
            console.setStatus("available");
        }
        consoleRepository.save(console);
        return ResponseEntity.ok(console);
    }

    @PutMapping("/consoles/{id}")
    public ResponseEntity<Console> updateConsole(@PathVariable String id, @RequestBody Console console) {
        Optional<Console> consoleOpt = consoleRepository.findById(id);
        if (consoleOpt.isPresent()) {
            Console existing = consoleOpt.get();
            if (console.getName() != null) existing.setName(console.getName());
            if (console.getType() != null) existing.setType(console.getType());
            if (console.getPostNumber() != null) existing.setPostNumber(console.getPostNumber());
            if (console.getStatus() != null) existing.setStatus(console.getStatus());
            if (console.getCurrentGameName() != null) existing.setCurrentGameName(console.getCurrentGameName());
            if (console.getFreeAt() != null) existing.setFreeAt(console.getFreeAt());
            consoleRepository.save(existing);
            return ResponseEntity.ok(existing);
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/consoles/{id}/status")
    public ResponseEntity<Console> updateConsoleStatus(@PathVariable String id, @RequestParam String status) {
        Optional<Console> consoleOpt = consoleRepository.findById(id);
        if (consoleOpt.isPresent()) {
            Console console = consoleOpt.get();
            console.setStatus(status);
            if ("available".equalsIgnoreCase(status) || "broken".equalsIgnoreCase(status)) {
                console.setCurrentGameName(null);
                console.setFreeAt(null);
            }
            consoleRepository.save(console);
            return ResponseEntity.ok(console);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/consoles/{id}")
    public ResponseEntity<?> deleteConsole(@PathVariable String id) {
        if (consoleRepository.existsById(id)) {
            consoleRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Console supprimée avec succès"));
        }
        return ResponseEntity.notFound().build();
    }

    // ==========================================
    // 3b. CONSOLE MODELS (Modèles / Types de consoles ajoutés par l'admin)
    // ==========================================

    @GetMapping("/console-models")
    public ResponseEntity<List<ConsoleModel>> getAllConsoleModels() {
        return ResponseEntity.ok(consoleModelRepository.findAll());
    }

    @PostMapping("/console-models")
    public ResponseEntity<?> addConsoleModel(@RequestBody ConsoleModel model) {
        if (model.getName() == null || model.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le nom de la console est obligatoire"));
        }
        if (model.getId() == null || model.getId().isEmpty()) {
            model.setId("MDL" + String.format("%03d", consoleModelRepository.count() + 1));
        }
        if (model.getCreatedAt() == null) {
            model.setCreatedAt(LocalDateTime.now());
        }
        consoleModelRepository.save(model);
        return ResponseEntity.ok(model);
    }

    @PutMapping("/console-models/{id}")
    public ResponseEntity<?> updateConsoleModel(@PathVariable String id, @RequestBody ConsoleModel model) {
        Optional<ConsoleModel> opt = consoleModelRepository.findById(id);
        if (opt.isPresent()) {
            ConsoleModel existing = opt.get();
            if (model.getName() != null && !model.getName().trim().isEmpty()) {
                existing.setName(model.getName().trim());
            }
            if (model.getManufacturer() != null) {
                existing.setManufacturer(model.getManufacturer().trim());
            }
            if (model.getDescription() != null) {
                existing.setDescription(model.getDescription().trim());
            }
            consoleModelRepository.save(existing);
            return ResponseEntity.ok(existing);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/console-models/{id}")
    public ResponseEntity<?> deleteConsoleModel(@PathVariable String id) {
        if (consoleModelRepository.existsById(id)) {
            consoleModelRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Modèle de console supprimé"));
        }
        return ResponseEntity.notFound().build();
    }

    // ==========================================
    // 4. PLAYERS API (WITH 360 PROFILE)
    // ==========================================

    @GetMapping("/players")
    public ResponseEntity<List<User>> getAllPlayers() {
        List<User> players = userRepository.findAll().stream()
                .sorted(Comparator.comparing(User::getLevel, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
        return ResponseEntity.ok(players);
    }

    @PostMapping("/players")
    public ResponseEntity<?> createPlayer(@RequestBody User user) {
        try {
            if (user.getName() == null || user.getName().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Le nom du joueur est obligatoire"));
            }
            if (user.getEmail() == null || user.getEmail().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "L'email est obligatoire"));
            }
            if (user.getPhone() == null || user.getPhone().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Le téléphone est obligatoire"));
            }

            if (user.getId() == null || user.getId().isEmpty()) {
                user.setId("USR" + System.currentTimeMillis() % 1000000);
            }
            if (user.getRole() == null || user.getRole().isEmpty()) {
                user.setRole("player");
            }
            if (user.getLevel() == null || user.getLevel() <= 0) {
                user.setLevel(1);
            }
            if (user.getXp() == null) {
                user.setXp(0);
            }
            if (user.getMaxXp() == null || user.getMaxXp() <= 0) {
                user.setMaxXp(1000);
            }
            if (user.getCreatedAt() == null) {
                user.setCreatedAt(LocalDateTime.now());
            }
            if (user.getAvatarUrl() == null || user.getAvatarUrl().isEmpty()) {
                user.setAvatarUrl("https://api.dicebear.com/7.x/bottts/svg?seed=" + user.getName().replaceAll("\\s+", ""));
            }
            if (user.getBadges() == null) {
                user.setBadges(new ArrayList<>());
            }
            userRepository.save(user);
            return ResponseEntity.ok(user);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("message", "Erreur: " + ex.getMessage()));
        }
    }

    @GetMapping("/players/{id}/details")
    public ResponseEntity<Map<String, Object>> getPlayerDetails(@PathVariable String id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        Map<String, Object> details = new HashMap<>();
        details.put("user", user);

        // Bookings of user
        List<Booking> userBookings = bookingRepository.findByUserId(id);
        details.put("bookings", userBookings);

        // Rentals of user
        List<RentalTransaction> userRentals = rentalTransactionRepository.findByUserId(id);
        details.put("rentals", userRentals);

        // Events participated
        List<Event> allEvents = eventRepository.findAll();
        List<Event> participatedEvents = allEvents.stream()
                .filter(e -> e.getParticipantIds() != null && e.getParticipantIds().contains(id))
                .collect(Collectors.toList());
        details.put("events", participatedEvents);

        // Total spent calculation
        double totalSpentBookings = userBookings.stream()
                .filter(b -> !"cancelled".equalsIgnoreCase(b.getStatus()))
                .mapToDouble(Booking::getTotalAmount)
                .sum();
        double totalSpentRentals = userRentals.stream()
                .filter(r -> !"cancelled".equalsIgnoreCase(r.getStatus()))
                .mapToDouble(RentalTransaction::getTotalAmount)
                .sum();
        details.put("totalSpent", totalSpentBookings + totalSpentRentals);

        return ResponseEntity.ok(details);
    }

    @PutMapping("/players/{id}")
    public ResponseEntity<User> updatePlayer(@PathVariable String id, @RequestBody User user) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isPresent()) {
            User existing = userOpt.get();
            if (user.getName() != null && !user.getName().trim().isEmpty()) {
                existing.setName(user.getName().trim());
            }
            if (user.getAvatarUrl() != null && !user.getAvatarUrl().trim().isEmpty()) {
                existing.setAvatarUrl(user.getAvatarUrl().trim());
            } else if (existing.getAvatarUrl() == null || existing.getAvatarUrl().isEmpty()) {
                existing.setAvatarUrl("https://api.dicebear.com/7.x/bottts/svg?seed=" + existing.getName().replaceAll("\\s+", ""));
            }
            if (user.getEmail() != null && !user.getEmail().trim().isEmpty()) existing.setEmail(user.getEmail().trim());
            if (user.getPhone() != null && !user.getPhone().trim().isEmpty()) existing.setPhone(user.getPhone().trim());
            if (user.getRole() != null) existing.setRole(user.getRole());
            if (user.getPin() != null && !user.getPin().trim().isEmpty()) existing.setPin(user.getPin().trim());
            if (user.getBirthDate() != null) existing.setBirthDate(user.getBirthDate());
            if (user.getLevel() != null && user.getLevel() > 0) existing.setLevel(user.getLevel());
            if (user.getXp() != null) existing.setXp(user.getXp());
            if (user.getMaxXp() != null && user.getMaxXp() > 0) existing.setMaxXp(user.getMaxXp());
            userRepository.save(existing);
            return ResponseEntity.ok(existing);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/players/{id}")
    public ResponseEntity<?> deletePlayer(@PathVariable String id) {
        if (userRepository.existsById(id)) {
            userRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Joueur supprimé"));
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/players/{id}/xp")
    public ResponseEntity<User> awardXp(@PathVariable String id, @RequestParam int amount) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            addXpToUser(user, amount);
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/players/{id}/badge")
    public ResponseEntity<User> awardBadge(@PathVariable String id, @RequestParam String badge) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (user.getBadges() == null) {
                user.setBadges(new ArrayList<>());
            }
            if (!user.getBadges().contains(badge)) {
                user.getBadges().add(badge);
                userRepository.save(user);
                sendNotification(user.getId(), "Nouveau Badge Débloqué !", 
                        "Félicitations, vous avez obtenu le badge : " + badge, "promotion");
            }
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.notFound().build();
    }

    // ==========================================
    // 5. TOURNAMENTS & EVENTS API
    // ==========================================

    @GetMapping("/events")
    public ResponseEntity<List<Event>> getAllEvents() {
        List<Event> events = eventRepository.findAll().stream()
                .sorted(Comparator.comparing(Event::getDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
        return ResponseEntity.ok(events);
    }

    @GetMapping("/events/{id}")
    public ResponseEntity<Event> getEventById(@PathVariable String id) {
        return eventRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/events")
    public ResponseEntity<Event> createEvent(@RequestBody Event event) {
        if (event.getId() == null || event.getId().isEmpty()) {
            event.setId("EV" + String.format("%03d", eventRepository.count() + 1));
        }
        if (event.getStatus() == null || event.getStatus().isEmpty()) {
            event.setStatus("upcoming");
        }
        if (event.getParticipantIds() == null) {
            event.setParticipantIds(new ArrayList<>());
        }
        eventRepository.save(event);
        return ResponseEntity.ok(event);
    }

    @PutMapping("/events/{id}")
    public ResponseEntity<Event> updateEvent(@PathVariable String id, @RequestBody Event event) {
        Optional<Event> eventOpt = eventRepository.findById(id);
        if (eventOpt.isPresent()) {
            Event existing = eventOpt.get();
            if (event.getName() != null) existing.setName(event.getName());
            if (event.getDescription() != null) existing.setDescription(event.getDescription());
            if (event.getRules() != null) existing.setRules(event.getRules());
            if (event.getGameName() != null) existing.setGameName(event.getGameName());
            if (event.getPlatform() != null) existing.setPlatform(event.getPlatform());
            if (event.getDate() != null) existing.setDate(event.getDate());
            if (event.getStartTime() != null) existing.setStartTime(event.getStartTime());
            if (event.getEndTime() != null) existing.setEndTime(event.getEndTime());
            if (event.getEntryFee() >= 0) existing.setEntryFee(event.getEntryFee());
            if (event.getMaxParticipants() > 0) existing.setMaxParticipants(event.getMaxParticipants());
            if (event.getStatus() != null) existing.setStatus(event.getStatus());
            if (event.getColor() != null) existing.setColor(event.getColor());
            if (event.getPrize() != null) existing.setPrize(event.getPrize());
            if (event.getEmoji() != null) existing.setEmoji(event.getEmoji());

            eventRepository.save(existing);
            return ResponseEntity.ok(existing);
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/events/{id}/status")
    public ResponseEntity<Event> updateEventStatus(@PathVariable String id, @RequestParam String status) {
        Optional<Event> eventOpt = eventRepository.findById(id);
        if (eventOpt.isPresent()) {
            Event event = eventOpt.get();
            event.setStatus(status);
            eventRepository.save(event);
            return ResponseEntity.ok(event);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/events/{id}")
    public ResponseEntity<?> deleteEvent(@PathVariable String id) {
        if (eventRepository.existsById(id)) {
            eventRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Tournoi supprimé"));
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/events/{id}/participants")
    public ResponseEntity<List<User>> getEventParticipants(@PathVariable String id) {
        Optional<Event> eventOpt = eventRepository.findById(id);
        if (eventOpt.isPresent()) {
            List<String> pIds = eventOpt.get().getParticipantIds();
            if (pIds == null || pIds.isEmpty()) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            List<User> participants = userRepository.findAllById(pIds);
            return ResponseEntity.ok(participants);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/events/{id}/participants")
    public ResponseEntity<?> addParticipantToEvent(@PathVariable String id, @RequestParam String userId) {
        Optional<Event> eventOpt = eventRepository.findById(id);
        Optional<User> userOpt = userRepository.findById(userId);

        if (eventOpt.isPresent() && userOpt.isPresent()) {
            Event event = eventOpt.get();
            User user = userOpt.get();
            if (event.getParticipantIds() == null) {
                event.setParticipantIds(new ArrayList<>());
            }
            if (event.getParticipantIds().size() >= event.getMaxParticipants()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Le tournoi est complet"));
            }
            if (!event.getParticipantIds().contains(userId)) {
                event.getParticipantIds().add(userId);
                eventRepository.save(event);

                sendNotification(userId, "Inscription Tournoi Validée",
                        "Vous êtes officiellement inscrit au tournoi " + event.getName() + " !", "tournament");
            }
            return ResponseEntity.ok(event);
        }
        return ResponseEntity.badRequest().body(Map.of("message", "Tournoi ou utilisateur introuvable"));
    }

    @DeleteMapping("/events/{id}/participants/{userId}")
    public ResponseEntity<?> removeParticipantFromEvent(@PathVariable String id, @PathVariable String userId) {
        Optional<Event> eventOpt = eventRepository.findById(id);
        if (eventOpt.isPresent()) {
            Event event = eventOpt.get();
            if (event.getParticipantIds() != null && event.getParticipantIds().remove(userId)) {
                eventRepository.save(event);
                return ResponseEntity.ok(event);
            }
        }
        return ResponseEntity.notFound().build();
    }

    // ==========================================
    // 6. GAMES CATALOG API
    // ==========================================

    @GetMapping("/games")
    public ResponseEntity<List<Game>> getAllGames() {
        return ResponseEntity.ok(gameRepository.findAllByOrderByPopularityRankAsc());
    }

    @PostMapping("/games")
    public ResponseEntity<Game> addGame(@RequestBody Game game) {
        if (game.getId() == null || game.getId().isEmpty()) {
            game.setId("GM" + String.format("%03d", gameRepository.count() + 1));
        }
        if (game.getStatus() == null || game.getStatus().isEmpty()) {
            game.setStatus("available");
        }
        if (game.getPopularityRank() <= 0) {
            game.setPopularityRank((int) gameRepository.count() + 1);
        }
        gameRepository.save(game);
        return ResponseEntity.ok(game);
    }

    @PutMapping("/games/{id}")
    public ResponseEntity<Game> updateGame(@PathVariable String id, @RequestBody Game game) {
        Optional<Game> gameOpt = gameRepository.findById(id);
        if (gameOpt.isPresent()) {
            Game existing = gameOpt.get();
            if (game.getName() != null) existing.setName(game.getName());
            if (game.getGenre() != null) existing.setGenre(game.getGenre());
            if (game.getConsole() != null) existing.setConsole(game.getConsole());
            if (game.getStatus() != null) existing.setStatus(game.getStatus());
            if (game.getPricePerHour() > 0) existing.setPricePerHour(game.getPricePerHour());
            if (game.getDailyRentalPrice() > 0) existing.setDailyRentalPrice(game.getDailyRentalPrice());
            if (game.getPopularityRank() > 0) existing.setPopularityRank(game.getPopularityRank());
            if (game.getDescription() != null) existing.setDescription(game.getDescription());
            if (game.getAccentColor() != null) existing.setAccentColor(game.getAccentColor());
            existing.setAvailableForRental(game.isAvailableForRental());
            existing.setAvailableForSale(game.isAvailableForSale());
            if (game.getSalePrice() >= 0) existing.setSalePrice(game.getSalePrice());
            if (game.getSaleStock() >= 0) existing.setSaleStock(game.getSaleStock());

            gameRepository.save(existing);
            return ResponseEntity.ok(existing);
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/games/{id}/status")
    public ResponseEntity<Game> updateGameStatus(@PathVariable String id, @RequestParam String status) {
        Optional<Game> gameOpt = gameRepository.findById(id);
        if (gameOpt.isPresent()) {
            Game game = gameOpt.get();
            game.setStatus(status);
            gameRepository.save(game);
            return ResponseEntity.ok(game);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/games/{id}")
    public ResponseEntity<?> deleteGame(@PathVariable String id) {
        if (gameRepository.existsById(id)) {
            gameRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Jeu supprimé du catalogue"));
        }
        return ResponseEntity.notFound().build();
    }

    // ==========================================
    // 7. CONSOLE RENTALS & TRANSACTIONS API
    // ==========================================

    @GetMapping("/rentals")
    public ResponseEntity<List<ConsoleRental>> getAllRentals() {
        return ResponseEntity.ok(consoleRentalRepository.findAll());
    }

    @PostMapping("/rentals")
    public ResponseEntity<ConsoleRental> createRentalPack(@RequestBody ConsoleRental rental) {
        if (rental.getId() == null || rental.getId().isEmpty()) {
            rental.setId("RENT" + String.format("%03d", consoleRentalRepository.count() + 1));
        }
        if (rental.getStatus() == null) {
            rental.setStatus("available");
        }
        if (rental.getIncludes() == null) {
            rental.setIncludes(new ArrayList<>());
        }
        consoleRentalRepository.save(rental);
        return ResponseEntity.ok(rental);
    }

    @PutMapping("/rentals/{id}")
    public ResponseEntity<ConsoleRental> updateRentalPack(@PathVariable String id, @RequestBody ConsoleRental rental) {
        Optional<ConsoleRental> rentalOpt = consoleRentalRepository.findById(id);
        if (rentalOpt.isPresent()) {
            ConsoleRental existing = rentalOpt.get();
            if (rental.getName() != null) existing.setName(rental.getName());
            if (rental.getConsoleType() != null) existing.setConsoleType(rental.getConsoleType());
            if (rental.getDailyPrice() >= 0) existing.setDailyPrice(rental.getDailyPrice());
            if (rental.getSalePrice() >= 0) existing.setSalePrice(rental.getSalePrice());
            existing.setForRental(rental.isForRental());
            existing.setForSale(rental.isForSale());
            if (rental.getItemCondition() != null) existing.setItemCondition(rental.getItemCondition());
            if (rental.getDescription() != null) existing.setDescription(rental.getDescription());
            if (rental.getAvailableUnits() >= 0) existing.setAvailableUnits(rental.getAvailableUnits());
            if (rental.getStatus() != null) existing.setStatus(rental.getStatus());
            if (rental.getAccentColor() != null) existing.setAccentColor(rental.getAccentColor());
            if (rental.getIncludes() != null) existing.setIncludes(rental.getIncludes());

            consoleRentalRepository.save(existing);
            return ResponseEntity.ok(existing);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/rentals/{id}")
    public ResponseEntity<?> deleteRentalPack(@PathVariable String id) {
        if (consoleRentalRepository.existsById(id)) {
            consoleRentalRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Pack de location supprimé"));
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/rentals/transactions")
    public ResponseEntity<List<RentalTransaction>> getAllRentalTransactions() {
        List<RentalTransaction> list = rentalTransactionRepository.findAll().stream()
                .sorted(Comparator.comparing(RentalTransaction::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @PostMapping("/rentals/transactions")
    public ResponseEntity<RentalTransaction> createRentalTransaction(@RequestBody RentalTransaction transaction) {
        if (transaction.getId() == null || transaction.getId().isEmpty()) {
            transaction.setId("TX" + System.currentTimeMillis() % 1000000);
        }
        if (transaction.getCreatedAt() == null) {
            transaction.setCreatedAt(LocalDateTime.now());
        }
        if (transaction.getStatus() == null) {
            transaction.setStatus("confirmed");
        }
        if (transaction.getValidationCode() == null) {
            transaction.setValidationCode(String.format("%04d", new Random().nextInt(10000)));
        }
        rentalTransactionRepository.save(transaction);

        sendNotification(transaction.getUserId(), "Location Confirmée",
                "Votre réservation de location pour " + transaction.getItemName() + " est prête.", "rental");

        return ResponseEntity.ok(transaction);
    }

    @PutMapping("/rentals/transactions/{id}/status")
    public ResponseEntity<RentalTransaction> updateRentalTransactionStatus(
            @PathVariable String id, 
            @RequestParam String status) {
        Optional<RentalTransaction> txOpt = rentalTransactionRepository.findById(id);
        if (txOpt.isPresent()) {
            RentalTransaction tx = txOpt.get();
            tx.setStatus(status);
            rentalTransactionRepository.save(tx);

            if ("returned".equalsIgnoreCase(status)) {
                Optional<ConsoleRental> rentalOpt = consoleRentalRepository.findById(tx.getItemId());
                if (rentalOpt.isPresent()) {
                    ConsoleRental cr = rentalOpt.get();
                    cr.setAvailableUnits(cr.getAvailableUnits() + 1);
                    consoleRentalRepository.save(cr);
                }
                sendNotification(tx.getUserId(), "Matériel Restitué",
                        "Merci ! Le matériel " + tx.getItemName() + " a bien été restitué.", "rental");
            }
            return ResponseEntity.ok(tx);
        }
        return ResponseEntity.notFound().build();
    }

    // ==========================================
    // 8. SESSIONS HISTORICAL LOGS
    // ==========================================

    @GetMapping("/sessions")
    public ResponseEntity<List<Session>> getAllSessions() {
        return ResponseEntity.ok(sessionRepository.findAll());
    }

    // ==========================================
    // 9. NOTIFICATIONS CENTER API
    // ==========================================

    @GetMapping("/notifications")
    public ResponseEntity<List<Notification>> getAllNotifications() {
        return ResponseEntity.ok(notificationRepository.findAllByOrderByCreatedAtDesc());
    }

    @PutMapping("/notifications/{id}/read")
    public ResponseEntity<?> markNotificationAsRead(@PathVariable String id) {
        Optional<Notification> notifOpt = notificationRepository.findById(id);
        if (notifOpt.isPresent()) {
            Notification notif = notifOpt.get();
            notif.setRead(true);
            notificationRepository.save(notif);
            return ResponseEntity.ok(notif);
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/notifications/read-all")
    public ResponseEntity<?> markAllNotificationsAsRead() {
        List<Notification> list = notificationRepository.findAll();
        for (Notification n : list) {
            n.setRead(true);
        }
        notificationRepository.saveAll(list);
        return ResponseEntity.ok(Map.of("message", "Toutes les notifications ont été marquées comme lues"));
    }

    @DeleteMapping("/notifications/{id}")
    public ResponseEntity<?> deleteNotification(@PathVariable String id) {
        if (notificationRepository.existsById(id)) {
            notificationRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Notification supprimée"));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/notifications/clear-read")
    public ResponseEntity<?> clearReadNotifications() {
        List<Notification> list = notificationRepository.findAll().stream()
                .filter(Notification::isRead)
                .collect(Collectors.toList());
        notificationRepository.deleteAll(list);
        return ResponseEntity.ok(Map.of("message", list.size() + " notifications supprimées"));
    }

    @PostMapping("/notifications/broadcast")
    public ResponseEntity<?> broadcastNotification(
            @RequestParam(required = false) String userId,
            @RequestParam String title,
            @RequestParam String message,
            @RequestParam(defaultValue = "promotion") String type) {
        
        if (userId != null && !userId.isEmpty()) {
            sendNotification(userId, title, message, type);
        } else {
            List<User> players = userRepository.findAll();
            for (User u : players) {
                sendNotification(u.getId(), title, message, type);
            }
        }
        return ResponseEntity.ok(Map.of("message", "Notification envoyée"));
    }

    // ==========================================
    // 9. AVATARS & PORTRAITS GALLERY API
    // ==========================================

    @GetMapping("/avatars")
    public ResponseEntity<List<AvatarPreset>> getAllAvatarPresets() {
        if (avatarPresetRepository.count() == 0) {
            initDefaultAvatarPresets();
        }
        return ResponseEntity.ok(avatarPresetRepository.findAll());
    }

    @PostMapping("/avatars")
    public ResponseEntity<AvatarPreset> addAvatarPreset(@RequestBody AvatarPreset preset) {
        if (preset.getId() == null || preset.getId().isEmpty()) {
            preset.setId("AVT" + String.format("%03d", avatarPresetRepository.count() + 1));
        }
        avatarPresetRepository.save(preset);
        return ResponseEntity.ok(preset);
    }

    private void initDefaultAvatarPresets() {
        List<AvatarPreset> presets = List.of(
            // 1. Portraits Humains & Réalistes
            new AvatarPreset("AVT001", "Aïcha (Pro Gamer)", "Portraits", "https://api.dicebear.com/7.x/micah/svg?seed=Aicha&hair=fonze,full&clothing=collar,open"),
            new AvatarPreset("AVT002", "Moussa (Champion)", "Portraits", "https://api.dicebear.com/7.x/micah/svg?seed=Moussa&hair=danny,pixie&facialHair=beard"),
            new AvatarPreset("AVT003", "Fatou (Streamer)", "Portraits", "https://api.dicebear.com/7.x/micah/svg?seed=Fatou&hair=full,curls"),
            new AvatarPreset("AVT004", "Oumar (Leader)", "Portraits", "https://api.dicebear.com/7.x/micah/svg?seed=Oumar&hair=doug,turban"),
            new AvatarPreset("AVT005", "Amina (Esport)", "Portraits", "https://api.dicebear.com/7.x/micah/svg?seed=Amina&hair=danny,full"),
            new AvatarPreset("AVT006", "Karim (Speedrun)", "Portraits", "https://api.dicebear.com/7.x/micah/svg?seed=Karim&hair=fonze"),
            new AvatarPreset("AVT007", "Sophie (Tactique)", "Portraits", "https://api.dicebear.com/7.x/micah/svg?seed=Sophie&hair=full"),
            new AvatarPreset("AVT008", "David (Stratège)", "Portraits", "https://api.dicebear.com/7.x/micah/svg?seed=David"),
            
            // 2. Héros Gaming & Fantasy
            new AvatarPreset("AVT009", "Chevalier de l'Ombre", "Gaming", "https://api.dicebear.com/7.x/adventurer/svg?seed=ShadowKnight"),
            new AvatarPreset("AVT010", "Valkyrie Cosmique", "Gaming", "https://api.dicebear.com/7.x/adventurer/svg?seed=Valkyrie"),
            new AvatarPreset("AVT011", "Shinobi Cyber", "Gaming", "https://api.dicebear.com/7.x/adventurer/svg?seed=Shinobi"),
            new AvatarPreset("AVT012", "Sniper Fantôme", "Gaming", "https://api.dicebear.com/7.x/adventurer/svg?seed=GhostSniper"),
            new AvatarPreset("AVT013", "Paladin Doré", "Gaming", "https://api.dicebear.com/7.x/adventurer/svg?seed=GoldPaladin"),
            new AvatarPreset("AVT014", "Ranger de Sylve", "Gaming", "https://api.dicebear.com/7.x/adventurer/svg?seed=ForestRanger"),

            // 3. Anime & Manga
            new AvatarPreset("AVT015", "Héros Shonen", "Anime", "https://api.dicebear.com/7.x/lorelei/svg?seed=ShonenHero"),
            new AvatarPreset("AVT016", "Chasseresse Lunaire", "Anime", "https://api.dicebear.com/7.x/lorelei/svg?seed=LunarHuntress"),
            new AvatarPreset("AVT017", "Samouraï Néon", "Anime", "https://api.dicebear.com/7.x/lorelei/svg?seed=NeonSamurai"),
            new AvatarPreset("AVT018", "Mage Stellaire", "Anime", "https://api.dicebear.com/7.x/lorelei/svg?seed=StarMage"),
            new AvatarPreset("AVT019", "Maître Élémentaire", "Anime", "https://api.dicebear.com/7.x/lorelei/svg?seed=ElementMaster"),

            // 4. Mecha & Robots
            new AvatarPreset("AVT020", "Mecha Titan V1", "Robots", "https://api.dicebear.com/7.x/bottts/svg?seed=TitanV1&mouth=smile01,diagram"),
            new AvatarPreset("AVT021", "Cyborg Nexus", "Robots", "https://api.dicebear.com/7.x/bottts/svg?seed=Nexus99"),
            new AvatarPreset("AVT022", "Droid Tactique", "Robots", "https://api.dicebear.com/7.x/bottts/svg?seed=TacticalDroid"),
            new AvatarPreset("AVT023", "Pixel Knight 8-Bit", "Robots", "https://api.dicebear.com/7.x/pixel-art/svg?seed=PixelKnight"),
            new AvatarPreset("AVT024", "Pixel Mage 16-Bit", "Robots", "https://api.dicebear.com/7.x/pixel-art/svg?seed=PixelMage")
        );
        avatarPresetRepository.saveAll(presets);
    }

    // ==========================================
    // 10. FINANCE & REVENUE TRACKING API
    // ==========================================

    @GetMapping("/finance/summary")
    public ResponseEntity<Map<String, Object>> getFinanceSummary(
            @RequestParam(required = false, defaultValue = "all") String period) {
        
        List<Booking> bookings = bookingRepository.findAll();
        List<RentalTransaction> rentals = rentalTransactionRepository.findAll();
        List<Event> events = eventRepository.findAll();
        List<FinancialTransaction> manualTxns = financialTransactionRepository.findAllByOrderByCreatedAtDesc();

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime threshold = null;

        if ("today".equalsIgnoreCase(period)) {
            threshold = now.toLocalDate().atStartOfDay();
        } else if ("7days".equalsIgnoreCase(period)) {
            threshold = now.minusDays(7);
        } else if ("30days".equalsIgnoreCase(period) || "month".equalsIgnoreCase(period)) {
            threshold = now.minusDays(30);
        } else if ("year".equalsIgnoreCase(period)) {
            threshold = now.minusYears(1);
        }

        final LocalDateTime filterDate = threshold;

        // 1. Calculate Bookings Revenue (Sessions de jeu)
        double bookingsRevenue = bookings.stream()
                .filter(b -> !"cancelled".equalsIgnoreCase(b.getStatus()))
                .filter(b -> filterDate == null || (b.getStartTime() != null && !b.getStartTime().isBefore(filterDate)))
                .mapToDouble(Booking::getTotalAmount)
                .sum();

        // 2. Calculate Rentals & Sales Revenue
        double rentalsRevenue = rentals.stream()
                .filter(r -> !"cancelled".equalsIgnoreCase(r.getStatus()))
                .filter(r -> filterDate == null || (r.getCreatedAt() != null && !r.getCreatedAt().isBefore(filterDate)))
                .mapToDouble(RentalTransaction::getTotalAmount)
                .sum();

        // 3. Calculate Events Revenue
        double eventsRevenue = 0.0;
        for (Event e : events) {
            if (e.getEntryFee() > 0 && e.getParticipantIds() != null) {
                if (filterDate == null || (e.getDate() != null && !e.getDate().isBefore(filterDate.toLocalDate()))) {
                    eventsRevenue += e.getEntryFee() * e.getParticipantIds().size();
                }
            }
        }

        // 4. Calculate Manual Incomes & Expenses
        double manualIncome = manualTxns.stream()
                .filter(t -> "income".equalsIgnoreCase(t.getType()))
                .filter(t -> filterDate == null || (t.getCreatedAt() != null && !t.getCreatedAt().isBefore(filterDate)))
                .mapToDouble(t -> t.getAmount() != null ? t.getAmount() : 0.0)
                .sum();

        double totalExpenses = manualTxns.stream()
                .filter(t -> "expense".equalsIgnoreCase(t.getType()))
                .filter(t -> filterDate == null || (t.getCreatedAt() != null && !t.getCreatedAt().isBefore(filterDate)))
                .mapToDouble(t -> t.getAmount() != null ? t.getAmount() : 0.0)
                .sum();

        double totalRevenue = bookingsRevenue + rentalsRevenue + eventsRevenue + manualIncome;
        double netProfit = totalRevenue - totalExpenses;

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalRevenue", totalRevenue);
        summary.put("bookingsRevenue", bookingsRevenue);
        summary.put("rentalsRevenue", rentalsRevenue);
        summary.put("eventsRevenue", eventsRevenue);
        summary.put("manualIncome", manualIncome);
        summary.put("totalExpenses", totalExpenses);
        summary.put("netProfit", netProfit);
        summary.put("period", period);

        // Category Breakdown
        Map<String, Double> categoryBreakdown = new LinkedHashMap<>();
        categoryBreakdown.put("Sessions & Postes", bookingsRevenue);
        categoryBreakdown.put("Locations & Ventes", rentalsRevenue);
        categoryBreakdown.put("Tournois & Événements", eventsRevenue);
        if (manualIncome > 0) categoryBreakdown.put("Autres Entrées", manualIncome);
        summary.put("categoryBreakdown", categoryBreakdown);

        return ResponseEntity.ok(summary);
    }

    @GetMapping("/finance/transactions")
    public ResponseEntity<List<Map<String, Object>>> getFinanceTransactions() {
        List<Map<String, Object>> unified = new ArrayList<>();
        Map<String, String> userNames = new HashMap<>();
        for (User u : userRepository.findAll()) {
            userNames.put(u.getId(), u.getName());
        }

        // 1. Bookings
        for (Booking b : bookingRepository.findAll()) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", b.getId());
            item.put("type", "income");
            item.put("category", "Sessions & Postes");
            item.put("title", "Session Console " + (b.getConsoleId() != null ? b.getConsoleId() : ""));
            item.put("amount", b.getTotalAmount());
            item.put("paymentMethod", b.getPaymentMethod() != null ? b.getPaymentMethod() : "Espèces");
            item.put("clientName", userNames.getOrDefault(b.getUserId(), b.getUserId() != null ? b.getUserId() : "Client"));
            item.put("status", b.getStatus() != null ? b.getStatus() : "completed");
            item.put("createdAt", b.getStartTime() != null ? b.getStartTime() : (b.getCreatedAt() != null ? b.getCreatedAt() : LocalDateTime.now()));
            item.put("source", "booking");
            unified.add(item);
        }

        // 2. Rentals & Sales
        for (RentalTransaction r : rentalTransactionRepository.findAll()) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", r.getId());
            item.put("type", "income");
            item.put("category", "Locations & Ventes");
            item.put("title", r.getItemName() != null ? r.getItemName() : "Location/Vente");
            item.put("amount", r.getTotalAmount());
            item.put("paymentMethod", r.getPaymentMethod() != null ? r.getPaymentMethod() : "Wave");
            item.put("clientName", userNames.getOrDefault(r.getUserId(), r.getUserName() != null ? r.getUserName() : "Client"));
            item.put("status", r.getStatus() != null ? r.getStatus() : "completed");
            item.put("createdAt", r.getCreatedAt() != null ? r.getCreatedAt() : LocalDateTime.now());
            item.put("source", "rental");
            unified.add(item);
        }

        // 3. Manual Financial Transactions (Incomes & Expenses)
        for (FinancialTransaction f : financialTransactionRepository.findAllByOrderByCreatedAtDesc()) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", f.getId());
            item.put("type", f.getType()); // "income" or "expense"
            item.put("category", f.getCategory());
            item.put("title", f.getTitle());
            item.put("amount", f.getAmount());
            item.put("paymentMethod", f.getPaymentMethod() != null ? f.getPaymentMethod() : "Espèces");
            item.put("clientName", f.getPerformedBy() != null ? f.getPerformedBy() : "Admin");
            item.put("status", "completed");
            item.put("createdAt", f.getCreatedAt() != null ? f.getCreatedAt() : LocalDateTime.now());
            item.put("notes", f.getNotes());
            item.put("source", "manual");
            unified.add(item);
        }

        // Sort all unified transactions by createdAt descending
        unified.sort((a, b) -> {
            LocalDateTime d1 = (LocalDateTime) a.get("createdAt");
            LocalDateTime d2 = (LocalDateTime) b.get("createdAt");
            if (d1 == null && d2 == null) return 0;
            if (d1 == null) return 1;
            if (d2 == null) return -1;
            return d2.compareTo(d1);
        });

        return ResponseEntity.ok(unified);
    }

    @PostMapping("/finance/transactions")
    public ResponseEntity<?> createManualFinancialTransaction(@RequestBody FinancialTransaction txn) {
        if (txn.getTitle() == null || txn.getTitle().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le titre/motif est obligatoire"));
        }
        if (txn.getAmount() == null || txn.getAmount() <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le montant doit être supérieur à 0"));
        }
        if (txn.getType() == null || (!txn.getType().equalsIgnoreCase("income") && !txn.getType().equalsIgnoreCase("expense"))) {
            txn.setType("income");
        }
        if (txn.getId() == null || txn.getId().isEmpty()) {
            txn.setId("TXN" + System.currentTimeMillis() % 1000000);
        }
        if (txn.getCreatedAt() == null) {
            txn.setCreatedAt(LocalDateTime.now());
        }
        financialTransactionRepository.save(txn);
        return ResponseEntity.ok(txn);
    }

    @DeleteMapping("/finance/transactions/{id}")
    public ResponseEntity<?> deleteManualFinancialTransaction(@PathVariable String id) {
        if (financialTransactionRepository.existsById(id)) {
            financialTransactionRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Transaction supprimée"));
        }
        return ResponseEntity.notFound().build();
    }

    // ==========================================
    // PRIVATE HELPERS
    // ==========================================

    private void addXpToUser(User user, int amount) {
        user.setXp(user.getXp() + amount);
        while (user.getXp() >= user.getMaxXp()) {
            user.setXp(user.getXp() - user.getMaxXp());
            user.setLevel(user.getLevel() + 1);
            user.setMaxXp(user.getMaxXp() + 200);
            sendNotification(user.getId(), "Level UP !", 
                    "Félicitations ! Vous avez atteint le niveau " + user.getLevel() + " !", "level");
        }
        userRepository.save(user);
    }

    private void sendNotification(String userId, String title, String message, String type) {
        String notifId = "NTF" + System.currentTimeMillis() + (int)(Math.random() * 100);
        Notification notification = new Notification(notifId, userId, title, message, type, false, LocalDateTime.now());
        notificationRepository.save(notification);
    }
}
