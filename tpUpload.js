// ============================================================
//  AW27 CHECKERS — Tech Pack (TP) Upload Module
//  - Bouton "TP" sur chaque ligne de la feuille Style
//  - Modale upload PDF → Google Drive dossier TP
//  - Bouton "Update TP" pour remplacer
//  - Bouton "Voir TP" pour ouvrir le PDF existant
// ============================================================

(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════
    //  CSS
    // ═══════════════════════════════════════════════════════
    const css = document.createElement('style');
    css.id = 'tp-upload-styles';
    css.textContent = `
    /* ── Overlay ── */
    #tp-overlay {
        position: fixed; inset: 0; z-index: 14000;
        background: rgba(15,23,42,0.55);
        backdrop-filter: blur(4px);
        display: none; align-items: center; justify-content: center;
        padding: 1rem;
    }
    #tp-overlay.open { display: flex; }

    /* ── Panel ── */
    #tp-panel {
        background: var(--color-background-primary, #fff);
        border: 0.5px solid var(--color-border-tertiary, #e5e7eb);
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        width: 100%; max-width: 480px;
        display: flex; flex-direction: column;
        overflow: hidden;
        font-family: 'Inter', sans-serif;
        animation: tp-in .22s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes tp-in {
        from { opacity:0; transform: translateY(16px) scale(0.97); }
        to   { opacity:1; transform: none; }
    }

    /* ── Header ── */
    #tp-header {
        display: flex; align-items: center; gap: 12px;
        padding: 16px 18px 14px;
        border-bottom: 0.5px solid var(--color-border-tertiary, #e5e7eb);
        background: var(--color-background-secondary, #f9fafb);
    }
    #tp-header-icon {
        width: 38px; height: 38px; border-radius: 10px;
        background: #fee2e2; border: 0.5px solid #fca5a5;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0; font-size: 18px;
    }
    #tp-header-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary, #111827); }
    #tp-header-sub   { font-size: 11px; color: var(--color-text-secondary, #6b7280); margin-top: 2px; }
    #tp-close {
        margin-left: auto; width: 28px; height: 28px;
        border-radius: 7px; border: 0.5px solid var(--color-border-tertiary, #e5e7eb);
        background: transparent; color: var(--color-text-secondary, #9ca3af);
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        font-size: 13px; flex-shrink: 0; transition: all .15s;
    }
    #tp-close:hover { background: #fef2f2; color: #dc2626; border-color: #fca5a5; }

    /* ── Body ── */
    #tp-body { padding: 20px 18px; display: flex; flex-direction: column; gap: 14px; }

    /* ── TP existant ── */
    #tp-existing {
        display: none;
        align-items: center; gap: 10px;
        padding: 12px 14px; border-radius: 10px;
        background: #f0fdf4; border: 0.5px solid #86efac;
    }
    #tp-existing.visible { display: flex; }
    #tp-existing-icon { font-size: 20px; flex-shrink: 0; }
    #tp-existing-name { font-size: 12px; font-weight: 500; color: #166534; flex: 1; }
    #tp-view-btn {
        padding: 5px 12px; border-radius: 7px; border: none;
        background: #16a34a; color: #fff;
        font-size: 11px; font-weight: 600; cursor: pointer;
        font-family: inherit; display: flex; align-items: center; gap: 5px;
        transition: background .15s; white-space: nowrap; flex-shrink: 0;
    }
    #tp-view-btn:hover { background: #15803d; }
    #tp-view-btn svg { width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2; }

    /* ── Drop zone ── */
    #tp-drop {
        border: 2px dashed var(--color-border-secondary, #d1d5db);
        border-radius: 12px;
        padding: 28px 20px;
        text-align: center;
        cursor: pointer;
        transition: border-color .2s, background .2s;
    }
    #tp-drop:hover, #tp-drop.drag-over {
        border-color: #dc2626;
        background: #fff5f5;
    }
    #tp-drop.has-file {
        border-color: #16a34a;
        background: #f0fdf4;
        cursor: default;
    }
    #tp-drop-icon { font-size: 32px; margin-bottom: 8px; }
    #tp-drop-title { font-size: 13px; font-weight: 500; color: var(--color-text-primary, #374151); }
    #tp-drop-sub   { font-size: 11px; color: var(--color-text-secondary, #9ca3af); margin-top: 4px; }
    #tp-file-input { display: none; }

    /* ── Progress ── */
    #tp-progress {
        display: none; flex-direction: column; gap: 6px;
        padding: 12px 14px; border-radius: 10px;
        background: #f0f9ff; border: 0.5px solid #bae6fd;
    }
    #tp-progress.visible { display: flex; }
    #tp-progress-label { font-size: 12px; font-weight: 500; color: #0369a1; }
    #tp-progress-track { height: 5px; background: #dbeafe; border-radius: 99px; overflow: hidden; }
    #tp-progress-fill  { height: 100%; border-radius: 99px; background: #0284c7; width: 0%; transition: width .3s ease; }
    #tp-progress-sub   { font-size: 11px; color: var(--color-text-secondary, #6b7280); }

    /* ── Footer ── */
    #tp-footer {
        display: flex; align-items: center; gap: 8px;
        padding: 14px 18px;
        border-top: 0.5px solid var(--color-border-tertiary, #e5e7eb);
    }
    #tp-footer-info { font-size: 11px; color: var(--color-text-secondary, #9ca3af); flex: 1; }
    #tp-cancel-btn {
        padding: 7px 14px; border-radius: 8px;
        border: 0.5px solid var(--color-border-secondary, #d1d5db);
        background: transparent; font-size: 12px;
        color: var(--color-text-secondary, #6b7280);
        cursor: pointer; font-family: inherit; transition: all .15s;
    }
    #tp-cancel-btn:hover { background: var(--color-background-secondary, #f3f4f6); }
    #tp-upload-btn {
        padding: 8px 18px; border-radius: 8px; border: none;
        background: #dc2626; color: #fff;
        font-size: 12px; font-weight: 600;
        cursor: pointer; font-family: inherit;
        display: flex; align-items: center; gap: 6px;
        transition: background .15s, opacity .15s;
    }
    #tp-upload-btn:hover:not(:disabled) { background: #b91c1c; }
    #tp-upload-btn:disabled { opacity: .5; cursor: not-allowed; }
    #tp-upload-btn svg { width: 13px; height: 13px; stroke: currentColor; fill: none; stroke-width: 2; }

    /* ── Bouton TP dans le tableau ── */
    .btn-tp {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 3px 9px; border-radius: 6px; border: none;
        font-size: 10px; font-weight: 700; cursor: pointer;
        font-family: inherit; transition: all .15s;
        white-space: nowrap;
    }
    .btn-tp.has-tp {
        background: #dcfce7; color: #166534;
    }
    .btn-tp.has-tp:hover { background: #bbf7d0; }
    .btn-tp.no-tp {
        background: #fee2e2; color: #dc2626;
        border: 1px dashed #fca5a5;
    }
    .btn-tp.no-tp:hover { background: #fecaca; }
    `;
    document.head.appendChild(css);

    // ═══════════════════════════════════════════════════════
    //  HTML
    // ═══════════════════════════════════════════════════════
    document.body.insertAdjacentHTML('beforeend', `
    <div id="tp-overlay">
      <div id="tp-panel">

        <div id="tp-header">
          <div id="tp-header-icon">📄</div>
          <div>
            <div id="tp-header-title">Tech Pack</div>
            <div id="tp-header-sub" id="tp-style-label">—</div>
          </div>
          <button id="tp-close" title="Fermer">✕</button>
        </div>

        <div id="tp-body">

          <!-- TP existant -->
          <div id="tp-existing">
            <div id="tp-existing-icon">✅</div>
            <div id="tp-existing-name">TP chargé</div>
            <button id="tp-view-btn" onclick="tpViewExisting()">
              <svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Ouvrir
            </button>
          </div>

          <!-- Drop zone upload -->
          <div id="tp-drop">
            <div id="tp-drop-icon">📂</div>
            <div id="tp-drop-title">Glissez le PDF ici</div>
            <div id="tp-drop-sub">ou cliquez pour choisir — PDF uniquement</div>
            <input type="file" id="tp-file-input" accept=".pdf,application/pdf"/>
          </div>

          <!-- Barre de progression -->
          <div id="tp-progress">
            <div id="tp-progress-label">Upload en cours…</div>
            <div id="tp-progress-track"><div id="tp-progress-fill"></div></div>
            <div id="tp-progress-sub"></div>
          </div>

        </div><!-- /#tp-body -->

        <div id="tp-footer">
          <div id="tp-footer-info">Sélectionnez un fichier PDF</div>
          <button id="tp-cancel-btn" onclick="tpClose()">Annuler</button>
          <button id="tp-upload-btn" disabled onclick="tpExecuteUpload()">
            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Uploader le TP
          </button>
        </div>

      </div>
    </div>
    `);

    // ═══════════════════════════════════════════════════════
    //  ÉTAT
    // ═══════════════════════════════════════════════════════
    let _currentStyle  = null;  // { styleCode, rowIndex, existingUrl }
    let _selectedFile  = null;
    let _isBusy        = false;

    // ═══════════════════════════════════════════════════════
    //  OPEN / CLOSE
    // ═══════════════════════════════════════════════════════
    window.tpOpen = function (styleCode, rowIndex, existingUrl) {
        _currentStyle = { styleCode, rowIndex, existingUrl };
        _selectedFile = null;
        _isBusy = false;

        // Reset UI
        document.getElementById('tp-header-sub').textContent = styleCode || '—';
        document.getElementById('tp-drop-title').textContent = 'Glissez le PDF ici';
        document.getElementById('tp-drop-sub').textContent   = 'ou cliquez pour choisir — PDF uniquement';
        document.getElementById('tp-drop').classList.remove('has-file', 'drag-over');
        document.getElementById('tp-progress').classList.remove('visible');
        document.getElementById('tp-progress-fill').style.width = '0%';
        document.getElementById('tp-upload-btn').disabled = true;
        document.getElementById('tp-upload-btn').innerHTML = `
            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            ${existingUrl ? 'Mettre à jour le TP' : 'Uploader le TP'}`;
        document.getElementById('tp-footer-info').textContent = 'Sélectionnez un fichier PDF';
        document.getElementById('tp-file-input').value = '';

        // TP existant
        const existingEl = document.getElementById('tp-existing');
        const existingName = document.getElementById('tp-existing-name');
        if (existingUrl) {
            existingEl.classList.add('visible');
            existingName.textContent = 'TP existant — ' + styleCode + '.pdf';
        } else {
            existingEl.classList.remove('visible');
        }

        document.getElementById('tp-overlay').classList.add('open');
    };

    window.tpClose = function () {
        if (_isBusy) return;
        document.getElementById('tp-overlay').classList.remove('open');
        _currentStyle = null;
        _selectedFile = null;
    };

    window.tpViewExisting = function () {
        if (_currentStyle && _currentStyle.existingUrl) {
            window.open(_currentStyle.existingUrl, '_blank');
        }
    };

    // Clic en dehors → fermer
    document.getElementById('tp-overlay').addEventListener('click', function (e) {
        if (e.target === this) tpClose();
    });
    document.getElementById('tp-close').addEventListener('click', tpClose);

    // ═══════════════════════════════════════════════════════
    //  DRAG & DROP / FILE SELECT
    // ═══════════════════════════════════════════════════════
    const drop      = document.getElementById('tp-drop');
    const fileInput = document.getElementById('tp-file-input');

    drop.addEventListener('dragover', function (e) {
        e.preventDefault();
        drop.classList.add('drag-over');
    });
    drop.addEventListener('dragleave', function () {
        drop.classList.remove('drag-over');
    });
    drop.addEventListener('drop', function (e) {
        e.preventDefault();
        drop.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) selectFile(file);
    });
    drop.addEventListener('click', function () {
        if (!drop.classList.contains('has-file')) fileInput.click();
    });
    fileInput.addEventListener('change', function (e) {
        if (e.target.files[0]) selectFile(e.target.files[0]);
        fileInput.value = '';
    });

    function selectFile(file) {
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            if (typeof showToast === 'function') showToast('Seuls les fichiers PDF sont acceptés', 'error', 3000);
            else alert('Seuls les fichiers PDF sont acceptés.');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            if (typeof showToast === 'function') showToast('Fichier trop lourd (max 20 Mo)', 'error', 3000);
            else alert('Fichier trop lourd — maximum 20 Mo.');
            return;
        }

        _selectedFile = file;
        drop.classList.add('has-file');
        document.getElementById('tp-drop-icon').textContent = '📄';
        document.getElementById('tp-drop-title').textContent = file.name;
        document.getElementById('tp-drop-sub').textContent   = (file.size / 1024).toFixed(0) + ' Ko — cliquez pour changer';
        document.getElementById('tp-upload-btn').disabled    = false;
        document.getElementById('tp-footer-info').textContent = 'Prêt à uploader';

        // Clic sur drop avec fichier → changer
        drop.classList.remove('has-file');
        drop.addEventListener('click', function handler() {
            fileInput.click();
            drop.removeEventListener('click', handler);
        }, { once: true });
        drop.classList.add('has-file');
    }

    // ═══════════════════════════════════════════════════════
    //  UPLOAD
    // ═══════════════════════════════════════════════════════
    window.tpExecuteUpload = function () {
        if (_isBusy || !_selectedFile || !_currentStyle) return;

        const gasUrl = window.GOOGLE_APPS_SCRIPT_URL || (window.currentUser && window.currentUser.gasUrl);
        if (!gasUrl || gasUrl === 'YOUR_WEB_APP_URL_HERE') {
            alert('URL Google Apps Script non configurée.');
            return;
        }

        _isBusy = true;
        document.getElementById('tp-upload-btn').disabled = true;
        document.getElementById('tp-cancel-btn').disabled = true;
        document.getElementById('tp-progress').classList.add('visible');
        document.getElementById('tp-progress-fill').style.width = '10%';
        document.getElementById('tp-progress-label').textContent = 'Lecture du fichier…';
        document.getElementById('tp-progress-sub').textContent   = _selectedFile.name;

        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                // base64 sans le préfixe "data:...;base64,"
                const base64 = e.target.result.split(',')[1];
                const fileName = _currentStyle.styleCode + '.pdf';

                document.getElementById('tp-progress-fill').style.width = '30%';
                document.getElementById('tp-progress-label').textContent = 'Upload vers Google Drive…';

                const res  = await fetch(gasUrl, {
                    method: 'POST',
                    body: JSON.stringify({
                        action:    'UPLOAD_TP',
                        styleCode: _currentStyle.styleCode,
                        fileName:  fileName,
                        base64Data: base64,
                        mimeType:  'application/pdf',
                    })
                });

                document.getElementById('tp-progress-fill').style.width = '80%';
                document.getElementById('tp-progress-label').textContent = 'Finalisation…';

                const json = await res.json();
                if (json.status !== 'ok') throw new Error(json.message || 'Erreur GAS');

                document.getElementById('tp-progress-fill').style.width = '100%';
                document.getElementById('tp-progress-label').textContent = '✅ TP uploadé avec succès';
                document.getElementById('tp-progress-sub').textContent   = 'Lien sauvegardé dans Google Sheets';

                // Mettre à jour l'état local
                _currentStyle.existingUrl = json.url;
                const existingEl = document.getElementById('tp-existing');
                document.getElementById('tp-existing-name').textContent = 'TP mis à jour — ' + fileName;
                existingEl.classList.add('visible');

                // Mettre à jour le bouton dans le tableau
                _updateTableButton(_currentStyle.styleCode, json.url);

                // Mettre à jour state.data
                _updateStateData(_currentStyle.styleCode, json.url);

                if (typeof showToast === 'function') {
                    showToast('Tech Pack "' + _currentStyle.styleCode + '" uploadé ✓', 'success', 5000);
                }

                document.getElementById('tp-upload-btn').innerHTML = '✅ Uploadé — Fermer';
                document.getElementById('tp-upload-btn').disabled  = false;
                document.getElementById('tp-upload-btn').onclick   = tpClose;

            } catch (err) {
                console.error('[TP Upload]', err);
                document.getElementById('tp-progress-label').textContent = '⚠ Erreur : ' + err.message;
                document.getElementById('tp-progress-fill').style.width  = '0%';
                document.getElementById('tp-upload-btn').disabled = false;
                document.getElementById('tp-cancel-btn').disabled = false;
                if (typeof showToast === 'function') showToast('Erreur upload : ' + err.message, 'error', 5000);
            } finally {
                _isBusy = false;
                document.getElementById('tp-cancel-btn').disabled = false;
            }
        };
        reader.readAsDataURL(_selectedFile);
    };

    // ═══════════════════════════════════════════════════════
    //  HELPERS — mise à jour tableau & state
    // ═══════════════════════════════════════════════════════
    function _updateTableButton(styleCode, url) {
        const btn = document.querySelector('[data-tp-style="' + styleCode + '"]');
        if (!btn) return;
        btn.className = 'btn-tp has-tp';
        btn.textContent = '📄 TP';
        btn.title = 'Voir / Mettre à jour le Tech Pack';
        btn.dataset.tpUrl = url;
        btn.onclick = function () {
            tpOpen(styleCode, btn.dataset.tpRow, url);
        };
    }

    function _updateStateData(styleCode, url) {
        try {
            const styleData = (window.state && window.state.data && window.state.data.style) || [];
            const row = styleData.find(function (r) {
                return String(r.Style || r['Style Code'] || '').trim() === String(styleCode).trim();
            });
            if (row) row.TP_URL = url;
        } catch (e) {}
    }

    // ═══════════════════════════════════════════════════════
    //  INJECTION BOUTONS TP DANS LE TABLEAU
    // ═══════════════════════════════════════════════════════

    // Patch showTableView pour détecter le passage sur Style
    function patchRenderTable() {
        // Patch showTableView (fonction de navigation réelle dans app.js)
        if (window.showTableView && !window._tpShowTablePatched) {
            const _origShow = window.showTableView;
            window.showTableView = function () {
                _origShow.apply(this, arguments);
                setTimeout(injectTpButtons, 400);
            };
            window._tpShowTablePatched = true;
        } else if (!window.showTableView) {
            setTimeout(patchRenderTable, 400);
            return;
        }

        // Aussi patcher renderTable si disponible
        if (window.renderTable && !window._tpRenderTablePatched) {
            const _origRender = window.renderTable;
            window.renderTable = function () {
                _origRender.apply(this, arguments);
                setTimeout(injectTpButtons, 400);
            };
            window._tpRenderTablePatched = true;
        }

        // Observer les mutations du tbody directement
        const tbody = document.getElementById('table-body');
        if (tbody) {
            new MutationObserver(function () {
                if (window.state && window.state.activeSheet === 'style') {
                    injectTpButtons();
                }
            }).observe(tbody, { childList: true });
        }

        // Tentative immédiate si déjà sur Style
        injectTpButtons();
        console.log('[AW27] TP Upload: observer actif ✓');
    }

    function injectTpButtons() {
        // Ne s'applique que sur la feuille Style
        if (!window.state || window.state.activeSheet !== 'style') return;

        const tbody = document.getElementById('table-body');
        if (!tbody) return;

        const rows = window.state.data && window.state.data.style ? window.state.data.style : [];
        if (!rows.length) return;

        const tableRows = tbody.querySelectorAll('tr');
        tableRows.forEach(function (tr, i) {
            // Éviter de double-injecter
            if (tr.querySelector('.btn-tp')) return;

            const row = rows[i];
            if (!row) return;

            const styleCode  = String(row.Style || row['Style Code'] || '').trim();
            const existingUrl = row.TP_URL || '';
            const rowIndex   = row._rowIndex || (i + 2);

            // Créer la cellule bouton TP
            const td  = document.createElement('td');
            td.style.cssText = 'padding:4px 8px;text-align:center;white-space:nowrap;';

            const btn = document.createElement('button');
            btn.className        = 'btn-tp ' + (existingUrl ? 'has-tp' : 'no-tp');
            btn.textContent      = existingUrl ? '📄 TP' : '+ TP';
            btn.title            = existingUrl ? 'Voir / Mettre à jour le Tech Pack' : 'Ajouter le Tech Pack';
            btn.dataset.tpStyle  = styleCode;
            btn.dataset.tpRow    = rowIndex;
            btn.dataset.tpUrl    = existingUrl;
            btn.onclick          = function (e) {
                e.stopPropagation();
                tpOpen(styleCode, rowIndex, existingUrl);
            };

            td.appendChild(btn);
            tr.appendChild(td);
        });

        // Ajouter l'en-tête TP si absent
        const thead = document.getElementById('table-head');
        if (thead) {
            const headerRow = thead.querySelector('tr');
            if (headerRow && !headerRow.querySelector('.th-tp')) {
                const th = document.createElement('th');
                th.className = 'th-tp';
                th.textContent = 'Tech Pack';
                th.style.cssText = 'padding:8px;text-align:center;font-size:11px;font-weight:600;white-space:nowrap;';
                headerRow.appendChild(th);
            }
        }
    }

    // Démarrer le patch
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', patchRenderTable);
    } else {
        patchRenderTable();
    }

    console.log('[AW27] TP Upload Module chargé ✓');

})();
