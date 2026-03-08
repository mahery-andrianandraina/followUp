// ============================================================
// AW27 CHECKERS – Dashboard JavaScript
// ============================================================

const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzUtCDaahDoLmQQpsQZptENDosbJrUhuSb1DNZlg8Ly9VAdtCj8111JCRSesazleMPh/exec"; // <-- Paste your deployed URL here

// ─── Sheet Definitions ──────────────────────────────────────
const SHEET_CONFIG = {
    details: {
        label: "Details",
        cols: [
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
            { label: "Total Styles", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>`, colorClass: "teal", compute: rows => rows.length },
            { label: "Total Qty", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`, colorClass: "blue", compute: rows => rows.reduce((s, r) => s + (+r.OrderQty || 0), 0).toLocaleString() },
            { label: "Departments", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`, colorClass: "yellow", compute: rows => new Set(rows.map(r => r.Dept).filter(Boolean)).size },
            { label: "Upcoming ExFty", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`, colorClass: "green", compute: rows => rows.filter(r => r.ExFty && new Date(r.ExFty) >= new Date()).length }
        ]
    },
    sample: {
        label: "Sample",
        cols: [
            { key: "Dept", label: "Dept", type: "text", required: true },
            { key: "Style", label: "Style", type: "text", required: true },
            { key: "StyleDescription", label: "Description", type: "text", full: true },
            { key: "Type", label: "Type", type: "text" },
            { key: "Fabric", label: "Fabric", type: "text" },
            { key: "Size", label: "Size", type: "text" },
            { key: "SRS Date", label: "SRS Date", type: "date" },
            { key: "Ready Date", label: "Ready Date", type: "date" },
            { key: "Approval", label: "Approval", type: "select", options: ["", "Approved", "Pending", "Rejected"] },
            { key: "Remarks", label: "Remarks", type: "textarea", full: true }
        ],
        kpis: [
            { label: "Total Samples", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>`, colorClass: "teal", compute: rows => rows.length },
            { label: "Approved", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`, colorClass: "green", compute: rows => rows.filter(r => r.Approval === "Approved").length },
            { label: "Pending", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`, colorClass: "yellow", compute: rows => rows.filter(r => r.Approval === "Pending").length },
            { label: "Rejected", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`, colorClass: "red", compute: rows => rows.filter(r => r.Approval === "Rejected").length }
        ]
    },
    ordering: {
        label: "Ordering",
        cols: [
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
            { key: "Comments", label: "Comments", type: "textarea", full: true }
        ],
        kpis: [
            { label: "Total Orders", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>`, colorClass: "teal", compute: rows => rows.length },
            { label: "Suppliers", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>`, colorClass: "blue", compute: rows => new Set(rows.map(r => r.Supplier).filter(Boolean)).size },
            { label: "With PO", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`, colorClass: "green", compute: rows => rows.filter(r => r.PO).length },
            { label: "Upcoming Ready", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`, colorClass: "yellow", compute: rows => rows.filter(r => r["Ready Date"] && new Date(r["Ready Date"]) >= new Date()).length }
        ]
    }
};

// ─── App State ───────────────────────────────────────────────
let state = {
    activeSheet: "details",
    data: { details: [], sample: [], ordering: [] },
    filteredData: [],
    editingRow: null,
    loading: true,
    searchQuery: "",
    filterDept: "",
    sortCol: null,
    sortDir: 1
};

// ─── DOM Refs ────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const kpiGrid = $("kpi-grid");
const tableHead = $("table-head");
const tableBody = $("table-body");
const searchInput = $("search-input");
const deptFilter = $("dept-filter");
const modalOverlay = $("modal-overlay");
const modalTitle = $("modal-title");
const modalSubTitle = $("modal-subtitle");
const formFields = $("form-fields");
const formSave = $("form-save");
const confirmOverlay = $("confirm-overlay");
const toastContainer = $("toast-container");

// ─── Init ────────────────────────────────────────────────────
async function init() {
    setupTabListeners();
    setupSearchAndFilter();
    await fetchAllData();
    renderAll();
}

// ─── Tabs ────────────────────────────────────────────────────
function setupTabListeners() {
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            state.activeSheet = btn.dataset.sheet;
            state.searchQuery = "";
            state.filterDept = "";
            state.sortCol = null;
            state.sortDir = 1;
            searchInput.value = "";
            deptFilter.value = "";
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            applyFilters();
            renderKPIs();
            populateDeptFilter();
        });
    });
}

