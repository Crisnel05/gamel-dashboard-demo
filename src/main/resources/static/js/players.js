// ============================================================
// PLAYERS.JS - Communauté des Joueurs: CRUD, 360 profile, XP & Badge
// GAMEL Admin Dashboard
// ============================================================

let playersData = [];
let selectedPlayerId = null;
let avatarPresetsData = [];
let activeAvatarCategory = 'all';
let currentAvatarPickerTarget = 'new'; // 'new' or 'edit'

// ---- Initialization ----
document.addEventListener('DOMContentLoaded', () => {
    fetchPlayers();
    fetchAvatarPresets();
    // Auto-refresh : met à jour la liste des joueurs toutes les 30 secondes
    AutoRefresh.start(fetchPlayers, 30000);
});

// ---- Fetch Avatar Presets from Database ----
async function fetchAvatarPresets() {
    try {
        const response = await fetch('/api/dashboard/avatars');
        if (response.ok) {
            avatarPresetsData = await response.json();
        }
    } catch (e) {
        console.error('[Players] Error fetching avatar presets:', e);
    }
}

// ---- Fetch All Players ----
async function fetchPlayers() {
    try {
        const res = await fetch('/api/dashboard/players');
        if (!res.ok) throw new Error('Erreur réseau');
        playersData = await res.json();
        AutoRefresh.markSynced();
        const countEl = document.getElementById('playersCount');
        if (countEl) countEl.innerText = playersData.length;
        renderPlayersGrid(playersData);
    } catch (error) {
        console.error('[Players] Error fetching players:', error);
    }
}

