// ============================================================
// APP.JS - Shared utilities, Global Search, Notifications, Toasts
// GAMEL Admin Dashboard
// ============================================================

const API_BASE = '/api/dashboard';

// ============================================================
// AUTO-REFRESH SYSTEM — Live Sync des données du dashboard
// ============================================================
const AutoRefresh = (() => {
    let _intervalId    = null;
    let _isPaused      = false;
    let _callback      = null;
    let _intervalMs    = 15000; // default 15s
    let _indicator     = null;
    let _lastSyncEl    = null;

    /** Créer le badge live dans le header */
    function _buildIndicator() {
        if (document.getElementById('autoRefreshBadge')) return;

        const badge = document.createElement('div');
        badge.id = 'autoRefreshBadge';
        badge.title = 'Données synchronisées automatiquement';
        badge.innerHTML = `
            <span class="ar-dot" id="arDot"></span>
            <span id="arLastSync">sync...</span>
        `;
        badge.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 5px 12px;
            background: rgba(37,166,154,0.10);
            border: 1px solid rgba(37,166,154,0.28);
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            color: var(--primary-light, #25a69a);
            cursor: default;
            user-select: none;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes ar-pulse {
                0%   { opacity: 1; transform: scale(1); }
                50%  { opacity: 0.4; transform: scale(0.7); }
                100% { opacity: 1; transform: scale(1); }
            }
            @keyframes ar-spin {
                from { transform: rotate(0deg); }
                to   { transform: rotate(360deg); }
            }
            #arDot {
                display: inline-block;
                width: 8px; height: 8px;
                border-radius: 50%;
                background: var(--primary-light, #25a69a);
                animation: ar-pulse 2s infinite ease-in-out;
                flex-shrink: 0;
            }
            #arDot.syncing {
                background: #f59e0b;
                animation: ar-spin 0.6s linear infinite;
                border-radius: 0;
                clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
            }
            #arDot.paused {
                background: #6b7280;
                animation: none;
            }
            #autoRefreshBadge.paused { opacity: 0.45; }
        `;
        document.head.appendChild(style);

        // Injecter dans le header, avant les autres éléments
        const header = document.querySelector('.top-header');
        if (header) {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'display:flex; align-items:center; gap:8px; margin-left:auto;';

            // Déplacer les enfants actuels de header dans wrapper
            // Cherche les éléments à droite (notifications, actions)
            const actionsEl = header.querySelector('.header-actions');
            if (actionsEl) {
                header.insertBefore(badge, actionsEl);
            } else {
                header.appendChild(badge);
            }
        }

        _indicator  = badge;
        _lastSyncEl = document.getElementById('arLastSync');
    }

    /** Affiche l'heure de dernière synchro */
    function _updateTimestamp() {
        if (!_lastSyncEl) return;
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        _lastSyncEl.textContent = `${h}:${m}:${s}`;
    }

    /** Marque le badge comme "en cours de synchro" */
    function _setSyncing(yes) {
        const dot = document.getElementById('arDot');
        if (!dot) return;
        if (yes) {
            dot.classList.add('syncing');
            dot.classList.remove('paused');
        } else {
            dot.classList.remove('syncing');
            if (_isPaused) dot.classList.add('paused');
        }
    }

    /** Vérifie si un modal est actuellement ouvert */
    function _isModalOpen() {
        return document.querySelector('.modal.active, .modal-overlay.active') !== null;
    }

    /** Lance le polling automatique */
    function start(callback, intervalMs) {
        if (_intervalId) clearInterval(_intervalId);
        _callback    = callback;
        _intervalMs  = intervalMs || 15000;

        // Construire le badge au prochain tick (DOM prêt)
        setTimeout(_buildIndicator, 100);

        _intervalId = setInterval(async () => {
            if (_isPaused || _isModalOpen()) return;
            _setSyncing(true);
            try {
                await _callback();
            } catch (e) { /* silently ignore */ }
            _setSyncing(false);
            _updateTimestamp();
        }, _intervalMs);
    }

    /** Stoppe le polling */
    function stop() {
        if (_intervalId) { clearInterval(_intervalId); _intervalId = null; }
    }

    /** Appel manuel immédiat (bouton refresh) */
    async function syncNow() {
        if (!_callback) return;
        _setSyncing(true);
        try { await _callback(); } catch (e) { /* ignore */ }
        _setSyncing(false);
        _updateTimestamp();
    }

    /** Met à jour le timestamp après un fetch manuel */
    function markSynced() { _updateTimestamp(); }

    return { start, stop, syncNow, markSynced };
})();

// ---- Shared Modal Controls ----
function openModal(modalId) {
    const modalEl = document.getElementById(modalId);
    if (modalEl) {
        modalEl.classList.add('active');
    }
}

function closeModal(modalId) {
    const modalEl = document.getElementById(modalId);
    if (modalEl) {
        modalEl.classList.remove('active');
    }
}

// ---- Toast Notifications ----
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-exclamation' : 'fa-bell');
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ---- Global Search Setup ----
function initGlobalSearch() {
    const searchInput = document.getElementById('globalSearch');
    if (!searchInput) return;

    searchInput.disabled = false;
    searchInput.placeholder = "Rechercher joueur, jeu, tournoi, réservation...";

    let dropdown = document.getElementById('searchResultsDropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'searchResultsDropdown';
        dropdown.className = 'search-results-dropdown';
        searchInput.parentElement.appendChild(dropdown);
    }

    let searchTimeout = null;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const q = e.target.value.trim();
        if (q.length < 2) {
            dropdown.classList.remove('active');
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`);
                const data = await res.json();
                renderSearchResults(data, dropdown);
            } catch (err) {
                console.error("Search error:", err);
            }
        }, 250);
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.parentElement.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
}

