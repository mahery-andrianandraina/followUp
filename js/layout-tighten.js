// ================================================================
//  AW27 — Réduire l'espace entre la card de données et les bords
// ================================================================
(function() {
    function applyTighten() {
        const card = document.querySelector(".table-card");
        if (!card) return false;
        const parent = card.parentElement;
        if (parent) {
            // Le parent a 24px de padding → réduire à 10px
            parent.style.paddingLeft  = "10px";
            parent.style.paddingRight = "10px";
        }
        return true;
    }

    function injectCSS() {
        if (document.getElementById("aw-tighten-css")) return;
        const s = document.createElement("style");
        s.id = "aw-tighten-css";
        s.textContent = `
        /* Parent direct de la table-card : réduire le padding latéral */
        .table-card { width: 100% !important; max-width: 100% !important; }
        `;
        document.head.appendChild(s);
    }

    function init() {
        injectCSS();
        // Appliquer maintenant + réessayer le temps que le DOM se construise
        let tries = 0;
        const t = setInterval(() => {
            tries++;
            if (applyTighten() || tries > 20) clearInterval(t);
        }, 300);

        // Réappliquer à chaque changement de menu (le parent peut être recréé)
        new MutationObserver(() => applyTighten())
            .observe(document.body, { childList: true, subtree: true });

        console.log("[AW27] Layout resserré ✓");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 200);
    }
})();
