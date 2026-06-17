// ================================================================
//  AW27 — Excel Export Patch
//  Remplace exportExcel() et exportGlobalNotifExcel() avec
//  le même rendu HTML→Excel stylé (thème Google)
//  Charger après app.js dans index.html
// ================================================================

(function patchExcelExports() {

    // ── Helpers partagés ──────────────────────────────────────────
    const esc = s => String(s || "")
        .replace(/&/g,"&amp;").replace(/</g,"&lt;")
        .replace(/>/g,"&gt;");

    function fmtDate(v) {
        if (!v || !String(v).trim()) return "";
        try {
            const d = new Date(v);
            if (isNaN(d)) return String(v);
            return d.toLocaleDateString("en-US", { month: "long" }) + "." + d.getDate();
        } catch(e) { return String(v); }
    }

    function approvalBg(val) {
        const v = (val || "").toLowerCase();
        if (v === "approved" || v === "confirmed") return { bg: "#E6F4EA", co: "#137333" };
        if (v === "rejected"  || v === "cancelled") return { bg: "#FCE8E6", co: "#C5221F" };
        return { bg: "#FEF7E0", co: "#B06000" };
    }

    // ── Styles inline ─────────────────────────────────────────────
    const TD  = "font-family:Arial,sans-serif;font-size:11px;color:#202124;padding:5px 10px;border:1px solid #E8EAED;vertical-align:middle;white-space:nowrap;height:20px;mso-height-source:userset;background:#FFFFFF;";
    const TDA = "font-family:Arial,sans-serif;font-size:11px;color:#202124;padding:5px 10px;border:1px solid #E8EAED;vertical-align:middle;white-space:nowrap;height:20px;mso-height-source:userset;background:#F8F9FA;";
    const TR  = "height:20px;mso-height-source:userset;";

    function tdStyle(isAlt, extra) {
        return (isAlt ? TDA : TD) + (extra || "");
    }

    // ── Construire le HTML Excel ──────────────────────────────────
    function buildExcelHTML(opts) {
        // opts = { title, subtitle, headers, rows, sheetName }
        // headers = [{ key, label, type?, accent?, isDate?, isMono?, isPrice?, isBadge? }]
        const { title, subtitle, headers, rows, sheetName } = opts;
        const nCols = headers.length;
        const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

        const titleRow = `<tr style="height:32px;mso-height-source:userset;">
            <td colspan="${nCols}" style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;color:#FFFFFF;background:#1A73E8;padding:8px 14px;height:32px;mso-height-source:userset;border:none;">${esc(title)}</td>
        </tr>`;

        const subtitleRow = `<tr style="height:18px;mso-height-source:userset;">
            <td colspan="${nCols}" style="font-family:Arial,sans-serif;font-size:10px;font-style:italic;color:#1557B0;background:#E8F0FE;padding:3px 14px;height:18px;mso-height-source:userset;border:none;">${esc(subtitle)} &nbsp;·&nbsp; Exported on ${today}</td>
        </tr>`;

        const spacerRow = `<tr style="height:6px;mso-height-source:userset;">
            <td colspan="${nCols}" style="background:#FFFFFF;height:6px;mso-height-source:userset;border:none;"></td>
        </tr>`;

        const headerCells = headers.map(h => {
            const accent = h.accent || "#CCCCCC";
            return `<td style="font-family:Arial,sans-serif;font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:#5F6368;background:#F8F9FA;padding:7px 10px;height:22px;mso-height-source:userset;border:1px solid #E8EAED;border-bottom:2px solid ${accent};white-space:nowrap;">${esc(h.label.toUpperCase())}</td>`;
        }).join("");
        const headerRow = `<tr style="height:22px;mso-height-source:userset;">${headerCells}</tr>`;

        const dataRows = rows.map((row, ri) => {
            const isAlt = ri % 2 !== 0;
            const cells = headers.map(h => {
                let raw = row[h.key] ?? "";
                // Fallback : la colonne "UP" peut être stockée sous "Unit Price"
                if ((raw === "" || raw == null) && h.key === "UP") raw = row["Unit Price"] ?? "";
                if ((raw === "" || raw == null) && h.key === "Unit Price") raw = row["UP"] ?? "";
                // Fallback : la colonne "PO" peut être stockée sous "PO #"
                if ((raw === "" || raw == null) && h.key === "PO") raw = row["PO #"] ?? "";
                if ((raw === "" || raw == null) && h.key === "PO #") raw = row["PO"] ?? "";
                const isDateCol = h.isDate || h.type === "date";
                const val = isDateCol ? fmtDate(raw) : String(raw);
                const empty = !val || val === "" || val === "undefined" || val === "null";

                if (empty) {
                    return `<td style="${tdStyle(isAlt, "color:#9AA0A6;")}">—</td>`;
                }

                // Lien cliquable (colonnes URL) — texte normal, pas bleu souligné
                if (/^https?:\/\//i.test(val.trim())) {
                    const linkUrl = val.trim();
                    // Libellé : nom de fichier associé, sinon "Ouvrir"
                    let label = "Ouvrir";
                    if (h.key === "PI URL")  label = row["PI Filename"] || "PI";
                    else if (h.key === "PO URL") label = row["PO Filename"] || "PO";
                    else if (/filename/i.test(h.key)) label = val;
                    else {
                        const fn = linkUrl.match(/\/([^\/?]+\.(pdf|xlsx|xls|jpg|jpeg|png))/i);
                        label = fn ? fn[1] : "Ouvrir";
                    }
                    const safeUrl   = linkUrl.replace(/"/g, "%22");
                    const safeLabel = esc(label).replace(/"/g, "&quot;");
                    // x:str force Excel à traiter la formule ; style texte noir non souligné
                    return `<td style="${tdStyle(isAlt, "color:#202124;text-decoration:none;")}">` +
                           `<a href="${safeUrl}" style="color:#202124;text-decoration:none;">${safeLabel}</a></td>`;
                }

                // Badge approval/status/delivery
                if (h.isBadge || ["Approval","Status","Delivery Status"].includes(h.key)) {
                    const { bg, co } = approvalBg(val);
                    return `<td style="${tdStyle(isAlt)}"><span style="background:${bg};color:${co};font-weight:bold;font-size:10px;padding:2px 8px;border-radius:10px;">${esc(val)}</span></td>`;
                }

                // Prix
                if (h.isPrice || h.key === "Unit Price" || h.key === "UP" || h.key === "Costing") {
                    return `<td style="${tdStyle(isAlt, "color:#C5221F;font-weight:bold;")}">$${esc(val)}</td>`;
                }

                // Date
                if (isDateCol) {
                    return `<td style="${tdStyle(isAlt, "color:#1557B0;")}"> ${esc(val)}</td>`;
                }

                // Monospace (PO#, ref)
                if (h.isMono || h.key === "PO #" || h.key === "PO") {
                    return `<td style="${tdStyle(isAlt, "font-family:'Courier New',monospace;font-weight:bold;")}"> ${esc(val)}</td>`;
                }

                return `<td style="${tdStyle(isAlt)}">${esc(val)}</td>`;
            }).join("");

            return `<tr style="${TR}">${cells}</tr>`;
        }).join("");

        return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:x="urn:schemas-microsoft-com:office:excel"
xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<!--[if gte mso 9]><xml>
<x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>${esc(sheetName || "Export")}</x:Name>
<x:WorksheetOptions><x:Print><x:ValidPrinterInfo/></x:Print></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
</xml><![endif]-->
</head>
<body>
<table style="border-collapse:collapse;width:100%;">
${titleRow}${subtitleRow}${spacerRow}${headerRow}${dataRows}
</table>
</body></html>`;
    }

    // ── Télécharger ───────────────────────────────────────────────
    function downloadXLS(html, fileName) {
        const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url; a.download = fileName; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

    // ════════════════════════════════════════════════════════════════
    //  1. PATCH exportExcel() — tableau actif
    // ════════════════════════════════════════════════════════════════
    window.exportExcel = function() {
        const cfg  = window.SHEET_CONFIG?.[window.state?.activeSheet];
        const rows = (window.state?.filteredData?.length
            ? window.state.filteredData
            : window.state?.data?.[window.state?.activeSheet]) || [];

        if (!cfg || !rows.length) {
            typeof showToast === "function" && showToast("Aucune donnée à exporter", "info");
            return;
        }

        // Construire les headers depuis SHEET_CONFIG
        const DATE_KEYS = ["date", "Date", "DATE"];
        const PRICE_KEYS = ["Unit Price", "UP", "Costing", "Approved Price $", "Target Price $", "1st Price $"];
        const BADGE_KEYS = ["Approval", "Status", "Delivery Status", "Order Status"];
        const MONO_KEYS  = ["PO #", "PO", "CTLStyleRef", "Cust Style Ref", "AWB"];

        const headers = cfg.cols
            .filter(c => !["TP_URL", "Image", "_imageUrl", "Comment PDF",
                           "PI Filename", "PO Filename",
                           "Artwork Original URL", "Artwork Signed URL"].includes(c.key))
            .map(c => ({
                key:     c.key,
                label:   c.label,
                type:    c.type,
                isDate:  c.type === "date" || DATE_KEYS.some(k => c.label.toLowerCase().includes(k.toLowerCase())),
                isPrice: PRICE_KEYS.includes(c.key),
                isBadge: BADGE_KEYS.includes(c.key),
                isMono:  MONO_KEYS.includes(c.key),
                accent:  BADGE_KEYS.includes(c.key) ? "#34A853"
                       : PRICE_KEYS.includes(c.key) ? "#EA4335"
                       : MONO_KEYS.includes(c.key)  ? "#1A73E8"
                       : "#CCCCCC"
            }));

        const today = new Date().toISOString().slice(0, 10);
        const fileName = `AW27_${cfg.label}_${today}.xls`;

        const html = buildExcelHTML({
            title:     cfg.label,
            subtitle:  `${rows.length} ligne${rows.length > 1 ? "s" : ""} · AW27 Checkers`,
            headers,
            rows,
            sheetName: cfg.label
        });

        downloadXLS(html, fileName);
        typeof showToast === "function" && showToast(`Export — ${cfg.label} (${rows.length} lignes)`, "success");
    };

    // ════════════════════════════════════════════════════════════════
    //  2. PATCH exportGlobalNotifExcel() — alertes globales
    // ════════════════════════════════════════════════════════════════
    window.exportGlobalNotifExcel = function() {
        const all  = typeof collectAllAlerts === "function" ? collectAllAlerts() : {};
        const keys = Object.keys(all);
        if (!keys.length) {
            typeof showToast === "function" && showToast("Aucune alerte à exporter", "info");
            return;
        }

        // Construire les lignes toutes alertes confondues
        const allRows = [];
        keys.forEach(k => {
            all[k].items.forEach(item => {
                allRows.push({
                    Menu:     all[k].label,
                    Style:    item.style    || "",
                    Client:   item.client   || "",
                    Alerte:   item.title    || "",
                    Action:   item.action   || "",
                    Urgence:  item.urgency  === "high" ? "Critique" : item.urgency === "mid" ? "Attention" : "Info",
                    Detail:   item.meta     || "",
                });
            });
        });

        const headers = [
            { key: "Menu",   label: "Menu",    accent: "#1A73E8" },
            { key: "Style",  label: "Style",   accent: "#1A73E8", isMono: true },
            { key: "Client", label: "Client" },
            { key: "Urgence",label: "Urgence", isBadge: true, accent: "#EA4335" },
            { key: "Alerte", label: "Alerte" },
            { key: "Action", label: "Action requise" },
            { key: "Detail", label: "Détail" },
        ];

        const today    = new Date().toISOString().slice(0, 10);
        const total    = allRows.length;
        const fileName = `AW27_Alertes_Globales_${today}.xls`;

        const html = buildExcelHTML({
            title:     "AW27 Checkers — Alertes Globales",
            subtitle:  `${total} alerte${total > 1 ? "s" : ""} · ${keys.length} menu${keys.length > 1 ? "s" : ""}`,
            headers,
            rows:      allRows,
            sheetName: "Alertes"
        });

        downloadXLS(html, fileName);
        typeof showToast === "function" && showToast(`Export — ${total} alerte${total > 1 ? "s" : ""}`, "success");
    };

    // ── Exposer buildExcelHTML pour sip-export.js ─────────────────
    window._awBuildExcelHTML = buildExcelHTML;
    window._awDownloadXLS    = downloadXLS;

    console.log("[AW27] Excel Export Patch appliqué ✓");
})();
