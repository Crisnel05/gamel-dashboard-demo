// ============================================================
// RENTALS.JS - Locations & Ventes de Consoles & Jeux Vidéos
// GAMEL Admin Dashboard
// ============================================================

let rentalOffersData = [];   // Offres de consoles (Location & Vente)
let allGamesData = [];       // Tous les jeux vidéos
let consoleModelsData = [];  // Modèles de consoles
let allTransactions = [];    // Commandes & transactions
let activeTab = 'consoles';

// ---- Initialization ----
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        loadRentalOffers(),
        loadGames(),
        loadConsoleModels(),
        loadTransactions()
    ]);
    initSearch();
});

// ---- Fetch Rental & Sale Offers ----
async function loadRentalOffers() {
    try {
        const res = await fetch('/api/dashboard/rentals');
        if (res.ok) {
            rentalOffersData = await res.json();
            renderStats();
            renderRentalConsolesGrid();
            renderSaleConsolesGrid();
        }
    } catch (err) {
        console.error("Error loading offers:", err);
    }
}

// ---- Fetch All Games ----
async function loadGames() {
    try {
        const res = await fetch('/api/dashboard/games');
        if (res.ok) {
            allGamesData = await res.json();
            renderStats();
            renderGamesGrid();
            populateGameSelect();
        }
    } catch (err) {
        console.error("Error loading games:", err);
    }
}

// ---- Fetch Console Models ----
async function loadConsoleModels() {
    try {
        const res = await fetch('/api/dashboard/console-models');
        if (res.ok) {
            consoleModelsData = await res.json();
            populateConsoleSelect();
        }
    } catch (err) {
        console.error("Error loading console models:", err);
    }
}

// ---- Fetch Transactions ----
async function loadTransactions() {
    try {
        const res = await fetch('/api/dashboard/rentals/transactions');
        if (res.ok) {
            allTransactions = await res.json();
            renderStats();
            renderTransactionsTable();
        }
    } catch (err) {
        console.error("Error loading transactions:", err);
    }
}

// ---- Render Global Stats ----
function renderStats() {
    const rentalConsolesEl = document.getElementById('stat-rental-consoles');
    const saleConsolesEl = document.getElementById('stat-sale-consoles');
    const rentalGamesEl = document.getElementById('stat-rental-games');
    const activeRentalsEl = document.getElementById('stat-active-rentals');

    const countTabRentalConsoles = document.getElementById('countTabRentalConsoles');
    const countTabSaleConsoles = document.getElementById('countTabSaleConsoles');
    const countTabRentalGames = document.getElementById('countTabRentalGames');
    const countTabOrders = document.getElementById('countTabOrders');

    const consolesInRental = rentalOffersData.filter(o => o.forRental !== false && o.dailyPrice > 0);
    const consolesInSale = rentalOffersData.filter(o => o.forSale === true || (o.salePrice && o.salePrice > 0));
    const gamesInOffer = allGamesData.filter(g => g.availableForRental || g.availableForSale);

    if (rentalConsolesEl) rentalConsolesEl.innerText = consolesInRental.length;
    if (saleConsolesEl) saleConsolesEl.innerText = consolesInSale.length;
    if (rentalGamesEl) rentalGamesEl.innerText = gamesInOffer.length;

    if (countTabRentalConsoles) countTabRentalConsoles.innerText = consolesInRental.length;
    if (countTabSaleConsoles) countTabSaleConsoles.innerText = consolesInSale.length;
    if (countTabRentalGames) countTabRentalGames.innerText = gamesInOffer.length;
    if (countTabOrders) countTabOrders.innerText = allTransactions.length;

    const activeCount = allTransactions.filter(t => t.status === 'active' || t.status === 'confirmed').length;
    if (activeRentalsEl) activeRentalsEl.innerText = activeCount;
}

