// ============================================================
// AW27 CHECKERS – Dashboard JavaScript
// ============================================================

const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwsHN5hY9va4k5JOU2GFfUrtQ0-WjI2Tb5LyK6daFmHmWCg4aELgAYOg8NizrtY4VwJ/exec";

// ─── Delivery Track Logic ────────────────────────────────────
function computeDeliveryTrack(row) {
    const status = row["Status"] || "";
    if (status === "Cancelled") return { label: "Cancelled", cls: "track-cancelled" };
    if (row["Delivery Status"] === "Delivered") return { label: "Delivered", cls: "track-delivered" };
    const rd = row["Ready Date"];
    if (!rd) return { label: "No Date", cls: "track-nodate" };
    const today = new Date(); today.setHours(0,0,0,0);
    const ready = new Date(rd);
    const diff  = Math.round((ready - today) / 86400000);
    if (diff < 0)   return { label: `Late ${Math.abs(diff)}j`,  cls: "track-late" };
    if (diff <= 14) return { label: `At Risk ${diff}j`,          cls: "track-atrisk" };
    return              { label: `On Track ${diff}j`,            cls: "track-ok" };
}

// ─── Sheet Definitions ──────────────────────────────────────
const SHEET_CONFIG = {
    details: {
        label: "Details",
        cols: [
            { key: "Client",           label: "Client",      type: "text",   required: true },
            { key: "Dept",             label: "Dept",        type: "text",   required: true },
            { key: "Style",            label: "Style",       type: "text",   required: true },
            { key: "StyleDescription", label: "Description", type: "text",   full: true },
            { key: "FabricBase",       label: "Fabric Base", type: "text" },
            { key: "Costing",          label: "Costing",     type: "text" },
            { key: "OrderQty",         label: "Order Qty",   type: "number" },
            { key: "PSD",              label: "PSD",         type: "date" },
            { key: "ExFty",            label: "Ex-Fty",      type: "date" }
        ],
        kpis: [
            { label: "Total Styles",    colorClass: "teal",   icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>`, compute: rows => rows.length },
            { label: "Total Qty",       colorClass: "blue",   icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`, compute: rows => rows.reduce((s,r)=>s+(+r.OrderQty||0),0).toLocaleString() },
            { label: "Departments",     colorClass: "yellow", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`, compute: rows => new Set(rows.map(r=>r.Dept).filter(Boolean)).size },
            { label: "Upcoming ExFty",  colorClass: "green",  icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`, compute: rows => rows.filter(r=>r.ExFty&&new Date(r.ExFty)>=new Date()).length }
        ]
    },
    sample: {
        label: "Sample",
        cols: [
            { key: "Client",           label: "Client",      type: "text",   required: true },
            { key: "Dept",             label: "Dept",        type: "text",   required: true },
            { key: "Style",            label: "Style",       type: "text",   required: true },
            { key: "StyleDescription", label: "Description", type: "text",   full: true },
            { key: "Type",             label: "Type",        type: "text" },
            { key: "Fabric",           label: "Fabric",      type: "text" },
            { key: "Size",             label: "Size",        type: "text" },
            { key: "SRS Date",         label: "SRS Date",    type: "date" },
            { key: "Ready Date",       label: "Ready Date",  type: "date" },
            { key: "Approval",         label: "Approval",    type: "select", options: ["","Approved","Pending","Rejected"] },
            { key: "Remarks",          label: "Remarks",     type: "textarea", full: true }
        ],
        kpis: [
            { label: "Total Samples", colorClass: "teal",   icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>`, compute: rows => rows.length },
            { label: "Approved",      colorClass: "green",  icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`, compute: rows => rows.filter(r=>r.Approval==="Approved").length },
            { label: "Pending",       colorClass: "yellow", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`, compute: rows => rows.filter(r=>r.Approval==="Pending").length },
            { label: "Rejected",      colorClass: "red",    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`, compute: rows => rows.filter(r=>r.Approval==="Rejected").length }
        ]
    },
    ordering: {
        label: "Ordering",
        cols: [
            { key: "Client",           label: "Client",          type: "text",   required: true },
            { key: "Dept",             label: "Dept",            type: "text",   required: true },
            { key: "Style",            label: "Style",           type: "text",   required: true },
            { key: "StyleDescription", label: "Description",     type: "text",   full: true },
            { key: "Color",            label: "Color",           type: "text" },
            { key: "Trims",            label: "Trims",           type: "text" },
            { key: "Supplier",         label: "Supplier",        type: "text" },
            { key: "UP",               label: "Unit Price",      type: "text" },
            { key: "PO",               label: "PO #",            type: "text" },
            { key: "PO Date",          label: "PO Date",         type: "date" },
            { key: "Ready Date",       label: "Ready Date",      type: "date" },
            { key: "PI",               label: "PI",              type: "text" },
            { key: "Status",           label: "Status",          type: "select", options: ["","Confirmed","Pending","Cancelled"] },
            { key: "Delivery Status",  label: "Delivery",        type: "select", options: ["","Not Shipped","In Transit","Delivered"] },
            { key: "Comments",         label: "Comments",        type: "textarea", full: true }
        ],
        kpis: [
            { label: "Total Orders",   colorClass: "teal",  icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>`, compute: rows => rows.filter(r=>r.Status!=="Cancelled").length },
            { label: "Late/At Risk",   colorClass: "red",   icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`, compute: rows => rows.filter(r=>{const t=computeDeliveryTrack(r);return t.cls==="track-late"||t.cls==="track-atrisk";}).length },
            { label: "On Track",       colorClass: "green", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`, compute: rows => rows.filter(r=>computeDeliveryTrack(r).cls==="track-ok").length },
            { label: "Delivered",      colorClass: "blue",  icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>`, compute: rows => rows.filter(r=>r["Delivery Status"]==="Delivered").length }
        ]
    }
};