function renderSearchResults(data, dropdown) {
    let html = '';
    let totalFound = 0;

    if (data.players && data.players.length > 0) {
        totalFound += data.players.length;
        html += `<div class="search-section-title"><i class="fa-solid fa-users"></i> Joueurs</div>`;
        data.players.forEach(p => {
            html += `
                <a href="players.html" class="search-result-item">
                    <div>
                        <div class="item-title">${p.name}</div>
                        <div class="item-sub">Niveau ${p.level} • ${p.phone} • ${p.email}</div>
                    </div>
                    <span class="badge-tag">Joueur</span>
                </a>
            `;
        });
    }

    if (data.events && data.events.length > 0) {
        totalFound += data.events.length;
        html += `<div class="search-section-title"><i class="fa-solid fa-trophy"></i> Tournois & Événements</div>`;
        data.events.forEach(ev => {
            html += `
                <a href="events.html" class="search-result-item">
                    <div>
                        <div class="item-title">${ev.emoji || '🏆'} ${ev.name}</div>
                        <div class="item-sub">${ev.gameName} • Cashprize: ${ev.prize || 'N/A'}</div>
                    </div>
                    <span class="badge-tag">${ev.status}</span>
                </a>
            `;
        });
    }

    if (data.games && data.games.length > 0) {
        totalFound += data.games.length;
        html += `<div class="search-section-title"><i class="fa-solid fa-gamepad"></i> Jeux</div>`;
        data.games.forEach(g => {
            html += `
                <a href="games.html" class="search-result-item">
                    <div>
                        <div class="item-title">${g.name}</div>
                        <div class="item-sub">${g.genre} • ${g.console.toUpperCase()} • ${g.pricePerHour} FCFA/h</div>
                    </div>
                    <span class="badge-tag">Jeu</span>
                </a>
            `;
        });
    }

    if (data.bookings && data.bookings.length > 0) {
        totalFound += data.bookings.length;
        html += `<div class="search-section-title"><i class="fa-solid fa-calendar-check"></i> Réservations</div>`;
        data.bookings.forEach(b => {
            html += `
                <a href="bookings.html" class="search-result-item">
                    <div>
                        <div class="item-title">#${b.id} - ${b.userName}</div>
                        <div class="item-sub">${b.gameName} sur ${b.posteName || b.consoleName}</div>
                    </div>
                    <span class="badge-tag">${b.status}</span>
                </a>
            `;
        });
    }

    if (totalFound === 0) {
        html = `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px;">Aucun résultat trouvé</div>`;
    }

    dropdown.innerHTML = html;
    dropdown.classList.add('active');
}

