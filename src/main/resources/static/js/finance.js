// ============================================================
// FINANCE.JS - Gestion Financière, Caisse & Trésorerie Pro
// GAMEL Admin Dashboard
// ============================================================

let currentFinancePeriod = 'all';
let allTransactionsData = [];
let financeSummaryData = {};
let activeFinanceTab = 'overview';
let revenueTrendChartInstance = null;
let revenueCategoryChartInstance = null;

// ---- Initialization ----
document.addEventListener('DOMContentLoaded', () => {
    fetchFinanceData();
    // Auto-refresh : synchronise les données financières toutes les 30 secondes
    AutoRefresh.start(fetchFinanceData, 30000);
});

// ---- Fetch Finance Data ----
async function fetchFinanceData() {
    try {
        const [sumRes, txnsRes] = await Promise.all([
            fetch(`/api/dashboard/finance/summary?period=${currentFinancePeriod}`),
            fetch('/api/dashboard/finance/transactions')
        ]);

        if (sumRes.ok) {
            financeSummaryData = await sumRes.json();
            renderFinanceKPIs(financeSummaryData);
        }

        if (txnsRes.ok) {
            allTransactionsData = await txnsRes.json();
            renderTransactionsTable(allTransactionsData);
            renderCashDrawerTab(allTransactionsData);
            renderMobileMoneyTab(allTransactionsData);
            updateTrendChart(allTransactionsData);
        }

        if (financeSummaryData) {
            updateCategoryChart(financeSummaryData);
        }

        AutoRefresh.markSynced();
    } catch (e) {
        console.error('[Finance] Error fetching finance data:', e);
        showToast("Erreur lors du chargement des données financières", "error");
    }
}

// ---- Render KPIs & Hero Banner ----
function renderFinanceKPIs(summary) {
    const fmt = (val) => (val || 0).toLocaleString('fr-FR') + ' FCFA';

    // Hero banner
    const heroRev = document.getElementById('heroTotalRevenue');
    if (heroRev) heroRev.innerText = fmt(summary.totalRevenue);

    const heroNet = document.getElementById('heroNetProfit');
    if (heroNet) {
        heroNet.innerText = fmt(summary.netProfit);
        heroNet.style.color = summary.netProfit < 0 ? '#ef4444' : 'var(--primary-light)';
    }

    // Activity cards
    const kpiBookings = document.getElementById('kpiBookingsRevenue');
    if (kpiBookings) kpiBookings.innerText = fmt(summary.bookingsRevenue);

    const kpiRentals = document.getElementById('kpiRentalsRevenue');
    if (kpiRentals) kpiRentals.innerText = fmt(summary.rentalsRevenue);

    const kpiEvents = document.getElementById('kpiEventsRevenue');
    if (kpiEvents) kpiEvents.innerText = fmt(summary.eventsRevenue);

    const kpiExpenses = document.getElementById('kpiTotalExpenses');
    if (kpiExpenses) kpiExpenses.innerText = fmt(summary.totalExpenses);
}

// ---- Tabs Switcher ----
function switchFinanceTab(tab) {
    activeFinanceTab = tab;

    // Buttons
    document.getElementById('tabBtnOverview').classList.toggle('active', tab === 'overview');
    document.getElementById('tabBtnCash').classList.toggle('active', tab === 'cash');
    document.getElementById('tabBtnMobile').classList.toggle('active', tab === 'mobile');
    document.getElementById('tabBtnLedger').classList.toggle('active', tab === 'ledger');

    // Panes
    document.getElementById('financeTabOverview').style.display = tab === 'overview' ? 'block' : 'none';
    document.getElementById('financeTabCash').style.display = tab === 'cash' ? 'block' : 'none';
    document.getElementById('financeTabMobile').style.display = tab === 'mobile' ? 'block' : 'none';
    document.getElementById('financeTabLedger').style.display = tab === 'ledger' ? 'block' : 'none';

    if (tab === 'overview' && allTransactionsData.length > 0) {
        updateTrendChart(allTransactionsData);
    }
}

