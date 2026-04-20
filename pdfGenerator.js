// ============================================================
// AW27 CHECKERS – PDF Generator
// Expose: window.AWCheckers.generateStylePDF(data)
// Dépendance : jsPDF (chargé dynamiquement si absent)
// ============================================================

(function () {
    "use strict";

    // ── Palette & branding ──────────────────────────────────────
    const BRAND = {
        name:    "AW27 CHECKERS",
        sub:     "SOCOTA",
        primary: [2, 132, 199],       // #0284c7
        dark:    [15, 23, 42],        // #0f172a
        accent:  [99, 102, 241],      // #6366f1
        light:   [241, 245, 249],     // #f1f5f9
        muted:   [100, 116, 139],     // #64748b
        white:   [255, 255, 255],
        green:   [34, 197, 94],       // #22c55e
        yellow:  [234, 179, 8],       // #eab308
        red:     [239, 68, 68],       // #ef4444
    };

    // ── jsPDF loader ────────────────────────────────────────────
    function loadJsPDF() {
        return new Promise((resolve, reject) => {
            if (window.jspdf && window.jspdf.jsPDF) return resolve(window.jspdf.jsPDF);
            if (window.jsPDF) return resolve(window.jsPDF);

            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
            script.onload = () => {
                const cls = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
                cls ? resolve(cls) : reject(new Error("jsPDF non trouvé après chargement"));
            };
            script.onerror = () => reject(new Error("Impossible de charger jsPDF"));
            document.head.appendChild(script);
        });
    }

    // ── Image → base64 via proxy canvas ─────────────────────────
    // Contourne le CORS pour les URL Drive (lh3.googleusercontent.com)
    function fetchImageAsBase64(url) {
        return new Promise((resolve) => {
            if (!url) return resolve(null);

            // Déjà base64
            if (url.startsWith("data:")) return resolve(url);

            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                try {
                    const canvas = document.createElement("canvas");
                    canvas.width  = img.naturalWidth  || img.width;
                    canvas.height = img.naturalHeight || img.height;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL("image/jpeg", 0.85));
                } catch {
                    resolve(null); // CORS bloqué → pas d'image mais le PDF sort quand même
                }
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });
    }

    // ── Helpers PDF ──────────────────────────────────────────────
    function setFont(doc, size, style = "normal", color = BRAND.dark) {
        doc.setFontSize(size);
        doc.setFont("helvetica", style);
        doc.setTextColor(...color);
    }

    function rect(doc, x, y, w, h, color, radius = 0) {
        doc.setFillColor(...color);
        if (radius > 0) {
            doc.roundedRect(x, y, w, h, radius, radius, "F");
        } else {
            doc.rect(x, y, w, h, "F");
        }
    }

    function line(doc, x1, y1, x2, y2, color = BRAND.light, lw = 0.3) {
        doc.setDrawColor(...color);
        doc.setLineWidth(lw);
        doc.line(x1, y1, x2, y2);
    }

    function labelValue(doc, x, y, label, value, colW = 85) {
        setFont(doc, 7, "normal", BRAND.muted);
        doc.text(label.toUpperCase(), x, y);
        setFont(doc, 8.5, "normal", BRAND.dark);
        const val = value && value !== "—" ? String(value) : "—";
        doc.text(val, x, y + 5, { maxWidth: colW - 4 });
        return y + 13;
    }

    function badge(doc, x, y, text, bgColor, textColor = BRAND.white) {
        const w = Math.min(doc.getTextWidth(text) + 6, 60);
        rect(doc, x, y - 4, w, 6, bgColor, 1.5);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...textColor);
        doc.text(text, x + 3, y);
        return x + w + 3;
    }

    // ── Format date ──────────────────────────────────────────────
    function fmtDate(raw) {
        if (!raw) return "—";
        const d = new Date(raw);
        if (isNaN(d)) return raw;
        return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
    }

    // ── Status color ─────────────────────────────────────────────
    function statusColor(status) {
        const s = (status || "").toLowerCase();
        if (s === "confirmed") return BRAND.green;
        if (s === "pending")   return BRAND.yellow;
        if (s === "cancelled") return BRAND.red;
        if (s === "approved")  return BRAND.green;
        if (s === "rejected")  return BRAND.red;
        return BRAND.muted;
    }

    // ── Main PDF generator ───────────────────────────────────────
    async function generateStylePDF(data) {
        const jsPDF = await loadJsPDF();

        // A4 portrait
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const PW = 210, PH = 297;
        const ML = 14, MR = 14, MT = 14;

        // ── 1. Header band ────────────────────────────────────────
        // Gradient simulé avec 2 rects
        rect(doc, 0, 0, PW, 28, BRAND.dark);
        rect(doc, 0, 0, PW * 0.55, 28, [2, 100, 160]); // légère variation gauche

        // Logo mark
        rect(doc, ML, 7, 12, 14, BRAND.primary, 2);
        setFont(doc, 9, "bold", BRAND.white);
        doc.text("AW", ML + 2.2, 16.5);

        // Brand text
        setFont(doc, 13, "bold", BRAND.white);
        doc.text("AW27 CHECKERS", ML + 16, 14);
        setFont(doc, 7.5, "normal", [148, 187, 233]);
        doc.text("SOCOTA — Fiche Style", ML + 16, 20);

        // Date stamp (coin droit)
        setFont(doc, 7, "normal", [148, 187, 233]);
        const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
        doc.text("Généré le " + today, PW - MR, 14, { align: "right" });
        setFont(doc, 7, "normal", [148, 187, 233]);
        doc.text("CONFIDENTIEL", PW - MR, 20, { align: "right" });

        let y = MT + 28 + 6; // curseur Y

        // ── 2. Titre du style ─────────────────────────────────────
        const styleName = data.Style || "Style inconnu";
        const styleDesc = data.Description || data['Description'] || "";
        const client    = data.Client || "";

        // Fond titre
        rect(doc, ML, y, PW - ML - MR, 20, BRAND.light, 3);

        setFont(doc, 18, "bold", BRAND.dark);
        doc.text(styleName, ML + 5, y + 13);

        // Client badge (coin droit du titre)
        if (client) {
            setFont(doc, 8, "normal", BRAND.muted);
            const cLabel = client.toUpperCase();
            const cW = doc.getTextWidth(cLabel) + 8;
            rect(doc, PW - MR - cW, y + 6, cW, 8, BRAND.primary, 2);
            doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...BRAND.white);
            doc.text(cLabel, PW - MR - cW / 2, y + 11.5, { align: "center" });
        }

        y += 24;

        // Description sous le titre
        if (styleDesc) {
            setFont(doc, 8.5, "italic", BRAND.muted);
            doc.text(styleDesc, ML, y, { maxWidth: PW - ML - MR - 2 });
            y += 7;
        }

        // ── 3. Image + infos clés ─────────────────────────────────
        y += 3;
        const IMG_W = 70, IMG_H = 78;
        const INFO_X = ML + IMG_W + 8;
        const INFO_W  = PW - MR - INFO_X;

        // Bloc image (placeholder ou vraie image)
        const photoUrl  = data.photoUrl || "";
        const imageData = await fetchImageAsBase64(photoUrl);

        rect(doc, ML, y, IMG_W, IMG_H, BRAND.light, 3);
        if (imageData) {
            try {
                // Calcul ratio pour centrer sans déformer
                const tmpImg = new Image();
                await new Promise(res => { tmpImg.onload = res; tmpImg.onerror = res; tmpImg.src = imageData; });
                const iW = tmpImg.naturalWidth || 1;
                const iH = tmpImg.naturalHeight || 1;
                const ratio = Math.min(IMG_W / iW, IMG_H / iH);
                const dW = iW * ratio - 4;
                const dH = iH * ratio - 4;
                const dX = ML + (IMG_W - dW) / 2;
                const dY = y  + (IMG_H - dH) / 2;
                doc.addImage(imageData, "JPEG", dX, dY, dW, dH, undefined, "FAST");
            } catch {
                // Si l'image échoue, placeholder
                setFont(doc, 8, "normal", BRAND.muted);
                doc.text("Photo\nnon disponible", ML + IMG_W / 2, y + IMG_H / 2, { align: "center" });
            }
        } else {
            // Icône placeholder
            setFont(doc, 22, "normal", [203, 213, 225]);
            doc.text("◻", ML + IMG_W / 2 - 4, y + IMG_H / 2 + 4);
            setFont(doc, 7, "normal", BRAND.muted);
            doc.text("Aucune photo", ML + IMG_W / 2, y + IMG_H / 2 + 12, { align: "center" });
        }

        // ── Infos clés à droite de l'image ───────────────────────
        let iy = y + 2;
        const fields1 = [
            { label: "Saison",      value: data.Saison },
            { label: "Département", value: data.Dept },
            { label: "Matière",     value: data["Fabric Base"] },
            { label: "Costing",     value: data.Costing ? "$ " + data.Costing : "" },
            { label: "Order Qty",   value: data["Order Qty"] ? Number(data["Order Qty"]).toLocaleString("fr-FR") + " u." : "" },
        ];

        fields1.forEach(f => {
            iy = labelValue(doc, INFO_X, iy, f.label, f.value || "—", INFO_W);
        });

        // Status badge
        if (data.Status) {
            setFont(doc, 7, "normal", BRAND.muted);
            doc.text("STATUT", INFO_X, iy);
            iy += 4;
            badge(doc, INFO_X, iy + 1, data.Status.toUpperCase(), statusColor(data.Status));
            iy += 10;
        }

        y = Math.max(y + IMG_H + 6, iy + 4);

        // ── 4. Separator ──────────────────────────────────────────
        line(doc, ML, y, PW - MR, y, BRAND.light, 0.5);
        y += 6;

        // ── 5. Dates section ──────────────────────────────────────
        rect(doc, ML, y, PW - ML - MR, 7, BRAND.primary, 2);
        setFont(doc, 8, "bold", BRAND.white);
        doc.text("DATES CLÉS", ML + 4, y + 5);
        y += 11;

        const dates = [
            { label: "PSD",           value: fmtDate(data.PSD) },
            { label: "Ex-Factory",    value: fmtDate(data["Ex-Fty"]) },
            { label: "PLC Booking",   value: fmtDate(data["PLC Booking"]) },
            { label: "CRP Booking",   value: fmtDate(data["CRP Booking"]) },
        ].filter(d => d.value && d.value !== "—");

        if (dates.length > 0) {
            const colW = (PW - ML - MR) / Math.min(dates.length, 4);
            dates.forEach((d, i) => {
                const cx = ML + i * colW;
                rect(doc, cx, y, colW - 2, 18, BRAND.light, 2);
                setFont(doc, 6.5, "normal", BRAND.muted);
                doc.text(d.label.toUpperCase(), cx + 4, y + 5.5);
                setFont(doc, 9, "bold", BRAND.dark);
                doc.text(d.value, cx + 4, y + 13);
            });
            y += 22;
        } else {
            setFont(doc, 8, "normal", BRAND.muted);
            doc.text("Aucune date renseignée", ML, y + 5);
            y += 12;
        }

        y += 4;

        // ── 6. Commentaires ───────────────────────────────────────
        const comments = data.Comments || "";
        if (comments && comments !== "—") {
            rect(doc, ML, y, PW - ML - MR, 7, [30, 41, 59], 2);
            setFont(doc, 8, "bold", BRAND.white);
            doc.text("COMMENTAIRES", ML + 4, y + 5);
            y += 11;

            rect(doc, ML, y, PW - ML - MR, 1, BRAND.light); // top line
            y += 3;

            setFont(doc, 8.5, "normal", BRAND.dark);
            const lines = doc.splitTextToSize(comments, PW - ML - MR - 6);
            const commentH = lines.length * 5 + 6;
            rect(doc, ML, y - 2, PW - ML - MR, commentH, BRAND.light, 2);
            doc.text(lines, ML + 4, y + 4);
            y += commentH + 4;
        }

        y += 2;

        // ── 7. Note PLC/CRP si présents ──────────────────────────
        const hasPLC = data["PLC Booking"] && data["PLC Booking"] !== "—";
        const hasCRP = data["CRP Booking"] && data["CRP Booking"] !== "—";
        if (hasPLC || hasCRP) {
            setFont(doc, 7, "normal", BRAND.muted);
            if (hasPLC) { doc.text("▸ PLC Booking : " + fmtDate(data["PLC Booking"]), ML, y); y += 5; }
            if (hasCRP) { doc.text("▸ CRP Booking : " + fmtDate(data["CRP Booking"]), ML, y); y += 5; }
            y += 2;
        }

        // ── 8. Footer ─────────────────────────────────────────────
        rect(doc, 0, PH - 14, PW, 14, BRAND.dark);
        setFont(doc, 6.5, "normal", [100, 130, 160]);
        doc.text("AW27 CHECKERS · SOCOTA", ML, PH - 5);
        doc.text("Document généré automatiquement — ne pas diffuser", PW / 2, PH - 5, { align: "center" });
        doc.text("Page 1 / 1", PW - MR, PH - 5, { align: "right" });

        // Accent line footer
        rect(doc, 0, PH - 15, PW, 1, BRAND.primary);

        // ── Save ──────────────────────────────────────────────────
        const filename = "fiche_" + (data.Style || "style").replace(/[^a-zA-Z0-9_-]/g, "_") + ".pdf";
        doc.save(filename);
    }

    // ── Expose public API ────────────────────────────────────────
    window.AWCheckers = window.AWCheckers || {};
    window.AWCheckers.generateStylePDF = generateStylePDF;

    console.log("[AW27] pdfGenerator.js chargé ✓");
})();