// ---- Notifications Popover Setup (Enhanced Notification Center) ----
let _notificationsCache = [];
let _currentNotifFilter = 'all';
let _lastUnreadCount = -1;

function initNotificationsCenter() {
    const bellBtn = document.querySelector('.notification-bell');
    if (!bellBtn) return;

    // Ensure bell button has numeric badge element
    let countBadge = bellBtn.querySelector('.notif-badge-count');
    if (!countBadge) {
        countBadge = document.createElement('span');
        countBadge.className = 'notif-badge-count';
        countBadge.id = 'notifBadgeCount';
        countBadge.textContent = '0';
        bellBtn.appendChild(countBadge);
    }

    // Build or update dropdown
    let notifDropdown = document.getElementById('notificationsDropdown');
    if (!notifDropdown) {
        notifDropdown = document.createElement('div');
        notifDropdown.id = 'notificationsDropdown';
        notifDropdown.className = 'notifications-dropdown';
        notifDropdown.innerHTML = `
            <div class="notif-header">
                <div class="notif-header-left">
                    <h4 class="notif-header-title"><i class="fa-solid fa-bell"></i> Notifications</h4>
                    <span class="notif-count-pill" id="notifHeaderPill">0 non lues</span>
                </div>
                <div class="notif-actions">
                    <button class="notif-btn-text" id="notifBroadcastBtn" title="Envoyer une annonce ou alerte aux joueurs">
                        <i class="fa-solid fa-paper-plane"></i> Diffuser
                    </button>
                    <button class="notif-btn-icon" id="markAllReadBtn" title="Tout marquer comme lu">
                        <i class="fa-solid fa-check-double"></i>
                    </button>
                    <button class="notif-btn-icon" id="clearReadBtn" title="Nettoyer les notifications lues">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                    <button class="notif-btn-icon" id="closeNotifBtn" title="Fermer">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>

            <!-- Segmented filter tabs -->
            <div class="notif-tabs" id="notifTabs">
                <button class="notif-tab active" data-filter="all">Toutes</button>
                <button class="notif-tab" data-filter="unread">Non lues</button>
                <button class="notif-tab" data-filter="booking">Réservations</button>
                <button class="notif-tab" data-filter="tournament">Tournois</button>
                <button class="notif-tab" data-filter="system">Système & XP</button>
            </div>

            <!-- Notifications list container -->
            <div class="notif-list" id="notifList">
                <div style="padding: 30px; text-align: center; color: var(--text-muted); font-size: 13px;">
                    <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 20px; color: var(--primary); margin-bottom: 8px; display: block;"></i>
                    Chargement des notifications...
                </div>
            </div>

            <!-- Dropdown footer -->
            <div class="notif-footer">
                <span><i class="fa-solid fa-bolt" style="color: var(--primary); margin-right: 4px;"></i> Sync en direct</span>
                <button id="notifRefreshBtn" title="Actualiser"><i class="fa-solid fa-rotate-right"></i> Actualiser</button>
            </div>
        `;

        // Anchor properly inside the header profile
        const headerProfile = bellBtn.closest('.header-profile') || bellBtn.parentElement;
        headerProfile.appendChild(notifDropdown);

        // Inject Broadcast Modal into DOM if not present
        injectBroadcastModal();
    }

    // Toggle Dropdown
    bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = notifDropdown.classList.toggle('active');
        bellBtn.classList.toggle('active', isOpen);
        if (isOpen) {
            loadNotifications();
        }
    });

    // Close Dropdown button
    const closeBtn = document.getElementById('closeNotifBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifDropdown.classList.remove('active');
            bellBtn.classList.remove('active');
        });
    }

    // Prevent closing when clicking inside dropdown
    notifDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!notifDropdown.contains(e.target) && !bellBtn.contains(e.target)) {
            notifDropdown.classList.remove('active');
            bellBtn.classList.remove('active');
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && notifDropdown.classList.contains('active')) {
            notifDropdown.classList.remove('active');
            bellBtn.classList.remove('active');
        }
    });

    // Filter tabs click handling
    const tabBtns = notifDropdown.querySelectorAll('.notif-tab');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            _currentNotifFilter = btn.getAttribute('data-filter') || 'all';
            renderNotificationsList();
        });
    });

    // Mark All Read
    const markAllBtn = document.getElementById('markAllReadBtn');
    if (markAllBtn) {
        markAllBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                await fetch(`${API_BASE}/notifications/read-all`, { method: 'PUT' });
                showToast("Toutes les notifications sont marquées comme lues", "info");
                // Optimistic update in cache
                _notificationsCache.forEach(n => { n.read = true; n.isRead = true; });
                renderNotificationsList();
                updateNotificationBadgeUI();
            } catch (err) {
                console.error("Error marking all read:", err);
            }
        });
    }

    // Clear Read Notifications
    const clearReadBtn = document.getElementById('clearReadBtn');
    if (clearReadBtn) {
        clearReadBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                await fetch(`${API_BASE}/notifications/clear-read`, { method: 'DELETE' });
                showToast("Notifications lues supprimées", "info");
                loadNotifications();
            } catch (err) {
                console.error("Error clearing read notifications:", err);
            }
        });
    }

    // Refresh notifications manually
    const refreshBtn = document.getElementById('notifRefreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            loadNotifications();
        });
    }

    // Open Broadcast Modal
    const broadcastBtn = document.getElementById('notifBroadcastBtn');
    if (broadcastBtn) {
        broadcastBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifDropdown.classList.remove('active');
            bellBtn.classList.remove('active');
            openBroadcastModal();
        });
    }

    // Initial badge update
    updateNotificationBadge();
}

