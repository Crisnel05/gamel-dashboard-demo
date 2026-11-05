// ============================================================
// GAMES.JS - Games Catalog Management
// GAMEL Admin Dashboard
// ============================================================

let allGames = [];
let consoleModels = [];
let activePlatformFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([loadGames(), loadConsoleModels()]);
    initSearch();
});

async function loadConsoleModels() {
    try {
        const res = await fetch('/api/dashboard/console-models');
        consoleModels = await res.json();
        populateGameConsoleSelect();
    } catch (e) {
        console.error("Error loading console models:", e);
    }
}

function populateGameConsoleSelect() {
    const sel = document.getElementById('gameConsole');
    if (!sel) return;
    if (!consoleModels || consoleModels.length === 0) {
        sel.innerHTML = `<option value="">-- Aucune console (Ajoutez d'abord une console dans Consoles) --</option>`;
    } else {
        sel.innerHTML = `<option value="">-- Sélectionner la console --</option>` +
            consoleModels.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
    }
}

async function loadGames() {
    try {
        const res = await fetch(`${API_BASE}/games`);
        allGames = await res.json();
        renderStats();
        renderGames();
    } catch (err) {
        console.error("Error loading games:", err);
        showToast("Erreur lors du chargement des jeux", "error");
    }
}

function renderStats() {
    const totalEl = document.getElementById('stat-total-games');
    const rentalEl = document.getElementById('stat-rental-games');
    const genresEl = document.getElementById('stat-genres-count');

    if (totalEl) totalEl.innerText = allGames.length;
    if (rentalEl) {
        const count = allGames.filter(g => g.availableForRental).length;
        rentalEl.innerText = count;
    }
    if (genresEl) {
        const distinctGenres = new Set(allGames.map(g => g.genre).filter(Boolean)).size;
        genresEl.innerText = distinctGenres;
    }

    renderPlatformFilterButtons();
}

function renderPlatformFilterButtons() {
    const container = document.getElementById('platformFilterGroup');
    if (!container) return;

    const platforms = Array.from(new Set([
        ...consoleModels.map(m => m.name),
        ...allGames.map(g => g.console)
    ].filter(Boolean)));
    
    let html = `<button class="btn btn-sm btn-outline filter-btn ${activePlatformFilter === 'all' ? 'active' : ''}" data-platform="all" onclick="filterGames('all')">Tous</button>`;
    
    platforms.forEach(p => {
        const isActive = activePlatformFilter.toLowerCase() === p.toLowerCase() ? 'active' : '';
        html += `<button class="btn btn-sm btn-outline filter-btn ${isActive}" data-platform="${p}" onclick="filterGames('${p}')">${p.toUpperCase()}</button>`;
    });

    container.innerHTML = html;
}

function renderGames() {
    const grid = document.getElementById('gamesGrid');
    if (!grid) return;

    let filtered = allGames;
    if (activePlatformFilter !== 'all') {
        filtered = filtered.filter(g => g.console === activePlatformFilter);
    }

    const searchInput = document.getElementById('gameSearch');
    if (searchInput && searchInput.value.trim() !== '') {
        const q = searchInput.value.trim().toLowerCase();
        filtered = filtered.filter(g => 
            (g.name && g.name.toLowerCase().includes(q)) ||
            (g.genre && g.genre.toLowerCase().includes(q))
        );
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 48px; background: var(--surface-card); border-radius: 16px; border: 1px dashed var(--glass-border);">
                <i class="fa-solid fa-gamepad" style="font-size: 40px; color: var(--text-muted); margin-bottom: 12px;"></i>
                <h3 style="color: var(--text-primary); margin-bottom: 6px;">Aucun jeu dans la ludothèque</h3>
                <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 16px;">Ajoutez les jeux disponibles en salle ou en location avec leurs tarifs.</p>
                <button class="btn btn-primary btn-sm" onclick="openAddGameModal()">
                    <i class="fa-solid fa-plus"></i> Ajouter un Jeu
                </button>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(g => {
        let statusBadge = '<span class="badge-tag status-active">Disponible</span>';
        if (g.status === 'inUse') {
            statusBadge = '<span class="badge-tag status-busy">En cours</span>';
        } else if (g.status === 'maintenance') {
            statusBadge = '<span class="badge-tag status-offline">Maintenance</span>';
        }

        return `
            <div class="game-card" style="border-top: 3px solid ${g.accentColor || 'var(--primary)'};">
                <div>
                    <div class="game-header">
                        <div>
                            <div class="game-title">${g.name}</div>
                            <div class="game-tags">
                                <span class="game-tag"><i class="fa-solid fa-gamepad"></i> ${g.console.toUpperCase()}</span>
                                <span class="game-tag">${g.genre}</span>
                                ${g.availableForRental ? '<span class="game-tag" style="color: var(--primary); border-color: var(--primary);"><i class="fa-solid fa-truck"></i> Emport</span>' : ''}
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                            ${g.popularityRank ? `<span class="game-rank-badge">#${g.popularityRank}</span>` : ''}
                            ${statusBadge}
                        </div>
                    </div>

                    <div class="game-desc">${g.description || 'Jeu haute performance disponible dans notre catalogue.'}</div>

                    <div class="game-prices">
                        <div class="price-box">
                            <span class="price-box-label">Sur Place</span>
                            <span class="price-box-val">${g.pricePerHour.toLocaleString()} F/h</span>
                        </div>
                        <div class="price-box" style="text-align: right;">
                            <span class="price-box-label">Location 24h</span>
                            <span class="price-box-val" style="color: #FFD700;">${g.dailyRentalPrice ? g.dailyRentalPrice.toLocaleString() + ' F' : 'N/A'}</span>
                        </div>
                    </div>
                </div>

                <div class="game-actions">
                    <button class="btn btn-sm btn-outline" style="flex: 1;" onclick="openEditGameModal('${g.id}')">
                        <i class="fa-solid fa-pen"></i> Modifier
                    </button>
                    <button class="btn btn-sm btn-outline" style="color: var(--error); border-color: rgba(239,83,80,0.3);" onclick="handleDeleteGame('${g.id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function filterGames(platform) {
    activePlatformFilter = platform;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.platform === platform);
    });
    renderGames();
}