// ---- Render Cash Drawer Tab (Espèces) ----
function renderCashDrawerTab(list) {
    const cashTxns = list.filter(t => (t.paymentMethod || '').toLowerCase().includes('espèce') || (t.paymentMethod || '').toLowerCase().includes('cash'));
    
    let cashIn = 0;
    let cashOut = 0;

    cashTxns.forEach(t => {
        if (t.type === 'income') cashIn += (t.amount || 0);
        else cashOut += (t.amount || 0);
    });

    const cashBalance = cashIn - cashOut;
    const fmt = (v) => v.toLocaleString('fr-FR') + ' FCFA';

    // Hero cash
    const heroCash = document.getElementById('heroCashRevenue');
    if (heroCash) heroCash.innerText = fmt(cashBalance);

    // Tab cash figures
    const balEl = document.getElementById('cashDrawerBalance');
    if (balEl) balEl.innerText = fmt(cashBalance);

    const inEl = document.getElementById('cashDrawerIncomes');
    if (inEl) inEl.innerText = fmt(cashIn);

    const outEl = document.getElementById('cashDrawerExpenses');
    if (outEl) outEl.innerText = fmt(cashOut);

    // Table
    const tbody = document.getElementById('cashTransactionsTableBody');
    if (!tbody) return;

    if (cashTxns.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">Aucun mouvement en espèces pour le moment.</td></tr>`;
        return;
    }

    tbody.innerHTML = cashTxns.map(t => {
        const isInc = t.type === 'income';
        const d = t.createdAt ? new Date(t.createdAt) : new Date();
        const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        
        return `
            <tr>
                <td><code style="color: var(--primary-light);">#${t.id || 'TXN'}</code></td>
                <td style="font-size: 12px; color: var(--text-secondary);">${dateStr}</td>
                <td><span class="${isInc ? 'type-badge-income' : 'type-badge-expense'}">${isInc ? '+ Entrée Cash' : '- Dépense Cash'}</span></td>
                <td><strong>${t.title || 'Opération'}</strong></td>
                <td>${t.clientName || 'N/A'}</td>
                <td style="text-align: right;"><span class="${isInc ? 'amount-positive' : 'amount-negative'}">${isInc ? '+' : '-'} ${(t.amount || 0).toLocaleString('fr-FR')} FCFA</span></td>
                <td style="text-align: center;">
                    <button class="btn btn-icon" title="Voir Ticket" onclick="openTransactionReceipt('${t.id}')"><i class="fa-solid fa-receipt"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

// ---- Render Mobile Money Tab (Wave & OM) ----
function renderMobileMoneyTab(list) {
    const mobileTxns = list.filter(t => {
        const pm = (t.paymentMethod || '').toLowerCase();
        return pm.includes('wave') || pm.includes('orange') || pm.includes('om');
    });

    let waveTotal = 0;
    let omTotal = 0;

    mobileTxns.forEach(t => {
        const pm = (t.paymentMethod || '').toLowerCase();
        if (pm.includes('wave')) waveTotal += (t.amount || 0);
        else if (pm.includes('orange') || pm.includes('om')) omTotal += (t.amount || 0);
    });

    const fmt = (v) => v.toLocaleString('fr-FR') + ' FCFA';

    // Hero mobile total
    const heroMobile = document.getElementById('heroMobileRevenue');
    if (heroMobile) heroMobile.innerText = fmt(waveTotal + omTotal);

    // Tab mobile figures
    const waveEl = document.getElementById('mobileWaveTotal');
    if (waveEl) waveEl.innerText = fmt(waveTotal);

    const omEl = document.getElementById('mobileOMTotal');
    if (omEl) omEl.innerText = fmt(omTotal);

    // Table
    const tbody = document.getElementById('mobileTransactionsTableBody');
    if (!tbody) return;

    if (mobileTxns.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">Aucune transaction Wave ou Orange Money enregistrée.</td></tr>`;
        return;
    }

    tbody.innerHTML = mobileTxns.map(t => {
        const isWave = (t.paymentMethod || '').toLowerCase().includes('wave');
        const pill = isWave 
            ? `<span class="payment-pill wave"><i class="fa-solid fa-mobile-screen"></i> Wave</span>` 
            : `<span class="payment-pill om"><i class="fa-solid fa-sim-card"></i> Orange Money</span>`;
        
        const d = t.createdAt ? new Date(t.createdAt) : new Date();
        const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        return `
            <tr>
                <td><code style="color: var(--primary-light);">#${t.id || 'TXN'}</code></td>
                <td style="font-size: 12px; color: var(--text-secondary);">${dateStr}</td>
                <td>${pill}</td>
                <td><strong>${t.title || 'Paiement'}</strong></td>
                <td>${t.clientName || 'N/A'}</td>
                <td style="text-align: right;"><span class="amount-positive">+ ${(t.amount || 0).toLocaleString('fr-FR')} FCFA</span></td>
                <td style="text-align: center;">
                    <button class="btn btn-icon" title="Voir Ticket" onclick="openTransactionReceipt('${t.id}')"><i class="fa-solid fa-receipt"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

// ---- Render General Ledger Transactions Table ----
function renderTransactionsTable(list) {
    const tbody = document.getElementById('transactionsTableBody');
    const badge = document.getElementById('txnCountBadge');
    if (badge) badge.innerText = `${list.length} opération${list.length > 1 ? 's' : ''}`;

    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; color: var(--text-muted); padding: 40px;">
                    <i class="fa-solid fa-receipt" style="font-size: 28px; margin-bottom: 10px; display: block; opacity: 0.4;"></i>
                    Aucune transaction financière trouvée pour cette sélection.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = list.map(t => {
        const isIncome = t.type === 'income';
        const typeBadge = isIncome 
            ? `<span class="type-badge-income"><i class="fa-solid fa-arrow-down"></i> Entrée</span>`
            : `<span class="type-badge-expense"><i class="fa-solid fa-arrow-up"></i> Dépense</span>`;
        
        const formattedAmount = isIncome 
            ? `<span class="amount-positive">+ ${(t.amount || 0).toLocaleString('fr-FR')} FCFA</span>`
            : `<span class="amount-negative">- ${(t.amount || 0).toLocaleString('fr-FR')} FCFA</span>`;

        let formattedDate = 'N/A';
        if (t.createdAt) {
            const d = new Date(t.createdAt);
            formattedDate = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' ' +
                            d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        }

        const pm = (t.paymentMethod || 'Espèces');
        let pmBadge = `<span class="payment-pill">${pm}</span>`;
        if (pm.toLowerCase().includes('wave')) pmBadge = `<span class="payment-pill wave">Wave</span>`;
        else if (pm.toLowerCase().includes('orange') || pm.toLowerCase().includes('om')) pmBadge = `<span class="payment-pill om">OM</span>`;
        else if (pm.toLowerCase().includes('espèce')) pmBadge = `<span class="payment-pill cash">Espèces</span>`;

        const deleteBtn = t.source === 'manual' 
            ? `<button class="btn btn-outline btn-sm" style="padding: 2px 6px; color: #ef4444;" title="Supprimer" onclick="deleteManualTxn('${t.id}')"><i class="fa-solid fa-trash"></i></button>`
            : `<span style="font-size: 10px; color: var(--text-muted);">Système</span>`;

        return `
            <tr>
                <td><code style="color: var(--primary-light); font-size: 12px;">#${t.id || 'TXN'}</code></td>
                <td style="font-size: 12px; color: var(--text-secondary); white-space: nowrap;">${formattedDate}</td>
                <td>${typeBadge}</td>
                <td><span style="font-size: 12px; font-weight: 500;">${t.category || 'Général'}</span></td>
                <td><strong style="color: var(--text-primary); font-size: 13px;">${t.title || 'Opération'}</strong></td>
                <td style="font-size: 12px; color: var(--text-secondary);">${t.clientName || 'N/A'}</td>
                <td>${pmBadge}</td>
                <td style="text-align: right;">${formattedAmount}</td>
                <td style="text-align: center;">
                    <button class="btn btn-icon" title="Voir Ticket" onclick="openTransactionReceipt('${t.id}')"><i class="fa-solid fa-receipt"></i></button>
                </td>
                <td style="text-align: center;">${deleteBtn}</td>
            </tr>
        `;
    }).join('');
}

// ---- Search & Filter Transactions ----
function handleTxnSearch() {
    const q = (document.getElementById('txnSearchInput').value || '').toLowerCase().trim();
    const typeFilter = document.getElementById('txnTypeFilter').value;
    const pmFilter = document.getElementById('txnPaymentFilter') ? document.getElementById('txnPaymentFilter').value : 'all';

    let filtered = allTransactionsData.filter(t => {
        const matchesQuery = !q || 
            (t.id && t.id.toLowerCase().includes(q)) ||
            (t.title && t.title.toLowerCase().includes(q)) ||
            (t.category && t.category.toLowerCase().includes(q)) ||
            (t.clientName && t.clientName.toLowerCase().includes(q)) ||
            (t.paymentMethod && t.paymentMethod.toLowerCase().includes(q));

        if (!matchesQuery) return false;

        // Type filter
        if (typeFilter === 'income' && t.type !== 'income') return false;
        if (typeFilter === 'expense' && t.type !== 'expense') return false;
        if (typeFilter !== 'all' && typeFilter !== 'income' && typeFilter !== 'expense' && t.category !== typeFilter) return false;

        // Payment method filter
        if (pmFilter !== 'all') {
            const pm = (t.paymentMethod || '').toLowerCase();
            if (pmFilter === 'Espèces' && !pm.includes('espèce') && !pm.includes('cash')) return false;
            if (pmFilter === 'Wave' && !pm.includes('wave')) return false;
            if (pmFilter === 'Orange Money' && !pm.includes('orange') && !pm.includes('om')) return false;
        }

        return true;
    });

    renderTransactionsTable(filtered);
}

// ---- Period Switcher ----
function setFinancePeriod(period) {
    currentFinancePeriod = period;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (period === 'today' && btn.innerText.includes("Aujourd'hui")) btn.classList.add('active');
        else if (period === '7days' && btn.innerText.includes('7')) btn.classList.add('active');
        else if (period === '30days' && btn.innerText.includes('Mois')) btn.classList.add('active');
        else if (period === 'year' && btn.innerText.includes('Année')) btn.classList.add('active');
        else if (period === 'all' && btn.innerText.includes('Tout')) btn.classList.add('active');
    });

    fetchFinanceData();
}

// ---- Charts Rendering ----
function updateTrendChart(txns) {
    const canvas = document.getElementById('revenueTrendChart');
    if (!canvas) return;

    const daysMap = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        daysMap[key] = { income: 0, expense: 0 };
    }

    txns.forEach(t => {
        if (!t.createdAt) return;
        const d = new Date(t.createdAt);
        const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        if (daysMap[key]) {
            if (t.type === 'income') daysMap[key].income += (t.amount || 0);
            else daysMap[key].expense += (t.amount || 0);
        }
    });

    const labels = Object.keys(daysMap);
    const incomeData = labels.map(k => daysMap[k].income);
    const expenseData = labels.map(k => daysMap[k].expense);

    if (revenueTrendChartInstance) revenueTrendChartInstance.destroy();

    const ctx = canvas.getContext('2d');
    revenueTrendChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Recettes (FCFA)',
                    data: incomeData,
                    backgroundColor: 'rgba(37, 166, 154, 0.7)',
                    borderColor: '#25a69a',
                    borderWidth: 1.5,
                    borderRadius: 6
                },
                {
                    label: 'Dépenses (FCFA)',
                    data: expenseData,
                    backgroundColor: 'rgba(239, 68, 68, 0.6)',
                    borderColor: '#ef4444',
                    borderWidth: 1.5,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toLocaleString('fr-FR')} FCFA` } }
            },
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8', font: { size: 11 }, callback: (v) => v >= 1000 ? (v / 1000) + 'k' : v } }
            }
        }
    });
}

