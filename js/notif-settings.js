// ═══════════════════════════════════════════════════════════════
// ─── NOTIFICATION SETTINGS — AW27 CHECKERS ────────────────────
// ═══════════════════════════════════════════════════════════════
(function () {
    'use strict';

    /* ── Storage key ──────────────────────────────────────────── */
    const STORE_KEY = 'aw27_notif_prefs';

    /* ── Defaults ─────────────────────────────────────────────── */
    const DEFAULT_PREFS = {
        enabled: true,
        clients: [],
        saisons: [],
        sheets: [],
        urgencies: ['high', 'mid', 'low'],
        dotTypes: ['dot-late', 'dot-today', 'dot-send', 'dot-approve', 'dot-nopo', 'dot-risk'],
    };

    /* ── Load / Save prefs ────────────────────────────────────── */
    function loadPrefs() {
        try {
            const raw = localStorage.getItem(STORE_KEY);
            return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS };
        } catch (e) { return { ...DEFAULT_PREFS }; }
    }

    function savePrefs(prefs) {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(prefs)); } catch (e) {}
        showFilterPill();
    }

    window._notifPrefs = loadPrefs();

    /* ── Filter hook ─────────────────────────────────────────── */
    window._notifFilter = function (item) {
        const p = window._notifPrefs;
        if (!p.enabled) return false;
        if (p.clients.length && !p.clients.includes(item.client)) return false;
        if (p.urgencies.length && !p.urgencies.includes(item.urgency)) return false;
        if (p.dotTypes.length && !p.dotTypes.includes(item.dotCls)) return false;
        if (p.sheets.length && !p.sheets.includes(item.sheet)) return false;
        if (p.saisons.length && item.style) {
            try {
                const details = window.state?.data?.details || [];
                const det = details.find(r => r.Style === item.style);
                const saison = det?.Saison || '';
                if (!saison || !p.saisons.includes(saison)) return false;
            } catch (e) {}
        }
        return true;
    };

    /* ── Patch collectAllAlerts ───────────────────────────────── */
    function patchCollectAllAlerts() {
        if (!window.collectAllAlerts) { setTimeout(patchCollectAllAlerts, 400); return; }
        if (window._origCollectAllAlerts) return; // déjà patché
        window._origCollectAllAlerts = window.collectAllAlerts;
        window.collectAllAlerts = function () {
            const all = window._origCollectAllAlerts();
            const filter = window._notifFilter;
            if (!filter) return all;
            const filtered = {};
            Object.keys(all).forEach(k => {
                const items = all[k].items.filter(filter);
                if (items.length) filtered[k] = { label: all[k].label, items };
            });
            return filtered;
        };
    }
    patchCollectAllAlerts();

    /* ── CSS ──────────────────────────────────────────────────── */
    const css = document.createElement('style');
    css.textContent = `
    #ns-overlay {
        position: fixed; inset: 0; z-index: 20000;
        background: rgba(0,0,0,0.45);
        backdrop-filter: blur(3px);
        display: none; align-items: flex-start; justify-content: flex-end;
        padding: 72px 16px 0 0;
        animation: ns-fade-in .18s ease;
    }
    #ns-overlay.open { display: flex; }
    @keyframes ns-fade-in { from { opacity:0 } to { opacity:1 } }

    #ns-panel {
        width: 370px; max-height: 82vh;
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

    #ns-header {
        display: flex; align-items: center; gap: 10px;
        padding: 15px 18px 14px;
        background: linear-gradient(135deg, rgba(2,132,199,0.3), rgba(99,102,241,0.2));
        border-bottom: 1px solid rgba(255,255,255,0.08);
        flex-shrink: 0;
    }
    #ns-header-icon {
        width: 34px; height: 34px; border-radius: 10px;
        background: rgba(2,132,199,0.25); border: 1px solid rgba(2,132,199,0.4);
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    #ns-header-icon svg { width: 16px; height: 16px; stroke: #7dd3fc; fill: none; }
    #ns-header-text { flex: 1; }
    #ns-header-title { font-size: 14px; font-weight: 600; color: #f1f5f9; }
    #ns-header-sub { font-size: 11px; color: #64748b; margin-top: 1px; }
    #ns-close-btn {
        width: 28px; height: 28px; border-radius: 8px;
        background: rgba(255,255,255,0.07); border: none;
        color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: all .15s;
    }
    #ns-close-btn:hover { background: rgba(255,255,255,0.14); color: #f1f5f9; }
    #ns-close-btn svg { width: 13px; height: 13px; fill: currentColor; }

    #ns-master {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 18px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        flex-shrink: 0;
    }
    #ns-master-label { font-size: 12.5px; font-weight: 500; color: #cbd5e1; }
    #ns-master-sub { font-size: 10.5px; color: #475569; margin-top: 1px; }
    .ns-toggle { position: relative; width: 40px; height: 22px; flex-shrink: 0; }
    .ns-toggle input { opacity: 0; width: 0; height: 0; }
    .ns-toggle-track {
        position: absolute; inset: 0; border-radius: 11px;
        background: #1e293b; border: 1px solid rgba(255,255,255,0.1);
        cursor: pointer; transition: background .2s;
    }
    .ns-toggle input:checked + .ns-toggle-track { background: #0284c7; border-color: #0284c7; }
    .ns-toggle-track::after {
        content: ''; position: absolute;
        top: 3px; left: 3px; width: 14px; height: 14px;
        background: #64748b; border-radius: 50%;
        transition: transform .2s, background .2s;
    }
    .ns-toggle input:checked + .ns-toggle-track::after { transform: translateX(18px); background: #fff; }

    #ns-body { flex: 1; overflow-y: auto; padding: 6px 0 10px; }
    #ns-body::-webkit-scrollbar { width: 3px; }
    #ns-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }

    .ns-section { padding: 10px 18px 6px; }
    .ns-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .ns-section-title {
        display: flex; align-items: center; gap: 7px;
        font-size: 10.5px; font-weight: 600; color: #64748b;
        text-transform: uppercase; letter-spacing: .07em;
    }
    .ns-section-title svg { width: 12px; height: 12px; stroke: #64748b; fill: none; }
    .ns-section-count { font-size: 10px; color: #475569; }
    .ns-select-all {
        font-size: 10.5px; color: #0284c7; cursor: pointer;
        background: none; border: none; padding: 0;
        font-family: inherit; transition: color .15s;
    }
    .ns-select-all:hover { color: #38bdf8; }

    .ns-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .ns-chip {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 4px 10px; border-radius: 20px; cursor: pointer;
        font-size: 11.5px; font-weight: 500;
        border: 1px solid rgba(255,255,255,0.07);
        background: rgba(255,255,255,0.03);
        color: #334155; transition: all .15s; user-select: none; opacity: 0.4;
    }
    .ns-chip:hover { border-color: rgba(255,255,255,0.15); color: #64748b; opacity: 0.65; }
    .ns-chip.active { border-color: transparent; color: #f1f5f9; opacity: 1; }
    .ns-chip-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

    .ns-chip.urg-high.active { background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.4); color: #fca5a5; }
    .ns-chip.urg-mid.active  { background: rgba(245,158,11,0.2); border-color: rgba(245,158,11,0.4); color: #fde68a; }
    .ns-chip.urg-low.active  { background: rgba(100,116,139,0.2); border-color: rgba(100,116,139,0.4); color: #94a3b8; }

    .ns-chip.type-active-late.active    { background: rgba(255,107,107,0.15); border-color: rgba(255,107,107,0.35); color: #fca5a5; }
    .ns-chip.type-active-today.active   { background: rgba(255,214,0,0.12); border-color: rgba(255,214,0,0.35); color: #fef08a; }
    .ns-chip.type-active-send.active    { background: rgba(34,197,94,0.12); border-color: rgba(34,197,94,0.35); color: #86efac; }
    .ns-chip.type-active-approve.active { background: rgba(59,130,246,0.12); border-color: rgba(59,130,246,0.35); color: #93c5fd; }
    .ns-chip.type-active-nopo.active    { background: rgba(217,70,239,0.12); border-color: rgba(217,70,239,0.35); color: #e879f9; }
    .ns-chip.type-active-risk.active    { background: rgba(234,179,8,0.12); border-color: rgba(234,179,8,0.35); color: #fde047; }

    .ns-chip.entity.active { background: rgba(2,132,199,0.2); border-color: rgba(2,132,199,0.45); color: #7dd3fc; }

    .ns-sep { height: 1px; background: rgba(255,255,255,0.06); margin: 4px 18px; }
    .ns-empty { font-size: 11px; color: #334155; padding: 4px 0; }

    #ns-footer {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 18px;
        border-top: 1px solid rgba(255,255,255,0.07);
        background: rgba(255,255,255,0.02);
        flex-shrink: 0;
    }
    #ns-reset-btn {
        font-size: 11.5px; color: #475569; background: none; border: none;
        cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 5px;
        padding: 6px 10px; border-radius: 7px; transition: all .15s;
    }
    #ns-reset-btn:hover { color: #94a3b8; background: rgba(255,255,255,0.06); }
    #ns-reset-btn svg { width: 12px; height: 12px; stroke: currentColor; fill: none; }
    #ns-active-count { font-size: 11px; color: #64748b; }
    #ns-active-count span { color: #38bdf8; font-weight: 600; }

    #ns-body.disabled { opacity: 0.35; pointer-events: none; }

    @keyframes row-highlight-anim {
        0%  { background: rgba(2,132,199,0.18); }
        70% { background: rgba(2,132,199,0.10); }
        100%{ background: transparent; }
    }
    .row-highlight { animation: row-highlight-anim 3s ease forwards !important; }

    /* Pill filtre actif sur le bouton cloche */
    #ns-filter-pill {
        position: absolute; top: -6px; left: -6px;
        width: 11px; height: 11px; border-radius: 50%;
        background: #0284c7; border: 2px solid rgba(15,23,42,0.8);
        z-index: 1; pointer-events: none;
    }
    `;
    document.head.appendChild(css);

    /* ── HTML Panel notifs ────────────────────────────────────── */
    document.body.insertAdjacentHTML('beforeend', `
    <div id="ns-overlay">
      <div id="ns-panel">

        <!-- Header -->
        <div id="ns-header">
          <div id="ns-header-icon">
            <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div id="ns-header-text">
            <div id="ns-header-title">Filtres de notifications</div>
            <div id="ns-header-sub">Personnalisez vos alertes</div>
          </div>
          <button id="ns-close-btn" onclick="nsClose()">
            <svg viewBox="0 0 10 10"><path d="M1 1l8 8M9 1l-8 8"/></svg>
          </button>
        </div>

        <!-- Master toggle -->
        <div id="ns-master">
          <div>
            <div id="ns-master-label">Notifications actives</div>
            <div id="ns-master-sub">Activer / désactiver toutes les alertes</div>
          </div>
          <label class="ns-toggle">
            <input type="checkbox" id="ns-toggle-main" checked onchange="nsToggleMain(this.checked)"/>
            <span class="ns-toggle-track"></span>
          </label>
        </div>

        <div id="ns-body">

          <!-- Urgence -->
          <div class="ns-section">
            <div class="ns-section-header">
              <div class="ns-section-title">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Urgence
              </div>
            </div>
            <div class="ns-chips">
              <div class="ns-chip urg-high active" data-group="urgencies" data-val="high" onclick="nsChipToggle(this)">
                <span class="ns-chip-dot" style="background:#ef4444"></span> Critique
              </div>
              <div class="ns-chip urg-mid active" data-group="urgencies" data-val="mid" onclick="nsChipToggle(this)">
                <span class="ns-chip-dot" style="background:#f59e0b"></span> Moyen
              </div>
              <div class="ns-chip urg-low active" data-group="urgencies" data-val="low" onclick="nsChipToggle(this)">
                <span class="ns-chip-dot" style="background:#64748b"></span> Faible
              </div>
            </div>
          </div>

          <div class="ns-sep"></div>

          <!-- Types d'alerte -->
          <div class="ns-section">
            <div class="ns-section-header">
              <div class="ns-section-title">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Type d'alerte
              </div>
            </div>
            <div class="ns-chips">
              <div class="ns-chip type-active-late active" data-group="dotTypes" data-val="dot-late" onclick="nsChipToggle(this)">
                <span class="ns-chip-dot" style="background:#ff6b6b"></span> En retard
              </div>
              <div class="ns-chip type-active-today active" data-group="dotTypes" data-val="dot-today" onclick="nsChipToggle(this)">
                <span class="ns-chip-dot" style="background:#ffd600"></span> Aujourd'hui
              </div>
              <div class="ns-chip type-active-send active" data-group="dotTypes" data-val="dot-send" onclick="nsChipToggle(this)">
                <span class="ns-chip-dot" style="background:#22c55e"></span> À envoyer
              </div>
              <div class="ns-chip type-active-approve active" data-group="dotTypes" data-val="dot-approve" onclick="nsChipToggle(this)">
                <span class="ns-chip-dot" style="background:#3b82f6"></span> Approval
              </div>
              <div class="ns-chip type-active-nopo active" data-group="dotTypes" data-val="dot-nopo" onclick="nsChipToggle(this)">
                <span class="ns-chip-dot" style="background:#d946ef"></span> No PO
              </div>
              <div class="ns-chip type-active-risk active" data-group="dotTypes" data-val="dot-risk" onclick="nsChipToggle(this)">
                <span class="ns-chip-dot" style="background:#eab308"></span> Risque
              </div>
            </div>
          </div>

          <div class="ns-sep"></div>

          <!-- Clients -->
          <div class="ns-section">
            <div class="ns-section-header">
              <div class="ns-section-title">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Clients
              </div>
              <span class="ns-section-count" id="ns-count-clients">Tous</span>
            </div>
            <div class="ns-chips" id="ns-chips-clients">
              <div class="ns-empty">Chargement…</div>
            </div>
            <button class="ns-select-all" style="margin-top:6px" onclick="nsSelectAllClients()">Tout sélectionner</button>
          </div>

          <div class="ns-sep"></div>

          <!-- Saisons -->
          <div class="ns-section">
            <div class="ns-section-header">
              <div class="ns-section-title">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Saisons
              </div>
              <span class="ns-section-count" id="ns-count-saisons">Toutes</span>
            </div>
            <div class="ns-chips" id="ns-chips-saisons">
              <div class="ns-empty">Chargement…</div>
            </div>
            <button class="ns-select-all" style="margin-top:6px" onclick="nsSelectAllSaisons()">Tout sélectionner</button>
          </div>

          <div class="ns-sep"></div>

          <!-- Menus source -->
          <div class="ns-section">
            <div class="ns-section-header">
              <div class="ns-section-title">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                Menus source
              </div>
              <span class="ns-section-count" id="ns-count-sheets">Tous</span>
            </div>
            <div class="ns-chips" id="ns-chips-sheets">
              <div class="ns-empty">Chargement…</div>
            </div>
            <button class="ns-select-all" style="margin-top:6px" onclick="nsSelectAllSheets()">Tout sélectionner</button>
          </div>

        </div><!-- /#ns-body -->

        <!-- Footer -->
        <div id="ns-footer">
          <button id="ns-reset-btn" onclick="nsReset()">
            <svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
            Réinitialiser
          </button>
          <div id="ns-active-count"></div>
        </div>

      </div>
    </div>
    `);

    /* ── Open / Close ─────────────────────────────────────────── */
    window.nsOpen = function () {
        _nsPopulateRetries = 0;
        nsPopulateChips();
        nsSync();
        document.getElementById('ns-overlay').classList.add('open');
    };

    window.nsClose = function () {
        document.getElementById('ns-overlay').classList.remove('open');
    };

    document.getElementById('ns-overlay').addEventListener('click', function (e) {
        if (e.target === this) nsClose();
    });

    /* ── Populate dynamic chips ───────────────────────────────── */
    let _nsPopulateRetries = 0;
    function nsPopulateChips() {
        const state = window.state || {};
        const data = state.data || {};
        const details = data.details || [];
        const isLoading = state.loading !== false;
        const hasNoDetails = !details.length;

        if (isLoading && hasNoDetails && _nsPopulateRetries < 30) {
            _nsPopulateRetries++;
            setTimeout(nsPopulateChips, 500);
            return;
        }
        _nsPopulateRetries = 0;

        const SHEET_CONFIG = window.SHEET_CONFIG || {};
        const allRows = Object.values(data).flat().filter(r => r && typeof r === 'object');
        const clients = [...new Set(allRows.map(r => r.Client).filter(Boolean))].sort();
        const saisons = [...new Set(details.map(r => r.Saison || '').filter(Boolean))].sort();
        const knownLabels = { details: 'Détails Styles', sample: 'Sample', ordering: 'Ordering', style: 'Style' };
        const sheets = Object.entries(data)
            .filter(([k, v]) => Array.isArray(v) && v.length > 0 && !k.startsWith('_'))
            .map(([k]) => ({ key: k, label: SHEET_CONFIG[k]?.label || knownLabels[k] || k }))
            .sort((a, b) => a.label.localeCompare(b.label));

        const p = window._notifPrefs;

        const clientsEl = document.getElementById('ns-chips-clients');
        if (clients.length) {
            clientsEl.innerHTML = clients.map(c => `
                <div class="ns-chip entity ${p.clients.length === 0 || p.clients.includes(c) ? 'active' : ''}"
                     data-group="clients" data-val="${_nsEsc(c)}" onclick="nsChipToggle(this)">
                    ${_nsEsc(c)}
                </div>`).join('');
        } else {
            clientsEl.innerHTML = '<div class="ns-empty">Aucun client trouvé</div>';
        }

        const saisonsEl = document.getElementById('ns-chips-saisons');
        if (saisons.length) {
            saisonsEl.innerHTML = saisons.map(s => `
                <div class="ns-chip entity ${p.saisons.length === 0 || p.saisons.includes(s) ? 'active' : ''}"
                     data-group="saisons" data-val="${_nsEsc(s)}" onclick="nsChipToggle(this)">
                    📅 ${_nsEsc(s)}
                </div>`).join('');
        } else {
            saisonsEl.innerHTML = '<div class="ns-empty">Aucune saison trouvée</div>';
        }

        const sheetsEl = document.getElementById('ns-chips-sheets');
        if (sheets.length) {
            sheetsEl.innerHTML = sheets.map(({ key, label }) => `
                <div class="ns-chip entity ${p.sheets.length === 0 || p.sheets.includes(key) ? 'active' : ''}"
                     data-group="sheets" data-val="${_nsEsc(key)}" onclick="nsChipToggle(this)">
                    ${_nsEsc(label)}
                </div>`).join('');
        } else {
            sheetsEl.innerHTML = '<div class="ns-empty">Aucun menu source</div>';
        }

        nsUpdateCounts();
    }

    function _nsEsc(s) {
        return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    /* ── Sync UI ← prefs ─────────────────────────────────────── */
    function nsSync() {
        const p = window._notifPrefs;
        const tog = document.getElementById('ns-toggle-main');
        if (tog) tog.checked = p.enabled;
        const body = document.getElementById('ns-body');
        if (body) body.classList.toggle('disabled', !p.enabled);

        document.querySelectorAll('[data-group="urgencies"]').forEach(chip => {
            chip.classList.toggle('active', p.urgencies.includes(chip.dataset.val));
        });
        document.querySelectorAll('[data-group="dotTypes"]').forEach(chip => {
            chip.classList.toggle('active', p.dotTypes.includes(chip.dataset.val));
        });
        ['clients', 'saisons', 'sheets'].forEach(group => {
            const arr = p[group];
            document.querySelectorAll(`[data-group="${group}"]`).forEach(chip => {
                chip.classList.toggle('active', arr.length === 0 || arr.includes(chip.dataset.val));
            });
        });

        nsUpdateCounts();
        nsUpdateFooter();
    }

    function nsUpdateCounts() {
        const p = window._notifPrefs;
        const clientChips = document.querySelectorAll('[data-group="clients"]').length;
        const saisonChips = document.querySelectorAll('[data-group="saisons"]').length;
        const sheetChips  = document.querySelectorAll('[data-group="sheets"]').length;
        const cc  = document.getElementById('ns-count-clients');
        const sc  = document.getElementById('ns-count-saisons');
        const shc = document.getElementById('ns-count-sheets');
        if (cc)  cc.textContent  = p.clients.length === 0 ? `Tous (${clientChips})` : `${p.clients.length}/${clientChips}`;
        if (sc)  sc.textContent  = p.saisons.length === 0 ? `Toutes (${saisonChips})` : `${p.saisons.length}/${saisonChips}`;
        if (shc) shc.textContent = p.sheets.length  === 0 ? `Tous (${sheetChips})` : `${p.sheets.length}/${sheetChips}`;
    }

    function nsUpdateFooter() {
        const el = document.getElementById('ns-active-count');
        if (!el) return;
        try {
            const all      = window._origCollectAllAlerts ? window._origCollectAllAlerts() : {};
            const total    = Object.values(all).reduce((s, v) => s + v.items.length, 0);
            const filtered = Object.values(window.collectAllAlerts()).reduce((s, v) => s + v.items.length, 0);
            el.innerHTML = `<span>${filtered}</span> / ${total} alertes affichées`;
        } catch (e) { el.innerHTML = ''; }
    }

    /* ── Chip toggle ─────────────────────────────────────────── */
    window.nsChipToggle = function (chip) {
        const group = chip.dataset.group;
        const val   = chip.dataset.val;
        const p     = window._notifPrefs;
        const isEntityGroup = ['clients', 'saisons', 'sheets'].includes(group);

        if (isEntityGroup) {
            const chips   = [...document.querySelectorAll(`[data-group="${group}"]`)];
            const allVals = chips.map(c => c.dataset.val);
            if (p[group].length === 0) {
                p[group] = allVals.filter(v => v !== val);
            } else {
                const idx = p[group].indexOf(val);
                if (idx === -1) {
                    p[group].push(val);
                    if (p[group].length === allVals.length) p[group] = [];
                } else {
                    p[group].splice(idx, 1);
                    if (p[group].length === 0) p[group] = [];
                }
            }
        } else {
            const idx = p[group].indexOf(val);
            if (idx === -1) { p[group].push(val); }
            else if (p[group].length > 1) { p[group].splice(idx, 1); }
        }

        savePrefs(p);
        nsSync();
        nsRefreshNotifBadge();
    };

    /* ── Select all helpers ───────────────────────────────────── */
    window.nsSelectAllClients = function () { window._notifPrefs.clients = []; savePrefs(window._notifPrefs); nsSync(); nsRefreshNotifBadge(); };
    window.nsSelectAllSaisons = function () { window._notifPrefs.saisons = []; savePrefs(window._notifPrefs); nsSync(); nsRefreshNotifBadge(); };
    window.nsSelectAllSheets  = function () { window._notifPrefs.sheets  = []; savePrefs(window._notifPrefs); nsSync(); nsRefreshNotifBadge(); };

    /* ── Master toggle ────────────────────────────────────────── */
    window.nsToggleMain = function (checked) {
        window._notifPrefs.enabled = checked;
        savePrefs(window._notifPrefs);
        const body = document.getElementById('ns-body');
        if (body) body.classList.toggle('disabled', !checked);
        nsRefreshNotifBadge();
        nsUpdateFooter();
    };

    /* ── Reset ────────────────────────────────────────────────── */
    window.nsReset = function () {
        window._notifPrefs = { ...DEFAULT_PREFS };
        savePrefs(window._notifPrefs);
        nsPopulateChips();
        nsSync();
        nsRefreshNotifBadge();
    };

    /* ── Refresh badge ────────────────────────────────────────── */
    function nsRefreshNotifBadge() {
        if (typeof window.updateGlobalNotifBadge === 'function') window.updateGlobalNotifBadge();
        if (document.getElementById('global-notif-drawer')?.classList.contains('open')) {
            if (typeof window._renderGndFull === 'function') window._renderGndFull();
        }
        nsUpdateFooter();
    }

    /* ── Pill filtre actif ────────────────────────────────────── */
    function showFilterPill() {
        const p   = window._notifPrefs;
        const btn = document.getElementById('btn-notif-global');
        if (!btn) return;
        const existing  = document.getElementById('ns-filter-pill');
        const hasFilters = p.clients.length > 0 || p.saisons.length > 0 || p.sheets.length > 0
            || p.urgencies.length < 3 || p.dotTypes.length < 6 || !p.enabled;

        if (hasFilters && !existing) {
            const pill = document.createElement('span');
            pill.id = 'ns-filter-pill';
            btn.style.position = 'relative';
            btn.appendChild(pill);
        } else if (!hasFilters && existing) {
            existing.remove();
        }
    }

    /* ── Shortcut ⚙ dans le drawer GND ───────────────────────── */
    function injectGndSettingsShortcut() {
        const gndPanel = document.getElementById('global-notif-drawer');
        if (!gndPanel) { setTimeout(injectGndSettingsShortcut, 600); return; }
        if (document.getElementById('gnd-settings-shortcut')) return;
        const headerActions = gndPanel.querySelector('.gnd-header-actions');
        if (!headerActions) { setTimeout(injectGndSettingsShortcut, 400); return; }

        const shortcut = document.createElement('button');
        shortcut.id        = 'gnd-settings-shortcut';
        shortcut.className = 'gnd-export-btn';
        shortcut.style.cssText = 'display:flex;align-items:center;gap:5px;';
        shortcut.title     = 'Filtres notifications';
        shortcut.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="13" height="13">
            <circle cx="12" cy="12" r="3"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg> Filtres`;
        shortcut.onclick = function (e) {
            e.stopPropagation();
            nsOpen();
        };
        headerActions.insertBefore(shortcut, headerActions.firstChild);
    }

    new MutationObserver(() => injectGndSettingsShortcut())
        .observe(document.body, { childList: true, subtree: false });

    /* ── Init ─────────────────────────────────────────────────── */
    setInterval(showFilterPill, 2000);
    setTimeout(() => {
        const tog = document.getElementById('ns-toggle-main');
        if (tog) tog.checked = window._notifPrefs.enabled;
        nsRefreshNotifBadge();
    }, 800);

    console.log('[AW27] Notif Settings chargé ✓');
})();
