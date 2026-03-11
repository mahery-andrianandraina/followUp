// ============================================================
// AW27 CHECKERS – Dashboard JavaScript
// ============================================================

// GOOGLE_APPS_SCRIPT_URL est maintenant dynamique — défini depuis
// window.currentUser.gasUrl après authentification Firebase.
// Ne pas modifier cette constante directement.
let GOOGLE_APPS_SCRIPT_URL = "YOUR_WEB_APP_URL_HERE";

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
            { key: "Client", label: "Client", type: "text", required: true },
            { key: "Dept", label: "Dept", type: "text", required: true },
            { key: "Style", label: "Style", type: "text", required: true },
            { key: "StyleDescription", label: "Description", type: "text", full: true },
            { key: "FabricBase", label: "Fabric Base", type: "text" },
            { key: "Costing", label: "Costing", type: "text" },
            { key: "OrderQty", label: "Order Qty", type: "number" },
            { key: "PSD", label: "PSD", type: "date" },
            { key: "ExFty", label: "Ex-Fty", type: "date" }
        ],
        kpis: [
            { label: "Total Styles", colorClass: "teal", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>`, compute: rows => rows.length },
            { label: "Total Qty", colorClass: "blue", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`, compute: rows => rows.reduce((s, r) => s + (+r.OrderQty || 0), 0).toLocaleString() },
            { label: "Departments", colorClass: "yellow", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`, compute: rows => new Set(rows.map(r => r.Dept).filter(Boolean)).size },
            { label: "Upcoming ExFty", colorClass: "green", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`, compute: rows => rows.filter(r => r.ExFty && new Date(r.ExFty) >= new Date()).length }
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

    loadCustomMenus();
    setupTabListeners();
    setupSearchAndFilter();
    showDashboard();
    await fetchAllData();
    renderDashboard();
    updateGlobalNotifBadge();
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
    showTableSpinner();
    try {
        const res = await fetch(GOOGLE_APPS_SCRIPT_URL);
        const json = await res.json();
        if (json.status !== "ok") throw new Error(json.message);

        // Assign _rowIndex if missing or fix offset (row 1 = headers → data starts at row 2)
        const fixRows = (rows) => (rows || []).map((r, i) => ({
            ...r,
            _rowIndex: r._rowIndex ?? (i + 2)
        }));

        state.data.details = fixRows(json.data.details?.rows);
        state.data.sample = fixRows(json.data.sample?.rows);
        state.data.ordering = fixRows(json.data.ordering?.rows);
        state.data.style = fixRows(json.data.style?.rows);

        // ── Charger les menus custom depuis GAS (priorité sur localStorage)
        if (json.menus && Array.isArray(json.menus)) {
            // Supprimer les menus custom existants de la nav pour éviter les doublons
            const nav = document.getElementById("custom-nav-items");
            if (nav) nav.innerHTML = "";
            // Réinitialiser les clés custom dans SHEET_CONFIG
            Object.keys(SHEET_CONFIG).filter(k => SHEET_CONFIG[k].custom).forEach(k => delete SHEET_CONFIG[k]);
            // Enregistrer les menus venant du GAS
            const migrated = json.menus.map(m => ({
                ...m,
                cols: m.cols.map(c => ({ ...c, key: c.label }))
            }));
            migrated.forEach(m => registerCustomMenu(m, false));
            // Mettre à jour localStorage comme cache
            localStorage.setItem(CUSTOM_MENUS_KEY, JSON.stringify(migrated));
        }

        // ── Charger les données des feuilles custom
        Object.keys(SHEET_CONFIG).filter(k => SHEET_CONFIG[k].custom).forEach(k => {
            const realName = SHEET_CONFIG[k].sheetName || SHEET_CONFIG[k].label;
            const fromGAS = Object.entries(json.data).find(([gasKey]) =>
                gasKey === realName || gasKey.toLowerCase() === realName.toLowerCase()
            );
            state.data[k] = fixRows(fromGAS ? fromGAS[1].rows : []);
        });

        state.loading = false;
        renderAll();
    } catch (err) {
        console.error(err);
        state.loading = false;
        if (GOOGLE_APPS_SCRIPT_URL === "YOUR_WEB_APP_URL_HERE") {
            showToast("Mode démo — Configurez GOOGLE_APPS_SCRIPT_URL.", "info", 6000);
            state.data = getDemoData();
        } else {
            showToast("Erreur de connexion au Google Sheet", "error");
        }
        renderAll();
    }
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
    if (ds) ds.style.display = "flex";
    if (kg) kg.style.display = "none";
    if (tc) tc.style.display = "none";
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
    if (ds) ds.style.display = "none";
    if (kg) kg.style.display = "";
    if (tc) tc.style.display = "";
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

    updateGlobalNotifBadge();
}

