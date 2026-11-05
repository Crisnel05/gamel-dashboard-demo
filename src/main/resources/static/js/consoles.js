// ============================================================
// CONSOLES.JS - Gestion des Consoles, Jeux Vidéos & Postes
// GAMEL Admin Dashboard
// ============================================================

let consolesData = [];      // Postes / Stations
let consoleModelsData = []; // Modèles de Consoles enregistrés par l'admin
let allGamesData = [];      // Tous les jeux vidéos
let activeTab = 'models';
let activePosteFilter = 'all';
let activeGameConsoleFilter = 'all';
let currentSelectedConsoleName = null;

// ---- Initialization ----
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([fetchConsoleModels(), fetchConsoles(), fetchAllGames()]);
    initSearch();
    // Auto-refresh : synchronise consoles et jeux toutes les 20 secondes
    AutoRefresh.start(async () => {
        await Promise.all([fetchConsoles(), fetchAllGames()]);
    }, 20000);
});

// ---- Fetch All Games ----
async function fetchAllGames() {
    try {
        const response = await fetch('/api/dashboard/games');
        if (response.ok) {
            allGamesData = await response.json();
            renderStats();
            renderConsoleModelsGrid();
            renderAllGamesGrid();
        }
    } catch (e) {
        console.error('[Consoles] Error fetching games:', e);
    }
}

// ---- Fetch Console Models (Modèles de Consoles) ----
async function fetchConsoleModels() {
    try {
        const response = await fetch('/api/dashboard/console-models');
        if (!response.ok) throw new Error('Network response error');

        consoleModelsData = await response.json();
        renderStats();
        renderConsoleModelsGrid();
        renderGameConsoleFilterButtons();
        populatePosteConsoleSelects();
    } catch (error) {
        console.error('[Consoles] Error fetching console models:', error);
    }
}

// ---- Fetch All Postes (Stations) ----
async function fetchConsoles() {
    try {
        const response = await fetch('/api/dashboard/consoles');
        if (!response.ok) throw new Error('Network response error');

        consolesData = await response.json();
        renderStats();
        renderConsolesGrid();
    } catch (error) {
        console.error('[Consoles] Error fetching consoles:', error);
    }
}

// ---- Render Global Stats ----
function renderStats() {
    const totalModelsEl = document.getElementById('stat-total-models');
    const totalGamesEl = document.getElementById('stat-total-games');
    const totalPostesEl = document.getElementById('stat-total-postes');
    const availablePostesEl = document.getElementById('stat-available-postes');
    const countTabModels = document.getElementById('countTabModels');
    const countTabGames = document.getElementById('countTabGames');
    const countTabPostes = document.getElementById('countTabPostes');

    if (totalModelsEl) totalModelsEl.innerText = consoleModelsData.length;
    if (totalGamesEl) totalGamesEl.innerText = allGamesData.length;
    if (totalPostesEl) totalPostesEl.innerText = consolesData.length;
    if (countTabModels) countTabModels.innerText = consoleModelsData.length;
    if (countTabGames) countTabGames.innerText = allGamesData.length;
    if (countTabPostes) countTabPostes.innerText = consolesData.length;

    const availableCount = consolesData.filter(c => c.status === 'available').length;
    if (availablePostesEl) availablePostesEl.innerText = availableCount;
}

// ---- Main Single Action Button Handler ----
function handleMainAction() {
    if (activeTab === 'models') {
        openAddConsoleModelModal();
    } else if (activeTab === 'games') {
        openAddGameForConsoleModal();
    } else {
        openAddPosteModal();
    }
}

// ---- Switch Tabs (Consoles vs Jeux vs Postes) ----
function switchConsoleTab(tab) {
    activeTab = tab;
    const btnModels = document.getElementById('tabBtnModels');
    const btnGames = document.getElementById('tabBtnGames');
    const btnPostes = document.getElementById('tabBtnPostes');

    const secModels = document.getElementById('tabModelsSection');
    const secGames = document.getElementById('tabGamesSection');
    const secPostes = document.getElementById('tabPostesSection');

    const mainActionText = document.getElementById('mainActionText');

    // Remove active from all tabs & hide all sections
    [btnModels, btnGames, btnPostes].forEach(b => b && b.classList.remove('active'));
    [secModels, secGames, secPostes].forEach(s => s && (s.style.display = 'none'));

    if (tab === 'models') {
        if (btnModels) btnModels.classList.add('active');
        if (secModels) secModels.style.display = 'block';
        if (mainActionText) mainActionText.innerText = "Ajouter une Console";
        renderConsoleModelsGrid();
    } else if (tab === 'games') {
        if (btnGames) btnGames.classList.add('active');
        if (secGames) secGames.style.display = 'block';
        if (mainActionText) mainActionText.innerText = "Ajouter un Jeu";
        renderGameConsoleFilterButtons();
        renderAllGamesGrid();
    } else {
        if (btnPostes) btnPostes.classList.add('active');
        if (secPostes) secPostes.style.display = 'block';
        if (mainActionText) mainActionText.innerText = "Ajouter un Poste";
        renderConsolesGrid();
    }
}

