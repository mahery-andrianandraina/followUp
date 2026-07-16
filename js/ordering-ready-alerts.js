// ================================================================
//  AW27 — Ordering Ready Date Alerts
//  Coloration douce des lignes selon Ready Date + Delivery :
//  - Rouge pâle  : Ready Date dépassée + pas de livraison (retard)
//  - Bleu pâle   : Ready Date dépassée + In Transit
//  - Jaune pâle  : Ready Date dans ≤ 3 jours
//  - Vert pâle   : Delivered
//  + Bouton "Trier par urgence" dans la barre de filtres.
//  Charger après app.js dans index.html.
// ================================================================

(function() {
    const SHEET_KEY = "ordering";

    // Couleurs pastel très douces
    const COLORS = {
        late:     { bg: "#fdf5f5", text: "#b91c1c", border: "#f5dada" }, // rouge très pâle
        transit:  { bg: "#f4f9fd", text: "#1d6fb8", border: "#dcebf7" }, // bleu ciel très pâle
        soon:     { bg: "#fdfaf0", text: "#a16207", border: "#f5ecd0" }, // jaune très pâle
        delivered:{ bg: "#f4faf5", text: "#15803d", border: "#dcefe0" }  // vert très pâle
    };

    let sortActive = false;

    // ── Parser de date robuste ────────────────────────────────
    function parseDate(val) {
        if (!val) return null;
        const s = String(val).trim();
        if (!s) return null;
        const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m1) return new Date(+m1[1], +m1[2]-1, +m1[3]);
        const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m2) return new Date(+m2[3], +m2[2]-1, +m2[1]);
        const d = new Date(s);
        return isNaN(d) ? null : d;
    }

    // ── Déterminer le statut d'une ligne ──────────────────────
    // Retourne { key, priority } — priority basse = plus urgent
    function getRowStatus(row) {
        const delivery = String(row["Delivery"] || "").trim().toLowerCase();
        const readyRaw = row["Ready Date"];

        // Delivered → vert, priorité basse
        if (delivery === "delivered") return { key: "delivered", priority: 90 };

        const d = parseDate(readyRaw);
        if (!d) return { key: null, priority: 100 };

        const today = new Date(); today.setHours(0,0,0,0);
        d.setHours(0,0,0,0);
        const diff = Math.round((d - today) / 86400000);

        if (diff < 0) {
            // Ready Date dépassée
            if (delivery.includes("transit")) return { key: "transit", priority: 20 };
            return { key: "late", priority: 0 }; // retard = le plus urgent
        }
        if (diff <= 3) return { key: "soon", priority: 10 };

        return { key: null, priority: 100 };
    }

    // ── Trouver l'index de colonne par header ─────────────────
    function getColIndex(table, name) {
        const ths = table.querySelectorAll("thead th");
        for (let i = 0; i < ths.length; i++) {
            if (ths[i].textContent.trim().toLowerCase() === name.toLowerCase()) return i;
        }
        return -1;
    }

    // ── Appliquer la coloration aux lignes ────────────────────
    function applyColors() {
        if (window.state?.activeSheet !== SHEET_KEY) return;
        const rows = window.state?.data?.ordering || [];
        if (!rows.length) return;

        const table = document.querySelector("#table-container table")
                   || document.querySelector("main table");
        if (!table) return;

        const trs = table.querySelectorAll("tbody tr");

        trs.forEach(tr => {
            // Retrouver la ligne de données via l'index DOM
            const rowIdx = tr._aw27RowIdx !== undefined
                ? tr._aw27RowIdx
                : [...tr.parentNode.children].indexOf(tr);
            const dataRow = getDataRowForTr(tr, rows);
            if (!dataRow) return;

            const status = getRowStatus(dataRow);
            tr.dataset.urgency = status.priority;

            // Reset
            tr.style.background = "";
            tr.querySelectorAll("td").forEach(td => { td.style.background = ""; });

            if (status.key && COLORS[status.key]) {
                const c = COLORS[status.key];
                tr.style.background = c.bg;
                tr.style.boxShadow = `inset 3px 0 0 ${c.border}`;
            } else {
                tr.style.boxShadow = "";
            }
        });
    }

    // ── Associer une <tr> à sa ligne de données ───────────────
    // Match par le contenu de la première cellule (style ref)
    function getDataRowForTr(tr, rows) {
        const firstCell = tr.querySelector("td");
        if (!firstCell) return null;
        const txt = firstCell.textContent.trim();
        if (!txt) return null;
        return rows.find(r => {
            const v = String(r["Cust Style Ref"] || r.Style || r[Object.keys(r)[0]] || "").trim();
            return v === txt;
        }) || null;
    }

    // ── Bouton Trier par urgence ──────────────────────────────
    function injectSortButton() {
        if (document.getElementById("btn-sort-urgency")) return;
        if (window.state?.activeSheet !== SHEET_KEY) return;

        // Chercher la barre de filtres
        const filterBar = document.querySelector(".filters-bar")
                       || document.querySelector(".table-filters")
                       || document.querySelector("#filters")
                       || document.querySelector(".toolbar");
        if (!filterBar) return;

        const btn = document.createElement("button");
        btn.id = "btn-sort-urgency";
        btn.style.cssText = [
            "display:inline-flex","align-items:center","gap:5px",
            "padding:6px 12px","border-radius:8px","font-size:12px",
            "font-weight:600","font-family:inherit","cursor:pointer",
            "background:#fdf5f5","color:#b91c1c","border:1px solid #f5dada",
            "transition:all .15s","white-space:nowrap"
        ].join(";");
        btn.innerHTML = `<i class="ti ti-flame" style="font-size:14px;" aria-hidden="true"></i> Trier par urgence`;
        btn.title = "Remonter les lignes urgentes en haut du tableau";

        btn.onclick = () => {
            sortActive = !sortActive;
            btn.style.background = sortActive ? "#b91c1c" : "#fdf5f5";
            btn.style.color      = sortActive ? "#fff"    : "#b91c1c";
            sortTable();
        };

        filterBar.appendChild(btn);
    }

    // ── Trier le tableau par urgence ──────────────────────────
    function sortTable() {
        const table = document.querySelector("#table-container table")
                   || document.querySelector("main table");
        if (!table) return;
        const tbody = table.querySelector("tbody");
        if (!tbody) return;

        const trs = [...tbody.querySelectorAll("tr")];

        if (sortActive) {
            // Mémoriser l'ordre original
            trs.forEach((tr, i) => { if (tr._origOrder === undefined) tr._origOrder = i; });
            // Trier par data-urgency croissant (0 = retard en premier)
            trs.sort((a, b) =>
                (parseInt(a.dataset.urgency ?? 100)) - (parseInt(b.dataset.urgency ?? 100))
            );
        } else {
            // Restaurer l'ordre original
            trs.sort((a, b) => (a._origOrder ?? 0) - (b._origOrder ?? 0));
        }

        trs.forEach(tr => tbody.appendChild(tr));
    }

    // ── Patcher renderTable/renderAll pour ré-appliquer ───────
    function patchRender() {
        if (window._orAlertsPatched) return;
        window._orAlertsPatched = true;

        const origRenderAll = window.renderAll;
        if (typeof origRenderAll === "function") {
            window.renderAll = function(...args) {
                const r = origRenderAll.apply(this, args);
                setTimeout(() => { applyColors(); injectSortButton(); }, 100);
                return r;
            };
        }

        const origRenderTable = window.renderTable;
        if (typeof origRenderTable === "function") {
            window.renderTable = function(...args) {
                const r = origRenderTable.apply(this, args);
                setTimeout(() => { applyColors(); injectSortButton(); }, 100);
                return r;
            };
        }
    }

    // ── Garde-fou ─────────────────────────────────────────────
    setInterval(() => {
        if (window.state?.activeSheet === SHEET_KEY) {
            const table = document.querySelector("#table-container table")
                       || document.querySelector("main table");
            if (table && !table.dataset.orColored) {
                applyColors();
                injectSortButton();
            }
        }
    }, 1200);

    // ── Init ──────────────────────────────────────────────────
    function init() {
        patchRender();
        setTimeout(() => { applyColors(); injectSortButton(); }, 1500);
        console.log("[AW27] Ordering Ready Alerts ✓");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 800);
    }
})();
