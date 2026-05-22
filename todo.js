// ============================================================
// AW27 CHECKERS — TODO LIST MODULE
// ============================================================

(function () {
    'use strict';

    // ─── State ──────────────────────────────────────────────
    let _tasks = [];
    let _todoFilter = 'all'; // all | today | overdue | high | done
    let _todoSearch = '';
    let _welcomeShown = false;
    let _todoOpen = false;
    let _todoLoading = false;

    // ─── Inject CSS ──────────────────────────────────────────
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
        position: fixed; inset: 0; z-index: 10050;
        pointer-events: none; opacity: 0;
        transition: opacity 0.25s ease;
    }
    #todo-overlay.open { pointer-events: all; opacity: 1; }
    .todo-backdrop {
        position: absolute; inset: 0;
        background: rgba(15,23,42,0.1);
        backdrop-filter: blur(1px);
        pointer-events: all;
    }
    .todo-panel {
        position: fixed; bottom: 156px; right: 28px;
        width: 380px; height: 550px;
        background: #fff;
        border-radius: 20px;
        border: 1px solid #dce8f8;
        box-shadow: 0 8px 40px rgba(99,102,241,0.15), 0 2px 8px rgba(0,0,0,0.08);
        display: flex; flex-direction: column;
        transform: translateY(20px) scale(0.95);
        transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        overflow: hidden;
        pointer-events: all;
    }
    #todo-overlay.open .todo-panel { transform: translateY(0) scale(1); }

    /* ── Floating Action Button (FAB) ── */
    #todo-fab {
        position: fixed; bottom: 92px; right: 28px;
        width: 52px; height: 52px; border-radius: 50%;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        border: none; cursor: pointer;
        box-shadow: 0 4px 16px rgba(99,102,241,0.45);
        display: flex; align-items: center; justify-content: center;
        z-index: 10001; transition: transform 0.2s, box-shadow 0.2s;
    }
    #todo-fab:hover { transform: scale(1.07); box-shadow: 0 6px 24px rgba(99,102,241,0.55); }
    #todo-fab svg { width: 22px; height: 22px; stroke: #fff; }
    .todo-fab-badge {
        position: absolute; top: -2px; right: -2px;
        min-width: 16px; height: 16px; border-radius: 8px;
        background: #ef4444; border: 2px solid white;
        color: #fff; font-size: 9px; font-weight: 700;
        display: none; align-items: center; justify-content: center;
        padding: 0 4px;
        z-index: 1;
    }
    .todo-fab-badge.visible { display: flex; }

    /* ── Signal Speech Bubble ── */
    .todo-signal-bubble {
        position: fixed; bottom: 156px; right: 28px;
        background: #ffffff; border: 1.5px solid #e0e3ff;
        border-radius: 12px; padding: 10px 14px;
        box-shadow: 0 6px 20px rgba(99,102,241,0.15);
        z-index: 10002; max-width: 250px;
        animation: todo-bubble-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        cursor: pointer; display: none; align-items: center; gap: 8px;
        pointer-events: all;
    }
    .todo-signal-bubble.visible { display: flex; }
    .todo-signal-bubble:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(99,102,241,0.2); }
    .todo-signal-bubble::after {
        content: ''; position: absolute; bottom: -8px; right: 21px;
        width: 12px; height: 12px; background: #fff;
        border-right: 1.5px solid #e0e3ff; border-bottom: 1.5px solid #e0e3ff;
        transform: rotate(45deg);
    }
    .todo-bubble-close {
        background: transparent; border: none; font-size: 12px;
        color: #9ca3af; cursor: pointer; padding: 2px;
        display: flex; align-items: center; justify-content: center;
        margin-left: auto; border-radius: 4px;
    }
    .todo-bubble-close:hover { background: #fee2e2; color: #dc2626; }
    .todo-bubble-text {
        font-size: 11px; font-weight: 600; color: #1a1f36; line-height: 1.3;
    }
    @keyframes todo-bubble-in {
        from { opacity: 0; transform: translateY(10px) scale(0.9); }
        to { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ── Header ── */
    .todo-header {
        display: grid;
        grid-template-areas: 
            "icon title close"
            "stats stats stats";
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 10px;
        padding: 16px 20px 14px;
        border-bottom: 1px solid #e5e7eb;
        background: linear-gradient(135deg,#fafbff 0%,#f5f3ff 100%);
        flex-shrink: 0;
    }
    .todo-header-icon { grid-area: icon; }
    .todo-header > div:nth-child(2) { grid-area: title; }
    .todo-header-stats {
        grid-area: stats; margin-top: 6px;
        display: grid; grid-template-columns: repeat(4, 1fr);
        gap: 8px; margin-left: 0; margin-right: 0;
    }
    .todo-header-title { font-size: 16px; font-weight: 800; color: #1a1f36; letter-spacing: -0.01em; }
    .todo-header-sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .todo-stat-pill {
        display: flex; flex-direction: column; align-items: center;
        padding: 4px 6px; border-radius: 10px; background: #fff;
        border: 1px solid #e5e7eb; min-width: 0;
    }
    .todo-stat-num { font-size: 14px; font-weight: 800; color: #1a1f36; line-height: 1.2; }
    .todo-stat-num.red { color: #dc2626; }
    .todo-stat-num.green { color: #16a34a; }
    .todo-stat-num.amber { color: #d97706; }
    .todo-stat-label { font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: .02em; color: #9ca3af; text-align: center; }
    .todo-close-btn {
        grid-area: close; justify-self: end;
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
        border-bottom: 1px solid #e5e7eb;
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
        display: flex; gap: 6px; padding: 10px 16px;
        border-bottom: 1px solid #e5e7eb; flex-shrink: 0;
        overflow-x: auto; scrollbar-width: none;
        background: #fafbfc;
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
        flex: 1; overflow-y: auto; padding: 8px 16px 16px;
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
        display: flex; align-items: flex-start; gap: 12px;
        padding: 10px 12px; border-radius: 12px;
        border: 1px solid #e5e7eb; background: #fff;
        margin-bottom: 8px; transition: all 0.2s ease;
        cursor: default; position: relative;
    }
    .todo-task:hover { border-color: #c7d2fe; box-shadow: 0 4px 16px rgba(99,102,241,0.1); transform: translateY(-1px); }
    .todo-task.done { opacity: 0.45; }
    .todo-task.done .todo-task-title { text-decoration: line-through; color: #9ca3af; }
    .todo-task.done:hover { opacity: 0.7; }
    .todo-task.overdue { border-left: 4px solid #ef4444; background: linear-gradient(90deg,#fff5f5 0%,#fff 40%); }
    .todo-task.due-today { border-left: 4px solid #f59e0b; background: linear-gradient(90deg,#fffbeb 0%,#fff 40%); }

    .todo-check {
        width: 22px; height: 22px; border-radius: 50%;
        border: 2.5px solid #d1d5db; background: #fff;
        cursor: pointer; flex-shrink: 0; margin-top: 2px;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s ease;
    }
    .todo-check:hover { border-color: #6366f1; background: #eef2ff; transform: scale(1.1); }
    .todo-check.checked { background: #6366f1; border-color: #6366f1; box-shadow: 0 2px 6px rgba(99,102,241,0.3); }
    .todo-check.checked svg { display: block; }
    .todo-check svg { display: none; width: 12px; height: 12px; stroke: #fff; stroke-width: 3; }

    .todo-task-body { flex: 1; min-width: 0; }
    .todo-task-title {
        font-size: 13.5px; font-weight: 700; color: #1a1f36;
        line-height: 1.4; margin-bottom: 2px;
    }
    .todo-task-created {
        font-size: 10px; color: #c4c9d4; margin-bottom: 5px;
    }
    .todo-task-meta {
        display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
    }
    .todo-priority {
        font-size: 10px; font-weight: 700; padding: 2px 8px;
        border-radius: 20px; text-transform: uppercase; letter-spacing: .04em;
    }
    .prio-high { background: #fee2e2; color: #991b1b; }
    .prio-medium { background: #fef3c7; color: #92400e; }
    .prio-low { background: #dcfce7; color: #166534; }
    .todo-due-badge {
        font-size: 10px; font-weight: 600; padding: 2px 8px;
        border-radius: 20px;
    }
    .due-overdue { background: #fee2e2; color: #dc2626; }
    .due-today { background: #fef3c7; color: #d97706; }
    .due-soon { background: #eff6ff; color: #2563eb; }
    .due-ok { background: #f1f5f9; color: #64748b; }
    .todo-linked-badge {
        font-size: 10px; font-weight: 600; padding: 2px 8px;
        border-radius: 20px; background: #eef2ff; color: #4338ca;
        cursor: pointer; transition: all 0.15s;
        display: inline-flex; align-items: center; gap: 3px;
    }
    .todo-linked-badge:hover { background: #e0e7ff; transform: translateY(-1px); }
    .todo-task-desc {
        font-size: 11px; color: #9ca3af; margin-top: 3px; line-height: 1.4;
    }

    .todo-task-actions {
        display: flex; gap: 4px; flex-shrink: 0; opacity: 0;
        transition: opacity 0.2s;
    }
    .todo-task:hover .todo-task-actions { opacity: 1; }
    .todo-act-btn {
        width: 28px; height: 28px; border-radius: 8px;
        border: 1px solid #e5e7eb; background: #fafbfc;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: all 0.15s; color: #9ca3af;
    }
    .todo-act-btn:hover { background: #fee2e2; border-color: #fca5a5; color: #dc2626; transform: scale(1.1); }
    .todo-act-btn svg { width: 13px; height: 13px; stroke: currentColor; }

    /* ── Section labels ── */
    .todo-section-label {
        font-size: 11px; font-weight: 800; text-transform: uppercase;
        letter-spacing: .07em; color: #94a3b8;
        padding: 14px 4px 6px; margin-bottom: 2px;
        border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 6px;
    }

    /* ── Footer stats ── */
    .todo-footer {
        padding: 10px 16px; border-top: 1px solid #e5e7eb;
        display: flex; align-items: center; justify-content: space-between;
        flex-shrink: 0; background: linear-gradient(135deg,#fafbff 0%,#f5f3ff 100%);
    }
    .todo-footer-stat { font-size: 12px; color: #6b7280; }
    .todo-footer-stat strong { color: #1a1f36; font-weight: 800; }
    .todo-clear-done {
        font-size: 11px; font-weight: 600; color: #9ca3af;
        background: none; border: none; cursor: pointer;
        padding: 4px 8px; border-radius: 6px; font-family: inherit;
        transition: all 0.15s;
    }
    .todo-clear-done:hover { background: #fee2e2; color: #dc2626; }

    /* ── Main content ── */
    #todo-main-content {
        display: flex; flex-direction: column; flex: 1;
        overflow: hidden;
    }

    /* ── Search bar ── */
    .todo-search-wrap {
        padding: 0 16px 10px;
        background: #fafbfc;
        border-bottom: 1px solid #e5e7eb;
        flex-shrink: 0;
    }
    .todo-search-row {
        display: flex; align-items: center; gap: 8px;
        background: #fff; border: 1.5px solid #e5e7eb;
        border-radius: 10px; padding: 0 12px;
        transition: border-color 0.15s, box-shadow 0.15s;
    }
    .todo-search-row:focus-within { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
    .todo-search-row svg { width: 14px; height: 14px; stroke: #9ca3af; flex-shrink: 0; }
    .todo-search-input {
        flex: 1; border: none; outline: none; background: transparent;
        font-size: 12.5px; font-family: inherit; color: #1a1f36;
        padding: 8px 0;
    }
    .todo-search-input::placeholder { color: #c4c9d4; }
    .todo-search-clear {
        width: 20px; height: 20px; border-radius: 50%;
        border: none; background: #f1f5f9; cursor: pointer;
        display: none; align-items: center; justify-content: center;
        color: #9ca3af; font-size: 12px; transition: all 0.15s;
        flex-shrink: 0;
    }
    .todo-search-clear.visible { display: flex; }
    .todo-search-clear:hover { background: #fee2e2; color: #dc2626; }
    .todo-search-count {
        font-size: 10px; color: #9ca3af; font-weight: 600;
        flex-shrink: 0; white-space: nowrap;
    }

    /* ── Completion date group ── */
    .todo-date-group {
        margin-bottom: 4px;
    }
    .todo-date-group-header {
        display: flex; align-items: center; gap: 8px;
        padding: 10px 4px 6px; cursor: pointer;
        user-select: none;
    }
    .todo-date-group-header:hover .todo-date-group-label { color: #6366f1; }
    .todo-date-group-chevron {
        width: 16px; height: 16px; stroke: #9ca3af;
        transition: transform 0.2s ease; flex-shrink: 0;
    }
    .todo-date-group.collapsed .todo-date-group-chevron { transform: rotate(-90deg); }
    .todo-date-group.collapsed .todo-date-group-content { display: none; }
    .todo-date-group-label {
        font-size: 11px; font-weight: 800; text-transform: uppercase;
        letter-spacing: .07em; color: #94a3b8; transition: color 0.15s;
    }
    .todo-date-group-count {
        font-size: 10px; font-weight: 700; color: #c4c9d4;
        background: #f1f5f9; border-radius: 10px; padding: 1px 7px;
    }
    .todo-date-group-line {
        flex: 1; height: 1px; background: #f1f5f9;
    }

    /* ── Welcome Page ── */
    .todo-welcome {
        flex: 1; overflow-y: auto; padding: 16px;
        display: flex; flex-direction: column; gap: 16px;
        animation: todo-fadeIn 0.4s ease;
    }
    @keyframes todo-fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    .todo-welcome-hero {
        text-align: center; padding: 20px 16px;
        background: linear-gradient(135deg, #eef2ff 0%, #faf5ff 50%, #fff7ed 100%);
        border-radius: 16px; border: 1px solid #e0e7ff;
    }
    .todo-welcome-icon {
        width: 44px; height: 44px; border-radius: 12px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        display: inline-flex; align-items: center; justify-content: center;
        margin-bottom: 8px; box-shadow: 0 4px 12px rgba(99,102,241,0.3);
    }
    .todo-welcome-icon svg { width: 22px; height: 22px; stroke: #fff; }
    .todo-welcome-h1 {
        font-size: 18px; font-weight: 800; color: #1a1f36;
        margin-bottom: 4px; letter-spacing: -0.02em;
    }
    .todo-welcome-sub {
        font-size: 12px; color: #6b7280; line-height: 1.5;
    }

    .todo-welcome-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
    }
    .todo-welcome-card {
        background: #fff; border: 1.5px solid #e5e7eb;
        border-radius: 12px; padding: 12px;
        cursor: pointer; transition: all 0.2s ease;
        display: flex; flex-direction: column; gap: 6px;
        position: relative; overflow: hidden;
    }
    .todo-welcome-card:hover {
        border-color: #c7d2fe; transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(99,102,241,0.12);
    }
    .todo-welcome-card-icon {
        width: 30px; height: 30px; border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        font-size: 16px; flex-shrink: 0;
    }
    .todo-welcome-card-num {
        font-size: 24px; font-weight: 900; line-height: 1;
        letter-spacing: -0.02em;
    }
    .todo-welcome-card-label {
        font-size: 11px; font-weight: 700; color: #1a1f36;
    }
    .todo-welcome-card-desc {
        font-size: 9.5px; color: #9ca3af; line-height: 1.3;
    }
    .todo-welcome-card.card-overdue { border-left: 4px solid #ef4444; }
    .todo-welcome-card.card-overdue .todo-welcome-card-icon { background: #fee2e2; }
    .todo-welcome-card.card-overdue .todo-welcome-card-num { color: #dc2626; }
    .todo-welcome-card.card-today { border-left: 4px solid #f59e0b; }
    .todo-welcome-card.card-today .todo-welcome-card-icon { background: #fef3c7; }
    .todo-welcome-card.card-today .todo-welcome-card-num { color: #d97706; }
    .todo-welcome-card.card-high { border-left: 4px solid #6366f1; }
    .todo-welcome-card.card-high .todo-welcome-card-icon { background: #eef2ff; }
    .todo-welcome-card.card-high .todo-welcome-card-num { color: #4f46e5; }
    .todo-welcome-card.card-done { border-left: 4px solid #16a34a; }
    .todo-welcome-card.card-done .todo-welcome-card-icon { background: #dcfce7; }
    .todo-welcome-card.card-done .todo-welcome-card-num { color: #16a34a; }

    .todo-welcome-start {
        display: flex; justify-content: center; padding-top: 4px;
    }
    .todo-welcome-start-btn {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 10px 24px; border-radius: 12px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: #fff; font-size: 13px; font-weight: 700;
        border: none; cursor: pointer;
        box-shadow: 0 4px 16px rgba(99,102,241,0.3);
        transition: all 0.2s ease; font-family: inherit;
    }
    .todo-welcome-start-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 24px rgba(99,102,241,0.4);
    }
    .todo-welcome-start-btn svg { width: 14px; height: 14px; stroke: #fff; }

    .todo-welcome-recent-title {
        font-size: 11px; font-weight: 800; text-transform: uppercase;
        letter-spacing: .06em; color: #94a3b8; margin-bottom: 6px;
    }
    .todo-welcome-recent-item {
        display: flex; align-items: center; gap: 8px;
        padding: 8px 10px; border-radius: 8px;
        border: 1px solid #f0f1f3; background: #fff;
        margin-bottom: 4px; font-size: 12px; color: #1a1f36;
    }
    .todo-welcome-recent-item .prio-dot {
        width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
    }
    .prio-dot-high { background: #ef4444; }
    .prio-dot-medium { background: #f59e0b; }
    .prio-dot-low { background: #22c55e; }
    .todo-welcome-recent-meta {
        font-size: 9.5px; color: #9ca3af; margin-left: auto; flex-shrink: 0;
    }

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
                <div class="todo-header-stats" id="todo-header-stats">
                    <div class="todo-stat-pill"><span class="todo-stat-num" id="stat-total">0</span><span class="todo-stat-label">En cours</span></div>
                    <div class="todo-stat-pill"><span class="todo-stat-num red" id="stat-overdue">0</span><span class="todo-stat-label">En retard</span></div>
                    <div class="todo-stat-pill"><span class="todo-stat-num amber" id="stat-today">0</span><span class="todo-stat-label">Aujourd'hui</span></div>
                    <div class="todo-stat-pill"><span class="todo-stat-num green" id="stat-done">0</span><span class="todo-stat-label">Terminées</span></div>
                </div>
                <button class="todo-close-btn" onclick="closeTodoPanel()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="14" height="14">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>

            <!-- Welcome page (first open only) -->
            <div class="todo-welcome" id="todo-welcome" style="display:none;"></div>

            <!-- Main content wrapper -->
            <div id="todo-main-content">

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
                            <option value="High">Haute</option>
                            <option value="Medium" selected>Moyenne</option>
                            <option value="Low">Basse</option>
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

            <!-- Search -->
            <div class="todo-search-wrap">
                <div class="todo-search-row">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <input class="todo-search-input" id="todo-search-input"
                        placeholder="Rechercher tâche, style, client…"
                        oninput="_todoOnSearch(this.value)"/>
                    <span class="todo-search-count" id="todo-search-count"></span>
                    <button class="todo-search-clear" id="todo-search-clear" onclick="_todoClearSearch()"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="10" height="10"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>
            </div>

            <!-- Task list -->
            <div class="todo-list" id="todo-list"></div>

            </div><!-- /todo-main-content -->

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
        if (diff < 0) return `<span class="todo-due-badge due-overdue">${fmt} (${Math.abs(diff)}j en retard)</span>`;
        if (diff === 0) return `<span class="todo-due-badge due-today">Aujourd'hui</span>`;
        if (diff <= 3) return `<span class="todo-due-badge due-soon">dans ${diff}j · ${fmt}</span>`;
        return `<span class="todo-due-badge due-ok">${fmt}</span>`;
    }

    function _prioBadge(prio) {
        const map = { High: 'prio-high', Medium: 'prio-medium', Low: 'prio-low' };
        const labels = { High: 'Haute', Medium: 'Moyenne', Low: 'Basse' };
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
                _updateBadge();
                _checkStartupNotif();
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
            _updateBadge();
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

    function _matchesSearch(t) {
        if (!_todoSearch) return true;
        const s = _todoSearch;
        return (t.title || '').toLowerCase().includes(s)
            || (t.description || '').toLowerCase().includes(s)
            || (t.linkedStyle || '').toLowerCase().includes(s)
            || (t.linkedClient || '').toLowerCase().includes(s)
            || (t.linkedSheet || '').toLowerCase().includes(s)
            || (t.priority || '').toLowerCase().includes(s)
            || (t.createdBy || '').toLowerCase().includes(s);
    }

    function _getFiltered() {
        const today = new Date(); today.setHours(0,0,0,0);
        return _tasks.filter(t => {
            if (!_matchesSearch(t)) return false;
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
        const m = _tasks.filter(_matchesSearch);
        if (f === 'all') return m.filter(t => t.status !== 'done').length;
        if (f === 'done') return m.filter(t => t.status === 'done').length;
        if (f === 'today') return m.filter(t => t.status !== 'done' && t.dueDate && _daysDiff(t.dueDate) === 0).length;
        if (f === 'overdue') return m.filter(t => t.status !== 'done' && t.dueDate && _daysDiff(t.dueDate) < 0).length;
        if (f === 'high') return m.filter(t => t.priority === 'High' && t.status !== 'done').length;
        return 0;
    }

    function _renderFilters() {
        const el = document.getElementById('todo-filters');
        if (!el) return;
        const filters = [
            { id: 'all', label: 'Toutes' },
            { id: 'overdue', label: 'En retard' },
            { id: 'today', label: 'Aujourd\'hui' },
            { id: 'high', label: 'Urgent' },
            { id: 'done', label: 'Terminées' },
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

    function _formatDateLabel(dateStr) {
        if (!dateStr) return 'Date inconnue';
        const d = new Date(dateStr);
        const today = new Date(); today.setHours(0,0,0,0);
        const target = new Date(d); target.setHours(0,0,0,0);
        const diff = Math.round((target - today) / 86400000);
        const fmt = d.toLocaleDateString('fr-FR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
        if (diff === 0) return "Aujourd'hui — " + fmt;
        if (diff === -1) return 'Hier — ' + fmt;
        if (diff === 1) return 'Demain — ' + fmt;
        return fmt.charAt(0).toUpperCase() + fmt.slice(1);
    }

    function _renderDateGroup(groupId, label, count, tasksHtml, icon) {
        return '<div class="todo-date-group" id="' + groupId + '">' +
            '<div class="todo-date-group-header" onclick="_todoToggleGroup(\'' + groupId + '\')">' +
                '<svg class="todo-date-group-chevron" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>' +
                (icon ? icon + ' ' : '') +
                '<span class="todo-date-group-label">' + label + '</span>' +
                '<span class="todo-date-group-count">' + count + '</span>' +
                '<div class="todo-date-group-line"></div>' +
            '</div>' +
            '<div class="todo-date-group-content">' + tasksHtml + '</div>' +
        '</div>';
    }

    function _renderList() {
        const el = document.getElementById('todo-list');
        if (!el) return;
        const filtered = _getFiltered();
        if (!filtered.length) {
            const msgs = {
                all: _todoSearch ? 'Aucun résultat pour « ' + _escHtml(_todoSearch) + ' »' : 'Aucune tâche en cours',
                overdue: 'Aucune tâche en retard',
                today: 'Rien pour aujourd\'hui',
                high: 'Aucune tâche urgente',
                done: _todoSearch ? 'Aucun résultat' : 'Aucune tâche terminée'
            };
            el.innerHTML = '<div class="todo-empty">' +
                '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>' +
                '</svg>' +
                '<p>' + (msgs[_todoFilter] || 'Aucune tâche') + '</p>' +
            '</div>';
            return;
        }

        let html = '';

        if (_todoFilter === 'done') {
            // Group completed tasks by completion date
            const byDate = {};
            filtered.forEach(t => {
                const dateKey = t.completedAt ? new Date(t.completedAt).toISOString().slice(0,10) : 'unknown';
                if (!byDate[dateKey]) byDate[dateKey] = [];
                byDate[dateKey].push(t);
            });
            // Sort dates newest first
            const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
            sortedDates.forEach((dateKey, idx) => {
                const tasks = byDate[dateKey];
                const label = dateKey === 'unknown' ? 'Date inconnue' : _formatDateLabel(dateKey);
                const groupId = 'done-group-' + idx;
                const tasksHtml = tasks.map(t => _renderTask(t)).join('');
                html += _renderDateGroup(groupId, label, tasks.length, tasksHtml, '');
            });
        } else {
            // Group pending tasks by due date sections
            const groups = { overdue: [], today: [], upcoming: {}, nodate: [] };
            filtered.forEach(t => {
                const diff = t.dueDate ? _daysDiff(t.dueDate) : null;
                if (diff === null) groups.nodate.push(t);
                else if (diff < 0) groups.overdue.push(t);
                else if (diff === 0) groups.today.push(t);
                else {
                    const dateKey = t.dueDate.toString().slice(0,10);
                    if (!groups.upcoming[dateKey]) groups.upcoming[dateKey] = [];
                    groups.upcoming[dateKey].push(t);
                }
            });

            // Overdue
            if (groups.overdue.length) {
                html += _renderDateGroup('grp-overdue', 'En retard', groups.overdue.length,
                    groups.overdue.map(t => _renderTask(t)).join(''), '');
            }
            // Today
            if (groups.today.length) {
                html += _renderDateGroup('grp-today', "Aujourd'hui", groups.today.length,
                    groups.today.map(t => _renderTask(t)).join(''), '');
            }
            // Upcoming — sub-grouped by date
            const upDates = Object.keys(groups.upcoming).sort();
            upDates.forEach((dateKey, idx) => {
                const tasks = groups.upcoming[dateKey];
                const label = _formatDateLabel(dateKey);
                html += _renderDateGroup('grp-up-' + idx, label, tasks.length,
                    tasks.map(t => _renderTask(t)).join(''), '');
            });
            // No date
            if (groups.nodate.length) {
                html += _renderDateGroup('grp-nodate', 'Sans date', groups.nodate.length,
                    groups.nodate.map(t => _renderTask(t)).join(''), '');
            }
        }

        el.innerHTML = html;
    }

    function _renderTask(task) {
        const isDone = task.status === 'done';
        const cls = _taskCls(task);
        const hasDesc = task.description && task.description.trim();
        const descId = 'todo-desc-' + task.id;

        // Created info
        const createdDate = task.createdAt ? new Date(task.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }) : '';
        const createdBy = task.createdBy ? task.createdBy.split('@')[0] : '';
        const createdInfo = [createdBy, createdDate].filter(Boolean).join(' · ');

        // Completed info
        const completedInfo = isDone && task.completedAt
            ? `Terminée le ${new Date(task.completedAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })}`
            : '';

        // Style badge (cliquable → ouvre le style)
        const styleBadge = task.linkedStyle
            ? `<span class="todo-linked-badge todo-style-badge" onclick="event.stopPropagation();_todoNavToStyle('${task.linkedStyle}','${task.linkedSheet || ''}')">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="10" height="10" style="vertical-align:middle"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h10M7 11h10M7 15h6"/></svg>
                ${_escHtml(task.linkedStyle)}</span>`
            : '';

        // Client badge
        const clientBadge = task.linkedClient
            ? `<span class="todo-linked-badge todo-client-badge">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="10" height="10" style="vertical-align:middle"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                ${_escHtml(task.linkedClient)}</span>`
            : '';

        // Sheet badge
        const sheetBadge = task.linkedSheet
            ? `<span class="todo-linked-badge" style="background:#fff7ed;color:#9a3412;cursor:default;">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="10" height="10" style="vertical-align:middle"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                ${_escHtml(task.linkedSheet)}</span>`
            : '';

        return `<div class="todo-task ${cls} ${isDone ? 'done' : ''}" id="todo-task-${task.id}" onclick="_todoToggleDesc('${task.id}')" style="cursor:pointer">
            <div class="todo-check ${isDone ? 'checked' : ''}" onclick="event.stopPropagation();_todoToggleDone('${task.id}')">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                </svg>
            </div>
            <div class="todo-task-body">
                <div class="todo-task-title">${_escHtml(task.title)}</div>
                ${createdInfo ? `<div class="todo-task-created">${createdInfo}${completedInfo ? ' · ' + completedInfo : ''}</div>` : ''}
                <div class="todo-task-meta" style="margin-top:5px;flex-wrap:wrap;gap:5px;">
                    ${_prioBadge(task.priority)}
                    ${_dueBadge(task.dueDate, task.status)}
                </div>
                ${(styleBadge || clientBadge || sheetBadge) ? `<div class="todo-task-links" style="display:flex;gap:5px;flex-wrap:wrap;margin-top:7px;">${styleBadge}${clientBadge}${sheetBadge}</div>` : ''}
                ${hasDesc ? `<div class="todo-task-desc" id="${descId}" style="display:none;margin-top:8px;padding:8px 12px;background:#f8f9ff;border-radius:8px;border-left:3px solid #6366f1;font-size:12px;color:#4b5563;line-height:1.5;">${_escHtml(task.description)}</div>` : ''}
                ${hasDesc ? `<div class="todo-desc-hint" id="hint-${task.id}" style="font-size:10px;color:#c4c9d4;margin-top:4px;display:flex;align-items:center;gap:3px;">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="10" height="10"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                    voir description</div>` : ''}
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
        const todayCount = _tasks.filter(t => t.status !== 'done' && t.dueDate && _daysDiff(t.dueDate) === 0).length;
        const doneCount = _tasks.filter(t => t.status === 'done').length;
        el.textContent = overdue
            ? `${total} tâche${total > 1 ? 's' : ''} · ${overdue} en retard`
            : `${total} tâche${total > 1 ? 's' : ''} en cours`;
        // Update stat pills
        const sTotal = document.getElementById('stat-total');
        const sOverdue = document.getElementById('stat-overdue');
        const sToday = document.getElementById('stat-today');
        const sDone = document.getElementById('stat-done');
        if (sTotal) sTotal.textContent = total;
        if (sOverdue) sOverdue.textContent = overdue;
        if (sToday) sToday.textContent = todayCount;
        if (sDone) sDone.textContent = doneCount;
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

    // ─── Badge & Signal Bubble ────────────────────────────────
    let _bubbleDismissed = false;

    function _updateBadge() {
        const badge = document.getElementById('todo-nav-badge');
        const fabBadge = document.getElementById('todo-fab-badge');

        const urgent = _tasks.filter(t => {
            if (t.status === 'done') return false;
            if (t.priority === 'High') return true;
            if (t.dueDate && _daysDiff(t.dueDate) <= 0) return true;
            return false;
        }).length;

        // Nav badge
        if (badge) {
            if (urgent > 0) {
                badge.textContent = urgent > 9 ? '9+' : urgent;
                badge.classList.add('visible');
            } else {
                badge.classList.remove('visible');
            }
        }

        // FAB badge
        if (fabBadge) {
            if (urgent > 0) {
                fabBadge.textContent = urgent > 9 ? '9+' : urgent;
                fabBadge.classList.add('visible');
            } else {
                fabBadge.classList.remove('visible');
            }
        }

        // Show/Update signal bubble
        _updateSignalBubble(urgent);
    }

    function _updateSignalBubble(urgentCount) {
        if (_bubbleDismissed || _todoOpen) {
            _hideSignalBubble();
            return;
        }

        const chatbotPanel = document.getElementById('fu-chatbot-panel');
        if (chatbotPanel && chatbotPanel.classList.contains('open')) {
            _hideSignalBubble();
            return;
        }

        const overdue = _tasks.filter(t => t.status !== 'done' && t.dueDate && _daysDiff(t.dueDate) < 0);
        const todayTasks = _tasks.filter(t => t.status !== 'done' && t.dueDate && _daysDiff(t.dueDate) === 0);

        if (!overdue.length && !todayTasks.length && urgentCount === 0) {
            _hideSignalBubble();
            return;
        }

        // Inject bubble if not present
        let bubble = document.getElementById('todo-signal-bubble');
        if (!bubble) {
            bubble = document.createElement('div');
            bubble.id = 'todo-signal-bubble';
            bubble.className = 'todo-signal-bubble';
            bubble.onclick = (e) => {
                openTodoPanel();
                _hideSignalBubble();
            };
            document.body.appendChild(bubble);
        }

        let msg = '';
        if (overdue.length) {
            msg = `⚠️ <strong>${overdue.length}</strong> tâche${overdue.length > 1 ? 's' : ''} en retard !`;
        } else if (todayTasks.length) {
            msg = `📅 <strong>${todayTasks.length}</strong> tâche${todayTasks.length > 1 ? 's' : ''} aujourd'hui`;
        } else {
            msg = `🔔 <strong>${urgentCount}</strong> tâche${urgentCount > 1 ? 's' : ''} urgente${urgentCount > 1 ? 's' : ''}`;
        }

        bubble.innerHTML = `
            <div class="todo-bubble-text">${msg}</div>
            <button class="todo-bubble-close" title="Fermer">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="12" height="12">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        `;

        const closeBtn = bubble.querySelector('.todo-bubble-close');
        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                _bubbleDismissed = true;
                _hideSignalBubble();
            };
        }

        if (!_todoOpen && !_bubbleDismissed) {
            bubble.classList.add('visible');
        }
    }

    function _hideSignalBubble() {
        document.getElementById('todo-signal-bubble')?.classList.remove('visible');
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
            <div class="todo-startup-title">To-Do List — ${msg}</div>
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
                    label: 'To-Do List',
                    items: urgentTasks.map(t => {
                        const diff = t.dueDate ? _daysDiff(t.dueDate) : null;
                        const isOverdue = diff !== null && diff < 0;
                        const isToday = diff === 0;
                        return {
                            dotCls: isOverdue ? 'dot-late' : isToday ? 'dot-today' : 'dot-approve',
                            tagCls: isOverdue ? 'tag-late' : isToday ? 'tag-today' : 'tag-approve',
                            tagLabel: isOverdue
                                ? `En retard de ${Math.abs(diff)}j`
                                : isToday ? 'Aujourd\'hui' : 'Urgent',
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

        if (typeof window.showToast === 'function') showToast('Tâche ajoutée', 'success', 2000);
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

    window._todoOnSearch = function(val) {
        _todoSearch = (val || '').trim().toLowerCase();
        const clearBtn = document.getElementById('todo-search-clear');
        if (clearBtn) clearBtn.classList.toggle('visible', _todoSearch.length > 0);
        _renderList();
        // Update search count
        const countEl = document.getElementById('todo-search-count');
        if (countEl) {
            if (_todoSearch) {
                const n = document.querySelectorAll('.todo-task').length;
                countEl.textContent = n + ' résultat' + (n > 1 ? 's' : '');
            } else {
                countEl.textContent = '';
            }
        }
    };

    window._todoClearSearch = function() {
        _todoSearch = '';
        const input = document.getElementById('todo-search-input');
        if (input) input.value = '';
        const clearBtn = document.getElementById('todo-search-clear');
        if (clearBtn) clearBtn.classList.remove('visible');
        const countEl = document.getElementById('todo-search-count');
        if (countEl) countEl.textContent = '';
        _renderList();
    };

    window._todoToggleGroup = function(groupId) {
        const group = document.getElementById(groupId);
        if (group) group.classList.toggle('collapsed');
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

    // ─── Welcome Page ─────────────────────────────────────────
    function _buildWelcome() {
        const el = document.getElementById('todo-welcome');
        if (!el) return;

        const total = _tasks.filter(t => t.status !== 'done').length;
        const overdueCount = _tasks.filter(t => t.status !== 'done' && t.dueDate && _daysDiff(t.dueDate) < 0).length;
        const todayCount = _tasks.filter(t => t.status !== 'done' && t.dueDate && _daysDiff(t.dueDate) === 0).length;
        const highCount = _tasks.filter(t => t.priority === 'High' && t.status !== 'done').length;
        const doneCount = _tasks.filter(t => t.status === 'done').length;

        // Recent pending tasks (top 5)
        const recent = _tasks.filter(t => t.status !== 'done')
            .sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0))
            .slice(0, 5);

        const now = new Date();
        const greeting = now.getHours() < 12 ? 'Bonjour' : now.getHours() < 18 ? 'Bon après-midi' : 'Bonsoir';
        const userName = (window.currentUser?.email || '').split('@')[0] || '';
        const greetText = userName ? greeting + ', ' + userName + ' !' : greeting + ' !';

        let html = '';

        // Hero
        html += '<div class="todo-welcome-hero">' +
            '<div class="todo-welcome-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg></div>' +
            '<div class="todo-welcome-h1">' + _escHtml(greetText) + '</div>' +
            '<div class="todo-welcome-sub">Vous avez <strong>' + total + '</strong> tâche' + (total > 1 ? 's' : '') + ' en cours' +
            (overdueCount ? ' dont <strong style="color:#dc2626">' + overdueCount + ' en retard</strong>' : '') + '</div>' +
        '</div>';

        // Grid cards
        html += '<div class="todo-welcome-grid">';
        html += '<div class="todo-welcome-card card-overdue" onclick="_todoDismissWelcome(&quot;overdue&quot;)">' +
            '<div class="todo-welcome-card-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#dc2626" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></div>' +
            '<div class="todo-welcome-card-num">' + overdueCount + '</div>' +
            '<div class="todo-welcome-card-label">En retard</div>' +
            '<div class="todo-welcome-card-desc">Tâches dont la date limite est dépassée</div></div>';
        html += '<div class="todo-welcome-card card-today" onclick="_todoDismissWelcome(&quot;today&quot;)">' +
            '<div class="todo-welcome-card-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#d97706" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>' +
            '<div class="todo-welcome-card-num">' + todayCount + '</div>' +
            '<div class="todo-welcome-card-label">Aujourd\'hui</div>' +
            '<div class="todo-welcome-card-desc">Tâches à terminer aujourd\'hui</div></div>';
        html += '<div class="todo-welcome-card card-high" onclick="_todoDismissWelcome(&quot;high&quot;)">' +
            '<div class="todo-welcome-card-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#4f46e5" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div>' +
            '<div class="todo-welcome-card-num">' + highCount + '</div>' +
            '<div class="todo-welcome-card-label">Urgentes</div>' +
            '<div class="todo-welcome-card-desc">Priorité haute à traiter en premier</div></div>';
        html += '<div class="todo-welcome-card card-done" onclick="_todoDismissWelcome(&quot;done&quot;)">' +
            '<div class="todo-welcome-card-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#16a34a" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>' +
            '<div class="todo-welcome-card-num">' + doneCount + '</div>' +
            '<div class="todo-welcome-card-label">Terminées</div>' +
            '<div class="todo-welcome-card-desc">Historique des tâches accomplies</div></div>';
        html += '</div>';

        // Recent tasks preview
        if (recent.length) {
            html += '<div>';
            html += '<div class="todo-welcome-recent-title">Dernières tâches ajoutées</div>';
            recent.forEach(t => {
                const prioCls = t.priority === 'High' ? 'prio-dot-high' : t.priority === 'Low' ? 'prio-dot-low' : 'prio-dot-medium';
                const meta = [];
                if (t.linkedStyle) meta.push(t.linkedStyle);
                if (t.linkedClient) meta.push(t.linkedClient);
                if (t.dueDate) meta.push(new Date(t.dueDate).toLocaleDateString('fr-FR', {day:'2-digit',month:'short'}));
                html += '<div class="todo-welcome-recent-item">' +
                    '<div class="prio-dot ' + prioCls + '"></div>' +
                    '<span>' + _escHtml(t.title) + '</span>' +
                    (meta.length ? '<span class="todo-welcome-recent-meta">' + meta.join(' · ') + '</span>' : '') +
                '</div>';
            });
            html += '</div>';
        }

        // Start button
        html += '<div class="todo-welcome-start">' +
            '<button class="todo-welcome-start-btn" onclick="_todoDismissWelcome(&quot;all&quot;)">' +
            '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>' +
            'Voir toutes les tâches</button></div>';

        el.innerHTML = html;
    }

    window._todoDismissWelcome = function(filter) {
        _welcomeShown = true;
        const welcome = document.getElementById('todo-welcome');
        const main = document.getElementById('todo-main-content');
        if (welcome) welcome.style.display = 'none';
        if (main) main.style.display = 'flex';
        if (filter) {
            _todoFilter = filter;
        }
        _renderAll();
    };

    // ─── Open / Close ─────────────────────────────────────────
    window.openTodoPanel = function() {
        _injectPanel();
        
        // Hide signal bubble when opening panel
        _hideSignalBubble();
        
        // Close chatbot panel if open
        document.getElementById('fu-chatbot-panel')?.classList.remove('open');

        requestAnimationFrame(() => {
            document.getElementById('todo-overlay')?.classList.add('open');
        });
        _todoOpen = true;

        const showContent = () => {
            if (!_welcomeShown) {
                // Show welcome page
                const welcome = document.getElementById('todo-welcome');
                const main = document.getElementById('todo-main-content');
                if (welcome) { welcome.style.display = 'flex'; _buildWelcome(); }
                if (main) main.style.display = 'none';
            } else {
                const welcome = document.getElementById('todo-welcome');
                const main = document.getElementById('todo-main-content');
                if (welcome) welcome.style.display = 'none';
                if (main) main.style.display = 'flex';
                _renderAll();
            }
            _populateDataLists();
        };

        if (!_tasks.length) {
            _loadTasks().then(showContent);
        } else {
            showContent();
        }
    };

    window.closeTodoPanel = function() {
        document.getElementById('todo-overlay')?.classList.remove('open');
        _todoOpen = false;

        // Re-evaluate showing the signal bubble
        const urgent = _tasks.filter(t => {
            if (t.status === 'done') return false;
            if (t.priority === 'High') return true;
            if (t.dueDate && _daysDiff(t.dueDate) <= 0) return true;
            return false;
        }).length;
        _updateSignalBubble(urgent);
    };

    function _escHtml(s) {
        return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ─── Inject Floating Action Button ────────────────────────
    function _injectTodoFab() {
        if (document.getElementById('todo-fab')) return;

        const btn = document.createElement('button');
        btn.id = 'todo-fab';
        btn.title = 'To-Do List';
        btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
            </svg>
            <span class="todo-fab-badge" id="todo-fab-badge"></span>
        `;
        
        btn.onclick = (e) => {
            e.stopPropagation();
            if (_todoOpen) {
                closeTodoPanel();
            } else {
                openTodoPanel();
            }
        };

        document.body.appendChild(btn);
    }

    // ─── Init ─────────────────────────────────────────────────
    function _init() {
        _injectNavItem();
        _injectPanel();
        _injectTodoFab();

        // Listen for document clicks to close To-Do when clicking outside and handle chatbot toggle
        document.addEventListener('click', (e) => {
            // Close todo panel if chatbot button is clicked
            if (e.target.closest('#fu-chatbot-btn')) {
                closeTodoPanel();
                _hideSignalBubble();
                return;
            }

            // Close todo panel if clicking outside
            const overlay = document.getElementById('todo-overlay');
            const fab = document.getElementById('todo-fab');
            const navBtn = document.getElementById('tab-todo');
            const bubble = document.getElementById('todo-signal-bubble');
            
            if (_todoOpen && overlay && overlay.classList.contains('open')) {
                const panel = overlay.querySelector('.todo-panel');
                if (panel && !panel.contains(e.target) && 
                    (!fab || !fab.contains(e.target)) && 
                    (!navBtn || !navBtn.contains(e.target)) &&
                    (!bubble || !bubble.contains(e.target))) {
                    closeTodoPanel();
                }
            }
        });

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