// ---- Render Console Models Grid (Tab 1) ----
function renderConsoleModelsGrid() {
    const grid = document.getElementById('consoleModelsGrid');
    if (!grid) return;

    const searchInput = document.getElementById('globalSearch');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    let list = consoleModelsData;
    if (query) {
        list = list.filter(m => 
            (m.name && m.name.toLowerCase().includes(query)) ||
            (m.manufacturer && m.manufacturer.toLowerCase().includes(query)) ||
            (m.description && m.description.toLowerCase().includes(query))
        );
    }

    if (!list || list.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 48px; background: var(--surface-card); border-radius: 16px; border: 1px dashed var(--glass-border);">
                <i class="fa-solid fa-gamepad" style="font-size: 44px; color: var(--primary); margin-bottom: 14px; opacity: 0.8;"></i>
                <h3 style="color: var(--text-primary); margin-bottom: 6px;">Aucune console enregistrée</h3>
                <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 18px;">
                    Ajoutez vos modèles de consoles (PS5, Xbox, Switch, PC Gamer...) pour y associer des jeux vidéos et configurer vos postes de jeu.
                </p>
                <button class="btn btn-primary" onclick="openAddConsoleModelModal()">
                    <i class="fa-solid fa-plus"></i> Ajouter une Console
                </button>
            </div>
        `;
        return;
    }

    grid.innerHTML = list.map(m => {
        const assignedPostesCount = consolesData.filter(c => c.type && c.type.toLowerCase() === m.name.toLowerCase()).length;
        const consoleGames = allGamesData.filter(g => g.console && g.console.toLowerCase() === m.name.toLowerCase());
        const gamesCount = consoleGames.length;

        let brandIcon = 'fa-gamepad';
        const nameLower = (m.name + ' ' + (m.manufacturer || '')).toLowerCase();
        if (nameLower.includes('playstation') || nameLower.includes('ps5') || nameLower.includes('ps4') || nameLower.includes('ps3')) brandIcon = 'fa-brands fa-playstation';
        else if (nameLower.includes('xbox')) brandIcon = 'fa-brands fa-xbox';
        else if (nameLower.includes('pc') || nameLower.includes('computer')) brandIcon = 'fa-desktop';
        else if (nameLower.includes('switch') || nameLower.includes('nintendo')) brandIcon = 'fa-gamepad';

        const gamesPreviewHtml = gamesCount > 0 
            ? consoleGames.slice(0, 3).map(g => `<span class="badge-tag" style="font-size: 10px; padding: 2px 6px;">${g.name}</span>`).join('') + (gamesCount > 3 ? `<span style="font-size: 10px; color: var(--text-muted);">+${gamesCount - 3}</span>` : '')
            : `<span style="font-size: 11px; color: var(--text-muted);">Aucun jeu enregistré</span>`;

        return `
            <div class="console-card" style="border-top: 3px solid var(--primary);">
                <div class="console-header" style="align-items: center;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(37,166,154,0.15); display: flex; align-items: center; justify-content: center; font-size: 20px; color: var(--primary);">
                            <i class="${brandIcon}"></i>
                        </div>
                        <div>
                            <h3 style="font-size: 16px; margin: 0; font-weight: 700;">${m.name}</h3>
                            <span style="font-size: 12px; color: var(--text-muted);">${m.manufacturer || 'Matériel Officiel'}</span>
                        </div>
                    </div>
                    <span class="badge-tag" style="background: rgba(37,166,154,0.15); color: var(--primary-light); font-size: 11px;">
                        ${assignedPostesCount} Poste(s)
                    </span>
                </div>

                <div class="console-body" style="margin: 14px 0 16px;">
                    <div class="console-body-row">
                        <span class="console-body-label">Jeux disponibles:</span>
                        <span class="console-body-value font-orbitron" style="color: #FFD700; font-size: 12px;">
                            ${gamesCount} titre(s)
                        </span>
                    </div>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px; margin-bottom: 10px;">
                        ${gamesPreviewHtml}
                    </div>
                    <div class="console-body-row">
                        <span class="console-body-label">Description:</span>
                        <span class="console-body-value" style="font-size: 11px; color: var(--text-secondary); max-height: 36px; overflow: hidden; text-overflow: ellipsis;">
                            ${m.description || 'Console disponible au salon.'}
                        </span>
                    </div>
                </div>

                <div class="console-actions" style="display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--glass-border); padding-top: 12px;">
                    <div style="display: flex; gap: 6px;">
                        <button class="btn btn-primary btn-sm" style="flex: 1; font-size: 11px;" onclick="openAddGameForConsoleModal('${m.name.replace(/'/g, "\\'")}')" title="Ajouter un jeu sur cette console">
                            <i class="fa-solid fa-plus"></i> Ajouter Jeu
                        </button>
                        <button class="btn btn-outline btn-sm" style="font-size: 11px;" onclick="openViewConsoleGamesModal('${m.name.replace(/'/g, "\\'")}')" title="Voir tous les jeux">
                            <i class="fa-solid fa-dice-d20"></i> Jeux (${gamesCount})
                        </button>
                        <button class="btn btn-outline btn-sm" style="font-size: 11px;" onclick="openAddPosteWithConsole('${m.name.replace(/'/g, "\\'")}')" title="Créer un poste">
                            <i class="fa-solid fa-desktop"></i>
                        </button>
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 6px;">
                        <button class="btn btn-outline btn-sm" style="padding: 4px 8px; font-size: 11px;" onclick="openEditConsoleModelModal('${m.id}')" title="Modifier la console">
                            <i class="fa-solid fa-pen"></i> Modifier
                        </button>
                        <button class="btn btn-outline btn-sm" style="padding: 4px 8px; font-size: 11px; color: var(--error); border-color: rgba(239,83,80,0.3);" onclick="deleteConsoleModel('${m.id}', '${m.name.replace(/'/g, "\\'")}')" title="Supprimer">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ---- Render All Games Grid (Tab 2: Liste des Jeux Vidéos) ----