// ─── State ────────────────────────────────────────────────────
let state = {
    activeSheet: "details",
    data: { details: [], sample: [], ordering: [], style: [] },
    filteredData: [], editingRow: null, loading: true,
    searchQuery: "", filterDept: "", filterClient: "",
    sortCol: null, sortDir: 1
};

// ─── DOM Refs ────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const kpiGrid      = $("kpi-grid");
const tableHead    = $("table-head");
const tableBody    = $("table-body");
const searchInput  = $("search-input");
const deptFilter   = $("dept-filter");
const clientFilter = $("client-filter");
const modalOverlay = $("modal-overlay");
const modalTitle   = $("modal-title");
const modalSubTitle= $("modal-subtitle");
const formFields   = $("form-fields");
const formSave     = $("form-save");
const confirmOverlay  = $("confirm-overlay");
const toastContainer  = $("toast-container");

// ─── Init ─────────────────────────────────────────────────────
async function init() {
    setupTabListeners();
    setupSearchAndFilter();
    await fetchAllData();
    renderAll();
}

// ─── Sidebar Toggle ──────────────────────────────────────
function toggleSidebar() {
    document.body.classList.toggle("sidebar-collapsed");
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("collapsed");
}

// ─── Tabs ─────────────────────────────────────────────────────
function setupTabListeners() {
    document.querySelectorAll(".nav-item[data-sheet]").forEach(btn => {
        btn.addEventListener("click", () => {
            state.activeSheet  = btn.dataset.sheet;
            state.searchQuery  = "";
            state.filterDept   = "";
            state.filterClient = "";
            state.sortCol = null; state.sortDir = 1;
            searchInput.value = "";
            deptFilter.value  = "";
            const cf = document.getElementById("client-filter");
            if (cf) cf.value = "";
            document.querySelectorAll(".nav-item[data-sheet]").forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-selected", "false");
            });
            btn.classList.add("active");
            btn.setAttribute("aria-selected", "true");
            // Update header title
            const titles = { details: "Détails des Styles", sample: "Suivi des Samples", ordering: "Gestion des Commandes" };
            const el = document.getElementById("header-sheet-title");
            if (el) el.textContent = titles[btn.dataset.sheet] || btn.dataset.sheet;
            applyFilters();
            renderKPIs();
            populateDeptFilter();
            populateClientFilter();
            if (btn.dataset.sheet === "ordering") renderAlertsPanel();
            else hideAlertsPanel();
        });
    });
}

