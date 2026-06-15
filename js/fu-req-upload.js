// ================================================================
//  AW27 — Ordering FU Req : Upload Outlook + PDF
//  Charger après app.js dans index.html
// ================================================================

(function initFUReqUpload() {

    // ── Nom exact du menu dans GAS ────────────────────────────────
    const FU_SHEET_LABEL = "Ordering FU Req";
    const FU_COL_OUTLOOK = "Outlook File";
    const FU_COL_PDF     = "PDF File";

    // ── Styles ────────────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById("fu-upload-styles")) return;
        const s = document.createElement("style");
        s.id = "fu-upload-styles";
        s.textContent = `
        .fu-file-cell {
            display: flex; align-items: center; gap: 5px;
            min-width: 110px;
        }
        .fu-upload-btn {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 3px 9px; border-radius: 20px;
            border: 1px dashed #bdc1c6;
            background: transparent; color: #5f6368;
            font-size: 11px; font-weight: 500; cursor: pointer;
            font-family: system-ui, sans-serif;
            transition: all .15s; white-space: nowrap;
        }
        .fu-upload-btn:hover {
            border-style: solid; border-color: #1a73e8;
            background: #e8f0fe; color: #1a73e8;
        }
        .fu-upload-btn.outlook:hover {
            border-color: #0078d4; background: #e6f0fb; color: #0078d4;
        }
        .fu-view-btn {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 3px 9px; border-radius: 20px;
            border: 1px solid #1a73e8;
            background: #e8f0fe; color: #1a73e8;
            font-size: 11px; font-weight: 500; cursor: pointer;
            font-family: system-ui, sans-serif;
            transition: background .15s; white-space: nowrap;
        }
        .fu-view-btn.outlook {
            border-color: #0078d4; background: #e6f0fb; color: #0078d4;
        }
        .fu-view-btn:hover { background: #d2e3fc; }
        .fu-view-btn.outlook:hover { background: #cce0f5; }
        .fu-del-btn {
            display: inline-flex; align-items: center; justify-content: center;
            width: 22px; height: 22px; border-radius: 50%;
            border: 1px solid #e8eaed;
            background: #f8f9fa; color: #80868b;
            cursor: pointer; font-size: 11px;
            transition: all .15s; flex-shrink: 0;
        }
        .fu-del-btn:hover { background: #fce8e6; border-color: #f5c6c2; color: #c5221f; }
        @keyframes fu-req-spin { to { transform: rotate(360deg); } }
        .fu-req-spin { display: inline-block; animation: fu-req-spin .7s linear infinite; }
        `;
        document.head.appendChild(s);
    }

    const esc2 = s => String(s || "")
        .replace(/&/g,"&amp;").replace(/</g,"&lt;")
        .replace(/>/g,"&gt;").replace(/"/g,"&quot;");

    // ── Trouver la clé du menu FU Req ────────────────────────────
    function _getFUKey() {
        return Object.keys(window.SHEET_CONFIG || {}).find(k => {
            const cfg = window.SHEET_CONFIG[k];
            return (cfg.label || "").toLowerCase().includes("ordering fu") ||
                   (cfg.label || "").toLowerCase().includes("fu req") ||
                   (cfg.sheetName || "").toLowerCase().includes("fu req");
        });
    }

    // ── Patcher SHEET_CONFIG pour ajouter les 2 colonnes ─────────
    function patchFUConfig() {
        const key = _getFUKey();
        if (!key) return;
        const cols = window.SHEET_CONFIG[key].cols;
        if (!cols) return;
        if (!cols.find(c => c.key === FU_COL_OUTLOOK)) {
            cols.push({ key: FU_COL_OUTLOOK, label: "Outlook File", type: "text" });
        }
        if (!cols.find(c => c.key === FU_COL_PDF)) {
            cols.push({ key: FU_COL_PDF,     label: "PDF File",     type: "text" });
        }
        console.log("[AW27] FU Req colonnes patchées ✓");
    }

    // ── Render cellule fichier ────────────────────────────────────
    function renderFileCell(url, rowIndex, colKey, type, label) {
        const td = document.createElement("td");
        td.dataset.key      = colKey;
        td.dataset.rowIndex = rowIndex;
        td.style.padding    = "6px 10px";
        td.style.verticalAlign = "middle";

        const isOutlook = type === "outlook";
        const icon      = isOutlook ? "ti-mail" : "ti-file-type-pdf";
        const colorCls  = isOutlook ? "outlook" : "";
        const accept    = isOutlook
            ? ".msg,.eml,application/vnd.ms-outlook,message/rfc822"
            : "application/pdf,.pdf";

        const wrap = document.createElement("div");
        wrap.className = "fu-file-cell";

        if (url && url.startsWith("http")) {
            // Bouton Voir
            const viewBtn = document.createElement("button");
            viewBtn.className = `fu-view-btn ${colorCls}`;
            viewBtn.innerHTML = `<i class="ti ${icon}" aria-hidden="true"></i>${label}`;
            viewBtn.onclick = (e) => {
                e.stopPropagation();
                if (isOutlook) {
                    // Convertir URL Drive en URL de téléchargement direct
                    let downloadUrl = url;
                    // Format lh3.googleusercontent.com/d/FILE_ID
                    const m1 = url.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
                    // Format drive.google.com/file/d/FILE_ID
                    const m2 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                    // Format ?id=FILE_ID
                    const m3 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);

                    const fileId = (m1 || m2 || m3)?.[1];
                    if (fileId) {
                        downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
                    }

                    const a = document.createElement("a");
                    a.href     = downloadUrl;
                    a.download = "email.msg";
                    a.style.display = "none";
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => a.remove(), 1000);
                } else if (typeof openCPDFPreview === "function") {
                    openCPDFPreview(url, label);
                } else {
                    window.open(url, "_blank");
                }
            };

            // Bouton Remplacer
            const replBtn = document.createElement("button");
            replBtn.className = "fu-del-btn";
            replBtn.title     = "Remplacer";
            replBtn.innerHTML = `<i class="ti ti-refresh" aria-hidden="true"></i>`;
            replBtn.onclick   = (e) => {
                e.stopPropagation();
                _triggerUpload(rowIndex, colKey, type, accept, wrap, url);
            };

            // Bouton Supprimer
            const delBtn = document.createElement("button");
            delBtn.className = "fu-del-btn";
            delBtn.title     = "Supprimer";
            delBtn.innerHTML = `<i class="ti ti-trash" aria-hidden="true"></i>`;
            delBtn.onclick   = async (e) => {
                e.stopPropagation();
                if (!confirm("Supprimer ce fichier ?")) return;
                await _saveFileUrl(rowIndex, colKey, "");
                td.innerHTML = "";
                td.appendChild(_buildUploadBtn(rowIndex, colKey, type, accept, label, colorCls, icon, td));
            };

            wrap.appendChild(viewBtn);
            wrap.appendChild(replBtn);
            wrap.appendChild(delBtn);
        } else {
            wrap.appendChild(_buildUploadBtn(rowIndex, colKey, type, accept, label, colorCls, icon, td));
        }

        td.appendChild(wrap);
        return td;
    }

    function _buildUploadBtn(rowIndex, colKey, type, accept, label, colorCls, icon, td) {
        const btn = document.createElement("button");
        btn.className = `fu-upload-btn ${colorCls}`;
        btn.innerHTML = `<i class="ti ti-upload" aria-hidden="true"></i>${label}`;
        btn.onclick = (e) => {
            e.stopPropagation();
            _triggerUpload(rowIndex, colKey, type, accept, btn.closest(".fu-file-cell"), null);
        };
        return btn;
    }

    // ── Déclencher upload ─────────────────────────────────────────
    function _triggerUpload(rowIndex, colKey, type, accept, wrapEl, currentUrl) {
        const input = document.createElement("input");
        input.type   = "file";
        input.accept = accept;
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;
            if (file.size > 20 * 1024 * 1024) {
                typeof showToast === "function" && showToast("Fichier trop lourd (max 20 Mo)", "error");
                return;
            }

            // Feedback
            const origHTML = wrapEl.innerHTML;
            wrapEl.innerHTML = `<i class="ti ti-loader-2 fu-req-spin" aria-hidden="true" style="font-size:14px;color:#1a73e8"></i> <span style="font-size:11px;color:#5f6368">Upload...</span>`;

            typeof showToast === "function" && showToast("Upload en cours…", "info", 8000);

            try {
                const base64 = await new Promise((res, rej) => {
                    const rd = new FileReader();
                    rd.onload  = e => res(e.target.result);
                    rd.onerror = rej;
                    rd.readAsDataURL(file);
                });

                // Utiliser uploadCommentPDF existant
                const url = await window.uploadCommentPDF(
                    rowIndex, colKey,
                    file.name,
                    base64.split(",")[1],
                    file.type || "application/octet-stream",
                    null
                );

                // Mettre à jour state
                const fuKey = _getFUKey();
                const row   = (window.state?.data?.[fuKey] || []).find(r => r._rowIndex === rowIndex);
                if (row) row[colKey] = url;

                typeof showToast === "function" && showToast("Fichier uploadé", "success");

                // Rafraîchir la cellule
                const isOutlook = type === "outlook";
                const label     = isOutlook ? "Outlook" : "PDF";
                const icon      = isOutlook ? "ti-mail" : "ti-file-type-pdf";
                const colorCls  = isOutlook ? "outlook" : "";
                wrapEl.innerHTML = "";
                const td = wrapEl.closest("td");

                // Rebuilder les boutons
                const newCell = renderFileCell(url, rowIndex, colKey, type, label);
                if (td) {
                    td.innerHTML = "";
                    const newWrap = newCell.querySelector(".fu-file-cell");
                    if (newWrap) td.appendChild(newWrap);
                }

            } catch(err) {
                wrapEl.innerHTML = origHTML;
                typeof showToast === "function" && showToast("Erreur upload : " + err.message, "error");
            }
        };
        input.click();
    }

    // ── Sauvegarder URL ───────────────────────────────────────────
    async function _saveFileUrl(rowIndex, colKey, url) {
        const fuKey = _getFUKey();
        try {
            await window.quickUpdate(rowIndex, colKey, url, fuKey || "ordering");
            const row = (window.state?.data?.[fuKey] || []).find(r => r._rowIndex === rowIndex);
            if (row) row[colKey] = url;
        } catch(err) {
            typeof showToast === "function" && showToast("Erreur : " + err.message, "error");
        }
    }

    // ── Patcher renderTable pour injecter les cellules fichier ────
    function patchRenderTable() {
        const origRenderTable = window.renderTable;
        if (!origRenderTable || window._fuRenderPatched) return;
        window._fuRenderPatched = true;

        window.renderTable = function() {
            origRenderTable.apply(this, arguments);
            // Injecter les cellules si on est sur le bon menu
            setTimeout(injectFileCells, 80);
        };
    }

    // ── Injecter les cellules dans le tableau ─────────────────────
    function injectFileCells() {
        const fuKey = _getFUKey();
        if (!fuKey || window.state?.activeSheet !== fuKey) return;

        const cfg  = window.SHEET_CONFIG[fuKey];
        const rows = window.state?.data?.[fuKey] || [];
        if (!cfg || !rows.length) return;

        const thead = document.getElementById("table-head");
        const tbody = document.getElementById("table-body");
        if (!thead || !tbody) return;

        // Trouver les index des colonnes Outlook et PDF dans les th
        const ths = Array.from(thead.querySelectorAll("th"));
        const outlookIdx = ths.findIndex(th => th.dataset.key === FU_COL_OUTLOOK);
        const pdfIdx     = ths.findIndex(th => th.dataset.key === FU_COL_PDF);

        if (outlookIdx === -1 && pdfIdx === -1) return;

        Array.from(tbody.querySelectorAll("tr")).forEach(tr => {
            const rowIndex = parseInt(tr.dataset.rowIndex, 10);
            if (isNaN(rowIndex)) return;

            const row = rows.find(r => r._rowIndex === rowIndex);
            if (!row) return;

            // Colonne Outlook
            if (outlookIdx !== -1) {
                const td = tr.cells[outlookIdx];
                if (td && !td.dataset.fuPatched) {
                    td.dataset.fuPatched = "1";
                    const url = (row[FU_COL_OUTLOOK] || "").trim();
                    const newTd = renderFileCell(url, rowIndex, FU_COL_OUTLOOK, "outlook", "Outlook");
                    td.innerHTML = "";
                    td.style.padding = "6px 10px";
                    const wrap = newTd.querySelector(".fu-file-cell");
                    if (wrap) td.appendChild(wrap);
                }
            }

            // Colonne PDF
            if (pdfIdx !== -1) {
                const td = tr.cells[pdfIdx];
                if (td && !td.dataset.fuPatched) {
                    td.dataset.fuPatched = "1";
                    const url = (row[FU_COL_PDF] || "").trim();
                    const newTd = renderFileCell(url, rowIndex, FU_COL_PDF, "pdf", "PDF");
                    td.innerHTML = "";
                    td.style.padding = "6px 10px";
                    const wrap = newTd.querySelector(".fu-file-cell");
                    if (wrap) td.appendChild(wrap);
                }
            }
        });
    }

    // ── Observer le tableau pour les renders dynamiques ───────────
    function observeTableBody() {
        const tbody = document.getElementById("table-body");
        if (!tbody) return;
        new MutationObserver(() => {
            const fuKey = _getFUKey();
            if (window.state?.activeSheet === fuKey) {
                setTimeout(injectFileCells, 50);
            }
        }).observe(tbody, { childList: true });
    }

    // ── Init ──────────────────────────────────────────────────────
    function init() {
        injectStyles();

        // Patcher après que renderAll ait fini (menus custom chargés)
        const _origRenderAll = window.renderAll;
        if (typeof _origRenderAll === "function" && !window._fuRenderAllPatched) {
            window._fuRenderAllPatched = true;
            window.renderAll = function(...args) {
                const result = _origRenderAll.apply(this, args);
                patchFUConfig();
                return result;
            };
        }
        // Fallback
        setTimeout(() => {
            patchFUConfig();
            patchRenderTable();
            observeTableBody();
        }, 3000);

        console.log("[AW27] FU Req Upload ✓");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 500);
    }

})();