function initSearch() {
    const searchInput = document.getElementById('gameSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => renderGames());
    }
}

function openAddGameModal() {
    document.getElementById('gameForm').reset();
    document.getElementById('gameId').value = '';
    document.getElementById('gameModalTitle').innerText = "Ajouter un Jeu";
    populateGameConsoleSelect();
    openModal('gameModal');
}

function openEditGameModal(id) {
    const g = allGames.find(item => item.id === id);
    if (!g) return;

    populateGameConsoleSelect();

    document.getElementById('gameId').value = g.id;
    document.getElementById('gameModalTitle').innerText = "Modifier le Jeu";
    document.getElementById('gameName').value = g.name || '';
    document.getElementById('gameGenre').value = g.genre || '';
    document.getElementById('gameConsole').value = g.console || '';
    document.getElementById('gamePriceHour').value = g.pricePerHour || 1000;
    document.getElementById('gamePriceRental').value = g.dailyRentalPrice || 2500;
    document.getElementById('gameRank').value = g.popularityRank || 1;
    document.getElementById('gameStatus').value = g.status || 'available';
    document.getElementById('gameColor').value = g.accentColor || '#25a69a';
    document.getElementById('gameDesc').value = g.description || '';
    document.getElementById('gameRentalCheck').checked = g.availableForRental;

    openModal('gameModal');
}

async function handleSaveGame(e) {
    e.preventDefault();
    const id = document.getElementById('gameId').value;

    const payload = {
        name: document.getElementById('gameName').value,
        genre: document.getElementById('gameGenre').value,
        console: document.getElementById('gameConsole').value,
        pricePerHour: parseFloat(document.getElementById('gamePriceHour').value) || 1000,
        dailyRentalPrice: parseFloat(document.getElementById('gamePriceRental').value) || 2500,
        popularityRank: parseInt(document.getElementById('gameRank').value) || 1,
        status: document.getElementById('gameStatus').value,
        accentColor: document.getElementById('gameColor').value,
        description: document.getElementById('gameDesc').value,
        availableForRental: document.getElementById('gameRentalCheck').checked
    };

    try {
        let res;
        if (id) {
            res = await fetch(`${API_BASE}/games/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch(`${API_BASE}/games`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (res.ok) {
            showToast(id ? "Jeu mis à jour" : "Jeu ajouté avec succès");
            closeModal('gameModal');
            await loadGames();
        } else {
            showToast("Erreur lors de l'enregistrement", "error");
        }
    } catch (err) {
        showToast("Erreur réseau", "error");
    }
}

async function handleDeleteGame(id) {
    if (!confirm("Voulez-vous vraiment supprimer ce jeu ?")) return;

    try {
        const res = await fetch(`${API_BASE}/games/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast("Jeu supprimé du catalogue");
            await loadGames();
        }
    } catch (e) {
        showToast("Erreur lors de la suppression", "error");
    }
}