// ─── Fetch ────────────────────────────────────────────────────
async function fetchAllData() {
    showTableSpinner();
    try {
        const res  = await fetch(GOOGLE_APPS_SCRIPT_URL);
        const json = await res.json();
        if (json.status !== "ok") throw new Error(json.message);

        // Assign _rowIndex if missing or fix offset (row 1 = headers → data starts at row 2)
        const fixRows = (rows) => (rows || []).map((r, i) => ({
            ...r,
            _rowIndex: r._rowIndex ?? (i + 2)
        }));

        state.data.details  = fixRows(json.data.details?.rows);
        state.data.sample   = fixRows(json.data.sample?.rows);
        state.data.ordering = fixRows(json.data.ordering?.rows);
        state.data.style    = fixRows(json.data.style?.rows);
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
    const d = (n) => { const x=new Date(t); x.setDate(x.getDate()+n); return x.toISOString().slice(0,10); };
    return {
        details: [
            { _rowIndex:2, Client:"CALVIN KLEIN", Dept:"MEN",   Style:"ST001", StyleDescription:"Slim Fit Chinos",     FabricBase:"Cotton Poplin", Costing:"12.50", OrderQty:500, PSD:d(10),  ExFty:d(90)  },
            { _rowIndex:3, Client:"CALVIN KLEIN", Dept:"WOMEN", Style:"ST002", StyleDescription:"Floral Midi Dress",   FabricBase:"Rayon",         Costing:"18.00", OrderQty:350, PSD:d(15),  ExFty:d(110) },
            { _rowIndex:4, Client:"TOMMY",        Dept:"KIDS",  Style:"ST003", StyleDescription:"Cargo Shorts",        FabricBase:"Twill",         Costing:"8.75",  OrderQty:800, PSD:d(-5),  ExFty:d(-10) },
            { _rowIndex:5, Client:"TOMMY",        Dept:"MEN",   Style:"ST004", StyleDescription:"Oxford Button Down",  FabricBase:"Cotton",        Costing:"15.20", OrderQty:420, PSD:d(20),  ExFty:d(75)  },
            { _rowIndex:6, Client:"ZARA",         Dept:"WOMEN", Style:"ST005", StyleDescription:"High Waist Trousers", FabricBase:"Linen Blend",   Costing:"22.00", OrderQty:280, PSD:d(25),  ExFty:d(95)  }
        ],
        sample: [
            { _rowIndex:2, Client:"CALVIN KLEIN", Dept:"MEN",   Style:"ST001", StyleDescription:"Slim Fit Chinos",    Type:"Fit", Fabric:"Cotton Poplin", Size:"M", "SRS Date":d(-20),"Ready Date":d(-5),  Remarks:"Check inseam",  Approval:"Approved" },
            { _rowIndex:3, Client:"CALVIN KLEIN", Dept:"WOMEN", Style:"ST002", StyleDescription:"Floral Midi Dress",  Type:"PP",  Fabric:"Rayon",         Size:"S", "SRS Date":d(-15),"Ready Date":d(5),   Remarks:"Correct print", Approval:"Pending"  },
            { _rowIndex:4, Client:"TOMMY",        Dept:"KIDS",  Style:"ST003", StyleDescription:"Cargo Shorts",       Type:"Fit", Fabric:"Twill",         Size:"6", "SRS Date":d(-25),"Ready Date":d(-8),  Remarks:"",              Approval:"Rejected" },
            { _rowIndex:5, Client:"TOMMY",        Dept:"MEN",   Style:"ST004", StyleDescription:"Oxford Button Down", Type:"SMS", Fabric:"Cotton",        Size:"L", "SRS Date":d(-10),"Ready Date":d(12),  Remarks:"Collar check",  Approval:"Pending"  }
        ],
        ordering: [
            { _rowIndex:2, Client:"CALVIN KLEIN", Dept:"MEN",   Style:"ST001", StyleDescription:"Slim Fit Chinos",     Color:"Navy",  Trims:"Buttons", Supplier:"Supplier A", UP:"12.50", PO:"PO-2026-001","PO Date":d(-30),"Ready Date":d(-3),  PI:"PI-001", Status:"Confirmed","Delivery Status":"In Transit",  Comments:"" },
            { _rowIndex:3, Client:"CALVIN KLEIN", Dept:"WOMEN", Style:"ST002", StyleDescription:"Floral Midi Dress",   Color:"Multi", Trims:"Zipper",  Supplier:"Supplier B", UP:"18.00", PO:"PO-2026-002","PO Date":d(-20),"Ready Date":d(10),  PI:"PI-002", Status:"Confirmed","Delivery Status":"Not Shipped", Comments:"Rush order" },
            { _rowIndex:4, Client:"TOMMY",        Dept:"KIDS",  Style:"ST003", StyleDescription:"Cargo Shorts",        Color:"Khaki", Trims:"Buttons", Supplier:"Supplier A", UP:"8.75",  PO:"",           "PO Date":"",   "Ready Date":d(-12), PI:"",       Status:"Pending",  "Delivery Status":"Not Shipped", Comments:"" },
            { _rowIndex:5, Client:"TOMMY",        Dept:"MEN",   Style:"ST004", StyleDescription:"Oxford Button Down",  Color:"White", Trims:"Buttons", Supplier:"Supplier C", UP:"15.20", PO:"PO-2026-003","PO Date":d(-15),"Ready Date":d(8),   PI:"",       Status:"Confirmed","Delivery Status":"Not Shipped", Comments:"" },
            { _rowIndex:6, Client:"ZARA",         Dept:"WOMEN", Style:"ST005", StyleDescription:"High Waist Trousers", Color:"Ecru",  Trims:"Hooks",   Supplier:"Supplier B", UP:"22.00", PO:"PO-2026-004","PO Date":d(-10),"Ready Date":d(60),  PI:"PI-004", Status:"Confirmed","Delivery Status":"Not Shipped", Comments:"" },
            { _rowIndex:7, Client:"ZARA",         Dept:"WOMEN", Style:"ST005", StyleDescription:"High Waist Trousers", Color:"Black", Trims:"Hooks",   Supplier:"Supplier B", UP:"22.00", PO:"PO-2026-005","PO Date":d(-5), "Ready Date":d(55),  PI:"",       Status:"Confirmed","Delivery Status":"Delivered",   Comments:"" }
        ],
        style: [
            { _rowIndex:2, Style:"ST001","GMT Color":"KHAKI",Pantone:"Smoky Olive", PO:"1202363673",Articles:"10953373" },
            { _rowIndex:3, Style:"ST001","GMT Color":"STONE",Pantone:"White Pepper",PO:"1202363673",Articles:"10953378" },
            { _rowIndex:4, Style:"ST001","GMT Color":"NAVY", Pantone:"Sky Captain", PO:"1202363673",Articles:"10953374" },
            { _rowIndex:5, Style:"ST002","GMT Color":"BLACK",Pantone:"Jet Black",   PO:"1202363674",Articles:"10953380" }
        ]
    };
}

// ─── Render All ───────────────────────────────────────────────
function renderAll() {
    applyFilters();
    renderKPIs();
    populateDeptFilter();
    populateClientFilter();
    if (state.activeSheet === "ordering") renderAlertsPanel();
    else hideAlertsPanel();
}

// ─── KPIs ─────────────────────────────────────────────────────
function renderKPIs() {
    const cfg  = SHEET_CONFIG[state.activeSheet];
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

// ─── Alerts Panel (compact bar) ───────────────────────────────
function renderAlertsPanel() {
    let panel = document.getElementById("alerts-panel");
    if (!panel) {
        panel = document.createElement("div");
        panel.id = "alerts-panel";
        const tableCard = document.querySelector(".table-card");
        tableCard.parentNode.insertBefore(panel, tableCard);
    }

    const rows   = state.data.ordering;
    const today  = new Date(); today.setHours(0,0,0,0);
    const late   = rows.filter(r => computeDeliveryTrack(r).cls === "track-late");
    const atrisk = rows.filter(r => computeDeliveryTrack(r).cls === "track-atrisk");
    const nopo   = rows.filter(r => !r.PO && r.Status !== "Cancelled");
    const total  = late.length + atrisk.length + nopo.length;

    if (!total) {
        panel.innerHTML = `<div class="alerts-bar alerts-ok">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Toutes les commandes sont à jour — aucune alerte active.
        </div>`;
        return;
    }

    // Compact pill-bar: counters + one "Voir tout" button
    const pills = [
        late.length   ? `<span class="alert-pill pill-late">🔴 ${late.length} Late</span>` : "",
        atrisk.length ? `<span class="alert-pill pill-risk">🟠 ${atrisk.length} At Risk</span>` : "",
        nopo.length   ? `<span class="alert-pill pill-nopo">⚠️ ${nopo.length} Missing PO</span>` : ""
    ].filter(Boolean).join("");

    panel.innerHTML = `
    <div class="alerts-bar-compact">
        <span class="alerts-bar-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="15" height="15"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
        </span>
        <span class="alerts-bar-label">${total} alerte(s)</span>
        <div class="alerts-pills">${pills}</div>
        <div class="alerts-bar-actions">
            <button class="alerts-see-all-btn" onclick="openAlertsDrawer()">
                Voir tout
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="12" height="12"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
            </button>
            <button class="alerts-timeline-btn" onclick="openTimeline()">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="12" height="12"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                Timeline
            </button>
        </div>
    </div>`;
}

function hideAlertsPanel() {
    const p = document.getElementById("alerts-panel");
    if (p) p.innerHTML = "";
}

// ─── Alerts Drawer ─────────────────────────────────────────────
function openAlertsDrawer() {
    let drawer = document.getElementById("alerts-drawer");
    if (!drawer) {
        drawer = document.createElement("div");
        drawer.id = "alerts-drawer";
        drawer.innerHTML = `
        <div class="alerts-drawer-backdrop" onclick="closeAlertsDrawer()"></div>
        <div class="alerts-drawer-panel">
            <div class="alerts-drawer-header">
                <div class="alerts-drawer-title">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="17" height="17"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                    Alertes Ordering
                </div>
                <button class="alerts-drawer-close" onclick="closeAlertsDrawer()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            <div class="alerts-drawer-body" id="alerts-drawer-body"></div>
            <div class="alerts-drawer-footer">
                <button class="alerts-timeline-btn" style="width:100%;justify-content:center;" onclick="closeAlertsDrawer();openTimeline()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="13" height="13"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    Ouvrir la Vue Timeline
                </button>
            </div>
        </div>`;
        document.body.appendChild(drawer);
    }
    renderAlertsDrawerBody();
    requestAnimationFrame(() => drawer.classList.add("open"));
}

function closeAlertsDrawer() {
    const drawer = document.getElementById("alerts-drawer");
    if (drawer) drawer.classList.remove("open");
}

function renderAlertsDrawerBody() {
    const rows   = state.data.ordering;
    const today  = new Date(); today.setHours(0,0,0,0);
    const late   = rows.filter(r => computeDeliveryTrack(r).cls === "track-late").sort((a,b) => new Date(a["Ready Date"]) - new Date(b["Ready Date"]));
    const atrisk = rows.filter(r => computeDeliveryTrack(r).cls === "track-atrisk").sort((a,b) => new Date(a["Ready Date"]) - new Date(b["Ready Date"]));
    const nopo   = rows.filter(r => !r.PO && r.Status !== "Cancelled");

    const section = (title, color, icon, items, renderFn) => {
        if (!items.length) return "";
        return `
        <div class="drawer-section">
            <div class="drawer-section-header" style="color:${color}">
                ${icon} ${title} <span class="drawer-section-count">${items.length}</span>
            </div>
            ${items.map(renderFn).join("")}
        </div>`;
    };

    const cardLate = r => {
        const days   = Math.abs(Math.round((new Date(r["Ready Date"]) - today) / 86400000));
        const rdFmt  = new Date(r["Ready Date"]).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
        const poFmt  = r["PO Date"] ? new Date(r["PO Date"]).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}) : "—";
        return `<div class="drawer-alert-card card-late">
            <div class="dac-top">
                <span class="dac-card-icon icon-late">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="1.8"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01"/></svg>
                </span>
                <div class="dac-top-info">
                    <div class="dac-top-row1">
                        <span class="dac-style">${esc(r.Style)}</span>
                        ${r.Color ? `<span class="dac-color">${esc(r.Color)}</span>` : ""}
                        <span class="dac-client">${esc(r.Client)}</span>
                    </div>
                    <span class="track-badge track-late dac-track-pill">${days} jour(s) de retard</span>
                </div>
            </div>
            <div class="dac-info-grid">
                <div class="dac-info-row">
                    <span class="dac-info-label">Trims</span>
                    <span class="dac-info-val">${esc(r.Trims) || "—"}</span>
                </div>
                <div class="dac-info-row">
                    <span class="dac-info-label">PO #</span>
                    <span class="dac-info-val ${r.PO ? "" : "dac-nopo"}">${esc(r.PO) || "⚠️ manquant"}</span>
                </div>
                <div class="dac-info-row">
                    <span class="dac-info-label">PO Date</span>
                    <span class="dac-info-val">${poFmt}</span>
                </div>
                <div class="dac-info-row">
                    <span class="dac-info-label">Ready Date</span>
                    <span class="dac-info-val text-danger-bold">${rdFmt}</span>
                </div>
            </div>
        </div>`;
    };

    const cardRisk = r => {
        const days  = Math.round((new Date(r["Ready Date"]) - today) / 86400000);
        const rdFmt = new Date(r["Ready Date"]).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
        return `<div class="drawer-alert-card card-risk">
            <div class="dac-top">
                <span class="dac-card-icon icon-risk">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                </span>
                <div class="dac-top-info">
                    <div class="dac-top-row1">
                        <span class="dac-style">${esc(r.Style)}</span>
                        ${r.Color ? `<span class="dac-color">${esc(r.Color)}</span>` : ""}
                        <span class="dac-client">${esc(r.Client)}</span>
                    </div>
                    <span class="track-badge track-atrisk dac-track-pill">Dans ${days} jour(s)</span>
                </div>
            </div>
            <div class="dac-meta">
                ${r.Supplier ? `<span>🏭 ${esc(r.Supplier)}</span>` : ""}
                ${r.PO       ? `<span>📄 ${esc(r.PO)}</span>` : `<span class="dac-nopo">⚠️ PO manquant</span>`}
                <span>📅 Ready: <strong>${rdFmt}</strong></span>
            </div>
        </div>`;
    };

    const cardNoPO = r => `<div class="drawer-alert-card card-nopo">
        <div class="dac-top">
            <span class="dac-card-icon icon-nopo">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6L6 18"/></svg>
            </span>
            <div class="dac-top-info">
                <div class="dac-top-row1">
                    <span class="dac-style">${esc(r.Style)}</span>
                    ${r.Color ? `<span class="dac-color">${esc(r.Color)}</span>` : ""}
                    <span class="dac-client">${esc(r.Client)}</span>
                </div>
                <span class="missing-po-badge dac-track-pill">Missing PO</span>
            </div>
        </div>
        <div class="dac-meta">
            ${r.Supplier ? `<span>🏭 ${esc(r.Supplier)}</span>` : ""}
            ${r["Ready Date"] ? `<span>📅 Ready: <strong>${new Date(r["Ready Date"]).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"})}</strong></span>` : ""}
        </div>
    </div>`;

    const body = document.getElementById("alerts-drawer-body");
    const html =
        section("Commandes en retard", "#ff4d6d", "🔴", late,   cardLate) +
        section("À risque (≤14 jours)", "#f59e0b", "🟠", atrisk, cardRisk) +
        section("PO manquant",          "#3b82f6", "⚠️", nopo,   cardNoPO);

    body.innerHTML = html || `<p style="color:var(--text-muted);padding:2rem;text-align:center;">Aucune alerte.</p>`;
}

// ─── Timeline Modal ───────────────────────────────────────────
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

    const today   = new Date(); today.setHours(0,0,0,0);
    const rDates  = rows.map(r => new Date(r["Ready Date"]));
    const poDates = rows.filter(r=>r["PO Date"]).map(r=>new Date(r["PO Date"])).sort((a,b)=>a-b);
    const rangeStart = poDates.length ? new Date(Math.min(poDates[0].getTime(), today.getTime()-21*86400000)) : new Date(today.getTime()-21*86400000);
    const rangeEnd   = new Date(Math.max(...rDates.map(d=>d.getTime())) + 14*86400000);
    const totalMs    = rangeEnd - rangeStart;

    const pct = (date) => Math.max(0, Math.min(100, ((date-rangeStart)/totalMs)*100));

    // Tick marks every ~10% of range
    const tickCount = 8;
    let ticks = "";
    for (let i = 0; i <= tickCount; i++) {
        const tickDate = new Date(rangeStart.getTime() + (totalMs * i / tickCount));
        ticks += `<div class="tl-tick" style="left:${(i/tickCount*100).toFixed(1)}%">${tickDate.toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})}</div>`;
    }

    const todayPct = pct(today);
    const todayMark = `<div class="tl-today" style="left:${todayPct.toFixed(1)}%"><span>Auj.</span></div>`;

    // Group by client+style
    const groups = {};
    rows.forEach(r => {
        const k = `${r.Client}||${r.Style}`;
        if (!groups[k]) groups[k] = { client:r.Client, style:r.Style, desc:r.StyleDescription||"", rows:[] };
        groups[k].rows.push(r);
    });

    let gantt = "";
    Object.values(groups).forEach(g => {
        gantt += `<div class="tl-group-header"><span class="client-badge" style="font-size:0.68rem;">${esc(g.client)}</span> <strong>${esc(g.style)}</strong> <span class="tl-desc">${esc(g.desc)}</span></div>`;
        g.rows.forEach(r => {
            const track   = computeDeliveryTrack(r);
            const rdDate  = new Date(r["Ready Date"]);
            const start   = r["PO Date"] ? new Date(r["PO Date"]) : new Date(rdDate.getTime()-60*86400000);
            const barLeft = pct(start).toFixed(1);
            const barW    = Math.max((pct(rdDate)-pct(start)).toFixed(1), 1);
            const rdFmt   = rdDate.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
            const delBadge= r["Delivery Status"]?`<span class="delivery-badge del-${r["Delivery Status"].toLowerCase().replace(" ","")} tl-del">${r["Delivery Status"]}</span>`:"";

            gantt += `
            <div class="tl-row">
                <div class="tl-label">${esc(r.Color||"—")} ${delBadge}</div>
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
    deptFilter.addEventListener("change",  e => { state.filterDept   = e.target.value; applyFilters(); });
    if (clientFilter) clientFilter.addEventListener("change", e => { state.filterClient = e.target.value; applyFilters(); });
}

