// ================================================================
//  PATCH SIP — Style Info Panel redesign complet
//  Remplace la fonction initStyleInfoPanel dans app.js
//  À coller à la fin de app.js en remplacement du bloc existant
// ================================================================

(function initStyleInfoPanel() {

    // ── Styles ────────────────────────────────────────────────────
    const existingStyle = document.getElementById("sip-styles");
    if (existingStyle) existingStyle.remove();

    const s = document.createElement("style");
    s.id = "sip-styles";
    s.textContent = `
    #sip-overlay {
        position: fixed; inset: 0; z-index: 10500;
        background: rgba(0,0,0,0.4);
        display: none; align-items: stretch; justify-content: flex-end;
    }
    #sip-overlay.open { display: flex; }

    #sip-panel {
        width: min(680px, 48vw);
        height: 100vh;
        background: #ffffff;
        border-left: 1px solid #e5e7eb;
        box-shadow: -12px 0 48px rgba(0,0,0,0.15);
        display: flex; flex-direction: column;
        transform: translateX(100%);
        transition: transform .3s cubic-bezier(.4,0,.2,1);
        overflow: hidden; flex-shrink: 0;
    }
    #sip-overlay.open #sip-panel { transform: translateX(0); }

    /* ── Header ── */
    #sip-header {
        padding: 16px 20px;
        border-bottom: 1px solid #f0f1f3;
        background: #fafbfc;
        display: flex; align-items: flex-start; gap: 12px; flex-shrink: 0;
    }
    #sip-header-icon {
        width: 40px; height: 40px; border-radius: 10px;
        background: #eff6ff; border: 1px solid #bfdbfe;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0; color: #1d4ed8; margin-top: 2px;
    }
    #sip-title {
        font-size: 15px; font-weight: 700; color: #1a1f36;
        line-height: 1.3;
    }
    #sip-sub { font-size: 12px; color: #6b7280; margin-top: 3px; }
    #sip-close {
        margin-left: auto; flex-shrink: 0;
        background: none; border: none; cursor: pointer; color: #9ca3af;
        width: 32px; height: 32px; border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        transition: background .12s;
    }
    #sip-close:hover { background: #fee2e2; color: #dc2626; }

    /* ── Tabs ── */
    .sip-tabs {
        display: flex; border-bottom: 1px solid #e5e7eb;
        flex-shrink: 0; background: #fff; padding: 0 20px;
    }
    .sip-tab {
        padding: 12px 16px; font-size: 13px; font-weight: 500;
        color: #6b7280; cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: color .12s, border-color .12s;
        display: flex; align-items: center; gap: 6px;
        user-select: none;
    }
    .sip-tab i { font-size: 14px; }
    .sip-tab.active { color: #1d4ed8; border-color: #1d4ed8; }
    .sip-tab-count {
        font-size: 11px; padding: 1px 7px; border-radius: 20px;
        background: #e5e7eb; color: #374151; font-weight: 600;
    }
    .sip-tab.active .sip-tab-count { background: #dbeafe; color: #1d4ed8; }

    /* ── Body ── */
    #sip-body {
        flex: 1; overflow-y: auto;
        padding: 16px 20px;
        display: flex; flex-direction: column; gap: 12px;
        background: #f8f9fb;
    }
    #sip-body::-webkit-scrollbar { width: 5px; }
    #sip-body::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }

    /* ── Sample card ── */
    .sip-sample-card {
        background: #fff;
        border: 1px solid #e8eaed;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .sip-sample-header {
        display: flex; align-items: center; gap: 10px;
        padding: 12px 16px;
        border-bottom: 1px solid #f3f4f6;
        background: #fafbfc;
    }
    .sip-sample-icon {
        width: 36px; height: 36px; border-radius: 9px;
        display: flex; align-items: center; justify-content: center;
        font-size: 16px; flex-shrink: 0;
    }
    .sip-sample-icon-approved  { background: #f0fdf4; }
    .sip-sample-icon-rejected  { background: #fef2f2; }
    .sip-sample-icon-pending   { background: #fffbeb; }
    .sip-sample-title { flex: 1; }
    .sip-sample-name { font-size: 13px; font-weight: 600; color: #1a1f36; }
    .sip-sample-size { font-size: 11px; color: #6b7280; margin-top: 2px; }

    .sip-apvl-badge {
        display: inline-flex; align-items: center; gap: 5px;
        font-size: 11px; font-weight: 600; padding: 4px 10px;
        border-radius: 20px; border: 1px solid; flex-shrink: 0;
    }
    .sip-apvl-approved { background: #f0fdf4; color: #166534; border-color: #86efac; }
    .sip-apvl-rejected { background: #fef2f2; color: #991b1b; border-color: #fca5a5; }
    .sip-apvl-pending  { background: #fffbeb; color: #92400e; border-color: #fcd34d; }

    .sip-sample-grid {
        display: grid; grid-template-columns: 1fr 1fr 1fr;
        gap: 0; padding: 4px 0;
    }
    .sip-grid-cell {
        padding: 10px 16px;
        border-right: 1px solid #f3f4f6;
        display: flex; flex-direction: column; gap: 3px;
    }
    .sip-grid-cell:last-child, .sip-grid-cell:nth-child(3n) { border-right: none; }
    .sip-grid-cell + .sip-grid-cell { border-top: 0px; }
    .sip-grid-label {
        font-size: 10px; font-weight: 600; color: #9ca3af;
        text-transform: uppercase; letter-spacing: .06em;
    }
    .sip-grid-val { font-size: 12.5px; font-weight: 500; color: #1a1f36; }
    .sip-grid-val-muted { color: #9ca3af; font-weight: 400; }

    .sip-sample-remarks {
        padding: 10px 16px;
        font-size: 12px; color: #374151; line-height: 1.6;
        border-top: 1px solid #f3f4f6;
        background: #f8faff;
        border-left: 3px solid #93c5fd;
    }
    .sip-pdf-link {
        display: flex; align-items: center; gap: 8px;
        padding: 10px 16px;
        border-top: 1px solid #dbeafe;
        background: #eff6ff;
        font-size: 12px; font-weight: 600; color: #1d4ed8;
        text-decoration: none; cursor: pointer;
        transition: background .15s;
    }
    .sip-pdf-link:hover { background: #dbeafe; }
    .sip-pdf-link i { font-size: 16px; flex-shrink: 0; }
    .sip-pdf-link-arrow { margin-left: auto; font-size: 12px; opacity: .6; }

    /* ── PO card ── */
    .sip-po-card {
        background: #fff;
        border: 1px solid #e8eaed;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .sip-po-header {
        display: flex; align-items: center; gap: 10px;
        padding: 12px 16px;
        border-bottom: 1px solid #f3f4f6;
        background: #fafbfc;
    }
    .sip-po-num {
        font-family: monospace; font-size: 14px; font-weight: 700;
        color: #1a1f36; flex: 1;
    }
    .sip-po-num-empty { color: #9ca3af; font-family: inherit; font-size: 12px; font-style: italic; }
    .sip-po-status {
        display: inline-flex; align-items: center;
        font-size: 11px; font-weight: 600; padding: 4px 10px;
        border-radius: 20px; border: 1px solid; flex-shrink: 0;
    }
    .sip-po-confirmed { background: #eff6ff; color: #1e40af; border-color: #93c5fd; }
    .sip-po-pending   { background: #fffbeb; color: #92400e; border-color: #fcd34d; }
    .sip-po-cancelled { background: #f9fafb; color: #6b7280; border-color: #d1d5db; }

    .sip-po-grid {
        display: grid; grid-template-columns: 1fr 1fr 1fr;
        padding: 4px 0;
    }
    .sip-po-grid .sip-grid-cell { border-bottom: 1px solid #f3f4f6; }
    .sip-po-grid .sip-grid-cell:nth-last-child(-n+3) { border-bottom: none; }

    .sip-delivery-row {
        display: flex; align-items: center; gap: 8px;
        padding: 10px 16px;
        border-top: 1px solid #f3f4f6;
        background: #fafbfc;
    }
    .sip-delivery-label { font-size: 11px; color: #6b7280; }
    .sip-delivery-badge {
        display: inline-flex; align-items: center; gap: 5px;
        font-size: 11px; font-weight: 600; padding: 3px 10px;
        border-radius: 20px; border: 1px solid;
    }
    .sip-del-delivered  { background: #f0fdf4; color: #166534; border-color: #86efac; }
    .sip-del-transit    { background: #eff6ff; color: #1e40af; border-color: #93c5fd; }
    .sip-del-notshipped { background: #f9fafb; color: #6b7280; border-color: #d1d5db; }

    .sip-po-comment {
        padding: 10px 16px; font-size: 12px; color: #374151;
        line-height: 1.6; border-top: 1px solid #f3f4f6;
        background: #f8faff; border-left: 3px solid #93c5fd;
    }

    /* ── Empty state ── */
    .sip-empty {
        text-align: center; padding: 48px 20px;
        color: #9ca3af; font-size: 13px; line-height: 1.8;
    }
    .sip-empty i { font-size: 40px; display: block; margin: 0 auto 16px; opacity: .25; }

    /* ── Bouton Infos dans toolbar ── */
    .tb-btn.tb-info:hover {
        background: #eff6ff !important; color: #1d4ed8 !important;
        border-color: #bfdbfe !important;
    }
    `;
    document.head.appendChild(s);

    // ── Créer / remplacer le overlay ─────────────────────────────
    const existing = document.getElementById("sip-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "sip-overlay";
    overlay.innerHTML = `
    <div id="sip-panel">
        <div id="sip-header">
            <div id="sip-header-icon">
                <i class="ti ti-info-circle" style="font-size:20px" aria-hidden="true"></i>
            </div>
            <div style="flex:1;min-width:0;">
                <div id="sip-title">Détails du style</div>
                <div id="sip-sub">Samples &amp; POs</div>
            </div>
            <button id="sip-close" onclick="closeSIP()" aria-label="Fermer">
                <i class="ti ti-x" style="font-size:16px" aria-hidden="true"></i>
            </button>
        </div>
        <div class="sip-tabs">
            <div class="sip-tab active" id="sip-tab-samples" onclick="sipSetTab('samples')">
                <i class="ti ti-test-pipe" aria-hidden="true"></i>
                Samples
                <span class="sip-tab-count" id="sip-count-samples">0</span>
            </div>
            <div class="sip-tab" id="sip-tab-pos" onclick="sipSetTab('pos')">
                <i class="ti ti-receipt" aria-hidden="true"></i>
                POs
                <span class="sip-tab-count" id="sip-count-pos">0</span>
            </div>
        </div>
        <div id="sip-body"></div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", e => { if (e.target === overlay) closeSIP(); });

    // ── Helpers ──────────────────────────────────────────────────
    let _sipStyle  = "";
    let _sipClient = "";

    const fmtD = v => {
        if (!v) return null;
        try { return new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }); }
        catch(e) { return String(v); }
    };

    const norm = v => String(v || "").replace(/[\s\-_]/g, "").toLowerCase();

    function _filterSamples(styleCode, clientCode) {
        const rows = window.state?.data?.sample || [];
        return rows.filter(r => {
            const styleMatch = norm(r.Style || r.style || r["Cust Style Ref"] || "") === norm(styleCode);
            if (!styleMatch) return false;
            if (clientCode) {
                const rc = r.Client || r.client || r.Buyer || "";
                if (rc && norm(rc) !== norm(clientCode)) return false;
            }
            return true;
        });
    }

    function _filterPOs(styleCode, clientCode) {
        const rows = window.state?.data?.ordering || [];
        return rows.filter(r => {
            const desc = r.Description || r.Style || "";
            return norm(desc) === norm(styleCode);
        });
    }

    // ── Rendu Samples ─────────────────────────────────────────────
    function renderSIPSamples() {
        const body = document.getElementById("sip-body");
        const samples = _filterSamples(_sipStyle, _sipClient);
        document.getElementById("sip-count-samples").textContent = samples.length;

        if (!samples.length) {
            body.innerHTML = `<div class="sip-empty">
                <i class="ti ti-test-pipe" aria-hidden="true"></i>
                Aucun sample trouvé<br>pour <strong>${esc(_sipStyle)}</strong>
            </div>`;
            return;
        }

        body.innerHTML = samples.map(s => {
            const apvl    = (s.Approval || "").trim();
            const apvlCls = apvl === "Approved" ? "approved" : apvl === "Rejected" ? "rejected" : "pending";
            const apvlIcon = apvl === "Approved" ? "✓" : apvl === "Rejected" ? "✗" : "⏳";
            const sampleIcon = apvl === "Approved" ? "sip-sample-icon-approved"
                             : apvl === "Rejected"  ? "sip-sample-icon-rejected"
                             : "sip-sample-icon-pending";

            const type    = s.Type || s["Sample Type"] || "Sample";
            const size    = s.Size || s.size || "";
            const fabric  = s.Fabric || s.fabric || s.Tissu || "";
            const awb     = s.AWB || s.awb || s.Tracking || "";
            const remarks = s.Remarks || s.remarks || s.Comments || s.comments || s.Notes || "";

            const srsDate    = fmtD(s["SRS Date"]      || s.SRS);
            const readyDate  = fmtD(s["Ready Date"]    || s.ReadyDate);
            const sendDate   = fmtD(s["Sending Date"]  || s.SendingDate || s["Send Date"]);
            const recvDate   = fmtD(s["Received Date"] || s.ReceivedDate || s.Received);

            const cells = [
                { l: "Type",     v: type },
                { l: "Fabric",   v: fabric  || "—" },
                { l: "Size",     v: size    || "—" },
                { l: "SRS Date", v: srsDate || "—" },
                { l: "Ready",    v: readyDate || "—" },
                { l: "Envoyé",   v: sendDate  || "—" },
                { l: "Reçu",     v: recvDate  || "—" },
                { l: "AWB",      v: awb       || "—" },
                { l: "Client",   v: esc(s.Client || _sipClient || "—") },
            ];

            return `<div class="sip-sample-card">
                <div class="sip-sample-header">
                    <div class="sip-sample-icon ${sampleIcon}">${apvlIcon}</div>
                    <div class="sip-sample-title">
                        <div class="sip-sample-name">${esc(type)}${size ? " · " + esc(size) : ""}</div>
                        <div class="sip-sample-size">${esc(fabric)}</div>
                    </div>
                    <span class="sip-apvl-badge sip-apvl-${apvlCls}">
                        ${apvlIcon} ${esc(apvl || "Pending")}
                    </span>
                </div>
                <div class="sip-sample-grid">
                    ${cells.map(c => `
                    <div class="sip-grid-cell">
                        <div class="sip-grid-label">${c.l}</div>
                        <div class="sip-grid-val ${c.v === "—" ? "sip-grid-val-muted" : ""}">${c.v}</div>
                    </div>`).join("")}
                </div>
                ${remarks ? `<div class="sip-sample-remarks">💬 ${esc(remarks)}</div>` : ""}
            </div>`;
        }).join("");
    }

    // ── Rendu POs ─────────────────────────────────────────────────
    function renderSIPPOs() {
        const body = document.getElementById("sip-body");
        const orders = _filterPOs(_sipStyle, _sipClient);
        document.getElementById("sip-count-pos").textContent = orders.length;

        if (!orders.length) {
            body.innerHTML = `<div class="sip-empty">
                <i class="ti ti-receipt" aria-hidden="true"></i>
                Aucun PO enregistré<br>pour <strong>${esc(_sipStyle)}</strong>
            </div>`;
            return;
        }

        // Mettre à jour le sous-titre
        const totalQty = orders.reduce((s, o) => {
            const q = parseInt(o.Qty || o.qty || o["Conf Total"] || 0);
            return s + (isNaN(q) ? 0 : q);
        }, 0);
        document.getElementById("sip-sub").textContent =
            orders.length + " PO" + (orders.length > 1 ? "s" : "") +
            (totalQty > 0 ? " · " + totalQty.toLocaleString("fr-FR") + " u." : "");

        body.innerHTML = orders.map(o => {
            const st = (o.Status || "").trim();
            const stCls = st === "Confirmed" ? "sip-po-confirmed"
                        : st === "Cancelled" ? "sip-po-cancelled"
                        : "sip-po-pending";

            const poNum     = o["PO #"] || o.PO || "";
            const supplier  = o.Supplier || o.supplier || "";
            const color     = o.Color || o.color || o.Coloris || "";
            const trims     = o.Trims || o.trims || "";
            const uprice    = o["Unit Price"] || o.UP || o.up || "";
            const poDate    = fmtD(o["PO Date"]   || o.PODate);
            const readyDate = fmtD(o["Ready Date"] || o.ReadyDate);
            const pi        = o.PI || o.pi || "";
            const delStatus = o["Delivery Status"] || o.DeliveryStatus || "";
            const comment   = o.Comments || o.comments || o.Remarks || o.Notes || "";
            const pdfUrl    = (o["Comment PDF"] || "").trim();

            const delCls = delStatus === "Delivered"  ? "sip-del-delivered"
                         : delStatus === "In Transit"  ? "sip-del-transit"
                         : "sip-del-notshipped";
            const delIcon = delStatus === "Delivered" ? "✓"
                          : delStatus === "In Transit" ? "🚢"
                          : "○";

            const cells = [
                { l: "Fournisseur", v: supplier || "—" },
                { l: "Couleur",     v: color    || "—" },
                { l: "Trims",       v: trims    || "—" },
                { l: "Prix Unit.",  v: uprice ? "$" + esc(String(uprice)) : "—" },
                { l: "PO Date",     v: poDate   || "—" },
                { l: "Ready Date",  v: readyDate || "—" },
                { l: "PI",          v: pi       || "—" },
                { l: "Dept",        v: esc(o.Dept || o.dept || "—") },
                { l: "Style CTL",   v: esc(o.Style || "—") },
            ];

            return `<div class="sip-po-card">
                <div class="sip-po-header">
                    <i class="ti ti-receipt" style="font-size:18px;color:#6b7280;flex-shrink:0" aria-hidden="true"></i>
                    <div class="sip-po-num">
                        ${poNum
                            ? (pdfUrl.startsWith("http")
                                ? `<a onclick="event.stopPropagation();openCPDFPreview('${esc(pdfUrl)}','PO ${esc(poNum)}')"
                                      style="cursor:pointer;color:#1d4ed8;text-decoration:underline;font-family:monospace">
                                      📄 ${esc(poNum)}
                                   </a>`
                                : esc(poNum))
                            : `<span class="sip-po-num-empty">PO non reçu</span>`}
                    </div>
                    <span class="sip-po-status ${stCls}">${esc(st || "Pending")}</span>
                </div>
                <div class="sip-po-grid">
                    ${cells.map(c => `
                    <div class="sip-grid-cell">
                        <div class="sip-grid-label">${c.l}</div>
                        <div class="sip-grid-val ${c.v === "—" ? "sip-grid-val-muted" : ""}">${c.v}</div>
                    </div>`).join("")}
                </div>
                ${delStatus ? `
                <div class="sip-delivery-row">
                    <span class="sip-delivery-label">Livraison :</span>
                    <span class="sip-delivery-badge ${delCls}">${delIcon} ${esc(delStatus)}</span>
                </div>` : ""}
                ${comment ? `<div class="sip-po-comment">💬 ${esc(comment)}</div>` : ""}
                ${pdfUrl.startsWith("http") ? `
                <a href="${esc(pdfUrl)}" target="_blank" rel="noopener" class="sip-pdf-link"
                   onclick="event.stopPropagation()">
                    <i class="ti ti-file-type-pdf" aria-hidden="true"></i>
                    Ouvrir le PDF du PO ${esc(poNum)}
                    <span class="sip-pdf-link-arrow">↗</span>
                </a>` : ""}
            </div>`;
        }).join("");
    }

    // ── API publique ──────────────────────────────────────────────
    window.openSIP = function(styleCode, clientCode) {
        _sipStyle  = styleCode  || "";
        _sipClient = clientCode || "";

        const overlay = document.getElementById("sip-overlay");
        overlay.classList.add("open");

        // Titre
        const detRow = (window.state?.data?.details || []).find(r =>
            norm(r["Cust Style Ref"] || r.Style || "") === norm(_sipStyle)
        );
        const desc = detRow?.Theme || detRow?.["Style Type"] || detRow?.Description || "";
        document.getElementById("sip-title").textContent =
            _sipStyle + (desc ? " — " + desc : "");
        document.getElementById("sip-sub").textContent =
            (_sipClient ? _sipClient + " · " : "") + "Samples & POs";

        // Comptes dans les onglets
        document.getElementById("sip-count-samples").textContent =
            _filterSamples(_sipStyle, _sipClient).length;
        document.getElementById("sip-count-pos").textContent =
            _filterPOs(_sipStyle, _sipClient).length;

        sipSetTab("samples");
    };

    window.closeSIP = function() {
        document.getElementById("sip-overlay").classList.remove("open");
    };

    window.sipSetTab = function(tab) {
        document.querySelectorAll(".sip-tab").forEach(t => t.classList.remove("active"));
        document.getElementById("sip-tab-" + tab).classList.add("active");
        tab === "samples" ? renderSIPSamples() : renderSIPPOs();
    };

    // ── Injecter bouton Infos dans chaque card ────────────────────
    function injectInfoButton(card) {
        const toolbar = card.querySelector(".dbs-card-toolbar");
        if (!toolbar || toolbar.querySelector(".tb-info")) return;

        const styleCode  = card.dataset.styleRaw  || card.dataset.style  || "";
        const clientCode = card.dataset.clientRaw || card.dataset.client || "";
        if (!styleCode) return;

        const btn = document.createElement("button");
        btn.className = "dbs-tb-btn tb-info";
        btn.title = "Voir samples & POs";
        btn.innerHTML = `<i class="ti ti-info-circle" aria-hidden="true" style="font-size:13px"></i><span>Infos</span>`;
        btn.onclick = (e) => {
            e.stopPropagation();
            window.openSIP(styleCode, clientCode);
        };
        toolbar.appendChild(btn);
    }

    new MutationObserver(() => {
        document.querySelectorAll(".dbs-sc").forEach(injectInfoButton);
    }).observe(document.body, { childList: true, subtree: true });

    document.querySelectorAll(".dbs-sc").forEach(injectInfoButton);

})();