// ---- Render Players Grid ----
function renderPlayersGrid(players) {
    const grid = document.getElementById('playersGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!players || players.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 48px; background: var(--surface-card); border-radius: 16px; border: 1px dashed var(--glass-border);">
                <i class="fa-solid fa-users-slash" style="font-size: 40px; color: var(--text-muted); margin-bottom: 12px;"></i>
                <h3 style="color: var(--text-primary); margin-bottom: 6px;">Aucun joueur inscrit</h3>
                <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 16px;">La base est actuellement vide. Créez votre premier profil gamer !</p>
                <button class="btn btn-primary btn-sm" onclick="openCreatePlayerModal()">
                    <i class="fa-solid fa-user-plus"></i> Ajouter un Joueur
                </button>
            </div>
        `;
        return;
    }

    players.forEach(p => {
        const avatarUrl = p.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.name.replace(/\s+/g, '')}`;

        let badgesHtml = '';
        if (p.badges && p.badges.length > 0) {
            p.badges.forEach(b => {
                badgesHtml += `<span class="badge-item">${b}</span>`;
            });
        } else {
            badgesHtml = '<span class="text-muted" style="font-size: 11px;">Aucun badge</span>';
        }

        const xpPct = Math.min(100, Math.round((p.xp / (p.maxXp || 1000)) * 100));

        const card = document.createElement('div');
        card.className = 'player-card';
        card.innerHTML = `
            <div class="player-level-badge">LVL ${p.level}</div>
            <div class="player-header">
                <img src="${avatarUrl}" alt="Avatar de ${p.name}" class="player-avatar">
                <div class="player-meta">
                    <h3>${p.name}</h3>
                    <span>${p.phone} • ${p.email}</span>
                </div>
            </div>
            <div class="player-body">
                <div class="player-xp-section">
                    <div class="player-xp-text">
                        <span>XP: ${p.xp}/${p.maxXp}</span>
                        <span>${xpPct}%</span>
                    </div>
                    <div class="player-xp-track">
                        <div class="player-xp-bar" style="width: ${xpPct}%"></div>
                    </div>
                </div>
                <div>
                    <div class="player-badges-label">Badges Débloqués</div>
                    <div class="player-badges-list">${badgesHtml}</div>
                </div>
            </div>
            <div class="player-actions" style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="openPlayerProfileModal('${p.id}')">
                    <i class="fa-solid fa-id-card"></i> 360°
                </button>
                <button class="btn btn-secondary btn-sm" onclick="openEditPlayerModal('${p.id}')" title="Modifier">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn btn-secondary btn-sm" onclick="openXpModal('${p.id}', '${p.name.replace(/'/g, "\\'")}')" title="Attribuer XP">
                    +XP
                </button>
                <button class="btn btn-secondary btn-sm" onclick="openBadgeModal('${p.id}', '${p.name.replace(/'/g, "\\'")}')" title="Décerner Badge">
                    <i class="fa-solid fa-award"></i>
                </button>
                <button class="btn btn-icon cancel" onclick="deletePlayer('${p.id}', '${p.name.replace(/'/g, "\\'")}')" title="Supprimer" style="width: 32px; height: 32px;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ---- Search Filter ----
function handleLocalSearch() {
    const q = document.getElementById('playerLocalSearch').value.toLowerCase().trim();
    if (!q) {
        renderPlayersGrid(playersData);
    } else {
        const filtered = playersData.filter(p =>
            (p.name && p.name.toLowerCase().includes(q)) ||
            (p.phone && p.phone.toLowerCase().includes(q)) ||
            (p.email && p.email.toLowerCase().includes(q))
        );
        renderPlayersGrid(filtered);
    }
}

// ---- Avatar & Photo Helpers ----
function updateDefaultNewAvatar(name) {
    const seed = name.trim() || 'gamer';
    const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
    const preview = document.getElementById('newPlayerAvatarPreview');
    if (preview) preview.src = url;
}

function updateNewAvatarPreview() {
    const url = document.getElementById('newPlayerAvatarUrl').value.trim();
    const preview = document.getElementById('newPlayerAvatarPreview');
    if (url && preview) {
        preview.src = url;
    }
}

function updateEditAvatarPreview() {
    const url = document.getElementById('editPlayerAvatarUrl').value.trim();
    const preview = document.getElementById('editPlayerAvatarPreview');
    if (url && preview) {
        preview.src = url;
    }
}

function setNewPlayerAvatarPreset(style, seed) {
    const s = seed || document.getElementById('newPlayerName').value.trim() || 'gamer';
    const url = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(s)}`;
    document.getElementById('newPlayerAvatarUrl').value = url;
    document.getElementById('newPlayerAvatarPreview').src = url;
}

function setEditPlayerAvatarPreset(style) {
    const name = document.getElementById('editPlayerName').value.trim() || 'player';
    const url = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(name)}`;
    document.getElementById('editPlayerAvatarUrl').value = url;
    document.getElementById('editPlayerAvatarPreview').src = url;
}

function handleAvatarFileUpload(event, target) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast("Veuillez sélectionner un fichier image valide", "error");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        if (target === 'new') {
            document.getElementById('newPlayerAvatarUrl').value = base64;
            document.getElementById('newPlayerAvatarPreview').src = base64;
        } else {
            document.getElementById('editPlayerAvatarUrl').value = base64;
            document.getElementById('editPlayerAvatarPreview').src = base64;
        }
        showToast("Photo chargée avec succès !");
    };
    reader.readAsDataURL(file);
}

// ---- Avatar Gallery Modal ----
async function openAvatarGalleryModal(target) {
    currentAvatarPickerTarget = target || 'new';
    if (!avatarPresetsData || avatarPresetsData.length === 0) {
        await fetchAvatarPresets();
    }
    filterAvatarGallery('all');
    openModal('avatarGalleryModal');
}

function filterAvatarGallery(category) {
    activeAvatarCategory = category;
    document.querySelectorAll('#avatarCategoryFilters .filter-btn').forEach(btn => {
        const text = btn.innerText;
        if (category === 'all' && text.includes('Tous')) btn.classList.add('active');
        else if (category !== 'all' && text.includes(category)) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    renderAvatarPresetsGrid();
}

function renderAvatarPresetsGrid() {
    const grid = document.getElementById('avatarPresetsGrid');
    if (!grid) return;

    let list = avatarPresetsData;
    if (activeAvatarCategory !== 'all') {
        list = list.filter(a => a.category && a.category.toLowerCase() === activeAvatarCategory.toLowerCase());
    }

    if (!list || list.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 20px;">Aucun avatar dans cette catégorie.</div>`;
        return;
    }

    grid.innerHTML = list.map(a => `
        <div class="avatar-preset-card" onclick="selectAvatarFromGallery('${a.imageUrl}')" style="display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 10px; background: var(--surface-elevated); border: 1px solid var(--glass-border); border-radius: 12px; cursor: pointer; transition: var(--transition); text-align: center;">
            <img src="${a.imageUrl}" alt="${a.name}" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; background: rgba(0,0,0,0.25); border: 2px solid transparent;">
            <span style="font-size: 11px; font-weight: 600; color: var(--text-primary); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${a.name}</span>
            <span style="font-size: 9px; color: var(--primary-light); background: rgba(37,166,154,0.1); padding: 2px 6px; border-radius: 10px;">${a.category}</span>
        </div>
    `).join('');
}

function selectAvatarFromGallery(imageUrl) {
    if (currentAvatarPickerTarget === 'new') {
        document.getElementById('newPlayerAvatarUrl').value = imageUrl;
        document.getElementById('newPlayerAvatarPreview').src = imageUrl;
    } else {
        document.getElementById('editPlayerAvatarUrl').value = imageUrl;
        document.getElementById('editPlayerAvatarPreview').src = imageUrl;
    }
    showToast("Avatar sélectionné !");
    closeModal('avatarGalleryModal');
}

