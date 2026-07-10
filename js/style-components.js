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
          options: ["", "Approved", "In House", "On Going", "Rejected"]                   },
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
            if (v === "approved") return { bg:"#f0fdf4",color:"#166534",border:"#86efac",dot:"#16a34a" };
            if (v === "rejected") return { bg:"#fef2f2",color:"#991b1b",border:"#fca5a5",dot:"#dc2626" };
            if (v === "on going") return { bg:"#eff6ff",color:"#1e40af",border:"#93c5fd",dot:"#2563eb" };
            return { bg:"#f9fafb",color:"#6b7280",border:"#e5e7eb",dot:"#9ca3af" };
        };

        // Lookup image depuis state.data.details par Cust Style Ref
        const getStyleImage = (custRef) => {
            const detailRow = (window.state?.data?.details || []).find(r =>
                String(r["Cust Style Ref"] || "").trim() === custRef
            );
            return detailRow?._imageUrl || "";
        };

        const sectionsHTML = order.map(key => {
            const group    = groups[key];
            const imgUrl   = getStyleImage(group.custRef);
            const approved = group.rows.filter(r => String(r.Status||"").toLowerCase() === "approved").length;
            const rejected = group.rows.filter(r => String(r.Status||"").toLowerCase() === "rejected").length;
            const ongoing  = group.rows.filter(r => String(r.Status||"").toLowerCase() === "on going").length;
            const total    = group.rows.length;

            const rowsHTML = group.rows.map((r, i) => {
                const sc  = statusCfg(r.Status);
                const det = String(r.Details || "").trim().split(String.fromCharCode(10)).join("<br>");
                const bg  = i % 2 === 0 ? "#ffffff" : "#fafafa";
                return `
                <tr style="background:${bg};">
                    <td style="padding:9px 14px;font-size:12.5px;font-weight:500;
                        color:#111827;border-bottom:1px solid #f0f0f0;vertical-align:top;
                        width:26%;">
                        ${r.Composant || "—"}
                    </td>
                    <td style="padding:9px 14px;border-bottom:1px solid #f0f0f0;
                        vertical-align:top;width:16%;">
                        ${r.Status
                            ? `<span style="display:inline-flex;align-items:center;gap:5px;
                                padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;
                                background:${sc.bg};color:${sc.color};border:0.5px solid ${sc.border};">
                                <span style="width:5px;height:5px;border-radius:50%;
                                    background:${sc.dot};flex-shrink:0;display:inline-block;"></span>
                                ${r.Status}</span>`
                            : '<span style="color:#d1d5db;font-size:12px;">—</span>'}
                    </td>
                    <td style="padding:9px 14px;font-size:12px;color:#374151;
                        border-bottom:1px solid #f0f0f0;vertical-align:top;
                        line-height:1.6;width:58%;">${det || '<span style="color:#d1d5db;">—</span>'}</td>
                </tr>`;
            }).join("");

            return `
            <div style="margin-bottom:36px;page-break-inside:avoid;
                border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">

                <!-- En-tête style : image gauche + infos droite -->
                <div style="display:flex;align-items:stretch;border-bottom:1px solid #e5e7eb;">

                    <!-- Image du style -->
                    ${imgUrl ? `
                    <div style="width:110px;flex-shrink:0;background:#f9fafb;
                        border-right:1px solid #e5e7eb;display:flex;
                        align-items:center;justify-content:center;padding:10px;">
                        <img src="${imgUrl}" alt="${group.custRef}"
                            style="width:90px;height:90px;object-fit:cover;
                                border-radius:6px;"/>
                    </div>` : `
                    <div style="width:110px;flex-shrink:0;background:#f9fafb;
                        border-right:1px solid #e5e7eb;display:flex;
                        align-items:center;justify-content:center;">
                        <span style="font-size:28px;color:#d1d5db;">&#128247;</span>
                    </div>`}

                    <!-- Infos style -->
                    <div style="flex:1;padding:14px 18px;background:#fff;">
                        <div style="font-size:17px;font-weight:700;color:#111827;
                            letter-spacing:.01em;margin-bottom:3px;">
                            ${group.custRef || "—"}
                        </div>
                        ${group.ctlRef ? `
                        <div style="font-size:11.5px;color:#6b7280;margin-bottom:10px;">
                            CTL Ref : <strong style="color:#374151;">${group.ctlRef}</strong>
                        </div>` : '<div style="margin-bottom:10px;"></div>'}

                        <!-- Badges statuts -->
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            <span style="padding:2px 9px;border-radius:20px;
                                background:#f9fafb;border:0.5px solid #e5e7eb;
                                font-size:10.5px;color:#6b7280;">
                                ${total} composant${total > 1 ? "s" : ""}
                            </span>
                            ${approved > 0 ? `<span style="padding:2px 9px;border-radius:20px;
                                background:#f0fdf4;border:0.5px solid #86efac;
                                font-size:10.5px;font-weight:600;color:#166534;">
                                ✓ ${approved} Approved</span>` : ""}
                            ${ongoing  > 0 ? `<span style="padding:2px 9px;border-radius:20px;
                                background:#eff6ff;border:0.5px solid #93c5fd;
                                font-size:10.5px;font-weight:600;color:#1e40af;">
                                ${ongoing} On Going</span>` : ""}
                            ${rejected > 0 ? `<span style="padding:2px 9px;border-radius:20px;
                                background:#fef2f2;border:0.5px solid #fca5a5;
                                font-size:10.5px;font-weight:600;color:#991b1b;">
                                ✗ ${rejected} Rejected</span>` : ""}
                        </div>
                    </div>
                </div>

                <!-- Tableau composants -->
                <table width="100%" cellpadding="0" cellspacing="0"
                    style="border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f8fafc;">
                            <th style="padding:8px 14px;text-align:left;font-size:10px;
                                color:#9ca3af;text-transform:uppercase;
                                letter-spacing:.08em;font-weight:600;
                                border-bottom:1px solid #e5e7eb;">Composant</th>
                            <th style="padding:8px 14px;text-align:left;font-size:10px;
                                color:#9ca3af;text-transform:uppercase;
                                letter-spacing:.08em;font-weight:600;
                                border-bottom:1px solid #e5e7eb;">Status</th>
                            <th style="padding:8px 14px;text-align:left;font-size:10px;
                                color:#9ca3af;text-transform:uppercase;
                                letter-spacing:.08em;font-weight:600;
                                border-bottom:1px solid #e5e7eb;">Details</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHTML}</tbody>
                </table>
            </div>`;
        }).join("");

        return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>AW27 — Style Components</title>
