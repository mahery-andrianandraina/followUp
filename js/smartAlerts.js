// ============================================================
//  AW27 CHECKERS — Smart Alerts System
//  Fichier : smartAlerts.js
//  Charger APRÈS app.js dans index.html :
//  <script src="smartAlerts.js"></script>
//
//  v2 — Ajout : marquer une alerte comme "Faite" (✓ Fait)
//       • L'alerte disparaît des compteurs, de la cloche et des badges
//       • Mémorisée dans le navigateur (localStorage)
//       • Si la date de l'échéance change dans le Sheet, l'alerte revient
//       • Case "Afficher traitées" pour revoir / annuler
//
//  v3 — Règles de fermeture par type
//       • AUTO   (SRS Launching, Style Components) : l'alerte disparaît
//         toute seule quand la cellule / le Status passe à "In House"
//       • MANUEL (PSD, Sewing Trims, Packing Trims) : quand la cellule
//         passe à "In House", l'alerte reste en bleu "À clôturer"
//         jusqu'au clic sur « ✓ Fait »
//
//  v4 — Alertes ORDERING intelligentes (menu Ordering)
//       • Ready Date dépassée / proche (tient compte des nouvelles dates
//         annoncées dans les Comments)
//       • En transit trop longtemps
//       • PO # manquant, commande non confirmée, Ready Date manquante
//       • Reliquat / livraison partielle détecté dans les Comments
//         (balance, partial, missing, manque, reliquat…) → reste visible
//         même si "Delivered", jusqu'au clic « ✓ Fait »
//       • Risque PSD : trim pas livré à temps pour la PSD du style (Details)
//       • Artwork en attente / rejeté
//       • Les lignes d'un même PO + trim + fournisseur sont regroupées
//  Correctif : les dates ISO du Sheet (…T21:00:00.000Z) sont lues en heure
//  locale (avant : décalage d'un jour).
// ============================================================