// ---- Create Player Modal ----
function openCreatePlayerModal() {
    document.getElementById('createPlayerForm').reset();
    document.getElementById('newPlayerAvatarUrl').value = '';
    document.getElementById('newPlayerAvatarPreview').src = 'https://api.dicebear.com/7.x/bottts/svg?seed=gamer';
    openModal('createPlayerModal');
}

async function handleCreatePlayer(e) {
    e.preventDefault();

    const avatarUrl = document.getElementById('newPlayerAvatarUrl').value.trim();
    const name = document.getElementById('newPlayerName').value.trim();

    const payload = {
        name,
        email: document.getElementById('newPlayerEmail').value.trim(),
        phone: document.getElementById('newPlayerPhone').value.trim(),
        role: document.getElementById('newPlayerRole').value,
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || 'gamer')}`,
        pin: document.getElementById('newPlayerPin').value.trim() || '1234'
    };

    try {
        const res = await fetch('/api/dashboard/players', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast("Joueur créé avec succès !");
            closeModal('createPlayerModal');
            fetchPlayers();
        } else {
            const errData = await res.json().catch(() => ({}));
            showToast(errData.message || "Erreur lors de la création", "error");
        }
    } catch (err) {
        showToast("Erreur réseau", "error");
    }
}

// ---- Edit Player Modal ----
function openEditPlayerModal(playerId) {
    const p = playersData.find(u => u.id === playerId);
    if (!p) return;

    document.getElementById('editPlayerId').value = p.id;
    document.getElementById('editPlayerName').value = p.name || '';
    document.getElementById('editPlayerEmail').value = p.email || '';
    document.getElementById('editPlayerPhone').value = p.phone || '';
    document.getElementById('editPlayerRole').value = p.role || 'player';
    document.getElementById('editPlayerLevel').value = p.level || 1;
    document.getElementById('editPlayerPin').value = p.pin || '1234';

    const avatar = p.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.name || 'player')}`;
    document.getElementById('editPlayerAvatarUrl').value = p.avatarUrl || '';
    document.getElementById('editPlayerAvatarPreview').src = avatar;

    openModal('editPlayerModal');
}

