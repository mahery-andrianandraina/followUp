// ================================================================
//  AW27 — Aperçu PDF en plein écran
// ================================================================
(function() {
    function makeFullscreen() {
        // Modal overlay — couvre tout
        const modal = document.getElementById("cpdf-preview-modal");
        if (modal) {
            modal.style.padding = "0";
        }

        // Panel intérieur — plein écran
        const inner = document.getElementById("cpdf-preview-inner");
        if (inner) {
            inner.style.width        = "100vw";
            inner.style.height       = "100vh";
            inner.style.maxWidth     = "100vw";
            inner.style.borderRadius = "0";
        }
    }

    // Patch openCPDFPreview
    const _wait = setInterval(() => {
        if (typeof window.openCPDFPreview !== "function") return;
        clearInterval(_wait);
        const _orig = window.openCPDFPreview;
        window.openCPDFPreview = function(url, title) {
            _orig.call(this, url, title);
            setTimeout(makeFullscreen, 10);
        };
    }, 100);
})();
