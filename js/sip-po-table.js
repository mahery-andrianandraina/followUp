// ================================================================
//  PATCH — SIP PO Table v6 : panel auto-width + no wrap
// ================================================================

(function injectSIPTableStyles() {
    const existing = document.getElementById("sip-table-styles");
    if (existing) existing.remove();
    const s = document.createElement("style");
    s.id = "sip-table-styles";
    s.textContent = `
    :root {
        --g-blue:    #1a73e8;
        --g-red:     #ea4335;
        --g-yellow:  #fbbc04;
        --g-green:   #34a853;
        --g-blue-50: #e8f0fe;
        --g-blue-100:#d2e3fc;
        --g-blue-700:#1557b0;
        --g-gray-50: #f8f9fa;
        --g-gray-100:#f1f3f4;
        --g-gray-200:#e8eaed;
        --g-gray-400:#bdc1c6;
        --g-gray-600:#80868b;
        --g-gray-700:#5f6368;
        --g-gray-900:#202124;
    }

    /* ── Panel : s'adapte au contenu jusqu'à 92vw ── */
    #sip-panel {
        width: fit-content !important;
        min-width: 600px !important;
        max-width: 92vw !important;
        background: var(--g-gray-100) !important;
    }

    #sip-header {
        background: #1a73e8 !important;
        border-bottom: none !important;
        padding: 18px 20px !important;
    }
    #sip-header-icon {
        background: rgba(255,255,255,0.18) !important;
        border: 1px solid rgba(255,255,255,0.3) !important;
        color: #fff !important;
    }
    #sip-title { color: #fff !important; font-size: 15px !important; font-weight: 600 !important; }
    #sip-sub   { color: rgba(255,255,255,0.75) !important; }
    #sip-close {
        color: rgba(255,255,255,0.8) !important;
        background: rgba(255,255,255,0.1) !important;
    }
    #sip-close:hover { background: rgba(234,67,53,0.85) !important; color: #fff !important; }

    .sip-tabs {
        background: #fff !important;
        border-bottom: 1px solid var(--g-gray-200) !important;
        padding: 0 20px !important;
    }
    .sip-tab {
        color: var(--g-gray-600) !important;
        border-bottom: 3px solid transparent !important;
        font-weight: 500 !important;
        font-size: 13px !important;
        padding: 13px 18px !important;
    }
    .sip-tab:hover { color: var(--g-blue) !important; }
    .sip-tab.active { color: var(--g-blue) !important; border-color: var(--g-blue) !important; }
    .sip-tab-count {
        background: var(--g-blue-50) !important;
        color: var(--g-blue-700) !important;
        font-size: 11px !important;
        border-radius: 20px !important;
        padding: 2px 8px !important;
    }
    .sip-tab.active .sip-tab-count {
        background: var(--g-blue) !important;
        color: #fff !important;
    }

    #sip-body {
        background: var(--g-gray-100) !important;
        padding: 16px 20px !important;
        min-width: 0;
    }

    /* ── Search ── */
    .sip-search-bar {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 16px;
        background: #fff;
        border-bottom: 1px solid var(--g-gray-200);
    }
    .sip-search-wrap {
        display: flex; align-items: center; gap: 8px;
        flex: 1; min-width: 260px;
        background: var(--g-gray-100);
        border: 1px solid var(--g-gray-200);
        border-radius: 24px; padding: 7px 14px;
        transition: border-color .2s, box-shadow .2s;
    }
    .sip-search-wrap:focus-within {
        border-color: var(--g-blue);
        box-shadow: 0 0 0 2px rgba(26,115,232,0.15);
        background: #fff;
    }
    .sip-search-wrap i { color: var(--g-gray-600); font-size: 15px; flex-shrink: 0; }
    .sip-search-input {
        flex: 1; border: none; background: transparent; outline: none;
        font-size: 13px; color: var(--g-gray-900); font-family: system-ui, sans-serif;
    }
    .sip-search-input::placeholder { color: var(--g-gray-400); }
    .sip-search-count {
        font-size: 12px; color: var(--g-gray-600);
        white-space: nowrap; flex-shrink: 0;
    }
    .sip-search-clear {
        background: none; border: none; cursor: pointer;
        color: var(--g-gray-400); font-size: 16px; padding: 0;
        display: none; align-items: center; justify-content: center;
        width: 20px; height: 20px; border-radius: 50%;
    }
    .sip-search-clear.visible { display: flex !important; }
    .sip-search-clear:hover { background: var(--g-gray-200); color: var(--g-gray-700); }

    /* ── Table wrap ── */
    .sip-po-table-wrap {
        background: #fff;
        border: 1px solid var(--g-gray-200);
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(60,64,67,.1);
        /* S'étend avec le tableau */
        width: 100%;
    }
    .sip-po-table-title {
        display: flex; align-items: center; gap: 8px;
        padding: 14px 18px;
        border-bottom: 1px solid var(--g-gray-200);
        background: #fff;
        font-size: 13px; font-weight: 600; color: var(--g-gray-900);
        white-space: nowrap;
    }
    .sip-po-table-title i { font-size: 16px; color: var(--g-blue); }
    .sip-po-table-count {
        margin-left: auto;
        font-size: 11px; padding: 3px 10px; border-radius: 20px;
        background: var(--g-blue-50); color: var(--g-blue-700); font-weight: 600;
    }

    /* ── Tableau : auto-layout pour s'adapter au contenu ── */
    .sip-table-scroll {
        width: 100%;
        overflow-x: hidden; /* pas de scroll horizontal */
    }
    .sip-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
        /* auto : chaque colonne prend la largeur de son contenu */
        table-layout: auto;
        font-family: system-ui, sans-serif;
        white-space: nowrap; /* tout sur une ligne */
    }
    .sip-table thead tr {
        background: var(--g-gray-50);
        border-bottom: 1px solid var(--g-gray-200);
    }
    .sip-table th {
        padding: 9px 12px;
        text-align: left;
        font-size: 10px; font-weight: 700;
        color: var(--g-gray-600);
        text-transform: uppercase;
        letter-spacing: .06em;
        background: var(--g-gray-50);
        white-space: nowrap;
    }
    /* Accents couleurs Google */
    .sip-table th.col-po   { border-bottom: 2px solid var(--g-blue);   }
    .sip-table th.col-up   { border-bottom: 2px solid var(--g-red);    }
    .sip-table th.col-stat { border-bottom: 2px solid var(--g-green);  }
    .sip-table th.col-del  { border-bottom: 2px solid var(--g-yellow); }

    .sip-table td {
        padding: 10px 12px;
        border-bottom: 1px solid var(--g-gray-100);
        vertical-align: middle;
        color: var(--g-gray-900);
        font-size: 12px;
        white-space: nowrap; /* pas de retour à la ligne */
    }
    /* Comments : seule colonne qui peut wrapper si vraiment long */
    .sip-table td.col-com {
        white-space: nowrap;
        max-width: 240px;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .sip-table tbody tr:last-child td { border-bottom: none; }
    .sip-table tbody tr:hover td { background: var(--g-blue-50); }
    .sip-table td.muted { color: var(--g-gray-400); }

    /* Highlight recherche */
    .sip-hl {
        background: #fef08a; border-radius: 2px;
        padding: 0 2px; font-weight: 600;
    }

    /* Badges */
    .sip-po-status-pill {
        display: inline-flex; align-items: center;
        font-size: 10.5px; font-weight: 500; padding: 3px 9px;
        border-radius: 20px; white-space: nowrap;
    }
    .pill-confirmed  { background: #e6f4ea; color: #137333; }
    .pill-pending    { background: #fef7e0; color: #b06000; }
    .pill-cancelled  { background: var(--g-gray-100); color: var(--g-gray-600); }
    .pill-delivered  { background: #e6f4ea; color: #137333; }
    .pill-transit    { background: var(--g-blue-50); color: var(--g-blue-700); }
    .pill-notshipped { background: var(--g-gray-100); color: var(--g-gray-600); }

    /* Bouton PDF */
    .sip-po-pdf-btn {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 3px 9px; border-radius: 20px;
        border: 1px solid var(--g-blue);
        background: var(--g-blue-50); color: var(--g-blue);
        font-size: 11px; font-weight: 500; cursor: pointer;
        font-family: system-ui, sans-serif;
        white-space: nowrap; transition: background .15s;
    }
    .sip-po-pdf-btn:hover { background: var(--g-blue-100); }

    /* Prix */
    .sip-price-val { font-weight: 600; color: #c5221f; }

    /* Footer */
    .sip-table-footer {
        display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        padding: 11px 16px;
        border-top: 1px solid var(--g-gray-200);
        background: var(--g-gray-50);
        font-size: 12px; color: var(--g-gray-600);
    }
    .sip-footer-chip {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 3px 10px; border-radius: 20px;
        font-size: 11px; font-weight: 500;
    }
    .sip-footer-chip.confirmed { background: #e6f4ea; color: #137333; }
    .sip-footer-chip.delivered { background: var(--g-blue-50); color: var(--g-blue-700); }
    .sip-footer-chip.nopo      { background: #fce8e6; color: #c5221f; }
    .sip-footer-chip.filter    { background: #fef7e0; color: #b06000; }

    /* Empty */
    .sip-empty {
        text-align: center; padding: 48px 20px;
        color: var(--g-gray-600); font-size: 13px; line-height: 1.8;
    }
    .sip-empty i { font-size: 40px; display: block; margin: 0 auto 16px; opacity: .25; }
    `;
    document.head.appendChild(s);
})();

