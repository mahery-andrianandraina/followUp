// ================================================================
//  SIP Export Excel v3 — HTML → Excel (styles natifs)
// ================================================================

(function initSIPExport() {

    if (!document.getElementById("sip-export-styles")) {
        const s = document.createElement("style");
        s.id = "sip-export-styles";
        s.textContent = `
        .sip-export-btn {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 7px 14px; border-radius: 20px;
            border: 1px solid #e8eaed;
            background: #fff; color: #5f6368;
            font-size: 12px; font-weight: 500; cursor: pointer;
            font-family: system-ui, sans-serif;
            white-space: nowrap; transition: all .15s;
            flex-shrink: 0; margin-left: auto;
        }
        .sip-export-btn:hover {
            background: #e6f4ea; color: #137333; border-color: #ceead6;
        }
        .sip-export-btn i { font-size: 14px; }
        `;
        document.head.appendChild(s);
    }

    const norm = v => String(v || "").replace(/[\s\-_]/g, "").toLowerCase();

    // ── Format date → "June.11" ───────────────────────────────────
    function fmtDate(v) {
        if (!v || !String(v).trim()) return "";
        try {
            const d = new Date(v);
            if (isNaN(d)) return String(v);
            return d.toLocaleDateString("en-US", { month: "long" }) + "." + d.getDate();
        } catch(e) { return String(v); }
    }

    // ── Escape HTML ───────────────────────────────────────────────
    const esc = s => String(s || "")
        .replace(/&/g,"&amp;").replace(/</g,"&lt;")
        .replace(/>/g,"&gt;");

    // ── Nom du fichier ────────────────────────────────────────────
    function _fileName(type) {
        const style = window._sipStyleCurrent || "";
        const det   = (window.state?.data?.details || []).find(r =>
            norm(r["Cust Style Ref"] || r.Style || "") === norm(style)
        );
        const desc   = det?.Theme || det?.["Style Type"] || det?.Description || "";
        const base   = [style, desc].filter(Boolean).join(" - ");
        return `${base} — ${type === "sample" ? "Samples" : "Ordering"}.xls`;
    }

    // ── Couleur badge approval ────────────────────────────────────
    function approvalBg(val) {
        const v = (val || "").toLowerCase();
        if (v === "approved") return { bg: "#E6F4EA", color: "#137333" };
        if (v === "rejected") return { bg: "#FCE8E6", color: "#C5221F" };
        return { bg: "#FEF7E0", color: "#B06000" };
    }

    // ── Styles inline constants ───────────────────────────────────
    const S = {
        // Styles de base réutilisables comme chaînes inline
        td: "font-family:Arial,sans-serif;font-size:11px;color:#202124;padding:5px 10px;border:1px solid #E8EAED;vertical-align:middle;white-space:nowrap;height:20px;mso-height-source:userset;",
        tdAlt: "font-family:Arial,sans-serif;font-size:11px;color:#202124;padding:5px 10px;border:1px solid #E8EAED;vertical-align:middle;white-space:nowrap;height:20px;mso-height-source:userset;background:#F8F9FA;",
        tdDate: "font-family:Arial,sans-serif;font-size:11px;color:#1557B0;padding:5px 10px;border:1px solid #E8EAED;vertical-align:middle;white-space:nowrap;height:20px;mso-height-source:userset;",
        tdDateAlt: "font-family:Arial,sans-serif;font-size:11px;color:#1557B0;padding:5px 10px;border:1px solid #E8EAED;vertical-align:middle;white-space:nowrap;height:20px;mso-height-source:userset;background:#F8F9FA;",
        tdPrice: "font-family:Arial,sans-serif;font-size:11px;color:#C5221F;font-weight:bold;padding:5px 10px;border:1px solid #E8EAED;vertical-align:middle;white-space:nowrap;height:20px;mso-height-source:userset;",
        tdPriceAlt: "font-family:Arial,sans-serif;font-size:11px;color:#C5221F;font-weight:bold;padding:5px 10px;border:1px solid #E8EAED;vertical-align:middle;white-space:nowrap;height:20px;mso-height-source:userset;background:#F8F9FA;",
        tdMono: "font-family:'Courier New',monospace;font-size:11px;color:#202124;font-weight:bold;padding:5px 10px;border:1px solid #E8EAED;vertical-align:middle;white-space:nowrap;height:20px;mso-height-source:userset;",
        tdMonoAlt: "font-family:'Courier New',monospace;font-size:11px;color:#202124;font-weight:bold;padding:5px 10px;border:1px solid #E8EAED;vertical-align:middle;white-space:nowrap;height:20px;mso-height-source:userset;background:#F8F9FA;",
        tdMuted: "font-family:Arial,sans-serif;font-size:11px;color:#9AA0A6;padding:5px 10px;border:1px solid #E8EAED;vertical-align:middle;white-space:nowrap;height:20px;mso-height-source:userset;",
        tdMutedAlt: "font-family:Arial,sans-serif;font-size:11px;color:#9AA0A6;padding:5px 10px;border:1px solid #E8EAED;vertical-align:middle;white-space:nowrap;height:20px;mso-height-source:userset;background:#F8F9FA;",
        tr: "height:20px;mso-height-source:userset;",
    };

    // ── Générer le HTML Excel ─────────────────────────────────────
    function buildHTML(title, subtitle, headers, rows) {
        const today = new Date();
        const exportDate = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        const nCols = headers.length;

        // Ligne titre
        const titleRow = `<tr style="height:32px;mso-height-source:userset;">
            <td colspan="${nCols}" style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;color:#FFFFFF;background:#1A73E8;padding:8px 14px;height:32px;mso-height-source:userset;border:none;">${esc(title)}</td>
        </tr>`;

        // Ligne sous-titre
        const subtitleRow = `<tr style="height:18px;mso-height-source:userset;">
            <td colspan="${nCols}" style="font-family:Arial,sans-serif;font-size:10px;font-style:italic;color:#1557B0;background:#E8F0FE;padding:3px 14px;height:18px;mso-height-source:userset;border:none;">Exported on ${exportDate} &nbsp;·&nbsp; ${esc(subtitle)}</td>
        </tr>`;

        // Ligne espace
        const spacerRow = `<tr style="height:6px;mso-height-source:userset;">
            <td colspan="${nCols}" style="background:#FFFFFF;height:6px;mso-height-source:userset;border:none;"></td>
        </tr>`;

        // Ligne headers — tout en inline
        const headerCells = headers.map(h => {
            const accent = h.accent || "#CCCCCC";
            return `<td style="font-family:Arial,sans-serif;font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:#5F6368;background:#F8F9FA;padding:7px 10px;height:22px;mso-height-source:userset;border:1px solid #E8EAED;border-bottom:2px solid ${accent};white-space:nowrap;">${esc(h.label.toUpperCase())}</td>`;
        }).join("");
        const headerRow = `<tr style="height:22px;mso-height-source:userset;">${headerCells}</tr>`;

        // Lignes data — 100% inline, aucune classe
        const dataRows = rows.map((row, ri) => {
            const isAlt = ri % 2 !== 0;
            const cells = headers.map(h => {
                const raw = row[h.key] ?? "";
                const val = h.type === "date" ? fmtDate(raw) : String(raw);
                const empty = !val || val === "" || val === "undefined";

                if (empty) {
                    return `<td style="${isAlt ? S.tdMutedAlt : S.tdMuted}">—</td>`;
                }

                // Badge Approval / Status
                if (h.key === "Approval" || h.key === "Status") {
                    const { bg, color } = approvalBg(val);
                    const base = isAlt ? S.tdAlt : S.td;
                    return `<td style="${base}"><span style="background:${bg};color:${color};font-weight:bold;font-size:10px;padding:2px 8px;border-radius:10px;">${esc(val)}</span></td>`;
                }

                // Badge Delivery
                if (h.key === "Delivery Status") {
                    const dv = val.toLowerCase();
                    const bg = dv === "delivered" ? "#E6F4EA" : dv === "in transit" ? "#E8F0FE" : "#F8F9FA";
                    const co = dv === "delivered" ? "#137333" : dv === "in transit" ? "#1A73E8" : "#5F6368";
                    const base = isAlt ? S.tdAlt : S.td;
                    return `<td style="${base}"><span style="background:${bg};color:${co};font-weight:bold;font-size:10px;padding:2px 8px;border-radius:10px;">${esc(val)}</span></td>`;
                }

                // Prix
                if (h.key === "Unit Price" || h.key === "UP") {
                    return `<td style="${isAlt ? S.tdPriceAlt : S.tdPrice}">$${esc(val)}</td>`;
                }

                // Date
                if (h.type === "date") {
                    return `<td style="${isAlt ? S.tdDateAlt : S.tdDate}">${esc(val)}</td>`;
                }

                // PO# monospace
                if (h.key === "PO #" || h.key === "PO") {
                    return `<td style="${isAlt ? S.tdMonoAlt : S.tdMono}">${esc(val)}</td>`;
                }

                // Texte normal
                return `<td style="${isAlt ? S.tdAlt : S.td}">${esc(val)}</td>`;
            }).join("");

            return `<tr style="${S.tr}">${cells}</tr>`;
        }).join("");

        return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<!--[if gte mso 9]><xml>
 <x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
  <x:Name>Export</x:Name>
  <x:WorksheetOptions><x:Print><x:ValidPrinterInfo/></x:Print></x:WorksheetOptions>
 </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
</xml><![endif]-->
</head>
<body>
<table style="border-collapse:collapse;width:100%;">
  ${titleRow}
  ${subtitleRow}
  ${spacerRow}
  ${headerRow}
  ${dataRows}
</table>
</body></html>`;
    }

    // ── Télécharger le fichier ────────────────────────────────────
    function downloadXLS(html, fileName) {
        if (window._awDownloadXLS) { window._awDownloadXLS(html, fileName); return; }
        const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url; a.download = fileName; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
    function buildHTML(title, subtitle, headers, rows) {
        if (window._awBuildExcelHTML) {
            return window._awBuildExcelHTML({ title, subtitle, headers, rows, sheetName: "Export" });
        }
        return "<html><body>Export non disponible</body></html>";
    }

    // ── Export Samples ────────────────────────────────────────────
    function exportSamples() {
        const style  = window._sipStyleCurrent  || "";
        const client = window._sipClientCurrent || "";
        const rows   = (window.state?.data?.sample || []).filter(r => {
            if (norm(r.Style || r["Cust Style Ref"] || "") !== norm(style)) return false;
            if (client) {
                const rc = r.Client || r.client || "";
                if (rc && norm(rc) !== norm(client)) return false;
            }
            return true;
        });

        if (!rows.length) { typeof showToast === "function" && showToast("Aucun sample à exporter", "info"); return; }

        const det   = (window.state?.data?.details || []).find(r =>
            norm(r["Cust Style Ref"] || r.Style || "") === norm(style)
        );
        const desc  = det?.Theme || det?.["Style Type"] || det?.Description || "";
        const title = [style, desc].filter(Boolean).join(" — ");

        const headers = [
            { key: "Client",        label: "Client",       width: 14 },
            { key: "Style",         label: "Style",        accent: "#1A73E8" },
            { key: "Description",   label: "Description" },
            { key: "Type",          label: "Type" },
            { key: "Fabric",        label: "Fabric" },
            { key: "Size",          label: "Size" },
            { key: "SRS Date",      label: "SRS Date",     type: "date" },
            { key: "Ready Date",    label: "Ready Date",   type: "date" },
            { key: "Received Date", label: "Received",     type: "date" },
            { key: "Sending Date",  label: "Sent",         type: "date" },
            { key: "AWB",           label: "AWB" },
            { key: "Approval",      label: "Approval",     accent: "#34A853" },
            { key: "Remarks",       label: "Remarks" },
        ];

        const html = buildHTML(title, `${rows.length} sample${rows.length > 1 ? "s" : ""} · ${client}`, headers, rows);
        downloadXLS(html, _fileName("sample"));
        typeof showToast === "function" && showToast(`Export Samples — ${rows.length} ligne${rows.length > 1 ? "s" : ""}`, "success");
    }

    // ── Export POs ────────────────────────────────────────────────
    function exportPOs() {
        const style = window._sipStyleCurrent || "";
        const rows  = (window.state?.data?.ordering || []).filter(r =>
            norm(r.Description || r.Style || "") === norm(style)
        );

        if (!rows.length) { typeof showToast === "function" && showToast("Aucun PO à exporter", "info"); return; }

        const client = window._sipClientCurrent || rows[0]?.Client || "";
        const det    = (window.state?.data?.details || []).find(r =>
            norm(r["Cust Style Ref"] || r.Style || "") === norm(style)
        );
        const desc   = det?.Theme || det?.["Style Type"] || det?.Description || "";
        const title  = [style, desc].filter(Boolean).join(" — ");

        const headers = [
            { key: "Client",          label: "Client" },
            { key: "Description",     label: "Style Ref",    accent: "#1A73E8" },
            { key: "Style",           label: "CTL Style" },
            { key: "Color",           label: "Color" },
            { key: "Trims",           label: "Trims" },
            { key: "Supplier",        label: "Supplier" },
            { key: "Unit Price",      label: "Unit Price",   accent: "#EA4335" },
            { key: "PO #",            label: "PO #",         accent: "#1A73E8" },
            { key: "PO Date",         label: "PO Date",      type: "date" },
            { key: "Ready Date",      label: "Ready Date",   type: "date" },
            { key: "PI",              label: "PI" },
            { key: "Status",          label: "Status",       accent: "#34A853" },
            { key: "Delivery Status", label: "Delivery",     accent: "#FBBC04" },
            { key: "Comments",        label: "Comments" },
        ];

        const html = buildHTML(title, `${rows.length} PO${rows.length > 1 ? "s" : ""} · ${client}`, headers, rows);
        downloadXLS(html, _fileName("ordering"));
        typeof showToast === "function" && showToast(`Export POs — ${rows.length} ligne${rows.length > 1 ? "s" : ""}`, "success");
    }

    // ── Injecter le bouton ────────────────────────────────────────
    function injectExportButton() {
        const tabs = document.querySelector(".sip-tabs");
        if (!tabs || tabs.querySelector(".sip-export-btn")) return;
        const btn = document.createElement("button");
        btn.className = "sip-export-btn";
        btn.innerHTML = `<i class="ti ti-table-export" aria-hidden="true"></i>Export Excel`;
        btn.onclick = () => {
            const activeTab = document.querySelector(".sip-tab.active");
            if ((activeTab?.id || "").includes("pos")) exportPOs();
            else exportSamples();
        };
        tabs.style.alignItems = "center";
        tabs.appendChild(btn);
    }

    const _origOpenSIP = window.openSIP;
    window.openSIP = function(styleCode, clientCode) {
        if (_origOpenSIP) _origOpenSIP(styleCode, clientCode);
        setTimeout(injectExportButton, 150);
    };

    new MutationObserver(() => {
        if (document.querySelector(".sip-tabs") && !document.querySelector(".sip-export-btn")) {
            injectExportButton();
        }
    }).observe(document.body, { childList: true, subtree: true });

    console.log("[AW27] SIP Export v3 ✓");
})();
