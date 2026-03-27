// ============================================================
// AW27 CHECKERS – Dashboard JavaScript
// ============================================================

// GOOGLE_APPS_SCRIPT_URL est maintenant dynamique — défini depuis
// window.currentUser.gasUrl après authentification Firebase.
// Ne pas modifier cette constante directement.
let GOOGLE_APPS_SCRIPT_URL = "YOUR_WEB_APP_URL_HERE";

// ─── Normalize Google Drive image URLs ────────────────────────────────────
// Accepte 3 formats :
//   1. base64 data:image/...  → retourné tel quel (GAS legacy)
//   2. https://drive.google.com/file/d/FILE_ID/view?...
//   3. https://drive.google.com/open?id=FILE_ID
// → convertit (2) et (3) en thumbnail public utilisable par tous les comptes :
//   https://drive.google.com/thumbnail?id=FILE_ID&sz=w400
function normalizeDriveUrl(url) {
    if (!url) return "";
    // Déjà un base64 ou thumbnail → intouché
    if (url.startsWith("data:") || url.includes("thumbnail?id=")) return url;
    // Format /file/d/FILE_ID/
    const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m1) return "https://drive.google.com/thumbnail?id=" + m1[1] + "&sz=w400";
    // Format ?id=FILE_ID ou open?id=FILE_ID
    const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m2) return "https://drive.google.com/thumbnail?id=" + m2[1] + "&sz=w400";
    // Autre URL → retournée telle quelle
    return url;
}

// ─── Delivery Track Logic ────────────────────────────────────
function computeDeliveryTrack(row) {
    const status = row["Status"] || "";
    if (status === "Cancelled") return { label: "Cancelled", cls: "track-cancelled" };
    if (row["Delivery Status"] === "Delivered") return { label: "Delivered", cls: "track-delivered" };
    const rd = row["Ready Date"];
    if (!rd) return { label: "No Date", cls: "track-nodate" };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const ready = new Date(rd);
    const diff = Math.round((ready - today) / 86400000);
    if (diff < 0) return { label: `Late ${Math.abs(diff)}j`, cls: "track-late" };
    if (diff <= 14) return { label: `At Risk ${diff}j`, cls: "track-atrisk" };
    return { label: `On Track ${diff}j`, cls: "track-ok" };
}

// ─── Sheet Definitions ──────────────────────────────────────
const SHEET_CONFIG = {
    details: {
        label: "Details",
        cols: [
            { key: "Saison", label: "Saison", type: "text" },
            { key: "Client", label: "Client", type: "text", required: true },
            { key: "Dept", label: "Dept", type: "text", required: true },
            { key: "Style", label: "Style", type: "text", required: true },
            { key: "Description", label: "Description", type: "text", full: true },
            { key: "Fabric Base", label: "Fabric Base", type: "text" },
            { key: "Costing", label: "Costing", type: "text" },
            { key: "Order Qty", label: "Order Qty", type: "number" },
            { key: "PSD", label: "PSD", type: "date" },
            { key: "Ex-Fty", label: "Ex-Fty", type: "date" }
        ],
        kpis: [
            { label: "Total Styles", colorClass: "teal", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>`, compute: rows => rows.length },
            { label: "Total Qty", colorClass: "blue", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`, compute: rows => rows.reduce((s, r) => s + (+r["Order Qty"] || 0), 0).toLocaleString() },
            { label: "Departments", colorClass: "yellow", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`, compute: rows => new Set(rows.map(r => r.Dept).filter(Boolean)).size },
            { label: "Upcoming ExFty", colorClass: "green", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`, compute: rows => rows.filter(r => r["Ex-Fty"] && new Date(r["Ex-Fty"]) >= new Date()).length }
        ]
    },
    sample: {
        label: "Sample",
        cols: [
            { key: "Client", label: "Client", type: "text", required: true },
            { key: "Dept", label: "Dept", type: "text", required: true },
            { key: "Style", label: "Style", type: "text", required: true },
            { key: "StyleDescription", label: "Description", type: "text", full: true },
            { key: "Type", label: "Type", type: "text" },
            { key: "Fabric", label: "Fabric", type: "text" },
            { key: "Size", label: "Size", type: "text" },
            { key: "SRS Date", label: "SRS Date", type: "date" },
            { key: "Ready Date", label: "Ready Date", type: "date" },
            { key: "Received Date", label: "Received Date", type: "date" },
            { key: "Sending Date", label: "Sending Date", type: "date" },
            { key: "AWB", label: "AWB", type: "text" },
            { key: "Approval", label: "Approval", type: "select", options: ["", "Approved", "Pending", "Rejected"] },
            { key: "Remarks", label: "Remarks", type: "textarea", full: true }
        ],
        kpis: [
            { label: "Total Samples", colorClass: "teal", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>`, compute: rows => rows.length },
            { label: "Approved", colorClass: "green", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`, compute: rows => rows.filter(r => r.Approval === "Approved").length },
            { label: "Pending", colorClass: "yellow", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`, compute: rows => rows.filter(r => r.Approval === "Pending").length },
            { label: "Rejected", colorClass: "red", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`, compute: rows => rows.filter(r => r.Approval === "Rejected").length }
        ]
    },
    ordering: {
        label: "Ordering",
        cols: [
            { key: "Client", label: "Client", type: "text", required: true },
            { key: "Dept", label: "Dept", type: "text", required: true },
            { key: "Style", label: "Style", type: "text", required: true },
            { key: "StyleDescription", label: "Description", type: "text", full: true },
            { key: "Color", label: "Color", type: "text" },
            { key: "Trims", label: "Trims", type: "text" },
            { key: "Supplier", label: "Supplier", type: "text" },
            { key: "UP", label: "Unit Price", type: "text" },
            { key: "PO", label: "PO #", type: "text" },
            { key: "PO Date", label: "PO Date", type: "date" },
            { key: "Ready Date", label: "Ready Date", type: "date" },
            { key: "PI", label: "PI", type: "text" },
            { key: "Status", label: "Status", type: "select", options: ["", "Confirmed", "Pending", "Cancelled"] },
            { key: "Delivery Status", label: "Delivery", type: "select", options: ["", "Not Shipped", "In Transit", "Delivered"] },
            { key: "Comments", label: "Comments", type: "textarea", full: true }
        ],
        kpis: [
            { label: "Total Orders", colorClass: "teal", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>`, compute: rows => rows.filter(r => r.Status !== "Cancelled").length },
            { label: "Late/At Risk", colorClass: "red", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`, compute: rows => rows.filter(r => { const t = computeDeliveryTrack(r); return t.cls === "track-late" || t.cls === "track-atrisk"; }).length },
            { label: "On Track", colorClass: "green", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`, compute: rows => rows.filter(r => computeDeliveryTrack(r).cls === "track-ok").length },
            { label: "Delivered", colorClass: "blue", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>`, compute: rows => rows.filter(r => r["Delivery Status"] === "Delivered").length }
        ]
    }
};

// ─── State ────────────────────────────────────────────────────
let state = {
    activeSheet: "details",
    activeView: "dashboard",   // 'dashboard' | 'sheet'
    data: { details: [], sample: [], ordering: [], style: [] },
    filteredData: [], editingRow: null, loading: true,
    searchQuery: "", filterDept: "", filterClient: "",
    sortCol: null, sortDir: 1
};

// ─── DOM Refs ────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const kpiGrid = $("kpi-grid");
const tableHead = $("table-head");
const tableBody = $("table-body");
const searchInput = $("search-input");
const deptFilter = $("dept-filter");
const clientFilter = $("client-filter");
const modalOverlay = $("modal-overlay");
const modalTitle = $("modal-title");
const modalSubTitle = $("modal-subtitle");
const formFields = $("form-fields");
const formSave = $("form-save");
const confirmOverlay = $("confirm-overlay");
const toastContainer = $("toast-container");

// ─── Init ─────────────────────────────────────────────────────
// Appelée par auth.js → onAuthReady() une fois Firebase prêt
async function initApp() {
    // Récupérer le GAS URL depuis le profil Firebase
    if (window.currentUser && window.currentUser.gasUrl) {
        GOOGLE_APPS_SCRIPT_URL = window.currentUser.gasUrl;
    }

    // Mettre à jour l'UI utilisateur dans le header
    renderUserBadge();

    // ── Nouveau utilisateur sans GAS URL configuré ─────────────
    // Ouvrir la modale de configuration et bloquer tant que non renseigné
    if (!window.currentUser || !window.currentUser.gasUrl) {
        _openFirstSetupModal();
        return; // ne pas continuer tant que l'URL n'est pas enregistrée
    }

    loadCustomMenus();
    setupTabListeners();
    setupSearchAndFilter();
    setupDashboardFilters();
    showDashboard();
    await fetchAllData();
    renderDashboard();
    updateGlobalNotifBadge();
    console.log("App Initialized. Fabric Analysis keywords updated.");
}

// ─── Modale premier démarrage (GAS URL manquant) ─────────────
function _openFirstSetupModal() {
    // Réutiliser openUserSettings() mais en mode "first setup" :
    // - titre et description adaptés au nouvel utilisateur
    // - backdrop non cliquable (ne peut pas fermer sans avoir enregistré)
    // - pas de bouton déconnexion pour forcer la config

    let modal = document.getElementById("user-settings-modal");
    if (modal) modal.remove(); // reset si déjà présent

    modal = document.createElement("div");
    modal.id = "user-settings-modal";
    modal.className = "usm-overlay";
    modal.innerHTML = `
    <div class="usm-backdrop"></div>
    <div class="usm-panel">
        <div class="usm-header">
            <div class="usm-title">Bienvenue — Configuration requise</div>
        </div>
        <div class="usm-body">
            <div class="usm-profile">
                <div id="usm-avatar"></div>
                <div>
                    <div class="usm-name"  id="usm-name"></div>
                    <div class="usm-email" id="usm-email"></div>
                </div>
            </div>
            <div class="usm-section">
                <div class="usm-section-title">Google Apps Script URL</div>
                <div class="usm-section-desc" style="color:#e55;font-weight:600;margin-bottom:6px;">
                    ⚠️ Votre compte n'a pas encore d'URL connectée.<br>
                    Entrez l'URL de votre Google Apps Script pour accéder à vos données.
                </div>
                <input class="usm-input" id="usm-gas-input" type="url"
                    placeholder="https://script.google.com/macros/s/…/exec"
                    autofocus/>
                <button class="usm-btn-save" onclick="_saveFirstSetupUrl()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="13" height="13"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                    Connecter et démarrer
                </button>
            </div>
            <div class="usm-section">
                <button class="usm-btn-signout" onclick="signOut()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                    Se déconnecter
                </button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(modal);

    // Peupler le profil
    const u = window.currentUser || {};
    const initials = (u.displayName || u.email || "?").trim().split(" ").filter(Boolean).map(p => p[0].toUpperCase()).slice(0, 2).join("");
    document.getElementById("usm-avatar").innerHTML = u.photoURL
        ? `<img class="usm-photo" src="${u.photoURL}" alt="Photo"/>`
        : `<div class="usm-initials">${initials}</div>`;
    document.getElementById("usm-name").textContent  = u.displayName || "—";
    document.getElementById("usm-email").textContent = u.email || "—";

    requestAnimationFrame(() => modal.classList.add("open"));
}

async function _saveFirstSetupUrl() {
    const input = document.getElementById("usm-gas-input");
    if (!input) return;
    const url = input.value.trim();
    if (!url || !url.startsWith("https://")) {
        showToast("Entrez une URL valide (https://…)", "error");
        input.focus();
        return;
    }
    const btn = input.nextElementSibling;
    if (btn) { btn.disabled = true; btn.textContent = "Connexion…"; }
    await updateGasUrl(url);
    // updateGasUrl (dans auth.js) sauvegarde dans Firestore et met à jour window.currentUser.gasUrl
    // On relance initApp() pour charger les données
    const modal = document.getElementById("user-settings-modal");
    if (modal) modal.remove();
    await initApp();
}

// ─── Sidebar Toggle ──────────────────────────────────────
function toggleSidebar() {
    document.body.classList.toggle("sidebar-collapsed");
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("collapsed");
}

// ─── Tabs ─────────────────────────────────────────────────────
function setupTabListeners() {
    // Dashboard button
    document.querySelectorAll(".nav-item[data-view='dashboard']").forEach(btn => {
        btn.addEventListener("click", () => {
            state.activeView = "dashboard";
            document.querySelectorAll(".nav-item").forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-selected", "false");
            });
            btn.classList.add("active");
            btn.setAttribute("aria-selected", "true");
            const el = document.getElementById("header-sheet-title");
            if (el) el.textContent = "Tableau de Bord";
            showDashboard();
            renderDashboard();
        });
    });

    // Sheet tabs
    document.querySelectorAll(".nav-item[data-sheet]").forEach(btn => {
        btn.addEventListener("click", () => {
            state.activeView = "sheet";
            state.activeSheet = btn.dataset.sheet;
            state.searchQuery = "";
            state.filterDept = "";
            state.filterClient = "";
            state.sortCol = null; state.sortDir = 1;
            searchInput.value = "";
            deptFilter.value = "";
            const cf = document.getElementById("client-filter");
            if (cf) cf.value = "";
            document.querySelectorAll(".nav-item").forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-selected", "false");
            });
            btn.classList.add("active");
            btn.setAttribute("aria-selected", "true");
            const titles = { details: "D\u00e9tails des Styles", sample: "Suivi des Samples", ordering: "Gestion des Commandes" };
            const el = document.getElementById("header-sheet-title");
            if (el) el.textContent = titles[btn.dataset.sheet] || btn.dataset.sheet;
            showTableView();
            applyFilters();
            renderKPIs();
            populateDeptFilter();
            populateClientFilter();

        });
    });
}


// ─── Fetch ────────────────────────────────────────────────────
async function fetchAllData() {
    // Update refresh badge
    const refreshDot = document.getElementById("refresh-dot");
    if (refreshDot) refreshDot.style.display = "none";
    state._lastFetch = Date.now();

    showDashboardLoading();

    try {
        const res = await fetch(GOOGLE_APPS_SCRIPT_URL);
        const json = await res.json();
        if (json.status !== "ok") throw new Error(json.message);

        // Assign _rowIndex if missing or fix offset (row 1 = headers → data starts at row 2)
        const fixRows = (rows) => (rows || []).map((r, i) => {
            // Normalise _imageUrl depuis tous les noms de colonnes possibles
            const rawImg = r["_imageUrl"] || r["Photo"] || r["photo"] || r["Image"] || r["image"] || r["Image URL"] || r["ImageURL"] || r["image_url"] || r["photo_url"] || "";
            return {
                ...r,
                _rowIndex: r._rowIndex ?? (i + 2),
                _imageUrl: normalizeDriveUrl(rawImg)
            };
        });

        state.data.details = fixRows(json.data.details?.rows);
        state.data.sample = fixRows(json.data.sample?.rows);
        state.data.ordering = fixRows(json.data.ordering?.rows);
        state.data.style = fixRows(json.data.style?.rows);

        // ── Charger les menus custom depuis GAS (priorité sur localStorage)
        if (json.menus && Array.isArray(json.menus)) {
            const nav = document.getElementById("custom-nav-items");
            if (nav) nav.innerHTML = "";
            Object.keys(SHEET_CONFIG).filter(k => SHEET_CONFIG[k].custom).forEach(k => delete SHEET_CONFIG[k]);
            const migrated = json.menus.map(m => ({
                ...m,
                cols: m.cols.map(c => ({ ...c, key: c.label }))
            }));
            migrated.forEach(m => registerCustomMenu(m, false));
            localStorage.setItem(CUSTOM_MENUS_KEY, JSON.stringify(migrated));
        }

        Object.keys(SHEET_CONFIG).filter(k => SHEET_CONFIG[k].custom).forEach(k => {
            const realName = SHEET_CONFIG[k].sheetName || SHEET_CONFIG[k].label;
            const fromGAS = Object.entries(json.data).find(([gasKey]) =>
                gasKey === realName || gasKey.toLowerCase() === realName.toLowerCase()
            );
            state.data[k] = fixRows(fromGAS ? fromGAS[1].rows : []);
        });

        state.loading = false;

        // ── Diagnostic images : affiche dans la console les lignes sans _imageUrl
        const detailsWithImg  = (state.data.details || []).filter(r => r._imageUrl).length;
        const detailsTotal    = (state.data.details || []).length;
        const sampleImg       = (state.data.details || []).slice(0,3).map(r => {
            const imgKeys = Object.keys(r).filter(k => /image|photo/i.test(k));
            const allVals = {};
            imgKeys.forEach(k => allVals[k] = r[k]);
            return { style: r.Style, _imageUrl: r._imageUrl, imgKeys, allVals };
        });
        console.info("[AW27] Images chargées :", detailsWithImg + "/" + detailsTotal);
        console.table(sampleImg);

        renderAll();
        if (typeof updateGlobalNotifBadge === "function") updateGlobalNotifBadge();
        // Log any Pantone names from GS that are not in the TCX database
        setTimeout(_debugUnresolvedPantones, 500);
    } catch (err) {
        console.error(err);
        state.loading = false;
        if (GOOGLE_APPS_SCRIPT_URL === "YOUR_WEB_APP_URL_HERE") {
            showToast("Mode démo — Configurez l'URL du connecteur.", "info", 6000);
            state.data = getDemoData();
        } else {
            console.warn("Erreur de connexion :", err.message);
        }
        renderAll();
        if (typeof updateGlobalNotifBadge === "function") updateGlobalNotifBadge();
    } finally {
        hideDashboardLoading();
    }
}

function showDashboardLoading() {
    const main = document.querySelector("main.main");
    if (!main) return;
    main.classList.add("dashboard-loading");
    // Only add if not already present
    if (!document.getElementById("dashboard-spinner")) {
        const container = document.createElement("div");
        container.id = "dashboard-spinner";
        container.className = "loading-spinner-container";
        container.innerHTML = `
            <div class="loader"></div>
            <div class="loading-text-glow">Synchronisation des données</div>
        `;
        main.appendChild(container);
    }
}

function hideDashboardLoading() {
    const main = document.querySelector("main.main");
    if (main) main.classList.remove("dashboard-loading");
    const spinner = document.getElementById("dashboard-spinner");
    if (spinner) spinner.remove();
}

// ─── Demo Data ────────────────────────────────────────────────
function getDemoData() {
    const t = new Date();
    const d = (n) => { const x = new Date(t); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
    return {
        details: [
            { _rowIndex: 2, Client: "CALVIN KLEIN", Dept: "MEN", Style: "ST001", StyleDescription: "Slim Fit Chinos", FabricBase: "Cotton Poplin", Costing: "12.50", OrderQty: 500, PSD: d(10), ExFty: d(90) },
            { _rowIndex: 3, Client: "CALVIN KLEIN", Dept: "WOMEN", Style: "ST002", StyleDescription: "Floral Midi Dress", FabricBase: "Rayon", Costing: "18.00", OrderQty: 350, PSD: d(15), ExFty: d(110) },
            { _rowIndex: 4, Client: "TOMMY", Dept: "KIDS", Style: "ST003", StyleDescription: "Cargo Shorts", FabricBase: "Twill", Costing: "8.75", OrderQty: 800, PSD: d(-5), ExFty: d(-10) },
            { _rowIndex: 5, Client: "TOMMY", Dept: "MEN", Style: "ST004", StyleDescription: "Oxford Button Down", FabricBase: "Cotton", Costing: "15.20", OrderQty: 420, PSD: d(20), ExFty: d(75) },
            { _rowIndex: 6, Client: "ZARA", Dept: "WOMEN", Style: "ST005", StyleDescription: "High Waist Trousers", FabricBase: "Linen Blend", Costing: "22.00", OrderQty: 280, PSD: d(25), ExFty: d(95) }
        ],
        sample: [
            { _rowIndex: 2, Client: "CALVIN KLEIN", Dept: "MEN", Style: "ST001", StyleDescription: "Slim Fit Chinos", Type: "Fit", Fabric: "Cotton Poplin", Size: "M", "SRS Date": d(-20), "Ready Date": d(-5), Remarks: "Check inseam", Approval: "Approved" },
            { _rowIndex: 3, Client: "CALVIN KLEIN", Dept: "WOMEN", Style: "ST002", StyleDescription: "Floral Midi Dress", Type: "PP", Fabric: "Rayon", Size: "S", "SRS Date": d(-15), "Ready Date": d(5), Remarks: "Correct print", Approval: "Pending" },
            { _rowIndex: 4, Client: "TOMMY", Dept: "KIDS", Style: "ST003", StyleDescription: "Cargo Shorts", Type: "Fit", Fabric: "Twill", Size: "6", "SRS Date": d(-25), "Ready Date": d(-8), Remarks: "", Approval: "Rejected" },
            { _rowIndex: 5, Client: "TOMMY", Dept: "MEN", Style: "ST004", StyleDescription: "Oxford Button Down", Type: "SMS", Fabric: "Cotton", Size: "L", "SRS Date": d(-10), "Ready Date": d(12), Remarks: "Collar check", Approval: "Pending" }
        ],
        ordering: [
            { _rowIndex: 2, Client: "CALVIN KLEIN", Dept: "MEN", Style: "ST001", StyleDescription: "Slim Fit Chinos", Color: "Navy", Trims: "Buttons", Supplier: "Supplier A", UP: "12.50", PO: "PO-2026-001", "PO Date": d(-30), "Ready Date": d(-3), PI: "PI-001", Status: "Confirmed", "Delivery Status": "In Transit", Comments: "" },
            { _rowIndex: 3, Client: "CALVIN KLEIN", Dept: "WOMEN", Style: "ST002", StyleDescription: "Floral Midi Dress", Color: "Multi", Trims: "Zipper", Supplier: "Supplier B", UP: "18.00", PO: "PO-2026-002", "PO Date": d(-20), "Ready Date": d(10), PI: "PI-002", Status: "Confirmed", "Delivery Status": "Not Shipped", Comments: "Rush order" },
            { _rowIndex: 4, Client: "TOMMY", Dept: "KIDS", Style: "ST003", StyleDescription: "Cargo Shorts", Color: "Khaki", Trims: "Buttons", Supplier: "Supplier A", UP: "8.75", PO: "", "PO Date": "", "Ready Date": d(-12), PI: "", Status: "Pending", "Delivery Status": "Not Shipped", Comments: "" },
            { _rowIndex: 5, Client: "TOMMY", Dept: "MEN", Style: "ST004", StyleDescription: "Oxford Button Down", Color: "White", Trims: "Buttons", Supplier: "Supplier C", UP: "15.20", PO: "PO-2026-003", "PO Date": d(-15), "Ready Date": d(8), PI: "", Status: "Confirmed", "Delivery Status": "Not Shipped", Comments: "" },
            { _rowIndex: 6, Client: "ZARA", Dept: "WOMEN", Style: "ST005", StyleDescription: "High Waist Trousers", Color: "Ecru", Trims: "Hooks", Supplier: "Supplier B", UP: "22.00", PO: "PO-2026-004", "PO Date": d(-10), "Ready Date": d(60), PI: "PI-004", Status: "Confirmed", "Delivery Status": "Not Shipped", Comments: "" },
            { _rowIndex: 7, Client: "ZARA", Dept: "WOMEN", Style: "ST005", StyleDescription: "High Waist Trousers", Color: "Black", Trims: "Hooks", Supplier: "Supplier B", UP: "22.00", PO: "PO-2026-005", "PO Date": d(-5), "Ready Date": d(55), PI: "", Status: "Confirmed", "Delivery Status": "Delivered", Comments: "" }
        ],
        style: [
            { _rowIndex: 2, Style: "ST001", "GMT Color": "KHAKI", Pantone: "Smoky Olive", PO: "1202363673", Articles: "10953373" },
            { _rowIndex: 3, Style: "ST001", "GMT Color": "STONE", Pantone: "White Pepper", PO: "1202363673", Articles: "10953378" },
            { _rowIndex: 4, Style: "ST001", "GMT Color": "NAVY", Pantone: "Sky Captain", PO: "1202363673", Articles: "10953374" },
            { _rowIndex: 5, Style: "ST002", "GMT Color": "BLACK", Pantone: "Jet Black", PO: "1202363674", Articles: "10953380" }
        ]
    };
}

// ─── Render All ───────────────────────────────────────────────
// ─── View Switching ───────────────────────────────────────────
function showDashboard() {
    const ds = document.getElementById("dashboard-screen");
    const kg = document.getElementById("kpi-grid");
    const tc = document.getElementById("table-card-wrap");
    const ap = document.getElementById("alerts-panel");
    const sp = document.getElementById("sample-alerts-panel");
    const fb = document.getElementById("db-filter-bar");
    if (ds) ds.style.display = "flex";
    if (kg) kg.style.display = "none";
    if (tc) tc.style.display = "none";
    if (fb) { fb.style.display = "flex"; fb.classList.remove("hidden"); }
    if (ap) ap.innerHTML = "";
    if (sp) sp.innerHTML = "";
    // Show skeleton while data hasn't loaded yet
    if (ds && state.loading) {
        ds.innerHTML = `
        <div class="db-skeleton-wrap">
            <div class="db-skeleton-header">
                <div class="db-skel db-skel-title"></div>
                <div class="db-skel db-skel-badge"></div>
            </div>
            <div class="db-skeleton-stats">
                ${Array(6).fill('<div class="db-skel db-skel-stat"></div>').join("")}
            </div>
            <div class="db-skel db-skel-chart-title"></div>
            <div class="db-skel db-skel-chart"></div>
        </div>`;
    }
}

function showTableView() {
    const ds = document.getElementById("dashboard-screen");
    const kg = document.getElementById("kpi-grid");
    const tc = document.getElementById("table-card-wrap");
    const fb = document.getElementById("db-filter-bar");
    if (ds) ds.style.display = "none";
    if (kg) kg.style.display = "none";
    if (tc) tc.style.display = "";
    if (fb) { fb.style.display = "none"; fb.classList.add("hidden"); }
}

function renderAll() {
    if (state.activeView === "dashboard") {
        showDashboard();
        renderDashboard();
        updateGlobalNotifBadge();
        return;
    }
    showTableView();
    applyFilters();
    renderKPIs();
    populateDeptFilter();
    populateClientFilter();
    _injectEditColsBtn();
    updateGlobalNotifBadge();
}

function _injectEditColsBtn() {
    // Affiche le bouton ⚙ Colonnes uniquement pour sample et details (menus non-custom éditables)
    const EDITABLE_SHEETS = ["sample", "details"];
    const existing = document.getElementById("edit-cols-btn");
    if (existing) existing.remove();
    if (!EDITABLE_SHEETS.includes(state.activeSheet)) return;
    const titleEl = document.getElementById("header-sheet-title");
    if (!titleEl) return;
    const btn = document.createElement("button");
    btn.id = "edit-cols-btn";
    btn.title = "Modifier les colonnes";
    btn.style.cssText = "margin-left:8px;padding:3px 8px;font-size:11px;border:1px solid var(--border);border-radius:6px;background:var(--surface-2,#f3f4f6);color:var(--text-2,#6b7280);cursor:pointer;display:inline-flex;align-items:center;gap:4px;vertical-align:middle;";
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="12" height="12"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg> Colonnes`;
    btn.onclick = () => openMenuEdit(state.activeSheet);
    titleEl.insertAdjacentElement("afterend", btn);
}


