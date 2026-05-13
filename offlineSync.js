// ============================================================
//  AW27 CHECKERS — Offline Sync Module
//  Matin  : Télécharger tout le GS → Excel (avec _gsRowIndex)
//  Soir   : Uploader les modifs/ajouts → GS avec résolution conflits
// ============================================================

(function () {
    'use strict';

    // ── Config ──────────────────────────────────────────────────
    const HIDDEN_COL   = '_gsRowIndex';   // colonne injectée dans l'Excel
    const BATCH_SIZE   = 30;              // lignes par requête GAS
    const ID_COLS      = ['Style', 'Client', 'Color', 'Colour', 'GMT Color',
                          'Type', 'PO', 'Dept', 'AWB', 'Style Code'];

    // ── État ────────────────────────────────────────────────────
    let _uploadData    = null;  // { sheetName: { headers, rows, snapshot } }
    let _conflicts     = [];    // lignes en conflit à résoudre
    let _resolvedConflicts = {};// { sheetName_rowIndex: 'local'|'remote' }
    let _syncQueue     = [];    // actions à exécuter après résolution
    let _isBusy        = false;

    // ═══════════════════════════════════════════════════════════
    //  STYLES
    // ═══════════════════════════════════════════════════════════
    const css = document.createElement('style');
    css.id = 'sync-module-styles';
    css.textContent = `
    #sync-overlay {
        position:fixed;inset:0;z-index:12000;
        background:rgba(15,23,42,0.6);
        backdrop-filter:blur(5px);
        display:none;align-items:center;justify-content:center;padding:1rem;
    }
    #sync-overlay.open{display:flex;}

    #sync-panel {
        background:var(--color-background-primary,#fff);
        border:0.5px solid var(--color-border-tertiary);
        border-radius:16px;
        box-shadow:0 24px 64px rgba(0,0,0,0.2);
        width:100%;max-width:820px;max-height:92vh;
        display:flex;flex-direction:column;overflow:hidden;
        font-family:'Inter',sans-serif;
        animation:sync-in .22s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes sync-in{from{opacity:0;transform:translateY(18px) scale(0.97)}to{opacity:1;transform:none}}

    /* Header */
    #sync-hdr{
        display:flex;align-items:center;gap:12px;
        padding:15px 20px 13px;
        border-bottom:0.5px solid var(--color-border-tertiary);
        flex-shrink:0;
    }
    #sync-hdr-icon{
        width:36px;height:36px;border-radius:10px;
        background:#e0f2fe;border:0.5px solid #bae6fd;
        display:flex;align-items:center;justify-content:center;flex-shrink:0;
    }
    #sync-hdr-title{font-size:14px;font-weight:600;color:var(--color-text-primary);}
    #sync-hdr-sub{font-size:12px;color:var(--color-text-secondary);margin-top:2px;}
    #sync-close{
        margin-left:auto;width:28px;height:28px;border-radius:8px;
        border:0.5px solid var(--color-border-tertiary);background:transparent;
        color:var(--color-text-secondary);cursor:pointer;
        display:flex;align-items:center;justify-content:center;font-size:14px;
        transition:all .15s;
    }
    #sync-close:hover{background:#fef2f2;color:#dc2626;border-color:#fca5a5;}

    /* Steps nav */
    #sync-steps{
        display:flex;gap:0;padding:0 20px;
        border-bottom:0.5px solid var(--color-border-tertiary);
        flex-shrink:0;overflow-x:auto;
    }
    .sync-step{
        padding:10px 16px;font-size:12px;font-weight:500;
        color:var(--color-text-secondary);border-bottom:2px solid transparent;
        white-space:nowrap;display:flex;align-items:center;gap:6px;
    }
    .sync-step.active{color:#0284c7;border-bottom-color:#0284c7;}
    .sync-step.done{color:#16a34a;}
    .sync-step-num{
        width:18px;height:18px;border-radius:50%;
        background:var(--color-background-secondary);
        font-size:10px;font-weight:700;
        display:flex;align-items:center;justify-content:center;
        color:var(--color-text-secondary);
    }
    .sync-step.active .sync-step-num{background:#0284c7;color:#fff;}
    .sync-step.done .sync-step-num{background:#16a34a;color:#fff;}

    /* Body scrollable */
    #sync-body{flex:1;overflow-y:auto;padding:0;min-height:0;}

    /* Section générique */
    .sync-section{padding:20px;}
    .sync-section-title{
        font-size:13px;font-weight:600;color:var(--color-text-primary);
        margin-bottom:4px;
    }
    .sync-section-sub{font-size:12px;color:var(--color-text-secondary);margin-bottom:16px;line-height:1.5;}

    /* Download card */
    .dl-card{
        display:flex;align-items:center;gap:14px;
        padding:16px 18px;border-radius:12px;
        border:0.5px solid var(--color-border-tertiary);
        background:var(--color-background-secondary);
        margin-bottom:10px;
    }
    .dl-card-icon{
        width:42px;height:42px;border-radius:10px;
        background:#e0f2fe;border:0.5px solid #bae6fd;
        display:flex;align-items:center;justify-content:center;flex-shrink:0;
    }
    .dl-card-title{font-size:13px;font-weight:500;color:var(--color-text-primary);}
    .dl-card-sub{font-size:11px;color:var(--color-text-secondary);margin-top:2px;}
    .dl-btn{
        margin-left:auto;padding:8px 16px;border-radius:8px;
        background:#0284c7;color:#fff;border:none;
        font-size:12px;font-weight:600;cursor:pointer;
        display:flex;align-items:center;gap:6px;
        font-family:inherit;transition:background .15s;white-space:nowrap;
    }
    .dl-btn:hover:not(:disabled){background:#0369a1;}
    .dl-btn:disabled{opacity:.5;cursor:not-allowed;}

    /* Upload drop zone */
    #ul-drop{
        margin:0 20px 0;border:1.5px dashed var(--color-border-secondary);
        border-radius:12px;padding:28px 20px;text-align:center;cursor:pointer;
        transition:border-color .2s,background .2s;
    }
    #ul-drop:hover,#ul-drop.drag-over{border-color:#0284c7;background:#f0f9ff;}
    #ul-drop.has-file{border-color:#16a34a;background:#f0fdf4;cursor:default;}
    #ul-drop-icon{font-size:32px;margin-bottom:8px;}
    #ul-drop-title{font-size:13px;font-weight:500;color:var(--color-text-primary);}
    #ul-drop-sub{font-size:11px;color:var(--color-text-secondary);margin-top:4px;}
    #ul-file-input{display:none;}

    /* Analyse résultats */
    #ul-analysis{padding:16px 20px 0;display:none;}
    #ul-analysis.visible{display:block;}
    .analysis-grid{
        display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;
    }
    .an-card{
        background:var(--color-background-secondary);border-radius:10px;
        padding:12px 14px;display:flex;flex-direction:column;gap:3px;
    }
    .an-num{font-size:22px;font-weight:600;color:var(--color-text-primary);}
    .an-lbl{font-size:11px;color:var(--color-text-secondary);}
    .an-num.blue{color:#0284c7;}
    .an-num.green{color:#16a34a;}
    .an-num.amber{color:#d97706;}
    .an-num.red{color:#dc2626;}

    /* Sheets summary */
    .sheets-summary{display:flex;flex-direction:column;gap:6px;margin-top:4px;}
    .sheet-row{
        display:flex;align-items:center;gap:10px;
        padding:8px 12px;border-radius:8px;
        border:0.5px solid var(--color-border-tertiary);
        background:var(--color-background-primary);
    }
    .sheet-name{font-size:12px;font-weight:500;color:var(--color-text-primary);min-width:100px;}
    .sheet-chips{display:flex;gap:5px;flex:1;flex-wrap:wrap;}
    .chip{
        display:inline-flex;align-items:center;gap:3px;
        font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px;
    }
    .chip-new{background:#dcfce7;color:#166534;}
    .chip-mod{background:#dbeafe;color:#1e40af;}
    .chip-ok{background:#f0fdf4;color:#16a34a;}
    .chip-conf{background:#fef3c7;color:#92400e;}
    .chip-none{background:var(--color-background-secondary);color:var(--color-text-secondary);}

    /* Conflict panel */
    #conflict-panel{padding:0;display:none;}
    #conflict-panel.visible{display:block;}
    .conflict-header{
        padding:12px 20px;background:#fffbeb;
        border-bottom:0.5px solid #fde68a;
        display:flex;align-items:center;gap:8px;
        font-size:12px;font-weight:500;color:#92400e;
        flex-shrink:0;
    }
    .conflict-list{max-height:320px;overflow-y:auto;}
    .conflict-item{
        border-bottom:0.5px solid var(--color-border-tertiary);
        padding:12px 20px;
    }
    .conflict-item:last-child{border-bottom:none;}
    .conflict-item-hdr{
        display:flex;align-items:center;gap:8px;margin-bottom:8px;
    }
    .conf-sheet-badge{
        font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;
        background:#e0f2fe;color:#0369a1;
    }
    .conf-id{font-size:12px;font-weight:600;color:var(--color-text-primary);}
    .conf-versions{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
    .conf-version{
        border-radius:8px;border:0.5px solid var(--color-border-tertiary);
        overflow:hidden;
    }
    .conf-version-hdr{
        padding:6px 10px;font-size:10px;font-weight:700;
        text-transform:uppercase;letter-spacing:.04em;
    }
    .conf-v-local .conf-version-hdr{background:#dbeafe;color:#1e40af;}
    .conf-v-remote .conf-version-hdr{background:#f3f4f6;color:#6b7280;}
    .conf-version-body{padding:6px 10px;}
    .conf-field{display:flex;gap:6px;font-size:11px;margin-bottom:3px;}
    .conf-field-name{color:var(--color-text-secondary);min-width:80px;flex-shrink:0;}
    .conf-field-val{color:var(--color-text-primary);font-weight:500;}
    .conf-field-val.diff{color:#d97706;font-weight:700;}
    .conf-choose{
        display:flex;gap:6px;justify-content:flex-end;margin-top:8px;
    }
    .btn-choose{
        padding:5px 12px;border-radius:6px;border:0.5px solid;
        font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;
        transition:all .15s;
    }
    .btn-local{border-color:#1e40af;background:#dbeafe;color:#1e40af;}
    .btn-local:hover,.btn-local.chosen{background:#1e40af;color:#fff;}
    .btn-remote{border-color:var(--color-border-secondary);background:var(--color-background-secondary);color:var(--color-text-secondary);}
    .btn-remote:hover,.btn-remote.chosen{background:#4b5563;color:#fff;border-color:#4b5563;}

    /* Progress */
    #sync-progress{padding:14px 20px;background:#f0fdf4;border-top:0.5px solid #bbf7d0;display:none;flex-shrink:0;}
    #sync-progress.visible{display:block;}
    .prog-lbl{font-size:12px;font-weight:500;color:#166534;margin-bottom:6px;}
    .prog-track{height:5px;background:#dcfce7;border-radius:99px;overflow:hidden;}
    .prog-fill{height:100%;border-radius:99px;background:#16a34a;width:0%;transition:width .3s ease;}
    .prog-dtl{font-size:11px;color:var(--color-text-secondary);margin-top:4px;}

    /* Footer */
    #sync-footer{
        display:flex;align-items:center;gap:8px;
        padding:12px 20px;border-top:0.5px solid var(--color-border-tertiary);
        flex-shrink:0;
    }
    #sync-footer-info{font-size:11px;color:var(--color-text-secondary);flex:1;}
    .btn-secondary{
        padding:7px 14px;border-radius:8px;
        border:0.5px solid var(--color-border-secondary);background:transparent;
        font-size:12px;color:var(--color-text-secondary);cursor:pointer;
        font-family:inherit;transition:all .15s;
    }
    .btn-secondary:hover{background:var(--color-background-secondary);}
    .btn-primary{
        padding:8px 18px;border-radius:8px;border:none;
        background:#0284c7;color:#fff;
        font-size:12px;font-weight:600;cursor:pointer;
        display:flex;align-items:center;gap:6px;
        font-family:inherit;transition:background .15s;
    }
    .btn-primary:hover:not(:disabled){background:#0369a1;}
    .btn-primary:disabled{opacity:.5;cursor:not-allowed;}
    .btn-primary.green{background:#16a34a;}
    .btn-primary.green:hover:not(:disabled){background:#15803d;}

    /* Nav sidebar buttons */
    .sync-nav-btn{
        display:flex;align-items:center;gap:0.75rem;
        width:100%;padding:.55rem .75rem;
        border:none;background:transparent;
        color:var(--text-secondary,#334155);
        font-family:inherit;font-size:.82rem;font-weight:600;
        cursor:pointer;border-radius:8px;transition:all .2s;
        text-align:left;white-space:nowrap;
    }
    .sync-nav-btn:hover{background:rgba(2,132,199,.1);color:#0284c7;}
    .sync-nav-btn .nav-icon{width:18px;height:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    `;
    document.head.appendChild(css);

    // ═══════════════════════════════════════════════════════════
    //  HTML PANEL
    // ═══════════════════════════════════════════════════════════
    document.body.insertAdjacentHTML('beforeend', `
    <div id="sync-overlay">
      <div id="sync-panel">

        <div id="sync-hdr">
          <div id="sync-hdr-icon">
            <i class="ti ti-refresh" style="font-size:18px;color:#0284c7" aria-hidden="true"></i>
          </div>
          <div>
            <div id="sync-hdr-title">Sync hors connexion</div>
            <div id="sync-hdr-sub">Télécharger le matin · Travailler offline · Synchroniser le soir</div>
          </div>
          <button id="sync-close" aria-label="Fermer">✕</button>
        </div>

        <div id="sync-steps">
          <div class="sync-step active" id="step1-tab">
            <span class="sync-step-num">1</span>Télécharger
          </div>
          <div class="sync-step" id="step2-tab">
            <span class="sync-step-num">2</span>Uploader
          </div>
          <div class="sync-step" id="step3-tab">
            <span class="sync-step-num">3</span>Conflits
          </div>
          <div class="sync-step" id="step4-tab">
            <span class="sync-step-num">4</span>Synchroniser
          </div>
        </div>

        <div id="sync-body">

          <!-- STEP 1 : Download -->
          <div id="step1" class="sync-section">
            <div class="sync-section-title">Exporter Google Sheets → Excel</div>
            <div class="sync-section-sub">Téléchargez toutes vos feuilles en un seul fichier Excel. Une colonne <code>_gsRowIndex</code> est ajoutée automatiquement pour identifier chaque ligne lors du re-import.</div>
            <div class="dl-card">
              <div class="dl-card-icon">
                <i class="ti ti-file-spreadsheet" style="font-size:20px;color:#0284c7" aria-hidden="true"></i>
              </div>
              <div>
                <div class="dl-card-title">Toutes les feuilles Google Sheets</div>
                <div class="dl-card-sub" id="dl-sheet-count">Connexion au GAS…</div>
              </div>
              <button class="dl-btn" id="btn-download-gs">
                <i class="ti ti-download" style="font-size:13px" aria-hidden="true"></i>
                Télécharger
              </button>
            </div>
            <div style="padding:12px 14px;border-radius:10px;background:#f0f9ff;border:0.5px solid #bae6fd;font-size:11px;color:#0369a1;line-height:1.7;">
              <i class="ti ti-info-circle" style="font-size:13px;vertical-align:-2px;margin-right:4px" aria-hidden="true"></i>
              Ce fichier Excel contient une colonne masquée <strong>_gsRowIndex</strong> — ne pas la supprimer.
              Elle permet de retrouver chaque ligne lors du re-import du soir.
            </div>
          </div>

          <!-- STEP 2 : Upload -->
          <div id="step2" style="display:none;">
            <div class="sync-section" style="padding-bottom:12px;">
              <div class="sync-section-title">Importer votre fichier modifié</div>
              <div class="sync-section-sub">Choisissez le fichier Excel que vous avez modifié en journée. Le système détectera automatiquement les ajouts et modifications.</div>
            </div>
            <div id="ul-drop">
              <div id="ul-drop-icon"><i class="ti ti-upload" style="font-size:32px;color:#9ca3af" aria-hidden="true"></i></div>
              <div id="ul-drop-title">Glissez votre fichier Excel modifié ici</div>
              <div id="ul-drop-sub">ou cliquez pour choisir — .xlsx, .xls acceptés</div>
              <input type="file" id="ul-file-input" accept=".xlsx,.xls">
            </div>
            <div id="ul-analysis">
              <div class="analysis-grid">
                <div class="an-card">
                  <div class="an-num green" id="an-new">0</div>
                  <div class="an-lbl">Nouvelles lignes</div>
                </div>
                <div class="an-card">
                  <div class="an-num blue" id="an-mod">0</div>
                  <div class="an-lbl">Lignes modifiées</div>
                </div>
                <div class="an-card">
                  <div class="an-num amber" id="an-conf">0</div>
                  <div class="an-lbl">Conflits à résoudre</div>
                </div>
              </div>
              <div class="sheets-summary" id="sheets-summary"></div>
            </div>
          </div>

          <!-- STEP 3 : Conflits -->
          <div id="step3" style="display:none;">
            <div class="conflict-header">
              <i class="ti ti-alert-triangle" style="font-size:14px" aria-hidden="true"></i>
              <span id="conflict-count-lbl">0 conflit(s) détecté(s) — choisissez quelle version conserver pour chaque ligne</span>
            </div>
            <div class="conflict-list" id="conflict-list"></div>
          </div>

          <!-- STEP 4 : Sync finale -->
          <div id="step4" style="display:none;">
            <div class="sync-section">
              <div class="sync-section-title">Prêt à synchroniser</div>
              <div class="sync-section-sub" id="step4-summary">Résumé des opérations qui seront effectuées.</div>
              <div id="step4-ops" class="sheets-summary"></div>
            </div>
          </div>

        </div><!-- /#sync-body -->

        <div id="sync-progress">
          <div class="prog-lbl" id="sync-prog-lbl">Synchronisation…</div>
          <div class="prog-track"><div class="prog-fill" id="sync-prog-fill"></div></div>
          <div class="prog-dtl" id="sync-prog-dtl"></div>
        </div>

        <div id="sync-footer">
          <div id="sync-footer-info">Étape 1 sur 4</div>
          <button class="btn-secondary" id="sync-back" style="display:none">← Retour</button>
          <button class="btn-primary" id="sync-next">Passer à l'upload →</button>
        </div>

      </div>
    </div>
    `);

    // ── Refs ────────────────────────────────────────────────────
    const overlay       = document.getElementById('sync-overlay');
    const syncClose     = document.getElementById('sync-close');
    const syncNext      = document.getElementById('sync-next');
    const syncBack      = document.getElementById('sync-back');
    const footerInfo    = document.getElementById('sync-footer-info');
    const progWrap      = document.getElementById('sync-progress');
    const progFill      = document.getElementById('sync-prog-fill');
    const progLbl       = document.getElementById('sync-prog-lbl');
    const progDtl       = document.getElementById('sync-prog-dtl');
    const ulDrop        = document.getElementById('ul-drop');
    const ulFileInput   = document.getElementById('ul-file-input');
    const ulAnalysis    = document.getElementById('ul-analysis');
    const conflictPanel = document.getElementById('step3');
    const conflictList  = document.getElementById('conflict-list');

    let _currentStep = 1;
    let _xlWorkbook  = null;  // workbook XLSX parsé
    let _gsSnapshot  = {};    // { sheetName: [{...}] } snapshot GS au moment du DL

    // ═══════════════════════════════════════════════════════════
    //  NAVIGATION
    // ═══════════════════════════════════════════════════════════
    window.openSyncPanel = function () {
        overlay.classList.add('open');
        gotoStep(1);
        initDownloadSection();
    };

    syncClose.onclick = function () { overlay.classList.remove('open'); };
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) overlay.classList.remove('open');
    });

    syncNext.addEventListener('click', function () {
        if (_currentStep === 1) gotoStep(2);
        else if (_currentStep === 2) proceedToConflicts();
        else if (_currentStep === 3) proceedToFinalSync();
        else if (_currentStep === 4) executeSync();
    });

    syncBack.addEventListener('click', function () {
        if (_currentStep > 1) gotoStep(_currentStep - 1);
    });

    function gotoStep(n) {
        _currentStep = n;
        [1,2,3,4].forEach(function (i) {
            const el = document.getElementById('step' + i);
            if (el) el.style.display = i === n ? '' : 'none';
            const tab = document.getElementById('step' + i + '-tab');
            if (tab) {
                tab.className = 'sync-step' + (i < n ? ' done' : i === n ? ' active' : '');
                const num = tab.querySelector('.sync-step-num');
                if (num) num.textContent = i < n ? '✓' : String(i);
            }
        });
        syncBack.style.display = n > 1 ? '' : 'none';
        progWrap.classList.remove('visible');

        if (n === 1) {
            footerInfo.textContent = 'Étape 1 — Télécharger le GS';
            syncNext.textContent = 'Passer à l\'upload →';
            syncNext.disabled = false;
            syncNext.className = 'btn-primary';
        } else if (n === 2) {
            footerInfo.textContent = 'Étape 2 — Analyser votre fichier';
            syncNext.textContent = 'Analyser les conflits →';
            syncNext.disabled = !_xlWorkbook;
            syncNext.className = 'btn-primary';
        } else if (n === 3) {
            footerInfo.textContent = 'Étape 3 — Résolution des conflits';
            syncNext.textContent = 'Voir le résumé →';
            syncNext.disabled = false;
            syncNext.className = 'btn-primary';
        } else if (n === 4) {
            footerInfo.textContent = 'Étape 4 — Synchronisation finale';
            syncNext.textContent = 'Synchroniser maintenant';
            syncNext.className = 'btn-primary green';
            syncNext.disabled = false;
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  STEP 1 — DOWNLOAD GS → EXCEL
    // ═══════════════════════════════════════════════════════════
    function initDownloadSection() {
        const gasUrl = window.GOOGLE_APPS_SCRIPT_URL || (window.currentUser && window.currentUser.gasUrl);
        const countEl = document.getElementById('dl-sheet-count');
        const dlBtn   = document.getElementById('btn-download-gs');

        if (!gasUrl || gasUrl === 'YOUR_WEB_APP_URL_HERE') {
            countEl.textContent = 'GAS non configuré — vérifiez vos paramètres';
            dlBtn.disabled = true;
            return;
        }

        // Compter les feuilles depuis state
        const sheetNames = Object.keys(window.SHEET_CONFIG || {}).map(function (k) {
            return (window.SHEET_CONFIG[k].sheetName || window.SHEET_CONFIG[k].label || k);
        });
        countEl.textContent = sheetNames.length + ' feuille' + (sheetNames.length > 1 ? 's' : '') + ' : ' + sheetNames.slice(0,5).join(', ') + (sheetNames.length > 5 ? '…' : '');

        dlBtn.onclick = function () { downloadAllSheets(gasUrl, sheetNames); };
    }

    async function downloadAllSheets(gasUrl, sheetNames) {
        const dlBtn = document.getElementById('btn-download-gs');
        dlBtn.disabled = true;
        dlBtn.innerHTML = '<i class="ti ti-loader" style="font-size:13px" aria-hidden="true"></i> Chargement…';

        ensureXLSX(async function (XL) {
            try {
                const wb      = XL.utils.book_new();
                _gsSnapshot   = {};

                const allData = window.state && window.state.data ? window.state.data : {};
                const cfg     = window.SHEET_CONFIG || {};
                let   sheets  = 0;

                for (const key of Object.keys(cfg)) {
                    const sheetName = cfg[key].sheetName || cfg[key].label || key;
                    const rows      = allData[key] || [];
                    if (!rows.length) continue;

                    // ── Construire la carte label→key pour chaque colonne ──
                    // Pour les menus fixes : col.key ('Order Qty') ≠ col.label ('Order Qty')
                    // Pour les menus custom : col.key === col.label
                    // On lit toujours via col.key en priorité, col.label en fallback,
                    // et enfin on parcourt toutes les clés de la row si rien trouvé.
                    const colDefs = cfg[key].cols || [];

                    // Si pas de cols définis, prendre toutes les clés de la première row
                    let headers;
                    if (colDefs.length) {
                        headers = colDefs.map(function (c) { return c.label || c.key; });
                    } else {
                        headers = Object.keys(rows[0]).filter(function (k) { return !k.startsWith('_'); });
                    }

                    // Carte label → clé réelle dans la row
                    const labelToKey = {};
                    if (colDefs.length) {
                        colDefs.forEach(function (c) {
                            labelToKey[c.label || c.key] = c.key;
                        });
                    } else {
                        headers.forEach(function (h) { labelToKey[h] = h; });
                    }

                    // ── Lire une valeur depuis une row en essayant key puis label ──
                    function readVal(row, label) {
                        const key2 = labelToKey[label];
                        // 1. par col.key exact
                        if (key2 !== undefined && row[key2] !== undefined && row[key2] !== null) return row[key2];
                        // 2. par label direct
                        if (row[label] !== undefined && row[label] !== null) return row[label];
                        // 3. cherche une clé insensible à la casse
                        const lower = label.toLowerCase();
                        const found = Object.keys(row).find(function (k) { return k.toLowerCase() === lower; });
                        if (found) return row[found];
                        return '';
                    }

                    const fullHeaders = headers.concat([HIDDEN_COL]);
                    const wsData      = [fullHeaders];

                    rows.forEach(function (row) {
                        const r = headers.map(function (h) {
                            const v = readVal(row, h);
                            if (v === null || v === undefined) return '';
                            if (v instanceof Date) return v.toISOString().slice(0, 10);
                            return String(v);
                        });
                        r.push(String(row._rowIndex || ''));
                        wsData.push(r);
                    });

                    _gsSnapshot[sheetName] = rows;

                    const ws = XL.utils.aoa_to_sheet(wsData);

                    // Masquer la colonne _gsRowIndex
                    const hiddenCol = fullHeaders.length - 1;
                    if (!ws['!cols']) ws['!cols'] = [];
                    while (ws['!cols'].length <= hiddenCol) ws['!cols'].push({});
                    ws['!cols'][hiddenCol] = { hidden: true };

                    // Largeurs auto + en-têtes en gras
                    const colWidths = fullHeaders.map(function (h) { return Math.max(h.length, 10); });
                    rows.slice(0, 20).forEach(function (row) {
                        headers.forEach(function (h, i) {
                            const v = String(readVal(row, h) || '');
                            if (v.length > colWidths[i]) colWidths[i] = Math.min(v.length, 40);
                        });
                    });
                    ws['!cols'] = fullHeaders.map(function (h, i) {
                        return i === hiddenCol ? { hidden: true } : { wch: colWidths[i] };
                    });

                    XL.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
                    sheets++;
                }

                if (!sheets) {
                    dlBtn.disabled = false;
                    dlBtn.innerHTML = '<i class="ti ti-download" style="font-size:13px"></i> Télécharger';
                    alert('Aucune donnée disponible. Assurez-vous que le dashboard est chargé avant de télécharger.');
                    return;
                }

                const today = new Date().toISOString().slice(0, 10);
                XL.writeFile(wb, 'AW27_Offline_' + today + '.xlsx');

                dlBtn.innerHTML = '<i class="ti ti-check" style="font-size:13px" aria-hidden="true"></i> Téléchargé !';
                dlBtn.style.background = '#16a34a';
                if (typeof showToast === 'function') showToast('Fichier Excel téléchargé — bonne journée !', 'success', 4000);

            } catch (err) {
                console.error('[Sync Download]', err);
                dlBtn.disabled = false;
                dlBtn.innerHTML = '<i class="ti ti-download" style="font-size:13px"></i> Télécharger';
                if (typeof showToast === 'function') showToast('Erreur de téléchargement : ' + err.message, 'error');
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  STEP 2 — UPLOAD & ANALYSE
    // ═══════════════════════════════════════════════════════════
    ulDrop.addEventListener('dragover', function (e) { e.preventDefault(); ulDrop.classList.add('drag-over'); });
    ulDrop.addEventListener('dragleave', function () { ulDrop.classList.remove('drag-over'); });
    ulDrop.addEventListener('drop', function (e) {
        e.preventDefault(); ulDrop.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) parseUploadedFile(e.dataTransfer.files[0]);
    });
    ulDrop.addEventListener('click', function () {
        if (!ulDrop.classList.contains('has-file')) ulFileInput.click();
    });
    ulFileInput.addEventListener('change', function (e) {
        if (e.target.files[0]) parseUploadedFile(e.target.files[0]);
        ulFileInput.value = '';
    });

    function parseUploadedFile(file) {
        if (!/\.(xlsx|xls)$/i.test(file.name)) { alert('Format non supporté.'); return; }

        document.getElementById('ul-drop-title').textContent = '⏳ Lecture…';
        document.getElementById('ul-drop-sub').textContent = file.name;

        ensureXLSX(function (XL) {
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    _xlWorkbook = XL.read(e.target.result, { type: 'array', cellDates: true });
                    _uploadData = parseWorkbook(_xlWorkbook, XL);
                    analyseChanges();

                    ulDrop.classList.add('has-file');
                    document.getElementById('ul-drop-title').innerHTML =
                        '<i class="ti ti-check" style="color:#16a34a"></i> ' + file.name;
                    document.getElementById('ul-drop-sub').textContent =
                        _xlWorkbook.SheetNames.length + ' feuille(s) détectée(s)';

                    ulAnalysis.classList.add('visible');
                    syncNext.disabled = false;

                } catch (err) {
                    console.error('[Sync Upload]', err);
                    alert('Erreur de lecture : ' + err.message);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    function parseWorkbook(wb, XL) {
        const result = {};
        wb.SheetNames.forEach(function (name) {
            const ws   = wb.Sheets[name];
            const json = XL.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd', defval: '' });
            if (json.length < 2) return;

            const rawHeaders = json[0].map(function (h) { return String(h || '').trim(); });
            const rowIdxCol  = rawHeaders.indexOf(HIDDEN_COL);
            const headers    = rawHeaders.filter(function (h) { return h && h !== HIDDEN_COL; });

            const rows = [];
            for (let i = 1; i < json.length; i++) {
                const raw = json[i];
                if (!raw || raw.every(function (c) { return c === '' || c === null || c === undefined; })) continue;

                const obj = {};
                rawHeaders.forEach(function (h, j) {
                    if (h && h !== HIDDEN_COL) {
                        let v = raw[j];
                        if (v instanceof Date) v = v.toISOString().slice(0, 10);
                        obj[h] = v === null || v === undefined ? '' : String(v).trim();
                    }
                });

                // Récupérer le _gsRowIndex
                obj[HIDDEN_COL] = rowIdxCol >= 0 ? String(raw[rowIdxCol] || '').trim() : '';
                rows.push(obj);
            }
            result[name] = { headers, rows };
        });
        return result;
    }

    // ── Analyse : nouvelles lignes, modifiées, conflits ─────────
    function analyseChanges() {
        const allData = window.state && window.state.data ? window.state.data : {};
        const cfg     = window.SHEET_CONFIG || {};
        _conflicts    = [];
        _syncQueue    = [];

        let totalNew = 0, totalMod = 0, totalConf = 0;
        const summaryRows = [];

        Object.keys(_uploadData).forEach(function (sheetName) {
            const { headers, rows } = _uploadData[sheetName];

            // Trouver la clé interne du SHEET_CONFIG
            const cfgKey = Object.keys(cfg).find(function (k) {
                return (cfg[k].sheetName || cfg[k].label || k).toLowerCase() === sheetName.toLowerCase();
            });

            // ── FEUILLE INCONNUE (ajoutée offline) ──────────────
            // Pas de cfgKey → feuille créée en offline, inconnue du GS et de l'interface.
            // On l'enregistre comme NEW_SHEET : toutes ses lignes seront créées,
            // et un nouveau menu sera construit dans l'interface après sync.
            if (!cfgKey) {
                const nNew = rows.length;
                totalNew += nNew;
                _syncQueue.push({
                    type:      'NEW_SHEET',
                    sheetName: sheetName,
                    headers:   headers,
                    rows:      rows,
                    cfgKey:    null
                });
                summaryRows.push({
                    sheetName, nNew, nMod: 0, nConf: 0,
                    total: rows.length, isNew: true
                });
                return; // passer à la feuille suivante
            }

            const gsRows = cfgKey ? (allData[cfgKey] || []) : [];

            // Construire labelToKey : label Excel → col.key dans state.data
            // Essentiel pour que getDiffs lise les bonnes valeurs dans gsRow
            const labelToKey = {};
            if (cfgKey && cfg[cfgKey] && cfg[cfgKey].cols) {
                cfg[cfgKey].cols.forEach(function (c) {
                    labelToKey[c.label || c.key] = c.key;
                });
            } else {
                headers.forEach(function (h) { labelToKey[h] = h; });
            }

            // Construire index GS par rowIndex
            const gsByRowIdx = {};
            gsRows.forEach(function (r) { if (r._rowIndex) gsByRowIdx[String(r._rowIndex)] = r; });

            // Construire index GS par ID composite
            // On utilise minParts=1 ici pour maximiser le matching côté GS
            const gsByComposite = {};
            gsRows.forEach(function (r) {
                // Index avec 2 champs (prioritaire)
                const id2 = buildCompositeId(r, headers, labelToKey, 2);
                if (id2) gsByComposite[id2] = r;
                // Index avec 1 champ (fallback si feuille simple)
                const id1 = buildCompositeId(r, headers, labelToKey, 1);
                if (id1 && !gsByComposite[id1]) gsByComposite[id1] = r;
            });

            let nNew = 0, nMod = 0, nConf = 0;
            const ops = [];

            rows.forEach(function (localRow) {
                // rowIdx : seulement si c'est un entier positif valide (pas "", "0", undefined)
                const rawIdx = localRow[HIDDEN_COL];
                const rowIdx = rawIdx && /^\d+$/.test(String(rawIdx).trim()) && parseInt(rawIdx) > 1
                    ? String(rawIdx).trim() : null;

                // ID composite : accepter même avec 1 seul champ si la feuille a peu de colonnes ID
                const compId = buildCompositeId(localRow, headers, null, 1);
                let   gsRow  = null;

                // Chercher la ligne GS correspondante
                if (rowIdx && gsByRowIdx[rowIdx]) {
                    gsRow = gsByRowIdx[rowIdx];
                } else if (compId && gsByComposite[compId]) {
                    gsRow = gsByComposite[compId];
                }

                if (!gsRow) {
                    // Nouvelle ligne confirmée : ni rowIdx ni compId n'ont matché
                    console.log('[Sync] NOUVELLE LIGNE détectée dans', sheetName,
                        '| rowIdx:', rawIdx || '(vide)',
                        '| compId:', compId || '(null)',
                        '| valeurs:', JSON.stringify(localRow).slice(0, 120));
                    nNew++;
                    totalNew++;
                    ops.push({ type: 'CREATE', sheetName, cfgKey, row: localRow, headers, labelToKey });
                } else {
                    // Ligne existante — comparer avec normalisation
                    const diffs = getDiffs(gsRow, localRow, headers, labelToKey);
                    if (!diffs.length) return; // identique, rien à faire

                    // Vérifier si GS a aussi changé depuis le snapshot du matin
                    const snapshot       = _gsSnapshot[sheetName] || [];
                    const snapRow        = snapshot.find(function (s) { return String(s._rowIndex || '') === String(gsRow._rowIndex || ''); });
                    const gsChangedSince = snapRow && getDiffs(snapRow, gsRow, headers, labelToKey).length > 0;

                    if (gsChangedSince) {
                        // CONFLIT : GS ET local ont changé
                        nConf++;
                        totalConf++;
                        _conflicts.push({
                            id: Math.random().toString(36).slice(2),
                            sheetName, cfgKey, labelToKey,
                            localRow, gsRow, diffs,
                            rowIndex: gsRow._rowIndex,
                            displayId: compId || ('Ligne ' + gsRow._rowIndex)
                        });
                    } else {
                        // Modification simple — seulement si diffs réels
                        nMod++;
                        totalMod++;
                        ops.push({ type: 'UPDATE', sheetName, cfgKey, row: localRow, rowIndex: gsRow._rowIndex, headers, labelToKey });
                    }
                }
            });

            if (ops.length) _syncQueue.push(...ops);
            summaryRows.push({ sheetName, nNew, nMod, nConf, total: rows.length });
        });

        // Afficher le résumé
        document.getElementById('an-new').textContent  = totalNew;
        document.getElementById('an-mod').textContent  = totalMod;
        document.getElementById('an-conf').textContent = totalConf;

        const summaryEl = document.getElementById('sheets-summary');
        summaryEl.innerHTML = summaryRows.map(function (s) {
            const chips = [];
            if (s.isNew) chips.push('<span class="chip chip-new" style="background:#fef3c7;color:#92400e;">★ Nouvelle feuille</span>');
            if (s.nNew && !s.isNew)  chips.push('<span class="chip chip-new">+' + s.nNew + ' nouveau' + (s.nNew>1?'x':'') + '</span>');
            if (s.nMod)  chips.push('<span class="chip chip-mod">~' + s.nMod + ' modifié' + (s.nMod>1?'s':'') + '</span>');
            if (s.nConf) chips.push('<span class="chip chip-conf">⚠ ' + s.nConf + ' conflit' + (s.nConf>1?'s':'') + '</span>');
            if (!s.nNew && !s.nMod && !s.nConf && !s.isNew) chips.push('<span class="chip chip-ok">Aucun changement</span>');
            return '<div class="sheet-row"><span class="sheet-name">' + esc(s.sheetName) + '</span><div class="sheet-chips">' + chips.join('') + '</div></div>';
        }).join('');
    }

    // ═══════════════════════════════════════════════════════════
    //  STEP 3 — CONFLITS
    // ═══════════════════════════════════════════════════════════
    function proceedToConflicts() {
        if (!_conflicts.length) {
            // Pas de conflits → aller directement au step 4
            buildFinalSummary();
            gotoStep(4);
            return;
        }
        renderConflicts();
        gotoStep(3);
    }

    function renderConflicts() {
        document.getElementById('conflict-count-lbl').textContent =
            _conflicts.length + ' conflit' + (_conflicts.length > 1 ? 's' : '') + ' détecté' + (_conflicts.length > 1 ? 's' : '') + ' — choisissez quelle version conserver pour chaque ligne';

        conflictList.innerHTML = _conflicts.map(function (c) {
            const localFields = c.diffs.map(function (d) {
                return '<div class="conf-field"><span class="conf-field-name">' + esc(d.col) + '</span><span class="conf-field-val diff">' + esc(d.local) + '</span></div>';
            }).join('');
            const remoteFields = c.diffs.map(function (d) {
                return '<div class="conf-field"><span class="conf-field-name">' + esc(d.col) + '</span><span class="conf-field-val diff">' + esc(d.remote) + '</span></div>';
            }).join('');

            const resolveKey = c.sheetName + '_' + c.rowIndex;
            const chosen     = _resolvedConflicts[resolveKey] || null;

            return '<div class="conflict-item" id="conf-' + c.id + '">' +
                '<div class="conflict-item-hdr">' +
                '<span class="conf-sheet-badge">' + esc(c.sheetName) + '</span>' +
                '<span class="conf-id">' + esc(c.displayId) + '</span>' +
                '</div>' +
                '<div class="conf-versions">' +
                '<div class="conf-version conf-v-local">' +
                '<div class="conf-version-hdr">Ma version (Excel)</div>' +
                '<div class="conf-version-body">' + localFields + '</div>' +
                '</div>' +
                '<div class="conf-version conf-v-remote">' +
                '<div class="conf-version-hdr">Version Google Sheets</div>' +
                '<div class="conf-version-body">' + remoteFields + '</div>' +
                '</div>' +
                '</div>' +
                '<div class="conf-choose">' +
                '<button class="btn-choose btn-local' + (chosen === 'local' ? ' chosen' : '') + '" onclick="resolveConflict(\'' + c.id + '\',\'' + c.sheetName + '_' + c.rowIndex + '\',\'local\',this)">Garder ma version</button>' +
                '<button class="btn-choose btn-remote' + (chosen === 'remote' ? ' chosen' : '') + '" onclick="resolveConflict(\'' + c.id + '\',\'' + c.sheetName + '_' + c.rowIndex + '\',\'remote\',this)">Garder GS</button>' +
                '</div>' +
                '</div>';
        }).join('');
    }

    window.resolveConflict = function (conflictId, resolveKey, choice, btn) {
        _resolvedConflicts[resolveKey] = choice;
        const item = document.getElementById('conf-' + conflictId);
        if (!item) return;
        item.querySelectorAll('.btn-choose').forEach(function (b) { b.classList.remove('chosen'); });
        btn.classList.add('chosen');

        // Si "ma version" → ajouter à la queue de sync
        if (choice === 'local') {
            const c = _conflicts.find(function (x) { return x.id === conflictId; });
            if (c && !_syncQueue.find(function (op) { return op.rowIndex === c.rowIndex && op.sheetName === c.sheetName; })) {
                _syncQueue.push({ type: 'UPDATE', sheetName: c.sheetName, cfgKey: c.cfgKey, row: c.localRow, rowIndex: c.rowIndex, headers: Object.keys(c.localRow).filter(function (k) { return k !== HIDDEN_COL; }) });
            }
        }

        // Check si tous les conflits résolus
        const allResolved = _conflicts.every(function (c) {
            return _resolvedConflicts[c.sheetName + '_' + c.rowIndex];
        });
        if (allResolved) {
            syncNext.style.background = '#16a34a';
        }
    };

    // ═══════════════════════════════════════════════════════════
    //  STEP 4 — RÉSUMÉ FINAL
    // ═══════════════════════════════════════════════════════════
    function proceedToFinalSync() {
        // Vérifier que tous les conflits sont résolus
        const unresolved = _conflicts.filter(function (c) {
            return !_resolvedConflicts[c.sheetName + '_' + c.rowIndex];
        });
        if (unresolved.length) {
            alert('Veuillez résoudre tous les conflits avant de continuer (' + unresolved.length + ' restant' + (unresolved.length > 1 ? 's' : '') + ')');
            return;
        }
        buildFinalSummary();
        gotoStep(4);
    }

    function buildFinalSummary() {
        const ops     = _syncQueue;
        const creates = ops.filter(function (o) { return o.type === 'CREATE'; });
        const updates = ops.filter(function (o) { return o.type === 'UPDATE'; });

        document.getElementById('step4-summary').textContent =
            creates.length + ' nouvelle(s) ligne(s) · ' + updates.length + ' modification(s) · ' +
            _conflicts.filter(function (c) { return _resolvedConflicts[c.sheetName + '_' + (c.rowIndex||'')] === 'remote'; }).length + ' conflit(s) ignorés (GS conservé)';

        const bySheet = {};
        ops.forEach(function (op) {
            if (!bySheet[op.sheetName]) bySheet[op.sheetName] = { c: 0, u: 0, isNew: false };
            if (op.type === 'NEW_SHEET') { bySheet[op.sheetName].isNew = true; bySheet[op.sheetName].c += op.rows.length; }
            else if (op.type === 'CREATE') bySheet[op.sheetName].c++;
            else bySheet[op.sheetName].u++;
        });

        document.getElementById('step4-ops').innerHTML = Object.keys(bySheet).map(function (name) {
            const s = bySheet[name];
            const chips = [];
            if (s.isNew) chips.push('<span class="chip chip-new" style="background:#fef3c7;color:#92400e;">★ Nouvelle feuille · ' + s.c + ' ligne' + (s.c>1?'s':'') + '</span>');
            else {
                if (s.c) chips.push('<span class="chip chip-new">+' + s.c + ' nouveau' + (s.c>1?'x':'') + '</span>');
                if (s.u) chips.push('<span class="chip chip-mod">~' + s.u + ' modifié' + (s.u>1?'s':'') + '</span>');
            }
            return '<div class="sheet-row"><span class="sheet-name">' + esc(name) + '</span><div class="sheet-chips">' + chips.join('') + '</div></div>';
        }).join('');

        if (!ops.length) {
            document.getElementById('step4-ops').innerHTML = '<div style="padding:16px;font-size:13px;color:var(--color-text-secondary);text-align:center;">Aucune modification détectée — tout est déjà à jour.</div>';
            syncNext.disabled = true;
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  STEP 4 — EXÉCUTION SYNC
    // ═══════════════════════════════════════════════════════════
    async function executeSync() {
        if (_isBusy) return;
        const gasUrl = window.GOOGLE_APPS_SCRIPT_URL || (window.currentUser && window.currentUser.gasUrl);
        if (!gasUrl || gasUrl === 'YOUR_WEB_APP_URL_HERE') { alert('GAS URL non configuré.'); return; }

        _isBusy = true;
        syncNext.disabled = true;
        syncBack.style.display = 'none';
        progWrap.classList.add('visible');

        const ops  = _syncQueue;
        let   done = 0;

        for (const op of ops) {
            progFill.style.width = Math.round((done / ops.length) * 100) + '%';
            progLbl.textContent  = (op.type === 'NEW_SHEET' ? 'Nouvelle feuille' : op.type === 'CREATE' ? 'Ajout' : 'Mise à jour') + ' — ' + op.sheetName;
            progDtl.textContent  = (done + 1) + ' / ' + ops.length;

            try {
                // ── NOUVELLE FEUILLE — créer GS + menu interface ──
                if (op.type === 'NEW_SHEET') {
                    // 1. Créer la feuille GS et importer toutes les lignes en batch
                    const BATCH = 50;
                    for (let b = 0; b < op.rows.length; b += BATCH) {
                        const batch = op.rows.slice(b, b + BATCH);
                        const res = await fetch(gasUrl, {
                            method: 'POST',
                            body: JSON.stringify({
                                action:  'IMPORT_ROWS',
                                sheet:   op.sheetName,
                                headers: op.headers,
                                rows:    batch.map(function(r) {
                                    // Exclure la colonne _gsRowIndex
                                    const clean = {};
                                    op.headers.forEach(function(h) { clean[h] = r[h] !== undefined ? r[h] : ''; });
                                    return clean;
                                })
                            })
                        });
                        const json = await res.json();
                        if (json.status !== 'ok') throw new Error(json.message || 'GAS error');
                    }

                    // 2. Reconstruire le menu dans l'interface
                    registerNewMenuFromSheet(op.sheetName, op.headers, op.rows);

                    done++;
                    continue;
                }

                const payload = {
                    action:    op.type,
                    sheet:     op.sheetName,
                    data:      buildRowData(op.row, op.headers),
                    rowIndex:  op.rowIndex || undefined
                };
                const res  = await fetch(gasUrl, { method: 'POST', body: JSON.stringify(payload) });
                const json = await res.json();
                if (json.status !== 'ok') throw new Error(json.message || 'GAS error');
            } catch (err) {
                console.error('[Sync exec]', op.sheetName, err);
            }
            done++;
        }

        progFill.style.width = '100%';
        progLbl.textContent  = '✅ Synchronisation terminée';
        progDtl.textContent  = done + ' opération' + (done > 1 ? 's' : '') + ' effectuée' + (done > 1 ? 's' : '');

        _isBusy = false;
        syncNext.textContent = '✅ Terminé — Fermer';
        syncNext.disabled    = false;
        syncNext.onclick     = function () { overlay.classList.remove('open'); };

        if (typeof fetchAllData === 'function') {
            setTimeout(function () {
                fetchAllData();
                if (typeof showToast === 'function') showToast('Sync terminée — ' + done + ' opération' + (done > 1 ? 's' : '') + ' effectuée' + (done > 1 ? 's' : ''), 'success', 5000);
            }, 600);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════════════
    // ── Enregistre une nouvelle feuille comme menu dans l'interface ──
    // Reconstruit SHEET_CONFIG, la sidebar et le localStorage
    function registerNewMenuFromSheet(sheetName, headers, rows) {
        if (!window.SHEET_CONFIG) return;

        // Générer une clé interne unique
        const key = 'custom_' + sheetName.toLowerCase()
            .replace(/[^a-z0-9]/g, '_').slice(0, 20)
            + '_' + Date.now().toString(36);

        // Inférer le type de chaque colonne depuis les données
        function inferType(colName, values) {
            const lbl = colName.toLowerCase();
            if (/date|psd|fty|ready|sent|send|received|recu|envoi/.test(lbl)) return 'date';
            if (/qty|quantit|amount|montant|price|prix|cost|up/.test(lbl)) return 'number';
            if (/remark|comment|note|description|desc/.test(lbl)) return 'textarea';
            // Tester si les valeurs ressemblent à une liste fixe
            const uniq = [...new Set(values.filter(Boolean))];
            if (uniq.length > 0 && uniq.length <= 8 && values.length > 3) return 'select';
            return 'text';
        }

        // Construire les colonnes
        const cols = headers.filter(function(h) { return h !== '_gsRowIndex'; })
            .map(function(h) {
                const values = rows.map(function(r) { return r[h] || ''; });
                const type   = inferType(h, values);
                const col    = { key: h, label: h, type: type };
                if (type === 'select') {
                    col.options = ['', ...new Set(values.filter(Boolean))].slice(0, 10);
                }
                if (h.length > 15 || type === 'textarea') col.full = true;
                return col;
            });

        // Enregistrer dans SHEET_CONFIG
        window.SHEET_CONFIG[key] = {
            label:     sheetName,
            sheetName: sheetName,
            custom:    true,
            cols:      cols,
            kpis: [{
                label: 'Total lignes', colorClass: 'teal',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>',
                compute: function(r) { return r.length; }
            }]
        };

        // Initialiser state.data
        if (window.state && window.state.data) {
            window.state.data[key] = rows.map(function(r, i) {
                const obj = { _rowIndex: i + 2 };
                cols.forEach(function(c) { obj[c.key] = r[c.key] || ''; });
                return obj;
            });
        }

        // Ajouter le bouton dans la sidebar via registerCustomMenu si disponible
        if (typeof window.registerCustomMenu === 'function') {
            window.registerCustomMenu({ key, label: sheetName, cols }, true);
        } else {
            // Fallback : injecter manuellement dans la nav
            const nav = document.getElementById('custom-nav-items');
            if (nav && !document.getElementById('tab-custom-' + key)) {
                const btn = document.createElement('button');
                btn.className = 'nav-item';
                btn.id = 'tab-custom-' + key;
                btn.dataset.sheet = key;
                btn.innerHTML =
                    '<span class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"/></svg></span>' +
                    '<span class="nav-label">' + sheetName + '</span>';
                btn.addEventListener('click', function() {
                    if (window.state) {
                        window.state.activeView  = 'sheet';
                        window.state.activeSheet = key;
                    }
                    document.querySelectorAll('.nav-item').forEach(function(b) { b.classList.remove('active'); });
                    btn.classList.add('active');
                    const titleEl = document.getElementById('header-sheet-title');
                    if (titleEl) titleEl.textContent = sheetName;
                    if (typeof window.showTableView  === 'function') window.showTableView();
                    if (typeof window.applyFilters   === 'function') window.applyFilters();
                    if (typeof window.renderKPIs     === 'function') window.renderKPIs();
                });
                nav.appendChild(btn);
            }

            // Persister manuellement
            try {
                const STORE = 'aw27_custom_menus';
                const saved = JSON.parse(localStorage.getItem(STORE) || '[]');
                saved.push({ key, label: sheetName, cols, custom: true });
                localStorage.setItem(STORE, JSON.stringify(saved));
            } catch(e) {}
        }

        console.log('[Sync] Nouveau menu créé :', sheetName, '(' + cols.length + ' colonnes, ' + rows.length + ' lignes)');
        if (typeof window.showToast === 'function') {
            window.showToast('Nouveau menu créé : ' + sheetName + ' (' + cols.length + ' col.)', 'success', 5000);
        }
    }

    function buildCompositeId(row, headers, labelToKey, minParts) {
        minParts = minParts || 2; // Par défaut 2 champs minimum
        const parts = [];
        ID_COLS.forEach(function (col) {
            // Chercher via la clé directe, puis via labelToKey (pour les gsRows)
            let val = row[col];
            if ((val === undefined || val === null || val === '') && labelToKey && labelToKey[col]) {
                val = row[labelToKey[col]];
            }
            if (val !== undefined && val !== null && val !== '') {
                parts.push(String(val).trim().toUpperCase());
            }
        });
        return parts.length >= minParts ? parts.join('||') : null;
    }

    // Normalise une valeur pour comparaison stable
    // Gere : Date objects, nombres (12.50=12.5), dates (dd/mm/yyyy=yyyy-mm-dd), espaces
    function normalizeVal(v) {
        if (v === null || v === undefined) return '';
        if (v instanceof Date) return v.toISOString().slice(0, 10);
        let s = String(v).trim();
        if (!s) return '';
        // Dates ISO yyyy-mm-dd
        const isoDate = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoDate) return isoDate[1] + '-' + isoDate[2] + '-' + isoDate[3];
        // Dates dd/mm/yyyy
        const frDate = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (frDate) return frDate[3] + '-' + frDate[2] + '-' + frDate[1];
        // Nombres : 12.50 === 12.5 === "12,50"
        if (s.match(/^-?[\d.,]+$/)) {
            const num = parseFloat(s.replace(',', '.'));
            if (!isNaN(num)) return String(num);
        }
        return s;
    }

    // Lit une valeur dans gsRow en essayant : col.key -> label -> insensible casse
    function readGsVal(gsRow, label, labelToKey) {
        const key = labelToKey && labelToKey[label];
        if (key && gsRow[key] !== undefined && gsRow[key] !== null && gsRow[key] !== '') return gsRow[key];
        if (gsRow[label] !== undefined && gsRow[label] !== null && gsRow[label] !== '') return gsRow[label];
        const lower = label.toLowerCase();
        const found = Object.keys(gsRow).find(function (k) { return k.toLowerCase() === lower; });
        return found ? gsRow[found] : '';
    }

    function getDiffs(gsRow, localRow, headers, labelToKey) {
        return headers.filter(function (h) {
            if (h === HIDDEN_COL) return false;
            const a = normalizeVal(readGsVal(gsRow, h, labelToKey));
            const b = normalizeVal(localRow[h]);
            return a !== b;
        }).map(function (h) {
            return {
                col:    h,
                local:  normalizeVal(localRow[h]),
                remote: normalizeVal(readGsVal(gsRow, h, labelToKey))
            };
        });
    }

    function buildRowData(row, headers) {
        const obj = {};
        (headers || []).forEach(function (h) {
            if (h === HIDDEN_COL) return;
            // Valeur vide → chaîne vide, jamais undefined
            const v = row[h];
            obj[h] = (v === null || v === undefined) ? '' : String(v);
        });
        return obj;
    }

    function ensureXLSX(cb) {
        if (window.XLSX) { cb(window.XLSX); return; }
        const urls = [
            'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
        ];
        let idx = 0;
        (function tryNext() {
            if (idx >= urls.length) { alert('Impossible de charger SheetJS.'); return; }
            const s = document.createElement('script');
            s.src = urls[idx++]; s.onload = function () { cb(window.XLSX); }; s.onerror = tryNext;
            document.head.appendChild(s);
        })();
    }

    function esc(s) {
        return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ── Injecter le bouton dans la sidebar ──────────────────────
    function injectSyncButton() {
        const footer = document.querySelector('.sidebar-footer');
        if (!footer || document.getElementById('btn-offline-sync')) return;

        const btn = document.createElement('button');
        btn.id        = 'btn-offline-sync';
        btn.className = 'nav-action';
        btn.title     = 'Sync hors connexion';
        btn.innerHTML =
            '<span class="nav-icon">' +
            '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" ' +
            'd="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>' +
            '</svg></span>' +
            '<span class="nav-label">Sync offline</span>';
        btn.addEventListener('click', window.openSyncPanel);

        // Insérer en premier dans le footer
        footer.insertBefore(btn, footer.firstChild);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectSyncButton);
    } else {
        injectSyncButton();
    }
    new MutationObserver(injectSyncButton).observe(document.body, { childList: true, subtree: false });

    console.log('[AW27] Offline Sync Module chargé ✓');

})();