function applyFilters() {
    const rows = state.data[state.activeSheet];
    let filtered = rows.filter(row => {
        if (state.filterClient && row.Client !== state.filterClient) return false;
        if (state.filterDept   && row.Dept   !== state.filterDept)   return false;
        if (state.searchQuery) {
            const h = Object.values(row).join(" ").toLowerCase();
            if (!h.includes(state.searchQuery)) return false;
        }
        return true;
    });
    if (state.sortCol) {
        filtered = filtered.slice().sort((a,b) => {
            const av = String(a[state.sortCol]||""), bv = String(b[state.sortCol]||"");
            return av.localeCompare(bv, undefined, {numeric:true}) * state.sortDir;
        });
    }
    state.filteredData = filtered;
    renderTable();
}

function populateDeptFilter() {
    const depts = [...new Set(state.data[state.activeSheet].map(r=>r.Dept).filter(Boolean))].sort();
    deptFilter.innerHTML = `<option value="">Tous les depts</option>` + depts.map(d=>`<option value="${esc(d)}">${esc(d)}</option>`).join("");
    deptFilter.value = state.filterDept;
}

function populateClientFilter() {
    const cf = document.getElementById("client-filter");
    if (!cf) return;
    const clients = [...new Set(state.data[state.activeSheet].map(r=>r.Client).filter(Boolean))].sort();
    cf.innerHTML = `<option value="">Tous les clients</option>` + clients.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
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
    const cfg  = SHEET_CONFIG[state.activeSheet];
    const rows = state.filteredData;
    const isOrdering = state.activeSheet === "ordering";

    tableHead.innerHTML = `<tr>
    ${cfg.cols.map(c => `<th onclick="sortBy('${c.key}')" title="Trier par ${c.label}">${c.label}${state.sortCol===c.key?(state.sortDir===1?" ↑":" ↓"):""}</th>`).join("")}
    ${isOrdering ? `<th style="white-space:nowrap;">🚦 Track</th>` : ""}
    <th>Actions</th></tr>`;

    if (!rows.length) {
        tableBody.innerHTML = `<tr><td colspan="${cfg.cols.length + (isOrdering?2:1)}">
            <div class="empty-state"><div class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg></div>
            <h3>Aucune donnée</h3><p>Ajoutez une ligne ou modifiez votre recherche.</p></div>
        </td></tr>`;
        return;
    }

    tableBody.innerHTML = rows.map(row => {
        const rowIdx = row._rowIndex;
        const cells  = cfg.cols.map((c, i) => {
            let val = row[c.key] ?? "";
            const sticky = i===0?"sticky-col":i===1?"sticky-col-2":i===2?"sticky-col-3":"";

            if (c.key==="Client")  return `<td class="${sticky}"><span class="client-badge">${esc(val)||"—"}</span></td>`;
            if (c.key==="Dept")    return `<td class="${sticky}"><span class="dept-badge">${esc(val)}</span></td>`;
            if (c.key==="Approval") {
                const cls=(val||"").toLowerCase()||"unknown";
                return `<td><span class="approval-badge ${cls}">${esc(val)||"—"}</span></td>`;
            }
            if (c.key==="Status") {
                const cls={"Confirmed":"status-confirmed","Pending":"status-pending","Cancelled":"status-cancelled"}[val]||"";
                return `<td><span class="status-badge-order ${cls}">${esc(val)||"—"}</span></td>`;
            }
            if (c.key==="Delivery Status") {
                const cls={"Not Shipped":"del-notshipped","In Transit":"del-transit","Delivered":"del-delivered"}[val]||"";
                return `<td><span class="delivery-badge ${cls}">${esc(val)||"—"}</span></td>`;
            }
            if (c.key==="PO"&&!val) return `<td><span class="missing-po-badge">Missing PO</span></td>`;

            let isPast=false, displayVal=val;
            if (c.type==="date"&&val) {
                try {
                    const dd=new Date(val);
                    if ((c.key==="ExFty"||c.key==="Ready Date")&&dd.getTime()<new Date().setHours(0,0,0,0)) isPast=true;
                    displayVal=dd.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
                } catch(e){}
            }
            let cc=sticky;
            if (isPast) cc+=" text-danger-bold";
            else if (val&&(c.key==="Costing"||c.key==="UP")) { cc+=" text-success-bold"; if(!isNaN(val)) displayVal="$"+Number(val).toFixed(2); }
            if (c.key==="Style"&&state.activeSheet==="details")
                return `<td class="${cc.trim()}"><a class="style-link" onclick="openStyleModal('${esc(val)}')">${esc(String(displayVal))}</a></td>`;
            return `<td class="${cc.trim()}" title="${esc(String(val))}">${esc(String(displayVal))||"<span style='color:var(--text-muted)'>—</span>"}</td>`;
        }).join("");

        const trackCell = isOrdering ? (() => { const t=computeDeliveryTrack(row); return `<td><span class="track-badge ${t.cls}">${t.label}</span></td>`; })() : "";

        return `<tr>${cells}${trackCell}
        <td><div class="action-btns">
            <button class="btn btn-edit btn-icon" onclick="openEditModal(${rowIdx})" title="Modifier"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
            <button class="btn btn-danger btn-icon" onclick="confirmDelete(${rowIdx})" title="Supprimer"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
        </div></td></tr>`;
    }).join("");
}