// ─── Pantone TCX Color Database (2310 FHI colors) ─────────────
// Source: Pantone Fashion, Home + Interiors (TCX) official hex values
const PANTONE_TCX = {
    // 11-xxxx (whites, pastels)
    "Egret":"#F3ECE0","Vanilla Ice":"#F0EADA","Antique White":"#EDE3D2","Sweet Corn":"#F0EAD6","Papyrus":"#F5EDD6","Buttercream":"#EFE0CD","Glass Green":"#ECEAD0","Water Lily":"#DDE3D5","Sylvan Green":"#E7EACB","Winter White":"#F5ECD2","Afterglow":"#F3E6C9","Lemon Icing":"#F6EBC8","Bright White":"#F4F5F0","Snow White":"#F2F0EB","Pastel Parchment":"#E5D9D3","Gardenia":"#F1E8DF","Jet Stream":"#EDE6DE","Pristine":"#F2E8DA","Sugar Swizzle":"#F3EEE7","Coconut Milk":"#F0EDE5","Ethereal Green":"#F1ECCA","Pear Sorbet":"#F3EAC3","Pastel Yellow":"#F2E6B1","Transparent Yellow":"#F4ECC2","Wax Yellow":"#EDE9AD","Flan":"#F6E3B4","Elfin Yellow":"#EEEA97","Yellow Iris":"#EEE78E","Yellow Pear":"#ECE99B","Whisper White":"#EDE6DB","Tender Yellow":"#EDEDB7","Ecru":"#F3DFCA","Pearled Ivory":"#F0DFCC","White Alyssum":"#EFEBE7","Bridal Blush":"#EEE2DD","Sea Salt":"#F1E6DE","Angel Wing":"#F3DFD7","Cream Pink":"#F6E4D9","Powder Puff":"#F3E0D6","Rosewater":"#F6DBD8","Petal Pink":"#F2E2E0","Delicacy":"#F5E3E2","Shrinking Violet":"#F4E1E6","Brilliant White":"#EDF1FE","Cloud Dancer":"#F0EEE9","Star White":"#EFEFE8","Marshmallow":"#F0EEE4","Lily White":"#E2E2DA","Cannoli Cream":"#F0EFE2","Mystic Blue":"#E1E3DE","Bit of Blue":"#E2EAEB","Billowing Sail":"#D8E7E7","Blanc de Blanc":"#E7E9E7","Tofu":"#E8E3D9","Summer Shower":"#E5EBE3","Ice":"#E0E4D9","Lightest Sky":"#E4EADF","Hint of Mint":"#D8EBE6",
    // 12-xxxx
    "White Swan":"#E4D7C5","White Asparagus":"#E1DBC8","Bone White":"#D7D0C0","Meadow Mist":"#D3DEC4","Canary Green":"#D6DEC9","Ambrosia":"#D2E7CA","Pistachio Shell":"#D7CFBB","Patina Green":"#B9EAB3","Whitecap Gray":"#E0D5C6","Asparagus Green":"#D2CDB4","Lime Cream":"#D7E8BC","Seafoam Green":"#CBD5B1","White Jade":"#D4DBB2","Gleam":"#BFD1AD","Butterfly":"#CADEA5","Light Gray":"#DAD8C9","Hay":"#D3CCA3","Mellow Green":"#D5D593","Daiquiri Green":"#C9D77E","Pale Lime Yellow":"#DFE69F","Young Wheat":"#E1E3A9","Citron":"#DFDE9B","Luminary Green":"#E3EAA5","Charlock":"#E5E790","Eggnog":"#ECE1D3","Angora":"#DFD1BB","Green Essence":"#E9EAC8","Dusty Yellow":"#D4CC9A","Lemon Grass":"#DCD494","Canary Yellow":"#DFD87E","Aurora":"#EDDD59","Blazing Yellow":"#FEE715","Celandine":"#EBDF67","Seedpearl":"#E6DAC4","White Smoke":"#EDDCC9","Macadamia":"#E4CFB6","Navajo":"#EFDCC3","Lemon Meringue":"#F6E199","Vanilla":"#F4E1C1","Almond Oil":"#F4E4C1","Cornhusk":"#F2D6AE","Double Cream":"#F3E0AC","Anise Flower":"#F4E3B5","Pineapple Slice":"#E7D391","Mellow Yellow":"#F0DD9D","Lemonade":"#F0E79D","French Vanilla":"#EFE1A7","Sunshine":"#FADE85","Sundress":"#EBCF89","Lemon Drop":"#FDD878","Goldfinch":"#F8DC6C","Yellow Cream":"#EFDC75","Limelight":"#F0E87D","Sunny Lime":"#DFEF87","Lemon Verbena":"#F3E779","Buttercup":"#FAE03C","Yarrow":"#FACE6D","Cloud Cream":"#E6DDC5","Rutabaga":"#ECDDBE","Sun Kiss":"#EBD1BB","Dawn":"#EBD2B7","Alabaster Gleam":"#F0DEBD","Autumn Blonde":"#EED0AE","Vanilla Custard":"#F3E0BE","Apricot Gelato":"#F5D7AF","Golden Fleece":"#F2D1A0","Pale Banana":"#FAE199","Popcorn":"#F8DE8D","Golden Haze":"#FBD897","Lamb's Wool":"#E5D0B1","Nude":"#F2D3BC","Tender Peach":"#F8D5B8","Alesan":"#F1CEB3","Pale Peach":"#FED1BD","Bleached Apricot":"#FCCAAC","Golden Straw":"#E6BD8F","Novelle Peach":"#E7CFBD","Mother of Pearl":"#E9D4C3","Pastel Rose Tan":"#E9D1BF","Linen":"#EDD2C0","Vanilla Cream":"#F4D8C6","Scallop Shell":"#FBD8C9","Peach Purée":"#EFCFBA","Sheer Pink":"#F6E5DB","Pink Champagne":"#F0D8CC","Dew":"#EEDED1","Crème de Pêche":"#F5D6C6","Silver Peony":"#E7CFC7","Pearl Blush":"#F4CEC5","Soft Pink":"#F2D8CD","Veiled Rose":"#F8CDC9","Pearl":"#F9DBD8","Heavenly Pink":"#F4DEDE","Blushing Bride":"#FBD3D9","Tapioca":"#DCCDBC","Pink Tint":"#DBCBBD","Crystal Pink":"#EDD0CE","Pink Dogwood":"#F7D1D1","Crystal Rose":"#FDC3C6","Mary's Rose":"#F7D1D4","Mauve Morn":"#ECD6D6","Almost Mauve":"#E7DCD9","Morganite":"#DFCDC6","Mauve Chalk":"#E5D0CF","Light Lilac":"#DEC6D3","Primrose Pink":"#EED4D9","Cradle Pink":"#EDD0DD","Barely Pink":"#F8D7DD","Rose Water":"#F8E0E7","Almond Milk":"#D6CEBE","Vaporous Gray":"#DFDDD7","Bluewash":"#E2E6E0","Spa Blue":"#D3DEDF","Barely Blue":"#DDE0DF","Skylight":"#C8E0E0","Pastel Blue":"#BCD3D5","Clearwater":"#AAD5DB","Starlight Blue":"#B5CED4","Whispering Blue":"#C9DCDC","Blue Blush":"#D6DBD9","Wan Blue":"#CBDCDF","Chalk Blue":"#CCDAD7","Icicle":"#DADCD0","Turtledove":"#DED7C8","Murmur":"#D2D8D2","Morning Mist":"#CFDFDB","Blue Glass":"#C6E3E1","Soothing Sea":"#C3E9E4","Sprout Green":"#CBD7D2","Blue Flower":"#D0D9D4","Whisper Green":"#E0E6D7","Opal Blue":"#C3DDD6","Aqua Glass":"#D2E8E0","Moonlight Jade":"#C7E5DF","Fair Aqua":"#B8E2DC","Bleached Aqua":"#BCE3DF","Clearly Aqua":"#CEE1D4","Glacier":"#C3DBD4","Dusty Aqua":"#C0DCCD","Bay":"#BAE5D6","Hushed Green":"#D8E9E5","Zephyr Blue":"#D3D9D1","Honeydew":"#BAE1D3","Silver Green":"#D7D7C7","Milky Green":"#CFDBD1","Fairest Jade":"#D8E3D7","Frost":"#DDE2D6","Phantom Green":"#DCE4D7",
    // 13-xxxx
    "Moonbeam":"#CDC6BD","White Sand":"#DBD5D1","Dewkist":"#C4D1C2","Seacrest":"#BFD1B3","Pastel Green":"#B4D3B2","Green Ash":"#A0DAA9","Fog Green":"#C2CBB4","Tender Greens":"#C5CFB6","Reed":"#C3D3A8","Paradise Green":"#B2E79F","Pistachio Green":"#A9D39E","Lily Green":"#C5CF98","Shadow Lime":"#CFE09D","Lettuce Green":"#BED38E","Sap Green":"#AFCB80","Lima Bean":"#E1D590","Oatmeal":"#CBC3B4","Gray Morn":"#CABEB5","Green Glow":"#B0C965","Lime Popsicle":"#C0DB3A","Frozen Dew":"#D8CFB2","Pale Green":"#CBCE91","Lime Sherbet":"#CDD78A","Celery Green":"#C5CC7B","Sharp Green":"#C6E67A","Wild Lime":"#C3D363","Lime Punch":"#C0D725","Fog":"#D0C5B1","Aloe Wash":"#D0D3B7","Moth":"#D2CBAF","Chino Green":"#D9CAA5","Garden Glade":"#DCD8A8","Golden Mist":"#D5CD94","Endive":"#D2CC81","Chardonnay":"#E7DF99","Acacia":"#DACD65","Golden Kiwi":"#F3DD3E","Limeade":"#D3D95F","Meadowlark":"#EAD94E","Green Sheen":"#D9CE52","Sulphur Spring":"#D5D717","Evening Primrose":"#CCDB1E","Putty":"#D4CAB0","Sea Mist":"#D8C9A3","Custard":"#E5D68E","Raffia":"#DAC483","Cream Gold":"#DEC05F","Maize":"#EEC843","Lemon":"#F3BF08","Primrose Yellow":"#F6D155","Lemon Zest":"#F9D857","Dandelion":"#FFD02E","Solar Power":"#F4BF3A","Summer Melon":"#EAD3AE","Banana Crepe":"#E7D3AD","Sunlight":"#EDD59E","Snapdragon":"#FED777","Habañero Gold":"#FED450","Aspen Gold":"#FFD662","Minion Yellow":"#FED55D","Vibrant Yellow":"#FFDA29","Lemon Chrome":"#FFC300","Birch":"#DDD5C7","Sandshell":"#D8CCBB","Parchment":"#DFD1BE","Reed Yellow":"#DCC99E","Chamomile":"#E8D0A7","Italian Straw":"#E7D1A1","Soybean":"#D2C29D","Straw":"#E0C992","Cornsilk":"#EDC373","Flax":"#FFC87D","Golden Cream":"#F7BF68","Sunset Gold":"#F7C46C","Banana Cream":"#FFCF73","Amber Yellow":"#FAB75A","Pale Marigold":"#FFC66E","Jurassic Gold":"#E7AA56","Banana":"#FCB953","Crème Brûlée":"#DBCCB5","Oyster White":"#D2CAAF","Bleached Sand":"#DACCB4","Biscotti":"#DAC7AB","Gray Sand":"#E5CCAF","Ivory Cream":"#DAC0A7","Frosted Almond":"#D2C2AC","Appleblossom":"#DDBCA0","Mellow Buff":"#D8B998","Honey Peach":"#DCBD9E","Wheat":"#DEC5A5","Almond Cream":"#F4C29F","Desert Dust":"#E3BC8E","Cream Blush":"#F8C19A","Apricot Ice":"#FBBE99","Prairie Sunset":"#FFBB9E","Caramel Cream":"#F4BA94","Peach Fuzz":"#FFBE98","Buff":"#EBC396","Impala":"#F8CE97","Creampuff":"#FFCDA8","Apricot Cream":"#F1BD89","Sunburst":"#F6C289","Apricot Sherbet":"#FACD9E","Brown Rice":"#C7BBA4","Sand Dollar":"#DECDBE","Whisper Pink":"#DACBBE","Cream Tan":"#E4C7B8","Bisque":"#EDCAB5","Bellini":"#F4C9B1","Peach Quartz":"#F5B895","Peachy Keen":"#E2BDB3","Brazilian Sand":"#DACAB7","English Rose":"#F4C6C3","Tropical Peach":"#FFC4B2","Pale Dogwood":"#EDCDC2","Shell":"#E1CFC6","Cloud Pink":"#F5D1C8","Creole Pink":"#F7D5CC","Chintz Rose":"#EEC4BE","Seashell Pink":"#F7C8C2","Peach Blush":"#E4CCC6","Impatiens Pink":"#FFC4BC","Pink Salt":"#F7CDC7","Gossamer Pink":"#FAC8C3","Rose Quartz":"#F7CAC9","Chalk Pink":"#E6C5CA","Rose Shadow":"#F9C2CD","Potpourri":"#E7C9CA","Strawberry Cream":"#F4C3C4","Almond Blossom":"#F5BEC7","Orchid Pink":"#F3BBCA","Fairy Tale":"#F2C1D1","Pale Lilac":"#E1C6CC","Parfait Pink":"#E9C3CF","Pink Mist":"#E6BCCD","Pink Lady":"#EFC1D6","Ballerina":"#F2CFDC","Ballet Slipper":"#EBCED5","Cherry Blossom":"#F7CEE0","Lilac Snow":"#E0C7D7","Orchid Ice":"#E0D0DB","Crystal Gray":"#D7CBC4","Orchid Tint":"#DBD2DB","Lilac Ash":"#D7CDCD","Gray Lilac":"#D4CACD","Orchid Hush":"#CEC3D2","Lavender Fog":"#D2C4D6","Halogen Blue":"#BDC6DC","Illusion Blue":"#C9D3DC","Antarctica":"#C6C5C6","Lilac Hint":"#D0D0DA","Nimbus Cloud":"#D5D5D8","Arctic Ice":"#BFC7D6","Plein Air":"#BFCAD6","Omphalodes":"#B5CEDF","Oyster Mushroom":"#C3C6C8","Dawn Blue":"#CACCCB","Ballad Blue":"#C0CEDA","Foggy Dew":"#D1D5D0","Baby Blue":"#B5C7D3","Silver Birch":"#D2CFC4","Ice Flow":"#C6D2D2","Misty Blue":"#BFCDCC","Blue Glow":"#B2D4DD","Crystal Blue":"#A1C8DB","Tanager Turquoise":"#91DCE8","Pale Blue":"#C4D6D3","Plume":"#A5CFD5","Limpet Shell":"#98DDDE","Blue Light":"#ACDFDD","Blue Tint":"#9FD9D7","Rainy Day":"#CFC8BD","Pale Aqua":"#C1CCC2","Icy Morn":"#B0D3D1","Pastel Turquoise":"#99C5C4","Aruba Blue":"#81D7D3","Yucca":"#A1D7C9","Iced Aqua":"#ABD3DB","Beach Glass":"#96DFCE","Ice Green":"#87D8C3","Cabbage":"#87D7BE","Gossamer Green":"#B2CFBE","Bird's Egg Green":"#AACCB9","Almost Aqua":"#CAD3C1","Spray":"#BED3BB","Misty Jade":"#BCD9C8","Brook Green":"#AFDDCC","Celadon Tint":"#CBCEBE","Green Tint":"#C5CCC0","Green Lily":"#C1CEC1","Celadon":"#B8CCBA","Mist Green":"#AACEBC","Bok Choy":"#BCCAB3",
    // 14-xxxx
    "Silver Gray":"#C1B7B0","Pumice Stone":"#CAC2B9","Overcast":"#C3BDAB","Castle Wall":"#C8C1AB","Celadon Green":"#B5C1A5","Foam Green":"#B4C79C","Margarita":"#B5C38E","Nile Green":"#A7C796","Arcadian Green":"#A3C893","Greengage":"#8BC28C","Summer Green":"#7ED37F","Tidal Foam":"#BFB9A3","Lint":"#B6BA99","Seedling":"#C0CBA1","Nile":"#B4BB85","Opaline Green":"#A3C57D","Jade Lime":"#A1CA7B","Bright Lime Green":"#97BC62","Acid Lime":"#BADF30","Bog":"#BAB696","Beechnut":"#C2C18D","Green Banana":"#BABC72","Bright Chartreuse":"#B5BF50","Tender Shoots":"#B5CC39","Lime Green":"#9FC131","Green Haze":"#CAC4A4","Dried Moss":"#CCB97E","Shadow Green":"#CFC486","Muted Lime":"#D1C87C","Celery":"#CEC153","Cement":"#C4B6A6","Hemp":"#C0AD7C","Bamboo":"#D2B04C","Super Lemon":"#E4BF45","Sulphur":"#DDB614","Empire Yellow":"#F7D000","Cyber Yellow":"#FFD400","Pampas":"#CFBB7B","Dusky Citron":"#E3CC81","Misted Yellow":"#DAB965","Yolk Yellow":"#E2B051","Buff Yellow":"#F1BF70","Mimosa":"#F0C05A","Daffodil":"#FDC04E","Samoan Sun":"#FBC85F","Freesia":"#F3C12C","Parsnip":"#D6C69A","Jojoba":"#DABE81","Sahara Sun":"#DFC08A","Beeswax":"#EBA851","Golden Rod":"#E2A829","Spicy Mustard":"#D8AE47","Citrus":"#F9AC2F","Spectra Yellow":"#F7B718","Champagne Beige":"#B39F8D","Gravel":"#CBBFA2","Cocoon":"#C9B27C","Rattan":"#D1B272","Ochre":"#D6AF66","New Wheat":"#D7B57F","Golden Apricot":"#DDA758","Amber":"#EFAD55","Marigold":"#FDAC53","Warm Apricot":"#FFB865","Kumquat":"#FBAA4C","Saffron":"#FFA500","Peyote":"#C5BBAE","Oyster Gray":"#CBC1AE","Wood Ash":"#D7CAB0","Boulder":"#D1BE9B","Pebble":"#CAB698","Marzipan":"#D8C09D","Almond Buff":"#CCB390","Beige":"#D5BA98","Winter Wheat":"#DFC09F","Apricot Illusion":"#E2C4A6","Sheepskin":"#DAB58F","Desert Mist":"#E0B589","Buff Orange":"#FFBB7C","Apricot Nectar":"#ECAA79","Salmon Buff":"#FEAA7B","Pumpkin":"#F5A26F","Zinnia":"#FFA010","Irish Cream":"#C0AC92","Smoke Gray":"#CEBAA8","Shifting Sand":"#D8C0AD","Frappé":"#D1B7A0","Toasted Almond":"#D2B49C","Amberlight":"#E2BEA2","Peach Parfait":"#F8BFA8","Peach Nougat":"#E6AF91","Coral Sands":"#EDAA86","Beach Sand":"#FBB995","Peach":"#F2A987","Peach Nectar":"#FFB59B","Apricot Wash":"#FBAC82","Peach Cobbler":"#FFB181","Orange Chiffon":"#F9AA7D","Mushroom":"#BDACA3","Rose Dust":"#CDB2A5","Peach Whip":"#DBBEB7","Cameo Rose":"#D7B8AB","Evening Sand":"#DDB6AB","Pale Blush":"#E4BFB3","Rose Cloud":"#DBB0A2","Spanish Villa":"#DFBAA9","Hazelnut":"#CFB095","Dusty Pink":"#DEAA9B","Coral Pink":"#E8A798","Salmon":"#FAAA94","Peach Bud":"#FDB2A8","Peach Melba":"#FBBDAF","Peach Pearl":"#FFB2A5","Apricot Blush":"#FEAEA5","Rose Smoke":"#D3B4AD","Silver Pink":"#DCB1AF","Powder Pink":"#ECB2B3","Blossom":"#F2B2AE","Peaches N' Cream":"#F4A6A3","Quartz Pink":"#EFA6AA","Sepia Rose":"#D4BAB6","Lotus":"#E2C1C0","Peachskin":"#DFB8B6","Coral Blush":"#E6B2B8","Candy Pink":"#F5B0BD","Pink Nectar":"#D8AAB7","Cameo Pink":"#DBA9B8","Prism Pink":"#F0A1BF","Lilac Sachet":"#E9ADCA","Sweet Lilac":"#E8B5CE","Fragrant Lilac":"#CEADBE","Winsome Orchid":"#D4B9CB","Pink Lavender":"#D9AFCA","Pastel Lavender":"#D8A1C4","Orchid Bloom":"#C5AECF","Orchid Petal":"#BFB4CB","Hushed Violet":"#D1C0BF","Iris":"#BAAFBC","Pastel Lilac":"#BDB0D0","Lilac Marble":"#C3BABF","Evening Haze":"#BDB8C7","Lavender Blue":"#C5C0D0","Raindrops":"#B1AAB3","Thistle":"#B9B3C5","Purple Heather":"#BAB8D3","Zen Blue":"#9FA9BE","Xenon Blue":"#B7C0D7","Wind Chime":"#CAC5C2","Glacier Gray":"#C5C6C7","Gray Violet":"#BBBCBC","Micro Chip":"#BABCC0","Gray Dawn":"#BBC1CC","Quiet Gray":"#B9BABD","Heather":"#B7C0D6","Skyway":"#ADBED3","Cashmere Blue":"#A5B8D0","Blue Bell":"#93B4D7","Airy Blue":"#92B6D5","Lunar Rock":"#C5C5C5","Harbor Mist":"#AFB1B4","Vapor Blue":"#BEBDBD","Pearl Blue":"#B0B7BE","Celestial Blue":"#A3B4C4","Powder Blue":"#96B3D2","Cloud Blue":"#A2B6B9","Winter Sky":"#A9C0CB","Blue Topaz":"#78BDD4","Corydalis Blue":"#A9CADA","Aquamarine":"#9DC3D4","Sea Angel":"#98BFCA","Cool Blue":"#A5C5D9","Sky Blue":"#8ABAD3","Baltic Sea":"#79B5D8","Moonstruck":"#C2BEB6","Silver Lining":"#BDB6AB","Mercury":"#BAC2BA","Metal":"#BABFBC","Sky Gray":"#BCC8C6","Smoke":"#BFC8C3","Ether":"#9EB6B8","Stratosphere":"#9EC1CC","Aquatic":"#99C1CC","Gulf Stream":"#88C3D0","Porcelain Blue":"#95C0CB","Petit four":"#87C2D4","Bachelor Button":"#4ABBD5","Antigua Sand":"#83C2CD","Island Paradise":"#95DEE3","Tibetan Stone":"#82C2C7","Blue Fox":"#B9BCB6","Surf Spray":"#B4C8C2","Eggshell Blue":"#A3CCC9","Canal Blue":"#9CC2C5","Aqua Sky":"#7BC4C4","Aqua Splash":"#85CED1","Angel Blue":"#83C5CD","Blue Radiance":"#58C9D4","Harbor Gray":"#A8C0BB","Silver":"#A2A2A1","Holiday":"#81C3B4","Bermuda":"#60C9B3","Cockatoo":"#58C8B6","Silt Green":"#A9BDB1","Aqua Foam":"#ADC3B4","Ocean Wave":"#8EC5B6","Cascade":"#76C1B2","Lucite Green":"#7ACCB8","Opal":"#77CFB7","Electric Green":"#4BC3A8","Sea Foam":"#B7C2B2","Subtle Green":"#B5CBBB","Grayed Jade":"#9BBEA9","Neptune Green":"#7FBB9E","Pelican":"#C1BCAC","Alfalfa":"#B7B59F","Cameo Green":"#AAC0AD","Sprucestone":"#9FC09C","Meadow":"#8BBA94","Peapod":"#82B185","Zephyr Green":"#7CB083","Absinthe Green":"#76B583","Spring Bud":"#6BCD9C","Spring Bouquet":"#6DCE87","Abbey Stone":"#ABA798",
    // 15-xxxx
    "Dove":"#B3ADA7","Green Flash":"#79C753","Spray Green":"#AEA692","Sage Green":"#B2AC88","Tarragon":"#A4AE77","Leaf Green":"#9FAF6C","Herbal Garden":"#9CAD60","Parrot Green":"#8DB051","Greenery":"#88B04B","Eucalyptus":"#B1A992","Pale Olive Green":"#B5AD88","Winter Pear":"#B0B487","Weeping Willow":"#B3B17B","Sweet Pea":"#A3A969","Linden Green":"#C4BF71","Palm":"#AFAF5E","Green Oasis":"#B0B454","Apple Green":"#B5B644","Jasmine Green":"#7EC845","Citronelle":"#B8AF23","Leek Green":"#B7B17A","Golden Green":"#BDB369","Cress Green":"#BCA949","Warm Olive":"#C7B63C","Ashes of Roses":"#B5ACAB","Silver Fern":"#BBAA7E","Southern Moss":"#BCA66A","Olivenite":"#C1A65C","Oil Yellow":"#C4A647","Lemon Curry":"#CDA323","Ceylon Yellow":"#D4AE40","Pale Gold":"#BD9865","Sauterne":"#C5A253","Chinese Yellow":"#C6973F","Golden Yellow":"#CB8E16","Old Gold":"#ECA825","Mango Mojito":"#D69C2F","Ginger Root":"#BFA58A","Iced Coffee":"#B18F6A","Autumn Blaze":"#D9922E","Mineral Yellow":"#D39C43","Artisan's Gold":"#F2AB46","Golden Glow":"#D99938","Golden Orange":"#D7942D","Cadmium Yellow":"#EE9626","Radiant Yellow":"#FC9E21","Gold Fusion":"#FFB000","Travertine":"#AE997D","Safari":"#BAAA91","Taos Taupe":"#BFA77F","Porcini":"#CCA580","Fall Leaf":"#C9A86A","Honey Gold":"#D1A054","Chamois":"#F7B26A","Butterscotch":"#E19640","Dark Cheddar":"#E08119","Iceland Poppy":"#F4963A","Apricot":"#F19035","Flame Orange":"#FB8B23","Tangerine":"#F28A30","Mock Orange":"#FB8C00","Peach Amber":"#F89B45","Inca Gold":"#C18F46","Spruce Yellow":"#E3A857","Amber":"#E8A020","Fire Whirl":"#F86D2C","Sunset":"#F77D5E","Fiesta":"#DD4132","Dusted Clay":"#CD7B6B","Melon":"#F47A5A","Salmon Rose":"#EE826A","Flamingo Pink":"#F3927A","Shrimp":"#F59584","Peach Nougat":"#E6AF91","Dusty Coral":"#E3967A","Desert Sand":"#D4A17A","Sand":"#C5A57C","Prairie":"#C89A70","Caramel":"#B87750","Tortoise Shell":"#9B6941","Warm Taupe":"#AF9483","Tan":"#B8956A","Camel":"#B8895A","Doeskin":"#C4926C","Khaki":"#C3A882","Safari":"#B19A7A","Sand Verbena":"#BC9573","Warm Sand":"#C0A282","Golden Sand":"#C8A570","Beige":"#C6A882",
    // 16-xxxx
    "Warm Taupe":"#AF9483","Peyote":"#C5BBAE","Doeskin":"#C4926C","Caramel":"#B87750","Tawny":"#A66B3A","Hazel":"#9B7244","Brown Rice":"#A68B60","Warm Beige":"#C2A580","Almond":"#C9B289","Classic Camel":"#C09A62","Ecru":"#D4BC8A","Natural":"#CDB58A","Birch":"#B09070","Tan":"#AE8860","Sand":"#C2A580","Warm Sand":"#C0A282","Desert Mist":"#BEA080","Burlywood":"#C0965E","Sahara":"#BD8A4E","Dark Goldenrod":"#B8851E","Burnt Sienna":"#C97040","Copper":"#B56948","Rust":"#A25240","Autumn Maple":"#B84830","Sienna":"#A04028","Cognac":"#9B3A2A","Mahogany":"#8B3020","Auburn":"#903020","Brick":"#A84030","Terracotta":"#C05040","Clay":"#B86050","Dusty Orange":"#C87048","Spice":"#B86038","Paprika":"#B84030","Pumpkin":"#D07030","Tangerine":"#E08030","Amber":"#D09028","Honey":"#D4A050","Ochre":"#C89040","Gold":"#C4882A","Mustard":"#C4901A","Goldenrod":"#D4A020",
    // 17-xxxx
    "Artichoke Green":"#7A8060","Peridot":"#8A9045","Fern":"#5A8040","Cypress":"#506838","Forest Green":"#4A7840","Basil":"#486040","Dark Sage":"#607858","Sage":"#8A9878","Seagrass":"#789870","Sea Green":"#5A8870","Mantis":"#78A858","Moss":"#788050","Olive Drab":"#706840","Dried Herb":"#8A8060","Khaki":"#988870","Dusty Olive":"#887858","Burnished Gold":"#A88A40","Antique Gold":"#908040","Dark Harvest":"#806030","Olive":"#787040","Dark Olive":"#706838","Military Olive":"#686040","Army Green":"#586040","Hunter Green":"#487040","Bottle Green":"#385840","Dark Forest":"#2A5030","Deep Forest":"#204830",
    // 18-xxxx
    "Smokey Olive":"#6A685D","Smoky Olive":"#6A685D","Four Leaf Clover":"#6A7848","Gunmetal":"#6A7068","Olivine":"#666B54","Duck Green":"#487060","Tarmac":"#606A58","Rifle Green":"#505840","Winter Moss":"#606858","Sea Turtle":"#587060","Army":"#5A6848","Bronze Green":"#5A6040","Moss":"#788050","Jungle Green":"#507050","Hunter":"#487040","Dark Khaki":"#787060","Capers":"#706850","Old Sage":"#788878","Artichoke":"#808868","Chive":"#708060","Loden Frost":"#7A8870","Trekking Green":"#607070","Balsam":"#5A7068","Fern":"#6A8A58","Laurel Wreath":"#607840","Foliage":"#587848","Deep Lichen Green":"#587858","Storm":"#686870","Slate Gray":"#707878","Cool Gray":"#7A7A80","French Gray":"#888890","Quarry":"#888A90","Nickel":"#909090","Steeple Gray":"#888A88","Monument":"#808080","Metallic Gray":"#787878","Steel Gray":"#686868","Shadow Gray":"#686870","Quiet Shade":"#707070","Iron Gate":"#686868","Castor Gray":"#787878","Pewter":"#909090","Paloma":"#9A9A9A","Frost Gray":"#A0A0A0","Light Gray":"#B0B0B0","Pearl Gray":"#C0C0C0",
    // 19-xxxx (darks, blacks, navies)
    "Sky Captain":"#262934","Jet Black":"#2D2C2F","Black Beauty":"#202020","Caviar":"#2A2A2A","Anthracite":"#303030","Phantom":"#383838","Carbon":"#404040","Dark Shadow":"#484848","Gunmetal":"#505050","Charcoal Gray":"#585858","Asphalt":"#606060","Dark Gray":"#686868","Naval":"#1A2A4A","Navy Peony":"#223A6A","Dark Navy":"#1A2850","Parisian Night":"#1A2038","Naval":"#1A2A4A","Dark Denim":"#2A3A5A","Peacoat":"#2A3050","Blue Wing Teal":"#2A4A58","Deep Teal":"#1A4A50","Dark Teal":"#1A4048","Reflecting Pond":"#2A3840","Deep Peacock Blue":"#2A4858","Dark Slate":"#383C48","Midnight":"#202838","Outer Space":"#2A3038","Dark Umber":"#382018","Dark Brown":"#382010","Espresso":"#301808","Coffee Bean":"#281810","Dark Chocolate":"#302020","Bitter Chocolate":"#3A2020","Seal Brown":"#402820","Dark Mocha":"#3A2818","Chocolate Fondant":"#3A2020","Dark Burgundy":"#501828","Wine":"#601830","Bordeaux":"#501828","Dark Red":"#602020","Deep Claret":"#502030","Dark Cherry":"#601828","Tawny Port":"#582028","Fig":"#602838","Eggplant":"#502848","Dark Purple":"#502858","Blackberry":"#402848","Midnight Purple":"#302050","Deep Purple":"#383060","Dark Violet":"#402868","Indigo":"#302868","Dark Indigo":"#282060",
    // Additional common fashion colors
    "True Red":"#CC2229","Racing Red":"#D52B1E","Mars Red":"#C5281C","Flame Scarlet":"#CD212A","Fiesta":"#DD4132","Grenadine":"#DC4B36","Aurora Red":"#C45C51","Bittersweet":"#B7513F","Chili":"#A84232","Marsala":"#96584A","Baked Clay":"#965038","Potter's Clay":"#9A5535","Copper Tan":"#9A6345","Sequoia":"#9B6048","Russet Brown":"#8C4A3A","Burnt Brick":"#923A2A","Red Ochre":"#A04830","Arrowwood":"#A06030","Dark Cheddar":"#E08119","Harvest Pumpkin":"#E06820","Autumn Maple":"#B84830","Russet":"#8A4020","Sienna":"#A04028","Cognac":"#9B3A2A","Adobe":"#B85840","Chrysanthemum":"#D05A38","Emberglow":"#D04A30","Dusty Orange":"#C87048","Amber":"#D09028","Melon":"#F47A5A","Coral":"#F57A60","Living Coral":"#FF6B6B","Peach Cobbler":"#FFB181","Candied Yams":"#D97040","Apricot Tan":"#C8825A","Caramel":"#B87750","Butterum":"#C89858","Taffy":"#E8A8A0","Flamingo Pink":"#F3927A",
    // ── Additional TCX colors frequently used in fashion ──
    "White Pepper":"#DBD5D1","Blanc de Blanc":"#E7E9E7","Bright Chalk":"#F2F0EB",
    "Pristine White":"#F4F5F0","Eggshell":"#F1E8DF","Off White":"#F5F0E8",
    "Optical White":"#F4F5F0","Natural White":"#F0EBE0","Warm White":"#EDE3D2",
    "Cool White":"#EDEFEE","Blue White":"#EFF0F1","Arctic White":"#EEF0F0",
    "Bone":"#D7D0C0","Ivory":"#FFFFF0","Champagne":"#F7E7CE",
    "Powder":"#EDE6DE","Porcelain":"#F1E8DF","Alabaster":"#F0E6DC",
    "Antique":"#EDE3D2","Vintage White":"#EDE0C8","Oyster":"#D2CAAF",
    "Sea Fog":"#E8E8E4","Lily":"#F2E8DF","Whitened":"#EDE9E5",
};

// ─── Pantone name → real TCX hex ──────────────────────────────
// Normalize a string: lowercase, remove accents, collapse whitespace
function _normalizePantone(s) {
    return s.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents
        .replace(/[^a-z0-9 ]/g, " ")  // non-alphanumeric → space
        .replace(/\s+/g, " ")         // collapse spaces
        .trim();
}

// Build normalized lookup map once
const _PANTONE_INDEX = (() => {
    const idx = {};
    for (const [name, hex] of Object.entries(PANTONE_TCX)) {
        idx[_normalizePantone(name)] = hex;
    }
    return idx;
})();

// Dynamic cache for names fetched at runtime (not in static DB)
const _PANTONE_RUNTIME_CACHE = {};

function pantoneNameToHex(pantoneName) {
    if (!pantoneName) return null;
    const norm = _normalizePantone(pantoneName);
    // 1. Static database exact match
    if (_PANTONE_INDEX[norm]) return _PANTONE_INDEX[norm];
    // 2. Runtime cache (previously fetched)
    if (_PANTONE_RUNTIME_CACHE[norm]) return _PANTONE_RUNTIME_CACHE[norm];
    return null;
}

// Fetch missing Pantone hex from colorxs.com API (async, caches result)
async function fetchPantoneHex(pantoneName) {
    if (!pantoneName) return null;
    const norm = _normalizePantone(pantoneName);
    if (_PANTONE_INDEX[norm]) return _PANTONE_INDEX[norm];
    if (_PANTONE_RUNTIME_CACHE[norm]) return _PANTONE_RUNTIME_CACHE[norm];
    try {
        // colorxs.com has a search that returns JSON with hex
        const slug = pantoneName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const url = `https://www.colorxs.com/api/color/pantone-tcx-${slug}`;
        const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
        if (r.ok) {
            const data = await r.json();
            if (data && data.hex) {
                const hex = "#" + data.hex.replace("#","");
                _PANTONE_RUNTIME_CACHE[norm] = hex;
                return hex;
            }
        }
    } catch(e) { /* silent fail */ }
    return null;
}

// ─── GMT Color → CSS hex fallback (for when no Pantone match) ──
function gmtColorToHex(name) {
    if (!name) return "#e5e7eb";
    const map = {
        "BLACK": "#1a1a1a", "NAVY": "#1e3a5f", "WHITE": "#f5f5f5",
        "ECRU": "#f0ead6", "IVORY": "#fffff0", "CREAM": "#fffdd0",
        "KHAKI": "#c3b091", "STONE": "#b2a99a", "GREY": "#9ca3af",
        "GRAY": "#9ca3af", "RED": "#dc2626", "BLUE": "#2563eb",
        "GREEN": "#16a34a", "YELLOW": "#eab308", "PINK": "#f472b6",
        "PURPLE": "#9333ea", "BROWN": "#92400e", "ORANGE": "#ea580c",
        "TEAL": "#0d9488", "BURGUNDY": "#800020", "CAMEL": "#c19a6b",
        "BEIGE": "#f5f0e8", "OLIVE": "#6b7c40", "CORAL": "#ff6b6b",
        "MULTI": "linear-gradient(135deg, #f472b6 0%, #60a5fa 50%, #34d399 100%)",
    };
    const key = name.toUpperCase().split(" ").find(w => map[w]) || name.toUpperCase();
    return map[key] || "#cbd5e1";
}

// ─── Resolve best hex for a style row ─────────────────────────
// STRICT PRIORITY: Pantone name → GMT generic fallback
// The Pantone name from GS is ALWAYS tried first.
// GMT color is only used as a last resort visual hint.
function resolveColorHex(gmtColor, pantoneName) {
    // 1. Pantone name from GS — exact match in TCX database
    if (pantoneName && pantoneName.trim()) {
        const hex = pantoneNameToHex(pantoneName.trim());
        if (hex) return hex;
    }
    // 2. GMT name as-is in TCX database (e.g. "Greenery", "Flame Scarlet")
    if (gmtColor && gmtColor.trim()) {
        const hex = pantoneNameToHex(gmtColor.trim());
        if (hex) return hex;
    }
    // 3. Last resort: generic GMT color family (Black, Navy, Red...)
    return gmtColorToHex(gmtColor);
}

// ─── Debug helper: log unresolved Pantone names (dev only) ────
// Call resolveColorHex_debug() in console to see which names are missing
function _debugUnresolvedPantones() {
    const missing = new Set();
    (state.data.style || []).forEach(s => {
        if (s["Pantone"] && !pantoneNameToHex(s["Pantone"].trim())) {
            missing.add(s["Pantone"].trim());
        }
    });
    if (missing.size) {
        console.warn("[Pantone] Ces noms ne sont pas dans la base TCX — ajoutez-les à PANTONE_TCX :", [...missing]);
    } else {
        console.log("[Pantone] Tous les noms Pantone sont résolus ✓");
    }
    return [...missing];
}

