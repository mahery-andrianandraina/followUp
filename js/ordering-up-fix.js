// ================================================================
//  AW27 — Mappe "Unit Price" (Sheet) vers la clé "UP" (app)
//  dans le menu Ordering
// ================================================================
(function() {

    function mapUnitPrice() {
        const rows = window.state?.data?.ordering;
        if (!rows || !rows.length) return false;

        let mapped = 0;
        rows.forEach(row => {
            // Si UP est vide mais Unit Price existe → copier
            const up = (row["UP"] ?? "").toString().trim();
            const unitPrice = (row["Unit Price"] ?? "").toString().trim();
            if (!up && unitPrice) {
                row["UP"] = row["Unit Price"];
                mapped++;
            }
            // Si PO est vide mais "PO #" existe → copier
            const po = (row["PO"] ?? "").toString().trim();
            const poHash = (row["PO #"] ?? "").toString().trim();
            if (!po && poHash) {
                row["PO"] = row["PO #"];
                mapped++;
            }
        });
        if (mapped) console.log(`[AW27] Unit Price → UP : ${mapped} lignes mappées`);
        return true;
    }

    // Re-mapper après chaque chargement de données
    function hookRender() {
        if (window._upMapHooked) return;

        const _wait = setInterval(() => {
            if (typeof window.renderTable !== "function") return;
            clearInterval(_wait);
            window._upMapHooked = true;

            const _orig = window.renderTable;
            window.renderTable = function() {
                if (window.state?.activeSheet === "ordering") mapUnitPrice();
                _orig.apply(this, arguments);
            };
        }, 100);
    }

    function init() {
        // Mapper dès que possible, puis ré-essayer quelques fois
        // (le temps que les données arrivent du serveur)
        let tries = 0;
        const t = setInterval(() => {
            tries++;
            if (mapUnitPrice() || tries > 30) clearInterval(t);
        }, 500);

        hookRender();
        console.log("[AW27] Ordering Unit Price fix ✓");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 300);
    }
})();
