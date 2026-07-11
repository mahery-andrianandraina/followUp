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
    // ── Extraire les données du BDC Excel pour un style ─────
    async function extractBDCData(base64, styleCode) {
        return new Promise((resolve, reject) => {
            _waitForXLSX(function(XL) {
                if (!XL) { reject(new Error("SheetJS non disponible")); return; }
                try {
                    const wb = XL.read(base64, { type: "base64" });

                    // Chercher la feuille RESUME (insensible à la casse)
                    const resumeSheetName = wb.SheetNames.find(n =>
                        n.trim().toUpperCase() === "RESUME"
                    );
                    if (!resumeSheetName) {
                        reject(new Error("Feuille RESUME introuvable dans le BDC."));
                        return;
                    }

                    const ws   = wb.Sheets[resumeSheetName];
                    const data = XL.utils.sheet_to_json(ws, { header: 1, defval: "" });

                    // Trouver la ligne d'en-têtes
                    let headerRow = -1;
                    for (let i = 0; i < data.length; i++) {
                        if (data[i].some(c => String(c).trim().toUpperCase() === "PRODUCT NAME")) {
                            headerRow = i; break;
                        }
                    }
                    if (headerRow === -1) {
                        reject(new Error("En-têtes introuvables dans RESUME.")); return;
                    }

                    const headers = data[headerRow].map(h => String(h).trim().toUpperCase());
                    const iProduct    = headers.indexOf("PRODUCT NAME");
                    const iStyleCode  = headers.indexOf("STYLE CODE");
                    const iQty        = headers.indexOf("QTY PER SKU");
                    const iPrice      = headers.indexOf("PURCHASE PRICE");
                    const iDate       = headers.indexOf("FIRST ETD SHIPMENT DATE");
                    const iPacking    = headers.indexOf("PO PACKING TYPE");

                    if (iProduct === -1) {
                        reject(new Error("Colonne PRODUCT NAME introuvable.")); return;
                    }

                    // Collecter les lignes pour ce style
                    let totalQty  = null;
                    let price     = null;
                    let vslDate   = null;

                    for (let i = headerRow + 1; i < data.length; i++) {
                        const row       = data[i];
                        const product   = String(row[iProduct]   || "").trim();
                        const stylecode = String(iStyleCode !== -1 ? (row[iStyleCode] || "") : "").trim();

                        // Mot après le premier "-" dans STYLE CODE = coloris (ex: "VEM" dans "HLAODI-VEM")
                        const dashIdx = stylecode.indexOf("-");
                        const coloris = dashIdx !== -1 ? stylecode.slice(dashIdx + 1) : "";

                        // Nom complet du style = PRODUCT NAME + "-" + coloris
                        const fullStyleName = coloris ? `${product}-${coloris}` : product;

                        // Matcher avec le Cust Style Ref de la card
                        // On essaie d'abord le nom complet, puis PRODUCT NAME seul en fallback
                        const isMatch = fullStyleName.toUpperCase() === styleCode.toUpperCase()
                                     || product.toUpperCase() === styleCode.toUpperCase();

                        if (!isMatch) continue;

                        const packing = String(row[iPacking] || "").trim().toUpperCase();

                        // Ignorer les lignes TOTAL (elles n'ont pas de STYLE CODE
                        // donc ne matchent pas un style avec coloris, et agrègent
                        // toutes les couleurs → on somme les lignes de données)
                        if (packing === "TOTAL") continue;

                        // Sommer la qty de chaque ligne de données
                        if (iQty !== -1) {
                            const q = parseFloat(String(row[iQty] || "0").replace(/\s/g,"").replace(/,/g,"."));
                            if (!isNaN(q) && q > 0) totalQty = (totalQty || 0) + q;
                        }

                        // Prix et date : prendre la première valeur trouvée
                        if (price === null && iPrice !== -1) {
                            const p = parseFloat(String(row[iPrice] || "").replace(/,/g,".").replace(/\s/g,""));
                            if (!isNaN(p) && p > 0) price = p;
                        }
                        if (vslDate === null && iDate !== -1) {
                            const d = String(row[iDate] || "").trim();
                            if (d) vslDate = convertBDCDate(d);
                        }
                    }

                    if (totalQty === null && price === null && vslDate === null) {
                        reject(new Error(`Style "${styleCode}" introuvable dans le BDC (PRODUCT NAME).`));
                        return;
                    }

                    resolve({ qty: totalQty, price, vslDate });
                } catch(e) {
                    reject(e);
                }
            });
        });
    }

    // ── Convertir DD/MM/YYYY → YYYY-MM-DD (format attendu par l'app) ──
    function convertBDCDate(dateStr) {
        if (!dateStr) return "";
        const s = String(dateStr).trim();
        // DD/MM/YYYY
        const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
        // DD-MM-YYYY
        const m2 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
        if (m2) return `${m2[3]}-${m2[2].padStart(2,"0")}-${m2[1].padStart(2,"0")}`;
        // Déjà en YYYY-MM-DD ou autre → retourner tel quel
        return s;
    }

    // ── Modale de validation BDC ──────────────────────────────
    function openBDCValidationModal(styleCode, rowIdx, extracted, btn, base64, fileName, mimeType) {
        document.getElementById("bdc-val-modal")?.remove();

        const detRow = (window.state?.data?.details || []).find(r => r._rowIndex === rowIdx);
        const existConf  = detRow?.["Conf Total"]      || "";
        const existPrice = detRow?.["Approved Price $"] || "";
        const existVsl   = detRow?.["Initial Vsl Date"] || "";

        const fmtQty   = extracted.qty   !== null ? String(extracted.qty)  : "—";
        const fmtPrice = extracted.price !== null ? `$${extracted.price}` : "—";
        const fmtDate  = extracted.vslDate || "—";

        function fieldRow(label, key, newVal, existVal) {
            const hasExist = String(existVal || "").trim() !== "";
            return `
            <tr style="border-bottom:0.5px solid var(--border,#e5e7eb);">
                <td style="padding:12px 14px;font-size:13px;font-weight:500;
                    color:var(--text-primary,#111827);">${label}</td>
                <td style="padding:12px 14px;font-size:13px;
                    color:${newVal === "—" ? "var(--text-muted,#9ca3af)" : "#166534"};
                    font-weight:600;">${newVal}</td>
                <td style="padding:12px 14px;font-size:13px;
                    color:var(--text-secondary,#6b7280);">
                    ${hasExist ? `<span style="color:#92400e;">${existVal}</span>` : '<span style="color:#d1d5db;">—</span>'}
                </td>
                <td style="padding:12px 14px;">
                    ${newVal !== "—" ? `
                    <label style="display:flex;align-items:center;gap:6px;
                        cursor:pointer;font-size:11px;color:var(--text-secondary,#6b7280);">
                        <input type="checkbox" id="bdc-chk-${key}"
                            ${!hasExist ? "checked" : ""}
                            style="accent-color:#1565c0;"/>
                        ${hasExist ? "Écraser" : "Importer"}
                    </label>` : '<span style="color:#d1d5db;font-size:11px;">non disponible</span>'}
                </td>
            </tr>`;
        }

        const modal = document.createElement("div");
        modal.id = "bdc-val-modal";
        modal.className = "modal-overlay";
        modal.innerHTML = `
        <div class="modal" style="max-width:700px;width:95vw;">
            <div class="modal-header">
                <div>
                    <div class="modal-title">📊 Données extraites du BDC</div>
                    <div class="modal-subtitle">${styleCode} — Valide avant d'importer</div>
                </div>
                <button class="btn-close" onclick="document.getElementById('bdc-val-modal').remove()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body" style="padding:1rem 1.5rem 1.5rem;">
                <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
                    <colgroup>
                        <col style="width:22%;"/>
                        <col style="width:24%;"/>
                        <col style="width:24%;"/>
                        <col style="width:30%;"/>
                    </colgroup>
                    <thead>
                        <tr style="background:var(--surface-2,#f9fafb);">
                            <th style="padding:9px 14px;text-align:left;font-size:10px;
                                color:var(--text-muted,#9ca3af);text-transform:uppercase;
                                letter-spacing:.07em;">Champ</th>
                            <th style="padding:9px 14px;text-align:left;font-size:10px;
                                color:var(--text-muted,#9ca3af);text-transform:uppercase;
                                letter-spacing:.07em;">Valeur BDC</th>
                            <th style="padding:9px 14px;text-align:left;font-size:10px;
                                color:var(--text-muted,#9ca3af);text-transform:uppercase;
                                letter-spacing:.07em;">Valeur actuelle</th>
                            <th style="padding:9px 14px;text-align:left;font-size:10px;
                                color:var(--text-muted,#9ca3af);text-transform:uppercase;
                                letter-spacing:.07em;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${fieldRow("Conf Total (qty)", "qty",   fmtQty,   existConf)}
                        ${fieldRow("Approved Price $", "price", fmtPrice, existPrice)}
                        ${fieldRow("Initial VSL Date", "vsl",   fmtDate,  existVsl)}
                    </tbody>
                </table>

                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
                    <button class="btn btn-ghost"
                        onclick="document.getElementById('bdc-val-modal').remove()">
                        Ignorer
                    </button>
                    <button class="btn btn-primary" id="bdc-val-confirm"
                        onclick="window._bdcValConfirm()">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor" width="13" height="13">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        Importer les données
                    </button>
                </div>
            </div>
        </div>`;

        modal._data = { styleCode, rowIdx, extracted, btn, base64, fileName, mimeType };
        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add("open"));
    }

    // ── Confirmer l'import BDC ────────────────────────────────
    window._bdcValConfirm = async function() {
        const modal = document.getElementById("bdc-val-modal");
        if (!modal) return;
        const { styleCode, rowIdx, extracted, btn, base64, fileName, mimeType } = modal._data;

        const importQty   = document.getElementById("bdc-chk-qty")?.checked;
        const importPrice = document.getElementById("bdc-chk-price")?.checked;
        const importVsl   = document.getElementById("bdc-chk-vsl")?.checked;

        const confirmBtn = document.getElementById("bdc-val-confirm");
        if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = "Import en cours…"; }

        try {
            // Mettre à jour les champs dans Details
            const updates = [];
            if (importQty   && extracted.qty   !== null) updates.push(["Conf Total",      String(extracted.qty)]);
            if (importPrice && extracted.price !== null) updates.push(["Approved Price $", String(extracted.price)]);
            if (importVsl   && extracted.vslDate)        updates.push(["Initial Vsl Date", extracted.vslDate]);

            for (const [field, value] of updates) {
                if (typeof window.quickUpdate === "function") {
                    await window.quickUpdate(rowIdx, field, value, "details");
                }
                // Mise à jour en mémoire
                const row = (window.state?.data?.details || []).find(r => r._rowIndex === rowIdx);
                if (row) row[field] = value;
            }

            modal.remove();

            // Continuer avec l'upload Drive du BDC
            await _doBDCUpload(styleCode, rowIdx, btn, base64, fileName, mimeType);

        } catch(err) {
            if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = "Importer les données"; }
            typeof showToast === "function" && showToast("Erreur : " + err.message, "error");
        }
    };

    // ── Upload Drive effectif (séparé pour réutilisation) ─────
    async function _doBDCUpload(styleCode, rowIdx, btn, base64, fileName, mimeType) {
        try {
            const url = await uploadBDCFile(rowIdx, fileName, base64, mimeType);

            const row = (window.state?.data?.details || []).find(r => r._rowIndex === rowIdx);
            if (row) row[BDC_COL] = url;

            refreshBDCButton(btn, url);

            if (typeof window.checkAndNotifyOrderConfirm === "function") {
                setTimeout(() => window.checkAndNotifyOrderConfirm(rowIdx), 300);
            }

            typeof showToast === "function" &&
                showToast(`BDC uploadé ✓ — ${fileName}`, "success");
        } catch(err) {
            btn.innerHTML = `<i class="ti ti-file-plus" aria-hidden="true"></i><span>BDC</span>`;
            typeof showToast === "function" &&
                showToast("Erreur upload BDC : " + err.message, "error");
        } finally {
            btn.disabled = false;
        }
    }

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

                const mimeType = file.type || "application/octet-stream";
                const isExcel  = file.name.match(/\.xlsx?$/i);

                // Si c'est un Excel → extraction obligatoire
                // Si le style n'est pas trouvé → upload BLOQUÉ (mauvais BDC)
                if (isExcel) {
                    typeof showToast === "function" &&
                        showToast("Lecture du BDC…", "info", 5000);
                    try {
                        const extracted = await extractBDCData(base64, styleCode);
                        btn.disabled  = false;
                        btn.innerHTML = origHTML;
                        // Ouvrir la modale de validation avant upload
                        openBDCValidationModal(styleCode, rowIdx, extracted, btn, base64, file.name, mimeType);
                        return; // L'upload se fait depuis la modale
                    } catch(extractErr) {
                        // Style introuvable → ce n'est pas le bon BDC → bloquer
                        btn.disabled  = false;
                        btn.innerHTML = origHTML;
                        typeof showToast === "function" &&
                            showToast(
                                `❌ Style "${styleCode}" introuvable dans ce BDC — upload annulé. Vérifiez que vous avez sélectionné le bon fichier.`,
                                "error", 7000
                            );
                        return; // NE PAS uploader
                    }
                }

                // PDF → upload direct (pas d'extraction possible)
                await _doBDCUpload(styleCode, rowIdx, btn, base64, file.name, mimeType);

            } catch (err) {
                btn.innerHTML = origHTML;
                typeof showToast === "function" &&
                    showToast("Erreur upload BDC : " + err.message, "error");
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