// ─── Dashboard Render ──────────────────────────────────────────
function renderDashboard() {
    const el = document.getElementById("dashboard-screen");
    if (!el) return;

    const details  = state.data.details;
    const today    = new Date(); today.setHours(0,0,0,0);

    // ── Clients list
    const clients = [...new Set(details.map(r => r.Client).filter(Boolean))].sort();

    const ACCENT = ["#6366f1","#14b8a6","#f59e0b","#ef4444","#3b82f6","#ec4899","#8b5cf6","#10b981"];

    const clientCards = clients.map((client, ci) => {
        const accent = ACCENT[ci % ACCENT.length];
        const dRows  = details.filter(r => r.Client === client);

        const totalQty  = dRows.reduce((s,r) => s+(+r.OrderQty||0), 0);
        const initials  = client.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

        // Group by dept
        const depts = [...new Set(dRows.map(r=>r.Dept).filter(Boolean))].sort();

        const deptRows = depts.map(dept => {
            const deptR = dRows.filter(r => r.Dept === dept);
            const deptQty = deptR.reduce((s,r) => s+(+r.OrderQty||0), 0);
            const deptStyles = deptR.length;
            return '<div class="dbc-dept-row">' +
                '<span class="dbc-dept-name">' + esc(dept) + '</span>' +
                '<span class="dbc-dept-styles">' + deptStyles + ' style' + (deptStyles > 1 ? 's' : '') + '</span>' +
                '<span class="dbc-dept-qty">' + deptQty.toLocaleString("fr-FR") + ' u.</span>' +
            '</div>';
        }).join("");

        return '<div class="dbc-card">' +

            // Header
            '<div class="dbc-head" style="border-top:3px solid ' + accent + '">' +
                '<div class="dbc-avatar" style="background:' + accent + '1a;color:' + accent + '">' + initials + '</div>' +
                '<div class="dbc-head-info">' +
                    '<div class="dbc-client-name">' + esc(client) + '</div>' +
                    '<div class="dbc-total-qty-lbl">Total &mdash; <strong>' + totalQty.toLocaleString("fr-FR") + '</strong> u.</div>' +
                '</div>' +
            '</div>' +

            // Dept breakdown
            '<div class="dbc-dept-table">' +
                '<div class="dbc-dept-header">' +
                    '<span>Dept</span><span>Styles</span><span>Qté</span>' +
                '</div>' +
                deptRows +
            '</div>' +

            // Total footer
            '<div class="dbc-footer" style="border-top:2px solid ' + accent + '1a">' +
                '<span class="dbc-footer-lbl">Total Quantit\u00e9</span>' +
                '<span class="dbc-footer-val" style="color:' + accent + '">' + totalQty.toLocaleString("fr-FR") + ' u.</span>' +
            '</div>' +

        '</div>';
    }).join("");

    // ── Date
    const dateStr = today.toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });
    const dateCapitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    el.innerHTML =
        '<div class="db-welcome">' +
            '<div class="db-welcome-text"><h2>AW27 Checkers \ud83d\udc4b</h2><p>R\u00e9partition des styles et quantit\u00e9s par client</p></div>' +
            '<span class="db-welcome-badge">' +
                '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' +
                dateCapitalized +
            '</span>' +
        '</div>' +
        '<div class="dbc-grid">' +
            (clientCards || '<p style="color:var(--text-muted);padding:2rem">Aucune donn\u00e9e.</p>') +
        '</div>';
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
        if (!groups[k]) groups[k] = { client: r.Client, style: r.Style, desc: r.StyleDescription || "", rows: [] };
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
            <div class="loading-icon-wrap">
                <svg class="loading-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="28" height="28">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
            </div>
            <div class="loading-text">Chargement des données…</div>
            <div class="loading-sub">Connexion au Google Sheet en cours</div>
        </div>
    </td></tr>`;
}

function renderTable() {
    const cfg = SHEET_CONFIG[state.activeSheet];
    const rows = state.filteredData;
    const isOrdering = state.activeSheet === "ordering";

    tableHead.innerHTML = `<tr>
    ${cfg.cols.map(c => `<th onclick="sortBy('${c.key}')" title="Trier par ${c.label}">${c.label}${state.sortCol === c.key ? (state.sortDir === 1 ? " ↑" : " ↓") : ""}</th>`).join("")}
    ${isOrdering ? `<th style="white-space:nowrap;">🚦 Track</th>` : ""}
    <th>Actions</th></tr>`;

    if (!rows.length) {
        tableBody.innerHTML = `<tr><td colspan="${cfg.cols.length + (isOrdering ? 2 : 1)}">
            <div class="empty-state"><div class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg></div>
            <h3>Aucune donnée</h3><p>Ajoutez une ligne ou modifiez votre recherche.</p></div>
        </td></tr>`;
        return;
    }

    tableBody.innerHTML = rows.map(row => {
        const rowIdx = row._rowIndex;
        const cells = cfg.cols.map((c, i) => {
            let val = row[c.key] ?? "";
            const sticky = i === 0 ? "sticky-col" : i === 1 ? "sticky-col-2" : i === 2 ? "sticky-col-3" : "";

            if (c.key === "Client") return `<td class="${sticky}"><span class="client-badge">${esc(val) || "—"}</span></td>`;
            if (c.key === "Dept") return `<td class="${sticky}"><span class="dept-badge">${esc(val)}</span></td>`;
            if (c.key === "Approval") {
                const cls = (val || "").toLowerCase() || "unknown";
                const opts = ["","Approved","Pending","Rejected"].map(o =>
                    `<option value="${o}" ${o===val?"selected":""}>${o||"— Choisir —"}</option>`
                ).join("");
                return `<td><div class="quick-sel-wrap">
                    <span class="approval-badge ${cls} quick-badge">${esc(val)||"—"}</span>
                    <select class="quick-select" onchange="quickUpdate(${rowIdx},'Approval',this.value,'sample')">${opts}</select>
                </div></td>`;
            }
            if (c.key === "Status") {
                const cls = { "Confirmed": "status-confirmed", "Pending": "status-pending", "Cancelled": "status-cancelled" }[val] || "";
                const opts = ["","Confirmed","Pending","Cancelled"].map(o =>
                    `<option value="${o}" ${o===val?"selected":""}>${o||"— Choisir —"}</option>`
                ).join("");
                return `<td><div class="quick-sel-wrap">
                    <span class="status-badge-order ${cls} quick-badge">${esc(val)||"—"}</span>
                    <select class="quick-select" onchange="quickUpdate(${rowIdx},'Status',this.value,'ordering')">${opts}</select>
                </div></td>`;
            }
            if (c.key === "Delivery Status") {
                const cls = { "Not Shipped": "del-notshipped", "In Transit": "del-transit", "Delivered": "del-delivered" }[val] || "";
                const opts = ["","Not Shipped","In Transit","Delivered"].map(o =>
                    `<option value="${o}" ${o===val?"selected":""}>${o||"— Choisir —"}</option>`
                ).join("");
                return `<td><div class="quick-sel-wrap">
                    <span class="delivery-badge ${cls} quick-badge">${esc(val)||"—"}</span>
                    <select class="quick-select" onchange="quickUpdate(${rowIdx},'Delivery Status',this.value,'ordering')">${opts}</select>
                </div></td>`;
            }
            if (c.key === "PO" && !val) return `<td><span class="missing-po-badge">Missing PO</span></td>`;

            let isPast = false, displayVal = val;
            if (c.type === "date" && val) {
                try {
                    const dd = new Date(val);
                    if ((c.key === "ExFty" || c.key === "Ready Date") && dd.getTime() < new Date().setHours(0, 0, 0, 0)) isPast = true;
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

        return `<tr>${cells}${trackCell}
        <td><div class="action-btns">
            <button class="btn btn-edit btn-icon" onclick="openEditModal(${rowIdx})" title="Modifier"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
            <button class="btn btn-danger btn-icon" onclick="confirmDelete(${rowIdx})" title="Supprimer"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
        </div></td></tr>`;
    }).join("");
}

// ─── Sort / Modal / Form / Delete / API / Toast / Helpers ─────
function sortBy(col) { if (state.sortCol === col) state.sortDir *= -1; else { state.sortCol = col; state.sortDir = 1; } applyFilters(); }

function openAddModal() { state.editingRow = null; const cfg = SHEET_CONFIG[state.activeSheet]; modalTitle.textContent = `Ajouter – ${cfg.label}`; modalSubTitle.textContent = "Remplissez les champs ci-dessous"; buildForm(cfg.cols, {}); formSave.textContent = "Enregistrer"; openModal(); }
function openEditModal(rowIndex) { const row = state.data[state.activeSheet].find(r => r._rowIndex === rowIndex); if (!row) return; state.editingRow = rowIndex; const cfg = SHEET_CONFIG[state.activeSheet]; modalTitle.textContent = `Modifier – ${cfg.label}`; modalSubTitle.textContent = `Ligne ${rowIndex}`; buildForm(cfg.cols, row); formSave.textContent = "Mettre à jour"; openModal(); }

function toISODateValue(val) {
    if (!val) return "";
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(val).trim())) return String(val).trim();
    // Try parsing as a date (handles "07 mars 2026", "07/03/2026", etc.)
    try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    } catch (e) {}
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
            await sendRequest("UPDATE", { data, rowIndex: state.editingRow });
            const idx = state.data[state.activeSheet].findIndex(r => r._rowIndex === state.editingRow);
            if (idx !== -1) state.data[state.activeSheet][idx] = { ...state.data[state.activeSheet][idx], ...data };
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
    } catch(e) {}
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
            { label: "Total lignes", colorClass: "teal",
              icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>',
              compute: rows => rows.length }
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
                b.classList.remove("active"); b.setAttribute("aria-selected","false");
            });
            btn.classList.add("active"); btn.setAttribute("aria-selected","true");
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
        .catch(() => {}); // silencieux si GAS non connecté
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
    if (!cfg || !cfg.custom) return;
    mbEditingKey = key;
    mbColumns = cfg.cols.map(c => ({ ...c }));
    document.getElementById("mb-menu-name").value = cfg.label;
    document.getElementById("menu-builder-title").textContent = "Modifier : " + cfg.label;
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

    const typeOptions = ["text","number","date","select","textarea"].map(t =>
        '<option value="' + t + '">' +
        { text:"Texte", number:"Nombre", date:"Date", select:"Liste", textarea:"Bloc texte" }[t] +
        '</option>'
    ).join("");

    list.innerHTML = mbColumns.map((col, i) => {
        const selOpts = ["text","number","date","select","textarea"].map(t =>
            '<option value="' + t + '" ' + (col.type === t ? "selected" : "") + '>' +
            { text:"Texte", number:"Nombre", date:"Date", select:"Liste (options)", textarea:"Bloc texte" }[t] +
            '</option>'
        ).join("");

        const isSelect = col.type === "select";

        return '<div class="mb-col-row" id="mb-col-' + i + '">' +
            '<div class="mb-col-drag">' + (i+1) + '</div>' +
            '<div class="mb-col-fields">' +
                '<div class="mb-col-top">' +
                    '<input class="form-input mb-col-label-input" placeholder="Nom de colonne *" ' +
                    'value="' + esc(col.label) + '" ' +
                    'oninput="mbSyncColumn(' + i + ','+"'label',this.value"+')" />' +
                    '<select class="form-select mb-col-type" onchange="mbSyncColumn(' + i + ','+"'type',this.value"+'); mbColumns[' + i + '].type=this.value; renderMbColumns()">' +
                    selOpts +
                    '</select>' +
                    '<label class="mb-col-req" title="Champ obligatoire">' +
                    '<input type="checkbox" ' + (col.required ? "checked" : "") + ' onchange="mbSyncColumn(' + i + ','+"'required',this.checked"+')">' +
                    '<span>Requis</span></label>' +
                '</div>' +
                (isSelect ? '<div class="mb-col-opts-row"><input class="form-input mb-col-opts-input" placeholder="Options séparées par virgule : Ex, Aaa, Bbb" ' +
                    'value="' + esc((col.options||[]).filter(o=>o).join(", ")) + '" ' +
                    'oninput="mbSyncColumn(' + i + ','+"'options',this.value.split(',').map(s=>s.trim()).filter(Boolean)"+')"/></div>' : "") +
            '</div>' +
            '<div class="mb-col-actions">' +
                (i > 0 ? '<button class="mb-act-btn" onclick="mbMoveColumn(' + i + ',-1)" title="Monter">↑</button>' : '<span></span>') +
                (i < mbColumns.length-1 ? '<button class="mb-act-btn" onclick="mbMoveColumn(' + i + ',1)" title="Descendre">↓</button>' : '<span></span>') +
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
        const colIdx = parseInt(inp.closest(".mb-col-row").id.replace("mb-col-",""));
        if (mbColumns[colIdx]) {
            mbColumns[colIdx].options = ["", ...inp.value.split(",").map(s=>s.trim()).filter(Boolean)];
        }
    });

    const validCols = mbColumns.filter(c => c.label);
    if (!validCols.length) { showToast("Ajoutez au moins une colonne", "error"); return; }

    // Build key from name
    const key = mbEditingKey || "custom_" + nameRaw.toLowerCase().replace(/[^a-z0-9]/g,"_").slice(0,20) + "_" + Date.now().toString(36);

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
            await sendRequest("UPDATE_SHEET_HEADERS", { sheetName: nameRaw, columns: menuDef.cols.map(c=>c.label) });
            showToast("Colonnes mises à jour dans Google Sheet \u2713", "success", 3000);
        } else {
            await sendRequest("CREATE_SHEET", { sheetName: nameRaw, columns: menuDef.cols.map(c=>c.label) });
            showToast("Menu cr\u00e9\u00e9 dans Google Sheet \u2713", "success", 3000);
        }
    } catch(e) {
        showToast("Menu sauvegard\u00e9 localement (GS non connect\u00e9)", "info", 3000);
    }

    if (mbEditingKey) {
        // Update SHEET_CONFIG
        SHEET_CONFIG[key].label     = menuDef.label;
        SHEET_CONFIG[key].sheetName = menuDef.label;
        SHEET_CONFIG[key].cols      = menuDef.cols;
        persistCustomMenus();

        // Mettre à jour le label dans la nav
        const navBtn = document.getElementById("tab-custom-" + key);
        if (navBtn) navBtn.querySelector(".nav-label").textContent = menuDef.label;

        // Si on est sur ce menu, rafraîchir l'affichage (KPIs + tableau)
        if (state.activeSheet === key) {
            const titleEl = document.getElementById("header-sheet-title");
            if (titleEl) titleEl.textContent = menuDef.label;
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


// ═══════════════════════════════════════════════════════════════
// ─── CUSTOM MENU – SMART ALERTS (drawer style) ────────────────
// ═══════════════════════════════════════════════════════════════

// ── Détection intelligente des colonnes ──────────────────────
function detectCustomCols(cols) {
    const find = patterns => {
        const c = cols.find(c => patterns.some(p => c.label.toLowerCase().includes(p)));
        return c ? c.key : null;
    };
    // Detect if this sheet is a Fabric Analysis sheet
    const sheetNameHints = cols.map(c => c.label.toLowerCase()).join(" ");
    const isFabricAnalysis = sheetNameHints.includes("fabric") || sheetNameHints.includes("analyse") || sheetNameHints.includes("analysis");
    return {
        approval:        find(["approval","approv","approved","validation","statut appr"]),
        sendingDate:     find(["sending date","send date","sent date","date envoi","ship date","sending","date send"]),
        receivedDate:    find(["received date","receipt date","date recep","date recu","reception","received"]),
        readyDate:       find(["ready date","ready","date pret","date pr\u00eat","due date","expected date","result date","date result"]),
        fsrDate:         find(["fsr date","launch date","date lancement","date launch","request date","date request"]),
        fsrNumber:       find(["fsr number","fsr no","fsr num","fsr #","fsr ref","num\u00e9ro fsr","no fsr","reference fsr","fsr"]),
        launchDate:      find(["launched","launch","lanc\u00e9","date lanc","sent to lab","submitted","submission date","date soumis","lab date"]),
        isFabricAnalysis,
        style:           find(["style","ref","reference","article"]),
        client:          find(["client","buyer","brand","marque"]),
        description:     find(["description","desc","name","nom","fabric","tissu","mati\u00e8re"]),
        comments:        find(["comment","remarks","note","observation"]),
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
    if (diffDays < 7)  return "il y a " + diffDays + " jour(s)";
    if (diffDays < 30) return "il y a " + Math.floor(diffDays/7) + " semaine(s)";
    if (diffDays < 365)return "il y a " + Math.floor(diffDays/30) + " mois";
    return "il y a " + Math.floor(diffDays/365) + " an(s)";
}

function isApproved(val) {
    return (val || "").toLowerCase() === "approved";
}
function isSent(val) {
    return !!(val && String(val).trim() !== "");
}

// ─── Auto-Refresh ─────────────────────────────────────────────
(function startAutoRefresh() {
    const INTERVAL = 5 * 60 * 1000; // 5 minutes
    const WARN_AT  = 4 * 60 * 1000; // show badge after 4 min
    setInterval(() => {
        const elapsed = Date.now() - (state._lastFetch || 0);
        if (elapsed >= INTERVAL) {
            // Silent background refresh
            fetchAllData().then(() => {
                showToast("Données actualisées automatiquement", "info", 2500);
            });
        } else if (elapsed >= WARN_AT) {
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

function openStyleModal(styleName) { _currentStyleName = styleName; styleModalTitle.textContent = `Détails du Style : ${styleName}`; document.getElementById("style-modal-subtitle").textContent = "Couleurs & Articles"; renderStyleModalBody(); styleModalOverlay.classList.add("open"); }

function renderStyleModalBody() {
    const styleRows = state.data.style.filter(r => r.Style === _currentStyleName);
    let html = `<div class="style-section"><h4><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg> Couleurs & Articles</h4>
    <table class="style-detail-table"><thead><tr><th>GMT Color</th><th>Pantone</th><th>PO</th><th>Articles</th><th style="width:80px;text-align:center;">Actions</th></tr></thead><tbody id="style-table-body">`;
    if (styleRows.length) {
        styleRows.forEach(r => { html += `<tr data-row="${r._rowIndex}" id="style-row-${r._rowIndex}"><td><span class="color-badge">${esc(r["GMT Color"]) || "—"}</span></td><td>${esc(r["Pantone"]) || "—"}</td><td>${esc(r["PO"]) || "—"}</td><td>${esc(r["Articles"]) || "—"}</td><td style="text-align:center;"><button class="btn btn-edit btn-icon btn-xs" onclick="editStyleRow(${r._rowIndex})"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button></td></tr>`; });
    } else { html += `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:1.5rem;">Aucune couleur enregistrée.</td></tr>`; }
    html += `</tbody></table><div style="margin-top:1rem;"><button class="btn btn-primary btn-sm" onclick="showAddStyleRow()"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="13" height="13"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg> Ajouter une couleur</button></div>
    <div id="style-add-form" class="style-inline-form" style="display:none;margin-top:1rem;"><div class="style-form-grid"><div class="style-form-group"><label class="form-label">GMT Color</label><input class="form-input" id="sf-gmt" placeholder="ex: KHAKI"/></div><div class="style-form-group"><label class="form-label">Pantone</label><input class="form-input" id="sf-pantone" placeholder="ex: Smoky Olive"/></div><div class="style-form-group"><label class="form-label">PO</label><input class="form-input" id="sf-po" placeholder="ex: 1202363673"/></div><div class="style-form-group"><label class="form-label">Articles</label><input class="form-input" id="sf-articles" placeholder="ex: 10953373"/></div></div><div class="style-form-actions"><button class="btn btn-ghost btn-sm" onclick="hideAddStyleRow()">Annuler</button><button class="btn btn-primary btn-sm" onclick="saveNewStyleRow()">Enregistrer</button></div></div></div>`;
    styleModalBody.innerHTML = html;
}