// ---- Switch Tabs ----
function switchRentalTab(tab) {
    activeTab = tab;
    const btnConsoles = document.getElementById('tabBtnConsoles');
    const btnSaleConsoles = document.getElementById('tabBtnSaleConsoles');
    const btnGames = document.getElementById('tabBtnGames');
    const btnOrders = document.getElementById('tabBtnOrders');

    const secConsoles = document.getElementById('tabConsolesSection');
    const secSaleConsoles = document.getElementById('tabSaleConsolesSection');
    const secGames = document.getElementById('tabGamesSection');
    const secOrders = document.getElementById('tabOrdersSection');

    [btnConsoles, btnSaleConsoles, btnGames, btnOrders].forEach(b => b && b.classList.remove('active'));
    [secConsoles, secSaleConsoles, secGames, secOrders].forEach(s => s && (s.style.display = 'none'));

    if (tab === 'consoles') {
        if (btnConsoles) btnConsoles.classList.add('active');
        if (secConsoles) secConsoles.style.display = 'block';
        renderRentalConsolesGrid();
    } else if (tab === 'sale_consoles') {
        if (btnSaleConsoles) btnSaleConsoles.classList.add('active');
        if (secSaleConsoles) secSaleConsoles.style.display = 'block';
        renderSaleConsolesGrid();
    } else if (tab === 'games') {
        if (btnGames) btnGames.classList.add('active');
        if (secGames) secGames.style.display = 'block';
        renderGamesGrid();
    } else {
        if (btnOrders) btnOrders.classList.add('active');
        if (secOrders) secOrders.style.display = 'block';
        renderTransactionsTable();
    }
}

