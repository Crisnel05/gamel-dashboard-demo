// ============================================================
// EVENTS.JS - Tournament and Event Management
// GAMEL Admin Dashboard
// ============================================================

let allEvents = [];
let allGames = [];
let consoleModels = [];
let allPlayers = [];
let activeFilter = 'all';
let currentViewingEventId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([loadEvents(), loadGamesList(), loadConsoleModels(), loadPlayersList()]);
    initSearch();
});

async function loadEvents() {
    try {
        const res = await fetch(`${API_BASE}/events`);
        allEvents = await res.json();
        renderStats();
        renderEvents();
    } catch (err) {
        console.error("Error loading events:", err);
        showToast("Erreur de chargement des événements", "error");
    }
}

async function loadConsoleModels() {
    try {
        const res = await fetch('/api/dashboard/console-models');
        consoleModels = await res.json();
        populateEventPlatformSelect();
    } catch (e) {
        console.error("Error loading console models:", e);
    }
}

function populateEventPlatformSelect() {
    const sel = document.getElementById('eventPlatform');
    if (!sel) return;
    if (!consoleModels || consoleModels.length === 0) {
        sel.innerHTML = `<option value="">-- Aucune console (Ajoutez d'abord une console dans Consoles) --</option>`;
    } else {
        sel.innerHTML = `<option value="">-- Sélectionner la plateforme --</option>` +
            consoleModels.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
    }
}

async function loadGamesList() {
    try {
        const res = await fetch(`${API_BASE}/games`);
        allGames = await res.json();
        populateEventGameSelect();
    } catch (e) {
        console.error("Error loading games:", e);
    }
}

function populateEventGameSelect() {
    const sel = document.getElementById('eventGame');
    if (!sel) return;
    if (!allGames || allGames.length === 0) {
        sel.innerHTML = `<option value="">-- Aucun jeu (Ajoutez d'abord un jeu dans Catalogue) --</option>`;
    } else {
        sel.innerHTML = `<option value="">-- Sélectionner le jeu --</option>` +
            allGames.map(g => `<option value="${g.name}">${g.name} (${g.console || ''})</option>`).join('');
    }
}

async function loadPlayersList() {
    try {
        const res = await fetch(`${API_BASE}/players`);
        allPlayers = await res.json();
        const select = document.getElementById('selectPlayerToAdd');
        if (select) {
            if (!allPlayers || allPlayers.length === 0) {
                select.innerHTML = `<option value="">-- Aucun joueur enregistré --</option>`;
            } else {
                select.innerHTML = `<option value="">Sélectionner un joueur...</option>` +
                    allPlayers.map(p => `<option value="${p.id}">${p.name} (Niv. ${p.level} • ${p.phone})</option>`).join('');
            }
        }
    } catch (e) {
        console.error("Error loading players:", e);
    }
}

function renderStats() {
    const totalEl = document.getElementById('stat-total-events');
    const activeEl = document.getElementById('stat-active-events');
    const prizesEl = document.getElementById('stat-prizes');
    
    if (totalEl) totalEl.innerText = allEvents.length;
    if (activeEl) {
        const activeCount = allEvents.filter(e => e.status === 'upcoming' || e.status === 'ongoing').length;
        activeEl.innerText = activeCount;
    }
    if (prizesEl) {
        let totalCashprize = 0;
        allEvents.forEach(ev => {
            if (ev.prize) {
                const num = parseInt(ev.prize.replace(/[^0-9]/g, ''), 10);
                if (!isNaN(num)) totalCashprize += num;
            }
        });
        prizesEl.innerText = totalCashprize > 0 ? `${totalCashprize.toLocaleString('fr-FR')} FCFA` : '0 FCFA';
    }
}

