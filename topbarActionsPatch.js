// ============================================================
//  AW27 CHECKERS — Topbar Actions Patch
//  Déplace "Sync offline" et "Actualiser" dans la barre du haut
//  avec des icônes SVG professionnelles (sans emoji).
// ============================================================

(function () {
    'use strict';

    const CSS = `
    /* ── Boutons topbar actions ──────────────────────────────── */
    .topbar-action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        height: 34px;
        padding: 0 12px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.22);
        background: rgba(255,255,255,0.12);
        color: #ffffff;
        font-family: 'Inter', sans-serif;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s, transform 0.1s;
        white-space: nowrap;
        flex-shrink: 0;
    }
    .topbar-action-btn:hover {
        background: rgba(255,255,255,0.24);
        border-color: rgba(255,255,255,0.4);
    }
    .topbar-action-btn:active { transform: scale(0.97); }
    .topbar-action-btn svg {
        width: 15px;
        height: 15px;
        flex-shrink: 0;
        stroke: currentColor;
        fill: none;
    }

    /* Actualiser — état chargement */
    #topbar-refresh-btn.loading svg {
        animation: topbar-spin 0.7s linear infinite;
    }
    @keyframes topbar-spin { to { transform: rotate(360deg); } }

    /* Stale dot sur Actualiser */
    #topbar-refresh-btn .topbar-stale-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #f87171;
        border: 1.5px solid rgba(255,255,255,0.6);
        position: absolute;
        top: -3px;
        right: -3px;
        display: none;
    }
    #topbar-refresh-btn { position: relative; }
    #topbar-refresh-btn.stale .topbar-stale-dot { display: block; }

    /* Sync offline — badge de statut */
    #topbar-sync-btn .topbar-sync-badge {
        font-size: 9px;
        font-weight: 700;
        padding: 1px 5px;
        border-radius: 20px;
        background: rgba(255,255,255,0.2);
        color: #fff;
        line-height: 1.4;
    }

    /* Séparateur vertical entre groupes */
    .topbar-divider {
        width: 1px;
        height: 20px;
        background: rgba(255,255,255,0.2);
        flex-shrink: 0;
    }

    /* Masquer les anciens boutons dans la sidebar footer */
    #refresh-btn,
    #btn-offline-sync {
        display: none !important;
    }

    /* Label masqué sur petits écrans */
    @media (max-width: 900px) {
        .topbar-action-btn .topbar-btn-label { display: none; }
        .topbar-action-btn { padding: 0 9px; }
    }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = 'topbar-actions-styles';
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    // ── SVG icons ───────────────────────────────────────────────
    const ICON_REFRESH = `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M23 4v6h-6"/>
        <path d="M1 20v-6h6"/>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>`;

    const ICON_SYNC = `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 17l-4-4 4-4"/>
        <path d="M4 13h10.5a4.5 4.5 0 0 0 0-9H11"/>
        <path d="M16 7l4 4-4 4"/>
        <path d="M20 11H9.5a4.5 4.5 0 0 0 0 9H13"/>
    </svg>`;

    // ── Injecter les boutons dans header-right ──────────────────
    function injectTopbarButtons() {
        const headerRight = document.querySelector('.header-right');
        if (!headerRight || document.getElementById('topbar-refresh-btn')) return;

        // ── Bouton Actualiser ──────────────────────────────────
        const refreshBtn = document.createElement('button');
        refreshBtn.id        = 'topbar-refresh-btn';
        refreshBtn.className = 'topbar-action-btn';
        refreshBtn.title     = 'Actualiser les données';
        refreshBtn.innerHTML =
            ICON_REFRESH +
            '<span class="topbar-btn-label">Actualiser</span>' +
            '<span class="topbar-stale-dot"></span>';

        refreshBtn.addEventListener('click', function () {
            if (typeof window.fetchAllData !== 'function') return;
            refreshBtn.classList.add('loading');
            refreshBtn.classList.remove('stale');
            const dot = document.getElementById('refresh-dot');
            if (dot) dot.style.display = 'none';

            const orig = window.fetchAllData;
            // Appeler fetchAllData et retirer le spinner quand c'est fini
            const p = window.fetchAllData();
            if (p && typeof p.finally === 'function') {
                p.finally(function () { refreshBtn.classList.remove('loading'); });
            } else {
                setTimeout(function () { refreshBtn.classList.remove('loading'); }, 3000);
            }
        });

        // ── Séparateur ─────────────────────────────────────────
        const divider = document.createElement('div');
        divider.className = 'topbar-divider';

        // ── Bouton Sync offline ────────────────────────────────
        const syncBtn = document.createElement('button');
        syncBtn.id        = 'topbar-sync-btn';
        syncBtn.className = 'topbar-action-btn';
        syncBtn.title     = 'Synchronisation hors connexion';
        syncBtn.innerHTML =
            ICON_SYNC +
            '<span class="topbar-btn-label">Sync offline</span>';

        syncBtn.addEventListener('click', function () {
            if (typeof window.openSyncPanel === 'function') window.openSyncPanel();
        });

        // ── Insérer avant le premier enfant de header-right ───
        headerRight.insertBefore(divider,  headerRight.firstChild);
        headerRight.insertBefore(syncBtn,  headerRight.firstChild);
        headerRight.insertBefore(refreshBtn, headerRight.firstChild);
    }

    // ── Observer le refresh-dot original pour répercuter sur topbar ──
    function watchRefreshDot() {
        const dot = document.getElementById('refresh-dot');
        if (!dot) { setTimeout(watchRefreshDot, 500); return; }

        const observer = new MutationObserver(function () {
            const topbarBtn = document.getElementById('topbar-refresh-btn');
            if (!topbarBtn) return;
            const isStale = dot.style.display !== 'none';
            topbarBtn.classList.toggle('stale', isStale);
        });
        observer.observe(dot, { attributes: true, attributeFilter: ['style'] });
    }

    // ── Init ────────────────────────────────────────────────────
    function init() {
        injectTopbarButtons();
        watchRefreshDot();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Observer au cas où le header serait monté tardivement
    new MutationObserver(function (_, obs) {
        if (document.querySelector('.header-right') && !document.getElementById('topbar-refresh-btn')) {
            injectTopbarButtons();
        }
        if (document.getElementById('refresh-dot')) {
            watchRefreshDot();
            obs.disconnect();
        }
    }).observe(document.body, { childList: true, subtree: true });

    console.log('[AW27] Topbar Actions Patch chargé ✓');
})();