// ─── Fetch ────────────────────────────────────────────────────
async function fetchAllData() {
    showTableSpinner();
    try {
        const res = await fetch(GOOGLE_APPS_SCRIPT_URL);
        const json = await res.json();
        if (json.status !== "ok") throw new Error(json.message);
        state.data.details = json.data.details.rows || [];
        state.data.sample = json.data.sample.rows || [];
        state.data.ordering = json.data.ordering.rows || [];
        state.loading = false;
    } catch (err) {
        console.error(err);
        state.loading = false;
        // Demo mode if no URL is set
        if (GOOGLE_APPS_SCRIPT_URL === "YOUR_WEB_APP_URL_HERE") {
            showToast("Mode démo — Configurez GOOGLE_APPS_SCRIPT_URL dans app.js pour connecter votre Sheet.", "info", 6000);
            state.data = getDemoData();
        } else {
            showToast("Erreur de connexion au Google Sheet", "error");
        }
    }
}

// ─── Demo Data ────────────────────────────────────────────────
function getDemoData() {
    return {
        details: [
            { _rowIndex: 2, Dept: "MEN", Style: "ST001", StyleDescription: "Slim Fit Chinos", FabricBase: "Cotton Poplin", Costing: "12.50", OrderQty: 500, PSD: "2026-04-01", ExFty: "2026-06-15" },
            { _rowIndex: 3, Dept: "WOMEN", Style: "ST002", StyleDescription: "Floral Midi Dress", FabricBase: "Rayon", Costing: "18.00", OrderQty: 350, PSD: "2026-04-10", ExFty: "2026-07-01" },
            { _rowIndex: 4, Dept: "KIDS", Style: "ST003", StyleDescription: "Cargo Shorts", FabricBase: "Twill", Costing: "8.75", OrderQty: 800, PSD: "2026-03-20", ExFty: "2026-05-30" },
            { _rowIndex: 5, Dept: "MEN", Style: "ST004", StyleDescription: "Oxford Button Down", FabricBase: "Cotton", Costing: "15.20", OrderQty: 420, PSD: "2026-05-01", ExFty: "2026-07-20" },
            { _rowIndex: 6, Dept: "WOMEN", Style: "ST005", StyleDescription: "High Waist Trousers", FabricBase: "Linen Blend", Costing: "22.00", OrderQty: 280, PSD: "2026-04-25", ExFty: "2026-08-01" }
        ],
        sample: [
            { _rowIndex: 2, Dept: "MEN", Style: "ST001", StyleDescription: "Slim Fit Chinos", Type: "Fit", Fabric: "Cotton Poplin", Size: "M", "SRS Date": "2026-03-10", "Ready Date": "2026-03-25", Remarks: "Check inseam", Approval: "Approved" },
            { _rowIndex: 3, Dept: "WOMEN", Style: "ST002", StyleDescription: "Floral Midi Dress", Type: "PP", Fabric: "Rayon", Size: "S", "SRS Date": "2026-03-15", "Ready Date": "2026-04-01", Remarks: "Correct print", Approval: "Pending" },
            { _rowIndex: 4, Dept: "KIDS", Style: "ST003", StyleDescription: "Cargo Shorts", Type: "Fit", Fabric: "Twill", Size: "6", "SRS Date": "2026-03-05", "Ready Date": "2026-03-20", Remarks: "", Approval: "Rejected" },
            { _rowIndex: 5, Dept: "MEN", Style: "ST004", StyleDescription: "Oxford Button Down", Type: "SMS", Fabric: "Cotton", Size: "L", "SRS Date": "2026-04-01", "Ready Date": "2026-04-20", Remarks: "Collar check", Approval: "Pending" }
        ],
        ordering: [
            { _rowIndex: 2, Dept: "MEN", Style: "ST001", StyleDescription: "Slim Fit Chinos", Color: "Navy", Trims: "Buttons", Supplier: "Supplier A", UP: "12.50", PO: "PO-2026-001", "PO Date": "2026-03-01", "Ready Date": "2026-06-15", PI: "PI-001", Comments: "" },
            { _rowIndex: 3, Dept: "WOMEN", Style: "ST002", StyleDescription: "Floral Midi Dress", Color: "Multi", Trims: "Zipper", Supplier: "Supplier B", UP: "18.00", PO: "PO-2026-002", "PO Date": "2026-03-05", "Ready Date": "2026-07-01", PI: "PI-002", Comments: "Rush order" },
            { _rowIndex: 4, Dept: "KIDS", Style: "ST003", StyleDescription: "Cargo Shorts", Color: "Khaki", Trims: "Buttons", Supplier: "Supplier A", UP: "8.75", PO: "", "PO Date": "", "Ready Date": "2026-05-30", PI: "", Comments: "" },
            { _rowIndex: 5, Dept: "MEN", Style: "ST004", StyleDescription: "Oxford Button Down", Color: "White", Trims: "Buttons", Supplier: "Supplier C", UP: "15.20", PO: "PO-2026-003", "PO Date": "2026-04-01", "Ready Date": "2026-07-20", PI: "", Comments: "" }
        ]
    };
}