function showAddStyleRow() { document.getElementById("style-add-form").style.display = "block"; document.getElementById("sf-gmt").focus(); }
function hideAddStyleRow() { document.getElementById("style-add-form").style.display = "none";["sf-gmt", "sf-pantone", "sf-po", "sf-articles"].forEach(id => document.getElementById(id).value = ""); }
async function saveNewStyleRow() { const g = document.getElementById("sf-gmt").value.trim(); if (!g) { showToast("GMT Color requis", "error"); return; } const btn = document.querySelector("#style-add-form .btn-primary"); btn.disabled = true; btn.textContent = "Enregistrement…"; try { await sendRequest("CREATE", { data: { Style: _currentStyleName, "GMT Color": g, Pantone: document.getElementById("sf-pantone").value.trim(), PO: document.getElementById("sf-po").value.trim(), Articles: document.getElementById("sf-articles").value.trim() } }, "style"); showToast("Couleur ajoutée", "success"); await fetchAllData(); renderStyleModalBody(); } catch (err) { showToast("Erreur : " + err.message, "error"); btn.disabled = false; btn.textContent = "Enregistrer"; } }
function editStyleRow(idx) { const row = state.data.style.find(r => r._rowIndex === idx); if (!row) return; const tr = document.getElementById(`style-row-${idx}`); if (!tr) return; tr.innerHTML = `<td><input class="form-input form-input-sm" id="edit-gmt-${idx}" value="${esc(row["GMT Color"] || "")}"/></td><td><input class="form-input form-input-sm" id="edit-pantone-${idx}" value="${esc(row["Pantone"] || "")}"/></td><td><input class="form-input form-input-sm" id="edit-po-${idx}" value="${esc(row["PO"] || "")}"/></td><td><input class="form-input form-input-sm" id="edit-articles-${idx}" value="${esc(row["Articles"] || "")}"/></td><td style="text-align:center;white-space:nowrap;"><button class="btn btn-primary btn-icon btn-xs" onclick="saveStyleRow(${idx})"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg></button><button class="btn btn-ghost btn-icon btn-xs" onclick="renderStyleModalBody()" style="margin-left:4px;"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></td>`; document.getElementById(`edit-gmt-${idx}`).focus(); }
async function saveStyleRow(idx) { const g = document.getElementById(`edit-gmt-${idx}`).value.trim(); if (!g) { showToast("GMT Color requis", "error"); return; } try { await sendRequest("UPDATE", { data: { Style: _currentStyleName, "GMT Color": g, Pantone: document.getElementById(`edit-pantone-${idx}`).value.trim(), PO: document.getElementById(`edit-po-${idx}`).value.trim(), Articles: document.getElementById(`edit-articles-${idx}`).value.trim() }, rowIndex: idx }, "style"); const i = state.data.style.findIndex(r => r._rowIndex === idx); if (i !== -1) Object.assign(state.data.style[i], { "GMT Color": g, Pantone: document.getElementById(`edit-pantone-${idx}`).value.trim(), PO: document.getElementById(`edit-po-${idx}`).value.trim(), Articles: document.getElementById(`edit-articles-${idx}`).value.trim() }); showToast("Ligne mise à jour", "success"); renderStyleModalBody(); } catch (err) { showToast("Erreur : " + err.message, "error"); } }
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
    _waitForXLSX(function(XL) {
        if (!XL) { showToast("Bibliothèque Excel non chargée — vérifiez votre connexion", "error"); return; }
        const cfg = SHEET_CONFIG[state.activeSheet];
        const rows = state.filteredData.length ? state.filteredData : state.data[state.activeSheet];
        if (!rows.length) { showToast("Aucune donnée à exporter", "info"); return; }
        const headers = cfg.cols.map(c => c.label);
        const data = rows.map(row => {
            const obj = {};
            cfg.cols.forEach(c => {
                let v = row[c.key] ?? "";
                if (c.type === "date" && v) try { v = new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }); } catch (e) {}
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
    try { return new Date(val).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" }); }
    catch(e) { return String(val); }
}
function _daysDiff(dateVal) {
    // Retourne un entier : positif = dans le futur, négatif = passé
    const d = new Date(dateVal); d.setHours(0,0,0,0);
    const t = new Date(); t.setHours(0,0,0,0);
    return Math.round((d - t) / 86400000);
}

function collectAllAlerts() {
    const all = {};

    // ─── ORDERING ────────────────────────────────────────────
    const ordRows = state.data.ordering || [];
    const ordItems = [];

    ordRows.filter(r => computeDeliveryTrack(r).cls === "track-late").forEach(r => {
        const days = Math.abs(_daysDiff(r["Ready Date"]));
        ordItems.push({
            dotCls:"dot-late", tagCls:"tag-late",
            tagLabel:`🔴 Retard ${days}j`,
            title:`Livraison en retard de ${days} jour${days>1?"s":""}`,
            action:"Contacter le fournisseur et replanifier la livraison",
            style:r.Style||"—", client:r.Client||"",
            meta:`Ready Date : ${_fmtDate(r["Ready Date"])}${r.PO?" · PO : "+r.PO:" · ⚠ PO manquant"}${r.Supplier?" · "+r.Supplier:""}`,
            urgency:"high", sheet:"ordering", rowIndex:r._rowIndex
        });
    });
    ordRows.filter(r => computeDeliveryTrack(r).cls === "track-atrisk").forEach(r => {
        const days = _daysDiff(r["Ready Date"]);
        ordItems.push({
            dotCls:"dot-risk", tagCls:"tag-risk",
            tagLabel:`🟠 Dans ${days}j`,
            title:`Livraison dans ${days} jour${days>1?"s":""} — surveiller`,
            action:"Confirmer l'avancement de la commande avec le fournisseur",
            style:r.Style||"—", client:r.Client||"",
            meta:`Ready Date : ${_fmtDate(r["Ready Date"])}${r.Supplier?" · "+r.Supplier:""}`,
            urgency:"mid", sheet:"ordering", rowIndex:r._rowIndex
        });
    });
    ordRows.filter(r => !r.PO && r.Status !== "Cancelled").forEach(r => {
        ordItems.push({
            dotCls:"dot-nopo", tagCls:"tag-nopo",
            tagLabel:"⚠ PO manquant",
            title:"Commande sans PO — renseigner avant livraison",
            action:"Renseigner le numéro de PO dès que disponible",
            style:r.Style||"—", client:r.Client||"",
            meta:`${r.Color?"Coloris : "+r.Color+" · ":""}Statut : ${r.Status||"—"}${r["Ready Date"]?" · Ready : "+_fmtDate(r["Ready Date"]):""}`,
            urgency:"low", sheet:"ordering", rowIndex:r._rowIndex
        });
    });
    if (ordItems.length) all["ordering"] = { label:"Ordering", items:ordItems };

    // ─── SAMPLE (PSS) ─────────────────────────────────────────
    // Règle clé : les 4 états sont MUTUELLEMENT EXCLUSIFS.
    // L'état A (retard PSD) n'est déclenché QUE si Received Date est vide.
    // Dès que le PSS est reçu (Received Date renseigné), on passe à l'état C ou D.
    const samRows = state.data.sample || [];
    const samItems = [];

    samRows.forEach(r => {
        const hasReceived = !!(r["Received Date"] && String(r["Received Date"]).trim());
        const hasSending  = !!(r["Sending Date"]  && String(r["Sending Date"]).trim());
        const isApproved  = r.Approval === "Approved";
        const hasReadyDate = !!(r["Ready Date"] && String(r["Ready Date"]).trim());

        if (isApproved) return; // cycle terminé, aucune alerte

        if (!hasReceived && !hasSending) {
            // ── État A ou B : Sample pas encore reçue ───────────────
            if (!hasReadyDate) return; // pas de date → pas d'alerte
            const diff = _daysDiff(r["Ready Date"]);
            if (diff < 0) {
                // État A : Ready Date dépassée, sample toujours pas reçue
                const days = Math.abs(diff);
                samItems.push({
                    dotCls:"dot-late", tagCls:"tag-late",
                    tagLabel:`🔴 Sample non reçue — ${days}j de retard`,
                    title:`Sample non reçue — Ready Date dépassée de ${days} jour${days>1?"s":""}`,
                    action:"Relancer la factory pour confirmer l'avancement de la sample",
                    style:r.Style||"—", client:r.Client||"",
                    meta:`Ready Date : ${_fmtDate(r["Ready Date"])}${r.Type?" · "+r.Type:""}${r.Fabric?" · "+r.Fabric:""}`,
                    urgency:"high", sheet:"sample", rowIndex:r._rowIndex
                });
            } else if (diff === 0) {
                // État B : Ready Date = aujourd'hui
                samItems.push({
                    dotCls:"dot-today", tagCls:"tag-today",
                    tagLabel:"🟡 Sample attendue aujourd'hui",
                    title:"Sample attendue aujourd'hui — prévoir la réception",
                    action:"Confirmer la réception dès réception de la sample",
                    style:r.Style||"—", client:r.Client||"",
                    meta:`Ready Date : ${_fmtDate(r["Ready Date"])}${r.Type?" · "+r.Type:""}${r.Fabric?" · "+r.Fabric:""}`,
                    urgency:"low", sheet:"sample", rowIndex:r._rowIndex
                });
            }
            // diff > 0 : Ready Date dans le futur → pas d'alerte

        } else if (hasReceived && !hasSending) {
            // ── État C : Sample reçue, pas encore envoyée ────────────
            const days = Math.abs(_daysDiff(r["Received Date"]));
            const daysLabel = days === 0 ? "reçue aujourd'hui" : days === 1 ? "reçue hier" : `reçue il y a ${days}j`;
            samItems.push({
                dotCls:"dot-send", tagCls:"tag-send",
                tagLabel:`📦 À envoyer (${daysLabel})`,
                title:"Sample reçue — à envoyer au client",
                action:`Sample ${daysLabel} — organiser l'envoi et renseigner la Sending Date`,
                style:r.Style||"—", client:r.Client||"",
                meta:`Reçue le : ${_fmtDate(r["Received Date"])}${r.Type?" · "+r.Type:""}${r.Size?" · Taille "+r.Size:""}`,
                urgency: days >= 3 ? "mid" : "low", sheet:"sample", rowIndex:r._rowIndex
            });

        } else if (hasSending) {
            // ── État D : Sample envoyée, en attente d'approbation ────
            const days = Math.abs(_daysDiff(r["Sending Date"]));
            const urgency = days >= 14 ? "high" : days >= 7 ? "mid" : "low";
            const urgencyLabel = urgency === "high" ? " 🚨 urgent" : urgency === "mid" ? " ⚡ à relancer" : "";
            samItems.push({
                dotCls:"dot-approve", tagCls:"tag-approve",
                tagLabel:`⏳ Approval en attente — ${days}j${urgencyLabel}`,
                title:`Sample envoyée — approbation en attente depuis ${days} jour${days>1?"s":""}`,
                action: urgency === "high"
                    ? "Plus de 2 semaines sans retour — relancer le client de toute urgence"
                    : urgency === "mid"
                    ? "1 semaine sans retour — envoyer un rappel au client"
                    : "Attendre le retour du client ou envoyer un suivi",
                style:r.Style||"—", client:r.Client||"",
                meta:`Envoyée le : ${_fmtDate(r["Sending Date"])}${r.AWB?" · AWB : "+r.AWB:""}${r.Type?" · "+r.Type:""}`,
                urgency, sheet:"sample", rowIndex:r._rowIndex
            });
        }
    });

    if (samItems.length) all["sample"] = { label:"Sample", items:samItems };

    // ─── CUSTOM MENUS ─────────────────────────────────────────
    Object.keys(SHEET_CONFIG).filter(k => SHEET_CONFIG[k].custom).forEach(key => {
        const cfg  = SHEET_CONFIG[key];
        const rows = state.data[key] || [];
        const det  = detectCustomCols(cfg.cols);
        const items = [];

        const getStyle  = r => det.style  ? (r[det.style]  || "—") : "—";
        const getClient = r => det.client ? (r[det.client] || "")  : "";
        const getFsr    = r => det.fsrNumber && r[det.fsrNumber] ? ` · FSR ${r[det.fsrNumber]}` : "";

        rows.forEach(r => {
            const hasReceived  = det.receivedDate && !!(r[det.receivedDate] && String(r[det.receivedDate]).trim());
            const hasSending   = det.sendingDate  && !!(r[det.sendingDate]  && String(r[det.sendingDate]).trim());
            const hasReadyDate = det.readyDate    && !!(r[det.readyDate]    && String(r[det.readyDate]).trim());
            const hasFsr       = det.fsrDate      && !!(r[det.fsrDate]      && String(r[det.fsrDate]).trim());
            const hasLaunch    = det.launchDate   && !!(r[det.launchDate]   && String(r[det.launchDate]).trim());
            const approved     = det.approval && isApproved(r[det.approval]);

            if (approved) return;

            // ── FABRIC ANALYSIS : logique spécifique ─────────────────
            // Dès qu'une ligne est lancée (launchDate ou fsrDate renseigné)
            // mais que la Ready Date (= date résultat) est absente → alerte
            if (det.isFabricAnalysis) {
                const isLaunched = hasLaunch || hasFsr;
                if (!isLaunched) return; // pas encore lancé → pas d'alerte
                if (hasReadyDate) {
                    // Résultat attendu : afficher le nb de jours restants
                    const diff = _daysDiff(r[det.readyDate]);
                    const launchDateVal = det.launchDate ? r[det.launchDate] : (det.fsrDate ? r[det.fsrDate] : null);
                    if (diff < 0) {
                        const days = Math.abs(diff);
                        items.push({
                            dotCls:"dot-late", tagCls:"tag-late",
                            tagLabel:`🔴 Résultat en retard — ${days}j`,
                            title:`Résultat d'analyse en retard de ${days} jour${days>1?"s":""}`,
                            action:"Relancer le laboratoire pour obtenir les résultats",
                            style:getStyle(r), client:getClient(r),
                            meta:`Ready Date : ${_fmtDate(r[det.readyDate])}${getFsr(r)}${launchDateVal?" · Lancé le : "+_fmtDate(launchDateVal):""}`,
                            urgency:"high", sheet:key, rowIndex:r._rowIndex
                        });
                    } else if (diff === 0) {
                        const launchDateVal = det.launchDate ? r[det.launchDate] : (det.fsrDate ? r[det.fsrDate] : null);
                        items.push({
                            dotCls:"dot-today", tagCls:"tag-today",
                            tagLabel:`🟡 Résultat attendu aujourd'hui`,
                            title:`Résultat d'analyse attendu aujourd'hui`,
                            action:"Vérifier la réception des résultats du laboratoire",
                            style:getStyle(r), client:getClient(r),
                            meta:`Ready Date : ${_fmtDate(r[det.readyDate])}${getFsr(r)}${launchDateVal?" · Lancé le : "+_fmtDate(launchDateVal):""}`,
                            urgency:"low", sheet:key, rowIndex:r._rowIndex
                        });
                    } else {
                        const launchDateVal = det.launchDate ? r[det.launchDate] : (det.fsrDate ? r[det.fsrDate] : null);
                        items.push({
                            dotCls:"dot-risk", tagCls:"tag-risk",
                            tagLabel:`🕐 Résultat dans ${diff}j`,
                            title:`Analyse lancée — résultat attendu dans ${diff} jour${diff>1?"s":""}`,
                            action:`Résultats prévus le ${_fmtDate(r[det.readyDate])}`,
                            style:getStyle(r), client:getClient(r),
                            meta:`Ready Date : ${_fmtDate(r[det.readyDate])}${getFsr(r)}${launchDateVal?" · Lancé le : "+_fmtDate(launchDateVal):""}`,
                            urgency:"low", sheet:key, rowIndex:r._rowIndex
                        });
                    }
                } else {
                    // Lancé mais pas de Ready Date → on attend la date de résultat
                    const launchDateVal = det.launchDate ? r[det.launchDate] : (det.fsrDate ? r[det.fsrDate] : null);
                    const launchAgo = timeAgo(launchDateVal);
                    items.push({
                        dotCls:"dot-nopo", tagCls:"tag-nopo",
                        tagLabel:`📋 En attente Ready Date analyse`,
                        title:`Analyse lancée — Ready Date non renseignée`,
                        action:`Renseigner la Ready Date de l'analyse${launchAgo ? " (lancé "+launchAgo+")" : ""}`,
                        style:getStyle(r), client:getClient(r),
                        meta:`Lancé le : ${_fmtDate(launchDateVal)}${getFsr(r)}`,
                        urgency:"mid", sheet:key, rowIndex:r._rowIndex
                    });
                }
                return; // Fabric Analysis : ne pas tomber dans la logique générique
            }
            // ── FIN logique Fabric Analysis ──────────────────────────


            if (hasReceived || hasSending) {
                // ── États C / D : received ou sending renseigné ──────
                if (hasReceived && !hasSending) {
                    const days = Math.abs(_daysDiff(r[det.receivedDate]));
                    const daysLabel = days === 0 ? "reçu aujourd'hui" : days === 1 ? "reçu hier" : `reçu il y a ${days}j`;
                    items.push({
                        dotCls:"dot-send", tagCls:"tag-send",
                        tagLabel:`📦 À envoyer (${daysLabel})`,
                        title:"Reçu — à envoyer au client",
                        action:`${daysLabel.charAt(0).toUpperCase()+daysLabel.slice(1)} — organiser l'envoi`,
                        style:getStyle(r), client:getClient(r),
                        meta:`Reçu le : ${_fmtDate(r[det.receivedDate])}${getFsr(r)}`,
                        urgency: days >= 3 ? "mid" : "low", sheet:key, rowIndex:r._rowIndex
                    });
                } else if (hasSending) {
                    const days = Math.abs(_daysDiff(r[det.sendingDate]));
                    const urgency = days >= 14 ? "high" : days >= 7 ? "mid" : "low";
                    const urgencyLabel = urgency === "high" ? " 🚨" : urgency === "mid" ? " ⚡" : "";
                    items.push({
                        dotCls:"dot-approve", tagCls:"tag-approve",
                        tagLabel:`⏳ Approval ${days}j${urgencyLabel}`,
                        title:`Envoyé — approbation en attente depuis ${days}j`,
                        action: urgency === "high" ? "Relancer de toute urgence" : urgency === "mid" ? "Envoyer un rappel" : "Attendre ou relancer",
                        style:getStyle(r), client:getClient(r),
                        meta:`Envoyé le : ${_fmtDate(r[det.sendingDate])}${getFsr(r)}`,
                        urgency, sheet:key, rowIndex:r._rowIndex
                    });
                }
                return;
            }

            // ── États A / B : pas encore reçu ──────────────────────
            if (hasFsr && !hasReadyDate) {
                // État A : FSR lancé mais Ready Date absente → relancer mail
                const fsrAgo = det.fsrDate ? timeAgo(r[det.fsrDate]) : "";
                items.push({
                    dotCls:"dot-nopo", tagCls:"tag-nopo",
                    tagLabel:`📧 Ready Date manquante`,
                    title:`FSR lancé — Ready Date non renseignée`,
                    action:`Relancer un mail pour obtenir la Ready Date${fsrAgo ? " (FSR "+fsrAgo+")" : ""}`,
                    style:getStyle(r), client:getClient(r),
                    meta:`FSR lancé le : ${det.fsrDate ? _fmtDate(r[det.fsrDate]) : "—"}${getFsr(r)}`,
                    urgency:"mid", sheet:key, rowIndex:r._rowIndex
                });
            } else if (hasReadyDate) {
                // État B : Ready Date présente, attente réception
                const diff = _daysDiff(r[det.readyDate]);
                if (diff < 0) {
                    const days = Math.abs(diff);
                    items.push({
                        dotCls:"dot-late", tagCls:"tag-late",
                        tagLabel:`🔴 En retard — ${days}j`,
                        title:`Ready Date dépassée de ${days}j — non reçu`,
                        action:"Relancer la factory pour confirmer l'avancement",
                        style:getStyle(r), client:getClient(r),
                        meta:`Ready Date : ${_fmtDate(r[det.readyDate])}${getFsr(r)}`,
                        urgency:"high", sheet:key, rowIndex:r._rowIndex
                    });
                } else if (diff === 0) {
                    items.push({
                        dotCls:"dot-today", tagCls:"tag-today",
                        tagLabel:`🟡 Attendu aujourd'hui`,
                        title:`Ready Date aujourd'hui — prévoir la réception`,
                        action:"Confirmer la réception dès réception",
                        style:getStyle(r), client:getClient(r),
                        meta:`Ready Date : ${_fmtDate(r[det.readyDate])}${getFsr(r)}`,
                        urgency:"low", sheet:key, rowIndex:r._rowIndex
                    });
                } else {
                    items.push({
                        dotCls:"dot-risk", tagCls:"tag-risk",
                        tagLabel:`🕐 Dans ${diff}j`,
                        title:`En attente de réception — prêt dans ${diff} jour${diff>1?"s":""}`,
                        action:`Prévoir la réception le ${_fmtDate(r[det.readyDate])}`,
                        style:getStyle(r), client:getClient(r),
                        meta:`Ready Date : ${_fmtDate(r[det.readyDate])}${getFsr(r)}`,
                        urgency:"low", sheet:key, rowIndex:r._rowIndex
                    });
                }
            } else {
                // Colonnes date dépassées (hors received/sending/ready/fsr)
                cfg.cols.filter(c => c.type === "date").forEach(col => {
                    const colLbl = col.label.toLowerCase();
                    if (colLbl.includes("receiv") || colLbl.includes("recep") || colLbl.includes("send") || colLbl.includes("envoi")
                        || colLbl.includes("ready") || colLbl.includes("fsr")) return;
                    const val = r[col.key]; if (!val) return;
                    const diff = _daysDiff(val);
                    if (diff < 0) {
                        const days = Math.abs(diff);
                        items.push({
                            dotCls:"dot-late", tagCls:"tag-late",
                            tagLabel:`🔴 ${col.label} — ${days}j`,
                            title:`${col.label} dépassée de ${days} jour${days>1?"s":""}`,
                            action:`Mettre à jour la colonne "${col.label}" ou replanifier`,
                            style:getStyle(r), client:getClient(r),
                            meta:`${col.label} : ${_fmtDate(val)}`,
                            urgency:"high", sheet:key, rowIndex:r._rowIndex
                        });
                    } else if (diff === 0) {
                        items.push({
                            dotCls:"dot-today", tagCls:"tag-today",
                            tagLabel:`🟡 ${col.label} — aujourd'hui`,
                            title:`${col.label} échoit aujourd'hui`,
                            action:`Confirmer ou mettre à jour la colonne "${col.label}"`,
                            style:getStyle(r), client:getClient(r),
                            meta:`${col.label} : ${_fmtDate(val)}`,
                            urgency:"low", sheet:key, rowIndex:r._rowIndex
                        });
                    }
                });
            }
        });

        if (items.length) all[key] = { label:cfg.label, items };
    });

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
        state.activeView  = "sheet";
        state.activeSheet = sheetKey;
        state.searchQuery = ""; state.filterDept = ""; state.filterClient = "";
        state.sortCol = null; state.sortDir = 1;
        searchInput.value = ""; deptFilter.value = "";
        const cf = document.getElementById("client-filter"); if (cf) cf.value = "";
        document.querySelectorAll(".nav-item").forEach(b => {
            b.classList.remove("active"); b.setAttribute("aria-selected","false");
        });
        navBtn.classList.add("active"); navBtn.setAttribute("aria-selected","true");
        const titles = { details:"Détails des Styles", sample:"Suivi des Samples", ordering:"Gestion des Commandes" };
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
            targetRow.scrollIntoView({ behavior:"smooth", block:"center" });

            // Surbrillance animée
            targetRow.classList.add("row-highlight");
            setTimeout(() => targetRow.classList.remove("row-highlight"), 3000);
        }
    }, 350); // laisser le temps au DOM de se rendre
}

// ── Badge cloche dans le header ───────────────────────────────
function updateGlobalNotifBadge() {
    const btn   = document.getElementById("btn-notif-global");
    const badge = document.getElementById("notif-global-badge");
    if (!btn || !badge) return;
    const total = Object.values(collectAllAlerts()).reduce((s,v) => s+v.items.length, 0);
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
            <div class="gnd-tabs" id="gnd-tabs"></div>
            <div class="gnd-body"  id="gnd-body"></div>
        </div>`;
        document.body.appendChild(drawer);
    }
    _renderGndFull();
    requestAnimationFrame(() => drawer.classList.add("open"));
}

function closeGlobalNotifDrawer() {
    const d = document.getElementById("global-notif-drawer");
    if (d) d.classList.remove("open");
}

function gndSetTab(key) { _gndActiveTab = key; _renderGndFull(); }

function _renderGndFull() {
    const all   = collectAllAlerts();
    const keys  = Object.keys(all);
    const total = keys.reduce((s,k) => s + all[k].items.length, 0);

    // Sub-header
    const sub = document.getElementById("gnd-header-sub");
    if (sub) sub.textContent = total
        ? `${total} alerte${total>1?"s":""} · ${keys.length} menu${keys.length>1?"s":""}`
        : "Aucune alerte active";

    // Tabs
    if (!all[_gndActiveTab] && _gndActiveTab !== "__all__") _gndActiveTab = "__all__";
    const tabsEl = document.getElementById("gnd-tabs");
    tabsEl.innerHTML =
        `<button class="gnd-tab${_gndActiveTab==="__all__"?" active":""}" onclick="gndSetTab('__all__')">Tous <span class="gnd-tab-badge">${total}</span></button>` +
        keys.map(k => `<button class="gnd-tab${_gndActiveTab===k?" active":""}" onclick="gndSetTab('${k}')">${esc(all[k].label)} <span class="gnd-tab-badge">${all[k].items.length}</span></button>`).join("");

    // Body
    const body = document.getElementById("gnd-body");
    if (!keys.length) {
        body.innerHTML = `<div class="gnd-ok"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="15" height="15"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Tout est à jour — aucune alerte active.</div>`;
        return;
    }

    const renderRow = item => `
    <div class="gnd-row${item.urgency==="high"?" gnd-row-high":item.urgency==="mid"?" gnd-row-mid":""}${item.rowIndex!=null?" gnd-row-clickable":""}"
         ${item.rowIndex!=null?`onclick="navigateToRow('${item.sheet}',${item.rowIndex})" title="Cliquer pour voir la ligne"`:""}>
        <span class="gnd-row-dot ${item.dotCls}"></span>
        <div class="gnd-row-info">
            <div class="gnd-row-top">
                <span class="gnd-row-style">${esc(item.style)}</span>
                ${item.client?`<span class="gnd-row-client">${esc(item.client)}</span>`:""}
                <span class="gnd-row-tag ${item.tagCls}">${item.tagLabel}</span>
            </div>
            <div class="gnd-row-title">${esc(item.title)}</div>
            <div class="gnd-row-action">→ ${esc(item.action)}</div>
            <div class="gnd-row-meta">${item.meta||""}</div>
        </div>
        ${item.rowIndex!=null?`<span class="gnd-row-goto" title="Voir la ligne">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="13" height="13"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
        </span>`:""}
    </div>`;

    let html = "";
    if (_gndActiveTab === "__all__") {
        keys.forEach(k => {
            html += `<div class="gnd-section-title">${esc(all[k].label)} <span style="font-weight:400;color:var(--text-muted)">(${all[k].items.length})</span></div>`;
            html += all[k].items.map(renderRow).join("");
        });
    } else {
        html = (all[_gndActiveTab]?.items || []).map(renderRow).join("");
    }
    body.innerHTML = html || `<div class="gnd-empty">Aucune alerte pour ce menu.</div>`;
}

// ── Export Excel global ───────────────────────────────────────
function exportGlobalNotifExcel() {
    _waitForXLSX(function(XL) {
        if (!XL) { showToast("Bibliothèque Excel non chargée — vérifiez votre connexion", "error"); return; }
        const all  = collectAllAlerts();
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
            <div class="aas-spinner"></div>
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
        .slice(0,2).join("");

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
                    <div class="usm-section-desc">Modifiez cette URL pour pointer vers un autre Google Sheet.</div>
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
    const initials = (u.displayName || u.email || "?").trim().split(" ").filter(Boolean).map(p=>p[0].toUpperCase()).slice(0,2).join("");
    document.getElementById("usm-avatar").innerHTML = u.photoURL
        ? `<img class="usm-photo" src="${u.photoURL}" alt="Photo"/>`
        : `<div class="usm-initials">${initials}</div>`;
    document.getElementById("usm-name").textContent  = u.displayName || "—";
    document.getElementById("usm-email").textContent = u.email || "—";
    document.getElementById("usm-gas-input").value   = u.gasUrl || "";

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