// ─── Sort / Modal / Form / Delete / API / Toast / Helpers ─────
function sortBy(col) { if(state.sortCol===col)state.sortDir*=-1; else{state.sortCol=col;state.sortDir=1;} applyFilters(); }

function openAddModal()  { state.editingRow=null; const cfg=SHEET_CONFIG[state.activeSheet]; modalTitle.textContent=`Ajouter – ${cfg.label}`; modalSubTitle.textContent="Remplissez les champs ci-dessous"; buildForm(cfg.cols,{}); formSave.textContent="Enregistrer"; openModal(); }
function openEditModal(rowIndex) { const row=state.data[state.activeSheet].find(r=>r._rowIndex===rowIndex); if(!row)return; state.editingRow=rowIndex; const cfg=SHEET_CONFIG[state.activeSheet]; modalTitle.textContent=`Modifier – ${cfg.label}`; modalSubTitle.textContent=`Ligne ${rowIndex}`; buildForm(cfg.cols,row); formSave.textContent="Mettre à jour"; openModal(); }

function buildForm(cols, data) {
    formFields.innerHTML = cols.map(col => {
        const val=data[col.key]??""; const full=col.full?" full":"";
        let input;
        if (col.type==="textarea") input=`<textarea class="form-textarea" id="field-${sanitizeId(col.key)}" placeholder="${col.label}">${esc(String(val))}</textarea>`;
        else if (col.type==="select") { const opts=col.options.map(o=>`<option value="${esc(o)}" ${o===val?"selected":""}>${esc(o)||"— Sélectionner —"}</option>`).join(""); input=`<select class="form-select" id="field-${sanitizeId(col.key)}">${opts}</select>`; }
        else input=`<input class="form-input" id="field-${sanitizeId(col.key)}" type="${col.type==="date"?"date":"text"}" value="${esc(String(val))}" placeholder="${col.label}" ${col.required?"required":""}>`;
        return `<div class="form-group${full}"><label class="form-label" for="field-${sanitizeId(col.key)}">${col.label}${col.required?` <span style="color:var(--danger)">*</span>`:""}</label>${input}</div>`;
    }).join("");
}

