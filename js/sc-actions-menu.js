// ================================================================
//  AW27 — Style Components Actions Menu
//  Remplace les boutons individuels (PDF, PSD, TP) par un seul
//  menu déroulant "Actions ▾" dans le header de Style Components.
//  Charger en dernier dans index.html (après tous les autres JS).
// ================================================================

(function initActionsMenu() {
    const SHEET_KEY = "style_components";
    const BTN_ID    = "sc-actions-menu-btn";
    const DROP_ID   = "sc-actions-dropdown";

    // Boutons individuels à masquer quand le menu est actif
    const HIDE_IDS  = ["btn-components-pdf", "btn-analyze-tp", "btn-psd-updater"];

    // ── Styles CSS ────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById("sc-am-styles")) return;
        const s = document.createElement("style");
        s.id = "sc-am-styles";
        s.textContent = `
        #${BTN_ID} {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 5px 12px; border-radius: 8px;
            background: rgba(255,255,255,.15);
            border: 1px solid rgba(255,255,255,.25);
            color: #fff; font-size: 12px; font-weight: 500;
            font-family: inherit; cursor: pointer;
            transition: background .15s;
            position: relative;
        }
        #${BTN_ID}:hover { background: rgba(255,255,255,.25); }

        #${DROP_ID} {
            display: none;
            position: absolute;
            right: 0; top: calc(100% + 8px);
            background: var(--surface-2, #fff);
            border: 0.5px solid var(--border, #e5e7eb);
            border-radius: 10px;
            min-width: 210px;
            z-index: 9999;
            overflow: hidden;
        }
        #${DROP_ID}.open { display: block; }
        .sc-am-section {
            padding: 5px 8px 3px;
            font-size: 10px; font-weight: 500;
            color: var(--text-muted, #9ca3af);
            text-transform: uppercase; letter-spacing: .06em;
        }
        .sc-am-item {
            display: flex; align-items: center; gap: 10px;
            padding: 8px 10px; border-radius: 6px;
            border: none; background: transparent;
            text-align: left; cursor: pointer;
            width: 100%; font-family: inherit;
            margin: 1px 0; transition: background .1s;
        }
        .sc-am-item:hover { background: var(--surface-1, #f9fafb); }
        .sc-am-icon {
            width: 28px; height: 28px; border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
        }
        .sc-am-label {
            font-size: 12px; font-weight: 500;
            color: var(--text-primary, #111827);
        }
        .sc-am-sub {
            font-size: 10.5px;
            color: var(--text-muted, #9ca3af);
        }
        .sc-am-sep {
            height: 0.5px;
            background: var(--border, #e5e7eb);
            margin: 4px 0;
        }
        `;
        document.head.appendChild(s);
    }

    // ── Fermer le dropdown si clic en dehors ──────────────────
    function setupClickOutside() {
        document.addEventListener("click", e => {
            const btn  = document.getElementById(BTN_ID);
            const drop = document.getElementById(DROP_ID);
            if (!btn || !drop) return;
            if (!btn.contains(e.target) && !drop.contains(e.target)) {
                drop.classList.remove("open");
            }
        });
    }

    // ── Créer le bouton + dropdown ────────────────────────────
    function createMenuBtn() {
        const wrapper = document.createElement("div");
        wrapper.style.cssText = "position:relative;display:inline-block;";

        // Bouton principal
        const btn = document.createElement("button");
        btn.id = BTN_ID;
        btn.innerHTML = `
            <i class="ti ti-menu-2" style="font-size:14px;" aria-hidden="true"></i>
            Actions
            <i class="ti ti-chevron-down" style="font-size:11px;" aria-hidden="true"></i>`;
        btn.onclick = e => {
            e.stopPropagation();
            document.getElementById(DROP_ID)?.classList.toggle("open");
        };

        // Dropdown
        const drop = document.createElement("div");
        drop.id = DROP_ID;
        drop.innerHTML = `
        <div style="padding:6px;">

            <div class="sc-am-section">Export</div>

            <button class="sc-am-item" id="sc-am-pdf" title="Télécharger le rapport PDF">
                <div class="sc-am-icon" style="background:var(--bg-accent,#eff6ff);">
                    <i class="ti ti-checklist" style="font-size:15px;color:var(--text-accent,#1565c0);" aria-hidden="true"></i>
                </div>
                <div>
                    <div class="sc-am-label">Télécharger PDF</div>
                    <div class="sc-am-sub">Rapport Style Components</div>
                </div>
            </button>

            <button class="sc-am-item" id="sc-am-email" title="Envoyer Order Status par email">
                <div class="sc-am-icon" style="background:var(--bg-success,#f0fdf4);">
                    <i class="ti ti-mail" style="font-size:15px;color:var(--text-success,#166534);" aria-hidden="true"></i>
                </div>
                <div>
                    <div class="sc-am-label">Envoyer par email</div>
                    <div class="sc-am-sub">Order Status Report</div>
                </div>
            </button>

            <div class="sc-am-sep"></div>
            <div class="sc-am-section">Import & Analyse</div>

            <button class="sc-am-item" id="sc-am-psd" title="Importer le fichier PSD hebdomadaire">
                <div class="sc-am-icon" style="background:var(--bg-warning,#fef9c3);">
                    <i class="ti ti-calendar-up" style="font-size:15px;color:var(--text-warning,#854d0e);" aria-hidden="true"></i>
                </div>
                <div>
                    <div class="sc-am-label">Importer PSD</div>
                    <div class="sc-am-sub">SRS · Sewing · Packing Trims</div>
                </div>
            </button>

            <button class="sc-am-item" id="sc-am-tp" title="Analyser le Tech Pack via IA">
                <div class="sc-am-icon" style="background:var(--bg-pro,#f5f3ff);">
                    <i class="ti ti-bolt" style="font-size:15px;color:var(--text-pro,#7c3aed);" aria-hidden="true"></i>
                </div>
                <div>
                    <div class="sc-am-label">Analyser TP</div>
                    <div class="sc-am-sub">Extraction IA des composants</div>
                </div>
            </button>

        </div>`;

        wrapper.appendChild(btn);
        wrapper.appendChild(drop);

        // Handlers des items
        drop.querySelector("#sc-am-pdf").onclick = () => {
            drop.classList.remove("open");
            if (typeof window._scOpenPDFModal === "function") {
                window._scOpenPDFModal();
            }
        };

        drop.querySelector("#sc-am-email").onclick = () => {
            drop.classList.remove("open");
            if (typeof window._scOpenPDFModal === "function") {
                window._scOpenPDFModal();
                // Pré-remplir le champ email et simuler "Envoyer"
                setTimeout(() => {
                    const emailInput = document.querySelector(".sc-pdf-email-input");
                    if (emailInput) emailInput.focus();
                }, 400);
            }
        };

        drop.querySelector("#sc-am-psd").onclick = () => {
            drop.classList.remove("open");
            if (typeof window._psdTriggerUpload === "function") {
                window._psdTriggerUpload();
            }
        };

        drop.querySelector("#sc-am-tp").onclick = () => {
            drop.classList.remove("open");
            if (typeof window._tpaOpenModal === "function") {
                window._tpaOpenModal();
            }
        };

        return wrapper;
    }

    // ── Injecter le menu dans le header ──────────────────────
    function injectMenu() {
        if (document.getElementById(BTN_ID)) return;
        if (window.state?.activeSheet !== SHEET_KEY) return;

        // Masquer les boutons individuels
        HIDE_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = "none";
        });

        // Trouver où insérer (avant la cloche de notif)
        const bell = document.getElementById("btn-notif-global")
                  || document.getElementById("global-notif-btn")
                  || document.querySelector(".header-right button:last-child");
        const headerRight = document.querySelector(".header-right");

        const menu = createMenuBtn();

        if (bell?.parentNode) {
            bell.parentNode.insertBefore(menu, bell);
        } else if (headerRight) {
            headerRight.appendChild(menu);
        }
    }

    // ── Nettoyer quand on quitte Style Components ─────────────
    function removeMenu() {
        document.getElementById(BTN_ID)?.parentElement?.remove();
        HIDE_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = "";
        });
    }

    // ── Observer la navigation ─────────────────────────────────
    function observeNavigation() {
        const tryObserve = () => {
            const titleEl = document.getElementById("header-sheet-title");
            if (!titleEl) { setTimeout(tryObserve, 300); return; }

            new MutationObserver(() => {
                if (window.state?.activeSheet === SHEET_KEY) {
                    setTimeout(injectMenu, 150);
                } else {
                    removeMenu();
                }
            }).observe(titleEl, { childList: true, characterData: true, subtree: true });

            if (window.state?.activeSheet === SHEET_KEY) {
                setTimeout(injectMenu, 150);
            }
        };
        tryObserve();
    }

    // ── Garde-fou ─────────────────────────────────────────────
    function startGuard() {
        let count = 0;
        const g = setInterval(() => {
            if (++count > 120) { clearInterval(g); return; }
            if (window.state?.activeSheet === SHEET_KEY &&
                !document.getElementById(BTN_ID)) {
                injectMenu();
            }
        }, 1000);
    }

    // ── Init ──────────────────────────────────────────────────
    function init() {
        injectStyles();
        setupClickOutside();
        observeNavigation();
        startGuard();
        console.log("[AW27] SC Actions Menu ✓");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 1200);
    }

})();
