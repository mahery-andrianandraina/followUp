// ================================================================
//  AW27 — Style Components Actions Menu
//  Menu déroulant "Actions ▾" dans le header de Style Components.
//  Charger en dernier dans index.html.
// ================================================================

(function initActionsMenu() {
    const SHEET_KEY  = "style_components";
    const BTN_ID     = "sc-actions-menu-btn";
    const WRAPPER_ID = "sc-actions-menu-wrapper";
    const DROP_ID    = "sc-actions-dropdown";

    // ── Styles CSS ────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById("sc-am-styles")) return;
        const s = document.createElement("style");
        s.id = "sc-am-styles";
        s.textContent = `
        #${BTN_ID} {
            display:inline-flex;align-items:center;gap:6px;
            padding:5px 12px;border-radius:8px;
            background:rgba(255,255,255,.15);
            border:1px solid rgba(255,255,255,.25);
            color:#fff;font-size:12px;font-weight:500;
            font-family:inherit;cursor:pointer;
            transition:background .15s;
        }
        #${BTN_ID}:hover{background:rgba(255,255,255,.25);}
        #${DROP_ID}{
            display:none;position:absolute;right:0;top:calc(100% + 8px);
            background:var(--surface-2,#fff);
            border:0.5px solid var(--border,#e5e7eb);
            border-radius:10px;min-width:215px;z-index:9999;
            overflow:hidden;
            box-shadow:0 4px 16px rgba(0,0,0,.12);
        }
        #${DROP_ID}.open{display:block;}
        .sc-am-section{
            padding:6px 10px 3px;font-size:10px;font-weight:500;
            color:var(--text-muted,#9ca3af);
            text-transform:uppercase;letter-spacing:.06em;
        }
        .sc-am-item{
            display:flex;align-items:center;gap:10px;
            padding:8px 10px;border-radius:6px;border:none;
            background:transparent;text-align:left;cursor:pointer;
            width:100%;font-family:inherit;margin:1px 0;transition:background .1s;
        }
        .sc-am-item:hover{background:var(--surface-1,#f9fafb);}
        .sc-am-icon{
            width:28px;height:28px;border-radius:6px;
            display:flex;align-items:center;justify-content:center;flex-shrink:0;
        }
        .sc-am-label{font-size:12px;font-weight:500;color:var(--text-primary,#111827);}
        .sc-am-sub{font-size:10.5px;color:var(--text-muted,#9ca3af);}
        .sc-am-sep{height:0.5px;background:var(--border,#e5e7eb);margin:4px 0;}
        `;
        document.head.appendChild(s);
    }

    // ── Détecter si on est sur Style Components ───────────────
    // Utiliser le texte du titre — plus fiable que window.state
    function isOnStyleComponents() {
        const title = document.getElementById("header-sheet-title");
        if (!title) return false;
        const txt = title.textContent?.trim().toLowerCase() || "";
        return txt.includes("style component") ||
               window.state?.activeSheet === SHEET_KEY;
    }

    // ── Fermer dropdown si clic en dehors ─────────────────────
    document.addEventListener("click", e => {
        const drop = document.getElementById(DROP_ID);
        const btn  = document.getElementById(BTN_ID);
        if (!drop || !btn) return;
        if (!btn.contains(e.target) && !drop.contains(e.target)) {
            drop.classList.remove("open");
        }
    });

    // ── Créer le menu ─────────────────────────────────────────
    function createMenu() {
        const wrapper = document.createElement("div");
        wrapper.id = WRAPPER_ID;
        wrapper.style.cssText = "position:relative;display:inline-flex;align-items:center;";

        const btn = document.createElement("button");
        btn.id = BTN_ID;
        btn.title = "Actions Style Components";
        btn.innerHTML = `
            <i class="ti ti-menu-2" style="font-size:14px;" aria-hidden="true"></i>
            Actions
            <i class="ti ti-chevron-down" style="font-size:11px;" aria-hidden="true"></i>`;
        btn.onclick = e => {
            e.stopPropagation();
            document.getElementById(DROP_ID)?.classList.toggle("open");
        };

        const drop = document.createElement("div");
        drop.id = DROP_ID;
        drop.innerHTML = `
        <div style="padding:6px;">
            <div class="sc-am-section">Export</div>

            <button class="sc-am-item" id="sc-am-pdf">
                <div class="sc-am-icon" style="background:var(--bg-accent,#eff6ff);">
                    <i class="ti ti-checklist" style="font-size:15px;
                        color:var(--text-accent,#1565c0);" aria-hidden="true"></i>
                </div>
                <div>
                    <div class="sc-am-label">Télécharger PDF</div>
                    <div class="sc-am-sub">Rapport Style Components</div>
                </div>
            </button>

            <button class="sc-am-item" id="sc-am-email">
                <div class="sc-am-icon" style="background:var(--bg-success,#f0fdf4);">
                    <i class="ti ti-mail" style="font-size:15px;
                        color:var(--text-success,#166534);" aria-hidden="true"></i>
                </div>
                <div>
                    <div class="sc-am-label">Envoyer par email</div>
                    <div class="sc-am-sub">Order Status Report</div>
                </div>
            </button>

            <div class="sc-am-sep"></div>
            <div class="sc-am-section">Import & Analyse</div>

            <button class="sc-am-item" id="sc-am-psd">
                <div class="sc-am-icon" style="background:var(--bg-warning,#fef9c3);">
                    <i class="ti ti-calendar-up" style="font-size:15px;
                        color:var(--text-warning,#854d0e);" aria-hidden="true"></i>
                </div>
                <div>
                    <div class="sc-am-label">Importer PSD</div>
                    <div class="sc-am-sub">SRS · Sewing · Packing Trims</div>
                </div>
            </button>

            <button class="sc-am-item" id="sc-am-tp">
                <div class="sc-am-icon" style="background:#f5f3ff;">
                    <i class="ti ti-bolt" style="font-size:15px;
                        color:#7c3aed;" aria-hidden="true"></i>
                </div>
                <div>
                    <div class="sc-am-label">Analyser TP</div>
                    <div class="sc-am-sub">Extraction IA des composants</div>
                </div>
            </button>
        </div>`;

        // Handlers
        drop.querySelector("#sc-am-pdf").onclick = () => {
            drop.classList.remove("open");
            if (typeof window._scOpenPDFModal === "function") window._scOpenPDFModal();
        };
        drop.querySelector("#sc-am-email").onclick = () => {
            drop.classList.remove("open");
            if (typeof window._scOpenPDFModal === "function") {
                window._scOpenPDFModal();
                setTimeout(() => {
                    document.querySelector(".sc-pdf-email-input")?.focus();
                }, 400);
            }
        };
        drop.querySelector("#sc-am-psd").onclick = () => {
            drop.classList.remove("open");
            if (typeof window._psdTriggerUpload === "function") window._psdTriggerUpload();
        };
        drop.querySelector("#sc-am-tp").onclick = () => {
            drop.classList.remove("open");
            if (typeof window._tpaOpenModal === "function") window._tpaOpenModal();
        };

        wrapper.appendChild(btn);
        wrapper.appendChild(drop);
        return wrapper;
    }

    // ── Injecter le menu ──────────────────────────────────────
    function injectMenu() {
        if (document.getElementById(WRAPPER_ID)) return; // déjà présent

        const menu = createMenu();

        // Chercher le bon endroit dans le header
        // Priorité : avant la cloche globale, ou à la fin du header-right
        const anchors = [
            document.getElementById("btn-notif-global"),
            document.getElementById("global-notif-btn"),
            document.querySelector(".header-right .notif-btn"),
            document.querySelector(".header-right button:last-of-type"),
        ].filter(Boolean);

        const headerRight = document.querySelector(".header-right")
                         || document.querySelector(".app-header__right")
                         || document.querySelector("header .right");

        if (anchors[0]?.parentNode) {
            anchors[0].parentNode.insertBefore(menu, anchors[0]);
        } else if (headerRight) {
            headerRight.appendChild(menu);
        } else {
            // Dernier recours : après le titre
            const titleEl = document.getElementById("header-sheet-title");
            if (titleEl?.parentNode) {
                titleEl.parentNode.insertBefore(menu, titleEl.nextSibling);
            }
        }

        console.log("[AW27] Actions Menu injecté ✓",
            document.getElementById(WRAPPER_ID) ? "OK" : "ECHEC");
    }

    // ── Supprimer le menu ─────────────────────────────────────
    function removeMenu() {
        document.getElementById(WRAPPER_ID)?.remove();
    }

    // ── Garde-fou principal (500ms) ───────────────────────────
    // Plus simple et fiable qu'un MutationObserver pour ce cas
    let lastState = null;
    setInterval(() => {
        const onSC = isOnStyleComponents();

        if (onSC && !document.getElementById(WRAPPER_ID)) {
            injectMenu();
        } else if (!onSC && document.getElementById(WRAPPER_ID)) {
            removeMenu();
        }

        lastState = onSC;
    }, 500);

    // ── Init ──────────────────────────────────────────────────
    function init() {
        injectStyles();
        console.log("[AW27] SC Actions Menu ✓");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 1000);
    }

})();