(function patchSIPPOs() {

    const norm = v => String(v || "").replace(/[\s\-_]/g, "").toLowerCase();
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

    function _filterPOs(styleCode) {
        return (window.state?.data?.ordering || []).filter(r =>
            norm(r.Description || r.Style || "") === norm(styleCode)
        );
    }

    function hl(text, q) {
        if (!q || !text) return esc2(text);
        const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return esc2(String(text)).replace(new RegExp(safe, 'gi'),
            m => `<span class="sip-hl">${m}</span>`);
    }

    function buildRow(o, q) {
        const poNum     = o["PO #"]            || o.PO            || "";
        const trims     = o.Trims              || o.trims          || "";
        const supplier  = o.Supplier           || o.supplier       || "";
        const uprice    = o["Unit Price"]      || o.UP             || o.up || "";
        const poDate    = fmtD(o["PO Date"]    || o.PODate);
        const readyDate = fmtD(o["Ready Date"] || o.ReadyDate);
        const pi        = o.PI                 || o.pi             || "";
        const status    = o.Status             || "";
        const delivery  = o["Delivery Status"] || o.DeliveryStatus || "";
        const comment   = o.Comments || o.comments || o.Remarks || o.Notes || "";
        const pdfUrl    = (o["Comment PDF"]    || "").trim();

        const stCls  = status  === "Confirmed" ? "pill-confirmed"
                     : status  === "Cancelled"  ? "pill-cancelled" : "pill-pending";
        const delCls = delivery === "Delivered" ? "pill-delivered"
                     : delivery === "In Transit" ? "pill-transit"
                     : delivery ? "pill-notshipped" : "";

        const poCell = poNum
            ? (pdfUrl.startsWith("http")
                ? `<button class="sip-po-pdf-btn"
                       onclick="event.stopPropagation();openCPDFPreview('${esc2(pdfUrl)}','PO ${esc2(poNum)}')">
                       <i class="ti ti-file-type-pdf" aria-hidden="true"></i>${hl(poNum, q)}
                   </button>`
                : `<strong>${hl(poNum, q)}</strong>`)
            : `<span class="muted">—</span>`;

        return `<tr>
            <td class="col-po">${poCell}</td>
            <td class="col-sup">${supplier  ? hl(supplier,  q) : '<span class="muted">—</span>'}</td>
            <td class="col-trims">${trims   ? hl(trims,     q) : '<span class="muted">—</span>'}</td>
            <td class="col-up">${uprice
                ? `<span class="sip-price-val">$${hl(String(uprice), q)}</span>`
                : '<span class="muted">—</span>'}</td>
            <td class="col-date">${poDate    || '<span class="muted">—</span>'}</td>
            <td class="col-date">${readyDate || '<span class="muted">—</span>'}</td>
            <td class="col-pi">${pi ? hl(pi, q) : '<span class="muted">—</span>'}</td>
            <td class="col-stat">${status
                ? `<span class="sip-po-status-pill ${stCls}">${esc2(status)}</span>`
                : '<span class="muted">—</span>'}</td>
            <td class="col-del">${delivery
                ? `<span class="sip-po-status-pill ${delCls}">${esc2(delivery)}</span>`
                : '<span class="muted">—</span>'}</td>
            <td class="col-com" title="${esc2(comment)}">${comment
                ? hl(comment, q)
                : '<span class="muted">—</span>'}</td>
        </tr>`;
    }

    function _applyFilter(allOrders, q) {
        if (!q) return allOrders;
        const ql = q.toLowerCase();
        return allOrders.filter(o => [
            o["PO #"], o.PO, o.Supplier, o.Trims,
            o["Unit Price"], o.UP, o.PI,
            o.Status, o["Delivery Status"],
            o.Comments, o.Remarks
        ].join(" ").toLowerCase().includes(ql));
    }

    function renderSIPPOsTable(query) {
        const body = document.getElementById("sip-body");
        if (!body) return;

        const _sipStyle = window._sipStyleCurrent || "";
        const allOrders = _filterPOs(_sipStyle);
        const q = (query || "").trim();
        const filtered = _applyFilter(allOrders, q);

        const countEl = document.getElementById("sip-count-pos");
        if (countEl) countEl.textContent = allOrders.length;

        if (!allOrders.length) {
            body.innerHTML = `<div class="sip-empty">
                <i class="ti ti-receipt" aria-hidden="true"></i>
                Aucun PO enregistré pour <strong>${esc2(_sipStyle)}</strong>
            </div>`;
            return;
        }

        const nConfirmed = allOrders.filter(o => o.Status === "Confirmed").length;
        const nDelivered = allOrders.filter(o => o["Delivery Status"] === "Delivered").length;
        const nNoPO      = allOrders.filter(o => !o["PO #"] && !o.PO).length;

        const tableRows = filtered.length
            ? filtered.map(o => buildRow(o, q)).join("")
            : `<tr><td colspan="10" style="text-align:center;padding:28px;color:#80868b;font-size:12px;">
                Aucun résultat pour "<strong>${esc2(q)}</strong>"
               </td></tr>`;

        const footerHTML = (val) => `
            <span class="sip-footer-chip confirmed">
                <i class="ti ti-check" style="font-size:13px" aria-hidden="true"></i>
                ${nConfirmed} confirmé${nConfirmed > 1 ? "s" : ""}
            </span>
            <span class="sip-footer-chip delivered">
                <i class="ti ti-truck" style="font-size:13px" aria-hidden="true"></i>
                ${nDelivered} livré${nDelivered > 1 ? "s" : ""}
            </span>
            ${nNoPO > 0 ? `<span class="sip-footer-chip nopo">
                <i class="ti ti-alert-circle" style="font-size:13px" aria-hidden="true"></i>
                ${nNoPO} sans PO
            </span>` : ""}
            ${val ? `<span class="sip-footer-chip filter">
                <i class="ti ti-filter" style="font-size:13px" aria-hidden="true"></i>
                "${esc2(val)}"
            </span>` : ""}`;

        body.innerHTML = `
        <div class="sip-po-table-wrap">
            <div class="sip-po-table-title">
                <i class="ti ti-receipt" aria-hidden="true"></i>
                Purchase Orders — ${esc2(_sipStyle)}
                <span class="sip-po-table-count">${allOrders.length} PO${allOrders.length > 1 ? "s" : ""}</span>
            </div>

            <div class="sip-search-bar">
                <div class="sip-search-wrap">
                    <i class="ti ti-search" aria-hidden="true"></i>
                    <input class="sip-search-input" id="sip-po-search"
                        placeholder="Rechercher PO, supplier, trims, prix, commentaire..."
                        value="${esc2(q)}" autocomplete="off"/>
                    <button class="sip-search-clear ${q ? "visible" : ""}"
                        id="sip-po-search-clear" title="Effacer">✕</button>
                </div>
                <span class="sip-search-count" id="sip-search-count-val">
                    ${q ? filtered.length + "/" + allOrders.length : allOrders.length}
                    résultat${filtered.length !== 1 ? "s" : ""}
                </span>
            </div>

            <div class="sip-table-scroll">
                <table class="sip-table">
                    <thead><tr>
                        <th class="col-po">PO #</th>
                        <th class="col-sup">Supplier</th>
                        <th class="col-trims">Trims</th>
                        <th class="col-up">Unit Price</th>
                        <th class="col-date">PO Date</th>
                        <th class="col-date">Ready Date</th>
                        <th class="col-pi">PI</th>
                        <th class="col-stat">Status</th>
                        <th class="col-del">Delivery</th>
                        <th class="col-com">Comments</th>
                    </tr></thead>
                    <tbody id="sip-po-tbody">${tableRows}</tbody>
                </table>
            </div>

            <div class="sip-table-footer" id="sip-table-footer">
                ${footerHTML(q)}
            </div>
        </div>`;

        const inp = document.getElementById("sip-po-search");
        const clr = document.getElementById("sip-po-search-clear");

        if (inp) {
            inp.addEventListener("input", () => {
                const val = inp.value;
                clr && clr.classList.toggle("visible", !!val);
                const f = _applyFilter(allOrders, val);
                const tbody = document.getElementById("sip-po-tbody");
                const cnt   = document.getElementById("sip-search-count-val");
                const foot  = document.getElementById("sip-table-footer");
                if (tbody) tbody.innerHTML = f.length
                    ? f.map(o => buildRow(o, val)).join("")
                    : `<tr><td colspan="10" style="text-align:center;padding:28px;color:#80868b;font-size:12px;">
                        Aucun résultat pour "<strong>${esc2(val)}</strong>"
                       </td></tr>`;
                if (cnt) cnt.textContent = (val ? f.length + "/" + allOrders.length : allOrders.length) + " résultat" + (f.length !== 1 ? "s" : "");
                if (foot) foot.innerHTML = footerHTML(val);
            });
        }
        if (clr) {
            clr.addEventListener("click", () => {
                if (inp) { inp.value = ""; inp.focus(); inp.dispatchEvent(new Event("input")); }
            });
        }
    }

    const _origOpenSIP = window.openSIP;
    window.openSIP = function(styleCode, clientCode) {
        window._sipStyleCurrent  = styleCode  || "";
        window._sipClientCurrent = clientCode || "";
        if (_origOpenSIP) _origOpenSIP(styleCode, clientCode);
    };

    const _origSipSetTab = window.sipSetTab;
    window.sipSetTab = function(tab) {
        document.querySelectorAll(".sip-tab").forEach(t => t.classList.remove("active"));
        const tabEl = document.getElementById("sip-tab-" + tab);
        if (tabEl) tabEl.classList.add("active");
        if (tab === "pos") renderSIPPOsTable("");
        else if (_origSipSetTab) _origSipSetTab(tab);
    };

    console.log("[AW27] SIP PO table v6 ✓");
})();
