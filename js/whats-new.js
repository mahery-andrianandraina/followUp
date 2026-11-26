// ============================================================
//  AW27 CHECKERS — Nouveautés (style Google "What's new")
//  Fichier : whats-new.js
//  Charger en dernier dans index.html :
//  <script src="js/whats-new.js"></script>
//
//  • S'ouvre automatiquement UNE fois quand une nouvelle version
//    est publiée (mémorisé dans le navigateur)
//  • Une slide par fonctionnalité, avec mini démo animée
//  • « Voir dans l'app » : met en lumière l'élément réel de l'interface
//  • Bouton ✨ dans le header pour revoir les nouveautés à tout moment
//
//  POUR ANNONCER DE NOUVELLES FONCTIONNALITÉS :
//  ajouter une entrée EN HAUT de RELEASES avec un nouvel "id".
//  Tous les utilisateurs la verront automatiquement au prochain chargement.
// ============================================================

(function initWhatsNew() {

    // ══════════════════════════════════════════════════════════
    //  CONTENU — à mettre à jour à chaque version
    //  demo : "done" | "ordering" | "psd" | "card" | "none"
    //  target : sélecteur CSS de l'élément à mettre en lumière
    //  action : fonction appelée par le bouton d'action (optionnel)
    // ══════════════════════════════════════════════════════════
    const RELEASES = [
        {
            id:    "2026-11-26",
            date:  "26 nov. 2026",
            title: "Alertes plus intelligentes et PSD fiable",
            features: [
                {
                    tag:     "Nouveau",
                    title:   "Marquez une alerte comme traitée",
                    text:    "Chaque alerte a maintenant un bouton « ✓ Fait ». Elle disparaît de la cloche, des compteurs et des cards.",
                    bullets: [
                        "SRS Launching et Style Components se ferment seuls dès qu'ils passent « In House »",
                        "PSD et Trims passent en bleu « À clôturer » et attendent votre validation",
                        "Case « Afficher traitées » pour revoir ou annuler"
                    ],
                    demo:    "done",
                    target:  "#sa-bell-btn",
                    targetText: "Ouvrez les alertes ici, puis cliquez « ✓ Fait » sur une ligne.",
                    action:  { label: "Ouvrir les alertes", run: () => window.openSATableModal && window.openSATableModal() }
                },
                {
                    tag:     "Nouveau",
                    title:   "Alertes Ordering qui lisent vos commentaires",
                    text:    "Les reliquats écrits dans les Comments (balance, partial, missing…) sont détectés avec leur date, même si la ligne est « Delivered ».",
                    bullets: [
                        "Ready Date dépassée ou proche, transit trop long",
                        "PO # manquant, commande non confirmée",
                        "Risque PSD : trim pas livré à temps pour la PSD du style"
                    ],
                    demo:    "ordering",
                    target:  "#sa-bell-btn",
                    targetText: "Les alertes Ordering apparaissent dans la même liste, filtrables par type.",
                    action:  { label: "Voir les alertes", run: () => window.openSATableModal && window.openSATableModal() }
                },
                {
                    tag:     "Amélioré",
                    title:   "Upload PSD : textes, dates et Ex-Fty",
                    text:    "La valeur de l'Excel est importée telle quelle : « All OK », « UNDER GRN », « IN HOUSE » restent des textes, les dates restent des dates.",
                    bullets: [
                        "Plus de « Invalid Date »",
                        "Ex-Fty (colonne AB) importé dans « Possible etd »",
                        "Colonnes trouvées par leur en-tête, même si le fichier change"
                    ],
                    demo:    "psd",
                    target:  "#sc-actions-menu-btn",
                    targetText: "Menu Actions → Mise à jour PSD."
                },
                {
                    tag:     "Corrigé",
                    title:   "La PSD des cards est la bonne",
                    text:    "La case PSD du dashboard affiche maintenant la colonne PSD de Details (elle affichait PO Deadline).",
                    bullets: [
                        "Les textes comme « All OK » s'affichent tels quels",
                        "Le badge « In Production » se base sur la vraie PSD"
                    ],
                    demo:    "card",
                    target:  ".dbs-sc",
                    targetText: "La ligne « PSD » de chaque card."
                }
            ]
        }
    ];

    const STORAGE_KEY = "aw27_whatsnew_seen_v1";

    // ── Stockage ─────────────────────────────────────────────
    function getSeen() {
        try { return localStorage.getItem(STORAGE_KEY) || ""; } catch (_) { return ""; }
    }
    function setSeen(id) {
        try { localStorage.setItem(STORAGE_KEY, id); } catch (_) {}
        updateHeaderDot();
    }
    function latest() { return RELEASES[0]; }
    function hasUnseen() { return !!latest() && getSeen() !== latest().id; }

    function esc(s) {
        return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    // ══════════════════════════════════════════════════════════
    //  STYLES
    // ══════════════════════════════════════════════════════════
    function injectStyles() {
        if (document.getElementById("wn-styles")) return;
        // Police Google (Roboto) — sans effet si déjà chargée ou si bloquée
        if (!document.getElementById("wn-font")) {
            const l = document.createElement("link");
            l.id = "wn-font"; l.rel = "stylesheet";
            l.href = "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap";
            document.head.appendChild(l);
        }
        const s = document.createElement("style");
        s.id = "wn-styles";
        s.textContent = `
        :root {
            --wn-blue: #0b57d0; --wn-blue-c: #d3e3fd; --wn-on-blue-c: #041e49;
            --wn-surface: #ffffff; --wn-hero: #f0f4fd; --wn-on: #1f1f1f; --wn-on-var: #444746;
            --wn-outline: #c4c7c5; --wn-red: #ea4335; --wn-yellow: #fbbc04; --wn-green: #34a853; --wn-gblue: #4285f4;
            --wn-font: "Google Sans", "Google Sans Text", Roboto, "Segoe UI", Arial, sans-serif;
        }
        #wn-btn {
            position: relative; display: flex; align-items: center; justify-content: center;
            width: 40px; height: 40px; border-radius: 50%; border: none; background: none;
            cursor: pointer; color: var(--color-text-secondary, #444746); transition: background .15s;
        }
        #wn-btn:hover { background: rgba(11,87,208,.08); color: var(--wn-blue); }
        #wn-btn .wn-dot {
            position: absolute; top: 8px; right: 8px; width: 8px; height: 8px; border-radius: 50%;
            background: var(--wn-blue); border: 2px solid #fff; display: none;
        }
        #wn-btn.unseen .wn-dot { display: block; }

        /* ── Dialog Material 3 ── */
        #wn-overlay {
            position: fixed; inset: 0; z-index: 12000; background: rgba(0,0,0,.32);
            display: flex; align-items: center; justify-content: center; padding: 16px;
            opacity: 0; transition: opacity .2s;
        }
        #wn-overlay.show { opacity: 1; }
        #wn-card {
            width: 540px; max-width: 100%; max-height: 92vh; overflow: auto;
            background: var(--wn-surface); border-radius: 28px;
            box-shadow: 0 4px 8px 3px rgba(0,0,0,.15), 0 1px 3px rgba(0,0,0,.3);
            transform: scale(.94); opacity: 0; transition: transform .28s cubic-bezier(.2,0,0,1), opacity .2s;
            font-family: var(--wn-font); color: var(--wn-on); position: relative;
        }
        #wn-overlay.show #wn-card { transform: none; opacity: 1; }
        .wn-close {
            position: absolute; top: 12px; right: 12px; z-index: 3; width: 40px; height: 40px;
            border-radius: 50%; border: none; background: transparent; cursor: pointer; color: var(--wn-on-var);
            display: flex; align-items: center; justify-content: center;
        }
        .wn-close:hover { background: rgba(31,31,31,.08); }

        .wn-hero {
            height: 236px; background: var(--wn-hero); margin: 8px 8px 0; border-radius: 22px;
            display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;
        }
        /* Formes Google décoratives */
        .wn-shape { position: absolute; border-radius: 50%; opacity: .9; animation: wn-float 6s ease-in-out infinite; }
        .wn-sh1 { width: 46px; height: 46px; background: var(--wn-yellow); top: 18px; left: 26px; }
        .wn-sh2 { width: 22px; height: 22px; background: var(--wn-red); bottom: 26px; left: 58px; animation-delay: -2s; }
        .wn-sh3 { width: 60px; height: 60px; background: var(--wn-green); bottom: -18px; right: 40px; animation-delay: -1s; }
        .wn-sh4 { width: 16px; height: 16px; background: var(--wn-gblue); top: 32px; right: 70px; animation-delay: -3s; }
        .wn-sh5 { width: 90px; height: 90px; border: 10px solid var(--wn-gblue); background: transparent; top: -40px; right: -26px; opacity: .25; }
        @keyframes wn-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        .wn-hero > .wn-stage { position: relative; z-index: 2; }

        .wn-body { padding: 22px 28px 4px; text-align: center; }
        .wn-chip {
            display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 12px; border-radius: 8px;
            font-size: 12px; font-weight: 500; letter-spacing: .1px; margin-bottom: 12px;
        }
        .wn-chip-Nouveau  { background: var(--wn-blue-c); color: var(--wn-on-blue-c); }
        .wn-chip-Amélioré { background: #c4eed0; color: #072711; }
        .wn-chip-Corrigé  { background: #ffdf99; color: #241a00; }
        .wn-title { font-size: 24px; line-height: 32px; font-weight: 400; margin: 0 0 8px; color: var(--wn-on); }
        .wn-text  { font-size: 14px; line-height: 20px; color: var(--wn-on-var); margin: 0 auto 14px; max-width: 420px; letter-spacing: .25px; }
        .wn-bullets { margin: 0 auto; padding: 0; list-style: none; display: inline-flex; flex-direction: column; gap: 8px; text-align: left; max-width: 420px; }
        .wn-bullets li { font-size: 13px; line-height: 18px; color: var(--wn-on-var); display: flex; gap: 10px; align-items: flex-start; }
        .wn-bullets li svg { flex-shrink: 0; margin-top: 1px; }
        .wn-pager { display: flex; justify-content: center; gap: 8px; padding: 18px 0 4px; }
        .wn-pager span { width: 8px; height: 8px; border-radius: 50%; background: var(--wn-outline); cursor: pointer; transition: all .25s; }
        .wn-pager span.on { background: var(--wn-blue); width: 24px; border-radius: 4px; }
        .wn-foot { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 12px 24px 24px; }
        .wn-more { display: block; margin: 10px auto 0; font-size: 13px; color: var(--wn-blue); background: none; border: none; cursor: pointer; font-family: var(--wn-font); font-weight: 500; padding: 6px 12px; border-radius: 16px; }
        .wn-more:hover { background: rgba(11,87,208,.08); }
        .wn-b {
            font-family: var(--wn-font); font-size: 14px; font-weight: 500; letter-spacing: .1px;
            height: 40px; padding: 0 24px; border-radius: 20px; cursor: pointer; border: none; white-space: nowrap;
            background: transparent; color: var(--wn-blue); transition: background .15s, box-shadow .15s;
        }
        .wn-b:hover { background: rgba(11,87,208,.08); }
        .wn-b-filled { background: var(--wn-blue); color: #fff; }
        .wn-b-filled:hover { background: #0a4fbd; box-shadow: 0 1px 3px rgba(0,0,0,.3); }
        .wn-b-tonal { background: var(--wn-blue-c); color: var(--wn-on-blue-c); }
        .wn-b-tonal:hover { background: #c2d7fb; }
        .wn-b-sm { height: 32px; padding: 0 14px; font-size: 13px; }

        /* Liste historique */
        .wn-list { padding: 28px 28px 8px; }
        .wn-list h3 { font-size: 24px; font-weight: 400; margin: 0 0 18px; }
        .wn-rel { margin-bottom: 18px; }
        .wn-rel-h { font-size: 12px; font-weight: 500; color: var(--wn-blue); margin-bottom: 8px; letter-spacing: .5px; text-transform: uppercase; }
        .wn-rel-item { display: flex; gap: 12px; align-items: flex-start; padding: 12px; border-radius: 16px; cursor: pointer; }
        .wn-rel-item:hover { background: #f0f4fd; }
        .wn-rel-item b { font-size: 14px; font-weight: 500; display: block; color: var(--wn-on); margin-bottom: 2px; }
        .wn-rel-item span.t { font-size: 13px; color: var(--wn-on-var); line-height: 18px; }
        .wn-rel-item .wn-chip { margin: 0; flex-shrink: 0; }

        /* ── Feature discovery (cercle bleu Google) ── */
        #wn-fd { position: fixed; inset: 0; z-index: 12500; }
        #wn-fd-bg { position: fixed; inset: 0; background: rgba(0,0,0,.12); }
        .wn-fd-circle {
            position: fixed; border-radius: 50%; background: rgba(11,87,208,.96);
            transform: scale(0); animation: wn-fd-in .45s cubic-bezier(.2,0,0,1) forwards;
        }
        @keyframes wn-fd-in { to { transform: scale(1); } }
        .wn-fd-hole {
            position: fixed; border-radius: 50%; background: transparent;
            box-shadow: 0 0 0 4px #fff; animation: wn-fd-pulse 1.6s ease-out infinite .45s;
        }
        @keyframes wn-fd-pulse { 0% { box-shadow: 0 0 0 4px #fff, 0 0 0 4px rgba(255,255,255,.6) } 100% { box-shadow: 0 0 0 4px #fff, 0 0 0 22px rgba(255,255,255,0) } }
        .wn-fd-text {
            position: fixed; width: 270px; color: #fff; font-family: var(--wn-font);
            opacity: 0; animation: wn-fd-txt .3s ease forwards .35s;
        }
        @keyframes wn-fd-txt { to { opacity: 1; } }
        .wn-fd-text h4 { font-size: 20px; font-weight: 400; margin: 0 0 6px; line-height: 26px; }
        .wn-fd-text p { font-size: 14px; line-height: 20px; margin: 0 0 12px; color: rgba(255,255,255,.9); }
        .wn-fd-text .wn-b { color: #fff; padding: 0 12px; height: 36px; }
        .wn-fd-text .wn-b:hover { background: rgba(255,255,255,.12); }
        .wn-fd-text .wn-b-white { background: #fff; color: var(--wn-blue); }
        .wn-fd-text .wn-b-white:hover { background: #f0f4fd; }

        /* ── Démos (couleurs Google) ── */
        .wd-box { width: 360px; max-width: 86vw; background: #fff; border-radius: 16px; box-shadow: 0 1px 3px rgba(60,64,67,.3), 0 4px 8px 3px rgba(60,64,67,.15); padding: 12px 14px; position: relative; font-size: 12px; font-family: var(--wn-font); text-align: left; }
        .wd-row { display: flex; align-items: center; gap: 8px; padding: 8px 4px; border-bottom: 1px solid #f1f3f4; overflow: hidden; }
        .wd-pill { padding: 2px 8px; border-radius: 6px; font-size: 10.5px; font-weight: 500; white-space: nowrap; }
        .wd-red { background: #fce8e6; color: #c5221f; }
        .wd-amb { background: #fef7e0; color: #b06000; }
        .wd-blu { background: #e8f0fe; color: #1967d2; }
        .wd-grn { background: #e6f4ea; color: #137333; }
        .wd-txt { flex: 1; color: #3c4043; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .wd-fait { padding: 3px 10px; border-radius: 14px; background: #e6f4ea; color: #137333; font-weight: 500; font-size: 10.5px; }
        .wd-done-row { animation: wd-row 4.5s infinite; }
        @keyframes wd-row { 0%,55%{opacity:1;max-height:40px} 70%,92%{opacity:0;max-height:0;padding:0 4px} 100%{opacity:1;max-height:40px} }
        .wd-done-btn { animation: wd-press 4.5s infinite; }
        @keyframes wd-press { 0%,40%{transform:scale(1)} 45%{transform:scale(.88);background:#ceead6} 50%,100%{transform:scale(1)} }
        .wd-cursor { position: absolute; width: 18px; height: 18px; animation: wd-cur 4.5s infinite; z-index: 3; }
        @keyframes wd-cur { 0%{top:140px;left:40px;opacity:0} 15%{opacity:1} 40%,48%{top:26px;left:306px;opacity:1} 70%{opacity:0} 100%{top:140px;left:40px;opacity:0} }
        .wd-bell { position: absolute; top: -14px; right: -14px; width: 36px; height: 36px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(60,64,67,.3); display: flex; align-items: center; justify-content: center; }
        .wd-bell b { position: absolute; top: -3px; right: -3px; min-width: 16px; height: 16px; border-radius: 8px; background: #d93025; color: #fff; font-size: 10px; font-weight: 500; display: flex; align-items: center; justify-content: center; }
        .wd-n4 { animation: wd-n4 4.5s infinite; } .wd-n3 { animation: wd-n3 4.5s infinite; opacity: 0; position: absolute; }
        @keyframes wd-n4 { 0%,58%{opacity:1} 62%,95%{opacity:0} 100%{opacity:1} }
        @keyframes wd-n3 { 0%,58%{opacity:0} 62%,95%{opacity:1} 100%{opacity:0} }
        .wd-comment { background: #f8f9fa; border-radius: 12px; padding: 9px 11px; color: #3c4043; font-size: 11.5px; line-height: 16px; }
        .wd-hl { border-radius: 4px; padding: 0 3px; animation: wd-hl 3.6s infinite; }
        @keyframes wd-hl { 0%,15%{background:transparent} 30%,100%{background:#feefc3} }
        .wd-arrow { text-align: center; color: #1a73e8; font-size: 18px; margin: 4px 0; animation: wd-fade 3.6s infinite; }
        .wd-alert { border-radius: 12px; padding: 9px 11px; background: #fff; box-shadow: inset 0 0 0 1px #f6aea9; animation: wd-pop 3.6s infinite; }
        @keyframes wd-fade { 0%,30%{opacity:0} 45%,100%{opacity:1} }
        @keyframes wd-pop { 0%,45%{opacity:0;transform:translateY(6px)} 60%,100%{opacity:1;transform:none} }
        .wd-map { display: grid; grid-template-columns: 1fr 26px 1fr; gap: 6px 4px; align-items: center; }
        .wd-cell { padding: 5px 9px; border-radius: 8px; font-size: 11px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .wd-xl { background: #e6f4ea; color: #0d652d; }
        .wd-gs { background: #e8f0fe; color: #174ea6; opacity: 0; }
        .wd-ar { text-align: center; color: #1a73e8; opacity: 0; }
        .wd-hd { font-size: 10.5px; color: #5f6368; font-weight: 500; }
        .wd-s1 { animation: wd-in 5s infinite; } .wd-s2 { animation: wd-in 5s infinite .5s; }
        .wd-s3 { animation: wd-in 5s infinite 1s; } .wd-s4 { animation: wd-in 5s infinite 1.5s; }
        @keyframes wd-in { 0%{opacity:0;transform:translateX(-6px)} 12%,85%{opacity:1;transform:none} 100%{opacity:0} }
        .wd-card { width: 220px; background: #fff; border-radius: 16px; box-shadow: 0 1px 3px rgba(60,64,67,.3), 0 4px 8px 3px rgba(60,64,67,.15); overflow: hidden; font-family: var(--wn-font); text-align: left; }
        .wd-card-img { height: 52px; background: #d3e3fd; }
        .wd-card-b { padding: 10px 12px; font-size: 11.5px; }
        .wd-f { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f1f3f4; color: #5f6368; }
        .wd-f b { color: #202124; font-weight: 500; position: relative; }
        .wd-old { color: #d93025 !important; animation: wd-old 4s infinite; }
        .wd-new { color: #188038 !important; position: absolute; right: 0; top: 0; opacity: 0; animation: wd-new 4s infinite; white-space: nowrap; }
        @keyframes wd-old { 0%,35%{opacity:1;text-decoration:none} 45%{opacity:1;text-decoration:line-through} 55%,92%{opacity:0} 100%{opacity:1} }
        @keyframes wd-new { 0%,50%{opacity:0} 62%,92%{opacity:1} 100%{opacity:0} }
        .wd-src { font-size: 10.5px; margin-top: 8px; text-align: center; }
        `;
        document.head.appendChild(s);
    }

    // ══════════════════════════════════════════════════════════
    //  DÉMOS
    // ══════════════════════════════════════════════════════════
    const BELL_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`;
    const CURSOR_SVG = `<svg class="wd-cursor" viewBox="0 0 24 24"><path d="M4 2l16 9-7 2-3 7z" fill="#111827" stroke="#fff" stroke-width="1.5"/></svg>`;

    function demoHTML(kind) {
        switch (kind) {
            case "done": return `
                <div class="wd-box">
                    <div class="wd-bell">${BELL_SVG}<b><span class="wd-n4">4</span><span class="wd-n3" style="position:absolute">3</span></b></div>
                    <div class="wd-row wd-done-row"><span class="wd-pill wd-red">Critique</span><span class="wd-txt">KEWINY-BG — PSD 2j de retard</span><span class="wd-fait wd-done-btn">✓ Fait</span></div>
                    <div class="wd-row"><span class="wd-pill wd-amb">Attention</span><span class="wd-txt">RILEY-BG — Sewing Trims dans 2j</span><span class="wd-fait">✓ Fait</span></div>
                    <div class="wd-row"><span class="wd-pill wd-blu">À clôturer</span><span class="wd-txt">EREA-BG — PSD In House</span><span class="wd-fait">✓ Fait</span></div>
                    ${CURSOR_SVG}
                </div>`;
            case "ordering": return `
                <div class="wd-box">
                    <div class="wd-comment">💬 Delivered · « Balance 58pcs on size 47cm will be for tomorrow <span class="wd-hl">25/11</span> »</div>
                    <div class="wd-arrow">↓</div>
                    <div class="wd-alert">
                        <div style="display:flex;gap:8px;align-items:center;margin-bottom:4px">
                            <span class="wd-pill wd-red">Critique</span>
                            <b style="font-size:12px;color:#111827">Reliquat en retard de 1j</b>
                        </div>
                        <div style="color:#6b7280;font-size:11px">PO CL2605763 · CARE LABELS (LABELTEX) · EREA-BG</div>
                    </div>
                </div>`;
            case "psd": return `
                <div class="wd-box">
                    <div class="wd-map">
                        <div class="wd-hd">Excel</div><div></div><div class="wd-hd">Google Sheet</div>
                        <div class="wd-cell wd-xl">PSD : All OK</div><div class="wd-ar wd-s1">→</div><div class="wd-cell wd-gs wd-s1">All OK</div>
                        <div class="wd-cell wd-xl">PSD : 9-Dec</div><div class="wd-ar wd-s2">→</div><div class="wd-cell wd-gs wd-s2">2026-12-09</div>
                        <div class="wd-cell wd-xl">Sewing : UNDER GRN</div><div class="wd-ar wd-s3">→</div><div class="wd-cell wd-gs wd-s3">UNDER GRN</div>
                        <div class="wd-cell wd-xl">Ex-fty (AB) : 8-Jan</div><div class="wd-ar wd-s4">→</div><div class="wd-cell wd-gs wd-s4">Possible etd 2027-01-08</div>
                    </div>
                </div>`;
            case "card": return `
                <div class="wd-card">
                    <div class="wd-card-img"></div>
                    <div class="wd-card-b">
                        <div style="font-weight:700;color:#111827;margin-bottom:6px">RILEY-BG</div>
                        <div class="wd-f"><span>Qty</span><b>1 800 u.</b></div>
                        <div class="wd-f"><span>PSD</span><b><span class="wd-old">19 août</span><span class="wd-new">09 déc.</span></b></div>
                        <div class="wd-src"><span class="wd-pill wd-red">PO Deadline</span> → <span class="wd-pill wd-grn">PSD (Details)</span></div>
                    </div>
                </div>`;
            default: return `<div style="font-size:44px">✨</div>`;
        }
    }

    // ══════════════════════════════════════════════════════════
    //  MODALE
    // ══════════════════════════════════════════════════════════
    let _rel = null, _idx = 0;

    function open(release, startIdx) {
        _rel = release || latest();
        if (!_rel) return;
        _idx = startIdx || 0;
        closeSpotlight();
        ensureOverlay();
        renderSlide();
        setSeen(latest().id); // vu dès l'ouverture, comme Google
    }

    function ensureOverlay() {
        let ov = document.getElementById("wn-overlay");
        if (ov) return ov;
        ov = document.createElement("div");
        ov.id = "wn-overlay";
        ov.innerHTML = `<div id="wn-card" role="dialog" aria-modal="true" aria-label="Nouveautés"></div>`;
        ov.addEventListener("click", e => { if (e.target === ov) close(); });
        document.body.appendChild(ov);
        requestAnimationFrame(() => ov.classList.add("show"));
        document.addEventListener("keydown", onKey);
        return ov;
    }

    function close() {
        const ov = document.getElementById("wn-overlay");
        document.removeEventListener("keydown", onKey);
        if (!ov) return;
        ov.classList.remove("show");
        setTimeout(() => ov.remove(), 200);
    }

    function onKey(e) {
        if (!document.getElementById("wn-overlay")) return;
        if (e.key === "Escape") close();
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
    }

    function go(step) {
        if (!_rel) return;
        const n = _rel.features.length;
        const next = _idx + step;
        if (next < 0) return;
        if (next >= n) { close(); return; }
        _idx = next;
        renderSlide();
    }

    const ICON_CLOSE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
    const ICON_CHECK = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0b57d0" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
    const ICON_SPARK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4z"/></svg>`;

    function heroShapes() {
        return `<span class="wn-shape wn-sh1"></span><span class="wn-shape wn-sh2"></span>
                <span class="wn-shape wn-sh3"></span><span class="wn-shape wn-sh4"></span><span class="wn-shape wn-sh5"></span>`;
    }

    function renderSlide() {
        const card = document.getElementById("wn-card");
        if (!card || !_rel) return;
        const f = _rel.features[_idx];
        const n = _rel.features.length;
        const last = _idx === n - 1;
        const canTry = !!(f.target || f.action);

        card.innerHTML = `
            <button class="wn-close" aria-label="Fermer" data-wn="close">${ICON_CLOSE}</button>
            <div class="wn-hero">${heroShapes()}<div class="wn-stage">${demoHTML(f.demo)}</div></div>
            <div class="wn-body">
                <span class="wn-chip wn-chip-${esc(f.tag)}">${ICON_SPARK}${esc(f.tag)}</span>
                <h2 class="wn-title">${esc(f.title)}</h2>
                <p class="wn-text">${esc(f.text)}</p>
                ${f.bullets && f.bullets.length ? `<ul class="wn-bullets">${f.bullets.map(b => `<li>${ICON_CHECK}<span>${esc(b)}</span></li>`).join("")}</ul>` : ""}
                ${n > 1 ? `<div class="wn-pager">${_rel.features.map((_, i) => `<span class="${i === _idx ? "on" : ""}" data-wn-dot="${i}" title="${i + 1}/${n}"></span>`).join("")}</div>` : ""}
                <button class="wn-more" data-wn="list">Toutes les nouveautés</button>
            </div>
            <div class="wn-foot">
                ${_idx > 0 ? `<button class="wn-b" data-wn="prev">Retour</button>` : `<button class="wn-b" data-wn="close">Plus tard</button>`}
                ${canTry ? `<button class="wn-b wn-b-tonal" data-wn="show">Essayer</button>` : ""}
                <button class="wn-b wn-b-filled" data-wn="next">${last ? "OK, compris" : "Suivant"}</button>
            </div>`;

        card.onclick = e => {
            const t = e.target.closest("[data-wn],[data-wn-dot]");
            if (!t) return;
            if (t.dataset.wnDot !== undefined) { _idx = +t.dataset.wnDot; renderSlide(); return; }
            const a = t.dataset.wn;
            if (a === "close") close();
            else if (a === "prev") go(-1);
            else if (a === "next") go(1);
            else if (a === "list") renderList();
            else if (a === "show") showInApp(f);
        };
    }

    function renderList() {
        const card = document.getElementById("wn-card");
        if (!card) return;
        card.innerHTML = `
            <button class="wn-close" aria-label="Fermer" data-wn="close">${ICON_CLOSE}</button>
            <div class="wn-list">
                <h3>Nouveautés</h3>
                ${RELEASES.map((r, ri) => `
                    <div class="wn-rel">
                        <div class="wn-rel-h">${esc(r.date)}</div>
                        ${r.features.map((f, fi) => `
                            <div class="wn-rel-item" data-r="${ri}" data-f="${fi}">
                                <span class="wn-chip wn-chip-${esc(f.tag)}">${esc(f.tag)}</span>
                                <div><b>${esc(f.title)}</b><span class="t">${esc(f.text)}</span></div>
                            </div>`).join("")}
                    </div>`).join("")}
            </div>
            <div class="wn-foot"><button class="wn-b wn-b-filled" data-wn="close">Fermer</button></div>`;
        card.onclick = e => {
            if (e.target.closest("[data-wn='close']")) { close(); return; }
            const it = e.target.closest(".wn-rel-item");
            if (it) { _rel = RELEASES[+it.dataset.r]; _idx = +it.dataset.f; renderSlide(); }
        };
    }

    // ══════════════════════════════════════════════════════════
    //  « ESSAYER » — Feature discovery Google (cercle bleu)
    // ══════════════════════════════════════════════════════════
    function showInApp(f) {
        close();
        const el = f.target ? [...document.querySelectorAll(f.target)].find(isVisible) : null;
        if (!el) {
            if (f.action) { try { f.action.run(); } catch (_) {} return; }
            if (typeof showToast === "function") showToast("Ouvrez le dashboard pour voir cette nouveauté", "info");
            return;
        }
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        setTimeout(() => spotlight(el, f), 350);
    }

    function isVisible(el) {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
    }

    function spotlight(el, f) {
        closeSpotlight();
        const r  = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const hole = Math.max(r.width, r.height) / 2 + 12;          // rayon du trou autour de l'élément

        // Texte placé vers le centre de l'écran (sous/à gauche si l'élément est en haut à droite)
        const goLeft = cx > window.innerWidth / 2;
        const goDown = cy < window.innerHeight / 2;
        const tw = 270, th = 150;
        let tx = goLeft ? cx - tw + hole * 0.4 : cx - hole * 0.4;
        let ty = goDown ? cy + hole + 22 : cy - hole - th - 22;
        tx = Math.min(Math.max(16, tx), window.innerWidth - tw - 16);
        ty = Math.min(Math.max(16, ty), window.innerHeight - th - 16);

        // Rayon du cercle bleu : assez grand pour contenir tout le texte
        const corners = [[tx, ty], [tx + tw, ty], [tx, ty + th], [tx + tw, ty + th]];
        const far = Math.max(...corners.map(([x, y]) => Math.hypot(x - cx, y - cy)));
        const big = Math.max(hole + 120, far + 28);

        const layer = document.createElement("div");
        layer.id = "wn-fd";
        layer.innerHTML = `
            <div id="wn-fd-bg"></div>
            <div class="wn-fd-circle" style="left:${cx - big}px;top:${cy - big}px;width:${big * 2}px;height:${big * 2}px;
                 -webkit-mask: radial-gradient(circle at center, transparent ${hole}px, #000 ${hole + 1}px);
                         mask: radial-gradient(circle at center, transparent ${hole}px, #000 ${hole + 1}px);"></div>
            <div class="wn-fd-hole" style="left:${cx - hole}px;top:${cy - hole}px;width:${hole * 2}px;height:${hole * 2}px"></div>
            <div class="wn-fd-text" style="left:${tx}px;top:${ty}px">
                <h4>${esc(f.title)}</h4>
                <p>${esc(f.targetText || f.text)}</p>
                <div style="display:flex;gap:8px">
                    ${f.action ? `<button class="wn-b wn-b-white" data-act="1">${esc(f.action.label)}</button>` : ""}
                    <button class="wn-b" data-ok="1">OK</button>
                </div>
            </div>`;
        document.body.appendChild(layer);

        layer.addEventListener("click", e => {
            if (e.target.closest("[data-act]")) { closeSpotlight(); try { f.action.run(); } catch (_) {} return; }
            closeSpotlight();
        });
        document.addEventListener("keydown", spotKey);
    }

    function spotKey(e) { if (e.key === "Escape") closeSpotlight(); }
    function closeSpotlight() {
        document.getElementById("wn-fd")?.remove();
        document.removeEventListener("keydown", spotKey);
    }

    // ══════════════════════════════════════════════════════════
    //  BOUTON ✨ DANS LE HEADER
    // ══════════════════════════════════════════════════════════
    function injectHeaderButton() {
        if (document.getElementById("wn-btn")) return true;
        const hr = document.querySelector(".header-right");
        if (!hr) return false;
        const btn = document.createElement("button");
        btn.id = "wn-btn";
        btn.title = "Nouveautés";
        btn.setAttribute("aria-label", "Nouveautés");
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/>
            </svg>
            <span class="wn-dot"></span>`;
        btn.onclick = () => open(latest(), 0);
        hr.insertBefore(btn, hr.firstChild);
        updateHeaderDot();
        return true;
    }

    function updateHeaderDot() {
        const b = document.getElementById("wn-btn");
        if (b) b.classList.toggle("unseen", hasUnseen());
    }

    // ══════════════════════════════════════════════════════════
    //  INIT
    // ══════════════════════════════════════════════════════════
    window.openWhatsNew = () => open(latest(), 0);

    function init() {
        injectStyles();

        // Bouton header (le header peut être rendu après coup)
        let tries = 0;
        const t = setInterval(() => {
            if (injectHeaderButton() || ++tries > 60) clearInterval(t);
        }, 500);

        // Ouverture automatique une fois, quand l'app est prête
        if (!hasUnseen()) return;
        let waited = 0;
        const w = setInterval(() => {
            waited += 500;
            const ready = window.state?.data?.details?.length;
            const busy  = document.querySelector(".modal-overlay.open, #sa-table-modal-overlay.open, #psd-val-modal");
            if ((ready && !busy && waited >= 1500) || waited >= 15000) {
                clearInterval(w);
                if (hasUnseen() && !busy) open(latest(), 0);
            }
        }, 500);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else setTimeout(init, 300);

})();