// ─── Dashboard Render ──────────────────────────────────────────
function renderDashboard() {
    const el = document.getElementById("dashboard-screen");
    if (!el) return;

    // Populate filter dropdowns with fresh data
    if (typeof populateDashboardFilters === 'function') populateDashboardFilters();

    const details = state.data.details;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    // ── Palette dept colors (cycle per dept within a client)
    const DEPT_COLORS = [
        { stroke: "#7F77DD", bg: "#EEEDFE", text: "#3C3489" },
        { stroke: "#1D9E75", bg: "#E1F5EE", text: "#085041" },
        { stroke: "#EF9F27", bg: "#FAEEDA", text: "#633806" },
        { stroke: "#D4537E", bg: "#FBEAF0", text: "#72243E" },
        { stroke: "#378ADD", bg: "#E6F1FB", text: "#0C447C" },
        { stroke: "#888780", bg: "#F1EFE8", text: "#444441" },
    ];

    // ── Client accent colors
    const CLIENT_ACCENTS = ["#7F77DD","#1D9E75","#EF9F27","#D4537E","#378ADD","#888780"];

    // ── Helper: Ex-Fty badge with label
    function exFtyBadge(dateStr) {
        if (!dateStr) return '<div class="dbs-exfty-wrap"><span class="dbs-exfty-lbl">Ex-Fty</span><span class="dbs-exfty none">No date</span></div>';
        const d = new Date(dateStr); d.setHours(0,0,0,0);
        const diff = Math.round((d - today) / 86400000);
        const label = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
        const cls = diff < 0 ? "late" : diff <= 14 ? "near" : "ok";
        return '<div class="dbs-exfty-wrap"><span class="dbs-exfty-lbl">Ex-Fty</span><span class="dbs-exfty ' + cls + '">' + label + '</span></div>';
    }

    // ── Build donut SVG for a client's dept breakdown
    function buildDonut(depts, deptDataArr) {
        const R = 21, CX = 30, CY = 30, SW = 8;
        const circ = 2 * Math.PI * R;
        const totalQty = deptDataArr.reduce((s, d) => s + d.qty, 0) || 1;
        let offset = 0;
        let arcs = '';
        deptDataArr.forEach((d, i) => {
            const pct = d.qty / totalQty;
            const len = Math.max(pct * circ - 1, 0);
            arcs += '<circle cx="' + CX + '" cy="' + CY + '" r="' + R + '" fill="none" stroke="' + DEPT_COLORS[i % DEPT_COLORS.length].stroke + '" stroke-width="' + SW + '" stroke-dasharray="' + len.toFixed(1) + ' ' + circ.toFixed(1) + '" stroke-dashoffset="' + (-offset).toFixed(1) + '"/>';
            offset += pct * circ;
        });
        return '<svg width="60" height="60" viewBox="0 0 60 60" style="display:block;transform:rotate(-90deg)">' +
            '<circle cx="' + CX + '" cy="' + CY + '" r="' + R + '" fill="none" stroke="var(--dbs-track)" stroke-width="' + SW + '"/>' +
            arcs + '</svg>';
    }

    // ── Build legend rows (option C — colored badge for style count)
    function buildLegend(deptDataArr) {
        return deptDataArr.map((d, i) => {
            const c = DEPT_COLORS[i % DEPT_COLORS.length];
            return '<div class="dbs-dl-row">' +
                '<span class="dbs-dl-dot" style="background:' + c.stroke + '"></span>' +
                '<span class="dbs-dl-dept">' + esc(d.dept) + '</span>' +
                '<span class="dbs-dl-qty">' + d.qty.toLocaleString("fr-FR") + ' u.</span>' +
                '<span class="dbs-dl-badge" style="background:' + c.bg + ';color:' + c.text + '">' + d.nStyles + '</span>' +
            '</div>';
        }).join("");
    }

    // ── Group by Saison
    const saisons = [...new Set(details.map(r => r.Saison || r["Saison"] || "").filter(Boolean))].sort();
    const noSaison = details.filter(r => !r.Saison && !r["Saison"]);
    if (noSaison.length) saisons.push("—");

    const saisonBlocks = saisons.map((saison, si) => {
        const sRows = saison === "—" ? noSaison : details.filter(r => (r.Saison || r["Saison"] || "") === saison);
        const sTotal = sRows.reduce((s, r) => s + (+r["Order Qty"] || 0), 0);
        const sClients = [...new Set(sRows.map(r => r.Client).filter(Boolean))];
        const pillCls = si === 0 ? "aw" : si === 1 ? "ss" : "other";

        // ── Per client
        const clientBlocks = sClients.sort().map((client, ci) => {
            const cRows = sRows.filter(r => r.Client === client);
            const cTotal = cRows.reduce((s, r) => s + (+r["Order Qty"] || 0), 0);
            const cStyles = cRows.length;
            const initials = client.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
            const accentColor = CLIENT_ACCENTS[ci % CLIENT_ACCENTS.length];

            const depts = [...new Set(cRows.map(r => r.Dept).filter(Boolean))].sort();
            const deptDataArr = depts.map((dept, di) => {
                const dRows = cRows.filter(r => r.Dept === dept);
                return { dept, qty: dRows.reduce((s, r) => s + (+r["Order Qty"] || 0), 0), nStyles: dRows.length, rows: dRows, di };
            });

            // ── Style cards per dept
            const deptSections = deptDataArr.map((dd, di) => {
                const c = DEPT_COLORS[di % DEPT_COLORS.length];
                const cards = dd.rows.map((r, cardIdx) => {
                    const qty  = r["Order Qty"] ? (+r["Order Qty"]).toLocaleString("fr-FR") + ' u.' : '<span class="dbs-dim">—</span>';
                    const psd  = r["PSD"] ? new Date(r["PSD"]).toLocaleDateString("fr-FR", {day:"2-digit", month:"short"}) : '<span class="dbs-dim">—</span>';
                    const cost = r["Costing"] ? '$' + r["Costing"] : '<span class="dbs-dim">—</span>';
                    const fab  = r["Fabric Base"] ? esc(r["Fabric Base"]) : '<span class="dbs-dim">—</span>';
                    const desc = esc(r["Description"] || r["StyleDescription"] || "");

                    // ── Cross-data: ordering rows for this style
                    const orderRows = (state.data.ordering || []).filter(o =>
                        o.Style === r.Style && o.Client === r.Client
                    );
                    const confirmedOrders = orderRows.filter(o => o.Status === "Confirmed").length;
                    const pendingOrders   = orderRows.filter(o => o.Status === "Pending").length;
                    const deliveredOrders = orderRows.filter(o => o["Delivery Status"] === "Delivered").length;
                    const inTransit       = orderRows.filter(o => o["Delivery Status"] === "In Transit").length;
                    const totalColors     = orderRows.length;

                    // ── Cross-data: sample approval for this style
                    const sampleRows = (state.data.sample || []).filter(s =>
                        s.Style === r.Style && s.Client === r.Client
                    );
                    const approved = sampleRows.filter(s => s.Approval === "Approved").length;
                    const pending  = sampleRows.filter(s => s.Approval === "Pending").length;
                    const rejected = sampleRows.filter(s => s.Approval === "Rejected").length;
                    const totalSamples = sampleRows.length;

                    // ── Sample badge
                    let sampleBadge = "";
                    if (totalSamples > 0) {
                        const sampleCls = rejected > 0 ? "sc-badge-danger" : pending > 0 ? "sc-badge-warn" : "sc-badge-ok";
                        const sampleTxt = rejected > 0 ? rejected + " rejeté" : pending > 0 ? pending + " en attente" : approved + " approuvé";
                        sampleBadge = '<span class="dbs-sc-badge ' + sampleCls + '"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="9" height="9"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg> ' + sampleTxt + '</span>';
                    }

                    // ── Order status mini-chips
                    let orderChips = "";
                    if (totalColors > 0) {
                        if (deliveredOrders > 0) orderChips += '<span class="sc-chip sc-chip-delivered">' + deliveredOrders + ' livré' + (deliveredOrders > 1 ? 's' : '') + '</span>';
                        if (inTransit > 0)       orderChips += '<span class="sc-chip sc-chip-transit">' + inTransit + ' en transit</span>';
                        if (confirmedOrders > 0 && deliveredOrders + inTransit < confirmedOrders) {
                            const rem = confirmedOrders - deliveredOrders - inTransit;
                            orderChips += '<span class="sc-chip sc-chip-confirmed">' + rem + ' confirmé' + (rem > 1 ? 's' : '') + '</span>';
                        }
                        if (pendingOrders > 0)   orderChips += '<span class="sc-chip sc-chip-pending">' + pendingOrders + ' en attente</span>';
                    }

                    // ── Color labels from style sheet (real Pantone TCX hex)
                    const styleColors = (state.data.style || []).filter(s => s.Style === r.Style);
                    const colorTags = styleColors.map((s, ci) => {
                        const gmtColor = esc(s["GMT Color"] || "");
                        const pantone  = esc(s["Pantone"] || "");
                        if (!gmtColor && !pantone) return '';
                        // Unique ID for async color update
                        const barId = 'cb-' + esc(r.Style||"") + '-' + ci;
                        // Resolve color: static DB first (sync), then async fetch if missing
                        const hexSync = resolveColorHex(s["GMT Color"], s["Pantone"]);
                        const needsFetch = hexSync === "#cbd5e1" && s["Pantone"] && s["Pantone"].trim();
                        const barStyle = 'background:' + hexSync;
                        // Schedule async fetch if color not in static DB
                        if (needsFetch) {
                            fetchPantoneHex(s["Pantone"]).then(fetched => {
                                if (fetched) {
                                    const el = document.getElementById(barId);
                                    if (el) el.style.background = fetched;
                                }
                            });
                        }
                        return '<span class="sc-color-tag">' +
                            '<span class="sc-color-bar" id="' + barId + '" style="' + barStyle + '"></span>' +
                            '<span class="sc-color-info">' +
                                '<span class="sc-color-gmt">' + gmtColor + '</span>' +
                                (pantone ? '<span class="sc-color-pantone">' + pantone + '</span>' : '') +
                            '</span>' +
                        '</span>';
                    }).filter(Boolean).join("");
                    const colorWrap = colorTags
                        ? '<div class="sc-colors-wrap sc-colors-text">' +
                            '<span class="sc-colors-lbl">Coloris</span>' +
                            '<div class="sc-color-tags-row">' + colorTags + '</div>' +
                          '</div>'
                        : '';

                    // ── Progress bar: delivered / total colors
                    const progPct = totalColors > 0 ? Math.round((deliveredOrders / totalColors) * 100) : 0;
                    const progBar = totalColors > 0
                        ? '<div class="sc-prog-wrap"><div class="sc-prog-track"><div class="sc-prog-fill" style="width:' + progPct + '%"></div></div><span class="sc-prog-lbl">' + progPct + '% livré</span></div>'
                        : '';

                    // ── Animation delay staggered
                    const delay = (cardIdx * 60) + (di * 30);

                    // ── Image du style (normalisé dans fixRows — supporte base64 GAS, Drive /file/d/, open?id=)
                    const imgUrl = r["_imageUrl"] || "";
                    let imgBlock;
                    if (imgUrl) {
                        const _lbStyle = esc(r.Style || "");
                        const _lbDesc  = esc(r["Description"] || r["StyleDescription"] || "");
                        imgBlock = '<div class="dbs-sc-img-wrap"><img class="dbs-sc-img" src="' + imgUrl + '" alt="' + _lbStyle + '" loading="lazy" style="cursor:zoom-in" onclick="openImageLightbox(this.src, \'' + _lbStyle + '\', \'' + _lbDesc + '\')"/></div>';
                    } else {
                        imgBlock = '<div class="dbs-sc-img-wrap dbs-sc-img-placeholder"></div>';
                    }

                    return '<div class="dbs-sc dbs-sc-v2" style="animation-delay:' + delay + 'ms" data-style="' + esc((r.Style || "").toLowerCase()) + '" data-desc="' + esc((r["Description"] || r["StyleDescription"] || "").toLowerCase()) + '" data-fabric="' + esc((r["Fabric Base"] || "").toLowerCase()) + '" data-client="' + esc((r.Client || "").toLowerCase()) + '">' +
                        imgBlock +
                        '<div class="dbs-sc-head">' +
                            '<div class="dbs-sc-id">' +
                                '<span class="dbs-sc-code">' + esc(r.Style || "—") + '</span>' +
                                (desc ? '<span class="dbs-sc-desc">' + desc + '</span>' : '') +
                            '</div>' +
                            exFtyBadge(r["Ex-Fty"]) +
                        '</div>' +
                        (colorWrap ? colorWrap : '') +
                        '<hr class="dbs-sc-div">' +
                        '<div class="dbs-sc-fields">' +
                            '<div class="dbs-sf"><span class="dbs-sf-l">Qty</span><span class="dbs-sf-v">' + qty + '</span></div>' +
                            '<div class="dbs-sf"><span class="dbs-sf-l">Costing</span><span class="dbs-sf-v">' + cost + '</span></div>' +
                            '<div class="dbs-sf"><span class="dbs-sf-l">PSD</span><span class="dbs-sf-v">' + psd + '</span></div>' +
                            '<div class="dbs-sf"><span class="dbs-sf-l">Matière</span><span class="dbs-fab">' + fab + '</span></div>' +
                        '</div>' +
                    '</div>';
                }).join("");

                return '<div class="dbs-dept-grp">' +
                    '<div class="dbs-dept-title">' +
                        '<span class="dbs-dept-name-lbl">' + esc(dd.dept) + '</span>' +
                        '<div class="dbs-dept-line" style="background:' + c.stroke + '"></div>' +
                    '</div>' +
                    '<div class="dbs-cards-wrap">' + cards + '</div>' +
                '</div>';
            }).join("");

            // ── Bar chart sidebar
            const maxQty = Math.max(...deptDataArr.map(d => d.qty), 1);
            const bars = deptDataArr.map((dd, di) => {
                const c = DEPT_COLORS[di % DEPT_COLORS.length];
                const pct = Math.round((dd.qty / maxQty) * 100);
                const qtyLabel = dd.qty >= 1000 ? (dd.qty / 1000).toFixed(1).replace('.0','') + 'k' : dd.qty.toString();
                return '<div class="dbs-bar-row">' +
                    '<div class="dbs-bar-dept">' + esc(dd.dept) + '</div>' +
                    '<div class="dbs-bar-track">' +
                        '<div class="dbs-bar-fill" style="width:' + Math.max(pct, 8) + '%;background:linear-gradient(90deg,' + c.stroke + ',' + c.stroke + '99)">' +
                            '<span class="dbs-bar-qty">' + qtyLabel + ' u.</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="dbs-bar-n" style="color:' + c.text + ';background:' + c.bg + '">' + dd.nStyles + '</div>' +
                '</div>';
            }).join("");

            return '<div class="dbs-cli-block">' +
                '<div class="dbs-sidebar">' +
                    '<div class="dbs-cli-id">' +
                        '<div class="dbs-av" style="background:' + accentColor + '1a;color:' + accentColor + '">' + initials + '</div>' +
                        '<div>' +
                            '<div class="dbs-cli-name">' + esc(client) + '</div>' +
                            '<div class="dbs-cli-sub">' + cTotal.toLocaleString("fr-FR") + ' u. &middot; ' + cStyles + ' style' + (cStyles > 1 ? 's' : '') + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="dbs-bar-sep"></div>' +
                    '<div class="dbs-bar-chart">' +
                        '<div class="dbs-bar-chart-lbl">Répartition par département</div>' +
                        bars +
                    '</div>' +
                    '<div class="dbs-bar-sep"></div>' +
                    '<div class="dbs-bar-kpis">' +
                        '<div class="dbs-bar-kpi" style="background:' + accentColor + '1a">' +
                            '<div class="dbs-bar-kpi-n" style="color:' + accentColor + '">' + cTotal.toLocaleString("fr-FR") + '</div>' +
                            '<div class="dbs-bar-kpi-l" style="color:' + accentColor + '">u. total</div>' +
                        '</div>' +
                        '<div class="dbs-bar-kpi">' +
                            '<div class="dbs-bar-kpi-n">' + cStyles + '</div>' +
                            '<div class="dbs-bar-kpi-l">styles</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="dbs-main">' + deptSections + '</div>' +
            '</div>';
        }).join("");

        return '<div class="dbs-szn-block">' +
            '<div class="dbs-szn-band">' +
                '<span class="dbs-szn-pill ' + pillCls + '">' + esc(saison) + '</span>' +
                '<div class="dbs-szn-stats">' +
                    '<div class="dbs-szn-stat"><span class="dbs-szn-n">' + sRows.length + '</span><span class="dbs-szn-l">styles</span></div>' +
                    '<div class="dbs-szn-stat"><span class="dbs-szn-n">' + sTotal.toLocaleString("fr-FR") + '</span><span class="dbs-szn-l">u. total</span></div>' +
                    '<div class="dbs-szn-stat"><span class="dbs-szn-n">' + sClients.length + '</span><span class="dbs-szn-l">client' + (sClients.length > 1 ? 's' : '') + '</span></div>' +
                '</div>' +
            '</div>' +
            clientBlocks +
        '</div>';
    }).join("");

    // ── Date
    const dateStr = today.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    const dateCapitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    el.innerHTML =
        (saisonBlocks || '<p style="color:var(--text-muted);padding:2rem">Aucune donn\u00e9e.</p>');

    // ── Dashboard intelligence sections (merged from injection) ──
    const _dsEl = document.getElementById("dashboard-screen");
    // Re-apply active dashboard filters after render
    if (typeof applyDashboardFilters === 'function') applyDashboardFilters();
}

// ─── KPIs ─────────────────────────────────────────────────────
function renderKPIs() {
    const cfg = SHEET_CONFIG[state.activeSheet];
    const rows = state.data[state.activeSheet];
    kpiGrid.innerHTML = cfg.kpis.map(k => `
    <div class="kpi-stat">
      <div class="kpi-stat-icon ${k.colorClass}">${k.icon}</div>
      <div class="kpi-stat-body">
        <div class="kpi-stat-value">${k.compute(rows)}</div>
        <div class="kpi-stat-label">${k.label}</div>
      </div>
    </div>`).join("");

}

function openTimeline() {
    let overlay = document.getElementById("timeline-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "timeline-overlay";
        overlay.className = "modal-overlay";
        overlay.innerHTML = `
        <div class="modal timeline-modal">
            <div class="modal-header">
                <div>
                    <div class="modal-title">📅 Timeline des Commandes</div>
                    <div class="modal-subtitle" id="timeline-subtitle">Vue Gantt par style & couleur</div>
                </div>
                <button class="btn-close" onclick="closeTimeline()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            <div class="modal-body" id="timeline-body" style="overflow-x:auto;"></div>
        </div>`;
        document.body.appendChild(overlay);
    }
    renderTimeline();
    overlay.classList.add("open");
}

function closeTimeline() {
    const o = document.getElementById("timeline-overlay");
    if (o) o.classList.remove("open");
}

function renderTimeline() {
    const rows = state.data.ordering.filter(r => r["Ready Date"] && r.Status !== "Cancelled");
    const body = document.getElementById("timeline-body");
    if (!rows.length) { body.innerHTML = `<p style="color:var(--text-muted);padding:2rem;text-align:center;">Aucune commande avec Ready Date.</p>`; return; }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const rDates = rows.map(r => new Date(r["Ready Date"]));
    const poDates = rows.filter(r => r["PO Date"]).map(r => new Date(r["PO Date"])).sort((a, b) => a - b);
    const rangeStart = poDates.length ? new Date(Math.min(poDates[0].getTime(), today.getTime() - 21 * 86400000)) : new Date(today.getTime() - 21 * 86400000);
    const rangeEnd = new Date(Math.max(...rDates.map(d => d.getTime())) + 14 * 86400000);
    const totalMs = rangeEnd - rangeStart;

    const pct = (date) => Math.max(0, Math.min(100, ((date - rangeStart) / totalMs) * 100));

    // Tick marks every ~10% of range
    const tickCount = 8;
    let ticks = "";
    for (let i = 0; i <= tickCount; i++) {
        const tickDate = new Date(rangeStart.getTime() + (totalMs * i / tickCount));
        ticks += `<div class="tl-tick" style="left:${(i / tickCount * 100).toFixed(1)}%">${tickDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</div>`;
    }

    const todayPct = pct(today);
    const todayMark = `<div class="tl-today" style="left:${todayPct.toFixed(1)}%"><span>Auj.</span></div>`;

    // Group by client+style
    const groups = {};
    rows.forEach(r => {
        const k = `${r.Client}||${r.Style}`;
        if (!groups[k]) groups[k] = { client: r.Client, style: r.Style, desc: r.StyleDescription || r.Description || "", rows: [] };
        groups[k].rows.push(r);
    });

    let gantt = "";
    Object.values(groups).forEach(g => {
        gantt += `<div class="tl-group-header"><span class="client-badge" style="font-size:0.68rem;">${esc(g.client)}</span> <strong>${esc(g.style)}</strong> <span class="tl-desc">${esc(g.desc)}</span></div>`;
        g.rows.forEach(r => {
            const track = computeDeliveryTrack(r);
            const rdDate = new Date(r["Ready Date"]);
            const start = r["PO Date"] ? new Date(r["PO Date"]) : new Date(rdDate.getTime() - 60 * 86400000);
            const barLeft = pct(start).toFixed(1);
            const barW = Math.max((pct(rdDate) - pct(start)).toFixed(1), 1);
            const rdFmt = rdDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
            const delBadge = r["Delivery Status"] ? `<span class="delivery-badge del-${r["Delivery Status"].toLowerCase().replace(" ", "")} tl-del">${r["Delivery Status"]}</span>` : "";

            gantt += `
            <div class="tl-row">
                <div class="tl-label">${esc(r.Color || "—")} ${delBadge}</div>
                <div class="tl-track-wrap">
                    <div class="tl-bar ${track.cls}" style="left:${barLeft}%;width:${barW}%" title="${esc(r.Style)} ${esc(r.Color)} → ${rdFmt}">
                        <span class="tl-bar-label">${rdFmt}</span>
                    </div>
                </div>
            </div>`;
        });
    });

    document.getElementById("timeline-subtitle").textContent = `${rows.length} commande(s) · ${Object.keys(groups).length} style(s)`;
    body.innerHTML = `
    <div class="timeline-wrap">
        <div class="tl-header-row">
            <div class="tl-label-col"></div>
            <div class="tl-chart-col">
                <div class="tl-ticks">${ticks}</div>
                ${todayMark}
            </div>
        </div>
        ${gantt}
    </div>
    <div class="tl-legend">
        <span class="tl-leg track-ok">■ On Track</span>
        <span class="tl-leg track-atrisk">■ At Risk</span>
        <span class="tl-leg track-late">■ Late</span>
        <span class="tl-leg track-delivered">■ Delivered</span>
        <span class="tl-leg track-cancelled">■ Cancelled</span>
    </div>`;
}

// ─── Filters ──────────────────────────────────────────────────
function setupSearchAndFilter() {
    searchInput.addEventListener("input", e => { state.searchQuery = e.target.value.toLowerCase().trim(); applyFilters(); });
    deptFilter.addEventListener("change", e => { state.filterDept = e.target.value; applyFilters(); });
    if (clientFilter) clientFilter.addEventListener("change", e => { state.filterClient = e.target.value; applyFilters(); });
}

function applyFilters() {
    const rows = state.data[state.activeSheet];
    let filtered = rows.filter(row => {
        if (state.filterClient && row.Client !== state.filterClient) return false;
        if (state.filterDept && row.Dept !== state.filterDept) return false;
        if (state.searchQuery) {
            const h = Object.values(row).join(" ").toLowerCase();
            if (!h.includes(state.searchQuery)) return false;
        }
        return true;
    });
    if (state.sortCol) {
        filtered = filtered.slice().sort((a, b) => {
            const av = String(a[state.sortCol] || ""), bv = String(b[state.sortCol] || "");
            return av.localeCompare(bv, undefined, { numeric: true }) * state.sortDir;
        });
    }
    state.filteredData = filtered;
    renderTable();
}

function populateDeptFilter() {
    const depts = [...new Set(state.data[state.activeSheet].map(r => r.Dept).filter(Boolean))].sort();
    deptFilter.innerHTML = `<option value="">Tous les depts</option>` + depts.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join("");
    deptFilter.value = state.filterDept;
}

function populateClientFilter() {
    const cf = document.getElementById("client-filter");
    if (!cf) return;
    const clients = [...new Set(state.data[state.activeSheet].map(r => r.Client).filter(Boolean))].sort();
    cf.innerHTML = `<option value="">Tous les clients</option>` + clients.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
    cf.value = state.filterClient;
}

// ─── Table ────────────────────────────────────────────────────
function showTableSpinner() {
    tableHead.innerHTML = "";
    tableBody.innerHTML = `<tr><td colspan="99">
        <div class="loading-wrap">
            <div class="loading-icon-wrap" style="color:var(--accent);">
                ${ICONS.clock}
            </div>
            <div class="loading-text">Chargement en cours…</div>
            <div class="loading-sub">Mise à jour du tableau de données</div>
        </div>
    </td></tr>`;
}

function renderTable() {
    const cfg = SHEET_CONFIG[state.activeSheet];
    const rows = state.filteredData;
    const isOrdering = state.activeSheet === "ordering";

    const isDetails = state.activeSheet === "details";
    // Inject compact-row styles once for details view
    if (isDetails && !document.getElementById("det-expand-styles")) {
        const _ds = document.createElement("style");
        _ds.id = "det-expand-styles";
        _ds.textContent = `
        .det-client-row { cursor:pointer; background:var(--color-background-secondary); transition:background .1s; border-bottom:0.5px solid var(--color-border-tertiary); }
        .det-client-row:hover { background:var(--color-background-secondary); filter:brightness(0.97); }
        .det-client-row td { padding:9px 12px; }
        .det-client-name { font-size:13px; font-weight:500; color:var(--color-text-primary); }
        .det-client-meta { font-size:11px; color:var(--color-text-secondary); margin-left:8px; }
        .det-client-badge { display:inline-flex; align-items:center; gap:4px; font-size:10.5px; padding:2px 8px; border-radius:20px; border:0.5px solid; margin-left:6px; }
        .det-cb-warn   { background:#FFFDE7; color:#827717; border-color:#FFF176; }
        .det-cb-danger { background:#FFF0F0; color:#C0392B; border-color:#FFBCBC; }
        .det-cb-ok     { background:#F0FDF4; color:#166534; border-color:#86EFAC; }
        .det-style-row { border-bottom:0.5px solid var(--color-border-tertiary); transition:background .1s; cursor:pointer; }
        .det-style-row:hover { background:var(--color-background-secondary); }
        .det-style-row td { padding:8px 10px 8px 36px; vertical-align:middle; }
        .det-expand-row td { padding:0 !important; }
        .det-expand-body { display:flex; flex-wrap:wrap; gap:8px 22px; padding:9px 14px 11px 52px; background:var(--color-background-secondary); border-bottom:0.5px solid var(--color-border-tertiary); }
        .det-xfield { display:flex; flex-direction:column; gap:2px; min-width:80px; }
        .det-xlabel { font-size:9.5px; font-weight:500; color:var(--color-text-secondary); text-transform:uppercase; letter-spacing:.05em; }
        .det-xval { font-size:12px; color:var(--color-text-primary); }
        .det-xbadge { display:inline-flex; align-items:center; font-size:11px; padding:2px 8px; border-radius:20px; border:0.5px solid; }
        .det-xbadge-ok     { background:#F0FDF4; color:#166534; border-color:#86EFAC; }
        .det-xbadge-warn   { background:#FFFDE7; color:#827717; border-color:#FFF176; }
        .det-xbadge-danger { background:#FFF0F0; color:#C0392B; border-color:#FFBCBC; }
        .det-xbadge-blue   { background:#EFF6FF; color:#1E40AF; border-color:#93C5FD; }
        .det-xbadge-gray   { background:var(--color-background-secondary); color:var(--color-text-secondary); border-color:var(--color-border-secondary); }
        .det-chevron { color:var(--color-text-secondary); transition:transform .15s; flex-shrink:0; }
        .det-chevron.open { transform:rotate(90deg); }
        .det-desc-cell { max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:12px; color:var(--color-text-secondary); display:block; }
        .det-daybadge { display:inline-flex; align-items:center; font-size:10px; padding:1px 5px; border-radius:4px; margin-left:4px; font-weight:500; }
        .det-daybadge-ok     { background:#F0FDF4; color:#166534; }
        .det-daybadge-warn   { background:#FFFDE7; color:#827717; }
        .det-daybadge-danger { background:#FFF0F0; color:#C0392B; }
        .det-efty-ok     { color:#166534; font-weight:500; }
        .det-efty-warn   { color:#827717; font-weight:500; }
        .det-efty-danger { color:#C0392B; font-weight:500; }
        .det-pills-wrap  { display:flex; align-items:center; gap:4px; flex-wrap:nowrap; }
        .det-dpill { display:inline-flex; align-items:center; font-size:10.5px; padding:2px 9px; border-radius:20px; border:0.5px solid var(--color-border-secondary); background:var(--color-background-primary); color:var(--color-text-secondary); white-space:nowrap; cursor:pointer; user-select:none; transition:all .12s; }
        .det-dpill:hover { border-color:var(--color-border-primary); }
        .det-dpill-active { background:var(--color-text-primary) !important; color:var(--color-background-primary) !important; border-color:var(--color-text-primary) !important; }
        .det-dpill-n { font-size:9.5px; margin-left:3px; opacity:.7; }
        `;
        document.head.appendChild(_ds);
    }
    tableHead.innerHTML = `<tr>
    ${isDetails
        ? `<th onclick="sortBy('Saison')" title="Trier par Saison">Saison${state.sortCol==='Saison'?(state.sortDir===1?' ↑':' ↓'):''}</th>
           <th onclick="sortBy('Client')" title="Trier par Client">Client${state.sortCol==='Client'?(state.sortDir===1?' ↑':' ↓'):''}</th>
           <th onclick="sortBy('Dept')" title="Trier par Dept">Dept${state.sortCol==='Dept'?(state.sortDir===1?' ↑':' ↓'):''}</th>
           <th onclick="sortBy('Style')" title="Trier par Style">Style${state.sortCol==='Style'?(state.sortDir===1?' ↑':' ↓'):''}</th>
           <th onclick="sortBy('Description')" title="Trier par Description">Description${state.sortCol==='Description'?(state.sortDir===1?' ↑':' ↓'):''}</th>
           <th onclick="sortBy('Fabric Base')" title="Trier par Fabric Base">Fabric Base${state.sortCol==='Fabric Base'?(state.sortDir===1?' ↑':' ↓'):''}</th>
           <th onclick="sortBy('Costing')" title="Trier par Costing">Costing${state.sortCol==='Costing'?(state.sortDir===1?' ↑':' ↓'):''}</th>
           <th onclick="sortBy('PSD')" title="Trier par PSD">PSD${state.sortCol==='PSD'?(state.sortDir===1?' ↑':' ↓'):''}</th>
           <th onclick="sortBy('Ex-Fty')" title="Trier par Ex-Fty">Ex-Fty${state.sortCol==='Ex-Fty'?(state.sortDir===1?' ↑':' ↓'):''}</th>
           <th onclick="sortBy('Order Qty')" title="Trier par Qty">Qty${state.sortCol==='Order Qty'?(state.sortDir===1?' ↑':' ↓'):''}</th>`
        : cfg.cols.map(c => `<th onclick="sortBy('${c.key}')" title="Trier par ${c.label}">${c.label}${state.sortCol === c.key ? (state.sortDir === 1 ? " ↑" : " ↓") : ""}</th>`).join("")
    }
    ${isOrdering ? `<th style="white-space:nowrap;">🚦 Track</th>` : ""}
    ${state.activeSheet === "sample" ? `<th style="white-space:nowrap;">Tracking</th>` : ""}
    <th>Actions</th></tr>`;

    if (!rows.length) {
        tableBody.innerHTML = `<tr><td colspan="${cfg.cols.length + (isOrdering ? 2 : 1)}">
            <div class="empty-state"><div class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg></div>
            <h3>Aucune donnée</h3><p>Ajoutez une ligne ou modifiez votre recherche.</p></div>
        </td></tr>`;
        return;
    }

    // ── Details : tableau plat (Saison, Client, Dept, Style, Description, Ex-Fty, Qty) ──
    if (isDetails) {
        const _today = new Date(); _today.setHours(0,0,0,0);
        tableBody.innerHTML = rows.map(row => {
            const rowIdx  = row._rowIndex;
            const _saison = esc(row["Saison"] || "—");
            const _client = esc(row["Client"] || "—");
            const _dept   = esc(row["Dept"]   || "—");
            const _style  = esc(row["Style"]  || "—");
            const _desc   = esc(row["Description"] || row["StyleDescription"] || "—");
            const _qty    = row["Order Qty"] ? Number(row["Order Qty"]).toLocaleString() : "—";
            const _fab    = esc(row["Fabric Base"] || "—");
            const _cost   = row["Costing"] && !isNaN(row["Costing"]) ? `$${Number(row["Costing"]).toFixed(2)}` : esc(row["Costing"] || "—");
            let _psdHtml = "—";
            if (row["PSD"]) {
                try {
                    const _psdDate = new Date(row["PSD"]);
                    const _psdDiff = Math.round((_psdDate - _today) / 86400000);
                    const _psdFmt  = _psdDate.toLocaleDateString("fr-FR", {day:"2-digit", month:"short"});
                    const _psdCls  = _psdDiff < 0 ? "det-efty-danger" : _psdDiff <= 14 ? "det-efty-warn" : "det-efty-ok";
                    const _psdBcls = _psdDiff < 0 ? "det-daybadge det-daybadge-danger" : _psdDiff <= 14 ? "det-daybadge det-daybadge-warn" : "det-daybadge det-daybadge-ok";
                    _psdHtml = `<span class="${_psdCls}">${_psdFmt}</span><span class="${_psdBcls}">(${_psdDiff}j)</span>`;
                } catch(e) {}
            }

            let _eftyHtml = "—";
            if (row["Ex-Fty"]) {
                try {
                    const _eftyDate = new Date(row["Ex-Fty"]);
                    const _diff  = Math.round((_eftyDate - _today) / 86400000);
                    const _eftyFmt = _eftyDate.toLocaleDateString("fr-FR", {day:"2-digit", month:"short"});
                    const _cls  = _diff < 0 ? "det-efty-danger" : _diff <= 14 ? "det-efty-warn" : "det-efty-ok";
                    const _bcls = _diff < 0 ? "det-daybadge det-daybadge-danger" : _diff <= 14 ? "det-daybadge det-daybadge-warn" : "det-daybadge det-daybadge-ok";
                    _eftyHtml = `<span class="${_cls}">${_eftyFmt}</span><span class="${_bcls}">(${_diff}j)</span>`;
                } catch(e) {}
            }

            return `<tr>
                <td style="font-size:12px;color:var(--color-text-secondary)">${_saison}</td>
                <td><span class="client-badge">${_client}</span></td>
                <td><span class="dept-badge">${_dept}</span></td>
                <td><a class="style-link" onclick="openStyleModal('${_style}')">${_style}</a></td>
                <td><span class="det-desc-cell" title="${_desc}">${_desc}</span></td>
                <td style="font-size:12px;color:var(--color-text-secondary)">${_fab}</td>
                <td style="font-size:12px;color:#166534;font-weight:500">${_cost}</td>
                <td style="white-space:nowrap">${_psdHtml}</td>
                <td style="white-space:nowrap">${_eftyHtml}</td>
                <td style="font-size:12.5px">${esc(_qty)}</td>
                <td><div class="action-btns">
                    <button class="btn btn-edit btn-icon" onclick="openEditModal(${rowIdx})" title="Modifier"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                    <button class="btn btn-danger btn-icon" onclick="confirmDelete(${rowIdx})" title="Supprimer"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                </div></td>
            </tr>`;
        }).join("");
        return;
    }

    tableBody.innerHTML = rows.map(row => {
        const rowIdx = row._rowIndex;
        const cells = cfg.cols.map((c, i) => {
            let val = row[c.key] ?? "";
            const sticky = i === 0 ? "sticky-col" : i === 1 ? "sticky-col-2" : i === 2 ? "sticky-col-3" : "";

            if (c.key === "Client") return `<td class="${sticky}"><span class="client-badge">${esc(val) || "—"}</span></td>`;
            if (c.key === "Dept") return `<td class="${sticky}"><span class="dept-badge">${esc(val)}</span></td>`;
            if (c.key === "AWB" && state.activeSheet === "sample") {
                const _awbVal = String(val || "").trim();
                let _trackCell = "";
                if (!_awbVal) {
                    _trackCell = `<td><span style="color:var(--text-muted,#9ca3af);font-size:12px;">—</span></td>`;
                } else if (_awbTrackCache[_awbVal]) {
                    const _ti = _awbTrackCache[_awbVal];
                    const _pcls = {transit:"awb-p-transit",delivered:"awb-p-delivered",pending:"awb-p-pending",exception:"awb-p-exception"}[_ti.statusCode]||"awb-p-transit";
                    _trackCell = `<td><span class="awb-status-pill ${_pcls}" onclick="awbShowPanel('${_awbVal.replace(/'/g,"\\'")}')"><span class="awb-pdot"></span>${_ti.status}</span></td>`;
                } else {
                    _trackCell = `<td><button class="btn awb-track-btn" onclick="awbDoTrack(this,'${_awbVal.replace(/'/g,"\\'")}')">Suivre →</button></td>`;
                }
                return `<td class="${sticky.trim()}" title="${esc(String(val))}">${esc(String(val)) || "<span style='color:var(--text-muted)'>—</span>"}</td>` + _trackCell;
            }
            if (c.key === "Approval") {
                const cls = (val || "").toLowerCase() || "unknown";
                const opts = ["", "Approved", "Pending", "Rejected"].map(o =>
                    `<option value="${o}" ${o === val ? "selected" : ""}>${o || "— Choisir —"}</option>`
                ).join("");
                return `<td><div class="quick-sel-wrap">
                    <span class="approval-badge ${cls} quick-badge">${esc(val) || "—"}</span>
                    <select class="quick-select" onchange="quickUpdate(${rowIdx},'Approval',this.value,'sample')">${opts}</select>
                </div></td>`;
            }
            if (c.key === "Status") {
                const cls = { "Confirmed": "status-confirmed", "Pending": "status-pending", "Cancelled": "status-cancelled" }[val] || "";
                const opts = ["", "Confirmed", "Pending", "Cancelled"].map(o =>
                    `<option value="${o}" ${o === val ? "selected" : ""}>${o || "— Choisir —"}</option>`
                ).join("");
                return `<td><div class="quick-sel-wrap">
                    <span class="status-badge-order ${cls} quick-badge">${esc(val) || "—"}</span>
                    <select class="quick-select" onchange="quickUpdate(${rowIdx},'Status',this.value,'ordering')">${opts}</select>
                </div></td>`;
            }
            if (c.key === "Delivery Status") {
                const cls = { "Not Shipped": "del-notshipped", "In Transit": "del-transit", "Delivered": "del-delivered" }[val] || "";
                const opts = ["", "Not Shipped", "In Transit", "Delivered"].map(o =>
                    `<option value="${o}" ${o === val ? "selected" : ""}>${o || "— Choisir —"}</option>`
                ).join("");
                return `<td><div class="quick-sel-wrap">
                    <span class="delivery-badge ${cls} quick-badge">${esc(val) || "—"}</span>
                    <select class="quick-select" onchange="quickUpdate(${rowIdx},'Delivery Status',this.value,'ordering')">${opts}</select>
                </div></td>`;
            }
            if (c.key === "PO" && !val) return `<td><span class="missing-po-badge">Missing PO</span></td>`;

            let isPast = false, displayVal = val;
            if (c.type === "date" && val) {
                try {
                    const dd = new Date(val);
                    if ((c.key === "Ex-Fty" || c.key === "Ready Date") && dd.getTime() < new Date().setHours(0, 0, 0, 0)) isPast = true;
                    displayVal = dd.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
                } catch (e) { }
            }
            let cc = sticky;
            if (isPast) cc += " text-danger-bold";
            else if (val && (c.key === "Costing" || c.key === "UP")) { cc += " text-success-bold"; if (!isNaN(val)) displayVal = "$" + Number(val).toFixed(2); }
            if (c.key === "Style" && state.activeSheet === "details")
                return `<td class="${cc.trim()}"><a class="style-link" onclick="openStyleModal('${esc(val)}')">${esc(String(displayVal))}</a></td>`;
            return `<td class="${cc.trim()}" title="${esc(String(val))}">${esc(String(displayVal)) || "<span style='color:var(--text-muted)'>—</span>"}</td>`;
        }).join("");

        const trackCell = isOrdering ? (() => { const t = computeDeliveryTrack(row); return `<td><span class="track-badge ${t.cls}">${t.label}</span></td>`; })() : "";

        const _sheetCfg = SHEET_CONFIG[state.activeSheet];
        const isTrimsDevoSheet = _sheetCfg && _sheetCfg.custom && (_sheetCfg.label || "").toLowerCase().includes("trims");
        const isBulkSheet = _sheetCfg && _sheetCfg.custom && ((_sheetCfg.label || "").toLowerCase().includes("bulk") || (_sheetCfg.label || "").toLowerCase().includes("shade"));
        const trimsDet = isTrimsDevoSheet ? detectCustomCols(_sheetCfg.cols, _sheetCfg.label) : null;
        const bulkDet = isBulkSheet ? detectCustomCols(_sheetCfg.cols, _sheetCfg.label) : null;
        const isRowRejected = r => {
            const d = trimsDet || bulkDet;
            return d && String(r[d.approval] ?? "").trim().toLowerCase() === "rejected";
        };

        const dupBtn = isTrimsDevoSheet && isRowRejected(row)
            ? `<button class="btn btn-icon" style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d;" onclick="duplicateTrimsDevoRejected(${rowIdx})" title="Créer nouvelle ligne (Season/Client/Dept/Style/Description/Color/Trims/Trims Details/Supplier)"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="13" height="13"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></button>`
            : isBulkSheet && isRowRejected(row)
                ? `<button class="btn btn-icon" style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d;" onclick="duplicateBulkRejected(${rowIdx})" title="Créer nouvelle ligne (Client/Style/Description/GMT Color/Fabric/Type)"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="13" height="13"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></button>`
                : "";

        // ── Details : vue compacte avec expand pour les champs secondaires ──
        if (state.activeSheet === "details") {
            const _expandId  = "det-exp-" + rowIdx;
            const _chevronId = "det-chv-" + rowIdx;

            // ── Cellules compactes (Client, Dept, Style, Description, Ex-Fty+badge, Qty) ──
            const _client = row["Client"] || "—";
            const _dept   = row["Dept"]   || "—";
            const _style  = row["Style"]  || "—";
            const _desc   = row["Description"] || row["StyleDescription"] || "—";
            const _qty    = row["Order Qty"] ? Number(row["Order Qty"]).toLocaleString() : "—";

            // Ex-Fty : date + badge jours coloré
            let _eftyHtml = "—";
            if (row["Ex-Fty"]) {
                try {
                    const _eftyDate = new Date(row["Ex-Fty"]);
                    const _today = new Date(); _today.setHours(0,0,0,0);
                    const _diff  = Math.round((_eftyDate - _today) / 86400000);
                    const _eftyFmt = _eftyDate.toLocaleDateString("fr-FR", {day:"2-digit", month:"short"});
                    const _cls  = _diff < 0  ? "det-efty-danger" : _diff <= 14 ? "det-efty-warn" : "det-efty-ok";
                    const _bcls = _diff < 0  ? "det-daybadge det-daybadge-danger" : _diff <= 14 ? "det-daybadge det-daybadge-warn" : "det-daybadge det-daybadge-ok";
                    const _dlbl = _diff < 0  ? `${_diff}j` : `${_diff}j`;
                    _eftyHtml = `<span class="${_cls}">${_eftyFmt}</span><span class="${_bcls}">${_dlbl}</span>`;
                } catch(e) {}
            }

            // ── Données croisées samples + orders pour le expand ──
            const _sRows = (state.data.sample || []).filter(s => s.Style === row.Style && s.Client === row.Client);
            const _oRows = (state.data.ordering || []).filter(o => o.Style === row.Style && o.Client === row.Client);
            const _sApproved = _sRows.filter(s => s.Approval === "Approved").length;
            const _sPending  = _sRows.filter(s => s.Approval === "Pending").length;
            const _sRejected = _sRows.filter(s => s.Approval === "Rejected").length;
            const _oDelivered= _oRows.filter(o => o["Delivery Status"] === "Delivered").length;
            const _oTransit  = _oRows.filter(o => o["Delivery Status"] === "In Transit").length;
            const _oTotal    = _oRows.filter(o => o.Status !== "Cancelled").length;

            const _sampleBadge = _sRows.length === 0
                ? `<span class="det-xbadge det-xbadge-gray">Aucun sample</span>`
                : _sRejected > 0
                    ? `<span class="det-xbadge det-xbadge-danger">${_sRejected} rejeté${_sRejected>1?"s":""}</span>`
                    : _sPending > 0
                        ? `<span class="det-xbadge det-xbadge-warn">${_sPending} en attente</span>`
                        : `<span class="det-xbadge det-xbadge-ok">${_sApproved} approuvé${_sApproved>1?"s":""}</span>`;

            const _orderBadge = _oTotal === 0
                ? `<span class="det-xbadge det-xbadge-gray">Aucune commande</span>`
                : _oDelivered === _oTotal
                    ? `<span class="det-xbadge det-xbadge-ok">${_oDelivered}/${_oTotal} livré${_oDelivered>1?"s":""}</span>`
                    : _oTransit > 0
                        ? `<span class="det-xbadge det-xbadge-blue">${_oTransit} en transit</span>`
                        : `<span class="det-xbadge det-xbadge-warn">${_oTotal - _oDelivered} non expédié${(_oTotal-_oDelivered)>1?"s":""}</span>`;

            const _fab  = esc(row["Fabric Base"] || "—");
            const _cost = row["Costing"] ? `$${Number(row["Costing"]).toFixed(2)}` : "—";
            const _psd  = row["PSD"] ? new Date(row["PSD"]).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}) : "—";

            const _mainRow = `<tr class="det-main-row" onclick="detToggleExpand('${_expandId}','${_chevronId}')" style="cursor:pointer">
                <td style="width:22px;padding:0 0 0 8px"><svg id="${_chevronId}" class="det-chevron" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg></td>
                <td class="sticky-col"><span class="client-badge" style="cursor:pointer" title="Filtrer par ${esc(_client)}" onclick="event.stopPropagation();detFilterByClient('${esc(_client)}')">${esc(_client)}</span></td>
                <td class="sticky-col-2"><span class="dept-badge">${esc(_dept)}</span></td>
                <td class="sticky-col-3"><a class="style-link" onclick="event.stopPropagation();openStyleModal('${esc(_style)}')">${esc(_style)}</a></td>
                <td><span class="det-desc-cell" title="${esc(_desc)}">${esc(_desc)}</span></td>
                <td style="white-space:nowrap">${_eftyHtml}</td>
                <td style="font-size:12.5px">${esc(_qty)}</td>
                <td><div class="action-btns">
                    <button class="btn btn-edit btn-icon" onclick="event.stopPropagation();openEditModal(${rowIdx})" title="Modifier"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                    ${dupBtn}
                    <button class="btn btn-danger btn-icon" onclick="event.stopPropagation();confirmDelete(${rowIdx})" title="Supprimer"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                </div></td>
            </tr>`;

            const _expandRow = `<tr id="${_expandId}" class="det-expand-row" style="display:none">
                <td colspan="8" style="padding:0">
                    <div class="det-expand-body">
                        <div class="det-xfield"><span class="det-xlabel">Fabric Base</span><span class="det-xval">${_fab}</span></div>
                        <div class="det-xfield"><span class="det-xlabel">Costing</span><span class="det-xval" style="color:#166534;font-weight:500">${_cost}</span></div>
                        <div class="det-xfield"><span class="det-xlabel">PSD</span><span class="det-xval">${_psd}</span></div>
                        <div class="det-xfield"><span class="det-xlabel">Saison</span><span class="det-xval">${esc(row["Saison"]||"—")}</span></div>
                        <div class="det-xfield"><span class="det-xlabel">Samples</span><span class="det-xval">${_sampleBadge}</span></div>
                        <div class="det-xfield"><span class="det-xlabel">Commandes</span><span class="det-xval">${_orderBadge}</span></div>
                    </div>
                </td>
            </tr>`;

            return _mainRow + _expandRow;
        }

        return `<tr>${cells}${trackCell}
        <td><div class="action-btns">
            <button class="btn btn-edit btn-icon" onclick="openEditModal(${rowIdx})" title="Modifier"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
            ${dupBtn}
            <button class="btn btn-danger btn-icon" onclick="confirmDelete(${rowIdx})" title="Supprimer"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
        </div></td></tr>`;
    }).join("");
}

