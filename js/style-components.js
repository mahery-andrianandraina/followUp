// ================================================================
//  AW27 — Style Components
//  Gestion des composants par style avec génération PDF.
//  Charger après app.js dans index.html.
// ================================================================

(function initStyleComponents() {

    const SHEET_NAME = "Style Components";
    const SHEET_KEY  = "style_components";
    const COLS = [
        { key: "Cust Style Ref", label: "Cust Style Ref", type: "text",   required: true },
        { key: "CTL Style Ref",  label: "CTL Style Ref",  type: "text"                   },
        { key: "Composant",      label: "Composant",      type: "text",   required: true },
        { key: "Status",         label: "Status",         type: "select",
          options: ["", "Approved", "On Going", "Rejected"]                               },
        { key: "Details",        label: "Details",        type: "textarea", full: true   }

    ];

    // ── Styles CSS ────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById("sc-styles")) return;
        const s = document.createElement("style");
        s.id = "sc-styles";
        s.textContent = `
        #btn-components-pdf {
            display: inline-flex; align-items: center; gap: 5px;
            padding: 6px 12px; border-radius: 8px;
            background: var(--surface-2, #f3f4f6);
            border: 1px solid var(--border, #e5e7eb);
            color: var(--text-2, #6b7280); cursor: pointer;
            font-size: 12px; font-weight: 500; font-family: inherit;
            transition: background .15s, color .15s, border-color .15s;
        }
        #btn-components-pdf:hover {
            background: #fdf4ff; color: #7e22ce; border-color: #d8b4fe;
        }
        #btn-components-pdf:disabled { opacity: .5; cursor: not-allowed; }
        @keyframes sc-spin { to { transform: rotate(360deg); } }
        .sc-spin { display: inline-block; animation: sc-spin .7s linear infinite; }
        .sc-badge-approved { background:#f0fdf4;color:#166534;border:0.5px solid #86efac; }
        .sc-badge-rejected { background:#fef2f2;color:#991b1b;border:0.5px solid #fca5a5; }
        .sc-badge-ongoing  { background:#eff6ff;color:#1e40af;border:0.5px solid #93c5fd; }
        .sc-badge {
            display:inline-block;padding:2px 9px;border-radius:20px;
            font-size:11px;font-weight:600;white-space:nowrap;
        }
        `;
        document.head.appendChild(s);
    }

    // ── Format date ───────────────────────────────────────────
    function fmtDate(val) {
        if (!val) return "—";
        try {
            return new Date(val).toLocaleDateString("fr-FR", {
                day: "2-digit", month: "short", year: "numeric"
            });
        } catch(e) { return String(val); }
    }

    // ── Enregistrer le menu dans SHEET_CONFIG ─────────────────
    // On ne retourne JAMAIS tôt : on force toujours nos COLS
    // pour écraser toute ancienne version sauvegardée (ex: avec Date).
    function registerMenu() {
        window.SHEET_CONFIG[SHEET_KEY] = {
            label:     SHEET_NAME,
            sheetName: SHEET_NAME,
            custom:    true,
            icon:      "ti-components",
            cols:      COLS,
            kpis: [
                {
                    label: "Total composants", colorClass: "teal",
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                        stroke-width="1.8" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>`,
                    compute: rows => rows.length
                },
                {
                    label: "Approved", colorClass: "green",
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                        stroke-width="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
                    compute: rows => rows.filter(r =>
                        String(r.Status||"").toLowerCase() === "approved").length
                },
                {
                    label: "On Going", colorClass: "blue",
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                        stroke-width="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
                    compute: rows => rows.filter(r =>
                        String(r.Status||"").toLowerCase() === "on going").length
                },
                {
                    label: "Rejected", colorClass: "red",
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                        stroke-width="1.8" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0
                        11-18 0 9 9 0 0118 0z"/></svg>`,
                    compute: rows => rows.filter(r =>
                        String(r.Status||"").toLowerCase() === "rejected").length
                }
            ]
        };

        if (!window.state?.data?.[SHEET_KEY]) {
            if (window.state) window.state.data[SHEET_KEY] = [];
        }
    }

    // ── Ajouter le nav-item dans la sidebar ───────────────────
    function addNavItem() {
        if (document.getElementById(`tab-custom-${SHEET_KEY}`)) return;

        const nav = document.getElementById("custom-nav-items");
        if (!nav) return;

        const btn = document.createElement("button");
        btn.className = "nav-item";
        btn.dataset.sheet  = SHEET_KEY;
        btn.dataset.custom = "1";
        btn.role = "tab";
        btn.setAttribute("aria-selected", "false");
        btn.id = `tab-custom-${SHEET_KEY}`;
        btn.innerHTML = `
            <span class="nav-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0
                        01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0
                        012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                </svg>
            </span>
            <span class="nav-label">Style Components</span>`;

        btn.addEventListener("click", () => {
            if (!window.SHEET_CONFIG?.[SHEET_KEY]) registerMenu();
            window.state.activeView  = "sheet";
            window.state.activeSheet = SHEET_KEY;
            window.state.searchQuery = "";
            window.state.filterDept  = "";
            window.state.filterClient= "";
            window.state.sortCol     = null;
            window.state.sortDir     = 1;

            ["search-input","dept-filter","client-filter"].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = "";
            });

            document.querySelectorAll(".nav-item").forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-selected", "false");
            });
            btn.classList.add("active");
            btn.setAttribute("aria-selected", "true");

            const titleEl = document.getElementById("header-sheet-title");
            if (titleEl) titleEl.textContent = SHEET_NAME;

            if (typeof showTableView        === "function") showTableView();
            if (typeof applyFilters         === "function") applyFilters();
            if (typeof renderKPIs           === "function") renderKPIs();
            if (typeof populateDeptFilter   === "function") populateDeptFilter();
            if (typeof populateClientFilter === "function") populateClientFilter();
        });

        nav.appendChild(btn);
    }

    // ── Charger les données depuis GAS (appel séparé) ─────────
    async function loadComponentsData() {
        try {
            const gasUrl = window.GOOGLE_APPS_SCRIPT_URL;
            if (!gasUrl || gasUrl === "YOUR_WEB_APP_URL_HERE") return;

            const res  = await fetch(gasUrl);
            const json = await res.json();
            if (json.status !== "ok") return;

            // Le GAS retourne la feuille en lowercase avec espaces
            const sheetData = json.data?.[SHEET_NAME]
                || json.data?.[SHEET_NAME.toLowerCase()]
                || Object.entries(json.data || {}).find(([k]) =>
                    k.toLowerCase() === SHEET_NAME.toLowerCase()
                )?.[1];

            if (sheetData?.rows) {
                if (!window.state) return;
                window.state.data[SHEET_KEY] = (sheetData.rows || []).map((r, i) => ({
                    ...r,
                    _rowIndex: r._rowIndex ?? (i + 2)
                }));
                console.log("[StyleComponents] Données chargées :", window.state.data[SHEET_KEY].length);
            }
        } catch(e) {
            console.warn("[StyleComponents] Erreur chargement :", e.message);
        }
    }

    // ── Patcher renderAll ─────────────────────────────────────
    // fetchAllData efface tous les menus custom avant de recharger.
    // On re-enregistre systématiquement AVANT et APRÈS renderAll.
    function patchRenderAll() {
        if (window._scRenderAllPatched) return;
        const orig = window.renderAll;
        if (typeof orig !== "function") return;
        window._scRenderAllPatched = true;

        window.renderAll = function(...args) {
            // Toujours re-enregistrer AVANT (fetchAllData l'a peut-être supprimé)
            registerMenu();

            const result = orig.apply(this, args);

            // Re-ajouter le nav item ET le bouton header s'ils ont été effacés
            addNavItem();
            injectHeaderButton();

            // Si les données ont été perdues → recharger
            if (!(window.state?.data?.[SHEET_KEY]?.length)) {
                loadComponentsData().then(() => {
                    if (window.state?.activeSheet === SHEET_KEY) {
                        if (typeof applyFilters === "function") applyFilters();
                        if (typeof renderKPIs   === "function") renderKPIs();
                    }
                });
            }

            return result;
        };
    }

    // ── Sauvegarder le menu dans GAS via persistCustomMenus ───
    // Cela garantit que le menu survit aux rechargements de fetchAllData
    // sans nécessiter un appel GAS supplémentaire à chaque fois.
    function saveMenuToGAS() {
        const tryPersist = () => {
            if (typeof persistCustomMenus === "function") {
                persistCustomMenus();
                console.log("[StyleComponents] Menu sauvegardé dans GAS ✓");
            } else {
                setTimeout(tryPersist, 500);
            }
        };
        // Attendre que app.js soit prêt et les données chargées
        setTimeout(tryPersist, 3000);
    }

    // ═══════════════════════════════════════════════════════════
    //  AUTOCOMPLETE — Cust Style Ref + CTL Style Ref
    // ═══════════════════════════════════════════════════════════

    function addCustStyleRefAutocomplete() {
        if (window.state?.activeSheet !== SHEET_KEY) return;

        const field = document.getElementById("field-Cust_Style_Ref");
        if (!field) return;
        if (field.dataset.scAutocomplete) return;
        field.dataset.scAutocomplete = "1";

        // ── Rendre CTL Style Ref readonly immédiatement ────────
        const ctlField = document.getElementById("field-CTL_Style_Ref");
        if (ctlField) {
            ctlField.setAttribute("readonly", "true");
            ctlField.style.cssText += `
                background: var(--surface-1, #f9fafb) !important;
                color: var(--text-secondary, #6b7280) !important;
                cursor: not-allowed !important;
                border-color: var(--border, #e5e7eb) !important;
            `;
            ctlField.title = "Rempli automatiquement depuis Cust Style Ref";
        }

        // ── Datalist autocomplete ──────────────────────────────
        const refs = [...new Set(
            (window.state?.data?.details || [])
                .map(r => String(r["Cust Style Ref"] || "").trim())
                .filter(Boolean)
        )].sort();

        if (refs.length) {
            const dlId = "sc-cust-style-datalist";
            document.getElementById(dlId)?.remove();
            const dl = document.createElement("datalist");
            dl.id = dlId;
            refs.forEach(ref => {
                const opt = document.createElement("option");
                opt.value = ref;
                dl.appendChild(opt);
            });
            document.body.appendChild(dl);
            field.setAttribute("list", dlId);
        }

        // ── Remplir CTL Style Ref à chaque changement ─────────
        const fillCTL = () => {
            const custRef = field.value.trim();
            const ctl = document.getElementById("field-CTL_Style_Ref");
            if (!ctl) return;
            if (!custRef) { ctl.value = ""; return; }
            const detRow = (window.state?.data?.details || []).find(r =>
                String(r["Cust Style Ref"] || "").trim() === custRef
            );
            ctl.value = detRow ? (detRow["CTLStyleRef"] || "") : "";
        };

        field.addEventListener("change", fillCTL);
        field.addEventListener("input",  () => setTimeout(fillCTL, 150));
    }

    // Observer la modale pour injecter l'autocomplete quand elle s'ouvre
    function observeModal() {
        const modal = document.getElementById("modal-overlay");
        if (!modal) { setTimeout(observeModal, 500); return; }

        new MutationObserver(() => {
            if (!modal.classList.contains("open")) return;
            if (window.state?.activeSheet !== SHEET_KEY) return;
            // Attendre que le formulaire soit rendu
            setTimeout(addCustStyleRefAutocomplete, 100);
        }).observe(modal, { attributes: true, attributeFilter: ["class"] });
    }

    // ═══════════════════════════════════════════════════════════
    //  GÉNÉRATION PDF
    // ═══════════════════════════════════════════════════════════

    // ── Ouvrir la modale avant génération ────────────────────
    function openPDFModal() {
        const rows = window.state?.data?.[SHEET_KEY] || [];
        if (!rows.length) {
            typeof showToast === "function" &&
                showToast("Aucun composant enregistré.", "info");
            return;
        }

        document.getElementById("sc-pdf-modal")?.remove();

        const lastEmail = localStorage.getItem("aw27_sc_pdf_email") || "";
        const totalStyles = [...new Set(rows.map(r =>
            String(r["Cust Style Ref"] || "").trim()).filter(Boolean))].length;

        const modal = document.createElement("div");
        modal.id = "sc-pdf-modal";
        modal.className = "modal-overlay";
        modal.innerHTML = `
        <div class="modal" style="max-width:440px;">
            <div class="modal-header">
                <div>
                    <div class="modal-title">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor"
                            width="17" height="17"
                            style="vertical-align:middle;margin-right:6px;">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7
                                a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0
                                01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        Components PDF
                    </div>
                    <div class="modal-subtitle">
                        ${rows.length} composant${rows.length > 1 ? "s" : ""}
                        · ${totalStyles} style${totalStyles > 1 ? "s" : ""}
                    </div>
                </div>
                <button class="btn-close"
                    onclick="document.getElementById('sc-pdf-modal').remove()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body"
                style="padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:14px;">

                <!-- Email -->
                <div>
                    <label class="form-label" style="margin-bottom:5px;">
                        Envoyer par email à
                        <span style="font-size:11px;color:var(--text-muted,#9ca3af);
                            font-weight:400;">(optionnel)</span>
                    </label>
                    <input id="sc-pdf-email" class="form-input" type="email"
                        placeholder="email@example.com"
                        value="${lastEmail}"
                        style="width:100%;box-sizing:border-box;"/>
                </div>

                <!-- Actions -->
                <div style="display:flex;gap:8px;justify-content:flex-end;padding-top:4px;">
                    <button class="btn btn-ghost"
                        onclick="document.getElementById('sc-pdf-modal').remove()">
                        Annuler
                    </button>
                    <button class="btn" id="sc-pdf-download-btn"
                        style="background:var(--surface-2,#f3f4f6);
                               border:1px solid var(--border,#e5e7eb);
                               color:var(--text-primary,#374151);"
                        onclick="window._scGeneratePDF(false)">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor" width="13" height="13">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7
                                a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0
                                01.707.293l5.414 5.414a1 1 0
                                01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        Télécharger PDF
                    </button>
                    <button class="btn btn-primary" id="sc-pdf-send-btn"
                        onclick="window._scGeneratePDF(true)">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor" width="13" height="13">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8
                                M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                        Envoyer + Télécharger
                    </button>
                </div>
            </div>
        </div>`;

        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add("open"));
    }

    // ── Construire le HTML du rapport ─────────────────────────
    function buildPDFHTML(rows) {
        const groups = {};
        const order  = [];
        rows.forEach(row => {
            const custRef = String(row["Cust Style Ref"] || "").trim();
            const ctlRef  = String(row["CTL Style Ref"]  || "").trim();
            const key     = custRef || "(sans référence)";
            if (!groups[key]) { groups[key] = { custRef, ctlRef, rows: [] }; order.push(key); }
            groups[key].rows.push(row);
        });

        const todayFR = new Date().toLocaleDateString("fr-FR", {
            day: "2-digit", month: "long", year: "numeric"
        });

        const statusCfg = s => {
            const v = String(s || "").trim().toLowerCase();
            if (v === "approved") return { bg:"#f0fdf4",color:"#166534",border:"#86efac" };
            if (v === "rejected") return { bg:"#fef2f2",color:"#991b1b",border:"#fca5a5" };
            if (v === "on going") return { bg:"#eff6ff",color:"#1e40af",border:"#93c5fd" };
            return { bg:"#f9fafb",color:"#6b7280",border:"#e5e7eb" };
        };

        const sectionsHTML = order.map(key => {
            const group = groups[key];
            const approved = group.rows.filter(r =>
                String(r.Status||"").toLowerCase() === "approved").length;
            const rejected = group.rows.filter(r =>
                String(r.Status||"").toLowerCase() === "rejected").length;
            const ongoing  = group.rows.filter(r =>
                String(r.Status||"").toLowerCase() === "on going").length;

            const rowsHTML = group.rows.map(r => {
                const sc  = statusCfg(r.Status);
                const det = String(r.Details || "").trim().replace(/
/g, "<br>");
                return `
                <tr>
                    <td style="padding:8px 12px;font-size:12px;font-weight:500;
                        color:#111827;border-bottom:1px solid #f3f4f6;vertical-align:top;">
                        ${r.Composant || "—"}
                    </td>
                    <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;
                        vertical-align:top;">
                        ${r.Status ? `<span style="display:inline-block;padding:2px 9px;
                            border-radius:20px;font-size:11px;font-weight:600;
                            background:${sc.bg};color:${sc.color};
                            border:0.5px solid ${sc.border};">${r.Status}</span>` : "—"}
                    </td>
                    <td style="padding:8px 12px;font-size:12px;color:#374151;
                        border-bottom:1px solid #f3f4f6;vertical-align:top;
                        line-height:1.5;">${det || "—"}</td>
                </tr>`;
            }).join("");

            return `
            <div style="margin-bottom:28px;page-break-inside:avoid;">
                <div style="background:linear-gradient(135deg,#1565c0,#1e88e5);
                    border-radius:10px 10px 0 0;padding:14px 18px;
                    display:flex;align-items:center;justify-content:space-between;
                    flex-wrap:wrap;gap:8px;">
                    <div>
                        <div style="font-size:16px;font-weight:700;color:#fff;
                            letter-spacing:.02em;">${group.custRef || "—"}</div>
                        ${group.ctlRef ? `<div style="font-size:11px;
                            color:rgba(255,255,255,.7);margin-top:3px;">
                            CTL Ref : ${group.ctlRef}</div>` : ""}
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        ${approved > 0 ? `<span style="padding:3px 10px;border-radius:20px;
                            background:#f0fdf4;color:#166534;font-size:11px;font-weight:600;">
                            ✓ ${approved} Approved</span>` : ""}
                        ${ongoing  > 0 ? `<span style="padding:3px 10px;border-radius:20px;
                            background:#eff6ff;color:#1e40af;font-size:11px;font-weight:600;">
                            ⏳ ${ongoing} On Going</span>` : ""}
                        ${rejected > 0 ? `<span style="padding:3px 10px;border-radius:20px;
                            background:#fef2f2;color:#991b1b;font-size:11px;font-weight:600;">
                            ✗ ${rejected} Rejected</span>` : ""}
                    </div>
                </div>
                <table width="100%" cellpadding="0" cellspacing="0"
                    style="border-collapse:collapse;
                           border:1px solid #e5e7eb;border-top:none;overflow:hidden;">
                    <thead>
                        <tr style="background:#f9fafb;border-bottom:1.5px solid #e5e7eb;">
                            <th style="padding:8px 12px;text-align:left;font-size:10.5px;
                                color:#6b7280;text-transform:uppercase;
                                letter-spacing:.07em;font-weight:600;width:25%;">
                                Composant</th>
                            <th style="padding:8px 12px;text-align:left;font-size:10.5px;
                                color:#6b7280;text-transform:uppercase;
                                letter-spacing:.07em;font-weight:600;width:18%;">
                                Status</th>
                            <th style="padding:8px 12px;text-align:left;font-size:10.5px;
                                color:#6b7280;text-transform:uppercase;
                                letter-spacing:.07em;font-weight:600;width:57%;">
                                Details</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHTML}</tbody>
                </table>
            </div>`;
        }).join("");

        const totalStyles     = order.length;
        const totalComposants = rows.length;
        const totalApproved   = rows.filter(r =>
            String(r.Status||"").toLowerCase() === "approved").length;
        const totalRejected   = rows.filter(r =>
            String(r.Status||"").toLowerCase() === "rejected").length;
        const totalOngoing    = rows.filter(r =>
            String(r.Status||"").toLowerCase() === "on going").length;

        return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>AW27 — Style Components</title>
<style>
  * { box-sizing:border-box; }
  body { margin:0;padding:32px 40px;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
    background:#fff;color:#111827; }
  @media print {
    body { padding:20px 24px; }
    @page { margin:15mm 12mm;size:A4; }
  }
</style>
</head>
<body>

<div style="display:flex;align-items:center;justify-content:space-between;
    margin-bottom:28px;padding-bottom:18px;border-bottom:2px solid #e5e7eb;
    flex-wrap:wrap;gap:12px;">
    <div style="display:flex;align-items:center;gap:16px;">
        <div style="background:linear-gradient(135deg,#1565c0,#1e88e5);
            border-radius:10px;padding:10px 16px;">
            <span style="color:#fff;font-size:20px;font-weight:700;
                letter-spacing:.06em;">AW27</span>
        </div>
        <div>
            <div style="font-size:18px;font-weight:700;color:#111827;">
                Style Components</div>
            <div style="font-size:12px;color:#6b7280;margin-top:2px;">
                Rapport généré le ${todayFR}</div>
        </div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <div style="text-align:center;padding:8px 14px;border-radius:8px;
            background:#f9fafb;border:0.5px solid #e5e7eb;">
            <div style="font-size:20px;font-weight:700;color:#111827;">${totalStyles}</div>
            <div style="font-size:10px;color:#6b7280;text-transform:uppercase;">Styles</div>
        </div>
        <div style="text-align:center;padding:8px 14px;border-radius:8px;
            background:#f9fafb;border:0.5px solid #e5e7eb;">
            <div style="font-size:20px;font-weight:700;color:#111827;">${totalComposants}</div>
            <div style="font-size:10px;color:#6b7280;text-transform:uppercase;">Composants</div>
        </div>
        <div style="text-align:center;padding:8px 14px;border-radius:8px;
            background:#f0fdf4;border:0.5px solid #86efac;">
            <div style="font-size:20px;font-weight:700;color:#166534;">${totalApproved}</div>
            <div style="font-size:10px;color:#166534;text-transform:uppercase;">Approved</div>
        </div>
        <div style="text-align:center;padding:8px 14px;border-radius:8px;
            background:#eff6ff;border:0.5px solid #93c5fd;">
            <div style="font-size:20px;font-weight:700;color:#1e40af;">${totalOngoing}</div>
            <div style="font-size:10px;color:#1e40af;text-transform:uppercase;">On Going</div>
        </div>
        <div style="text-align:center;padding:8px 14px;border-radius:8px;
            background:#fef2f2;border:0.5px solid #fca5a5;">
            <div style="font-size:20px;font-weight:700;color:#991b1b;">${totalRejected}</div>
            <div style="font-size:10px;color:#991b1b;text-transform:uppercase;">Rejected</div>
        </div>
    </div>
</div>

${sectionsHTML}

<div style="margin-top:32px;padding-top:14px;border-top:1px solid #e5e7eb;
    text-align:center;font-size:10.5px;color:#9ca3af;">
    AW27 Checkers — Style Components — ${todayFR}
</div>
</body>
</html>`;
    }

    // ── Handler principal (exposé globalement) ────────────────
    window._scGeneratePDF = async function(sendEmail) {
        const recipient = (document.getElementById("sc-pdf-email")?.value || "").trim();

        if (sendEmail && !recipient) {
            typeof showToast === "function" &&
                showToast("Entrez un email destinataire.", "error");
            document.getElementById("sc-pdf-email")?.focus();
            return;
        }

        // Boutons en état loading
        const dlBtn   = document.getElementById("sc-pdf-download-btn");
        const sendBtn = document.getElementById("sc-pdf-send-btn");
        if (dlBtn)   { dlBtn.disabled   = true; }
        if (sendBtn) { sendBtn.disabled = true;
            sendBtn.innerHTML = `<span class="sc-spin">⏳</span> Envoi…`; }

        try {
            const rows    = window.state?.data?.[SHEET_KEY] || [];
            const htmlDoc = buildPDFHTML(rows);

            // ── Envoi email ────────────────────────────────────
            if (sendEmail && recipient) {
                const gasUrl = window.GOOGLE_APPS_SCRIPT_URL;
                if (!gasUrl || gasUrl === "YOUR_WEB_APP_URL_HERE") {
                    throw new Error("URL GAS non configurée.");
                }

                localStorage.setItem("aw27_sc_pdf_email", recipient);

                const today   = new Date().toISOString().slice(0, 10);
                const subject = `AW27 — Style Components — ${today}`;

                const res = await fetch(gasUrl, {
                    method:   "POST",
                    headers:  { "Content-Type": "text/plain;charset=utf-8" },
                    redirect: "follow",
                    body: JSON.stringify({
                        action:     "SEND_ALERT_EMAIL",
                        recipient,
                        subject,
                        htmlBody:   htmlDoc,
                        xlsxBase64: "",
                        fileName:   ""
                    })
                });

                const json = await res.json();
                if (json.status !== "ok") throw new Error(json.message || "Erreur GAS");

                typeof showToast === "function" &&
                    showToast(`✅ Rapport envoyé à ${recipient}`, "success", 5000);
            }

            // ── Toujours ouvrir le PDF pour impression ─────────
            document.getElementById("sc-pdf-modal")?.remove();

            const win = window.open("", "_blank");
            if (!win) {
                typeof showToast === "function" &&
                    showToast("Autorise les popups pour télécharger le PDF.", "error", 5000);
                return;
            }
            win.document.write(htmlDoc);
            win.document.close();
            win.onload = () => setTimeout(() => { win.focus(); win.print(); }, 400);

            if (!sendEmail) {
                typeof showToast === "function" &&
                    showToast("PDF ouvert — Ctrl+P pour sauvegarder.", "success", 4000);
            }

        } catch(err) {
            typeof showToast === "function" &&
                showToast("Erreur : " + err.message, "error");
            if (dlBtn)   dlBtn.disabled   = false;
            if (sendBtn) {
                sendBtn.disabled  = false;
                sendBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor" width="13" height="13">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7
                        a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    Envoyer + Télécharger`;
            }
        }
    };

    // ── Injecter le bouton PDF dans le header ─────────────────
    function injectHeaderButton() {
        if (document.getElementById("btn-components-pdf")) return;

        const btn = document.createElement("button");
        btn.id    = "btn-components-pdf";
        btn.title = "Télécharger le PDF des composants styles";
        btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" width="13" height="13">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0
                    012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0
                    01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Components PDF`;
        btn.onclick = openPDFModal;

        const targets = [
            document.getElementById("btn-order-scan"),
            document.getElementById("btn-mail-alerts"),
            document.getElementById("btn-notif-global"),
            document.querySelector(".header-right button")
        ];
        const target = targets.find(Boolean);
        if (target?.parentNode) {
            target.parentNode.insertBefore(btn, target);
        } else {
            document.querySelector(".header-right")?.prepend(btn);
        }
    }

    // ── Init ──────────────────────────────────────────────────
    function init() {
        injectStyles();
        registerMenu();
        addNavItem();
        patchRenderAll();
        observeModal();

        // Charger les données initiales
        loadComponentsData().then(() => {
            if (window.state?.activeSheet === SHEET_KEY) {
                if (typeof applyFilters === "function") applyFilters();
                if (typeof renderKPIs   === "function") renderKPIs();
            }
        });

        // Bouton PDF dans le header
        const tryInject = () => {
            if (document.querySelector(".header-right")) {
                injectHeaderButton();
            } else {
                setTimeout(tryInject, 300);
            }
        };
        tryInject();

        // Sauvegarder dans GAS pour survivre aux rechargements
        saveMenuToGAS();

        console.log("[AW27] Style Components ✓");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 800);
    }

})();