/** Formate les dates de façon naturelle et relative */
function formatNotifRelativeTime(dateStr) {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        const now = new Date();
        const diffSec = Math.floor((now - date) / 1000);

        if (diffSec < 45) return "À l'instant";
        if (diffSec < 3600) return `Il y a ${Math.max(1, Math.floor(diffSec / 60))} min`;
        if (diffSec < 86400) {
            const h = Math.floor(diffSec / 3600);
            return `Il y a ${h}h`;
        }
        if (diffSec < 172800) return "Hier";
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch (e) {
        return '';
    }
}

/** Audio chime via Web Audio API synth (léger, sans dépendance externe) */
function playNotifChime() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // Ré5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // La5

        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.32);
    } catch (e) {
        // Ignorer si audio context est bloqué par le navigateur
    }
}

/** Met à jour les éléments visuels du badge (dot et compteur) */
function updateNotificationBadgeUI() {
    const unreadCount = _notificationsCache.filter(n => !n.read && !n.isRead).length;

    const badgeDot = document.querySelector('.notification-bell .badge-dot');
    const badgeCount = document.getElementById('notifBadgeCount');
    const headerPill = document.getElementById('notifHeaderPill');

    if (badgeCount) {
        if (unreadCount > 0) {
            badgeCount.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badgeCount.style.display = 'block';
        } else {
            badgeCount.style.display = 'none';
        }
    }

    if (badgeDot) {
        badgeDot.style.display = unreadCount > 0 ? 'block' : 'none';
    }

    if (headerPill) {
        headerPill.textContent = unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'À jour';
        headerPill.style.color = unreadCount > 0 ? 'var(--primary-light)' : 'var(--text-muted)';
    }

    // Play chime and toast if new unread notifications arrived while viewing
    if (_lastUnreadCount !== -1 && unreadCount > _lastUnreadCount) {
        playNotifChime();
        const newest = _notificationsCache.find(n => !n.read && !n.isRead);
        if (newest) {
            showToast(`Nouvelle alerte : ${newest.title || 'Activité GAMEL'}`, 'info');
        }
    }
    _lastUnreadCount = unreadCount;
}