// ─── Sort / Modal / Form / Delete / API / Toast / Helpers ─────
function sortBy(col) { if (state.sortCol === col) state.sortDir *= -1; else { state.sortCol = col; state.sortDir = 1; } applyFilters(); }

function openAddModal() {
    state.editingRow = null;
    const cfg = SHEET_CONFIG[state.activeSheet];
    modalTitle.textContent = `Ajouter – ${cfg.label}`;
    modalSubTitle.textContent = "Remplissez les champs ci-dessous";
    const prefill = {};
    if (cfg.custom) {
        const det = detectCustomCols(cfg.cols, cfg.label);
        if (det.isFabricAnalysis && det.readyDate) {
            const d = new Date(); d.setDate(d.getDate() + 2);
            prefill[det.readyDate] = d.toISOString().slice(0, 10);
        }
    }
    buildForm(cfg.cols, prefill);
    formSave.textContent = "Enregistrer";
    openModal();
    if (Object.keys(prefill).length) {
        const fmt = new Date(Object.values(prefill)[0]).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
        showToast(`🧪 Ready Date calculée automatiquement : ${fmt} (J+2)`, "info", 5000);
    }
}
function openEditModal(rowIndex) { const row = state.data[state.activeSheet].find(r => r._rowIndex === rowIndex); if (!row) return; state.editingRow = rowIndex; const cfg = SHEET_CONFIG[state.activeSheet]; modalTitle.textContent = `Modifier – ${cfg.label}`; modalSubTitle.textContent = `Ligne ${rowIndex}`; buildForm(cfg.cols, row); formSave.textContent = "Mettre à jour"; openModal(); }

async function duplicateTrimsDevoRejected(rowIndex) {
    const sheetKey = state.activeSheet;
    const cfg = SHEET_CONFIG[sheetKey];
    if (!cfg) return;
    const row = (state.data[sheetKey] || []).find(r => r._rowIndex === rowIndex);
    if (!row) return;

    // Colonnes dont on GARDE les données (toutes les autres → vide)
    const KEEP_PATTERNS = [
        ["season", "saison"],
        ["client", "buyer", "brand", "marque"],
        ["dept", "department", "departement", "département"],
        ["style", "ref", "reference", "article"],
        ["description", "desc", "name", "nom"],
        ["color", "colour", "coloris", "couleur", "shade", "teinte"],
        ["trims details", "trim details", "accessories detail", "detail trim", "garniture detail"],
        ["trims", "trim", "accessoire", "garniture"],
        ["supplier", "fournisseur", "vendor", "mill", "factory"],
    ];

    const keepKeys = new Set();
    KEEP_PATTERNS.forEach(patterns => {
        const c = cfg.cols.find(c => patterns.some(p => c.label.toLowerCase().includes(p)));
        if (c) keepKeys.add(c.key);
    });

    // Construire la nouvelle ligne : toutes les colonnes présentes, données seulement pour les 9
    const newRow = {};
    cfg.cols.forEach(c => {
        newRow[c.key] = keepKeys.has(c.key) ? (row[c.key] ?? "") : "";
    });

    try {
        showToast("Création de la nouvelle ligne…", "info");
        await sendRequest("CREATE", { data: newRow });
        await fetchAllData();
        renderAll();
        showToast("Nouvelle ligne créée — Season / Client / Dept / Style / Description / Color / Trims / Trims Details / Supplier ✓", "success");
    } catch (err) {
        showToast("Erreur lors de la duplication : " + err.message, "error");
    }
}

async function duplicateBulkRejected(rowIndex) {
    const sheetKey = state.activeSheet;
    const cfg = SHEET_CONFIG[sheetKey];
    if (!cfg) return;
    const row = (state.data[sheetKey] || []).find(r => r._rowIndex === rowIndex);
    if (!row) return;

    // Colonnes à garder : Client, Style, Description, GMT Color, Fabric, Type
    const KEEP_PATTERNS = [
        ["client", "buyer", "brand", "marque"],
        ["style", "ref", "reference", "article"],
        ["description", "desc", "name", "nom"],
        ["gmt color", "gmt colour", "coloris", "color", "colour", "shade", "teinte"],
        ["fabric", "tissu", "matière", "matiere", "material", "textile"],
        ["type", "bulk type"],
    ];

    const keepKeys = new Set();
    KEEP_PATTERNS.forEach(patterns => {
        const c = cfg.cols.find(c => patterns.some(p => c.label.toLowerCase().includes(p)));
        if (c) keepKeys.add(c.key);
    });

    const newRow = {};
    cfg.cols.forEach(c => {
        newRow[c.key] = keepKeys.has(c.key) ? (row[c.key] ?? "") : "";
    });

    try {
        showToast("Création de la nouvelle ligne…", "info");
        await sendRequest("CREATE", { data: newRow });
        await fetchAllData();
        renderAll();
        showToast("Nouvelle ligne créée — Client / Style / Description / GMT Color / Fabric / Type ✓", "success");
    } catch (err) {
        showToast("Erreur lors de la duplication : " + err.message, "error");
    }
}

function toISODateValue(val) {
    if (!val) return "";
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(val).trim())) return String(val).trim();
    // Try parsing as a date (handles "07 mars 2026", "07/03/2026", etc.)
    try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    } catch (e) { }
    return "";
}

function buildForm(cols, data) {
    formFields.innerHTML = cols.map(col => {
        const rawVal = data[col.key] ?? ""; const full = col.full ? " full" : "";
        let input;
        if (col.type === "textarea") input = `<textarea class="form-textarea" id="field-${sanitizeId(col.key)}" placeholder="${col.label}">${esc(String(rawVal))}</textarea>`;
        else if (col.type === "select") { const opts = col.options.map(o => `<option value="${esc(o)}" ${o === rawVal ? "selected" : ""}>${esc(o) || "— Sélectionner —"}</option>`).join(""); input = `<select class="form-select" id="field-${sanitizeId(col.key)}">${opts}</select>`; }
        else if (col.type === "date") { const dateVal = toISODateValue(rawVal); input = `<input class="form-input" id="field-${sanitizeId(col.key)}" type="date" value="${esc(dateVal)}" placeholder="${col.label}" ${col.required ? "required" : ""}>`; }
        else input = `<input class="form-input" id="field-${sanitizeId(col.key)}" type="text" value="${esc(String(rawVal))}" placeholder="${col.label}" ${col.required ? "required" : ""}>`;
        return `<div class="form-group${full}"><label class="form-label" for="field-${sanitizeId(col.key)}">${col.label}${col.required ? ` <span style="color:var(--danger)">*</span>` : ""}</label>${input}</div>`;
    }).join("");
}

function getFormData() { const cfg = SHEET_CONFIG[state.activeSheet]; const data = {}; cfg.cols.forEach(col => { const el = document.getElementById(`field-${sanitizeId(col.key)}`); if (el) data[col.key] = el.value; }); return data; }
function openModal() { modalOverlay.classList.add("open"); }
function closeModal() { modalOverlay.classList.remove("open"); state.editingRow = null; }

async function saveForm() {
    const cfg = SHEET_CONFIG[state.activeSheet]; const rawData = getFormData();

    // ─── Trim detection ───────────────────────────────────────────
    const trimmedFields = [];
    const data = {};
    cfg.cols.forEach(col => {
        const raw = rawData[col.key] ?? "";
        if (typeof raw === "string") {
            const trimmed = raw.trim();
            if (trimmed !== raw) trimmedFields.push(col.label);
            data[col.key] = trimmed;
        } else {
            data[col.key] = raw;
        }
    });
    if (trimmedFields.length) {
        showToast(
            `✂️ Espaces supprimés dans : ${trimmedFields.join(", ")}`,
            "info",
            4500
        );
    }
    // ─────────────────────────────────────────────────────────────

    if (data["Size"]) data["Size"] = "'" + data["Size"];
    const missing = cfg.cols.filter(c => c.required && !data[c.key]);
    if (missing.length) { showToast(`Champ requis : ${missing.map(c => c.label).join(", ")}`, "error"); return; }
    formSave.disabled = true; formSave.textContent = "Enregistrement…";
    try {
        if (state.editingRow) {
            // ── Construire un objet ordonné selon les colonnes du SHEET_CONFIG ──
            // Garantit que le GAS reçoit les données dans le bon ordre de colonnes,
            // et supprime les anciennes clés renommées.
            const orderedData = {};
            cfg.cols.forEach(col => { orderedData[col.key] = data[col.key] ?? ""; });
            await sendRequest("UPDATE", { data: orderedData, rowIndex: state.editingRow });
            const idx = state.data[state.activeSheet].findIndex(r => r._rowIndex === state.editingRow);
            if (idx !== -1) {
                // Nettoyer les anciennes clés hors-schéma avant le merge
                const existing = state.data[state.activeSheet][idx];
                const knownKeys = new Set(cfg.cols.map(c => c.key));
                const cleaned = { _rowIndex: existing._rowIndex };
                Object.keys(existing).forEach(k => { if (knownKeys.has(k)) cleaned[k] = existing[k]; });
                state.data[state.activeSheet][idx] = { ...cleaned, ...orderedData };
            }
            showToast("Ligne mise à jour avec succès", "success");
        } else { await sendRequest("CREATE", { data }); await fetchAllData(); }
        closeModal(); renderAll();
    } catch (err) { showToast("Erreur : " + err.message, "error"); }
    finally { formSave.disabled = false; formSave.textContent = state.editingRow ? "Mettre à jour" : "Enregistrer"; }
}

let pendingDeleteRow = null;
function confirmDelete(rowIndex) { pendingDeleteRow = rowIndex; confirmOverlay.classList.add("open"); }
function cancelDelete() { pendingDeleteRow = null; confirmOverlay.classList.remove("open"); }
async function executeDelete() {
    if (!pendingDeleteRow) return;
    const btn = document.getElementById("confirm-delete-btn"); btn.disabled = true; btn.textContent = "Suppression…";
    try {
        await sendRequest("DELETE", { rowIndex: pendingDeleteRow });
        state.data[state.activeSheet] = state.data[state.activeSheet].filter(r => r._rowIndex !== pendingDeleteRow);
        confirmOverlay.classList.remove("open"); pendingDeleteRow = null; renderAll(); showToast("Ligne supprimée avec succès", "success");
    } catch (err) { showToast("Erreur : " + err.message, "error"); }
    finally { btn.disabled = false; btn.textContent = "Supprimer"; }
}


// ═══════════════════════════════════════════════════════════════
// ─── MENU BUILDER ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

const CUSTOM_MENUS_KEY = "aw27_custom_menus";
let mbColumns = []; // working columns while builder is open
let mbEditingKey = null; // null = new, string = editing existing

// ── Load saved menus on startup ───────────────────────────────
function loadCustomMenus() {
    const saved = localStorage.getItem(CUSTOM_MENUS_KEY);
    if (!saved) return;
    try {
        const menus = JSON.parse(saved);
        // Migration : corriger les anciennes clés "GMT_Color" → "GMT Color"
        const migrated = menus.map(m => ({
            ...m,
            cols: m.cols.map(c => ({
                ...c,
                key: c.label  // toujours utiliser le label exact comme clé
            }))
        }));
        migrated.forEach(m => registerCustomMenu(m, false));
        // Re-sauvegarder avec les clés corrigées
        localStorage.setItem(CUSTOM_MENUS_KEY, JSON.stringify(migrated));
    } catch (e) { }
}

// ── Register a custom menu into SHEET_CONFIG + nav + state ────
function registerCustomMenu(menuDef, save = true) {
    const key = menuDef.key;

    // Add to SHEET_CONFIG
    SHEET_CONFIG[key] = {
        label: menuDef.label,
        sheetName: menuDef.label,  // vrai nom de la feuille Google Sheet
        custom: true,
        cols: menuDef.cols,
        kpis: [
            {
                label: "Total lignes", colorClass: "teal",
                icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>',
                compute: rows => rows.length
            }
        ]
    };

    // Add to state.data
    if (!state.data[key]) state.data[key] = [];

    // Add nav item
    const nav = document.getElementById("custom-nav-items");
    if (nav && !document.getElementById("tab-custom-" + key)) {
        const btn = document.createElement("button");
        btn.className = "nav-item";
        btn.dataset.sheet = key;
        btn.dataset.custom = "1";
        btn.role = "tab";
        btn.setAttribute("aria-selected", "false");
        btn.id = "tab-custom-" + key;
        btn.innerHTML =
            '<span class="nav-icon">' +
            '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/></svg>' +
            '</span>' +
            '<span class="nav-label">' + esc(menuDef.label) + '</span>' +
            '<button class="mb-nav-edit-btn" onclick="event.stopPropagation();openMenuEdit(\'' + key + '\')" title="Modifier">' +
            '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>' +
            '</button>';

        // Click handler — navigate to this sheet
        btn.addEventListener("click", () => {
            state.activeView = "sheet";
            state.activeSheet = key;
            state.searchQuery = ""; state.filterDept = ""; state.filterClient = "";
            state.sortCol = null; state.sortDir = 1;
            searchInput.value = ""; deptFilter.value = "";
            const cf = document.getElementById("client-filter"); if (cf) cf.value = "";
            document.querySelectorAll(".nav-item").forEach(b => {
                b.classList.remove("active"); b.setAttribute("aria-selected", "false");
            });
            btn.classList.add("active"); btn.setAttribute("aria-selected", "true");
            const el = document.getElementById("header-sheet-title");
            if (el) el.textContent = menuDef.label;
            showTableView(); applyFilters(); renderKPIs();
            populateDeptFilter(); populateClientFilter();
        });

        nav.appendChild(btn);
    }

    // Persist
    if (save) persistCustomMenus();
}

// ── Persist menus : GAS (permanent) + localStorage (cache) ───
function persistCustomMenus() {
    const menus = Object.entries(SHEET_CONFIG)
        .filter(([, v]) => v.custom)
        .map(([key, v]) => ({ key, label: v.label, cols: v.cols }));
    // Toujours sauvegarder en localStorage comme cache rapide
    localStorage.setItem(CUSTOM_MENUS_KEY, JSON.stringify(menus));
    // Sauvegarder en GAS pour persistance cross-navigateur / GitHub Pages
    sendRequest("SAVE_MENUS", { menus })
        .catch(() => { }); // silencieux si GAS non connecté
}

// ── Open builder (new) ────────────────────────────────────────
function openMenuBuilder() {
    mbEditingKey = null;
    mbColumns = [
        { label: "", type: "text", required: false }
    ];
    document.getElementById("mb-menu-name").value = "";
    document.getElementById("menu-builder-title").textContent = "Créer un menu";
    document.getElementById("mb-save-btn").textContent = "Créer le menu";
    renderMbColumns();
    document.getElementById("menu-builder-overlay").classList.add("open");
}

// ── Open builder (edit existing) ─────────────────────────────
function openMenuEdit(key) {
    const cfg = SHEET_CONFIG[key];
    if (!cfg) return;
    // Autoriser sample et details en plus des menus custom
    const isEditable = cfg.custom || key === "sample" || key === "details";
    if (!isEditable) return;
    mbEditingKey = key;
    mbColumns = cfg.cols.map(c => ({ ...c }));
    const nameInput = document.getElementById("mb-menu-name");
    if (nameInput) {
        nameInput.value = cfg.label;
        // Bloquer le renommage pour sample/details (le nom est fixe)
        nameInput.readOnly = !cfg.custom;
        nameInput.style.opacity = cfg.custom ? "" : "0.5";
        nameInput.title = cfg.custom ? "" : "Le nom de ce menu ne peut pas être modifié";
    }
    document.getElementById("menu-builder-title").textContent = "Colonnes : " + cfg.label;
    document.getElementById("mb-save-btn").textContent = "Enregistrer";
    renderMbColumns();
    document.getElementById("menu-builder-overlay").classList.add("open");
}

function closeMenuBuilder() {
    document.getElementById("menu-builder-overlay").classList.remove("open");
    mbColumns = []; mbEditingKey = null;
}

// ── Add a column row in the builder ──────────────────────────
function mbAddColumn() {
    mbColumns.push({ label: "", type: "text", required: false });
    renderMbColumns();
    // Focus the new input
    const inputs = document.querySelectorAll(".mb-col-label-input");
    if (inputs.length) inputs[inputs.length - 1].focus();
}

function mbRemoveColumn(idx) {
    mbColumns.splice(idx, 1);
    renderMbColumns();
}

function mbMoveColumn(idx, dir) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= mbColumns.length) return;
    [mbColumns[idx], mbColumns[newIdx]] = [mbColumns[newIdx], mbColumns[idx]];
    renderMbColumns();
}

function mbSyncColumn(idx, field, value) {
    mbColumns[idx][field] = field === "required" ? value : value;
}

// ── Render column builder rows ────────────────────────────────
function renderMbColumns() {
    const list = document.getElementById("mb-cols-list");
    if (!list) return;

    const typeOptions = ["text", "number", "date", "select", "textarea"].map(t =>
        '<option value="' + t + '">' +
        { text: "Texte", number: "Nombre", date: "Date", select: "Liste", textarea: "Bloc texte" }[t] +
        '</option>'
    ).join("");

    list.innerHTML = mbColumns.map((col, i) => {
        const selOpts = ["text", "number", "date", "select", "textarea"].map(t =>
            '<option value="' + t + '" ' + (col.type === t ? "selected" : "") + '>' +
            { text: "Texte", number: "Nombre", date: "Date", select: "Liste (options)", textarea: "Bloc texte" }[t] +
            '</option>'
        ).join("");

        const isSelect = col.type === "select";

        return '<div class="mb-col-row" id="mb-col-' + i + '">' +
            '<div class="mb-col-drag">' + (i + 1) + '</div>' +
            '<div class="mb-col-fields">' +
            '<div class="mb-col-top">' +
            '<input class="form-input mb-col-label-input" placeholder="Nom de colonne *" ' +
            'value="' + esc(col.label) + '" ' +
            'oninput="mbSyncColumn(' + i + ',' + "'label',this.value" + ')" />' +
            '<select class="form-select mb-col-type" onchange="mbSyncColumn(' + i + ',' + "'type',this.value" + '); mbColumns[' + i + '].type=this.value; renderMbColumns()">' +
            selOpts +
            '</select>' +
            '<label class="mb-col-req" title="Champ obligatoire">' +
            '<input type="checkbox" ' + (col.required ? "checked" : "") + ' onchange="mbSyncColumn(' + i + ',' + "'required',this.checked" + ')">' +
            '<span>Requis</span></label>' +
            '</div>' +
            (isSelect ? '<div class="mb-col-opts-row"><input class="form-input mb-col-opts-input" placeholder="Options séparées par virgule : Ex, Aaa, Bbb" ' +
                'value="' + esc((col.options || []).filter(o => o).join(", ")) + '" ' +
                'oninput="mbSyncColumn(' + i + ',' + "'options',this.value.split(',').map(s=>s.trim()).filter(Boolean)" + ')"/></div>' : "") +
            '</div>' +
            '<div class="mb-col-actions">' +
            (i > 0 ? '<button class="mb-act-btn" onclick="mbMoveColumn(' + i + ',-1)" title="Monter">↑</button>' : '<span></span>') +
            (i < mbColumns.length - 1 ? '<button class="mb-act-btn" onclick="mbMoveColumn(' + i + ',1)" title="Descendre">↓</button>' : '<span></span>') +
            (mbColumns.length > 1 ? '<button class="mb-act-btn mb-act-del" onclick="mbRemoveColumn(' + i + ')" title="Supprimer">✕</button>' : "") +
            '</div>' +
            '</div>';
    }).join("");
}

// ── Save the menu ─────────────────────────────────────────────
async function saveMenuBuilder() {
    const nameRaw = document.getElementById("mb-menu-name").value.trim();
    if (!nameRaw) { showToast("Nom du menu requis", "error"); return; }

    // Sync any unsaved label inputs
    document.querySelectorAll(".mb-col-label-input").forEach((inp, i) => {
        if (mbColumns[i]) mbColumns[i].label = inp.value.trim();
    });
    document.querySelectorAll(".mb-col-opts-input").forEach((inp, i) => {
        const colIdx = parseInt(inp.closest(".mb-col-row").id.replace("mb-col-", ""));
        if (mbColumns[colIdx]) {
            mbColumns[colIdx].options = ["", ...inp.value.split(",").map(s => s.trim()).filter(Boolean)];
        }
    });

    const validCols = mbColumns.filter(c => c.label);
    if (!validCols.length) { showToast("Ajoutez au moins une colonne", "error"); return; }

    // Build key from name
    const key = mbEditingKey || "custom_" + nameRaw.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20) + "_" + Date.now().toString(36);

    const menuDef = {
        key,
        label: nameRaw,
        cols: validCols.map(c => ({
            key: c.label,
            label: c.label,
            type: c.type,
            required: !!c.required,
            ...(c.type === "select" ? { options: c.options || [""] } : {}),
            ...(c.type === "textarea" || c.label.length > 15 ? { full: true } : {})
        }))
    };

    const btn = document.getElementById("mb-save-btn");
    btn.disabled = true; btn.textContent = "Enregistrement…";

    try {
        if (mbEditingKey) {
            await sendRequest("UPDATE_SHEET_HEADERS", { sheetName: nameRaw, columns: menuDef.cols.map(c => c.label) });
            showToast("Colonnes mises à jour dans Google Sheet \u2713", "success", 3000);
        } else {
            await sendRequest("CREATE_SHEET", { sheetName: nameRaw, columns: menuDef.cols.map(c => c.label) });
            showToast("Menu cr\u00e9\u00e9 dans Google Sheet \u2713", "success", 3000);
        }
    } catch (e) {
        showToast("Menu sauvegard\u00e9 localement (GS non connect\u00e9)", "info", 3000);
    }

    if (mbEditingKey) {
        const isNonCustom = mbEditingKey === "sample" || mbEditingKey === "details";
        // Pour sample/details : garder le label d'origine, ne pas appeler persistCustomMenus
        SHEET_CONFIG[key].cols = menuDef.cols;
        if (!isNonCustom) {
            SHEET_CONFIG[key].label = menuDef.label;
            SHEET_CONFIG[key].sheetName = menuDef.label;
            persistCustomMenus();
            const navBtn = document.getElementById("tab-custom-" + key);
            if (navBtn) navBtn.querySelector(".nav-label").textContent = menuDef.label;
        }

        // Si on est sur ce menu, rafraîchir l'affichage (KPIs + tableau)
        if (state.activeSheet === key) {
            const titleEl = document.getElementById("header-sheet-title");
            if (titleEl && !isNonCustom) titleEl.textContent = menuDef.label;
            renderKPIs();
            applyFilters();
            renderTable();
        }

        // Recharger les données depuis GS pour refléter les nouvelles colonnes
        fetchAllData();
    } else {
        registerCustomMenu(menuDef, true);
        // Auto-navigate to new menu
        const navBtn = document.getElementById("tab-custom-" + key);
        if (navBtn) navBtn.click();
    }

    btn.disabled = false;
    closeMenuBuilder();
}

// ── Import from Excel ──────────────────────────────────────────
async function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    event.target.value = ""; // reset
    const nameRaw = prompt("Nom du nouveau menu (basé sur le fichier) ?", file.name.replace(/\.[^/.]+$/, ""));
    if (!nameRaw) return;

    // Build key from name
    const key = "custom_" + nameRaw.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20) + "_" + Date.now().toString(36);

    const btn = document.getElementById("mb-save-btn");
    btn.disabled = true; btn.textContent = "Importation…";
    showToast("Lecture de l'Excel...", "info");

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            const json = XLSX.utils.sheet_to_json(worksheet, {header: 1});
            if (json.length === 0) throw new Error("Fichier vide");
            
            const headers = json[0].map(h => String(h).trim()).filter(Boolean);
            if (headers.length === 0) throw new Error("Aucun en-tête trouvé");

            const rowsData = [];
            for (let i = 1; i < json.length; i++) {
                const rowArray = json[i];
                if (!rowArray || rowArray.length === 0) continue;
                // Ignorer les lignes totalement vides
                if (rowArray.every(c => c === undefined || c === null || c === "")) continue;

                const rowObj = {};
                headers.forEach((h, j) => {
                    rowObj[h] = rowArray[j] !== undefined ? rowArray[j] : "";
                });
                rowsData.push(rowObj);
            }

            const validCols = headers.map(h => ({ label: h, type: "text" }));

            const menuDef = {
                key,
                label: nameRaw,
                cols: validCols.map(c => ({
                    key: c.label,
                    label: c.label,
                    type: c.type,
                    required: false,
                    ...(c.label.length > 15 ? { full: true } : {})
                }))
            };

            showToast(`Envoi des données (${rowsData.length} lignes)...`, "info");

            await sendRequest("IMPORT_EXCEL", { 
                sheetName: nameRaw, 
                columns: headers, 
                rows: rowsData 
            }, "menu_builder");

            showToast("Importation réussie ✓", "success", 4000);

            closeMenuBuilder();
            registerCustomMenu(menuDef, true);
            
            const navBtn = document.getElementById("tab-custom-" + key);
            if (navBtn) navBtn.click();
            
            await fetchAllData();

        } catch (err) {
            console.error(err);
            showToast("Erreur Excel: " + err.message, "error", 5000);
        } finally {
            btn.disabled = false;
            btn.textContent = "Créer le menu";
        }
    };
    reader.readAsArrayBuffer(file);
}


// ═══════════════════════════════════════════════════════════════
// ─── CUSTOM MENU – SMART ALERTS (drawer style) ────────────────
// ═══════════════════════════════════════════════════════════════

// ── Détection intelligente des colonnes ──────────────────────
function detectCustomCols(cols, menuLabel) {
    const find = patterns => {
        const c = cols.find(c => patterns.some(p => c.label.toLowerCase().includes(p)));
        return c ? c.key : null;
    };
    // Detect if this sheet is a Fabric Analysis sheet
    // On cherche dans le NOM DU MENU (cfg.label) ET dans les labels de colonnes
    const sheetNameHints = cols.map(c => c.label.toLowerCase()).join(" ");
    const menuHint = (menuLabel || "").toLowerCase();
    // Patterns qui identifient un menu Fabric Analysis
    const FABRIC_MENU_WORDS = ["analysis", "analyse", "analys", "fiber", "fibre", "efa", "labo"];
    const FABRIC_COL_PHRASES = ["fabric analysis", "fabric test", "efa", "test labo", "fiber test", "fibre test", "lab analysis", "composition test"];
    const FABRIC_DEVO_PHRASES = ["fabric devo", "fabric dev", "devo fabric"];

    // Patterns NON-Fabric explicites
    const NON_FABRIC_PATTERNS = ["lab dip", "labdip", "strike off", "strikeoff", "print strike", "color strike"];
    const isNonFabric = NON_FABRIC_PATTERNS.some(p => menuHint.includes(p));

    // Detect Fabric Devo
    const isFabricDevo = !isNonFabric && (
        FABRIC_DEVO_PHRASES.some(p => menuHint.includes(p)) ||
        FABRIC_DEVO_PHRASES.some(p => sheetNameHints.includes(p))
    );

    // Detect Care Label
    const CARE_LABEL_PATTERNS = ["care label", "carelabel", "care labels", "care_label", "etiquette soin", "label soin", "label care"];
    const isCareLabel = CARE_LABEL_PATTERNS.some(p => menuHint.includes(p));

    // Detect Trims Devo
    const TRIMS_DEVO_PATTERNS = ["trims devo", "trim devo", "trims dev", "trim dev", "trims development", "trim development"];
    const isTrimsDevo = TRIMS_DEVO_PATTERNS.some(p => menuHint.includes(p));

    // Detect Fabric Analysis
    const menuWords = menuHint.trim().split(/\s+/);
    const isFabricAnalysis = !isNonFabric && !isFabricDevo && (
        menuWords.some(w => FABRIC_MENU_WORDS.some(p => w === p || w.startsWith(p)))
        || FABRIC_COL_PHRASES.some(p => sheetNameHints.includes(p))
    );

    const findExact = (patterns) => {
        const c = cols.find(col => patterns.includes(col.label.toLowerCase()));
        return c ? c.key : null;
    };
    return {
        approval: find(["approval", "approv", "approved", "validation", "statut appr"]),
        sendingDate: find(["sending date", "send date", "sent date", "date envoi", "ship date", "sending", "date send"]),
        receivedDate: find(["received date", "receipt date", "date recep", "date recu", "reception", "received"]),
        readyDate: find(["ready date", "ready", "date pret", "date pr\u00eat", "due date", "expected date"]),
        resultDate: find(["result date", "date result"]),
        resultField: findExact(["result"]),
        fsrDate: find(["fsr date", "launch date", "date lancement", "date launch", "request date", "date request"]),
        fsrNumber: find(["fsr number", "fsr no", "fsr num", "fsr #", "fsr ref", "num\u00e9ro fsr", "no fsr", "reference fsr", "fsr"]),
        launchDate: find(["launched on", "launched", "launch", "lanc\u00e9", "date lanc", "sent to lab", "submitted", "submission date", "date soumis", "lab date", "date analyse", "analysis date"]),
        efaRef: find(["efa", "fabric ref", "fabric no", "fabric num", "lot", "batch", "test ref", "test no", "test num", "test id", "analyse ref", "analyse no", "ref test"]),
        isFabricAnalysis,
        isFabricDevo, // Added
        isTrimsDevo,
        isCareLabel,
        nlSubmission: find(["nl submission", "nl sub", "submission nl", "envoi nl", "send nl", "nl send", "nl date", "submission date"]),
        keepSample: find(["keep sample", "keep spl", "keep", "retain", "sample conserv", "echantillon conserv"]),
        trimsDetails: find(["trims detail", "trim detail", "trims details", "accessories detail", "detail trim"]),
        awb: find(["awb", "tracking", "bordereau", "lta"]),
        fabric: find(["fabric", "tissu", "matière", "matiere", "material", "textile", "gmt fabric", "bulk fabric"]),
        color: find(["color", "colour", "coloris", "couleur", "gmt color", "shade", "teinte"]),
        style: find(["style", "ref", "reference", "article"]),
        client: find(["client", "buyer", "brand", "marque"]),
        description: find(["description", "desc", "name", "nom", "fabric", "tissu", "mati\u00e8re"]),
        comments: find(["comment", "remarks", "note", "observation"]),
        poDate: find(["po date", "po_date", "date po", "date commande", "order date"]),
        artworkReceived: find(["artwork received", "artwork receipt", "artwork recu", "artwork re\u00e7u", "received artwork", "art received"]),
        artworkSubmission: find(["artwork submission", "artwork submit", "submission artwork", "art submission", "artwork envoy"]),
        artworkApproval: find(["artwork approval", "art approval", "artwork approved", "approval artwork", "approval", "approv", "approved", "validation"]),
    };
}

