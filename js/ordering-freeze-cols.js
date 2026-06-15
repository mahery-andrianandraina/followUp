// ================================================================
//  AW27 — Freeze colonnes Ordering : Style, Description, Color, Trims, PO #
// ================================================================
(function() {

    const FREEZE_KEYS = ["Style", "Description", "Trims"];

    // ── CSS ───────────────────────────────────────────────────────
    function injectCSS() {
        if (document.getElementById("ord-freeze-css")) return;
        const s = document.createElement("style");
        s.id = "ord-freeze-css";
        s.textContent = `
        th.ord-sticky,
        td.ord-sticky,
        th.ord-sticky-last,
        td.ord-sticky-last {
            position: sticky !important;
            z-index: 4 !important;
            /* Fond solide — aucun texte ne passe derrière */
            background: #ffffff !important;
        }

        /* En-têtes : fond légèrement gris comme les autres th */
        #table-head th.ord-sticky,
        #table-head th.ord-sticky-last {
            background: var(--color-background-secondary, #f9fafb) !important;
            z-index: 5 !important;
        }

        /* Hover ligne */
        #table-body tr:hover td.ord-sticky,
        #table-body tr:hover td.ord-sticky-last {
            background: #f0f6ff !important;
        }

        /* Ombre portée sur la dernière colonne gelée */
        td.ord-sticky-last,
        th.ord-sticky-last {
            border-right: 2px solid #e5e7eb !important;
        }
        .table-wrap.ord-scrolled td.ord-sticky-last::after,
        .table-wrap.ord-scrolled th.ord-sticky-last::after {
            content: '';
            position: absolute;
            top: 0; right: -8px; bottom: 0; width: 8px;
            background: linear-gradient(to right, rgba(0,0,0,0.08), transparent);
            pointer-events: none;
        }
        `;
        document.head.appendChild(s);
    }

    // ── Patcher getColumnClasses ──────────────────────────────────
    function patchGetColumnClasses() {
        const _orig = window.getColumnClasses;
        if (!_orig || window._ordFreezeCCPatched) return;
        window._ordFreezeCCPatched = true;

        window.getColumnClasses = function(key, sheet) {
            if (sheet === "ordering") {
                const idx = FREEZE_KEYS.indexOf(key);
                if (idx === FREEZE_KEYS.length - 1) return "ord-sticky-last";
                if (idx !== -1) return "ord-sticky";
                return "";
            }
            return _orig.call(this, key, sheet);
        };
    }

    // ── Calculer et appliquer les left ────────────────────────────
    // Style est la 1ère colonne visible après le scroll → left:0
    // Description → left = largeur(Style)
    // Color → left = largeur(Style) + largeur(Description)
    // etc.
    function applyLeftPositions() {
        if (window.state?.activeSheet !== "ordering") return;

        const thead = document.getElementById("table-head");
        const tbody = document.getElementById("table-body");
        if (!thead || !tbody) return;

        const ths = Array.from(thead.querySelectorAll("th"));

        // Calculer le left de chaque colonne gelée
        // On accumule UNIQUEMENT les largeurs des colonnes gelées (pas Color qui saute)
        const leftMap = {};
        let cumul = 0;

        ths.forEach(th => {
            const key = th.dataset.key || "";
            const w   = th.getBoundingClientRect().width || th.offsetWidth || 80;
            if (FREEZE_KEYS.includes(key)) {
                leftMap[key] = cumul;
                cumul += w;
            }
        });

        // Appliquer aux th
        ths.forEach(th => {
            const key = th.dataset.key || "";
            if (key in leftMap) {
                th.style.left = leftMap[key] + "px";
            }
        });

        // Appliquer aux td
        Array.from(tbody.querySelectorAll("tr")).forEach(tr => {
            Array.from(tr.querySelectorAll("td[data-key]")).forEach(td => {
                const key = td.dataset.key || "";
                if (key in leftMap) {
                    td.style.left = leftMap[key] + "px";
                }
            });
        });
    }

    // ── Ombre au scroll ───────────────────────────────────────────
    function watchScroll() {
        const wrap = document.querySelector(".table-wrap");
        if (!wrap || wrap._ordScrollWatched) return;
        wrap._ordScrollWatched = true;
        wrap.addEventListener("scroll", () => {
            wrap.classList.toggle("ord-scrolled", wrap.scrollLeft > 0);
        }, { passive: true });
    }

    // ── Patcher renderTable ───────────────────────────────────────
    function patchRenderTable() {
        if (window._ordFreezeRTPatched) return;

        const _wait = setInterval(() => {
            if (typeof window.renderTable !== "function") return;
            clearInterval(_wait);
            window._ordFreezeRTPatched = true;

            const _orig = window.renderTable;
            window.renderTable = function() {
                _orig.apply(this, arguments);
                if (window.state?.activeSheet === "ordering") {
                    setTimeout(() => {
                        applyLeftPositions();
                        watchScroll();
                    }, 80);
                }
            };
        }, 100);
    }

    function init() {
        injectCSS();
        patchGetColumnClasses();
        patchRenderTable();
        console.log("[AW27] Ordering freeze cols ✓");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 100);
    }

})();
