// ================================================================
//  AW27 — Ordering Ready Date Alerts (v3)
//  Détection par la COLONNE "Ready Date" du tableau (pas par state).
//  Coloration douce + bouton "Trier par urgence" à côté du champ
//  Rechercher. Charger après app.js.
// ================================================================

(function() {
    const COLORS = {
        late:      { bg: "#fdf5f5", bar: "#e8b4b4" },
        transit:   { bg: "#f4f9fd", bar: "#b8d7f0" },
        soon:      { bg: "#fdfaf0", bar: "#ead9a8" },
        delivered: { bg: "#f4faf5", bar: "#b9dfc2" }
    };

    let sortActive = false;

    // ── Trouver le tableau Ordering = celui avec colonne Ready Date ──
    function findOrderingTable() {
        for (const table of document.querySelectorAll("table")) {
            const ths = [...table.querySelectorAll("thead th")];
            if (ths.some(th => th.textContent.trim().toLowerCase().includes("ready date"))) {
                return table;
            }
        }
        return null;
    }

    function findCols(table) {
        const ths = [...table.querySelectorAll("thead th")];
        let iReady = -1, iDelivery = -1;
        ths.forEach((th, i) => {
            const t = th.textContent.trim().toLowerCase();
            if (iReady === -1 && t.includes("ready date")) iReady = i;
            if (iDelivery === -1 && t.includes("delivery"))  iDelivery = i;
        });
        return { iReady, iDelivery };
    }

    function parseDate(val) {
        if (!val) return null;
        const s = String(val).trim();
        if (!s || s === "—" || s === "-") return null;
        let m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (m) return new Date(+m[1], +m[2]-1, +m[3]);
        m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (m) return new Date(+m[3], +m[2]-1, +m[1]);
        const months = { "janv":0,"fevr":1,"févr":1,"mars":2,"avr":3,"mai":4,"juin":5,
                         "juil":6,"aout":7,"août":7,"sept":8,"oct":9,"nov":10,"dec":11,"déc":11 };
        m = s.toLowerCase().match(/(\d{1,2})\s+([a-zéûôà]+)\.?\s*(\d{4})?/);
        if (m) {
            const key = Object.keys(months).find(k => m[2].startsWith(k));
            if (key) {
                const year = m[3] ? +m[3] : new Date().getFullYear();
                return new Date(year, months[key], +m[1]);
            }
        }
        const d = new Date(s);
        return isNaN(d) ? null : d;
    }

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

    // ── Colorer ───────────────────────────────────────────────
    function applyColors() {
        const table = findOrderingTable();
        if (!table) return false;

        const { iReady, iDelivery } = findCols(table);
        if (iReady === -1) return false;

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
        return true;
    }

    // ── Bouton dans la barre du champ Rechercher ──────────────
    function injectSortButton() {
        if (document.getElementById("btn-sort-urgency")) {
            // Retirer le bouton si le tableau Ordering n'est plus affiché
            if (!findOrderingTable()) document.getElementById("btn-sort-urgency").remove();
            return;
        }
        if (!findOrderingTable()) return; // pas sur Ordering

        const searchInput = document.querySelector('input[placeholder*="echercher"]');
        if (!searchInput) return;

        // Parent DIRECT du champ recherche = le conteneur flex des filtres
        const container = searchInput.closest("div")?.parentElement;
        if (!container) return;

        const btn = document.createElement("button");
        btn.id = "btn-sort-urgency";
        btn.style.cssText = [
            "display:inline-flex","align-items:center","gap:5px",
            "padding:7px 14px","border-radius:20px","font-size:12px",
            "font-weight:600","font-family:inherit","cursor:pointer",
            "background:#fff","color:#b91c1c","border:1px solid #f0d5d5",
            "white-space:nowrap","flex-shrink:0"
        ].join(";");
        btn.innerHTML = `<i class="ti ti-flame" style="font-size:14px;" aria-hidden="true"></i> Urgence`;
        btn.title = "Trier : retards en premier, puis dates proches, puis in transit";

        btn.onclick = () => {
            sortActive = !sortActive;
            btn.style.background  = sortActive ? "#b91c1c" : "#fff";
            btn.style.color       = sortActive ? "#fff"    : "#b91c1c";
            btn.style.borderColor = sortActive ? "#b91c1c" : "#f0d5d5";
            sortTable();
        };

        // Insérer AVANT le champ recherche dans le conteneur flex
        const searchWrapper = searchInput.closest("div");
        container.insertBefore(btn, searchWrapper);
        console.log("[AW27] Bouton Urgence injecté ✓");
    }

    // ── Trier ─────────────────────────────────────────────────
    function sortTable() {
        const table = findOrderingTable();
        if (!table) return;
        const tbody = table.querySelector("tbody");
        if (!tbody) return;

        applyColors();

        const trs = [...tbody.querySelectorAll("tr")];
        if (sortActive) {
            trs.forEach((tr, i) => { if (tr._origOrder === undefined) tr._origOrder = i; });
            trs.sort((a, b) =>
                (parseInt(a.dataset.urgency ?? "100")) - (parseInt(b.dataset.urgency ?? "100"))
            );
        } else {
            trs.sort((a, b) => (a._origOrder ?? 0) - (b._origOrder ?? 0));
        }
        trs.forEach(tr => tbody.appendChild(tr));
        console.log("[AW27] Tri urgence:", sortActive ? "ON" : "OFF");
    }

    // ── Boucle de surveillance (simple et fiable) ─────────────
    setInterval(() => {
        const colored = applyColors();
        injectSortButton();
        // Réappliquer le tri si actif et le tableau a été re-rendu
        if (colored && sortActive) {
            const table = findOrderingTable();
            const firstTr = table?.querySelector("tbody tr");
            if (firstTr && parseInt(firstTr.dataset.urgency ?? "100") > 0) {
                // le tri a été perdu par un re-render
                const trs = [...table.querySelectorAll("tbody tr")];
                const hasUrgent = trs.some(tr => parseInt(tr.dataset.urgency ?? "100") < 100);
                if (hasUrgent) sortTable();
            }
        }
    }, 1000);

    console.log("[AW27] Ordering Ready Alerts v3 ✓");
})();