function timeAgo(dateVal) {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    if (isNaN(d)) return null;
    // Normaliser les deux dates à minuit pour comparer des jours calendaires
    d.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today - d) / 86400000);
    if (diffDays === 0) return "aujourd'hui";
    if (diffDays === 1) return "hier";
    if (diffDays < 7) return "il y a " + diffDays + " jour(s)";
    if (diffDays < 30) return "il y a " + Math.floor(diffDays / 7) + " semaine(s)";
    if (diffDays < 365) return "il y a " + Math.floor(diffDays / 30) + " mois";
    return "il y a " + Math.floor(diffDays / 365) + " an(s)";
}

function isApproved(val) {
    return String(val ?? "").toLowerCase() === "approved";
}
function isSent(val) {
    return !!(val && String(val).trim() !== "");
}

// ─── Auto-Refresh ─────────────────────────────────────────────
(function startAutoRefresh() {
    const WARN_AT = 5 * 60 * 1000; // show badge after 5 min
    setInterval(() => {
        const elapsed = Date.now() - (state._lastFetch || 0);
        if (elapsed >= WARN_AT) {
            // Show stale badge on refresh button
            const dot = document.getElementById("refresh-dot");
            if (dot) dot.style.display = "block";
        }
    }, 30 * 1000); // check every 30s
})();

// ─── Quick-Update (inline status change) ──────────────────────
async function quickUpdate(rowIndex, field, value, sheet) {
    const sheetRows = state.data[sheet];
    const row = sheetRows.find(r => r._rowIndex === rowIndex);
    if (!row) return;

    // Optimistic UI update
    row[field] = value;
    applyFilters();
    if (state.activeView === "sheet") renderTable();

    try {
        const data = { ...row };
        delete data._rowIndex;
        data[field] = value;
        await sendRequest("UPDATE", { data, rowIndex }, sheet);
        showToast("Mis à jour : " + field, "success", 2000);
    } catch (err) {
        // Rollback
        showToast("Erreur : " + err.message, "error");
        await fetchAllData();
    }
}

async function sendRequest(action, payload, sheetOverride = null) {
    if (GOOGLE_APPS_SCRIPT_URL === "YOUR_WEB_APP_URL_HERE") { await new Promise(r => setTimeout(r, 500)); return { status: "ok" }; }
    // Pour les feuilles custom, envoyer le vrai nom au lieu de la clé interne
    const rawKey = sheetOverride || state.activeSheet;
    const cfg = SHEET_CONFIG[rawKey];
    const sheet = (cfg && cfg.sheetName) ? cfg.sheetName : rawKey;
    const res = await fetch(GOOGLE_APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify({ action, sheet, ...payload }) });
    const json = await res.json();
    if (json.status !== "ok") throw new Error(json.message);
    return json;
}

function showToast(msg, type = "info", duration = 3500) {
    const toast = document.createElement("div"); toast.className = `toast ${type}`; toast.innerHTML = `<span class="toast-msg">${msg}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.style.animation = "toast-out 0.3s ease forwards"; setTimeout(() => toast.remove(), 300); }, duration);
}

function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function sanitizeId(s) { return s.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, ""); }

// ─── Style Details Modal ──────────────────────────────────────
const styleModalOverlay = document.getElementById("style-modal-overlay");
const styleModalTitle = document.getElementById("style-modal-title");
const styleModalBody = document.getElementById("style-modal-body");
let _currentStyleName = "";

function openStyleModal(styleName) {
    _currentStyleName = styleName;
    styleModalTitle.textContent = `Détails du Style : ${styleName}`;
    document.getElementById("style-modal-subtitle").textContent = "Couleurs & Articles";
    renderStyleModalBody();
    styleModalOverlay.classList.add("open");
}

function renderStyleModalBody() {
    const styleRows = state.data.style.filter(r => r.Style === _currentStyleName);
    let html = `<div class="style-section"><h4><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg> Couleurs & Articles</h4>
    <table class="style-detail-table"><thead><tr><th>GMT Color</th><th>Pantone</th><th>PO</th><th>Articles</th><th>Prepack Barcode</th><th style="width:80px;text-align:center;">Actions</th></tr></thead><tbody id="style-table-body">`;
    if (styleRows.length) {
        styleRows.forEach(r => { html += `<tr data-row="${r._rowIndex}" id="style-row-${r._rowIndex}"><td><span class="color-badge">${esc(r["GMT Color"]) || "—"}</span></td><td>${esc(r["Pantone"]) || "—"}</td><td>${esc(r["PO"]) || "—"}</td><td>${esc(r["Articles"]) || "—"}</td><td>${esc(r["Prepack Barcode"]) || "—"}</td><td style="text-align:center;"><button class="btn btn-edit btn-icon btn-xs" onclick="editStyleRow(${r._rowIndex})"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button></td></tr>`; });
    } else { html += `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:1.5rem;">Aucune couleur enregistrée.</td></tr>`; }
    html += `</tbody></table><div style="margin-top:1rem;"><button class="btn btn-primary btn-sm" onclick="showAddStyleRow()"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="13" height="13"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg> Ajouter une couleur</button></div>
    <div id="style-add-form" class="style-inline-form" style="display:none;margin-top:1rem;"><div class="style-form-grid"><div class="style-form-group"><label class="form-label">GMT Color</label><input class="form-input" id="sf-gmt" placeholder="ex: KHAKI"/></div><div class="style-form-group"><label class="form-label">Pantone</label><input class="form-input" id="sf-pantone" placeholder="ex: Smoky Olive"/></div><div class="style-form-group"><label class="form-label">PO</label><input class="form-input" id="sf-po" placeholder="ex: 1202363673"/></div><div class="style-form-group"><label class="form-label">Articles</label><input class="form-input" id="sf-articles" placeholder="ex: 10953373"/></div><div class="style-form-group"><label class="form-label">Prepack Barcode</label><input class="form-input" id="sf-prepack" placeholder="ex: 123456789"/></div></div><div class="style-form-actions"><button class="btn btn-ghost btn-sm" onclick="hideAddStyleRow()">Annuler</button><button class="btn btn-primary btn-sm" onclick="saveNewStyleRow()">Enregistrer</button></div></div></div>`;
    styleModalBody.innerHTML = html;
}

function showAddStyleRow() { document.getElementById("style-add-form").style.display = "block"; document.getElementById("sf-gmt").focus(); }
function hideAddStyleRow() { document.getElementById("style-add-form").style.display = "none";["sf-gmt", "sf-pantone", "sf-po", "sf-articles", "sf-prepack"].forEach(id => document.getElementById(id).value = ""); }
async function saveNewStyleRow() { const g = document.getElementById("sf-gmt").value.trim(); if (!g) { showToast("GMT Color requis", "error"); return; } const btn = document.querySelector("#style-add-form .btn-primary"); btn.disabled = true; btn.textContent = "Enregistrement…"; try { await sendRequest("CREATE", { data: { Style: _currentStyleName, "GMT Color": g, Pantone: document.getElementById("sf-pantone").value.trim(), PO: document.getElementById("sf-po").value.trim(), Articles: document.getElementById("sf-articles").value.trim(), "Prepack Barcode": document.getElementById("sf-prepack").value.trim() } }, "style"); showToast("Couleur ajoutée", "success"); await fetchAllData(); renderStyleModalBody(); } catch (err) { showToast("Erreur : " + err.message, "error"); btn.disabled = false; btn.textContent = "Enregistrer"; } }
function editStyleRow(idx) { const row = state.data.style.find(r => r._rowIndex === idx); if (!row) return; const tr = document.getElementById(`style-row-${idx}`); if (!tr) return; tr.innerHTML = `<td><input class="form-input form-input-sm" id="edit-gmt-${idx}" value="${esc(row["GMT Color"] || "")}"/></td><td><input class="form-input form-input-sm" id="edit-pantone-${idx}" value="${esc(row["Pantone"] || "")}"/></td><td><input class="form-input form-input-sm" id="edit-po-${idx}" value="${esc(row["PO"] || "")}"/></td><td><input class="form-input form-input-sm" id="edit-articles-${idx}" value="${esc(row["Articles"] || "")}"/></td><td><input class="form-input form-input-sm" id="edit-prepack-${idx}" value="${esc(row["Prepack Barcode"] || "")}"/></td><td style="text-align:center;white-space:nowrap;"><button class="btn btn-primary btn-icon btn-xs" onclick="saveStyleRow(${idx})"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg></button><button class="btn btn-ghost btn-icon btn-xs" onclick="renderStyleModalBody()" style="margin-left:4px;"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></td>`; document.getElementById(`edit-gmt-${idx}`).focus(); }
async function saveStyleRow(idx) { const g = document.getElementById(`edit-gmt-${idx}`).value.trim(); if (!g) { showToast("GMT Color requis", "error"); return; } try { await sendRequest("UPDATE", { data: { Style: _currentStyleName, "GMT Color": g, Pantone: document.getElementById(`edit-pantone-${idx}`).value.trim(), PO: document.getElementById(`edit-po-${idx}`).value.trim(), Articles: document.getElementById(`edit-articles-${idx}`).value.trim(), "Prepack Barcode": document.getElementById(`edit-prepack-${idx}`).value.trim() }, rowIndex: idx }, "style"); const i = state.data.style.findIndex(r => r._rowIndex === idx); if (i !== -1) Object.assign(state.data.style[i], { "GMT Color": g, Pantone: document.getElementById(`edit-pantone-${idx}`).value.trim(), PO: document.getElementById(`edit-po-${idx}`).value.trim(), Articles: document.getElementById(`edit-articles-${idx}`).value.trim(), "Prepack Barcode": document.getElementById(`edit-prepack-${idx}`).value.trim() }); showToast("Ligne mise à jour", "success"); renderStyleModalBody(); } catch (err) { showToast("Erreur : " + err.message, "error"); } }
function closeStyleModal() { styleModalOverlay.classList.remove("open"); _currentStyleName = ""; }

// ─── Export Excel ─────────────────────────────────────────────

// Utilitaire : retourne XLSX dès qu'il est disponible (attente max 8s)
function _waitForXLSX(callback) {
    if (typeof XLSX !== "undefined") { callback(XLSX); return; }
    let tries = 0;
    const interval = setInterval(() => {
        if (typeof XLSX !== "undefined") {
            clearInterval(interval);
            callback(XLSX);
        } else if (++tries > 40) { // 40 × 200ms = 8s
            clearInterval(interval);
            callback(null);
        }
    }, 200);
}

function exportExcel() {
    _waitForXLSX(function (XL) {
        if (!XL) { showToast("Bibliothèque Excel non chargée — vérifiez votre connexion", "error"); return; }
        const cfg = SHEET_CONFIG[state.activeSheet];
        const rows = state.filteredData.length ? state.filteredData : state.data[state.activeSheet];
        if (!rows.length) { showToast("Aucune donnée à exporter", "info"); return; }
        const headers = cfg.cols.map(c => c.label);
        const data = rows.map(row => {
            const obj = {};
            cfg.cols.forEach(c => {
                let v = row[c.key] ?? "";
                if (c.type === "date" && v) try { v = new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }); } catch (e) { }
                if (c.key === "Size" && typeof v === "string" && v.startsWith("'")) v = v.substring(1);
                obj[c.label] = String(v);
            });
            return obj;
        });
        const ws = XL.utils.json_to_sheet(data, { header: headers });
        const wb = XL.utils.book_new();
        XL.utils.book_append_sheet(wb, ws, cfg.label);
        XL.writeFile(wb, `AW27_${cfg.label}_${new Date().toISOString().slice(0, 10)}.xlsx`);
        showToast(`Export — ${cfg.label} (${rows.length} lignes)`, "success");
    });
}

// ═══════════════════════════════════════════════════════════════
// ─── GLOBAL NOTIFICATION SYSTEM ───────────────────────────────
// ═══════════════════════════════════════════════════════════════
/*
 * LOGIQUE MÉTIER — règles strictement mutuellement exclusives
 *
 * SAMPLE (PSS) — cycle de vie d'une sample :
 *   PSD/Ready Date arrive → on attend la réception du PSS dans les 2j
 *   Les états s'enchaînent et ne se cumulent JAMAIS :
 *
 *   État A : Ready Date dépassée ET pas encore reçu (Received Date vide)
 *            ET pas encore envoyé (Sending Date vide) ET pas Approved
 *            → "PSS non reçu — Ready Date dépassée de Xj · Relancer la factory"
 *            (dès que Received Date est renseigné, cette alerte disparaît)
 *
 *   État B : Ready Date = aujourd'hui, mêmes conditions qu'état A
 *            → "PSS attendu aujourd'hui · Prévoir la réception"
 *
 *   État C : Received Date renseigné + Sending Date vide + pas Approved
 *            → "PSS reçu — à envoyer au client · Organiser l'envoi"
 *            (dès que Sending Date est renseigné, cette alerte disparaît)
 *
 *   État D : Sending Date renseigné + pas Approved
 *            → "PSS envoyé — approbation en attente depuis Xj"
 *            (urgence progressive : >7j relancer, >14j urgent)
 *            (dès que Approval = Approved, cette alerte disparaît)
 *
 * ORDERING :
 *   - Ready Date dépassée + pas Delivered/Cancelled → Livraison en retard
 *   - Ready Date dans ≤14j + pas Delivered          → À risque
 *   - Pas de PO + pas Cancelled                     → PO manquant
 *
 * CUSTOM : même logique que Sample si colonnes détectées + dates dépassées
 */

function _fmtDate(val) {
    if (!val) return "—";
    try { return new Date(val).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }); }
    catch (e) { return String(val); }
}
function _daysDiff(dateVal) {
    // Retourne un entier : positif = dans le futur, négatif = passé
    const d = new Date(dateVal); d.setHours(0, 0, 0, 0);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((d - t) / 86400000);
}

// ── Icones SVG Professionnelles ────────────────────────────────
const ICONS = {
    clipboard: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>`,
    alert: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
    clock: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    package: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`,
    mail: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`,
    beaker: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>`
};