// ─── Render All ───────────────────────────────────────────────
function renderAll() {
    applyFilters();
    renderKPIs();
    populateDeptFilter();
}

// ─── KPIs (compact bar) ───────────────────────────────────────
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
    </div>
  `).join("");
}


// ─── Filter & Sort ────────────────────────────────────────────
function setupSearchAndFilter() {
    searchInput.addEventListener("input", e => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        applyFilters();
    });
    deptFilter.addEventListener("change", e => {
        state.filterDept = e.target.value;
        applyFilters();
    });
}

function applyFilters() {
    const rows = state.data[state.activeSheet];
    let filtered = rows.filter(row => {
        if (state.filterDept && row.Dept !== state.filterDept) return false;
        if (state.searchQuery) {
            const haystack = Object.values(row).join(" ").toLowerCase();
            if (!haystack.includes(state.searchQuery)) return false;
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
    deptFilter.innerHTML = `<option value="">Tous les depts</option>` +
        depts.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join("");
    deptFilter.value = state.filterDept;
}

// ─── Table Render ─────────────────────────────────────────────
function showTableSpinner() {
    tableHead.innerHTML = "";
    tableBody.innerHTML = `<tr><td colspan="99"><div class="spinner-wrap"><div class="spinner"></div></div></td></tr>`;
}

function renderTable() {
    const cfg = SHEET_CONFIG[state.activeSheet];
    const rows = state.filteredData;

    // Headers — show ALL columns
    const displayCols = cfg.cols;
    tableHead.innerHTML = `<tr>
    ${displayCols.map(c => `
      <th onclick="sortBy('${c.key}')" title="Trier par ${c.label}">
        ${c.label} ${state.sortCol === c.key ? (state.sortDir === 1 ? "↑" : "↓") : ""}
      </th>
    `).join("")}
    <th>Actions</th>
  </tr>`;

    // Rows
    if (!rows.length) {
        tableBody.innerHTML = `<tr><td colspan="${displayCols.length + 1}">
      <div class="empty-state">
        <div class="empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        </div>
        <h3>Aucune donnée</h3>
        <p>Ajoutez une ligne ou modifiez votre recherche.</p>
      </div>
    </td></tr>`;
        return;
    }

    tableBody.innerHTML = rows.map((row, idx) => {
        const rowIdx = row._rowIndex;
        const cells = displayCols.map(c => {
            let val = row[c.key] ?? "";
            if (c.key === "Dept") return `<td><span class="dept-badge">${esc(val)}</span></td>`;
            if (c.key === "Approval") {
                const cls = val.toLowerCase() || "unknown";
                return `<td><span class="approval-badge ${cls}">${esc(val) || "—"}</span></td>`;
            }
            if (c.type === "date" && val) {
                try { val = new Date(val).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }); } catch (e) { }
            }
            return `<td title="${esc(String(val))}">${esc(String(val)) || "<span style='color:var(--text-muted)'>—</span>"}</td>`;
        }).join("");
        return `<tr>
      ${cells}
      <td>
        <div class="action-btns">
          <button class="btn btn-edit btn-icon" onclick="openEditModal(${rowIdx})" title="Modifier">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button class="btn btn-danger btn-icon" onclick="confirmDelete(${rowIdx})" title="Supprimer">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
    }).join("");
}

// ─── Sort ─────────────────────────────────────────────────────
function sortBy(col) {
    if (state.sortCol === col) state.sortDir *= -1;
    else { state.sortCol = col; state.sortDir = 1; }
    applyFilters();
}

// ─── Modal (Add/Edit) ─────────────────────────────────────────
function openAddModal() {
    state.editingRow = null;
    const cfg = SHEET_CONFIG[state.activeSheet];
    modalTitle.textContent = `Ajouter – ${cfg.label}`;
    modalSubTitle.textContent = "Remplissez les champs ci-dessous";
    buildForm(cfg.cols, {});
    formSave.textContent = "Enregistrer";
    openModal();
}

function openEditModal(rowIndex) {
    const row = state.data[state.activeSheet].find(r => r._rowIndex === rowIndex);
    if (!row) return;
    state.editingRow = rowIndex;
    const cfg = SHEET_CONFIG[state.activeSheet];
    modalTitle.textContent = `Modifier – ${cfg.label}`;
    modalSubTitle.textContent = `Ligne ${rowIndex}`;
    buildForm(cfg.cols, row);
    formSave.textContent = "Mettre à jour";
    openModal();
}