(function initSmartAlerts() {

    // ── Config ──────────────────────────────────────────────
    const CONFIG = {
        exFtyWarningDays:  14,    // alerte si Ex-Fty dans moins de X jours
        exFtyDangerDays:   7,     // alerte rouge si Ex-Fty dans moins de X jours
        refreshInterval:   60000, // recalcul toutes les 60s
        doneStorageKey:    "aw27_sa_done_v1", // clé localStorage des alertes traitées
        doneRetentionDays: 90,    // on oublie les alertes traitées après X jours
        seenStorageKey:    "aw27_sa_seen_v1", // mémoire des alertes déjà vues (types manuels)

        // Types qui ne disparaissent JAMAIS tout seuls : clic « ✓ Fait » obligatoire
        manualTypes: ["psd_alert", "sewing_alert", "packing_alert", "ord_partial"],
        // Les autres types (srs_alert, sc_due_date) se ferment automatiquement
        // quand la valeur passe à "In House".

        // ── Réglages alertes Ordering ──
        ordering: {
            enabled:          true,
            sheetKey:         "ordering", // clé utilisée par navigateToRow()
            slashDateOrder:   "MDY",      // dates "11/30/2026" du Sheet Ordering = mois/jour/année
            readySoonDays:    3,          // Ready Date dans ≤ X jours → Attention
            transitWarnDays:  7,          // en transit depuis > X jours après Ready Date → Attention
            transitDangerDays:14,         // … > X jours → Critique
            noPoAfterDays:    2,          // PO Date passée depuis X jours sans PO # → alerte
            unconfirmedWarn:  2,          // pas de Status "Confirmed" X jours après PO Date → Attention
            unconfirmedDanger:5,          // … X jours → Critique
            noReadyAfterDays: 3,          // Confirmed mais pas de Ready Date après X jours
            psdHorizonDays:   21,         // on surveille les PSD dans les X prochains jours
            psdBufferDays:    3,          // le trim doit arriver au moins X jours avant la PSD
            psdDangerDays:    7,          // PSD dans ≤ X jours → Critique
            ignoreStatus:     ["cancel", "annul"], // lignes ignorées si Status contient…
            partialKeywords:  ["balance", "partial", "partiel", "partielle", "missing",
                               "manque", "manquant", "manquante", "reliquat",
                               "remaining", "solde", "short"]
        }
    };

    function isManualType(type) {
        return CONFIG.manualTypes.includes(type);
    }

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
        .sa-done-btn {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 4px 10px; border-radius: 6px;
            border: 1px solid #a7f3d0; background: #ecfdf5; color: #047857;
            font-size: 10.5px; font-weight: 600; cursor: pointer;
            font-family: inherit; font-style: normal;
            float: right; margin-top: 4px; margin-left: 6px;
            transition: background .12s;
        }
        .sa-done-btn:hover { background: #d1fae5; }

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

        /* ── Table Modal ── */
        .sat-row:nth-child(even) { background-color: #f9fafb; }
        .sat-row:hover { background-color: #f3f4f6; }
        .sat-row-done { opacity: .55; }
        .sat-row-done:hover { opacity: .85; }
        .sat-cell {
            padding: 10px 16px; border-bottom: 1px solid #e5e7eb;
            color: #374151; font-size: 12.5px; vertical-align: middle;
            line-height: 1.4;
        }
        .sat-badge-danger {
            background-color: #fee2e2; color: #dc2626; padding: 2px 8px;
            border-radius: 20px; font-size: 11px; font-weight: 600; display: inline-block;
        }
        .sat-badge-warn {
            background-color: #fef3c7; color: #b45309; padding: 2px 8px;
            border-radius: 20px; font-size: 11px; font-weight: 600; display: inline-block;
        }
        .sat-badge-info {
            background-color: #dbeafe; color: #1d4ed8; padding: 2px 8px;
            border-radius: 20px; font-size: 11px; font-weight: 600; display: inline-block;
        }
        .sat-badge-done {
            background-color: #e5e7eb; color: #374151; padding: 2px 8px;
            border-radius: 20px; font-size: 11px; font-weight: 600; display: inline-block;
        }
        .sat-done-date {
            display: block; font-size: 10px; color: #6b7280; margin-top: 3px;
        }
        .sat-style-link {
            font-weight: 600; color: #1d4ed8; text-decoration: none; cursor: pointer;
        }
        .sat-style-link:hover { text-decoration: underline; }
        .sat-goto-btn {
            background: #eff6ff; color: #1d4ed8; border: none; padding: 4px 10px;
            border-radius: 6px; font-size: 11.5px; font-weight: 600; cursor: pointer;
            transition: background 0.15s; display: inline-flex; align-items: center; gap: 4px;
            font-family: inherit;
        }
        .sat-goto-btn:hover { background: #dbeafe; }
        .sat-done-btn {
            background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;
            padding: 4px 10px; border-radius: 6px; font-size: 11.5px; font-weight: 600;
            cursor: pointer; transition: background 0.15s; font-family: inherit;
            display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;
        }
        .sat-done-btn:hover { background: #d1fae5; }
        .sat-undo-btn {
            background: #f3f4f6; color: #374151; border: 1px solid #d1d5db;
            padding: 4px 10px; border-radius: 6px; font-size: 11.5px; font-weight: 600;
            cursor: pointer; transition: background 0.15s; font-family: inherit;
            display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;
        }
        .sat-undo-btn:hover { background: #e5e7eb; }
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

    // Normalise un texte pour construire une clé stable
    function normKey(v) {
        return String(v || "").replace(/[\s\-_]/g, "").toLowerCase();
    }

    function toast(msg, type) {
        if (typeof showToast === "function") showToast(msg, type || "success");
    }

    // "In House", "in house", "INHOUSE"… → true
    function isInHouse(val) {
        return String(val || "").trim().toLowerCase().replace(/\s/g, "") === "inhouse";
    }

    // Valeur "terminée" pour une échéance commitment / PSD :
    // "In House", "ALL OK", "All OK - 2026-12-09"… → true
    function isClosedValue(val) {
        const v = String(val || "").trim().toLowerCase().replace(/\s/g, "");
        return v.startsWith("inhouse") || v.startsWith("allok");
    }

    function today0() {
        const t = new Date(); t.setHours(0, 0, 0, 0); return t;
    }

    function diffDays(d) {
        if (!d) return null;
        const x = new Date(d); x.setHours(0, 0, 0, 0);
        return Math.round((x - today0()) / 86400000);
    }

    // Parser de date commun.
    // order = "DMY" ou "MDY" pour les dates avec slash ambiguës (ex. 02/03/2026)
    function parseDate(val, order) {
        if (val === null || val === undefined || val === "") return null;
        if (val instanceof Date) return isNaN(val) ? null : new Date(val.getFullYear(), val.getMonth(), val.getDate());
        const s = String(val).trim();
        // Texte de statut ("In House", "ALL OK", "All OK - date", "TBC"…) → pas une date
        if (!s || /invalid/i.test(s) || isClosedValue(s)) return null;

        // ISO complet avec heure (…T21:00:00.000Z) → lire en heure locale
        if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
            const d = new Date(s);
            return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
        }
        // YYYY-MM-DD
        const m1 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (m1) return new Date(+m1[1], +m1[2] - 1, +m1[3]);
        // a/b/yyyy
        const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (m2) {
            let a = +m2[1], b = +m2[2], y = +m2[3];
            if (y < 100) y += 2000;
            let day, month;
            if (a > 12)      { day = a; month = b; }
            else if (b > 12) { day = b; month = a; }
            else if ((order || "DMY") === "MDY") { month = a; day = b; }
            else             { day = a; month = b; }
            return new Date(y, month - 1, day);
        }
        // Dernier recours : seulement si le texte ressemble à une date
        // (évite que "Waiting 2026-12-09" ou "OK 09/12" soit pris pour une date)
        if (/^[a-z]{3,9}\.?\s+\d{1,2},?\s+\d{4}$/i.test(s) || /^\d{1,2}[\s\-][a-z]{3,9}[\s\-]\d{2,4}$/i.test(s)) {
            const d = new Date(s);
            return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
        }
        return null;
    }

    // ── Lecture des dates écrites dans les commentaires ─────
    // Comprend : "30-Nov", "Nov.20", "30th nov", "25/11", "02/12", "20 novembre"
    const MONTH_WORDS = {
        jan:0, janv:0, janvier:0, january:0,
        feb:1, february:1, fev:1, fevr:1, fevrier:1,
        mar:2, mars:2, march:2,
        apr:3, april:3, avr:3, avril:3,
        may:4, mai:4,
        jun:5, june:5, juin:5,
        jul:6, july:6, juil:6, juillet:6,
        aug:7, august:7, aou:7, aout:7,
        sep:8, sept:8, september:8, septembre:8,
        oct:9, october:9, octobre:9,
        nov:10, november:10, novembre:10,
        dec:11, december:11, decembre:11
    };

    function monthIndex(word) {
        const w = String(word || "").toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\./g, "");
        return Object.prototype.hasOwnProperty.call(MONTH_WORDS, w) ? MONTH_WORDS[w] : null;
    }

    // Choisit l'année la plus proche d'aujourd'hui (± 6 mois)
    function nearYear(month, day) {
        const t = today0();
        let d = new Date(t.getFullYear(), month, day);
        if ((d - t) / 86400000 > 183)  d = new Date(t.getFullYear() - 1, month, day);
        if ((t - d) / 86400000 > 183)  d = new Date(t.getFullYear() + 1, month, day);
        return d;
    }

    function parseCommentDates(text) {
        let src = String(text || "");
        const found = [];
        const mask = (m) => { src = src.slice(0, m.index) + " ".repeat(m[0].length) + src.slice(m.index + m[0].length); };
        const validDay = n => n >= 1 && n <= 31;

        // A) 30-Nov, 30th nov, 20 novembre
        const reA = /(\d{1,2})(?:st|nd|rd|th|er)?[\s\-\.]*([a-zA-Z\u00C0-\u00FF]{3,9})\.?/g;
        let m;
        while ((m = reA.exec(src)) !== null) {
            const mi = monthIndex(m[2]); const d = +m[1];
            if (mi !== null && validDay(d)) { found.push(nearYear(mi, d)); mask(m); }
        }
        // B) Nov.20, Nov 20
        const reB = /([a-zA-Z\u00C0-\u00FF]{3,9})[\s\.\-]*(\d{1,2})(?!\d)/g;
        while ((m = reB.exec(src)) !== null) {
            const mi = monthIndex(m[1]); const d = +m[2];
            if (mi !== null && validDay(d)) { found.push(nearYear(mi, d)); mask(m); }
        }
        // C) 25/11 ou 25/11/2026 (jour/mois dans les commentaires)
        const reC = /(^|[^\d\/])(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?![\d\/])/g;
        while ((m = reC.exec(src)) !== null) {
            const d = +m[2], mo = +m[3];
            if (!validDay(d) || mo < 1 || mo > 12) continue;
            if (m[4]) { let y = +m[4]; if (y < 100) y += 2000; found.push(new Date(y, mo - 1, d)); }
            else found.push(nearYear(mo - 1, d));
        }
        return found;
    }

    function maxDate(list) {
        return list.length ? new Date(Math.max(...list.map(d => d.getTime()))) : null;
    }

    // ══════════════════════════════════════════════════════════
    //  MÉMOIRE DES ALERTES VUES (types manuels uniquement)
    //  Format : { "<type>|<style>": { date: "<échéance>", at: <ts>, closed: bool } }
    //  Sert à savoir qu'un style ÉTAIT en alerte avant de passer
    //  "In House" → on affiche alors "À clôturer" au lieu de l'effacer.
    // ══════════════════════════════════════════════════════════
    let _seenMap = {};

    function loadSeen() {
        let map = {};
        try {
            const raw = localStorage.getItem(CONFIG.seenStorageKey);
            if (raw) map = JSON.parse(raw) || {};
        } catch (_) { map = {}; }
        const limit = Date.now() - CONFIG.doneRetentionDays * 86400000;
        Object.keys(map).forEach(k => {
            if (!map[k] || !map[k].at || map[k].at < limit) delete map[k];
        });
        _seenMap = map;
        return _seenMap;
    }

    function saveSeen() {
        try { localStorage.setItem(CONFIG.seenStorageKey, JSON.stringify(_seenMap)); }
        catch (_) { /* stockage indisponible */ }
    }

    // Enregistre qu'un style est en alerte pour une échéance donnée
    function rememberSeen(group, dateRaw) {
        const prev = _seenMap[group];
        if (prev && prev.date === dateRaw) {
            prev.at = Date.now();           // même échéance : on garde l'état "closed"
        } else {
            _seenMap[group] = { date: dateRaw, at: Date.now(), closed: false }; // nouvelle échéance
        }
    }

    // ══════════════════════════════════════════════════════════
    //  MÉMOIRE DES ALERTES TRAITÉES (localStorage)
    //  Format : { "<clé alerte>": { at: <timestamp>, title: "..." } }
    //  La clé contient la date d'échéance → si la date change dans
    //  le Sheet, c'est une nouvelle alerte et elle réapparaît.
    // ══════════════════════════════════════════════════════════
    let _doneMap = {};

    function loadDone() {
        let map = {};
        try {
            const raw = localStorage.getItem(CONFIG.doneStorageKey);
            if (raw) map = JSON.parse(raw) || {};
        } catch (_) { map = {}; }

        // Purge des entrées trop anciennes
        const limit = Date.now() - CONFIG.doneRetentionDays * 86400000;
        let changed = false;
        Object.keys(map).forEach(k => {
            if (!map[k] || !map[k].at || map[k].at < limit) { delete map[k]; changed = true; }
        });
        _doneMap = map;
        if (changed) saveDone();
        return _doneMap;
    }

    function saveDone() {
        try { localStorage.setItem(CONFIG.doneStorageKey, JSON.stringify(_doneMap)); }
        catch (_) { /* stockage indisponible : on garde en mémoire pour la session */ }
    }

    function markDone(alert) {
        if (!alert || !alert.key) return;
        _doneMap[alert.key] = { at: Date.now(), title: alert.title };
        saveDone();
        // Type manuel : on ferme le suivi du style → pas de "À clôturer" plus tard
        if (alert.group && _seenMap[alert.group]) {
            _seenMap[alert.group].closed = true;
            _seenMap[alert.group].at = Date.now();
            saveSeen();
        }
    }

    function unmarkDone(alert) {
        if (!alert || !alert.key) return;
        delete _doneMap[alert.key];
        saveDone();
        if (alert.group && _seenMap[alert.group]) {
            _seenMap[alert.group].closed = false;
            _seenMap[alert.group].at = Date.now();
            saveSeen();
        }
    }

    // ══════════════════════════════════════════════════════════
    //  COLLECTE DES ALERTES — COMMITMENTS PSD
    // ══════════════════════════════════════════════════════════
    function collectAlerts() {
        const st      = window.state?.data || {};
        const details = st.details || [];
        const alerts  = [];

        // Parser de date robuste (DD/MM/YYYY, YYYY-MM-DD, ISO, texte)
        function parseCommitDate(val) {
            return parseDate(val, "DMY");
        }

        const COMMIT_FIELDS = [
            { key: "PSD",          label: "PSD",           type: "psd_alert"     },
            { key: "SRS_Launching",label: "SRS Launching", type: "srs_alert"     },
            { key: "Sewing_Trims", label: "Sewing Trims",  type: "sewing_alert"  },
            { key: "Packing_Trims",label: "Packing Trims", type: "packing_alert" }
        ];

        details.forEach(row => {
            const styleCode = String(row["Cust Style Ref"] || row.Style || "").trim();
            const client    = String(row.Client || row["Coll"] || "").trim();
            if (!styleCode) return;

            COMMIT_FIELDS.forEach(field => {
                const raw    = String(row[field.key] || "").trim();
                const manual = isManualType(field.type);
                const group  = `${field.type}|${normKey(styleCode)}`;
                if (!raw) return;

                if (isClosedValue(raw)) {
                    // AUTO : In House / ALL OK → l'alerte disparaît toute seule
                    if (!manual) return;

                    // MANUEL : si ce style était en alerte et pas encore clôturé,
                    // on affiche "À clôturer" jusqu'au clic « ✓ Fait »
                    const seen = _seenMap[group];
                    if (!seen || seen.closed) return;

                    alerts.push({
                        key:      `${group}|inhouse|${normKey(seen.date)}`,
                        group,
                        type:     field.type,
                        severity: "info",
                        style:    styleCode,
                        client,
                        title:    `${styleCode} — ${field.label} ${/^all\s*ok/i.test(raw) ? "ALL OK" : "In House"} · à clôturer`,
                        details:  [
                            `Échéance suivie : ${fmtDate(parseCommitDate(seen.date) || seen.date)}`,
                            `✅ Passé « ${raw} » dans le Sheet`
                        ],
                        action:   `Vérifier ${field.label} puis cliquer « ✓ Fait » pour clôturer`,
                        icon:     "check",
                        rowIndex: row._rowIndex,
                        sheet:    "details"
                    });
                    return;
                }

                const d = parseCommitDate(raw);
                if (!d) return;

                const today = new Date(); today.setHours(0,0,0,0);
                d.setHours(0,0,0,0);
                const diff = Math.round((d - today) / 86400000);

                if (diff > 3) return; // Plus de 3 jours → pas d'alerte

                if (manual) rememberSeen(group, raw);

                const isPast  = diff < 0;
                const isToday = diff === 0;

                const severity = isPast ? "danger" : "warn";
                const diffStr  = isPast
                    ? `${Math.abs(diff)}j de retard`
                    : isToday ? "Aujourd'hui !"
                    : `dans ${diff}j`;

                alerts.push({
                    key:      `${group}|${normKey(raw)}`,
                    group:    manual ? group : null,
                    type:     field.type,
                    severity,
                    style:    styleCode,
                    client,
                    title:    `${styleCode} — ${field.label} ${diffStr}`,
                    details:  [
                        `${field.label} : ${fmtDate(d)}`,
                        isPast ? "⚠️ Date dépassée — action urgente requise"
                               : isToday ? "🔔 Échéance aujourd'hui"
                               : `📅 Échéance dans ${diff} jour${diff > 1 ? "s" : ""}`
                    ],
                    action:   isPast
                        ? `Traiter ${field.label} immédiatement (${Math.abs(diff)}j de retard)`
                        : `Préparer ${field.label} avant le ${fmtDate(d)}`,
                    icon:     isPast ? "alert" : "clock",
                    rowIndex: row._rowIndex,
                    sheet:    "details"
                });
            });
        });

        saveSeen();

        // ── Alertes Style Components : Due Date par composant (AUTO) ───
        const scRows = st.style_components || [];
        scRows.forEach(row => {
            const styleRef  = String(row["Cust Style Ref"] || row["CTL Style Ref"] || "").trim();
            const composant = String(row["Composant"]   || "").trim();
            const status    = String(row["Status"]      || "").trim().toLowerCase();
            const dueRaw    = String(row["Due Date"]    || "").trim();

            if (!dueRaw || !composant) return;
            if (isInHouse(status)) return; // AUTO : In House → l'alerte disparaît

            const d = parseCommitDate(dueRaw);
            if (!d) return;

            const today = new Date(); today.setHours(0,0,0,0);
            d.setHours(0,0,0,0);
            const diff = Math.round((d - today) / 86400000);

            if (diff > 7) return; // Plus de 7 jours → pas d'alerte

            const isPast  = diff < 0;
            const isToday = diff === 0;
            const severity = isPast || diff <= 3 ? "danger" : "warn";

            const diffStr = isPast    ? `${Math.abs(diff)}j de retard`
                          : isToday   ? "Aujourd'hui !"
                          : `dans ${diff}j`;

            alerts.push({
                key:      `sc_due_date|${normKey(styleRef)}|${normKey(composant)}|${normKey(dueRaw)}`,
                type:     "sc_due_date",
                severity,
                style:    styleRef,
                client:   "",
                title:    `${styleRef} — ${composant} : Due Date ${diffStr}`,
                details:  [
                    `Composant : ${composant}`,
                    `Statut actuel : ${row["Status"] || "—"}`,
                    isPast
                        ? `⚠️ Due Date dépassée de ${Math.abs(diff)} jour${Math.abs(diff)>1?"s":""}`
                        : `📅 Due Date : ${fmtDate(d)}`
                ],
                action: isPast
                    ? `Vérifier ${composant} immédiatement — ${Math.abs(diff)}j de retard`
                    : `Relancer fournisseur pour ${composant} avant ${fmtDate(d)}`,
                icon:     isPast ? "alert" : "clock"
            });
        });

        // ── Alertes Ordering intelligentes ───
        if (CONFIG.ordering.enabled) {
            collectOrderingAlerts(st).forEach(a => alerts.push(a));
            saveSeen();
        }

        // Trier : danger d'abord, puis warn
        return alerts.sort((a, b) => {
            const order = { danger: 0, warn: 1, info: 2 };
            const s = (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
            if (s) return s;
            return (a.urgency ?? 0) - (b.urgency ?? 0); // le plus en retard d'abord
        });
    }

    // ══════════════════════════════════════════════════════════
    //  ALERTES ORDERING — moteur intelligent
    // ══════════════════════════════════════════════════════════
    function collectOrderingAlerts(st) {
        const C      = CONFIG.ordering;
        const rows   = st.ordering || [];
        const alerts = [];
        if (!rows.length) return alerts;

        const pd  = v => parseDate(v, C.slashDateOrder);
        const low = v => String(v || "").trim().toLowerCase();

        // PSD par style depuis Details (CTLStyleRef ↔ Style, Cust Style Ref ↔ Description)
        // PSD "In House" / "ALL OK" → pas de risque, le style est ignoré
        const psdByStyle = {};
        (st.details || []).forEach(r => {
            if (isClosedValue(r.PSD)) return;
            const psd = parseDate(r.PSD, "DMY");
            if (!psd) return;
            const info = { psd, cust: String(r["Cust Style Ref"] || "").trim(), ctl: String(r.CTLStyleRef || r["CTL Style Ref"] || "").trim() };
            [info.ctl, info.cust].forEach(k => { if (k) psdByStyle[normKey(k)] = info; });
        });

        // 1) Regrouper les lignes : même PO + même trim + même fournisseur
        const groups = {};
        rows.forEach(r => {
            const trim     = String(r.Trims || "").trim();
            const ctl      = String(r.Style || "").trim();
            const cust     = String(r.Description || "").trim();
            if (!trim && !ctl && !cust) return;
            if (C.ignoreStatus.some(w => low(r.Status).includes(w))) return;

            const po       = String(r["PO #"] || "").trim();
            const supplier = String(r.Supplier || "").trim();
            const poDateK  = po ? "" : normKey(r["PO Date"]);
            const gk = `${normKey(po) || "nopo" + poDateK}|${normKey(trim)}|${normKey(supplier)}`;

            if (!groups[gk]) {
                groups[gk] = {
                    gk, po, trim, supplier,
                    client:    String(r.Client || "").trim(),
                    poDate:    pd(r["PO Date"]),
                    ready:     pd(r["Ready Date"]),
                    status:    String(r.Status || "").trim(),
                    delivery:  String(r["Delivery Status"] || "").trim(),
                    comment:   String(r.Comments || "").trim(),
                    pi:        String(r.PI || r["PI URL"] || "").trim(),
                    awUrl:     String(r["Artwork Original URL"] || "").trim(),
                    awAppr:    String(r["Artwork Approval."] || r["Artwork Approval"] || "").trim(),
                    rowIndex:  r._rowIndex,
                    styles:    [], ctls: []
                };
            }
            const g = groups[gk];
            // Ready Date la plus tardive du groupe
            const rd = pd(r["Ready Date"]);
            if (rd && (!g.ready || rd > g.ready)) g.ready = rd;
            // Confirmée si au moins une ligne est confirmée
            if (String(r.Status || "").toLowerCase().includes("confirm")) g.status = String(r.Status).trim();
            // Fusion des commentaires différents
            const cm = String(r.Comments || "").trim();
            if (cm && !g.comment.includes(cm)) g.comment = g.comment ? `${g.comment} | ${cm}` : cm;
            if (!g.awAppr && (r["Artwork Approval."] || r["Artwork Approval"])) g.awAppr = String(r["Artwork Approval."] || r["Artwork Approval"]).trim();
            if (!g.awUrl && r["Artwork Original URL"]) g.awUrl = String(r["Artwork Original URL"]).trim();
            if (cust && !g.styles.includes(cust)) g.styles.push(cust);
            if (ctl  && !g.ctls.includes(ctl))    g.ctls.push(ctl);
            // si une ligne du groupe n'est pas livrée, le groupe n'est pas livré
            if (low(r["Delivery Status"]) !== "delivered") g.delivery = String(r["Delivery Status"] || "").trim();
        });

        Object.values(groups).forEach(g => {
            const delivered  = low(g.delivery) === "delivered";
            const inTransit  = low(g.delivery).includes("transit");
            const confirmed  = low(g.status).includes("confirm");
            const label      = `${g.trim || "Trim"}${g.supplier ? " (" + g.supplier + ")" : ""}`;
            const poLabel    = g.po ? `PO ${g.po}` : "Sans PO #";
            const styleTxt   = g.styles.length ? g.styles[0] + (g.styles.length > 1 ? ` +${g.styles.length - 1}` : "") : (g.ctls[0] || "—");
            const stylesList = g.styles.length > 1 ? `Styles : ${g.styles.join(", ")}` : null;
            const readyDiff  = diffDays(g.ready);
            const poAge      = g.poDate ? -diffDays(g.poDate) : null;
            const commentDates = parseCommentDates(g.comment);
            const commentNext  = maxDate(commentDates.filter(d => diffDays(d) >= 0)); // prochaine date annoncée
            const commentLine  = g.comment ? `💬 ${g.comment.replace(/\s+/g, " ").slice(0, 120)}` : null;

            const base = (type, severity, title, details, action, icon, urgency, extraKey) => ({
                key:      `${type}|${g.gk}${extraKey ? "|" + extraKey : ""}`,
                group:    isManualType(type) ? `${type}|${g.gk}` : null,
                type, severity,
                style:    styleTxt,
                styles:   g.styles.concat(g.ctls),
                client:   g.client,
                title:    `${poLabel} · ${label} — ${title}`,
                details:  details.filter(Boolean),
                action, icon,
                urgency:  urgency ?? 0,
                rowIndex: g.rowIndex,
                sheet:    C.sheetKey
            });

            // ── A) Reliquat / livraison partielle (MANUEL, même si Delivered) ──
            const kwRe = new RegExp(`\\b(${C.partialKeywords.join("|")})\\b`, "gi");
            const kwMatches = [...g.comment.matchAll(kwRe)];
            const partialGroup = `ord_partial|${g.gk}`;
            if (kwMatches.length) {
                const lastKw   = kwMatches[kwMatches.length - 1];
                const after    = g.comment.slice(lastKw.index);
                const balDate  = maxDate(parseCommentDates(after));
                const tbc      = !balDate;
                const bDiff    = balDate ? diffDays(balDate) : null;
                const dateKey  = balDate ? balDate.toISOString().slice(0, 10) : "tbc";
                rememberSeen(partialGroup, dateKey);
                if (!_seenMap[partialGroup].closed) {
                    const sev = bDiff !== null && bDiff < 0 ? "danger" : "warn";
                    alerts.push(base("ord_partial", sev,
                        tbc ? "Reliquat sans date"
                            : bDiff < 0 ? `Reliquat en retard de ${-bDiff}j`
                            : bDiff === 0 ? "Reliquat attendu aujourd'hui"
                            : `Reliquat attendu dans ${bDiff}j`,
                        [
                            `Mot-clé détecté : « ${lastKw[0]} »${delivered ? " · ligne marquée Delivered" : ""}`,
                            balDate ? `📅 Reliquat annoncé : ${fmtDate(balDate)}` : "❓ Aucune date de reliquat (TBC)",
                            stylesList, commentLine
                        ],
                        tbc ? "Demander au fournisseur la date du reliquat"
                            : bDiff < 0 ? "Relancer le fournisseur : reliquat non reçu"
                            : `Vérifier la réception du reliquat le ${fmtDate(balDate)}`,
                        bDiff !== null && bDiff < 0 ? "alert" : "clock",
                        bDiff ?? 0, dateKey));
                }
            } else {
                // Plus de mot-clé dans le commentaire : si l'alerte avait été vue
                // et pas clôturée → "À clôturer" (règle livraison : reste visible)
                const seen = _seenMap[partialGroup];
                if (seen && !seen.closed) {
                    alerts.push(base("ord_partial", "info", "Reliquat · à clôturer",
                        ["✅ Le commentaire ne mentionne plus de reliquat", stylesList, commentLine],
                        "Vérifier la réception complète puis cliquer « ✓ Fait »",
                        "check", 0, "done|" + seen.date));
                }
            }

            if (delivered) return; // les autres règles ne concernent que le non-livré

            // ── B) Commande non confirmée ──
            if (!confirmed && poAge !== null && poAge >= C.unconfirmedWarn) {
                alerts.push(base("ord_not_confirmed", poAge >= C.unconfirmedDanger ? "danger" : "warn",
                    `Non confirmée depuis ${poAge}j`,
                    [`PO Date : ${fmtDate(g.poDate)}`, `Status actuel : ${g.status || "vide"}`, stylesList, commentLine],
                    "Relancer le fournisseur pour confirmation (PI / Ready Date)",
                    "alert", -poAge));
            }

            // ── C) PO # manquant ──
            if (!g.po && poAge !== null && poAge >= C.noPoAfterDays) {
                alerts.push(base("ord_no_po", "warn", "PO # manquant",
                    [`Commande saisie le ${fmtDate(g.poDate)} sans numéro de PO`, stylesList, commentLine],
                    "Renseigner le PO # dans Ordering",
                    "alert", -poAge));
            }

            // ── D) Ready Date manquante ──
            if (confirmed && !g.ready && poAge !== null && poAge >= C.noReadyAfterDays) {
                alerts.push(base("ord_no_ready", "warn", "Ready Date manquante",
                    [`Confirmée mais sans Ready Date (PO du ${fmtDate(g.poDate)})`, stylesList, commentLine],
                    "Demander la Ready Date au fournisseur",
                    "clock", -poAge));
            }

            // ── E) Ready Date dépassée / proche (hors transit) ──
            if (g.ready && !inTransit && readyDiff !== null) {
                const newDate = commentNext && g.ready && commentNext > g.ready ? commentNext : null;
                if (readyDiff < 0) {
                    alerts.push(base("ord_ready_late", newDate ? "warn" : "danger",
                        `Ready Date dépassée de ${-readyDiff}j`,
                        [`Ready Date : ${fmtDate(g.ready)} · pas encore expédié`,
                         newDate ? `🔄 Nouvelle date annoncée en commentaire : ${fmtDate(newDate)}` : "Aucune nouvelle date dans les commentaires",
                         stylesList, commentLine],
                        newDate ? `Suivre la nouvelle date (${fmtDate(newDate)}) et mettre à jour la Ready Date`
                                : "Relancer le fournisseur : statut d'expédition ?",
                        "alert", readyDiff));
                } else if (readyDiff <= C.readySoonDays) {
                    alerts.push(base("ord_ready_soon", "warn",
                        readyDiff === 0 ? "Ready aujourd'hui" : `Ready dans ${readyDiff}j`,
                        [`Ready Date : ${fmtDate(g.ready)}`, stylesList, commentLine],
                        "Confirmer l'expédition / l'enlèvement avec le fournisseur",
                        "clock", readyDiff));
                }
            }

            // ── F) En transit trop longtemps ──
            if (inTransit && g.ready && readyDiff !== null && -readyDiff > C.transitWarnDays) {
                const eta = commentNext;
                alerts.push(base("ord_transit_long", -readyDiff > C.transitDangerDays && !eta ? "danger" : "warn",
                    `En transit depuis ~${-readyDiff}j`,
                    [`Ready Date : ${fmtDate(g.ready)}`,
                     eta ? `📅 Date annoncée en commentaire : ${fmtDate(eta)}` : "Aucune ETA dans les commentaires",
                     stylesList, commentLine],
                    eta ? `Vérifier l'arrivée prévue le ${fmtDate(eta)}` : "Demander AWB / ETA au transitaire",
                    "ship", readyDiff));
            }

            // ── G) Risque PSD (croisement avec Details) ──
            const atRisk = [];
            g.ctls.concat(g.styles).forEach(k => {
                const info = psdByStyle[normKey(k)];
                if (!info || atRisk.some(x => x.info === info)) return;
                const psdDiff = diffDays(info.psd);
                if (psdDiff > C.psdHorizonDays) return;
                const expected = (commentNext && (!g.ready || commentNext > g.ready)) ? commentNext : g.ready;
                const limit    = new Date(info.psd); limit.setDate(limit.getDate() - C.psdBufferDays);
                const risk = !expected
                          || expected > limit
                          || (inTransit && psdDiff <= C.psdDangerDays)
                          || (!inTransit && readyDiff !== null && readyDiff < 0);
                if (risk) atRisk.push({ info, psdDiff, expected });
            });
            if (atRisk.length) {
                atRisk.sort((a, b) => a.psdDiff - b.psdDiff);
                const first = atRisk[0];
                alerts.push(base("ord_psd_risk", first.psdDiff <= C.psdDangerDays ? "danger" : "warn",
                    first.psdDiff < 0 ? `PSD dépassée, trim non livré`
                                      : `Risque PSD dans ${first.psdDiff}j`,
                    [
                        ...atRisk.map(x => `${x.info.cust || x.info.ctl} : PSD ${fmtDate(x.info.psd)}`),
                        first.expected ? `Arrivée trim estimée : ${fmtDate(first.expected)}${inTransit ? " (en transit)" : ""}`
                                       : "Pas de date d'arrivée connue",
                        `Marge souhaitée : ${C.psdBufferDays}j avant PSD`,
                        commentLine
                    ],
                    "Sécuriser la livraison (express / partiel) ou alerter la production",
                    "alert", first.psdDiff - 100, atRisk.map(x => fmtDate(x.info.psd)).join(",")));
            }

            // ── H) Artwork en attente / rejeté ──
            if (g.awUrl) {
                const aw = low(g.awAppr);
                if (aw.includes("reject") || aw.includes("refus")) {
                    alerts.push(base("ord_artwork", "danger", "Artwork rejeté",
                        [`Approbation : ${g.awAppr}`, stylesList],
                        "Corriger l'artwork et renvoyer pour approbation", "alert", -50));
                } else if (!aw.includes("approv") && !aw.includes("ok")) {
                    alerts.push(base("ord_artwork", readyDiff !== null && readyDiff <= C.readySoonDays ? "danger" : "warn",
                        "Artwork en attente d'approbation",
                        [`Approbation : ${g.awAppr || "vide"}`, g.ready ? `Ready Date : ${fmtDate(g.ready)}` : null, stylesList],
                        "Relancer l'approbation client (via N+1)", "clock", readyDiff ?? 0));
                }
            }
        });

        return alerts;
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
        const today    = new Date(); today.setHours(0,0,0,0);

        // Calculs KPIs
        const totalStyles     = details.length;
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
                cls: dangerAlerts > 0 ? "sa-kpi-danger" : (warnAlerts > 0 ? "sa-kpi-warn" : (alerts.length ? "sa-kpi-blue" : "sa-kpi-green")),
                icon: "🚨",
                val: alerts.length,
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
            const keys = (a.styles && a.styles.length) ? a.styles : [a.style];
            keys.forEach(k => {
                const nk = normKey(k);
                if (!nk) return;
                if (!byStyle[nk]) byStyle[nk] = [];
                byStyle[nk].push(a);
            });
        });

        document.querySelectorAll(".dbs-sc").forEach(card => {
            const styleCode = card.dataset.styleRaw || card.dataset.style || "";

            // Chercher les alertes pour ce style
            const cardAlerts = byStyle[normKey(styleCode)];

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
                badge.innerHTML = ICONS[a.icon] + esc(a.shortTitle || _shortTitle(a.type));
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
        return TYPE_LABELS[type] || type;
    }

    // ══════════════════════════════════════════════════════════
    //  ÉTAT GLOBAL DES ALERTES
    // ══════════════════════════════════════════════════════════
    let _currentTab   = "all";
    let _allAlerts    = [];  // toutes les alertes calculées (actives + traitées)
    let _cachedAlerts = [];  // alertes actives uniquement (non traitées)
    let _panelRows    = [];  // alertes affichées dans le panneau (pour les boutons)
    let _tableRows    = [];  // alertes affichées dans le tableau (pour les boutons)

    // Sépare actives / traitées selon la mémoire localStorage
    function applyDoneFilter() {
        _allAlerts.forEach(a => {
            const d = _doneMap[a.key];
            a.done   = !!d;
            a.doneAt = d ? d.at : null;
        });
        _cachedAlerts = _allAlerts.filter(a => !a.done);
    }

    // Redessine tout ce qui dépend des alertes actives
    function rerenderAll() {
        renderKPIBar(_cachedAlerts);
        injectCardBadges(_cachedAlerts);
        updateBellButton(_cachedAlerts);

        const panel = document.getElementById("sa-panel-overlay");
        if (panel && panel.classList.contains("open")) renderPanel(_cachedAlerts);

        const table = document.getElementById("sa-table-modal-overlay");
        if (table && table.classList.contains("open")) satRenderTable();
    }

    // ══════════════════════════════════════════════════════════
    //  PANNEAU LATÉRAL ALERTES
    // ══════════════════════════════════════════════════════════
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
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button id="sa-panel-table-btn" onclick="openSATableModal()" title="Vue Tableau & Export Excel" style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; color: #1d4ed8; font-family: inherit; transition: background .12s;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'">
                        📊 Tableau
                    </button>
                    <button id="sa-panel-close" onclick="closeSAPanel()">✕</button>
                </div>
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
        _panelRows = filtered;

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

        body.innerHTML = filtered.map((a, i) => {
            const iconCls = a.severity === "danger" ? "sa-alert-icon-danger"
                          : a.severity === "warn"   ? "sa-alert-icon-warn"
                          : "sa-alert-icon-info";
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
                    <button class="sa-done-btn" onclick="saPanelMarkDone(${i})" title="Marquer comme traitée">✓ Fait</button>
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
        window.openSATableModal();
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

    // ✓ Fait depuis le panneau latéral
    window.saPanelMarkDone = function(i) {
        const a = _panelRows[i];
        if (!a) return;
        markDone(a);
        applyDoneFilter();
        rerenderAll();
        toast(`Alerte traitée : ${a.style}`, "success");
    };

    // ✓ Fait / ↺ Annuler depuis le tableau
    window.satToggleDone = function(i) {
        const a = _tableRows[i];
        if (!a) return;
        if (a.done) {
            unmarkDone(a);
            toast(`Alerte remise en suivi : ${a.style}`, "info");
        } else {
            markDone(a);
            toast(`Alerte traitée : ${a.style}`, "success");
        }
        applyDoneFilter();
        rerenderAll();
    };

    // Marquer toutes les alertes actuellement filtrées comme traitées
    window.satMarkFilteredDone = function() {
        const list = satGetFilteredAlerts().filter(a => !a.done);
        if (!list.length) {
            toast("Aucune alerte active à marquer", "info");
            return;
        }
        if (!confirm(`Marquer ${list.length} alerte${list.length > 1 ? "s" : ""} comme traitée${list.length > 1 ? "s" : ""} ?`)) return;
        list.forEach(markDone);
        applyDoneFilter();
        rerenderAll();
        toast(`${list.length} alerte${list.length > 1 ? "s" : ""} marquée${list.length > 1 ? "s" : ""} comme traitée${list.length > 1 ? "s" : ""}`, "success");
    };

    const TYPE_LABELS = {
        psd_alert:    "PSD",
        srs_alert:    "SRS Launching",
        sewing_alert: "Sewing Trims",
        packing_alert:"Packing Trims",
        sc_due_date:  "Style Components",
        planning_conflict: "Conflit Planning",
        missing_pi: "PI Manquante",
        artwork_block: "Artwork Bloquant",
        qty_mismatch: "Incohérence Quantité",
        sample_block: "Sample non approuvée",
        no_sample: "Aucune sample",
        exfty_late: "Ex-Fty dépassée",
        exfty_soon: "Ex-Fty proche",
        psd_overdue: "PO Deadline dépassée",
        ord_partial:       "Reliquat",
        ord_not_confirmed: "Non confirmée",
        ord_no_po:         "PO # manquant",
        ord_no_ready:      "Ready Date manquante",
        ord_ready_late:    "Ready dépassée",
        ord_ready_soon:    "Ready proche",
        ord_transit_long:  "Transit long",
        ord_psd_risk:      "Risque PSD",
        ord_artwork:       "Artwork"
    };

    window.openSATableModal = function() {
        // Fermer le panneau latéral pour éviter la superposition
        closeSAPanel();

        let overlay = document.getElementById("sa-table-modal-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "sa-table-modal-overlay";
            overlay.className = "modal-overlay";
            overlay.style.cssText = "z-index: 11000; display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); opacity: 0; pointer-events: none; transition: opacity 0.2s;";

            overlay.innerHTML = `
            <div class="modal" id="sa-table-modal" style="background: #ffffff; color: #1f2937; border-radius: 12px; width: 1200px; max-width: 98vw; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); border: 1px solid #e5e7eb; overflow: hidden; transform: scale(0.95); transition: transform 0.2s; font-family: inherit;">
                <div class="modal-header" style="display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid #e5e7eb; background: #f9fafb;">
                    <div>
                        <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #111827; display: flex; align-items: center; gap: 8px;">
                            📊 Tableau des Alertes Intelligentes
                        </h3>
                        <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">Cliquez sur « ✓ Fait » quand une alerte est traitée — elle disparaît des compteurs</p>
                    </div>
                    <button onclick="closeSATableModal()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #9ca3af; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 6px; transition: background 0.15s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='none'">✕</button>
                </div>

                <!-- Barre de filtres et d'action -->
                <div style="display: flex; gap: 16px; align-items: center; padding: 12px 24px; border-bottom: 1px solid #e5e7eb; background: #fff; flex-wrap: wrap;">
                    <div style="position: relative; flex: 1; min-width: 200px;">
                        <input type="text" id="sat-search" placeholder="Rechercher (style, client, alerte...)" oninput="satFilterChange()" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; outline: none; box-sizing: border-box;" />
                    </div>

                    <div style="display: flex; gap: 8px; align-items: center;">
                        <label style="font-size: 12px; font-weight: 600; color: #374151;">Sévérité :</label>
                        <select id="sat-severity" onchange="satFilterChange()" style="padding: 7px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; outline: none; background: #fff; cursor: pointer;">
                            <option value="all">Toutes</option>
                            <option value="danger">🔴 Critiques (Danger)</option>
                            <option value="warn">🟡 Attention (Warning)</option>
                            <option value="info">🔵 À clôturer (In House)</option>
                        </select>
                    </div>

                    <div style="display: flex; gap: 8px; align-items: center;">
                        <label style="font-size: 12px; font-weight: 600; color: #374151;">Type :</label>
                        <select id="sat-type" onchange="satFilterChange()" style="padding: 7px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; outline: none; background: #fff; cursor: pointer; min-width: 160px;">
                            <option value="all">Tous les types</option>
                        </select>
                    </div>

                    <label style="display: flex; gap: 6px; align-items: center; font-size: 12px; font-weight: 600; color: #374151; cursor: pointer; user-select: none;">
                        <input type="checkbox" id="sat-show-done" onchange="satFilterChange()" style="cursor: pointer;" />
                        Afficher traitées (<span id="sat-done-count">0</span>)
                    </label>

                    <div style="margin-left: auto; display: flex; gap: 8px;">
                        <button onclick="satMarkFilteredDone()" title="Marquer toutes les alertes affichées comme traitées" style="display: flex; align-items: center; gap: 6px; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 8px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit;" onmouseover="this.style.background='#d1fae5'" onmouseout="this.style.background='#ecfdf5'">
                            ✓ Tout marquer fait
                        </button>
                        <button onclick="satExportExcel()" style="display: flex; align-items: center; gap: 6px; background: #10b981; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s; font-family: inherit;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                            📥 Exporter Excel
                        </button>
                    </div>
                </div>

                <!-- Zone Tableau -->
                <div style="flex: 1; overflow: auto; padding: 0; background: #f9fafb;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; background: #fff;">
                        <thead>
                            <tr style="background: #f3f4f6; border-bottom: 2px solid #e5e7eb; position: sticky; top: 0; z-index: 10;">
                                <th style="padding: 12px 16px; font-weight: 600; color: #374151; width: 100px; background: #f3f4f6;">Sévérité</th>
                                <th style="padding: 12px 16px; font-weight: 600; color: #374151; width: 110px; background: #f3f4f6;">Style</th>
                                <th style="padding: 12px 16px; font-weight: 600; color: #374151; width: 120px; background: #f3f4f6;">Client</th>
                                <th style="padding: 12px 16px; font-weight: 600; color: #374151; width: 140px; background: #f3f4f6;">Type d'Alerte</th>
                                <th style="padding: 12px 16px; font-weight: 600; color: #374151; background: #f3f4f6;">Détails / Informations</th>
                                <th style="padding: 12px 16px; font-weight: 600; color: #374151; width: 220px; background: #f3f4f6;">Action Recommandée</th>
                                <th style="padding: 12px 16px; font-weight: 600; color: #374151; width: 170px; text-align: center; background: #f3f4f6;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="sat-tbody">
                        </tbody>
                    </table>
                </div>

                <div class="modal-footer" style="padding: 12px 24px; border-top: 1px solid #e5e7eb; background: #f9fafb; display: flex; align-items: center; justify-content: space-between;">
                    <div id="sat-status" style="font-size: 12.5px; color: #4b5563; font-weight: 500;"></div>
                    <button class="btn btn-ghost" onclick="closeSATableModal()" style="border: 1px solid #d1d5db; padding: 8px 16px; border-radius: 6px; cursor: pointer; background: #fff; font-size: 13px; font-weight: 500; font-family: inherit;">Fermer</button>
                </div>
            </div>
            `;
            overlay.addEventListener("click", e => { if (e.target === overlay) closeSATableModal(); });
            document.body.appendChild(overlay);
        }

        // Types disponibles (actives + traitées, pour pouvoir filtrer les deux)
        const types = [...new Set(_allAlerts.map(a => a.type))];
        const typeSelect = document.getElementById("sat-type");
        if (typeSelect) {
            typeSelect.innerHTML = '<option value="all">Tous les types</option>' +
                types.map(t => `<option value="${esc(t)}">${esc(TYPE_LABELS[t] || t)}</option>`).join("");
        }

        const searchInput = document.getElementById("sat-search");
        if (searchInput) searchInput.value = "";
        const sevSelect = document.getElementById("sat-severity");
        if (sevSelect) sevSelect.value = "all";
        if (typeSelect) typeSelect.value = "all";
        const showDone = document.getElementById("sat-show-done");
        if (showDone) showDone.checked = false;

        satRenderTable();

        overlay.classList.add("open");
        requestAnimationFrame(() => {
            overlay.style.opacity = "1";
            overlay.style.pointerEvents = "all";
            document.getElementById("sa-table-modal").style.transform = "scale(1)";
        });
    };

    window.closeSATableModal = function() {
        const overlay = document.getElementById("sa-table-modal-overlay");
        if (overlay) {
            overlay.style.opacity = "0";
            overlay.style.pointerEvents = "none";
            document.getElementById("sa-table-modal").style.transform = "scale(0.95)";
            setTimeout(() => {
                overlay.classList.remove("open");
            }, 200);
        }
    };

    window.satGetFilteredAlerts = function() {
        const search   = (document.getElementById("sat-search")?.value || "").toLowerCase().trim();
        const severity = document.getElementById("sat-severity")?.value || "all";
        const type     = document.getElementById("sat-type")?.value || "all";
        const showDone = !!document.getElementById("sat-show-done")?.checked;

        const source = showDone ? _allAlerts : _cachedAlerts;

        return source.filter(a => {
            if (severity !== "all" && a.severity !== severity) return false;
            if (type !== "all" && a.type !== type) return false;
            if (search) {
                const haystack = [
                    a.style, a.client, a.title, a.action, a.details.join(" ")
                ].join(" ").toLowerCase();
                if (!haystack.includes(search)) return false;
            }
            return true;
        });
    };

    window.satRenderTable = function() {
        const tbody     = document.getElementById("sat-tbody");
        const statusEl  = document.getElementById("sat-status");
        const doneCount = document.getElementById("sat-done-count");
        if (!tbody) return;

        const nbDone = _allAlerts.length - _cachedAlerts.length;
        if (doneCount) doneCount.textContent = nbDone;

        const filtered = satGetFilteredAlerts();
        _tableRows = filtered;

        if (filtered.length === 0) {
            tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #9ca3af; font-size: 13px;">
                    ${_cachedAlerts.length === 0 && _allAlerts.length > 0
                        ? "✅ Toutes les alertes sont traitées. Cochez « Afficher traitées » pour les revoir."
                        : "🔍 Aucune alerte correspondante aux filtres."}
                </td>
            </tr>`;
            if (statusEl) statusEl.innerHTML = `0 alerte affichée · <strong>${_cachedAlerts.length}</strong> active${_cachedAlerts.length > 1 ? "s" : ""} · ${nbDone} traitée${nbDone > 1 ? "s" : ""}`;
            return;
        }

        tbody.innerHTML = filtered.map((a, i) => {
            const badgeCls  = a.severity === "danger" ? "sat-badge-danger"
                            : a.severity === "warn"   ? "sat-badge-warn"
                            : "sat-badge-info";
            const badgeText = a.severity === "danger" ? "Critique"
                            : a.severity === "warn"   ? "Attention"
                            : "À clôturer";
            const styleCode = a.style || "—";
            const typeLabel = TYPE_LABELS[a.type] || a.type;
            const detailsHtml = a.details.map(d => `
                <div style="display: flex; align-items: flex-start; gap: 6px; margin-bottom: 2px;">
                    <span style="color: #9ca3af; font-size: 10px; margin-top: 2px;">➔</span>
                    <span>${esc(d)}</span>
                </div>
            `).join("");

            const sevCell = a.done
                ? `<span class="sat-badge-done">✓ Traitée</span>
                   <span class="sat-done-date">le ${esc(new Date(a.doneAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }))}</span>`
                : `<span class="${badgeCls}">${badgeText}</span>`;

            const doneBtn = a.done
                ? `<button class="sat-undo-btn" onclick="satToggleDone(${i})" title="Remettre cette alerte en suivi">↺ Annuler</button>`
                : `<button class="sat-done-btn" onclick="satToggleDone(${i})" title="Marquer comme traitée">✓ Fait</button>`;

            return `
            <tr class="sat-row ${a.done ? "sat-row-done" : ""}">
                <td class="sat-cell">${sevCell}</td>
                <td class="sat-cell"><span class="sat-style-link" onclick="satNavigateTo('${a.sheet || 'details'}', ${a.rowIndex || 0})">${esc(styleCode)}</span></td>
                <td class="sat-cell">${a.client ? esc(a.client) : "—"}</td>
                <td class="sat-cell" style="font-weight: 500;">${esc(typeLabel)}</td>
                <td class="sat-cell" style="font-size: 12px; color: #4b5563;">
                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">${esc(a.title)}</div>
                    ${detailsHtml}
                </td>
                <td class="sat-cell" style="font-style: italic; color: #4b5563;">💡 ${esc(a.action)}</td>
                <td class="sat-cell" style="text-align: center;">
                    <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                        ${doneBtn}
                        ${a.rowIndex ? `
                            <button class="sat-goto-btn" onclick="satNavigateTo('${a.sheet || 'details'}', ${a.rowIndex})">
                                Voir ➔
                            </button>
                        ` : ""}
                    </div>
                </td>
            </tr>
            `;
        }).join("");

        if (statusEl) {
            statusEl.innerHTML = `Affichage de <strong>${filtered.length}</strong> alerte${filtered.length > 1 ? "s" : ""} · <strong>${_cachedAlerts.length}</strong> active${_cachedAlerts.length > 1 ? "s" : ""} · ${nbDone} traitée${nbDone > 1 ? "s" : ""}`;
        }
    };

    window.satFilterChange = function() {
        satRenderTable();
    };

    window.satNavigateTo = function(sheetKey, rowIndex) {
        closeSATableModal();
        if (typeof navigateToRow === "function") {
            navigateToRow(sheetKey, rowIndex);
        }
    };

    window.satExportExcel = function() {
        const _waitForXLSX = window._waitForXLSX || function(cb) { cb(window.XLSX); };
        _waitForXLSX(function (XL) {
            if (!XL) {
                if (typeof showToast === "function") showToast("Bibliothèque Excel non chargée", "error");
                else alert("Bibliothèque Excel non chargée");
                return;
            }

            const filtered = satGetFilteredAlerts();
            if (!filtered.length) {
                toast("Aucune alerte à exporter", "info");
                return;
            }

            const rows = filtered.map(a => ({
                "Statut": a.done ? "Traitée" : "Active",
                "Traitée le": a.done ? new Date(a.doneAt).toLocaleDateString("fr-FR") : "",
                "Sévérité": a.severity === "danger" ? "Critique" : a.severity === "warn" ? "Attention" : "À clôturer",
                "Style": a.style || "—",
                "Client": a.client || "—",
                "Type d'Alerte": TYPE_LABELS[a.type] || a.type,
                "Alerte / Titre": a.title,
                "Détails": a.details.join(" | "),
                "Action Recommandée": a.action,
                "Feuille Source": a.sheet || "details"
            }));

            const wb = XL.utils.book_new();
            const ws = XL.utils.json_to_sheet(rows);
            XL.utils.book_append_sheet(wb, ws, "Alertes Intelligentes");
            XL.writeFile(wb, `Alertes_Intelligentes_${new Date().toISOString().slice(0, 10)}.xlsx`);

            toast(`Export de ${filtered.length} alertes réussi`, "success");
        });
    };

    // ══════════════════════════════════════════════════════════
    //  REFRESH PRINCIPAL
    // ══════════════════════════════════════════════════════════
    function refresh() {
        if (!window.state?.data?.details?.length) return;

        loadDone();
        loadSeen();
        _allAlerts = collectAlerts();
        applyDoneFilter();
        rerenderAll();
    }

    // ══════════════════════════════════════════════════════════
    //  INIT
    // ══════════════════════════════════════════════════════════
    function init() {
        injectStyles();
        injectBellButton();
        loadDone();
        loadSeen();

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
