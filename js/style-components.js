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
          options: ["", "Pending", "In House", "PO Sent", "Waiting Approval"]                   },
        { key: "Details",        label: "Details",        type: "textarea", full: true   }

    ];

    // ── Styles CSS ────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById("sc-styles")) return;
        const s = document.createElement("style");
        s.id = "sc-styles";
        s.textContent = `
        #btn-components-pdf {
            display: flex; align-items: center; justify-content: center;
            width: 34px; height: 34px; border-radius: 50%; padding: 0;
            background: var(--surface-1, #f3f4f6);
            border: 1px solid var(--border, #e5e7eb);
            color: var(--text-secondary, #6b7280); cursor: pointer;
            transition: background .15s, color .15s;
        }
        #btn-components-pdf:hover {
            background: var(--surface-0, #ede9fe); color: #7e22ce;
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

            // Injecter le menu Actions (même appel que patchRenderAll)
            injectHeaderButton();
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

    // ── Déclencher saRefresh avec retry jusqu'à ce qu'il soit dispo ──
    function _triggerSARefresh() {
        if (typeof window.saRefresh === "function") {
            setTimeout(window.saRefresh, 100);
        } else {
            // saRefresh pas encore prêt (data load avant smartAlerts) → retry
            setTimeout(_triggerSARefresh, 500);
        }
    }

    // ── Enregistrer un collecteur dans window.smartAlertsCollectors ──
    // Le système smartAlerts.js lit ce tableau dans son collectAlerts()
    function registerSmartAlertsCollector() {
        if (window._scSACollectorRegistered) return;
        window._scSACollectorRegistered = true;

        if (!Array.isArray(window.smartAlertsCollectors)) {
            window.smartAlertsCollectors = [];
        }

        const OK = ["approved", "in house"];

        window.smartAlertsCollectors.push(function(stateData) {
            const rows = stateData["style_components"]
                      || window.state?.data?.["style_components"]
                      || [];
            const alerts = [];

            rows.forEach(row => {
                const statusRaw = String(row.Status || "").trim();
                const status    = statusRaw.toLowerCase();
                if (OK.includes(status)) return;

                const custRef   = String(row["Cust Style Ref"] || "").trim() || "—";
                const ctlRef    = String(row["CTL Style Ref"]  || "").trim();
                const composant = String(row.Composant         || "").trim() || "—";
                const detail    = String(row.Details           || "").trim();

                let type, severity, title, details, action, icon;

                if (status === "rejected") {
                    type     = "Composant Rejeté";
                    severity = "danger";
                    title    = `${custRef} — Composant rejeté : ${composant}`;
                    details  = [
                        `Composant : ${composant}`,
                        ...(detail  ? [`Détail : ${detail}`]    : []),
                        ...(ctlRef  ? [`CTL Ref : ${ctlRef}`]   : [])
                    ];
                    action   = `Relancer le fournisseur pour ce composant`
                             + (detail ? ` : ${detail}` : "");
                    icon     = "alert";
                } else if (status === "on going") {
                    type     = "Composant On Going";
                    severity = "warn";
                    title    = `${custRef} — En attente : ${composant}`;
                    details  = [
                        `Composant : ${composant}`,
                        ...(detail  ? [`Détail : ${detail}`]  : []),
                        ...(ctlRef  ? [`CTL Ref : ${ctlRef}`] : [])
                    ];
                    action   = `Suivre l'avancement`
                             + (detail ? ` : ${detail}` : "");
                    icon     = "clock";
                } else {
                    type     = "Composant Sans Statut";
                    severity = "warn";
                    title    = `${custRef} — Statut manquant : ${composant}`;
                    details  = [
                        `Composant : ${composant}`,
                        "Statut non renseigné",
                        ...(ctlRef ? [`CTL Ref : ${ctlRef}`] : [])
                    ];
                    action   = "Renseigner le statut de ce composant";
                    icon     = "sample";
                }

                alerts.push({
                    type, severity,
                    style:    custRef,
                    client:   ctlRef || "",
                    title,    details, action, icon,
                    rowIndex: row._rowIndex,
                    sheet:    "style_components"
                });
            });

            return alerts;
        });

        console.log("[StyleComponents] Collecteur smartAlerts enregistré ✓");
    }

    // ── Patcher collectAllAlerts pour injecter les alertes SC ──
    function patchCollectAllAlerts() {
        if (window._scAlertsPatched) return;
        const orig = window.collectAllAlerts;
        if (typeof orig !== "function") return;
        window._scAlertsPatched = true;

        window.collectAllAlerts = function() {
            const result = orig.apply(this, arguments);
            const rows = window.state?.data?.[SHEET_KEY] || [];
            if (!rows.length) return result;

            // Statuts qui ne génèrent PAS d'alerte
            const OK = ["approved", "in house"];
            const items = [];

            rows.forEach(row => {
                const statusRaw = String(row.Status || "").trim();
                const status    = statusRaw.toLowerCase();
                if (OK.includes(status)) return;

                const custRef   = String(row["Cust Style Ref"] || "").trim() || "—";
                const ctlRef    = String(row["CTL Style Ref"]  || "").trim();
                const composant = String(row.Composant         || "").trim() || "—";
                const details   = String(row.Details           || "").trim();

                let urgency, dotCls, tagCls, tagLabel, title, action;

                if (status === "rejected") {
                    urgency  = "high";
                    dotCls   = "dot-late";
                    tagCls   = "tag-late";
                    tagLabel = `✗ Rejeté — ${composant}`;
                    title    = `${custRef} — ${composant} rejeté`;
                    action   = `Relancer le fournisseur pour ce composant` +
                               (details ? ` : ${details}` : "");
                } else if (status === "on going") {
                    urgency  = "mid";
                    dotCls   = "dot-approve";
                    tagCls   = "tag-approve";
                    tagLabel = `⏳ On Going — ${composant}`;
                    title    = `${custRef} — ${composant} en attente d'approbation`;
                    action   = `Suivre l'avancement` +
                               (details ? ` : ${details}` : "");
                } else {
                    // statut vide ou inconnu
                    urgency  = "low";
                    dotCls   = "dot-nopo";
                    tagCls   = "tag-nopo";
                    tagLabel = `📋 Statut manquant — ${composant}`;
                    title    = `${custRef} — ${composant} sans statut renseigné`;
                    action   = `Renseigner le statut de ce composant`;
                }

                items.push({
                    dotCls, tagCls, tagLabel,
                    title,  action,
                    style:    custRef,
                    client:   ctlRef || "",
                    urgency,
                    sheet:    SHEET_KEY,
                    rowIndex: row._rowIndex,
                    meta:     `Composant : ${composant}` +
                              (statusRaw ? ` · Statut : ${statusRaw}` : "") +
                              (details   ? ` · ${details}`             : "") +
                              (ctlRef    ? ` · CTL : ${ctlRef}`        : "")
                });
            });

            if (items.length) {
                result[SHEET_KEY] = { label: "Style Components", items };
            }

            return result;
        };

        // Rafraîchir le badge cloche immédiatement
        if (typeof updateGlobalNotifBadge === "function") {
            updateGlobalNotifBadge();
        }
        console.log("[StyleComponents] Alertes patchées ✓");
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
                    // Ré-enregistrer et rafraîchir smartAlerts
                    registerSmartAlertsCollector();
                    _triggerSARefresh();
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

        // Styles uniques triés
        const allStyles = [...new Set(
            rows.map(r => String(r["Cust Style Ref"] || "").trim()).filter(Boolean)
        )].sort();

        // Checkboxes HTML pour chaque style
        const styleChecks = allStyles.map(s => `
            <label style="display:flex;align-items:center;gap:8px;
                padding:5px 8px;border-radius:6px;cursor:pointer;font-size:12px;
                color:var(--text-primary,#111827);transition:background .1s;"
                onmouseover="this.style.background='var(--surface-1,#f9fafb)'"
                onmouseout="this.style.background=''">
                <input type="checkbox" class="sc-style-check"
                    data-style="${s}" checked
                    style="width:14px;height:14px;accent-color:#1565c0;cursor:pointer;"/>
                <span>${s}</span>
                <span style="margin-left:auto;font-size:10px;
                    color:var(--text-muted,#9ca3af);">
                    ${rows.filter(r => String(r["Cust Style Ref"]||"").trim() === s).length} composant${rows.filter(r => String(r["Cust Style Ref"]||"").trim() === s).length > 1 ? "s" : ""}
                </span>
            </label>`).join("");

        // Statuts uniques présents dans les données + options COLS
        const STATUS_OPTS = ["Pending", "In House", "PO Sent", "Waiting Approval"];
        const STATUS_COLORS = {
            "Pending":          { bg:"#fef9c3",color:"#854d0e",border:"#fde68a" },
            "In House":         { bg:"#f0fdf4",color:"#166534",border:"#86efac" },
            "PO Sent":          { bg:"#eff6ff",color:"#1e40af",border:"#93c5fd" },
            "Waiting Approval": { bg:"#fff7ed",color:"#9a3412",border:"#fed7aa" },
            "":                 { bg:"#f9fafb",color:"#6b7280",border:"#e5e7eb" }
        };

        const statusChecks = [
            { key: "__empty__", label: "(Sans statut)" },
            ...STATUS_OPTS.map(s => ({ key: s, label: s }))
        ].map(({ key, label }) => {
            const c = STATUS_COLORS[key === "__empty__" ? "" : key] || STATUS_COLORS[""];
            return `<label style="display:inline-flex;align-items:center;gap:6px;
                padding:4px 10px;border-radius:20px;cursor:pointer;
                font-size:11px;font-weight:500;
                background:${c.bg};color:${c.color};
                border:0.5px solid ${c.border};
                transition:opacity .15s;">
                <input type="checkbox" class="sc-status-check"
                    data-status="${key}" checked
                    style="width:12px;height:12px;accent-color:${c.color};cursor:pointer;"/>
                ${label}
            </label>`;
        }).join("");

        const modal = document.createElement("div");
        modal.id = "sc-pdf-modal";
        modal.className = "modal-overlay";
        modal.innerHTML = `
        <div class="modal" style="max-width:460px;">
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
                    <div class="modal-subtitle" id="sc-pdf-subtitle">
                        ${allStyles.length} style${allStyles.length > 1 ? "s" : ""} · ${rows.length} composant${rows.length > 1 ? "s" : ""}
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

                <!-- Sélecteur de styles -->
                <div>
                    <div style="display:flex;align-items:center;justify-content:space-between;
                        margin-bottom:8px;">
                        <label class="form-label" style="margin:0;">Styles à exporter</label>
                        <div style="display:flex;gap:8px;">
                            <button type="button"
                                style="font-size:11px;background:none;border:none;
                                    color:var(--text-accent,#1565c0);cursor:pointer;padding:0;"
                                onclick="document.querySelectorAll('.sc-style-check').forEach(c=>{c.checked=true;});window._scUpdatePDFSubtitle();">
                                Tout sélectionner
                            </button>
                            <span style="color:var(--border-strong,#d1d5db);">|</span>
                            <button type="button"
                                style="font-size:11px;background:none;border:none;
                                    color:var(--text-secondary,#6b7280);cursor:pointer;padding:0;"
                                onclick="document.querySelectorAll('.sc-style-check').forEach(c=>{c.checked=false;});window._scUpdatePDFSubtitle();">
                                Tout désélectionner
                            </button>
                        </div>
                    </div>
                    <div style="max-height:200px;overflow-y:auto;
                        border:0.5px solid var(--border,#e5e7eb);border-radius:8px;
                        padding:4px 6px;background:var(--surface-2,#fff);">
                        ${styleChecks}
                    </div>
                </div>

                <!-- Filtre statuts -->
                <div>
                    <div style="display:flex;align-items:center;justify-content:space-between;
                        margin-bottom:8px;">
                        <label class="form-label" style="margin:0;">Statuts à inclure</label>
                        <div style="display:flex;gap:8px;">
                            <button type="button"
                                style="font-size:11px;background:none;border:none;
                                    color:var(--text-accent,#1565c0);cursor:pointer;padding:0;"
                                onclick="document.querySelectorAll('.sc-status-check').forEach(c=>{c.checked=true;});window._scUpdatePDFSubtitle();">
                                Tous
                            </button>
                            <span style="color:var(--border-strong,#d1d5db);">|</span>
                            <button type="button"
                                style="font-size:11px;background:none;border:none;
                                    color:var(--text-secondary,#6b7280);cursor:pointer;padding:0;"
                                onclick="document.querySelectorAll('.sc-status-check').forEach(c=>{c.checked=false;});window._scUpdatePDFSubtitle();">
                                Aucun
                            </button>
                        </div>
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px 10px;
                        border:0.5px solid var(--border,#e5e7eb);border-radius:8px;
                        background:var(--surface-2,#fff);">
                        ${statusChecks}
                    </div>
                </div>

                <!-- Email -->
                <div>
                    <div style="display:flex;align-items:center;justify-content:space-between;
                        margin-bottom:6px;">
                        <label class="form-label" style="margin:0;">
                            Envoyer par email à
                            <span style="font-size:11px;color:var(--text-muted,#9ca3af);
                                font-weight:400;">(optionnel)</span>
                        </label>
                        <button type="button" id="sc-add-email-btn"
                            onclick="window._scAddEmailField()"
                            style="display:inline-flex;align-items:center;gap:4px;
                                padding:3px 10px;border-radius:20px;
                                background:var(--bg-accent,#eff6ff);
                                color:var(--text-accent,#1565c0);
                                border:0.5px solid var(--border-accent,#93c5fd);
                                font-size:11px;font-weight:500;
                                font-family:inherit;cursor:pointer;">
                            + Ajouter un destinataire
                        </button>
                    </div>
                    <div id="sc-email-fields"
                        style="display:flex;flex-direction:column;gap:6px;">
                        <div class="sc-email-row"
                            style="display:flex;align-items:center;gap:6px;">
                            <input class="sc-pdf-email-input form-input" type="email"
                                placeholder="email@example.com"
                                value="${lastEmail}"
                                style="flex:1;"/>
                        </div>
                    </div>
                </div>

                <!-- Message supplémentaire -->
                <div>
                    <label class="form-label" style="margin-bottom:5px;">
                        Message
                        <span style="font-size:11px;color:var(--text-muted,#9ca3af);
                            font-weight:400;">(optionnel)</span>
                    </label>
                    <textarea id="sc-pdf-message"
                        placeholder="Ajoutez une note ou un commentaire à inclure dans l'email…"
                        rows="3"
                        style="width:100%;box-sizing:border-box;
                            border:1px solid var(--border-strong,#d1d5db);
                            border-radius:8px;padding:8px 10px;
                            font-size:12px;font-family:inherit;
                            color:var(--text-primary,#111827);
                            background:var(--surface-2,#fff);
                            resize:vertical;outline:none;
                            line-height:1.5;"
                        onfocus="this.style.borderColor='#1565c0'"
                        onblur="this.style.borderColor='var(--border-strong,#d1d5db)'"
                    ></textarea>
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
    // ── Email HTML optimisé pour clients mail (Outlook, Gmail) ──
    // ── Email body simple et professionnel (liste des styles) ──────
    function buildSimpleEmailBody(rows, customMsg) {
        const groups = {};
        const order  = [];
        rows.forEach(row => {
            const k = String(row["Cust Style Ref"]||"").trim();
            if (!groups[k]) { groups[k] = { rows: [] }; order.push(k); }
            groups[k].rows.push(row);
        });

        const today = new Date().toLocaleDateString("fr-FR",
            { weekday:"long", day:"2-digit", month:"long", year:"numeric" });
        const todayCap = today.charAt(0).toUpperCase() + today.slice(1);

        const fmtD = val => {
            if (!val) return "—";
            const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (m) {
                const d = new Date(+m[1], +m[2]-1, +m[3]);
                return d.toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" });
            }
            try { const d = new Date(val); if (!isNaN(d)) return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}); } catch(e){}
            return String(val);
        };

        const rowsHTML = order.map((key, i) => {
            const g       = groups[key];
            const detRow  = (window.state?.data?.details||[]).find(r => String(r["Cust Style Ref"]||"").trim() === key);
            const ctlRef  = String(detRow?.CTLStyleRef || detRow?.["CTL Style Ref"] || "—");
            const psd     = fmtD(detRow?.PSD);
            const inHouse = g.rows.filter(r => String(r.Status||"").toLowerCase()==="in house").length;
            const poSent  = g.rows.filter(r => String(r.Status||"").toLowerCase()==="po sent").length;
            const pending = g.rows.filter(r => String(r.Status||"").toLowerCase()==="pending").length;
            const waiting = g.rows.filter(r => String(r.Status||"").toLowerCase()==="waiting approval").length;
            const bg = i%2===0 ? "#ffffff" : "#f9fafb";

            const statusSummary = [
                inHouse > 0 ? `<span style="padding:1px 7px;border-radius:12px;font-size:10px;font-weight:600;background:#f0fdf4;color:#166534;border:1px solid #86efac;">${inHouse} In House</span>` : "",
                poSent  > 0 ? `<span style="padding:1px 7px;border-radius:12px;font-size:10px;font-weight:600;background:#eff6ff;color:#1e40af;border:1px solid #93c5fd;">${poSent} PO Sent</span>` : "",
                pending > 0 ? `<span style="padding:1px 7px;border-radius:12px;font-size:10px;font-weight:600;background:#fef9c3;color:#854d0e;border:1px solid #fde68a;">${pending} Pending</span>` : "",
                waiting > 0 ? `<span style="padding:1px 7px;border-radius:12px;font-size:10px;font-weight:600;background:#fff7ed;color:#9a3412;border:1px solid #fed7aa;">${waiting} Waiting</span>` : ""
            ].filter(Boolean).join(" ");

            return `<tr style="background:${bg};">
                <td style="padding:10px 14px;font-size:12px;font-weight:600;color:#0f172a;
                    border-bottom:1px solid #f0f0f0;">${key}</td>
                <td style="padding:10px 14px;font-size:11px;color:#475569;
                    border-bottom:1px solid #f0f0f0;">${ctlRef}</td>
                <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;">
                    ${statusSummary || `<span style="color:#d1d5db;font-size:11px;">${g.rows.length} composant${g.rows.length>1?"s":""}</span>`}
                </td>
                <td style="padding:10px 14px;font-size:12px;font-weight:600;color:#6d28d9;
                    border-bottom:1px solid #f0f0f0;white-space:nowrap;">${psd}</td>
            </tr>`;
        }).join("");

        return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"
    style="max-width:620px;margin:24px auto;background:#fff;
           border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

    <!-- Header -->
    <tr><td style="background:#0f172a;padding:18px 24px;">
        <table cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:12px;">
                <div style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);
                    border-radius:7px;padding:5px 12px;display:inline-block;
                    color:#fff;font-size:15px;font-weight:700;letter-spacing:.06em;">AW27</div>
            </td>
            <td>
                <div style="color:#fff;font-size:14px;font-weight:600;">Style Components — Order Status</div>
                <div style="color:rgba(255,255,255,.5);font-size:11px;margin-top:2px;">${todayCap}</div>
            </td>
            <td style="text-align:right;padding-left:20px;white-space:nowrap;">
                <div style="color:rgba(255,255,255,.6);font-size:11px;">
                    ${order.length} style${order.length>1?"s":""}<br>
                    ${rows.length} composant${rows.length>1?"s":""}
                </div>
            </td>
        </tr></table>
    </td></tr>

    ${customMsg ? `
    <tr><td style="padding:14px 24px 0;">
        <div style="padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;
            border-radius:8px;font-size:12px;color:#78350f;line-height:1.6;">
            <strong style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;
                color:#92400e;display:block;margin-bottom:4px;">Message</strong>
            ${customMsg.replace(String.fromCharCode(10),"<br>")}
        </div>
    </td></tr>` : ""}

    <!-- Table -->
    <tr><td style="padding:16px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0"
            style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
            <thead><tr style="background:#f1f5f9;">
                <th style="padding:9px 14px;text-align:left;font-size:10px;font-weight:600;
                    color:#64748b;text-transform:uppercase;letter-spacing:.07em;
                    border-bottom:1.5px solid #e2e8f0;">Style</th>
                <th style="padding:9px 14px;text-align:left;font-size:10px;font-weight:600;
                    color:#64748b;text-transform:uppercase;letter-spacing:.07em;
                    border-bottom:1.5px solid #e2e8f0;">CTL Ref</th>
                <th style="padding:9px 14px;text-align:left;font-size:10px;font-weight:600;
                    color:#64748b;text-transform:uppercase;letter-spacing:.07em;
                    border-bottom:1.5px solid #e2e8f0;">Composants</th>
                <th style="padding:9px 14px;text-align:left;font-size:10px;font-weight:600;
                    color:#64748b;text-transform:uppercase;letter-spacing:.07em;
                    border-bottom:1.5px solid #e2e8f0;">PSD</th>
            </tr></thead>
            <tbody>${rowsHTML}</tbody>
        </table>
        <p style="text-align:center;font-size:10.5px;color:#94a3b8;margin-top:12px;">
            Le rapport détaillé est joint en pièce jointe (PDF).
        </p>
    </td></tr>

    <!-- Footer -->
    <tr><td style="padding:12px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;
        text-align:center;font-size:10px;color:#94a3b8;">
        <strong style="color:#1e3a5f;">AW27 Checkers</strong> — Style Components Report — ${todayCap}
    </td></tr>

</table>
</body></html>`;
    }

    function buildStyleCompEmailHTML(rows, customMsg) {
        const groups = {};
        const order  = [];
        rows.forEach(row => {
            const custRef = String(row["Cust Style Ref"] || "").trim();
            const ctlRef  = String(row["CTL Style Ref"]  || "").trim();
            const key     = custRef || "(sans référence)";
            if (!groups[key]) { groups[key] = { custRef, ctlRef, rows: [] }; order.push(key); }
            groups[key].rows.push(row);
        });

        const today = new Date().toLocaleDateString("fr-FR", {
            weekday:"long", day:"2-digit", month:"long", year:"numeric"
        });
        const todayCap = today.charAt(0).toUpperCase() + today.slice(1);

        const statusLabel = s => {
            const v = String(s||"").trim().toLowerCase();
            if (v === "in house")         return {label:"In House",     bg:"#f0fdf4",color:"#166534",border:"#86efac"};
            if (v === "po sent")          return {label:"PO Sent",      bg:"#eff6ff",color:"#1e40af",border:"#93c5fd"};
            if (v === "pending")          return {label:"Pending",      bg:"#fef9c3",color:"#854d0e",border:"#fde68a"};
            if (v === "waiting approval") return {label:"Waiting Appr.",bg:"#fff7ed",color:"#9a3412",border:"#fed7aa"};
            if (v === "approved")         return {label:"Approved",     bg:"#f0fdf4",color:"#166534",border:"#86efac"};
            if (v === "rejected")         return {label:"Rejected",     bg:"#fef2f2",color:"#991b1b",border:"#fca5a5"};
            return {label: s||"—", bg:"#f9fafb",color:"#6b7280",border:"#e5e7eb"};
        };

        const fmtD = val => {
            if (!val) return "—";
            const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (m) { const d = new Date(+m[1], +m[2]-1, +m[3]); return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}); }
            try { const d = new Date(val); if (!isNaN(d)) return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}); } catch(e){}
            return String(val);
        };

        const getDetailRow = c => (window.state?.data?.details||[]).find(r => String(r["Cust Style Ref"]||"").trim()===c)||null;

        const sectionsHTML = order.map(key => {
            const g       = groups[key];
            const det     = getDetailRow(g.custRef);
            const imgUrl  = det?._imageUrl || "";
            const price   = det?.["Approved Price $"] ? `$${det["Approved Price $"]}` : "";
            const qty     = det?.["Conf Total"] ? `${det["Conf Total"]} u.` : "";
            const vsl     = fmtD(det?.["Initial Vsl Date"]);
            const psdRaw  = String(det?.PSD||"").trim();
            const psd     = psdRaw ? fmtD(psdRaw) || psdRaw : "";

            const compRows = g.rows.map((r,i) => {
                const sc  = statusLabel(r.Status);
                const det2 = String(r.Details||"").trim().split(String.fromCharCode(10)).join("<br>");
                const bg  = i%2===0?"#ffffff":"#f9fafb";
                return `<tr style="background:${bg};">
                    <td style="padding:9px 14px;font-size:13px;font-weight:600;
                        color:#111827;border-bottom:1px solid #f0f0f0;width:28%;">
                        ${r.Composant||"—"}
                    </td>
                    <td style="padding:9px 14px;border-bottom:1px solid #f0f0f0;width:18%;">
                        <span style="display:inline-block;padding:3px 10px;border-radius:20px;
                            font-size:11px;font-weight:600;
                            background:${sc.bg};color:${sc.color};border:1px solid ${sc.border};">
                            ${sc.label}
                        </span>
                    </td>
                    <td style="padding:9px 14px;font-size:12px;color:#475569;
                        border-bottom:1px solid #f0f0f0;line-height:1.5;">
                        ${det2||"—"}
                    </td>
                </tr>`;
            }).join("");

            const inHouse = g.rows.filter(r=>String(r.Status||"").toLowerCase()==="in house").length;
            const pending = g.rows.filter(r=>String(r.Status||"").toLowerCase()==="pending").length;
            const waiting = g.rows.filter(r=>String(r.Status||"").toLowerCase()==="waiting approval").length;

            return `
            <table width="100%" cellpadding="0" cellspacing="0"
                style="border-collapse:collapse;border:1px solid #e2e8f0;
                       border-radius:10px;overflow:hidden;margin-bottom:20px;">

                <!-- Style header -->
                <tr>
                    <td style="background:#0f172a;padding:12px 16px;" colspan="2">
                        <table cellpadding="0" cellspacing="0"><tr>
                            ${imgUrl ? `<td style="padding-right:14px;vertical-align:middle;">
                                <img src="${imgUrl}" width="60" height="60"
                                    style="border-radius:6px;object-fit:cover;display:block;"/>
                            </td>` : ""}
                            <td style="vertical-align:middle;">
                                <div style="font-size:15px;font-weight:700;
                                    color:#ffffff;letter-spacing:.01em;">
                                    ${g.custRef}
                                </div>
                                <div style="font-size:10px;color:rgba(255,255,255,.5);
                                    margin-top:2px;">
                                    CTL : ${g.ctlRef||"—"}
                                </div>
                            </td>
                        </tr></table>
                    </td>
                </tr>

                <!-- Métriques -->
                ${(price||qty||vsl||psd) ? `
                <tr>
                    <td colspan="2" style="background:#f8fafc;padding:10px 16px;
                        border-bottom:1px solid #e2e8f0;">
                        <!-- Rangée 1 : commande -->
                        <table cellpadding="0" cellspacing="0" style="margin-bottom:8px;"><tr>
                            ${price ? `<td style="padding-right:20px;">
                                <div style="font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;">Prix approuvé</div>
                                <div style="font-size:14px;font-weight:700;color:#166534;margin-top:2px;">${price}</div>
                            </td>` : ""}
                            ${qty ? `<td style="padding-right:20px;">
                                <div style="font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;">Conf Total</div>
                                <div style="font-size:14px;font-weight:700;color:#0f172a;margin-top:2px;">${qty}</div>
                            </td>` : ""}
                            ${vsl ? `<td style="padding-right:20px;">
                                <div style="font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;">Initial VSL</div>
                                <div style="font-size:14px;font-weight:700;color:#1e40af;margin-top:2px;">${vsl}</div>
                            </td>` : ""}
                            ${psd ? `<td>
                                <div style="font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;">PSD</div>
                                <div style="font-size:14px;font-weight:700;color:#6d28d9;margin-top:2px;">${psd}</div>
                            </td>` : ""}
                        </tr></table>
                    </td>
                </tr>` : ""}

                <!-- Status résumé -->
                <tr>
                    <td colspan="2" style="padding:8px 16px;border-bottom:1px solid #e2e8f0;
                        background:#fff;">
                        <span style="font-size:11px;color:#64748b;margin-right:8px;">
                            ${g.rows.length} composant${g.rows.length>1?"s":""}
                        </span>
                        ${inHouse>0?`<span style="display:inline-block;padding:2px 8px;border-radius:20px;
                            font-size:10px;font-weight:600;background:#f0fdf4;color:#166534;
                            border:1px solid #86efac;margin-right:4px;">
                            ✓ ${inHouse} In House</span>`:""}
                        ${pending>0?`<span style="display:inline-block;padding:2px 8px;border-radius:20px;
                            font-size:10px;font-weight:600;background:#fef9c3;color:#854d0e;
                            border:1px solid #fde68a;margin-right:4px;">
                            ${pending} Pending</span>`:""}
                        ${waiting>0?`<span style="display:inline-block;padding:2px 8px;border-radius:20px;
                            font-size:10px;font-weight:600;background:#fff7ed;color:#9a3412;
                            border:1px solid #fed7aa;">
                            ${waiting} Waiting</span>`:""}
                    </td>
                </tr>

                <!-- En-têtes tableau -->
                <tr style="background:#f1f5f9;">
                    <td style="padding:7px 14px;font-size:9px;text-transform:uppercase;
                        letter-spacing:.08em;font-weight:700;color:#64748b;width:28%;">
                        Composant
                    </td>
                    <td style="padding:7px 14px;font-size:9px;text-transform:uppercase;
                        letter-spacing:.08em;font-weight:700;color:#64748b;width:18%;">
                        Status
                    </td>
                    <td style="padding:7px 14px;font-size:9px;text-transform:uppercase;
                        letter-spacing:.08em;font-weight:700;color:#64748b;">
                        Details
                    </td>
                </tr>

                ${compRows}

            </table>`;
        }).join("");

        const total    = rows.length;
        const nStyles  = order.length;

        return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0"
    style="max-width:700px;margin:24px auto;background:#fff;
           border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">

    <!-- HEADER -->
    <tr>
        <td style="background:linear-gradient(135deg,#0f172a,#1e3a5f);padding:20px 24px;">
            <table cellpadding="0" cellspacing="0"><tr>
                <td style="padding-right:14px;">
                    <div style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);
                        border-radius:8px;padding:6px 14px;display:inline-block;">
                        <span style="color:#fff;font-size:17px;font-weight:700;
                            letter-spacing:.07em;">AW27</span>
                    </div>
                </td>
                <td>
                    <div style="color:#fff;font-size:15px;font-weight:600;">
                        Style Components Report</div>
                    <div style="color:rgba(255,255,255,.55);font-size:11px;margin-top:2px;">
                        ${todayCap}</div>
                </td>
                <td style="text-align:right;padding-left:20px;">
                    <div style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);
                        border-radius:20px;padding:4px 12px;display:inline-block;
                        color:#fff;font-size:10px;text-align:center;margin-bottom:5px;">
                        <strong style="font-size:14px;font-weight:700;display:block;">
                            ${nStyles}</strong>styles</div>
                    &nbsp;
                    <div style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);
                        border-radius:20px;padding:4px 12px;display:inline-block;
                        color:#fff;font-size:10px;text-align:center;">
                        <strong style="font-size:14px;font-weight:700;display:block;">
                            ${total}</strong>composants</div>
                </td>
            </tr></table>
        </td>
    </tr>

    <!-- MESSAGE PERSONNALISÉ -->
    ${customMsg ? `
    <tr>
        <td style="padding:14px 24px 0;">
            <div style="padding:12px 16px;background:#fffbeb;
                border:1px solid #fde68a;border-radius:8px;
                font-size:13px;color:#78350f;line-height:1.6;">
                <div style="font-size:9.5px;font-weight:600;color:#92400e;
                    text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px;">
                    Message
                </div>
                ${customMsg.replace(/\n/g,"<br>")}
            </div>
        </td>
    </tr>` : ""}

    <!-- BODY -->
    <tr>
        <td style="padding:20px 24px;">
            ${sectionsHTML}
        </td>
    </tr>

    <!-- FOOTER -->
    <tr>
        <td style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;
            text-align:center;font-size:10.5px;color:#94a3b8;">
            Rapport généré par <strong style="color:#1e3a5f;">AW27 Checkers</strong>
            — ${todayCap}<br>
            <span style="color:#cbd5e1;">Le fichier PDF est joint à cet email.</span>
        </td>
    </tr>

