// ============================================================
//  AW27 CHECKERS — Settings Panel (Paramètres unifiés)
//  Regroupe : Compte, GAS URL, Sync offline, Import Excel,
//             Notifications, Menus custom
//  Inclure après tous les autres scripts dans index.html :
//    <script src="settingsPanel.js"></script>
// ============================================================

(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════
    //  CSS
    // ═══════════════════════════════════════════════════════════
    const css = document.createElement('style');
    css.id = 'settings-panel-styles';
    css.textContent = `
    /* ── Overlay ── */
    #sp-overlay {
        position: fixed; inset: 0; z-index: 13000;
        background: rgba(15,23,42,0.5);
        backdrop-filter: blur(4px);
        display: none; align-items: flex-start; justify-content: flex-end;
        padding: 56px 12px 0 0;
    }
    #sp-overlay.open { display: flex; }

    /* ── Panel ── */
    #sp-panel {
        width: 340px;
        background: var(--color-background-primary, #fff);
        border: 0.5px solid var(--color-border-tertiary, #e5e7eb);
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08);
        display: flex; flex-direction: column;
        overflow: hidden;
        font-family: 'Inter', sans-serif;
        max-height: calc(100vh - 70px);
        animation: sp-in .2s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes sp-in {
        from { opacity:0; transform: translateY(-10px) scale(0.97); }
        to   { opacity:1; transform: none; }
    }

    /* ── Header profil ── */
    #sp-profile {
        padding: 16px 16px 14px;
        border-bottom: 0.5px solid var(--color-border-tertiary, #e5e7eb);
        display: flex; align-items: center; gap: 11px;
        background: var(--color-background-secondary, #f9fafb);
    }
    #sp-avatar {
        width: 40px; height: 40px; border-radius: 50%;
        background: #e0f2fe; border: 2px solid #bae6fd;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; font-weight: 700; color: #0284c7;
        flex-shrink: 0; overflow: hidden;
    }
    #sp-avatar img { width: 100%; height: 100%; object-fit: cover; }
    #sp-user-name  { font-size: 13px; font-weight: 600; color: var(--color-text-primary, #111827); }
    #sp-user-email { font-size: 11px; color: var(--color-text-secondary, #6b7280); margin-top: 1px; }
    #sp-close {
        margin-left: auto; width: 26px; height: 26px;
        border-radius: 7px; border: 0.5px solid var(--color-border-tertiary, #e5e7eb);
        background: transparent; color: var(--color-text-secondary, #9ca3af);
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        font-size: 13px; flex-shrink: 0; transition: all .15s;
    }
    #sp-close:hover { background: #fef2f2; color: #dc2626; border-color: #fca5a5; }

    /* ── Scrollable body ── */
    #sp-body {
        flex: 1; overflow-y: auto; padding: 8px 0;
    }
    #sp-body::-webkit-scrollbar { width: 3px; }
    #sp-body::-webkit-scrollbar-thumb { background: var(--color-border-secondary, #d1d5db); border-radius: 3px; }

    /* ── Section label ── */
    .sp-section-label {
        padding: 10px 16px 4px;
        font-size: 10px; font-weight: 700; text-transform: uppercase;
        letter-spacing: .08em; color: var(--color-text-secondary, #9ca3af);
    }

    /* ── Item ── */
    .sp-item {
        display: flex; align-items: center; gap: 11px;
        padding: 9px 16px; cursor: pointer;
        transition: background .12s;
        border: none; background: transparent;
        width: 100%; text-align: left; font-family: inherit;
    }
    .sp-item:hover { background: var(--color-background-secondary, #f3f4f6); }
    .sp-item-icon {
        width: 32px; height: 32px; border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
    }
    .sp-item-icon svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .sp-item-body { flex: 1; min-width: 0; }
    .sp-item-title { font-size: 13px; font-weight: 500; color: var(--color-text-primary, #111827); }
    .sp-item-sub   { font-size: 11px; color: var(--color-text-secondary, #6b7280); margin-top: 1px; }
    .sp-item-arrow { color: var(--color-text-secondary, #d1d5db); flex-shrink: 0; }
    .sp-item-arrow svg { width: 13px; height: 13px; stroke: currentColor; fill: none; stroke-width: 2.5; stroke-linecap: round; }
    .sp-item-badge {
        font-size: 10px; font-weight: 700; padding: 2px 7px;
        border-radius: 20px; flex-shrink: 0;
    }

    /* icon color variants */
    .sp-ic-blue   { background: #e0f2fe; color: #0284c7; }
    .sp-ic-green  { background: #dcfce7; color: #16a34a; }
    .sp-ic-purple { background: #ede9fe; color: #7c3aed; }
    .sp-ic-amber  { background: #fef3c7; color: #d97706; }
    .sp-ic-indigo { background: #e0e7ff; color: #4f46e5; }
    .sp-ic-red    { background: #fee2e2; color: #dc2626; }
    .sp-ic-slate  { background: #f1f5f9; color: #475569; }

    /* badge variants */
    .sp-badge-red  { background: #fee2e2; color: #dc2626; }
    .sp-badge-blue { background: #e0f2fe; color: #0284c7; }
    .sp-badge-gray { background: #f1f5f9; color: #6b7280; }

    /* ── GAS URL inline section ── */
    #sp-gas-section {
        display: none;
        padding: 0 16px 12px;
        border-bottom: 0.5px solid var(--color-border-tertiary, #e5e7eb);
    }
    #sp-gas-section.open { display: block; }
    #sp-gas-input {
        width: 100%; padding: 7px 10px;
        border: 1.5px solid var(--color-border-secondary, #d1d5db);
        border-radius: 7px; font-size: 11px; font-family: monospace;
        color: var(--color-text-primary, #111827);
        background: var(--color-background-secondary, #f9fafb);
        outline: none; transition: border-color .15s; margin-bottom: 7px;
    }
    #sp-gas-input:focus { border-color: #0284c7; background: #fff; }
    #sp-gas-save {
        width: 100%; padding: 7px; border-radius: 7px; border: none;
        background: #0284c7; color: #fff; font-size: 12px; font-weight: 600;
        cursor: pointer; font-family: inherit; transition: background .15s;
    }
    #sp-gas-save:hover { background: #0369a1; }

    /* ── Separator ── */
    .sp-sep {
        height: 0.5px;
        background: var(--color-border-tertiary, #e5e7eb);
        margin: 4px 0;
    }

    /* ── Footer déconnexion ── */
    #sp-footer {
        padding: 8px 16px 12px;
        border-top: 0.5px solid var(--color-border-tertiary, #e5e7eb);
    }
    #sp-signout {
        width: 100%; padding: 8px; border-radius: 8px;
        border: 1px solid #fecaca; background: #fff5f5;
        color: #dc2626; font-size: 12px; font-weight: 600;
        cursor: pointer; font-family: inherit;
        display: flex; align-items: center; justify-content: center; gap: 6px;
        transition: background .15s;
    }
    #sp-signout:hover { background: #fee2e2; }
    #sp-signout svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; }

    /* ── Topbar settings button ── */
    #topbar-settings-btn {
        display: flex; align-items: center; justify-content: center;
        height: 34px; width: 34px; border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.22);
        background: rgba(255,255,255,0.12);
        color: #fff; cursor: pointer; flex-shrink: 0;
        transition: background .15s;
        position: relative;
    }
    #topbar-settings-btn:hover { background: rgba(255,255,255,0.24); }
    #topbar-settings-btn svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; }

    /* Masquer tous les doublons et anciens boutons */
    .user-badge,
    #btn-notif-settings,
    #btn-offline-sync,
    #btn-xl-import,
    #topbar-refresh-btn,
    #topbar-sync-btn,
    #topbar-export-btn,
    #topbar-import-btn,
    .topbar-divider,
    .topbar-action-btn {
        display: none !important;
    }

    /* Bouton notifications — toujours visible et fonctionnel */
    #btn-notif-global {
        display: flex !important;
        pointer-events: all !important;
    }


    `;
    document.head.appendChild(css);

    // ═══════════════════════════════════════════════════════════
    //  HTML
    // ═══════════════════════════════════════════════════════════
    document.body.insertAdjacentHTML('beforeend', `
    <div id="sp-overlay">
      <div id="sp-panel">

        <!-- Profil -->
        <div id="sp-profile">
          <div id="sp-avatar">?</div>
          <div>
            <div id="sp-user-name">—</div>
            <div id="sp-user-email">—</div>
          </div>
          <button id="sp-close" title="Fermer">✕</button>
        </div>

        <div id="sp-body">

          <!-- SECTION : Données -->
          <div class="sp-section-label">Données</div>

          <!-- GAS URL -->
          <button class="sp-item" id="sp-item-gas" onclick="spToggleGas()">
            <div class="sp-item-icon sp-ic-blue">
              <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </div>
            <div class="sp-item-body">
              <div class="sp-item-title">Google Apps Script URL</div>
              <div class="sp-item-sub" id="sp-gas-sub">Connecteur de données</div>
            </div>
            <div class="sp-item-arrow"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
          </button>

          <!-- GAS URL inline editor -->
          <div id="sp-gas-section">
            <input id="sp-gas-input" type="url" placeholder="https://script.google.com/macros/s/…/exec"/>
            <button id="sp-gas-save" onclick="spSaveGas()">Enregistrer et recharger</button>
          </div>

          <!-- Sync offline — Download -->
          <button class="sp-item" onclick="spClose();setTimeout(function(){if(typeof openSyncDownload==='function')openSyncDownload();},150)">
            <div class="sp-item-icon sp-ic-green">
              <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </div>
            <div class="sp-item-body">
              <div class="sp-item-title">Télécharger GS → Excel</div>
              <div class="sp-item-sub">Export offline du matin</div>
            </div>
            <div class="sp-item-arrow"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
          </button>

          <!-- Sync offline — Upload -->
          <button class="sp-item" onclick="spClose();setTimeout(function(){if(typeof openSyncUpload==='function')openSyncUpload();},150)">
            <div class="sp-item-icon sp-ic-blue">
              <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <div class="sp-item-body">
              <div class="sp-item-title">Uploader Excel → GS</div>
              <div class="sp-item-sub">Synchroniser les modifications du soir</div>
            </div>
            <div class="sp-item-arrow"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
          </button>

          <!-- Import Excel -->
          <button class="sp-item" onclick="spClose();setTimeout(function(){if(typeof openXlImport==='function')openXlImport();},150)">
            <div class="sp-item-icon sp-ic-indigo">
              <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <div class="sp-item-body">
              <div class="sp-item-title">Import Excel</div>
              <div class="sp-item-sub">Importer un fichier vers Google Sheets</div>
            </div>
            <div class="sp-item-arrow"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
          </button>

          <div class="sp-sep"></div>

          <!-- SECTION : Interface -->
          <div class="sp-section-label">Interface</div>

          <!-- Notifications -->
          <button class="sp-item" id="sp-item-notif" onclick="spClose();setTimeout(function(){if(typeof nsOpen==='function')nsOpen();},150)">
            <div class="sp-item-icon sp-ic-amber">
              <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            <div class="sp-item-body">
              <div class="sp-item-title">Filtres notifications</div>
              <div class="sp-item-sub">Clients, urgences, types d'alertes</div>
            </div>
            <span class="sp-item-badge sp-badge-red" id="sp-notif-badge" style="display:none">0</span>
            <div class="sp-item-arrow"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
          </button>

          <!-- Menus custom -->
          <button class="sp-item" onclick="spClose();setTimeout(function(){if(typeof openMenuBuilder==='function')openMenuBuilder();},150)">
            <div class="sp-item-icon sp-ic-purple">
              <svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </div>
            <div class="sp-item-body">
              <div class="sp-item-title">Créer un menu</div>
              <div class="sp-item-sub" id="sp-menus-sub">Ajouter une feuille personnalisée</div>
            </div>
            <div class="sp-item-arrow"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
          </button>

          <div class="sp-sep"></div>

          <!-- SECTION : Actions rapides -->
          <div class="sp-section-label">Actions</div>

          <!-- Actualiser -->
          <button class="sp-item" onclick="spClose();setTimeout(function(){if(typeof fetchAllData==='function')fetchAllData();},150)">
            <div class="sp-item-icon sp-ic-slate">
              <svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            </div>
            <div class="sp-item-body">
              <div class="sp-item-title">Actualiser les données</div>
              <div class="sp-item-sub" id="sp-refresh-sub">Synchroniser depuis Google Sheets</div>
            </div>
            <div class="sp-item-arrow"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
          </button>

          <!-- Export Excel -->
          <button class="sp-item" onclick="spClose();setTimeout(function(){if(typeof exportExcel==='function')exportExcel();},150)">
            <div class="sp-item-icon sp-ic-green">
              <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </div>
            <div class="sp-item-body">
              <div class="sp-item-title">Exporter Excel</div>
              <div class="sp-item-sub">Télécharger la vue actuelle</div>
            </div>
            <div class="sp-item-arrow"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
          </button>

        </div><!-- /#sp-body -->

        <!-- Footer déconnexion -->
        <div id="sp-footer">
          <button id="sp-signout" onclick="spSignOut()">
            <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Se déconnecter
          </button>
        </div>

      </div>
    </div>
    `);

    // ═══════════════════════════════════════════════════════════
    //  LOGIQUE
    // ═══════════════════════════════════════════════════════════
    const overlay = document.getElementById('sp-overlay');

    window.spOpen = function () {
        spPopulateProfile();
        spUpdateBadges();
        overlay.classList.add('open');
    };

    window.spClose = function () {
        overlay.classList.remove('open');
        // Fermer aussi le GAS editor
        document.getElementById('sp-gas-section').classList.remove('open');
    };

    // Clic en dehors → fermer
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) spClose();
    });
    document.getElementById('sp-close').addEventListener('click', spClose);

    // ── Profil ──────────────────────────────────────────────────
    function spPopulateProfile() {
        const u = window.currentUser;
        if (!u) return;
        const nameEl  = document.getElementById('sp-user-name');
        const emailEl = document.getElementById('sp-user-email');
        const avatarEl= document.getElementById('sp-avatar');
        const gasSub  = document.getElementById('sp-gas-sub');
        const gasInput= document.getElementById('sp-gas-input');

        if (nameEl)  nameEl.textContent  = u.displayName || u.email || '—';
        if (emailEl) emailEl.textContent = u.email || '—';
        if (avatarEl) {
            if (u.photoURL) {
                avatarEl.innerHTML = '<img src="' + u.photoURL + '" alt=""/>';
            } else {
                const init = (u.displayName || u.email || '?').trim().split(' ')
                    .filter(Boolean).map(p => p[0].toUpperCase()).slice(0,2).join('');
                avatarEl.textContent = init;
            }
        }
        // GAS URL
        const gasUrl = u.gasUrl || window.GOOGLE_APPS_SCRIPT_URL || '';
        if (gasSub) {
            if (gasUrl && gasUrl !== 'YOUR_WEB_APP_URL_HERE') {
                const short = gasUrl.replace('https://script.google.com/macros/s/', '').slice(0, 22) + '…';
                gasSub.textContent = short;
            } else {
                gasSub.textContent = 'Non configuré';
            }
        }
        if (gasInput) gasInput.value = gasUrl === 'YOUR_WEB_APP_URL_HERE' ? '' : (gasUrl || '');
    }

    // ── GAS URL toggle/save ─────────────────────────────────────
    window.spToggleGas = function () {
        const section = document.getElementById('sp-gas-section');
        section.classList.toggle('open');
        if (section.classList.contains('open')) {
            setTimeout(function () { document.getElementById('sp-gas-input').focus(); }, 100);
        }
    };

    window.spSaveGas = async function () {
        const input = document.getElementById('sp-gas-input');
        const url   = (input && input.value || '').trim();
        if (!url || !url.startsWith('https://')) {
            input.style.borderColor = '#dc2626';
            setTimeout(function () { input.style.borderColor = ''; }, 1500);
            return;
        }
        if (typeof updateGasUrl === 'function') {
            await updateGasUrl(url);
        } else if (window.currentUser) {
            window.currentUser.gasUrl = url;
            window.GOOGLE_APPS_SCRIPT_URL = url;
            if (typeof fetchAllData === 'function') fetchAllData();
        }
        spClose();
        if (typeof showToast === 'function') showToast('URL mise à jour ✓', 'success', 3000);
    };

    // ── Badges dynamiques ───────────────────────────────────────
    function spUpdateBadges() {
        // Badge notifications
        const notifBadge = document.getElementById('sp-notif-badge');
        if (notifBadge && typeof collectAllAlerts === 'function') {
            try {
                const all   = collectAllAlerts();
                const total = Object.values(all).reduce(function (s, v) { return s + v.items.length; }, 0);
                notifBadge.textContent = total > 99 ? '99+' : String(total);
                notifBadge.style.display = total > 0 ? '' : 'none';
            } catch (e) { notifBadge.style.display = 'none'; }
        }

        // Sous-titre menus custom
        const menusSub = document.getElementById('sp-menus-sub');
        if (menusSub && window.SHEET_CONFIG) {
            const customCount = Object.values(window.SHEET_CONFIG).filter(function (c) { return c.custom; }).length;
            menusSub.textContent = customCount > 0
                ? customCount + ' menu' + (customCount > 1 ? 's' : '') + ' personnalisé' + (customCount > 1 ? 's' : '')
                : 'Ajouter une feuille personnalisée';
        }

        // Sous-titre refresh (dernière sync)
        const refreshSub = document.getElementById('sp-refresh-sub');
        if (refreshSub && window.state && window.state._lastFetch) {
            const mins = Math.round((Date.now() - window.state._lastFetch) / 60000);
            refreshSub.textContent = mins < 1 ? 'À l\'instant' : 'Il y a ' + mins + ' min';
        }
    }

    // ── Déconnexion ─────────────────────────────────────────────
    window.spSignOut = function () {
        if (typeof signOut === 'function') signOut();
    };

    // ═══════════════════════════════════════════════════════════
    //  INJECTER LE BOUTON DANS LA TOPBAR
    // ═══════════════════════════════════════════════════════════
    function injectTopbarSettingsBtn() {
        var headerRight = document.querySelector('.header-right');
        if (!headerRight || document.getElementById('topbar-settings-btn')) return;

        // Nettoyer une seule fois les boutons des anciens patches
        ['topbar-refresh-btn','topbar-sync-btn','topbar-export-btn',
         'topbar-import-btn','btn-notif-settings'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.remove();
        });
        document.querySelectorAll('.topbar-divider, .topbar-action-btn').forEach(function(el) {
            el.remove();
        });

        const btn = document.createElement('button');
        btn.id        = 'topbar-settings-btn';
        btn.title     = 'Paramètres';
        btn.innerHTML = `<svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>`;
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (overlay.classList.contains('open')) spClose();
            else spOpen();
        });

        // Insérer avant le premier enfant (avant le bouton notifications)
        headerRight.insertBefore(btn, headerRight.firstChild);
    }

    // ── Masquer les anciens points d'entrée ─────────────────────
    // (openUserSettings → redirige vers spOpen)
    window.openUserSettings = window.spOpen;

    // ── Init ────────────────────────────────────────────────────
    function init() {
        injectTopbarSettingsBtn();
        // Mise à jour des badges toutes les 30s quand le panel est ouvert
        setInterval(function () {
            if (overlay.classList.contains('open')) spUpdateBadges();
        }, 30000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Observer UNIQUEMENT pour injecter le bouton settings quand le header est prêt
    // (pas de nettoyage ici pour éviter les boucles infinies)
    var _spObserver = new MutationObserver(function () {
        if (document.querySelector('.header-right') && !document.getElementById('topbar-settings-btn')) {
            injectTopbarSettingsBtn();
        }
    });
    _spObserver.observe(document.body, { childList: true, subtree: false });

    console.log('[AW27] Settings Panel chargé ✓');
})();
