// ============================================================
//  AW27 CHECKERS — Activity Log Module
//  Stocke l'historique des actions dans un onglet caché
//  _activity_log du Google Sheet (persistant, multi-utilisateur)
// ============================================================

(function () {
    'use strict';

    const LOG_MAX_DISPLAY = 200;

    // ═══════════════════════════════════════════════════════
    //  CSS
    // ═══════════════════════════════════════════════════════
    const css = document.createElement('style');
    css.id = 'activity-log-styles';
    css.textContent = `
    /* ── Drawer ── */
    #log-drawer {
        position: fixed; inset: 0; z-index: 1100;
        pointer-events: none; opacity: 0;
        transition: opacity 0.25s ease;
    }
    #log-drawer.open { pointer-events: all; opacity: 1; }
    .log-backdrop {
        position: absolute; inset: 0;
        background: rgba(15,23,42,0.32);
        backdrop-filter: blur(2px);
    }
    .log-panel {
        position: absolute; top: 0; right: 0;
        width: min(520px, 100vw); height: 100%;
        background: var(--bg-card, #fff);
        border-left: 1px solid var(--glass-border, #e5e7eb);
        box-shadow: -8px 0 40px rgba(0,0,0,0.12);
        display: flex; flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
    }
    #log-drawer.open .log-panel { transform: translateX(0); }

    /* Header */
    .log-header {
        display: flex; align-items: center; gap: 10px;
        padding: 14px 16px; border-bottom: 1px solid var(--glass-border, #e5e7eb);
        background: var(--bg-secondary, #f9fafb); flex-shrink: 0;
    }
    .log-header-icon {
        width: 34px; height: 34px; border-radius: 8px;
        background: #EDE9FE; color: #5B21B6;
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .log-header-title { font-size: 14px; font-weight: 700; color: var(--text-primary, #111827); }
    .log-header-sub { font-size: 11px; color: var(--text-muted, #9ca3af); margin-top: 1px; }
    .log-header-actions { display: flex; align-items: center; gap: 6px; margin-left: auto; }
    .log-close-btn {
        width: 30px; height: 30px; border-radius: 8px;
        border: 1px solid var(--glass-border, #e5e7eb);
        background: transparent; color: var(--text-muted, #9ca3af);
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: all .15s; flex-shrink: 0;
    }
    .log-close-btn:hover { background: #fef2f2; color: #dc2626; border-color: #fca5a5; }
    .log-export-btn {
        display: flex; align-items: center; gap: 4px;
        padding: 5px 10px; border-radius: 7px;
        border: 1px solid #16a34a; background: #f0fdf4; color: #16a34a;
        font-size: 11px; font-weight: 600; cursor: pointer;
        transition: all .15s; white-space: nowrap;
    }
    .log-export-btn:hover { background: #16a34a; color: #fff; }

    /* Filters */
    .log-filters {
        display: flex; gap: 5px; padding: 10px 16px;
        border-bottom: 1px solid var(--glass-border, #e5e7eb);
        flex-wrap: wrap; flex-shrink: 0;
        background: var(--bg-secondary, #f9fafb);
    }
    .log-fpill {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 3px 10px; border-radius: 20px;
        border: 0.5px solid var(--glass-border, #e5e7eb);
        font-size: 11px; font-weight: 500; color: var(--text-secondary, #6b7280);
        background: var(--bg-card, #fff);
        cursor: pointer; transition: all .12s; user-select: none;
    }
    .log-fpill:hover { border-color: #9ca3af; }
    .log-fpill.active { background: var(--text-primary, #111827); color: #fff; border-color: var(--text-primary, #111827); }
    .log-fpill-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

    /* Body */
    .log-body {
        flex: 1; overflow-y: auto; padding: 8px 12px 16px;
    }
    .log-body::-webkit-scrollbar { width: 4px; }
    .log-body::-webkit-scrollbar-thumb { background: var(--glass-border, #cbd5e1); border-radius: 2px; }

    /* Day separator */
    .log-day-sep {
        display: flex; align-items: center; gap: 8px;
        margin: 12px 0 6px; font-size: 10px; font-weight: 700;
        color: var(--text-muted, #9ca3af); text-transform: uppercase; letter-spacing: .06em;
    }
    .log-day-sep::before, .log-day-sep::after {
        content: ''; flex: 1; height: 0.5px; background: var(--glass-border, #e5e7eb);
    }

    /* Entry */
    .log-entry {
        display: flex; align-items: flex-start; gap: 10px;
        padding: 10px 12px; border-radius: 8px;
        border: 0.5px solid var(--glass-border, #e5e7eb);
        background: var(--bg-card, #fff); margin-bottom: 4px;
        transition: background .12s;
    }
    .log-entry:hover { background: var(--bg-secondary, #f9fafb); }
    .log-entry-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
    .ldot-create { background: #16a34a; box-shadow: 0 0 0 2px #bbf7d0; }
    .ldot-update { background: #2563eb; box-shadow: 0 0 0 2px #bfdbfe; }
    .ldot-delete { background: #dc2626; box-shadow: 0 0 0 2px #fecaca; }
    .ldot-upload { background: #7c3aed; box-shadow: 0 0 0 2px #ddd6fe; }
    .ldot-other  { background: #6b7280; box-shadow: 0 0 0 2px #e5e7eb; }
    .log-entry-info { flex: 1; min-width: 0; }
    .log-entry-action { font-size: 12.5px; font-weight: 500; color: var(--text-primary, #111827); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .log-entry-detail { font-size: 11px; color: var(--text-secondary, #6b7280); margin-top: 3px; line-height: 1.4; }
    .log-entry-time { font-size: 10px; color: var(--text-muted, #9ca3af); flex-shrink: 0; white-space: nowrap; margin-top: 4px; }
    .log-badge {
        display: inline-flex; padding: 1px 7px; border-radius: 4px;
        font-size: 9.5px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase;
    }
    .lbadge-create { background: #dcfce7; color: #166534; }
    .lbadge-update { background: #dbeafe; color: #1e40af; }
    .lbadge-delete { background: #fee2e2; color: #991b1b; }
    .lbadge-upload { background: #ede9fe; color: #5b21b6; }
    .lbadge-other  { background: #f1f5f9; color: #475569; }

    /* Empty */
    .log-empty {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 8px; padding: 48px 16px; color: var(--text-muted, #9ca3af); font-size: 13px;
    }

    /* Loading */
    .log-loading {
        display: flex; align-items: center; justify-content: center;
        gap: 8px; padding: 32px; color: var(--text-muted, #9ca3af); font-size: 12px;
    }
    @keyframes log-spin { to { transform: rotate(360deg); } }
    .log-spinner {
        width: 16px; height: 16px;
        border: 2px solid var(--glass-border, #e5e7eb);
        border-top-color: #7c3aed;
        border-radius: 50%; animation: log-spin 0.7s linear infinite;
    }

    /* Sidebar button */
    .nav-item-log .nav-icon { color: #7c3aed; }
    `;
    document.head.appendChild(css);

    // ═══════════════════════════════════════════════════════
    //  STATE
    // ═══════════════════════════════════════════════════════
    let _logs = [];
    let _activeFilter = '';
    let _logsLoaded = false;

    // ═══════════════════════════════════════════════════════
    //  DRAWER HTML
    // ═══════════════════════════════════════════════════════
    document.body.insertAdjacentHTML('beforeend', `
    <div id="log-drawer">
        <div class="log-backdrop" onclick="closeActivityLog()"></div>
        <div class="log-panel">
            <div class="log-header">
                <div class="log-header-icon"><i class="ti ti-history" style="font-size:17px" aria-hidden="true"></i></div>
                <div>
                    <div class="log-header-title">Journal d'activité</div>
                    <div class="log-header-sub" id="log-header-sub">Chargement...</div>
                </div>
                <div class="log-header-actions">
                    <button class="log-export-btn" onclick="exportActivityLog()" title="Exporter en Excel">
                        <i class="ti ti-download" style="font-size:13px" aria-hidden="true"></i> Export
                    </button>
                    <button class="log-close-btn" onclick="closeActivityLog()">
                        <i class="ti ti-x" style="font-size:14px" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
            <div class="log-filters" id="log-filters">
                <span class="log-fpill active" data-filter="" onclick="logSetFilter(this, '')">Tout</span>
                <span class="log-fpill" data-filter="CREATE" onclick="logSetFilter(this, 'CREATE')"><span class="log-fpill-dot ldot-create"></span>Créer</span>
                <span class="log-fpill" data-filter="UPDATE" onclick="logSetFilter(this, 'UPDATE')"><span class="log-fpill-dot ldot-update"></span>Modifier</span>
                <span class="log-fpill" data-filter="DELETE" onclick="logSetFilter(this, 'DELETE')"><span class="log-fpill-dot ldot-delete"></span>Supprimer</span>
                <span class="log-fpill" data-filter="UPLOAD" onclick="logSetFilter(this, 'UPLOAD')"><span class="log-fpill-dot ldot-upload"></span>Upload</span>
            </div>
            <div class="log-body" id="log-body">
                <div class="log-loading"><div class="log-spinner"></div> Chargement...</div>
            </div>
        </div>
    </div>
    `);

    // ═══════════════════════════════════════════════════════
    //  SIDEBAR BUTTON
    // ═══════════════════════════════════════════════════════
    function injectSidebarButton() {
        const nav = document.querySelector('.sidebar-nav');
        if (!nav || document.getElementById('btn-activity-log')) return;

        // Trouver le label "Système" pour insérer avant
        const labels = nav.querySelectorAll('.sidebar-section-label');
        let insertBefore = null;
        labels.forEach(l => {
            if (l.textContent.trim().toLowerCase().includes('syst')) insertBefore = l;
        });

        const btn = document.createElement('button');
        btn.className = 'nav-item';
        btn.id = 'btn-activity-log';
        btn.title = 'Journal d\'activité';
        btn.onclick = () => openActivityLog();
        btn.innerHTML = `
            <span class="nav-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#7c3aed" width="18" height="18">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            </span>
            <span class="nav-label">Journal</span>
        `;

        if (insertBefore) {
            nav.insertBefore(btn, insertBefore);
        } else {
            nav.appendChild(btn);
        }
    }

    // ═══════════════════════════════════════════════════════
    //  OPEN / CLOSE
    // ═══════════════════════════════════════════════════════
    window.openActivityLog = function () {
        const drawer = document.getElementById('log-drawer');
        if (drawer) {
            drawer.classList.add('open');
            if (!_logsLoaded) {
                fetchLogs();
            } else {
                renderLogs();
            }
        }
    };

    window.closeActivityLog = function () {
        const drawer = document.getElementById('log-drawer');
        if (drawer) drawer.classList.remove('open');
    };

    // ═══════════════════════════════════════════════════════
    //  FILTER
    // ═══════════════════════════════════════════════════════
    window.logSetFilter = function (pill, filter) {
        _activeFilter = filter;
        document.querySelectorAll('#log-filters .log-fpill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        renderLogs();
    };

    // ═══════════════════════════════════════════════════════
    //  FETCH LOGS FROM GAS
    // ═══════════════════════════════════════════════════════
    async function fetchLogs() {
        const body = document.getElementById('log-body');
        if (body) body.innerHTML = '<div class="log-loading"><div class="log-spinner"></div> Chargement des logs...</div>';

        const gasUrl = window.GOOGLE_APPS_SCRIPT_URL;
        if (!gasUrl || gasUrl === 'YOUR_WEB_APP_URL_HERE') {
            _logs = [];
            _logsLoaded = true;
            renderLogs();
            return;
        }

        try {
            const res = await fetch(gasUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                redirect: 'follow',
                body: JSON.stringify({ action: 'GET_LOGS', sheet: '_activity_log' })
            });
            const json = await res.json();
            if (json.status === 'ok' && Array.isArray(json.logs)) {
                _logs = json.logs;
            } else {
                _logs = [];
            }
        } catch (e) {
            console.warn('[ActivityLog] Fetch error:', e);
            _logs = [];
        }

        _logsLoaded = true;
        renderLogs();
    }

    // ═══════════════════════════════════════════════════════
    //  LOG AN ACTIVITY (write to GAS)
    // ═══════════════════════════════════════════════════════
    window.logActivity = function (action, sheet, detail, extra) {
        const userName = (window.currentUser && (window.currentUser.displayName || window.currentUser.email)) || 'Inconnu';
        const timestamp = new Date().toISOString();

        const entry = {
            timestamp: timestamp,
            user: userName,
            action: action,
            sheet: sheet || '',
            detail: detail || '',
            style: (extra && extra.style) || '',
            field: (extra && extra.field) || '',
            rowIndex: (extra && extra.rowIndex) || '',
            oldValue: (extra && extra.oldValue) || '',
            newValue: (extra && extra.newValue) || ''
        };

        // Ajouter au cache local immédiatement
        _logs.unshift(entry);
        if (_logs.length > 500) _logs.length = 500;

        // Envoyer au GAS en arrière-plan (non-bloquant)
        const gasUrl = window.GOOGLE_APPS_SCRIPT_URL;
        if (gasUrl && gasUrl !== 'YOUR_WEB_APP_URL_HERE') {
            fetch(gasUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                redirect: 'follow',
                body: JSON.stringify({ action: 'LOG_ACTIVITY', sheet: '_activity_log', entry: entry })
            }).catch(function (e) {
                console.warn('[ActivityLog] Write error:', e);
            });
        }

        // Rafraîchir l'affichage si le drawer est ouvert
        if (document.getElementById('log-drawer') && document.getElementById('log-drawer').classList.contains('open')) {
            renderLogs();
        }
    };

    // ═══════════════════════════════════════════════════════
    //  HOOK INTO sendRequest
    // ═══════════════════════════════════════════════════════
    function hookSendRequest() {
        if (!window.sendRequest || window._sendRequestHooked) return;
        const original = window.sendRequest;

        window.sendRequest = async function (action, payload, sheetOverride) {
            const result = await original.apply(this, arguments);

            // Log uniquement les actions CRUD
            if (['CREATE', 'UPDATE', 'DELETE'].includes(action)) {
                const sheet = sheetOverride || (window.state && window.state.activeSheet) || '';
                const data = payload && payload.data;
                const rowIdx = payload && payload.rowIndex;
                const styleVal = data ? (data['Cust Style Ref'] || data['Style'] || data['style'] || '') : '';

                let detail = '';
                if (action === 'CREATE') {
                    detail = 'Nouvelle ligne ajoutée';
                    if (styleVal) detail += ' · Style ' + styleVal;
                } else if (action === 'UPDATE') {
                    detail = 'Ligne ' + (rowIdx || '?') + ' modifiée';
                    if (styleVal) detail += ' · Style ' + styleVal;
                    // Tenter de détecter le champ modifié
                    if (data && Object.keys(data).length <= 3) {
                        const fields = Object.keys(data).filter(function (k) { return k !== '_rowIndex'; });
                        if (fields.length) detail += ' · ' + fields.join(', ');
                    }
                } else if (action === 'DELETE') {
                    detail = 'Ligne ' + (rowIdx || '?') + ' supprimée';
                }

                window.logActivity(action, sheet, detail, {
                    style: styleVal,
                    rowIndex: rowIdx || '',
                    field: data ? Object.keys(data).filter(function (k) { return k !== '_rowIndex'; }).join(', ') : ''
                });
            }

            return result;
        };

        window._sendRequestHooked = true;
        console.log('[ActivityLog] sendRequest hooked ✓');
    }

    // Hook imgOpen
    function hookImgOpen() {
        if (!window.imgOpen || window._imgOpenHooked) return;
        const original = window.imgOpen;

        window.imgOpen = async function (styleCode, rowIndex, currentUrl) {
            // On ne peut pas hooker la callback interne facilement,
            // donc on logge quand la fonction est appelée et on surveille le toast
            const origToast = window.showToast;
            let logged = false;

            window.showToast = function (msg, type, dur) {
                if (!logged && type === 'success' && msg && msg.includes('Image uploadée')) {
                    logged = true;
                    window.logActivity('UPLOAD', 'details', 'Image uploadée · Style ' + styleCode, {
                        style: styleCode,
                        rowIndex: rowIndex
                    });
                }
                return origToast.apply(this, arguments);
            };

            const result = await original.apply(this, arguments);

            // Restaurer après un délai
            setTimeout(function () { window.showToast = origToast; }, 30000);

            return result;
        };

        window._imgOpenHooked = true;
        console.log('[ActivityLog] imgOpen hooked ✓');
    }

    // Hook tpExecuteUpload
    function hookTpUpload() {
        if (!window.tpExecuteUpload || window._tpUploadHooked) return;
        const original = window.tpExecuteUpload;

        window.tpExecuteUpload = function () {
            const origToast = window.showToast;
            let logged = false;

            window.showToast = function (msg, type, dur) {
                if (!logged && type === 'success' && msg && msg.includes('Tech Pack')) {
                    logged = true;
                    var style = (window._currentStyle || (typeof _currentStyle !== 'undefined' ? _currentStyle : null));
                    var styleCode = style ? style.styleCode : '';
                    window.logActivity('UPLOAD', 'details', 'Tech Pack uploadé · Style ' + styleCode, {
                        style: styleCode
                    });
                }
                return origToast.apply(this, arguments);
            };

            const result = original.apply(this, arguments);
            setTimeout(function () { window.showToast = origToast; }, 60000);
            return result;
        };

        window._tpUploadHooked = true;
        console.log('[ActivityLog] tpExecuteUpload hooked ✓');
    }

    // ═══════════════════════════════════════════════════════
    //  RENDER LOGS
    // ═══════════════════════════════════════════════════════
    function renderLogs() {
        const body = document.getElementById('log-body');
        const sub = document.getElementById('log-header-sub');
        if (!body) return;

        let filtered = _logs;
        if (_activeFilter) {
            filtered = _logs.filter(function (l) {
                if (_activeFilter === 'UPLOAD') return l.action === 'UPLOAD' || l.action === 'UPLOAD_IMAGE' || l.action === 'UPLOAD_TP';
                return l.action === _activeFilter;
            });
        }

        if (sub) {
            var todayStr = new Date().toISOString().slice(0, 10);
            var todayCount = _logs.filter(function (l) { return (l.timestamp || '').slice(0, 10) === todayStr; }).length;
            sub.textContent = todayCount + ' action' + (todayCount > 1 ? 's' : '') + " aujourd'hui · " + _logs.length + ' total';
        }

        if (!filtered.length) {
            body.innerHTML = '<div class="log-empty"><i class="ti ti-history" style="font-size:28px;opacity:.3" aria-hidden="true"></i><span>Aucune activité enregistrée</span></div>';
            return;
        }

        // Grouper par jour
        var days = {};
        filtered.slice(0, LOG_MAX_DISPLAY).forEach(function (l) {
            var day = (l.timestamp || '').slice(0, 10);
            if (!days[day]) days[day] = [];
            days[day].push(l);
        });

        var html = '';
        var todayISO = new Date().toISOString().slice(0, 10);
        var yesterdayISO = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

        Object.keys(days).sort().reverse().forEach(function (day) {
            var label = day === todayISO ? "Aujourd'hui"
                : day === yesterdayISO ? 'Hier'
                    : new Date(day).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });

            html += '<div class="log-day-sep">' + label + '</div>';

            days[day].forEach(function (l) {
                var actionNorm = (l.action || '').toUpperCase();
                var isUpload = actionNorm === 'UPLOAD' || actionNorm === 'UPLOAD_IMAGE' || actionNorm === 'UPLOAD_TP';
                var dotCls = actionNorm === 'CREATE' ? 'ldot-create'
                    : actionNorm === 'UPDATE' ? 'ldot-update'
                        : actionNorm === 'DELETE' ? 'ldot-delete'
                            : isUpload ? 'ldot-upload' : 'ldot-other';
                var badgeCls = actionNorm === 'CREATE' ? 'lbadge-create'
                    : actionNorm === 'UPDATE' ? 'lbadge-update'
                        : actionNorm === 'DELETE' ? 'lbadge-delete'
                            : isUpload ? 'lbadge-upload' : 'lbadge-other';
                var badgeLabel = isUpload ? 'UPLOAD' : actionNorm;

                var timeStr = '';
                if (l.timestamp) {
                    try {
                        var d = new Date(l.timestamp);
                        timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                    } catch (e) { timeStr = ''; }
                }

                var detailParts = [];
                if (l.sheet) detailParts.push(l.sheet);
                if (l.style) detailParts.push('Style ' + l.style);
                if (l.rowIndex) detailParts.push('ligne ' + l.rowIndex);
                if (l.user) detailParts.push('par ' + l.user);
                var detailLine = detailParts.join(' · ');

                html += '<div class="log-entry">' +
                    '<span class="log-entry-dot ' + dotCls + '"></span>' +
                    '<div class="log-entry-info">' +
                    '<div class="log-entry-action"><span class="log-badge ' + badgeCls + '">' + badgeLabel + '</span> ' + _esc(l.detail || actionNorm) + '</div>' +
                    (detailLine ? '<div class="log-entry-detail">' + _esc(detailLine) + '</div>' : '') +
                    '</div>' +
                    '<span class="log-entry-time">' + timeStr + '</span>' +
                    '</div>';
            });
        });

        body.innerHTML = html;
    }

    function _esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ═══════════════════════════════════════════════════════
    //  EXPORT EXCEL
    // ═══════════════════════════════════════════════════════
    window.exportActivityLog = function () {
        if (typeof XLSX === 'undefined') {
            if (typeof showToast === 'function') showToast('Bibliothèque Excel non chargée', 'error');
            return;
        }
        if (!_logs.length) {
            if (typeof showToast === 'function') showToast('Aucun log à exporter', 'info');
            return;
        }

        var rows = _logs.map(function (l) {
            return {
                'Date': l.timestamp ? new Date(l.timestamp).toLocaleString('fr-FR') : '',
                'Utilisateur': l.user || '',
                'Action': l.action || '',
                'Feuille': l.sheet || '',
                'Style': l.style || '',
                'Détail': l.detail || '',
                'Ligne': l.rowIndex || '',
                'Champ': l.field || ''
            };
        });

        var ws = XLSX.utils.json_to_sheet(rows);
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Journal');
        XLSX.writeFile(wb, 'AW27_Journal_' + new Date().toISOString().slice(0, 10) + '.xlsx');
        if (typeof showToast === 'function') showToast('Journal exporté ✓', 'success');
    };

    // ═══════════════════════════════════════════════════════
    //  INIT — wait for app to be ready then hook
    // ═══════════════════════════════════════════════════════
    function tryHook() {
        hookSendRequest();
        hookImgOpen();
        hookTpUpload();
        injectSidebarButton();

        if (!window._sendRequestHooked || !window._imgOpenHooked) {
            setTimeout(tryHook, 1000);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(tryHook, 1500); });
    } else {
        setTimeout(tryHook, 1500);
    }

    console.log('[AW27] Activity Log Module chargé ✓');

})();