function getFormData() { const cfg=SHEET_CONFIG[state.activeSheet]; const data={}; cfg.cols.forEach(col=>{const el=document.getElementById(`field-${sanitizeId(col.key)}`);if(el)data[col.key]=el.value;}); return data; }
function openModal()  { modalOverlay.classList.add("open"); }
function closeModal() { modalOverlay.classList.remove("open"); state.editingRow=null; }

async function saveForm() {
    const cfg=SHEET_CONFIG[state.activeSheet]; const rawData=getFormData();

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

    if (data["Size"]) data["Size"]="'"+data["Size"];
    const missing=cfg.cols.filter(c=>c.required&&!data[c.key]);
    if (missing.length) { showToast(`Champ requis : ${missing.map(c=>c.label).join(", ")}`,"error"); return; }
    formSave.disabled=true; formSave.textContent="Enregistrement…";
    try {
        if (state.editingRow) {
            await sendRequest("UPDATE",{data,rowIndex:state.editingRow});
            const idx=state.data[state.activeSheet].findIndex(r=>r._rowIndex===state.editingRow);
            if (idx!==-1) state.data[state.activeSheet][idx]={...state.data[state.activeSheet][idx],...data};
            showToast("Ligne mise à jour avec succès","success");
        } else { await sendRequest("CREATE",{data}); await fetchAllData(); }
        closeModal(); renderAll();
    } catch(err) { showToast("Erreur : "+err.message,"error"); }
    finally { formSave.disabled=false; formSave.textContent=state.editingRow?"Mettre à jour":"Enregistrer"; }
}

