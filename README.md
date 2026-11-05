# GAMEL Dashboard — version démo

Tableau de bord de gestion d'une salle de jeux vidéo : postes de jeu, réservations, joueurs, tournois, locations de consoles et suivi financier.

> Ceci est une **version de démonstration** d'un projet que j'ai développé pour une vraie salle de jeux. Elle tourne avec des **données fictives** et ne contient aucune donnée réelle, clé d'API ou configuration de production.

## Fonctionnalités

| Module | Ce qu'il permet |
|---|---|
| **Vue d'ensemble** | Chiffres clés du jour, réservations récentes, occupation des postes, recherche globale |
| **Postes / consoles** | Statut en temps réel de chaque poste (libre, occupé, en panne) et heure de libération |
| **Réservations** | Création, confirmation, validation par code, clôture et annulation des sessions |
| **Joueurs** | Fiches joueurs, niveaux, XP et badges (système de progression) |
| **Jeux** | Catalogue avec prix horaire, location et vente, classement de popularité |
| **Tournois** | Création d'événements, règles, inscriptions, frais d'entrée et récompenses |
| **Locations** | Catalogue de consoles à louer et suivi des locations en cours |
| **Finance** | Recettes et dépenses par catégorie, répartition par moyen de paiement (espèces, mobile money), graphiques |
| **Notifications** | Alertes internes et messages diffusés aux joueurs |

## Stack technique

- **Back-end** : Java 17, Spring Boot, Spring Data JPA / Hibernate
- **Base de données** : PostgreSQL (production) ou H2 en mémoire (démo)
- **Front-end** : HTML, CSS et JavaScript natif (sans framework), servis par Spring Boot
- **API** : REST JSON sous `/api/dashboard/*` (environ 60 routes)
- **Build** : Maven (wrapper inclus)

## Lancer la démo (aucune installation de base de données)

Prérequis : Java 17 ou plus récent.

```bash
git clone https://github.com/Crisnel05/gamel-dashboard-demo.git
cd gamel-dashboard-demo
./mvnw spring-boot:run -Dspring-boot.run.profiles=demo
```

Puis ouvrir **http://localhost:8081**.

Le profil `demo` utilise une base H2 en mémoire remplie au démarrage par `DemoDataSeeder` : joueurs, postes, réservations, un tournoi et des transactions, tous fictifs. Les données sont effacées à l'arrêt.

## Lancer avec PostgreSQL

```bash
createdb gamel
export DB_URL=jdbc:postgresql://localhost:5432/gamel
export DB_USER=postgres
export DB_PASSWORD=motdepasse
./mvnw spring-boot:run
```

| Variable | Rôle | Valeur par défaut |
|---|---|---|
| `DB_URL` | URL JDBC de la base | `jdbc:postgresql://localhost:5432/gamel` |
| `DB_USER` | Utilisateur | `postgres` |
| `DB_PASSWORD` | Mot de passe | *(vide)* |
| `PORT` | Port HTTP | `8081` |

## Structure du projet

```
src/main/java/com/gamel/dashboard/
├── controller/   API REST (DashboardApiController) et pages
├── model/        Entités JPA : User, Booking, Console, Game, Event, FinancialTransaction…
├── repository/   Accès aux données (Spring Data JPA)
└── config/       DemoDataSeeder (données fictives du profil demo)
src/main/resources/
├── static/       Pages HTML, CSS et JavaScript du tableau de bord
├── application.properties        Configuration par variables d'environnement
└── application-demo.properties   Profil démo (H2 en mémoire)
```

## Limites de cette version

- Pas d'authentification : la version en production a un système de connexion, de comptes équipe et de réinitialisation de mot de passe, qui n'est pas inclus ici.
- Les paiements mobile money sont enregistrés manuellement dans le dashboard ; aucune API de paiement n'est appelée.
- À ne pas exposer tel quel sur Internet.

## Auteur

**Crisnel** — [github.com/Crisnel05](https://github.com/Crisnel05)
