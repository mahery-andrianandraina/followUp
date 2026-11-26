// ============================================================
//  AW27 CHECKERS — Thème Google (Material You)
//  Fichier : google-theme.js
//  Charger EN DERNIER dans index.html (après header-google.js) :
//  <script src="js/google-theme.js"></script>
//
//  1. Fond clair (#f8fafd), header et barre latérale de la même couleur
//  2. Icônes Material dans les KPI (smartAlerts.js)
//  3. Une seule palette : bleu principal + rouge / orange / vert
//  4. Libellés en minuscules (Client, Collection…)
//  5. Filtres en « chips » + recherche en pilule
//  6. Un seul badge d'alerte par card (détail au survol)
//  7. Chargement : barre fine + squelettes animés
//  8. État vide illustré avec bouton « Effacer les filtres »
//  9. Rayons cohérents, raccourcis clavier (/ et ?), densité d'affichage
//
//  Rien n'est réécrit dans l'app : tout passe par du CSS et de petits ajouts.
//  Pour revenir à l'ancien design : retirer la ligne <script> dans index.html.
// ============================================================

(function initGoogleTheme() {

    const DENSITY_KEY = "aw27_gt_density";

    function esc(s) {
        return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    // ══════════════════════════════════════════════════════════
    //  CSS
    // ══════════════════════════════════════════════════════════
    function injectCSS() {
        if (document.getElementById("gt-styles")) return;
        const chevron = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23444746'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E";
        const chevronOn = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23041e49'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E";
        const s = document.createElement("style");
        s.id = "gt-styles";
        s.textContent = `
        :root {
            --gt-bg: #f8fafd; --gt-surface: #ffffff; --gt-surface-2: #f0f4f9; --gt-surface-3: #e9eef6;
            --gt-on: #1f1f1f; --gt-on-var: #444746; --gt-muted: #5f6368;
            --gt-outline: #747775; --gt-outline-v: #e3e3e3;
            --gt-primary: #0b57d0; --gt-primary-c: #d3e3fd; --gt-on-primary-c: #041e49;
            --gt-red: #c5221f; --gt-red-c: #fce8e6; --gt-amber: #b06000; --gt-amber-c: #fef7e0;
            --gt-green: #137333; --gt-green-c: #e6f4ea;
            --gt-font: "Google Sans", "Google Sans Text", Roboto, "Segoe UI", Arial, sans-serif;
        }

        /* ── 1. Fond, header, barre latérale ── */
        html body { background: var(--gt-bg) !important; background-image: none !important; color: var(--gt-on); font-family: var(--gt-font) !important; }
        html body .layout-body, html body .main { background: transparent !important; }
        html body .header {
            background: var(--gt-bg) !important; border-bottom: none !important; box-shadow: none !important;
            backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
        }
        html body .header .header-title h1, html body #header-sheet-title { color: var(--gt-on) !important; font-weight: 400 !important; font-size: 22px !important; letter-spacing: 0 !important; }
        html body .header .header-title p { color: var(--gt-muted) !important; font-size: 12.5px !important; }
        html body .hamburger { color: var(--gt-on-var) !important; background: transparent !important; }

        html body aside.sidebar {
            background: var(--gt-bg) !important; border-right: none !important;
            backdrop-filter: none !important; -webkit-backdrop-filter: none !important; box-shadow: none !important;
        }
        html body aside.sidebar, html body aside.sidebar * { color: var(--gt-on-var) !important; }
        html body aside.sidebar .sidebar-brand-name { color: var(--gt-on) !important; font-weight: 500 !important; }
        html body aside.sidebar .sidebar-brand-sub { color: var(--gt-muted) !important; }
        html body aside.sidebar .header-logo {
            background: var(--gt-primary) !important; color: #fff !important; border-radius: 12px !important;
            width: 36px !important; height: 36px !important; display: flex !important; align-items: center !important;
            justify-content: center !important; font-weight: 500 !important; font-size: 14px !important;
        }
        html body aside.sidebar .sidebar-section-label {
            text-transform: none !important; letter-spacing: 0 !important; font-size: 12.5px !important;
            font-weight: 500 !important; color: var(--gt-muted) !important; padding-left: 20px !important;
        }
        html body aside.sidebar .nav-item {
            border-radius: 20px !important; background: transparent !important; border: none !important;
            box-shadow: none !important; min-height: 40px !important;
        }
        html body aside.sidebar .nav-item:hover { background: rgba(68,71,70,.08) !important; }
        html body aside.sidebar .nav-item.active { background: var(--gt-primary-c) !important; }
        html body aside.sidebar .nav-item.active, html body aside.sidebar .nav-item.active * { color: var(--gt-on-primary-c) !important; font-weight: 500 !important; }
        html body aside.sidebar .nav-item-add { border: none !important; }
        html body aside.sidebar .hg-new, html body aside.sidebar .hg-new * { color: #001d35 !important; }
        html body aside.sidebar .hg-new { background: #c2e7ff !important; }
        html body aside.sidebar .hg-side-foot { border-top-color: var(--gt-outline-v) !important; }
        html body aside.sidebar .sidebar-toggle { color: var(--gt-on-var) !important; background: transparent !important; }

        /* Header Google sur fond clair */
        /* index.html force « .header * { color: blanc } » → on recolore explicitement */
        html body .header .hg-ib, html body .header .hg-ib i, html body .header #wn-btn, html body .header #wn-btn * { color: var(--gt-on-var) !important; }
        html body .header .hg-ib .hg-badge, html body .header .hg-av, html body .header .hg-av * { color: #fff !important; }
        html body .header .db-filter-reset, html body .header .db-filter-reset * { color: var(--gt-primary) !important; }
        html body .header .hg-ib:hover, html body .header .hg-ib.on, html body .header .hg-av-btn:hover, html body .header .hg-av-btn.on { background: rgba(68,71,70,.08) !important; }
        html body .header .hg-badge { border-color: var(--gt-bg) !important; background: #b3261e !important; }
        html body .header .hg-dot { border-color: var(--gt-bg) !important; }

        /* ── 5. Recherche en pilule + filtres en chips ── */
        html body .db-filter-bar { gap: 8px !important; align-items: center !important; }
        html body .db-filter-search-wrap {
            background: var(--gt-surface-3) !important; border: none !important; border-radius: 28px !important;
            height: 44px !important; padding: 0 16px !important; box-shadow: none !important; gap: 10px !important;
            transition: background .15s, box-shadow .15s; min-width: 320px;
        }
        html body .db-filter-search-wrap:focus-within { background: #fff !important; box-shadow: 0 1px 1px rgba(0,0,0,.1), 0 1px 3px 1px rgba(0,0,0,.08) !important; }
        html body .db-filter-search-wrap svg { color: var(--gt-on-var) !important; width: 20px !important; height: 20px !important; }
        html body .db-filter-search, html body #db-search { background: transparent !important; border: none !important; box-shadow: none !important; color: var(--gt-on) !important; font: 400 15px var(--gt-font) !important; outline: none !important; }
        html body .db-filter-search::placeholder, html body #db-search::placeholder { color: var(--gt-on-var) !important; }
        html body .db-filter-select, html body #db-client-filter, html body #db-saison-filter, html body .table-card select {
            -webkit-appearance: none !important; appearance: none !important; height: 32px !important;
            border-radius: 8px !important; border: 1px solid var(--gt-outline) !important; box-shadow: none !important;
            background: transparent url("${chevron}") no-repeat right 6px center / 20px !important;
            padding: 0 30px 0 12px !important; font: 500 13.5px var(--gt-font) !important; color: var(--gt-on-var) !important;
            cursor: pointer;
        }
        html body .db-filter-select:hover, html body #db-client-filter:hover, html body #db-saison-filter:hover { background-color: rgba(68,71,70,.06) !important; }
        html body .db-filter-select.active, html body #db-client-filter.active, html body #db-saison-filter.active {
            background: var(--gt-primary-c) url("${chevronOn}") no-repeat right 6px center / 20px !important;
            border-color: var(--gt-primary-c) !important; color: var(--gt-on-primary-c) !important;
        }
        html body .db-filter-reset, html body #db-filter-reset {
            height: 32px !important; width: auto !important; padding: 0 12px !important; border-radius: 16px !important;
            border: none !important; background: transparent !important; color: var(--gt-primary) !important;
            display: none !important; align-items: center !important; gap: 4px !important; font: 500 13.5px var(--gt-font) !important;
        }
        html body .db-filter-reset.gt-on, html body #db-filter-reset.gt-on { display: inline-flex !important; }
        html body .db-filter-reset:hover { background: rgba(11,87,208,.08) !important; }
        html body .db-filter-reset::after { content: "Effacer"; }

        /* ── 2. KPI (smartAlerts) ── */
        html body #sa-kpi-bar { background: transparent !important; border: none !important; padding: 4px 24px 8px !important; gap: 12px !important; box-shadow: none !important; }
        html body .sa-kpi {
            background: var(--gt-surface) !important; border: 1px solid var(--gt-outline-v) !important; border-radius: 16px !important;
            padding: 12px 16px !important; gap: 12px !important; transition: box-shadow .15s !important;
        }
        html body .sa-kpi:hover { transform: none !important; box-shadow: 0 1px 2px rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15) !important; }
        html body .sa-kpi-icon { width: 40px !important; height: 40px !important; border-radius: 50% !important; font-size: 20px !important; }
        html body .sa-kpi-blue  .sa-kpi-icon { background: var(--gt-primary-c) !important; color: var(--gt-primary) !important; }
        html body .sa-kpi-green .sa-kpi-icon { background: var(--gt-green-c) !important; color: var(--gt-green) !important; }
        html body .sa-kpi-warn  .sa-kpi-icon { background: var(--gt-amber-c) !important; color: var(--gt-amber) !important; }
        html body .sa-kpi-danger .sa-kpi-icon { background: var(--gt-red-c) !important; color: var(--gt-red) !important; }
        html body .sa-kpi-val { font: 400 24px/28px var(--gt-font) !important; color: var(--gt-on) !important; }
        html body .sa-kpi-lbl { font-size: 13px !important; color: var(--gt-on-var) !important; }

        /* ── 3 & 4. Blocs saison / client / cards ── */
        html body .dbs-szn-block, html body .dbs-cli-block {
            background: var(--gt-surface) !important; border: 1px solid var(--gt-outline-v) !important;
            border-radius: 16px !important; box-shadow: none !important;
        }
        html body .dbs-szn-band { background: transparent !important; border-bottom: 1px solid var(--gt-outline-v) !important; }
        html body .dbs-szn-pill { background: var(--gt-primary-c) !important; color: var(--gt-on-primary-c) !important; border: none !important; border-radius: 8px !important; font-weight: 500 !important; }
        html body .dbs-szn-n, html body .dbs-bar-kpi-n, html body .dbs-cli-name { color: var(--gt-on) !important; }
        html body .dbs-szn-l, html body .dbs-bar-kpi-l, html body .dbs-bar-chart-lbl, html body .dbs-sf-l,
        html body .dbs-exfty-lbl, html body .dbs-dept-name-lbl, html body .dbs-cli-sub {
            text-transform: none !important; letter-spacing: 0 !important; color: var(--gt-muted) !important;
            font-weight: 400 !important; font-size: 12px !important;
        }
        html body .dbs-dept-name-lbl { font-weight: 500 !important; font-size: 13px !important; color: var(--gt-on-var) !important; }
        html body .dbs-av { background: var(--gt-primary-c) !important; color: var(--gt-on-primary-c) !important; border: none !important; }
        html body .dbs-bar-track { background: var(--gt-surface-3) !important; border-radius: 6px !important; }
        html body .dbs-bar-fill { background: var(--gt-primary) !important; border-radius: 6px !important; }
        html body .dbs-bar-kpi { background: var(--gt-surface-2) !important; border: none !important; border-radius: 12px !important; }
        html body .dbs-bar-kpi-n { color: var(--gt-primary) !important; }
        html body .dbs-dept-line { background: var(--gt-outline-v) !important; }

        html body .dbs-sc {
            border-radius: 16px !important; border: 1px solid var(--gt-outline-v) !important; box-shadow: none !important;
            background: var(--gt-surface) !important; outline: none !important; transition: box-shadow .2s !important;
        }
        html body .dbs-sc:hover { box-shadow: 0 1px 2px rgba(60,64,67,.3), 0 2px 6px 2px rgba(60,64,67,.15) !important; transform: none !important; }
        html body .dbs-sc.sa-card-alert-border { border-color: #f6aea9 !important; }
        html body .dbs-sc.sa-card-alert-border-warn { border-color: #fdd663 !important; }
        html body .dbs-sc-img-wrap { border-radius: 15px 15px 0 0 !important; background: var(--gt-surface-2) !important; }
        html body .dbs-sf-v { color: var(--gt-on) !important; font-size: 13.5px !important; }
        html body .dbs-sc-code { color: var(--gt-on) !important; font-weight: 500 !important; }
        html body .dbs-sc-sep { background: var(--gt-outline-v) !important; }

        /* ── 6. Badge d'alerte unique ── */
        html body .sa-badge { border: none !important; border-radius: 8px !important; font: 500 11px var(--gt-font) !important; padding: 4px 8px !important; backdrop-filter: none !important; }
        html body .sa-badge-danger { background: var(--gt-red-c) !important; color: var(--gt-red) !important; }
        html body .sa-badge-warn   { background: var(--gt-amber-c) !important; color: var(--gt-amber) !important; }
        html body .sa-badge-info   { background: var(--gt-primary-c) !important; color: var(--gt-on-primary-c) !important; }
        html body .sa-badge.gt-multi { cursor: help !important; }

        /* ── Tableaux (Details, Sample, Ordering…) ── */
        html body .table-card { background: var(--gt-surface) !important; border: 1px solid var(--gt-outline-v) !important; border-radius: 16px !important; box-shadow: none !important; overflow: hidden; }
        html body .table-card th {
            text-transform: none !important; letter-spacing: 0 !important; font: 500 13px var(--gt-font) !important;
            color: var(--gt-on-var) !important; background: var(--gt-surface) !important;
            border-bottom: 1px solid var(--gt-outline-v) !important;
        }
        html body .table-card td { color: var(--gt-on) !important; border-bottom: 1px solid var(--gt-outline-v) !important; }
        html body .table-card tbody tr:hover td { background: var(--gt-surface-2) !important; }
        html body .table-title { color: var(--gt-on) !important; font-weight: 400 !important; font-size: 18px !important; }
        html body .table-card .search-input { border-radius: 20px !important; background: var(--gt-surface-3) !important; border: none !important; }

        /* ── 7. Chargement : barre fine + squelettes ── */
        /* Voile de chargement d'app.js : translucide pour laisser voir les squelettes */
        html body .loading-progress-container {
            background: rgba(248,250,253,.55) !important; border: none !important; box-shadow: none !important;
            backdrop-filter: blur(1.5px) !important; -webkit-backdrop-filter: blur(1.5px) !important;
        }
        html body .progress-step-text { text-transform: none !important; letter-spacing: 0 !important; color: var(--gt-on-var) !important; font: 400 14px var(--gt-font) !important; }
        html body .progress-bar-background { height: 4px !important; border-radius: 2px !important; background: var(--gt-primary-c) !important; }
        html body .progress-bar-fill { background: var(--gt-primary) !important; border-radius: 2px !important; }
        html body .progress-percentage { color: var(--gt-muted) !important; font: 400 12px var(--gt-font) !important; }
        @keyframes gt-shimmer { 0% { background-position: 100% 0 } 100% { background-position: -100% 0 } }
        html body .db-skel {
            background: linear-gradient(90deg, var(--gt-surface-3) 25%, #f4f7fb 50%, var(--gt-surface-3) 75%) !important;
            background-size: 200% 100% !important; animation: gt-shimmer 1.4s ease-in-out infinite !important; border-radius: 12px !important;
        }
        .gt-skel-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; margin-top: 16px; }
        .gt-skel-card { background: var(--gt-surface); border: 1px solid var(--gt-outline-v); border-radius: 16px; overflow: hidden; }
        .gt-skel-card .db-skel { border-radius: 0 !important; }
        .gt-skel-line { height: 12px; margin: 10px 14px 0; border-radius: 6px !important; }

        /* ── 8. États vides ── */
        html body .db-no-results { text-align: center; padding: 56px 16px !important; color: var(--gt-on-var) !important; }
        .gt-empty-ill { display: block; margin: 0 auto 16px; }
        .gt-empty-t { font: 400 22px/28px var(--gt-font); color: var(--gt-on); margin: 0 0 6px; }
        .gt-empty-s { font: 400 14px/20px var(--gt-font); color: var(--gt-on-var); margin: 0 0 20px; }
        .gt-btn-tonal {
            height: 40px; padding: 0 24px; border-radius: 20px; border: none; cursor: pointer;
            background: var(--gt-primary-c); color: var(--gt-on-primary-c); font: 500 14px var(--gt-font);
        }
        .gt-btn-tonal:hover { box-shadow: 0 1px 2px rgba(0,0,0,.3), 0 1px 3px 1px rgba(0,0,0,.15); }
        html body .empty-state h3 { font: 400 20px var(--gt-font) !important; color: var(--gt-on) !important; }
        html body .empty-state p { color: var(--gt-on-var) !important; }
        html body .empty-state .empty-icon { color: var(--gt-primary) !important; background: var(--gt-primary-c) !important; border-radius: 50% !important; }

        /* ── 9. Densité compacte ── */
        body.gt-compact .table-card td, body.gt-compact .table-card th { padding-top: 5px !important; padding-bottom: 5px !important; font-size: 12.5px !important; }
        body.gt-compact .dbs-cards-wrap { gap: 10px !important; }
        body.gt-compact .dbs-sc-fields { gap: 4px 12px !important; }
        body.gt-compact .dbs-sc-img-wrap { height: 120px !important; }
        body.gt-compact .sa-kpi { padding: 8px 12px !important; }

        /* ── Raccourcis clavier (dialogue « ? ») ── */
        #gt-keys-back { position: fixed; inset: 0; z-index: 12100; background: rgba(0,0,0,.32); display: flex; align-items: center; justify-content: center; }
        #gt-keys {
            width: 440px; max-width: 94vw; background: var(--gt-surface); border-radius: 28px; padding: 24px;
            box-shadow: 0 4px 8px 3px rgba(0,0,0,.15), 0 1px 3px rgba(0,0,0,.3); font-family: var(--gt-font); color: var(--gt-on);
        }
        #gt-keys h3 { margin: 0 0 16px; font-size: 24px; font-weight: 400; }
        .gt-key-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--gt-outline-v); font-size: 14px; color: var(--gt-on-var); }
        .gt-key-row:last-of-type { border-bottom: none; }
        .gt-kbd { min-width: 28px; height: 28px; padding: 0 8px; border-radius: 8px; background: var(--gt-surface-2); border: 1px solid var(--gt-outline-v); display: inline-flex; align-items: center; justify-content: center; font: 500 13px var(--gt-font); color: var(--gt-on); }
        .gt-keys-f { display: flex; justify-content: flex-end; margin-top: 16px; }
        .gt-keys-f button { height: 40px; padding: 0 24px; border-radius: 20px; border: none; background: none; color: var(--gt-primary); font: 500 14px var(--gt-font); cursor: pointer; }
        .gt-keys-f button:hover { background: rgba(11,87,208,.08); }
        `;
        document.head.appendChild(s);
    }

    // ══════════════════════════════════════════════════════════
    //  5. Bouton « Effacer » visible seulement si un filtre est actif
    // ══════════════════════════════════════════════════════════
    function syncFilterReset() {
        const r = document.getElementById("db-filter-reset");
        if (!r) return;
        const s = document.getElementById("db-search");
        const c = document.getElementById("db-client-filter");
        const z = document.getElementById("db-saison-filter");
        const on = !!((s && s.value.trim()) || (c && c.value) || (z && z.value));
        r.classList.toggle("gt-on", on);
        if (c) c.classList.toggle("active", !!c.value);
        if (z) z.classList.toggle("active", !!z.value);
    }

    // ══════════════════════════════════════════════════════════
    //  6. Un seul badge d'alerte par card
    // ══════════════════════════════════════════════════════════
    function mergeCardBadges() {
        document.querySelectorAll(".sa-card-badge").forEach(wrap => {
            if (wrap.dataset.gtMerged === "1") return;
            const badges = [...wrap.querySelectorAll(".sa-badge")];
            if (badges.length <= 1) { wrap.dataset.gtMerged = "1"; return; }

            // Nombre total (le « +N alertes » d'origine compte aussi)
            let total = 0; const names = [];
            badges.forEach(b => {
                const m = b.textContent.match(/^\+(\d+)/);
                if (m) total += +m[1]; else { total += 1; names.push(b.textContent.trim()); }
            });
            const danger = !!wrap.querySelector(".sa-badge-danger");
            const chip = document.createElement("span");
            chip.className = `sa-badge gt-multi ${danger ? "sa-badge-danger" : "sa-badge-warn"}`;
            chip.innerHTML = `<i class="ti ti-alert-triangle" aria-hidden="true" style="font-size:13px"></i>${total} alertes`;
            chip.dataset.tip = names.join("\n") + (total > names.length ? `\n+ ${total - names.length} autre(s)` : "");
            wrap.innerHTML = "";
            wrap.appendChild(chip);
            wrap.dataset.gtMerged = "1";
        });
    }

    // ══════════════════════════════════════════════════════════
    //  7. Squelettes de cards pendant le chargement
    // ══════════════════════════════════════════════════════════
    function enhanceSkeleton() {
        const wrap = document.querySelector("#dashboard-screen .db-skeleton-wrap");
        if (!wrap || wrap.querySelector(".gt-skel-cards")) return;
        const cards = Array(4).fill(`
            <div class="gt-skel-card">
                <div class="db-skel" style="height:150px"></div>
                <div class="db-skel gt-skel-line" style="width:55%"></div>
                <div class="db-skel gt-skel-line" style="width:80%"></div>
                <div class="db-skel gt-skel-line" style="width:40%;margin-bottom:16px"></div>
            </div>`).join("");
        wrap.insertAdjacentHTML("beforeend", `<div class="gt-skel-cards">${cards}</div>`);
    }

    // ══════════════════════════════════════════════════════════
    //  8. État vide illustré (dashboard filtré sans résultat)
    // ══════════════════════════════════════════════════════════
    const EMPTY_SVG = `
        <svg class="gt-empty-ill" width="148" height="120" viewBox="0 0 148 120" aria-hidden="true">
            <ellipse cx="74" cy="108" rx="52" ry="6" fill="#e9eef6"/>
            <rect x="26" y="18" width="78" height="86" rx="12" fill="#fff" stroke="#c4c7c5" stroke-width="2"/>
            <rect x="38" y="34" width="44" height="7" rx="3.5" fill="#d3e3fd"/>
            <rect x="38" y="50" width="54" height="7" rx="3.5" fill="#e9eef6"/>
            <rect x="38" y="66" width="36" height="7" rx="3.5" fill="#e9eef6"/>
            <circle cx="98" cy="70" r="20" fill="#fff" stroke="#0b57d0" stroke-width="5"/>
            <path d="M112 85l16 16" stroke="#0b57d0" stroke-width="7" stroke-linecap="round"/>
            <circle cx="22" cy="24" r="6" fill="#fbbc04"/><circle cx="128" cy="30" r="4" fill="#ea4335"/><circle cx="132" cy="56" r="5" fill="#34a853"/>
        </svg>`;
    function enhanceEmpty() {
        const el = document.querySelector("#dashboard-screen .db-no-results");
        if (!el || el.dataset.gt === "1") return;
        el.dataset.gt = "1";
        el.innerHTML = `${EMPTY_SVG}
            <div class="gt-empty-t">Aucun style ne correspond</div>
            <div class="gt-empty-s">Essayez un autre mot-clé, ou retirez un filtre client ou saison.</div>
            <button class="gt-btn-tonal" type="button">Effacer les filtres</button>`;
        el.querySelector("button").onclick = () => {
            if (typeof window.resetDashboardFilters === "function") window.resetDashboardFilters();
            syncFilterReset();
        };
    }

    // ══════════════════════════════════════════════════════════
    //  9a. Densité d'affichage
    // ══════════════════════════════════════════════════════════
    function getDensity() { try { return localStorage.getItem(DENSITY_KEY) || "comfortable"; } catch (_) { return "comfortable"; } }
    function setDensity(v) {
        try { localStorage.setItem(DENSITY_KEY, v); } catch (_) {}
        document.body.classList.toggle("gt-compact", v === "compact");
    }
    window.gtDensity = getDensity;
    window.gtToggleDensity = () => { const v = getDensity() === "compact" ? "comfortable" : "compact"; setDensity(v); return v; };

    // ══════════════════════════════════════════════════════════
    //  9b. Raccourcis clavier
    // ══════════════════════════════════════════════════════════
    const KEYS = [
        ["/", "Rechercher"],
        ["a", "Ouvrir les notifications"],
        ["o", "Ouvrir les outils"],
        ["n", "Nouveau"],
        ["d", "Aller au Dashboard"],
        ["c", "Changer la densité d'affichage"],
        ["?", "Afficher les raccourcis"],
        ["Échap", "Fermer"]
    ];
    function showKeys() {
        if (document.getElementById("gt-keys-back")) return;
        const b = document.createElement("div");
        b.id = "gt-keys-back";
        b.innerHTML = `<div id="gt-keys" role="dialog" aria-label="Raccourcis clavier">
            <h3>Raccourcis clavier</h3>
            ${KEYS.map(([k, l]) => `<div class="gt-key-row"><span>${esc(l)}</span><span class="gt-kbd">${esc(k)}</span></div>`).join("")}
            <div class="gt-keys-f"><button type="button">OK</button></div>
        </div>`;
        b.addEventListener("click", e => { if (e.target === b || e.target.closest(".gt-keys-f button")) b.remove(); });
        document.body.appendChild(b);
    }
    function isTyping(e) {
        const t = e.target;
        return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    }
    function visible(el) { return el && el.offsetParent !== null; }
    function onKey(e) {
        if (e.key === "Escape") { document.getElementById("gt-keys-back")?.remove(); return; }
        if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
        const k = e.key;
        if (k === "/") {
            const s = [document.getElementById("db-search"), document.getElementById("search-input")].find(visible);
            if (s) { e.preventDefault(); s.focus(); s.select && s.select(); }
        } else if (k === "?") { e.preventDefault(); showKeys(); }
        else if (k === "a" && window.openHGNotifications) { e.preventDefault(); window.openHGNotifications("smart"); }
        else if (k === "o" && window.openHGLauncher) { e.preventDefault(); window.openHGLauncher(); }
        else if (k === "n" && typeof window.openAddModal === "function") { e.preventDefault(); window.openAddModal(); }
        else if (k === "d") { const t = document.getElementById("tab-dashboard"); if (t) { e.preventDefault(); t.click(); } }
        else if (k === "c") {
            e.preventDefault();
            const v = window.gtToggleDensity();
            if (typeof showToast === "function") showToast(`Densité : ${v === "compact" ? "compacte" : "confortable"}`, "info");
        }
    }
    window.gtShowShortcuts = showKeys;

    // ══════════════════════════════════════════════════════════
    //  INIT
    // ══════════════════════════════════════════════════════════
    function init() {
        injectCSS();
        setDensity(getDensity());

        // Réagir aux re-rendus de l'app (dashboard, badges, skeleton, état vide)
        let pending = false;
        const run = () => {
            pending = false;
            mergeCardBadges(); enhanceSkeleton(); enhanceEmpty(); syncFilterReset();
        };
        const obs = new MutationObserver(() => { if (!pending) { pending = true; requestAnimationFrame(run); } });
        const watch = () => {
            const ds = document.getElementById("dashboard-screen");
            if (ds) obs.observe(ds, { childList: true, subtree: true });
            else setTimeout(watch, 300);
        };
        watch();
        run();

        ["db-search", "db-client-filter", "db-saison-filter"].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.addEventListener("input", syncFilterReset); el.addEventListener("change", syncFilterReset); }
        });
        document.getElementById("db-filter-reset")?.addEventListener("click", () => setTimeout(syncFilterReset, 0));

        document.addEventListener("keydown", onKey);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else setTimeout(init, 300);

})();
