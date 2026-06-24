// ================================================================
//  AW27 — Size & Care Artwork Menu v3
// ================================================================

(function initArtworkMenu() {

    const ARTWORK_TRIMS_KEYWORDS = ["size & care", "size & care label", "care", "size sticker", "collection hangtag","joker tag"];

    function _isArtworkPO(row) {
        const trims = String(row.Trims || row.trims || "").toLowerCase().trim();
        if (!trims) return false;
        return ARTWORK_TRIMS_KEYWORDS.some(kw => trims === kw || trims.includes(kw));
    }

    function getArtworkRows() {
        return (window.state?.data?.ordering || []).filter(_isArtworkPO);
    }

    // ── Styles ────────────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById("aw-styles")) return;
        const s = document.createElement("style");
        s.id = "aw-styles";
        s.textContent = `
        #aw-screen {
            display: none !important;
            flex-direction: column;
            flex: 1;
            min-height: 0;
            background: #f1f3f4;
        }
        #aw-screen.active {
            display: flex !important;
        }
        #aw-toolbar {
            display: flex; align-items: center; gap: 10px;
            padding: 12px 20px;
            background: #fff;
            border-bottom: 1px solid #e8eaed;
            flex-shrink: 0;
        }
        #aw-search-wrap {
            display: flex; align-items: center; gap: 8px;
            flex: 1;
            background: #f1f3f4;
            border: 1px solid #e8eaed;
            border-radius: 24px; padding: 7px 14px;
            transition: border-color .2s, box-shadow .2s;
        }
        #aw-search-wrap:focus-within {
            border-color: #1a73e8;
            box-shadow: 0 0 0 2px rgba(26,115,232,0.15);
            background: #fff;
        }
        #aw-search-wrap i { color: #80868b; font-size: 15px; flex-shrink: 0; }
        #aw-search-input {
            flex: 1; border: none; background: transparent; outline: none;
            font-size: 13px; color: #202124; font-family: system-ui, sans-serif;
        }
        #aw-search-input::placeholder { color: #bdc1c6; }
        #aw-search-clear {
            background: none; border: none; cursor: pointer;
            color: #bdc1c6; font-size: 14px; padding: 0;
            display: none; align-items: center; justify-content: center;
            width: 20px; height: 20px; border-radius: 50%;
        }
        #aw-search-clear.visible { display: flex !important; }
        #aw-search-clear:hover { background: #e8eaed; }
        #aw-count-label { font-size: 12px; color: #80868b; white-space: nowrap; flex-shrink: 0; }
        #aw-refresh-btn {
            display: flex; align-items: center; gap: 6px;
            padding: 7px 14px; border-radius: 20px;
            border: 1px solid #e8eaed;
            background: #fff; color: #5f6368;
            font-size: 12px; font-weight: 500; cursor: pointer;
            font-family: system-ui, sans-serif;
            white-space: nowrap; transition: background .15s;
        }
        #aw-refresh-btn:hover { background: #f1f3f4; }
        #aw-kpi-bar {
            display: flex; gap: 10px; flex-wrap: wrap;
            padding: 12px 20px;
            background: #fff;
            border-bottom: 1px solid #e8eaed;
            flex-shrink: 0;
        }
        .aw-kpi {
            display: flex; align-items: center; gap: 8px;
            padding: 8px 14px; border-radius: 10px;
            border: 1px solid; flex: 1; min-width: 110px;
        }
        .aw-kpi-icon { font-size: 16px; flex-shrink: 0; }
        .aw-kpi-val { font-size: 18px; font-weight: 700; line-height: 1; }
        .aw-kpi-lbl { font-size: 10px; color: #80868b; }
        .aw-kpi-blue   { background: #e8f0fe; border-color: #d2e3fc; }
        .aw-kpi-blue .aw-kpi-val   { color: #1a73e8; }
        .aw-kpi-green  { background: #e6f4ea; border-color: #ceead6; }
        .aw-kpi-green .aw-kpi-val  { color: #137333; }
        .aw-kpi-yellow { background: #fef7e0; border-color: #fde396; }
        .aw-kpi-yellow .aw-kpi-val { color: #b06000; }
        .aw-kpi-red    { background: #fce8e6; border-color: #f5c6c2; }
        .aw-kpi-red .aw-kpi-val    { color: #c5221f; }
        #aw-table-wrap {
            flex: 1; overflow-y: auto; padding: 16px 20px;
        }
        .aw-table-card {
            background: #fff;
            border: 1px solid #e8eaed;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(60,64,67,.1);
        }
        .aw-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            table-layout: auto;
            font-family: system-ui, sans-serif;
            white-space: nowrap;
        }
        .aw-table thead tr { background: #f8f9fa; }
        .aw-table th {
            padding: 10px 12px;
            text-align: left;
            font-size: 10px; font-weight: 700;
            color: #80868b;
            text-transform: uppercase;
            letter-spacing: .06em;
            border-bottom: 1px solid #e8eaed;
            background: #f8f9fa;
            white-space: nowrap;
        }
        .aw-table th.th-po       { border-bottom: 2px solid #1a73e8; }
        .aw-table th.th-approval { border-bottom: 2px solid #34a853; }
        .aw-table th.th-url      { border-bottom: 2px solid #ea4335; }
        .aw-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #f1f3f4;
            vertical-align: middle;
            color: #202124;
            font-size: 12px;
        }
        .aw-table tbody tr:last-child td { border-bottom: none; }
        .aw-table tbody tr:hover td { background: #e8f0fe; }
        .aw-table td.muted { color: #bdc1c6; font-style: italic; }
        .aw-apvl-select {
            border: 1px solid #e8eaed;
            border-radius: 20px;
            padding: 3px 8px;
            font-size: 11px; font-weight: 500;
            font-family: system-ui, sans-serif;
            background: #f8f9fa;
            color: #202124;
            cursor: pointer; outline: none;
            transition: border-color .15s;
        }
        .aw-apvl-select:focus { border-color: #1a73e8; }
        .aw-apvl-select.approved { background: #e6f4ea; color: #137333; border-color: #ceead6; }
        .aw-apvl-select.pending  { background: #fef7e0; color: #b06000; border-color: #fde396; }
        .aw-apvl-select.rejected { background: #fce8e6; color: #c5221f; border-color: #f5c6c2; }
        .aw-upload-btn {
            display: inline-flex; align-items: center; gap: 5px;
            padding: 4px 12px; border-radius: 20px;
            border: 1px dashed #bdc1c6;
            background: transparent; color: #5f6368;
            font-size: 11px; font-weight: 500; cursor: pointer;
            font-family: system-ui, sans-serif;
            transition: all .15s; white-space: nowrap;
        }
        .aw-upload-btn:hover {
            border-color: #1a73e8; border-style: solid;
            background: #e8f0fe; color: #1a73e8;
        }
        .aw-view-btn {
            display: inline-flex; align-items: center; gap: 5px;
            padding: 4px 12px; border-radius: 20px;
            border: 1px solid #1a73e8;
            background: #e8f0fe; color: #1a73e8;
            font-size: 11px; font-weight: 500; cursor: pointer;
            font-family: system-ui, sans-serif;
            transition: background .15s; white-space: nowrap;
        }
        .aw-view-btn:hover { background: #d2e3fc; }
        .aw-del-btn {
            display: inline-flex; align-items: center; justify-content: center;
            width: 24px; height: 24px; border-radius: 50%;
            border: 1px solid #e8eaed;
            background: #f8f9fa; color: #80868b;
            cursor: pointer; font-size: 12px;
            transition: all .15s; flex-shrink: 0;
        }
        .aw-del-btn:hover { background: #fce8e6; border-color: #f5c6c2; color: #c5221f; }
        .aw-url-cell { display: flex; align-items: center; gap: 6px; }
        .aw-trims-badge {
            display: inline-flex; align-items: center;
            font-size: 10.5px; padding: 2px 8px; border-radius: 20px;
            background: #fef7e0; color: #b06000;
            border: 1px solid #fde396; white-space: nowrap;
        }
        .aw-comment-input {
            border: 1px solid transparent;
            border-radius: 6px;
            padding: 3px 7px;
            font-size: 11.5px;
            font-family: system-ui, sans-serif;
            background: transparent;
            color: #202124;
            width: 100%; min-width: 120px;
            outline: none;
            transition: border-color .15s, background .15s;
        }
        .aw-comment-input:hover { border-color: #e8eaed; background: #f8f9fa; }
        .aw-comment-input:focus { border-color: #1a73e8; background: #fff; }
        .aw-empty {
            text-align: center; padding: 60px 20px;
            color: #80868b; font-size: 13px; line-height: 1.8;
        }
        .aw-empty i { font-size: 48px; display: block; margin: 0 auto 16px; opacity: .2; }
        .aw-hl { background: #fef08a; border-radius: 2px; padding: 0 2px; font-weight: 600; }
        @keyframes aw-spin { to { transform: rotate(360deg); } }
        .aw-spin { display: inline-block; animation: aw-spin .7s linear infinite; }
        `;
        document.head.appendChild(s);
    }

    // ── Helpers ───────────────────────────────────────────────────
    const esc2 = s => String(s || "")
        .replace(/&/g,"&amp;").replace(/</g,"&lt;")
        .replace(/>/g,"&gt;").replace(/"/g,"&quot;");

    const fmtD = v => {
        if (!v || !String(v).trim()) return "";
        try {
            const d = new Date(v);
            if (isNaN(d)) return String(v);
            return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
        } catch(e) { return String(v); }
    };

    function hl(text, q) {
        if (!q || !text) return esc2(text);
        const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return esc2(String(text)).replace(new RegExp(safe, 'gi'),
            m => `<span class="aw-hl">${m}</span>`);
    }

    function _getDesc(styleCode) {
        const norm = v => String(v || "").replace(/[\s\-_]/g, "").toLowerCase();
        const row = (window.state?.data?.details || []).find(r =>
            norm(r["Cust Style Ref"] || r.Style || "") === norm(styleCode)
        );
        return row?.Theme || row?.["Style Type"] || row?.Description || "";
    }

    // ── KPIs ──────────────────────────────────────────────────────
    function renderKPIs(rows) {
        const bar = document.getElementById("aw-kpi-bar");
        if (!bar) return;
        const total    = rows.length;
        const approved = rows.filter(r => (r["Artwork Approval."] || "").toLowerCase() === "approved").length;
        const pending  = rows.filter(r => { const a = (r["Artwork Approval."] || "").toLowerCase(); return !a || a === "pending"; }).length;
        const rejected = rows.filter(r => (r["Artwork Approval."] || "").toLowerCase() === "rejected").length;
        bar.innerHTML = [
            { cls: "aw-kpi-blue",   icon: `<i class="ti ti-clipboard-list" aria-hidden="true"></i>`, val: total,    lbl: "Total POs" },
            { cls: "aw-kpi-green",  icon: `<i class="ti ti-circle-check"   aria-hidden="true"></i>`, val: approved, lbl: "Approuvés" },
            { cls: "aw-kpi-yellow", icon: `<i class="ti ti-clock"          aria-hidden="true"></i>`, val: pending,  lbl: "En attente" },
            { cls: "aw-kpi-red",    icon: `<i class="ti ti-circle-x"       aria-hidden="true"></i>`, val: rejected, lbl: "Rejetés" },
        ].map(k => `
        <div class="aw-kpi ${k.cls}">
            <span class="aw-kpi-icon">${k.icon}</span>
            <div>
                <div class="aw-kpi-val">${k.val}</div>
                <div class="aw-kpi-lbl">${k.lbl}</div>
            </div>
        </div>`).join("");
    }

    // ── Construire une ligne ──────────────────────────────────────
    function buildRow(r, q) {
        const styleCode    = r.Style        || r["Style"] || "";
        const poNum        = r["PO #"]      || r.PO    || "";
        const trims        = r.Trims        || r.trims  || "";
        const desc         = r.Description  || r["Description"] || "";
        const poDate       = fmtD(r["PO Date"]               || r.PODate);
        const receivedDate = fmtD(r["Artwork Received"]       || "");
        const approvalDate = fmtD(r["Artwork Approval Date"]  || "");
        const apvlRaw      = (r["Artwork Approval."] || "").trim();
        const apvlCls      = apvlRaw.toLowerCase() === "approved" ? "approved"
                           : apvlRaw.toLowerCase() === "rejected"  ? "rejected" : "pending";
        const originalUrl  = (r["Artwork Original URL"] || "").trim();
        const signedUrl    = (r["Artwork Signed URL"]   || "").trim();
        const comment      = (r["Artwork Comments"] || r["Artwork Comment"] || "").trim();
        const rowIdx       = r._rowIndex;

        // Cellule Original
        const originalCell = originalUrl.startsWith("http")
            ? `<div class="aw-url-cell">
                <button class="aw-view-btn"
                    onclick="event.stopPropagation();openCPDFPreview('${esc2(originalUrl)}','Original ${esc2(poNum)}')">
                    <i class="ti ti-file-type-pdf" aria-hidden="true"></i>Voir
                </button>
                <button class="aw-upload-btn" title="Remplacer"
                    onclick="event.stopPropagation();_awTriggerUpload(${rowIdx},'original','${esc2(poNum)}',this)">
                    <i class="ti ti-refresh" aria-hidden="true"></i>
                </button>
              </div>`
            : `<button class="aw-upload-btn"
                onclick="event.stopPropagation();_awTriggerUpload(${rowIdx},'original','${esc2(poNum)}',this)">
                <i class="ti ti-upload" aria-hidden="true"></i>Original
              </button>`;

        // Cellule Signed
        const signedCell = signedUrl.startsWith("http")
            ? `<div class="aw-url-cell">
                <button class="aw-view-btn" style="background:#e6f4ea;border-color:#34a853;color:#137333"
                    onclick="event.stopPropagation();openCPDFPreview('${esc2(signedUrl)}','Signed ${esc2(poNum)}')">
                    <i class="ti ti-file-certificate" aria-hidden="true"></i>Voir
                </button>
                <button class="aw-upload-btn" title="Remplacer"
                    onclick="event.stopPropagation();_awTriggerUpload(${rowIdx},'signed','${esc2(poNum)}',this)">
                    <i class="ti ti-refresh" aria-hidden="true"></i>
                </button>
              </div>`
            : `<button class="aw-upload-btn" style="border-color:#34a853;color:#137333"
                onclick="event.stopPropagation();_awTriggerUpload(${rowIdx},'signed','${esc2(poNum)}',this)">
                <i class="ti ti-upload" aria-hidden="true"></i>Signed
              </button>`;

        return `<tr data-rowindex="${rowIdx}">
            <td>${hl(styleCode, q)}</td>
            <td>${desc ? hl(desc, q) : '<span class="muted">—</span>'}</td>
            <td>${(() => {
                const poPdf = (r["Comment PDF"] || "").trim();
                if (!poNum) return '<span class="muted">—</span>';
                if (poPdf.startsWith("http")) {
                    return `<button onclick="event.stopPropagation();openCPDFPreview('${esc2(poPdf)}','PO ${esc2(poNum)}')"
                        style="background:none;border:none;cursor:pointer;font-family:monospace;font-weight:600;font-size:12px;color:#1a73e8;text-decoration:underline;padding:0;display:inline-flex;align-items:center;gap:4px;">
                        <i class="ti ti-file-type-pdf" style="font-size:13px;color:#ea4335" aria-hidden="true"></i>${hl(poNum, q)}
                    </button>`;
                }
                return `<span style="font-family:monospace;font-weight:600">${hl(poNum, q)}</span>`;
            })()}</td>
            <td><span class="aw-trims-badge">${esc2(trims)}</span></td>
            <td>${poDate        || '<span class="muted">—</span>'}</td>
            <td>${receivedDate  || '<span class="muted">—</span>'}</td>
            <td>
                <select class="aw-apvl-select ${apvlCls}"
                    onchange="_awSaveApproval(${rowIdx}, this)"
                    onclick="event.stopPropagation()">
                    <option value="Pending"  ${apvlCls === "pending"  ? "selected" : ""}>Pending</option>
                    <option value="Approved" ${apvlCls === "approved" ? "selected" : ""}>Approved</option>
                    <option value="Rejected" ${apvlCls === "rejected" ? "selected" : ""}>Rejected</option>
                </select>
            </td>
            <td>${approvalDate  || '<span class="muted">—</span>'}</td>
            <td>
                <input class="aw-comment-input"
                    value="${esc2(comment)}"
                    placeholder="Ajouter un commentaire..."
                    onblur="_awSaveComment(${rowIdx}, this)"
                    onkeydown="if(event.key==='Enter'){this.blur();}"
                    onclick="event.stopPropagation()"/>
            </td>
            <td>${originalCell}</td>
            <td>${signedCell}</td>
        </tr>`;
    }

    // ── Rendu tableau ─────────────────────────────────────────────
    function renderTable(q) {
        const wrap = document.getElementById("aw-table-wrap");
        if (!wrap) return;
        const all   = getArtworkRows();
        const query = (q || "").trim();
        const rows  = query ? all.filter(r => {
            const hay = [r.Description, r.Style, r["PO #"], r.PO,
                r.Trims, r.Client, r["Artwork Approval."],
                r["Artwork Comments"]].join(" ").toLowerCase();
            return hay.includes(query.toLowerCase());
        }) : all;

        renderKPIs(all);

        const countLbl = document.getElementById("aw-count-label");
        if (countLbl) countLbl.textContent = query
            ? rows.length + "/" + all.length + " résultats"
            : all.length + " PO" + (all.length > 1 ? "s" : "");

        if (!all.length) {
            wrap.innerHTML = `<div class="aw-empty">
                <i class="ti ti-clipboard-x" aria-hidden="true"></i>
                Aucun PO Size &amp; Care trouvé.<br>
                Vérifiez que la colonne Trims contient<br>
                <strong>size &amp; care</strong>, <strong>care</strong> ou <strong>size &amp; care label</strong>.
            </div>`;
            return;
        }

        const tableRows = rows.length
            ? rows.map(r => buildRow(r, query)).join("")
            : `<tr><td colspan="10" style="text-align:center;padding:32px;color:#80868b;font-size:12.5px;">
                Aucun résultat pour "<strong>${esc2(query)}</strong>"
               </td></tr>`;

        wrap.innerHTML = `
        <div class="aw-table-card">
            <table class="aw-table">
                <thead><tr>
                    <th>Style</th>
                    <th>Description</th>
                    <th class="th-po">PO #</th>
                    <th>Trims</th>
                    <th>PO Date</th>
                    <th>Received Date</th>
                    <th class="th-approval">Approval</th>
                    <th>Approval Date</th>
                    <th>Comments</th>
                    <th class="th-url">Original</th>
                    <th style="border-bottom:2px solid #34a853">Signed</th>
                </tr></thead>
                <tbody id="aw-tbody">${tableRows}</tbody>
            </table>
        </div>`;
    }

    // ── Upload artwork ────────────────────────────────────────────
    window._awTriggerUpload = function(rowIndex, type, poNum, triggerEl) {
        // type = 'original' ou 'signed'
        const input = document.createElement("input");
        input.type   = "file";
        input.accept = "application/pdf,.pdf,image/*";
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;
            if (file.size > 15 * 1024 * 1024) {
                if (typeof showToast === "function") showToast("Fichier trop lourd (max 15 Mo)", "error");
                return;
            }
            const origHTML = triggerEl.innerHTML;
            triggerEl.disabled = true;
            triggerEl.innerHTML = `<i class="ti ti-loader-2 aw-spin" aria-hidden="true"></i> Upload...`;
            if (typeof showToast === "function") showToast("Upload " + type + " en cours…", "info", 8000);
            try {
                const base64 = await new Promise((res, rej) => {
                    const rd = new FileReader();
                    rd.onload  = e => res(e.target.result);
                    rd.onerror = rej;
                    rd.readAsDataURL(file);
                });

                const colKey = type === "signed" ? "Artwork Signed URL" : "Artwork Original URL";

                // Upload direct vers Google Apps Script (action UPLOAD_ORDERING_FILE)
                const gasUrl = window.GOOGLE_APPS_SCRIPT_URL;
                if (!gasUrl) throw new Error("GOOGLE_APPS_SCRIPT_URL introuvable");

                const _resp = await fetch(gasUrl, {
                    method:  "POST",
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body:    JSON.stringify({
                        action:     "UPLOAD_ORDERING_FILE",
                        fileName:   file.name,
                        base64Data: base64.split(",")[1],
                        mimeType:   file.type || "application/pdf",
                        sheet:      "ordering",
                        colKey:     colKey,
                        rowIndex:   rowIndex
                    })
                });
                const _text = await _resp.text();
                let _result;
                try { _result = JSON.parse(_text); }
                catch(_e) { throw new Error("Réponse serveur invalide : " + _text.substring(0, 120)); }
                if (_result.status === "error") throw new Error(_result.message || "Erreur serveur");
                const url = _result.url || _result.fileUrl || _result.driveUrl || "";
                if (!url) throw new Error("Aucune URL retournée par le serveur");

                const row = (window.state?.data?.ordering || []).find(r => r._rowIndex === rowIndex);
                const today = new Date().toISOString().slice(0, 10);

                if (row) {
                    row[colKey] = url;

                    if (type === "original") {
                        // Upload Original → Received Date = aujourd'hui
                        row["Artwork Received"] = today;
                        await window.quickUpdate(rowIndex, "Artwork Received", today, "ordering");
                        if (typeof showToast === "function") showToast("Artwork original reçu — date enregistrée", "success");

                    } else if (type === "signed") {
                        // Upload Signed → Approval = Approved + Approval Date = aujourd'hui
                        row["Artwork Approval."]      = "Approved";
                        row["Artwork Approval Date"] = today;
                        await window.quickUpdate(rowIndex, "Artwork Approval.",      "Approved", "ordering");
                        await window.quickUpdate(rowIndex, "Artwork Approval Date", today,      "ordering");
                        if (typeof showToast === "function") showToast("Artwork signé — Approved automatiquement", "success");
                    }
                }

                renderTable(document.getElementById("aw-search-input")?.value || "");
            } catch(err) {
                triggerEl.disabled = false;
                triggerEl.innerHTML = origHTML;
                if (typeof showToast === "function") showToast("Erreur upload : " + err.message, "error");
            }
        };
        input.click();
    };

    window._awDeleteArtwork = async function(rowIndex) {
        if (!confirm("Supprimer cet artwork ?")) return;
        try {
            await window.quickUpdate(rowIndex, "Artwork URL", "", "ordering");
            const row = (window.state?.data?.ordering || []).find(r => r._rowIndex === rowIndex);
            if (row) row["Artwork URL"] = "";
            if (typeof showToast === "function") showToast("Artwork supprimé", "success");
            renderTable(document.getElementById("aw-search-input")?.value || "");
        } catch(err) {
            if (typeof showToast === "function") showToast("Erreur : " + err.message, "error");
        }
    };

    window._awSaveApproval = async function(rowIndex, selectEl) {
        const val = selectEl.value;
        selectEl.className = "aw-apvl-select " + val.toLowerCase();
        try {
            await window.quickUpdate(rowIndex, "Artwork Approval.", val, "ordering");
            const row = (window.state?.data?.ordering || []).find(r => r._rowIndex === rowIndex);
            if (row) {
                row["Artwork Approval."] = val;
                if (val === "Approved" || val === "Rejected") {
                    // Remplir la date d'approval automatiquement
                    const today = new Date().toISOString().slice(0, 10);
                    row["Artwork Approval Date"] = today;
                    await window.quickUpdate(rowIndex, "Artwork Approval Date", today, "ordering");
                } else {
                    // Pending → effacer la date d'approval
                    row["Artwork Approval Date"] = "";
                    await window.quickUpdate(rowIndex, "Artwork Approval Date", "", "ordering");
                }
            }
            if (typeof showToast === "function") showToast("Approval : " + val, "success", 2000);
            renderTable(document.getElementById("aw-search-input")?.value || "");
        } catch(err) {
            if (typeof showToast === "function") showToast("Erreur : " + err.message, "error");
        }
    };

    window._awSaveComment = async function(rowIndex, inputEl) {
        const val = inputEl.value.trim();
        try {
            await window.quickUpdate(rowIndex, "Artwork Comments", val, "ordering");
            const row = (window.state?.data?.ordering || []).find(r => r._rowIndex === rowIndex);
            if (row) row["Artwork Comments"] = val;
            if (typeof showToast === "function") showToast("Commentaire enregistré", "success", 1500);
        } catch(err) {
            if (typeof showToast === "function") showToast("Erreur : " + err.message, "error");
        }
    };

    // ── Créer l'écran ─────────────────────────────────────────────
    function createScreen() {
        if (document.getElementById("aw-screen")) return;
        const screen = document.createElement("div");
        screen.id = "aw-screen";
        screen.innerHTML = `
        <div id="aw-toolbar">
            <div id="aw-search-wrap">
                <i class="ti ti-search" aria-hidden="true"></i>
                <input id="aw-search-input" placeholder="Rechercher style, PO, approval..." autocomplete="off"/>
                <button id="aw-search-clear" title="Effacer">
                    <i class="ti ti-x" style="font-size:12px" aria-hidden="true"></i>
                </button>
            </div>
            <span id="aw-count-label"></span>
            <button id="aw-refresh-btn">
                <i class="ti ti-refresh" style="font-size:13px" aria-hidden="true"></i>
                Actualiser
            </button>
        </div>
        <div id="aw-kpi-bar"></div>
        <div id="aw-table-wrap"></div>`;

        const main = document.querySelector("main.main") || document.querySelector("main") || document.body;
        main.appendChild(screen);

        const inp = document.getElementById("aw-search-input");
        const clr = document.getElementById("aw-search-clear");
        const ref = document.getElementById("aw-refresh-btn");

        if (inp) {
            inp.addEventListener("input", () => {
                clr && clr.classList.toggle("visible", !!inp.value);
                renderTable(inp.value);
            });
        }
        if (clr) {
            clr.addEventListener("click", () => {
                if (inp) { inp.value = ""; inp.focus(); inp.dispatchEvent(new Event("input")); }
            });
        }
        if (ref) {
            ref.addEventListener("click", async () => {
                if (typeof fetchAllData === "function") {
                    const icon = ref.querySelector("i");
                    if (icon) icon.classList.add("aw-spin");
                    ref.disabled = true;
                    await fetchAllData();
                    if (icon) icon.classList.remove("aw-spin");
                    ref.disabled = false;
                }
                renderTable(inp?.value || "");
            });
        }
    }

    // ── Cacher TOUT ce qui est visible dans main ──────────────────
    function hideAllMainContent() {
        // Éléments standards uniquement — ne pas toucher aux menus custom
        ["dashboard-screen","kpi-grid","table-card-wrap","db-filter-bar",
         "alerts-panel","sample-alerts-panel"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = "none";
        });
        const fb = document.getElementById("db-filter-bar");
        if (fb) fb.classList.add("hidden");

        // Cacher uniquement les écrans custom enregistrés dans SHEET_CONFIG
        // (ils ont un data-sheet sur leur nav-item correspondant)
        const customKeys = Object.keys(window.SHEET_CONFIG || {})
            .filter(k => window.SHEET_CONFIG[k].custom);
        customKeys.forEach(key => {
            // L'écran custom est le table-card-wrap quand activeSheet = key
            // On le cache via state plutôt que de toucher au DOM directement
        });

        // Cacher le table-card-wrap (commun à tous les menus custom)
        const tc = document.getElementById("table-card-wrap");
        if (tc) tc.style.display = "none";
        const kg = document.getElementById("kpi-grid");
        if (kg) kg.style.display = "none";
    }

    // ── Afficher l'écran Artwork ──────────────────────────────────
    function showArtworkScreen() {
        hideAllMainContent();
        const screen = document.getElementById("aw-screen");
        if (screen) {
            screen.classList.add("active");
            renderTable("");
        }
    }

    // ── Cacher l'écran Artwork ────────────────────────────────────
    function hideArtworkScreen() {
        const screen = document.getElementById("aw-screen");
        if (screen) screen.classList.remove("active");
        // Remettre activeView à "sheet" pour que renderAll fonctionne
        if (window.state?.activeView === "artwork") {
            window.state.activeView = "sheet";
        }
    }

    // ── Patch renderAll ───────────────────────────────────────────
    const _origRenderAll = window.renderAll;
    if (typeof _origRenderAll === "function" && !window._awRenderAllPatched) {
        window._awRenderAllPatched = true;
        window.renderAll = function() {
            if (window.state?.activeView === "artwork") {
                renderTable(document.getElementById("aw-search-input")?.value || "");
                return;
            }
            hideArtworkScreen();
            _origRenderAll.apply(this, arguments);
        };
    }

    // ── Patch SHEET_CONFIG ordering ───────────────────────────────
    // IMPORTANT : modifie uniquement le state en mémoire, ne sauvegarde PAS
    // dans localStorage pour ne pas écraser les autres menus custom
    function patchOrderingConfig() {
        const cols = window.SHEET_CONFIG?.ordering?.cols;
        if (!cols) return;
        [
            { key: "Artwork Original URL",  label: "Artwork Original URL",  type: "text" },
            { key: "Artwork Signed URL",    label: "Artwork Signed URL",    type: "text" },
            { key: "Artwork Approval.",     label: "Artwork Approval",      type: "select", options: ["","Pending","Approved","Rejected"] },
            { key: "Artwork Received",      label: "Artwork Received",      type: "date" },
            { key: "Artwork Approval Date", label: "Artwork Approval Date", type: "date" },
            { key: "Artwork Comments",      label: "Artwork Comments",      type: "textarea" },
        ].forEach(col => {
            if (!cols.find(c => c.key === col.key)) cols.push(col);
        });
        // NE PAS appeler persistCustomMenus() ici — ça écraserait le localStorage
        // sans les autres menus custom qui ne sont pas encore chargés
        console.log("[AW27] Artwork columns patched (memory only)");
    }

    // ── Injecter le nav item ──────────────────────────────────────
    function injectNavItem() {
        if (document.getElementById("aw-nav-item")) return;
        const nav = document.getElementById("custom-nav-items");
        if (!nav) return;

        const btn = document.createElement("button");
        btn.id = "aw-nav-item";
        btn.className = "nav-item";
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-selected", "false");
        btn.innerHTML = `
        <span class="nav-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" width="18" height="18">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
        </span>
        <span class="nav-label">Artwork</span>`;

        btn.addEventListener("click", () => {
            document.querySelectorAll(".nav-item").forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-selected", "false");
            });
            btn.classList.add("active");
            btn.setAttribute("aria-selected", "true");
            const titleEl = document.getElementById("header-sheet-title");
            if (titleEl) titleEl.textContent = "Size & Care Artwork";
            if (window.state) {
                window.state.activeView = "artwork";
                window.state.activeSheet = "artwork";
            }
            showArtworkScreen();
        });

        // Insérer avant "Ajouter menu"
        const addBtn = document.getElementById("btn-add-menu");
        if (addBtn) {
            addBtn.parentNode.insertBefore(btn, addBtn);
        } else {
            nav.appendChild(btn);
        }

        // Patcher TOUS les nav-items (existants + futurs) pour cacher artwork
        function _patchNavBtn(navBtn) {
            if (navBtn.dataset.awPatched) return;
            navBtn.dataset.awPatched = "1";
            navBtn.addEventListener("click", () => {
                // Remettre activeView sur sheet/dashboard pour que renderAll fonctionne
                if (window.state?.activeView === "artwork") {
                    hideArtworkScreen();
                    // Laisser le nav-item original gérer le state
                }
            }, true); // capture = avant les autres listeners
        }

        document.querySelectorAll(".nav-item").forEach(_patchNavBtn);

        // Observer tous les nouveaux nav-items (menus custom ajoutés dynamiquement)
        new MutationObserver(() => {
            document.querySelectorAll(".nav-item:not([data-aw-patched])").forEach(_patchNavBtn);
        }).observe(document.body, { childList: true, subtree: true });
    }

    // ── Init ──────────────────────────────────────────────────────
    function init() {
        injectStyles();
        createScreen();
        injectNavItem();
        // Patcher après que app.js a fini de charger
        setTimeout(patchOrderingConfig, 1000);
        console.log("[AW27] Artwork menu v3 ✓");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 600);
    }

})();