function updateCategoryChart(summary) {
    const canvas = document.getElementById('revenueCategoryChart');
    if (!canvas) return;

    const breakdown = summary.categoryBreakdown || {};
    const labels = Object.keys(breakdown);
    const data = Object.values(breakdown);

    const allZero = data.every(v => v === 0);
    const chartLabels = allZero ? ['En attente de recettes'] : labels;
    const chartData = allZero ? [1] : data;
    const chartColors = allZero ? ['rgba(255, 255, 255, 0.1)'] : ['#25a69a', '#a855f7', '#eab308', '#3b82f6'];

    if (revenueCategoryChartInstance) revenueCategoryChartInstance.destroy();

    const ctx = canvas.getContext('2d');
    revenueCategoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartLabels,
            datasets: [{
                data: chartData,
                backgroundColor: chartColors,
                borderColor: '#141827',
                borderWidth: 2,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, padding: 12 } },
                tooltip: { callbacks: { label: (ctx) => allZero ? 'Aucune recette' : `${ctx.label}: ${ctx.raw.toLocaleString('fr-FR')} FCFA` } }
            }
        }
    });
}

// ---- Modal: Manual Transaction ----
function setManualTxnType(type) {
    document.getElementById('manualTxnType').value = type;
    const btnInc = document.getElementById('btnTypeIncome');
    const btnExp = document.getElementById('btnTypeExpense');
    const saveBtn = document.getElementById('saveTxnBtn');
    const title = document.getElementById('addTxnModalTitle');

    if (type === 'income') {
        btnInc.classList.add('active');
        btnExp.classList.remove('active');
        if (title) title.innerText = "Nouvelle Entrée d'Argent";
        saveBtn.innerText = "Enregistrer l'Entrée (+)";
        saveBtn.style.background = 'var(--primary)';
    } else {
        btnExp.classList.add('active');
        btnInc.classList.remove('active');
        if (title) title.innerText = "Nouvelle Dépense de Caisse";
        saveBtn.innerText = "Enregistrer la Dépense (-)";
        saveBtn.style.background = '#ef4444';
    }
}