function renderEvents() {
    const grid = document.getElementById('eventsGrid');
    if (!grid) return;

    let filtered = allEvents;
    if (activeFilter !== 'all') {
        filtered = filtered.filter(e => e.status === activeFilter);
    }

    const searchInput = document.getElementById('eventSearch');
    if (searchInput && searchInput.value.trim() !== '') {
        const q = searchInput.value.trim().toLowerCase();
        filtered = filtered.filter(e => 
            (e.name && e.name.toLowerCase().includes(q)) ||
            (e.gameName && e.gameName.toLowerCase().includes(q)) ||
            (e.platform && e.platform.toLowerCase().includes(q))
        );
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 48px; background: var(--surface-card); border-radius: 16px; border: 1px dashed var(--glass-border);">
                <i class="fa-solid fa-trophy" style="font-size: 40px; color: var(--text-muted); margin-bottom: 12px;"></i>
                <h3 style="color: var(--text-primary); margin-bottom: 6px;">Aucun événement / tournoi</h3>
                <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 16px;">Créez vos compétitions gaming avec cashprize et gestion des participants.</p>
                <button class="btn btn-primary btn-sm" onclick="openCreateEventModal()">
                    <i class="fa-solid fa-plus"></i> Créer un Tournoi
                </button>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(ev => {
        const participantsCount = ev.participantIds ? ev.participantIds.length : 0;
        const maxP = ev.maxParticipants || 16;
        const pct = Math.min(100, Math.round((participantsCount / maxP) * 100));

        let statusBadge = '<span class="badge-tag status-pending">À venir</span>';
        if (ev.status === 'ongoing') {
            statusBadge = '<span class="badge-tag status-active">En cours</span>';
        } else if (ev.status === 'completed') {
            statusBadge = '<span class="badge-tag status-completed">Terminé</span>';
        }

        const dateStr = ev.date ? new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
        const startTimeStr = ev.startTime ? new Date(ev.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
        const endTimeStr = ev.endTime ? new Date(ev.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';

        return `
            <div class="event-card" style="border-top: 3px solid ${ev.color || 'var(--primary)'};">
                <div>
                    <div class="event-card-top">
                        <div class="event-emoji-wrapper">${ev.emoji || '🏆'}</div>
                        <div class="event-title-group">
                            <div class="event-title">${ev.name}</div>
                            <div class="event-subtitle">${ev.gameName} • <span style="text-transform: uppercase;">${ev.platform || 'PS5'}</span></div>
                        </div>
                        ${statusBadge}
                    </div>

                    <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 12px;">
                        ${ev.description || 'Tournoi officiel organisé au lounge GAMEL.'}
                    </p>

                    <div class="event-meta-grid">
                        <div class="meta-item">
                            <span class="meta-label"><i class="fa-regular fa-calendar"></i> Date</span>
                            <span class="meta-val">${dateStr}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label"><i class="fa-regular fa-clock"></i> Horaire</span>
                            <span class="meta-val">${startTimeStr} - ${endTimeStr}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label"><i class="fa-solid fa-trophy"></i> Cashprize</span>
                            <span class="meta-val prize-highlight">${ev.prize || 'Lots & Trophées'}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label"><i class="fa-solid fa-ticket"></i> Inscription</span>
                            <span class="meta-val">${ev.entryFee ? ev.entryFee.toLocaleString() + ' FCFA' : 'Gratuit'}</span>
                        </div>
                    </div>

                    <div class="participants-progress">
                        <div class="progress-header">
                            <span>Inscriptions</span>
                            <span style="font-weight: 600; color: var(--text-primary);">${participantsCount} / ${maxP} joueurs (${pct}%)</span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${pct}%;"></div>
                        </div>
                    </div>
                </div>

                <div class="event-card-actions">
                    <button class="btn btn-sm btn-outline" style="flex: 1;" onclick="openParticipantsModal('${ev.id}')">
                        <i class="fa-solid fa-users"></i> Inscrits (${participantsCount})
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="openEditEventModal('${ev.id}')">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    ${ev.status === 'upcoming' ? `
                        <button class="btn btn-sm btn-primary" onclick="updateStatus('${ev.id}', 'ongoing')">
                            <i class="fa-solid fa-play"></i> Lancer
                        </button>
                    ` : (ev.status === 'ongoing' ? `
                        <button class="btn btn-sm btn-primary" style="background: #4CAF50;" onclick="updateStatus('${ev.id}', 'completed')">
                            <i class="fa-solid fa-check"></i> Clôturer
                        </button>
                    ` : '')}
                </div>
            </div>
        `;
    }).join('');
}

function filterEvents(status) {
    activeFilter = status;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
    });
    renderEvents();
}

function initSearch() {
    const searchInput = document.getElementById('eventSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => renderEvents());
    }
}

function openCreateEventModal() {
    document.getElementById('eventForm').reset();
    document.getElementById('eventId').value = '';
    document.getElementById('eventModalTitle').innerText = "Nouveau Tournoi";
    document.getElementById('eventDate').value = new Date().toISOString().split('T')[0];
    populateEventGameSelect();
    populateEventPlatformSelect();
    openModal('eventModal');
}

function openEditEventModal(id) {
    const ev = allEvents.find(e => e.id === id);
    if (!ev) return;

    populateEventGameSelect();
    populateEventPlatformSelect();

    document.getElementById('eventId').value = ev.id;
    document.getElementById('eventModalTitle').innerText = "Modifier le Tournoi";
    document.getElementById('eventEmoji').value = ev.emoji || '🏆';
    document.getElementById('eventName').value = ev.name || '';
    document.getElementById('eventGame').value = ev.gameName || '';
    document.getElementById('eventPlatform').value = ev.platform || '';
    document.getElementById('eventDate').value = ev.date || '';
    document.getElementById('eventFee').value = ev.entryFee || 0;
    document.getElementById('eventMaxParticipants').value = ev.maxParticipants || 16;
    document.getElementById('eventStatus').value = ev.status || 'upcoming';
    document.getElementById('eventPrize').value = ev.prize || '';
    document.getElementById('eventDescription').value = ev.description || '';
    document.getElementById('eventRules').value = ev.rules || '';

    openModal('eventModal');
}

async function handleSaveEvent(e) {
    e.preventDefault();
    const id = document.getElementById('eventId').value;
    const dateVal = document.getElementById('eventDate').value;
    const startTimeVal = document.getElementById('eventStartTime').value;
    const endTimeVal = document.getElementById('eventEndTime').value;

    const payload = {
        name: document.getElementById('eventName').value,
        emoji: document.getElementById('eventEmoji').value,
        gameName: document.getElementById('eventGame').value,
        platform: document.getElementById('eventPlatform').value,
        date: dateVal,
        startTime: `${dateVal}T${startTimeVal}:00`,
        endTime: `${dateVal}T${endTimeVal}:00`,
        entryFee: parseFloat(document.getElementById('eventFee').value) || 0,
        maxParticipants: parseInt(document.getElementById('eventMaxParticipants').value) || 16,
        status: document.getElementById('eventStatus').value,
        prize: document.getElementById('eventPrize').value,
        description: document.getElementById('eventDescription').value,
        rules: document.getElementById('eventRules').value
    };

    try {
        let res;
        if (id) {
            res = await fetch(`${API_BASE}/events/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch(`${API_BASE}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (res.ok) {
            showToast(id ? "Tournoi mis à jour" : "Tournoi créé avec succès");
            closeModal('eventModal');
            await loadEvents();
        } else {
            showToast("Erreur lors de l'enregistrement", "error");
        }
    } catch (err) {
        showToast("Erreur réseau", "error");
    }
}

async function updateStatus(id, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/events/${id}/status?status=${newStatus}`, { method: 'PUT' });
        if (res.ok) {
            showToast(`Statut mis à jour : ${newStatus}`);
            await loadEvents();
        }
    } catch (e) {
        showToast("Erreur lors de la mise à jour", "error");
    }
}

// Participants Modal Management
async function openParticipantsModal(eventId) {
    currentViewingEventId = eventId;
    const ev = allEvents.find(e => e.id === eventId);
    if (!ev) return;

    document.getElementById('participantsModalTitle').innerText = `${ev.emoji || '🏆'} ${ev.name}`;
    document.getElementById('participantsModalSub').innerText = `${ev.participantIds ? ev.participantIds.length : 0} inscrits sur ${ev.maxParticipants} max`;

    await loadParticipantsList(eventId);
    openModal('participantsModal');
}

async function loadParticipantsList(eventId) {
    const listEl = document.getElementById('participantsList');
    listEl.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">Chargement des participants...</div>`;

    try {
        const res = await fetch(`${API_BASE}/events/${eventId}/participants`);
        const participants = await res.json();

        if (!participants || participants.length === 0) {
            listEl.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--text-muted);">Aucun joueur inscrit pour le moment.</div>`;
            return;
        }

        listEl.innerHTML = participants.map(p => `
            <div class="participant-item">
                <div class="participant-info">
                    <img src="${p.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.name}`}" class="participant-avatar">
                    <div>
                        <div style="font-weight: 600; color: var(--text-primary); font-size: 14px;">${p.name}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">Niveau ${p.level} • ${p.phone} • ${p.email}</div>
                    </div>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline" style="color: var(--error); border-color: rgba(239,83,80,0.3);" onclick="handleRemoveParticipant('${p.id}')">
                        <i class="fa-solid fa-user-xmark"></i> Désinscrire
                    </button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        listEl.innerHTML = `<div style="color: var(--error); padding: 16px;">Erreur de chargement.</div>`;
    }
}

async function handleAddParticipant() {
    if (!currentViewingEventId) return;
    const userId = document.getElementById('selectPlayerToAdd').value;
    if (!userId) {
        showToast("Veuillez sélectionner un joueur", "warning");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/events/${currentViewingEventId}/participants?userId=${userId}`, { method: 'POST' });
        if (res.ok) {
            showToast("Joueur inscrit avec succès !");
            await loadEvents();
            await loadParticipantsList(currentViewingEventId);
        } else {
            const errData = await res.json();
            showToast(errData.message || "Impossible d'inscrire le joueur", "error");
        }
    } catch (e) {
        showToast("Erreur réseau", "error");
    }
}

async function handleRemoveParticipant(userId) {
    if (!currentViewingEventId) return;
    try {
        const res = await fetch(`${API_BASE}/events/${currentViewingEventId}/participants/${userId}`, { method: 'DELETE' });
        if (res.ok) {
            showToast("Joueur désinscrit");
            await loadEvents();
            await loadParticipantsList(currentViewingEventId);
        }
    } catch (e) {
        showToast("Erreur lors de la désinscription", "error");
    }
}
