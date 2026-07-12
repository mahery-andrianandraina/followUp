// ================================================================
//  AW27 — Date Fix Patch
//  Corrige les cellules affichant "Invalid Date" dans les tables
//  en lisant la vraie valeur depuis l'attribut title.
//  Ne touche pas à app.js.
//  Charger après app.js dans index.html.
// ================================================================

(function initDateFix() {

    // ── Parser de date robuste ────────────────────────────────
    // Gère DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, ISO strings, etc.
    function parseDate(val) {
        if (!val) return null;
        const s = String(val).trim();
        if (!s) return null;

        // DD/MM/YYYY ou D/M/YYYY
        const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m1) {
            const d = new Date(+m1[3], +m1[2] - 1, +m1[1]);
            if (!isNaN(d)) return d;
        }

        // DD-MM-YYYY
        const m2 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
        if (m2) {
            const d = new Date(+m2[3], +m2[2] - 1, +m2[1]);
            if (!isNaN(d)) return d;
        }

        // YYYY-MM-DD (ISO partiel)
        const m3 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m3) {
            const d = new Date(+m3[1], +m3[2] - 1, +m3[3]);
            if (!isNaN(d)) return d;
        }

        // Tentative native JS (ISO complet, etc.)
        const d = new Date(s);
        return isNaN(d) ? null : d;
    }

    // ── Formater en DD/MM/YYYY ────────────────────────────────
    function formatDateFR(d) {
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yy = d.getFullYear();
        return `${dd}/${mm}/${yy}`;
    }

    // ── Corriger une cellule "Invalid Date" ───────────────────
    function fixCell(cell) {
        const text = cell.textContent?.trim();
        if (!text || !text.toLowerCase().includes("invalid date")) return;

        // Chercher la vraie valeur : title sur la cellule ou sur un enfant
        const raw = cell.getAttribute("title")
                 || cell.getAttribute("data-raw")
                 || cell.querySelector("[title]")?.getAttribute("title")
                 || cell.querySelector("[data-raw]")?.getAttribute("data-raw")
                 || "";
        if (!raw || raw.toLowerCase().includes("invalid")) return;

        const d = parseDate(raw);
        if (!d) return;

        const formatted = formatDateFR(d);

        // Mettre à jour : chercher l'élément qui affiche "Invalid Date"
        const innerEl = cell.querySelector(".cell-text, .cell-value, span, div");
        if (innerEl && innerEl.textContent?.toLowerCase().includes("invalid date")) {
            innerEl.textContent = formatted;
        } else {
            // Parcourir les nœuds texte
            let fixed = false;
            const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
                if (walker.currentNode.textContent.toLowerCase().includes("invalid date")) {
                    walker.currentNode.textContent = formatted;
                    fixed = true;
                    break;
                }
            }
            // Fallback : remplacer tout le contenu texte
            if (!fixed && cell.childElementCount === 0) {
                cell.textContent = formatted;
            }
        }

        cell.setAttribute("title", formatted);
    }

    // ── Scanner toutes les cellules du tableau ─────────────────
    function scanAndFix() {
        const cells = document.querySelectorAll(
            "td, .table-cell, .cell-value, [data-type='date']"
        );
        let fixed = 0;
        cells.forEach(cell => {
            const before = cell.textContent?.trim();
            fixCell(cell);
            if (cell.textContent?.trim() !== before) fixed++;
        });
        if (fixed > 0) {
            console.log(`[AW27 DateFix] ${fixed} cellule${fixed > 1 ? "s" : ""} corrigée${fixed > 1 ? "s" : ""} ✓`);
        }
    }

    // ── Observer les mutations DOM (nouvelles lignes de table) ──
    function observeTable() {
        new MutationObserver((mutations) => {
            let needsScan = false;
            mutations.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;
                    // Vérifier si un nœud ajouté contient "Invalid Date"
                    if (node.textContent?.toLowerCase().includes("invalid date")) {
                        needsScan = true;
                    }
                });
            });
            if (needsScan) setTimeout(scanAndFix, 50);
        }).observe(document.body, { childList: true, subtree: true });
    }

    // ── Init ──────────────────────────────────────────────────
    function init() {
        observeTable();

        // Patcher renderAll pour rescanner après chaque re-rendu de table
        const tryPatch = () => {
            const orig = window.renderAll;
            if (typeof orig === "function" && !window._dateFxPatched) {
                window._dateFxPatched = true;
                window.renderAll = function(...args) {
                    const r = orig.apply(this, args);
                    setTimeout(scanAndFix, 200);
                    return r;
                };
            } else if (!window._dateFxPatched) {
                setTimeout(tryPatch, 400);
            }
        };
        tryPatch();

        // Scans initiaux après chargement des données
        setTimeout(scanAndFix, 1500);
        setTimeout(scanAndFix, 3000);
        console.log("[AW27] Date Fix ✓");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 500);
    }

})();