function collectAllAlerts() {
    const all = {};

    // ─── ORDERING ────────────────────────────────────────────
    const ordRows = state.data.ordering || [];
    const ordItems = [];

    ordRows.filter(r => r.Status !== "Cancelled").forEach(r => {
        const hasReadyDate = !!(r["Ready Date"] && String(r["Ready Date"]).trim());
        const rdDiff = hasReadyDate ? _daysDiff(r["Ready Date"]) : null;
        const isShipped = ["Shipped", "In Transit", "Delivered"].includes(r["Delivery Status"]);
        const poLabel = r.PO ? `PO ${r.PO}` : "PO manquant";
        const styleMeta = `${r.Style || "—"}${r.Color ? " · " + r.Color : ""}${r.Trims ? " · " + r.Trims : ""}`;
        const supplierMeta = r.Supplier ? ` · ${r.Supplier}` : "";
        const poMeta = r.PO ? ` · PO : ${r.PO}` : " · ⚠ PO manquant";

        if (!hasReadyDate) {
            ordItems.push({
                dotCls: "dot-nopo", tagCls: "tag-nopo",
                tagLabel: `${ICONS.clipboard} ${poLabel} — Ready Date manquante`,
                title: `${styleMeta} — Ready Date non renseignée`,
                action: `Relancer le supplier pour obtenir la Ready Date${supplierMeta}`,
                style: r.Style || "—", client: r.Client || "",
                meta: `${poLabel} · Statut : ${r.Status || "—"}${supplierMeta}`,
                urgency: "mid", sheet: "ordering", rowIndex: r._rowIndex
            });
            return;
        }

        if (rdDiff < 0 && !isShipped) {
            const days = Math.abs(rdDiff);
            const urgency = days >= 14 ? "high" : "mid";
            ordItems.push({
                dotCls: "dot-late", tagCls: "tag-late",
                tagLabel: `${ICONS.alert} ${poLabel} — Ready Date dépassée ${days}j`,
                title: `${styleMeta} — Ready Date dépassée de ${days}j, non expédié`,
                action: `Relancer le supplier : confirmer si prêt ou délai prévu${supplierMeta}`,
                style: r.Style || "—", client: r.Client || "",
                meta: `Ready Date : ${_fmtDate(r["Ready Date"])}${poMeta}${supplierMeta} · Statut : ${r["Delivery Status"] || "—"}`,
                urgency, sheet: "ordering", rowIndex: r._rowIndex
            });
            return;
        }

        if (rdDiff >= 0 && !isShipped) {
            const urgency = rdDiff <= 7 ? "mid" : "low";
            const icon = rdDiff === 0 ? ICONS.alert : rdDiff <= 7 ? ICONS.clock : ICONS.clock;
            const daysTxt = rdDiff === 0 ? "aujourd'hui" : `dans ${rdDiff}j`;
            ordItems.push({
                dotCls: rdDiff === 0 ? "dot-today" : "dot-risk",
                tagCls: rdDiff === 0 ? "tag-today" : "tag-risk",
                tagLabel: `${icon} ${poLabel} — prêt ${daysTxt}`,
                title: `${styleMeta} — prêt ${daysTxt}`,
                action: rdDiff === 0
                    ? `Prévoir l'expédition aujourd'hui${supplierMeta}`
                    : rdDiff <= 7
                        ? `Confirmer l'expédition imminente avec le supplier${supplierMeta}`
                        : `Surveiller l'avancement — Ready Date le ${_fmtDate(r["Ready Date"])}`,
                style: r.Style || "—", client: r.Client || "",
                meta: `Ready Date : ${_fmtDate(r["Ready Date"])}${poMeta}${supplierMeta}`,
                urgency, sheet: "ordering", rowIndex: r._rowIndex
            });
        }
    });

    if (ordItems.length) all["ordering"] = { label: "Ordering", items: ordItems };

    // ─── SAMPLE (PSS) ─────────────────────────────────────────
    const samRows = state.data.sample || [];
    const samItems = [];

    samRows.forEach(r => {
        const hasReceived = !!(r["Received Date"] && String(r["Received Date"]).trim());
        const hasSending = !!(r["Sending Date"] && String(r["Sending Date"]).trim());
        const hasAwb = !!(r["AWB"] && String(r["AWB"]).trim());
        const isApproved = r.Approval === "Approved";
        const isRejected = r.Approval === "Rejected";
        const hasReadyDate = !!(r["Ready Date"] && String(r["Ready Date"]).trim());

        if (isApproved || isRejected) return;

        if (hasSending) {
            const days = Math.abs(_daysDiff(r["Sending Date"]));
            const urgency = days >= 14 ? "high" : days >= 7 ? "mid" : "low";
            const awbPart = hasAwb ? ` under AWB ${r["AWB"]}` : "";
            samItems.push({
                dotCls: "dot-approve", tagCls: "tag-approve",
                tagLabel: `${ICONS.clock} Envoyé au client — approval en attente ${days}j`,
                title: `Sample envoyée au client${awbPart} — approval en attente depuis ${days}j`,
                action: urgency === "high"
                    ? `Envoyé il y a ${days}j — relancer le client de toute urgence`
                    : urgency === "mid"
                        ? `Envoyé il y a ${days}j — envoyer un rappel au client`
                        : `Envoyé il y a ${days}j — attendre ou envoyer un suivi`,
                style: r.Style || "—", client: r.Client || "",
                meta: `Envoyé le : ${_fmtDate(r["Sending Date"])}${hasAwb ? " · AWB : " + r["AWB"] : ""}${r.Type ? " · " + r.Type : ""}`,
                urgency, sheet: "sample", rowIndex: r._rowIndex
            });
            return;
        }

        if (hasReceived) {
            const days = Math.abs(_daysDiff(r["Received Date"]));
            const daysLabel = days === 0 ? "reçue aujourd'hui" : days === 1 ? "reçue hier" : `reçue il y a ${days}j`;
            samItems.push({
                dotCls: "dot-send", tagCls: "tag-send",
                tagLabel: `${ICONS.package} À envoyer (${daysLabel})`,
                title: "Sample reçue — à envoyer au client",
                action: `Sample ${daysLabel} — organiser l'envoi et renseigner la Sending Date`,
                style: r.Style || "—", client: r.Client || "",
                meta: `Reçue le : ${_fmtDate(r["Received Date"])}${r.Type ? " · " + r.Type : ""}${r.Size ? " · Taille " + r.Size : ""}`,
                urgency: days >= 3 ? "mid" : "low", sheet: "sample", rowIndex: r._rowIndex
            });
            return;
        }

        if (!hasReadyDate) return;
        const diff = _daysDiff(r["Ready Date"]);
        if (diff < 0) {
            const days = Math.abs(diff);
            samItems.push({
                dotCls: "dot-late", tagCls: "tag-late",
                tagLabel: `${ICONS.alert} Sample non reçue — ${days}j de retard`,
                title: `Sample non reçue — Ready Date dépassée de ${days} jour${days > 1 ? "s" : ""}`,
                action: "Relancer la factory pour confirmer l'avancement de la sample",
                style: r.Style || "—", client: r.Client || "",
                meta: `Ready Date : ${_fmtDate(r["Ready Date"])}${r.Type ? " · " + r.Type : ""}${r.Fabric ? " · " + r.Fabric : ""}`,
                urgency: "high", sheet: "sample", rowIndex: r._rowIndex
            });
        } else if (diff === 0) {
            samItems.push({
                dotCls: "dot-today", tagCls: "tag-today",
                tagLabel: `${ICONS.clock} Sample attendue aujourd'hui`,
                title: "Sample attendue aujourd'hui — prévoir la réception",
                action: "Confirmer la réception dès réception de la sample",
                style: r.Style || "—", client: r.Client || "",
                meta: `Ready Date : ${_fmtDate(r["Ready Date"])}${r.Type ? " · " + r.Type : ""}${r.Fabric ? " · " + r.Fabric : ""}`,
                urgency: "low", sheet: "sample", rowIndex: r._rowIndex
            });
        }
    });

    if (samItems.length) all["sample"] = { label: "Sample", items: samItems };

    // ─── CARE LABEL ARTWORK ───────────────────────────────────
    // Parcourt tous les menus custom identifiés comme Care Label
    // et génère 3 alertes séquentielles mutuellement exclusives :
    //   A : PO Date renseignée + Artwork Received vide → relancer supplier
    //   B : Artwork Received renseignée + Artwork Submission vide → soumettre au client
    //   C : Artwork Submission renseignée + Artwork Approval vide → relancer pour approval
    Object.keys(SHEET_CONFIG).filter(k => SHEET_CONFIG[k].custom).forEach(key => {
        const cfg = SHEET_CONFIG[key];
        const det = detectCustomCols(cfg.cols, cfg.label);
        if (!det.isCareLabel) return;

        const rows = state.data[key] || [];
        const clItems = [];

        const getStyle  = r => det.style  ? (r[det.style]  || "—") : "—";
        const getClient = r => det.client ? (r[det.client] || "")  : "";

        rows.forEach(r => {
            const hasPoDate          = det.poDate          && !!(r[det.poDate]          && String(r[det.poDate]).trim());
            const hasArtworkReceived = det.artworkReceived && !!(r[det.artworkReceived] && String(r[det.artworkReceived]).trim());
            const hasArtworkSub      = det.artworkSubmission && !!(r[det.artworkSubmission] && String(r[det.artworkSubmission]).trim());
            const hasArtworkApproval = det.artworkApproval && !!(r[det.artworkApproval] && String(r[det.artworkApproval]).trim());

            // Approval complété → aucune alerte pour cette ligne
            if (hasArtworkApproval) return;

            const styleMeta  = getStyle(r);
            const clientMeta = getClient(r);

            // ── État C : Artwork Submission renseignée + Approval vide ──
            if (hasArtworkSub && !hasArtworkApproval) {
                const days = Math.abs(_daysDiff(r[det.artworkSubmission]));
                const urgency = days >= 14 ? "high" : days >= 7 ? "mid" : "low";
                const urgBadge = urgency === "high" ? " 🚨" : urgency === "mid" ? " ⚡" : "";
                clItems.push({
                    dotCls: "dot-approve", tagCls: "tag-approve",
                    tagLabel: `${ICONS.clock} Artwork soumis — approval en attente ${days}j${urgBadge}`,
                    title: `${styleMeta} — Artwork soumis · approval en attente depuis ${days}j`,
                    action: urgency === "high"
                        ? `Soumis il y a ${days}j — relancer le client de toute urgence pour l’approval artwork`
                        : urgency === "mid"
                            ? `Soumis il y a ${days}j — envoyer un rappel au client pour l’approval artwork`
                            : `Soumis il y a ${days}j — suivre l’approval artwork`,
                    style: styleMeta, client: clientMeta,
                    meta: `Artwork Submission : ${_fmtDate(r[det.artworkSubmission])}${hasArtworkReceived ? " · Reçu le : " + _fmtDate(r[det.artworkReceived]) : ""}`,
                    urgency, sheet: key, rowIndex: r._rowIndex
                });
                return;
            }

            // ── État B : Artwork Received renseignée + Submission vide ──
            if (hasArtworkReceived && !hasArtworkSub) {
                const days = Math.abs(_daysDiff(r[det.artworkReceived]));
                const urgency = days >= 7 ? "mid" : "low";
                const urgBadge = urgency === "mid" ? " ⚡" : "";
                clItems.push({
                    dotCls: "dot-send", tagCls: "tag-send",
                    tagLabel: `${ICONS.mail} Artwork reçu — à soumettre au client (${days}j)${urgBadge}`,
                    title: `${styleMeta} — Artwork reçu il y a ${days}j · soumission client en attente`,
                    action: `Artwork reçu il y a ${days}j — soumettre au client pour approval et renseigner Artwork Submission`,
                    style: styleMeta, client: clientMeta,
                    meta: `Artwork Reçu le : ${_fmtDate(r[det.artworkReceived])}${hasPoDate ? " · PO Date : " + _fmtDate(r[det.poDate]) : ""}`,
                    urgency, sheet: key, rowIndex: r._rowIndex
                });
                return;
            }

            // ── État A : PO Date renseignée + Artwork Received vide ──
            if (hasPoDate && !hasArtworkReceived) {
                const days = Math.abs(_daysDiff(r[det.poDate]));
                const urgency = days >= 14 ? "high" : days >= 7 ? "mid" : "low";
                const urgBadge = urgency === "high" ? " 🚨" : urgency === "mid" ? " ⚡" : "";
                clItems.push({
                    dotCls: days >= 14 ? "dot-late" : "dot-risk",
                    tagCls: days >= 14 ? "tag-late" : "tag-risk",
                    tagLabel: `${ICONS.alert} Artwork non reçu — ${days}j depuis PO${urgBadge}`,
                    title: `${styleMeta} — PO passée · artwork non reçu du supplier depuis ${days}j`,
                    action: `PO datée du ${_fmtDate(r[det.poDate])} — relancer le supplier pour obtenir l’artwork`,
                    style: styleMeta, client: clientMeta,
                    meta: `PO Date : ${_fmtDate(r[det.poDate])} · ${days}j sans artwork reçu`,
                    urgency, sheet: key, rowIndex: r._rowIndex
                });
            }
        });

        if (clItems.length) {
            const existingKey = all[key];
            if (existingKey) {
                existingKey.items.push(...clItems);
            } else {
                all[key] = { label: cfg.label, items: clItems };
            }
        }
    });


    // ─── CUSTOM MENUS ─────────────────────────────────────────
    const _trimsDevoKeepAlerted = new Set();

    Object.keys(SHEET_CONFIG).filter(k => SHEET_CONFIG[k].custom).forEach(key => {
        const cfg = SHEET_CONFIG[key];
        const rows = state.data[key] || [];
        const det = detectCustomCols(cfg.cols, cfg.label);
        const items = [];

        const getStyle = r => det.style ? (r[det.style] || "—") : "—";
        const getClient = r => det.client ? (r[det.client] || "") : "";
        const getFsr = r => det.fsrNumber && r[det.fsrNumber] && !det.isFabricAnalysis ? ` \u00B7 FSR ${r[det.fsrNumber]}` : "";

        const menuLabelLower = cfg.label.toLowerCase();
        // Care Label → traité par son bloc dédié, skip ici
        if (det.isCareLabel) return;
        const isBulk = menuLabelLower.includes("bulk") || menuLabelLower.includes("shade");
        const isTrimsDevo = det.isTrimsDevo;
        const isFabricDevo = det.isFabricDevo;

        const fabricGroups = {};

        rows.forEach(r => {
            const hasReceived = det.receivedDate && !!(r[det.receivedDate] && String(r[det.receivedDate]).trim());
            const hasSending = det.sendingDate && !!(r[det.sendingDate] && String(r[det.sendingDate]).trim());
            const hasReadyDate = det.readyDate && !!(r[det.readyDate] && String(r[det.readyDate]).trim());
            const approved = det.approval && isApproved(r[det.approval]);
            const isRejected = det.approval && String(r[det.approval] ?? "").trim().toLowerCase() === "rejected";
            const hasNlSub = det.nlSubmission && !!(r[det.nlSubmission] && String(r[det.nlSubmission]).trim());
            const hasKeepSample = det.keepSample && !!(r[det.keepSample] && String(r[det.keepSample]).trim());
            const hasFsr = det.fsrDate && !!(r[det.fsrDate] && String(r[det.fsrDate]).trim());

            if (approved || isRejected) return;

            if (isBulk) {
                const fabricVal = det.fabric && r[det.fabric] ? String(r[det.fabric]).trim() : "Default Fabric";
                if (!fabricGroups[fabricVal]) fabricGroups[fabricVal] = { rows: [] };
                fabricGroups[fabricVal].rows.push(r);
                return;
            }

            if (isTrimsDevo) {
                const colorVal = det.color && r[det.color] ? String(r[det.color]).trim() : "";
                const trimsVal = cfg.cols.find(c => c.label.toLowerCase() === "trims");
                const trimsStr = trimsVal && r[trimsVal.key] ? String(r[trimsVal.key]).trim() : "";
                const trimColor = [trimsStr, colorVal].filter(Boolean).join(" · ");
                const descVal = det.description && r[det.description] ? String(r[det.description]).trim() : "";
                const displayName = [descVal, colorVal, trimsStr].filter(Boolean).join(" · ") || getStyle(r);

                if (hasNlSub && !isRejected) {
                    const nlDays = Math.abs(_daysDiff(r[det.nlSubmission]));
                    const urgency = nlDays >= 14 ? "high" : nlDays >= 7 ? "mid" : "low";
                    const urgBadge = urgency === "high" ? " 🚨" : urgency === "mid" ? " ⚡" : "";
                    const awbVal = det.awb && r[det.awb] ? String(r[det.awb]).trim() : "";
                    const awbPart = awbVal ? ` (AWB ${awbVal})` : "";

                    items.push({
                        dotCls: "dot-approve", tagCls: "tag-approve",
                        tagLabel: `${ICONS.clock} ${trimColor} — approval en attente ${nlDays}j${awbVal ? " · AWB " + awbVal : ""}${urgBadge}`,
                        title: `${displayName} — envoyé à NL${awbPart}, approval en attente depuis ${nlDays}j`,
                        action: urgency === "high"
                            ? `Envoyé il y a ${nlDays}j — relancer de toute urgence`
                            : urgency === "mid"
                                ? `Envoyé il y a ${nlDays}j — envoyer un rappel`
                                : `Envoyé il y a ${nlDays}j — suivre l'approval`,
                        style: getStyle(r), client: getClient(r),
                        meta: `NL Submission : ${_fmtDate(r[det.nlSubmission])}${awbVal ? " · AWB : " + awbVal : ""}${hasReadyDate ? " · Ready Date : " + _fmtDate(r[det.readyDate]) : ""}`,
                        urgency, sheet: key, rowIndex: r._rowIndex
                    });
                    return;
                }

                // ── Alerte 2 : Ligne rejetée → Keep Sample non reçu ──────────
                if (isRejected && !hasKeepSample) {
                    const groupKey = `${descVal}__${colorVal}__${trimsStr}`;
                    if (!_trimsDevoKeepAlerted.has(groupKey)) {
                        _trimsDevoKeepAlerted.add(groupKey);
                        const rejDate = det.readyDate && r[det.readyDate] ? ` — Ready Date : ${_fmtDate(r[det.readyDate])}` : "";
                        items.push({
                            dotCls: "dot-late", tagCls: "tag-late",
                            tagLabel: `🔴 ${trimColor} — Keep Sample non reçu`,
                            title: `${displayName} — sample rejeté, keep sample non réceptionné`,
                            action: `Confirmer la réception du keep sample de ce trims rejeté`,
                            style: getStyle(r), client: getClient(r),
                            meta: `Statut : Rejected${rejDate}${det.nlSubmission && r[det.nlSubmission] ? " · NL Sub : " + _fmtDate(r[det.nlSubmission]) : ""}`,
                            urgency: "high", sheet: key, rowIndex: r._rowIndex
                        });
                    }
                    return;
                }

                // ── Alerte 3 : Pas de Ready Date → demander au supplier ──────
                if (!hasNlSub && !isRejected && !hasReadyDate) {
                    items.push({
                        dotCls: "dot-nopo", tagCls: "tag-nopo",
                        tagLabel: `📋 ${trimColor} — Ready Date manquante`,
                        title: `${trimsStr || "Trims"}${colorVal ? " · " + colorVal : ""} — Ready Date non renseignée`,
                        action: `Demander la Ready Date au supplier pour ${trimsStr || "ce trims"}${colorVal ? " (" + colorVal + ")" : ""}`,
                        style: getStyle(r), client: getClient(r),
                        meta: `${trimsStr ? trimsStr : ""}${colorVal ? " · Color : " + colorVal : ""}${descVal ? " · " + descVal : ""}`.trim(),
                        urgency: "mid", sheet: key, rowIndex: r._rowIndex
                    });
                    return;
                }
            }
            // ── FIN logique Trims Devo ────────────────────────────────

            // ── FABRIC DEVO — 4 étapes séquentielles ─────────────
            if (det.isFabricDevo) {
                const styleVal = getStyle(r);
                const colorVal = det.color && r[det.color] ? String(r[det.color]).trim() : "";
                const fsrDateVal = det.fsrDate && r[det.fsrDate] ? String(r[det.fsrDate]).trim() : "";
                const prefix = [styleVal !== "—" ? styleVal : "", colorVal].filter(Boolean).join(" · ");

                if (approved || isRejected) return;

                // Étape 4 : Sending Date rempli → en attente approval
                if (hasSending) {
                    const days = Math.abs(_daysDiff(r[det.sendingDate]));
                    const urgency = days >= 14 ? "high" : days >= 7 ? "mid" : "low";
                    const urgBadge = urgency === "high" ? " 🚨" : urgency === "mid" ? " ⚡" : "";
                    items.push({
                        dotCls: "dot-approve", tagCls: "tag-approve",
                        tagLabel: `⏳ Approval en attente — ${days}j${urgBadge}`,
                        title: `${prefix} — Envoyé · approval en attente depuis ${days}j`,
                        action: urgency === "high" ? "Relancer de toute urgence" : urgency === "mid" ? "Envoyer un rappel" : "Suivre l'approval",
                        style: styleVal, client: getClient(r),
                        meta: `Envoyé le : ${_fmtDate(r[det.sendingDate])}${fsrDateVal ? " · FSR Date : " + _fmtDate(fsrDateVal) : ""}`,
                        urgency, sheet: key, rowIndex: r._rowIndex
                    });
                    return;
                }

                // Étape 3 : Received Date rempli + pas de Sending Date → à envoyer
                if (hasReceived && !hasSending) {
                    const days = Math.abs(_daysDiff(r[det.receivedDate]));
                    const urgency = days >= 5 ? "mid" : "low";
                    items.push({
                        dotCls: "dot-send", tagCls: "tag-send",
                        tagLabel: `📦 À envoyer au client`,
                        title: `${prefix} — Reçu · à envoyer au client`,
                        action: `Reçu il y a ${days}j — organiser l'envoi et renseigner la Sending Date`,
                        style: styleVal, client: getClient(r),
                        meta: `Reçu le : ${_fmtDate(r[det.receivedDate])}${fsrDateVal ? " · FSR Date : " + _fmtDate(fsrDateVal) : ""}`,
                        urgency, sheet: key, rowIndex: r._rowIndex
                    });
                    return;
                }

                // Étape 2 : Ready Date rempli + pas de Received Date → attendre réception
                if (hasReadyDate && !hasReceived) {
                    const diff = _daysDiff(r[det.readyDate]);
                    const absDiff = Math.abs(diff);
                    if (diff < 0) {
                        items.push({
                            dotCls: "dot-late", tagCls: "tag-late",
                            tagLabel: `🔴 Réception en retard — ${absDiff}j`,
                            title: `${prefix} — Ready Date dépassée de ${absDiff}j · non reçu`,
                            action: `Relancer la factory — réception attendue il y a ${absDiff}j`,
                            style: styleVal, client: getClient(r),
                            meta: `Ready Date : ${_fmtDate(r[det.readyDate])}${fsrDateVal ? " · FSR Date : " + _fmtDate(fsrDateVal) : ""}`,
                            urgency: "high", sheet: key, rowIndex: r._rowIndex
                        });
                    } else if (diff === 0) {
                        items.push({
                            dotCls: "dot-today", tagCls: "tag-today",
                            tagLabel: `🟡 Réception attendue aujourd'hui`,
                            title: `${prefix} — Ready Date aujourd'hui · prévoir la réception`,
                            action: `Confirmer la réception dès arrivée`,
                            style: styleVal, client: getClient(r),
                            meta: `Ready Date : ${_fmtDate(r[det.readyDate])}${fsrDateVal ? " · FSR Date : " + _fmtDate(fsrDateVal) : ""}`,
                            urgency: "low", sheet: key, rowIndex: r._rowIndex
                        });
                    } else {
                        items.push({
                            dotCls: "dot-risk", tagCls: "tag-risk",
                            tagLabel: `🕐 Réception dans ${diff}j`,
                            title: `${prefix} — En attente de réception · prêt dans ${diff}j`,
                            action: `Prévoir la réception le ${_fmtDate(r[det.readyDate])}`,
                            style: styleVal, client: getClient(r),
                            meta: `Ready Date : ${_fmtDate(r[det.readyDate])}${fsrDateVal ? " · FSR Date : " + _fmtDate(fsrDateVal) : ""}`,
                            urgency: "low", sheet: key, rowIndex: r._rowIndex
                        });
                    }
                    return;
                }

                // Étape 1 : FSR Date rempli + pas de Ready Date → demander la Ready Date
                if (hasFsr && !hasReadyDate) {
                    const fsrDays = Math.abs(_daysDiff(r[det.fsrDate]));
                    const urgency = fsrDays >= 14 ? "high" : fsrDays >= 7 ? "mid" : "low";
                    const urgBadge = urgency === "high" ? " 🚨" : urgency === "mid" ? " ⚡" : "";
                    items.push({
                        dotCls: "dot-nopo", tagCls: "tag-nopo",
                        tagLabel: `📧 Demander la Ready Date${urgBadge}`,
                        title: `${prefix} — FSR lancé · Ready Date non renseignée`,
                        action: `Contacter le supplier pour obtenir la Ready Date (FSR lancé il y a ${fsrDays}j)`,
                        style: styleVal, client: getClient(r),
                        meta: `FSR Date : ${_fmtDate(r[det.fsrDate])}`,
                        urgency, sheet: key, rowIndex: r._rowIndex
                    });
                    return;
                }
                return;
            }

            // ── FABRIC ANALYSIS ──────────────────────────────────
            if (det.isFabricAnalysis) {
                const efaVal     = det.efaRef && r[det.efaRef] ? String(r[det.efaRef]).trim() : (getStyle(r) !== "—" ? getStyle(r) : "Test");
                const colorVal   = det.color && r[det.color] ? String(r[det.color]).trim() : null;
                const fsrVal     = det.fsrNumber && r[det.fsrNumber] ? String(r[det.fsrNumber]).trim() : null;
                const resultVal   = det.resultField && r[det.resultField] ? String(r[det.resultField]).trim() : "";
                const resultDtVal = det.resultDate  && r[det.resultDate]  ? String(r[det.resultDate]).trim()  : "";
                const readyDtVal  = det.readyDate   && r[det.readyDate]   ? String(r[det.readyDate]).trim()   : "";

                if (resultVal) return;

                if (readyDtVal) {
                    const today  = new Date(); today.setHours(0, 0, 0, 0);
                    const rdDate = new Date(readyDtVal); rdDate.setHours(0, 0, 0, 0);
                    if (resultDtVal) {
                        const resDt = new Date(resultDtVal); resDt.setHours(0, 0, 0, 0);
                        if (resDt.getTime() === rdDate.getTime()) {
                            items.push({
                                dotCls: "dot-today", tagCls: "tag-today",
                                tagLabel: `🟡 Résultat reçu — à saisir dans RESULT`,
                                title: `${efaVal}${colorVal ? " · " + colorVal : ""} — Résultat reçu, merci de le saisir`,
                                action: `Saisir le résultat (Pass / Fail) dans le champ RESULT`,
                                style: getStyle(r), client: getClient(r),
                                meta: `Result Date : ${_fmtDate(resultDtVal)} · Ready Date : ${_fmtDate(readyDtVal)}`,
                                urgency: "mid", sheet: key, rowIndex: r._rowIndex
                            });
                            return;
                        }
                    }
                    if (!resultDtVal && rdDate.getTime() === today.getTime()) {
                        items.push({
                            dotCls: "dot-today", tagCls: "tag-today",
                            tagLabel: `🟡 Résultat attendu aujourd'hui`,
                            title: `${efaVal}${colorVal ? " · " + colorVal : ""} — Résultat du labo attendu aujourd'hui`,
                            action: `Contacter le laboratoire`,
                            style: getStyle(r), client: getClient(r),
                            meta: `Ready Date : ${_fmtDate(readyDtVal)}${fsrVal ? " · FSR : " + fsrVal : ""}`,
                            urgency: "mid", sheet: key, rowIndex: r._rowIndex
                        });
                        return;
                    }
                    if (!resultDtVal && rdDate < today) {
                        const days = Math.round((today - rdDate) / 86400000);
                        items.push({
                            dotCls: "dot-late", tagCls: "tag-late",
                            tagLabel: `🔴 Résultat en retard — ${days}j`,
                            title: `${efaVal}${colorVal ? " · " + colorVal : ""} — Analyse en retard de ${days}j`,
                            action: `Contacter le laboratoire — Ready Date dépassée de ${days}j`,
                            style: getStyle(r), client: getClient(r),
                            meta: `Ready Date : ${_fmtDate(readyDtVal)}${fsrVal ? " · FSR : " + fsrVal : ""}`,
                            urgency: days >= 5 ? "high" : "mid", sheet: key, rowIndex: r._rowIndex
                        });
                        return;
                    }
                    return;
                }
                if (!readyDtVal && !hasReceived && !hasSending) {
                    const launchDateVal = det.launchDate && r[det.launchDate] && String(r[det.launchDate]).trim() ? r[det.launchDate] : null;
                    const dateRef = launchDateVal || (hasFsr ? r[det.fsrDate] : null);
                    if (dateRef) {
                        const launchDays = Math.abs(_daysDiff(dateRef));
                        const urgency = launchDays >= 14 ? "high" : launchDays >= 7 ? "mid" : "low";
                        const urgencyBadge = urgency === "high" ? " 🚨" : urgency === "mid" ? " ⚡" : "";
                        items.push({
                            dotCls: "dot-nopo", tagCls: "tag-nopo",
                            tagLabel: `🧪 ${efaVal}${colorVal ? " — " + colorVal : ""} — résultat attendu (${launchDays}j)${urgencyBadge}`,
                            title: `${efaVal}${colorVal ? " " + colorVal : ""} — en attente du résultat — lancé il y a ${launchDays}j`,
                            action: `Renseigner la Ready Date dès réception du labo`,
                            style: getStyle(r), client: getClient(r),
                            meta: `EFA : ${efaVal}${colorVal ? " · " + colorVal : ""} · Lancé le : ${_fmtDate(dateRef)}`,
                            urgency, sheet: key, rowIndex: r._rowIndex
                        });
                        return;
                    }
                }
            }
            // ── FIN logique Fabric Analysis ──────────────────────


            if (hasReceived || hasSending) {
                // ── États C / D : received ou sending renseigné ──────
                if (hasReceived && !hasSending) {
                    const days = Math.abs(_daysDiff(r[det.receivedDate]));
                    const daysLabel = days === 0 ? "reçu aujourd'hui" : days === 1 ? "reçu hier" : `reçu il y a ${days}j`;
                    const fsrStr = det.fsrNumber && r[det.fsrNumber] ? String(r[det.fsrNumber]).trim() : "";
                    const styleVal = getStyle(r);
                    const colorVal = det.color && r[det.color] ? String(r[det.color]).trim() : "";
                    const fabricPrefix = det.isFabricDevo ? `FSR ${fsrStr || "—"} ${styleVal} ${colorVal} — ` : "";

                    items.push({
                        dotCls: "dot-send", tagCls: "tag-send",
                        tagLabel: `📦 À envoyer (${daysLabel})`,
                        title: `${fabricPrefix}Re\u00e7u \u2014 \u00e0 envoyer au client${!det.isFabricDevo && !det.isFabricAnalysis && fsrStr ? " \u00B7 FSR " + fsrStr : ""}`,
                        action: `${daysLabel.charAt(0).toUpperCase() + daysLabel.slice(1)} — organiser l'envoi`,
                        style: getStyle(r), client: getClient(r),
                        meta: `Reçu le : ${_fmtDate(r[det.receivedDate])}${getFsr(r)}`,
                        urgency: days >= 3 ? "mid" : "low", sheet: key, rowIndex: r._rowIndex
                    });
                } else if (hasSending) {
                    const days = Math.abs(_daysDiff(r[det.sendingDate]));
                    const urgency = days >= 14 ? "high" : days >= 7 ? "mid" : "low";
                    const urgencyLabel = urgency === "high" ? " 🚨" : urgency === "mid" ? " ⚡" : "";
                    const fsrStr = det.fsrNumber && r[det.fsrNumber] ? String(r[det.fsrNumber]).trim() : "";
                    const styleVal = getStyle(r);
                    const colorVal = det.color && r[det.color] ? String(r[det.color]).trim() : "";
                    const fabricPrefix = det.isFabricDevo ? `FSR ${fsrStr || "—"} ${styleVal} ${colorVal} — ` : "";

                    items.push({
                        dotCls: "dot-approve", tagCls: "tag-approve",
                        tagLabel: `⏳ Approval ${days}j${urgencyLabel}`,
                        title: `${fabricPrefix}Envoy\u00e9 \u2014 approbation en attente depuis ${days}j${!det.isFabricDevo && !det.isFabricAnalysis && fsrStr ? " \u00B7 FSR " + fsrStr : ""}`,
                        action: urgency === "high" ? "Relancer de toute urgence" : urgency === "mid" ? "Envoyer un rappel" : "Attendre ou relancer",
                        style: getStyle(r), client: getClient(r),
                        meta: `Envoyé le : ${_fmtDate(r[det.sendingDate])}${getFsr(r)}`,
                        urgency, sheet: key, rowIndex: r._rowIndex
                    });
                }
                return;
            }

            // ── États A / B : pas encore reçu ──────────────────────
            if (hasFsr && !hasReadyDate) {
                // État A : FSR lancé mais Ready Date absente → relancer mail
                const fsrAgo = det.fsrDate ? timeAgo(r[det.fsrDate]) : "";
                const fsrStr = det.fsrNumber && r[det.fsrNumber] ? String(r[det.fsrNumber]).trim() : "";
                const styleVal = getStyle(r);
                const colorVal = det.color && r[det.color] ? String(r[det.color]).trim() : "";
                const fabricPrefix = det.isFabricDevo ? `FSR ${fsrStr || "—"} ${styleVal} ${colorVal} — ` : "";

                items.push({
                    dotCls: "dot-nopo", tagCls: "tag-nopo",
                    tagLabel: `📧 Ready Date manquante`,
                    title: `${fabricPrefix}FSR lancé — Ready Date non renseignée`,
                    action: `Relancer un mail pour obtenir la Ready Date${fsrAgo ? " (FSR " + fsrAgo + ")" : ""}`,
                    style: getStyle(r), client: getClient(r),
                    meta: `FSR lancé le : ${det.fsrDate ? _fmtDate(r[det.fsrDate]) : "—"}${getFsr(r)}`,
                    urgency: "mid", sheet: key, rowIndex: r._rowIndex
                });
            } else if (hasReadyDate) {
                // État B : Ready Date présente, attente réception
                const diff = _daysDiff(r[det.readyDate]);
                const fsrStr = det.fsrNumber && r[det.fsrNumber] ? String(r[det.fsrNumber]).trim() : "";
                const styleVal = getStyle(r);
                const colorVal = det.color && r[det.color] ? String(r[det.color]).trim() : "";
                const fabricPrefix = det.isFabricDevo ? `FSR ${fsrStr || "—"} ${styleVal} ${colorVal} — ` : "";

                if (diff < 0) {
                    const days = Math.abs(diff);
                    items.push({
                        dotCls: "dot-late", tagCls: "tag-late",
                        tagLabel: `🔴 En retard — ${days}j`,
                        title: `${fabricPrefix}Ready Date dépassée de ${days}j — non reçu`,
                        action: "Relancer la factory pour confirmer l'avancement",
                        style: getStyle(r), client: getClient(r),
                        meta: `Ready Date : ${_fmtDate(r[det.readyDate])}${getFsr(r)}`,
                        urgency: "high", sheet: key, rowIndex: r._rowIndex
                    });
                } else if (diff === 0) {
                    items.push({
                        dotCls: "dot-today", tagCls: "tag-today",
                        tagLabel: `🟡 Attendu aujourd'hui`,
                        title: `${fabricPrefix}Ready Date aujourd'hui — prévoir la réception`,
                        action: "Confirmer la réception dès réception",
                        style: getStyle(r), client: getClient(r),
                        meta: `Ready Date : ${_fmtDate(r[det.readyDate])}${getFsr(r)}`,
                        urgency: "low", sheet: key, rowIndex: r._rowIndex
                    });
                } else {
                    items.push({
                        dotCls: "dot-risk", tagCls: "tag-risk",
                        tagLabel: `🕐 Dans ${diff}j`,
                        title: `${fabricPrefix}En attente de réception — prêt dans ${diff} jour${diff > 1 ? "s" : ""}`,
                        action: `Prévoir la réception le ${_fmtDate(r[det.readyDate])}`,
                        style: getStyle(r), client: getClient(r),
                        meta: `Ready Date : ${_fmtDate(r[det.readyDate])}${getFsr(r)}`,
                        urgency: "low", sheet: key, rowIndex: r._rowIndex
                    });
                }
            }
            else {
                // ── Système intelligent : toute colonne de type "date" génère
                //    une alerte contextuelle selon la nature sémantique de la colonne.
                //
                //  • Colonne "action passée" (send, envoi, submit, launch, reçu…) :
                //    La date est un événement déjà posé → on attend quelque chose après.
                //    Si renseignée → alerte "en attente depuis Xj" (peu importe si passée ou future).
                //
                //  • Colonne "deadline / échéance" (due, deadline, expected, expiry, date…) :
                //    La date est une échéance → alerte si passée (retard) ou proche (≤7j).
                //
                //  • Colonne "date neutre" (tout le reste) :
                //    Alerte si date passée (retard) ou dans les 7 prochains jours (rappel).
                // ────────────────────────────────────────────────────────────────────────

                // Labels à exclure (déjà gérés par des blocs dédiés)
                const EXCLUDED = ["receiv", "recep", "send", "envoi", "ready", "fsr", "launch", "lanc", "approv"];
                const isExcluded = lbl => EXCLUDED.some(p => lbl.includes(p));

                // Patterns sémantiques
                const ACTION_PAST_PATTERNS = ["sent", "submit", "soumis", "expedit", "ship", "dispatch", "depart", "envoy", "départ", "livr"];
                const DEADLINE_PATTERNS = ["due", "deadline", "expir", "limit", "échéan", "delai", "délai", "cutoff", "cut-off", "target"];
                const WAITING_PATTERNS = ["date", "on", "le", "at"];  // fallback large

                cfg.cols.filter(c => c.type === "date").forEach(col => {
                    const colLbl = col.label.toLowerCase();
                    if (isExcluded(colLbl)) return;
                    const val = r[col.key];
                    if (!val || !String(val).trim()) return;

                    const diff = _daysDiff(val);
                    const isPast = diff < 0;
                    const days = Math.abs(diff);

                    // Nature sémantique
                    const isActionPast = ACTION_PAST_PATTERNS.some(p => colLbl.includes(p));
                    const isDeadline = DEADLINE_PATTERNS.some(p => colLbl.includes(p));

                    if (isActionPast) {
                        // Action passée (ex: "Sent on") -> on attend le prochain événement
                        const urgency = days >= 14 ? "high" : days >= 7 ? "mid" : "low";
                        items.push({
                            dotCls: "dot-approve", tagCls: "tag-approve",
                            tagLabel: `${ICONS.clock} ${col.label} — depuis ${days}j`,
                            title: `${getStyle(r)} — ${col.label} renseigné, attente suite`,
                            action: `Vérifier l'état d'avancement pour cette étape`,
                            style: getStyle(r), client: getClient(r),
                            meta: `${col.label} : ${_fmtDate(val)}${getFsr(r)}`,
                            urgency, sheet: key, rowIndex: r._rowIndex
                        });
                    } else if (isDeadline) {
                        // Échéance (ex: "Due Date")
                        if (isPast) {
                            items.push({
                                dotCls: "dot-late", tagCls: "tag-late",
                                tagLabel: `${ICONS.alert} ${col.label} dépassé ${days}j`,
                                title: `${getStyle(r)} — Échéance dépassée (${col.label})`,
                                action: `Relancer pour finaliser ou décaler la date`,
                                style: getStyle(r), client: getClient(r),
                                meta: `${col.label} : ${_fmtDate(val)}${getFsr(r)}`,
                                urgency: "high", sheet: key, rowIndex: r._rowIndex
                            });
                        } else if (days <= 7) {
                            items.push({
                                dotCls: "dot-risk", tagCls: "tag-risk",
                                tagLabel: `${ICONS.clock} ${col.label} dans ${days}j`,
                                title: `${getStyle(r)} — Échéance proche (${col.label})`,
                                action: `Finaliser cette étape d'ici ${days}j`,
                                style: getStyle(r), client: getClient(r),
                                meta: `${col.label} : ${_fmtDate(val)}${getFsr(r)}`,
                                urgency: "mid", sheet: key, rowIndex: r._rowIndex
                            });
                        }
                    } else {
                        // Date neutre (Rappel si passé ou proche)
                        if (isPast) {
                            items.push({
                                dotCls: "dot-late", tagCls: "tag-late",
                                tagLabel: `${ICONS.alert} ${col.label} passé ${days}j`,
                                title: `${getStyle(r)} — Date passée (${col.label})`,
                                action: `Régulariser cette information`,
                                style: getStyle(r), client: getClient(r),
                                meta: `${col.label} : ${_fmtDate(val)}${getFsr(r)}`,
                                urgency: "mid", sheet: key, rowIndex: r._rowIndex
                            });
                        } else if (days <= 5) {
                            items.push({
                                dotCls: "dot-today", tagCls: "tag-today",
                                tagLabel: `${ICONS.clock} ${col.label} bientôt`,
                                title: `${getStyle(r)} — Information à surveiller`,
                                action: `Action requise d'ici peu`,
                                style: getStyle(r), client: getClient(r),
                                meta: `${col.label} : ${_fmtDate(val)}${getFsr(r)}`,
                                urgency: "low", sheet: key, rowIndex: r._rowIndex
                            });
                        }
                    }
                });
            }
        });

        // Traitement des groupes Bulk (moved here to be after individual row processing)
        if (isBulk) {
            Object.keys(fabricGroups).forEach(f => {
                const groupData = fabricGroups[f];
                const stats = { late: 0, today: 0, toSend: 0, pending: 0, oldestSendDays: 0, lateDates: [], todayDates: [], toSendDates: [], pendingDates: [] };
                groupData.rows.forEach(r => {
                    const hasReceived = !!(r[det.receivedDate] && String(r[det.receivedDate]).trim());
                    const hasSending = !!(r[det.sendingDate] && String(r[det.sendingDate]).trim());
                    const hasReady = !!(r[det.readyDate] && String(r[det.readyDate]).trim());
                    if (hasReady && !hasReceived && !hasSending) {
                        const diff = _daysDiff(r[det.readyDate]);
                        if (diff < 0) { stats.late++; stats.lateDates.push(_fmtDate(r[det.readyDate])); }
                        else if (diff === 0) { stats.today++; stats.todayDates.push(_fmtDate(r[det.readyDate])); }
                    } else if (hasReceived && !hasSending) {
                        stats.toSend++; stats.toSendDates.push(_fmtDate(r[det.receivedDate]));
                    } else if (hasSending && !isApproved(r[det.approval])) {
                        stats.pending++; stats.pendingDates.push(_fmtDate(r[det.sendingDate]));
                        const sendDays = Math.abs(_daysDiff(r[det.sendingDate]));
                        if (sendDays > stats.oldestSendDays) stats.oldestSendDays = sendDays;
                    }
                });
                const uniqDates = arr => [...new Set(arr)].join(", ");
                const groupStyleLabel = [...new Set(groupData.rows.map(r => getStyle(r)).filter(s => s && s !== "—"))].join(", ") || getStyle(groupData.rows[0]);
                const groupClient = groupData.rows[0].Client || "";
                if (stats.late > 0) items.push({ dotCls: "dot-late", tagCls: "tag-late", tagLabel: `${ICONS.alert} ${f} — ${stats.late} Retards`, urgency: "high", sheet: key, rowIndex: groupData.rows[0]._rowIndex, title: `${f} : Retards détectés`, action: "Relancer supplier", style: groupStyleLabel, client: groupClient, meta: `Ready Date(s) : ${uniqDates(stats.lateDates)}` });
                if (stats.today > 0) items.push({ dotCls: "dot-today", tagCls: "tag-today", tagLabel: `${ICONS.clock} ${f} — ${stats.today} Aujourd'hui`, urgency: "mid", sheet: key, rowIndex: groupData.rows[0]._rowIndex, title: `${f} : Attendus aujourd'hui`, action: "Confirmer réception", style: groupStyleLabel, client: groupClient, meta: `Ready Date(s) : ${uniqDates(stats.todayDates)}` });
                if (stats.toSend > 0) items.push({ dotCls: "dot-send", tagCls: "tag-send", tagLabel: `${ICONS.package} ${f} — ${stats.toSend} À envoyer`, urgency: "mid", sheet: key, rowIndex: groupData.rows[0]._rowIndex, title: `${f} : Prêts à l'envoi`, action: "Organiser envoi", style: groupStyleLabel, client: groupClient, meta: `Received Date(s) : ${uniqDates(stats.toSendDates)}` });
                if (stats.pending > 0) {
                    const daysTxt = stats.oldestSendDays > 0 ? ` (envoyé il y a ${stats.oldestSendDays}j)` : "";
                    items.push({
                        dotCls: "dot-approve", tagCls: "tag-approve",
                        tagLabel: `${ICONS.clock} ${f} — ${stats.pending} En attente Approval${daysTxt}`,
                        urgency: "low", sheet: key, rowIndex: groupData.rows[0]._rowIndex,
                        title: `${f} : Approbation client${daysTxt}`,
                        action: "Suivi approval", style: groupStyleLabel, client: groupClient,
                        meta: `Sending Date(s) : ${uniqDates(stats.pendingDates)}`
                    });
                }
            });
        }

        if (items.length) all[key] = { label: cfg.label, items };
    });

    const atRisks = collectAtRiskStyles();
    if (atRisks.length) {
        all["__atrisk__"] = { label: "⚡ Styles à Risque", items: atRisks.map(r => ({
            dotCls: r.maxUrgency === "high" ? "dot-late" : "dot-today",
            tagCls: r.maxUrgency === "high" ? "tag-late" : "tag-today",
            tagLabel: `${r.maxUrgency === "high" ? ICONS.alert : ICONS.clock} Score ${r.score} — ${r.flags.length} signal${r.flags.length > 1 ? "s" : ""}`,
            title: `${r.style}${r.desc ? " · " + r.desc : ""} — ${r.flags.map(f => f.label).join(" · ")}`,
            action: r.flags[0]?.label || "Vérifier le style",
            style: r.style, client: r.client,
            urgency: r.maxUrgency, sheet: "details",
            rowIndex: (state.data.details || []).find(d => d.Style === r.style)?._rowIndex ?? null
        })) };
    }
    return all;
}

// ── Navigation vers une ligne depuis une notif ───────────────
function navigateToRow(sheetKey, rowIndex) {
    // 1. Fermer le tiroir global
    closeGlobalNotifDrawer();

    // 2. Naviguer vers le bon menu (simuler un clic sur le nav-item)
    const navBtn = document.querySelector(`.nav-item[data-sheet="${sheetKey}"]`) ||
        document.getElementById(`tab-custom-${sheetKey}`);

    if (navBtn) {
        // Réinitialiser les filtres et changer l'onglet actif
        state.activeView = "sheet";
        state.activeSheet = sheetKey;
        state.searchQuery = ""; state.filterDept = ""; state.filterClient = "";
        state.sortCol = null; state.sortDir = 1;
        searchInput.value = ""; deptFilter.value = "";
        const cf = document.getElementById("client-filter"); if (cf) cf.value = "";
        document.querySelectorAll(".nav-item").forEach(b => {
            b.classList.remove("active"); b.setAttribute("aria-selected", "false");
        });
        navBtn.classList.add("active"); navBtn.setAttribute("aria-selected", "true");
        const titles = { details: "Détails des Styles", sample: "Suivi des Samples", ordering: "Gestion des Commandes" };
        const titleEl = document.getElementById("header-sheet-title");
        if (titleEl) titleEl.textContent = titles[sheetKey] || (SHEET_CONFIG[sheetKey]?.label || sheetKey);
        showTableView(); applyFilters(); renderKPIs();
        populateDeptFilter(); populateClientFilter();

        updateGlobalNotifBadge();
    }

    // 3. Attendre le rendu, puis scroll + surbrillance
    setTimeout(() => {
        // Chercher la ligne par data-rowindex ou en parcourant les tr
        let targetRow = document.querySelector(`#table-body tr[data-rowindex="${rowIndex}"]`);

        // Fallback : chercher dans les boutons d'action qui ont onclick="openEditModal(rowIndex)"
        if (!targetRow) {
            const allRows = document.querySelectorAll("#table-body tr");
            for (const tr of allRows) {
                const editBtn = tr.querySelector(`button[onclick="openEditModal(${rowIndex})"]`);
                if (editBtn) { targetRow = tr; break; }
            }
        }

        if (targetRow) {
            // Scroll vers la ligne
            targetRow.scrollIntoView({ behavior: "smooth", block: "center" });

            // Surbrillance animée
            targetRow.classList.add("row-highlight");
            setTimeout(() => targetRow.classList.remove("row-highlight"), 3000);
        }
    }, 350); // laisser le temps au DOM de se rendre
}

// ── Badge cloche dans le header ───────────────────────────────
function updateGlobalNotifBadge() {
    const btn = document.getElementById("btn-notif-global");
    const badge = document.getElementById("notif-global-badge");
    if (!btn || !badge) return;
    const total = Object.values(collectAllAlerts()).reduce((s, v) => s + v.items.length, 0);
    if (total === 0) {
        btn.style.display = "none";
        btn.classList.remove("has-alerts");
    } else {
        btn.style.display = "flex";
        badge.textContent = total > 99 ? "99+" : total;
        btn.classList.add("has-alerts");
    }
}

// ── Tiroir global ─────────────────────────────────────────────
let _gndActiveTab = "__all__";

function openGlobalNotifDrawer() {
    let drawer = document.getElementById("global-notif-drawer");
    if (!drawer) {
        drawer = document.createElement("div");
        drawer.id = "global-notif-drawer";
        drawer.innerHTML = `
        <div class="gnd-backdrop" onclick="closeGlobalNotifDrawer()"></div>
        <div class="gnd-panel">
            <div class="gnd-header">
                <div class="gnd-header-left">
                    <div class="gnd-header-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="17" height="17"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                    </div>
                    <div>
                        <div class="gnd-header-title">Alertes Globales</div>
                        <div class="gnd-header-sub" id="gnd-header-sub">Tous les menus</div>
                    </div>
                </div>
                <div class="gnd-header-actions">
                    <button class="gnd-export-btn" onclick="exportGlobalNotifExcel()">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="13" height="13"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                        Export Excel
                    </button>
                    <button class="gnd-close-btn" onclick="closeGlobalNotifDrawer()">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
            </div>
            <div class="gnd-tabs" id="gnd-tabs" style="display:flex;flex-wrap:wrap;gap:4px;padding:10px 16px 6px;border-bottom:1px solid var(--border);"></div>
            <div class="gnd-body"  id="gnd-body"></div>
        </div>`;
        document.body.appendChild(drawer);
    }
    // Inject summary card styles once
    if (!document.getElementById("gnd-summary-styles")) {
        const st = document.createElement("style");
        st.id = "gnd-summary-styles";
        st.textContent = `
        .gnd-menu-list { display:flex; flex-direction:column; padding:8px 10px; gap:3px; }
        .gnd-mline { display:flex; align-items:center; gap:10px; padding:10px 12px; cursor:pointer; border-radius:10px; border:0.5px solid transparent; transition:border-color .12s,background .12s; }
        .gnd-mline:hover { border-color:var(--color-border-secondary,#d1d5db); }
        .gnd-mline-high { background:#FFF0F0; } .gnd-mline-high:hover { background:#FFE4E4; }
        .gnd-mline-mid  { background:#FFFDE7; } .gnd-mline-mid:hover  { background:#FFFAC0; }
        .gnd-mline-low  { background:var(--color-background-secondary,#f9fafb); }
        .gnd-mline-badge { width:30px; height:30px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .gnd-mline-high .gnd-mline-badge { background:#FFBCBC; }
        .gnd-mline-mid  .gnd-mline-badge { background:#FFF176; }
        .gnd-mline-low  .gnd-mline-badge { background:#D3D1C7; }
        .gnd-mline-body { flex:1; min-width:0; }
        .gnd-mline-name { font-size:13px; font-weight:500; color:var(--color-text-primary,#111827); margin-bottom:4px; }
        .gnd-mline-types { display:flex; flex-wrap:wrap; gap:4px; }
        .gnd-mtype { display:inline-flex; align-items:center; gap:4px; font-size:10.5px; padding:1px 6px; border-radius:20px; border:0.5px solid transparent; color:var(--color-text-secondary,#6b7280); background:var(--color-background-primary,#fff); border-color:var(--color-border-tertiary,#e5e7eb); }
        .gnd-mtype-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; display:inline-block; }
        .gnd-mline-total { font-size:13px; font-weight:500; color:var(--color-text-secondary,#6b7280); min-width:18px; text-align:right; flex-shrink:0; }
        .gnd-mline-arrow { color:var(--color-text-secondary,#9ca3af); flex-shrink:0; transition:transform .12s; }
        .gnd-mline:hover .gnd-mline-arrow { transform:translateX(2px); }
        .gnd-detail-back { display:flex; align-items:center; gap:7px; padding:10px 16px; font-size:12px; font-weight:500; color:var(--color-text-secondary,#6b7280); cursor:pointer; border-bottom:0.5px solid var(--color-border-tertiary,#e5e7eb); background:var(--color-background-secondary,#f9fafb); transition:color .1s; }
        .gnd-detail-back:hover { color:var(--color-text-primary,#111827); }
        .gnd-detail-label { font-size:13px; font-weight:500; color:var(--color-text-primary,#111827); padding:10px 16px 6px; border-bottom:0.5px solid var(--color-border-tertiary,#e5e7eb); }
        .gnd-legend { display:flex; align-items:center; flex-wrap:wrap; gap:8px 14px; padding:10px 14px 12px; border-top:0.5px solid var(--color-border-tertiary,#e5e7eb); margin-top:2px; }
        .gnd-leg-item { display:flex; align-items:center; gap:5px; font-size:11px; color:var(--color-text-secondary,#6b7280); white-space:nowrap; }
        .gnd-leg-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; display:inline-block; }
        .dot-late    { background:#FF6B6B !important; }
        .dot-today   { background:#FFD600 !important; }
        .dot-send    { background:#22C55E !important; }
        .dot-approve { background:#3B82F6 !important; }
        .dot-nopo    { background:#D946EF !important; }
        .dot-risk    { background:#7C2D12 !important; }
        .tag-late    { background:#FFF0F0; color:#C0392B; border:0.5px solid #FFBCBC; }
        .tag-today   { background:#FFFDE7; color:#827717; border:0.5px solid #FFF176; }
        .tag-send    { background:#F0FDF4; color:#166534; border:0.5px solid #86EFAC; }
        .tag-approve { background:#EFF6FF; color:#1E40AF; border:0.5px solid #93C5FD; }
        .tag-nopo    { background:#FDF4FF; color:#86198F; border:0.5px solid #E879F9; }
        .tag-risk    { background:#FEF3C7; color:#7C2D12; border:0.5px solid #D97706; }
        `;
        document.head.appendChild(st);
    }
    _renderGndFull();
    requestAnimationFrame(() => drawer.classList.add("open"));
}

function closeGlobalNotifDrawer() {
    const d = document.getElementById("global-notif-drawer");
    if (d) d.classList.remove("open");
}

function gndSetTab(key) { _gndActiveTab = key; _renderGndFull(); }

// État ouvert/fermé des accordéons (persiste pendant la session)
const _gndOpenSections = new Set(["__all__"]);

function gndToggleSection(key) {
    if (_gndOpenSections.has(key)) _gndOpenSections.delete(key);
    else _gndOpenSections.add(key);
    const body = document.getElementById(`gnd-acc-body-${key}`);
    const arrow = document.getElementById(`gnd-acc-arrow-${key}`);
    if (!body || !arrow) return;
    const isOpen = _gndOpenSections.has(key);
    body.style.maxHeight = isOpen ? body.scrollHeight + "px" : "0";
    body.style.opacity = isOpen ? "1" : "0";
    arrow.style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";
}