</table>
</body>
</html>`;
    }

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
            if (v === "in house")         return { bg:"#f0fdf4",color:"#166534",border:"#86efac",dot:"#16a34a" };
            if (v === "po sent")          return { bg:"#eff6ff",color:"#1e40af",border:"#93c5fd",dot:"#2563eb" };
            if (v === "pending")          return { bg:"#fef9c3",color:"#854d0e",border:"#fde68a",dot:"#d97706" };
            if (v === "waiting approval") return { bg:"#fff7ed",color:"#9a3412",border:"#fed7aa",dot:"#ea580c" };
            // anciens statuts conservés pour compatibilité
            if (v === "approved")  return { bg:"#f0fdf4",color:"#166534",border:"#86efac",dot:"#16a34a" };
            if (v === "rejected")  return { bg:"#fef2f2",color:"#991b1b",border:"#fca5a5",dot:"#dc2626" };
            if (v === "on going")  return { bg:"#eff6ff",color:"#1e40af",border:"#93c5fd",dot:"#2563eb" };
            return { bg:"#f9fafb",color:"#6b7280",border:"#e5e7eb",dot:"#9ca3af" };
        };

        // Lookup image + infos depuis state.data.details par Cust Style Ref
        const getDetailRow = (custRef) =>
            (window.state?.data?.details || []).find(r =>
                String(r["Cust Style Ref"] || "").trim() === custRef
            ) || null;

        const getStyleImage = (custRef) => getDetailRow(custRef)?._imageUrl || "";

        const fmtD = val => {
            if (!val) return "";
            try {
                return new Date(val).toLocaleDateString("fr-FR", {
                    day: "2-digit", month: "short", year: "numeric"
                });
            } catch(e) { return String(val); }
        };

        const sectionsHTML = order.map(key => {
            const group     = groups[key];
            const imgUrl    = getStyleImage(group.custRef);
            const detRow    = getDetailRow(group.custRef);
            const appPrice  = detRow?.["Approved Price $"] ? `$${detRow["Approved Price $"]}` : "";
            const confTotal = detRow?.["Conf Total"] ? String(detRow["Conf Total"]) : "";
            const vslDate   = fmtD(detRow?.["Initial Vsl Date"]);
            // Formater PSD comme les autres dates (DD/MM/YYYY → "28 août 2026")
            const _psdRaw  = String(detRow?.["PSD"] || "").trim();
            const psdDate  = (() => {
                if (!_psdRaw) return "";
                // "All OK - ..." → garder tel quel
                if (_psdRaw.toLowerCase().startsWith("all ok")) return _psdRaw;
                // DD/MM/YYYY → Date → format fr-FR
                const m = _psdRaw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                if (m) {
                    const d = new Date(+m[3], +m[2]-1, +m[1]);
                    if (!isNaN(d)) return d.toLocaleDateString("fr-FR", {
                        day: "2-digit", month: "short", year: "numeric"
                    });
                }
                return fmtD(_psdRaw); // fallback
            })();

            // Commitments depuis Details
            const fmtCommit = val => {
                const s = String(val||"").trim();
                if (!s) return "";
                if (s.toLowerCase().replace(/\s/g,"") === "inhouse") return "In House ✓";
                return fmtD(s) || s;
            };
            const srsDate     = fmtCommit(detRow?.SRS_Launching);
            const sewingDate  = fmtCommit(detRow?.Sewing_Trims);
            const packingDate = fmtCommit(detRow?.Packing_Trims);
            const approved = group.rows.filter(r => String(r.Status||"").toLowerCase() === "approved").length;
            const rejected = group.rows.filter(r => String(r.Status||"").toLowerCase() === "rejected").length;
            const ongoing  = group.rows.filter(r => String(r.Status||"").toLowerCase() === "on going").length;
            const total    = group.rows.length;

            const rowsHTML = group.rows.map((r, i) => {
                const sc  = statusCfg(r.Status);
                const det = String(r.Details || "").trim().split(String.fromCharCode(10)).join("<br>");
                return `
                <tr>
                    <td><span class="comp-name">${r.Composant || "—"}</span></td>
                    <td>
                        ${r.Status
                            ? `<span class="status-badge"
                                style="background:${sc.bg};color:${sc.color};border:0.5px solid ${sc.border};">
                                <span class="badge-dot-status" style="background:${sc.dot};"></span>
                                ${r.Status}
                              </span>`
                            : '<span style="color:#cbd5e1;">—</span>'}
                    </td>
                    <td class="comp-detail">${det || '<span style="color:#cbd5e1;">—</span>'}</td>
                </tr>`;
            }).join("");

            return `
            <div class="style-card no-break">

                <!-- ── Card Header ── -->
                <div class="card-header">

                    <!-- Image -->
                    <div class="card-image">
                        ${imgUrl
                            ? `<img src="${imgUrl}" alt="${group.custRef}"/>`
                            : `<div class="card-image-placeholder">📷</div>`
                        }
                    </div>

                    <!-- Info -->
                    <div class="card-info">
                        <div class="card-name">${group.custRef || "—"}</div>
                        <div class="card-ctl">CTL Ref : <span>${group.ctlRef || "—"}</span></div>

                        <!-- Métriques : 2 blocs côte à côte -->
                        ${(appPrice || confTotal || vslDate || psdDate || srsDate || sewingDate || packingDate) ? `
                        <div style="display:flex;gap:6px;margin-bottom:7px;">

                            <div style="flex:1;background:#f8fafc;border:0.5px solid #e2e8f0;border-radius:7px;padding:6px 9px;">
                                <div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;font-weight:600;margin-bottom:4px;">Commande</div>
                                <div style="display:flex;gap:10px;">
                                    ${appPrice ? `<div>
                                        <div style="font-size:7px;text-transform:uppercase;color:#94a3b8;">Prix appr.</div>
                                        <div style="font-size:11px;font-weight:600;color:#166534;">${appPrice}</div>
                                    </div>` : ""}
                                    ${confTotal ? `<div>
                                        <div style="font-size:7px;text-transform:uppercase;color:#94a3b8;">Conf Total</div>
                                        <div style="font-size:11px;font-weight:600;color:#0f172a;">${confTotal} u.</div>
                                    </div>` : ""}
                                    ${vslDate ? `<div>
                                        <div style="font-size:7px;text-transform:uppercase;color:#94a3b8;">Initial VSL</div>
                                        <div style="font-size:11px;font-weight:600;color:#1e40af;">${vslDate}</div>
                                    </div>` : ""}
                                </div>
                            </div>

                            <div style="flex:1.4;background:#fff7ed;border:0.5px solid #fed7aa;border-radius:7px;padding:6px 9px;">
                                <div style="font-size:7.5px;text-transform:uppercase;letter-spacing:.06em;color:#9a3412;font-weight:600;margin-bottom:4px;">Commitments</div>
                                <div style="display:flex;gap:8px;">
                                    ${psdDate ? `<div>
                                        <div style="font-size:7px;text-transform:uppercase;color:#c2410c;opacity:.8;">PSD</div>
                                        <div style="font-size:11px;font-weight:600;color:#9a3412;">${String(psdDate).split(" ").slice(0,2).join(" ")}</div>
                                    </div>` : ""}
                                    ${srsDate ? `<div>
                                        <div style="font-size:7px;text-transform:uppercase;color:#c2410c;opacity:.8;">SRS</div>
                                        <div style="font-size:11px;font-weight:600;color:#9a3412;">${String(srsDate).split(" ").slice(0,2).join(" ")}</div>
                                    </div>` : ""}
                                    ${sewingDate ? `<div>
                                        <div style="font-size:7px;text-transform:uppercase;color:#c2410c;opacity:.8;">Sewing</div>
                                        <div style="font-size:11px;font-weight:600;color:#9a3412;">${String(sewingDate).split(" ").slice(0,2).join(" ")}</div>
                                    </div>` : ""}
                                    ${packingDate ? `<div>
                                        <div style="font-size:7px;text-transform:uppercase;color:#c2410c;opacity:.8;">Packing</div>
                                        <div style="font-size:11px;font-weight:600;color:#9a3412;">${String(packingDate).split(" ").slice(0,2).join(" ")}</div>
                                    </div>` : ""}
                                </div>
                            </div>
                        </div>
                        ` : ""}

                        <!-- Status badges -->
                        <div class="badges">
                            <span class="badge" style="background:#f1f5f9;color:#64748b;
                                border:0.5px solid #cbd5e1;">
                                ${total} composant${total > 1 ? "s" : ""}
                            </span>
                            ${group.rows.filter(r => String(r.Status||"").toLowerCase() === "in house").length > 0 ? `
                            <span class="badge" style="background:#f0fdf4;color:#166534;border:0.5px solid #86efac;">
                                <span class="badge-dot" style="background:#16a34a;"></span>
                                ${group.rows.filter(r => String(r.Status||"").toLowerCase() === "in house").length} In House
                            </span>` : ""}
                            ${group.rows.filter(r => String(r.Status||"").toLowerCase() === "po sent").length > 0 ? `
                            <span class="badge" style="background:#eff6ff;color:#1e40af;border:0.5px solid #93c5fd;">
                                <span class="badge-dot" style="background:#2563eb;"></span>
                                ${group.rows.filter(r => String(r.Status||"").toLowerCase() === "po sent").length} PO Sent
                            </span>` : ""}
                            ${group.rows.filter(r => String(r.Status||"").toLowerCase() === "waiting approval").length > 0 ? `
                            <span class="badge" style="background:#fff7ed;color:#9a3412;border:0.5px solid #fed7aa;">
                                <span class="badge-dot" style="background:#ea580c;"></span>
                                ${group.rows.filter(r => String(r.Status||"").toLowerCase() === "waiting approval").length} Waiting
                            </span>` : ""}
                            ${group.rows.filter(r => String(r.Status||"").toLowerCase() === "pending").length > 0 ? `
                            <span class="badge" style="background:#fef9c3;color:#854d0e;border:0.5px solid #fde68a;">
                                <span class="badge-dot" style="background:#d97706;"></span>
                                ${group.rows.filter(r => String(r.Status||"").toLowerCase() === "pending").length} Pending
                            </span>` : ""}
                        </div>
                    </div>
                </div>

                <!-- ── Components Table ── -->
                <table class="comp-table">
                    <thead>
                        <tr>
                            <th style="width:26%;">Composant</th>
                            <th style="width:17%;">Status</th>
                            <th style="width:57%;">Details</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHTML}</tbody>
                </table>
            </div>`;
        }).join("");

        // Statistiques globales pour le header
        const totalInHouse  = rows.filter(r => String(r.Status||"").toLowerCase() === "in house").length;
        const totalPOSent   = rows.filter(r => String(r.Status||"").toLowerCase() === "po sent").length;
        const totalPending  = rows.filter(r => String(r.Status||"").toLowerCase() === "pending").length;
        const totalWaiting  = rows.filter(r => String(r.Status||"").toLowerCase() === "waiting approval").length;
        const totalNoStatus = rows.filter(r => !String(r.Status||"").trim()).length;

        return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>AW27 — Style Components Report</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    background: #fff;
    color: #0f172a;
    font-size: 11px;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @media print {
    @page { margin: 10mm 8mm; size: A4; }
    .page-break { page-break-before: always; }
    .no-break { page-break-inside: avoid; }
    /* N&B : remplacer toutes les couleurs par noir/blanc/gris */
    .doc-header { background: #000 !important; }
    .summary-bar { background: #f0f0f0 !important; border-color: #ccc !important; }
    .summary-item { background: #fff !important; color: #000 !important;
                    border: 1.5px solid #000 !important; }
    .summary-dot  { background: #000 !important; }
    .card-image   { background: #f0f0f0 !important; }
    .metrics-strip { background: #f5f5f5 !important; border-color: #ccc !important; }
    .metric-item  { border-color: #ccc !important; }
    .metric-value { color: #000 !important; }
    .metric-label { color: #666 !important; }
    .badges .badge { background: #fff !important; color: #000 !important;
                     border: 1.5px solid #000 !important; }
    .badge-dot    { display: none !important; }
    .comp-table thead tr { background: #e0e0e0 !important; }
    .comp-table tr:nth-child(even) td { background: #f8f8f8 !important; }
    .comp-table td, .comp-table th { border-color: #ccc !important; }
    .status-badge { background: #fff !important; color: #000 !important;
                    border: 1.5px solid #000 !important; }
    .badge-dot-status { display: none !important; }
    .card-name    { color: #000 !important; }
    .comp-name    { color: #000 !important; }
    .comp-detail  { color: #333 !important; }
    .card-ctl span { color: #000 !important; }
    a { color: #000 !important; }
  }

  /* ── HEADER ─────────────────────── */
  .doc-header {
    background: #0f172a;
    padding: 20px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0;
  }
  .doc-logo { display: flex; align-items: center; gap: 14px; }
  .logo-badge {
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.25);
    border-radius: 8px;
    padding: 6px 14px;
    font-size: 17px;
    font-weight: 800;
    color: #fff;
    letter-spacing: .08em;
  }
  .doc-title { color: #fff; }
  .doc-title h1 { font-size: 16px; font-weight: 700; }
  .doc-title p  { font-size: 11px; color: rgba(255,255,255,.5); margin-top: 2px; }
  .doc-stats    { display: flex; gap: 10px; }
  .stat-pill {
    background: rgba(255,255,255,.1);
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 20px;
    padding: 4px 12px;
    text-align: center;
    color: #fff;
    font-size: 10px;
  }
  .stat-pill strong { font-size: 14px; font-weight: 700; display: block; }

  /* ── SUMMARY BAR ─────────────────── */
  .summary-bar {
    display: flex; gap: 8px; flex-wrap: wrap;
    padding: 10px 28px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 20px;
  }
  .summary-item {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 10.5px;
    font-weight: 600;
  }
  .summary-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

  /* ── STYLE CARD ──────────────────── */
  .style-card {
    margin: 0 28px 18px;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #cbd5e1;
  }
  .card-header {
    display: flex;
    border-bottom: 1px solid #e2e8f0;
    background: #fff;
  }
  .card-image {
    width: 96px; flex-shrink: 0;
    background: #f1f5f9;
    border-right: 1px solid #e2e8f0;
    display: flex; align-items: center; justify-content: center; padding: 10px;
  }
  .card-image img { width: 74px; height: 74px; object-fit: cover; border-radius: 6px; }
  .card-image-placeholder {
    width: 74px; height: 74px;
    background: #e2e8f0; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; color: #94a3b8;
  }
  .card-info { flex: 1; padding: 12px 16px; }
  .card-name { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
  .card-ctl  { font-size: 10px; color: #64748b; margin-bottom: 9px; }
  .card-ctl span { color: #1e3a5f; font-weight: 600; }

  .metrics-strip {
    display: flex;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 7px;
    overflow: hidden;
    margin-bottom: 9px;
  }
  .metric-item { flex: 1; padding: 6px 10px; border-right: 1px solid #e2e8f0; }
  .metric-item:last-child { border-right: none; }
  .metric-label { font-size: 8px; text-transform: uppercase; letter-spacing: .07em; color: #94a3b8; margin-bottom: 1px; }
  .metric-value { font-size: 12px; font-weight: 700; }

  .badges { display: flex; gap: 5px; flex-wrap: wrap; }
  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 20px;
    font-size: 9.5px; font-weight: 600;
  }
  .badge-dot { width: 5px; height: 5px; border-radius: 50%; }

  /* ── TABLE ───────────────────────── */
  .comp-table { width: 100%; border-collapse: collapse; }
  .comp-table thead tr { background: #f1f5f9; border-bottom: 1.5px solid #cbd5e1; }
  .comp-table th {
    padding: 7px 14px; text-align: left;
    font-size: 9px; text-transform: uppercase;
    letter-spacing: .08em; font-weight: 700; color: #64748b;
  }
  .comp-table td { padding: 7px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: top; font-size: 11px; }
  .comp-table tr:last-child td { border-bottom: none; }
  .comp-table tr:nth-child(even) td { background: #fafbfc; }
  .comp-name   { font-weight: 600; color: #0f172a; }
  .comp-detail { color: #475569; line-height: 1.5; }
  .status-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 20px;
    font-size: 9.5px; font-weight: 600; white-space: nowrap;
  }
  .badge-dot-status { width: 4px; height: 4px; border-radius: 50%; }

  /* ── FOOTER ──────────────────────── */
  .doc-footer {
    margin: 20px 28px 0;
    padding: 10px 0;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    font-size: 9.5px; color: #94a3b8;
  }
  .footer-brand { font-weight: 600; color: #1e3a5f; }
</style>
</head>
<body>

<!-- ══ HEADER ══════════════════════════════════════════════════ -->
<div class="doc-header">
    <div class="doc-logo">
        <div class="logo-badge">AW27</div>
        <div class="doc-title">
            <h1>Style Components</h1>
            <p>${todayFR}</p>
        </div>
    </div>
    <div class="doc-stats">
        <div class="stat-pill">
            <strong>${order.length}</strong>styles
        </div>
        <div class="stat-pill">
            <strong>${rows.length}</strong>composants
        </div>
    </div>
</div>

<!-- ══ SUMMARY BAR ═════════════════════════════════════════════ -->
<div class="summary-bar">
    ${totalInHouse > 0 ? `
    <div class="summary-item" style="background:#f0fdf4;color:#166534;border:0.5px solid #86efac;">
        <span class="summary-dot" style="background:#16a34a;"></span>
        ${totalInHouse} In House
    </div>` : ""}
    ${totalPOSent > 0 ? `
    <div class="summary-item" style="background:#eff6ff;color:#1e40af;border:0.5px solid #93c5fd;">
        <span class="summary-dot" style="background:#2563eb;"></span>
        ${totalPOSent} PO Sent
    </div>` : ""}
    ${totalWaiting > 0 ? `
    <div class="summary-item" style="background:#fff7ed;color:#9a3412;border:0.5px solid #fed7aa;">
        <span class="summary-dot" style="background:#ea580c;"></span>
        ${totalWaiting} Waiting Approval
    </div>` : ""}
    ${totalPending > 0 ? `
    <div class="summary-item" style="background:#fef9c3;color:#854d0e;border:0.5px solid #fde68a;">
        <span class="summary-dot" style="background:#d97706;"></span>
        ${totalPending} Pending
    </div>` : ""}
    ${totalNoStatus > 0 ? `
    <div class="summary-item" style="background:#f9fafb;color:#6b7280;border:0.5px solid #e5e7eb;">
        <span class="summary-dot" style="background:#9ca3af;"></span>
        ${totalNoStatus} Sans statut
    </div>` : ""}
</div>

<!-- ══ STYLE CARDS ══════════════════════════════════════════════ -->
${sectionsHTML}

<!-- ══ FOOTER ══════════════════════════════════════════════════ -->
<div class="doc-footer">
    <span><span class="footer-brand">AW27 Checkers</span> — Style Components Report</span>
    <span>${todayFR}</span>
</div>

</body>
</html>`;
    }

    // ── Mettre à jour le subtitle selon la sélection ────────────
    window._scUpdatePDFSubtitle = function() {
        const styleChecked  = document.querySelectorAll(".sc-style-check:checked");
        const statusChecked = document.querySelectorAll(".sc-status-check:checked");
        const sub = document.getElementById("sc-pdf-subtitle");
        if (!sub) return;

        const rows = window.state?.data?.[SHEET_KEY] || [];
        const selectedStyles   = new Set([...styleChecked].map(c => c.dataset.style));
        const selectedStatuses = new Set([...statusChecked].map(c => c.dataset.status));

        const filteredRows = rows.filter(r => {
            const styleRaw  = String(r["Cust Style Ref"] || "").trim();
            const statusRaw = String(r.Status || "").trim();
            const statusKey = statusRaw === "" ? "__empty__" : statusRaw;
            return selectedStyles.has(styleRaw) && selectedStatuses.has(statusKey);
        });

        const styleCount = new Set(filteredRows.map(r =>
            String(r["Cust Style Ref"] || "").trim())).size;

        sub.textContent = `${styleCount} style${styleCount > 1 ? "s" : ""} · ${filteredRows.length} composant${filteredRows.length > 1 ? "s" : ""}`;
    };

    // Écouter les changements de checkboxes styles ET statuts
    document.addEventListener("change", e => {
        if (e.target.classList.contains("sc-style-check") ||
            e.target.classList.contains("sc-status-check")) {
            window._scUpdatePDFSubtitle();
        }
    });

    // ── Ajouter un champ email supplémentaire ────────────────
    // Exposer openPDFModal pour le menu Actions
    window._scOpenPDFModal = function() { openPDFModal(); };

    window._scAddEmailField = function() {
        const container = document.getElementById("sc-email-fields");
        if (!container) return;

        const row = document.createElement("div");
        row.className = "sc-email-row";
        row.style.cssText = "display:flex;align-items:center;gap:6px;";
        row.innerHTML = `
            <input class="sc-pdf-email-input form-input" type="email"
                placeholder="email@example.com"
                style="flex:1;"/>
            <button type="button"
                onclick="this.closest('.sc-email-row').remove()"
                style="display:flex;align-items:center;justify-content:center;
                    width:26px;height:26px;border-radius:50%;flex-shrink:0;
                    background:var(--surface-2,#f3f4f6);
                    border:0.5px solid var(--border-strong,#d1d5db);
                    color:var(--text-muted,#9ca3af);cursor:pointer;
                    font-size:14px;font-family:inherit;">
                ✕
            </button>`;
        container.appendChild(row);
        row.querySelector("input")?.focus();
    };

    // ── Générer le PDF directement via jsPDF (sans HTML rendering) ──
    async function _scGeneratePDFBase64(rows) {
        if (!window.jspdf) {
            await new Promise((res, rej) => {
                const s = document.createElement("script");
                s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
                s.onload = res; s.onerror = rej;
                document.head.appendChild(s);
            });
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ format:"a4", unit:"mm" });
        const W = 210, MARGIN = 12;
        const CW = W - MARGIN * 2;
        let y = 0;

        const today = new Date().toLocaleDateString("fr-FR",
            { day:"2-digit", month:"long", year:"numeric" });

        const fmtD = val => {
            if (!val) return "—";
            const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (m) { const d = new Date(+m[1],+m[2]-1,+m[3]);
                return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}); }
            return String(val);
        };

        // Helpers
        const addPage = () => { doc.addPage(); y = 0; };
        const checkPage = (need=20) => { if (y + need > 280) addPage(); };

        const hexToRGB = h => {
            const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16),
                  b = parseInt(h.slice(5,7),16);
            return [r,g,b];
        };
        const setFill = hex => { const [r,g,b] = hexToRGB(hex); doc.setFillColor(r,g,b); };
        const setTxt  = hex => { const [r,g,b] = hexToRGB(hex); doc.setTextColor(r,g,b); };

        // Grouper les rows par style (AVANT le header)
        const groups2 = {};
        const order2  = [];
        rows.forEach(r => {
            const k = String(r["Cust Style Ref"]||"").trim();
            if (!groups2[k]) { groups2[k] = { rows:[] }; order2.push(k); }
            groups2[k].rows.push(r);
        });

        // ── HEADER PAGE ────────────────────────────────────────
        setFill("#0f172a"); doc.rect(0, 0, W, 28, "F");
        setTxt("#ffffff");
        doc.setFontSize(9); doc.setFont("helvetica","normal");
        doc.text("AW27", MARGIN + 2, 11);
        doc.setFontSize(14); doc.setFont("helvetica","bold");
        doc.text("Style Components — Order Status", MARGIN + 14, 11);
        doc.setFontSize(9); doc.setFont("helvetica","normal");
        doc.text(today, MARGIN + 14, 18);
        doc.text(`${order2.length} styles · ${rows.length} composants`,
            W - MARGIN, 14, { align:"right" });

        y = 34;

        // ── STYLES ─────────────────────────────────────────────
        order2.forEach(key => {
            const g      = groups2[key];
            const detRow = (window.state?.data?.details||[])
                .find(r => String(r["Cust Style Ref"]||"").trim() === key);
            const ctlRef = String(detRow?.CTLStyleRef || detRow?.["CTL Style Ref"] || "—");
            const price  = detRow?.["Approved Price $"] ? `$${detRow["Approved Price $"]}` : "—";
            const qty    = detRow?.["Conf Total"] ? `${detRow["Conf Total"]} u.` : "—";
            const vsl    = fmtD(detRow?.["Initial Vsl Date"]);
            const psd    = fmtD(detRow?.PSD);
            const srs    = fmtD(detRow?.SRS_Launching);
            const sew    = fmtD(detRow?.Sewing_Trims);
            const pack   = fmtD(detRow?.Packing_Trims);

            checkPage(60);

            // Style header bar
            setFill("#1e3a5f");
            doc.rect(MARGIN, y, CW, 9, "F");
            setTxt("#ffffff");
            doc.setFontSize(10); doc.setFont("helvetica","bold");
            doc.text(key, MARGIN + 3, y + 6.2);
            doc.setFontSize(8); doc.setFont("helvetica","normal");
            doc.text(`CTL: ${ctlRef}`, W - MARGIN - 3, y + 6.2, { align:"right" });
            y += 9;

            // Commande strip
            setFill("#f8fafc");
            doc.rect(MARGIN, y, CW * 0.4, 12, "F");
            doc.setDrawColor(226,232,240);
            doc.rect(MARGIN, y, CW * 0.4, 12);
            setTxt("#94a3b8");
            doc.setFontSize(6.5); doc.setFont("helvetica","bold");
            doc.text("COMMANDE", MARGIN + 2, y + 4);
            setTxt("#0f172a");
            doc.setFontSize(7.5); doc.setFont("helvetica","normal");
            [[price,"#166534"],[qty,"#0f172a"],[vsl,"#1e40af"]].forEach(([v,c], i) => {
                const labels = ["Prix appr.","Conf Total","Initial VSL"];
                const xBase = MARGIN + 2 + i * (CW * 0.4 / 3);
                setTxt("#94a3b8");
                doc.setFontSize(6);
                doc.text(labels[i], xBase, y + 8);
                setTxt(c);
                doc.setFontSize(8); doc.setFont("helvetica","bold");
                doc.text(v, xBase, y + 12);
                doc.setFont("helvetica","normal");
            });

            // Commitments strip
            const cx = MARGIN + CW * 0.4 + 2;
            const cw = CW * 0.6 - 2;
            setFill("#fff7ed");
            doc.rect(cx, y, cw, 12, "F");
            doc.setDrawColor(254,215,170);
            doc.rect(cx, y, cw, 12);
            setTxt("#9a3412");
            doc.setFontSize(6.5); doc.setFont("helvetica","bold");
            doc.text("COMMITMENTS", cx + 2, y + 4);
            [[psd,"PSD"],[srs,"SRS"],[sew,"Sewing"],[pack,"Packing"]].forEach(([v,l], i) => {
                const xBase = cx + 2 + i * (cw / 4);
                setTxt("#c2410c"); doc.setFontSize(6); doc.setFont("helvetica","normal");
                doc.text(l, xBase, y + 8);
                setTxt("#9a3412"); doc.setFontSize(7.5); doc.setFont("helvetica","bold");
                doc.text(v, xBase, y + 12);
                doc.setFont("helvetica","normal");
            });
            y += 14;

            // Components table header
            setFill("#f1f5f9");
            doc.rect(MARGIN, y, CW, 7, "F");
            setTxt("#64748b");
            doc.setFontSize(6.5); doc.setFont("helvetica","bold");
            doc.text("COMPOSANT",  MARGIN + 2,      y + 5);
            doc.text("STATUS",     MARGIN + CW*0.35, y + 5);
            doc.text("DETAILS",    MARGIN + CW*0.52, y + 5);
            y += 7;

            // Component rows
            g.rows.forEach((r, ri) => {
                const comp   = String(r.Composant||"—");
                const status = String(r.Status||"—");
                const det    = String(r.Details||"—").split(String.fromCharCode(10)).join(" ").slice(0,60);
                const rowH   = 7;

                checkPage(rowH + 2);

                if (ri % 2 === 1) {
                    setFill("#fafafa");
                    doc.rect(MARGIN, y, CW, rowH, "F");
                }
                doc.setDrawColor(241,245,249);
                doc.line(MARGIN, y + rowH, MARGIN + CW, y + rowH);

                setTxt("#0f172a");
                doc.setFontSize(7.5); doc.setFont("helvetica","bold");
                doc.text(comp.slice(0,28), MARGIN + 2, y + 4.8);

                // Status badge (text only)
                const statusColors = {
                    "in house":         "#166534",
                    "po sent":          "#1e40af",
                    "pending":          "#854d0e",
                    "waiting approval": "#9a3412",
                    "approved":         "#166534",
                    "rejected":         "#991b1b"
                };
                const sc2 = statusColors[status.toLowerCase()] || "#6b7280";
                setTxt(sc2);
                doc.setFontSize(7); doc.setFont("helvetica","normal");
                doc.text(status, MARGIN + CW*0.35, y + 4.8);

                setTxt("#475569");
                doc.text(det.slice(0,45), MARGIN + CW*0.52, y + 4.8);
                y += rowH;
            });

            y += 5; // espace entre styles
        });

        // Footer
        const pages = doc.internal.getNumberOfPages();
        for (let p = 1; p <= pages; p++) {
            doc.setPage(p);
            setFill("#f8fafc");
            doc.rect(0, 287, W, 10, "F");
            setTxt("#94a3b8");
            doc.setFontSize(7); doc.setFont("helvetica","normal");
            doc.text("AW27 Checkers — Style Components Report", MARGIN, 293);
            doc.text(`Page ${p}/${pages}`, W - MARGIN, 293, { align:"right" });
        }

        return doc.output("datauristring").split(",")[1] || "";
    }

    // ── Handler principal (exposé globalement) ────────────────
    window._scGeneratePDF = async function(sendEmail) {
        // Collecter tous les emails des champs dynamiques
        const emailInputs = [...document.querySelectorAll(".sc-pdf-email-input")];
        const recipient = emailInputs
            .map(i => i.value.trim())
            .filter(Boolean)
            .join(",");

        if (sendEmail && !recipient) {
            typeof showToast === "function" &&
                showToast("Entrez au moins un email destinataire.", "error");
            document.querySelector(".sc-pdf-email-input")?.focus();
            return;
        }

        // Boutons en état loading
        const dlBtn   = document.getElementById("sc-pdf-download-btn");
        const sendBtn = document.getElementById("sc-pdf-send-btn");
        if (dlBtn)   { dlBtn.disabled   = true; }
        if (sendBtn) { sendBtn.disabled = true;
            sendBtn.innerHTML = `<span class="sc-spin">⏳</span> Envoi…`; }

        try {
            const allRows = window.state?.data?.[SHEET_KEY] || [];

            // Filtre styles cochés
            const styleBoxes     = document.querySelectorAll(".sc-style-check:checked");
            const selectedStyles = new Set([...styleBoxes].map(c => c.dataset.style));

            // Filtre statuts cochés
            const statusBoxes     = document.querySelectorAll(".sc-status-check:checked");
            const selectedStatuses = new Set([...statusBoxes].map(c => c.dataset.status));

            // Appliquer les deux filtres (style ET statut)
            const rows = allRows.filter(r => {
                const styleRaw  = String(r["Cust Style Ref"] || "").trim();
                const statusRaw = String(r.Status || "").trim();
                const statusKey = statusRaw === "" ? "__empty__" : statusRaw;
                const styleOk  = styleBoxes.length === 0  || selectedStyles.has(styleRaw);
                const statusOk = statusBoxes.length === 0 || selectedStatuses.has(statusKey);
                return styleOk && statusOk;
            });

            if (!rows.length) {
                typeof showToast === "function" &&
                    showToast("Aucun composant ne correspond aux filtres.", "error");
                if (dlBtn) dlBtn.disabled = false;
                if (sendBtn) { sendBtn.disabled = false;
                    sendBtn.innerHTML = `Envoyer + Télécharger`; }
                return;
            }

            const htmlDoc = buildPDFHTML(rows);

            // ── Envoi email ────────────────────────────────────
            if (sendEmail && recipient) {
                const gasUrl = window.GOOGLE_APPS_SCRIPT_URL;
                if (!gasUrl || gasUrl === "YOUR_WEB_APP_URL_HERE") {
                    throw new Error("URL GAS non configurée.");
                }

                localStorage.setItem("aw27_sc_pdf_email", recipient);

                const today   = new Date().toISOString().slice(0, 10);
                const subject = `Order Status — AW27 Style Components — ${today}`;

                // Récupérer le message personnalisé
                const customMsg = (document.getElementById("sc-pdf-message")?.value || "").trim();

                // 1. Email body : liste simple et professionnelle
                const emailBody = buildSimpleEmailBody(rows, customMsg);

                // 2. Générer le PDF complet via jsPDF et l'attacher
                typeof showToast === "function" &&
                    showToast("Génération du PDF en cours…", "info", 15000);

                let pdfBase64 = "";
                try {
                    pdfBase64 = await _scGeneratePDFBase64(rows);
                    console.log("[SC] PDF généré :", pdfBase64 ? pdfBase64.length + " chars" : "VIDE");
                } catch(pdfErr) {
                    console.error("[SC] PDF generation failed:", pdfErr.message, pdfErr.stack);
                }

                const today2 = new Date().toISOString().slice(0,10);
                const payload = {
                    action:          "SEND_ALERT_EMAIL",
                    recipient,
                    subject,
                    htmlBody:        emailBody,
                    xlsxBase64:      pdfBase64,
                    fileName:        `Order_Status_AW27_${today2}.pdf`,
                    attachMimeType:  "application/pdf"
                };

                console.log("[SC] Envoi email à:", recipient,
                    "| body:", emailBody.length, "chars",
                    "| pdf:", pdfBase64 ? "OK" : "ABSENT");
                const res = await fetch(gasUrl, {
                    method:   "POST",
                    headers:  { "Content-Type": "text/plain;charset=utf-8" },
                    redirect: "follow",
                    body: JSON.stringify(payload)
                });

                const json = await res.json();
                console.log("[SC] Réponse GAS:", json);
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
        // Même pattern que l'ORIGINAL : bouton dans .header-right, toujours visible
        if (document.getElementById("sc-actions-menu-wrapper")) return;

        // CSS (une seule fois)
        if (!document.getElementById("sc-am-style")) {
            const st = document.createElement("style");
            st.id = "sc-am-style";
            st.textContent = `
            #sc-actions-menu-btn{display:inline-flex !important;align-items:center !important;
                justify-content:center !important;gap:5px !important;
                padding:0 12px !important;height:36px !important;border-radius:18px !important;
                font-size:12px !important;font-weight:600 !important;
                font-family:inherit !important;cursor:pointer !important;
                color:#1565c0 !important;background:#fff !important;border:none !important;
                box-shadow:0 1px 3px rgba(0,0,0,.12) !important;}
            #sc-actions-menu-btn:hover{transform:scale(1.04);}
            #sc-actions-dropdown{display:none;position:absolute;right:0;top:calc(100% + 8px);
                background:#ffffff !important;border:1px solid #e5e7eb !important;
                border-radius:10px !important;min-width:230px !important;
                z-index:99999 !important;overflow:hidden !important;
                box-shadow:0 6px 24px rgba(0,0,0,.18) !important;}
            #sc-actions-dropdown.open{display:block !important;}
            #sc-actions-dropdown .sc-am-item{display:flex !important;align-items:center !important;
                gap:10px !important;padding:8px 10px !important;
                border-radius:6px !important;border:none !important;
                background:transparent !important;text-align:left !important;
                cursor:pointer !important;width:100% !important;
                font-family:inherit !important;}
            #sc-actions-dropdown .sc-am-item:hover{background:#f3f4f6 !important;}
            #sc-actions-dropdown .sc-am-icon{width:28px !important;height:28px !important;
                border-radius:6px !important;display:flex !important;
                align-items:center !important;justify-content:center !important;
                flex-shrink:0 !important;}
            #sc-actions-dropdown .sc-am-lbl{font-size:12px !important;font-weight:600 !important;
                color:#111827 !important;}
            #sc-actions-dropdown .sc-am-sub{font-size:10.5px !important;
                color:#6b7280 !important;margin-top:1px !important;}
            #sc-actions-dropdown .sc-am-sep{height:1px !important;
                background:#e5e7eb !important;margin:3px 0 !important;}
            #sc-actions-dropdown .sc-am-sec{padding:5px 10px 2px !important;
                font-size:9.5px !important;font-weight:700 !important;
                color:#6b7280 !important;text-transform:uppercase !important;
                letter-spacing:.06em !important;}
            #sc-actions-dropdown i.ti{color:inherit !important;}`;
            document.head.appendChild(st);
        }

        const wrapper = document.createElement("div");
        wrapper.id = "sc-actions-menu-wrapper";
        wrapper.style.cssText = "position:relative;display:inline-flex;align-items:center;";

        const btn = document.createElement("button");
        btn.id = "sc-actions-menu-btn";
        btn.title = "Actions Style Components";
        btn.innerHTML = `<i class="ti ti-layout-grid" style="font-size:15px;" aria-hidden="true"></i>
            Actions`;
        btn.onclick = e => {
            e.stopPropagation();
            document.getElementById("sc-actions-dropdown")?.classList.toggle("open");
        };

        const drop = document.createElement("div");
        drop.id = "sc-actions-dropdown";
        drop.innerHTML = `<div style="padding:5px;">
            <div class="sc-am-sec">Export</div>
            <button class="sc-am-item" id="sc-am-pdf">
                <div class="sc-am-icon" style="background:#eff6ff;">
                    <i class="ti ti-checklist" style="font-size:14px;color:#1565c0 !important;" aria-hidden="true"></i>
                </div>
                <div><div class="sc-am-lbl">Télécharger PDF</div>
                     <div class="sc-am-sub">Rapport Style Components</div></div>
            </button>
            <button class="sc-am-item" id="sc-am-email">
                <div class="sc-am-icon" style="background:#f0fdf4;">
                    <i class="ti ti-mail" style="font-size:14px;color:#166534 !important;" aria-hidden="true"></i>
                </div>
                <div><div class="sc-am-lbl">Envoyer par email</div>
                     <div class="sc-am-sub">Order Status Report</div></div>
            </button>
            <div class="sc-am-sep"></div>
            <div class="sc-am-sec">Import & Analyse</div>
            <button class="sc-am-item" id="sc-am-psd">
                <div class="sc-am-icon" style="background:#fef9c3;">
                    <i class="ti ti-calendar-up" style="font-size:14px;color:#854d0e !important;" aria-hidden="true"></i>
                </div>
                <div><div class="sc-am-lbl">Importer PSD</div>
                     <div class="sc-am-sub">SRS · Sewing · Packing</div></div>
            </button>
            <button class="sc-am-item" id="sc-am-tp">
                <div class="sc-am-icon" style="background:#f5f3ff;">
                    <i class="ti ti-bolt" style="font-size:14px;color:#7c3aed !important;" aria-hidden="true"></i>
                </div>
                <div><div class="sc-am-lbl">Analyser TP</div>
                     <div class="sc-am-sub">Extraction IA</div></div>
            </button>
            <div class="sc-am-sep"></div>
            <div class="sc-am-sec">Alertes & Notifications</div>
            <button class="sc-am-item" id="sc-am-scan">
                <div class="sc-am-icon" style="background:#fef2f2;">
                    <i class="ti ti-alert-triangle" style="font-size:14px;color:#dc2626 !important;" aria-hidden="true"></i>
                </div>
                <div><div class="sc-am-lbl">Scanner commandes</div>
                     <div class="sc-am-sub">Commandes prêtes à notifier</div></div>
            </button>
            <button class="sc-am-item" id="sc-am-mail-report">
                <div class="sc-am-icon" style="background:#eff6ff;">
                    <i class="ti ti-mail-forward" style="font-size:14px;color:#0078d4 !important;" aria-hidden="true"></i>
                </div>
                <div><div class="sc-am-lbl">Rapport d'alertes</div>
                     <div class="sc-am-sub">Envoyer par email Outlook</div></div>
            </button>
        </div>`;

        // ── Handlers : naviguer vers Style Components si nécessaire ──
        const gotoSC = () => {
            if (window.state?.activeSheet !== SHEET_KEY) {
                document.getElementById(`tab-custom-${SHEET_KEY}`)?.click();
            }
        };
        drop.querySelector("#sc-am-pdf").onclick = () => {
            drop.classList.remove("open");
            gotoSC();
            setTimeout(() => { if (typeof openPDFModal === "function") openPDFModal(); }, 150);
        };
        drop.querySelector("#sc-am-email").onclick = () => {
            drop.classList.remove("open");
            gotoSC();
            setTimeout(() => {
                if (typeof openPDFModal === "function") {
                    openPDFModal();
                    setTimeout(() => document.querySelector(".sc-pdf-email-input")?.focus(), 400);
                }
            }, 150);
        };
        drop.querySelector("#sc-am-psd").onclick = () => {
            drop.classList.remove("open");
            gotoSC();
            setTimeout(() => {
                if (typeof window._psdTriggerUpload === "function") window._psdTriggerUpload();
            }, 150);
        };
        drop.querySelector("#sc-am-tp").onclick = () => {
            drop.classList.remove("open");
            gotoSC();
            setTimeout(() => {
                if (typeof window._tpaOpenModal === "function") window._tpaOpenModal();
            }, 150);
        };
        drop.querySelector("#sc-am-scan").onclick = () => {
            drop.classList.remove("open");
            if (typeof window._ocsOpenScanModal === "function") window._ocsOpenScanModal();
        };
        drop.querySelector("#sc-am-mail-report").onclick = () => {
            drop.classList.remove("open");
            if (typeof window._maOpenMailModal === "function") window._maOpenMailModal();
        };

        document.addEventListener("click", e => {
            if (!wrapper.contains(e.target)) drop.classList.remove("open");
        });

        wrapper.appendChild(btn);
        wrapper.appendChild(drop);

        // ── Insertion : EXACTEMENT comme l'original ──
        const targets = [
            document.getElementById("btn-order-scan"),
            document.getElementById("btn-mail-alerts"),
            document.getElementById("btn-notif-global"),
            document.querySelector(".header-right button")
        ];
        const target = targets.find(Boolean);
        if (target?.parentNode) {
            target.parentNode.insertBefore(wrapper, target);
        } else {
            document.querySelector(".header-right")?.prepend(wrapper);
        }
        console.log("[AW27] Actions Menu ✓");
    }

    function init() {
        injectStyles();
        registerMenu();
        addNavItem();
        patchRenderAll();
        observeModal();

        // Patcher collectAllAlerts après que app.js l'ait définie
        const tryPatchAlerts = () => {
            if (typeof window.collectAllAlerts === "function") {
                patchCollectAllAlerts();
            } else {
                setTimeout(tryPatchAlerts, 300);
            }
        };
        tryPatchAlerts();

        // Charger les données initiales
        // On enregistre le collecteur smartAlerts APRES que les données soient chargées
        loadComponentsData().then(() => {
            if (window.state?.activeSheet === SHEET_KEY) {
                if (typeof applyFilters === "function") applyFilters();
                if (typeof renderKPIs   === "function") renderKPIs();
            }
            // Enregistrer le collecteur puis déclencher le refresh
            registerSmartAlertsCollector();
            _triggerSARefresh();
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

        // Garde-fou : vérifier toutes les 600ms pendant 30s
        // Couvre toutes les courses de timing (auth, fetchAllData, autres boutons)
        let _scGuardCount = 0;
        const _scGuard = setInterval(() => {
            if (++_scGuardCount > 50) { clearInterval(_scGuard); return; }
            if (document.querySelector(".header-right") &&
                !document.getElementById("sc-actions-menu-wrapper")) {
                injectHeaderButton();
            }
        }, 600);

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