function renderGameConsoleFilterButtons() {
    const container = document.getElementById('gameConsoleFilterGroup');
    if (!container) return;

    let html = `<button class="btn btn-sm btn-outline filter-btn ${activeGameConsoleFilter === 'all' ? 'active' : ''}" data-console="all" onclick="filterGamesByConsole('all')">Toutes les consoles</button>`;
    
    consoleModelsData.forEach(m => {
        const isActive = activeGameConsoleFilter.toLowerCase() === m.name.toLowerCase() ? 'active' : '';
        html += `<button class="btn btn-sm btn-outline filter-btn ${isActive}" data-console="${m.name}" onclick="filterGamesByConsole('${m.name.replace(/'/g, "\\'")}')">${m.name}</button>`;
    });

    container.innerHTML = html;
}

function filterGamesByConsole(consoleName) {
    activeGameConsoleFilter = consoleName;
    document.querySelectorAll('#gameConsoleFilterGroup .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.console === consoleName);
    });
    renderAllGamesGrid();
}

function renderAllGamesGrid() {
    const grid = document.getElementById('allGamesGrid');
    if (!grid) return;

    let list = allGamesData;
    if (activeGameConsoleFilter !== 'all') {
        list = list.filter(g => g.console && g.console.toLowerCase() === activeGameConsoleFilter.toLowerCase());
    }

    const searchInput = document.getElementById('globalSearch');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (query) {
        list = list.filter(g => 
            (g.name && g.name.toLowerCase().includes(query)) ||
            (g.genre && g.genre.toLowerCase().includes(query)) ||
            (g.console && g.console.toLowerCase().includes(query))
        );
    }

    const countBadge = document.getElementById('filteredGamesCountBadge');
    if (countBadge) countBadge.innerText = `${list.length} Jeu(x)`;

    if (!list || list.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 48px; background: var(--surface-card); border-radius: 16px; border: 1px dashed var(--glass-border);">
                <i class="fa-solid fa-dice-d20" style="font-size: 40px; color: var(--text-muted); margin-bottom: 12px;"></i>
                <h3 style="color: var(--text-primary); margin-bottom: 6px;">Aucun jeu vidéo trouvé</h3>
                <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 16px;">
                    ${consoleModelsData.length === 0 ? "Ajoutez d'abord une console pour pouvoir y enregistrer des jeux." : "Ajoutez votre premier jeu vidéo pour enrichir votre ludothèque."}
                </p>
                <button class="btn btn-primary btn-sm" onclick="openAddGameForConsoleModal()">
                    <i class="fa-solid fa-plus"></i> Ajouter un Jeu Vidéo
                </button>
            </div>
        `;
        return;
    }

    grid.innerHTML = list.map(g => {
        return `
            <div class="console-card" style="border-top: 3px solid ${g.accentColor || 'var(--primary)'};">
                <div class="console-header">
                    <div>
                        <h3 style="font-size: 16px; margin: 0; font-weight: 700; color: var(--text-primary);">${g.name}</h3>
                        <span class="badge-tag" style="display: inline-block; margin-top: 6px; font-size: 11px; background: rgba(37,166,154,0.15); color: var(--primary-light);">
                            <i class="fa-solid fa-gamepad"></i> ${g.console || 'Console'}
                        </span>
                    </div>
                    <span style="font-size: 12px; color: var(--text-muted); font-weight: 600;">${g.genre || 'Action'}</span>
                </div>

                <div class="console-body" style="margin: 12px 0;">
                    <div style="display: flex; justify-content: space-between; background: var(--surface-elevated); padding: 10px 14px; border-radius: 10px; margin-bottom: 10px;">
                        <div>
                            <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Tarif Salle</div>
                            <div class="font-orbitron" style="font-size: 13px; font-weight: 700; color: var(--primary-light);">${g.pricePerHour ? g.pricePerHour.toLocaleString() + ' F/h' : '1000 F/h'}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Tarif Location</div>
                            <div class="font-orbitron" style="font-size: 13px; font-weight: 700; color: #FFD700;">${g.dailyRentalPrice ? g.dailyRentalPrice.toLocaleString() + ' F/j' : '2500 F/j'}</div>
                        </div>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); max-height: 36px; overflow: hidden; text-overflow: ellipsis;">
                        ${g.description || 'Jeu vidéo disponible en salle et à la location.'}
                    </div>
                </div>

                <div class="console-actions" style="display: flex; gap: 8px; border-top: 1px solid var(--glass-border); padding-top: 12px;">
                    <button class="btn btn-outline btn-sm" style="flex: 1;" onclick="openEditGameModal('${g.id}')">
                        <i class="fa-solid fa-pen"></i> Modifier
                    </button>
                    <button class="btn btn-outline btn-sm" style="color: var(--error); border-color: rgba(239,83,80,0.3);" onclick="handleDeleteGame('${g.id}', '${g.name.replace(/'/g, "\\'")}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ---- Render Postes Grid (Tab 3) ----
function renderConsolesGrid() {
    const grid = document.getElementById('consolesGrid');
    if (!grid) return;

    let list = consolesData;
    if (activePosteFilter !== 'all') {
        list = list.filter(c => c.status === activePosteFilter);
    }

    const searchInput = document.getElementById('globalSearch');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (query) {
        list = list.filter(c => 
            (c.name && c.name.toLowerCase().includes(query)) ||
            (c.postNumber && c.postNumber.toLowerCase().includes(query)) ||
            (c.type && c.type.toLowerCase().includes(query)) ||
            (c.currentGameName && c.currentGameName.toLowerCase().includes(query))
        );
    }

    if (!list || list.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 48px; background: var(--surface-card); border-radius: 16px; border: 1px dashed var(--glass-border);">
                <i class="fa-solid fa-desktop" style="font-size: 40px; color: var(--text-muted); margin-bottom: 12px;"></i>
                <h3 style="color: var(--text-primary); margin-bottom: 6px;">Aucun poste de jeu trouvé</h3>
                <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 16px;">
                    ${consoleModelsData.length === 0 ? "Commencez par ajouter une Console, puis créez vos postes." : "Créez votre premier poste de jeu équipé d'une de vos consoles."}
                </p>
                <button class="btn btn-primary btn-sm" onclick="openAddPosteModal()">
                    <i class="fa-solid fa-plus"></i> Ajouter un Poste
                </button>
            </div>
        `;
        return;
    }

    grid.innerHTML = list.map(c => {
        const statusLabel =
            c.status === 'available' ? 'Disponible' :
            c.status === 'occupied'  ? 'Occupé'     : 'En Panne';

        const freeAtText = c.freeAt
            ? new Date(c.freeAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            : '-';

        return `
            <div class="console-card">
                <div class="console-header">
                    <div class="console-details">
                        <h3>${c.name}</h3>
                        <span>${c.postNumber}</span>
                    </div>
                    <span class="console-status-dot ${c.status}" title="${statusLabel}"></span>
                </div>
                <div class="console-body">
                    <div class="console-body-row">
                        <span class="console-body-label">Console:</span>
                        <span class="console-body-value font-orbitron" style="color: var(--primary-light); font-size: 12px;">
                            ${c.type || 'N/A'}
                        </span>
                    </div>
                    <div class="console-body-row">
                        <span class="console-body-label">Activité:</span>
                        <span class="console-body-value ${c.currentGameName ? 'game-active' : ''}">
                            ${c.currentGameName || 'Libre'}
                        </span>
                    </div>
                    <div class="console-body-row">
                        <span class="console-body-label">Libre à:</span>
                        <span class="console-body-value font-orbitron" style="color: var(--primary-light);">${freeAtText}</span>
                    </div>
                </div>
                <div class="console-actions" style="display: flex; gap: 6px; flex-wrap: wrap;">
                    <button class="btn btn-secondary btn-sm"
                        onclick="updateConsoleStatus('${c.id}', 'available')"
                        ${c.status === 'available' ? 'disabled' : ''} title="Terminer la session et rendre disponible">
                        Terminer
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="openEditConsoleModal('${c.id}')" title="Modifier">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn btn-secondary btn-sm"
                        onclick="updateConsoleStatus('${c.id}', 'broken')"
                        ${c.status === 'broken' ? 'disabled' : ''} title="Signaler panne">
                        Panne
                    </button>
                    <button class="btn btn-icon cancel" onclick="deleteConsole('${c.id}', '${c.name.replace(/'/g, "\\'")}')" title="Supprimer" style="width: 30px; height: 30px;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function filterPostes(status) {
    activePosteFilter = status;
    document.querySelectorAll('#tabPostesSection .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
    });
    renderConsolesGrid();
}

// ---- Modal: Ajouter / Modifier un Jeu Vidéo ----
function populateGameConsoleTargetSelect(preselectedValue) {
    const sel = document.getElementById('addGameConsoleTarget');
    if (!sel) return;

    if (!consoleModelsData || consoleModelsData.length === 0) {
        sel.innerHTML = `<option value="">-- Aucune console (Ajoutez d'abord une console) --</option>`;
    } else {
        sel.innerHTML = consoleModelsData.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
        if (preselectedValue) {
            sel.value = preselectedValue;
        }
    }
}

function openAddGameForConsoleModal(preselectedConsole) {
    if (consoleModelsData.length === 0) {
        showToast("Veuillez d'abord ajouter une console pour pouvoir y associer des jeux.", "warning");
        openAddConsoleModelModal();
        return;
    }

    currentSelectedConsoleName = preselectedConsole || (consoleModelsData[0] ? consoleModelsData[0].name : null);
    document.getElementById('addGameForConsoleForm').reset();
    document.getElementById('editGameId').value = '';
    document.getElementById('gameModalTitle').innerText = "Ajouter un Jeu Vidéo";
    document.getElementById('saveGameBtn').innerText = "Enregistrer le Jeu";

    populateGameConsoleTargetSelect(preselectedConsole);
    openModal('addGameForConsoleModal');
}

function openEditGameModal(id) {
    const g = allGamesData.find(item => item.id === id);
    if (!g) return;

    document.getElementById('editGameId').value = g.id;
    document.getElementById('gameModalTitle').innerText = "Modifier le Jeu Vidéo";
    document.getElementById('saveGameBtn').innerText = "Enregistrer les modifications";

    populateGameConsoleTargetSelect(g.console);

    document.getElementById('addGameName').value = g.name || '';
    document.getElementById('addGameGenre').value = g.genre || '';
    document.getElementById('addGameColor').value = g.accentColor || '#25a69a';
    document.getElementById('addGamePriceHour').value = g.pricePerHour || 1000;
    document.getElementById('addGamePriceRental').value = g.dailyRentalPrice || 2500;
    document.getElementById('addGameDesc').value = g.description || '';
    document.getElementById('addGameRentalCheck').checked = g.availableForRental !== false;

    openModal('addGameForConsoleModal');
}

async function handleSaveGameForConsole(e) {
    e.preventDefault();
    const editId = document.getElementById('editGameId').value;
    const consoleName = document.getElementById('addGameConsoleTarget').value;
    const name = document.getElementById('addGameName').value.trim();
    const genre = document.getElementById('addGameGenre').value.trim();
    const accentColor = document.getElementById('addGameColor').value;
    const pricePerHour = parseFloat(document.getElementById('addGamePriceHour').value) || 1000;
    const dailyRentalPrice = parseFloat(document.getElementById('addGamePriceRental').value) || 2500;
    const description = document.getElementById('addGameDesc').value.trim();
    const availableForRental = document.getElementById('addGameRentalCheck').checked;

    const payload = {
        name,
        genre,
        console: consoleName,
        pricePerHour,
        dailyRentalPrice,
        accentColor,
        description,
        availableForRental,
        status: 'available',
        popularityRank: 1
    };

    try {
        let res;
        if (editId) {
            res = await fetch(`/api/dashboard/games/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch('/api/dashboard/games', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (!res.ok) throw new Error('API failed');
        showToast(`Jeu "${name}" enregistré avec succès !`);
        closeModal('addGameForConsoleModal');
        await fetchAllGames();
        
        // If view modal was open, refresh it
        if (currentSelectedConsoleName === consoleName) {
            openViewConsoleGamesModal(consoleName);
        }
    } catch (err) {
        showToast("Erreur lors de l'enregistrement du jeu", "error");
    }
}

async function handleDeleteGame(gameId, gameName) {
    if (!confirm(`Supprimer le jeu "${gameName}" ?`)) return;
    try {
        const res = await fetch(`/api/dashboard/games/${gameId}`, { method: 'DELETE' });
        if (res.ok) {
            showToast(`Jeu "${gameName}" supprimé`);
            await fetchAllGames();
        } else {
            showToast("Erreur lors de la suppression", "error");
        }
    } catch (err) {
        showToast("Erreur réseau", "error");
    }
}

// ---- Modal: Voir & Gérer les Jeux de la Console ----
function openViewConsoleGamesModal(consoleName) {
    currentSelectedConsoleName = consoleName;
    document.getElementById('viewConsoleGamesTitle').innerText = `Jeux sur ${consoleName}`;
    
    const games = allGamesData.filter(g => g.console && g.console.toLowerCase() === consoleName.toLowerCase());
    document.getElementById('viewConsoleGamesSubtitle').innerText = `${games.length} jeu(x) configuré(s)`;

    const container = document.getElementById('consoleGamesListContainer');
    if (!games || games.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 24px; background: var(--surface-card); border-radius: 12px; border: 1px dashed var(--glass-border);">
                <i class="fa-solid fa-gamepad" style="font-size: 32px; color: var(--text-muted); margin-bottom: 8px;"></i>
                <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 12px;">Aucun jeu n'est encore associé à cette console.</p>
                <button class="btn btn-primary btn-sm" onclick="openAddGameFromViewModal()">
                    <i class="fa-solid fa-plus"></i> Ajouter le premier jeu
                </button>
            </div>
        `;
    } else {
        container.innerHTML = games.map(g => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--surface-elevated); border-radius: 10px; border-left: 3px solid ${g.accentColor || 'var(--primary)'};">
                <div>
                    <div style="font-weight: 700; color: var(--text-primary); font-size: 14px;">${g.name}</div>
                    <div style="display: flex; gap: 12px; font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                        <span><i class="fa-solid fa-tag"></i> ${g.genre || 'Action'}</span>
                        <span style="color: var(--primary-light); font-weight: 600;"><i class="fa-solid fa-clock"></i> ${g.pricePerHour ? g.pricePerHour.toLocaleString() + ' F/h' : '1000 F/h'}</span>
                        <span style="color: #FFD700;"><i class="fa-solid fa-truck"></i> ${g.dailyRentalPrice ? g.dailyRentalPrice.toLocaleString() + ' F/j' : '2500 F/j'}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button class="btn btn-outline btn-sm" style="padding: 4px 8px;" onclick="closeModal('viewConsoleGamesModal'); openEditGameModal('${g.id}')" title="Modifier ce jeu">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn btn-outline btn-sm" style="color: var(--error); border-color: rgba(239,83,80,0.3); padding: 4px 8px;" onclick="deleteGameFromConsoleModal('${g.id}', '${g.name.replace(/'/g, "\\'")}')" title="Supprimer ce jeu">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    openModal('viewConsoleGamesModal');
}

function openAddGameFromViewModal() {
    closeModal('viewConsoleGamesModal');
    if (currentSelectedConsoleName) {
        openAddGameForConsoleModal(currentSelectedConsoleName);
    }
}

async function deleteGameFromConsoleModal(gameId, gameName) {
    if (!confirm(`Supprimer le jeu "${gameName}" ?`)) return;
    try {
        const res = await fetch(`/api/dashboard/games/${gameId}`, { method: 'DELETE' });
        if (res.ok) {
            showToast(`Jeu "${gameName}" supprimé`);
            await fetchAllGames();
            if (currentSelectedConsoleName) {
                openViewConsoleGamesModal(currentSelectedConsoleName);
            }
        }
    } catch (err) {
        showToast("Erreur lors de la suppression", "error");
    }
}

// ---- Populate Console Select in Poste Modals ----
function populatePosteConsoleSelects() {
    const addSelect = document.getElementById('posteConsoleSelect');
    const editSelect = document.getElementById('editPosteConsoleSelect');

    if (addSelect) {
        if (!consoleModelsData || consoleModelsData.length === 0) {
            addSelect.innerHTML = `<option value="">-- Aucune console (Ajoutez d'abord une console) --</option>`;
        } else {
            addSelect.innerHTML = `<option value="">-- Choisir une console --</option>` +
                consoleModelsData.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
        }
    }

    if (editSelect) {
        if (!consoleModelsData || consoleModelsData.length === 0) {
            editSelect.innerHTML = `<option value="">-- Aucune console --</option>`;
        } else {
            editSelect.innerHTML = consoleModelsData.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
        }
    }
}

// ---- Modal: Ajouter / Modifier Console (Modèle) ----
function openAddConsoleModelModal() {
    document.getElementById('addConsoleModelForm').reset();
    document.getElementById('modelId').value = '';
    document.getElementById('consoleModelModalTitle').innerText = "Ajouter une Console";
    document.getElementById('saveModelBtn').innerText = "Enregistrer la Console";
    openModal('addConsoleModelModal');
}

function openEditConsoleModelModal(id) {
    const m = consoleModelsData.find(item => item.id === id);
    if (!m) return;

    document.getElementById('modelId').value = m.id;
    document.getElementById('consoleModelModalTitle').innerText = "Modifier la Console";
    document.getElementById('saveModelBtn').innerText = "Enregistrer les modifications";
    document.getElementById('modelName').value = m.name || '';
    document.getElementById('modelManufacturer').value = m.manufacturer || '';
    document.getElementById('modelDescription').value = m.description || '';

    openModal('addConsoleModelModal');
}

async function handleSaveConsoleModel(e) {
    e.preventDefault();
    const id = document.getElementById('modelId').value;
    const name = document.getElementById('modelName').value.trim();
    const manufacturer = document.getElementById('modelManufacturer').value.trim();
    const description = document.getElementById('modelDescription').value.trim();

    const payload = { name, manufacturer, description };

    try {
        let response;
        if (id) {
            response = await fetch(`/api/dashboard/console-models/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            response = await fetch('/api/dashboard/console-models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            showToast(err.message || "Erreur lors de l'enregistrement", "error");
            return;
        }

        showToast(`Console "${name}" enregistrée avec succès !`);
        closeModal('addConsoleModelModal');
        await fetchConsoleModels();
    } catch (e) {
        showToast("Erreur réseau", "error");
    }
}

async function deleteConsoleModel(id, name) {
    if (!confirm(`Supprimer la console "${name}" ?`)) return;

    try {
        const res = await fetch(`/api/dashboard/console-models/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast(`Console "${name}" supprimée`);
            await fetchConsoleModels();
        } else {
            showToast("Erreur lors de la suppression", "error");
        }
    } catch (err) {
        showToast("Erreur réseau", "error");
    }
}

// ---- Shortcut: Create Poste pre-selecting Console ----
function openAddPosteWithConsole(consoleName) {
    openAddPosteModal();
    const sel = document.getElementById('posteConsoleSelect');
    if (sel) {
        sel.value = consoleName;
        handlePosteConsoleSelectChange();
    }
}

// ---- Modal: Ajouter un Poste ----
function openAddPosteModal() {
    if (consoleModelsData.length === 0) {
        showToast("Veuillez d'abord ajouter au moins une console via le bouton 'Ajouter une Console'.", "warning");
        openAddConsoleModelModal();
        return;
    }

    document.getElementById('addPosteForm').reset();
    populatePosteConsoleSelects();

    const nextNum = consolesData.length + 1;
    const autoPostNumber = `POST-${String(nextNum).padStart(2, '0')}`;
    document.getElementById('posteNumber').value = autoPostNumber;
    document.getElementById('posteName').value = `Poste #${nextNum}`;

    openModal('addPosteModal');
}

function handlePosteConsoleSelectChange() {
    const sel = document.getElementById('posteConsoleSelect');
    const selectedType = sel.value;
    if (selectedType) {
        const countSameType = consolesData.filter(c => c.type && c.type.toLowerCase() === selectedType.toLowerCase()).length + 1;
        document.getElementById('posteName').value = `Poste ${selectedType} #${countSameType}`;
    }
}

async function handleAddPoste(e) {
    e.preventDefault();
    const type = document.getElementById('posteConsoleSelect').value;
    const postNumber = document.getElementById('posteNumber').value.trim();
    const name = document.getElementById('posteName').value.trim();

    if (!type) {
        showToast("Veuillez sélectionner une console", "error");
        return;
    }

    const payload = { name, postNumber, type, status: 'available' };

    try {
        const response = await fetch('/api/dashboard/consoles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('API failed');
        showToast("Poste de jeu créé avec succès !");
        closeModal('addPosteModal');
        await fetchConsoles();
        switchConsoleTab('postes');
    } catch (e) {
        showToast("Erreur lors de l'enregistrement", "error");
    }
}

// ---- Modal: Modifier le Poste ----
function openEditConsoleModal(id) {
    const c = consolesData.find(item => item.id === id);
    if (!c) return;

    populatePosteConsoleSelects();

    document.getElementById('editConsoleId').value = c.id;
    document.getElementById('editConsoleName').value = c.name || '';
    document.getElementById('editConsolePost').value = c.postNumber || '';
    document.getElementById('editPosteConsoleSelect').value = c.type || '';
    document.getElementById('editConsoleStatus').value = c.status || 'available';
    document.getElementById('editConsoleGame').value = c.currentGameName || '';

    if (c.freeAt) {
        const d = new Date(c.freeAt);
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        document.getElementById('editConsoleFreeTime').value = `${hours}:${mins}`;
    } else {
        document.getElementById('editConsoleFreeTime').value = '';
    }

    openModal('editConsoleModal');
}

async function handleUpdateConsole(e) {
    e.preventDefault();
    const id = document.getElementById('editConsoleId').value;
    const name = document.getElementById('editConsoleName').value.trim();
    const postNumber = document.getElementById('editConsolePost').value.trim();
    const type = document.getElementById('editPosteConsoleSelect').value;
    const status = document.getElementById('editConsoleStatus').value;
    const currentGameName = document.getElementById('editConsoleGame').value.trim();
    const freeTimeVal = document.getElementById('editConsoleFreeTime').value;

    let freeAt = null;
    if (freeTimeVal) {
        const today = new Date().toISOString().split('T')[0];
        freeAt = `${today}T${freeTimeVal}:00`;
    }

    const payload = { name, postNumber, type, status, currentGameName, freeAt };

    try {
        const response = await fetch(`/api/dashboard/consoles/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('API failed');
        showToast("Poste mis à jour avec succès !");
        closeModal('editConsoleModal');
        fetchConsoles();
    } catch (err) {
        showToast("Erreur lors de la modification", "error");
    }
}

// ---- Action: Update Status ----
async function updateConsoleStatus(id, status) {
    try {
        const response = await fetch(
            `/api/dashboard/consoles/${id}/status?status=${status}`,
            { method: 'PUT' }
        );
        if (!response.ok) throw new Error('API failed');
        showToast("Statut du poste mis à jour !");
        fetchConsoles();
    } catch (e) {
        showToast("Erreur lors de la mise à jour", "error");
    }
}

// ---- Action: Delete Poste ----
async function deleteConsole(id, name) {
    if (!confirm(`Confirmer la suppression du poste "${name}" ?`)) return;

    try {
        const res = await fetch(`/api/dashboard/consoles/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast(`Poste "${name}" supprimé !`);
            fetchConsoles();
        } else {
            showToast("Erreur lors de la suppression", "error");
        }
    } catch (err) {
        showToast("Erreur réseau", "error");
    }
}

// ---- Global Search Listener ----
function initSearch() {
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (activeTab === 'models') {
                renderConsoleModelsGrid();
            } else if (activeTab === 'games') {
                renderAllGamesGrid();
            } else {
                renderConsolesGrid();
            }
        });
    }
}
