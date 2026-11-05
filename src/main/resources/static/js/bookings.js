// ============================================================
// BOOKINGS.JS - Réservations: fetch, render, filter, actions
// GAMEL Admin Dashboard
// ============================================================

let bookingsData = [];
let selectedBookingId = null;

// ---- Initialization ----
document.addEventListener('DOMContentLoaded', () => {
    fetchBookings();
    // Auto-refresh : récupère les réservations toutes les 15 secondes
    AutoRefresh.start(fetchBookings, 15000);
});

// ---- Fetch All Bookings ----
async function fetchBookings() {
    try {
        const response = await fetch('/api/dashboard/bookings');
        if (!response.ok) throw new Error('Network response error');

        bookingsData = await response.json();
        AutoRefresh.markSynced();
        renderBookingsTable(bookingsData);
    } catch (error) {
        console.error('[Bookings] Error fetching bookings:', error);
    }
}

// ---- Render Full Bookings Table ----
function renderBookingsTable(bookings) {
    const tbody = document.getElementById('bookingsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center">Aucune réservation trouvée</td></tr>`;
        return;
    }

    bookings.forEach(b => {
        const start = new Date(b.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const end   = new Date(b.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const date  = new Date(b.startTime).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><small class="font-orbitron text-muted">${b.id.substring(0, 8)}</small></td>
            <td><strong>${b.userName || 'Joueur'}</strong></td>
            <td>
                <div>${b.gameName}</div>
                <small class="text-muted">${b.consoleName}</small>
            </td>
            <td><span class="badge-status" style="background-color: var(--surface-elevated); border: 1px solid var(--glass-border); font-family: 'Orbitron'; font-size: 11px;">${b.posteName || 'POST'}</span></td>
            <td>
                <div>${date}</div>
                <small class="text-muted">${start} - ${end}</small>
            </td>
            <td class="font-orbitron text-primary">${b.totalAmount.toLocaleString('fr-FR')} F</td>
            <td><span class="pay-status ${b.paymentStatus || 'pending'}">${b.paymentStatus || 'pending'}</span></td>
            <td><span class="font-orbitron" style="letter-spacing: 2px; color: #FFD700; font-size: 12px;">${b.validationCode || '—'}</span></td>
            <td><span class="badge-status ${b.status}">${b.status}</span></td>
            <td>${getActionButtons(b)}</td>
        `;
        tbody.appendChild(row);
    });
}

// ---- Open & Handle Create Booking Modal ----
let modalGames = [];
let modalConsoles = [];
let modalPlayers = [];

async function openCreateBookingModal() {
    document.getElementById('createBookingForm').reset();
    document.getElementById('bookingDate').value = new Date().toISOString().split('T')[0];

    try {
        const [playersRes, gamesRes, consolesRes] = await Promise.all([
            fetch('/api/dashboard/players'),
            fetch('/api/dashboard/games'),
            fetch('/api/dashboard/consoles')
        ]);
        modalPlayers = await playersRes.json();
        modalGames = await gamesRes.json();
        modalConsoles = await consolesRes.json();

        const playerSelect = document.getElementById('bookingPlayerSelect');
        if (!modalPlayers || modalPlayers.length === 0) {
            playerSelect.innerHTML = `<option value="">-- Aucun joueur enregistré --</option>`;
        } else {
            playerSelect.innerHTML = modalPlayers.map(p => `<option value="${p.id}" data-name="${p.name}">${p.name} (Niv. ${p.level} • ${p.phone})</option>`).join('');
        }

        const gameSelect = document.getElementById('bookingGameSelect');
        if (!modalGames || modalGames.length === 0) {
            gameSelect.innerHTML = `<option value="">-- Aucun jeu enregistré --</option>`;
        } else {
            gameSelect.innerHTML = modalGames.map(g => `<option value="${g.id}" data-name="${g.name}" data-price="${g.pricePerHour}">${g.name} (${(g.console || '').toUpperCase()} - ${g.pricePerHour} F/h)</option>`).join('');
        }

        const consoleSelect = document.getElementById('bookingConsoleSelect');
        if (!modalConsoles || modalConsoles.length === 0) {
            consoleSelect.innerHTML = `<option value="">-- Aucun poste configuré --</option>`;
        } else {
            consoleSelect.innerHTML = modalConsoles.map(c => `<option value="${c.id}" data-name="${c.name}" data-poste="${c.name}">${c.name} [${(c.type || '').toUpperCase()}] - ${c.status}</option>`).join('');
        }

        openModal('createBookingModal');
    } catch (e) {
        showToast("Erreur lors du chargement des options", "error");
    }
}

async function handleCreateBooking(e) {
    e.preventDefault();

    const pSel = document.getElementById('bookingPlayerSelect');
    const gSel = document.getElementById('bookingGameSelect');
    const cSel = document.getElementById('bookingConsoleSelect');

    const selectedPlayer = pSel.options[pSel.selectedIndex];
    const selectedGame = gSel.options[gSel.selectedIndex];
    const selectedConsole = cSel.options[cSel.selectedIndex];

    const dateVal = document.getElementById('bookingDate').value;
    const startVal = document.getElementById('bookingStart').value;
    const endVal = document.getElementById('bookingEnd').value;

    const payload = {
        userId: pSel.value,
        userName: selectedPlayer.dataset.name,
        gameId: gSel.value,
        gameName: selectedGame.dataset.name,
        consoleId: cSel.value,
        consoleName: selectedConsole.dataset.name,
        posteName: selectedConsole.dataset.poste,
        startTime: `${dateVal}T${startVal}:00`,
        endTime: `${dateVal}T${endVal}:00`,
        totalAmount: parseFloat(document.getElementById('bookingAmount').value) || 2000,
        status: "confirmed",
        paymentMethod: document.getElementById('bookingPaymentMethod').value,
        paymentStatus: "success"
    };

    try {
        const res = await fetch('/api/dashboard/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast("Réservation créée avec succès !");
            closeModal('createBookingModal');
            fetchBookings();
        } else {
            showToast("Erreur lors de la création", "error");
        }
    } catch (err) {
        showToast("Erreur réseau", "error");
    }
}

// ---- Filter Bookings by Tab ----
function filterBookings(status) {
    // Update active tab styling
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        const label = tab.innerText.toLowerCase();
        const matches =
            (status === 'all'       && label.includes('tout')) ||
            (status === 'pending'   && label.includes('attente')) ||
            (status === 'confirmed' && label.includes('confirm')) ||
            (status === 'active'    && label.includes('active')) ||
            (status === 'completed' && label.includes('termin')) ||
            (status === 'cancelled' && label.includes('annul'));
        if (matches) tab.classList.add('active');
    });

    if (status === 'all') {
        renderBookingsTable(bookingsData);
    } else {
        const filtered = bookingsData.filter(b => b.status.toLowerCase() === status.toLowerCase());
        renderBookingsTable(filtered);
    }
}

// ---- Action: Confirm Booking ----
async function confirmBooking(id) {
    if (!confirm('Confirmer cette réservation ?')) return;
    try {
        const response = await fetch(`/api/dashboard/bookings/${id}/confirm`, { method: 'PUT' });
        if (!response.ok) throw new Error('API failed');
        fetchBookings();
    } catch (e) {
        alert('Erreur lors de la confirmation: ' + e.message);
    }
}

// ---- Action: Cancel Booking ----
async function cancelBooking(id) {
    if (!confirm('Annuler cette réservation ?')) return;
    try {
        const response = await fetch(`/api/dashboard/bookings/${id}/cancel`, { method: 'PUT' });
        if (!response.ok) throw new Error('API failed');
        fetchBookings();
    } catch (e) {
        alert("Erreur lors de l'annulation: " + e.message);
    }
}

// ---- Action: Complete / Close Booking ----
async function completeBooking(id) {
    if (!confirm('Clôturer et terminer cette réservation ?')) return;
    try {
        const response = await fetch(`/api/dashboard/bookings/${id}/complete`, { method: 'PUT' });
        if (!response.ok) throw new Error('API failed');
        showToast('Réservation terminée et clôturée !');
        fetchBookings();
    } catch (e) {
        showToast('Erreur lors de la clôture: ' + e.message, 'error');
    }
}

// ---- Action: Delete Booking ----
async function deleteBooking(id) {
    if (!confirm('Voulez-vous supprimer définitivement cette réservation ?')) return;
    try {
        const response = await fetch(`/api/dashboard/bookings/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Échec de la suppression');
        showToast('Réservation supprimée avec succès !');
        fetchBookings();
    } catch (e) {
        showToast('Erreur lors de la suppression: ' + e.message, 'error');
    }
}

// ---- Shared: Action Buttons HTML ----
function getActionButtons(booking) {
    let html = `<div class="action-buttons" style="display: inline-flex; gap: 6px; align-items: center; white-space: nowrap;">`;

    if (booking.status === 'pending') {
        html += `
            <button class="btn btn-outline btn-sm confirm" onclick="confirmBooking('${booking.id}')" title="Confirmer" style="padding: 4px 8px; font-size: 11px; color: var(--success); border-color: rgba(37,166,154,0.35);">
                <i class="fa-solid fa-check"></i> Confirmer
            </button>
            <button class="btn btn-outline btn-sm cancel" onclick="cancelBooking('${booking.id}')" title="Annuler" style="padding: 4px 8px; font-size: 11px; color: var(--error); border-color: rgba(239,83,80,0.35);">
                <i class="fa-solid fa-times"></i>
            </button>
        `;
    } else if (booking.status === 'confirmed') {
        html += `
            <button class="btn btn-primary btn-sm" onclick="openValidationModal('${booking.id}')" style="padding: 4px 10px; font-size: 11px;">
                <i class="fa-solid fa-play"></i> Activer
            </button>
        `;
    } else if (booking.status === 'active') {
        html += `
            <button class="btn btn-outline btn-sm" onclick="completeBooking('${booking.id}')" title="Clôturer la session" style="padding: 4px 10px; font-size: 11px; border-color: var(--primary); color: var(--primary-light);">
                <i class="fa-solid fa-flag-checkered"></i> Terminer
            </button>
        `;
    }

    // Explicit Edit Button
    html += `
        <button class="btn btn-outline btn-sm" onclick="openEditBookingModal('${booking.id}')" title="Modifier la réservation" style="padding: 4px 9px; font-size: 11px; color: var(--primary-light); border-color: var(--glass-border-hover);">
            <i class="fa-solid fa-pen-to-square"></i> Modifier
        </button>
    `;

    // Explicit Delete Button
    html += `
        <button class="btn btn-outline btn-sm" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.35); padding: 4px 9px; font-size: 11px;" onclick="deleteBooking('${booking.id}')" title="Supprimer définitivement">
            <i class="fa-solid fa-trash"></i> Supprimer
        </button>
    `;

    html += `</div>`;
    return html;
}

// ---- Open & Handle Edit Booking Modal ----
async function openEditBookingModal(id) {
    const booking = bookingsData.find(b => b.id === id);
    if (!booking) return;

    try {
        if (!modalPlayers.length || !modalGames.length || !modalConsoles.length) {
            const [playersRes, gamesRes, consolesRes] = await Promise.all([
                fetch('/api/dashboard/players'),
                fetch('/api/dashboard/games'),
                fetch('/api/dashboard/consoles')
            ]);
            modalPlayers = await playersRes.json();
            modalGames = await gamesRes.json();
            modalConsoles = await consolesRes.json();
        }

        const playerSelect = document.getElementById('editBookingPlayerSelect');
        playerSelect.innerHTML = modalPlayers.map(p => `<option value="${p.id}" data-name="${p.name}" ${p.id === booking.userId ? 'selected' : ''}>${p.name} (Niv. ${p.level} • ${p.phone})</option>`).join('');

        const gameSelect = document.getElementById('editBookingGameSelect');
        gameSelect.innerHTML = modalGames.map(g => `<option value="${g.id}" data-name="${g.name}" ${g.id === booking.gameId ? 'selected' : ''}>${g.name} (${(g.console || '').toUpperCase()})</option>`).join('');

        const consoleSelect = document.getElementById('editBookingConsoleSelect');
        consoleSelect.innerHTML = modalConsoles.map(c => `<option value="${c.id}" data-name="${c.name}" data-poste="${c.name}" ${c.id === booking.consoleId ? 'selected' : ''}>${c.name} [${(c.type || '').toUpperCase()}] - ${c.status}</option>`).join('');

        document.getElementById('editBookingId').value = booking.id;

        if (booking.startTime) {
            const startDate = new Date(booking.startTime);
            document.getElementById('editBookingDate').value = startDate.toISOString().split('T')[0];
            document.getElementById('editBookingStart').value = startDate.toTimeString().substring(0, 5);
        }
        if (booking.endTime) {
            const endDate = new Date(booking.endTime);
            document.getElementById('editBookingEnd').value = endDate.toTimeString().substring(0, 5);
        }

        document.getElementById('editBookingAmount').value = booking.totalAmount || 2000;
        document.getElementById('editBookingStatus').value = booking.status || 'confirmed';
        document.getElementById('editBookingCode').value = booking.validationCode || '';
        document.getElementById('editBookingPaymentMethod').value = booking.paymentMethod || 'cash';
        document.getElementById('editBookingPaymentStatus').value = booking.paymentStatus || 'success';

        openModal('editBookingModal');
    } catch (e) {
        showToast("Erreur lors de l'ouverture de la modification", "error");
    }
}

async function handleUpdateBooking(e) {
    e.preventDefault();

    const id = document.getElementById('editBookingId').value;
    const pSel = document.getElementById('editBookingPlayerSelect');
    const gSel = document.getElementById('editBookingGameSelect');
    const cSel = document.getElementById('editBookingConsoleSelect');

    const selectedPlayer = pSel.options[pSel.selectedIndex];
    const selectedGame = gSel.options[gSel.selectedIndex];
    const selectedConsole = cSel.options[cSel.selectedIndex];

    const dateVal = document.getElementById('editBookingDate').value;
    const startVal = document.getElementById('editBookingStart').value;
    const endVal = document.getElementById('editBookingEnd').value;

    const payload = {
        userId: pSel.value,
        userName: selectedPlayer ? selectedPlayer.dataset.name : undefined,
        gameId: gSel.value,
        gameName: selectedGame ? selectedGame.dataset.name : undefined,
        consoleId: cSel.value,
        consoleName: selectedConsole ? selectedConsole.dataset.name : undefined,
        posteName: selectedConsole ? selectedConsole.dataset.poste : undefined,
        startTime: `${dateVal}T${startVal}:00`,
        endTime: `${dateVal}T${endVal}:00`,
        totalAmount: parseFloat(document.getElementById('editBookingAmount').value) || 2000,
        status: document.getElementById('editBookingStatus').value,
        validationCode: document.getElementById('editBookingCode').value.trim(),
        paymentMethod: document.getElementById('editBookingPaymentMethod').value,
        paymentStatus: document.getElementById('editBookingPaymentStatus').value
    };

    try {
        const res = await fetch(`/api/dashboard/bookings/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast("Réservation modifiée avec succès !");
            closeModal('editBookingModal');
            fetchBookings();
        } else {
            showToast("Erreur lors de la modification", "error");
        }
    } catch (err) {
        showToast("Erreur réseau", "error");
    }
}

// ---- Validation Modal (Activate Booking) ----
function openValidationModal(id) {
    selectedBookingId = id;
    document.getElementById('validationCodeInput').value = '';
    document.getElementById('validationError').innerText = '';
    openModal('validationModal');
}

async function submitValidation() {
    const code = document.getElementById('validationCodeInput').value.trim();
    if (!code) {
        document.getElementById('validationError').innerText = 'Veuillez saisir un code';
        return;
    }

    try {
        const response = await fetch(
            `/api/dashboard/bookings/${selectedBookingId}/validate?code=${code}`,
            { method: 'PUT' }
        );

        if (response.ok) {
            closeModal('validationModal');
            fetchBookings();
        } else {
            const errData = await response.json();
            document.getElementById('validationError').innerText =
                errData.message || 'Validation échouée.';
        }
    } catch (e) {
        document.getElementById('validationError').innerText = 'Erreur réseau: ' + e.message;
    }
}

// ---- Search Filtering ----
function handleSearch() {
    const query = document.getElementById('globalSearch').value.toLowerCase().trim();
    if (!query) {
        renderBookingsTable(bookingsData);
    } else {
        const filtered = bookingsData.filter(b =>
            (b.userName && b.userName.toLowerCase().includes(query)) ||
            (b.gameName && b.gameName.toLowerCase().includes(query)) ||
            (b.consoleName && b.consoleName.toLowerCase().includes(query)) ||
            (b.id && b.id.toLowerCase().includes(query))
        );
        renderBookingsTable(filtered);
    }
}
