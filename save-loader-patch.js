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

/* ══════════════════════════════════════════════════════════
   OVERLAY — position:fixed sur le body
   → toujours centré dans le viewport, même si le formulaire
     est long et que l'utilisateur a scrollé dans la modale
   ══════════════════════════════════════════════════════════ */
#aw27-save-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(10, 25, 50, 0.50);
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease, visibility 0.2s ease;
    pointer-events: none;
}

#aw27-save-overlay.visible {
    opacity: 1;
    visibility: visible;
    pointer-events: all;
}

/* ── Carte centrale ─────────────────────────────────────── */
.aw27-loader-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: 28px 36px;
    border-radius: 18px;
    background: #ffffff;
    border: 0.5px solid #d0dcea;
    animation: aw27-card-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@media (prefers-color-scheme: dark) {
    .aw27-loader-card { background: #1a2035; border-color: #2a3a55; }
}
[data-theme="dark"] .aw27-loader-card { background: #1a2035; border-color: #2a3a55; }

@keyframes aw27-card-in {
    from { transform: scale(0.82) translateY(10px); opacity: 0; }
    to   { transform: scale(1)    translateY(0);    opacity: 1; }
}

/* ── Spinner double anneau — bleu AW27 ─────────────────── */
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
    border-top-color: #1565a7;
    border-right-color: #1565a7;
    animation: aw27-spin 0.75s linear infinite;
}
.aw27-spinner-ring-inner {
    inset: 9px;
    border-bottom-color: #6aaee0;
    border-left-color: #6aaee0;
    animation: aw27-spin 0.55s linear infinite reverse;
}
.aw27-spinner-dot {
    position: absolute;
    top: 50%; left: 50%;
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #1565a7;
    transform: translate(-50%, -50%);
    animation: aw27-pulse 0.75s ease-in-out infinite alternate;
}

@keyframes aw27-spin  { to { transform: rotate(360deg); } }
@keyframes aw27-pulse {
    from { opacity: .35; transform: translate(-50%,-50%) scale(.55); }
    to   { opacity:  1;  transform: translate(-50%,-50%) scale(1);   }
}

/* ── Texte ──────────────────────────────────────────────── */
.aw27-loader-label {
    font-size: 13px;
    font-weight: 500;
    color: #1a2d45;
    letter-spacing: .01em;
    white-space: nowrap;
}
@media (prefers-color-scheme: dark) { .aw27-loader-label { color: #e2eaf5; } }
[data-theme="dark"] .aw27-loader-label { color: #e2eaf5; }

.aw27-loader-sub {
    font-size: 11px;
    color: #7a90a8;
    margin-top: -8px;
    text-align: center;
    max-width: 200px;
}

/* ── Barre de progression ────────────────────────────────── */
.aw27-progress-track {
    width: 140px;
    height: 4px;
    border-radius: 99px;
    background: #e0eaf4;
    overflow: hidden;
}
@media (prefers-color-scheme: dark) { .aw27-progress-track { background: #2a3a55; } }
[data-theme="dark"] .aw27-progress-track { background: #2a3a55; }

.aw27-progress-bar {
    height: 100%;
    width: 0%;
    border-radius: 99px;
    background: linear-gradient(90deg, #1565a7, #6aaee0, #1565a7);
    background-size: 200% 100%;
}
.aw27-progress-bar.running {
    animation: aw27-progress-fill 2s ease-out forwards,
               aw27-shimmer 1.2s linear infinite;
}
@keyframes aw27-progress-fill {
    0%   { width:  0%; }
    40%  { width: 60%; }
    80%  { width: 85%; }
    100% { width: 90%; }
}
@keyframes aw27-shimmer {
    0%   { background-position: 200% center; }
    100% { background-position: -200% center; }
}

/* ── État succès ─────────────────────────────────────────── */
.aw27-loader-card.success .aw27-spinner-ring-outer,
.aw27-loader-card.success .aw27-spinner-ring-inner { border-color: transparent; }
.aw27-loader-card.success .aw27-spinner-dot { background: #1a7a4a; animation: none; }
.aw27-loader-card.success .aw27-progress-bar {
    width: 100% !important;
    animation: none;
    background: #1a7a4a;
    transition: width 0.25s ease;
}
.aw27-loader-card.success .aw27-loader-sub { color: #1a7a4a; }

/* ── Bouton save : effet shimmer pendant le chargement ───── */
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
        rgba(255,255,255,.30) 50%,
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
    // 2. CRÉATION DE L'OVERLAY
    //    Attaché à document.body avec position:fixed
    //    → toujours centré dans le viewport peu importe le scroll
    // ─────────────────────────────────────────────────────────
    function ensureOverlay() {
        if (document.getElementById("aw27-save-overlay")) return;

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
                <div class="aw27-loader-sub"   id="aw27-loader-sub">Connexion à la base de données…</div>
                <div class="aw27-progress-track">
                    <div class="aw27-progress-bar" id="aw27-progress-bar"></div>
                </div>
            </div>`;

        // Attaché au BODY (pas à la modale) → position:fixed fonctionne toujours
        document.body.appendChild(overlay);
    }


    // ─────────────────────────────────────────────────────────
    // 3. SHOW / HIDE
    // ─────────────────────────────────────────────────────────
    let _subCycle = null;

    const SUB_MESSAGES_UPDATE = [
        "Connexion à la base de données…",
        "Mise à jour de la ligne…",
        "Vérification des données…",
        "Synchronisation en cours…",
    ];
    const SUB_MESSAGES_CREATE = [
        "Connexion à la base de données…",
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

        card.classList.remove("success");
        if (labelEl) labelEl.textContent = isUpdate ? "Mise à jour…" : "Enregistrement…";
        if (subEl)   subEl.textContent   = isUpdate ? SUB_MESSAGES_UPDATE[0] : SUB_MESSAGES_CREATE[0];

        if (barEl) {
            barEl.className = "aw27-progress-bar";
            barEl.style.width = "0%";
            void barEl.offsetWidth;
            barEl.className = "aw27-progress-bar running";
        }

        overlay.classList.add("visible");
        if (saveBtn) saveBtn.classList.add("aw27-btn-loading");

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
            card.classList.add("success");
            if (barEl) { barEl.className = "aw27-progress-bar"; barEl.style.width = "100%"; }
            if (subEl) subEl.textContent = "Base de données mise à jour ✓";
            setTimeout(() => {
                overlay.classList.remove("visible");
                setTimeout(() => card.classList.remove("success"), 300);
            }, 650);
        } else {
            overlay.classList.remove("visible");
        }
    }


    // ─────────────────────────────────────────────────────────
    // 4. MONKEY-PATCH DE saveForm()
    // ─────────────────────────────────────────────────────────
    function patchSaveForm() {
        if (typeof window.saveForm !== "function") {
            setTimeout(patchSaveForm, 200);
            return;
        }

        const _originalSaveForm = window.saveForm;

        window.saveForm = async function () {
            const isUpdate = !!(window.state && window.state.editingRow);

            // Si champs requis manquants → pas de loader, l'original gère le toast
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
                    return _originalSaveForm.apply(this, arguments);
                }
            }

            showSaveLoader(isUpdate);

            let success = false;
            try {
                await _originalSaveForm.apply(this, arguments);
                success = true;
            } catch (e) {
                // L'original gère le toast d'erreur
            } finally {
                hideSaveLoader(success);
            }
        };

        console.log("[AW27 Patch] saveForm() patché avec loader centré ✓");
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
