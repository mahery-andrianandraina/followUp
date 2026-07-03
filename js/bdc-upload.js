// ================================================================
//  AW27 — BDC (Bon de Commande) Upload — Dashboard Card Integration
//  Charger après app.js dans index.html
//  Injecte un 4e bouton "BDC" dans la toolbar de chaque card style.
// ================================================================

(function initBDCUpload() {

    // ── Constante clé colonne ─────────────────────────────────
    const BDC_COL = "BDC_URL";

    // ── Styles ───────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById("bdc-upload-styles")) return;
        const s = document.createElement("style");
        s.id = "bdc-upload-styles";
        s.textContent = `
        @keyframes bdc-spin { to { transform: rotate(360deg); } }

        .dbs-tb-btn.tb-bdc:hover {
            background: #fdf4ff;
            color: #7e22ce;
            border-color: #d8b4fe;
        }
        .dbs-tb-btn.tb-bdc.has-bdc {
            color: #7e22ce;
        }

        /* Menu contextuel BDC (même look que .dbs-tp-inline-menu) */
        .bdc-inline-menu {
            position: absolute;
            bottom: calc(100% + 4px);
            right: 0;
            background: var(--color-background-primary, #fff);
            border: 0.5px solid var(--color-border-secondary, #d1d5db);
            border-radius: var(--border-radius-md, 8px);
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
            z-index: 1000;
            min-width: 180px;
            overflow: hidden;
        }
        `;
        document.head.appendChild(s);
    }

    // ── Récupérer la ligne live depuis state.data.details ────
    // Recherche par Cust Style Ref (= data-style-raw sur la card)
    // + optionnellement par Client
    function getLiveRow(styleCode, clientCode) {
        const rows = window.state?.data?.details || [];
        return rows.find(r =>
            r["Cust Style Ref"] === styleCode &&
            (!clientCode || (r.Client || r["Coll"] || "") === clientCode)
        ) || null;
    }

    // ── Upload vers GAS via UPLOAD_ORDERING_FILE ─────────────
    // Cette action GAS crée la colonne BDC_URL si elle n'existe pas,
    // écrit l'URL dans la cellule, et stocke le fichier dans /ORDERING.
    async function uploadBDCFile(rowIndex, fileName, base64Data, mimeType) {
        const gasUrl = window.GOOGLE_APPS_SCRIPT_URL;
        if (!gasUrl || gasUrl === "YOUR_WEB_APP_URL_HERE") {
            throw new Error("URL Google Apps Script non configurée.");
        }

        const res = await fetch(gasUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            redirect: "follow",
            body: JSON.stringify({
                action:    "UPLOAD_ORDERING_FILE",
                sheet:     "Details",      // nom exact de l'onglet GSheet
                colKey:    BDC_COL,        // "BDC_URL" — créé si absent
                rowIndex,
                fileName,
                base64Data,
                mimeType
            })
        });

        const json = await res.json();
        if (json.status !== "ok") throw new Error(json.message || "Erreur GAS lors de l'upload.");
        if (!json.url)            throw new Error("Aucune URL retournée par le serveur.");
        return json.url;
    }

    // ── Mettre à jour l'apparence du bouton ──────────────────
    function refreshBDCButton(btn, url) {
        if (url) {
            btn.classList.add("has-bdc");
            btn.title     = "BDC disponible — cliquer pour ouvrir ou remplacer";
            btn.innerHTML = `<i class="ti ti-file-invoice" aria-hidden="true"></i><span>BDC</span>`;
        } else {
            btn.classList.remove("has-bdc");
            btn.title     = "Ajouter le Bon de Commande";
            btn.innerHTML = `<i class="ti ti-file-plus" aria-hidden="true"></i><span>BDC</span>`;
        }
    }

    // ── Ouvrir le sélecteur de fichier et lancer l'upload ────
    function triggerBDCUpload(styleCode, rowIdx, btn) {
        const input  = document.createElement("input");
        input.type   = "file";
        input.accept = ".xlsx,.xls,.pdf,.msg,.eml,application/pdf," +
                       "application/vnd.ms-excel," +
                       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;

            // Vérification taille (max 25 Mo)
            if (file.size > 25 * 1024 * 1024) {
                typeof showToast === "function" &&
                    showToast("Fichier trop lourd (max 25 Mo)", "error");
                return;
            }

            // Feedback visuel immédiat
            const origHTML = btn.innerHTML;
            btn.disabled   = true;
            btn.innerHTML  = `<i class="ti ti-loader-2" style="display:inline-block;` +
                             `animation:bdc-spin .7s linear infinite;font-size:13px"></i>` +
                             `<span>...</span>`;
            typeof showToast === "function" &&
                showToast("Upload BDC en cours…", "info", 8000);

            try {
                // Lecture base64
                const base64 = await new Promise((res, rej) => {
                    const rd     = new FileReader();
                    rd.onload    = e => res(e.target.result.split(",")[1]);
                    rd.onerror   = rej;
                    rd.readAsDataURL(file);
                });

                // Upload vers Drive via GAS
                const url = await uploadBDCFile(
                    rowIdx,
                    file.name,
                    base64,
                    file.type || "application/octet-stream"
                );

                // Mise à jour en mémoire (sans rechargement)
                const row = (window.state?.data?.details || [])
                    .find(r => r._rowIndex === rowIdx);
                if (row) row[BDC_COL] = url;

                refreshBDCButton(btn, url);
                typeof showToast === "function" &&
                    showToast(`BDC uploadé ✓ — ${file.name}`, "success");

            } catch (err) {
                // Rollback visuel
                btn.innerHTML = origHTML;
                typeof showToast === "function" &&
                    showToast("Erreur upload BDC : " + err.message, "error");
            } finally {
                btn.disabled = false;
            }
        };

        input.click();
    }

    // ── Menu contextuel (BDC existant) : Ouvrir / Remplacer ──
    function showBDCMenu(btn, url, styleCode, rowIdx) {
        // Fermer tout menu BDC déjà ouvert
        document.querySelectorAll(".bdc-inline-menu").forEach(m => m.remove());

        const menu = document.createElement("div");
        menu.className = "bdc-inline-menu";

        // Option 1 : Ouvrir
        const optOpen = document.createElement("button");
        optOpen.className = "dbs-tp-menu-btn";
        optOpen.innerHTML = `<i class="ti ti-external-link" ` +
                            `style="font-size:13px;color:#1d4ed8" ` +
                            `aria-hidden="true"></i> Ouvrir le BDC`;
        optOpen.onclick = ev => {
            ev.stopPropagation();
            window.open(url, "_blank");
            menu.remove();
        };

        // Option 2 : Remplacer
        const optReplace = document.createElement("button");
        optReplace.className = "dbs-tp-menu-btn";
        optReplace.innerHTML = `<i class="ti ti-upload" ` +
                               `style="font-size:13px;color:#92400e" ` +
                               `aria-hidden="true"></i> Remplacer le BDC`;
        optReplace.onclick = ev => {
            ev.stopPropagation();
            menu.remove();
            triggerBDCUpload(styleCode, rowIdx, btn);
        };

        menu.appendChild(optOpen);
        menu.appendChild(optReplace);

        // Positionner le menu au-dessus du bouton
        const toolbar = btn.closest(".dbs-card-toolbar");
        if (toolbar) {
            toolbar.style.position = "relative";
            toolbar.appendChild(menu);
        }

        // Fermer en cliquant ailleurs
        setTimeout(() => {
            document.addEventListener("click", () => menu.remove(), { once: true });
        }, 0);
    }

    // ── Injecter le bouton BDC dans une toolbar de card ──────
    function injectBDCButton(toolbar) {
        // Éviter les doublons
        if (toolbar.querySelector(".tb-bdc")) return;

        // La card parente contient toutes les infos en data-attributes
        const card = toolbar.closest(".dbs-sc");
        if (!card) return;

        // styleCode = Cust Style Ref (positionné tel quel dans data-style-raw)
        const styleCode  = card.dataset.styleRaw  || card.dataset.style  || "";
        const clientCode = card.dataset.clientRaw || card.dataset.client || "";
        if (!styleCode) return;

        // Récupérer la ligne courante (state chargé à ce stade)
        const liveRow = getLiveRow(styleCode, clientCode);
        const rowIdx  = liveRow?._rowIndex ?? null;
        const bdcUrl  = (liveRow?.[BDC_COL] || "").trim();

        // Créer le bouton
        const btn       = document.createElement("button");
        btn.className   = "dbs-tb-btn tb-bdc";
        refreshBDCButton(btn, bdcUrl);

        btn.onclick = e => {
            e.stopPropagation();

            if (!rowIdx) {
                typeof showToast === "function" &&
                    showToast("Ligne style introuvable dans Details", "error");
                return;
            }

            // Relire l'URL au moment du clic (peut avoir changé depuis le render)
            const row2    = getLiveRow(styleCode, clientCode);
            const liveUrl = (row2?.[BDC_COL] || "").trim();
            refreshBDCButton(btn, liveUrl);

            if (liveUrl) {
                showBDCMenu(btn, liveUrl, styleCode, rowIdx);
            } else {
                triggerBDCUpload(styleCode, rowIdx, btn);
            }
        };

        toolbar.appendChild(btn);
    }

    // ── Patcher SHEET_CONFIG pour ajouter BDC_URL aux colonnes ─
    // Nécessaire pour que la colonne apparaisse dans la vue table Details.
    // Appelé dans le renderAll patché (après que fetchAllData ait fusionné les cols).
    function patchDetailsConfig() {
        const details = window.SHEET_CONFIG?.details;
        if (!details?.cols) return;
        if (!details.cols.find(c => c.key === BDC_COL)) {
            details.cols.push({ key: BDC_COL, label: "BDC", type: "text" });
            console.log("[AW27] BDC_URL ajouté aux colonnes Details ✓");
        }
    }

    // ── Scanner les toolbars déjà présentes dans le DOM ──────
    function scanToolbars() {
        document.querySelectorAll(".dbs-card-toolbar").forEach(injectBDCButton);
    }

    // ── Observer les nouvelles toolbars injectées par initCardToolbar ─
    // Séquence : renderDashboard() ajoute .dbs-sc
    //          → MutationObserver de initCardToolbar ajoute .dbs-card-toolbar
    //          → Notre observer ci-dessous ajoute le bouton BDC
    function observeToolbars() {
        new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;
                    // Nœud lui-même = toolbar
                    if (node.classList?.contains("dbs-card-toolbar")) {
                        injectBDCButton(node);
                    }
                    // Descendants (si un bloc entier est ajouté d'un coup)
                    node.querySelectorAll?.(".dbs-card-toolbar")
                        .forEach(injectBDCButton);
                });
            });
        }).observe(document.body, { childList: true, subtree: true });
    }

    // ── Patcher renderAll pour maintenir BDC_URL dans les cols ─
    function patchRenderAll() {
        if (window._bdcRenderAllPatched) return;
        const orig = window.renderAll;
        if (typeof orig !== "function") return;
        window._bdcRenderAllPatched = true;

        window.renderAll = function (...args) {
            patchDetailsConfig();             // maintenir la colonne après chaque fetch
            const result = orig.apply(this, args);
            setTimeout(scanToolbars, 200);    // fallback si dashboard déjà rendu
            return result;
        };
    }

    // ── Init ─────────────────────────────────────────────────
    function init() {
        injectStyles();
        observeToolbars();
        patchRenderAll();

        // Fallback : scanner les toolbars déjà présentes
        // (ex: si le dashboard était déjà rendu avant que ce script charge)
        setTimeout(scanToolbars, 400);

        console.log("[AW27] BDC Upload ✓");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        // app.js est déjà chargé — laisser 600ms pour que initCardToolbar
        // et l'auth Firebase aient le temps de s'initialiser
        setTimeout(init, 600);
    }

})();
