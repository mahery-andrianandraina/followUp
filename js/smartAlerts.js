// ============================================================
//  AW27 CHECKERS — Smart Alerts System
//  Fichier : smartAlerts.js
//  Charger APRÈS app.js dans index.html :
//  <script src="smartAlerts.js"></script>
// ============================================================

(function initSmartAlerts() {

    // ── Config ──────────────────────────────────────────────
    const CONFIG = {
        exFtyWarningDays:  14,   // alerte si Ex-Fty dans moins de X jours
        exFtyDangerDays:   7,    // alerte rouge si Ex-Fty dans moins de X jours
        refreshInterval:   60000 // recalcul toutes les 60s
    };

    // ── Styles CSS injectés une seule fois ──────────────────
    function injectStyles() {
        if (document.getElementById("sa-styles")) return;
        const s = document.createElement("style");
        s.id = "sa-styles";
        s.textContent = `

        /* ── Badge alerte sur card dashboard ── */
        .sa-card-badge {
            position: absolute;
            top: 8px; right: 8px;
            display: flex; flex-direction: column; gap: 3px;
            z-index: 10; pointer-events: none;
        }
        .sa-badge {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 3px 8px; border-radius: 20px;
            font-size: 9.5px; font-weight: 700;
            border: 0.5px solid; white-space: nowrap;
            backdrop-filter: blur(4px);
            pointer-events: auto; cursor: default;
        }
        .sa-badge-danger {
            background: rgba(254,242,242,.95);
            color: #b91c1c; border-color: #fca5a5;
        }
        .sa-badge-warn {
            background: rgba(255,251,235,.95);
            color: #92400e; border-color: #fcd34d;
        }
        .sa-badge-info {
            background: rgba(239,246,255,.95);
            color: #1e40af; border-color: #93c5fd;
        }
        .sa-badge-ok {
            background: rgba(240,253,244,.95);
            color: #166534; border-color: #86efac;
        }
        .sa-badge svg { flex-shrink: 0; }

        /* ── KPI bar globale ── */
        #sa-kpi-bar {
            display: flex; gap: 10px; flex-wrap: wrap;
            padding: 10px 16px;
            background: var(--color-background-primary, #fff);
            border-bottom: 0.5px solid var(--color-border-tertiary, #e5e7eb);
            margin-bottom: 2px;
        }
        #sa-kpi-bar.hidden { display: none; }
        .sa-kpi {
            display: flex; align-items: center; gap: 8px;
            padding: 8px 14px; border-radius: 10px;
            border: 0.5px solid; flex: 1; min-width: 140px;
            transition: transform .15s;
        }
        .sa-kpi:hover { transform: translateY(-1px); }
        .sa-kpi-icon {
            width: 32px; height: 32px; border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            font-size: 15px; flex-shrink: 0;
        }
        .sa-kpi-body { display: flex; flex-direction: column; gap: 1px; }
        .sa-kpi-val {
            font-size: 18px; font-weight: 700; line-height: 1;
        }
        .sa-kpi-lbl {
            font-size: 10px; color: var(--color-text-secondary, #6b7280);
        }
        .sa-kpi-danger  { background: #fff1f2; border-color: #fecdd3; }
        .sa-kpi-danger .sa-kpi-icon { background: #fee2e2; }
        .sa-kpi-danger .sa-kpi-val  { color: #be123c; }
        .sa-kpi-warn    { background: #fffbeb; border-color: #fde68a; }
        .sa-kpi-warn .sa-kpi-icon   { background: #fef3c7; }
        .sa-kpi-warn .sa-kpi-val    { color: #b45309; }
        .sa-kpi-blue    { background: #eff6ff; border-color: #bfdbfe; }
        .sa-kpi-blue .sa-kpi-icon   { background: #dbeafe; }
        .sa-kpi-blue .sa-kpi-val    { color: #1d4ed8; }
        .sa-kpi-green   { background: #f0fdf4; border-color: #bbf7d0; }
        .sa-kpi-green .sa-kpi-icon  { background: #dcfce7; }
        .sa-kpi-green .sa-kpi-val   { color: #15803d; }

        /* ── Panneau alertes latéral ── */
        #sa-panel-overlay {
            position: fixed; inset: 0; z-index: 10600;
            background: rgba(0,0,0,.35);
            display: none; align-items: stretch; justify-content: flex-end;
        }
        #sa-panel-overlay.open { display: flex; }
        #sa-panel {
            width: 400px; max-width: 95vw; height: 100vh;
            background: #fff;
            border-left: 1px solid #e5e7eb;
            box-shadow: -8px 0 32px rgba(0,0,0,.12);
            display: flex; flex-direction: column;
            transform: translateX(100%);
            transition: transform .28s cubic-bezier(.4,0,.2,1);
        }
        #sa-panel-overlay.open #sa-panel { transform: translateX(0); }
        #sa-panel-header {
            padding: 14px 16px;
            border-bottom: 1px solid #f0f1f3;
            background: #fafbfc;
            display: flex; align-items: center; gap: 10px; flex-shrink: 0;
        }
        #sa-panel-title {
            font-size: 14px; font-weight: 700; color: #1a1f36; flex: 1;
        }
        #sa-panel-sub { font-size: 11px; color: #9ca3af; }
        #sa-panel-close {
            background: none; border: none; cursor: pointer; color: #9ca3af;
            width: 28px; height: 28px; border-radius: 7px;
            display: flex; align-items: center; justify-content: center;
            transition: background .12s;
        }
        #sa-panel-close:hover { background: #fee2e2; color: #dc2626; }
        #sa-panel-tabs {
            display: flex; border-bottom: 1px solid #f0f1f3; flex-shrink: 0;
        }
        .sa-tab {
            flex: 1; padding: 10px 0; text-align: center;
            font-size: 11.5px; font-weight: 500; color: #6b7280;
            cursor: pointer; border-bottom: 2px solid transparent;
            transition: color .12s, border-color .12s;
        }
        .sa-tab.active { color: #1d4ed8; border-color: #1d4ed8; }
        #sa-panel-body {
            flex: 1; overflow-y: auto; padding: 10px 12px;
            display: flex; flex-direction: column; gap: 7px;
            background: #f8f9fb;
        }
        .sa-alert-card {
            background: #fff; border-radius: 10px;
            border: 0.5px solid #e8eaed; overflow: hidden;
            transition: box-shadow .12s;
        }
        .sa-alert-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,.08); }
        .sa-alert-top {
            display: flex; align-items: center; gap: 8px;
            padding: 10px 12px 6px;
        }
        .sa-alert-icon {
            width: 28px; height: 28px; border-radius: 7px;
            display: flex; align-items: center; justify-content: center;
            font-size: 13px; flex-shrink: 0;
        }
        .sa-alert-icon-danger { background: #fee2e2; }
        .sa-alert-icon-warn   { background: #fef3c7; }
        .sa-alert-icon-info   { background: #dbeafe; }
        .sa-alert-title {
            font-size: 12px; font-weight: 600; color: #1a1f36; flex: 1;
        }
        .sa-alert-client {
            font-size: 10px; padding: 1px 7px; border-radius: 20px;
            background: #e8f0fe; color: #1967d2; font-weight: 600;
            flex-shrink: 0;
        }
        .sa-alert-details {
            padding: 0 12px 10px; display: flex; flex-direction: column; gap: 4px;
        }
        .sa-alert-row {
            display: flex; align-items: center; gap: 6px;
            font-size: 11px; color: #374151;
        }
        .sa-alert-row svg { color: #9ca3af; flex-shrink: 0; }
        .sa-alert-action {
            padding: 7px 12px;
            background: #f8f9fb; border-top: 0.5px solid #f0f1f3;
            font-size: 10.5px; color: #6b7280; font-style: italic;
        }
        .sa-goto-btn {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 4px 10px; border-radius: 6px; border: none;
            background: #eff6ff; color: #1d4ed8; font-size: 10.5px;
            font-weight: 600; cursor: pointer; font-family: inherit;
            transition: background .12s; float: right; margin-top: 4px;
        }
        .sa-goto-btn:hover { background: #dbeafe; }

        /* ── Bouton cloche ── */
        #sa-bell-btn {
            position: relative;
            display: flex; align-items: center; justify-content: center;
            width: 36px; height: 36px; border-radius: 50%;
            border: none; background: none; cursor: pointer;
            transition: background .15s; color: var(--color-text-secondary, #6b7280);
        }
        #sa-bell-btn:hover { background: var(--color-background-secondary, #f3f4f6); }
        #sa-bell-count {
            position: absolute; top: -2px; right: -2px;
            min-width: 16px; height: 16px; border-radius: 8px;
            background: #dc2626; color: #fff;
            font-size: 9px; font-weight: 700;
            display: none; align-items: center; justify-content: center;
            padding: 0 3px; border: 1.5px solid #fff;
        }
        #sa-bell-btn.has-alerts #sa-bell-count { display: flex; }
        #sa-bell-btn.has-danger { color: #dc2626; }

        /* ── Card overlay pulse ── */
        @keyframes sa-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .6; }
        }
        .sa-card-alert-border {
            outline: 2px solid #fca5a5;
            outline-offset: -2px;
        }
        .sa-card-alert-border-warn {
            outline: 2px solid #fcd34d;
            outline-offset: -2px;
        }
        `;
        document.head.appendChild(s);
    }

    // ── Icônes SVG ──────────────────────────────────────────
    const ICONS = {
        alert: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`,
        clock: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
        check: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
        ship:  `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 20a2 2 0 002 2h16a2 2 0 002-2M2 20l2-8h16l2 8M12 4v8m-4-4h8"/></svg>`,
        sample:`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18"/></svg>`,
        arrow: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`,
    };

    // ── Helpers ─────────────────────────────────────────────
    function daysDiff(dateVal) {
        if (!dateVal) return null;
        const d = new Date(dateVal); d.setHours(0,0,0,0);
        const t = new Date(); t.setHours(0,0,0,0);
        return Math.round((d - t) / 86400000);
    }

    function fmtDate(v) {
        if (!v) return "—";
        try { return new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }); }
        catch(_) { return String(v); }
    }

    function esc(s) {
        return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    // ══════════════════════════════════════════════════════════
    //  COLLECTE DES ALERTES
    // ══════════════════════════════════════════════════════════
    function collectAlerts() {
        const st = window.state?.data || {};
        const details  = st.details  || [];
        const sample   = st.sample   || [];
        const ordering = st.ordering || [];
        const alerts   = [];

        const norm = v => String(v || "").replace(/[\s\-_]/g, "").toLowerCase();

        details.forEach(row => {
            const styleCode = row["Cust Style Ref"] || row.Style || "";
            const client    = row.Client || row["Coll"] || "";
            if (!styleCode) return;

            // ── 1. Sample approuvée ? ──────────────────────
            const styleSamples = sample.filter(s =>
                norm(s.Style) === norm(styleCode) || norm(s.Style) === norm(row.CTLStyleRef || "")
            );
            const hasPendingSample = styleSamples.some(s =>
                s.Approval !== "Approved" &&
                s["Sending Date"] && String(s["Sending Date"]).trim()
            );
            const hasNoSampleAtAll = styleSamples.length === 0;

            // ── 2. PO confirmé ? ──────────────────────────
            const styleOrders = ordering.filter(o =>
                norm(o.Description || o.Style) === norm(styleCode)
            );
            const hasConfirmedOrder = styleOrders.some(o => o.Status === "Confirmed");

            // ── 3. Ex-Fty ─────────────────────────────────
            const exFtyRaw = row["Possible etd"] || row["Possible Vsl date"] || "";
            const exFtyDiff = daysDiff(exFtyRaw);

            // ── 4. PO Deadline ────────────────────────────
            const psdRaw  = row["PO Deadline"] || "";
            const psdDiff = daysDiff(psdRaw);

            // ── ALERTE : Sample envoyée non approuvée + PO confirmé ──
            if (hasPendingSample && hasConfirmedOrder) {
                alerts.push({
                    type:     "sample_block",
                    severity: "danger",
                    style:    styleCode,
                    client,
                    title:    `Style ${styleCode} — Sample non approuvée (PO confirmé)`,
                    details:  [
                        `${styleSamples.filter(s => s.Approval !== "Approved" && s["Sending Date"]).length} sample(s) envoyée(s) sans approval`,
                        `${styleOrders.filter(o => o.Status === "Confirmed").length} commande(s) confirmée(s)`
                    ],
                    action:   "Relancer le client pour l'approval avant expédition",
                    icon:     "alert",
                    rowIndex: row._rowIndex
                });
            }

            // ── ALERTE : PO confirmé mais aucune sample ──
            if (hasNoSampleAtAll && hasConfirmedOrder) {
                alerts.push({
                    type:     "no_sample",
                    severity: "warn",
                    style:    styleCode,
                    client,
                    title:    `Style ${styleCode} — Aucune sample (PO confirmé)`,
                    details:  [
                        "Aucune sample enregistrée pour ce style",
                        `${styleOrders.filter(o => o.Status === "Confirmed").length} commande(s) confirmée(s)`
                    ],
                    action:   "Vérifier si la sample a été envoyée/enregistrée",
                    icon:     "sample",
                    rowIndex: row._rowIndex
                });
            }

            // ── ALERTE : Ex-Fty proche / dépassée ──────────
            if (exFtyDiff !== null) {
                if (exFtyDiff < 0 && !_isOrderDelivered(styleOrders)) {
                    alerts.push({
                        type:     "exfty_late",
                        severity: "danger",
                        style:    styleCode,
                        client,
                        title:    `Style ${styleCode} — Ex-Fty dépassée de ${Math.abs(exFtyDiff)}j`,
                        details:  [
                            `Ex-Fty prévue le ${fmtDate(exFtyRaw)}`,
                            "Statut livraison : non expédié"
                        ],
                        action:   "Contacter le fournisseur pour confirmer le statut d'expédition",
                        icon:     "ship",
                        rowIndex: row._rowIndex
                    });
                } else if (exFtyDiff >= 0 && exFtyDiff <= CONFIG.exFtyWarningDays && !_isOrderDelivered(styleOrders)) {
                    const sev = exFtyDiff <= CONFIG.exFtyDangerDays ? "danger" : "warn";
                    alerts.push({
                        type:     "exfty_soon",
                        severity: sev,
                        style:    styleCode,
                        client,
                        title:    `Style ${styleCode} — Ex-Fty dans ${exFtyDiff}j`,
                        details:  [
                            `Ex-Fty prévue le ${fmtDate(exFtyRaw)}`,
                            exFtyDiff <= CONFIG.exFtyDangerDays ? "⚠️ Urgent — moins d'une semaine" : "Surveiller l'avancement"
                        ],
                        action:   exFtyDiff <= CONFIG.exFtyDangerDays
                            ? "Confirmer la préparation avec le fournisseur d'urgence"
                            : "Confirmer la date d'expédition avec le fournisseur",
                        icon:     "clock",
                        rowIndex: row._rowIndex
                    });
                }
            }

            // ── ALERTE : PO Deadline dépassée sans PO reçu ──
            if (psdDiff !== null && psdDiff < 0 && row["Order Status"] !== "PO RECEIVED" && row["Order Status"] !== "Cancelled") {
                alerts.push({
                    type:     "psd_overdue",
                    severity: "warn",
                    style:    styleCode,
                    client,
                    title:    `Style ${styleCode} — PO Deadline dépassée de ${Math.abs(psdDiff)}j`,
                    details:  [
                        `Deadline : ${fmtDate(psdRaw)}`,
                        `Statut : ${row["Order Status"] || "Non défini"}`
                    ],
                    action:   "Relancer pour réception du PO",
                    icon:     "alert",
                    rowIndex: row._rowIndex
                });
            }
        });

        // ── 5. Collecteurs personnalisés enregistrés à l'extérieur ──
        if (Array.isArray(window.smartAlertsCollectors)) {
            window.smartAlertsCollectors.forEach(collector => {
                try {
                    const customAlerts = collector(st);
                    if (Array.isArray(customAlerts)) {
                        alerts.push(...customAlerts);
                    }
                } catch (e) {
                    console.error("[smartAlerts] Erreur dans un collecteur personnalisé :", e);
                }
            });
        }

        // Trier : danger d'abord, puis warn
        return alerts.sort((a, b) => {
            const order = { danger: 0, warn: 1, info: 2 };
            return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
        });
    }

    function _isOrderDelivered(orders) {
        return orders.some(o => o["Delivery Status"] === "Delivered");
    }

    // ══════════════════════════════════════════════════════════
    //  RENDU KPI BAR
    // ══════════════════════════════════════════════════════════
    function renderKPIBar(alerts) {
        let bar = document.getElementById("sa-kpi-bar");
        if (!bar) {
            bar = document.createElement("div");
            bar.id = "sa-kpi-bar";
            const ds = document.getElementById("dashboard-screen");
            if (ds) ds.parentNode.insertBefore(bar, ds);
        }

        const st = window.state?.data || {};
        const details  = st.details  || [];
        const ordering = st.ordering || [];
        const sample   = st.sample   || [];
        const today    = new Date(); today.setHours(0,0,0,0);

        // Calculs KPIs
        const totalStyles     = details.length;
        const totalConfQty    = details.reduce((s, r) => s + (+r["Conf Total"] || 0), 0);
        const poReceived      = details.filter(r => r["Order Status"] === "PO RECEIVED").length;
        const lateExFty       = details.filter(r => {
            const d = daysDiff(r["Possible etd"] || r["Possible Vsl date"]);
            return d !== null && d < 0;
        }).length;
        const soonExFty       = details.filter(r => {
            const d = daysDiff(r["Possible etd"] || r["Possible Vsl date"]);
            return d !== null && d >= 0 && d <= CONFIG.exFtyWarningDays;
        }).length;
        const dangerAlerts    = alerts.filter(a => a.severity === "danger").length;
        const warnAlerts      = alerts.filter(a => a.severity === "warn").length;

        const kpis = [
            {
                cls: "sa-kpi-blue",
                icon: "📦",
                val: totalStyles,
                lbl: "Total Styles"
            },
            {
                cls: "sa-kpi-green",
                icon: "✅",
                val: poReceived,
                lbl: "PO Reçus"
            },
            {
                cls: lateExFty > 0 ? "sa-kpi-danger" : "sa-kpi-green",
                icon: "🚢",
                val: lateExFty,
                lbl: "Ex-Fty dépassées"
            },
            {
                cls: soonExFty > 0 ? "sa-kpi-warn" : "sa-kpi-green",
                icon: "⏰",
                val: soonExFty,
                lbl: `Ex-Fty ≤ ${CONFIG.exFtyWarningDays}j`
            },
            {
                cls: dangerAlerts > 0 ? "sa-kpi-danger" : "sa-kpi-green",
                icon: "🚨",
                val: dangerAlerts + warnAlerts,
                lbl: "Alertes actives",
                clickable: true
            }
        ];

        bar.innerHTML = kpis.map(k => `
        <div class="sa-kpi ${k.cls}" ${k.clickable ? 'onclick="openSAPanel()" style="cursor:pointer"' : ''}>
            <div class="sa-kpi-icon">${k.icon}</div>
            <div class="sa-kpi-body">
                <div class="sa-kpi-val">${typeof k.val === "number" ? k.val.toLocaleString("fr-FR") : k.val}</div>
                <div class="sa-kpi-lbl">${k.lbl}</div>
            </div>
        </div>`).join("");

        // Masquer si on n'est pas sur le dashboard
        bar.classList.toggle("hidden", window.state?.activeView !== "dashboard");
    }

    // ══════════════════════════════════════════════════════════
    //  BADGES SUR LES CARDS DASHBOARD
    // ══════════════════════════════════════════════════════════
    function injectCardBadges(alerts) {
        // Nettoyer les anciens badges
        document.querySelectorAll(".sa-card-badge").forEach(el => el.remove());
        document.querySelectorAll(".sa-card-alert-border, .sa-card-alert-border-warn").forEach(el => {
            el.classList.remove("sa-card-alert-border", "sa-card-alert-border-warn");
        });

        // Grouper par style
        const byStyle = {};
        alerts.forEach(a => {
            if (!byStyle[a.style]) byStyle[a.style] = [];
            byStyle[a.style].push(a);
        });

        document.querySelectorAll(".dbs-sc").forEach(card => {
            const styleCode = card.dataset.styleRaw || card.dataset.style || "";
            const norm = v => String(v || "").replace(/[\s\-_]/g, "").toLowerCase();

            // Chercher les alertes pour ce style
            const cardAlerts = Object.entries(byStyle).find(([k]) =>
                norm(k) === norm(styleCode)
            )?.[1];

            if (!cardAlerts || !cardAlerts.length) return;

            const hasDanger = cardAlerts.some(a => a.severity === "danger");
            const hasWarn   = cardAlerts.some(a => a.severity === "warn");

            // Bordure colorée
            if (hasDanger) card.classList.add("sa-card-alert-border");
            else if (hasWarn) card.classList.add("sa-card-alert-border-warn");

            // Badge(s)
            const badgeWrap = document.createElement("div");
            badgeWrap.className = "sa-card-badge";

            // Max 2 badges affichés
            cardAlerts.slice(0, 2).forEach(a => {
                const cls = a.severity === "danger" ? "sa-badge-danger"
                          : a.severity === "warn"   ? "sa-badge-warn"
                          : "sa-badge-info";
                const badge = document.createElement("span");
                badge.className = `sa-badge ${cls}`;
                badge.innerHTML = ICONS[a.icon] + (a.shortTitle || _shortTitle(a.type));
                badgeWrap.appendChild(badge);
            });

            if (cardAlerts.length > 2) {
                const more = document.createElement("span");
                more.className = "sa-badge sa-badge-info";
                more.textContent = `+${cardAlerts.length - 2} alertes`;
                badgeWrap.appendChild(more);
            }

            // Positionner dans la card (après l'image)
            card.style.position = "relative";
            card.insertBefore(badgeWrap, card.querySelector(".dbs-sc-img-wrap")?.nextSibling || card.firstChild);
        });
    }

    function _shortTitle(type) {
        const map = {
            sample_block: "Sample non approuvée",
            no_sample:    "Aucune sample",
            exfty_late:   "Ex-Fty dépassée",
            exfty_soon:   "Ex-Fty proche",
            psd_overdue:  "PSD dépassée"
        };
        return map[type] || type;
    }

    // ══════════════════════════════════════════════════════════
    //  PANNEAU LATÉRAL ALERTES
    // ══════════════════════════════════════════════════════════
    let _currentTab   = "all";
    let _cachedAlerts = [];

    function ensurePanel() {
        if (document.getElementById("sa-panel-overlay")) return;
        const overlay = document.createElement("div");
        overlay.id = "sa-panel-overlay";
        overlay.innerHTML = `
        <div id="sa-panel">
            <div id="sa-panel-header">
                <div>
                    <div id="sa-panel-title">🚨 Alertes Intelligentes</div>
                    <div id="sa-panel-sub">Analyse en temps réel</div>
                </div>
                <button id="sa-panel-close" onclick="closeSAPanel()">✕</button>
            </div>
            <div id="sa-panel-tabs">
                <div class="sa-tab active" onclick="setSATab('all')">Toutes</div>
                <div class="sa-tab" onclick="setSATab('danger')">🔴 Critiques</div>
                <div class="sa-tab" onclick="setSATab('warn')">🟡 Attention</div>
            </div>
            <div id="sa-panel-body"></div>
        </div>`;
        overlay.addEventListener("click", e => { if (e.target === overlay) closeSAPanel(); });
        document.body.appendChild(overlay);
    }

    function renderPanel(alerts) {
        ensurePanel();
        const body = document.getElementById("sa-panel-body");
        const sub  = document.getElementById("sa-panel-sub");
        if (!body) return;

        const filtered = _currentTab === "all" ? alerts
            : alerts.filter(a => a.severity === _currentTab);

        // Update tabs
        document.querySelectorAll(".sa-tab").forEach((t, i) => {
            t.classList.toggle("active", ["all", "danger", "warn"][i] === _currentTab);
        });

        if (sub) sub.textContent = `${alerts.length} alerte${alerts.length > 1 ? "s" : ""} · ${filtered.length} affichée${filtered.length > 1 ? "s" : ""}`;

        if (!filtered.length) {
            body.innerHTML = `<div style="text-align:center;padding:40px 14px;color:#9ca3af;font-size:12.5px;">
                ✅ Aucune alerte dans cette catégorie
            </div>`;
            return;
        }

        body.innerHTML = filtered.map(a => {
            const iconCls = a.severity === "danger" ? "sa-alert-icon-danger" : "sa-alert-icon-warn";
            const icon    = ICONS[a.icon] || ICONS.alert;
            return `
            <div class="sa-alert-card">
                <div class="sa-alert-top">
                    <div class="sa-alert-icon ${iconCls}">${icon}</div>
                    <div class="sa-alert-title">${esc(a.title)}</div>
                    ${a.client ? `<span class="sa-alert-client">${esc(a.client)}</span>` : ""}
                </div>
                <div class="sa-alert-details">
                    <div style="font-size:11px;font-weight:600;color:#374151;margin-bottom:3px">
                        ${esc(a.style)}
                    </div>
                    ${a.details.map(d => `
                    <div class="sa-alert-row">
                        ${ICONS.arrow} ${esc(d)}
                    </div>`).join("")}
                </div>
                <div class="sa-alert-action">
                    💡 ${esc(a.action)}
                    ${a.rowIndex ? `<button class="sa-goto-btn" onclick="saNavigateTo('${a.sheet || 'details'}',${a.rowIndex})">
                        Voir ${ICONS.arrow}
                    </button>` : ""}
                </div>
            </div>`;
        }).join("");
    }

    // ══════════════════════════════════════════════════════════
    //  BOUTON CLOCHE DANS LE HEADER
    // ══════════════════════════════════════════════════════════
    function injectBellButton() {
        if (document.getElementById("sa-bell-btn")) return;
        const headerRight = document.querySelector(".header-right");
        if (!headerRight) return;

        const btn = document.createElement("button");
        btn.id = "sa-bell-btn";
        btn.title = "Alertes intelligentes";
        btn.onclick = openSAPanel;
        btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <span id="sa-bell-count">0</span>`;

        // Insérer avant le premier enfant
        headerRight.insertBefore(btn, headerRight.firstChild);
    }

    function updateBellButton(alerts) {
        const btn   = document.getElementById("sa-bell-btn");
        const count = document.getElementById("sa-bell-count");
        if (!btn || !count) return;

        const total   = alerts.length;
        const dangers = alerts.filter(a => a.severity === "danger").length;

        if (total === 0) {
            btn.classList.remove("has-alerts", "has-danger");
        } else {
            btn.classList.add("has-alerts");
            count.textContent = total > 99 ? "99+" : total;
            if (dangers > 0) btn.classList.add("has-danger");
            else btn.classList.remove("has-danger");
        }
    }

    // ══════════════════════════════════════════════════════════
    //  API PUBLIQUE
    // ══════════════════════════════════════════════════════════
    window.openSAPanel = function() {
        ensurePanel();
        renderPanel(_cachedAlerts);
        requestAnimationFrame(() => {
            document.getElementById("sa-panel-overlay").classList.add("open");
        });
    };

    window.closeSAPanel = function() {
        const o = document.getElementById("sa-panel-overlay");
        if (o) o.classList.remove("open");
    };

    window.setSATab = function(tab) {
        _currentTab = tab;
        renderPanel(_cachedAlerts);
    };

    window.saNavigateTo = function(sheetKey, rowIndex) {
        closeSAPanel();
        if (typeof navigateToRow === "function") {
            navigateToRow(sheetKey, rowIndex);
        }
    };

    // ══════════════════════════════════════════════════════════
    //  REFRESH PRINCIPAL
    // ══════════════════════════════════════════════════════════
    function refresh() {
        if (!window.state?.data?.details?.length) return;

        _cachedAlerts = collectAlerts();

        renderKPIBar(_cachedAlerts);
        injectCardBadges(_cachedAlerts);
        updateBellButton(_cachedAlerts);

        // Rafraîchir le panneau s'il est ouvert
        const overlay = document.getElementById("sa-panel-overlay");
        if (overlay && overlay.classList.contains("open")) {
            renderPanel(_cachedAlerts);
        }
    }

    // ══════════════════════════════════════════════════════════
    //  INIT
    // ══════════════════════════════════════════════════════════
    function init() {
        injectStyles();
        injectBellButton();

        // Premier calcul dès que les données sont prêtes
        const waitForData = setInterval(() => {
            if (window.state?.data?.details?.length) {
                clearInterval(waitForData);
                refresh();

                // Recalcul périodique
                setInterval(refresh, CONFIG.refreshInterval);

                // Recalcul après chaque fetchAllData
                const _orig = window.fetchAllData;
                if (typeof _orig === "function") {
                    window.fetchAllData = async function(...args) {
                        const result = await _orig.apply(this, args);
                        setTimeout(refresh, 500);
                        return result;
                    };
                }

                // Recalcul lors du changement de vue
                const _origRenderDashboard = window.renderDashboard;
                if (typeof _origRenderDashboard === "function") {
                    window.renderDashboard = function(...args) {
                        const result = _origRenderDashboard.apply(this, args);
                        setTimeout(() => {
                            renderKPIBar(_cachedAlerts);
                            injectCardBadges(_cachedAlerts);
                        }, 100);
                        return result;
                    };
                }
            }
        }, 500);
    }

    // Démarrer après chargement du DOM
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 500);
    }

})();