async function handleUpdatePlayer(e) {
    e.preventDefault();
    const id = document.getElementById('editPlayerId').value;
    const avatarUrl = document.getElementById('editPlayerAvatarUrl').value.trim();

    const payload = {
        name: document.getElementById('editPlayerName').value.trim(),
        email: document.getElementById('editPlayerEmail').value.trim(),
        phone: document.getElementById('editPlayerPhone').value.trim(),
        role: document.getElementById('editPlayerRole').value,
        level: parseInt(document.getElementById('editPlayerLevel').value, 10) || 1,
        avatarUrl: avatarUrl,
        pin: document.getElementById('editPlayerPin').value.trim() || '1234'
    };

    try {
        const res = await fetch(`/api/dashboard/players/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast("Profil joueur modifié avec succès !");
            closeModal('editPlayerModal');
            fetchPlayers();
        } else {
            const err = await res.json().catch(() => ({}));
            showToast(err.message || "Erreur lors de la modification", "error");
        }
    } catch (err) {
        showToast("Erreur réseau", "error");
    }
}

// ---- Delete Player ----
async function deletePlayer(playerId, playerName) {
    if (!confirm(`Confirmer la suppression du joueur "${playerName}" ?`)) return;

    try {
        const res = await fetch(`/api/dashboard/players/${playerId}`, { method: 'DELETE' });
        if (res.ok) {
            showToast(`Joueur "${playerName}" supprimé !`);
            fetchPlayers();
        } else {
            showToast("Erreur lors de la suppression", "error");
        }
    } catch (err) {
        showToast("Erreur réseau", "error");
    }
}

// ---- 360 Player Profile Modal ----
async function openPlayerProfileModal(playerId) {
    const contentEl = document.getElementById('playerProfileContent');
    contentEl.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">Chargement du profil complet...</div>`;
    openModal('playerProfileModal');

    try {
        const res = await fetch(`/api/dashboard/players/${playerId}/details`);
        const data = await res.json();
        const u = data.user;
        const bookings = data.bookings || [];
        const rentals = data.rentals || [];
        const events = data.events || [];
        const totalSpent = data.totalSpent || 0;

        contentEl.innerHTML = `
            <div class="player-profile-header" style="position: relative;">
                <img src="${u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.name}`}" class="player-avatar-large">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <h2 style="font-size: 22px; font-weight: 700; color: var(--text-primary);">${u.name}</h2>
                            <span class="player-stat-badge"><i class="fa-solid fa-shield"></i> Niveau ${u.level}</span>
                            <span class="badge-tag">${u.role.toUpperCase()}</span>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="closeModal('playerProfileModal'); openEditPlayerModal('${u.id}')">
                            <i class="fa-solid fa-pen"></i> Modifier Profil
                        </button>
                    </div>
                    <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
                        <i class="fa-solid fa-phone"></i> ${u.phone} • <i class="fa-solid fa-envelope"></i> ${u.email}
                    </div>
                    <div style="margin-top: 10px; display: flex; gap: 16px;">
                        <div style="font-size: 13px;"><span style="color: var(--text-muted);">Total Dépensé :</span> <strong style="color: #FFD700; font-family: 'Orbitron';">${totalSpent.toLocaleString()} FCFA</strong></div>
                        <div style="font-size: 13px;"><span style="color: var(--text-muted);">XP :</span> <strong style="color: var(--primary-light);">${u.xp}/${u.maxXp}</strong></div>
                    </div>
                </div>
            </div>

            <!-- Badges -->
            <div style="margin-bottom: 20px;">
                <h4 style="font-size: 13px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Badges Débloqués</h4>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${(u.badges && u.badges.length > 0) ? u.badges.map(b => `<span class="badge-item" style="font-size: 12px; padding: 4px 10px;">${b}</span>`).join('') : '<span class="text-muted" style="font-size: 12px;">Aucun badge</span>'}
                </div>
            </div>

            <!-- Tabs in Drawer: Bookings, Tournaments, Rentals -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div style="background: var(--surface-elevated); padding: 14px; border-radius: 12px; border: 1px solid var(--glass-border);">
                    <h4 style="font-size: 14px; margin-bottom: 10px; color: var(--primary);"><i class="fa-solid fa-calendar-check"></i> Sessions en Salle (${bookings.length})</h4>
                    <div style="max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;">
                        ${bookings.length > 0 ? bookings.map(b => `
                            <div style="font-size: 12px; padding: 6px 8px; background: rgba(255,255,255,0.03); border-radius: 6px; display: flex; justify-content: space-between;">
                                <span><strong>${b.gameName}</strong> (${b.posteName || b.consoleName})</span>
                                <span style="color: var(--primary-light);">${b.totalAmount} F</span>
                            </div>
                        `).join('') : '<span style="font-size: 12px; color: var(--text-muted);">Aucune réservation</span>'}
                    </div>
                </div>

                <div style="background: var(--surface-elevated); padding: 14px; border-radius: 12px; border: 1px solid var(--glass-border);">
                    <h4 style="font-size: 14px; margin-bottom: 10px; color: #FFD700;"><i class="fa-solid fa-trophy"></i> Tournois Inscrits (${events.length})</h4>
                    <div style="max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;">
                        ${events.length > 0 ? events.map(ev => `
                            <div style="font-size: 12px; padding: 6px 8px; background: rgba(255,255,255,0.03); border-radius: 6px; display: flex; justify-content: space-between;">
                                <span>${ev.emoji || '🏆'} <strong>${ev.name}</strong></span>
                                <span class="badge-tag" style="font-size: 10px;">${ev.status}</span>
                            </div>
                        `).join('') : '<span style="font-size: 12px; color: var(--text-muted);">Aucun tournoi</span>'}
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        contentEl.innerHTML = `<div style="color: var(--error); padding: 20px;">Erreur de chargement du profil</div>`;
    }
}

// ---- XP Modal ----
function openXpModal(playerId, playerName) {
    selectedPlayerId = playerId;
    document.getElementById('xpModalSubtitle').innerText = `Joueur: ${playerName}`;
    document.getElementById('xpAmountInput').value = 100;
    openModal('xpModal');
}

async function submitXp() {
    const amount = parseInt(document.getElementById('xpAmountInput').value, 10);
    if (!amount || amount <= 0) return;

    try {
        const response = await fetch(
            `/api/dashboard/players/${selectedPlayerId}/xp?amount=${amount}`,
            { method: 'POST' }
        );

        if (response.ok) {
            closeModal('xpModal');
            showToast(`+${amount} XP attribués !`);
            fetchPlayers();
        }
    } catch (e) {
        showToast("Erreur lors de l'attribution d'XP", "error");
    }
}

// ---- Badge Modal ----
function openBadgeModal(playerId, playerName) {
    selectedPlayerId = playerId;
    document.getElementById('badgeModalSubtitle').innerText = `Joueur: ${playerName}`;
    openModal('badgeModal');
}

async function submitBadge() {
    const badge = document.getElementById('badgeSelect').value;
    if (!badge) return;

    try {
        const response = await fetch(
            `/api/dashboard/players/${selectedPlayerId}/badge?badge=${encodeURIComponent(badge)}`,
            { method: 'POST' }
        );

        if (response.ok) {
            closeModal('badgeModal');
            showToast(`Badge "${badge}" décerné !`);
            fetchPlayers();
        }
    } catch (e) {
        showToast("Erreur lors de l'attribution du badge", "error");
    }
}