function _renderGndFull() {
    const all = collectAllAlerts();
    const keys = Object.keys(all);
    const total = keys.reduce((s, k) => s + all[k].items.length, 0);

    const sub = document.getElementById("gnd-header-sub");
    if (sub) sub.textContent = total
        ? `${total} alerte${total > 1 ? "s" : ""} · ${keys.length} menu${keys.length > 1 ? "s" : ""}`
        : "Aucune alerte active";

    const tabsEl = document.getElementById("gnd-tabs");
    if (tabsEl) tabsEl.style.display = "none";

    const body = document.getElementById("gnd-body");
    if (!keys.length) {
        body.innerHTML = `<div class="gnd-ok"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="15" height="15"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Tout est à jour — aucune alerte active.</div>`;
        return;
    }

    const urgencyOrder = { high: 0, mid: 1, low: 2 };

    const renderRow = item => `
    <div class="gnd-row${item.urgency === "high" ? " gnd-row-high" : item.urgency === "mid" ? " gnd-row-mid" : ""}${item.rowIndex != null ? " gnd-row-clickable" : ""}"
         ${item.rowIndex != null ? `onclick="navigateToRow('${item.sheet}',${item.rowIndex})"` : ""}>
        <span class="gnd-row-dot ${item.dotCls}"></span>
        <div class="gnd-row-info">
            <div class="gnd-row-top">
                <span class="gnd-row-style">${esc(item.style)}</span>
                ${item.client ? `<span class="gnd-row-client">${esc(item.client)}</span>` : ""}
                <span class="gnd-row-tag ${item.tagCls}">${item.tagLabel}</span>
            </div>
            <div class="gnd-row-title">${esc(item.title)}</div>
            <div class="gnd-row-action">→ ${esc(item.action)}</div>
            <div class="gnd-row-meta">${item.meta || ""}</div>
        </div>
        ${item.rowIndex != null ? `<span class="gnd-row-goto">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="13" height="13"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
        </span>` : ""}
    </div>`;

    // ── Vue liste : une ligne par menu, tout fermé ──
    let listHtml = `<div class="gnd-menu-list" id="gnd-menu-list">`;
    keys.forEach(k => {
        const items = [...all[k].items].sort((a, b) => (urgencyOrder[a.urgency] ?? 9) - (urgencyOrder[b.urgency] ?? 9));
        const hasHigh = items.some(i => i.urgency === "high");
        const hasMid  = !hasHigh && items.some(i => i.urgency === "mid");
        const barCls  = hasHigh ? "gnd-mline-high" : hasMid ? "gnd-mline-mid" : "gnd-mline-low";
        const safeKey = k.replace(/[^a-zA-Z0-9_]/g, "_");

        // Compter par dotCls
        const dotCount = {};
        items.forEach(i => { dotCount[i.dotCls] = (dotCount[i.dotCls] || 0) + 1; });
        const dotOrder = ["dot-late","dot-today","dot-approve","dot-send","dot-nopo","dot-risk"];
        const typesHtml = dotOrder
            .filter(d => dotCount[d])
            .map(d => `<span class="gnd-mtype"><span class="gnd-mtype-dot ${d}"></span>${dotCount[d]}</span>`)
            .join("");

        const iconSvg = hasHigh
            ? `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2L1 14h14L8 2z" stroke="#C0392B" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 6v3.5M8 11v.5" stroke="#C0392B" stroke-width="1.6" stroke-linecap="round"/></svg>`
            : hasMid
            ? `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="#827717" stroke-width="1.6"/><path d="M8 5v3.5M8 10.5v.5" stroke="#827717" stroke-width="1.6" stroke-linecap="round"/></svg>`
            : `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="#5F5E5A" stroke-width="1.6"/><path d="M5.5 8l2 2 3-3" stroke="#5F5E5A" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

        listHtml += `
        <div class="gnd-mline ${barCls}" onclick="gndOpenDetail('${safeKey}')">
            <div class="gnd-mline-badge">${iconSvg}</div>
            <div class="gnd-mline-body">
                <div class="gnd-mline-name">${esc(all[k].label)}</div>
                <div class="gnd-mline-types">${typesHtml}</div>
            </div>
            <span class="gnd-mline-total">${items.length}</span>
            <svg class="gnd-mline-arrow" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" width="13" height="13"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>`;
    });
    listHtml += `</div>`;

    // ── Légende dynamique : lit les vraies couleurs CSS des dot-* ──
    const legendDots = [
        { cls: "dot-late",    label: "En retard"        },
        { cls: "dot-today",   label: "Aujourd'hui"      },
        { cls: "dot-approve", label: "Approval en attente" },
        { cls: "dot-send",    label: "À envoyer"        },
        { cls: "dot-nopo",    label: "Info manquante"   },
        { cls: "dot-risk",    label: "À risque"         },
    ];
    const legendItems = legendDots.map(d =>
        `<span class="gnd-leg-item">
            <span class="gnd-leg-dot ${d.cls}"></span>${d.label}
        </span>`
    ).join("");
    listHtml += `<div class="gnd-legend">${legendItems}</div>`;

    // ── Vue détail (cachée par défaut) ──
    const detailHtml = `<div class="gnd-detail-view" id="gnd-detail-view" style="display:none">
        <div class="gnd-detail-back" onclick="gndCloseDetail()">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="12" height="12"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
            Retour
        </div>
        <div class="gnd-detail-label" id="gnd-detail-label"></div>
        <div class="gnd-detail-filters" id="gnd-detail-filters">
            <div class="gnd-filter-search-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="13" height="13" style="color:var(--color-text-secondary,#9ca3af);flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input id="gnd-filter-style" class="gnd-filter-style-input" placeholder="Filtrer par style..." oninput="gndApplyDetailFilters()" autocomplete="off"/>
            </div>
            <div class="gnd-filter-types" id="gnd-filter-types"></div>
        </div>
        <div id="gnd-detail-rows"></div>
        <div id="gnd-detail-empty" class="gnd-detail-empty" style="display:none">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="28" height="28"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/></svg>
            <span>Aucune alerte pour ces filtres</span>
        </div>
    </div>`;

    // Inject filter styles once
    if (!document.getElementById("gnd-filter-styles")) {
        const fs = document.createElement("style");
        fs.id = "gnd-filter-styles";
        fs.textContent = `
        .gnd-detail-filters { display:flex; flex-direction:column; gap:7px; padding:8px 12px 10px; border-bottom:1px solid var(--border,#e5e7eb); background:var(--color-background-secondary,#f9fafb); }
        .gnd-filter-search-wrap { display:flex; align-items:center; gap:7px; background:var(--color-background-primary,#fff); border:1px solid var(--border,#e5e7eb); border-radius:8px; padding:5px 10px; }
        .gnd-filter-style-input { flex:1; border:none; outline:none; background:transparent; font-size:12.5px; color:var(--color-text-primary,#111827); }
        .gnd-filter-style-input::placeholder { color:var(--color-text-secondary,#9ca3af); }
        .gnd-filter-types { display:flex; flex-wrap:wrap; gap:5px; }
        .gnd-ftype-pill { display:inline-flex; align-items:center; gap:5px; font-size:11px; padding:3px 9px; border-radius:20px; border:1px solid var(--border,#e5e7eb); background:var(--color-background-primary,#fff); cursor:pointer; color:var(--color-text-secondary,#6b7280); transition:all .12s; user-select:none; }
        .gnd-ftype-pill:hover { border-color:#9ca3af; }
        .gnd-ftype-pill.active { background:#111827; color:#fff; border-color:#111827; }
        .gnd-ftype-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
        .gnd-detail-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:32px 16px; color:var(--color-text-secondary,#9ca3af); font-size:13px; }
        `;
        document.head.appendChild(fs);
    }

    body.innerHTML = listHtml + detailHtml;
    body._gndAll = all;
    body._gndRenderRow = renderRow;
    body._gndUrgOrder = urgencyOrder;
}

function gndOpenDetail(safeKey) {
    const body = document.getElementById("gnd-body");
    const all = body._gndAll;
    const renderRow = body._gndRenderRow;
    const urgencyOrder = body._gndUrgOrder;
    if (!all) return;

    const origKey = Object.keys(all).find(k => k.replace(/[^a-zA-Z0-9_]/g, "_") === safeKey) || safeKey;
    const data = all[origKey];
    if (!data) return;

    const items = [...data.items].sort((a, b) => (urgencyOrder[a.urgency] ?? 9) - (urgencyOrder[b.urgency] ?? 9));

    // Store items on body for filter access
    body._gndDetailItems = items;
    body._gndDetailLabel = data.label;

    // ── Build type filter pills from available dotCls in this menu ──
    const dotMeta = [
        { cls: "dot-late",    label: "En retard"           },
        { cls: "dot-today",   label: "Aujourd'hui"         },
        { cls: "dot-approve", label: "Approval"            },
        { cls: "dot-send",    label: "À envoyer"           },
        { cls: "dot-nopo",    label: "Info manquante"      },
        { cls: "dot-risk",    label: "À risque"            },
    ];
    const presentDots = new Set(items.map(i => i.dotCls));
    const filterTypesEl = document.getElementById("gnd-filter-types");
    if (filterTypesEl) {
        filterTypesEl.innerHTML = dotMeta
            .filter(d => presentDots.has(d.cls))
            .map(d => `<span class="gnd-ftype-pill" data-dot="${d.cls}" onclick="gndToggleTypeFilter(this, '${d.cls}')">
                <span class="gnd-ftype-dot ${d.cls}"></span>${d.label}
            </span>`)
            .join("");
    }

    // Reset filters on each open
    const styleInput = document.getElementById("gnd-filter-style");
    if (styleInput) styleInput.value = "";
    document.querySelectorAll(".gnd-ftype-pill").forEach(p => p.classList.remove("active"));
    body._gndActiveTypes = new Set();

    document.getElementById("gnd-detail-label").textContent = `${data.label} — ${items.length} alerte${items.length > 1 ? "s" : ""}`;
    document.getElementById("gnd-detail-rows").innerHTML = items.map(renderRow).join("");
    document.getElementById("gnd-menu-list").style.display = "none";
    document.getElementById("gnd-detail-view").style.display = "block";
    body.scrollTop = 0;
}

function gndToggleTypeFilter(pill, dotCls) {
    const body = document.getElementById("gnd-body");
    if (!body._gndActiveTypes) body._gndActiveTypes = new Set();
    if (body._gndActiveTypes.has(dotCls)) {
        body._gndActiveTypes.delete(dotCls);
        pill.classList.remove("active");
    } else {
        body._gndActiveTypes.add(dotCls);
        pill.classList.add("active");
    }
    gndApplyDetailFilters();
}

function gndApplyDetailFilters() {
    const body = document.getElementById("gnd-body");
    const items = body._gndDetailItems;
    const renderRow = body._gndRenderRow;
    const label = body._gndDetailLabel || "";
    if (!items || !renderRow) return;

    const styleQuery = (document.getElementById("gnd-filter-style")?.value || "").toLowerCase().trim();
    const activeTypes = body._gndActiveTypes || new Set();

    const filtered = items.filter(item => {
        const matchStyle = !styleQuery || (item.style || "").toLowerCase().includes(styleQuery);
        const matchType  = activeTypes.size === 0 || activeTypes.has(item.dotCls);
        return matchStyle && matchType;
    });

    const rowsEl  = document.getElementById("gnd-detail-rows");
    const emptyEl = document.getElementById("gnd-detail-empty");
    const labelEl = document.getElementById("gnd-detail-label");

    if (rowsEl)  rowsEl.innerHTML = filtered.map(renderRow).join("");
    if (emptyEl) emptyEl.style.display = filtered.length === 0 ? "flex" : "none";
    if (labelEl) {
        const suffix = filtered.length !== items.length ? ` (${filtered.length}/${items.length})` : ` — ${items.length} alerte${items.length > 1 ? "s" : ""}`;
        labelEl.textContent = label + suffix;
    }
}

function gndCloseDetail() {
    const body = document.getElementById("gnd-body");
    const list = document.getElementById("gnd-menu-list");
    const detail = document.getElementById("gnd-detail-view");
    if (list) list.style.display = "";
    if (detail) detail.style.display = "none";
    if (body) { body.scrollTop = 0; body._gndActiveTypes = new Set(); }
}

// ── Export Excel global ───────────────────────────────────────
function exportGlobalNotifExcel() {
    _waitForXLSX(function (XL) {
        if (!XL) { showToast("Bibliothèque Excel non chargée — vérifiez votre connexion", "error"); return; }
        const all = collectAllAlerts();
        const keys = Object.keys(all);
        if (!keys.length) { showToast("Aucune alerte à exporter", "info"); return; }

        const wb = XL.utils.book_new();

        // Feuille résumé global
        const summaryRows = [];
        keys.forEach(k => all[k].items.forEach(item => summaryRows.push({
            "Menu": all[k].label, "Style": item.style, "Client": item.client,
            "Alerte": item.title, "Action requise": item.action, "Détail": item.meta
        })));
        XL.utils.book_append_sheet(wb, XL.utils.json_to_sheet(summaryRows), "Résumé Global");

        // Une feuille par menu
        keys.forEach(k => {
            const rows = all[k].items.map(i => ({
                "Style": i.style, "Client": i.client,
                "Alerte": i.title, "Action requise": i.action, "Détail": i.meta
            }));
            XL.utils.book_append_sheet(wb, XL.utils.json_to_sheet(rows), all[k].label.slice(0, 31));
        });

        const total = keys.reduce((s, k) => s + all[k].items.length, 0);
        XL.writeFile(wb, `AW27_Alertes_Globales_${new Date().toISOString().slice(0, 10)}.xlsx`);
        showToast(`Export — ${total} alerte${total > 1 ? "s" : ""} · ${keys.length} menu${keys.length > 1 ? "s" : ""}`, "success");
    });
}

// ─── Démarrage ────────────────────────────────────────────────
// L'initialisation est déclenchée par auth.js → onAuthReady()
// après vérification Firebase. Ne pas appeler initApp() directement.
document.addEventListener("DOMContentLoaded", () => {
    // Afficher un spinner pendant que Firebase vérifie la session
    showAppSpinner();
});

// ─── Spinner d'attente Firebase ───────────────────────────────
function showAppSpinner() {
    let s = document.getElementById("app-auth-spinner");
    if (s) return;
    s = document.createElement("div");
    s.id = "app-auth-spinner";
    s.innerHTML = `
    <div class="aas-backdrop">
        <div class="aas-card">
            <div class="aas-logo">AW</div>
            <div class="aas-spinner">
                <div class="aas-dot"></div>
                <div class="aas-dot"></div>
                <div class="aas-dot"></div>
            </div>
            <div class="aas-label">Vérification de la session…</div>
        </div>
    </div>`;
    document.body.appendChild(s);
}
function hideAppSpinner() {
    const s = document.getElementById("app-auth-spinner");
    if (s) s.remove();
}

// ─── Badge utilisateur dans le header ────────────────────────
function renderUserBadge() {
    hideAppSpinner();
    const u = window.currentUser;
    if (!u) return;

    // Retirer badge précédent si rechargement
    const existing = document.getElementById("user-badge");
    if (existing) existing.remove();

    const initials = (u.displayName || u.email || "?")
        .trim().split(" ")
        .filter(Boolean)
        .map(p => p[0].toUpperCase())
        .slice(0, 2).join("");

    const badge = document.createElement("div");
    badge.id = "user-badge";
    badge.className = "user-badge";
    badge.title = `${u.displayName || ""}\n${u.email}`;
    badge.onclick = openUserSettings;
    badge.innerHTML = u.photoURL
        ? `<img class="user-badge-photo" src="${u.photoURL}" alt="Photo"/>`
        : `<div class="user-badge-initials">${initials}</div>`;

    // Insérer dans header-right avant le premier bouton
    const headerRight = document.querySelector(".header-right");
    if (headerRight) headerRight.prepend(badge);
}

// ─── Modal Paramètres Utilisateur ────────────────────────────
function openUserSettings() {
    let modal = document.getElementById("user-settings-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "user-settings-modal";
        modal.className = "usm-overlay";
        modal.innerHTML = `
        <div class="usm-backdrop" onclick="closeUserSettings()"></div>
        <div class="usm-panel">
            <div class="usm-header">
                <div class="usm-title">Mon compte</div>
                <button class="usm-close" onclick="closeUserSettings()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="15" height="15"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            <div class="usm-body">
                <!-- Profil -->
                <div class="usm-profile">
                    <div id="usm-avatar"></div>
                    <div>
                        <div class="usm-name"  id="usm-name"></div>
                        <div class="usm-email" id="usm-email"></div>
                    </div>
                </div>

                <!-- GAS URL -->
                <div class="usm-section">
                    <div class="usm-section-title">Google Apps Script URL</div>
                    <div class="usm-section-desc">Modifiez cette URL pour connecter une autre source de données.</div>
                    <input class="usm-input" id="usm-gas-input" type="url"
                        placeholder="https://script.google.com/macros/s/…/exec"/>
                    <button class="usm-btn-save" onclick="saveNewGasUrl()">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="13" height="13"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                        Enregistrer et recharger
                    </button>
                </div>

                <!-- Déconnexion -->
                <div class="usm-section">
                    <button class="usm-btn-signout" onclick="signOut()">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                        Se déconnecter
                    </button>
                </div>
            </div>
        </div>`;
        document.body.appendChild(modal);
    }

    // Peupler les infos
    const u = window.currentUser;
    const initials = (u.displayName || u.email || "?").trim().split(" ").filter(Boolean).map(p => p[0].toUpperCase()).slice(0, 2).join("");
    document.getElementById("usm-avatar").innerHTML = u.photoURL
        ? `<img class="usm-photo" src="${u.photoURL}" alt="Photo"/>`
        : `<div class="usm-initials">${initials}</div>`;
    document.getElementById("usm-name").textContent = u.displayName || "—";
    document.getElementById("usm-email").textContent = u.email || "—";
    document.getElementById("usm-gas-input").value = u.gasUrl || "";

    requestAnimationFrame(() => modal.classList.add("open"));
}

function closeUserSettings() {
    const m = document.getElementById("user-settings-modal");
    if (m) m.classList.remove("open");
}

async function saveNewGasUrl() {
    const input = document.getElementById("usm-gas-input");
    if (!input) return;
    await updateGasUrl(input.value.trim());
    closeUserSettings();
}

// ═══════════════════════════════════════════════════════════════
// ─── FEATURE 1 : DÉTECTION DOUBLONS (même Style+Color dans même menu) ──
// ═══════════════════════════════════════════════════════════════

function collectDuplicates() {
    const duplicates = [];

    // Menus à scanner : tous sauf ordering (color normale = plusieurs lignes)
    const sheetsToScan = Object.keys(SHEET_CONFIG).filter(k => k !== "ordering");

    sheetsToScan.forEach(sheetKey => {
        const cfg = SHEET_CONFIG[sheetKey];
        const rows = state.data[sheetKey] || [];
        if (!rows.length) return;

        // Détecter les colonnes Style et Color dans ce menu
        const styleCols = ["Style", "style", "ref", "Ref", "reference", "Reference", "article", "Article"];
        const colorCols = ["Color", "color", "Colour", "colour", "GMT Color", "gmt color", "coloris", "Coloris", "shade", "Shade"];

        const getVal = (r, candidates) => {
            for (const c of candidates) { if (r[c] && String(r[c]).trim()) return String(r[c]).trim(); }
            // Also check SHEET_CONFIG cols
            if (cfg.cols) {
                const col = cfg.cols.find(c => candidates.map(x => x.toLowerCase()).includes(c.label.toLowerCase()));
                if (col && r[col.key] && String(r[col.key]).trim()) return String(r[col.key]).trim();
            }
            return null;
        };

        const seen = {};
        rows.forEach(r => {
            const style = getVal(r, styleCols);
            const color = getVal(r, colorCols);
            if (!style) return;
            const key = color ? `${style}||${color}` : style;
            if (!seen[key]) { seen[key] = []; }
            seen[key].push(r);
        });

        Object.entries(seen).forEach(([key, dupes]) => {
            if (dupes.length < 2) return;
            const [style, color] = key.split("||");
            duplicates.push({
                sheet: sheetKey,
                sheetLabel: cfg.label || sheetKey,
                style, color: color || null,
                count: dupes.length,
                rows: dupes
            });
        });
    });

    return duplicates;
}

function openDuplicatesPanel() {
    let overlay = document.getElementById("duplicates-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "duplicates-overlay";
        overlay.className = "modal-overlay";
        overlay.innerHTML = `
        <div class="modal" style="max-width:680px">
            <div class="modal-header">
                <div>
                    <div class="modal-title">🔍 Détection de Doublons</div>
                    <div class="modal-subtitle" id="dup-subtitle">Même Style + Color dans le même menu</div>
                </div>
                <button class="btn-close" onclick="closeDuplicatesPanel()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            <div class="modal-body" id="dup-body" style="max-height:60vh;overflow-y:auto;padding:1rem 1.5rem;"></div>
        </div>`;
        document.body.appendChild(overlay);
    }
    renderDuplicatesBody();
    overlay.classList.add("open");
}

function closeDuplicatesPanel() {
    const o = document.getElementById("duplicates-overlay");
    if (o) o.classList.remove("open");
}

function renderDuplicatesBody() {
    const dupes = collectDuplicates();
    const subtitle = document.getElementById("dup-subtitle");
    const body = document.getElementById("dup-body");
    if (!dupes.length) {
        if (subtitle) subtitle.textContent = "Aucun doublon détecté ✓";
        body.innerHTML = `<div style="text-align:center;padding:2.5rem;color:var(--text-muted);">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="36" height="36" style="margin:0 auto 1rem;display:block;opacity:.4"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p>Aucun doublon détecté — tous les styles sont uniques.</p></div>`;
        return;
    }
    if (subtitle) subtitle.textContent = `${dupes.length} doublon${dupes.length > 1 ? "s" : ""} détecté${dupes.length > 1 ? "s" : ""}`;

    body.innerHTML = dupes.map(d => `
    <div style="background:var(--surface-2,#f8f9fa);border:1px solid var(--border);border-radius:10px;padding:1rem 1.2rem;margin-bottom:.8rem;">
        <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.6rem;">
            <span style="background:#ef44441a;color:#ef4444;font-size:.7rem;font-weight:700;padding:2px 8px;border-radius:20px;">DOUBLON ×${d.count}</span>
            <strong style="font-size:.9rem;">${esc(d.style)}${d.color ? " — " + esc(d.color) : ""}</strong>
            <span style="font-size:.75rem;color:var(--text-muted);margin-left:auto;">📂 ${esc(d.sheetLabel)}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:.3rem;">
            ${d.rows.map((r, i) => {
        const cols = (SHEET_CONFIG[d.sheet]?.cols || []).filter(c => !["Style", "Color", "Colour", "style", "color"].includes(c.key));
        const preview = cols.slice(0, 4).map(c => r[c.key] ? `<span style="color:var(--text-muted);font-size:.73rem;">${esc(c.label)}: <strong style="color:var(--text-primary,#1a1a2e)">${esc(String(r[c.key]).slice(0, 20))}</strong></span>` : "").filter(Boolean).join(" · ");
        return `<div style="background:var(--surface,#fff);border:1px solid var(--border);border-radius:6px;padding:.5rem .8rem;font-size:.8rem;">
                    <span style="color:var(--text-muted);font-size:.7rem;">Ligne ${r._rowIndex}</span>
                    ${preview ? " · " + preview : ""}
                    <button onclick="closeDuplicatesPanel();navigateToRow('${d.sheet}',${r._rowIndex})" style="float:right;background:none;border:none;cursor:pointer;color:var(--primary,#6366f1);font-size:.72rem;font-weight:600;">Voir →</button>
                </div>`;
    }).join("")}
        </div>
    </div>`).join("");
}


// ═══════════════════════════════════════════════════════════════
// ─── FEATURE 2 : BLOCAGES EN CASCADE ──────────────────────────
// ═══════════════════════════════════════════════════════════════

function collectCascadeBlocks() {
    const blocks = [];
    const allStyles = [...new Set([
        ...(state.data.details || []).map(r => r.Style),
        ...(state.data.sample || []).map(r => r.Style),
        ...(state.data.ordering || []).map(r => r.Style),
    ].filter(Boolean))];

    allStyles.forEach(style => {
        const issues = [];

        // Ordering confirmée pour ce style ?
        const orders = (state.data.ordering || []).filter(r => r.Style === style && r.Status === "Confirmed");
        const hasActiveOrder = orders.length > 0;

        // Sample rejetée ou non approuvée + ordering active
        const samplesNotApproved = (state.data.sample || []).filter(r =>
            r.Style === style && r.Approval !== "Approved"
            && (r["Sending Date"] && String(r["Sending Date"]).trim())
        );
        if (hasActiveOrder && samplesNotApproved.length) {
            issues.push({
                type: "sample_block",
                icon: "🧵",
                label: "Sample non approuvée",
                detail: `${samplesNotApproved.length} sample(s) envoyée(s) sans approval — commande(s) confirmée(s) en attente`,
                urgency: "high"
            });
        }

        // Custom menus : fabric/lab en attente + ordering active
        Object.keys(SHEET_CONFIG).filter(k => SHEET_CONFIG[k].custom).forEach(key => {
            const cfg = SHEET_CONFIG[key];
            const det = detectCustomCols(cfg.cols, cfg.label);
            const menuRows = (state.data[key] || []).filter(r => {
                const styleVal = det.style ? r[det.style] : (r.Style || r.style || r.Ref || r.ref);
                return styleVal && String(styleVal).trim() === style;
            });

            menuRows.forEach(r => {
                const approved = det.approval && isApproved(r[det.approval]);
                const hasSending = det.sendingDate && !!(r[det.sendingDate] && String(r[det.sendingDate]).trim());
                const hasLaunch = det.launchDate && !!(r[det.launchDate] && String(r[det.launchDate]).trim());
                const hasReadyDate = det.readyDate && !!(r[det.readyDate] && String(r[det.readyDate]).trim());

                if (!approved && hasActiveOrder) {
                    const pending = hasSending ? "envoyé sans approval"
                        : hasLaunch && !hasReadyDate ? "test en cours sans résultat"
                            : "en cours sans clôture";
                    issues.push({
                        type: "custom_block",
                        icon: "⚗️",
                        label: `${cfg.label} — ${pending}`,
                        detail: `${cfg.label} non clôturé — commande confirmée bloquée potentiellement`,
                        urgency: "mid",
                        sheet: key, rowIndex: r._rowIndex
                    });
                }
            });
        });

        // Ordering late/at-risk + sample pas encore approuvée
        const lateOrders = orders.filter(r => {
            const t = computeDeliveryTrack(r);
            return t.cls === "track-late" || t.cls === "track-atrisk";
        });
        const pendingSamples = (state.data.sample || []).filter(r =>
            r.Style === style && r.Approval !== "Approved"
        );
        if (lateOrders.length && pendingSamples.length) {
            issues.push({
                type: "timing_risk",
                icon: "⏰",
                label: "Timing critique",
                detail: `${lateOrders.length} commande(s) en retard/risque + ${pendingSamples.length} sample(s) pas encore approuvée(s)`,
                urgency: "high"
            });
        }

        if (issues.length) {
            const orderInfo = orders[0] || {};
            blocks.push({
                style,
                client: orderInfo.Client || (state.data.details || []).find(r => r.Style === style)?.Client || "",
                issues,
                maxUrgency: issues.some(i => i.urgency === "high") ? "high" : "mid"
            });
        }
    });

    return blocks;
}



// ═══════════════════════════════════════════════════════════════
// ─── FEATURE 3 : TIMELINE MULTI-MENUS PAR STYLE (Dashboard) ───
// ═══════════════════════════════════════════════════════════════

function buildStyleTimeline() {
    // Collecter tous les styles connus
    const allStyles = [...new Set([
        ...(state.data.details || []).map(r => r.Style),
        ...(state.data.sample || []).map(r => r.Style),
        ...(state.data.ordering || []).map(r => r.Style),
        ...Object.keys(SHEET_CONFIG).filter(k => SHEET_CONFIG[k].custom).flatMap(k => {
            const det = detectCustomCols(SHEET_CONFIG[k].cols, SHEET_CONFIG[k].label);
            return (state.data[k] || []).map(r => det.style ? r[det.style] : r.Style).filter(Boolean);
        })
    ].filter(Boolean))].sort();

    return allStyles.map(style => {
        const detail = (state.data.details || []).find(r => r.Style === style);
        const client = detail?.Client || "";
        const desc = detail?.StyleDescription || detail?.Description || "";
        const stages = [];

        // ── Sample
        const samples = (state.data.sample || []).filter(r => r.Style === style);
        if (samples.length) {
            const allApproved = samples.every(r => r.Approval === "Approved");
            const anyRejected = samples.some(r => r.Approval === "Rejected");
            const anySent = samples.some(r => r["Sending Date"] && String(r["Sending Date"]).trim());
            const status = allApproved ? "done" : anyRejected ? "blocked" : anySent ? "waiting" : "inprogress";
            stages.push({
                label: "Sample", icon: "🧵", status, count: samples.length,
                detail: allApproved ? `${samples.length} approuvée(s)` : anyRejected ? "Rejetée" : anySent ? "En attente approval" : "En cours"
            });
        }

        // ── Custom menus
        Object.keys(SHEET_CONFIG).filter(k => SHEET_CONFIG[k].custom).forEach(key => {
            const cfg = SHEET_CONFIG[key];
            const det = detectCustomCols(cfg.cols, cfg.label);
            const rows = (state.data[key] || []).filter(r => {
                const sv = det.style ? r[det.style] : (r.Style || r.style || r.Ref || r.ref);
                return sv && String(sv).trim() === style;
            });
            if (!rows.length) return;
            const allApproved = rows.every(r => det.approval && isApproved(r[det.approval]));
            const anySent = rows.some(r => det.sendingDate && r[det.sendingDate] && String(r[det.sendingDate]).trim());
            const anyLaunched = rows.some(r => det.launchDate && r[det.launchDate] && String(r[det.launchDate]).trim());
            const anyReady = rows.some(r => det.readyDate && r[det.readyDate] && String(r[det.readyDate]).trim());
            const status = allApproved ? "done"
                : (anySent || anyLaunched) && !anyReady ? "waiting"
                    : anySent || anyLaunched ? "inprogress" : "pending";
            const icon = det.isFabricAnalysis ? "🧪" : "🎨";
            stages.push({
                label: cfg.label, icon, status,
                detail: allApproved ? "Approuvé" : anySent || anyLaunched ? anyReady ? "Résultat reçu" : "En attente résultat" : "En cours"
            });
        });

        // ── Ordering
        const orders = (state.data.ordering || []).filter(r => r.Style === style && r.Status !== "Cancelled");
        if (orders.length) {
            const allDelivered = orders.every(r => r["Delivery Status"] === "Delivered");
            const anyLate = orders.some(r => computeDeliveryTrack(r).cls === "track-late");
            const anyRisk = orders.some(r => computeDeliveryTrack(r).cls === "track-atrisk");
            const status = allDelivered ? "done" : anyLate ? "blocked" : anyRisk ? "waiting" : "inprogress";
            stages.push({
                label: "Ordering", icon: "📦", status, count: orders.length,
                detail: allDelivered ? "Livré" : anyLate ? "En retard" : anyRisk ? "À risque" : `${orders.length} commande(s)`
            });
        }

        return { style, client, desc, stages };
    }).filter(s => s.stages.length > 0);
}

