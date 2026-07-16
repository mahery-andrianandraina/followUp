// ================================================================
//  AW27 — Ordering Ready Date Alerts (v2 — lecture DOM directe)
//  Coloration douce des lignes selon Ready Date + Delivery :
//  - Rouge pâle : Ready Date dépassée + pas de livraison (retard)
//  - Bleu pâle  : Ready Date dépassée + In Transit
//  - Jaune pâle : Ready Date dans <= 3 jours
//  - Vert pâle  : Delivered
//  + Bouton "Urgence" à côté des filtres.
//  Charger après app.js dans index.html.
// ================================================================

(function() {
    const SHEET_KEY = "ordering";

    const COLORS = {
        late:      { bg: "#fdf5f5", bar: "#e8b4b4" },
        transit:   { bg: "#f4f9fd", bar: "#b8d7f0" },
        soon:      { bg: "#fdfaf0", bar: "#ead9a8" },
        delivered: { bg: "#f4faf5", bar: "#b9dfc2" }
    };

    let sortActive = false;

    function parseDate(val) {
        if (!val) return null;
        const s = String(val).trim();
        if (!s || s === "—" || s === "-") return null;
        // YYYY-MM-DD
        let m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (m) return new Date(+m[1], +m[2]-1, +m[3]);
        // DD/MM/YYYY
        m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (m) return new Date(+m[3], +m[2]-1, +m[1]);
        // Format app français : "30 oct. 2026" / "4 sept. 2026"
        const months = { "janv":0,"févr":1,"mars":2,"avr":3,"mai":4,"juin":5,
                         "juil":6,"août":7,"sept":8,"oct":9,"nov":10,"déc":11 };
        m = s.toLowerCase().match(/(\d{1,2})\s+([a-zéûô]+)\.?\s*(\d{4})?/);
        if (m) {
            const mon = Object.keys(months).find(k => m[2].startsWith(k));
            if (mon !== undefined && mon !== null) {
                const year = m[3] ? +m[3] : new Date().getFullYear();
                return new Date(year, months[mon], +m[1]);
            }
        }
        const d = new Date(s);
        return isNaN(d) ? null : d;
    }

    // ── Trouver les index des colonnes via les headers ────────
    function findCols(table) {
        const ths = [...table.querySelectorAll("thead th")];
        let iReady = -1, iDelivery = -1;
        ths.forEach((th, i) => {
            const t = th.textContent.trim().toLowerCase();
            if (t.includes("ready date") || t === "ready") iReady = i;
            if (t === "delivery" || t.includes("delivery")) iDelivery = i;
        });
        return { iReady, iDelivery };
    }

    // ── Statut d'une ligne à partir du DOM ────────────────────
    function getRowStatus(tr, iReady, iDelivery) {
        const tds = tr.querySelectorAll("td");
        if (!tds.length) return { key: null, priority: 100 };

        const readyTxt    = iReady    !== -1 ? (tds[iReady]?.textContent || "").trim()    : "";
        const deliveryTxt = iDelivery !== -1 ? (tds[iDelivery]?.textContent || "").trim() : "";
        const delivery    = deliveryTxt.toLowerCase();

        if (delivery.includes("delivered")) return { key: "delivered", priority: 90 };

        const d = parseDate(readyTxt);
        if (!d) return { key: null, priority: 100 };

        const today = new Date(); today.setHours(0,0,0,0);
        d.setHours(0,0,0,0);
        const diff = Math.round((d - today) / 86400000);

        if (diff < 0) {
            if (delivery.includes("transit")) return { key: "transit", priority: 20 };
            return { key: "late", priority: 0 };
        }
        if (diff <= 3) return { key: "soon", priority: 10 };
        return { key: null, priority: 100 };
    }

    // ── Colorer les lignes ────────────────────────────────────
    function applyColors() {
        if (window.state?.activeSheet !== SHEET_KEY) return;

        const table = document.querySelector("#table-container table")
                   || document.querySelector("main table")
                   || document.querySelector("table");
        if (!table) return;

        const { iReady, iDelivery } = findCols(table);
        if (iReady === -1) return; // colonne Ready Date pas visible

        table.querySelectorAll("tbody tr").forEach(tr => {
            const status = getRowStatus(tr, iReady, iDelivery);
            tr.dataset.urgency = status.priority;

            if (status.key && COLORS[status.key]) {
                const c = COLORS[status.key];
                tr.style.background = c.bg;
                tr.style.boxShadow  = `inset 3px 0 0 ${c.bar}`;
            } else {
                tr.style.background = "";
                tr.style.boxShadow  = "";
            }
        });

        table.dataset.orColored = "1";
    }

    // ── Bouton Urgence dans la barre titre du tableau ─────────
    function injectSortButton() {
        if (document.getElementById("btn-sort-urgency")) return;
        if (window.state?.activeSheet !== SHEET_KEY) return;

        // Trouver l'élément contenant "Détails des Styles"
        let titleEl = null;
        document.querySelectorAll("h1,h2,h3,h4,div,span").forEach(el => {
            if (!titleEl &&
                el.children.length <= 2 &&
                el.textContent.trim().startsWith("Détails des Styles")) {
                titleEl = el;
            }
        });
        if (!titleEl) { console.log("[AW27] Titre tableau introuvable"); return; }

        // Le conteneur de la barre = parent qui contient AUSSI le champ recherche
        let bar = titleEl.parentElement;
        for (let i = 0; i < 4 && bar; i++) {
            if (bar.querySelector('input[placeholder*="echercher"]')) break;
            bar = bar.parentElement;
        }

        const btn = document.createElement("button");
        btn.id = "btn-sort-urgency";
        btn.style.cssText = [
            "display:inline-flex","align-items:center","gap:5px",
            "padding:7px 14px","border-radius:20px","font-size:12px",
            "font-weight:600","font-family:inherit","cursor:pointer",
            "background:#fff","color:#b91c1c","border:1px solid #f0d5d5",
            "transition:all .15s","white-space:nowrap",
            "margin:0 12px","vertical-align:middle"
        ].join(";");
        btn.innerHTML = `<i class="ti ti-flame" style="font-size:14px;" aria-hidden="true"></i> Trier par urgence`;
        btn.title = "Retards en premier, puis dates proches, puis in transit";

        btn.onclick = () => {
            sortActive = !sortActive;
            btn.style.background  = sortActive ? "#b91c1c" : "#fff";
            btn.style.color       = sortActive ? "#fff"    : "#b91c1c";
            btn.style.borderColor = sortActive ? "#b91c1c" : "#f0d5d5";
            sortTable();
        };

        // Insertion : juste après le bloc titre (dans la zone rouge indiquée)
        titleEl.insertAdjacentElement("afterend", btn);
        console.log("[AW27] Bouton Urgence injecté ✓ après", titleEl.tagName);
    }

    // ── Trier par urgence ─────────────────────────────────────
    function sortTable() {
        const table = document.querySelector("#table-container table")
                   || document.querySelector("main table")
                   || document.querySelector("table");
        if (!table) return;
        const tbody = table.querySelector("tbody");
        if (!tbody) return;

        applyColors(); // s'assurer que data-urgency est à jour

        const trs = [...tbody.querySelectorAll("tr")];
        if (sortActive) {
            trs.forEach((tr, i) => { if (tr._origOrder === undefined) tr._origOrder = i; });
            trs.sort((a, b) =>
                (parseInt(a.dataset.urgency ?? 100)) - (parseInt(b.dataset.urgency ?? 100))
            );
        } else {
            trs.sort((a, b) => (a._origOrder ?? 0) - (b._origOrder ?? 0));
        }
        trs.forEach(tr => tbody.appendChild(tr));
    }

    // ── Patcher les renders ───────────────────────────────────
    function patchRender() {
        if (window._orAlertsPatched) return;
        window._orAlertsPatched = true;

        ["renderAll", "renderTable"].forEach(fn => {
            const orig = window[fn];
            if (typeof orig === "function") {
                window[fn] = function(...args) {
                    const r = orig.apply(this, args);
                    setTimeout(() => { applyColors(); injectSortButton(); }, 120);
                    return r;
                };
            }
        });
    }

    // ── Garde-fou ─────────────────────────────────────────────
    setInterval(() => {
        if (window.state?.activeSheet !== SHEET_KEY) return;
        const table = document.querySelector("#table-container table")
                   || document.querySelector("main table")
                   || document.querySelector("table");
        if (table && !table.dataset.orColored) applyColors();
        if (!document.getElementById("btn-sort-urgency")) injectSortButton();
    }, 1200);

    // ── Init ──────────────────────────────────────────────────
    function init() {
        patchRender();
        setTimeout(() => { applyColors(); injectSortButton(); }, 1500);
        console.log("[AW27] Ordering Ready Alerts v2 ✓");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 800);
    }
})();