<style>
  * { box-sizing:border-box; }
  body {
    margin:0; padding:28px 36px;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
    background:#fff; color:#111827;
    font-size:13px; line-height:1.5;
  }
  @media print {
    body { padding:16px 20px; }
    @page { margin:12mm 10mm; size:A4; }
  }
</style>
</head>
<body>

<!-- HEADER minimal -->
<div style="display:flex;align-items:center;justify-content:space-between;
    margin-bottom:24px;padding-bottom:14px;
    border-bottom:2px solid #1565c0;">
    <div style="display:flex;align-items:center;gap:12px;">
        <div style="background:#1565c0;border-radius:8px;padding:6px 12px;">
            <span style="color:#fff;font-size:16px;font-weight:700;
                letter-spacing:.06em;">AW27</span>
        </div>
        <div>
            <div style="font-size:15px;font-weight:700;color:#111827;">
                Style Components</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:1px;">
                ${todayFR}</div>
        </div>
    </div>
    <div style="font-size:11px;color:#9ca3af;text-align:right;">
        ${order.length} style${order.length > 1 ? "s" : ""} · ${rows.length} composant${rows.length > 1 ? "s" : ""}
    </div>
</div>

${sectionsHTML}

<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;
    text-align:center;font-size:10px;color:#9ca3af;">
    AW27 Checkers — Style Components — ${todayFR}
</div>
</body>
</html>`;
    }

    // ── Mettre à jour le subtitle selon la sélection ────────────
    window._scUpdatePDFSubtitle = function() {
        const checked = document.querySelectorAll(".sc-style-check:checked");
        const sub = document.getElementById("sc-pdf-subtitle");
        if (!sub) return;
        const rows = window.state?.data?.[SHEET_KEY] || [];
        const selectedStyles = new Set([...checked].map(c => c.dataset.style));
        const filteredRows = rows.filter(r =>
            selectedStyles.has(String(r["Cust Style Ref"] || "").trim())
        );
        sub.textContent = `${selectedStyles.size} style${selectedStyles.size > 1 ? "s" : ""} · ${filteredRows.length} composant${filteredRows.length > 1 ? "s" : ""}`;
    };

    // Écouter les changements de checkboxes (délégation sur le document)
    document.addEventListener("change", e => {
        if (e.target.classList.contains("sc-style-check")) {
            window._scUpdatePDFSubtitle();
        }
    });

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
            const allRows = window.state?.data?.[SHEET_KEY] || [];

            // Récupérer les styles sélectionnés dans la modale
            const checkedBoxes = document.querySelectorAll(".sc-style-check:checked");
            const selectedStyles = checkedBoxes.length > 0
                ? new Set([...checkedBoxes].map(c => c.dataset.style))
                : null; // null = tous

            const rows = selectedStyles
                ? allRows.filter(r =>
                    selectedStyles.has(String(r["Cust Style Ref"] || "").trim()))
                : allRows;

            if (!rows.length) {
                typeof showToast === "function" &&
                    showToast("Aucun style sélectionné.", "error");
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
        btn.innerHTML = `<i class="ti ti-checklist" aria-hidden="true" style="font-size:17px;"></i>`;
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

        // Garde-fou : vérifier toutes les 600ms pendant 30s
        // Couvre toutes les courses de timing (auth, fetchAllData, autres boutons)
        let _scGuardCount = 0;
        const _scGuard = setInterval(() => {
            if (++_scGuardCount > 50) { clearInterval(_scGuard); return; }
            if (document.querySelector(".header-right") &&
                !document.getElementById("btn-components-pdf")) {
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
