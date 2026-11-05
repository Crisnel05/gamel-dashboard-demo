// ============================================================
// OVERVIEW.JS - Dashboard Overview: stats, chart, console usage, recent bookings
// GAMEL Admin Dashboard
// ============================================================

let revenueChart = null;
let selectedBookingId = null;

// ---- Initialization ----
document.addEventListener('DOMContentLoaded', () => {
    fetchStats();
    // Auto-refresh : récupère les données toutes les 15 secondes
    AutoRefresh.start(fetchStats, 15000);
});

// ---- Fetch & Render Stats ----
async function fetchStats() {
    try {
        const response = await fetch('/api/dashboard/stats');
        if (!response.ok) throw new Error('Network response error');

        const data = await response.json();
        AutoRefresh.markSynced();

        // Update stat widgets
        document.getElementById('stat-revenue').innerText =
            `${data.totalRevenue.toLocaleString('fr-FR')} FCFA`;
        document.getElementById('stat-players').innerText = data.activePlayers;
        document.getElementById('stat-consoles').innerText =
            `${data.busyConsoles}/${data.totalConsoles}`;
        
        const tournEl = document.getElementById('stat-tournaments');
        if (tournEl) tournEl.innerText = data.activeTournaments || 0;

        // Render sub-sections
        renderRecentBookings(data.recentBookings);
        renderConsoleUsageProgress(data.consoleUsage);
        renderChart(data.weeklyRevenue);
        renderOverviewTournaments(data.recentEvents);

    } catch (error) {
        console.error('[Overview] Error fetching stats:', error);
    }
}

