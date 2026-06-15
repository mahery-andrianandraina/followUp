// ================================================================
//  AW27 — Ordering : colonnes PI + PO → upload fichiers
// ================================================================

(function() {

    const UPLOAD_COLS = [
        {
            keys:    ["PI"],
            urlKey:  "PI URL",
            nameKey: "PI Filename",
            label:   "PI"
        },
        {
            keys:    ["PO #", "PO"],
            urlKey:  "PO URL",
            nameKey: "PO Filename",
            label:   "PO"
        }
    ];

    // ── Styles ────────────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById("pi-upload-styles")) return;
        const s = document.createElement("style");
        s.id = "pi-upload-styles";
        s.textContent = `
        .pi-cell { display:flex; align-items:center; gap:5px; }
        .pi-upload-btn {
            display:inline-flex; align-items:center; gap:4px;
            padding:3px 9px; border-radius:20px;
            border:1px dashed #bdc1c6; background:transparent; color:#5f6368;
            font-size:11px; font-weight:500; cursor:pointer;
            font-family:system-ui,sans-serif; transition:all .15s; white-space:nowrap;
        }
        .pi-upload-btn:hover { border-style:solid; border-color:#1a73e8; background:#e8f0fe; color:#1a73e8; }
        .pi-view-btn {
            display:inline-flex; align-items:center; gap:5px;
            padding:3px 10px; border-radius:20px;
            border:1px solid #1a73e8; background:#e8f0fe; color:#1a73e8;
            font-size:11px; font-weight:500; cursor:pointer;
            font-family:system-ui,sans-serif; transition:background .15s; white-space:nowrap;
            max-width:180px;
        }
        .pi-view-btn:hover { background:#d2e3fc; }
        .pi-view-btn .pi-fn { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:120px; }
        .pi-act {
            display:inline-flex; align-items:center; justify-content:center;
            width:22px; height:22px; border-radius:50%;
            border:1px solid #e8eaed; background:#f8f9fa; color:#80868b;
            cursor:pointer; font-size:11px; transition:all .15s; flex-shrink:0;
        }
        .pi-act:hover { background:#fce8e6; border-color:#f5c6c2; color:#c5221f; }
        .pi-act.rep:hover { background:#fef7e0; border-color:#fde396; color:#b06000; }
        @keyframes pi-spin { to { transform:rotate(360deg); } }
        .pi-spin { display:inline-block; animation:pi-spin .7s linear infinite; }
        `;
        document.head.appendChild(s);
    }

    const esc2 = s => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    const _names = {};

    // ── Construire wrap avec fichier uploadé ──────────────────────
    function buildUploaded(url, fileName, rowIndex, colDef) {
        const name   = fileName || _names[url] || colDef.label + ".pdf";
        const isXls  = /\.(xlsx|xls)$/i.test(name);
        const icon   = isXls ? "ti-file-type-xls" : "ti-file-type-pdf";
        const icolor = isXls ? "#137333" : "#ea4335";

        const wrap = document.createElement("div");
        wrap.className = "pi-cell";

        const viewBtn = document.createElement("button");
        viewBtn.className = "pi-view-btn";
        viewBtn.title = name;
        viewBtn.innerHTML = `<i class="ti ${icon}" style="font-size:13px;color:${icolor};flex-shrink:0"></i><span class="pi-fn">${esc2(name)}</span>`;
        viewBtn.onclick = e => {
            e.stopPropagation();
            if (!isXls && typeof openCPDFPreview === "function") openCPDFPreview(url, name);
            else window.open(url, "_blank");
        };

        const replBtn = document.createElement("button");
        replBtn.className = "pi-act rep";
        replBtn.title = "Remplacer";
        replBtn.innerHTML = `<i class="ti ti-refresh"></i>`;
        replBtn.onclick = e => { e.stopPropagation(); _triggerUpload(rowIndex, wrap, colDef); };

        const delBtn = document.createElement("button");
        delBtn.className = "pi-act";
        delBtn.title = "Supprimer";
        delBtn.innerHTML = `<i class="ti ti-trash"></i>`;
        delBtn.onclick = async e => {
            e.stopPropagation();
            if (!confirm("Supprimer ce fichier ?")) return;
            wrap.innerHTML = `<i class="ti ti-loader-2 pi-spin" style="font-size:13px;color:#ea4335"></i>`;
            await _saveFile(rowIndex, colDef, "", "");
            const row = (window.state?.data?.ordering || []).find(r => r._rowIndex === rowIndex);
            const existText = row ? _getExistText(row, colDef) : "";
            buildEmpty(wrap, existText, rowIndex, colDef);
        };

        wrap.appendChild(viewBtn);
        wrap.appendChild(replBtn);
        wrap.appendChild(delBtn);
        return wrap;
    }

    // ── Construire wrap vide + bouton upload ──────────────────────
    function buildEmpty(wrap, existText, rowIndex, colDef) {
        wrap.innerHTML = "";
        if (existText) {
            const span = document.createElement("span");
            span.style.cssText = "font-size:12px;font-weight:600;color:#202124;margin-right:6px;white-space:nowrap;font-family:monospace;";
            span.textContent = existText;
            wrap.appendChild(span);
        }
        const btn = document.createElement("button");
        btn.className = "pi-upload-btn";
        btn.innerHTML = `<i class="ti ti-upload"></i> ${colDef.label}`;
        btn.onclick = e => { e.stopPropagation(); _triggerUpload(rowIndex, wrap, colDef); };
        wrap.appendChild(btn);
        return wrap;
    }

    function _getExistText(row, colDef) {
        for (const k of (colDef.keys || [])) {
            const v = (row[k] || "").trim();
            if (v) return v;
        }
        return "";
    }

    // ── Upload ────────────────────────────────────────────────────
    function _triggerUpload(rowIndex, wrapEl, colDef) {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/pdf,.pdf,.xlsx,.xls";
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;
            if (file.size > 15 * 1024 * 1024) {
                typeof showToast === "function" && showToast("Fichier trop lourd (max 15 Mo)", "error");
                return;
            }
            const orig = wrapEl.innerHTML;
            wrapEl.innerHTML = `<i class="ti ti-loader-2 pi-spin" style="font-size:13px;color:#1a73e8"></i><span style="font-size:11px;color:#5f6368"> Upload...</span>`;
            typeof showToast === "function" && showToast(`Upload ${colDef.label}…`, "info", 8000);
            try {
                const b64 = await new Promise((res, rej) => {
                    const rd = new FileReader();
                    rd.onload = e => res(e.target.result);
                    rd.onerror = rej;
                    rd.readAsDataURL(file);
                });
                const url = await _uploadToGAS(
                    file.name,
                    b64.split(",")[1],
                    file.type || "application/octet-stream"
                );
                if (!url) throw new Error("Aucune URL retournée par le serveur");
                _names[url] = file.name;
                await _saveFile(rowIndex, colDef, url, file.name);
                typeof showToast === "function" && showToast(`${colDef.label} uploadé — ${file.name}`, "success");
                wrapEl.innerHTML = "";
                const newWrap = buildUploaded(url, file.name, rowIndex, colDef);
                Array.from(newWrap.children).forEach(c => wrapEl.appendChild(c));
            } catch(err) {
                wrapEl.innerHTML = orig;
                typeof showToast === "function" && showToast("Erreur : " + err.message, "error");
            }
        };
        input.click();
    }

    // ── Upload direct vers Google Apps Script ────────────────────
    // Utilise l'action UPLOAD_FILE du GAS (dossier ORDERING sur Drive).
    async function _uploadToGAS(filename, base64Data, mimeType) {
        const gasUrl = window.GOOGLE_APPS_SCRIPT_URL;
        if (!gasUrl) throw new Error("GOOGLE_APPS_SCRIPT_URL introuvable");

        const payload = {
            action:     "UPLOAD_FILE",
            fileName:   filename,
            base64Data: base64Data,
            mimeType:   mimeType,
            folder:     "ORDERING"
        };

        const resp = await fetch(gasUrl, {
            method:  "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body:    JSON.stringify(payload)
        });

        const text = await resp.text();

        let result;
        try { result = JSON.parse(text); }
        catch(e) {
            throw new Error("Réponse serveur invalide : " + text.substring(0, 120));
        }

        if (result.status === "error") {
            throw new Error(result.message || "Erreur serveur");
        }

        return result.url || result.fileUrl || result.driveUrl || "";
    }

    async function _saveFile(rowIndex, colDef, url, name) {
        try {
            await window.quickUpdate(rowIndex, colDef.urlKey,  url,  "ordering");
            await window.quickUpdate(rowIndex, colDef.nameKey, name, "ordering");
            const row = (window.state?.data?.ordering || []).find(r => r._rowIndex === rowIndex);
            if (row) { row[colDef.urlKey] = url; row[colDef.nameKey] = name; }
        } catch(e) { typeof showToast === "function" && showToast("Erreur : " + e.message, "error"); }
    }

    // ── INJECTION PRINCIPALE ──────────────────────────────────────
    // Stratégie : chercher td[data-key] sur chaque tr
    function injectCells() {
        if (window.state?.activeSheet !== "ordering") return;
        const rows = window.state?.data?.ordering || [];
        const tbody = document.getElementById("table-body");
        if (!tbody || !rows.length) return;

        Array.from(tbody.querySelectorAll("tr[data-row-index]")).forEach(tr => {
            const rowIndex = parseInt(tr.dataset.rowIndex, 10);
            if (isNaN(rowIndex)) return;
            const row = rows.find(r => r._rowIndex === rowIndex);
            if (!row) return;

            UPLOAD_COLS.forEach(colDef => {
                // Chercher le td par data-key parmi les clés possibles
                let td = null;
                for (const k of colDef.keys) {
                    td = tr.querySelector(`td[data-key="${k}"]`);
                    if (td) break;
                }
                if (!td) return;

                // Déjà notre wrap présent ?
                if (td.querySelector(".pi-cell")) return;

                const fileUrl  = (row[colDef.urlKey]  || "").trim();
                const fileName = (row[colDef.nameKey] || "").trim();

                td.innerHTML = "";
                td.style.padding = "5px 10px";

                const wrap = document.createElement("div");
                wrap.className = "pi-cell";

                if (fileUrl.startsWith("http")) {
                    const fw = buildUploaded(fileUrl, fileName, rowIndex, colDef);
                    Array.from(fw.children).forEach(c => wrap.appendChild(c));
                } else {
                    buildEmpty(wrap, _getExistText(row, colDef), rowIndex, colDef);
                }

                td.appendChild(wrap);
            });
        });
    }

    // ── Patcher SHEET_CONFIG ──────────────────────────────────────
    function patchConfig() {
        const cols = window.SHEET_CONFIG?.ordering?.cols;
        if (!cols) return;
        [
            { key: "PI URL",      label: "PI URL",      type: "text" },
            { key: "PI Filename", label: "PI Filename", type: "text" },
            { key: "PO URL",      label: "PO URL",      type: "text" },
            { key: "PO Filename", label: "PO Filename", type: "text" },
        ].forEach(col => {
            if (!cols.find(c => c.key === col.key)) cols.push(col);
        });
    }

    // ── Init ──────────────────────────────────────────────────────
    function init() {
        injectStyles();
        patchConfig();

        // Patch renderTable — forcer le re-patch même si déjà fait
        // en utilisant un flag unique à ce script
        if (!window._piUploadV4Patched) {
            window._piUploadV4Patched = true;
            const _orig = window.renderTable;
            if (typeof _orig === "function") {
                window.renderTable = function() {
                    _orig.apply(this, arguments);
                    // Délai suffisant pour que app.js finisse de rendre les cellules
                    setTimeout(injectCells, 400);
                };
            }
        }

        // MutationObserver sur tbody comme filet de sécurité
        function watchTbody() {
            const tb = document.getElementById("table-body");
            if (!tb) {
                setTimeout(watchTbody, 300);
                return;
            }
            let timer = null;
            new MutationObserver(() => {
                if (window.state?.activeSheet !== "ordering") return;
                clearTimeout(timer);
                timer = setTimeout(injectCells, 400);
            }).observe(tb, { childList: true });
        }
        watchTbody();

        // Tentative immédiate si on est déjà sur Ordering
        setTimeout(injectCells, 600);

        console.log("[AW27] Ordering File Upload v4 (PI + PO) ✓");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 300);
    }

})();
