// ================================================================
//  AW27 — Aperçu PDF en plein écran (robuste)
// ================================================================
(function() {

    // Injecter une règle CSS globale qui force le plein écran
    function injectCSS() {
        if (document.getElementById("pdf-fullscreen-css")) return;
        const s = document.createElement("style");
        s.id = "pdf-fullscreen-css";
        s.textContent = `
        /* Force le plein écran sur le modal d'aperçu PDF */
        #cpdf-preview-modal.open #cpdf-preview-inner,
        #cpdf-preview-modal #cpdf-preview-inner,
        .cpdf-preview-inner,
        [id*="cpdf"][id*="inner"] {
            width: 100vw !important;
            height: 100vh !important;
            max-width: 100vw !important;
            max-height: 100vh !important;
            border-radius: 0 !important;
        }
        #cpdf-preview-modal,
        [id*="cpdf"][id*="modal"] {
            padding: 0 !important;
        }
        /* L'iframe/embed du PDF prend tout l'espace */
        #cpdf-preview-modal iframe,
        #cpdf-preview-modal embed,
        #cpdf-preview-modal object,
        [id*="cpdf"] iframe,
        [id*="cpdf"] embed {
            width: 100% !important;
            height: 100% !important;
            flex: 1 1 auto !important;
        }
        `;
        document.head.appendChild(s);
    }

    // Forcer le plein écran sur tout modal PDF visible
    function makeFullscreen() {
        // Chercher tout conteneur d'aperçu PDF ouvert
        const candidates = document.querySelectorAll(
            '[id*="cpdf"], [class*="cpdf"], [id*="pdf-preview"], [class*="pdf-preview"]'
        );
        candidates.forEach(el => {
            const id = (el.id || "").toLowerCase();
            const cls = (el.className || "").toString().toLowerCase();
            // Le panneau intérieur (inner/panel/content)
            if (/inner|panel|content|box|dialog/.test(id + cls)) {
                el.style.width        = "100vw";
                el.style.height       = "100vh";
                el.style.maxWidth     = "100vw";
                el.style.maxHeight    = "100vh";
                el.style.borderRadius = "0";
            }
            // L'overlay (modal/overlay/backdrop)
            if (/modal|overlay|backdrop/.test(id + cls)) {
                el.style.padding = "0";
            }
            // Les iframe/embed dedans
            el.querySelectorAll("iframe, embed, object").forEach(f => {
                f.style.width  = "100%";
                f.style.height = "100%";
            });
        });
    }

    // Patch openCPDFPreview (toutes les variantes possibles)
    function patchOpenFns() {
        ["openCPDFPreview", "openPDFPreview", "openPdfPreview", "previewPDF"].forEach(fnName => {
            const _orig = window[fnName];
            if (typeof _orig === "function" && !_orig._fsPatched) {
                const wrapped = function(...args) {
                    const r = _orig.apply(this, args);
                    setTimeout(makeFullscreen, 30);
                    setTimeout(makeFullscreen, 150);
                    return r;
                };
                wrapped._fsPatched = true;
                window[fnName] = wrapped;
            }
        });
    }

    function init() {
        injectCSS();

        // Patcher les fonctions d'ouverture dès qu'elles existent
        let tries = 0;
        const t = setInterval(() => {
            tries++;
            patchOpenFns();
            if (tries > 40) clearInterval(t);
        }, 250);

        // Filet de sécurité : observer le DOM pour tout modal PDF qui s'ouvre
        new MutationObserver(() => {
            const open = document.querySelector(
                '[id*="cpdf"].open, [class*="cpdf"].open, [id*="cpdf-preview-modal"]'
            );
            if (open) setTimeout(makeFullscreen, 20);
        }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });

        console.log("[AW27] PDF preview plein écran ✓");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 200);
    }
})();
