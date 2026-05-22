// ============================================================
// AW27 CHECKERS — TODO LIST MODULE
// ============================================================

(function () {
    'use strict';

    // ─── State ──────────────────────────────────────────────
    let _tasks = [];
    let _todoFilter = 'all'; // all | today | overdue | high | done
    let _todoOpen = false;
    let _todoLoading = false;

    // ─── Inject CSS ──────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
    /* ── Todo Sidebar Nav Item ── */
    #tab-todo {
        position: relative;
    }
    .todo-nav-badge {
        position: absolute;
        top: 6px; right: 8px;
        min-width: 16px; height: 16px;
        background: #ef4444; color: #fff;
        font-size: 9px; font-weight: 700;
        border-radius: 8px; padding: 0 4px;
        display: none; align-items: center; justify-content: center;
        border: 1.5px solid #fff;
    }
    .todo-nav-badge.visible { display: flex; }

    /* ── Todo Panel Overlay ── */
    #todo-overlay {
        position: fixed; inset: 0; z-index: 1050;
        pointer-events: none; opacity: 0;
        transition: opacity 0.25s ease;
    }
    #todo-overlay.open { pointer-events: all; opacity: 1; }
    .todo-backdrop {
        position: absolute; inset: 0;
        background: rgba(15,23,42,0.35);
        backdrop-filter: blur(2px);
    }
    .todo-panel {
        position: absolute; top: 0; right: 0; bottom: 0;
        width: min(520px, 100vw);
        background: #fff;
        border-left: 1px solid #e5e7eb;
        box-shadow: -8px 0 40px rgba(0,0,0,0.12);
        display: flex; flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
    }
    #todo-overlay.open .todo-panel { transform: translateX(0); }

    /* ── Header ── */
    .todo-header {
        display: flex; align-items: center; gap: 10px;
        padding: 14px 18px 13px;
        border-bottom: 1px solid #f0f1f3;
        background: #fafbfc; flex-shrink: 0;
    }
    .todo-header-icon {
        width: 34px; height: 34px; border-radius: 9px;
        background: linear-gradient(135deg,#6366f1,#8b5cf6);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
    }
    .todo-header-icon svg { width: 16px; height: 16px; stroke: #fff; }
    .todo-header-title { font-size: 14px; font-weight: 700; color: #1a1f36; flex: 1; }
    .todo-header-sub { font-size: 11px; color: #9ca3af; margin-top: 1px; }
    .todo-close-btn {
        width: 30px; height: 30px; border-radius: 7px;
        border: 1px solid #e5e7eb; background: transparent;
        color: #9ca3af; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.15s;
    }
    .todo-close-btn:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }

    /* ── Add Form ── */
    .todo-add-wrap {
        padding: 12px 16px;
        border-bottom: 1px solid #f0f1f3;
        flex-shrink: 0;
        background: #f8f9ff;
    }
    .todo-add-row {
        display: flex; gap: 8px; align-items: center;
    }
    .todo-add-input {
        flex: 1; padding: 8px 12px;
        border: 1.5px solid #e0e3ff; border-radius: 9px;
        font-size: 13px; font-family: inherit; outline: none;
        background: #fff; color: #1a1f36;
        transition: border-color 0.15s;
    }
    .todo-add-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
    .todo-add-input::placeholder { color: #c4c9d4; }
    .todo-add-btn {
        width: 34px; height: 34px; border-radius: 9px;
        background: #6366f1; border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.15s; flex-shrink: 0;
    }
    .todo-add-btn:hover { background: #4f46e5; }
    .todo-add-btn svg { width: 16px; height: 16px; stroke: #fff; }
    .todo-expand-btn {
        background: none; border: none; cursor: pointer;
        font-size: 11px; color: #6366f1; font-weight: 600;
        padding: 4px 0; display: flex; align-items: center; gap: 4px;
        font-family: inherit; margin-top: 6px;
    }
    .todo-expand-form {
        display: none; margin-top: 10px;
        display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
    }
    .todo-expand-form.visible { display: grid; }
    .todo-form-group { display: flex; flex-direction: column; gap: 4px; }
    .todo-form-group.full { grid-column: 1 / -1; }
    .todo-form-label {
        font-size: 10px; font-weight: 700; text-transform: uppercase;
        letter-spacing: .05em; color: #9ca3af;
    }
    .todo-form-select, .todo-form-input-sm {
        padding: 6px 10px; border: 1.5px solid #e5e7eb;
        border-radius: 7px; font-size: 12px; font-family: inherit;
        outline: none; background: #fff; color: #1a1f36;
        transition: border-color 0.15s;
    }
    .todo-form-select:focus, .todo-form-input-sm:focus { border-color: #6366f1; }

    /* ── Filters ── */
    .todo-filters {
        display: flex; gap: 4px; padding: 10px 16px;
        border-bottom: 1px solid #f0f1f3; flex-shrink: 0;
        overflow-x: auto; scrollbar-width: none;
    }
    .todo-filters::-webkit-scrollbar { display: none; }
    .todo-filter-btn {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 5px 11px; border-radius: 20px;
        border: 1.5px solid #e5e7eb; background: #fff;
        font-size: 11px; font-weight: 600; cursor: pointer;
        color: #6b7280; white-space: nowrap; transition: all 0.15s;
        font-family: inherit;
    }
    .todo-filter-btn:hover { border-color: #6366f1; color: #6366f1; }
    .todo-filter-btn.active { background: #6366f1; color: #fff; border-color: #6366f1; }
    .todo-filter-count {
        background: rgba(255,255,255,0.25); border-radius: 10px;
        padding: 0 5px; font-size: 10px; font-weight: 700;
    }
    .todo-filter-btn:not(.active) .todo-filter-count {
        background: #f1f3f5; color: #6b7280;
    }

    /* ── Task List ── */
    .todo-list {
        flex: 1; overflow-y: auto; padding: 8px 12px 16px;
    }
    .todo-list::-webkit-scrollbar { width: 4px; }
    .todo-list::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 2px; }

    .todo-empty {
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; padding: 3rem 1rem;
        color: #c4c9d4; gap: 10px; text-align: center;
    }
    .todo-empty svg { width: 40px; height: 40px; opacity: 0.4; }
    .todo-empty p { font-size: 13px; font-weight: 500; }

    /* ── Task Card ── */
    .todo-task {
        display: flex; align-items: flex-start; gap: 10px;
        padding: 10px 12px; border-radius: 10px;
        border: 1px solid #f0f1f3; background: #fff;
        margin-bottom: 6px; transition: all 0.15s;
        cursor: default;
    }
    .todo-task:hover { border-color: #e0e3ff; box-shadow: 0 2px 8px rgba(99,102,241,0.07); }
    .todo-task.done { opacity: 0.5; }
    .todo-task.done .todo-task-title { text-decoration: line-through; color: #9ca3af; }
    .todo-task.overdue { border-left: 3px solid #ef4444; background: #fff5f5; }
    .todo-task.due-today { border-left: 3px solid #f59e0b; background: #fffbeb; }

    .todo-check {
        width: 18px; height: 18px; border-radius: 50%;
        border: 2px solid #d1d5db; background: #fff;
        cursor: pointer; flex-shrink: 0; margin-top: 1px;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.15s;
    }
    .todo-check:hover { border-color: #6366f1; background: #eef2ff; }
    .todo-check.checked { background: #6366f1; border-color: #6366f1; }
    .todo-check.checked svg { display: block; }
    .todo-check svg { display: none; width: 10px; height: 10px; stroke: #fff; stroke-width: 3; }

    .todo-task-body { flex: 1; min-width: 0; }
    .todo-task-title {
        font-size: 13px; font-weight: 600; color: #1a1f36;
        line-height: 1.4; margin-bottom: 4px;
    }
    .todo-task-meta {
        display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
    }
    .todo-priority {
        font-size: 9.5px; font-weight: 700; padding: 1px 6px;
        border-radius: 20px; text-transform: uppercase; letter-spacing: .04em;
    }
    .prio-high { background: #fee2e2; color: #991b1b; }
    .prio-medium { background: #fef3c7; color: #92400e; }
    .prio-low { background: #dcfce7; color: #166534; }
    .todo-due-badge {
        font-size: 10px; font-weight: 600; padding: 1px 6px;
        border-radius: 20px;
    }
    .due-overdue { background: #fee2e2; color: #dc2626; }
    .due-today { background: #fef3c7; color: #d97706; }
    .due-soon { background: #eff6ff; color: #2563eb; }
    .due-ok { background: #f1f5f9; color: #64748b; }
    .todo-linked-badge {
        font-size: 10px; font-weight: 600; padding: 1px 6px;
        border-radius: 20px; background: #eef2ff; color: #4338ca;
        cursor: pointer; transition: background 0.15s;
    }
    .todo-linked-badge:hover { background: #e0e7ff; }
    .todo-task-desc {
        font-size: 11px; color: #9ca3af; margin-top: 3px; line-height: 1.4;
    }

    .todo-task-actions {
        display: flex; gap: 3px; flex-shrink: 0; opacity: 0;
        transition: opacity 0.15s;
    }
    .todo-task:hover .todo-task-actions { opacity: 1; }
    .todo-act-btn {
        width: 24px; height: 24px; border-radius: 6px;
        border: 1px solid #e5e7eb; background: transparent;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: all 0.15s; color: #9ca3af;
    }
    .todo-act-btn:hover { background: #fee2e2; border-color: #fca5a5; color: #dc2626; }
    .todo-act-btn svg { width: 12px; height: 12px; stroke: currentColor; }

    /* ── Section labels ── */
    .todo-section-label {
        font-size: 10px; font-weight: 700; text-transform: uppercase;
        letter-spacing: .07em; color: #c4c9d4;
        padding: 8px 4px 4px; margin-bottom: 2px;
    }

    /* ── Footer stats ── */
    .todo-footer {
        padding: 10px 16px; border-top: 1px solid #f0f1f3;
        display: flex; align-items: center; justify-content: space-between;
        flex-shrink: 0; background: #fafbfc;
    }
    .todo-footer-stat { font-size: 11px; color: #9ca3af; }
    .todo-footer-stat strong { color: #1a1f36; }
    .todo-clear-done {
        font-size: 11px; font-weight: 600; color: #9ca3af;
        background: none; border: none; cursor: pointer;
        padding: 4px 8px; border-radius: 6px; font-family: inherit;
        transition: all 0.15s;
    }
    .todo-clear-done:hover { background: #fee2e2; color: #dc2626; }

    .todo-style-badge {
        background: #eef2ff; color: #4338ca; cursor: pointer;
    }
    .todo-style-badge:hover { background: #e0e7ff; }
    .todo-client-badge {
        background: #f0fdf4; color: #166534; cursor: default;
    }

    /* ── Startup toast ── */
    .todo-startup-toast {
        background: #fff; border: 1px solid #e0e3ff;
        border-left: 3px solid #6366f1;
        border-radius: 12px; padding: 12px 16px;
        box-shadow: 0 4px 20px rgba(99,102,241,0.15);
        cursor: pointer; transition: all 0.15s;
        max-width: 340px;
    }
    .todo-startup-toast:hover { transform: translateY(-2px); box-shadow: 0 6px 28px rgba(99,102,241,0.2); }
    .todo-startup-title { font-size: 13px; font-weight: 700; color: #1a1f36; margin-bottom: 4px; }
    .todo-startup-sub { font-size: 11px; color: #6b7280; }
    `;
    document.head.appendChild(style);

    // ─── Add nav item to sidebar ──────────────────────────────
    function _injectNavItem() {
        const nav = document.querySelector('.sidebar-nav');
        if (!nav || document.getElementById('tab-todo')) return;

        // Find the system section label
        const labels = nav.querySelectorAll('.sidebar-section-label');
        let systemLabel = null;
        labels.forEach(l => { if (l.textContent.trim() === 'Système') systemLabel = l; });

        const btn = document.createElement('button');
        btn.className = 'nav-item';
        btn.id = 'tab-todo';
        btn.title = 'To-Do List';
        btn.innerHTML = `
            <span class="nav-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                </svg>
            </span>
            <span class="nav-label">To-Do List</span>
            <span class="todo-nav-badge" id="todo-nav-badge"></span>
        `;
        btn.onclick = openTodoPanel;

        if (systemLabel) {
            nav.insertBefore(btn, systemLabel);
        } else {
            nav.appendChild(btn);
        }
    }

    // ─── Build panel HTML ─────────────────────────────────────
    function _injectPanel() {
        if (document.getElementById('todo-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'todo-overlay';
        overlay.innerHTML = `
        <div class="todo-backdrop" onclick="closeTodoPanel()"></div>
        <div class="todo-panel">
            <div class="todo-header">
                <div class="todo-header-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                    </svg>
                </div>
                <div>
                    <div class="todo-header-title">To-Do List</div>
                    <div class="todo-header-sub" id="todo-header-sub">Chargement…</div>
                </div>
                <button class="todo-close-btn" onclick="closeTodoPanel()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="14" height="14">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>

            <!-- Add form -->
            <div class="todo-add-wrap">
                <div class="todo-add-row">
                    <input class="todo-add-input" id="todo-quick-input"
                        placeholder="Nouvelle tâche… (Entrée pour ajouter)"
                        onkeydown="if(event.key==='Enter') _todoQuickAdd()"/>
                    <button class="todo-add-btn" onclick="_todoQuickAdd()" title="Ajouter">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
                        </svg>
                    </button>
                </div>
                <button class="todo-expand-btn" onclick="_todoToggleExpand()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="12" height="12">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                    Options avancées
                </button>
                <div class="todo-expand-form" id="todo-expand-form">
                    <div class="todo-form-group">
                        <label class="todo-form-label">Priorité</label>
                        <select class="todo-form-select" id="todo-priority">
                            <option value="High">🔴 Haute</option>
                            <option value="Medium" selected>🟡 Moyenne</option>
                            <option value="Low">🟢 Basse</option>
                        </select>
                    </div>
                    <div class="todo-form-group">
                        <label class="todo-form-label">Date limite</label>
                        <input type="date" class="todo-form-input-sm" id="todo-due-date"/>
                    </div>
                    <div class="todo-form-group">
                        <label class="todo-form-label">Style lié</label>
                        <input type="text" class="todo-form-input-sm" id="todo-linked-style"
                            placeholder="ex: ST001" list="todo-style-list"/>
                        <datalist id="todo-style-list"></datalist>
                    </div>
                    <div class="todo-form-group">
                        <label class="todo-form-label">Client lié</label>
                        <input type="text" class="todo-form-input-sm" id="todo-linked-client"
                            placeholder="ex: CALVIN KLEIN" list="todo-client-list"/>
                        <datalist id="todo-client-list"></datalist>
                    </div>
                    <div class="todo-form-group full">
                        <label class="todo-form-label">Description</label>
                        <input type="text" class="todo-form-input-sm" id="todo-desc"
                            placeholder="Détails optionnels…"/>
                    </div>
                </div>
            </div>

            <!-- Filters -->
            <div class="todo-filters" id="todo-filters"></div>

            <!-- Task list -->
            <div class="todo-list" id="todo-list"></div>

            <!-- Footer -->
            <div class="todo-footer">
                <div class="todo-footer-stat" id="todo-footer-stat"></div>
                <button class="todo-clear-done" onclick="_todoClearDone()">Effacer terminées</button>
            </div>
        </div>`;
        document.body.appendChild(overlay);
    }

    // ─── Helpers ──────────────────────────────────────────────
    function _daysDiff(dateVal) {
        if (!dateVal) return null;
        const d = new Date(dateVal); d.setHours(0,0,0,0);
        const t = new Date(); t.setHours(0,0,0,0);
        return Math.round((d - t) / 86400000);
    }

    function _dueBadge(dueDate, status) {
        if (status === 'done') return '';
        if (!dueDate) return '';
        const diff = _daysDiff(dueDate);
        if (diff === null) return '';
        const fmt = new Date(dueDate).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' });
        if (diff < 0) return `<span class="todo-due-badge due-overdue">⚠ ${fmt} (${Math.abs(diff)}j)</span>`;
        if (diff === 0) return `<span class="todo-due-badge due-today">Aujourd'hui</span>`;
        if (diff <= 3) return `<span class="todo-due-badge due-soon">dans ${diff}j · ${fmt}</span>`;
        return `<span class="todo-due-badge due-ok">${fmt}</span>`;
    }

    function _prioBadge(prio) {
        const map = { High: 'prio-high', Medium: 'prio-medium', Low: 'prio-low' };
        const labels = { High: '🔴 Haute', Medium: '🟡 Moyenne', Low: '🟢 Basse' };
        return `<span class="todo-priority ${map[prio] || 'prio-medium'}">${labels[prio] || prio}</span>`;
    }

    function _taskCls(task) {
        if (task.status === 'done') return 'done';
        if (!task.dueDate) return '';
        const diff = _daysDiff(task.dueDate);
        if (diff === null) return '';
        if (diff < 0) return 'overdue';
        if (diff === 0) return 'due-today';
        return '';
    }

    // ─── Load from GAS ────────────────────────────────────────
    async function _loadTasks() {
        try {
            const gasUrl = window.GOOGLE_APPS_SCRIPT_URL || GOOGLE_APPS_SCRIPT_URL;
            if (!gasUrl || gasUrl === 'YOUR_WEB_APP_URL_HERE') {
                _tasks = _demoTasks();
                _renderAll();
                return;
            }
            const res = await fetch(gasUrl, {
                method: 'POST',
                body: JSON.stringify({ action: 'GET_TASKS' })
            });
            const json = await res.json();
            if (json.status === 'ok') {
                _tasks = json.tasks || [];
                _renderAll();
                _updateBadge();
                _checkStartupNotif();
            }
        } catch (e) {
            console.warn('[Todo] Load error:', e);
            _tasks = [];
            _renderAll();
        }
    }

    async function _sendRequest(action, payload) {
        const gasUrl = window.GOOGLE_APPS_SCRIPT_URL || GOOGLE_APPS_SCRIPT_URL;
        if (!gasUrl || gasUrl === 'YOUR_WEB_APP_URL_HERE') return { status: 'ok' };
        const res = await fetch(gasUrl, {
            method: 'POST',
            body: JSON.stringify({ action, ...payload })
        });
        return res.json();
    }

    // ─── Demo tasks (mode sans GAS) ───────────────────────────
    function _demoTasks() {
        const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0,10); };
        return [
            { id:'t1', title:'Relancer supplier pour Ready Date ST001', priority:'High', dueDate: d(-1), linkedStyle:'ST001', linkedClient:'CALVIN KLEIN', status:'pending', createdAt: new Date().toISOString() },
            { id:'t2', title:'Envoyer sample PP ST002 au client', priority:'High', dueDate: d(0), linkedStyle:'ST002', linkedClient:'CALVIN KLEIN', status:'pending', createdAt: new Date().toISOString() },
            { id:'t3', title:'Vérifier conformité fabric devo ST003', priority:'Medium', dueDate: d(2), linkedStyle:'ST003', linkedClient:'TOMMY', status:'pending', createdAt: new Date().toISOString() },
            { id:'t4', title:'Préparer rapport QC pour réunion client', priority:'Low', dueDate: d(5), status:'pending', createdAt: new Date().toISOString() },
            { id:'t5', title:'Confirmer PO avec supplier Fabric Devo', priority:'Medium', dueDate: d(7), status:'done', createdAt: new Date().toISOString() }
        ];
    }

    // ─── Render ───────────────────────────────────────────────
    function _renderAll() {
        _renderFilters();
        _renderList();
        _renderFooter();
        _updateHeaderSub();
        _populateDataLists();
    }

    function _getFiltered() {
        const today = new Date(); today.setHours(0,0,0,0);
        return _tasks.filter(t => {
            if (_todoFilter === 'all') return t.status !== 'done';
            if (_todoFilter === 'done') return t.status === 'done';
            if (_todoFilter === 'today') {
                if (t.status === 'done') return false;
                if (!t.dueDate) return false;
                return _daysDiff(t.dueDate) === 0;
            }
            if (_todoFilter === 'overdue') {
                if (t.status === 'done') return false;
                if (!t.dueDate) return false;
                return _daysDiff(t.dueDate) < 0;
            }
            if (_todoFilter === 'high') return t.priority === 'High' && t.status !== 'done';
            return true;
        }).sort((a, b) => {
            // Sort: overdue first, then today, then by priority, then by date
            const prioOrder = { High: 0, Medium: 1, Low: 2 };
            const diffA = a.dueDate ? (_daysDiff(a.dueDate) ?? 999) : 999;
            const diffB = b.dueDate ? (_daysDiff(b.dueDate) ?? 999) : 999;
            if (diffA < 0 && diffB >= 0) return -1;
            if (diffB < 0 && diffA >= 0) return 1;
            const pa = prioOrder[a.priority] ?? 1;
            const pb = prioOrder[b.priority] ?? 1;
            if (pa !== pb) return pa - pb;
            return diffA - diffB;
        });
    }

    function _countFilter(f) {
        if (f === 'all') return _tasks.filter(t => t.status !== 'done').length;
        if (f === 'done') return _tasks.filter(t => t.status === 'done').length;
        if (f === 'today') return _tasks.filter(t => t.status !== 'done' && t.dueDate && _daysDiff(t.dueDate) === 0).length;
        if (f === 'overdue') return _tasks.filter(t => t.status !== 'done' && t.dueDate && _daysDiff(t.dueDate) < 0).length;
        if (f === 'high') return _tasks.filter(t => t.priority === 'High' && t.status !== 'done').length;
        return 0;
    }

    function _renderFilters() {
        const el = document.getElementById('todo-filters');
        if (!el) return;
        const filters = [
            { id: 'all', label: 'Toutes' },
            { id: 'overdue', label: '🔴 En retard' },
            { id: 'today', label: '🟡 Aujourd\'hui' },
            { id: 'high', label: '⚡ Urgent' },
            { id: 'done', label: '✓ Terminées' },
        ];
        el.innerHTML = filters.map(f => {
            const count = _countFilter(f.id);
            return `<button class="todo-filter-btn ${_todoFilter === f.id ? 'active' : ''}"
                onclick="_todoSetFilter('${f.id}')">
                ${f.label}
                <span class="todo-filter-count">${count}</span>
            </button>`;
        }).join('');
    }

    function _renderList() {
        const el = document.getElementById('todo-list');
        if (!el) return;
        const filtered = _getFiltered();
        if (!filtered.length) {
            const msgs = {
                all: 'Aucune tâche en cours 🎉',
                overdue: 'Aucune tâche en retard ✓',
                today: 'Rien pour aujourd\'hui',
                high: 'Aucune tâche urgente',
                done: 'Aucune tâche terminée'
            };
            el.innerHTML = `<div class="todo-empty">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p>${msgs[_todoFilter] || 'Aucune tâche'}</p>
            </div>`;
            return;
        }

        // Group: overdue | today | upcoming | no date
        const groups = { overdue: [], today: [], upcoming: [], nodate: [] };
        filtered.forEach(t => {
            if (t.status === 'done') { groups.nodate.push(t); return; }
            const diff = t.dueDate ? _daysDiff(t.dueDate) : null;
            if (diff === null) groups.nodate.push(t);
            else if (diff < 0) groups.overdue.push(t);
            else if (diff === 0) groups.today.push(t);
            else groups.upcoming.push(t);
        });

        let html = '';
        const renderGroup = (tasks, label) => {
            if (!tasks.length) return '';
            return `<div class="todo-section-label">${label}</div>` +
                tasks.map(t => _renderTask(t)).join('');
        };

        if (_todoFilter === 'done') {
            html = filtered.map(t => _renderTask(t)).join('');
        } else {
            html += renderGroup(groups.overdue, '⚠ En retard');
            html += renderGroup(groups.today, '📅 Aujourd\'hui');
            html += renderGroup(groups.upcoming, '🕐 À venir');
            html += renderGroup(groups.nodate, '📋 Sans date');
        }

        el.innerHTML = html;
    }

    function _renderTask(task) {
        const isDone = task.status === 'done';
        const cls = _taskCls(task);
        const hasDesc = task.description && task.description.trim();
        const descId = 'todo-desc-' + task.id;

        // Style badge (cliquable → ouvre le style)
        const styleBadge = task.linkedStyle
            ? `<span class="todo-linked-badge todo-style-badge" onclick="event.stopPropagation();_todoNavToStyle('${task.linkedStyle}','${task.linkedSheet || ''}')">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="9" height="9" style="margin-right:2px;vertical-align:middle"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h10M7 11h10M7 15h6"/></svg>
                ${_escHtml(task.linkedStyle)}</span>`
            : '';

        // Client badge
        const clientBadge = task.linkedClient
            ? `<span class="todo-linked-badge todo-client-badge">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="9" height="9" style="margin-right:2px;vertical-align:middle"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                ${_escHtml(task.linkedClient)}</span>`
            : '';

        return `<div class="todo-task ${cls} ${isDone ? 'done' : ''}" id="todo-task-${task.id}" onclick="_todoToggleDesc('${task.id}')" style="cursor:pointer">
            <div class="todo-check ${isDone ? 'checked' : ''}" onclick="event.stopPropagation();_todoToggleDone('${task.id}')">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                </svg>
            </div>
            <div class="todo-task-body">
                <div class="todo-task-title">${_escHtml(task.title)}</div>
                <div class="todo-task-meta" style="margin-top:5px;flex-wrap:wrap;gap:4px;">
                    ${_prioBadge(task.priority)}
                    ${_dueBadge(task.dueDate, task.status)}
                </div>
                ${(styleBadge || clientBadge) ? `<div class="todo-task-links" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px;">${styleBadge}${clientBadge}</div>` : ''}
                ${hasDesc ? `<div class="todo-task-desc todo-desc-hidden" id="${descId}" style="display:none;margin-top:6px;padding:6px 8px;background:#f8f9ff;border-radius:6px;border-left:2px solid #6366f1;">${_escHtml(task.description)}</div>` : ''}
                ${hasDesc ? `<div class="todo-desc-hint" id="hint-${task.id}" style="font-size:10px;color:#c4c9d4;margin-top:4px;">▾ voir description</div>` : ''}
            </div>
            <div class="todo-task-actions" onclick="event.stopPropagation()">
                <button class="todo-act-btn" onclick="_todoDelete('${task.id}')" title="Supprimer">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </div>
        </div>`;
    }

    function _renderFooter() {
        const el = document.getElementById('todo-footer-stat');
        if (!el) return;
        const total = _tasks.filter(t => t.status !== 'done').length;
        const done = _tasks.filter(t => t.status === 'done').length;
        const overdue = _tasks.filter(t => t.status !== 'done' && t.dueDate && _daysDiff(t.dueDate) < 0).length;
        el.innerHTML = `<strong>${total}</strong> en cours · <strong>${done}</strong> terminées${overdue ? ` · <span style="color:#dc2626"><strong>${overdue}</strong> en retard</span>` : ''}`;
    }

    function _updateHeaderSub() {
        const el = document.getElementById('todo-header-sub');
        if (!el) return;
        const total = _tasks.filter(t => t.status !== 'done').length;
        const overdue = _tasks.filter(t => t.status !== 'done' && t.dueDate && _daysDiff(t.dueDate) < 0).length;
        el.textContent = overdue
            ? `${total} tâche${total > 1 ? 's' : ''} · ${overdue} en retard`
            : `${total} tâche${total > 1 ? 's' : ''} en cours`;
    }

    function _populateDataLists() {
        const styleList = document.getElementById('todo-style-list');
        const clientList = document.getElementById('todo-client-list');
        if (!styleList || !clientList) return;
        if (window.state && window.state.data) {
            const styles = [...new Set((state.data.details || []).map(r => r.Style).filter(Boolean))];
            const clients = [...new Set((state.data.details || []).map(r => r.Client).filter(Boolean))];
            styleList.innerHTML = styles.map(s => `<option value="${s}"></option>`).join('');
            clientList.innerHTML = clients.map(c => `<option value="${c}"></option>`).join('');
        }
    }

    // ─── Badge ────────────────────────────────────────────────
    function _updateBadge() {
        const badge = document.getElementById('todo-nav-badge');
        if (!badge) return;
        const urgent = _tasks.filter(t => {
            if (t.status === 'done') return false;
            if (t.priority === 'High') return true;
            if (t.dueDate && _daysDiff(t.dueDate) <= 0) return true;
            return false;
        }).length;
        if (urgent > 0) {
            badge.textContent = urgent > 9 ? '9+' : urgent;
            badge.classList.add('visible');
        } else {
            badge.classList.remove('visible');
        }
    }

    // ─── Startup notification ─────────────────────────────────
    function _checkStartupNotif() {
        const overdue = _tasks.filter(t => t.status !== 'done' && t.dueDate && _daysDiff(t.dueDate) < 0);
        const todayTasks = _tasks.filter(t => t.status !== 'done' && t.dueDate && _daysDiff(t.dueDate) === 0);
        const high = _tasks.filter(t => t.status !== 'done' && t.priority === 'High');

        if (!overdue.length && !todayTasks.length && !high.length) return;

        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        let msg = '';
        if (overdue.length) msg += `${overdue.length} tâche${overdue.length > 1 ? 's' : ''} en retard`;
        if (todayTasks.length) msg += (msg ? ' · ' : '') + `${todayTasks.length} pour aujourd'hui`;
        if (high.length && !overdue.length && !todayTasks.length) msg += `${high.length} tâche${high.length > 1 ? 's' : ''} urgente${high.length > 1 ? 's' : ''}`;

        const toast = document.createElement('div');
        toast.className = 'toast info todo-startup-toast';
        toast.onclick = openTodoPanel;
        toast.innerHTML = `
            <div class="todo-startup-title">📋 To-Do List — ${msg}</div>
            <div class="todo-startup-sub">Cliquez pour voir les tâches →</div>
        `;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'toast-out 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 6000);
    }

    // ─── Inject into collectAllAlerts ────────────────────────
    function _injectIntoAlerts() {
        // Patch collectAllAlerts to include todo tasks
        const original = window.collectAllAlerts;
        if (!original) return;
        window.collectAllAlerts = function() {
            const all = original();
            const urgentTasks = _tasks.filter(t => {
                if (t.status === 'done') return false;
                if (t.dueDate && _daysDiff(t.dueDate) < 0) return true;
                if (t.dueDate && _daysDiff(t.dueDate) === 0) return true;
                if (t.priority === 'High') return true;
                return false;
            });
            if (urgentTasks.length) {
                all['__todo__'] = {
                    label: '📋 To-Do List',
                    items: urgentTasks.map(t => {
                        const diff = t.dueDate ? _daysDiff(t.dueDate) : null;
                        const isOverdue = diff !== null && diff < 0;
                        const isToday = diff === 0;
                        return {
                            dotCls: isOverdue ? 'dot-late' : isToday ? 'dot-today' : 'dot-approve',
                            tagCls: isOverdue ? 'tag-late' : isToday ? 'tag-today' : 'tag-approve',
                            tagLabel: isOverdue
                                ? `⚠ En retard de ${Math.abs(diff)}j`
                                : isToday ? '📅 Aujourd\'hui' : '⚡ Urgent',
                            title: t.title,
                            action: t.description || 'Voir la tâche dans la To-Do List',
                            style: t.linkedStyle || '—',
                            client: t.linkedClient || '',
                            meta: [
                                t.priority ? `Priorité : ${t.priority}` : '',
                                t.dueDate ? `Échéance : ${new Date(t.dueDate).toLocaleDateString('fr-FR', {day:'2-digit',month:'short'})}` : ''
                            ].filter(Boolean).join(' · '),
                            urgency: isOverdue || t.priority === 'High' ? 'high' : 'mid',
                            sheet: '__todo__',
                            rowIndex: null
                        };
                    })
                };
            }
            return all;
        };
    }

    // ─── Actions ──────────────────────────────────────────────
    window._todoSetFilter = function(f) {
        _todoFilter = f;
        _renderAll();
    };

    window._todoQuickAdd = async function() {
        const input = document.getElementById('todo-quick-input');
        const title = (input?.value || '').trim();
        if (!title) return;

        const task = {
            title,
            priority: document.getElementById('todo-priority')?.value || 'Medium',
            dueDate: document.getElementById('todo-due-date')?.value || '',
            linkedStyle: (document.getElementById('todo-linked-style')?.value || '').trim(),
            linkedClient: (document.getElementById('todo-linked-client')?.value || '').trim(),
            description: (document.getElementById('todo-desc')?.value || '').trim(),
            createdBy: window.currentUser?.email || ''
        };

        // Optimistic UI
        const newTask = { ...task, id: 'tmp_' + Date.now(), status: 'pending', createdAt: new Date().toISOString() };
        _tasks.unshift(newTask);
        _renderAll();
        _updateBadge();

        // Reset form — toujours vider tous les champs
        if (input) input.value = '';
        ['todo-due-date','todo-linked-style','todo-linked-client','todo-desc'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        const priorityEl = document.getElementById('todo-priority');
        if (priorityEl) priorityEl.value = 'Medium';

        try {
            const res = await _sendRequest('CREATE_TASK', { task });
            if (res.status === 'ok' && res.id) {
                const idx = _tasks.findIndex(t => t.id === newTask.id);
                if (idx !== -1) _tasks[idx].id = res.id;
            }
        } catch (e) { console.warn('[Todo] Create error:', e); }

        if (typeof window.showToast === 'function') showToast('Tâche ajoutée ✓', 'success', 2000);
        if (typeof window.updateGlobalNotifBadge === 'function') updateGlobalNotifBadge();
    };

    window._todoToggleDone = async function(id) {
        const task = _tasks.find(t => t.id === id);
        if (!task) return;
        const newStatus = task.status === 'done' ? 'pending' : 'done';
        task.status = newStatus;
        if (newStatus === 'done') task.completedAt = new Date().toISOString();
        _renderAll();
        _updateBadge();
        try {
            await _sendRequest('UPDATE_TASK', {
                id,
                updates: { status: newStatus, completedAt: newStatus === 'done' ? task.completedAt : '' }
            });
        } catch (e) { console.warn('[Todo] Update error:', e); }
        if (typeof window.updateGlobalNotifBadge === 'function') updateGlobalNotifBadge();
    };

    window._todoDelete = async function(id) {
        _tasks = _tasks.filter(t => t.id !== id);
        _renderAll();
        _updateBadge();
        try {
            await _sendRequest('DELETE_TASK', { id });
        } catch (e) { console.warn('[Todo] Delete error:', e); }
        if (typeof window.updateGlobalNotifBadge === 'function') updateGlobalNotifBadge();
    };

    window._todoClearDone = async function() {
        const done = _tasks.filter(t => t.status === 'done');
        _tasks = _tasks.filter(t => t.status !== 'done');
        _renderAll();
        _updateBadge();
        for (const t of done) {
            try { await _sendRequest('DELETE_TASK', { id: t.id }); } catch (e) {}
        }
        if (typeof window.showToast === 'function') showToast(`${done.length} tâche(s) supprimée(s)`, 'info', 2000);
    };

    window._todoToggleDesc = function(id) {
        const desc = document.getElementById('todo-desc-' + id);
        const hint = document.getElementById('hint-' + id);
        if (!desc) return;
        const isOpen = desc.style.display !== 'none';
        desc.style.display = isOpen ? 'none' : 'block';
        if (hint) hint.textContent = isOpen ? '▾ voir description' : '▴ masquer';
    };

    window._todoToggleExpand = function() {
        const form = document.getElementById('todo-expand-form');
        if (!form) return;
        form.classList.toggle('visible');
    };

    window._todoNavToStyle = function(styleCode, sheetKey) {
        closeTodoPanel();
        setTimeout(() => {
            if (typeof window.openStyleModal === 'function') openStyleModal(styleCode);
        }, 350);
    };

    // ─── Open / Close ─────────────────────────────────────────
    window.openTodoPanel = function() {
        _injectPanel();
        requestAnimationFrame(() => {
            document.getElementById('todo-overlay')?.classList.add('open');
        });
        _todoOpen = true;
        if (!_tasks.length) _loadTasks();
        else _renderAll();
        _populateDataLists();
    };

    window.closeTodoPanel = function() {
        document.getElementById('todo-overlay')?.classList.remove('open');
        _todoOpen = false;
    };

    function _escHtml(s) {
        return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ─── Init ─────────────────────────────────────────────────
    function _init() {
        _injectNavItem();
        _injectPanel();

        // Load tasks after app data is ready
        const waitForApp = setInterval(() => {
            if (window.state && !window.state.loading) {
                clearInterval(waitForApp);
                _loadTasks().then(() => {
                    _injectIntoAlerts();
                    if (typeof window.updateGlobalNotifBadge === 'function') updateGlobalNotifBadge();
                });
            }
        }, 500);

        // Fallback: load after 3s anyway
        setTimeout(() => {
            if (!_tasks.length) {
                _loadTasks().then(() => {
                    _injectIntoAlerts();
                    if (typeof window.updateGlobalNotifBadge === 'function') updateGlobalNotifBadge();
                });
            }
        }, 3000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        // Wait a tick for app.js to set up
        setTimeout(_init, 100);
    }

})();