let pendingDeleteRow=null;
function confirmDelete(rowIndex) { pendingDeleteRow=rowIndex; confirmOverlay.classList.add("open"); }
function cancelDelete()  { pendingDeleteRow=null; confirmOverlay.classList.remove("open"); }
async function executeDelete() {
    if (!pendingDeleteRow) return;
    const btn=document.getElementById("confirm-delete-btn"); btn.disabled=true; btn.textContent="Suppression…";
    try {
        await sendRequest("DELETE",{rowIndex:pendingDeleteRow});
        state.data[state.activeSheet]=state.data[state.activeSheet].filter(r=>r._rowIndex!==pendingDeleteRow);
        confirmOverlay.classList.remove("open"); pendingDeleteRow=null; renderAll(); showToast("Ligne supprimée avec succès","success");
    } catch(err) { showToast("Erreur : "+err.message,"error"); }
    finally { btn.disabled=false; btn.textContent="Supprimer"; }
}

async function sendRequest(action, payload, sheetOverride=null) {
    if (GOOGLE_APPS_SCRIPT_URL==="YOUR_WEB_APP_URL_HERE") { await new Promise(r=>setTimeout(r,500)); return {status:"ok"}; }
    const sheet=sheetOverride||state.activeSheet;
    const res=await fetch(GOOGLE_APPS_SCRIPT_URL,{method:"POST",body:JSON.stringify({action,sheet,...payload})});
    const json=await res.json();
    if (json.status!=="ok") throw new Error(json.message);
    return json;
}

function showToast(msg, type="info", duration=3500) {
    const toast=document.createElement("div"); toast.className=`toast ${type}`; toast.innerHTML=`<span class="toast-msg">${msg}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(()=>{toast.style.animation="toast-out 0.3s ease forwards";setTimeout(()=>toast.remove(),300);},duration);
}

function esc(s) { return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function sanitizeId(s) { return s.replace(/\s+/g,"_").replace(/[^a-zA-Z0-9_-]/g,""); }

// ─── Style Details Modal ──────────────────────────────────────
const styleModalOverlay=document.getElementById("style-modal-overlay");
const styleModalTitle=document.getElementById("style-modal-title");
const styleModalBody=document.getElementById("style-modal-body");
let _currentStyleName="";

function openStyleModal(styleName) { _currentStyleName=styleName; styleModalTitle.textContent=`Détails du Style : ${styleName}`; document.getElementById("style-modal-subtitle").textContent="Couleurs & Articles"; renderStyleModalBody(); styleModalOverlay.classList.add("open"); }

function renderStyleModalBody() {
    const styleRows=state.data.style.filter(r=>r.Style===_currentStyleName);
    let html=`<div class="style-section"><h4><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg> Couleurs & Articles</h4>
    <table class="style-detail-table"><thead><tr><th>GMT Color</th><th>Pantone</th><th>PO</th><th>Articles</th><th style="width:80px;text-align:center;">Actions</th></tr></thead><tbody id="style-table-body">`;
    if (styleRows.length) {
        styleRows.forEach(r => { html+=`<tr data-row="${r._rowIndex}" id="style-row-${r._rowIndex}"><td><span class="color-badge">${esc(r["GMT Color"])||"—"}</span></td><td>${esc(r["Pantone"])||"—"}</td><td>${esc(r["PO"])||"—"}</td><td>${esc(r["Articles"])||"—"}</td><td style="text-align:center;"><button class="btn btn-edit btn-icon btn-xs" onclick="editStyleRow(${r._rowIndex})"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button></td></tr>`; });
    } else { html+=`<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:1.5rem;">Aucune couleur enregistrée.</td></tr>`; }
    html+=`</tbody></table><div style="margin-top:1rem;"><button class="btn btn-primary btn-sm" onclick="showAddStyleRow()"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="13" height="13"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg> Ajouter une couleur</button></div>
    <div id="style-add-form" class="style-inline-form" style="display:none;margin-top:1rem;"><div class="style-form-grid"><div class="style-form-group"><label class="form-label">GMT Color</label><input class="form-input" id="sf-gmt" placeholder="ex: KHAKI"/></div><div class="style-form-group"><label class="form-label">Pantone</label><input class="form-input" id="sf-pantone" placeholder="ex: Smoky Olive"/></div><div class="style-form-group"><label class="form-label">PO</label><input class="form-input" id="sf-po" placeholder="ex: 1202363673"/></div><div class="style-form-group"><label class="form-label">Articles</label><input class="form-input" id="sf-articles" placeholder="ex: 10953373"/></div></div><div class="style-form-actions"><button class="btn btn-ghost btn-sm" onclick="hideAddStyleRow()">Annuler</button><button class="btn btn-primary btn-sm" onclick="saveNewStyleRow()">Enregistrer</button></div></div></div>`;
    styleModalBody.innerHTML=html;
}