/** Charge les notifications depuis l'API */
async function loadNotifications() {
    const listEl = document.getElementById('notifList');
    if (!listEl) return;

    try {
        const res = await fetch(`${API_BASE}/notifications`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        _notificationsCache = Array.isArray(data) ? data : [];
        renderNotificationsList();
        updateNotificationBadgeUI();
    } catch (e) {
        console.error("Error loading notifications:", e);
        if (listEl) {
            listEl.innerHTML = `
                <div style="padding: 24px; text-align: center; color: var(--error); font-size: 12px;">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size: 20px; margin-bottom: 6px; display: block;"></i>
                    Impossible de charger les notifications
                </div>
            `;
        }
    }
}

/** Actualise l'état du badge de notifications */
async function updateNotificationBadge() {
    try {
        const res = await fetch(`${API_BASE}/notifications`);
        if (!res.ok) return;
        const data = await res.json();
        _notificationsCache = Array.isArray(data) ? data : [];
        updateNotificationBadgeUI();
    } catch (e) {
        console.error("Error updating notification badge:", e);
    }
}

/** Restitue la liste des notifications selon le filtre sélectionné */
function renderNotificationsList() {
    const listEl = document.getElementById('notifList');
    if (!listEl) return;

    let items = _notificationsCache;

    // Filtrage
    if (_currentNotifFilter === 'unread') {
        items = items.filter(n => !n.read && !n.isRead);
    } else if (_currentNotifFilter === 'booking') {
        items = items.filter(n => (n.type || '').toLowerCase() === 'booking');
    } else if (_currentNotifFilter === 'tournament') {
        items = items.filter(n => (n.type || '').toLowerCase() === 'tournament');
    } else if (_currentNotifFilter === 'system') {
        items = items.filter(n => {
            const t = (n.type || '').toLowerCase();
            return t === 'level' || t === 'rental' || t === 'promotion' || t === 'system' || t === 'alert';
        });
    }

    if (items.length === 0) {
        listEl.innerHTML = `
            <div class="notif-empty">
                <div class="notif-empty-icon"><i class="fa-solid fa-check"></i></div>
                <div class="notif-empty-title">Aucune notification</div>
                <div class="notif-empty-subtitle">Vous êtes parfaitement à jour !</div>
            </div>
        `;
        return;
    }

    let html = '';
    items.slice(0, 30).forEach(n => {
        const isUnread = !n.read && !n.isRead;
        const type = (n.type || 'default').toLowerCase();

        let iconName = 'fa-bell';
        let typeCategory = 'default';

        if (type === 'booking') {
            iconName = 'fa-calendar-check';
            typeCategory = 'booking';
        } else if (type === 'tournament') {
            iconName = 'fa-trophy';
            typeCategory = 'tournament';
        } else if (type === 'level') {
            iconName = 'fa-bolt';
            typeCategory = 'level';
        } else if (type === 'rental') {
            iconName = 'fa-box-archive';
            typeCategory = 'rental';
        } else if (type === 'promotion') {
            iconName = 'fa-tag';
            typeCategory = 'promotion';
        }

        const timeStr = formatNotifRelativeTime(n.createdAt);

        html += `
            <div class="notif-item ${isUnread ? 'unread' : ''}" data-id="${n.id}" onclick="handleNotifClick('${n.id}', '${type}')">
                <div class="notif-icon-box ${typeCategory}">
                    <i class="fa-solid ${iconName}"></i>
                </div>
                <div class="notif-content">
                    <div class="notif-title-row">
                        <span class="notif-title">${escapeNotifHTML(n.title || 'Notification')}</span>
                        <span class="notif-time">${timeStr}</span>
                    </div>
                    <div class="notif-msg">${escapeNotifHTML(n.message || '')}</div>
                    <div class="notif-item-actions">
                        ${isUnread ? `<button class="notif-action-btn" onclick="event.stopPropagation(); markNotifRead('${n.id}')" title="Marquer lu"><i class="fa-solid fa-check"></i> Lu</button>` : ''}
                        <button class="notif-action-btn" onclick="event.stopPropagation(); deleteNotifItem('${n.id}')" title="Supprimer"><i class="fa-regular fa-trash-can"></i></button>
                    </div>
                </div>
            </div>
        `;
    });

    listEl.innerHTML = html;
}

function escapeNotifHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[m]);
}