// ---- TAB 1: Consoles en Location Grid ----
function renderRentalConsolesGrid() {
    const grid = document.getElementById('rentalConsolesGrid');
    if (!grid) return;

    const query = getSearchQuery();
    let list = rentalOffersData.filter(o => o.forRental !== false && o.dailyPrice > 0);
    if (query) {
        list = list.filter(r => matchesQuery(r, query));
    }

    if (!list || list.length === 0) {
        grid.innerHTML = emptyStateHtml(
            "fa-gamepad",
            "Aucune console en location",
            "Mettez en location une de vos consoles enregistrées avec un tarif journalier.",
            "openPutInRentalModal('console', 'rental')",
            "Mettre une Console en Location"
        );
        return;
    }

    grid.innerHTML = list.map(p => {
        const includesList = p.includes || [];
        return `
            <div class="rental-card" style="border-top: 3px solid var(--primary);">
                <div>
                    <div class="rental-card-top">
                        <div>
                            <div class="rental-title">${p.name}</div>
                            <span class="badge-tag" style="background: rgba(37,166,154,0.15); color: var(--primary-light); font-size: 11px;">
                                <i class="fa-solid fa-gamepad"></i> ${p.consoleType || 'Console'}
                            </span>
                        </div>
                        <div class="rental-price-badge">${p.dailyPrice ? p.dailyPrice.toLocaleString() : '—'} <span style="font-size: 11px; font-weight: normal; color: var(--text-muted);">F/j</span></div>
                    </div>

                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">
                        ${p.description || 'Console disponible pour livraison et location à domicile.'}
                    </div>

                    <div class="rental-includes-list">
                        ${includesList.map(item => `
                            <div class="include-item">
                                <i class="fa-solid fa-check"></i>
                                <span>${item}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin: 12px 0 16px;">
                        <span class="units-indicator" style="background: rgba(37,166,154,0.1); padding: 4px 10px; border-radius: 20px;">
                            <i class="fa-solid fa-boxes-stacked"></i> ${p.availableUnits || 1} unité(s) en stock
                        </span>
                        <span class="badge-tag status-active">Location Actif</span>
                    </div>

                    <div class="rental-actions" style="display: flex; gap: 8px; border-top: 1px solid var(--glass-border); padding-top: 12px;">
                        <button class="btn btn-sm btn-outline" style="flex: 1;" onclick="openEditConsoleOfferModal('${p.id}', 'rental')">
                            <i class="fa-solid fa-pen"></i> Modifier
                        </button>
                        <button class="btn btn-sm btn-outline" style="color: var(--error); border-color: rgba(239,83,80,0.3);" onclick="handleDeleteConsoleOffer('${p.id}', '${p.name.replace(/'/g, "\\'")}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ---- TAB 2: Consoles en Vente Grid ----
function renderSaleConsolesGrid() {
    const grid = document.getElementById('saleConsolesGrid');
    if (!grid) return;

    const query = getSearchQuery();
    let list = rentalOffersData.filter(o => o.forSale === true || (o.salePrice && o.salePrice > 0));
    if (query) {
        list = list.filter(r => matchesQuery(r, query));
    }

    if (!list || list.length === 0) {
        grid.innerHTML = emptyStateHtml(
            "fa-store",
            "Aucune console en vente",
            "Mettez en vente vos consoles neuves ou d'occasion avec un prix d'achat définitif.",
            "openPutInRentalModal('console', 'sale')",
            "Mettre une Console en Vente"
        );
        return;
    }

    grid.innerHTML = list.map(p => {
        const includesList = p.includes || [];
        return `
            <div class="rental-card" style="border-top: 3px solid #25a69a;">
                <div>
                    <div class="rental-card-top">
                        <div>
                            <div class="rental-title">${p.name}</div>
                            <div style="display: flex; gap: 6px; margin-top: 4px;">
                                <span class="badge-tag" style="background: rgba(37,166,154,0.15); color: var(--primary-light); font-size: 11px;">
                                    <i class="fa-solid fa-gamepad"></i> ${p.consoleType || 'Console'}
                                </span>
                                <span class="badge-tag" style="font-size: 10px; background: rgba(255,255,255,0.06);">
                                    ${p.itemCondition || 'Très bon état'}
                                </span>
                            </div>
                        </div>
                        <div class="rental-price-badge" style="color: #25a69a;">${p.salePrice ? p.salePrice.toLocaleString() : (p.dailyPrice * 25).toLocaleString()} <span style="font-size: 11px; font-weight: normal; color: var(--text-muted);">FCFA</span></div>
                    </div>

                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">
                        ${p.description || 'Console disponible à la vente avec garantie et accessoires.'}
                    </div>

                    <div class="rental-includes-list">
                        ${includesList.map(item => `
                            <div class="include-item">
                                <i class="fa-solid fa-check"></i>
                                <span>${item}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin: 12px 0 16px;">
                        <span class="units-indicator" style="background: rgba(37,166,154,0.1); padding: 4px 10px; border-radius: 20px;">
                            <i class="fa-solid fa-boxes-stacked"></i> ${p.availableUnits || 1} unité(s) neuves/dispos
                        </span>
                        <span class="badge-tag status-active" style="background: rgba(37,166,154,0.2); color: #80CBC4;">Vente Disponible</span>
                    </div>

                    <div class="rental-actions" style="display: flex; gap: 8px; border-top: 1px solid var(--glass-border); padding-top: 12px;">
                        <button class="btn btn-sm btn-outline" style="flex: 1;" onclick="openEditConsoleOfferModal('${p.id}', 'sale')">
                            <i class="fa-solid fa-pen"></i> Modifier Prix / Stock
                        </button>
                        <button class="btn btn-sm btn-outline" style="color: var(--error); border-color: rgba(239,83,80,0.3);" onclick="handleDeleteConsoleOffer('${p.id}', '${p.name.replace(/'/g, "\\'")}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ---- TAB 3: Jeux Vidéos en Vente & Location Grid ----
function renderGamesGrid() {
    const grid = document.getElementById('rentalGamesGrid');
    if (!grid) return;

    const query = getSearchQuery();
    let list = allGamesData.filter(g => g.availableForRental || g.availableForSale);
    if (query) {
        list = list.filter(g => 
            (g.name && g.name.toLowerCase().includes(query)) ||
            (g.console && g.console.toLowerCase().includes(query)) ||
            (g.genre && g.genre.toLowerCase().includes(query))
        );
    }

    if (!list || list.length === 0) {
        grid.innerHTML = emptyStateHtml(
            "fa-dice-d20",
            "Aucun jeu en vente ou location",
            "Mettez vos jeux vidéos enregistrés en location (tarif journalier) ou en vente définitive.",
            "openPutInRentalModal('game', 'rental')",
            "Mettre un Jeu en Vente / Location"
        );
        return;
    }

    grid.innerHTML = list.map(g => {
        const rentalBadge = g.availableForRental 
            ? `<div style="background: var(--surface-elevated); padding: 8px 12px; border-radius: 8px; border-left: 2px solid var(--primary);">
                 <span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Location</span>
                 <div class="font-orbitron" style="font-weight: 700; color: #FFD700; font-size: 13px;">${g.dailyRentalPrice ? g.dailyRentalPrice.toLocaleString() + ' F/j' : 'Non dispo'}</div>
               </div>` : '';

        const saleBadge = g.availableForSale && g.salePrice > 0
            ? `<div style="background: var(--surface-elevated); padding: 8px 12px; border-radius: 8px; border-left: 2px solid #25a69a;">
                 <span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Achat / Vente</span>
                 <div class="font-orbitron" style="font-weight: 700; color: #80CBC4; font-size: 13px;">${g.salePrice.toLocaleString()} FCFA</div>
               </div>` : '';

        return `
            <div class="rental-card" style="border-top: 3px solid ${g.accentColor || 'var(--primary)'};">
                <div>
                    <div class="rental-card-top">
                        <div>
                            <div class="rental-title">${g.name}</div>
                            <span class="badge-tag" style="background: rgba(37,166,154,0.15); color: var(--primary-light); font-size: 11px;">
                                <i class="fa-solid fa-gamepad"></i> ${g.console || 'Console'}
                            </span>
                        </div>
                        <span class="badge-tag">${g.genre || 'Action'}</span>
                    </div>

                    <div style="display: grid; grid-template-columns: ${g.availableForRental && g.availableForSale ? '1fr 1fr' : '1fr'}; gap: 8px; margin: 12px 0;">
                        ${rentalBadge}
                        ${saleBadge}
                    </div>

                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">
                        ${g.description || 'Titre disponible en salle, à emporter ou à l\'achat.'}
                    </div>
                </div>

                <div>
                    <div class="rental-actions" style="display: flex; gap: 8px; border-top: 1px solid var(--glass-border); padding-top: 12px; margin-top: 12px;">
                        <button class="btn btn-sm btn-outline" style="flex: 1;" onclick="openEditGameOfferModal('${g.id}')">
                            <i class="fa-solid fa-pen"></i> Modifier Offres
                        </button>
                        <button class="btn btn-sm btn-outline" style="color: var(--error); border-color: rgba(239,83,80,0.3);" onclick="handleRemoveGameFromOffers('${g.id}', '${g.name.replace(/'/g, "\\'")}')" title="Retirer des offres">
                            <i class="fa-solid fa-ban"></i> Retirer
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ---- TAB 4: Transactions Table ----
function renderTransactionsTable() {
    const tbody = document.getElementById('rentalTransactionsBody');
    if (!tbody) return;

    if (!allTransactions || allTransactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 32px; color: var(--text-muted);">
                    <i class="fa-solid fa-receipt" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                    Aucune commande enregistrée.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = allTransactions.map(t => {
        let statusBadge = '<span class="badge-tag status-active">En cours</span>';
        if (t.status === 'completed' || t.status === 'returned') {
            statusBadge = '<span class="badge-tag status-offline">Terminé / Restitué</span>';
        } else if (t.status === 'confirmed') {
            statusBadge = '<span class="badge-tag status-busy">Confirmé / Livré</span>';
        }

        return `
            <tr>
                <td>
                    <div style="font-weight: 700; color: var(--text-primary); font-family: 'Orbitron', sans-serif;">${t.id}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">${t.userName || 'Client'}</div>
                </td>
                <td>
                    <div style="font-weight: 600; color: var(--primary-light);">${t.itemName}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">${t.dailyPrice ? t.dailyPrice.toLocaleString() + ' F/jour' : 'Achat'}</div>
                </td>
                <td>
                    <span class="badge-tag" style="background: rgba(37,166,154,0.15); color: var(--primary-light);">
                        ${t.rentalDays ? `${t.rentalDays} jour(s) [Location]` : 'Vente Définitive'}
                    </span>
                </td>
                <td>
                    <span style="font-weight: 700; color: #FFD700; font-family: 'Orbitron', sans-serif;">${t.totalAmount ? t.totalAmount.toLocaleString() : 0} FCFA</span>
                </td>
                <td>
                    <span class="badge-tag" style="text-transform: uppercase;">${t.paymentMethod || 'Wave'}</span>
                </td>
                <td>
                    <div style="font-size: 12px; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <i class="fa-solid fa-location-dot" style="color: var(--primary);"></i> ${t.deliveryAddress || 'Dakar'}
                    </div>
                </td>
                <td>${statusBadge}</td>
                <td>
                    ${t.status === 'active' || t.status === 'confirmed' ? `
                        <button class="btn btn-sm btn-primary" onclick="markRentalReturned('${t.id}')">
                            <i class="fa-solid fa-rotate-left"></i> Clôturer / Restituer
                        </button>
                    ` : '<span style="font-size: 12px; color: var(--text-muted);"><i class="fa-solid fa-check"></i> Traité</span>'}
                </td>
            </tr>
        `;
    }).join('');
}

async function markRentalReturned(id) {
    if (!confirm("Valider la clôture / restitution de cette commande ?")) return;
    try {
        const res = await fetch(`/api/dashboard/rentals/transactions/${id}/return`, { method: 'PUT' });
        if (res.ok) {
            showToast("Commande clôturée avec succès !");
            await loadTransactions();
            await loadRentalOffers();
        }
    } catch (e) {
        showToast("Erreur réseau", "error");
    }
}

// ---- Populate Selects ----
function populateConsoleSelect() {
    const sel = document.getElementById('rentalConsoleSelect');
    if (!sel) return;
    if (!consoleModelsData || consoleModelsData.length === 0) {
        sel.innerHTML = `<option value="">-- Aucune console (Ajoutez d'abord une console dans Consoles) --</option>`;
    } else {
        sel.innerHTML = consoleModelsData.map(m => `<option value="${m.name}">${m.name} (${m.manufacturer || 'Console'})</option>`).join('');
    }
}

function populateGameSelect() {
    const sel = document.getElementById('rentalGameSelect');
    if (!sel) return;
    if (!allGamesData || allGamesData.length === 0) {
        sel.innerHTML = `<option value="">-- Aucun jeu (Ajoutez d'abord un jeu dans Catalogue) --</option>`;
    } else {
        sel.innerHTML = allGamesData.map(g => `<option value="${g.id}" data-name="${g.name}" data-price="${g.dailyRentalPrice || 2500}" data-saleprice="${g.salePrice || 25000}" data-console="${g.console}">${g.name} [${g.console}]</option>`).join('');
    }
}

// ---- Modal: Proposer une Offre ----
function openPutInRentalModal(defaultCategory, defaultMode) {
    document.getElementById('putInRentalForm').reset();
    document.getElementById('rentalItemId').value = '';
    document.getElementById('rentalModalTitle').innerText = "Ajouter une Offre (Location / Vente)";
    document.getElementById('saveRentalBtn').innerText = "Publier l'Offre";

    populateConsoleSelect();
    populateGameSelect();

    if (defaultCategory) document.getElementById('rentalItemCategory').value = defaultCategory;
    if (defaultMode) document.getElementById('rentalOfferMode').value = defaultMode;

    handleOfferCategoryChange();
    openModal('putInRentalModal');
}

function handleOfferCategoryChange() {
    const cat = document.getElementById('rentalItemCategory').value;
    const mode = document.getElementById('rentalOfferMode').value;

    const groupConsole = document.getElementById('groupConsoleSelect');
    const groupGame = document.getElementById('groupGameSelect');
    const groupCondition = document.getElementById('groupCondition');
    const groupIncludes = document.getElementById('groupIncludes');
    const labelPrice = document.getElementById('labelOfferPrice');

    if (cat === 'console') {
        if (groupConsole) groupConsole.style.display = 'block';
        if (groupGame) groupGame.style.display = 'none';
        if (groupIncludes) groupIncludes.style.display = 'block';
        handleRentalConsoleSelectChange();
    } else {
        if (groupConsole) groupConsole.style.display = 'none';
        if (groupGame) groupGame.style.display = 'block';
        if (groupIncludes) groupIncludes.style.display = 'none';
        handleRentalGameSelectChange();
    }

    if (mode === 'sale') {
        if (groupCondition) groupCondition.style.display = 'block';
        if (labelPrice) labelPrice.innerText = "Prix de Vente Définitif (FCFA)";
    } else {
        if (groupCondition) groupCondition.style.display = 'none';
        if (labelPrice) labelPrice.innerText = "Tarif Journalier de Location (FCFA / jour)";
    }
}

function handleRentalConsoleSelectChange() {
    const sel = document.getElementById('rentalConsoleSelect');
    const mode = document.getElementById('rentalOfferMode').value;
    const name = sel.value;
    if (name) {
        if (mode === 'sale') {
            document.getElementById('rentalOfferName').value = `Console ${name} neuve / occasion`;
            document.getElementById('rentalDailyPrice').value = 250000;
        } else {
            document.getElementById('rentalOfferName').value = `Location ${name} à domicile`;
            document.getElementById('rentalDailyPrice').value = 10000;
        }
        document.getElementById('rentalIncludes').value = "2 Manettes sans fil, Câble HDMI, Câbles d'alimentation, Boîtier";
    }
}

function handleRentalGameSelectChange() {
    const sel = document.getElementById('rentalGameSelect');
    const mode = document.getElementById('rentalOfferMode').value;
    const opt = sel.options[sel.selectedIndex];
    if (opt && opt.value) {
        const gameName = opt.dataset.name;
        const consoleName = opt.dataset.console;
        if (mode === 'sale') {
            document.getElementById('rentalOfferName').value = `Jeu ${gameName} [${consoleName}] (Achat)`;
            document.getElementById('rentalDailyPrice').value = opt.dataset.saleprice || 25000;
        } else {
            document.getElementById('rentalOfferName').value = `Jeu ${gameName} [${consoleName}] (Location)`;
            document.getElementById('rentalDailyPrice').value = opt.dataset.price || 2500;
        }
    }
}

function openEditConsoleOfferModal(id, mode) {
    const p = rentalOffersData.find(item => item.id === id);
    if (!p) return;

    openPutInRentalModal('console', mode);

    document.getElementById('rentalItemId').value = p.id;
    document.getElementById('rentalModalTitle').innerText = mode === 'sale' ? "Modifier la Vente de Console" : "Modifier la Location de Console";
    document.getElementById('saveRentalBtn').innerText = "Enregistrer les modifications";

    document.getElementById('rentalConsoleSelect').value = p.consoleType || '';
    document.getElementById('rentalOfferName').value = p.name || '';
    document.getElementById('rentalDailyPrice').value = (mode === 'sale' && p.salePrice) ? p.salePrice : (p.dailyPrice || 10000);
    document.getElementById('rentalUnits').value = p.availableUnits || 1;
    document.getElementById('rentalCondition').value = p.itemCondition || 'Neuf sous blister';
    document.getElementById('rentalIncludes').value = (p.includes || []).join(', ');
    document.getElementById('rentalDescription').value = p.description || '';
}

function openEditGameOfferModal(gameId) {
    const g = allGamesData.find(item => item.id === gameId);
    if (!g) return;

    openPutInRentalModal('game', g.availableForSale ? 'sale' : 'rental');

    document.getElementById('rentalItemId').value = g.id;
    document.getElementById('rentalModalTitle').innerText = "Modifier les Offres du Jeu Vidéo";
    document.getElementById('saveRentalBtn').innerText = "Enregistrer";

    document.getElementById('rentalGameSelect').value = g.id;
    document.getElementById('rentalOfferName').value = `${g.name} (${g.console})`;
    document.getElementById('rentalDailyPrice').value = g.availableForSale && g.salePrice ? g.salePrice : (g.dailyRentalPrice || 2500);
    document.getElementById('rentalUnits').value = g.saleStock || 1;
    document.getElementById('rentalDescription').value = g.description || '';
}

async function handleSaveRental(e) {
    e.preventDefault();
    const cat = document.getElementById('rentalItemCategory').value;
    const mode = document.getElementById('rentalOfferMode').value;
    const editId = document.getElementById('rentalItemId').value;

    if (cat === 'console') {
        const consoleType = document.getElementById('rentalConsoleSelect').value;
        const name = document.getElementById('rentalOfferName').value.trim();
        const price = parseFloat(document.getElementById('rentalDailyPrice').value) || 0;
        const availableUnits = parseInt(document.getElementById('rentalUnits').value) || 1;
        const condition = document.getElementById('rentalCondition').value;
        const rawIncludes = document.getElementById('rentalIncludes').value;
        const includes = rawIncludes.split(',').map(s => s.trim()).filter(s => s.length > 0);
        const description = document.getElementById('rentalDescription').value.trim();

        if (!consoleType) {
            showToast("Veuillez sélectionner une console", "error");
            return;
        }

        const payload = {
            name,
            consoleType,
            dailyPrice: mode === 'rental' ? price : 0,
            salePrice: mode === 'sale' ? price : 0,
            forRental: mode === 'rental',
            forSale: mode === 'sale',
            itemCondition: condition,
            availableUnits,
            includes,
            description,
            status: 'available'
        };

        try {
            let res;
            if (editId) {
                res = await fetch(`/api/dashboard/rentals/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                res = await fetch('/api/dashboard/rentals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (!res.ok) throw new Error('API failed');
            showToast(`Offre "${name}" enregistrée avec succès !`);
            closeModal('putInRentalModal');
            await loadRentalOffers();
            switchRentalTab(mode === 'sale' ? 'sale_consoles' : 'consoles');
        } catch (err) {
            showToast("Erreur lors de l'enregistrement de l'offre", "error");
        }
    } else {
        // Game offer
        const gameId = editId || document.getElementById('rentalGameSelect').value;
        const price = parseFloat(document.getElementById('rentalDailyPrice').value) || 0;
        const units = parseInt(document.getElementById('rentalUnits').value) || 1;
        const description = document.getElementById('rentalDescription').value.trim();

        const g = allGamesData.find(item => item.id === gameId);
        if (!g) {
            showToast("Veuillez sélectionner un jeu", "error");
            return;
        }

        const payload = {
            ...g,
            availableForRental: mode === 'rental' ? true : g.availableForRental,
            dailyRentalPrice: mode === 'rental' ? price : g.dailyRentalPrice,
            availableForSale: mode === 'sale' ? true : g.availableForSale,
            salePrice: mode === 'sale' ? price : g.salePrice,
            saleStock: mode === 'sale' ? units : g.saleStock,
            description: description || g.description
        };

        try {
            const res = await fetch(`/api/dashboard/games/${gameId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('API failed');
            showToast(`Offre pour "${g.name}" enregistrée !`);
            closeModal('putInRentalModal');
            await loadGames();
            switchRentalTab('games');
        } catch (err) {
            showToast("Erreur lors de l'enregistrement de l'offre de jeu", "error");
        }
    }
}

async function handleDeleteConsoleOffer(id, name) {
    if (!confirm(`Supprimer l'offre "${name}" ?`)) return;
    try {
        const res = await fetch(`/api/dashboard/rentals/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast(`Offre "${name}" supprimée`);
            await loadRentalOffers();
        }
    } catch (e) {
        showToast("Erreur réseau", "error");
    }
}

async function handleRemoveGameFromOffers(gameId, gameName) {
    if (!confirm(`Retirer le jeu "${gameName}" des offres de vente et location ?`)) return;
    const g = allGamesData.find(item => item.id === gameId);
    if (!g) return;

    const payload = { ...g, availableForRental: false, availableForSale: false };
    try {
        const res = await fetch(`/api/dashboard/games/${gameId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showToast(`Jeu "${gameName}" retiré des offres`);
            await loadGames();
        }
    } catch (e) {
        showToast("Erreur réseau", "error");
    }
}

// ---- Helpers ----
function getSearchQuery() {
    const el = document.getElementById('globalSearch');
    return el ? el.value.trim().toLowerCase() : '';
}

function matchesQuery(item, query) {
    return (item.name && item.name.toLowerCase().includes(query)) ||
           (item.consoleType && item.consoleType.toLowerCase().includes(query)) ||
           (item.description && item.description.toLowerCase().includes(query));
}

function emptyStateHtml(icon, title, desc, actionFn, actionText) {
    return `
        <div style="grid-column: 1/-1; text-align: center; padding: 48px; background: var(--surface-card); border-radius: 16px; border: 1px dashed var(--glass-border);">
            <i class="fa-solid ${icon}" style="font-size: 40px; color: var(--text-muted); margin-bottom: 12px;"></i>
            <h3 style="color: var(--text-primary); margin-bottom: 6px;">${title}</h3>
            <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 16px;">${desc}</p>
            <button class="btn btn-primary btn-sm" onclick="${actionFn}">
                <i class="fa-solid fa-plus"></i> ${actionText}
            </button>
        </div>
    `;
}

function initSearch() {
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (activeTab === 'consoles') renderRentalConsolesGrid();
            else if (activeTab === 'sale_consoles') renderSaleConsolesGrid();
            else if (activeTab === 'games') renderGamesGrid();
            else renderTransactionsTable();
        });
    }
}
