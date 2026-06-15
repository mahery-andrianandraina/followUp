// ================================================================
//  AW27 — Thème Google / Material Design
//  Applique les couleurs, polices et styles Google à toute l'app
//  Charger en DERNIER dans index.html
// ================================================================
(function() {

    function injectGoogleTheme() {
        if (document.getElementById("aw-google-theme")) return;

        // Police Google (Roboto + Google Sans fallback)
        if (!document.querySelector('link[href*="fonts.googleapis"]')) {
            const link = document.createElement("link");
            link.rel  = "stylesheet";
            link.href = "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Google+Sans:wght@400;500;700&display=swap";
            document.head.appendChild(link);
        }

        const s = document.createElement("style");
        s.id = "aw-google-theme";
        s.textContent = `
        :root {
            /* ── Palette Google Material ── */
            --g-blue:        #1A73E8;
            --g-blue-dark:   #1557B0;
            --g-blue-light:  #E8F0FE;
            --g-green:       #1E8E3E;
            --g-green-light: #E6F4EA;
            --g-red:         #D93025;
            --g-red-light:   #FCE8E6;
            --g-yellow:      #F9AB00;
            --g-yellow-light:#FEF7E0;
            --g-grey-50:     #F8F9FA;
            --g-grey-100:    #F1F3F4;
            --g-grey-200:    #E8EAED;
            --g-grey-300:    #DADCE0;
            --g-grey-600:    #80868B;
            --g-grey-700:    #5F6368;
            --g-grey-900:    #202124;

            /* ── Variables app remappées ── */
            --color-primary:              var(--g-blue);
            --color-primary-dark:         var(--g-blue-dark);
            --color-background-primary:   #ffffff;
            --color-background-secondary: var(--g-grey-50);
            --color-hover:                var(--g-blue-light);
            --color-text:                 var(--g-grey-900);
            --color-text-secondary:       var(--g-grey-700);
            --color-border:               var(--g-grey-200);
        }

        body, button, input, select, textarea {
            font-family: 'Google Sans', 'Roboto', system-ui, -apple-system, sans-serif !important;
        }

        /* ── En-têtes de tableau ── */
        #table-head th {
            font-family: 'Google Sans','Roboto',sans-serif !important;
            font-weight: 500 !important;
            color: var(--g-grey-700) !important;
            font-size: 12px !important;
            letter-spacing: .3px;
            text-transform: uppercase;
            background: var(--g-grey-50) !important;
            border-bottom: 1px solid var(--g-grey-200) !important;
        }

        /* ── Lignes ── */
        #table-body td {
            font-size: 13px !important;
            color: var(--g-grey-900) !important;
            border-bottom: 1px solid var(--g-grey-100) !important;
        }
        #table-body tr:hover td {
            background: var(--g-blue-light) !important;
        }

        /* ── Boutons primaires ── */
        .btn-primary, button.primary, .add-btn {
            background: var(--g-blue) !important;
            color: #fff !important;
            border-radius: 24px !important;
            font-weight: 500 !important;
            box-shadow: 0 1px 2px rgba(60,64,67,.3) !important;
            transition: box-shadow .2s, background .2s !important;
        }
        .btn-primary:hover, button.primary:hover, .add-btn:hover {
            background: var(--g-blue-dark) !important;
            box-shadow: 0 1px 3px rgba(60,64,67,.4) !important;
        }

        /* ── Badges status ── */
        .status-badge, .badge {
            border-radius: 16px !important;
            font-weight: 500 !important;
            font-size: 11px !important;
            padding: 3px 10px !important;
        }

        /* ── Sidebar ── */
        .sidebar, nav.sidebar {
            background: linear-gradient(180deg, var(--g-blue) 0%, var(--g-blue-dark) 100%) !important;
        }
        .sidebar .nav-item.active, .sidebar a.active {
            background: rgba(255,255,255,.15) !important;
            border-radius: 0 24px 24px 0 !important;
        }

        /* ── Cartes / modals ── */
        .card, .modal-inner, .panel {
            border-radius: 12px !important;
            box-shadow: 0 1px 3px rgba(60,64,67,.15), 0 4px 8px rgba(60,64,67,.1) !important;
        }

        /* ── Champs de recherche ── */
        input[type="text"], input[type="search"], .search-input {
            border: 1px solid var(--g-grey-300) !important;
            border-radius: 24px !important;
            transition: border-color .2s, box-shadow .2s !important;
        }
        input[type="text"]:focus, input[type="search"]:focus, .search-input:focus {
            border-color: var(--g-blue) !important;
            box-shadow: 0 0 0 1px var(--g-blue) !important;
            outline: none !important;
        }

        /* ── Scrollbar Google ── */
        ::-webkit-scrollbar { width: 12px; height: 12px; }
        ::-webkit-scrollbar-thumb {
            background: var(--g-grey-300);
            border-radius: 12px;
            border: 3px solid transparent;
            background-clip: content-box;
        }
        ::-webkit-scrollbar-thumb:hover { background: var(--g-grey-600); background-clip: content-box; }
        ::-webkit-scrollbar-track { background: transparent; }
        `;
        document.head.appendChild(s);
        console.log("[AW27] Thème Google appliqué ✓");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", injectGoogleTheme);
    } else {
        injectGoogleTheme();
    }
})();
