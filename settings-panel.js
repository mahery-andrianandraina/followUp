// ============================================================
// AW27 CHECKERS — Settings Panel (Unified)
// Regroupe les actions système (Actualiser, Export, Sync),
// les paramètres de notification et autres liens utiles.
// ============================================================

(function () {
    'use strict';

    const CSS = `
    /* ── Main overlay ── */
    #settings-overlay {
        position: fixed; inset: 0; z-index: 20000;
        background: rgba(0,0,0,0.45);
        backdrop-filter: blur(3px);
        display: none; align-items: flex-start; justify-content: flex-end;
        padding: 72px 16px 0 0;
        animation: ns-fade-in .18s ease;
    }
    #settings-overlay.open { display: flex; }
    @keyframes ns-fade-in { from { opacity:0 } to { opacity:1 } }

    #settings-panel {
        width: 380px; max-height: 82vh;
        background: #0f1a2e;
        border: 1px solid rgba(99,162,255,0.18);
        border-radius: 18px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);
        display: flex; flex-direction: column;
        overflow: hidden;
        animation: ns-slide-in .22s cubic-bezier(.34,1.56,.64,1);
        font-family: 'Inter', sans-serif;
    }
    @keyframes ns-slide-in { from { opacity:0; transform:translateY(-16px) scale(0.96) } to { opacity:1; transform:translateY(0) scale(1) } }

    /* Header */
    #settings-header {
        display: flex; align-items: center; gap: 10px;
        padding: 15px 18px 14px;
        background: linear-gradient(135deg, rgba(2,132,199,0.3), rgba(99,102,241,0.2));
        border-bottom: 1px solid rgba(255,255,255,0.08);
        flex-shrink: 0;
    }
    #settings-header-icon {
        width: 34px; height: 34px; border-radius: 10px;
        background: rgba(2,132,199,0.25); border: 1px solid rgba(2,132,199,0.4);
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    #settings-header-icon svg { width: 16px; height: 16px; stroke: #7dd3fc; fill: none; }
    #settings-header-text { flex: 1; }
    #settings-header-title { font-size: 14px; font-weight: 600; color: #f1f5f9; }
    #settings-header-sub { font-size: 11px; color: #64748b; margin-top: 1px; }
    #settings-close-btn {
        width: 28px; height: 28px; border-radius: 8px;
        background: rgba(255,255,255,0.07); border: none;
        color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: all .15s;
    }
    #settings-close-btn:hover { background: rgba(255,255,255,0.14); color: #f1f5f9; }
    #settings-close-btn svg { width: 13px; height: 13px; fill: currentColor; }

    /* Body scrollable */
    #settings-body { flex: 1; overflow-y: auto; padding: 0 0 10px; }
    #settings-body::-webkit-scrollbar { width: 3px; }
    #settings-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }

    /* Grand titre de section */
    .st-main-title {
        font-size: 11px; font-weight: 700; color: #cbd5e1;
        text-transform: uppercase; letter-spacing: .08em;
        padding: 14px 18px 6px;
        display: flex; align-items: center; gap: 6px;
        background: rgba(0,0,0,0.1);
        border-top: 1px solid rgba(255,255,255,0.04);
        border-bottom: 1px solid rgba(255,255,255,0.02);
    }
    .st-main-title:first-child { border-top: none; }

    /* ── Actions buttons (Données / Liens) ── */
    .st-action-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
        padding: 12px 18px;
    }
    .st-action-btn {
        display: flex; align-items: center; gap: 8px;
        padding: 10px 12px; border-radius: 9px;
        background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
        color: #e2e8f0; font-size: 12px; font-weight: 500; font-family: inherit;
        cursor: pointer; transition: all .15s; text-decoration: none;
        justify-content: flex-start;
    }
    .st-action-btn:hover { background: rgba(2,132,199,0.2); border-color: rgba(2,132,199,0.4); color: #fff; }
    .st-action-btn svg { width: 15px; height: 15px; stroke: currentColor; fill: none; flex-shrink: 0; }
    
    .st-action-btn.full-w { grid-column: 1 / -1; }
    
    /* Bouton Actualiser en cours de chargement */
    .st-action-btn.loading svg { animation: st-spin 0.7s linear infinite; }
    @keyframes st-spin { to { transform: rotate(360deg); } }

    /* Stale dot pour Actualiser */
    .st-stale-dot {
        width: 6px; height: 6px; border-radius: 50%; background: #ef4444;
        display: none; position: absolute; top: 6px; right: 6px;
    }
    #btn-st-refresh { position: relative; }
    #btn-st-refresh.stale .st-stale-dot { display: block; }
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    // Injection du panneau HTML
    document.body.insertAdjacentHTML('beforeend', `
    <div id="settings-overlay">
        <div id="settings-panel">

            <div id="settings-header">
                <div id="settings-header-icon">
                    <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                </div>
                <div id="settings-header-text">
                    <div id="settings-header-title">Paramètres Système</div>
                    <div id="settings-header-sub">Gérez vos données et notifications</div>
                </div>
                <button id="settings-close-btn" onclick="closeSettingsPanel()">
                    <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
            </div>

            <div id="settings-body">
                
                <!-- DONNÉES -->
                <div class="st-main-title">🔄 Données & Action</div>
                <div class="st-action-grid">
                    <button class="st-action-btn" id="btn-st-refresh" onclick="stRefreshData()">
                        <div class="st-stale-dot"></div>
                        <svg viewBox="0 0 24 24"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                        Actualiser
                    </button>
                    <button class="st-action-btn" onclick="openSyncPanel(); closeSettingsPanel();">
                        <svg viewBox="0 0 24 24"><path d="M8 17l-4-4 4-4"/><path d="M4 13h10.5a4.5 4.5 0 0 0 0-9H11"/><path d="M16 7l4 4-4 4"/><path d="M20 11H9.5a4.5 4.5 0 0 0 0 9H13"/></svg>
                        Sync Offline
                    </button>
                    <button class="st-action-btn" onclick="exportExcel(); closeSettingsPanel();">
                        <svg viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                        Export Excel
                    </button>
                    <button class="st-action-btn" onclick="cpToggle(); closeSettingsPanel();">
                        <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        Ouvrir Chat
                    </button>
                </div>

                <!-- NOTIFICATIONS (Récupération des IDs de notif-settings.js) -->
                <div class="st-main-title">🔔 Filtres de Notifications</div>
                
                <div id="ns-master">
                    <div>
                        <div id="ns-master-label">Activer les alertes</div>
                        <div id="ns-master-sub">Afficher les badges et toasts</div>
                    </div>
                    <label class="ns-toggle">
                        <input type="checkbox" id="ns-toggle-main" onchange="nsToggleMain(this.checked)" checked/>
                        <div class="ns-toggle-track"></div>
                    </label>
                </div>

                <div id="ns-body">
                    <!-- Urgence -->
                    <div class="ns-section">
                        <div class="ns-section-header">
                            <div class="ns-section-title">
                                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                Urgence
                            </div>
                            <button class="ns-select-all" onclick="nsToggleAll('urgencies', ['high','mid','low'])">Tout</button>
                        </div>
                        <div class="ns-chips" id="ns-chips-urgency">
                            <div class="ns-chip urg-high active" data-group="urgencies" data-val="high" onclick="nsChipToggle(this)">🔴 Critique</div>
                            <div class="ns-chip urg-mid active" data-group="urgencies" data-val="mid" onclick="nsChipToggle(this)">🟡 Moyen</div>
                            <div class="ns-chip urg-low active" data-group="urgencies" data-val="low" onclick="nsChipToggle(this)">⚪ Faible</div>
                        </div>
                    </div>

                    <div class="ns-sep"></div>

                    <!-- Type d'alerte -->
                    <div class="ns-section">
                        <div class="ns-section-header">
                            <div class="ns-section-title">
                                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                Type d'alerte
                            </div>
                            <button class="ns-select-all" onclick="nsToggleAll('dotTypes', ['dot-late','dot-today','dot-send','dot-approve','dot-nopo','dot-risk'])">Tout</button>
                        </div>
                        <div class="ns-chips">
                            <div class="ns-chip type-active-late active" data-group="dotTypes" data-val="dot-late" onclick="nsChipToggle(this)"><span class="ns-chip-dot" style="background:#FF6B6B"></span>En retard</div>
                            <div class="ns-chip type-active-today active" data-group="dotTypes" data-val="dot-today" onclick="nsChipToggle(this)"><span class="ns-chip-dot" style="background:#FFD600"></span>Aujourd'hui</div>
                            <div class="ns-chip type-active-send active" data-group="dotTypes" data-val="dot-send" onclick="nsChipToggle(this)"><span class="ns-chip-dot" style="background:#22C55E"></span>À envoyer</div>
                            <div class="ns-chip type-active-approve active" data-group="dotTypes" data-val="dot-approve" onclick="nsChipToggle(this)"><span class="ns-chip-dot" style="background:#3B82F6"></span>Approval</div>
                            <div class="ns-chip type-active-nopo active" data-group="dotTypes" data-val="dot-nopo" onclick="nsChipToggle(this)"><span class="ns-chip-dot" style="background:#D946EF"></span>Info manquante</div>
                            <div class="ns-chip type-active-risk active" data-group="dotTypes" data-val="dot-risk" onclick="nsChipToggle(this)"><span class="ns-chip-dot" style="background:#EAB308"></span>À risque</div>
                        </div>
                    </div>

                    <div class="ns-sep"></div>

                    <!-- Clients -->
                    <div class="ns-section">
                        <div class="ns-section-header">
                            <div class="ns-section-title">
                                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                Clients
                            </div>
                            <div style="display:flex;gap:8px;align-items:center;">
                                <span id="ns-count-clients" class="ns-section-count"></span>
                                <button class="ns-select-all" onclick="nsSelectAllClients()">Tout</button>
                            </div>
                        </div>
                        <div class="ns-chips" id="ns-chips-clients">
                            <div class="ns-empty">Chargement…</div>
                        </div>
                    </div>

                    <div class="ns-sep"></div>

                    <!-- Saisons -->
                    <div class="ns-section">
                        <div class="ns-section-header">
                            <div class="ns-section-title">
                                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                Saisons
                            </div>
                            <div style="display:flex;gap:8px;align-items:center;">
                                <span id="ns-count-saisons" class="ns-section-count"></span>
                                <button class="ns-select-all" onclick="nsSelectAllSaisons()">Tout</button>
                            </div>
                        </div>
                        <div class="ns-chips" id="ns-chips-saisons">
                            <div class="ns-empty">Chargement…</div>
                        </div>
                    </div>

                    <div class="ns-sep"></div>

                    <!-- Menus source -->
                    <div class="ns-section">
                        <div class="ns-section-header">
                            <div class="ns-section-title">
                                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                                Menus source
                            </div>
                            <div style="display:flex;gap:8px;align-items:center;">
                                <span id="ns-count-sheets" class="ns-section-count"></span>
                                <button class="ns-select-all" onclick="nsSelectAllSheets()">Tout</button>
                            </div>
                        </div>
                        <div class="ns-chips" id="ns-chips-sheets">
                            <div class="ns-empty">Chargement…</div>
                        </div>
                    </div>
                </div>

                <!-- LIENS RAPIDES -->
                <div class="st-main-title">🔗 Liens Rapides</div>
                <div class="st-action-grid">
                    <a class="st-action-btn" href="admin.html" target="_blank">
                        <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        Admin Panel
                    </a>
                    <a class="st-action-btn" href="access-request.html" target="_blank">
                        <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                        Demander un accès
                    </a>
                </div>

            </div><!-- /#settings-body -->

            <div id="ns-footer">
                <button id="ns-reset-btn" onclick="nsReset()">
                    <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                    Réinitialiser Filtres
                </button>
                <div id="ns-active-count"></div>
            </div>

        </div>
    </div>
    `);

    // ── GESTION DES CLICS ──
    window.openSettingsPanel = function () {
        // Appeler la fonction existante de notif-settings.js pour repeupler les chips
        if (typeof window.nsOpen === 'function') {
            window.nsOpen(); // Ceci va aussi synchroniser le #ns-body et les chips
            
            // S'assurer que le panel unifié s'ouvre bien au cas où notif-settings manipulait l'ancien #ns-overlay
            document.getElementById('settings-overlay').classList.add('open');
        } else {
            document.getElementById('settings-overlay').classList.add('open');
        }
    };

    window.closeSettingsPanel = function () {
        document.getElementById('settings-overlay').classList.remove('open');
        // Optionnel : fermer aussi côté nsClose s'il reste des dépendances
        if (typeof window.nsClose === 'function') window.nsClose();
    };

    // Fermer en cliquant à l'extérieur
    document.getElementById('settings-overlay').addEventListener('click', function (e) {
        if (e.target === this) closeSettingsPanel();
    });

    // ── ACTION: ACTUALISER ──
    window.stRefreshData = function() {
        if (typeof window.fetchAllData !== 'function') return;
        
        const btn = document.getElementById('btn-st-refresh');
        btn.classList.add('loading');
        btn.classList.remove('stale');
        
        // Cacher le dot global s'il existe
        const dot = document.getElementById('refresh-dot');
        if (dot) dot.style.display = 'none';

        const p = window.fetchAllData();
        if (p && typeof p.finally === 'function') {
            p.finally(() => btn.classList.remove('loading'));
        } else {
            setTimeout(() => btn.classList.remove('loading'), 3000);
        }
    };

    // Observer pour le stale dot (Actualiser)
    function watchRefreshDot() {
        const dot = document.getElementById('refresh-dot');
        if (!dot) { setTimeout(watchRefreshDot, 500); return; }

        const observer = new MutationObserver(function () {
            const btn = document.getElementById('btn-st-refresh');
            if (!btn) return;
            const isStale = dot.style.display !== 'none';
            btn.classList.toggle('stale', isStale);
        });
        observer.observe(dot, { attributes: true, attributeFilter: ['style'] });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', watchRefreshDot);
    } else {
        watchRefreshDot();
    }

})();