// ---- Render Recent Bookings (overview table) ----
function renderRecentBookings(bookings) {
    const tbody = document.getElementById('recentBookingsTableBody');
    tbody.innerHTML = '';

    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">Aucune réservation récente</td></tr>`;
        return;
    }

    bookings.forEach(b => {
        const start = new Date(b.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const end   = new Date(b.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${b.userName || 'Joueur'}</strong></td>
            <td>
                <div>${b.gameName}</div>
                <small class="text-muted">${b.consoleName}</small>
            </td>
            <td><span class="badge-status" style="background-color: var(--surface-elevated); border: 1px solid var(--glass-border); font-family: 'Orbitron'; font-size: 11px;">${b.posteName || 'POST'}</span></td>
            <td>${start} - ${end}</td>
            <td><span class="badge-status ${b.status}">${b.status}</span></td>
            <td>${getActionButtons(b)}</td>
        `;
        tbody.appendChild(row);
    });
}

// ---- Shared: Action Buttons HTML ----
function getActionButtons(booking) {
    let html = `<div class="action-buttons" style="display:flex; gap: 8px;">`;

    if (booking.status === 'pending') {
        html += `
            <button class="btn btn-icon confirm" onclick="confirmBooking('${booking.id}')" title="Confirmer">
                <i class="fa-solid fa-check"></i>
            </button>
            <button class="btn btn-icon cancel" onclick="cancelBooking('${booking.id}')" title="Annuler">
                <i class="fa-solid fa-times"></i>
            </button>
        `;
    } else if (booking.status === 'confirmed') {
        html += `
            <button class="btn btn-primary btn-sm" onclick="openValidationModal('${booking.id}')" style="padding: 6px 12px; font-size: 11px;">
                Activer <i class="fa-solid fa-play"></i>
            </button>
        `;
    } else if (booking.status === 'active') {
        html += `
            <button class="btn btn-outline btn-sm" onclick="completeBooking('${booking.id}')" title="Clôturer la session" style="padding: 5px 10px; font-size: 11px; border-color: var(--primary); color: var(--primary-light);">
                <i class="fa-solid fa-flag-checkered"></i> Terminer
            </button>
        `;
    } else {
        html += `<span class="text-muted">-</span>`;
    }

    html += `</div>`;
    return html;
}

// ---- Action: Confirm Booking ----
async function confirmBooking(id) {
    if (!confirm('Confirmer cette réservation ?')) return;
    try {
        const response = await fetch(`/api/dashboard/bookings/${id}/confirm`, { method: 'PUT' });
        if (!response.ok) throw new Error('API failed');
        fetchStats();
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
        fetchStats();
    } catch (e) {
        alert("Erreur lors de l'annulation: " + e.message);
    }
}

// ---- Action: Complete / Free Booking ----
async function completeBooking(id) {
    if (!confirm('Clôturer et terminer cette réservation ?')) return;
    try {
        const response = await fetch(`/api/dashboard/bookings/${id}/complete`, { method: 'PUT' });
        if (!response.ok) throw new Error('API failed');
        fetchStats();
    } catch (e) {
        alert('Erreur lors de la clôture du poste: ' + e.message);
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
            fetchStats();
        } else {
            const errData = await response.json();
            document.getElementById('validationError').innerText =
                errData.message || 'Validation échouée.';
        }
    } catch (e) {
        document.getElementById('validationError').innerText = 'Erreur réseau: ' + e.message;
    }
}

// ---- Render Console Usage Progress ----
function renderConsoleUsageProgress(usage) {
    const list = document.getElementById('consoleUsageList');
    list.innerHTML = '';

    if (!usage || Object.keys(usage).length === 0) {
        list.innerHTML = `<p class="text-muted text-center">Aucune donnée disponible</p>`;
        return;
    }

    Object.keys(usage).forEach(type => {
        const details = usage[type];
        const pct = details.total > 0 ? Math.round((details.busy / details.total) * 100) : 0;

        const row = document.createElement('div');
        row.className = 'progress-row';
        row.innerHTML = `
            <div class="progress-info">
                <span class="progress-label">${type}</span>
                <span class="progress-pct">${details.busy}/${details.total} (${pct}%)</span>
            </div>
            <div class="progress-track">
                <div class="progress-bar" style="width: ${pct}%"></div>
            </div>
        `;
        list.appendChild(row);
    });
}

// ---- Render Chart.js (Weekly Revenue) ----
function renderChart(weeklyData) {
    const ctx = document.getElementById('revenueChart').getContext('2d');

    if (!weeklyData || weeklyData.length === 0) return;

    const labels = weeklyData.map(d => d.label);
    const values = weeklyData.map(d => d.value);

    if (revenueChart) {
        revenueChart.destroy();
    }

    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Revenus (FCFA)',
                data: values,
                borderColor: '#25a69a',
                borderWidth: 3,
                backgroundColor: 'rgba(37, 166, 154, 0.05)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#25a69a',
                pointBorderColor: '#FFFFFF',
                pointHoverRadius: 6,
                pointRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { left: 10 } },
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#B0B0B0',
                        font: { family: 'Orbitron', size: 10 }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#B0B0B0',
                        font: { family: 'Inter', size: 11 }
                    }
                }
            }
        }
    });
}

// ---- Render Overview Tournaments Preview ----
function renderOverviewTournaments(events) {
    const listEl = document.getElementById('overviewTournamentsList');
    if (!listEl) return;

    if (!events || events.length === 0) {
        listEl.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 16px;">Aucun tournoi récent</div>`;
        return;
    }

    listEl.innerHTML = events.map(ev => {
        const pCount = ev.participantIds ? ev.participantIds.length : 0;
        const maxP = ev.maxParticipants || 16;
        const dateStr = ev.date ? new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';

        return `
            <div style="background: var(--surface-elevated); border: 1px solid var(--glass-border); border-left: 4px solid ${ev.color || 'var(--primary)'}; border-radius: 12px; padding: 14px 16px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <div style="font-weight: 700; font-size: 14px; color: var(--text-primary);">${ev.emoji || '🏆'} ${ev.name}</div>
                    <span class="badge-status ${ev.status}">${ev.status}</span>
                </div>
                <div style="font-size: 12px; color: var(--primary-light); font-weight: 600; margin-bottom: 8px;">
                    ${ev.gameName} • Cashprize: <span style="color: #FFD700;">${ev.prize || 'N/A'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-secondary);">
                    <span><i class="fa-regular fa-calendar"></i> ${dateStr}</span>
                    <span><i class="fa-solid fa-users"></i> ${pCount}/${maxP} inscrits</span>
                </div>
            </div>
        `;
    }).join('');
}

