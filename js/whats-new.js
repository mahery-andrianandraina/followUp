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
        const s = document.createElement("style");
        s.id = "wn-styles";
        s.textContent = `
        #wn-btn {
            position: relative; display: flex; align-items: center; justify-content: center;
            width: 36px; height: 36px; border-radius: 50%; border: none; background: none;
            cursor: pointer; color: var(--color-text-secondary, #6b7280); transition: background .15s, color .15s;
        }
        #wn-btn:hover { background: #f3e8ff; color: #7c3aed; }
        #wn-btn .wn-dot {
            position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; border-radius: 50%;
            background: #7c3aed; border: 1.5px solid #fff; display: none;
        }
        #wn-btn.unseen .wn-dot { display: block; animation: wn-ping 1.6s infinite; }
        @keyframes wn-ping { 0%{box-shadow:0 0 0 0 rgba(124,58,237,.55)} 80%,100%{box-shadow:0 0 0 7px rgba(124,58,237,0)} }

        #wn-overlay {
            position: fixed; inset: 0; z-index: 12000; background: rgba(15,23,42,.45);
            display: flex; align-items: center; justify-content: center; padding: 16px;
            opacity: 0; transition: opacity .2s;
        }
        #wn-overlay.show { opacity: 1; }
        #wn-card {
            width: 560px; max-width: 100%; max-height: 92vh; overflow: auto;
            background: #fff; border-radius: 18px; box-shadow: 0 24px 48px rgba(0,0,0,.18);
            transform: translateY(12px) scale(.98); transition: transform .22s cubic-bezier(.2,.8,.2,1);
            font-family: inherit; color: #1f2937; position: relative;
        }
        #wn-overlay.show #wn-card { transform: none; }
        .wn-close {
            position: absolute; top: 12px; right: 12px; z-index: 2; width: 32px; height: 32px;
            border-radius: 50%; border: none; background: rgba(255,255,255,.85); cursor: pointer;
            color: #6b7280; font-size: 16px;
        }
        .wn-close:hover { background: #f3f4f6; color: #111827; }
        .wn-demo {
            height: 210px; background: #f5f3ff; border-radius: 18px 18px 0 0;
            display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;
        }
        .wn-body { padding: 18px 24px 8px; }
        .wn-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 11.5px; color: #6b7280; }
        .wn-tag { padding: 2px 9px; border-radius: 20px; font-weight: 600; font-size: 11px; }
        .wn-tag-Nouveau  { background: #ede9fe; color: #6d28d9; }
        .wn-tag-Amélioré { background: #dbeafe; color: #1d4ed8; }
        .wn-tag-Corrigé  { background: #dcfce7; color: #15803d; }
        .wn-title { font-size: 19px; font-weight: 600; margin: 0 0 6px; color: #111827; }
        .wn-text  { font-size: 13.5px; line-height: 1.55; color: #374151; margin: 0 0 10px; }
        .wn-bullets { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
        .wn-bullets li { font-size: 12.5px; color: #4b5563; display: flex; gap: 8px; line-height: 1.45; }
        .wn-bullets li::before { content: "✓"; color: #7c3aed; font-weight: 700; flex-shrink: 0; }
        .wn-foot {
            display: flex; align-items: center; gap: 8px; padding: 14px 24px 18px; flex-wrap: wrap;
        }
        .wn-dots { display: flex; gap: 6px; margin-right: auto; }
        .wn-dots span { width: 7px; height: 7px; border-radius: 50%; background: #e5e7eb; cursor: pointer; transition: all .2s; }
        .wn-dots span.on { background: #7c3aed; width: 20px; border-radius: 4px; }
        .wn-b {
            font-family: inherit; font-size: 13px; font-weight: 500; padding: 8px 14px; border-radius: 20px;
            cursor: pointer; border: 1px solid #e5e7eb; background: #fff; color: #374151;
        }
        .wn-b:hover { background: #f9fafb; }
        .wn-b-primary { background: #7c3aed; border-color: #7c3aed; color: #fff; }
        .wn-b-primary:hover { background: #6d28d9; }
        .wn-b-link { border: none; background: none; color: #7c3aed; padding: 8px 6px; }
        .wn-b-link:hover { background: #f5f3ff; }
        .wn-all { font-size: 12px; color: #6b7280; padding: 0 24px 16px; }
        .wn-all a { color: #7c3aed; cursor: pointer; text-decoration: none; }
        .wn-all a:hover { text-decoration: underline; }

        /* Liste historique */
        .wn-list { padding: 22px 24px 8px; }
        .wn-list h3 { font-size: 18px; margin: 0 0 14px; font-weight: 600; }
        .wn-rel { margin-bottom: 16px; }
        .wn-rel-h { font-size: 12px; color: #6b7280; margin-bottom: 8px; }
        .wn-rel-item {
            display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 10px;
            border: 1px solid #f0f0f3; margin-bottom: 6px; cursor: pointer;
        }
        .wn-rel-item:hover { background: #faf5ff; border-color: #e9d5ff; }
        .wn-rel-item b { font-size: 13px; font-weight: 600; display: block; color: #111827; }
        .wn-rel-item span.t { font-size: 12px; color: #6b7280; }

        /* Spotlight */
        #wn-spot-layer { position: fixed; inset: 0; z-index: 12500; }
        #wn-spot {
            position: fixed; border-radius: 12px; pointer-events: none;
            box-shadow: 0 0 0 9999px rgba(15,23,42,.55); transition: all .3s ease;
        }
        #wn-spot::after {
            content: ""; position: absolute; inset: -6px; border-radius: 16px;
            border: 2px solid #a78bfa; animation: wn-ring 1.4s infinite;
        }
        @keyframes wn-ring { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(1.15)} }
        #wn-bubble {
            position: fixed; max-width: 280px; background: #fff; border-radius: 12px; padding: 12px 14px;
            box-shadow: 0 12px 28px rgba(0,0,0,.2); font-size: 13px; color: #1f2937; line-height: 1.45;
        }
        #wn-bubble .wn-b { margin-top: 10px; padding: 6px 12px; font-size: 12px; }

        /* ── Démos animées ── */
        .wd-box { width: 380px; max-width: 88%; background: #fff; border-radius: 12px; box-shadow: 0 6px 18px rgba(76,29,149,.12); padding: 12px 14px; position: relative; font-size: 12px; }
        .wd-row { display: flex; align-items: center; gap: 8px; padding: 8px 6px; border-bottom: 1px solid #f3f4f6; }
        .wd-pill { padding: 2px 8px; border-radius: 20px; font-size: 10.5px; font-weight: 600; white-space: nowrap; }
        .wd-red { background: #fee2e2; color: #b91c1c; }
        .wd-amb { background: #fef3c7; color: #b45309; }
        .wd-blu { background: #dbeafe; color: #1d4ed8; }
        .wd-grn { background: #dcfce7; color: #15803d; }
        .wd-txt { flex: 1; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .wd-fait { padding: 3px 9px; border-radius: 6px; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-weight: 600; font-size: 10.5px; }

        /* démo "done" */
        .wd-done-row { animation: wd-row 4.5s infinite; transform-origin: top; }
        @keyframes wd-row { 0%,55%{opacity:1;max-height:40px} 70%,92%{opacity:0;max-height:0;padding:0 6px} 100%{opacity:1;max-height:40px} }
        .wd-done-btn { animation: wd-press 4.5s infinite; }
        @keyframes wd-press { 0%,40%{transform:scale(1)} 45%{transform:scale(.88)} 50%,100%{transform:scale(1)} }
        .wd-cursor { position: absolute; width: 18px; height: 18px; animation: wd-cur 4.5s infinite; }
        @keyframes wd-cur { 0%{top:150px;left:40px;opacity:0} 15%{opacity:1} 40%,48%{top:30px;left:318px;opacity:1} 70%{opacity:0} 100%{top:150px;left:40px;opacity:0} }
        .wd-bell { position: absolute; top: -12px; right: -12px; width: 34px; height: 34px; border-radius: 50%; background: #fff; box-shadow: 0 3px 10px rgba(0,0,0,.12); display: flex; align-items: center; justify-content: center; }
        .wd-bell b { position: absolute; top: -4px; right: -4px; min-width: 16px; height: 16px; border-radius: 8px; background: #dc2626; color: #fff; font-size: 9.5px; display: flex; align-items: center; justify-content: center; }
        .wd-n4 { animation: wd-n4 4.5s infinite; } .wd-n3 { animation: wd-n3 4.5s infinite; opacity: 0; }
        @keyframes wd-n4 { 0%,58%{opacity:1} 62%,95%{opacity:0} 100%{opacity:1} }
        @keyframes wd-n3 { 0%,58%{opacity:0} 62%,95%{opacity:1} 100%{opacity:0} }

        /* démo "ordering" */
        .wd-comment { background: #f9fafb; border: 1px dashed #d1d5db; border-radius: 10px; padding: 8px 10px; color: #4b5563; font-size: 11.5px; }
        .wd-hl { background: #fde68a; border-radius: 4px; padding: 0 3px; animation: wd-hl 3.6s infinite; }
        @keyframes wd-hl { 0%,15%{background:transparent} 30%,100%{background:#fde68a} }
        .wd-arrow { text-align: center; color: #a78bfa; font-size: 18px; margin: 4px 0; animation: wd-fade 3.6s infinite; }
        .wd-alert { border: 1px solid #fecaca; background: #fff; border-radius: 10px; padding: 8px 10px; animation: wd-pop 3.6s infinite; }
        @keyframes wd-fade { 0%,30%{opacity:0} 45%,100%{opacity:1} }
        @keyframes wd-pop { 0%,45%{opacity:0;transform:translateY(6px)} 60%,100%{opacity:1;transform:none} }

        /* démo "psd" */
        .wd-map { display: grid; grid-template-columns: 1fr 28px 1fr; gap: 6px 4px; align-items: center; }
        .wd-cell { padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .wd-xl { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
        .wd-gs { background: #eff6ff; color: #1e3a8a; border: 1px solid #bfdbfe; opacity: 0; }
        .wd-ar { text-align: center; color: #a78bfa; opacity: 0; }
        .wd-hd { font-size: 10px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
        .wd-s1 { animation: wd-in 5s infinite .0s; } .wd-s2 { animation: wd-in 5s infinite .5s; }
        .wd-s3 { animation: wd-in 5s infinite 1s; }  .wd-s4 { animation: wd-in 5s infinite 1.5s; }
        @keyframes wd-in { 0%{opacity:0;transform:translateX(-6px)} 12%,85%{opacity:1;transform:none} 100%{opacity:0} }

        /* démo "card" */
        .wd-card { width: 230px; background: #fff; border-radius: 12px; box-shadow: 0 6px 18px rgba(76,29,149,.12); overflow: hidden; }
        .wd-card-img { height: 54px; background: linear-gradient(135deg,#ede9fe,#e0e7ff); }
        .wd-card-b { padding: 10px 12px; font-size: 11.5px; }
        .wd-f { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; }
        .wd-f b { color: #111827; font-weight: 600; position: relative; }
        .wd-old { color: #dc2626 !important; animation: wd-old 4s infinite; }
        .wd-new { color: #15803d !important; position: absolute; right: 0; top: 0; opacity: 0; animation: wd-new 4s infinite; white-space: nowrap; }
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

    function renderSlide() {
        const card = document.getElementById("wn-card");
        if (!card || !_rel) return;
        const f = _rel.features[_idx];
        const n = _rel.features.length;
        const last = _idx === n - 1;
        const canShow = !!(f.target || f.action);

        card.innerHTML = `
            <button class="wn-close" aria-label="Fermer" data-wn="close">✕</button>
            <div class="wn-demo">${demoHTML(f.demo)}</div>
            <div class="wn-body">
                <div class="wn-meta">
                    <span class="wn-tag wn-tag-${esc(f.tag)}">${esc(f.tag)}</span>
                    <span>${esc(_rel.date)} · ${_idx + 1}/${n}</span>
                </div>
                <h2 class="wn-title">${esc(f.title)}</h2>
                <p class="wn-text">${esc(f.text)}</p>
                ${f.bullets && f.bullets.length ? `<ul class="wn-bullets">${f.bullets.map(b => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
            </div>
            <div class="wn-foot">
                <div class="wn-dots">${_rel.features.map((_, i) => `<span class="${i === _idx ? "on" : ""}" data-wn-dot="${i}" title="${i + 1}"></span>`).join("")}</div>
                ${_idx > 0 ? `<button class="wn-b" data-wn="prev">Précédent</button>` : ""}
                ${canShow ? `<button class="wn-b wn-b-link" data-wn="show">Voir dans l'app</button>` : ""}
                <button class="wn-b wn-b-primary" data-wn="next">${last ? "Terminer" : "Suivant"}</button>
            </div>
            <div class="wn-all">${RELEASES.length > 1 || n > 1 ? `<a data-wn="list">Toutes les nouveautés</a>` : ""}</div>`;

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
            <button class="wn-close" aria-label="Fermer" data-wn="close">✕</button>
            <div class="wn-list">
                <h3>✨ Toutes les nouveautés</h3>
                ${RELEASES.map((r, ri) => `
                    <div class="wn-rel">
                        <div class="wn-rel-h">${esc(r.date)} · ${esc(r.title)}</div>
                        ${r.features.map((f, fi) => `
                            <div class="wn-rel-item" data-r="${ri}" data-f="${fi}">
                                <span class="wn-tag wn-tag-${esc(f.tag)}">${esc(f.tag)}</span>
                                <div><b>${esc(f.title)}</b><span class="t">${esc(f.text)}</span></div>
                            </div>`).join("")}
                    </div>`).join("")}
            </div>
            <div class="wn-foot"><span style="margin-right:auto"></span><button class="wn-b wn-b-primary" data-wn="close">Fermer</button></div>`;
        card.onclick = e => {
            if (e.target.closest("[data-wn='close']")) { close(); return; }
            const it = e.target.closest(".wn-rel-item");
            if (it) { _rel = RELEASES[+it.dataset.r]; _idx = +it.dataset.f; renderSlide(); }
        };
    }

    // ══════════════════════════════════════════════════════════
    //  « VOIR DANS L'APP » — spotlight sur l'élément réel
    // ══════════════════════════════════════════════════════════
    function showInApp(f) {
        close();
        const el = f.target ? [...document.querySelectorAll(f.target)].find(isVisible) : null;
        if (!el) {
            if (f.action) { try { f.action.run(); } catch (_) {} return; }
            if (typeof showToast === "function") showToast("Élément non visible sur cet écran (ouvrez le dashboard)", "info");
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
        const r = el.getBoundingClientRect();
        const pad = 6;
        const layer = document.createElement("div");
        layer.id = "wn-spot-layer";
        layer.innerHTML = `
            <div id="wn-spot" style="top:${r.top - pad}px;left:${r.left - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px"></div>
            <div id="wn-bubble">
                <div>${esc(f.targetText || f.title)}</div>
                <div style="display:flex;gap:6px;justify-content:flex-end">
                    ${f.action ? `<button class="wn-b wn-b-primary" data-act="1">${esc(f.action.label)}</button>` : ""}
                    <button class="wn-b" data-ok="1">Compris</button>
                </div>
            </div>`;
        document.body.appendChild(layer);

        // Position de la bulle : sous l'élément si possible, sinon au-dessus
        const b = layer.querySelector("#wn-bubble");
        const bw = 280, bh = b.offsetHeight || 90;
        let top = r.bottom + 14;
        if (top + bh > window.innerHeight - 10) top = Math.max(10, r.top - bh - 14);
        let left = Math.min(Math.max(10, r.left + r.width / 2 - bw / 2), window.innerWidth - bw - 10);
        b.style.top = top + "px"; b.style.left = left + "px";

        layer.addEventListener("click", e => {
            if (e.target.closest("[data-act]")) { closeSpotlight(); try { f.action.run(); } catch (_) {} return; }
            closeSpotlight();
        });
        document.addEventListener("keydown", spotKey);
    }

    function spotKey(e) { if (e.key === "Escape") closeSpotlight(); }
    function closeSpotlight() {
        document.getElementById("wn-spot-layer")?.remove();
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/>
                <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>
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
