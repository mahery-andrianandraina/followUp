// ============================================================
//  AW27 CHECKERS — Header façon Google
//  Fichier : header-google.js
//  Charger APRÈS smartAlerts.js, todo.js, chat.js, settings-panel.js
//  et style-components.js :
//  <script src="js/header-google.js"></script>
//
//  • Header : seulement ✦ Nouveautés · 🔔 Notifications · ⋮⋮⋮ Actions
//  • 🔔 une seule cloche → panneau latéral à onglets
//      - « Intelligentes » : smartAlerts (avec ✓ Fait)
//      - « Par menu »      : alertes globales (collectAllAlerts)
//  • ⋮⋮⋮ lanceur d'outils (favoris personnalisables, comme Google)
//      Order Status Report, Importer PSD, Analyser TP, Artwork Checker,
//      Scanner commandes, Rapport d'alertes, Messagerie, Assistant IA, To-Do
//  • « + Nouveau » en haut de la barre latérale, Paramètres en bas
//  • Avatar du compte (carte Google), infobulles Google, effet ripple,
//    snackbar « Annuler » après ✓
//
//  Rien n'est supprimé : les anciens boutons sont seulement masqués.
//  Pour revenir à l'ancien header, retirer la ligne <script> dans index.html.
// ============================================================

(function initHeaderGoogle() {

    const FAV_KEY = "aw27_hg_favs_v1";
    const MAX_FAV = 9;

    // ══════════════════════════════════════════════════════════
    //  OUTILS DU LANCEUR
    //  run : action ; badge : renvoie un nombre / texte à afficher (optionnel)
    // ══════════════════════════════════════════════════════════
    const clickEl = sel => { const el = document.querySelector(sel); if (el) { el.click(); return true; } return false; };
    const textOf  = sel => { const el = document.querySelector(sel); if (!el) return ""; const t = el.textContent.trim(); return t && t !== "0" ? t : ""; };
    const visibleText = sel => {
        const el = document.querySelector(sel);
        if (!el) return "";
        const st = getComputedStyle(el);
        if (st.display === "none" || st.visibility === "hidden" || st.opacity === "0") return "";
        return el.textContent.trim() || "•";
    };

    const TOOLS = [
        { k: "psd",  n: "Importer PSD",        i: "ti-calendar-up",   c: "#1a73e8", b: "#e8f0fe",
          run: () => clickEl("#sc-am-psd") || (window._psdTriggerUpload && window._psdTriggerUpload()) },
        { k: "rep",  n: "Order Status Report", i: "ti-file-report",   c: "#d93025", b: "#fce8e6",
          run: () => clickEl("#sc-am-pdf") },
        { k: "chat", n: "Messagerie",          i: "ti-message-circle", c: "#188038", b: "#e6f4ea",
          run: () => (typeof window.cpToggle === "function" ? window.cpToggle() : clickEl("#chat-fab")),
          badge: () => textOf("#chat-fab-badge") },
        { k: "bot",  n: "Assistant IA",        i: "ti-robot",         c: "#9334e6", b: "#f3e8fd",
          run: () => clickEl("#fu-chatbot-btn"),
          badge: () => visibleText("#fu-notif-badge") },
        { k: "todo", n: "To-Do",               i: "ti-checklist",     c: "#e37400", b: "#fef7e0",
          run: () => (typeof window.openTodoPanel === "function" ? window.openTodoPanel() : clickEl("#todo-fab")),
          badge: () => textOf("#todo-fab-badge.visible") || textOf("#todo-nav-badge.visible") },
        { k: "tp",   n: "Analyser TP",         i: "ti-bolt",          c: "#1a73e8", b: "#e8f0fe",
          run: () => clickEl("#sc-am-tp") },
        { k: "art",  n: "Artwork Checker",     i: "ti-palette",       c: "#c5221f", b: "#fce8e6",
          run: () => clickEl("#sc-am-artwork") },
        { k: "scan", n: "Scanner commandes",   i: "ti-scan",          c: "#188038", b: "#e6f4ea",
          run: () => clickEl("#sc-am-scan") },
        { k: "mail", n: "Rapport d'alertes",   i: "ti-mail-forward",  c: "#e37400", b: "#fef7e0",
          run: () => clickEl("#sc-am-mail-report") }
    ];
    const DEFAULT_FAV = ["psd", "rep", "chat", "bot", "todo", "tp"];

    function getFavs() {
        try {
            const v = JSON.parse(localStorage.getItem(FAV_KEY) || "null");
            if (Array.isArray(v)) return v.filter(k => TOOLS.some(t => t.k === k)).slice(0, MAX_FAV);
        } catch (_) {}
        return DEFAULT_FAV.slice();
    }
    function setFavs(list) { try { localStorage.setItem(FAV_KEY, JSON.stringify(list)); } catch (_) {} }

    function esc(s) {
        return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    function stripHTML(s) {
        const d = document.createElement("div"); d.innerHTML = String(s || ""); return d.textContent.trim();
    }

    // ══════════════════════════════════════════════════════════
    //  STYLES
    // ══════════════════════════════════════════════════════════
    function injectStyles() {
        if (document.getElementById("hg-styles")) return;
        const s = document.createElement("style");
        s.id = "hg-styles";
        s.textContent = `
        /* Anciens boutons masqués (toujours présents dans la page) */
        #chat-fab, #btn-notif-global, #btn-topbar-settings, #topbar-settings-btn, #sa-bell-btn,
        #sc-actions-menu-wrapper, .header-right > .btn-header, #fu-chatbot-btn, #todo-fab,
        #todo-signal-bubble {
            display: none !important;
        }
        .header-right { gap: 4px !important; align-items: center !important; }

        .hg-ib {
            position: relative; overflow: hidden; width: 40px; height: 40px; border-radius: 50%; border: none;
            background: transparent; color: #fff; cursor: pointer; display: flex;
            align-items: center; justify-content: center; font-size: 21px; transition: background .15s;
            flex-shrink: 0;
        }
        .hg-ib:hover, .hg-ib.on { background: rgba(255,255,255,.18); }
        .hg-ib:focus-visible { outline: 2px solid #fff; outline-offset: 1px; }
        .hg-badge {
            position: absolute; top: 3px; right: 1px; min-width: 18px; height: 18px; padding: 0 5px;
            border-radius: 9px; background: #d93025; color: #fff; font: 500 10.5px/18px Roboto, Arial, sans-serif;
            text-align: center; border: 2px solid #1a5fd0; display: none; box-sizing: border-box;
        }
        .hg-badge.show { display: block; }
        .hg-dot { position: absolute; top: 8px; right: 8px; width: 8px; height: 8px; border-radius: 50%; background: #fbbc04; border: 2px solid #1a5fd0; display: none; }
        .hg-dot.show { display: block; }

        /* ── Avatar + carte de compte ── */
        .hg-av-btn { width: 40px; height: 40px; border-radius: 50%; border: none; background: transparent; padding: 4px; cursor: pointer; flex-shrink: 0; margin-left: 4px; }
        .hg-av-btn:hover, .hg-av-btn.on { background: rgba(255,255,255,.18); }
        .hg-av { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
                 font: 500 14px Roboto, Arial, sans-serif; color: #fff; overflow: hidden; }
        .hg-av img { width: 100%; height: 100%; object-fit: cover; }
        #hg-acc {
            position: fixed; z-index: 10970; width: 360px; max-width: calc(100vw - 16px);
            background: #e9eef6; border-radius: 28px; padding: 14px 8px 8px;
            box-shadow: 0 4px 8px 3px rgba(0,0,0,.15), 0 1px 3px rgba(0,0,0,.3);
            font-family: Roboto, "Segoe UI", Arial, sans-serif; color: #1f1f1f; text-align: center;
            opacity: 0; transform: scale(.96); transform-origin: top right; pointer-events: none;
            transition: opacity .15s, transform .18s cubic-bezier(.2,0,0,1);
        }
        #hg-acc.open { opacity: 1; transform: none; pointer-events: auto; }
        .hg-acc-mail { font-size: 14px; font-weight: 500; color: #1f1f1f; padding: 0 40px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .hg-acc-x { position: absolute; top: 10px; right: 10px; width: 36px; height: 36px; border-radius: 50%; border: none; background: none; cursor: pointer; color: #444746; font-size: 20px; display: flex; align-items: center; justify-content: center; }
        .hg-acc-x:hover { background: rgba(31,31,31,.08); }
        .hg-acc-big { width: 80px; height: 80px; border-radius: 50%; margin: 16px auto 10px; font-size: 34px; display: flex; align-items: center; justify-content: center; color: #fff; overflow: hidden; }
        .hg-acc-big img { width: 100%; height: 100%; object-fit: cover; }
        .hg-acc-hi { font-size: 22px; font-weight: 400; margin-bottom: 14px; }
        .hg-acc-manage { display: inline-flex; align-items: center; height: 40px; padding: 0 24px; border-radius: 20px; border: 1px solid #747775; background: transparent; color: #0b57d0; font: 500 14px Roboto, Arial, sans-serif; cursor: pointer; margin-bottom: 14px; }
        .hg-acc-manage:hover { background: rgba(11,87,208,.08); }
        .hg-acc-card { background: #fff; border-radius: 20px; overflow: hidden; text-align: left; }
        .hg-acc-row { display: flex; align-items: center; gap: 14px; width: 100%; height: 52px; padding: 0 24px; border: none; background: none; cursor: pointer; font: 400 14px Roboto, Arial, sans-serif; color: #1f1f1f; }
        .hg-acc-row:hover { background: #f0f4f9; }
        .hg-acc-row i { font-size: 22px; color: #444746; }
        .hg-acc-row + .hg-acc-row { border-top: 1px solid #e9eef6; }
        .hg-acc-foot { font-size: 12px; color: #444746; padding: 12px 0 6px; }

        /* ── Infobulle Google ── */
        #hg-tip {
            position: fixed; z-index: 11000; background: #3c4043; color: #fff; font: 500 12px/16px Roboto, Arial, sans-serif;
            padding: 5px 8px; border-radius: 4px; pointer-events: none; white-space: nowrap;
            opacity: 0; transform: scale(.9); transition: opacity .1s, transform .1s;
        }
        #hg-tip.show { opacity: .92; transform: none; }

        /* ── Ripple Material ── */
        .hg-ripple-host { position: relative; overflow: hidden; }
        .hg-ripple { position: absolute; border-radius: 50%; transform: scale(0); pointer-events: none;
                     background: currentColor; opacity: .22; animation: hg-rip .45s ease-out forwards; }
        @keyframes hg-rip { to { transform: scale(2.4); opacity: 0; } }

        /* ── Snackbar ── */
        #hg-snack {
            position: fixed; left: 24px; bottom: 24px; z-index: 11000; min-width: 288px; max-width: 560px;
            background: #313033; color: #f4eff4; font: 400 14px/20px Roboto, Arial, sans-serif;
            border-radius: 4px; padding: 6px 8px 6px 16px; display: flex; align-items: center; gap: 12px;
            box-shadow: 0 3px 5px -1px rgba(0,0,0,.2), 0 6px 10px rgba(0,0,0,.14);
            transform: translateY(24px); opacity: 0; pointer-events: none; transition: transform .2s, opacity .2s;
        }
        #hg-snack.show { transform: none; opacity: 1; pointer-events: auto; }
        #hg-snack span { flex: 1; padding: 8px 0; }
        #hg-snack button { border: none; background: none; color: #d0bcff; font: 500 14px Roboto, Arial, sans-serif; height: 36px; padding: 0 12px; border-radius: 18px; cursor: pointer; }
        #hg-snack button:hover { background: rgba(208,188,255,.12); }

        /* ── Barre latérale : + Nouveau et Paramètres ── */
        .hg-new {
            display: flex; align-items: center; gap: 12px; height: 48px; margin: 4px 10px 12px;
            padding: 0 18px; border-radius: 16px; border: none; cursor: pointer;
            background: #c2e7ff; color: #001d35; font: 500 14px Roboto, "Segoe UI", Arial, sans-serif;
            box-shadow: 0 1px 2px rgba(0,0,0,.3), 0 1px 3px 1px rgba(0,0,0,.15); transition: box-shadow .15s;
        }
        .hg-new:hover { box-shadow: 0 1px 3px rgba(0,0,0,.3), 0 4px 8px 3px rgba(0,0,0,.15); }
        .sidebar .hg-new, .sidebar .hg-new * { color: #001d35 !important; }
        .hg-new i { font-size: 20px; }
        .sidebar.collapsed .hg-new { width: 48px; padding: 0; justify-content: center; margin: 4px auto 12px; }
        .sidebar.collapsed .hg-new span { display: none; }
        .hg-side-foot { margin-top: auto; padding: 8px 0 10px; border-top: 1px solid rgba(255,255,255,.15); }
        .sidebar { display: flex !important; flex-direction: column !important; }

        /* ── Panneau notifications (side sheet) ── */
        #hg-np-back { position: fixed; inset: 0; z-index: 10900; display: none; }
        #hg-np-back.open { display: block; }
        #hg-np {
            position: fixed; right: 0; bottom: 0; width: 400px; max-width: 100vw; z-index: 10950;
            background: #fff; color: #1f1f1f; font-family: Roboto, "Segoe UI", Arial, sans-serif;
            box-shadow: -2px 0 6px rgba(0,0,0,.12), -6px 0 18px rgba(0,0,0,.1); border-radius: 16px 0 0 0;
            display: flex; flex-direction: column; transform: translateX(105%);
            transition: transform .28s cubic-bezier(.2,0,0,1);
        }
        #hg-np.open { transform: none; }
        .hg-np-h { display: flex; align-items: center; gap: 8px; padding: 16px 12px 6px 20px; }
        .hg-np-h h3 { margin: 0; font-size: 20px; font-weight: 400; flex: 1; }
        .hg-tbtn { height: 32px; padding: 0 12px; border-radius: 16px; border: none; background: none; color: #0b57d0; font: 500 12.5px Roboto, Arial, sans-serif; cursor: pointer; white-space: nowrap; }
        .hg-tbtn:hover { background: rgba(11,87,208,.08); }
        .hg-x { width: 36px; height: 36px; border-radius: 50%; border: none; background: none; cursor: pointer; color: #444746; font-size: 20px; display: flex; align-items: center; justify-content: center; }
        .hg-x:hover { background: rgba(31,31,31,.08); }
        .hg-tabs { display: flex; border-bottom: 1px solid #e3e3e3; padding: 0 12px; }
        .hg-tab { padding: 12px 14px 10px; font-size: 14px; font-weight: 500; color: #444746; cursor: pointer; border: none; background: none; border-bottom: 3px solid transparent; border-radius: 3px 3px 0 0; font-family: inherit; }
        .hg-tab.on { color: #0b57d0; border-bottom-color: #0b57d0; }
        .hg-tab em { font-style: normal; font-size: 11px; background: #e8eaed; border-radius: 9px; padding: 1px 7px; margin-left: 6px; color: #444746; }
        .hg-tab.on em { background: #d3e3fd; color: #041e49; }
        .hg-chips { display: flex; gap: 8px; padding: 12px 16px 4px; flex-wrap: wrap; }
        .hg-chip { height: 32px; border-radius: 8px; border: 1px solid #c4c7c5; background: #fff; font: 500 12.5px Roboto, Arial, sans-serif; color: #444746; padding: 0 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .hg-chip.on { background: #d3e3fd; border-color: #d3e3fd; color: #041e49; }
        .hg-chip.on::before { content: "✓"; font-size: 12px; }
        .hg-list { flex: 1; overflow-y: auto; padding: 4px 8px 8px; }
        .hg-gh { font-size: 11.5px; font-weight: 500; color: #444746; padding: 14px 12px 6px; text-transform: uppercase; letter-spacing: .5px; }
        .hg-it { display: flex; gap: 12px; padding: 10px 12px; border-radius: 12px; align-items: flex-start; cursor: pointer; }
        .hg-it:hover { background: #f0f4f9; }
        .hg-ic { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; }
        .hg-red { background: #fce8e6; color: #c5221f; } .hg-amb { background: #fef7e0; color: #b06000; }
        .hg-blu { background: #e8f0fe; color: #1967d2; } .hg-gry { background: #f1f3f4; color: #5f6368; }
        .hg-tx { flex: 1; min-width: 0; }
        .hg-t1 { font-size: 13.5px; line-height: 18px; color: #1f1f1f; font-weight: 500; }
        .hg-t2 { font-size: 12.5px; line-height: 17px; color: #5f6368; margin-top: 2px; }
        .hg-t3 { font-size: 11.5px; color: #747775; margin-top: 3px; }
        .hg-ok { width: 34px; height: 34px; border-radius: 50%; border: none; background: none; color: #444746; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; opacity: 0; flex-shrink: 0; transition: opacity .12s; }
        .hg-it:hover .hg-ok, .hg-ok:focus-visible { opacity: 1; }
        .hg-ok:hover { background: #e6f4ea; color: #137333; }
        .hg-empty { text-align: center; padding: 56px 20px; color: #5f6368; font-size: 14px; }
        .hg-empty i { font-size: 44px; color: #34a853; display: block; margin-bottom: 10px; }
        .hg-np-f { border-top: 1px solid #e3e3e3; padding: 12px 16px; display: flex; gap: 8px; align-items: center; }
        .hg-np-f span { flex: 1; font-size: 12.5px; color: #5f6368; }
        .hg-ob { height: 36px; border-radius: 18px; border: 1px solid #747775; background: #fff; color: #0b57d0; font: 500 13px Roboto, Arial, sans-serif; padding: 0 16px; cursor: pointer; white-space: nowrap; }
        .hg-ob:hover { background: rgba(11,87,208,.06); }

        /* ── Lanceur d'outils ── */
        #hg-lch {
            position: fixed; z-index: 10960; width: 352px; max-height: calc(100vh - 90px); overflow-y: auto;
            background: #e9eef6; border-radius: 28px; padding: 8px;
            box-shadow: 0 4px 8px 3px rgba(0,0,0,.15), 0 1px 3px rgba(0,0,0,.3);
            font-family: Roboto, "Segoe UI", Arial, sans-serif; color: #1f1f1f;
            opacity: 0; transform: scale(.96); transform-origin: top right; pointer-events: none;
            transition: opacity .15s, transform .18s cubic-bezier(.2,0,0,1);
        }
        #hg-lch.open { opacity: 1; transform: none; pointer-events: auto; }
        .hg-fav { background: #f8fafd; border-radius: 22px; padding: 16px 12px 12px; }
        .hg-fh { display: flex; align-items: center; justify-content: space-between; padding: 0 8px 10px; }
        .hg-fh h4 { margin: 0; font-size: 18px; font-weight: 500; }
        .hg-pen { width: 48px; height: 36px; border-radius: 18px; border: none; background: #d3e3fd; color: #041e49; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .hg-pen.on { background: #0b57d0; color: #fff; }
        .hg-hint { font-size: 12px; color: #444746; padding: 0 10px 8px; display: none; }
        .hg-edit .hg-hint { display: block; }
        .hg-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
        .hg-ap { overflow: hidden; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px 4px 12px; border-radius: 16px; cursor: pointer; position: relative; text-align: center; border: none; background: none; font-family: inherit; }
        .hg-ap:hover { background: #e1e8f2; }
        .hg-lo { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 28px; position: relative; }
        .hg-nm { font-size: 13px; color: #1f1f1f; line-height: 16px; }
        .hg-ab { position: absolute; top: -5px; right: -7px; min-width: 18px; height: 18px; border-radius: 9px; background: #d93025; color: #fff; font-size: 10.5px; font-weight: 500; line-height: 18px; padding: 0 5px; box-sizing: border-box; border: 2px solid #f8fafd; }
        .hg-oth { padding: 12px 12px 6px; }
        .hg-edit .hg-ap::after { content: ""; position: absolute; top: 8px; right: 14px; width: 18px; height: 18px; border-radius: 50%; border: 2px solid #747775; background: #fff; box-sizing: border-box; }
        .hg-edit .hg-ap.sel::after { background: #0b57d0 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3.5'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5'/%3E%3C/svg%3E") center/12px no-repeat; border-color: #0b57d0; }
        `;
        document.head.appendChild(s);
    }

    // ══════════════════════════════════════════════════════════
    //  HEADER
    // ══════════════════════════════════════════════════════════
    function buildHeader() {
        const hr = document.querySelector(".header-right");
        if (!hr) return false;

        if (!document.getElementById("hg-bell")) {
            const bell = document.createElement("button");
            bell.id = "hg-bell"; bell.className = "hg-ib";
            bell.dataset.tip = "Notifications"; bell.setAttribute("aria-label", "Notifications");
            bell.innerHTML = `<i class="ti ti-bell" aria-hidden="true"></i><span class="hg-badge" id="hg-bell-count"></span>`;
            bell.onclick = e => { e.stopPropagation(); togglePanel(); };
            hr.appendChild(bell);
        }
        if (!document.getElementById("hg-apps")) {
            const apps = document.createElement("button");
            apps.id = "hg-apps"; apps.className = "hg-ib";
            apps.dataset.tip = "Outils AW27"; apps.setAttribute("aria-label", "Outils AW27");
            apps.innerHTML = `<i class="ti ti-grid-dots" aria-hidden="true"></i><span class="hg-dot" id="hg-apps-dot"></span>`;
            apps.onclick = e => { e.stopPropagation(); toggleLauncher(); };
            hr.appendChild(apps);
        }
        if (!document.getElementById("hg-avatar") && window.currentUser) {
            const av = document.createElement("button");
            av.id = "hg-avatar"; av.className = "hg-av-btn";
            const u = window.currentUser;
            av.dataset.tip = `Compte AW27\n${u.displayName || ""}\n${u.email || ""}`.trim();
            av.setAttribute("aria-label", "Compte");
            av.innerHTML = avatarHTML("hg-av");
            av.onclick = e => { e.stopPropagation(); toggleAccount(); };
            hr.appendChild(av);
        }
        // Ordre : ✦ Nouveautés · 🔔 · ⋮⋮⋮ · avatar
        const wn = document.getElementById("wn-btn");
        if (wn && wn.nextElementSibling !== document.getElementById("hg-bell")) hr.insertBefore(wn, document.getElementById("hg-bell"));
        if (wn && wn.title) { wn.dataset.tip = "Nouveautés"; wn.removeAttribute("title"); }
        return !!document.getElementById("hg-avatar");
    }

    function buildSidebar() {
        const sb = document.getElementById("sidebar");
        const nav = sb && sb.querySelector(".sidebar-nav");
        if (!sb || !nav) return false;

        if (!document.getElementById("hg-new")) {
            const nb = document.createElement("button");
            nb.id = "hg-new"; nb.className = "hg-new"; nb.title = "Nouveau";
            nb.innerHTML = `<i class="ti ti-plus" aria-hidden="true"></i><span>Nouveau</span>`;
            nb.onclick = () => { if (typeof window.openAddModal === "function") window.openAddModal(); };
            nav.insertBefore(nb, nav.firstChild);
        }
        if (!document.getElementById("hg-settings")) {
            const foot = document.createElement("div");
            foot.className = "hg-side-foot";
            foot.innerHTML = `
                <button class="nav-item" id="hg-settings" title="Paramètres">
                    <span class="nav-icon"><i class="ti ti-settings" style="font-size:18px" aria-hidden="true"></i></span>
                    <span class="nav-label">Paramètres</span>
                </button>`;
            foot.querySelector("button").onclick = e => {
                e.stopPropagation();
                // Panneau de settings-panel.js : window.spOpen() (ou son bouton d'origine, masqué)
                if (typeof window.spOpen === "function") window.spOpen();
                else if (!clickEl("#topbar-settings-btn") && typeof window.openSettingsPanel === "function") window.openSettingsPanel();
            };
            sb.appendChild(foot);
        }
        return true;
    }

    // ══════════════════════════════════════════════════════════
    //  COMPTE (avatar + carte Google)
    // ══════════════════════════════════════════════════════════
    const AV_COLORS = ["#1a73e8", "#d93025", "#188038", "#e37400", "#9334e6", "#007b83", "#c5221f", "#3949ab"];
    function avatarHTML(cls) {
        const u = window.currentUser || {};
        const name = (u.displayName || u.email || "?").trim();
        if (u.photoURL) return `<span class="${cls}"><img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer"/></span>`;
        const parts = name.split(/[\s@.]+/).filter(Boolean);
        const ini = ((parts[0] || "?")[0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
        let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
        return `<span class="${cls}" style="background:${AV_COLORS[h % AV_COLORS.length]}">${esc(ini)}</span>`;
    }

    function ensureAccount() {
        if (document.getElementById("hg-acc")) return;
        const d = document.createElement("div");
        d.id = "hg-acc"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "Compte");
        d.addEventListener("click", e => {
            e.stopPropagation();
            const a = e.target.closest("[data-acc]");
            if (!a) return;
            const act = a.dataset.acc;
            closeAccount();
            if (act === "close") return;
            if (act === "settings") { typeof window.spOpen === "function" ? window.spOpen() : clickEl("#topbar-settings-btn"); }
            if (act === "news")     { window.openWhatsNew && window.openWhatsNew(); }
            if (act === "density")  { window.gtToggleDensity && window.gtToggleDensity(); openAccount(); }
            if (act === "keys")     { window.gtShowShortcuts && window.gtShowShortcuts(); }
            if (act === "logout")   {
                if (!confirm("Se déconnecter d'AW27 Checkers ?")) return;
                if (typeof window.spSignOut === "function") window.spSignOut();
                else if (typeof window.signOut === "function") window.signOut();
            }
        });
        document.body.appendChild(d);
    }
    function renderAccount() {
        const d = document.getElementById("hg-acc");
        const u = window.currentUser || {};
        const first = (u.displayName || u.email || "").split(/[\s@]/)[0];
        d.innerHTML = `
            <button class="hg-acc-x" data-acc="close" aria-label="Fermer"><i class="ti ti-x" aria-hidden="true"></i></button>
            <div class="hg-acc-mail">${esc(u.email || "")}</div>
            ${avatarHTML("hg-acc-big")}
            <div class="hg-acc-hi">Bonjour ${esc(first)} !</div>
            <button class="hg-acc-manage" data-acc="settings">Gérer les paramètres</button>
            <div class="hg-acc-card">
                <button class="hg-acc-row" data-acc="news"><i class="ti ti-sparkles" aria-hidden="true"></i>Nouveautés</button>
                ${typeof window.gtDensity === "function" ? `<button class="hg-acc-row" data-acc="density"><i class="ti ti-layout-rows" aria-hidden="true"></i>Densité : ${window.gtDensity() === "compact" ? "compacte" : "confortable"}</button>` : ""}
                ${typeof window.gtShowShortcuts === "function" ? `<button class="hg-acc-row" data-acc="keys"><i class="ti ti-keyboard" aria-hidden="true"></i>Raccourcis clavier</button>` : ""}
                <button class="hg-acc-row" data-acc="logout"><i class="ti ti-logout" aria-hidden="true"></i>Se déconnecter</button>
            </div>
            <div class="hg-acc-foot">AW27 Checkers · Socota</div>`;
    }
    function toggleAccount() {
        const d = document.getElementById("hg-acc");
        if (d && d.classList.contains("open")) closeAccount(); else openAccount();
    }
    function openAccount() {
        closeLauncher(); closePanel();
        ensureAccount(); renderAccount();
        const b = document.getElementById("hg-avatar"), d = document.getElementById("hg-acc");
        if (b) {
            const r = b.getBoundingClientRect();
            d.style.top = Math.round(r.bottom + 8) + "px";
            d.style.right = Math.max(8, Math.round(window.innerWidth - r.right)) + "px";
        }
        d.classList.add("open");
        b && b.classList.add("on");
    }
    function closeAccount() {
        document.getElementById("hg-acc")?.classList.remove("open");
        document.getElementById("hg-avatar")?.classList.remove("on");
    }

    // ══════════════════════════════════════════════════════════
    //  INFOBULLES GOOGLE (data-tip)
    // ══════════════════════════════════════════════════════════
    function setupTooltips() {
        const tip = document.createElement("div");
        tip.id = "hg-tip"; tip.setAttribute("role", "tooltip");
        document.body.appendChild(tip);
        let timer = null, cur = null;
        const hide = () => { clearTimeout(timer); tip.classList.remove("show"); cur = null; };
        document.addEventListener("mouseover", e => {
            const el = e.target.closest("[data-tip]");
            if (!el || el === cur) return;
            hide(); cur = el;
            timer = setTimeout(() => {
                if (!document.body.contains(el)) return;
                tip.style.whiteSpace = "pre"; tip.textContent = el.dataset.tip;
                const r = el.getBoundingClientRect();
                tip.style.left = "0px"; tip.style.top = "0px";
                const w = tip.offsetWidth;
                tip.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2)) + "px";
                tip.style.top = Math.round(r.bottom + 8) + "px";
                tip.classList.add("show");
            }, 450);
        });
        document.addEventListener("mouseout", e => {
            const el = e.target.closest("[data-tip]");
            if (el && !el.contains(e.relatedTarget)) hide();
        });
        document.addEventListener("mousedown", hide, true);
    }

    // ══════════════════════════════════════════════════════════
    //  RIPPLE MATERIAL
    // ══════════════════════════════════════════════════════════
    function setupRipple() {
        document.addEventListener("pointerdown", e => {
            const host = e.target.closest(".hg-ib, .hg-ap, .hg-new, .hg-av-btn, .hg-chip, .hg-ob, .hg-acc-row, .hg-acc-manage");
            if (!host) return;
            const r = host.getBoundingClientRect();
            const size = Math.max(r.width, r.height);
            const s = document.createElement("span");
            s.className = "hg-ripple";
            s.style.width = s.style.height = size + "px";
            s.style.left = (e.clientX - r.left - size / 2) + "px";
            s.style.top = (e.clientY - r.top - size / 2) + "px";
            if (getComputedStyle(host).position === "static") host.style.position = "relative";
            host.style.overflow = "hidden";
            host.appendChild(s);
            setTimeout(() => s.remove(), 500);
        });
    }

    // ══════════════════════════════════════════════════════════
    //  SNACKBAR « ANNULER »
    // ══════════════════════════════════════════════════════════
    let _snackTimer = null;
    function snackbar(text, undoFn) {
        let sb = document.getElementById("hg-snack");
        if (!sb) {
            sb = document.createElement("div");
            sb.id = "hg-snack"; sb.setAttribute("role", "status");
            document.body.appendChild(sb);
        }
        sb.innerHTML = `<span>${esc(text)}</span>${undoFn ? `<button type="button">Annuler</button>` : ""}`;
        if (undoFn) sb.querySelector("button").onclick = () => { undoFn(); sb.classList.remove("show"); };
        requestAnimationFrame(() => sb.classList.add("show"));
        clearTimeout(_snackTimer);
        _snackTimer = setTimeout(() => sb.classList.remove("show"), 6000);
    }

    // ══════════════════════════════════════════════════════════
    //  DONNÉES DES NOTIFICATIONS
    // ══════════════════════════════════════════════════════════
    function smartAlerts() {
        return typeof window.saGetAlerts === "function" ? window.saGetAlerts() : [];
    }
    function globalGroups() {
        if (typeof window.collectAllAlerts !== "function") return [];
        try {
            const all = window.collectAllAlerts() || {};
            return Object.entries(all).map(([key, g]) => ({ key, label: stripHTML(g.label || key), items: g.items || [] }))
                                      .filter(g => g.items.length);
        } catch (e) { console.warn("[HG] collectAllAlerts:", e); return []; }
    }

    function smartGroup(type) {
        if (/^ord_/.test(type)) return "Ordering";
        if (type === "sc_due_date") return "Style Components";
        return "PSD & Commitments";
    }
    const SMART_ICON = {
        psd_alert: "ti-calendar-event", srs_alert: "ti-rocket", sewing_alert: "ti-needle-thread", packing_alert: "ti-package",
        sc_due_date: "ti-components", ord_partial: "ti-package", ord_not_confirmed: "ti-file-alert",
        ord_no_po: "ti-file-alert", ord_no_ready: "ti-calendar-question", ord_ready_late: "ti-clock-exclamation",
        ord_ready_soon: "ti-clock", ord_transit_long: "ti-truck", ord_psd_risk: "ti-calendar-exclamation", ord_artwork: "ti-palette"
    };

    function updateCounts() {
        const s = smartAlerts().length;
        const g = globalGroups().reduce((n, x) => n + x.items.length, 0);
        const total = s + g;
        const b = document.getElementById("hg-bell-count");
        if (b) { b.textContent = total > 99 ? "99+" : String(total); b.classList.toggle("show", total > 0); }

        // Point jaune sur ⋮⋮⋮ si un outil a un badge (message non lu, tâche…)
        const dot = document.getElementById("hg-apps-dot");
        if (dot) dot.classList.toggle("show", TOOLS.some(t => t.badge && t.badge()));

        const np = document.getElementById("hg-np");
        if (np && np.classList.contains("open")) {
            if (_tab === "smart") renderPanel();
            else {   // « Par menu » : on met juste à jour les compteurs des onglets
                const ems = np.querySelectorAll(".hg-tab em");
                if (ems[0]) ems[0].textContent = s;
                if (ems[1]) ems[1].textContent = g;
            }
        }
        return { s, g };
    }

    // ══════════════════════════════════════════════════════════
    //  PANNEAU NOTIFICATIONS
    // ══════════════════════════════════════════════════════════
    let _tab = "smart", _flt = "all";

    function ensurePanel() {
        if (document.getElementById("hg-np")) return;
        const back = document.createElement("div");
        back.id = "hg-np-back";
        back.onclick = closePanel;
        const p = document.createElement("aside");
        p.id = "hg-np"; p.setAttribute("aria-label", "Notifications");
        document.body.appendChild(back);
        document.body.appendChild(p);
        p.addEventListener("click", onPanelClick);
    }

    function positionPanel() {
        const p = document.getElementById("hg-np");
        const h = document.querySelector(".header");
        const top = h ? Math.max(0, Math.round(h.getBoundingClientRect().bottom)) : 64;
        if (p) p.style.top = top + "px";
    }

    function togglePanel() {
        const p = document.getElementById("hg-np");
        if (p && p.classList.contains("open")) closePanel(); else openPanel();
    }
    function openPanel(tab) {
        closeLauncher();
        ensurePanel();
        if (tab) { _tab = tab; _flt = "all"; }
        positionPanel();
        renderPanel();
        document.getElementById("hg-np").classList.add("open");
        document.getElementById("hg-np-back").classList.add("open");
        document.getElementById("hg-bell")?.classList.add("on");
    }
    function closePanel() {
        document.getElementById("hg-np")?.classList.remove("open");
        document.getElementById("hg-np-back")?.classList.remove("open");
        document.getElementById("hg-bell")?.classList.remove("on");
    }

    let _rows = []; // éléments affichés (pour les clics)

    function renderPanel() {
        const p = document.getElementById("hg-np");
        if (!p) return;
        const smart = smartAlerts();
        const groups = globalGroups();
        const gCount = groups.reduce((n, x) => n + x.items.length, 0);
        _rows = [];

        let chips = "", list = "", foot = "";
        if (_tab === "smart") {
            const counts = { danger: 0, warn: 0, info: 0 };
            smart.forEach(a => { counts[a.severity] = (counts[a.severity] || 0) + 1; });
            const LBL = { all: "Toutes", danger: "Critiques", warn: "Attention", info: "À clôturer" };
            chips = Object.keys(LBL).filter(k => k === "all" || counts[k])
                .map(k => `<button class="hg-chip ${_flt === k ? "on" : ""}" data-flt="${k}">${LBL[k]}${k === "all" ? "" : " · " + counts[k]}</button>`).join("");
            const shown = smart.filter(a => _flt === "all" || a.severity === _flt);
            const order = ["PSD & Commitments", "Style Components", "Ordering"];
            order.forEach(gname => {
                const items = shown.filter(a => smartGroup(a.type) === gname);
                if (!items.length) return;
                list += `<div class="hg-gh">${gname} · ${items.length}</div>`;
                items.forEach(a => {
                    const i = _rows.push({ kind: "smart", a }) - 1;
                    const cls = a.severity === "danger" ? "hg-red" : a.severity === "warn" ? "hg-amb" : "hg-blu";
                    const typeLbl = typeof window.saTypeLabel === "function" ? window.saTypeLabel(a.type) : a.type;
                    list += `
                    <div class="hg-it" data-row="${i}" role="button" tabindex="0">
                        <div class="hg-ic ${cls}"><i class="ti ${SMART_ICON[a.type] || "ti-alert-triangle"}" aria-hidden="true"></i></div>
                        <div class="hg-tx">
                            <div class="hg-t1">${esc(a.title)}</div>
                            <div class="hg-t2">${esc(a.action)}</div>
                            <div class="hg-t3">${esc(typeLbl)}${a.client ? " · " + esc(a.client) : ""}</div>
                        </div>
                        <button class="hg-ok" data-done="${i}" data-tip="Marquer comme traitée" aria-label="Marquer comme traitée"><i class="ti ti-check" aria-hidden="true"></i></button>
                    </div>`;
                });
            });
            if (!shown.length) list = `<div class="hg-empty"><i class="ti ti-circle-check" aria-hidden="true"></i>Tout est à jour</div>`;
            foot = `<span>${smart.length} alerte${smart.length > 1 ? "s" : ""} active${smart.length > 1 ? "s" : ""}</span>
                    <button class="hg-ob" data-act="table">Ouvrir le tableau</button>`;
        } else {
            // « Par menu » : design d'origine (regroupement par menu + code couleur),
            // rendu par _renderGndFull() d'app.js dans #gnd-body
            list = "__GND__";
            foot = `<span>${gCount} alerte${gCount > 1 ? "s" : ""} · ${groups.length} menu${groups.length > 1 ? "s" : ""}</span>
                    <button class="hg-ob" data-act="export">Export Excel</button>`;
        }

        p.innerHTML = `
            <div class="hg-np-h">
                <h3>Notifications</h3>
                ${_tab === "smart" && smart.length ? `<button class="hg-tbtn" data-act="all">Tout marquer traité</button>` : ""}
                <button class="hg-x" data-act="close" aria-label="Fermer"><i class="ti ti-x" aria-hidden="true"></i></button>
            </div>
            <div class="hg-tabs" role="tablist">
                <button class="hg-tab ${_tab === "smart" ? "on" : ""}" data-tab="smart" role="tab">Intelligentes<em>${smart.length}</em></button>
                <button class="hg-tab ${_tab === "global" ? "on" : ""}" data-tab="global" role="tab">Par menu<em>${gCount}</em></button>
            </div>
            ${chips ? `<div class="hg-chips">${chips}</div>` : ""}
            ${list === "__GND__" ? `<div class="hg-list gnd-body" id="gnd-body"></div>` : `<div class="hg-list">${list}</div>`}
            <div class="hg-np-f">${foot}</div>`;

        if (list === "__GND__") renderGlobalOriginal();
    }

    // Affiche les alertes par menu avec le rendu d'origine (_renderGndFull)
    function renderGlobalOriginal() {
        // Un ancien tiroir déjà créé aurait aussi un #gnd-body : on le retire
        const old = document.getElementById("global-notif-drawer");
        if (old && old.querySelector(".gnd-panel")) old.remove();

        if (typeof window.openGlobalNotifDrawer === "function") {
            // Conteneur factice invisible : openGlobalNotifDrawer() injecte ses styles
            // puis appelle _renderGndFull(), qui remplit notre #gnd-body
            if (!document.getElementById("global-notif-drawer")) {
                const dummy = document.createElement("div");
                dummy.id = "global-notif-drawer";
                dummy.style.display = "none";
                document.body.appendChild(dummy);
            }
            try { window.openGlobalNotifDrawer(); } catch (e) { console.warn("[HG] openGlobalNotifDrawer:", e); }
        } else if (typeof window._renderGndFull === "function") {
            try { window._renderGndFull(); } catch (e) { console.warn("[HG] _renderGndFull:", e); }
        }
    }

    function onPanelClick(e) {
        // Ligne d'alerte d'origine (onclick="navigateToRow(...)") → fermer le panneau
        if (e.target.closest(".gnd-row-clickable")) { setTimeout(closePanel, 0); return; }
        const t = e.target.closest("[data-tab],[data-flt],[data-done],[data-act],[data-row]");
        if (!t) return;
        if (t.dataset.tab) { _tab = t.dataset.tab; _flt = "all"; renderPanel(); return; }
        if (t.dataset.flt) { _flt = t.dataset.flt; renderPanel(); return; }
        if (t.dataset.done !== undefined) {
            e.stopPropagation();
            const r = _rows[+t.dataset.done];
            if (r && typeof window.saMarkDoneKey === "function") {
                const key = r.a.key;
                window.saMarkDoneKey(key);
                snackbar("Alerte marquée comme traitée", () => {
                    window.saUnmarkDoneKey && window.saUnmarkDoneKey(key);
                    updateCounts(); renderPanel();
                });
            }
            updateCounts(); renderPanel();
            return;
        }
        const act = t.dataset.act;
        if (act === "close") { closePanel(); return; }
        if (act === "table") { closePanel(); window.openSATableModal && window.openSATableModal(); return; }
        if (act === "export") { window.exportGlobalNotifExcel && window.exportGlobalNotifExcel(); return; }
        if (act === "all") {
            const list = smartAlerts().filter(a => _flt === "all" || a.severity === _flt);
            if (!list.length || !confirm(`Marquer ${list.length} alerte${list.length > 1 ? "s" : ""} comme traitée${list.length > 1 ? "s" : ""} ?`)) return;
            const keys = list.map(a => a.key);
            keys.forEach(k => window.saMarkDoneKey && window.saMarkDoneKey(k));
            snackbar(`${keys.length} alerte${keys.length > 1 ? "s" : ""} marquée${keys.length > 1 ? "s" : ""} comme traitée${keys.length > 1 ? "s" : ""}`, () => {
                keys.forEach(k => window.saUnmarkDoneKey && window.saUnmarkDoneKey(k));
                updateCounts(); renderPanel();
            });
            updateCounts(); renderPanel();
            return;
        }
        if (t.dataset.row !== undefined) {
            const r = _rows[+t.dataset.row];
            if (!r) return;
            const sheet = r.kind === "smart" ? (r.a.sheet || "details") : r.it.sheet;
            const row   = r.kind === "smart" ? r.a.rowIndex : r.it.rowIndex;
            if (row != null && typeof window.navigateToRow === "function") {
                closePanel();
                window.navigateToRow(sheet, row);
            }
        }
    }

    // ══════════════════════════════════════════════════════════
    //  LANCEUR D'OUTILS
    // ══════════════════════════════════════════════════════════
    let _edit = false;

    function ensureLauncher() {
        if (document.getElementById("hg-lch")) return;
        const l = document.createElement("div");
        l.id = "hg-lch"; l.setAttribute("role", "dialog"); l.setAttribute("aria-label", "Actions");
        l.addEventListener("click", onLauncherClick);
        document.body.appendChild(l);
    }

    function positionLauncher() {
        const l = document.getElementById("hg-lch");
        const b = document.getElementById("hg-apps");
        if (!l || !b) return;
        const r = b.getBoundingClientRect();
        l.style.top = Math.round(r.bottom + 8) + "px";
        l.style.right = Math.max(8, Math.round(window.innerWidth - r.right)) + "px";
    }

    function toggleLauncher() {
        const l = document.getElementById("hg-lch");
        if (l && l.classList.contains("open")) closeLauncher(); else openLauncher();
    }
    function openLauncher() {
        closePanel();
        ensureLauncher();
        _edit = false;
        renderLauncher();
        positionLauncher();
        document.getElementById("hg-lch").classList.add("open");
        document.getElementById("hg-apps")?.classList.add("on");
    }
    function closeLauncher() {
        document.getElementById("hg-lch")?.classList.remove("open");
        document.getElementById("hg-apps")?.classList.remove("on");
    }

    function tileHTML(t, favs) {
        const bd = !_edit && t.badge ? t.badge() : "";
        return `<button class="hg-ap ${favs.includes(t.k) ? "sel" : ""}" data-tool="${t.k}">
            <span class="hg-lo" style="background:${t.b};color:${t.c}"><i class="ti ${t.i}" aria-hidden="true"></i>${bd ? `<span class="hg-ab">${esc(bd)}</span>` : ""}</span>
            <span class="hg-nm">${esc(t.n)}</span>
        </button>`;
    }

    function renderLauncher() {
        const l = document.getElementById("hg-lch");
        if (!l) return;
        const favs = getFavs();
        const top = _edit ? TOOLS : favs.map(k => TOOLS.find(t => t.k === k)).filter(Boolean);
        const rest = _edit ? [] : TOOLS.filter(t => !favs.includes(t.k));
        l.innerHTML = `
            <div class="hg-fav ${_edit ? "hg-edit" : ""}">
                <div class="hg-fh">
                    <h4>Vos favoris</h4>
                    <button class="hg-pen ${_edit ? "on" : ""}" data-pen="1" data-tip="${_edit ? "Terminer" : "Modifier les favoris"}" aria-label="${_edit ? "Terminer" : "Modifier les favoris"}">
                        <i class="ti ${_edit ? "ti-check" : "ti-pencil"}" aria-hidden="true"></i>
                    </button>
                </div>
                <div class="hg-hint">Choisissez jusqu'à ${MAX_FAV} outils, puis validez.</div>
                <div class="hg-grid">${top.map(t => tileHTML(t, favs)).join("") || `<div class="hg-hint" style="display:block;grid-column:1/-1">Aucun favori. Cliquez sur le crayon.</div>`}</div>
            </div>
            ${rest.length ? `<div class="hg-oth"><div class="hg-grid">${rest.map(t => tileHTML(t, favs)).join("")}</div></div>` : ""}`;
    }

    function onLauncherClick(e) {
        e.stopPropagation();
        if (e.target.closest("[data-pen]")) { _edit = !_edit; renderLauncher(); return; }
        const b = e.target.closest("[data-tool]");
        if (!b) return;
        const tool = TOOLS.find(t => t.k === b.dataset.tool);
        if (!tool) return;
        if (_edit) {
            let favs = getFavs();
            if (favs.includes(tool.k)) favs = favs.filter(k => k !== tool.k);
            else if (favs.length < MAX_FAV) favs.push(tool.k);
            setFavs(favs);
            renderLauncher();
            return;
        }
        closeLauncher();
        try {
            const ok = tool.run();
            if (ok === false && typeof showToast === "function") showToast(`« ${tool.n} » n'est pas disponible sur cet écran`, "info");
        } catch (err) {
            console.error("[HG] outil", tool.k, err);
            if (typeof showToast === "function") showToast(`Impossible d'ouvrir « ${tool.n} »`, "error");
        }
    }

    // ══════════════════════════════════════════════════════════
    //  INIT
    // ══════════════════════════════════════════════════════════
    function init() {
        injectStyles();
        setupTooltips();
        setupRipple();

        // Le header et la barre latérale peuvent être rendus/modifiés par d'autres scripts
        let tries = 0;
        const t = setInterval(() => {
            const okH = buildHeader();
            const okS = buildSidebar();
            if ((okH && okS && document.getElementById("wn-btn")) || ++tries > 60) clearInterval(t);
        }, 500);

        // La KPI « Alertes actives » et l'ancienne API ouvrent le nouveau panneau
        window.openSAPanel = () => openPanel("smart");
        window.openHGNotifications = openPanel;
        window.openHGLauncher = openLauncher;

        // Compteurs : à chaque recalcul des alertes + toutes les 5 s (messages, tâches…)
        document.addEventListener("sa:updated", updateCounts);
        setInterval(updateCounts, 5000);
        setTimeout(updateCounts, 1500);

        // Fermetures : clic ailleurs, Échap, redimensionnement
        document.addEventListener("click", e => {
            if (!e.target.closest("#hg-lch") && !e.target.closest("#hg-apps")) closeLauncher();
            if (!e.target.closest("#hg-acc") && !e.target.closest("#hg-avatar")) closeAccount();
        });
        document.addEventListener("keydown", e => { if (e.key === "Escape") { closeLauncher(); closePanel(); closeAccount(); } });
        window.addEventListener("resize", () => { positionLauncher(); positionPanel(); });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else setTimeout(init, 400);

})();
