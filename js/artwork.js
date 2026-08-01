// ================================================================
//  AW27 — Artwork Checker
//  Workflow : choisir type → uploader PDF → IA extrait → upload
//  Excel → comparer → rapport ✅ ❌ ⚠️
// ================================================================

(function() {
    const SHEET_KEY  = "artwork";
    const SHEET_NAME = "Artwork";

    // ── Définition des types d'artwork ────────────────────────
    const TYPES = {
        size_care: {
            label: "Size & Care",
            icon:  "ti-shirt",
            color: "#0369a1",
            bg:    "#eff6ff",
            fields: [
                { key:"composition",       label:"Composition",             hint:"ex: 100% Cotton" },
                { key:"care_instructions", label:"Instructions de lavage",  hint:"ex: Machine wash 30°" },
                { key:"size",              label:"Taille",                   hint:"ex: S / M / L" },
                { key:"country",           label:"Pays d'origine",           hint:"ex: Made in Madagascar" }
            ],
            excelCols: ["Style","Color","Size","Composition","Care_Instructions","Country"]
        },
        warning: {
            label: "Warning",
            icon:  "ti-alert-triangle",
            color: "#b45309",
            bg:    "#fef9c3",
            fields: [
                { key:"warning_text", label:"Texte d'avertissement", hint:"Phrase fixe de warning" }
            ],
            excelCols: ["Style","Warning_Text"]
        },
        barcode: {
            label: "Barcode",
            icon:  "ti-barcode",
            color: "#166534",
            bg:    "#f0fdf4",
            fields: [
                { key:"ean",       label:"EAN / Code-barres", hint:"ex: 3610400123456" },
                { key:"style_ref", label:"Style Ref",          hint:"ex: ORB14173" },
                { key:"color",     label:"Coloris",            hint:"ex: NAVY" },
                { key:"size",      label:"Taille",             hint:"ex: 2 ANS" }
            ],
            excelCols: ["Style","Color","Size","EAN"]
        },
        hangtag: {
            label: "Hangtag",
            icon:  "ti-tag",
            color: "#7c3aed",
            bg:    "#f5f3ff",
            fields: [
                { key:"price",    label:"Prix",            hint:"ex: 19.99 EUR" },
                { key:"ean",      label:"Code-barres",     hint:"ex: 3610400123456" },
                { key:"size_cm",  label:"Dimensions (cm)", hint:"ex: 7 x 12 cm" }
            ],
            excelCols: ["Style","Color","Size","Price","EAN","Width_cm","Length_cm"]
        }
    };

    // ── Gemini Chatbot URL (même que TP Analyzer) ─────────────
    const GEMINI_URL = "https://script.google.com/macros/s/AKfycbytsLltnTWWiXyK3KSrwJPEkffuzShjLEpIO8G2s19gktDuEzqkJCR3Xjhkfxouxvg/exec";

    let currentType   = null;
    let selectedFields = [];
    let pdfText       = "";
    let excelData     = [];
    let extractedData = {};

    // ── CSS ───────────────────────────────────────────────────
    function injectCSS() {
        if (document.getElementById("aw27-artwork-css")) return;
        const st = document.createElement("style");
        st.id = "aw27-artwork-css";
        st.textContent = `
        #artwork-view { padding:24px; max-width:860px; margin:0 auto; }
        .aw-step-header {
            display:flex; align-items:center; gap:10px;
            margin-bottom:20px;
        }
        .aw-step-num {
            width:28px; height:28px; border-radius:50%;
            background:#1565c0; color:#fff;
            display:flex; align-items:center; justify-content:center;
            font-size:12px; font-weight:700; flex-shrink:0;
        }
        .aw-step-num.done { background:#16a34a; }
        .aw-step-num.active { background:#1565c0; }
        .aw-step-num.pending { background:#e5e7eb; color:#9ca3af; }
        .aw-card {
            background:#fff; border:1px solid #e2e8f0;
            border-radius:12px; padding:20px; margin-bottom:16px;
        }
        .aw-type-grid {
            display:grid; grid-template-columns:repeat(4,1fr); gap:10px;
        }
        .aw-type-btn {
            display:flex; flex-direction:column; align-items:center;
            gap:8px; padding:14px 10px; border-radius:10px;
            border:1.5px solid #e2e8f0; background:#fff;
            cursor:pointer; transition:all .15s; font-family:inherit;
        }
        .aw-type-btn:hover { border-color:#1565c0; background:#f8faff; }
        .aw-type-btn.selected { border-color:#1565c0; background:#eff6ff; }
        .aw-type-btn .aw-type-lbl { font-size:12px; font-weight:600; color:#0f172a; }
        .aw-field-check {
            display:flex; align-items:center; gap:10px;
            padding:8px 12px; border-radius:8px;
            border:1px solid #e2e8f0; margin-bottom:6px;
            cursor:pointer; user-select:none;
        }
        .aw-field-check:hover { background:#f8faff; }
        .aw-field-check input { width:15px; height:15px; cursor:pointer; accent-color:#1565c0; }
        .aw-upload-zone {
            border:2px dashed #cbd5e1; border-radius:10px;
            padding:32px; text-align:center; cursor:pointer;
            transition:all .15s;
        }
        .aw-upload-zone:hover { border-color:#1565c0; background:#f8faff; }
        .aw-upload-zone.loaded { border-color:#16a34a; background:#f0fdf4; border-style:solid; }
        .aw-report-row {
            display:flex; align-items:flex-start; gap:12px;
            padding:10px 14px; border-radius:8px; margin-bottom:6px;
        }
        .aw-report-row.ok     { background:#f0fdf4; border:0.5px solid #86efac; }
        .aw-report-row.err    { background:#fef2f2; border:0.5px solid #fca5a5; }
        .aw-report-row.warn   { background:#fefce8; border:0.5px solid #fde047; }
        .aw-report-icon { font-size:16px; flex-shrink:0; margin-top:1px; }
        .aw-report-field { font-size:11px; font-weight:600; color:#475569; margin-bottom:2px; }
        .aw-report-vals { font-size:12px; }
        .aw-btn-primary {
            padding:9px 20px; border-radius:8px; font-size:13px;
            font-weight:600; font-family:inherit; cursor:pointer;
            background:#1565c0; color:#fff; border:none;
            transition:background .15s;
        }
        .aw-btn-primary:hover { background:#1251a3; }
        .aw-btn-primary:disabled { opacity:.5; cursor:not-allowed; }
        .aw-btn-secondary {
            padding:9px 16px; border-radius:8px; font-size:13px;
            font-weight:500; font-family:inherit; cursor:pointer;
            background:#f1f5f9; color:#475569;
            border:1px solid #e2e8f0;
        }
        .aw-loader {
            display:inline-block; width:16px; height:16px;
            border:2px solid rgba(255,255,255,.3);
            border-top-color:#fff; border-radius:50%;
            animation:aw-spin .6s linear infinite; vertical-align:middle;
        }
        @keyframes aw-spin { to { transform:rotate(360deg); } }
        `;
        document.head.appendChild(st);
    }

    // ── Vue dans le container de la modale ────────────────────
    function renderViewInto(container) {
        container.innerHTML = `
        <div id="artwork-view">
            <div style="margin-bottom:24px;">
                <h2 style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 4px;">
                    Artwork Checker
                </h2>
                <p style="font-size:12.5px;color:#64748b;margin:0;">
                    Comparer un artwork PDF avec les données de référence Excel.
                </p>
            </div>

            <!-- ÉTAPE 1 : Type d'artwork -->
            <div class="aw-card" id="aw-step1">
                <div class="aw-step-header">
                    <div class="aw-step-num active" id="num1">1</div>
                    <div>
                        <div style="font-size:13px;font-weight:600;color:#0f172a;">
                            Type d'artwork</div>
                        <div style="font-size:11px;color:#64748b;">
                            Sélectionnez le type à analyser</div>
                    </div>
                </div>
                <div class="aw-type-grid">
                    ${Object.entries(TYPES).map(([k,t]) => `
                    <button class="aw-type-btn" data-type="${k}" onclick="window._awSelectType('${k}')">
                        <div style="width:36px;height:36px;border-radius:8px;
                            background:${t.bg};display:flex;align-items:center;
                            justify-content:center;">
                            <i class="ti ${t.icon}" style="font-size:18px;color:${t.color};"
                                aria-hidden="true"></i>
                        </div>
                        <span class="aw-type-lbl">${t.label}</span>
                    </button>`).join("")}
                </div>
            </div>

            <!-- ÉTAPE 2 : Champs à analyser -->
            <div class="aw-card" id="aw-step2" style="opacity:.4;pointer-events:none;">
                <div class="aw-step-header">
                    <div class="aw-step-num pending" id="num2">2</div>
                    <div>
                        <div style="font-size:13px;font-weight:600;color:#0f172a;">
                            Champs à analyser</div>
                        <div style="font-size:11px;color:#64748b;">
                            Cochez les données que l'IA doit extraire</div>
                    </div>
                </div>
                <div id="aw-fields-list"></div>
                <div style="margin-top:12px;display:flex;gap:8px;">
                    <button class="aw-btn-secondary"
                        onclick="window._awSelectAllFields(true)">Tout sélectionner</button>
                    <button class="aw-btn-secondary"
                        onclick="window._awSelectAllFields(false)">Aucun</button>
                </div>
            </div>

            <!-- ÉTAPE 3 : Upload PDF -->
            <div class="aw-card" id="aw-step3" style="opacity:.4;pointer-events:none;">
                <div class="aw-step-header">
                    <div class="aw-step-num pending" id="num3">3</div>
                    <div>
                        <div style="font-size:13px;font-weight:600;color:#0f172a;">
                            Artwork PDF</div>
                        <div style="font-size:11px;color:#64748b;">
                            Uploadez le fichier PDF de l'artwork à analyser</div>
                    </div>
                </div>
                <div class="aw-upload-zone" id="aw-pdf-zone"
                    onclick="document.getElementById('aw-pdf-input').click()">
                    <i class="ti ti-file-type-pdf" style="font-size:32px;color:#94a3b8;"
                        aria-hidden="true"></i>
                    <p style="margin:8px 0 4px;font-size:13px;font-weight:500;
                        color:#475569;">Cliquer pour sélectionner le PDF</p>
                    <p style="margin:0;font-size:11px;color:#94a3b8;">
                        Format PDF uniquement</p>
                </div>
                <input type="file" id="aw-pdf-input" accept=".pdf"
                    style="display:none" onchange="window._awHandlePDF(this)"/>
                <div id="aw-pdf-status" style="margin-top:8px;"></div>

                <div style="margin-top:16px;text-align:right;">
                    <button class="aw-btn-primary" id="aw-extract-btn"
                        disabled onclick="window._awExtract()">
                        <i class="ti ti-sparkles" aria-hidden="true"></i>
                        Extraire avec l'IA
                    </button>
                </div>
            </div>

            <!-- ÉTAPE 4 : Upload Excel -->
            <div class="aw-card" id="aw-step4" style="opacity:.4;pointer-events:none;">
                <div class="aw-step-header">
                    <div class="aw-step-num pending" id="num4">4</div>
                    <div>
                        <div style="font-size:13px;font-weight:600;color:#0f172a;">
                            Fichier Excel de référence</div>
                        <div style="font-size:11px;color:#64748b;" id="aw-excel-hint">
                            Uploadez l'Excel avec les données de référence</div>
                    </div>
                </div>
                <div id="aw-extract-preview" style="margin-bottom:12px;"></div>
                <div class="aw-upload-zone" id="aw-excel-zone"
                    onclick="document.getElementById('aw-excel-input').click()">
                    <i class="ti ti-file-spreadsheet" style="font-size:32px;color:#94a3b8;"
                        aria-hidden="true"></i>
                    <p style="margin:8px 0 4px;font-size:13px;font-weight:500;color:#475569;">
                        Cliquer pour sélectionner l'Excel</p>
                    <p style="margin:0;font-size:11px;color:#94a3b8;" id="aw-excel-cols">
                        Colonnes attendues : —</p>
                </div>
                <input type="file" id="aw-excel-input"
                    accept=".xlsx,.xls,.csv" style="display:none"
                    onchange="window._awHandleExcel(this)"/>
                <div id="aw-excel-status" style="margin-top:8px;"></div>

                <div style="margin-top:16px;text-align:right;">
                    <button class="aw-btn-primary" id="aw-compare-btn"
                        disabled onclick="window._awCompare()">
                        <i class="ti ti-git-compare" aria-hidden="true"></i>
                        Comparer
                    </button>
                </div>
            </div>

            <!-- RAPPORT -->
            <div class="aw-card" id="aw-report" style="display:none;">
                <div class="aw-step-header">
                    <div class="aw-step-num done">✓</div>
                    <div>
                        <div style="font-size:13px;font-weight:600;color:#0f172a;">
                            Rapport de validation</div>
                    </div>
                    <button class="aw-btn-secondary" style="margin-left:auto;"
                        onclick="window._awReset()">
                        <i class="ti ti-refresh" aria-hidden="true"></i>
                        Nouveau contrôle
                    </button>
                </div>
                <div id="aw-report-content"></div>
            </div>
        </div>`;
    }

    // ── Étape 1 : Sélection du type ───────────────────────────
    window._awSelectType = function(typeKey) {
        currentType    = typeKey;
        selectedFields = TYPES[typeKey].fields.map(f => f.key); // tout coché par défaut

        // UI : marquer le bouton sélectionné
        document.querySelectorAll(".aw-type-btn").forEach(b => {
            b.classList.toggle("selected", b.dataset.type === typeKey);
        });

        // Afficher les champs
        const fieldsList = document.getElementById("aw-fields-list");
        fieldsList.innerHTML = TYPES[typeKey].fields.map(f => `
        <label class="aw-field-check">
            <input type="checkbox" data-field="${f.key}" checked
                onchange="window._awToggleField('${f.key}', this.checked)"/>
            <div>
                <div style="font-size:12.5px;font-weight:500;color:#0f172a;">${f.label}</div>
                <div style="font-size:11px;color:#94a3b8;">${f.hint}</div>
            </div>
        </label>`).join("");

        // Mettre à jour le hint Excel
        const hint = document.getElementById("aw-excel-hint");
        if (hint) hint.textContent = `Colonnes attendues pour ${TYPES[typeKey].label}`;
        const colsEl = document.getElementById("aw-excel-cols");
        if (colsEl) colsEl.textContent =
            "Colonnes : " + TYPES[typeKey].excelCols.join(" · ");

        // Activer étape 2
        activateStep(2);
        document.getElementById("num1").classList.add("done");
        document.getElementById("num1").textContent = "✓";
    };

    window._awToggleField = function(key, checked) {
        if (checked) {
            if (!selectedFields.includes(key)) selectedFields.push(key);
        } else {
            selectedFields = selectedFields.filter(k => k !== key);
        }
        // Activer étape 3 si au moins 1 champ
        if (selectedFields.length > 0) {
            activateStep(3);
            document.getElementById("num2").classList.add("done");
            document.getElementById("num2").textContent = "✓";
        }
    };

    window._awSelectAllFields = function(all) {
        selectedFields = all ? TYPES[currentType].fields.map(f => f.key) : [];
        document.querySelectorAll(".aw-field-check input").forEach(cb => {
            cb.checked = all;
        });
    };

    // ── Étape 3 : Upload PDF ──────────────────────────────────
    window._awHandlePDF = async function(input) {
        const file = input.files[0];
        if (!file) return;

        const zone   = document.getElementById("aw-pdf-zone");
        const status = document.getElementById("aw-pdf-status");
        const btn    = document.getElementById("aw-extract-btn");

        status.innerHTML = `<span style="font-size:12px;color:#64748b;">
            Lecture de ${file.name}…</span>`;

        // Lire en base64 pour l'IA
        const b64 = await new Promise(res => {
            const reader = new FileReader();
            reader.onload = e => res(e.target.result.split(",")[1]);
            reader.readAsDataURL(file);
        });
        window._awPDFBase64 = b64;

        // Essayer d'extraire le texte avec PDF.js
        pdfText = "";
        try {
            if (!window.pdfjsLib) {
                await new Promise((res, rej) => {
                    const s = document.createElement("script");
                    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
                    s.onload = res; s.onerror = rej;
                    document.head.appendChild(s);
                });
                window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
            }
            const pdf = await window.pdfjsLib.getDocument({ data: atob(b64) }).promise;
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                pdfText += content.items.map(item => item.str).join(" ") + "\n";
            }
        } catch(e) {
            console.warn("[Artwork] PDF.js extraction échouée, l'IA utilisera le base64:", e.message);
        }

        zone.classList.add("loaded");
        zone.innerHTML = `<i class="ti ti-circle-check" style="font-size:28px;color:#16a34a;"
            aria-hidden="true"></i>
            <p style="margin:6px 0 0;font-size:12.5px;font-weight:500;color:#166534;">
                ${file.name}</p>`;
        status.innerHTML = `<span style="font-size:11.5px;color:#16a34a;">
            ✓ PDF chargé · ${pdf ? pdf.numPages+" page(s)" : "prêt pour l'IA"}</span>`;
        btn.disabled = false;
    };

    // ── Étape 3 : Extraction IA ───────────────────────────────
    window._awExtract = async function() {
        const btn = document.getElementById("aw-extract-btn");
        btn.disabled = true;
        btn.innerHTML = `<span class="aw-loader"></span> Extraction en cours…`;

        const type   = TYPES[currentType];
        const fields = type.fields.filter(f => selectedFields.includes(f.key));

        // Prompt spécifique selon les champs sélectionnés
        const fieldsList = fields.map(f =>
            `- "${f.label}" (clé JSON: "${f.key}") : ${f.hint}`
        ).join("\n");

        const prompt = `Tu es un expert en contrôle qualité textile/garment.
Analyse ce texte extrait d'un artwork "${type.label}" et extrais UNIQUEMENT les données demandées.

TEXTE ARTWORK :
${pdfText || "[PDF fourni en base64 — analyser visuellement]"}

DONNÉES À EXTRAIRE (répondre en JSON uniquement, sans markdown) :
${fieldsList}

Réponds avec un JSON de cette forme exacte :
{
${fields.map(f => `  "${f.key}": "valeur extraite ou null si introuvable"`).join(",\n")}
}

Si une valeur n'est pas trouvée dans l'artwork, mettre null.
Ne pas inventer de valeur. JSON uniquement, aucun texte autour.`;

        try {
            const res = await fetch(GEMINI_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: prompt })
            });
            const data = await res.json();
            const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
            const clean = raw.replace(/```json|```/g, "").trim();
            extractedData = JSON.parse(clean);
        } catch(e) {
            console.error("[Artwork] Gemini erreur:", e);
            extractedData = {};
        }

        btn.innerHTML = `<i class="ti ti-sparkles" aria-hidden="true"></i> Extraire avec l'IA`;
        btn.disabled  = false;

        // Afficher l'aperçu
        showExtractPreview();
        activateStep(4);
        document.getElementById("num3").classList.add("done");
        document.getElementById("num3").textContent = "✓";
    };

    function showExtractPreview() {
        const preview = document.getElementById("aw-extract-preview");
        const type    = TYPES[currentType];
        const rows    = type.fields
            .filter(f => selectedFields.includes(f.key))
            .map(f => {
                const val = extractedData[f.key];
                return `<div style="display:flex;gap:8px;padding:6px 10px;
                    border-radius:6px;background:#f8fafc;margin-bottom:4px;">
                    <span style="min-width:140px;font-size:11.5px;font-weight:500;
                        color:#475569;">${f.label}</span>
                    <span style="font-size:12px;color:${val ? "#0f172a" : "#94a3b8"};">
                        ${val || "Non trouvé"}
                    </span>
                </div>`;
            }).join("");

        preview.innerHTML = `
        <div style="background:#f1f5f9;border-radius:8px;padding:12px;margin-bottom:12px;">
            <div style="font-size:11px;font-weight:600;color:#64748b;
                text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">
                Données extraites par l'IA
            </div>
            ${rows}
        </div>`;
    }

    // ── Étape 4 : Upload Excel ────────────────────────────────
    window._awHandleExcel = async function(input) {
        const file = input.files[0];
        if (!file) return;

        const zone   = document.getElementById("aw-excel-zone");
        const status = document.getElementById("aw-excel-status");
        const btn    = document.getElementById("aw-compare-btn");

        status.innerHTML = `<span style="font-size:12px;color:#64748b;">
            Lecture de ${file.name}…</span>`;

        try {
            const b64 = await new Promise(res => {
                const reader = new FileReader();
                reader.onload = e => res(e.target.result);
                reader.readAsArrayBuffer(file);
            });

            // Charger SheetJS
            if (!window.XLSX) {
                await new Promise((res, rej) => {
                    const s = document.createElement("script");
                    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
                    s.onload = res; s.onerror = rej;
                    document.head.appendChild(s);
                });
            }

            const wb = window.XLSX.read(new Uint8Array(b64), { type:"array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            excelData = window.XLSX.utils.sheet_to_json(ws, { defval:"" });

            zone.classList.add("loaded");
            zone.innerHTML = `<i class="ti ti-circle-check"
                style="font-size:28px;color:#16a34a;" aria-hidden="true"></i>
                <p style="margin:6px 0 0;font-size:12.5px;font-weight:500;color:#166534;">
                    ${file.name} · ${excelData.length} ligne(s)</p>`;
            status.innerHTML = `<span style="font-size:11.5px;color:#16a34a;">
                ✓ Colonnes : ${Object.keys(excelData[0] || {}).join(" · ")}</span>`;
            btn.disabled = false;

        } catch(e) {
            status.innerHTML = `<span style="font-size:12px;color:#dc2626;">
                Erreur lecture Excel : ${e.message}</span>`;
        }
    };

    // ── Étape 4 : Comparaison ─────────────────────────────────
    window._awCompare = function() {
        const type   = TYPES[currentType];
        const fields = type.fields.filter(f => selectedFields.includes(f.key));

        // Trouver la ligne Excel correspondante
        // Chercher par style ref ou EAN si disponible
        let excelRow = null;
        const exRef  = extractedData.style_ref || extractedData.ean || "";
        if (exRef && excelData.length) {
            excelRow = excelData.find(r => {
                const v = String(r.Style || r.EAN || r.style_ref || "").trim().toLowerCase();
                return v === exRef.toLowerCase();
            });
            if (!excelRow) excelRow = excelData[0]; // fallback 1ère ligne
        } else if (excelData.length) {
            excelRow = excelData[0];
        }

        const normalize = s => String(s || "").trim().toLowerCase()
            .replace(/\s+/g," ").replace(/[.,;]/g,"");

        const results = fields.map(f => {
            const pdfVal  = extractedData[f.key];
            const excelKey = Object.keys(excelRow || {}).find(k =>
                k.toLowerCase().replace(/_/g,"").replace(/\s/g,"") ===
                f.key.replace(/_/g,"").replace(/\s/g,"")
            );
            const excelVal = excelRow ? excelRow[excelKey] : undefined;

            if (!pdfVal && !excelVal) return { field:f, status:"warn",  pdf:null, excel:null };
            if (!pdfVal)              return { field:f, status:"warn",  pdf:null, excel:excelVal };
            if (!excelVal)            return { field:f, status:"warn",  pdf:pdfVal, excel:null };

            const match = normalize(pdfVal) === normalize(String(excelVal));
            return { field:f, status: match ? "ok" : "err", pdf:pdfVal, excel:excelVal };
        });

        showReport(results);
    };

    function showReport(results) {
        const ok    = results.filter(r => r.status === "ok").length;
        const err   = results.filter(r => r.status === "err").length;
        const warn  = results.filter(r => r.status === "warn").length;
        const total = results.length;
        const pct   = Math.round(ok / total * 100);

        const statusIcon = { ok:"✅", err:"❌", warn:"⚠️" };
        const statusTxt  = {
            ok:   "Conforme",
            err:  "Divergence",
            warn: "Manquant"
        };

        const rowsHTML = results.map(r => `
        <div class="aw-report-row ${r.status}">
            <div class="aw-report-icon">${statusIcon[r.status]}</div>
            <div style="flex:1;">
                <div class="aw-report-field">${r.field.label}</div>
                <div class="aw-report-vals">
                    ${r.status === "ok" ? `
                    <span style="color:#166534;">${r.pdf}</span>` : ""}
                    ${r.status === "err" ? `
                    <div><span style="font-size:10px;color:#64748b;">PDF :</span>
                        <strong style="color:#dc2626;">${r.pdf || "—"}</strong></div>
                    <div><span style="font-size:10px;color:#64748b;">Excel :</span>
                        <strong style="color:#166534;">${r.excel || "—"}</strong></div>` : ""}
                    ${r.status === "warn" ? `
                    <span style="color:#92400e;">
                        ${!r.pdf ? "Non trouvé dans l'artwork" : "Non trouvé dans l'Excel"}
                        ${r.pdf ? ` · Artwork : ${r.pdf}` : ""}
                        ${r.excel ? ` · Excel : ${r.excel}` : ""}
                    </span>` : ""}
                </div>
            </div>
            <div style="font-size:10.5px;font-weight:600;color:#64748b;">
                ${statusTxt[r.status]}</div>
        </div>`).join("");

        const verdict = err === 0 && warn === 0
            ? `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;
                padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:10px;">
                <span style="font-size:22px;">✅</span>
                <div>
                    <div style="font-size:14px;font-weight:700;color:#166534;">
                        Artwork conforme</div>
                    <div style="font-size:12px;color:#16a34a;">
                        Tous les champs sont validés.</div>
                </div></div>`
            : err > 0
            ? `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;
                padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:10px;">
                <span style="font-size:22px;">❌</span>
                <div>
                    <div style="font-size:14px;font-weight:700;color:#dc2626;">
                        Artwork non conforme</div>
                    <div style="font-size:12px;color:#dc2626;">
                        ${err} divergence${err>1?"s":""} détectée${err>1?"s":""}.</div>
                </div></div>`
            : `<div style="background:#fefce8;border:1px solid #fde047;border-radius:10px;
                padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:10px;">
                <span style="font-size:22px;">⚠️</span>
                <div>
                    <div style="font-size:14px;font-weight:700;color:#a16207;">
                        Données manquantes</div>
                    <div style="font-size:12px;color:#92400e;">
                        Certains champs sont introuvables.</div>
                </div></div>`;

        document.getElementById("aw-report-content").innerHTML = `
        ${verdict}
        <div style="display:flex;gap:16px;margin-bottom:16px;">
            <div style="text-align:center;">
                <div style="font-size:24px;font-weight:700;color:#166534;">${ok}</div>
                <div style="font-size:11px;color:#64748b;">Conforme${ok>1?"s":""}</div>
            </div>
            <div style="text-align:center;">
                <div style="font-size:24px;font-weight:700;color:#dc2626;">${err}</div>
                <div style="font-size:11px;color:#64748b;">Divergence${err>1?"s":""}</div>
            </div>
            <div style="text-align:center;">
                <div style="font-size:24px;font-weight:700;color:#a16207;">${warn}</div>
                <div style="font-size:11px;color:#64748b;">Manquant${warn>1?"s":""}</div>
            </div>
            <div style="text-align:center;margin-left:auto;">
                <div style="font-size:24px;font-weight:700;color:#0f172a;">${pct}%</div>
                <div style="font-size:11px;color:#64748b;">Conformité</div>
            </div>
        </div>
        ${rowsHTML}`;

        document.getElementById("aw-report").style.display = "block";
        document.getElementById("aw-report").scrollIntoView({ behavior:"smooth" });
    }

    // ── Reset ─────────────────────────────────────────────────
    window._awReset = function() {
        currentType    = null;
        selectedFields = [];
        pdfText        = "";
        excelData      = [];
        extractedData  = {};
        const container = document.getElementById("artwork-view");
        if (container) renderViewInto(container);
    };

    // ── Utilitaire : activer une étape ────────────────────────
    function activateStep(n) {
        const step = document.getElementById(`aw-step${n}`);
        if (!step) return;
        step.style.opacity = "1";
        step.style.pointerEvents = "auto";
        const num = document.getElementById(`num${n}`);
        if (num) {
            num.classList.remove("pending");
            num.classList.add("active");
        }
    }

    // ── Exposer l'ouverture via le menu Actions ───────────────
    window._awOpen = function() {
        injectCSS();
        openModal();
    };

    // ── Ouvrir la modale Artwork Checker ──────────────────────
    function openModal() {
        document.getElementById("aw-modal-overlay")?.remove();

        const overlay = document.createElement("div");
        overlay.id = "aw-modal-overlay";
        overlay.style.cssText = [
            "position:fixed","inset:0","z-index:99999",
            "background:rgba(15,23,42,.5)",
            "display:flex","align-items:center","justify-content:center",
            "padding:20px"
        ].join(";");

        const modal = document.createElement("div");
        modal.style.cssText = [
            "background:#fff","border-radius:14px",
            "width:100%","max-width:780px","max-height:90vh",
            "overflow-y:auto","position:relative",
            "box-shadow:0 20px 60px rgba(0,0,0,.25)"
        ].join(";");

        // Header de la modale
        const header = document.createElement("div");
        header.style.cssText = [
            "display:flex","align-items:center","justify-content:space-between",
            "padding:18px 22px","border-bottom:1px solid #e2e8f0",
            "position:sticky","top:0","background:#fff","z-index:1"
        ].join(";");
        header.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:36px;height:36px;border-radius:8px;background:#eff6ff;
                    display:flex;align-items:center;justify-content:center;">
                    <i class="ti ti-palette" style="font-size:18px;color:#1565c0;"
                        aria-hidden="true"></i>
                </div>
                <div>
                    <div style="font-size:14px;font-weight:700;color:#0f172a;">
                        Artwork Checker</div>
                    <div style="font-size:11px;color:#64748b;">
                        Comparer un artwork PDF avec les données de référence</div>
                </div>
            </div>
            <button onclick="document.getElementById('aw-modal-overlay').remove()"
                style="width:30px;height:30px;border-radius:50%;border:none;
                    background:#f1f5f9;cursor:pointer;font-size:16px;
                    display:flex;align-items:center;justify-content:center;
                    color:#64748b;font-family:inherit;">✕</button>`;

        // Contenu de la modale
        const content = document.createElement("div");
        content.id = "artwork-view";
        content.style.cssText = "padding:20px 22px;";

        // Reset état
        currentType    = null;
        selectedFields = [];
        pdfText        = "";
        excelData      = [];
        extractedData  = {};

        modal.appendChild(header);
        modal.appendChild(content);
        overlay.appendChild(modal);
        overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
        document.body.appendChild(overlay);

        // Rendre le contenu dans la modale
        renderViewInto(content);
    }

    // ── Init ──────────────────────────────────────────────────
    function init() {
        console.log("[AW27] Artwork Checker ✓ (via menu Actions)");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 500);
    }
})();