function openAddTransactionModal(defaultType) {
    document.getElementById('addTransactionForm').reset();
    setManualTxnType(defaultType || 'income');
    openModal('addTransactionModal');
}

async function handleSaveManualTransaction(e) {
    e.preventDefault();

    const type = document.getElementById('manualTxnType').value;
    const category = document.getElementById('manualTxnCategory').value;
    const title = document.getElementById('manualTxnTitle').value.trim();
    const amount = parseFloat(document.getElementById('manualTxnAmount').value);
    const paymentMethod = document.getElementById('manualTxnPaymentMethod').value;
    const notes = document.getElementById('manualTxnNotes').value.trim();

    if (!title || isNaN(amount) || amount <= 0) {
        showToast("Veuillez saisir un montant et un motif valides", "error");
        return;
    }

    const payload = {
        type,
        category,
        title,
        amount,
        paymentMethod,
        notes,
        performedBy: 'Admin'
    };

    try {
        const res = await fetch('/api/dashboard/finance/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast("Opération enregistrée avec succès !");
            closeModal('addTransactionModal');
            fetchFinanceData();
        } else {
            const err = await res.json().catch(() => ({}));
            showToast(err.message || "Erreur lors de l'enregistrement", "error");
        }
    } catch (err) {
        showToast("Erreur réseau", "error");
    }
}

