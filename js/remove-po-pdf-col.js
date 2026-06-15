// ================================================================
//  AW27 — Retire la colonne "Comment PDF" du menu Ordering
// ================================================================
(function() {
    function removePoPdfCol() {
        const cols = window.SHEET_CONFIG?.ordering?.cols;
        if (!cols) return;
        const idx = cols.findIndex(c => c.key === "Comment PDF");
        if (idx !== -1) {
            cols.splice(idx, 1);
            console.log("[AW27] Colonne 'Comment PDF' retirée de Ordering ✓");
        }
    }

    // Appliquer dès que SHEET_CONFIG est dispo, puis après chaque renderTable
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", removePoPdfCol);
    } else {
        removePoPdfCol();
    }

    // Patcher renderTable pour re-appliquer après chaque rendu
    const _waitAndPatch = setInterval(() => {
        if (typeof window.renderTable !== "function") return;
        clearInterval(_waitAndPatch);
        if (window._removePoPdfPatched) return;
        window._removePoPdfPatched = true;
        const _orig = window.renderTable;
        window.renderTable = function() {
            removePoPdfCol();
            _orig.apply(this, arguments);
        };
    }, 100);
})();