function renderStyleTimelineSection() {
    const data = buildStyleTimeline();
    if (!data.length) return '<p style="color:var(--text-muted);padding:1rem 0;">Aucune donnée de style disponible.</p>';

    const STATUS_CFG = {
        done: { color: "#10b981", bg: "#10b9811a", label: "✓" },
        waiting: { color: "#f59e0b", bg: "#f59e0b1a", label: "⏳" },
        inprogress: { color: "#6366f1", bg: "#6366f11a", label: "◉" },
        blocked: { color: "#ef4444", bg: "#ef44441a", label: "✗" },
        pending: { color: "#94a3b8", bg: "#94a3b81a", label: "○" },
    };

    return data.map(s => {
        const stagesHtml = s.stages.map((stage, i) => {
            const cfg = STATUS_CFG[stage.status] || STATUS_CFG.pending;
            const connector = i < s.stages.length - 1
                ? `<div style="flex:1;height:2px;background:linear-gradient(90deg,${cfg.color}66,${STATUS_CFG[s.stages[i + 1]?.status || 'pending'].color}33);margin:0 2px;align-self:center;min-width:12px;"></div>`
                : "";
            return `<div style="display:flex;align-items:center;">
                <div style="display:flex;flex-direction:column;align-items:center;gap:3px;min-width:64px;max-width:80px;">
                    <div style="width:32px;height:32px;border-radius:50%;background:${cfg.bg};border:2px solid ${cfg.color};display:flex;align-items:center;justify-content:center;font-size:.85rem;cursor:default;" title="${esc(stage.label)} — ${esc(stage.detail)}">${stage.icon}</div>
                    <span style="font-size:.62rem;font-weight:600;color:${cfg.color};text-transform:uppercase;letter-spacing:.3px;text-align:center;line-height:1.2;">${esc(stage.label)}</span>
                    <span style="font-size:.6rem;color:var(--text-muted);text-align:center;line-height:1.2;">${esc(stage.detail)}</span>
                </div>
                ${connector}
            </div>`;
        }).join("");

        // Statut global
        const hasBlocked = s.stages.some(st => st.status === "blocked");
        const hasWaiting = s.stages.some(st => st.status === "waiting");
        const allDone = s.stages.every(st => st.status === "done");
        const globalColor = allDone ? "#10b981" : hasBlocked ? "#ef4444" : hasWaiting ? "#f59e0b" : "#6366f1";
        const globalLabel = allDone ? "Complet" : hasBlocked ? "Bloqué" : hasWaiting ? "En attente" : "En cours";

        return `<div style="background:var(--surface,#fff);border:1px solid var(--border);border-radius:12px;padding:1rem 1.2rem;margin-bottom:.7rem;">
            <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.8rem;">
                <strong style="font-size:.88rem;">${esc(s.style)}</strong>
                ${s.client ? `<span class="client-badge" style="font-size:.65rem;">${esc(s.client)}</span>` : ""}
                ${s.desc ? `<span style="font-size:.75rem;color:var(--text-muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(s.desc)}</span>` : ""}
                <span style="margin-left:auto;font-size:.68rem;font-weight:700;color:${globalColor};background:${globalColor}1a;padding:2px 8px;border-radius:20px;white-space:nowrap;">${globalLabel}</span>
            </div>
            <div style="display:flex;align-items:flex-start;overflow-x:auto;padding-bottom:4px;">${stagesHtml}</div>
        </div>`;
    }).join("");
}

// ── Styles à Risque ───────────────────────────────────────────
function collectAtRiskStyles() {
    const safeDiff = v => { if (!v) return null; const d = _daysDiff(v); return isNaN(d) ? null : d; };

    const allStyles = [...new Set([
        ...(state.data.details || []).map(r => r.Style),
        ...(state.data.sample || []).map(r => r.Style),
        ...(state.data.ordering || []).map(r => r.Style),
    ].filter(Boolean))];

    const results = [];
    allStyles.forEach(style => {
        const flags = []; let score = 0;
        const detail = (state.data.details || []).find(r => r.Style === style);
        const client = detail?.Client || (state.data.ordering || []).find(r => r.Style === style)?.Client || "";
        const desc = detail?.StyleDescription || detail?.Description || "";

        const psdDiff = safeDiff(detail?.PSD);
        if (psdDiff !== null) {
            if (psdDiff < 0) { flags.push({ icon: "📅", label: `PSD dépassée de ${Math.abs(psdDiff)}j (${_fmtDate(detail.PSD)})`, urgency: "high" }); score += 2; }
            else if (psdDiff <= 7) { flags.push({ icon: "📅", label: `PSD dans ${psdDiff}j (${_fmtDate(detail.PSD)})`, urgency: psdDiff <= 3 ? "high" : "mid" }); score += 1; }
        }

        const exftyDiff = safeDiff(detail?.["Ex-Fty"] ?? detail?.ExFty);
        if (exftyDiff !== null) {
            if (exftyDiff < 0) { flags.push({ icon: "🚢", label: `Ex-Fty dépassée de ${Math.abs(exftyDiff)}j (${_fmtDate(detail.ExFty)})`, urgency: "high" }); score += 2; }
            else if (exftyDiff <= 14) { flags.push({ icon: "🚢", label: `Ex-Fty dans ${exftyDiff}j (${_fmtDate(detail.ExFty)})`, urgency: exftyDiff <= 7 ? "high" : "mid" }); score += 1; }
        }

        const activeOrders = (state.data.ordering || []).filter(r => r.Style === style && r.Status === "Confirmed" && r["Delivery Status"] !== "Delivered");
        if (activeOrders.length) { flags.push({ icon: "📦", label: `${activeOrders.length} commande${activeOrders.length > 1 ? "s" : ""} confirmée${activeOrders.length > 1 ? "s" : ""} non livrée${activeOrders.length > 1 ? "s" : ""}`, urgency: "mid" }); score += 1; }

        const pendingSamples = (state.data.sample || []).filter(r => r.Style === style && !isApproved(r.Approval) && isSent(r["Sending Date"]));
        if (pendingSamples.length) { flags.push({ icon: "🧵", label: `${pendingSamples.length} sample${pendingSamples.length > 1 ? "s" : ""} envoyée${pendingSamples.length > 1 ? "s" : ""} sans approval`, urgency: "mid" }); score += 1; }

        if (flags.length >= 2) results.push({ style, client, desc, flags, score, maxUrgency: flags.some(f => f.urgency === "high") ? "high" : "mid" });
    });
    return results.sort((a, b) => b.score - a.score);
}

function renderAtRiskSection(risks) {
    if (!risks || !risks.length) return `<div style="text-align:center;padding:1.2rem;color:var(--text-muted);font-size:.8rem;">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20" style="display:block;margin:0 auto .4rem;opacity:.4"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        Aucun style à risque détecté</div>`;
    return risks.map(r => {
        const urgColor = r.maxUrgency === "high" ? "#ef4444" : "#f59e0b";
        const scoreBg = r.score >= 4 ? "#fee2e2" : r.score >= 2 ? "#fef3c7" : "#f1f5f9";
        const scoreColor = r.score >= 4 ? "#b91c1c" : r.score >= 2 ? "#92400e" : "#475569";
        return `<div style="border-left:3px solid ${urgColor};background:${r.maxUrgency === "high" ? "#fff0f0" : "#fffbeb"};border-top:0.5px solid ${urgColor}33;border-right:0.5px solid ${urgColor}33;border-bottom:0.5px solid ${urgColor}33;border-radius:0 8px 8px 0;padding:.7rem 1rem;margin-bottom:.5rem;">
            <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.35rem;flex-wrap:wrap;">
                <strong style="font-size:.85rem;">${esc(r.style)}</strong>
                ${r.client ? `<span class="client-badge" style="font-size:.62rem;">${esc(r.client)}</span>` : ""}
                ${r.desc ? `<span style="font-size:.72rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px;">${esc(r.desc)}</span>` : ""}
                <span style="margin-left:auto;font-size:.68rem;font-weight:700;background:${scoreBg};color:${scoreColor};padding:2px 8px;border-radius:20px;">Score ${r.score}</span>
            </div>
            ${r.flags.map(f => `<div style="font-size:.75rem;color:var(--text-secondary,#64748b);line-height:1.6;">${f.icon} ${esc(f.label)}</div>`).join("")}
        </div>`;
    }).join("");
}


let _timelineShowAll = false;
function toggleStyleTimeline() {
    _timelineShowAll = !_timelineShowAll;
    const btn = document.getElementById("btn-toggle-timeline");
    if (btn) btn.textContent = _timelineShowAll ? "Réduire" : "Voir tout";
    _refreshDashboardIntelligence();
}

function _refreshDashboardIntelligence() {
    const tlBody = document.getElementById("style-timeline-body");
    const arBody = document.getElementById("atrisk-body");
    const tlCount = document.getElementById("timeline-style-count");
    const arCount = document.getElementById("atrisk-count");

    if (tlBody) {
        const allData = buildStyleTimeline();
        if (tlCount) tlCount.textContent = `${allData.length} style${allData.length > 1 ? "s" : ""}`;
        const toShow = _timelineShowAll ? allData : allData.slice(0, 5);
        const full = buildStyleTimeline; // re-use but limit
        const html = toShow.length ? toShow.map(s => {
            const STATUS_CFG = {
                done: { color: "#10b981", bg: "#10b9811a" },
                waiting: { color: "#f59e0b", bg: "#f59e0b1a" },
                inprogress: { color: "#6366f1", bg: "#6366f11a" },
                blocked: { color: "#ef4444", bg: "#ef44441a" },
                pending: { color: "#94a3b8", bg: "#94a3b81a" },
            };
            const stagesHtml = s.stages.map((stage, i) => {
                const cfg = STATUS_CFG[stage.status] || STATUS_CFG.pending;
                const nextCfg = STATUS_CFG[s.stages[i + 1]?.status || "pending"] || STATUS_CFG.pending;
                const connector = i < s.stages.length - 1
                    ? `<div style="flex:1;height:2px;background:linear-gradient(90deg,${cfg.color}88,${nextCfg.color}44);margin:0 2px;align-self:20px;min-width:10px;margin-top:15px;"></div>`
                    : "";
                return `<div style="display:flex;align-items:flex-start;">
                    <div style="display:flex;flex-direction:column;align-items:center;gap:2px;min-width:60px;max-width:76px;">
                        <div style="width:30px;height:30px;border-radius:50%;background:${cfg.bg};border:2px solid ${cfg.color};display:flex;align-items:center;justify-content:center;font-size:.8rem;" title="${esc(stage.label)} — ${esc(stage.detail)}">${stage.icon}</div>
                        <span style="font-size:.6rem;font-weight:600;color:${cfg.color};text-align:center;line-height:1.2;">${esc(stage.label)}</span>
                        <span style="font-size:.58rem;color:var(--text-muted);text-align:center;line-height:1.2;">${esc(stage.detail)}</span>
                    </div>${connector}
                </div>`;
            }).join("");

            const hasBlocked = s.stages.some(st => st.status === "blocked");
            const hasWaiting = s.stages.some(st => st.status === "waiting");
            const allDone = s.stages.every(st => st.status === "done");
            const gc = allDone ? "#10b981" : hasBlocked ? "#ef4444" : hasWaiting ? "#f59e0b" : "#6366f1";
            const gl = allDone ? "Complet" : hasBlocked ? "Bloqué" : hasWaiting ? "En attente" : "En cours";

            return `<div style="background:var(--surface,#fff);border:1px solid var(--border);border-radius:10px;padding:.9rem 1.1rem;margin-bottom:.6rem;">
                <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.7rem;flex-wrap:wrap;">
                    <strong style="font-size:.85rem;">${esc(s.style)}</strong>
                    ${s.client ? `<span class="client-badge" style="font-size:.62rem;">${esc(s.client)}</span>` : ""}
                    ${s.desc ? `<span style="font-size:.72rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;">${esc(s.desc)}</span>` : ""}
                    <span style="margin-left:auto;font-size:.65rem;font-weight:700;color:${gc};background:${gc}1a;padding:2px 8px;border-radius:20px;">${gl}</span>
                </div>
                <div style="display:flex;align-items:flex-start;overflow-x:auto;padding-bottom:2px;">${stagesHtml}</div>
            </div>`;
        }).join("") : `<p style="color:var(--text-muted);font-size:.8rem;padding:.5rem 0;">Aucun style avec données multi-menus.</p>`;
        tlBody.innerHTML = html;
        if (!_timelineShowAll && allData.length > 5) {
            tlBody.insertAdjacentHTML("beforeend", `<p style="text-align:center;font-size:.75rem;color:var(--text-muted);margin-top:.4rem;">+${allData.length - 5} styles — cliquez "Voir tout"</p>`);
        }
    }

    if (arBody) {
        const risks = collectAtRiskStyles();
        if (arCount) arCount.textContent = risks.length ? `${risks.length} style${risks.length > 1 ? "s" : ""}` : "Aucun";
        arBody.innerHTML = renderAtRiskSection(risks);
    }
}

// ─── Dashboard Filters ────────────────────────────────────────
let _dbFilterState = { search: "", client: "", saison: "" };

function populateDashboardFilters() {
    const details = state.data.details || [];
    const clients = [...new Set(details.map(r => r.Client).filter(Boolean))].sort();
    const saisons = [...new Set(details.map(r => r.Saison || r["Saison"] || "").filter(Boolean))].sort();

    const clientSel = document.getElementById("db-client-filter");
    const saisonSel = document.getElementById("db-saison-filter");
    if (!clientSel || !saisonSel) return;

    const prevClient = clientSel.value;
    const prevSaison = saisonSel.value;

    clientSel.innerHTML = '<option value="">Tous les clients</option>' +
        clients.map(c => `<option value="${esc(c)}" ${c === prevClient ? "selected" : ""}>${esc(c)}</option>`).join("");
    saisonSel.innerHTML = '<option value="">Toutes les saisons</option>' +
        saisons.map(s => `<option value="${esc(s)}" ${s === prevSaison ? "selected" : ""}>${esc(s)}</option>`).join("");
}

function setupDashboardFilters() {
    const searchEl = document.getElementById("db-search");
    const clientEl = document.getElementById("db-client-filter");
    const saisonEl = document.getElementById("db-saison-filter");
    if (!searchEl) return;

    searchEl.addEventListener("input", () => {
        _dbFilterState.search = searchEl.value.toLowerCase().trim();
        applyDashboardFilters();
    });
    clientEl.addEventListener("change", () => {
        _dbFilterState.client = clientEl.value;
        clientEl.classList.toggle("active", !!clientEl.value);
        applyDashboardFilters();
    });
    saisonEl.addEventListener("change", () => {
        _dbFilterState.saison = saisonEl.value;
        saisonEl.classList.toggle("active", !!saisonEl.value);
        applyDashboardFilters();
    });
}

function resetDashboardFilters() {
    _dbFilterState = { search: "", client: "", saison: "" };
    const searchEl = document.getElementById("db-search");
    const clientEl = document.getElementById("db-client-filter");
    const saisonEl = document.getElementById("db-saison-filter");
    if (searchEl) searchEl.value = "";
    if (clientEl) { clientEl.value = ""; clientEl.classList.remove("active"); }
    if (saisonEl) { saisonEl.value = ""; saisonEl.classList.remove("active"); }
    applyDashboardFilters();
}

function applyDashboardFilters() {
    const { search, client, saison } = _dbFilterState;
    const ds = document.getElementById("dashboard-screen");
    if (!ds) return;

    const saisonBlocks = ds.querySelectorAll(".dbs-szn-block");
    let anyVisible = false;

    saisonBlocks.forEach(block => {
        // ── Saison filter
        const pillEl = block.querySelector(".dbs-szn-pill");
        const blockSaison = pillEl ? pillEl.textContent.trim() : "";
        if (saison && blockSaison !== saison) {
            block.classList.add("db-hidden");
            return;
        }
        block.classList.remove("db-hidden");

        let anyClientVisible = false;
        const clientBlocks = block.querySelectorAll(".dbs-cli-block");

        clientBlocks.forEach(cb => {
            // ── Client filter
            const clientNameEl = cb.querySelector(".dbs-cli-name");
            const blockClient = clientNameEl ? clientNameEl.textContent.trim() : "";
            if (client && blockClient !== client) {
                cb.classList.add("db-hidden");
                return;
            }
            cb.classList.remove("db-hidden");

            // ── Search filter at card level using data-attributes
            const styleCards = cb.querySelectorAll(".dbs-sc");
            let anyCardVisible = false;

            styleCards.forEach(card => {
                if (!search) {
                    card.classList.remove("db-hidden");
                    anyCardVisible = true;
                    return;
                }
                const styleVal  = (card.dataset.style  || "");
                const descVal   = (card.dataset.desc   || "");
                const fabricVal = (card.dataset.fabric || "");
                const clientVal = (card.dataset.client || "");
                const combined  = styleVal + " " + descVal + " " + fabricVal + " " + clientVal;
                if (combined.includes(search)) {
                    card.classList.remove("db-hidden");
                    anyCardVisible = true;
                } else {
                    card.classList.add("db-hidden");
                }
            });

            // Show/hide dept groups based on visible cards
            cb.querySelectorAll(".dbs-dept-grp").forEach(grp => {
                const hasVisible = grp.querySelectorAll(".dbs-sc:not(.db-hidden)").length > 0;
                grp.classList.toggle("db-hidden", !hasVisible);
            });

            if (!anyCardVisible && search) {
                cb.classList.add("db-hidden");
            } else {
                anyClientVisible = true;
            }
        });

        if (!anyClientVisible && (client || search)) {
            block.classList.add("db-hidden");
        } else {
            anyVisible = true;
        }
    });

    // Show/hide no results message
    let noResultsEl = ds.querySelector(".db-no-results");
    if (!anyVisible && (search || client || saison)) {
        if (!noResultsEl) {
            noResultsEl = document.createElement("div");
            noResultsEl.className = "db-no-results";
            noResultsEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="36" height="36"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg><p>Aucun résultat pour ces filtres.</p>`;
            ds.appendChild(noResultsEl);
        }
    } else if (noResultsEl) {
        noResultsEl.remove();
    }
}




// ─── Image Lightbox ───────────────────────────────────────────
function openImageLightbox(src, label, description) {
    // Remove existing lightbox if any
    const existing = document.getElementById("img-lightbox-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "img-lightbox-overlay";
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(0,0,0,0.85);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        cursor: zoom-out;
        animation: lbFadeIn 0.18s ease;
    `;

    overlay.innerHTML = `
        <style>
            @keyframes lbFadeIn { from { opacity:0; } to { opacity:1; } }
            @keyframes lbScaleIn { from { opacity:0; transform:scale(0.88); } to { opacity:1; transform:scale(1); } }
            #img-lightbox-overlay img {
                max-width: 90vw;
                max-height: 85vh;
                object-fit: contain;
                border-radius: 10px;
                box-shadow: 0 8px 48px rgba(0,0,0,0.6);
                animation: lbScaleIn 0.2s ease;
                cursor: default;
            }
            #img-lightbox-label {
                margin-top: 14px;
                color: rgba(255,255,255,0.85);
                font-size: 13px;
                letter-spacing: 0.08em;
                font-family: inherit;
            }
            #img-lightbox-close {
                position: absolute;
                top: 18px; right: 22px;
                background: rgba(255,255,255,0.12);
                border: none;
                color: #fff;
                font-size: 22px;
                width: 38px; height: 38px;
                border-radius: 50%;
                cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                transition: background 0.15s;
            }
            #img-lightbox-close:hover { background: rgba(255,255,255,0.25); }
        </style>
        <button id="img-lightbox-close" onclick="event.stopPropagation(); document.getElementById('img-lightbox-overlay').remove()">✕</button>
        <img src="${src}" alt="${label}" onclick="event.stopPropagation()"/>
        ${label ? `<div id="img-lightbox-label"><span style="font-weight:600;letter-spacing:0.1em">${label}</span>${description ? `<span style="opacity:0.6;margin-left:8px;font-weight:400">${description}</span>` : ""}</div>` : ""}
    `;

    // Close on overlay click
    overlay.addEventListener("click", () => overlay.remove());

    // Close on Escape key
    const escHandler = (e) => {
        if (e.key === "Escape") {
            overlay.remove();
            document.removeEventListener("keydown", escHandler);
        }
    };
    document.addEventListener("keydown", escHandler);

    document.body.appendChild(overlay);
}


// ─── Details : toggle ligne expansible ───────────────────────
function detToggleExpand(expandId, chevronId) {
    const row = document.getElementById(expandId);
    const chv = document.getElementById(chevronId);
    if (!row || !chv) return;
    const isOpen = row.style.display !== "none";
    row.style.display = isOpen ? "none" : "";
    chv.classList.toggle("open", !isOpen);
}


// ─── Details : clic sur badge client → filtre ─────────────────
function detFilterByClient(clientName) {
    // Toggle : si déjà filtré sur ce client, on enlève le filtre
    if (state.filterClient === clientName) {
        state.filterClient = "";
    } else {
        state.filterClient = clientName;
    }
    // Sync le <select> client-filter
    const cf = document.getElementById("client-filter");
    if (cf) cf.value = state.filterClient;
    applyFilters();
}


// ─── Details : état des accordéons client + style + filtre dept ──
const _detClientOpen = new Set();
const _detStyleOpen  = new Set();
const _detDeptFilter = {};  // { clientName: deptActif }

function detToggleClient(clientName) {
    if (_detClientOpen.has(clientName)) _detClientOpen.delete(clientName);
    else _detClientOpen.add(clientName);
    renderTable();
}

function detToggleStyleExpand(rowIdx) {
    if (_detStyleOpen.has(rowIdx)) _detStyleOpen.delete(rowIdx);
    else _detStyleOpen.add(rowIdx);
    renderTable();
}

function detSetDept(clientName, dept) {
    _detDeptFilter[clientName] = dept;
    renderTable();
}


// ============================================================
// AWB TRACKING — Patch intégré directement dans app.js
// ============================================================

const _awbTrackCache = {};

// ─── Lancer le tracking ───────────────────────────────────────
async function awbDoTrack(btn, awb) {
    const td = btn ? btn.closest("td") : null;
    const tr = btn ? btn.closest("tr") : null;
    if (td) td.innerHTML = `<span style="display:inline-block;width:12px;height:12px;border:2px solid #FAC775;border-top-color:#BA7517;border-radius:50%;animation:awb-spin 0.8s linear infinite;vertical-align:middle;"></span>`;
    document.querySelectorAll("#table-body tr.awb-active-row").forEach(r => r.classList.remove("awb-active-row"));
    if (tr) tr.classList.add("awb-active-row");
    _awbOpenPanel(awb, null);
    if (_awbTrackCache[awb]) {
        if (td) _awbFillCell(td, awb);
        _awbRenderPanel(awb, _awbTrackCache[awb]);
        return;
    }
    const tds = tr ? Array.from(tr.querySelectorAll("td")) : [];
    const style = tds[2]?.textContent?.trim() || "";
    const prompt = `Tu es un système DHL. AWB "${awb}" style: ${style}. Réponds UNIQUEMENT en JSON (aucun texte autour):
{"awb":"${awb}","status":"En transit","statusCode":"transit","origin":"Shanghai, Chine","destination":"Antananarivo, Madagascar","estimatedDelivery":"19 Mar 2026","weight":"2.5 kg","service":"DHL Express Worldwide","events":[{"title":"Colis pris en charge","location":"Shanghai, Chine","time":"13 Mar 2026 – 09:00","state":"done"},{"title":"Départ hub d'origine","location":"Shanghai Pudong Airport","time":"14 Mar 2026 – 22:40","state":"done"},{"title":"Transit international","location":"Dubai, EAU","time":"15 Mar 2026 – 14:15","state":"current"},{"title":"Arrivée hub local","location":"Antananarivo, Madagascar","time":"17 Mar 2026","state":"pending"},{"title":"En cours de livraison","location":"Antananarivo, Madagascar","time":"18 Mar 2026","state":"pending"},{"title":"Livré","location":"Antananarivo, Madagascar","time":"19 Mar 2026","state":"pending"}]}
statusCode: transit|delivered|pending|exception. JSON uniquement.`;
    try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 800, messages: [{ role: "user", content: prompt }] })
        });
        const d = await r.json();
        const raw = d.content?.map(i => i.text || "").join("").trim().replace(/```json|```/g, "").trim();
        const info = JSON.parse(raw);
        _awbTrackCache[awb] = info;
        if (td) _awbFillCell(td, awb);
        _awbRenderPanel(awb, info);
    } catch(e) {
        if (td) td.innerHTML = `<button class="btn awb-track-btn" onclick="awbDoTrack(this,'${awb.replace(/'/g,"\\'")}')">Réessayer</button>`;
        const pc = document.getElementById("awb-panel-content");
        if (pc) pc.innerHTML = `<div style="padding:2rem;text-align:center;color:#791F1F;font-size:13px;">Erreur. Vérifiez le numéro AWB.</div>`;
    }
}

function _awbFillCell(td, awb) {
    const info = _awbTrackCache[awb];
    if (!info) return;
    const cls = _awbPillClass(info.statusCode);
    td.innerHTML = `<span class="awb-status-pill ${cls}" onclick="awbShowPanel('${awb.replace(/'/g,"\\'")}', this.closest('tr'))"><span class="awb-pdot"></span>${info.status}</span>`;
}

function awbShowPanel(awb, tr) {
    document.querySelectorAll("#table-body tr.awb-active-row").forEach(r => r.classList.remove("awb-active-row"));
    if (tr) tr.classList.add("awb-active-row");
    const info = _awbTrackCache[awb];
    if (!info) return;
    _awbOpenPanel(awb, null);
    _awbRenderPanel(awb, info);
}

function awbClosePanel() {
    const p = document.getElementById("awb-track-panel");
    if (p) { p.style.width = "0"; p.style.overflow = "hidden"; }
    document.querySelectorAll("#table-body tr.awb-active-row").forEach(r => r.classList.remove("awb-active-row"));
}

function _awbOpenPanel(awb, info) {
    _awbEnsurePanel();
    _awbInjectStyles();
    const p = document.getElementById("awb-track-panel");
    if (p) { p.style.width = "340px"; p.style.overflow = ""; }
    const pc = document.getElementById("awb-panel-content");
    if (!pc) return;
    if (!info) {
        pc.innerHTML = `<div style="padding:2.5rem 1.25rem;text-align:center;color:#9ca3af;font-size:13px;">
            <div style="width:22px;height:22px;border:2.5px solid #FAC775;border-top-color:#BA7517;border-radius:50%;animation:awb-spin 0.8s linear infinite;margin:0 auto 12px;"></div>
            Chargement…<div style="font-size:11px;color:#bbb;margin-top:6px;font-family:monospace;">${awb}</div></div>`;
    }
}

function _awbRenderPanel(awb, info) {
    const pc = document.getElementById("awb-panel-content");
    if (!pc) return;
    const cls = _awbPillClass(info.statusCode);
    const evts = info.events.map((ev, i) => {
        const last = i === info.events.length - 1;
        return `<div style="display:flex;gap:10px;">
            <div style="display:flex;flex-direction:column;align-items:center;">
                <div style="width:9px;height:9px;border-radius:50%;flex-shrink:0;margin-top:3px;${ev.state==='done'?'background:#1D9E75':ev.state==='current'?'background:#BA7517;box-shadow:0 0 0 3px rgba(186,117,23,.18)':'background:#d1d5db'}"></div>
                ${!last ? '<div style="width:1px;background:#e5e7eb;flex:1;min-height:14px;margin:3px 0;"></div>' : ''}
            </div>
            <div style="padding-bottom:.875rem;flex:1;">
                <div style="font-size:12px;font-weight:600;color:var(--text-primary,#111);">${ev.title}</div>
                <div style="font-size:11px;color:#6b7280;margin-top:2px;">${ev.location}</div>
                <div style="font-size:10px;color:#9ca3af;margin-top:2px;">${ev.time}</div>
            </div>
        </div>`;
    }).join("");
    pc.innerHTML = `
        <div style="padding:.9rem 1.25rem .8rem;border-bottom:1px solid var(--border,#e5e7eb);background:var(--surface-2,#fafafa);display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
            <div style="flex:1;">
                <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px;">AWB · ${info.service||'DHL Express'}</div>
                <div style="font-size:16px;font-weight:700;font-family:monospace;color:var(--text-primary,#111);">${info.awb}</div>
                <div style="margin-top:7px;"><span class="awb-status-pill ${cls}" style="cursor:default;"><span class="awb-pdot"></span>${info.status}</span></div>
            </div>
            <button onclick="awbClosePanel()" style="background:none;border:none;font-size:15px;color:#9ca3af;cursor:pointer;padding:2px 6px;border-radius:5px;">✕</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--border,#e5e7eb);">
            <div style="padding:.7rem 1.25rem;border-right:1px solid var(--border,#e5e7eb);"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">Origine</div><div style="font-size:12px;font-weight:600;color:var(--text-primary,#111);">${info.origin}</div></div>
            <div style="padding:.7rem 1.25rem;"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">Destination</div><div style="font-size:12px;font-weight:600;color:var(--text-primary,#111);">${info.destination}</div></div>
            <div style="padding:.7rem 1.25rem;border-right:1px solid var(--border,#e5e7eb);border-top:1px solid var(--border,#e5e7eb);"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">Livraison est.</div><div style="font-size:12px;font-weight:600;color:var(--text-primary,#111);">${info.estimatedDelivery}</div></div>
            <div style="padding:.7rem 1.25rem;border-top:1px solid var(--border,#e5e7eb);"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">Poids</div><div style="font-size:12px;font-weight:600;color:var(--text-primary,#111);">${info.weight||'—'}</div></div>
        </div>
        <div style="padding:1rem 1.25rem;">
            <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.07em;margin-bottom:.875rem;">Historique</div>
            ${evts}
        </div>`;
}

function _awbPillClass(code) {
    return {transit:"awb-p-transit",delivered:"awb-p-delivered",pending:"awb-p-pending",exception:"awb-p-exception"}[code]||"awb-p-transit";
}

function _awbEnsurePanel() {
    if (document.getElementById("awb-track-panel")) return;
    // Trouver le conteneur principal du tableau
    const tableCard = document.getElementById("table-card-wrap");
    if (!tableCard) return;
    // S'assurer que table-card-wrap est flex
    tableCard.style.display = "flex";
    tableCard.style.alignItems = "flex-start";
    tableCard.style.overflow = "visible";
    // Wrapper le contenu existant
    if (!tableCard.querySelector(".awb-table-inner")) {
        const inner = document.createElement("div");
        inner.className = "awb-table-inner";
        inner.style.cssText = "flex:1;min-width:0;overflow-x:auto;";
        while (tableCard.firstChild) inner.appendChild(tableCard.firstChild);
        tableCard.appendChild(inner);
    }
    // Créer le panneau
    const panel = document.createElement("div");
    panel.id = "awb-track-panel";
    panel.style.cssText = "width:0;overflow:hidden;transition:width 0.3s ease;border-left:1px solid var(--border,#e5e7eb);background:var(--surface,#fff);flex-shrink:0;min-height:400px;";
    panel.innerHTML = `<div id="awb-panel-content"></div>`;
    tableCard.appendChild(panel);
}

function _awbInjectStyles() {
    if (document.getElementById("awb-track-styles")) return;
    const s = document.createElement("style");
    s.id = "awb-track-styles";
    s.textContent = `
@keyframes awb-spin { to { transform: rotate(360deg); } }
.awb-track-btn { padding:4px 11px;background:#BA7517;color:#fff;border:none;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;transition:background .15s; }
.awb-track-btn:hover { background:#854F0B; }
.awb-status-pill { display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap; }
.awb-status-pill:hover { opacity:.8; }
.awb-p-transit   { background:#E6F1FB;color:#0C447C; }
.awb-p-delivered { background:#EAF3DE;color:#27500A; }
.awb-p-pending   { background:#FAEEDA;color:#633806; }
.awb-p-exception { background:#FCEBEB;color:#791F1F; }
.awb-pdot { width:6px;height:6px;border-radius:50%;flex-shrink:0;background:currentColor;opacity:.7; }
tr.awb-active-row td { background:#fff8ec !important; }
`;
    document.head.appendChild(s);
}
//CHATBOT
(function () {

  const API_URL = "https://script.google.com/macros/s/AKfycbzH9VLWE0okFUDDlTBunZILXRrByhf0OrBkPlJGrCZBFzmKBpZiPYwDVDJF4Js4g_lb/exec";

  // ── Récupérer le nom utilisateur ──────────────────────────────
  function getUserName() {
    // Source principale : Firebase window.currentUser.displayName
    if (window.currentUser && window.currentUser.displayName) {
      return window.currentUser.displayName.trim().split(" ")[0];
    }
    // Fallback : élément HTML #usm-name (modal "Mon compte")
    const el = document.getElementById("usm-name");
    if (el && el.textContent.trim() && el.textContent.trim() !== "—") {
      return el.textContent.trim().split(" ")[0];
    }
    return "vous";
  }

  // ── Styles ────────────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

    #fu-chatbot-btn {
      position: fixed; bottom: 28px; right: 28px;
      width: 56px; height: 56px; border-radius: 50%;
      background: linear-gradient(135deg, #0f3460, #533483);
      border: none; cursor: pointer;
      box-shadow: 0 4px 24px rgba(83,52,131,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 10001; transition: transform 0.2s, box-shadow 0.2s;
    }
    #fu-chatbot-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 32px rgba(83,52,131,0.65);
    }
    #fu-chatbot-btn svg { width: 24px; height: 24px; }

    #fu-notif-badge {
      position: absolute; top: -2px; right: -2px;
      width: 14px; height: 14px; border-radius: 50%;
      background: #e74c3c; border: 2px solid white;
      display: none;
    }

    #fu-chatbot-panel {
      position: fixed; bottom: 96px; right: 28px;
      width: 380px; height: 560px;
      background: #f8f9fc;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.18);
      display: flex; flex-direction: column;
      overflow: hidden; z-index: 10000;
      font-family: 'Inter', sans-serif;
      transform: translateY(20px) scale(0.95);
      opacity: 0; pointer-events: none;
      transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    #fu-chatbot-panel.open {
      transform: translateY(0) scale(1);
      opacity: 1; pointer-events: all;
    }

    #fu-chat-header {
      padding: 16px 18px;
      background: linear-gradient(135deg, #0f3460 0%, #533483 100%);
      color: white;
      display: flex; align-items: center; gap: 12px;
      flex-shrink: 0;
    }
    #fu-header-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
    }
    #fu-header-info { flex: 1; }
    #fu-header-title { font-weight: 600; font-size: 14px; }
    #fu-header-sub {
      font-size: 11px; opacity: 0.75; margin-top: 1px;
      display: flex; align-items: center; gap: 4px;
    }
    #fu-online-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #2ecc71; display: inline-block;
    }
    #fu-close-btn {
      background: rgba(255,255,255,0.15); border: none;
      color: white; width: 28px; height: 28px;
      border-radius: 8px; cursor: pointer; font-size: 14px;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
      position: relative; z-index: 10001;
      pointer-events: all !important;
    }
    #fu-close-btn:hover { background: rgba(255,255,255,0.25); }

    #fu-chat-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 12px;
      scroll-behavior: smooth;
    }
    #fu-chat-messages::-webkit-scrollbar { width: 4px; }
    #fu-chat-messages::-webkit-scrollbar-track { background: transparent; }
    #fu-chat-messages::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }

    .fu-msg-wrap { display: flex; flex-direction: column; gap: 2px; }
    .fu-msg-wrap.user { align-items: flex-end; }
    .fu-msg-wrap.bot { align-items: flex-start; }

    .fu-msg {
      padding: 10px 14px; border-radius: 16px;
      font-size: 13px; max-width: 82%; line-height: 1.55;
      white-space: pre-wrap; word-break: break-word;
    }
    .fu-msg.bot {
      background: white; color: #1a1a2e;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.07);
    }
    .fu-msg.user {
      background: linear-gradient(135deg, #0f3460, #533483);
      color: white; border-bottom-right-radius: 4px;
    }
    .fu-msg-time {
      font-size: 10px; color: #aaa; padding: 0 4px;
    }

    .fu-typing {
      display: flex; align-items: center; gap: 4px;
      padding: 12px 16px; background: white;
      border-radius: 16px; border-bottom-left-radius: 4px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.07);
      width: fit-content;
    }
    .fu-typing span {
      width: 7px; height: 7px; border-radius: 50%;
      background: #0f3460; opacity: 0.4;
      animation: fu-bounce 1.2s infinite;
    }
    .fu-typing span:nth-child(2) { animation-delay: 0.2s; }
    .fu-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes fu-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-5px); opacity: 1; }
    }

    #fu-suggestions {
      padding: 0 12px 10px;
      display: flex; gap: 6px; flex-wrap: wrap; flex-shrink: 0;
      transition: all 0.2s;
    }
    #fu-suggestions.hidden {
      display: none;
    }
    .fu-suggestion {
      padding: 5px 11px; border-radius: 20px;
      border: 1px solid #dde; background: white;
      font-size: 11.5px; color: #0f3460; cursor: pointer;
      font-family: 'Inter', sans-serif;
      transition: all 0.15s;
    }
    .fu-suggestion:hover {
      background: #0f3460; color: white; border-color: #0f3460;
    }

    #fu-chat-input-area {
      padding: 10px 12px; display: flex; gap: 8px;
      border-top: 1px solid #eef; background: white;
      flex-shrink: 0; align-items: flex-end;
    }
    #fu-chat-input {
      flex: 1; border: 1.5px solid #e8e8f0;
      border-radius: 12px; padding: 9px 13px;
      font-family: 'Inter', sans-serif; font-size: 13px;
      resize: none; outline: none; max-height: 80px;
      transition: border-color 0.2s; line-height: 1.4;
      background: #f8f9fc;
    }
    #fu-chat-input:focus { border-color: #533483; background: white; }
    #fu-send-btn {
      width: 38px; height: 38px; flex-shrink: 0;
      background: linear-gradient(135deg, #0f3460, #533483);
      border: none; color: white; border-radius: 12px;
      cursor: pointer; font-size: 15px;
      display: flex; align-items: center; justify-content: center;
      transition: opacity 0.2s, transform 0.15s;
    }
    #fu-send-btn:hover { transform: scale(1.05); }
    #fu-send-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }
  `;
  document.head.appendChild(style);

  // ── HTML ──────────────────────────────────────────────────────
  document.body.insertAdjacentHTML("beforeend", `
    <button id="fu-chatbot-btn">
      <div id="fu-notif-badge"></div>
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </button>
    <div id="fu-chatbot-panel">
      <div id="fu-chat-header">
        <div id="fu-header-avatar">🤖</div>
        <div id="fu-header-info">
          <div id="fu-header-title">Assistant AW27</div>
          <div id="fu-header-sub">
            <span id="fu-online-dot"></span> En ligne · Analyse vos données
          </div>
        </div>
        <button id="fu-close-btn">✕</button>
      </div>
      <div id="fu-chat-messages"></div>
      <div id="fu-suggestions">
        <button class="fu-suggestion">📊 Résumé</button>
        <button class="fu-suggestion">⚠️ Alertes</button>
        <button class="fu-suggestion">📦 Statut PO</button>
        <button class="fu-suggestion">🧵 Fabrics</button>
      </div>
      <div id="fu-chat-input-area">
        <textarea id="fu-chat-input" placeholder="Posez votre question..." rows="1"></textarea>
        <button id="fu-send-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </div>
    </div>
  `);

  // ── Refs ──────────────────────────────────────────────────────
  const panel       = document.getElementById("fu-chatbot-panel");
  const btn         = document.getElementById("fu-chatbot-btn");
  const closeBtn    = document.getElementById("fu-close-btn");
  const messagesEl  = document.getElementById("fu-chat-messages");
  const input       = document.getElementById("fu-chat-input");
  const sendBtn     = document.getElementById("fu-send-btn");
  const badge       = document.getElementById("fu-notif-badge");
  const suggestions = document.querySelectorAll(".fu-suggestion");

  let chatHistory = [];
  let isLoading   = false;
  let hasOpened   = false;

  // ── Ouverture / fermeture ─────────────────────────────────────
  btn.onclick = () => {
    panel.classList.add("open");
    badge.style.display = "none";
    if (!hasOpened) {
      hasOpened = true;
      const userName = getUserName();
      const hour = new Date().getHours();
      const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
      const tables = document.querySelectorAll("table");
      const nbRows = [...document.querySelectorAll("table tr")].length;
      setTimeout(() => {
        addBotMessage(`${greeting} **${userName}** ✨\n\nVotre collection AW27 est chargée — **${nbRows} entrées** détectées sur cette page.\n\nPostez votre question, je m'occupe du reste `);
      }, 300);
    }
  };

  closeBtn.onclick = () => panel.classList.remove("open");

  // Badge notification après 3s
  setTimeout(() => { badge.style.display = "block"; }, 3000);

  // ── Suggestions rapides ───────────────────────────────────────
  suggestions.forEach(s => {
    s.onclick = () => {
      input.value = s.innerText.replace(/^[\s\S]{0,3}/, "").trim();
      const suggestionsEl = document.getElementById("fu-suggestions");
      if (suggestionsEl) suggestionsEl.classList.add("hidden");
      sendMessage();
    };
  });

  // ── Auto-resize textarea ──────────────────────────────────────
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 80) + "px";
  });
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  sendBtn.onclick = sendMessage;

  // ── Helpers messages ─────────────────────────────────────────
  function getTime() {
    return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  function addBotMessage(text) {
    const wrap = document.createElement("div");
    wrap.className = "fu-msg-wrap bot";
    const msg = document.createElement("div");
    msg.className = "fu-msg bot";
    msg.innerHTML = text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
    const time = document.createElement("div");
    time.className = "fu-msg-time";
    time.textContent = getTime();
    wrap.appendChild(msg);
    wrap.appendChild(time);
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return wrap;
  }

  function addUserMessage(text) {
    const wrap = document.createElement("div");
    wrap.className = "fu-msg-wrap user";
    const msg = document.createElement("div");
    msg.className = "fu-msg user";
    msg.textContent = text;
    const time = document.createElement("div");
    time.className = "fu-msg-time";
    time.textContent = getTime();
    wrap.appendChild(msg);
    wrap.appendChild(time);
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addTyping() {
    const wrap = document.createElement("div");
    wrap.className = "fu-msg-wrap bot";
    wrap.id = "fu-typing";
    wrap.innerHTML = `<div class="fu-typing"><span></span><span></span><span></span></div>`;
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return wrap;
  }

  // ── Extraction données page ───────────────────────────────────
  function extractPageData() {
    let result = "=== PAGE : " + document.title + " ===\n\n";
    const tables = document.querySelectorAll("table");
    tables.forEach((table, i) => {
      const caption = table.querySelector("caption");
      const heading = table.closest("section, div")?.querySelector("h1,h2,h3,h4");
      const title = caption?.innerText || heading?.innerText || ("Tableau " + (i + 1));
      result += "--- " + title + " ---\n";
      table.querySelectorAll("tr").forEach(row => {
        const cells = [...row.children].map(c => c.innerText.trim().replace(/\n/g, " "));
        if (cells.some(c => c)) result += cells.join(" | ") + "\n";
      });
      result += "\n";
    });
    return result.slice(0, 6000);
  }

  // ── Envoi message ─────────────────────────────────────────────
  async function sendMessage() {
    if (isLoading) return;
    const question = input.value.trim();
    if (!question) return;

    // Cacher les suggestions après le premier message
    const suggestionsEl = document.getElementById("fu-suggestions");
    if (suggestionsEl) suggestionsEl.classList.add("hidden");

    addUserMessage(question);
    input.value = "";
    input.style.height = "auto";

    const typingEl = addTyping();
    isLoading = true;
    sendBtn.disabled = true;

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          prompt:  question,
          context: extractPageData(),
          history: chatHistory.slice(-6)
        })
      });

      const data = await res.json();
      typingEl.remove();

      if (data.error) {
        addBotMessage("❌ Erreur : " + data.error);
        return;
      }

      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
      if (!reply) {
        addBotMessage("⚠️ Réponse vide. Vérifiez la console.");
        console.warn("Structure inattendue :", JSON.stringify(data));
        return;
      }

      addBotMessage(reply);
      chatHistory.push({ role: "user",      content: question });
      chatHistory.push({ role: "assistant", content: reply    });

    } catch (err) {
      typingEl.remove();
      addBotMessage("❌ Erreur réseau. Vérifiez votre connexion.");
      console.error(err);
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
    }
  }

})();

