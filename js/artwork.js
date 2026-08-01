// ================================================================
//  AW27 — Artwork Checker v3
//  PDF multi-pages (p1=WashCare, p2=Warning, p3=Barcode) vs Excel
//  IA : Claude Anthropic API (lecture PDF native)
//  Ouverture via menu Actions → window._awOpen()
// ================================================================

(function() {

    // ── Types d'artwork ───────────────────────────────────────
    const TYPES = {
        wash_care: {
            label: "Wash Care",
            icon:  "ti-shirt",
            color: "#0369a1",
            bg:    "#eff6ff",
            page:  1,
            fields: ["composition", "country", "care_remarks"]
        },
        warning: {
            label: "Warning",
            icon:  "ti-alert-triangle",
            color: "#b45309",
            bg:    "#fef9c3",
            page:  2,
            fields: ["warning_text"]
        },
        barcode: {
            label: "Barcode",
            icon:  "ti-barcode",
            color: "#166534",
            bg:    "#f0fdf4",
            page:  3,
            fields: ["eans", "sizes"]
        }
    };

    let selectedTypes = ["wash_care", "warning", "barcode"];
    let pdfBase64     = "";
    let excelRows     = [];
    let excelMeta     = {};
    let extractedData = {};

    // ── CSS ───────────────────────────────────────────────────
    function injectCSS() {
        if (document.getElementById("aw27-art-css")) return;
        const st = document.createElement("style");
        st.id = "aw27-art-css";
        st.textContent = `
        #aw-view{font-family:inherit;}
        .aw-card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;
            padding:18px;margin-bottom:14px;}
        .aw-card-title{font-size:13px;font-weight:600;color:#0f172a;margin-bottom:12px;
            display:flex;align-items:center;gap:8px;}
        .aw-type-row{display:flex;gap:8px;flex-wrap:wrap;}
        .aw-type-chip{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;
            border-radius:20px;border:1.5px solid #e2e8f0;background:#fff;
            cursor:pointer;font-size:12px;font-weight:500;color:#475569;
            transition:all .15s;font-family:inherit;}
        .aw-type-chip.on{background:#eff6ff;border-color:#1565c0;color:#1565c0;}
        .aw-upload{border:2px dashed #cbd5e1;border-radius:8px;padding:24px;
            text-align:center;cursor:pointer;transition:all .15s;}
        .aw-upload:hover{border-color:#1565c0;background:#f8faff;}
        .aw-upload.done{border-color:#16a34a;background:#f0fdf4;border-style:solid;}
        .aw-btn{padding:8px 18px;border-radius:8px;font-size:12.5px;font-weight:600;
            font-family:inherit;cursor:pointer;border:none;transition:background .15s;}
        .aw-btn-blue{background:#1565c0;color:#fff;}
        .aw-btn-blue:hover{background:#1251a3;}
        .aw-btn-blue:disabled{opacity:.45;cursor:not-allowed;}
        .aw-btn-grey{background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;}
        .aw-spin{display:inline-block;width:14px;height:14px;
            border:2px solid rgba(255,255,255,.3);border-top-color:#fff;
            border-radius:50%;animation:aw-s .6s linear infinite;vertical-align:middle;}
        @keyframes aw-s{to{transform:rotate(360deg);}}
        .aw-row-ok  {display:flex;gap:10px;align-items:flex-start;padding:8px 12px;
            border-radius:7px;background:#f0fdf4;border:0.5px solid #86efac;margin-bottom:5px;}
        .aw-row-err {display:flex;gap:10px;align-items:flex-start;padding:8px 12px;
            border-radius:7px;background:#fef2f2;border:0.5px solid #fca5a5;margin-bottom:5px;}
        .aw-row-warn{display:flex;gap:10px;align-items:flex-start;padding:8px 12px;
            border-radius:7px;background:#fefce8;border:0.5px solid #fde047;margin-bottom:5px;}
        .aw-tag{display:inline-block;padding:1px 8px;border-radius:12px;font-size:10px;
            font-weight:600;margin-right:4px;}
        `;
        document.head.appendChild(st);
    }

    // ── Ouvrir la modale ──────────────────────────────────────
    window._awOpen = function() {
        injectCSS();
        document.getElementById("aw-modal-overlay")?.remove();

        const overlay = document.createElement("div");
        overlay.id = "aw-modal-overlay";
        overlay.style.cssText = "position:fixed;inset:0;z-index:99999;" +
            "background:rgba(15,23,42,.5);display:flex;align-items:center;" +
            "justify-content:center;padding:20px;";

        const modal = document.createElement("div");
        modal.style.cssText = "background:#fff;border-radius:14px;width:100%;" +
            "max-width:800px;max-height:90vh;overflow-y:auto;position:relative;" +
            "box-shadow:0 20px 60px rgba(0,0,0,.25);";

        modal.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;
            padding:16px 20px;border-bottom:1px solid #e2e8f0;
            position:sticky;top:0;background:#fff;z-index:1;">
            <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:34px;height:34px;border-radius:8px;background:#f5f3ff;
                    display:flex;align-items:center;justify-content:center;">
                    <i class="ti ti-palette" style="font-size:17px;color:#7c3aed;"
                        aria-hidden="true"></i>
                </div>
                <div>
                    <div style="font-size:14px;font-weight:700;color:#0f172a;">
                        Artwork Checker</div>
                    <div style="font-size:11px;color:#64748b;">
                        Contrôle qualité — Wash Care · Warning · Barcode</div>
                </div>
            </div>
            <button onclick="document.getElementById('aw-modal-overlay').remove()"
                style="width:28px;height:28px;border-radius:50%;border:none;
                    background:#f1f5f9;cursor:pointer;font-size:14px;color:#64748b;
                    font-family:inherit;">✕</button>
        </div>
        <div id="aw-view" style="padding:18px 20px;"></div>`;

        overlay.appendChild(modal);
        overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
        document.body.appendChild(overlay);

        renderStep1();
    };

    // ── ÉTAPE 1 : Sélection des types + upload PDF ────────────
    function renderStep1() {
        const view = document.getElementById("aw-view");

        // Reset état
        selectedTypes = ["wash_care", "warning", "barcode"];
        pdfBase64 = ""; excelRows = []; excelMeta = {}; extractedData = {};

        view.innerHTML = `
        <!-- Types à vérifier -->
        <div class="aw-card">
            <div class="aw-card-title">
                <div style="width:22px;height:22px;border-radius:50%;background:#1565c0;
                    color:#fff;display:flex;align-items:center;justify-content:center;
                    font-size:11px;font-weight:700;flex-shrink:0;">1</div>
                Types à vérifier
            </div>
            <div class="aw-type-row">
                ${Object.entries(TYPES).map(([k, t]) => `
                <button class="aw-type-chip on" data-type="${k}"
                    onclick="window._awToggleType('${k}', this)">
                    <i class="ti ${t.icon}" style="font-size:14px;color:${t.color};"
                        aria-hidden="true"></i>
                    ${t.label}
                </button>`).join("")}
            </div>
        </div>

        <!-- Upload PDF -->
        <div class="aw-card">
            <div class="aw-card-title">
                <div style="width:22px;height:22px;border-radius:50%;background:#1565c0;
                    color:#fff;display:flex;align-items:center;justify-content:center;
                    font-size:11px;font-weight:700;flex-shrink:0;">2</div>
                Artwork PDF
                <span style="font-size:11px;font-weight:400;color:#64748b;">
                    — Page 1 : Wash Care &nbsp;·&nbsp; Page 2 : Warning &nbsp;·&nbsp;
                    Page 3 : Barcode</span>
            </div>
            <div class="aw-upload" id="aw-pdf-zone"
                onclick="document.getElementById('aw-pdf-in').click()">
                <i class="ti ti-file-type-pdf" style="font-size:30px;color:#94a3b8;"
                    aria-hidden="true"></i>
                <p style="margin:8px 0 4px;font-size:13px;font-weight:500;color:#475569;">
                    Cliquer pour sélectionner le PDF artwork</p>
                <p style="margin:0;font-size:11px;color:#94a3b8;">
                    PDF multi-pages (Wash Care + Warning + Barcode)</p>
            </div>
            <input type="file" id="aw-pdf-in" accept=".pdf"
                style="display:none" onchange="window._awLoadPDF(this)"/>
            <div id="aw-pdf-msg" style="margin-top:8px;"></div>
        </div>

        <!-- Upload Excel -->
        <div class="aw-card" id="aw-xl-card" style="opacity:.45;pointer-events:none;">
            <div class="aw-card-title">
                <div style="width:22px;height:22px;border-radius:50%;background:#e2e8f0;
                    color:#94a3b8;display:flex;align-items:center;justify-content:center;
                    font-size:11px;font-weight:700;flex-shrink:0;" id="aw-num3">3</div>
                Fichier Excel de référence
                <span style="font-size:11px;font-weight:400;color:#64748b;">
                    — même fichier pour les 3 types</span>
            </div>
            <div style="background:#f8fafc;border-radius:8px;padding:10px 14px;
                margin-bottom:12px;font-size:11.5px;color:#64748b;">
                <strong style="color:#0f172a;">Structure attendue :</strong> un seul onglet avec
                3 sections — header (Client/Saison/C/o) · Wash Care (Composition + Remarks)
                · Table barcodes (PRODUCT NAME | SKU CODE | SKU BARCODE | SIZE LABEL)
            </div>
            <div class="aw-upload" id="aw-xl-zone"
                onclick="document.getElementById('aw-xl-in').click()">
                <i class="ti ti-file-spreadsheet" style="font-size:30px;color:#94a3b8;"
                    aria-hidden="true"></i>
                <p style="margin:8px 0 4px;font-size:13px;font-weight:500;color:#475569;">
                    Cliquer pour sélectionner l'Excel de référence</p>
            </div>
            <input type="file" id="aw-xl-in" accept=".xlsx,.xls"
                style="display:none" onchange="window._awLoadExcel(this)"/>
            <div id="aw-xl-msg" style="margin-top:8px;"></div>
        </div>

        <!-- Analyser -->
        <div style="text-align:right;margin-top:4px;">
            <button class="aw-btn aw-btn-blue" id="aw-run-btn"
                disabled onclick="window._awRunCheck()">
                <i class="ti ti-shield-check" aria-hidden="true"></i>
                Lancer le contrôle
            </button>
        </div>`;
    }

    // ── Toggle type chip ──────────────────────────────────────
    window._awToggleType = function(key, el) {
        if (selectedTypes.includes(key)) {
            selectedTypes = selectedTypes.filter(k => k !== key);
            el.classList.remove("on");
        } else {
            selectedTypes.push(key);
            el.classList.add("on");
        }
    };

    // ── Charger PDF ───────────────────────────────────────────
    window._awLoadPDF = async function(input) {
        const file = input.files[0];
        if (!file) return;

        const zone = document.getElementById("aw-pdf-zone");
        const msg  = document.getElementById("aw-pdf-msg");
        msg.innerHTML = `<span style="font-size:12px;color:#64748b;">Chargement…</span>`;

        pdfBase64 = await new Promise(res => {
            const r = new FileReader();
            r.onload = e => res(e.target.result.split(",")[1]);
            r.readAsDataURL(file);
        });

        // Compter les pages avec PDF.js
        let pages = "?";
        try {
            if (!window.pdfjsLib) {
                await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
                window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
            }
            const pdf = await window.pdfjsLib.getDocument({data: atob(pdfBase64)}).promise;
            pages = pdf.numPages;
        } catch(e) {}

        zone.classList.add("done");
        zone.innerHTML = `<i class="ti ti-circle-check" style="font-size:26px;color:#16a34a;"
            aria-hidden="true"></i>
            <p style="margin:6px 0 0;font-size:13px;font-weight:500;color:#166534;">
            ${file.name} · ${pages} page${pages > 1 ? "s" : ""}</p>`;
        msg.innerHTML = `<span style="font-size:11px;color:#16a34a;">
            ✓ Page 1→Wash Care · Page 2→Warning · Page 3→Barcode</span>`;

        // Activer étape Excel
        const xlCard = document.getElementById("aw-xl-card");
        if (xlCard) { xlCard.style.opacity = "1"; xlCard.style.pointerEvents = "auto"; }
        const num3 = document.getElementById("aw-num3");
        if (num3) { num3.style.background = "#1565c0"; num3.style.color = "#fff"; }

        checkRunable();
    };

    // ── Charger Excel ─────────────────────────────────────────
    window._awLoadExcel = async function(input) {
        const file = input.files[0];
        if (!file) return;

        const zone = document.getElementById("aw-xl-zone");
        const msg  = document.getElementById("aw-xl-msg");
        msg.innerHTML = `<span style="font-size:12px;color:#64748b;">Lecture…</span>`;

        try {
            const buf = await new Promise(res => {
                const r = new FileReader(); r.onload = e => res(e.target.result);
                r.readAsArrayBuffer(file);
            });

            if (!window.XLSX) {
                await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
            }

            const wb = window.XLSX.read(new Uint8Array(buf), { type:"array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const raw = window.XLSX.utils.sheet_to_json(ws, { header:1, defval:"" });

            // Parser les 3 sections
            excelMeta = {}; excelRows = [];
            let inBarcode = false;
            let barcodeHeaders = null;

            for (let i = 0; i < raw.length; i++) {
                const row = raw[i];
                const r0  = String(row[0] || "").trim();
                const r1  = String(row[1] || "").trim();

                // Header info
                if (r0.startsWith("CLIENT"))      excelMeta.client      = r1;
                if (r0.startsWith("Saison"))       excelMeta.saison      = r1;
                if (r0.startsWith("C/o"))          excelMeta.country     = r1;
                if (r0.startsWith("Theme"))        excelMeta.theme       = r1;
                if (r0.startsWith("DATE"))         excelMeta.date        = r1;

                // Wash Care
                if (r0 === "Composition") {
                    const nextRow = raw[i+1] || [];
                    excelMeta.composition = String(raw[i+1]?.[0] || "").trim();
                    // Récupérer les remarks (jusqu'à ligne vide ou section suivante)
                    const remarks = [];
                    for (let j = i+1; j < Math.min(i+8, raw.length); j++) {
                        const rem = String(raw[j]?.[2] || "").trim();
                        if (rem) remarks.push(rem);
                    }
                    excelMeta.care_remarks = remarks.join(" / ");
                }

                // Barcode table
                if (r0 === "PRODUCT NAME") {
                    barcodeHeaders = row.map(v => String(v).trim());
                    inBarcode = true;
                    continue;
                }
                if (inBarcode && r0) {
                    const rowObj = {};
                    barcodeHeaders.forEach((h, idx) => { rowObj[h] = String(row[idx] || "").trim(); });
                    if (rowObj["SKU BARCODE"]) excelRows.push(rowObj);
                }
            }

            zone.classList.add("done");
            zone.innerHTML = `<i class="ti ti-circle-check" style="font-size:26px;color:#16a34a;"
                aria-hidden="true"></i>
                <p style="margin:6px 0 0;font-size:13px;font-weight:500;color:#166534;">
                ${file.name}</p>`;
            msg.innerHTML = `<span style="font-size:11px;color:#16a34a;">
                ✓ ${excelRows.length} barcode${excelRows.length>1?"s":""} · 
                Compo : ${excelMeta.composition || "—"} · 
                Pays : ${excelMeta.country || "—"}</span>`;

        } catch(e) {
            msg.innerHTML = `<span style="font-size:12px;color:#dc2626;">
                Erreur : ${e.message}</span>`;
        }

        checkRunable();
    };

    function checkRunable() {
        const btn = document.getElementById("aw-run-btn");
        if (btn) btn.disabled = !(pdfBase64 && (excelRows.length || excelMeta.composition));
    }

    // ── Lancer le contrôle ────────────────────────────────────
    window._awRunCheck = async function() {
        const btn = document.getElementById("aw-run-btn");
        btn.disabled = true;
        btn.innerHTML = `<span class="aw-spin"></span> Analyse IA en cours…`;

        const view = document.getElementById("aw-view");

        // Prompt Claude pour extraire les données du PDF
        const typesDesc = selectedTypes.map(k => {
            const t = TYPES[k];
            if (k === "wash_care") return `Page 1 (Wash Care) : extraire la COMPOSITION textile et le PAYS D'ORIGINE (C/o / Country of origin / Made in ...)`;
            if (k === "warning")   return `Page 2 (Warning) : extraire le TEXTE D'AVERTISSEMENT exact (chercher "ATTENTION", "WARNING", "AVERTISSEMENT" ou phrase de sécurité)`;
            if (k === "barcode")   return `Page 3 (Barcode) : extraire TOUS les EAN/codes-barres (format 13 chiffres, supprimer les espaces) et les TAILLES associées (ex: 3 ANS, 4 ANS, S, M...)`;
        }).filter(Boolean).join(String.fromCharCode(10));

        // ── Extraire texte PDF page par page via PDF.js ──────────
        let pageTexts = {};
        try {
            if (!window.pdfjsLib) {
                await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
                window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
            }
            const pdf = await window.pdfjsLib.getDocument({data: atob(pdfBase64)}).promise;
            for (let p = 1; p <= pdf.numPages; p++) {
                const page    = await pdf.getPage(p);
                const content = await page.getTextContent();
                pageTexts[p]  = content.items.map(i => i.str).join(" ").trim();
            }
        } catch(e) {
            console.warn("[Artwork] PDF.js erreur:", e.message);
        }

        const pageInfo = Object.entries(pageTexts)
            .map(([p, t]) => "=== PAGE " + p + " ===" + String.fromCharCode(10) + (t || "(vide / image)"))
            .join(String.fromCharCode(10) + String.fromCharCode(10));

        const prompt = [
            "Tu es un expert en controle qualite textile/garment.",
            "Voici le texte extrait d un artwork PDF multi-pages :",
            "",
            pageInfo,
            "",
            typesDesc,
            "",
            "Reponds UNIQUEMENT en JSON valide (sans markdown) :",
            "{",
            '  "wash_care": {"composition": null, "country": null},',
            '  "warning": {"warning_text": null},',
            '  "barcode": {"items": [{"ean": "...", "size": "..."}]}',
            "}",
            "Ne jamais inventer. JSON uniquement."
        ].join(String.fromCharCode(10));

        // ── Envoyer à Gemini via GAS chatbot ─────────────────
        const GEMINI_URL = "https://script.google.com/macros/s/AKfycbytsLltnTWWiXyK3KSrwJPEkffuzShjLEpIO8G2s19gktDuEzqkJCR3Xjhkfxouxvg/exec";
        try {
            const res   = await fetch(GEMINI_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: prompt })
            });
            const data  = await res.json();
            const raw   = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
            const clean = raw.replace(/```json|```/g, "").trim();
            extractedData = JSON.parse(clean);
        } catch(e) {
            console.error("[Artwork] Gemini erreur:", e);
            extractedData = {};
        }

        // Afficher le rapport
        renderReport(view);
    };

    // ── Rapport de comparaison ────────────────────────────────
    function renderReport(view) {
        const results = [];

        // ── Wash Care ──
        if (selectedTypes.includes("wash_care")) {
            const pdf = extractedData.wash_care || {};

            // Composition
            const pdfComp   = (pdf.composition || "").trim();
            const excelComp = (excelMeta.composition || "").trim();
            results.push({
                section: "Wash Care",
                field:   "Composition",
                pdf:     pdfComp   || null,
                excel:   excelComp || null,
                status:  compare(pdfComp, excelComp)
            });

            // Pays d'origine
            const pdfPays   = (pdf.country || "").trim();
            const excelPays = (excelMeta.country || "").trim();
            results.push({
                section: "Wash Care",
                field:   "Pays d'origine",
                pdf:     pdfPays   || null,
                excel:   excelPays || null,
                status:  compare(pdfPays, excelPays)
            });
        }

        // ── Warning ──
        if (selectedTypes.includes("warning")) {
            const pdfWarn = (extractedData.warning?.warning_text || "").trim();
            results.push({
                section: "Warning",
                field:   "Texte d'avertissement",
                pdf:     pdfWarn || null,
                excel:   "(phrase fixe — vérification manuelle recommandée)",
                status:  pdfWarn ? "info" : "warn"
            });
        }

        // ── Barcode ──
        if (selectedTypes.includes("barcode")) {
            const pdfItems   = extractedData.barcode?.items || [];
            const pdfEANs    = pdfItems.map(i => norm(i.ean));

            if (!excelRows.length) {
                results.push({ section:"Barcode", field:"Table barcodes",
                    pdf: null, excel: null, status:"warn" });
            } else {
                excelRows.forEach(row => {
                    const exEAN  = norm(row["SKU BARCODE"]);
                    const exSize = row["SIZE LABEL"];
                    const found  = pdfEANs.find(e => e === exEAN || e.includes(exEAN) || exEAN.includes(e));
                    results.push({
                        section: "Barcode",
                        field:   `Taille ${exSize}`,
                        pdf:     found ? found : null,
                        excel:   exEAN,
                        status:  found ? "ok" : "err"
                    });
                });

                // EAN dans le PDF mais pas dans l'Excel
                pdfItems.forEach(item => {
                    const pEAN = norm(item.ean);
                    const inExcel = excelRows.some(r => {
                        const e = norm(r["SKU BARCODE"]);
                        return e === pEAN || e.includes(pEAN) || pEAN.includes(e);
                    });
                    if (!inExcel) {
                        results.push({
                            section: "Barcode",
                            field:   `EAN ${item.ean}`,
                            pdf:     pEAN,
                            excel:   null,
                            status:  "warn"
                        });
                    }
                });
            }
        }

        // Stats
        const ok   = results.filter(r => r.status === "ok").length;
        const err  = results.filter(r => r.status === "err").length;
        const warn = results.filter(r => r.status === "warn" || r.status === "info").length;

        // Grouper par section
        const sections = {};
        results.forEach(r => {
            if (!sections[r.section]) sections[r.section] = [];
            sections[r.section].push(r);
        });

        const sectHTML = Object.entries(sections).map(([sec, rows]) => {
            const icon = { "Wash Care":"ti-shirt", "Warning":"ti-alert-triangle", "Barcode":"ti-barcode" };
            const col  = { "Wash Care":"#0369a1", "Warning":"#b45309", "Barcode":"#166534" };
            return `
            <div style="margin-bottom:16px;">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                    <i class="ti ${icon[sec]||'ti-file'}" style="font-size:14px;
                        color:${col[sec]||'#475569'};" aria-hidden="true"></i>
                    <span style="font-size:12px;font-weight:600;color:#0f172a;">${sec}</span>
                </div>
                ${rows.map(r => {
                    const cls = r.status === "ok" ? "aw-row-ok"
                              : r.status === "err" ? "aw-row-err" : "aw-row-warn";
                    const ico = r.status === "ok" ? "✅" : r.status === "err" ? "❌" : "⚠️";
                    return `<div class="${cls}">
                        <div style="flex-shrink:0;">${ico}</div>
                        <div style="flex:1;">
                            <div style="font-size:11px;font-weight:600;color:#475569;
                                margin-bottom:2px;">${r.field}</div>
                            <div style="font-size:12px;">
                                ${r.status === "ok" ? `
                                <span style="color:#166534;">${r.pdf}</span>` : ""}
                                ${r.status === "err" ? `
                                <span style="color:#94a3b8;font-size:10px;">PDF : </span>
                                <strong style="color:#dc2626;">${r.pdf || "introuvable"}</strong>
                                &nbsp;&nbsp;
                                <span style="color:#94a3b8;font-size:10px;">Excel : </span>
                                <strong style="color:#16a34a;">${r.excel}</strong>` : ""}
                                ${r.status === "warn" ? `
                                <span style="color:#92400e;">
                                    ${!r.pdf ? "Introuvable dans le PDF" 
                                    : !r.excel ? `Absent de l'Excel — PDF: ${r.pdf}` 
                                    : r.pdf}</span>` : ""}
                                ${r.status === "info" ? `
                                <span style="color:#475569;">${r.pdf}</span>` : ""}
                            </div>
                        </div>
                    </div>`;
                }).join("")}
            </div>`;
        }).join("");

        const verdict = err === 0 && warn === 0
            ? `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;
                padding:12px 16px;margin-bottom:14px;display:flex;gap:10px;align-items:center;">
                <span style="font-size:20px;">✅</span>
                <div><div style="font-size:13px;font-weight:700;color:#166534;">Artwork conforme</div>
                <div style="font-size:11px;color:#16a34a;">Tous les champs vérifiés sont conformes.</div>
                </div></div>`
            : err > 0
            ? `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;
                padding:12px 16px;margin-bottom:14px;display:flex;gap:10px;align-items:center;">
                <span style="font-size:20px;">❌</span>
                <div><div style="font-size:13px;font-weight:700;color:#dc2626;">
                Artwork non conforme — ${err} divergence${err>1?"s":""}</div>
                <div style="font-size:11px;color:#dc2626;">
                Corriger avant validation finale.</div></div></div>`
            : `<div style="background:#fefce8;border:1px solid #fde047;border-radius:10px;
                padding:12px 16px;margin-bottom:14px;display:flex;gap:10px;align-items:center;">
                <span style="font-size:20px;">⚠️</span>
                <div><div style="font-size:13px;font-weight:700;color:#a16207;">
                Vérification partielle</div>
                <div style="font-size:11px;color:#92400e;">
                Certains champs sont à vérifier manuellement.</div></div></div>`;

        view.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;
            margin-bottom:16px;">
            <div style="font-size:14px;font-weight:700;color:#0f172a;">
                Rapport de contrôle</div>
            <button class="aw-btn aw-btn-grey" onclick="window._awOpen()">
                <i class="ti ti-refresh" aria-hidden="true"></i> Nouveau contrôle
            </button>
        </div>

        <!-- Résumé -->
        <div style="display:flex;gap:12px;margin-bottom:16px;">
            <div style="text-align:center;padding:10px 16px;background:#f0fdf4;
                border-radius:8px;min-width:60px;">
                <div style="font-size:22px;font-weight:700;color:#166534;">${ok}</div>
                <div style="font-size:10.5px;color:#64748b;">OK</div>
            </div>
            <div style="text-align:center;padding:10px 16px;background:#fef2f2;
                border-radius:8px;min-width:60px;">
                <div style="font-size:22px;font-weight:700;color:#dc2626;">${err}</div>
                <div style="font-size:10.5px;color:#64748b;">Erreur${err>1?"s":""}</div>
            </div>
            <div style="text-align:center;padding:10px 16px;background:#fefce8;
                border-radius:8px;min-width:60px;">
                <div style="font-size:22px;font-weight:700;color:#a16207;">${warn}</div>
                <div style="font-size:10.5px;color:#64748b;">Attention${warn>1?"s":""}</div>
            </div>
            <div style="text-align:center;padding:10px 16px;background:#f8fafc;
                border-radius:8px;min-width:60px;margin-left:auto;">
                <div style="font-size:22px;font-weight:700;color:#0f172a;">
                    ${Math.round(ok/(ok+err||1)*100)}%</div>
                <div style="font-size:10.5px;color:#64748b;">Conformité</div>
            </div>
        </div>

        ${verdict}
        ${sectHTML}`;
    }

    // ── Helpers ───────────────────────────────────────────────
    function norm(s) {
        return String(s || "").replace(/\s/g, "").toLowerCase();
    }

    function compare(pdf, excel) {
        if (!pdf && !excel) return "warn";
        if (!pdf || !excel) return "warn";
        return norm(pdf) === norm(excel) ? "ok" : "err";
    }

    function loadScript(url) {
        return new Promise((res, rej) => {
            const s = document.createElement("script");
            s.src = url; s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
        });
    }

    console.log("[AW27] Artwork Checker v3 ✓");
})();
