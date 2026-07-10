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
        { key: "Details",        label: "Details",        type: "textarea"               },
        { key: "Date",           label: "Date",           type: "date"                   }
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
        #btn-components-pdf:disabled {
            opacity: .5; cursor: not-allowed;
        }
        @keyframes sc-spin { to { transform: rotate(360deg); } }
        .sc-spin {
            display: inline-block;
            animation: sc-spin .7s linear infinite;
        }
        /* Badge status dans la table */
        .sc-badge-approved  { background:#f0fdf4;color:#166534;border:0.5px solid #86efac; }
        .sc-badge-rejected  { background:#fef2f2;color:#991b1b;border:0.5px solid #fca5a5; }
        .sc-badge-ongoing   { background:#eff6ff;color:#1e40af;border:0.5px solid #93c5fd; }
        .sc-badge {
            display:inline-block;padding:2px 9px;border-radius:20px;
            font-size:11px;font-weight:600;white-space:nowrap;
        }
        `;
        document.head.appendChild(s);
    }

    // ── Formater le badge statut ──────────────────────────────
    function statusBadge(val) {
        const v = String(val || "").trim();
        if (!v) return `<span style="color:var(--text-muted,#9ca3af)">—</span>`;
        const cls = v.toLowerCase() === "approved" ? "sc-badge-approved"
                  : v.toLowerCase() === "rejected" ? "sc-badge-rejected"
                  : "sc-badge-ongoing";
        return `<span class="sc-badge ${cls}">${v}</span>`;
    }

    // ── Formater une date ─────────────────────────────────────
    function fmtDate(val) {
        if (!val) return "—";
        try {
            return new Date(val).toLocaleDateString("fr-FR", {
                day: "2-digit", month: "short", year: "numeric"
            });
        } catch(e) { return String(val); }
    }

    // ── Enregistrer le menu dans SHEET_CONFIG ─────────────────
    function registerMenu() {
        if (window.SHEET_CONFIG?.[SHEET_KEY]) return;

        window.SHEET_CONFIG[SHEET_KEY] = {
            label:     SHEET_NAME,
            sheetName: SHEET_NAME,
            custom:    true,
            icon:      "ti-components",
            cols:      COLS,
            kpis: [
                {
                    label: "Total composants",
                    colorClass: "teal",
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                        stroke-width="1.8" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>`,
                    compute: rows => rows.length
                },
                {
                    label: "Approved",
                    colorClass: "green",
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                        stroke-width="1.8" d="M9 12l2 2 4-4m6 2a9 9 0
                        11-18 0 9 9 0 0118 0z"/></svg>`,
                    compute: rows => rows.filter(r =>
                        String(r.Status || "").trim().toLowerCase() === "approved").length
                },
                {
                    label: "On Going",
                    colorClass: "blue",
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                        stroke-width="1.8" d="M12 8v4l3 3m6-3a9 9 0
                        11-18 0 9 9 0 0118 0z"/></svg>`,
                    compute: rows => rows.filter(r =>
                        String(r.Status || "").trim().toLowerCase() === "on going").length
                },
                {
                    label: "Rejected",
                    colorClass: "red",
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                        stroke-width="1.8" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2
                        2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
                    compute: rows => rows.filter(r =>
                        String(r.Status || "").trim().toLowerCase() === "rejected").length
                }
            ]
        };

        if (!window.state.data[SHEET_KEY]) window.state.data[SHEET_KEY] = [];
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
            window.state.activeView  = "sheet";
            window.state.activeSheet = SHEET_KEY;
            window.state.searchQuery = "";
            window.state.filterDept  = "";
            window.state.filterClient= "";
            window.state.sortCol     = null;
            window.state.sortDir     = 1;

            const si = document.getElementById("search-input");
            const df = document.getElementById("dept-filter");
            const cf = document.getElementById("client-filter");
            if (si) si.value = "";
            if (df) df.value = "";
            if (cf) cf.value = "";

            document.querySelectorAll(".nav-item").forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-selected", "false");
            });
            btn.classList.add("active");
            btn.setAttribute("aria-selected", "true");

            const titleEl = document.getElementById("header-sheet-title");
            if (titleEl) titleEl.textContent = SHEET_NAME;

            if (typeof showTableView  === "function") showTableView();
            if (typeof applyFilters   === "function") applyFilters();
            if (typeof renderKPIs     === "function") renderKPIs();
            if (typeof populateDeptFilter   === "function") populateDeptFilter();
            if (typeof populateClientFilter === "function") populateClientFilter();
        });

        nav.appendChild(btn);
    }

    // ── Charger les données depuis GAS ────────────────────────
    async function loadComponentsData() {
        try {
            const gasUrl = window.GOOGLE_APPS_SCRIPT_URL;
            if (!gasUrl || gasUrl === "YOUR_WEB_APP_URL_HERE") return;

            const res  = await fetch(gasUrl);
            const json = await res.json();
            if (json.status !== "ok") return;

            // Chercher la feuille Style Components dans la réponse
            const sheetData = json.data?.[SHEET_NAME]
                || json.data?.[SHEET_NAME.toLowerCase()]
                || Object.entries(json.data || {}).find(([k]) =>
                    k.toLowerCase() === SHEET_NAME.toLowerCase()
                )?.[1];

            if (sheetData?.rows) {
                window.state.data[SHEET_KEY] = (sheetData.rows || []).map((r, i) => ({
                    ...r,
                    _rowIndex: r._rowIndex ?? (i + 2)
                }));
            }
        } catch(e) {
            console.warn("[StyleComponents] Erreur chargement :", e.message);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  GÉNÉRATION PDF
    // ═══════════════════════════════════════════════════════════

    async function generateComponentsPDF() {
        const btn = document.getElementById("btn-components-pdf");
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="sc-spin">⏳</span> Génération…`;
        }
        typeof showToast === "function" &&
            showToast("Génération du PDF en cours…", "info", 12000);

        try {
            const rows = window.state?.data?.[SHEET_KEY] || [];
            if (!rows.length) {
                typeof showToast === "function" &&
                    showToast("Aucun composant enregistré.", "info");
                return;
            }

            // Grouper par Cust Style Ref
            const groups = {};
            rows.forEach(row => {
                const custRef = String(row["Cust Style Ref"] || "").trim();
                const ctlRef  = String(row["CTL Style Ref"]  || "").trim();
                const key     = custRef || "(sans référence)";
                if (!groups[key]) groups[key] = { custRef, ctlRef, rows: [] };
                groups[key].rows.push(row);
            });

            // Construire le HTML du PDF
            const todayFR = new Date().toLocaleDateString("fr-FR", {
                day: "2-digit", month: "long", year: "numeric"
            });

            const statusColor = s => {
                const v = String(s || "").trim().toLowerCase();
                if (v === "approved")  return { bg: "#f0fdf4", color: "#166534", border: "#86efac" };
                if (v === "rejected")  return { bg: "#fef2f2", color: "#991b1b", border: "#fca5a5" };
                if (v === "on going")  return { bg: "#eff6ff", color: "#1e40af", border: "#93c5fd" };
                return { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" };
            };

            const sectionsHTML = Object.entries(groups).map(([key, group]) => {
                const rowsHTML = group.rows.map(r => {
                    const sc  = statusColor(r.Status);
                    const dt  = fmtDate(r.Date);
                    const det = String(r.Details || "").trim();
                    return `
                    <tr>
                        <td style="padding:8px 12px;font-size:12px;font-weight:500;
                            color:#111827;border-bottom:1px solid #f3f4f6;
                            vertical-align:top;">
                            ${r.Composant || "—"}
                        </td>
                        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;
                            vertical-align:top;">
                            ${r.Status ? `
                            <span style="display:inline-block;padding:2px 9px;
                                border-radius:20px;font-size:11px;font-weight:600;
                                background:${sc.bg};color:${sc.color};
                                border:0.5px solid ${sc.border};">
                                ${r.Status}
                            </span>` : "—"}
                        </td>
                        <td style="padding:8px 12px;font-size:12px;color:#374151;
                            border-bottom:1px solid #f3f4f6;vertical-align:top;
                            line-height:1.5;">
                            ${det || "—"}
                        </td>
                        <td style="padding:8px 12px;font-size:12px;color:#6b7280;
                            border-bottom:1px solid #f3f4f6;vertical-align:top;
                            white-space:nowrap;">
                            ${dt}
                        </td>
                    </tr>`;
                }).join("");

                // Compter les statuts pour le résumé de section
                const approved = group.rows.filter(r =>
                    String(r.Status||"").toLowerCase() === "approved").length;
                const rejected = group.rows.filter(r =>
                    String(r.Status||"").toLowerCase() === "rejected").length;
                const ongoing  = group.rows.filter(r =>
                    String(r.Status||"").toLowerCase() === "on going").length;

                return `
                <div style="margin-bottom:32px;page-break-inside:avoid;">
                    <!-- En-tête style -->
                    <div style="background:linear-gradient(135deg,#1565c0,#1e88e5);
                        border-radius:10px 10px 0 0;padding:14px 18px;
                        display:flex;align-items:center;justify-content:space-between;">
                        <div>
                            <div style="font-size:16px;font-weight:700;color:#fff;
                                letter-spacing:.02em;">
                                ${group.custRef || "—"}
                            </div>
                            ${group.ctlRef ? `
                            <div style="font-size:11px;color:rgba(255,255,255,.7);
                                margin-top:3px;">
                                CTL Ref : ${group.ctlRef}
                            </div>` : ""}
                        </div>
                        <!-- Mini stats -->
                        <div style="display:flex;gap:8px;">
                            ${approved > 0 ? `
                            <span style="padding:3px 10px;border-radius:20px;
                                background:#f0fdf4;color:#166534;
                                font-size:11px;font-weight:600;">
                                ✓ ${approved} Approved
                            </span>` : ""}
                            ${ongoing > 0 ? `
                            <span style="padding:3px 10px;border-radius:20px;
                                background:#eff6ff;color:#1e40af;
                                font-size:11px;font-weight:600;">
                                ⏳ ${ongoing} On Going
                            </span>` : ""}
                            ${rejected > 0 ? `
                            <span style="padding:3px 10px;border-radius:20px;
                                background:#fef2f2;color:#991b1b;
                                font-size:11px;font-weight:600;">
                                ✗ ${rejected} Rejected
                            </span>` : ""}
                        </div>
                    </div>
                    <!-- Tableau composants -->
                    <table width="100%" cellpadding="0" cellspacing="0"
                        style="border-collapse:collapse;
                               border:1px solid #e5e7eb;border-top:none;
                               border-radius:0 0 10px 10px;overflow:hidden;">
                        <thead>
                            <tr style="background:#f9fafb;border-bottom:1.5px solid #e5e7eb;">
                                <th style="padding:8px 12px;text-align:left;font-size:10.5px;
                                    color:#6b7280;text-transform:uppercase;
                                    letter-spacing:.07em;font-weight:600;width:25%;">
                                    Composant
                                </th>
                                <th style="padding:8px 12px;text-align:left;font-size:10.5px;
                                    color:#6b7280;text-transform:uppercase;
                                    letter-spacing:.07em;font-weight:600;width:15%;">
                                    Status
                                </th>
                                <th style="padding:8px 12px;text-align:left;font-size:10.5px;
                                    color:#6b7280;text-transform:uppercase;
                                    letter-spacing:.07em;font-weight:600;width:45%;">
                                    Details
                                </th>
                                <th style="padding:8px 12px;text-align:left;font-size:10.5px;
                                    color:#6b7280;text-transform:uppercase;
                                    letter-spacing:.07em;font-weight:600;width:15%;">
                                    Date
                                </th>
                            </tr>
                        </thead>
                        <tbody>${rowsHTML}</tbody>
                    </table>
                </div>`;
            }).join("");

            const totalStyles     = Object.keys(groups).length;
            const totalComposants = rows.length;
            const totalApproved   = rows.filter(r =>
                String(r.Status||"").toLowerCase() === "approved").length;
            const totalRejected   = rows.filter(r =>
                String(r.Status||"").toLowerCase() === "rejected").length;
            const totalOngoing    = rows.filter(r =>
                String(r.Status||"").toLowerCase() === "on going").length;

            const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>AW27 — Style Components</title>
<style>
    * { box-sizing: border-box; }
    body {
        margin: 0; padding: 32px 40px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        background: #fff; color: #111827;
    }
    @media print {
        body { padding: 20px 24px; }
        .no-print { display: none !important; }
    }
    @page { margin: 20mm 15mm; size: A4; }
</style>
</head>
<body>

<!-- HEADER PAGE -->
<div style="display:flex;align-items:center;justify-content:space-between;
    margin-bottom:28px;padding-bottom:18px;border-bottom:2px solid #e5e7eb;">
    <div style="display:flex;align-items:center;gap:16px;">
        <div style="background:linear-gradient(135deg,#1565c0,#1e88e5);
            border-radius:10px;padding:10px 16px;">
            <span style="color:#fff;font-size:20px;font-weight:700;
                letter-spacing:.06em;">AW27</span>
        </div>
        <div>
            <div style="font-size:18px;font-weight:700;color:#111827;">
                Style Components
            </div>
            <div style="font-size:12px;color:#6b7280;margin-top:2px;">
                Rapport généré le ${todayFR}
            </div>
        </div>
    </div>
    <!-- Résumé global -->
    <div style="display:flex;gap:10px;">
        <div style="text-align:center;padding:8px 14px;border-radius:8px;
            background:#f9fafb;border:0.5px solid #e5e7eb;">
            <div style="font-size:20px;font-weight:700;color:#111827;">${totalStyles}</div>
            <div style="font-size:10px;color:#6b7280;text-transform:uppercase;
                letter-spacing:.05em;">Styles</div>
        </div>
        <div style="text-align:center;padding:8px 14px;border-radius:8px;
            background:#f9fafb;border:0.5px solid #e5e7eb;">
            <div style="font-size:20px;font-weight:700;color:#111827;">${totalComposants}</div>
            <div style="font-size:10px;color:#6b7280;text-transform:uppercase;
                letter-spacing:.05em;">Composants</div>
        </div>
        <div style="text-align:center;padding:8px 14px;border-radius:8px;
            background:#f0fdf4;border:0.5px solid #86efac;">
            <div style="font-size:20px;font-weight:700;color:#166534;">${totalApproved}</div>
            <div style="font-size:10px;color:#166534;text-transform:uppercase;
                letter-spacing:.05em;">Approved</div>
        </div>
        <div style="text-align:center;padding:8px 14px;border-radius:8px;
            background:#eff6ff;border:0.5px solid #93c5fd;">
            <div style="font-size:20px;font-weight:700;color:#1e40af;">${totalOngoing}</div>
            <div style="font-size:10px;color:#1e40af;text-transform:uppercase;
                letter-spacing:.05em;">On Going</div>
        </div>
        <div style="text-align:center;padding:8px 14px;border-radius:8px;
            background:#fef2f2;border:0.5px solid #fca5a5;">
            <div style="font-size:20px;font-weight:700;color:#991b1b;">${totalRejected}</div>
            <div style="font-size:10px;color:#991b1b;text-transform:uppercase;
                letter-spacing:.05em;">Rejected</div>
        </div>
    </div>
</div>

<!-- SECTIONS PAR STYLE -->
${sectionsHTML}

<!-- FOOTER -->
<div style="margin-top:32px;padding-top:14px;border-top:1px solid #e5e7eb;
    text-align:center;font-size:10.5px;color:#9ca3af;">
    AW27 Checkers — Style Components Report — ${todayFR}
</div>

</body>
</html>`;

            // Ouvrir dans une nouvelle fenêtre et imprimer en PDF
            const win = window.open("", "_blank");
            if (!win) {
                typeof showToast === "function" &&
                    showToast("Autorisez les popups pour télécharger le PDF.", "error", 5000);
                return;
            }
            win.document.write(htmlContent);
            win.document.close();

            // Lancer l'impression après rendu
            win.onload = () => {
                setTimeout(() => {
                    win.focus();
                    win.print();
                }, 400);
            };

            typeof showToast === "function" &&
                showToast("PDF ouvert — utilise Ctrl+P pour sauvegarder en PDF.", "success", 5000);

        } catch(err) {
            typeof showToast === "function" &&
                showToast("Erreur génération PDF : " + err.message, "error");
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor" width="13" height="13">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0
                            012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0
                            01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    Components PDF`;
            }
        }
    }

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
        btn.onclick = generateComponentsPDF;

        // Insérer avant "Rapport email" ou "Commandes" ou le bouton notif
        const targets = [
            document.getElementById("btn-order-scan"),
            document.getElementById("btn-mail-alerts"),
            document.getElementById("btn-notif-global"),
            document.querySelector(".header-right button")
        ];
        const target      = targets.find(Boolean);
        const headerRight = document.querySelector(".header-right");

        if (target?.parentNode) {
            target.parentNode.insertBefore(btn, target);
        } else if (headerRight) {
            headerRight.prepend(btn);
        }
    }

    // ── Patcher renderAll pour maintenir les colonnes ─────────
    function patchRenderAll() {
        if (window._scRenderAllPatched) return;
        const orig = window.renderAll;
        if (typeof orig !== "function") return;
        window._scRenderAllPatched = true;

        window.renderAll = function(...args) {
            registerMenu();
            return orig.apply(this, args);
        };
    }

    // ── Init ──────────────────────────────────────────────────
    function init() {
        injectStyles();
        registerMenu();
        addNavItem();
        patchRenderAll();

        // Charger les données au démarrage
        loadComponentsData().then(() => {
            // Rafraîchir si on est déjà sur ce sheet
            if (window.state?.activeSheet === SHEET_KEY) {
                if (typeof applyFilters === "function") applyFilters();
                if (typeof renderKPIs   === "function") renderKPIs();
            }
        });

        // Bouton header
        const tryInject = () => {
            if (document.querySelector(".header-right")) {
                injectHeaderButton();
            } else {
                setTimeout(tryInject, 300);
            }
        };
        tryInject();

        console.log("[AW27] Style Components ✓");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 800);
    }

})();
