// ============================================================
//  AW27 CHECKERS — Menu Delete Patch
//  Ajoute un bouton "Supprimer ce menu" dans la modale
//  openMenuEdit(), avec confirmation et nettoyage complet.
//  Inclure après app.js dans index.html :
//    <script src="menuDeletePatch.js"></script>
// ============================================================

(function () {
    'use strict';

    // ── CSS supplémentaire ──────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
    /* Bouton dans le footer — toujours visible */
    #mb-delete-section {
        display: none;
        margin-right: auto;
    }
    #mb-delete-section.visible { display: block; }

    #mb-delete-btn {
        padding: 7px 13px;
        border-radius: 8px;
        border: 1px solid #fca5a5;
        background: #fee2e2;
        color: #dc2626;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
        transition: all 0.15s;
    }
    #mb-delete-btn:hover { background: #dc2626; color: #fff; border-color: #dc2626; }

    /* Confirmation — barre collée au bas du modal, au-dessus du footer */
    #mb-delete-confirm {
        display: none;
        align-items: center;
        gap: 12px;
        padding: 11px 16px;
        background: #fff5f5;
        border-top: 1px solid #fecaca;
        flex-shrink: 0;
    }
    #mb-delete-confirm.visible { display: flex; }
    #mb-delete-confirm-text {
        flex: 1;
        font-size: 12px;
        color: #7f1d1d;
        line-height: 1.45;
    }
    #mb-delete-confirm-actions { display: flex; gap: 7px; flex-shrink: 0; }
    #mb-delete-cancel {
        padding: 6px 13px; border-radius: 7px;
        border: 0.5px solid #d1d5db; background: transparent;
        font-size: 12px; color: #6b7280; cursor: pointer; font-family: inherit;
    }
    #mb-delete-cancel:hover { background: #f3f4f6; }
    #mb-delete-confirm-btn {
        padding: 6px 15px; border-radius: 7px; border: none;
        background: #dc2626; color: #fff;
        font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit;
        transition: background 0.15s; white-space: nowrap;
    }
    #mb-delete-confirm-btn:hover { background: #b91c1c; }
    #mb-delete-confirm-btn:disabled { opacity: 0.55; cursor: not-allowed; }
    `;
    document.head.appendChild(style);

    // ── Injecter les éléments dans le menu builder ──────────────
    // Le bouton est placé dans le footer (toujours visible, pas de scroll)
    function injectDeleteUI() {
        const modal = document.getElementById('menu-builder-overlay');
        if (!modal || document.getElementById('mb-delete-section')) return;

        const footer = modal.querySelector('.modal-footer');
        if (!footer) return;

        // Bouton déclencheur — inséré à gauche dans le footer
        const deleteSection = document.createElement('div');
        deleteSection.id = 'mb-delete-section';
        deleteSection.innerHTML = `
            <button id="mb-delete-btn" onclick="mbConfirmDelete()">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" width="13" height="13">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                Supprimer
            </button>
        `;

        // Confirmation — remplace le contenu du footer
        const confirmBox = document.createElement('div');
        confirmBox.id = 'mb-delete-confirm';
        confirmBox.innerHTML = `
            <div id="mb-delete-confirm-text"></div>
            <div id="mb-delete-confirm-actions">
                <button id="mb-delete-cancel" onclick="mbCancelDelete()">Annuler</button>
                <button id="mb-delete-confirm-btn" onclick="mbExecuteDelete()">
                    Supprimer définitivement
                </button>
            </div>
        `;

        // Insérer le bouton delete en tout premier dans le footer
        footer.insertBefore(deleteSection, footer.firstChild);

        // Insérer la confirmation juste après le footer (overlay dans le panel)
        const panel = modal.querySelector('.modal');
        if (panel) panel.appendChild(confirmBox);
    }

    // ── Patch openMenuEdit pour afficher/masquer la zone delete ─
    function patchOpenMenuEdit() {
        if (!window.openMenuEdit) { setTimeout(patchOpenMenuEdit, 300); return; }
        const _orig = window.openMenuEdit;
        window.openMenuEdit = function (key) {
            // Exposer la clé sur window AVANT l'appel original
            // (mbEditingKey est une variable locale de app.js, on doit la dupliquer)
            window._deleteTargetKey = key;

            _orig(key);
            injectDeleteUI();

            // Stocker aussi sur le bouton delete comme fallback
            const deleteBtn = document.getElementById('mb-delete-btn');
            if (deleteBtn) deleteBtn.dataset.menuKey = key;

            // Afficher uniquement pour les menus custom
            const deleteSection = document.getElementById('mb-delete-section');
            const confirmBox    = document.getElementById('mb-delete-confirm');
            const cfg = window.SHEET_CONFIG && window.SHEET_CONFIG[key];
            const isCustom = cfg && cfg.custom;

            if (deleteSection) deleteSection.classList.toggle('visible', !!isCustom);
            if (confirmBox)    confirmBox.classList.remove('visible');
        };
        console.log('[AW27] menuDeletePatch: openMenuEdit patché ✓');
    }
    patchOpenMenuEdit();

    // ── Afficher la confirmation ────────────────────────────────
    window.mbConfirmDelete = function () {
        // Lire depuis window._deleteTargetKey (exposé par le patch)
        // ou depuis le dataset du bouton en fallback
        const deleteBtn = document.getElementById('mb-delete-btn');
        const key = window._deleteTargetKey
                 || (deleteBtn && deleteBtn.dataset.menuKey)
                 || window.mbEditingKey;
        const cfg    = window.SHEET_CONFIG && key && window.SHEET_CONFIG[key];
        const label  = cfg ? cfg.label : key;
        // Stocker pour mbExecuteDelete
        window._deleteTargetKey = key;

        const textEl = document.getElementById('mb-delete-confirm-text');
        if (textEl) {
            textEl.innerHTML =
                'Voulez-vous vraiment supprimer le menu <strong>' + _esc(label) + '</strong> ?<br>' +
                'Cette action supprimera également la feuille Google Sheets correspondante. Elle est <strong>irréversible</strong>.';
        }

        const deleteSection = document.getElementById('mb-delete-section');
        const confirmBox    = document.getElementById('mb-delete-confirm');
        // Masquer le bouton du footer, montrer la barre de confirmation
        if (deleteSection) deleteSection.classList.remove('visible');
        if (confirmBox)    confirmBox.classList.add('visible');
        // S'assurer que la barre est bien dans le modal (au-dessus du footer)
        const modal = document.getElementById('menu-builder-overlay');
        const panel = modal && modal.querySelector('.modal');
        const footer = panel && panel.querySelector('.modal-footer');
        if (confirmBox && footer && confirmBox.nextSibling !== footer) {
            panel.insertBefore(confirmBox, footer);
        }
    };

    // ── Annuler ─────────────────────────────────────────────────
    window.mbCancelDelete = function () {
        const deleteSection = document.getElementById('mb-delete-section');
        const confirmBox    = document.getElementById('mb-delete-confirm');
        if (deleteSection) deleteSection.classList.add('visible');
        if (confirmBox)    confirmBox.classList.remove('visible');
    };

    // ── Exécuter la suppression ─────────────────────────────────
    window.mbExecuteDelete = async function () {
        const deleteBtn = document.getElementById('mb-delete-btn');
        const key = window._deleteTargetKey
                 || (deleteBtn && deleteBtn.dataset.menuKey)
                 || window.mbEditingKey;
        if (!key) {
            alert('Erreur : clé du menu introuvable. Fermez et réouvrez la modale.');
            return;
        }

        const cfg   = window.SHEET_CONFIG && window.SHEET_CONFIG[key];
        const label = cfg ? cfg.label : key;

        const confirmBtn = document.getElementById('mb-delete-confirm-btn');
        if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Suppression…'; }

        const gasUrl = window.GOOGLE_APPS_SCRIPT_URL || (window.currentUser && window.currentUser.gasUrl);

        // 1. Supprimer la feuille dans Google Sheets via GAS
        if (gasUrl && gasUrl !== 'YOUR_WEB_APP_URL_HERE') {
            try {
                const res  = await fetch(gasUrl, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'DELETE_SHEET', sheetName: cfg.sheetName || label })
                });
                const json = await res.json();
                if (json.status !== 'ok' && json.message) {
                    console.warn('[Delete Sheet GAS]', json.message);
                    // On continue quand même — la feuille était peut-être déjà absente
                }
            } catch (err) {
                console.warn('[Delete Sheet] Erreur GAS (non bloquant):', err.message);
            }
        }

        // 2. Supprimer du SHEET_CONFIG
        if (window.SHEET_CONFIG && window.SHEET_CONFIG[key]) {
            delete window.SHEET_CONFIG[key];
        }

        // 3. Supprimer de state.data
        if (window.state && window.state.data && window.state.data[key]) {
            delete window.state.data[key];
        }

        // 4. Supprimer le bouton nav
        const navBtn = document.getElementById('tab-custom-' + key);
        if (navBtn) navBtn.remove();

        // 5. Mettre à jour le localStorage
        _persistAfterDelete();

        // 6. Si on était sur ce menu, revenir au dashboard
        if (window.state && window.state.activeSheet === key) {
            window.state.activeSheet = 'details';
            window.state.activeView  = 'dashboard';
            const dashTab = document.querySelector('.nav-item[data-view="dashboard"]');
            if (dashTab) dashTab.click();
        }

        // 7. Fermer le menu builder
        window._deleteTargetKey = null;
        if (typeof window.closeMenuBuilder === 'function') window.closeMenuBuilder();

        // 8. Toast
        if (typeof window.showToast === 'function') {
            window.showToast('Menu "' + label + '" supprimé', 'success', 4000);
        }

        if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Supprimer définitivement'; }
    };

    // ── Persister après suppression ─────────────────────────────
    function _persistAfterDelete() {
        const CUSTOM_MENUS_KEY = 'aw27_custom_menus';
        const cfg = window.SHEET_CONFIG || {};
        try {
            const menus = Object.entries(cfg)
                .filter(function (_ref) { return _ref[1].custom || ['details','sample','ordering'].includes(_ref[0]); })
                .map(function (_ref) {
                    const k = _ref[0], v = _ref[1];
                    return { key: k, label: v.label, cols: v.cols, custom: v.custom };
                });
            localStorage.setItem(CUSTOM_MENUS_KEY, JSON.stringify(menus));

            // Sauvegarder en GAS aussi
            const gasUrl = window.GOOGLE_APPS_SCRIPT_URL || (window.currentUser && window.currentUser.gasUrl);
            if (gasUrl && gasUrl !== 'YOUR_WEB_APP_URL_HERE') {
                fetch(gasUrl, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'SAVE_MENUS', menus })
                }).catch(function () {});
            }
        } catch (e) { console.warn('[Delete] Persist error', e); }
    }

    function _esc(s) {
        return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // Injecter le HTML dès que le modal existe dans le DOM
    const observer = new MutationObserver(function () {
        if (document.getElementById('menu-builder-overlay')) {
            injectDeleteUI();
        }
    });
    observer.observe(document.body, { childList: true, subtree: false });

    console.log('[AW27] menuDeletePatch chargé ✓');

})();
