// ============================================================
// AW27 – PATCH : Animation de chargement pro au clic "Enregistrer"
// À insérer APRÈS le chargement de app.js dans votre HTML :
//   <script src="save-loader-patch.js"></script>
// ============================================================

(function () {
    // ─────────────────────────────────────────────────────────
    // 1. STYLES
    // ─────────────────────────────────────────────────────────
    const style = document.createElement("style");
    style.id = "aw27-save-loader-styles";
    style.textContent = `

/* ── Overlay pleine modale ─────────────────────────────── */
#aw27-save-overlay {
    position: absolute;
    inset: 0;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 18px;
    border-radius: inherit;
    pointer-events: all;

    /* Verre dépoli */
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(6px) saturate(1.5);
    -webkit-backdrop-filter: blur(6px) saturate(1.5);

    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease, visibility 0.2s ease;
}

[data-theme="dark"] #aw27-save-overlay,
.dark #aw27-save-overlay {
    background: rgba(20, 22, 30, 0.75);
}

#aw27-save-overlay.visible {
    opacity: 1;
    visibility: visible;
}

/* ── Carte centrale ─────────────────────────────────────── */
.aw27-loader-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: 28px 36px;
    border-radius: 18px;
    background: var(--surface, #fff);
    box-shadow:
        0 8px 32px rgba(0,0,0,.12),
        0 2px 8px rgba(0,0,0,.06),
        inset 0 1px 0 rgba(255,255,255,.9);

    animation: aw27-card-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes aw27-card-in {
    from { transform: scale(0.82) translateY(10px); opacity: 0; }
    to   { transform: scale(1)    translateY(0);    opacity: 1; }
}

/* ── Spinner double anneau ─────────────────────────────── */
.aw27-spinner {
    position: relative;
    width: 52px;
    height: 52px;
}

.aw27-spinner-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 3.5px solid transparent;
}

.aw27-spinner-ring-outer {
    border-top-color: #BA7517;
    border-right-color: #BA7517;
    animation: aw27-spin 0.75s linear infinite;
}

.aw27-spinner-ring-inner {
    inset: 9px;
    border-bottom-color: #FAC775;
    border-left-color: #FAC775;
    animation: aw27-spin 0.55s linear infinite reverse;
}

.aw27-spinner-dot {
    position: absolute;
    top: 50%; left: 50%;
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #BA7517;
    transform: translate(-50%, -50%);
    animation: aw27-pulse 0.75s ease-in-out infinite alternate;
}

@keyframes aw27-spin  { to { transform: rotate(360deg); } }
@keyframes aw27-pulse { from { opacity: .4; transform: translate(-50%,-50%) scale(.6); }
                        to   { opacity: 1;  transform: translate(-50%,-50%) scale(1); } }

/* ── Texte + barre de progression ──────────────────────── */
.aw27-loader-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary, #111);
    letter-spacing: .01em;
    white-space: nowrap;
}

.aw27-loader-sub {
    font-size: 11px;
    color: var(--text-secondary, #6b7280);
    margin-top: -8px;
}

.aw27-progress-track {
    width: 140px;
    height: 4px;
    border-radius: 99px;
    background: var(--border, #e5e7eb);
    overflow: hidden;
}

.aw27-progress-bar {
    height: 100%;
    width: 0%;
    border-radius: 99px;
    background: linear-gradient(90deg, #BA7517, #FAC775, #BA7517);
    background-size: 200% 100%;
    animation: aw27-progress-fill 2s ease-out forwards,
               aw27-shimmer 1.2s linear infinite;
}

@keyframes aw27-progress-fill {
    0%   { width:  0%; }
    40%  { width: 60%; }
    80%  { width: 85%; }
    100% { width: 90%; } /* bloqué à 90 jusqu'au succès */
}

@keyframes aw27-shimmer {
    0%   { background-position: 200% center; }
    100% { background-position: -200% center; }
}

/* ── État succès ─────────────────────────────────────────── */
.aw27-loader-card.success .aw27-spinner-ring-outer,
.aw27-loader-card.success .aw27-spinner-ring-inner {
    border-color: transparent;
}
.aw27-loader-card.success .aw27-spinner-dot {
    background: #1D9E75;
}
.aw27-loader-card.success .aw27-progress-bar {
    width: 100% !important;
    animation: none;
    background: #1D9E75;
    transition: width 0.25s ease;
}

/* ── Bouton save : état loading ─────────────────────────── */
#form-save.aw27-btn-loading {
    position: relative;
    overflow: hidden;
    pointer-events: none;
    opacity: 0.85;
}

#form-save.aw27-btn-loading::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255,255,255,0.35) 50%,
        transparent 100%
    );
    background-size: 200% 100%;
    animation: aw27-btn-sweep 0.9s linear infinite;
}

@keyframes aw27-btn-sweep {
    from { background-position: -200% center; }
    to   { background-position:  200% center; }
}

`;
    document.head.appendChild(style);

    // ─────────────────────────────────────────────────────────
    // 2. CRÉATION DE L'OVERLAY (inséré dans .modal-content)
    // ─────────────────────────────────────────────────────────
    function ensureOverlay() {
        if (document.getElementById("aw27-save-overlay")) return;

        // Trouver le conteneur de la modale
        const modalContent = document.querySelector(
            ".modal-content, #modal-overlay .modal, #modal-overlay > div"
        );
        if (!modalContent) return;

        // S'assurer que le parent est en position relative
        const cs = getComputedStyle(modalContent);
        if (cs.position === "static") modalContent.style.position = "relative";

        const overlay = document.createElement("div");
        overlay.id = "aw27-save-overlay";
        overlay.innerHTML = `
            <div class="aw27-loader-card" id="aw27-loader-card">
                <div class="aw27-spinner">
                    <div class="aw27-spinner-ring aw27-spinner-ring-outer"></div>
                    <div class="aw27-spinner-ring aw27-spinner-ring-inner"></div>
                    <div class="aw27-spinner-dot"></div>
                </div>
                <div class="aw27-loader-label" id="aw27-loader-label">Enregistrement…</div>
                <div class="aw27-loader-sub"   id="aw27-loader-sub">Connexion à Google Sheets</div>
                <div class="aw27-progress-track">
                    <div class="aw27-progress-bar" id="aw27-progress-bar"></div>
                </div>
            </div>`;

        modalContent.appendChild(overlay);
    }

    // ─────────────────────────────────────────────────────────
    // 3. SHOW / HIDE
    // ─────────────────────────────────────────────────────────
    let _subCycle = null;

    const SUB_MESSAGES_UPDATE = [
        "Connexion à Google Sheets…",
        "Mise à jour de la ligne…",
        "Vérification des données…",
        "Synchronisation en cours…",
    ];
    const SUB_MESSAGES_CREATE = [
        "Connexion à Google Sheets…",
        "Création de la ligne…",
        "Validation des champs…",
        "Synchronisation en cours…",
    ];

    function showSaveLoader(isUpdate) {
        ensureOverlay();
        const overlay  = document.getElementById("aw27-save-overlay");
        const card     = document.getElementById("aw27-loader-card");
        const labelEl  = document.getElementById("aw27-loader-label");
        const subEl    = document.getElementById("aw27-loader-sub");
        const barEl    = document.getElementById("aw27-progress-bar");
        const saveBtn  = document.getElementById("form-save");

        if (!overlay) return;

        // Reset état
        card.classList.remove("success");
        if (labelEl) labelEl.textContent = isUpdate ? "Mise à jour…" : "Enregistrement…";
        if (subEl)   subEl.textContent   = "Connexion à Google Sheets…";

        // Relancer la barre
        if (barEl) {
            barEl.style.animation = "none";
            barEl.style.width = "0%";
            void barEl.offsetWidth; // reflow
            barEl.style.animation = "aw27-progress-fill 2s ease-out forwards, aw27-shimmer 1.2s linear infinite";
        }

        overlay.classList.add("visible");
        if (saveBtn) saveBtn.classList.add("aw27-btn-loading");

        // Cycle des sous-messages
        const msgs = isUpdate ? SUB_MESSAGES_UPDATE : SUB_MESSAGES_CREATE;
        let i = 0;
        _subCycle = setInterval(() => {
            i = (i + 1) % msgs.length;
            if (subEl) subEl.textContent = msgs[i];
        }, 900);
    }

    function hideSaveLoader(success) {
        clearInterval(_subCycle);
        const overlay = document.getElementById("aw27-save-overlay");
        const card    = document.getElementById("aw27-loader-card");
        const barEl   = document.getElementById("aw27-progress-bar");
        const subEl   = document.getElementById("aw27-loader-sub");
        const saveBtn = document.getElementById("form-save");

        if (!overlay) return;

        if (saveBtn) saveBtn.classList.remove("aw27-btn-loading");

        if (success) {
            // Flash succès 600 ms puis fermeture
            card.classList.add("success");
            if (barEl) { barEl.style.animation = "none"; barEl.style.width = "100%"; }
            if (subEl) subEl.textContent = "Enregistré ✓";
            setTimeout(() => {
                overlay.classList.remove("visible");
                setTimeout(() => card.classList.remove("success"), 300);
            }, 620);
        } else {
            overlay.classList.remove("visible");
        }
    }

    // ─────────────────────────────────────────────────────────
    // 4. MONKEY-PATCH DE saveForm()
    //    On remplace la fonction globale en gardant la logique
    //    originale, en ajoutant uniquement les hooks visuels.
    // ─────────────────────────────────────────────────────────
    function patchSaveForm() {
        if (typeof window.saveForm !== "function") {
            // Réessayer après que le DOM / app.js soit prêt
            setTimeout(patchSaveForm, 200);
            return;
        }

        const _originalSaveForm = window.saveForm;

        window.saveForm = async function () {
            // Déterminer si c'est un UPDATE ou CREATE avant d'appeler l'original
            // (state.editingRow est accessible via closure)
            const isUpdate = !!(window.state && window.state.editingRow);

            // Validation rapide : si un champ requis manque,
            // l'original va afficher le toast et retourner — on n'affiche pas le loader.
            // On reproduit la vérification légèrement.
            const cfg = (window.SHEET_CONFIG || {})[window.state && window.state.activeSheet];
            if (cfg) {
                const rawData = typeof window.getFormData === "function" ? window.getFormData() : {};
                const data = {};
                cfg.cols.forEach(col => {
                    const raw = rawData[col.key] ?? "";
                    data[col.key] = typeof raw === "string" ? raw.trim() : raw;
                });
                const missing = cfg.cols.filter(c => c.required && !data[c.key]);
                if (missing.length) {
                    // Laisser l'original gérer le toast sans loader
                    return _originalSaveForm.apply(this, arguments);
                }
            }

            // Afficher le loader
            showSaveLoader(isUpdate);

            let success = false;
            try {
                await _originalSaveForm.apply(this, arguments);
                success = true;
            } catch (e) {
                // L'original gère déjà le showToast d'erreur
            } finally {
                hideSaveLoader(success);
            }
        };

        console.log("[AW27 Patch] saveForm() patché avec animation de chargement ✓");
    }

    // ─────────────────────────────────────────────────────────
    // 5. DÉMARRAGE
    // ─────────────────────────────────────────────────────────
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", patchSaveForm);
    } else {
        patchSaveForm();
    }

})();