async function deleteManualTxn(id) {
    if (!confirm("Voulez-vous supprimer cette écriture comptable ?")) return;

    try {
        const res = await fetch(`/api/dashboard/finance/transactions/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast("Écriture supprimée !");
            fetchFinanceData();
        } else {
            showToast("Impossible de supprimer cette transaction", "error");
        }
    } catch (e) {
        showToast("Erreur réseau", "error");
    }
}

// ---- Modal: Ticket / Reçu de Caisse ----
function openTransactionReceipt(id) {
    const t = allTransactionsData.find(x => x.id === id);
    if (!t) return;

    const isInc = t.type === 'income';
    const d = t.createdAt ? new Date(t.createdAt) : new Date();
    const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const html = `
        <div class="receipt-container">
            <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 12px; margin-bottom: 12px;">
                <h2 style="font-size: 20px; font-weight: 900; letter-spacing: 2px; margin: 0;">🎮 GAMEL LOUNGE</h2>
                <div style="font-size: 11px; color: #555;">Centre Gaming & Esport Dakar</div>
                <div style="font-size: 11px; color: #555;">Tel: +221 77 000 00 00 | support@gamel.sn</div>
            </div>

            <div style="font-size: 12px; margin-bottom: 12px; line-height: 1.6;">
                <div><strong>RÉFÉRENCE :</strong> #${t.id}</div>
                <div><strong>DATE :</strong> ${dateStr}</div>
                <div><strong>CLIENT/AUTEUR :</strong> ${t.clientName || 'Client'}</div>
                <div><strong>MODE :</strong> ${t.paymentMethod || 'Espèces'}</div>
                <div><strong>NATURE :</strong> ${isInc ? 'ENCAISSEMENT (+)' : 'DÉPENSE DE CAISSE (-)'}</div>
            </div>

            <div style="border-top: 1px dashed #000; border-bottom: 2px solid #000; padding: 10px 0; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 13px;">
                    <span>${t.title || 'Prestation'}</span>
                    <span>${(t.amount || 0).toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div style="font-size: 11px; color: #666;">Catégorie: ${t.category || 'Général'}</div>
                ${t.notes ? `<div style="font-size: 10px; color: #888; font-style: italic;">Note: ${t.notes}</div>` : ''}
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 900; margin-bottom: 16px;">
                <span>TOTAL RÉGLÉ :</span>
                <span>${(t.amount || 0).toLocaleString('fr-FR')} FCFA</span>
            </div>

            <div style="text-align: center; border-top: 1px dashed #000; padding-top: 10px; font-size: 10px; color: #444;">
                <p style="margin: 0;">Merci pour votre confiance !</p>
                <p style="margin: 2px 0;">Conservez ce ticket comme justificatif.</p>
                <p style="margin: 0; font-size: 8px;">GAMEL SYSTEM v1.0</p>
            </div>
        </div>
    `;

    document.getElementById('printableReceipt').innerHTML = html;
    openModal('receiptModal');
}

// ---- Modal: Clôture Z de Caisse du Jour ----
function openDailyCloseModal() {
    const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const todayYMD = new Date().toISOString().slice(0, 10);

    const todayTxns = allTransactionsData.filter(t => {
        if (!t.createdAt) return false;
        return t.createdAt.startsWith(todayYMD);
    });

    let totalIn = 0;
    let totalOut = 0;
    let cashIn = 0;
    let waveIn = 0;
    let omIn = 0;

    todayTxns.forEach(t => {
        const amt = t.amount || 0;
        const pm = (t.paymentMethod || '').toLowerCase();
        if (t.type === 'income') {
            totalIn += amt;
            if (pm.includes('wave')) waveIn += amt;
            else if (pm.includes('orange') || pm.includes('om')) omIn += amt;
            else cashIn += amt;
        } else {
            totalOut += amt;
        }
    });

    const netDay = totalIn - totalOut;
    const fmt = (v) => v.toLocaleString('fr-FR') + ' FCFA';

    const html = `
        <div style="background: var(--surface-elevated); padding: 18px; border-radius: 12px; border: 1px solid var(--glass-border); margin-bottom: 16px;">
            <div style="text-align: center; margin-bottom: 14px;">
                <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Bilan Journalier</span>
                <h4 style="font-size: 16px; font-weight: 700; color: #fff; margin-top: 2px;">${today}</h4>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 6px;">
                    <span style="color: var(--text-secondary);">Total Recettes du Jour :</span>
                    <strong style="color: var(--primary-light);">${fmt(totalIn)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding-left: 12px;">
                    <span style="color: var(--text-muted);">💵 Espèces (Cash) :</span>
                    <span style="color: #10b981; font-weight: 600;">${fmt(cashIn)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-left: 12px;">
                    <span style="color: var(--text-muted);">📱 Wave :</span>
                    <span style="color: #1dc4e9; font-weight: 600;">${fmt(waveIn)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-left: 12px;">
                    <span style="color: var(--text-muted);">📱 Orange Money :</span>
                    <span style="color: #ff7900; font-weight: 600;">${fmt(omIn)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 6px;">
                    <span style="color: var(--text-secondary);">Sorties & Dépenses du Jour :</span>
                    <strong style="color: #ef4444;">- ${fmt(totalOut)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 15px; padding-top: 4px;">
                    <span style="font-weight: 700; color: #fff;">SOLDE NET DU JOUR :</span>
                    <strong style="color: ${netDay >= 0 ? 'var(--primary-light)' : '#ef4444'}; font-family: 'Orbitron', sans-serif;">${fmt(netDay)}</strong>
                </div>
            </div>
        </div>
        <p style="font-size: 11px; color: var(--text-muted); text-align: center; margin: 0;">
            Ce rapport consolide l'ensemble des encaissements physiques et digitaux du jour.
        </p>
    `;

    document.getElementById('dailyCloseContent').innerHTML = html;
    openModal('dailyCloseModal');
}

function printDailyCloseReport() {
    window.print();
}

// ---- Export CSV ----
function exportFinanceCSV() {
    if (!allTransactionsData || allTransactionsData.length === 0) {
        showToast("Aucune donnée financière à exporter", "warning");
        return;
    }

    let csv = "ID;Date;Type;Categorie;Description;Client_Auteur;Moyen_Paiement;Montant_FCFA;Statut\n";
    allTransactionsData.forEach(t => {
        const dateStr = t.createdAt ? new Date(t.createdAt).toISOString() : '';
        csv += `"${t.id || ''}";"${dateStr}";"${t.type || ''}";"${t.category || ''}";"${(t.title || '').replace(/"/g, '""')}";"${(t.clientName || '').replace(/"/g, '""')}";"${t.paymentMethod || ''}";${t.amount || 0};"${t.status || ''}"\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `journal_financier_gamel_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Export CSV téléchargé avec succès !");
}
