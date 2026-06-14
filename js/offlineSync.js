// ============================================================
//  AW27 CHECKERS — Offline Sync Module (v3 — validation + new sheets)
//  Matin  : Télécharger tout le GS → Excel (avec _gsRowIndex)
//  Soir   : Uploader les modifs/ajouts → GS avec résolution conflits
// ============================================================

(function () {
    'use strict';

    const HIDDEN_COL = '_gsRowIndex';
    const BATCH_SIZE = 30;
    const ID_COLS    = ['Style','Client','Color','Colour','GMT Color',
                        'Type','PO','Dept','AWB','Style Code'];

    let _uploadData        = null;
    let _conflicts         = [];
    let _resolvedConflicts = {};
    let _syncQueue         = [];
    let _isBusy            = false;
    let _xlWorkbook        = null;
    let _gsSnapshot        = {};
    let _pendingXlFile     = null;

    // ═══════════════════════════════════════════════════════════
    //  STYLES
    // ═══════════════════════════════════════════════════════════
    const css = document.createElement('style');
    css.id = 'sync-module-styles';
    css.textContent = `
    #sync-overlay{position:fixed;inset:0;z-index:12000;background:rgba(15,23,42,0.6);backdrop-filter:blur(5px);display:none;align-items:center;justify-content:center;padding:1rem;}
    #sync-overlay.open{display:flex;}
    #sync-panel{background:var(--color-background-primary,#fff);border:0.5px solid var(--color-border-tertiary);border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,0.2);width:100%;max-width:820px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;font-family:'Inter',sans-serif;animation:sync-in .22s cubic-bezier(.34,1.56,.64,1);}
    @keyframes sync-in{from{opacity:0;transform:translateY(18px) scale(0.97)}to{opacity:1;transform:none}}
    #sync-hdr{display:flex;align-items:center;gap:12px;padding:15px 20px 13px;border-bottom:0.5px solid var(--color-border-tertiary);flex-shrink:0;}
    #sync-hdr-icon{width:36px;height:36px;border-radius:10px;background:#e0f2fe;border:0.5px solid #bae6fd;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    #sync-hdr-title{font-size:14px;font-weight:600;color:var(--color-text-primary);}
    #sync-hdr-sub{font-size:12px;color:var(--color-text-secondary);margin-top:2px;}
    #sync-close{margin-left:auto;width:28px;height:28px;border-radius:8px;border:0.5px solid var(--color-border-tertiary);background:transparent;color:var(--color-text-secondary);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:all .15s;}
    #sync-close:hover{background:#fef2f2;color:#dc2626;border-color:#fca5a5;}
    #sync-steps{display:flex;gap:0;padding:0 20px;border-bottom:0.5px solid var(--color-border-tertiary);flex-shrink:0;overflow-x:auto;}
    .sync-step{padding:10px 16px;font-size:12px;font-weight:500;color:var(--color-text-secondary);border-bottom:2px solid transparent;white-space:nowrap;display:flex;align-items:center;gap:6px;}
    .sync-step.active{color:#0284c7;border-bottom-color:#0284c7;}
    .sync-step.done{color:#16a34a;}
    .sync-step-num{width:18px;height:18px;border-radius:50%;background:var(--color-background-secondary);font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;color:var(--color-text-secondary);}
    .sync-step.active .sync-step-num{background:#0284c7;color:#fff;}
    .sync-step.done .sync-step-num{background:#16a34a;color:#fff;}
    #sync-body{flex:1;overflow-y:auto;padding:0;min-height:0;}
    .sync-section{padding:20px;}
    .sync-section-title{font-size:13px;font-weight:600;color:var(--color-text-primary);margin-bottom:4px;}
    .sync-section-sub{font-size:12px;color:var(--color-text-secondary);margin-bottom:16px;line-height:1.5;}
    .dl-card{display:flex;align-items:center;gap:14px;padding:16px 18px;border-radius:12px;border:0.5px solid var(--color-border-tertiary);background:var(--color-background-secondary);margin-bottom:10px;}
    .dl-card-icon{width:42px;height:42px;border-radius:10px;background:#e0f2fe;border:0.5px solid #bae6fd;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    .dl-card-title{font-size:13px;font-weight:500;color:var(--color-text-primary);}
    .dl-card-sub{font-size:11px;color:var(--color-text-secondary);margin-top:2px;}
    .dl-btn{margin-left:auto;padding:8px 16px;border-radius:8px;background:#0284c7;color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;font-family:inherit;transition:background .15s;white-space:nowrap;}
    .dl-btn:hover:not(:disabled){background:#0369a1;}
    .dl-btn:disabled{opacity:.5;cursor:not-allowed;}
    #ul-drop{margin:0 20px;border:1.5px dashed var(--color-border-secondary);border-radius:12px;padding:28px 20px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;}
    #ul-drop:hover,#ul-drop.drag-over{border-color:#0284c7;background:#f0f9ff;}
    #ul-drop.has-file{border-color:#16a34a;background:#f0fdf4;cursor:default;}
    #ul-drop.has-warn{border-color:#f59e0b;background:#fffbeb;}
    #ul-drop.has-error{border-color:#dc2626;background:#fff5f5;}
    #ul-drop-icon{font-size:32px;margin-bottom:8px;}
    #ul-drop-title{font-size:13px;font-weight:500;color:var(--color-text-primary);}
    #ul-drop-sub{font-size:11px;color:var(--color-text-secondary);margin-top:4px;}
    #ul-file-input{display:none;}

    /* ── Bannière validation ── */
    #ul-warning-banner{display:none;margin:14px 20px 0;padding:13px 15px;border-radius:10px;gap:11px;align-items:flex-start;border:1px solid #fcd34d;background:#fffbeb;}
    #ul-warning-banner.visible{display:flex;}
    #ul-warning-banner.is-blocking{border-color:#fca5a5;background:#fff5f5;}
    .ul-warn-icon{width:32px;height:32px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#fef3c7;}
    #ul-warning-banner.is-blocking .ul-warn-icon{background:#fee2e2;}
    .ul-warn-icon svg{width:16px;height:16px;stroke:currentColor;fill:none;}
    .ul-warn-icon{color:#d97706;}
    #ul-warning-banner.is-blocking .ul-warn-icon{color:#dc2626;}
    .ul-warn-body{flex:1;min-width:0;}
    .ul-warn-title{font-size:12px;font-weight:600;color:#92400e;margin-bottom:6px;}
    #ul-warning-banner.is-blocking .ul-warn-title{color:#7f1d1d;}
    .ul-warn-items{display:flex;flex-direction:column;gap:4px;}
    .ul-warn-item{display:flex;align-items:flex-start;gap:6px;font-size:11px;color:#92400e;line-height:1.5;}
    #ul-warning-banner.is-blocking .ul-warn-item{color:#7f1d1d;}
    .ul-warn-dot{width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0;margin-top:5px;}
    .ul-warn-actions{display:flex;gap:7px;margin-top:10px;}
    .btn-warn-reject{padding:5px 12px;border-radius:7px;border:1px solid #fcd34d;background:transparent;font-size:11px;font-weight:600;color:#92400e;cursor:pointer;font-family:inherit;transition:background .15s;}
    .btn-warn-reject:hover{background:#fef3c7;}
    #ul-warning-banner.is-blocking .btn-warn-reject{border-color:#fca5a5;color:#7f1d1d;}
    #ul-warning-banner.is-blocking .btn-warn-reject:hover{background:#fee2e2;}
    .btn-warn-proceed{padding:5px 13px;border-radius:7px;border:none;background:#d97706;color:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .15s;}
    .btn-warn-proceed:hover{background:#b45309;}

    .analysis-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 20px 12px;}
    .an-card{background:var(--color-background-secondary);border-radius:10px;padding:12px 14px;}
    .an-num{font-size:22px;font-weight:600;color:var(--color-text-primary);line-height:1;}
    .an-lbl{font-size:11px;color:var(--color-text-secondary);margin-top:3px;}
    .an-num.green{color:#16a34a;}.an-num.blue{color:#0284c7;}.an-num.amber{color:#d97706;}
    .sheets-summary{display:flex;flex-direction:column;gap:6px;margin:0 20px;}
    .sheet-row{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;border:0.5px solid var(--color-border-tertiary);background:var(--color-background-primary);}
    .sheet-name{font-size:12px;font-weight:500;color:var(--color-text-primary);min-width:100px;}
    .sheet-chips{display:flex;gap:5px;flex:1;flex-wrap:wrap;}
    .chip{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px;}
    .chip-new{background:#dcfce7;color:#166534;}.chip-mod{background:#dbeafe;color:#1e40af;}
    .chip-ok{background:#f0fdf4;color:#16a34a;}.chip-conf{background:#fef3c7;color:#92400e;}
    .chip-sheet{background:#fef3c7;color:#92400e;}
    .conflict-header{padding:12px 20px;background:#fffbeb;border-bottom:0.5px solid #fde68a;display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;color:#92400e;flex-shrink:0;}
    .conflict-list{max-height:320px;overflow-y:auto;}
    .conflict-item{border-bottom:0.5px solid var(--color-border-tertiary);padding:12px 20px;}
    .conflict-item:last-child{border-bottom:none;}
    .conflict-item-hdr{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
    .conf-sheet-badge{font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;background:#e0f2fe;color:#0369a1;}
    .conf-id{font-size:12px;font-weight:600;color:var(--color-text-primary);}
    .conf-versions{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
    .conf-version{border-radius:8px;border:0.5px solid var(--color-border-tertiary);overflow:hidden;}
    .conf-version-hdr{padding:6px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;}
    .conf-v-local .conf-version-hdr{background:#dbeafe;color:#1e40af;}
    .conf-v-remote .conf-version-hdr{background:#f3f4f6;color:#6b7280;}
    .conf-version-body{padding:6px 10px;}
    .conf-field{display:flex;gap:6px;font-size:11px;margin-bottom:3px;}
    .conf-field-name{color:var(--color-text-secondary);min-width:80px;flex-shrink:0;}
    .conf-field-val{color:var(--color-text-primary);font-weight:500;}
    .conf-field-val.diff{color:#d97706;font-weight:700;}
    .conf-choose{display:flex;gap:6px;justify-content:flex-end;margin-top:8px;}
    .btn-choose{padding:5px 12px;border-radius:6px;border:0.5px solid;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s;}
    .btn-local{border-color:#1e40af;background:#dbeafe;color:#1e40af;}
    .btn-local:hover,.btn-local.chosen{background:#1e40af;color:#fff;}
    .btn-remote{border-color:var(--color-border-secondary);background:var(--color-background-secondary);color:var(--color-text-secondary);}
    .btn-remote:hover,.btn-remote.chosen{background:#4b5563;color:#fff;border-color:#4b5563;}
    #sync-progress{padding:14px 20px;background:#f0fdf4;border-top:0.5px solid #bbf7d0;display:none;flex-shrink:0;}
    #sync-progress.visible{display:block;}
    .prog-lbl{font-size:12px;font-weight:500;color:#166534;margin-bottom:6px;}
    .prog-track{height:5px;background:#dcfce7;border-radius:99px;overflow:hidden;}
    .prog-fill{height:100%;border-radius:99px;background:#16a34a;width:0%;transition:width .3s ease;}
    .prog-dtl{font-size:11px;color:var(--color-text-secondary);margin-top:4px;}
    #sync-footer{display:flex;align-items:center;gap:8px;padding:12px 20px;border-top:0.5px solid var(--color-border-tertiary);flex-shrink:0;}
    #sync-footer-info{font-size:11px;color:var(--color-text-secondary);flex:1;}
    .btn-secondary{padding:7px 14px;border-radius:8px;border:0.5px solid var(--color-border-secondary);background:transparent;font-size:12px;color:var(--color-text-secondary);cursor:pointer;font-family:inherit;transition:all .15s;}
    .btn-secondary:hover{background:var(--color-background-secondary);}
    .btn-primary{padding:8px 18px;border-radius:8px;border:none;background:#0284c7;color:#fff;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;font-family:inherit;transition:background .15s;}
    .btn-primary:hover:not(:disabled){background:#0369a1;}
    .btn-primary:disabled{opacity:.5;cursor:not-allowed;}
    .btn-primary.green{background:#16a34a;}
    .btn-primary.green:hover:not(:disabled){background:#15803d;}
    `;
    document.head.appendChild(css);

    // ═══════════════════════════════════════════════════════════
    //  HTML
    // ═══════════════════════════════════════════════════════════
    document.body.insertAdjacentHTML('beforeend', `
    <div id="sync-overlay">
      <div id="sync-panel">
        <div id="sync-hdr">
          <div id="sync-hdr-icon">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#0284c7" stroke-width="2" stroke-linecap="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </div>
          <div>
            <div id="sync-hdr-title">Sync hors connexion</div>
            <div id="sync-hdr-sub">Télécharger le matin · Travailler offline · Synchroniser le soir</div>
          </div>
          <button id="sync-close">✕</button>
        </div>
        <div id="sync-steps">
          <div class="sync-step active" id="step1-tab"><span class="sync-step-num">1</span>Télécharger</div>
          <div class="sync-step" id="step2-tab"><span class="sync-step-num">2</span>Uploader</div>
          <div class="sync-step" id="step3-tab"><span class="sync-step-num">3</span>Conflits</div>
          <div class="sync-step" id="step4-tab"><span class="sync-step-num">4</span>Synchroniser</div>
        </div>
        <div id="sync-body">

          <!-- STEP 1 -->
          <div id="step1" class="sync-section">
            <div class="sync-section-title">Exporter Google Sheets → Excel</div>
            <div class="sync-section-sub">Toutes vos feuilles en un seul fichier. Une colonne <code>_gsRowIndex</code> identifie chaque ligne pour le re-import.</div>
            <div class="dl-card">
              <div class="dl-card-icon">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#0284c7" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <div>
                <div class="dl-card-title">Toutes les feuilles Google Sheets</div>
                <div class="dl-card-sub" id="dl-sheet-count">Chargement…</div>
              </div>
              <button class="dl-btn" id="btn-download-gs">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Télécharger
              </button>
            </div>
            <div style="padding:11px 13px;border-radius:9px;background:#f0f9ff;border:0.5px solid #bae6fd;font-size:11px;color:#0369a1;line-height:1.7;">
              Ne pas supprimer la colonne <strong>_gsRowIndex</strong> — elle sert à identifier chaque ligne au re-import.
            </div>
          </div>

          <!-- STEP 2 -->
          <div id="step2" style="display:none;padding-bottom:16px;">
            <div class="sync-section" style="padding-bottom:12px;">
              <div class="sync-section-title">Importer votre fichier modifié</div>
              <div class="sync-section-sub">Le système vérifie automatiquement que le fichier est valide avant d'analyser les modifications.</div>
            </div>
            <div id="ul-drop">
              <div id="ul-drop-icon">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <div id="ul-drop-title">Glissez votre fichier Excel modifié ici</div>
              <div id="ul-drop-sub">ou cliquez pour choisir — .xlsx, .xls acceptés</div>
              <input type="file" id="ul-file-input" accept=".xlsx,.xls">
            </div>

            <!-- Bannière validation -->
            <div id="ul-warning-banner">
              <div class="ul-warn-icon">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <div class="ul-warn-body">
                <div class="ul-warn-title" id="ul-warn-title">Avertissement</div>
                <div class="ul-warn-items" id="ul-warn-items"></div>
                <div class="ul-warn-actions">
                  <button class="btn-warn-reject" onclick="window._ulRejectFile()">Choisir un autre fichier</button>
                  <button class="btn-warn-proceed" id="btn-warn-proceed" onclick="window._ulProceedAnyway()">Continuer quand même</button>
                </div>
              </div>
            </div>

            <div class="analysis-grid" id="ul-analysis" style="display:none;">
              <div class="an-card"><div class="an-num green" id="an-new">0</div><div class="an-lbl">Nouvelles lignes</div></div>
              <div class="an-card"><div class="an-num blue" id="an-mod">0</div><div class="an-lbl">Lignes modifiées</div></div>
              <div class="an-card"><div class="an-num amber" id="an-conf">0</div><div class="an-lbl">Conflits</div></div>
            </div>
            <div class="sheets-summary" id="sheets-summary"></div>
          </div>

          <!-- STEP 3 -->
          <div id="step3" style="display:none;">
            <div class="conflict-header">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <span id="conflict-count-lbl">0 conflit(s)</span>
            </div>
            <div class="conflict-list" id="conflict-list"></div>
          </div>

          <!-- STEP 4 -->
          <div id="step4" style="display:none;">
            <div class="sync-section">
              <div class="sync-section-title">Prêt à synchroniser</div>
              <div class="sync-section-sub" id="step4-summary"></div>
              <div id="step4-ops" class="sheets-summary" style="margin:0;"></div>
            </div>
          </div>

        </div>
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
    const overlay    = document.getElementById('sync-overlay');
    const syncClose  = document.getElementById('sync-close');
    const syncNext   = document.getElementById('sync-next');
    const syncBack   = document.getElementById('sync-back');
    const footerInfo = document.getElementById('sync-footer-info');
    const progWrap   = document.getElementById('sync-progress');
    const progFill   = document.getElementById('sync-prog-fill');
    const progLbl    = document.getElementById('sync-prog-lbl');
    const progDtl    = document.getElementById('sync-prog-dtl');
    const ulDrop     = document.getElementById('ul-drop');
    const ulFileInput= document.getElementById('ul-file-input');
    const ulAnalysis = document.getElementById('ul-analysis');

    let _currentStep = 1;

    // ═══════════════════════════════════════════════════════════
    //  NAVIGATION
    // ═══════════════════════════════════════════════════════════
    // ── Reset complet de l'état à chaque ouverture ─────────────
    function resetSyncState() {
        _uploadData        = null;
        _conflicts         = [];
        _resolvedConflicts = {};
        _syncQueue         = [];
        _isBusy            = false;
        _xlWorkbook        = null;
        _pendingXlFile     = null;
        // Reset UI upload
        var banner = document.getElementById('ul-warning-banner');
        if (banner) banner.classList.remove('visible','is-blocking');
        var ul = document.getElementById('ul-analysis');
        if (ul) ul.style.display = 'none';
        var ss = document.getElementById('sheets-summary');
        if (ss) ss.innerHTML = '';
        var an = document.getElementById('an-new'); if (an) an.textContent='0';
        var am = document.getElementById('an-mod'); if (am) am.textContent='0';
        var ac = document.getElementById('an-conf'); if (ac) ac.textContent='0';
        // Reset drop zone
        var drop = document.getElementById('ul-drop');
        if (drop) {
            drop.classList.remove('has-file','has-warn','has-error','drag-over');
            var t = document.getElementById('ul-drop-title');
            var s = document.getElementById('ul-drop-sub');
            if (t) t.textContent = 'Glissez votre fichier Excel modifié ici';
            if (s) s.textContent = 'ou cliquez pour choisir — .xlsx, .xls acceptés';
        }
        // Reset progress
        var prog = document.getElementById('sync-progress');
        if (prog) prog.classList.remove('visible');
        var pf = document.getElementById('sync-prog-fill');
        if (pf) pf.style.width = '0%';
        // Reset download button
        var dlBtn = document.getElementById('btn-download-gs');
        if (dlBtn) {
            dlBtn.disabled = false;
            dlBtn.style.background = '';
            dlBtn.innerHTML = '<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Télécharger';
        }
        // Reset sync button
        var sn = document.getElementById('sync-next');
        if (sn) { sn.disabled = false; sn.onclick = null; }
    }

    // ── Ouvrir sur l'étape Download (step 1) ────────────────────
    window.openSyncDownload = function () {
        resetSyncState();
        overlay.classList.add('open');
        gotoStep(1);
        initDownloadSection();
    };

    // ── Ouvrir directement sur l'étape Upload (step 2) ──────────
    window.openSyncUpload = function () {
        resetSyncState();
        overlay.classList.add('open');
        gotoStep(2);
    };

    // Compatibilité : openSyncPanel ouvre sur download par défaut
    window.openSyncPanel = function () {
        window.openSyncDownload();
    };
    function closeAndReset() {
        overlay.classList.remove('open');
        // Reset complet pour que la prochaine ouverture reparte à zéro
        setTimeout(resetSyncState, 300);
    }
    syncClose.onclick = closeAndReset;
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeAndReset(); });

    syncNext.addEventListener('click', function () {
        if (_currentStep === 1) gotoStep(2);
        else if (_currentStep === 2) proceedToConflicts();
        else if (_currentStep === 3) proceedToFinalSync();
        else if (_currentStep === 4) executeSync();
    });
    syncBack.addEventListener('click', function () { if (_currentStep > 1) gotoStep(_currentStep - 1); });

    function gotoStep(n) {
        _currentStep = n;
        [1,2,3,4].forEach(function (i) {
            var el  = document.getElementById('step' + i);
            var tab = document.getElementById('step' + i + '-tab');
            if (el) el.style.display = i === n ? '' : 'none';
            if (tab) {
                tab.className = 'sync-step' + (i < n ? ' done' : i === n ? ' active' : '');
                var num = tab.querySelector('.sync-step-num');
                if (num) num.textContent = i < n ? '✓' : String(i);
            }
        });
        syncBack.style.display = n > 1 ? '' : 'none';
        progWrap.classList.remove('visible');

        var labels = ['Télécharger le GS','Analyser votre fichier','Résolution des conflits','Synchronisation finale'];
        footerInfo.textContent = 'Étape ' + n + ' — ' + labels[n-1];

        if (n === 1) { syncNext.textContent = 'Passer à l\'upload →'; syncNext.disabled = false; syncNext.className = 'btn-primary'; }
        else if (n === 2) { syncNext.textContent = 'Analyser les conflits →'; syncNext.disabled = !_xlWorkbook; syncNext.className = 'btn-primary'; }
        else if (n === 3) { syncNext.textContent = 'Voir le résumé →'; syncNext.disabled = false; syncNext.className = 'btn-primary'; }
        else if (n === 4) { syncNext.textContent = 'Synchroniser maintenant'; syncNext.className = 'btn-primary green'; syncNext.disabled = false; }
    }

    // ═══════════════════════════════════════════════════════════
    //  STEP 1 — DOWNLOAD
    // ═══════════════════════════════════════════════════════════
    function initDownloadSection() {
        var gasUrl   = window.GOOGLE_APPS_SCRIPT_URL || (window.currentUser && window.currentUser.gasUrl);
        var countEl  = document.getElementById('dl-sheet-count');
        var dlBtn    = document.getElementById('btn-download-gs');
        var cfg      = window.SHEET_CONFIG || {};
        var names    = Object.keys(cfg).map(function(k){ return cfg[k].sheetName || cfg[k].label || k; });
        countEl.textContent = names.length + ' feuille(s) : ' + names.slice(0,5).join(', ') + (names.length > 5 ? '…' : '');
        if (!gasUrl || gasUrl === 'YOUR_WEB_APP_URL_HERE') { dlBtn.disabled = true; countEl.textContent = 'GAS non configuré'; return; }
        dlBtn.onclick = function () { downloadAllSheets(gasUrl); };
    }

    async function downloadAllSheets(gasUrl) {
        var dlBtn = document.getElementById('btn-download-gs');
        dlBtn.disabled = true;
        dlBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Chargement…';

        ensureXLSX(async function (XL) {
            try {
                var wb      = XL.utils.book_new();
                _gsSnapshot = {};
                var allData = window.state && window.state.data ? window.state.data : {};
                var cfg     = window.SHEET_CONFIG || {};
                var sheets  = 0;

                var _cfgKeys = Object.keys(cfg);
                for (var _ki=0; _ki<_cfgKeys.length; _ki++) { var key=_cfgKeys[_ki];
                    var sheetName = cfg[key].sheetName || cfg[key].label || key;
                    var rows      = allData[key] || [];
                    if (!rows.length) continue;

                    var colDefs  = cfg[key].cols || [];
                    var headers  = colDefs.length
                        ? colDefs.map(function(c){ return c.label || c.key; })
                        : Object.keys(rows[0]).filter(function(k){ return !k.startsWith('_'); });

                    var labelToKey = {};
                    colDefs.forEach(function(c){ labelToKey[c.label || c.key] = c.key; });

                    function readVal(row, label) {
                        var k = labelToKey[label];
                        if (k && row[k] !== undefined && row[k] !== null) return row[k];
                        if (row[label] !== undefined && row[label] !== null) return row[label];
                        var lo = label.toLowerCase();
                        var fk = Object.keys(row).find(function(x){ return x.toLowerCase() === lo; });
                        return fk ? row[fk] : '';
                    }

                    var fullHeaders = headers.concat([HIDDEN_COL]);
                    var wsData = [fullHeaders];
                    rows.forEach(function(row) {
                        var r = headers.map(function(h) {
                            var v = readVal(row, h);
                            if (v === null || v === undefined) return '';
                            if (v instanceof Date) return v.toISOString().slice(0,10);
                            return String(v);
                        });
                        r.push(String(row._rowIndex || ''));
                        wsData.push(r);
                    });

                    _gsSnapshot[sheetName] = rows;
                    var ws = XL.utils.aoa_to_sheet(wsData);
                    var hiddenCol = fullHeaders.length - 1;
                    if (!ws['!cols']) ws['!cols'] = [];
                    while (ws['!cols'].length <= hiddenCol) ws['!cols'].push({});
                    ws['!cols'] = fullHeaders.map(function(h, i) {
                        return i === hiddenCol ? { hidden: true } : { wch: Math.max(h.length, 10) };
                    });
                    XL.utils.book_append_sheet(wb, ws, sheetName.slice(0,31));
                    sheets++;
                }

                if (!sheets) { alert('Aucune donnée. Attendez que le dashboard soit chargé.'); dlBtn.disabled=false; return; }
                var today = new Date().toISOString().slice(0,10);
                XL.writeFile(wb, 'AW27_Offline_' + today + '.xlsx');
                dlBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg> Téléchargé !';
                dlBtn.style.background = '#16a34a';
                if (typeof showToast === 'function') showToast('Fichier téléchargé — bonne journée !', 'success', 4000);
            } catch(err) {
                console.error('[Sync DL]', err);
                dlBtn.disabled = false;
                dlBtn.innerHTML = 'Télécharger';
                if (typeof showToast === 'function') showToast('Erreur : ' + err.message, 'error');
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  STEP 2 — UPLOAD + VALIDATION
    // ═══════════════════════════════════════════════════════════
    ulDrop.addEventListener('dragover', function(e){ e.preventDefault(); ulDrop.classList.add('drag-over'); });
    ulDrop.addEventListener('dragleave', function(){ ulDrop.classList.remove('drag-over'); });
    ulDrop.addEventListener('drop', function(e){ e.preventDefault(); ulDrop.classList.remove('drag-over'); if(e.dataTransfer.files[0]) parseUploadedFile(e.dataTransfer.files[0]); });
    ulDrop.addEventListener('click', function(){ if(!ulDrop.classList.contains('has-file')) ulFileInput.click(); });
    ulFileInput.addEventListener('change', function(e){ if(e.target.files[0]) parseUploadedFile(e.target.files[0]); ulFileInput.value=''; });

    function parseUploadedFile(file) {
        if (!/\.(xlsx|xls)$/i.test(file.name)) { _showDropError('Format non supporté. Utilisez .xlsx ou .xls'); return; }
        _pendingXlFile = file;
        _resetDropZone('reading', file.name);
        var banner = document.getElementById('ul-warning-banner');
        if (banner) banner.classList.remove('visible','is-blocking');
        ulAnalysis.style.display = 'none';
        document.getElementById('sheets-summary').innerHTML = '';

        ensureXLSX(function(XL) {
            var reader = new FileReader();
            reader.onload = function(e) {
                try {
                    var wb = XL.read(e.target.result, { type:'array', cellDates:true });
                    var v  = _validateFile(wb, file.name);

                    if (v.blocking.length > 0) {
                        _showValidationBanner(v, true);
                        _showDropError('Fichier refusé — ' + file.name);
                        return;
                    }
                    _xlWorkbook = wb;
                    if (v.soft.length > 0) {
                        _showValidationBanner(v, false);
                        _resetDropZone('warn', file.name);
                        // Ne pas activer syncNext tant que l'user n'a pas confirmé
                        syncNext.disabled = true;
                        return;
                    }
                    // Aucun problème
                    _applyValidatedFile(file.name);
                } catch(err) {
                    console.error('[Sync Upload]', err);
                    _showDropError('Erreur de lecture : ' + err.message);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    // ── Validation ──────────────────────────────────────────────
    function _validateFile(wb, fileName) {
        var blocking = [], soft = [];
        var cfg      = window.SHEET_CONFIG || {};
        var known    = Object.keys(cfg).map(function(k){ return (cfg[k].sheetName||cfg[k].label||k).toLowerCase(); });

        // 1. Signature _gsRowIndex
        var hasSig = wb.SheetNames.some(function(name) {
            var ws   = wb.Sheets[name];
            var json = window.XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
            if (!json.length) return false;
            return json[0].map(function(h){ return String(h||'').trim(); }).includes(HIDDEN_COL);
        });
        if (!hasSig) {
            blocking.push('Ce fichier ne contient pas la colonne <strong>' + HIDDEN_COL + '</strong>. Il n\'a pas été généré par ce système — importer ce fichier écraserait vos données.');
        }

        // 2. Nom du fichier
        var nameOk = /AW27_Offline_\d{4}-\d{2}-\d{2}/i.test(fileName);
        if (!nameOk && hasSig) {
            soft.push('Nom inattendu : <strong>' + esc(fileName) + '</strong>. Le fichier attendu s\'appelle <em>AW27_Offline_YYYY-MM-DD.xlsx</em>.');
        }

        // 3. Date du fichier (trop ancien)
        var dm = fileName.match(/(\d{4}-\d{2}-\d{2})/);
        if (dm) {
            var fd   = new Date(dm[1]); fd.setHours(0,0,0,0);
            var tod  = new Date(); tod.setHours(0,0,0,0);
            var diff = Math.round((tod - fd) / 86400000);
            if (diff > 1) soft.push('Ce fichier date d\'il y a <strong>' + diff + ' jour' + (diff>1?'s':'') + '</strong> (' + dm[1] + '). Vous risquez d\'écraser des modifications récentes faites dans GS.');
            else if (diff < 0) soft.push('La date du fichier est dans le futur (<strong>' + dm[1] + '</strong>) — vérifiez que c\'est le bon fichier.');
        }

        // 4. Fichier vide
        var totalRows = 0;
        wb.SheetNames.forEach(function(name) {
            var ws   = wb.Sheets[name];
            var json = window.XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
            totalRows += Math.max(0, json.length - 1);
        });
        if (totalRows === 0) blocking.push('Le fichier est vide — aucune donnée à importer.');
        else if (totalRows < 3 && hasSig) soft.push('Le fichier ne contient que <strong>' + totalRows + ' ligne' + (totalRows>1?'s':'') + '</strong>. Vérifiez que c\'est bien le bon fichier.');

        // 5. Feuilles GS absentes du fichier
        var xlNames  = wb.SheetNames.map(function(n){ return n.toLowerCase(); });
        var missing  = known.filter(function(n){ return !xlNames.includes(n) && n !== 'style'; });
        if (missing.length > 0) {
            soft.push('Feuille' + (missing.length>1?'s':'') + ' absente' + (missing.length>1?'s':'') + ' du fichier : <strong>' + missing.join(', ') + '</strong>. Elle' + (missing.length>1?'s':'') + ' ne sera pas modifiée.');
        }

        return { blocking, soft };
    }

    function _showValidationBanner(v, isBlocking) {
        var banner   = document.getElementById('ul-warning-banner');
        var titleEl  = document.getElementById('ul-warn-title');
        var itemsEl  = document.getElementById('ul-warn-items');
        var procBtn  = document.getElementById('btn-warn-proceed');
        if (!banner) return;
        banner.classList.toggle('is-blocking', isBlocking);
        titleEl.textContent = isBlocking
            ? 'Fichier refusé — importation impossible'
            : 'Vérifiez avant de continuer';
        var items = v.blocking.concat(v.soft);
        itemsEl.innerHTML = items.map(function(w){
            return '<div class="ul-warn-item"><span class="ul-warn-dot"></span><span>' + w + '</span></div>';
        }).join('');
        if (procBtn) procBtn.style.display = isBlocking ? 'none' : '';
        banner.classList.add('visible');
    }

    window._ulRejectFile = function() {
        _xlWorkbook = null; _pendingXlFile = null;
        var banner = document.getElementById('ul-warning-banner');
        if (banner) banner.classList.remove('visible','is-blocking');
        _resetDropZone('idle');
        ulAnalysis.style.display = 'none';
        document.getElementById('sheets-summary').innerHTML = '';
        syncNext.disabled = true;
    };

    window._ulProceedAnyway = function() {
        var banner = document.getElementById('ul-warning-banner');
        if (banner) banner.classList.remove('visible','is-blocking');
        if (_xlWorkbook && _pendingXlFile) _applyValidatedFile(_pendingXlFile.name);
    };

    function _applyValidatedFile(fileName) {
        _uploadData = parseWorkbook(_xlWorkbook, window.XLSX);
        analyseChanges();
        _resetDropZone('ok', fileName);
        ulAnalysis.style.display = 'grid';
        syncNext.disabled = false;
    }

    function _resetDropZone(state, fileName) {
        ulDrop.classList.remove('has-file','has-warn','has-error','drag-over');
        var titles = { idle:'Glissez votre fichier Excel modifié ici', reading:'Lecture en cours…', ok: fileName, warn: fileName, error:'Fichier non accepté' };
        var subs   = { idle:'ou cliquez pour choisir — .xlsx, .xls acceptés', reading: fileName || '', ok: 'Fichier validé — prêt à analyser', warn:'Confirmez pour continuer malgré les avertissements', error:'Choisissez un autre fichier' };
        document.getElementById('ul-drop-title').textContent = titles[state] || '';
        document.getElementById('ul-drop-sub').textContent   = subs[state] || '';
        if (state === 'ok')    ulDrop.classList.add('has-file');
        if (state === 'warn')  ulDrop.classList.add('has-warn');
        if (state === 'error') ulDrop.classList.add('has-error');
    }

    function _showDropError(msg) {
        document.getElementById('ul-drop-title').textContent = 'Erreur';
        document.getElementById('ul-drop-sub').textContent   = msg;
        ulDrop.classList.remove('has-file','has-warn');
        ulDrop.classList.add('has-error');
        _xlWorkbook = null; syncNext.disabled = true;
    }

    // ── Lire le workbook ────────────────────────────────────────
    function parseWorkbook(wb, XL) {
        var result = {};
        wb.SheetNames.forEach(function(name) {
            var ws   = wb.Sheets[name];
            var json = XL.utils.sheet_to_json(ws, {header:1, raw:false, dateNF:'yyyy-mm-dd', defval:''});
            if (json.length < 2) return;
            var rawH    = json[0].map(function(h){ return String(h||'').trim(); });
            var ridxCol = rawH.indexOf(HIDDEN_COL);
            var headers = rawH.filter(function(h){ return h && h !== HIDDEN_COL; });
            var rows = [];
            for (var i = 1; i < json.length; i++) {
                var raw = json[i];
                if (!raw || raw.every(function(c){ return c===''||c===null||c===undefined; })) continue;
                var obj = {};
                rawH.forEach(function(h, j) {
                    if (h && h !== HIDDEN_COL) {
                        var v = raw[j];
                        if (v instanceof Date) v = v.toISOString().slice(0,10);
                        obj[h] = v===null||v===undefined ? '' : String(v).trim();
                    }
                });
                obj[HIDDEN_COL] = ridxCol >= 0 ? String(raw[ridxCol]||'').trim() : '';
                rows.push(obj);
            }
            result[name] = { headers, rows };
        });
        return result;
    }

    // ═══════════════════════════════════════════════════════════
    //  ANALYSE
    // ═══════════════════════════════════════════════════════════
    function analyseChanges() {
        var allData = window.state && window.state.data ? window.state.data : {};
        var cfg     = window.SHEET_CONFIG || {};
        _conflicts  = []; _syncQueue = [];
        var totalNew = 0, totalMod = 0, totalConf = 0;
        var summaryRows = [];

        Object.keys(_uploadData).forEach(function(sheetName) {
            var ref     = _uploadData[sheetName];
            var headers = ref.headers, rows = ref.rows;

            var cfgKey = Object.keys(cfg).find(function(k) {
                return (cfg[k].sheetName||cfg[k].label||k).toLowerCase() === sheetName.toLowerCase();
            });

            // Feuille inconnue — créer
            if (!cfgKey) {
                totalNew += rows.length;
                _syncQueue.push({ type:'NEW_SHEET', sheetName, headers, rows });
                summaryRows.push({ sheetName, nNew:rows.length, nMod:0, nConf:0, isNew:true });
                return;
            }

            var gsRows   = allData[cfgKey] || [];
            var labelToKey = {};
            if (cfg[cfgKey] && cfg[cfgKey].cols) {
                cfg[cfgKey].cols.forEach(function(c){ labelToKey[c.label||c.key] = c.key; });
            } else {
                headers.forEach(function(h){ labelToKey[h] = h; });
            }

            var gsByRowIdx = {};
            gsRows.forEach(function(r){ if(r._rowIndex) gsByRowIdx[String(r._rowIndex)] = r; });
            var gsByComp = {};
            gsRows.forEach(function(r) {
                var id2 = buildCompositeId(r, headers, labelToKey, 2);
                if (id2) gsByComp[id2] = r;
                var id1 = buildCompositeId(r, headers, labelToKey, 1);
                if (id1 && !gsByComp[id1]) gsByComp[id1] = r;
            });

            var nNew=0, nMod=0, nConf=0, ops=[];

            rows.forEach(function(localRow) {
                var rawIdx = localRow[HIDDEN_COL];
                var rowIdx = rawIdx && /^\d+$/.test(String(rawIdx).trim()) && parseInt(rawIdx)>1 ? String(rawIdx).trim() : null;
                var compId = buildCompositeId(localRow, headers, null, 1);
                var gsRow  = null;

                if (rowIdx && gsByRowIdx[rowIdx]) gsRow = gsByRowIdx[rowIdx];
                else if (compId && gsByComp[compId]) gsRow = gsByComp[compId];

                if (!gsRow) {
                    console.log('[Sync] NOUVELLE LIGNE:', sheetName, '| rowIdx:', rawIdx||'(vide)', '| compId:', compId||'(null)');
                    nNew++; totalNew++;
                    ops.push({ type:'CREATE', sheetName, cfgKey, row:localRow, headers, labelToKey });
                } else {
                    var diffs = getDiffs(gsRow, localRow, headers, labelToKey);
                    if (!diffs.length) return;
                    var snap    = _gsSnapshot[sheetName] || [];
                    var snapRow = snap.find(function(s){ return String(s._rowIndex||'')=== String(gsRow._rowIndex||''); });
                    var gsChg   = snapRow && getDiffs(snapRow, gsRow, headers, labelToKey).length > 0;
                    if (gsChg) {
                        nConf++; totalConf++;
                        _conflicts.push({ id:Math.random().toString(36).slice(2), sheetName, cfgKey, labelToKey, localRow, gsRow, diffs, rowIndex:gsRow._rowIndex, displayId:compId||('Ligne '+gsRow._rowIndex) });
                    } else {
                        nMod++; totalMod++;
                        ops.push({ type:'UPDATE', sheetName, cfgKey, row:localRow, rowIndex:gsRow._rowIndex, headers, labelToKey });
                    }
                }
            });

            if (ops.length) _syncQueue.push(...ops);
            summaryRows.push({ sheetName, nNew, nMod, nConf, total:rows.length, isNew:false });
        });

        document.getElementById('an-new').textContent  = totalNew;
        document.getElementById('an-mod').textContent  = totalMod;
        document.getElementById('an-conf').textContent = totalConf;

        document.getElementById('sheets-summary').innerHTML = summaryRows.map(function(s) {
            var chips = [];
            if (s.isNew) chips.push('<span class="chip chip-sheet">★ Nouvelle feuille · ' + s.nNew + ' lignes</span>');
            else {
                if (s.nNew)  chips.push('<span class="chip chip-new">+' + s.nNew + ' nouveau' + (s.nNew>1?'x':'') + '</span>');
                if (s.nMod)  chips.push('<span class="chip chip-mod">~' + s.nMod + ' modifié' + (s.nMod>1?'s':'') + '</span>');
                if (s.nConf) chips.push('<span class="chip chip-conf">⚠ ' + s.nConf + ' conflit' + (s.nConf>1?'s':'') + '</span>');
                if (!s.nNew && !s.nMod && !s.nConf) chips.push('<span class="chip chip-ok">Aucun changement</span>');
            }
            return '<div class="sheet-row"><span class="sheet-name">' + esc(s.sheetName) + '</span><div class="sheet-chips">' + chips.join('') + '</div></div>';
        }).join('');
    }

    // ═══════════════════════════════════════════════════════════
    //  STEP 3 — CONFLITS
    // ═══════════════════════════════════════════════════════════
    function proceedToConflicts() {
        if (!_conflicts.length) { buildFinalSummary(); gotoStep(4); return; }
        document.getElementById('conflict-count-lbl').textContent = _conflicts.length + ' conflit' + (_conflicts.length>1?'s':'') + ' — choisissez quelle version conserver';
        document.getElementById('conflict-list').innerHTML = _conflicts.map(function(c) {
            var localF  = c.diffs.map(function(d){ return '<div class="conf-field"><span class="conf-field-name">'+esc(d.col)+'</span><span class="conf-field-val diff">'+esc(d.local)+'</span></div>'; }).join('');
            var remoteF = c.diffs.map(function(d){ return '<div class="conf-field"><span class="conf-field-name">'+esc(d.col)+'</span><span class="conf-field-val diff">'+esc(d.remote)+'</span></div>'; }).join('');
            var rk = c.sheetName+'_'+c.rowIndex, ch = _resolvedConflicts[rk]||null;
            return '<div class="conflict-item" id="conf-'+c.id+'"><div class="conflict-item-hdr"><span class="conf-sheet-badge">'+esc(c.sheetName)+'</span><span class="conf-id">'+esc(c.displayId)+'</span></div>'
                + '<div class="conf-versions"><div class="conf-version conf-v-local"><div class="conf-version-hdr">Ma version (Excel)</div><div class="conf-version-body">'+localF+'</div></div>'
                + '<div class="conf-version conf-v-remote"><div class="conf-version-hdr">Version Google Sheets</div><div class="conf-version-body">'+remoteF+'</div></div></div>'
                + '<div class="conf-choose"><button class="btn-choose btn-local'+(ch==='local'?' chosen':'')+'" onclick="resolveConflict(\''+c.id+'\',\''+c.sheetName+'_'+c.rowIndex+'\',\'local\',this)">Garder ma version</button>'
                + '<button class="btn-choose btn-remote'+(ch==='remote'?' chosen':'')+'" onclick="resolveConflict(\''+c.id+'\',\''+c.sheetName+'_'+c.rowIndex+'\',\'remote\',this)">Garder GS</button></div></div>';
        }).join('');
        gotoStep(3);
    }

    window.resolveConflict = function(cid, rk, choice, btn) {
        _resolvedConflicts[rk] = choice;
        var item = document.getElementById('conf-'+cid);
        if (item) item.querySelectorAll('.btn-choose').forEach(function(b){ b.classList.remove('chosen'); });
        btn.classList.add('chosen');
        if (choice === 'local') {
            var c = _conflicts.find(function(x){ return x.id===cid; });
            if (c && !_syncQueue.find(function(op){ return op.rowIndex===c.rowIndex && op.sheetName===c.sheetName; })) {
                _syncQueue.push({ type:'UPDATE', sheetName:c.sheetName, cfgKey:c.cfgKey, row:c.localRow, rowIndex:c.rowIndex, headers:Object.keys(c.localRow).filter(function(k){ return k!==HIDDEN_COL; }), labelToKey:c.labelToKey });
            }
        }
        var allResolved = _conflicts.every(function(c){ return _resolvedConflicts[c.sheetName+'_'+c.rowIndex]; });
        if (allResolved) syncNext.style.background='#16a34a';
    };

    // ═══════════════════════════════════════════════════════════
    //  STEP 4 — RÉSUMÉ + EXÉCUTION
    // ═══════════════════════════════════════════════════════════
    function proceedToFinalSync() {
        var unres = _conflicts.filter(function(c){ return !_resolvedConflicts[c.sheetName+'_'+c.rowIndex]; });
        if (unres.length) { alert('Résolvez tous les conflits avant de continuer (' + unres.length + ' restant' + (unres.length>1?'s':'') + ')'); return; }
        buildFinalSummary(); gotoStep(4);
    }

    function buildFinalSummary() {
        var ops = _syncQueue;
        var bySheet = {};
        ops.forEach(function(op) {
            if (!bySheet[op.sheetName]) bySheet[op.sheetName] = {c:0, u:0, isNew:false};
            if (op.type==='NEW_SHEET') { bySheet[op.sheetName].isNew=true; bySheet[op.sheetName].c+=op.rows.length; }
            else if (op.type==='CREATE') bySheet[op.sheetName].c++;
            else bySheet[op.sheetName].u++;
        });
        var ign = _conflicts.filter(function(c){ return _resolvedConflicts[c.sheetName+'_'+(c.rowIndex||'')]==='remote'; }).length;
        document.getElementById('step4-summary').textContent =
            ops.filter(function(o){ return o.type!=='NEW_SHEET'; }).reduce(function(s,o){ return s+(o.type==='CREATE'?1:0); }, 0) + ' nouvelle(s) ligne(s) · ' +
            ops.filter(function(o){ return o.type==='UPDATE'; }).length + ' modification(s)' +
            (ign ? ' · ' + ign + ' conflit(s) ignoré(s)' : '');
        document.getElementById('step4-ops').innerHTML = Object.keys(bySheet).map(function(name) {
            var s = bySheet[name], chips=[];
            if (s.isNew) chips.push('<span class="chip chip-sheet">★ Nouvelle feuille · '+s.c+' ligne'+(s.c>1?'s':'')+'</span>');
            else { if(s.c) chips.push('<span class="chip chip-new">+'+s.c+'</span>'); if(s.u) chips.push('<span class="chip chip-mod">~'+s.u+'</span>'); }
            return '<div class="sheet-row"><span class="sheet-name">'+esc(name)+'</span><div class="sheet-chips">'+chips.join('')+'</div></div>';
        }).join('');
        if (!ops.length) { document.getElementById('step4-ops').innerHTML='<div style="padding:16px;font-size:13px;color:var(--color-text-secondary);text-align:center;">Aucune modification — tout est à jour.</div>'; syncNext.disabled=true; }
    }

    async function executeSync() {
        if (_isBusy) return;
        var gasUrl = window.GOOGLE_APPS_SCRIPT_URL || (window.currentUser && window.currentUser.gasUrl);
        if (!gasUrl || gasUrl==='YOUR_WEB_APP_URL_HERE') { alert('GAS URL non configuré.'); return; }
        _isBusy=true; syncNext.disabled=true; syncBack.style.display='none'; progWrap.classList.add('visible');
        var ops=_syncQueue;
        var _done=0;
        var _execNext = async function(i) {
            if (i >= ops.length) {
                progFill.style.width='100%';
                progLbl.textContent='Synchronisation terminée';
                progDtl.textContent=_done+' opération'+(_done>1?'s':'')+' effectuée'+(_done>1?'s':'');
                _isBusy=false;
                syncNext.textContent='Terminé — Fermer'; syncNext.disabled=false;
                syncNext.onclick=function(){ closeAndReset(); };
                if (typeof fetchAllData==='function') setTimeout(function(){ fetchAllData(); if(typeof showToast==='function') showToast('Sync terminée — '+_done+' opération'+(_done>1?'s':'')+' effectuée'+(_done>1?'s':''),'success',5000); }, 600);
                return;
            }
            var op = ops[i];
            progFill.style.width = Math.round((i/ops.length)*100)+'%';
            progLbl.textContent  = (op.type==='NEW_SHEET'?'Nouvelle feuille':op.type==='CREATE'?'Ajout':'Mise à jour')+' — '+op.sheetName;
            progDtl.textContent  = (i+1)+' / '+ops.length;
            try {
                if (op.type==='NEW_SHEET') {
                    for (var b=0; b<op.rows.length; b+=BATCH_SIZE) {
                        var batch = op.rows.slice(b, b+BATCH_SIZE);
                        var res = await fetch(gasUrl, { method:'POST', body:JSON.stringify({ action:'IMPORT_ROWS', sheet:op.sheetName, headers:op.headers, rows:batch.map(function(r){ var o={}; op.headers.forEach(function(h){ o[h]=r[h]!==undefined?r[h]:''; }); return o; }) }) });
                        var json = await res.json();
                        if (json.status!=='ok') throw new Error(json.message||'GAS error');
                    }
                    registerNewMenuFromSheet(op.sheetName, op.headers, op.rows);
                } else {
                    var payload = { action:op.type, sheet:op.sheetName, data:buildRowData(op.row, op.headers), rowIndex:op.rowIndex||undefined };
                    var r2 = await fetch(gasUrl, { method:'POST', body:JSON.stringify(payload) });
                    var j2 = await r2.json();
                    if (j2.status!=='ok') throw new Error(j2.message||'GAS error');
                }
            } catch(err) { console.error('[Sync exec]', op.sheetName, err); }
            _done++;
            await _execNext(i+1);
        };
        await _execNext(0);
    }

    // ═══════════════════════════════════════════════════════════
    //  NOUVELLE FEUILLE — enregistrer dans l'interface
    // ═══════════════════════════════════════════════════════════
    function registerNewMenuFromSheet(sheetName, headers, rows) {
        if (!window.SHEET_CONFIG) return;
        var key = 'custom_' + sheetName.toLowerCase().replace(/[^a-z0-9]/g,'_').slice(0,20) + '_' + Date.now().toString(36);

        function inferType(col, vals) {
            var l = col.toLowerCase();
            if (/date|psd|fty|ready|sent|send|received|recu|envoi|launch/.test(l)) return 'date';
            if (/qty|quantit|amount|montant|price|prix|cost|\bup\b/.test(l)) return 'number';
            if (/remark|comment|note|description|desc/.test(l)) return 'textarea';
            var uniq = [...new Set(vals.filter(Boolean))];
            if (uniq.length>0 && uniq.length<=8 && vals.length>3) return 'select';
            return 'text';
        }

        var cols = headers.filter(function(h){ return h!==HIDDEN_COL; }).map(function(h) {
            var vals = rows.map(function(r){ return r[h]||''; });
            var type = inferType(h, vals);
            var col  = { key:h, label:h, type:type };
            if (type==='select') col.options = ['', ...new Set(vals.filter(Boolean))].slice(0,10);
            if (h.length>15||type==='textarea') col.full=true;
            return col;
        });

        window.SHEET_CONFIG[key] = { label:sheetName, sheetName:sheetName, custom:true, cols:cols, kpis:[{ label:'Total lignes', colorClass:'teal', icon:'<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>', compute:function(r){ return r.length; } }] };

        if (window.state && window.state.data) {
            window.state.data[key] = rows.map(function(r,i){ var o={_rowIndex:i+2}; cols.forEach(function(c){ o[c.key]=r[c.key]||''; }); return o; });
        }

        if (typeof window.registerCustomMenu==='function') {
            window.registerCustomMenu({ key, label:sheetName, cols }, true);
        } else {
            var nav = document.getElementById('custom-nav-items');
            if (nav && !document.getElementById('tab-custom-'+key)) {
                var btn = document.createElement('button');
                btn.className='nav-item'; btn.id='tab-custom-'+key; btn.dataset.sheet=key;
                btn.innerHTML='<span class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"/></svg></span><span class="nav-label">'+sheetName+'</span>';
                btn.addEventListener('click', function(){ if(window.state){window.state.activeView='sheet';window.state.activeSheet=key;} document.querySelectorAll('.nav-item').forEach(function(b){b.classList.remove('active');}); btn.classList.add('active'); var t=document.getElementById('header-sheet-title'); if(t)t.textContent=sheetName; if(typeof window.showTableView==='function')window.showTableView(); if(typeof window.applyFilters==='function')window.applyFilters(); if(typeof window.renderKPIs==='function')window.renderKPIs(); });
                nav.appendChild(btn);
            }
            try { var STORE='aw27_custom_menus'; var saved=JSON.parse(localStorage.getItem(STORE)||'[]'); saved.push({key,label:sheetName,cols,custom:true}); localStorage.setItem(STORE,JSON.stringify(saved)); } catch(e){}
        }
        if (typeof showToast==='function') showToast('Nouveau menu créé : '+sheetName+' ('+cols.length+' colonnes)','success',5000);
    }

    // ═══════════════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════════════
    function buildCompositeId(row, headers, labelToKey, minParts) {
        minParts = minParts||2;
        var parts=[];
        ID_COLS.forEach(function(col) {
            var val = row[col];
            if ((val===undefined||val===null||val==='') && labelToKey && labelToKey[col]) val=row[labelToKey[col]];
            if (val!==undefined&&val!==null&&val!=='') parts.push(String(val).trim().toUpperCase());
        });
        return parts.length>=minParts ? parts.join('||') : null;
    }

    function normalizeVal(v) {
        if (v===null||v===undefined) return '';
        if (v instanceof Date) return v.toISOString().slice(0,10);
        var s = String(v).trim();
        if (!s) return '';
        var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (iso) return iso[1]+'-'+iso[2]+'-'+iso[3];
        var fr = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (fr) return fr[3]+'-'+fr[2]+'-'+fr[1];
        if (s.match(/^-?[\d.,]+$/)) { var n=parseFloat(s.replace(',','.')); if(!isNaN(n)) return String(n); }
        return s;
    }

    function readGsVal(gsRow, label, labelToKey) {
        var key = labelToKey && labelToKey[label];
        if (key && gsRow[key]!==undefined && gsRow[key]!==null && gsRow[key]!=='') return gsRow[key];
        if (gsRow[label]!==undefined && gsRow[label]!==null && gsRow[label]!=='') return gsRow[label];
        var lo = label.toLowerCase();
        var fk = Object.keys(gsRow).find(function(k){ return k.toLowerCase()===lo; });
        return fk ? gsRow[fk] : '';
    }

    function getDiffs(gsRow, localRow, headers, labelToKey) {
        return headers.filter(function(h) {
            if (h===HIDDEN_COL) return false;
            return normalizeVal(readGsVal(gsRow, h, labelToKey)) !== normalizeVal(localRow[h]);
        }).map(function(h) {
            return { col:h, local:normalizeVal(localRow[h]), remote:normalizeVal(readGsVal(gsRow, h, labelToKey)) };
        });
    }

    function buildRowData(row, headers) {
        var obj={};
        (headers||[]).forEach(function(h){ if(h!==HIDDEN_COL){ var v=row[h]; obj[h]=(v===null||v===undefined)?'':String(v); } });
        return obj;
    }

    function ensureXLSX(cb) {
        if (window.XLSX) { cb(window.XLSX); return; }
        var urls=['https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js','https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'];
        var idx=0;
        (function tryNext(){ if(idx>=urls.length){alert('Impossible de charger SheetJS.');return;} var s=document.createElement('script'); s.src=urls[idx++]; s.onload=function(){cb(window.XLSX);}; s.onerror=tryNext; document.head.appendChild(s); })();
    }

    function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    // ── Bouton sidebar ──────────────────────────────────────────
    function injectSyncButton() {
        var footer = document.querySelector('.sidebar-footer');
        if (!footer || document.getElementById('btn-offline-sync')) return;
        var btn = document.createElement('button');
        btn.id='btn-offline-sync'; btn.className='nav-action'; btn.title='Synchronisation hors connexion';
        btn.innerHTML='<span class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></span><span class="nav-label">Sync offline</span>';
        btn.addEventListener('click', window.openSyncPanel);
        footer.insertBefore(btn, footer.firstChild);
    }

    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', injectSyncButton);
    else injectSyncButton();
    new MutationObserver(injectSyncButton).observe(document.body, {childList:true, subtree:false});

    console.log('[AW27] Offline Sync Module v3 chargé ✓');
})();