function showAddStyleRow(){document.getElementById("style-add-form").style.display="block";document.getElementById("sf-gmt").focus();}
function hideAddStyleRow(){document.getElementById("style-add-form").style.display="none";["sf-gmt","sf-pantone","sf-po","sf-articles"].forEach(id=>document.getElementById(id).value="");}
async function saveNewStyleRow(){const g=document.getElementById("sf-gmt").value.trim();if(!g){showToast("GMT Color requis","error");return;}const btn=document.querySelector("#style-add-form .btn-primary");btn.disabled=true;btn.textContent="Enregistrement…";try{await sendRequest("CREATE",{data:{Style:_currentStyleName,"GMT Color":g,Pantone:document.getElementById("sf-pantone").value.trim(),PO:document.getElementById("sf-po").value.trim(),Articles:document.getElementById("sf-articles").value.trim()}},"style");showToast("Couleur ajoutée","success");await fetchAllData();renderStyleModalBody();}catch(err){showToast("Erreur : "+err.message,"error");btn.disabled=false;btn.textContent="Enregistrer";}}
function editStyleRow(idx){const row=state.data.style.find(r=>r._rowIndex===idx);if(!row)return;const tr=document.getElementById(`style-row-${idx}`);if(!tr)return;tr.innerHTML=`<td><input class="form-input form-input-sm" id="edit-gmt-${idx}" value="${esc(row["GMT Color"]||"")}"/></td><td><input class="form-input form-input-sm" id="edit-pantone-${idx}" value="${esc(row["Pantone"]||"")}"/></td><td><input class="form-input form-input-sm" id="edit-po-${idx}" value="${esc(row["PO"]||"")}"/></td><td><input class="form-input form-input-sm" id="edit-articles-${idx}" value="${esc(row["Articles"]||"")}"/></td><td style="text-align:center;white-space:nowrap;"><button class="btn btn-primary btn-icon btn-xs" onclick="saveStyleRow(${idx})"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg></button><button class="btn btn-ghost btn-icon btn-xs" onclick="renderStyleModalBody()" style="margin-left:4px;"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></td>`;document.getElementById(`edit-gmt-${idx}`).focus();}
async function saveStyleRow(idx){const g=document.getElementById(`edit-gmt-${idx}`).value.trim();if(!g){showToast("GMT Color requis","error");return;}try{await sendRequest("UPDATE",{data:{Style:_currentStyleName,"GMT Color":g,Pantone:document.getElementById(`edit-pantone-${idx}`).value.trim(),PO:document.getElementById(`edit-po-${idx}`).value.trim(),Articles:document.getElementById(`edit-articles-${idx}`).value.trim()},rowIndex:idx},"style");const i=state.data.style.findIndex(r=>r._rowIndex===idx);if(i!==-1)Object.assign(state.data.style[i],{"GMT Color":g,Pantone:document.getElementById(`edit-pantone-${idx}`).value.trim(),PO:document.getElementById(`edit-po-${idx}`).value.trim(),Articles:document.getElementById(`edit-articles-${idx}`).value.trim()});showToast("Ligne mise à jour","success");renderStyleModalBody();}catch(err){showToast("Erreur : "+err.message,"error");}}
function closeStyleModal(){styleModalOverlay.classList.remove("open");_currentStyleName="";}

// ─── Export Excel ─────────────────────────────────────────────
function exportExcel() {
    if(typeof XLSX==="undefined"){showToast("Bibliothèque Excel non chargée","error");return;}
    const cfg=SHEET_CONFIG[state.activeSheet];const rows=state.filteredData.length?state.filteredData:state.data[state.activeSheet];
    if(!rows.length){showToast("Aucune donnée à exporter","info");return;}
    const headers=cfg.cols.map(c=>c.label);
    const data=rows.map(row=>{const obj={};cfg.cols.forEach(c=>{let v=row[c.key]??"";if(c.type==="date"&&v)try{v=new Date(v).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});}catch(e){}if(c.key==="Size"&&typeof v==="string"&&v.startsWith("'"))v=v.substring(1);obj[c.label]=String(v);});return obj;});
    const ws=XLSX.utils.json_to_sheet(data,{header:headers});const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,cfg.label);
    XLSX.writeFile(wb,`AW27_${cfg.label}_${new Date().toISOString().slice(0,10)}.xlsx`);showToast(`Export — ${cfg.label} (${rows.length} lignes)`,"success");
}

document.addEventListener("DOMContentLoaded", init);
