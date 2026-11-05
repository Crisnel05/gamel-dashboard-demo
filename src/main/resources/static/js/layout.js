// ============================================================
// LAYOUT.JS - Shared Layout Component & Navigation Manager
// GAMEL Admin Dashboard
// ============================================================

const GamelLayout = (() => {
    const MENU_ITEMS = [
        { id: 'index',     href: 'index.html',     label: 'Dashboard',        icon: 'fa-solid fa-chart-simple' },
        { id: 'bookings',  href: 'bookings.html',  label: 'Réservations',     icon: 'fa-solid fa-calendar-check' },
        { id: 'consoles',  href: 'consoles.html',  label: 'Consoles',         icon: 'fa-solid fa-desktop' },
        { id: 'players',   href: 'players.html',   label: 'Joueurs',          icon: 'fa-solid fa-users' },
        { id: 'events',    href: 'events.html',    label: 'Tournois',         icon: 'fa-solid fa-trophy' },
        { id: 'games',     href: 'games.html',     label: 'Catalogue Jeux',   icon: 'fa-solid fa-dice-d20' },
        { id: 'rentals',   href: 'rentals.html',   label: 'Locations',        icon: 'fa-solid fa-box-archive' },
        { id: 'finance',   href: 'finance.html',   label: 'Finance & Caisse', icon: 'fa-solid fa-coins' }
    ];

    /** Détecte la page active en fonction de l'URL ou du dataset */
    function detectActivePage() {
        const bodyPage = document.body.getAttribute('data-page');
        if (bodyPage) return bodyPage;

        const path = window.location.pathname;
        const pageMatch = path.substring(path.lastIndexOf('/') + 1).replace('.html', '');
        if (!pageMatch || pageMatch === '' || pageMatch === 'index') {
            return 'index';
        }
        return pageMatch;
    }

    /** Génère le HTML de la sidebar avec le logo officiel */
    function buildSidebarHTML(activePage) {
        const linksHtml = MENU_ITEMS.map(item => {
            const isActive = (item.id === activePage);
            return `
            <a href="${item.href}" class="menu-item${isActive ? ' active' : ''}" data-nav="${item.id}">
                <i class="${item.icon}"></i> ${item.label}
            </a>`;
        }).join('\n');

        return `
    <a href="index.html" class="sidebar-logo" title="GAMEL Dashboard - Accueil">
        <img src="images/logo.png" alt="GAMEL" class="sidebar-logo-img">
    </a>
    <nav class="sidebar-menu">
${linksHtml}
    </nav>
    <div class="sidebar-footer">
        <p>GAMEL Admin v1.0</p>
    </div>`;
    }

    /** Initialise ou met à jour le layout (sidebar et branding) */
    function init(options = {}) {
        const activePage = options.activePage || detectActivePage();

        // 1. Chercher le conteneur du layout (placeholder ou aside existant)
        const container = document.getElementById('sidebar-container');
        let aside = document.querySelector('aside.sidebar');

        if (container) {
            // Remplacer le placeholder par la sidebar
            container.innerHTML = `<aside class="sidebar" id="mainSidebar">${buildSidebarHTML(activePage)}</aside>`;
            aside = container.querySelector('aside.sidebar');
        } else if (aside) {
            // Mettre à jour la sidebar existante pour garantir la présence du logo et du bon menu
            const existingLogo = aside.querySelector('.sidebar-logo');
            if (existingLogo) {
                existingLogo.innerHTML = `<img src="images/logo.png" alt="GAMEL" class="sidebar-logo-img">`;
                if (existingLogo.tagName !== 'A') {
                    existingLogo.outerHTML = `<a href="index.html" class="sidebar-logo" title="GAMEL Dashboard - Accueil"><img src="images/logo.png" alt="GAMEL" class="sidebar-logo-img"></a>`;
                }
            }

            // Mettre à jour la classe active sur les liens
            aside.querySelectorAll('.menu-item').forEach(link => {
                const href = link.getAttribute('href') || '';
                const navId = link.getAttribute('data-nav') || href.replace('.html', '');
                if (navId === activePage || href.includes(activePage + '.html')) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        }

        // 2. Favicon dynamique si non déjà présent
        if (!document.querySelector("link[rel*='icon']")) {
            const favicon = document.createElement('link');
            favicon.rel = 'icon';
            favicon.type = 'image/png';
            favicon.href = 'images/logo.png';
            document.head.appendChild(favicon);
        }

        // 3. Logo discret en entête mobile
        injectMobileHeaderBrand();
    }

    /** Ajoute un mini logo GAMEL dans le top-header sur mobile */
    function injectMobileHeaderBrand() {
        const topHeader = document.querySelector('.top-header');
        if (!topHeader || document.getElementById('mobileHeaderBrand')) return;

        const brand = document.createElement('a');
        brand.id = 'mobileHeaderBrand';
        brand.href = 'index.html';
        brand.className = 'mobile-header-brand';
        brand.innerHTML = `<img src="images/logo.png" alt="GAMEL" class="mobile-logo-img">`;
        
        // Insérer après le bouton hamburger si présent, sinon au début
        const mobileToggle = document.getElementById('mobileMenuToggle');
        if (mobileToggle && mobileToggle.nextSibling) {
            topHeader.insertBefore(brand, mobileToggle.nextSibling);
        } else {
            topHeader.insertBefore(brand, topHeader.firstChild);
        }
    }

    return { init, detectActivePage, buildSidebarHTML };
})();

// Auto-exécution dès que le DOM est chargé
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => GamelLayout.init());
} else {
    GamelLayout.init();
}