/** Clic sur une notification : marquer comme lu et redirection contextuelle si pertinente */
async function handleNotifClick(id, type) {
    await markNotifRead(id);
    if (type === 'booking' && !window.location.pathname.includes('bookings.html')) {
        window.location.href = 'bookings.html';
    } else if (type === 'tournament' && !window.location.pathname.includes('events.html')) {
        window.location.href = 'events.html';
    } else if (type === 'rental' && !window.location.pathname.includes('rentals.html')) {
        window.location.href = 'rentals.html';
    }
}

/** Marquer une notification comme lue */
async function markNotifRead(id) {
    try {
        // Optimistic UI update
        const item = _notificationsCache.find(n => n.id === id);
        if (item) {
            item.read = true;
            item.isRead = true;
        }
        renderNotificationsList();
        updateNotificationBadgeUI();

        await fetch(`${API_BASE}/notifications/${id}/read`, { method: 'PUT' });
    } catch (e) {
        console.error("Error marking notif read:", e);
    }
}

/** Supprimer une notification */
async function deleteNotifItem(id) {
    try {
        _notificationsCache = _notificationsCache.filter(n => n.id !== id);
        renderNotificationsList();
        updateNotificationBadgeUI();

        await fetch(`${API_BASE}/notifications/${id}`, { method: 'DELETE' });
        showToast("Notification retirée", "info");
    } catch (e) {
        console.error("Error deleting notification:", e);
    }
}