function buildForm(cols, data) {
    formFields.innerHTML = cols.map(col => {
        const val = data[col.key] ?? "";
        const full = col.full ? " full" : "";
        let input;
        if (col.type === "textarea") {
            input = `<textarea class="form-textarea" id="field-${sanitizeId(col.key)}" placeholder="${col.label}">${esc(String(val))}</textarea>`;
        } else if (col.type === "select") {
            const opts = col.options.map(o => `<option value="${esc(o)}" ${o === val ? "selected" : ""}>${esc(o) || "— Sélectionner —"}</option>`).join("");
            input = `<select class="form-select" id="field-${sanitizeId(col.key)}">${opts}</select>`;
        } else {
            input = `<input class="form-input" id="field-${sanitizeId(col.key)}" type="${col.type === "date" ? "date" : "text"}" value="${esc(String(val))}" placeholder="${col.label}" ${col.required ? "required" : ""}>`;
        }
        return `<div class="form-group${full}">
      <label class="form-label" for="field-${sanitizeId(col.key)}">${col.label}${col.required ? ' <span style="color:var(--danger)">*</span>' : ""}</label>
      ${input}
    </div>`;
    }).join("");
}

function getFormData() {
    const cfg = SHEET_CONFIG[state.activeSheet];
    const data = {};
    cfg.cols.forEach(col => {
        const el = document.getElementById(`field-${sanitizeId(col.key)}`);
        if (el) data[col.key] = el.value;
    });
    return data;
}

function openModal() { modalOverlay.classList.add("open"); }
function closeModal() { modalOverlay.classList.remove("open"); state.editingRow = null; }

// ─── Save (Create / Update) ───────────────────────────────────
async function saveForm() {
    const cfg = SHEET_CONFIG[state.activeSheet];
    const data = getFormData();

    // Prevent Google Sheets auto-formatting 'Size' as a date (e.g., "3/4")
    if (data["Size"]) {
        data["Size"] = "'" + data["Size"];
    }

    // Validate required
    const missing = cfg.cols.filter(c => c.required && !data[c.key]);
    if (missing.length) {
        showToast(`Champ requis : ${missing.map(c => c.label).join(", ")}`, "error");
        return;
    }

    formSave.disabled = true;
    formSave.textContent = "Enregistrement…";

    try {
        if (state.editingRow) {
            await sendRequest("UPDATE", { data, rowIndex: state.editingRow });
            const idx = state.data[state.activeSheet].findIndex(r => r._rowIndex === state.editingRow);
            if (idx !== -1) state.data[state.activeSheet][idx] = { ...state.data[state.activeSheet][idx], ...data };
            showToast("Ligne mise à jour avec succès", "success");
        } else {
            await sendRequest("CREATE", { data });
            await fetchAllData(); // Re-fetch to get new _rowIndex
        }
        closeModal();
        renderAll();
    } catch (err) {
        showToast("Erreur : " + err.message, "error");
    } finally {
        formSave.disabled = false;
        formSave.textContent = state.editingRow ? "Mettre à jour" : "Enregistrer";
    }
}

// ─── Delete ───────────────────────────────────────────────────
let pendingDeleteRow = null;

function confirmDelete(rowIndex) {
    pendingDeleteRow = rowIndex;
    confirmOverlay.classList.add("open");
}

function cancelDelete() {
    pendingDeleteRow = null;
    confirmOverlay.classList.remove("open");
}

async function executeDelete() {
    if (!pendingDeleteRow) return;
    const btn = document.getElementById("confirm-delete-btn");
    btn.disabled = true;
    btn.textContent = "Suppression…";

    try {
        await sendRequest("DELETE", { rowIndex: pendingDeleteRow });
        state.data[state.activeSheet] = state.data[state.activeSheet].filter(r => r._rowIndex !== pendingDeleteRow);
        confirmOverlay.classList.remove("open");
        pendingDeleteRow = null;
        renderAll();
        showToast("Ligne supprimée avec succès", "success");
    } catch (err) {
        showToast("Erreur : " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "Supprimer";
    }
}

// ─── API Call ─────────────────────────────────────────────────
async function sendRequest(action, payload) {
    if (GOOGLE_APPS_SCRIPT_URL === "YOUR_WEB_APP_URL_HERE") {
        // Demo mode — simulate success
        await new Promise(r => setTimeout(r, 500));
        return { status: "ok" };
    }
    const res = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({ action, sheet: state.activeSheet, ...payload })
    });
    const json = await res.json();
    if (json.status !== "ok") throw new Error(json.message);
    return json;
}

// ─── Toast ────────────────────────────────────────────────────
function showToast(msg, type = "info", duration = 3500) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-msg">${msg}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = "toast-out 0.3s ease forwards";
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ─── Helpers ──────────────────────────────────────────────────
function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function sanitizeId(s) { return s.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, ""); }

// ─── Start ────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", init);