/** Modal d'envoi / diffusion de notification par l'administrateur */
function injectBroadcastModal() {
    if (document.getElementById('notifBroadcastModal')) return;

    const modal = document.createElement('div');
    modal.id = 'notifBroadcastModal';
    modal.className = 'notif-broadcast-modal';
    modal.innerHTML = `
        <div class="notif-broadcast-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px;">
                <h3 style="font-size: 16px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-paper-plane" style="color: var(--primary);"></i> Diffuser une Notification
                </h3>
                <button class="notif-btn-icon" id="closeBroadcastModalBtn" style="font-size: 15px;"><i class="fa-solid fa-xmark"></i></button>
            </div>
            
            <form id="broadcastNotifForm" style="display: flex; flex-direction: column; gap: 14px;">
                <div>
                    <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Type de notification</label>
                    <select id="broadcastType" class="form-control" style="width: 100%; padding: 8px 12px; background: var(--surface-elevated); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); color: #fff;">
                        <option value="promotion">📢 Annonce / Promotion</option>
                        <option value="booking">🎮 Réservation & Session</option>
                        <option value="tournament">🏆 Tournoi Esport</option>
                        <option value="level">⚡ Récompense & XP</option>
                    </select>
                </div>

                <div>
                    <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Titre de l'alerte</label>
                    <input type="text" id="broadcastTitle" required placeholder="Ex: Happy Hour Gaming ce soir !" class="form-control" style="width: 100%; padding: 8px 12px; background: var(--surface-elevated); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); color: #fff;">
                </div>

                <div>
                    <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px;">Message</label>
                    <textarea id="broadcastMessage" required rows="3" placeholder="Message diffusé à tous les joueurs..." class="form-control" style="width: 100%; padding: 8px 12px; background: var(--surface-elevated); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); color: #fff; resize: vertical;"></textarea>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
                    <button type="button" class="btn btn-secondary" id="cancelBroadcastBtn" style="padding: 8px 16px; font-size: 13px;">Annuler</button>
                    <button type="submit" class="btn btn-primary" id="submitBroadcastBtn" style="padding: 8px 18px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-paper-plane"></i> Envoyer
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    const closeBtn = document.getElementById('closeBroadcastModalBtn');
    const cancelBtn = document.getElementById('cancelBroadcastBtn');
    const form = document.getElementById('broadcastNotifForm');

    const closeModal = () => modal.classList.remove('active');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('submitBroadcastBtn');
            const title = document.getElementById('broadcastTitle').value.trim();
            const message = document.getElementById('broadcastMessage').value.trim();
            const type = document.getElementById('broadcastType').value;

            if (!title || !message) return;

            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Envoi...`;
                }

                const params = new URLSearchParams();
                params.append('title', title);
                params.append('message', message);
                params.append('type', type);

                const res = await fetch(`${API_BASE}/notifications/broadcast`, {
                    method: 'POST',
                    body: params
                });

                if (res.ok) {
                    showToast("Notification diffusée à tous les joueurs !", "success");
                    form.reset();
                    closeModal();
                    loadNotifications();
                } else {
                    showToast("Erreur lors de l'envoi", "error");
                }
            } catch (err) {
                showToast("Erreur réseau", "error");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Envoyer`;
                }
            }
        });
    }
}

function openBroadcastModal() {
    const modal = document.getElementById('notifBroadcastModal');
    if (modal) {
        modal.classList.add('active');
        const titleInput = document.getElementById('broadcastTitle');
        if (titleInput) titleInput.focus();
    }
}

// ---- Mobile Navigation Drawer Setup ----
function initMobileNavigation() {
    const topHeader = document.querySelector('.top-header');
    const sidebar = document.querySelector('.sidebar');
    if (!topHeader || !sidebar) return;

    let toggleBtn = document.getElementById('mobileMenuToggle');
    if (!toggleBtn) {
        toggleBtn = document.createElement('button');
        toggleBtn.id = 'mobileMenuToggle';
        toggleBtn.className = 'mobile-menu-btn';
        toggleBtn.setAttribute('aria-label', 'Menu mobile');
        toggleBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
        topHeader.insertBefore(toggleBtn, topHeader.firstChild);
    }

    let backdrop = document.getElementById('sidebarBackdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'sidebarBackdrop';
        backdrop.className = 'sidebar-backdrop';
        document.body.appendChild(backdrop);
    }

    const toggleSidebar = (show) => {
        const isActive = show !== undefined ? show : !sidebar.classList.contains('mobile-open');
        if (isActive) {
            sidebar.classList.add('mobile-open');
            backdrop.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            sidebar.classList.remove('mobile-open');
            backdrop.classList.remove('active');
            document.body.style.overflow = '';
        }
    };

    toggleBtn.onclick = (e) => {
        e.stopPropagation();
        toggleSidebar();
    };

    backdrop.onclick = () => toggleSidebar(false);

    sidebar.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 992) {
                toggleSidebar(false);
            }
        });
    });
}

// ---- General Initialization ----
document.addEventListener('DOMContentLoaded', () => {
    // Current date
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        dateEl.innerText = new Date().toLocaleDateString('fr-FR', dateOptions);
    }

    initMobileNavigation();
    initGlobalSearch();
    initNotificationsCenter();

    // Poll badge every 30s for live badge updates (lightweight)
    setInterval(() => {
        updateNotificationBadge();
    }, 30000);
});

