// ================================================================
//  AW27 — TP Analyzer
//  Analyse le Tech Pack PDF d'un style via l'IA (GAS chatbot Gemini)
//  et crée les lignes dans Style Components après validation.
//  Charger après style-components.js dans index.html.
// ================================================================

(function initTPAnalyzer() {

    const SHEET_KEY      = "style_components";
    const CHATBOT_URL    = "https://script.google.com/macros/s/AKfycbytsLltnTWWiXyK3KSrwJPEkffuzShjLEpIO8G2s19gktDuEzqkJCR3Xjhkfxouxvg/exec";
    const DEFAULT_STATUS = "Pending";

    // ── Styles CSS ────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById("tpa-styles")) return;
        const s = document.createElement("style");
        s.id = "tpa-styles";
        s.textContent = `
        #btn-analyze-tp {
            display: inline-flex; align-items: center; gap: 5px;
            padding: 5px 12px; border-radius: 8px;
            background: linear-gradient(135deg, #7c3aed, #9333ea);
            border: none; color: #fff; cursor: pointer;
            font-size: 12px; font-weight: 500; font-family: inherit;
            transition: opacity .15s; white-space: nowrap;
        }
        #btn-analyze-tp:hover { opacity: .88; }
        #btn-analyze-tp:disabled { opacity: .45; cursor: not-allowed; }

        @keyframes tpa-spin { to { transform: rotate(360deg); } }
        .tpa-spin { display: inline-block; animation: tpa-spin .7s linear infinite; }

        /* Table de validation */
        .tpa-val-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .tpa-val-table th {
            padding: 7px 10px; text-align: left; font-size: 10px;
            color: var(--text-muted, #9ca3af); text-transform: uppercase;
            letter-spacing: .06em; font-weight: 600;
            border-bottom: 1.5px solid var(--border, #e5e7eb);
            background: var(--surface-2, #f9fafb);
        }
        .tpa-val-table td {
            padding: 5px 6px; border-bottom: 0.5px solid var(--border, #e5e7eb);
            vertical-align: middle;
        }
        .tpa-val-table tr:hover td { background: var(--surface-1, #f9fafb); }
        .tpa-val-input {
            width: 100%; border: none; background: transparent;
            font-size: 12px; font-family: inherit; padding: 2px 4px;
            color: var(--text-primary, #111827); outline: none;
            border-bottom: 1px solid transparent;
        }
        .tpa-val-input:focus { border-bottom-color: #7c3aed; }
        .tpa-status-select {
            border: 0.5px solid var(--border, #e5e7eb);
            border-radius: 6px; padding: 3px 6px;
            font-size: 11px; font-family: inherit;
            background: var(--surface-2, #f9fafb);
            color: var(--text-primary, #111827); cursor: pointer;
        }
        .tpa-del-btn {
            display: inline-flex; align-items: center; justify-content: center;
            width: 22px; height: 22px; border-radius: 50%;
            border: 0.5px solid var(--border, #e5e7eb);
            background: var(--surface-2, #f9fafb); color: var(--text-muted, #9ca3af);
            cursor: pointer; font-size: 12px; transition: all .15s;
        }
        .tpa-del-btn:hover { background: #fef2f2; color: #dc2626; border-color: #fca5a5; }
        .tpa-add-row {
            display: inline-flex; align-items: center; gap: 5px;
            padding: 5px 12px; border-radius: 7px; margin-top: 8px;
            border: 1px dashed var(--border-strong, #d1d5db);
            background: none; color: var(--text-secondary, #6b7280);
            font-size: 12px; font-family: inherit; cursor: pointer;
            transition: all .15s;
        }
        .tpa-add-row:hover { border-color: #7c3aed; color: #7c3aed; }
        `;
        document.head.appendChild(s);
    }

    // ── Extraire le fileId depuis une URL Drive ───────────────
    function extractFileId(url) {
        if (!url) return null;
        const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        const m3 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        return (m1 || m2 || m3)?.[1] || null;
    }

    // ── Récupérer le PDF depuis Drive via GAS ─────────────────
    async function fetchPDFBase64(fileId) {
        const gasUrl = window.GOOGLE_APPS_SCRIPT_URL;
        if (!gasUrl || gasUrl === "YOUR_WEB_APP_URL_HERE") {
            throw new Error("URL GAS non configurée.");
        }
        const res = await fetch(gasUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            redirect: "follow",
            body: JSON.stringify({ action: "FETCH_PDF_BASE64", fileId })
        });
        const json = await res.json();
        if (json.status !== "ok") throw new Error(json.message || "Erreur GAS");
        return json.base64;
    }

    // ── Extraire le texte d'un PDF base64 via PDF.js ─────────
    async function extractTextFromBase64PDF(base64) {
        if (!window.pdfjsLib) {
            await new Promise((resolve, reject) => {
                const s = document.createElement("script");
                s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
                s.onload = resolve; s.onerror = reject;
                document.head.appendChild(s);
            });
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }

        // Décoder base64 → ArrayBuffer
        const binary = atob(base64);
        const bytes  = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        const pdf  = await window.pdfjsLib.getDocument({ data: bytes }).promise;
        let text   = "";
        const maxPages = Math.min(pdf.numPages, 15);
        for (let i = 1; i <= maxPages; i++) {
            const page    = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(" ") + "\n";
            if (text.length > 20000) { text += "\n[...]"; break; }
        }
        return text.trim();
    }

    // ── Envoyer le texte à Gemini via GAS chatbot ─────────────
    async function analyzeWithAI(pdfText, styleCode) {
        const prompt = `Tu es un expert en industrie textile et confection.
Voici le contenu textuel d'un Tech Pack (TP) pour le style "${styleCode}".

Analyse ce document et extrais TOUS les composants du vêtement mentionnés
(matières, accessoires, étiquettes, emballage, etc.).

Pour chaque composant trouvé, retourne un objet JSON avec ces champs :
- "composant" : nom du composant (ex: "Fabric Main", "Button 15mm", "Care Label", "Polybag")
- "reference"  : référence fournisseur si mentionnée, sinon ""
- "couleur"    : couleur ou coloris si mentionné, sinon ""
- "quantite"   : quantité ou grammage si mentionné, sinon ""

RÈGLES STRICTES :
- Réponds UNIQUEMENT avec un JSON valide, sans texte autour, sans markdown.
- Format exact : {"composants": [...]}
- Si aucun composant trouvé, retourne : {"composants": []}
- Ne duplique pas les composants identiques.

CONTENU DU TECH PACK :
${pdfText.slice(0, 18000)}`;

        const res = await fetch(CHATBOT_URL, {
            method:  "POST",
            headers: { "Content-Type": "text/plain" },
            body:    JSON.stringify({ prompt, context: "", history: [] })
        });

        const data  = await res.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // Parser le JSON retourné par Gemini
        const clean = reply.replace(/```json|```/g, "").trim();
        try {
            const parsed = JSON.parse(clean);
            return Array.isArray(parsed.composants) ? parsed.composants : [];
        } catch(e) {
            // Tentative de récupération si Gemini a ajouté du texte
            const match = clean.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                return Array.isArray(parsed.composants) ? parsed.composants : [];
            }
            throw new Error("Réponse IA non parseable. Réessayez.");
        }
    }

    // ── Sauvegarder les composants validés dans Style Components ──
    async function saveComponents(styleCode, ctlRef, composants) {
        const gasUrl = window.GOOGLE_APPS_SCRIPT_URL;

        // Récupérer les composants déjà existants pour ce style
        const existing = (window.state?.data?.[SHEET_KEY] || [])
            .filter(r => String(r["Cust Style Ref"] || "").trim() === styleCode)
            .map(r => String(r.Composant || "").trim().toLowerCase());

        // Filtrer les doublons
        const toCreate = composants.filter(c =>
            !existing.includes(String(c.composant || "").trim().toLowerCase())
        );

        if (!toCreate.length) {
            typeof showToast === "function" &&
                showToast("Tous les composants existent déjà.", "info");
            return 0;
        }

        // Créer les lignes une par une
        let created = 0;
        for (const c of toCreate) {
            const data = {
                "Cust Style Ref": styleCode,
                "CTL Style Ref":  ctlRef || "",
                "Composant":      c.composant || "",
                "Status":         c.status    || DEFAULT_STATUS,
                "Details":        [c.reference, c.couleur, c.quantite]
                                    .filter(Boolean).join(" · ")
            };
            await fetch(gasUrl, {
                method:   "POST",
                headers:  { "Content-Type": "text/plain;charset=utf-8" },
                redirect: "follow",
                body: JSON.stringify({
                    action: "CREATE",
                    sheet:  "Style Components",
                    data
                })
            });
            created++;
        }
        return created;
    }

    // ── Modale de validation ───────────────────────────────────
    function openValidationModal(styleCode, ctlRef, composants) {
        document.getElementById("tpa-validation-modal")?.remove();

        const STATUS_OPTS = ["Pending", "In House", "PO Sent", "Waiting Approval"];

        // Lignes éditables
        let rows = composants.map((c, i) => ({ ...c, _id: i }));

        const modal = document.createElement("div");
        modal.id = "tpa-validation-modal";
        modal.className = "modal-overlay";

        function renderTable() {
            return rows.map((r, i) => `
            <tr data-idx="${i}">
                <td><input class="tpa-val-input" data-field="composant"
                    value="${esc(r.composant || "")}" placeholder="Composant"/></td>
                <td><input class="tpa-val-input" data-field="reference"
                    value="${esc(r.reference || "")}" placeholder="Référence"/></td>
                <td><input class="tpa-val-input" data-field="couleur"
                    value="${esc(r.couleur || "")}" placeholder="Couleur"/></td>
                <td><input class="tpa-val-input" data-field="quantite"
                    value="${esc(r.quantite || "")}" placeholder="Qté/Grammage"/></td>
                <td>
                    <select class="tpa-status-select" data-field="status">
                        ${STATUS_OPTS.map(o =>
                            `<option value="${o}" ${(r.status || DEFAULT_STATUS) === o ? "selected" : ""}>${o}</option>`
                        ).join("")}
                    </select>
                </td>
                <td><button class="tpa-del-btn" data-del="${i}" title="Supprimer">✕</button></td>
            </tr>`).join("");
        }

        modal.innerHTML = `
        <div class="modal" style="max-width:780px;">
            <div class="modal-header">
                <div>
                    <div class="modal-title">
                        🤖 Composants extraits du TP — ${styleCode}
                    </div>
                    <div class="modal-subtitle" id="tpa-val-subtitle">
                        ${composants.length} composant${composants.length > 1 ? "s" : ""} trouvé${composants.length > 1 ? "s" : ""} · Modifie avant de sauvegarder
                    </div>
                </div>
                <button class="btn-close"
                    onclick="document.getElementById('tpa-validation-modal').remove()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body"
                style="padding:1rem 1.5rem 1.5rem;display:flex;flex-direction:column;gap:12px;">

                <div style="max-height:420px;overflow-y:auto;">
                    <table class="tpa-val-table" id="tpa-val-table">
                        <thead><tr>
                            <th style="width:22%;">Composant</th>
                            <th style="width:20%;">Référence</th>
                            <th style="width:18%;">Couleur</th>
                            <th style="width:14%;">Qté / Grammage</th>
                            <th style="width:16%;">Statut</th>
                            <th style="width:6%;"></th>
                        </tr></thead>
                        <tbody id="tpa-val-tbody">${renderTable()}</tbody>
                    </table>

                    <button class="tpa-add-row" id="tpa-add-row-btn">
                        + Ajouter un composant
                    </button>
                </div>

                <div style="display:flex;gap:8px;justify-content:flex-end;padding-top:4px;">
                    <button class="btn btn-ghost"
                        onclick="document.getElementById('tpa-validation-modal').remove()">
                        Annuler
                    </button>
                    <button class="btn btn-primary" id="tpa-save-btn"
                        onclick="window._tpaSaveComponents()">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor" width="13" height="13">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        Créer les composants
                    </button>
                </div>
            </div>
        </div>`;

        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add("open"));

        // ── Délégation événements ──────────────────────────────
        const tbody = document.getElementById("tpa-val-tbody");

        // Mise à jour des valeurs en live
        tbody.addEventListener("input", e => {
            const tr    = e.target.closest("tr[data-idx]");
            const field = e.target.dataset.field;
            if (!tr || !field) return;
            rows[parseInt(tr.dataset.idx)][field] = e.target.value;
        });
        tbody.addEventListener("change", e => {
            const tr    = e.target.closest("tr[data-idx]");
            const field = e.target.dataset.field;
            if (!tr || !field) return;
            rows[parseInt(tr.dataset.idx)][field] = e.target.value;
        });

        // Supprimer une ligne
        tbody.addEventListener("click", e => {
            const btn = e.target.closest("[data-del]");
            if (!btn) return;
            const idx = parseInt(btn.dataset.del);
            rows.splice(idx, 1);
            tbody.innerHTML = renderTable(); // re-render avec nouveaux idx
            // Re-numéroter les data-idx
            [...tbody.querySelectorAll("tr")].forEach((tr, i) => {
                tr.dataset.idx = i;
                tr.querySelector("[data-del]").dataset.del = i;
            });
            const sub = document.getElementById("tpa-val-subtitle");
            if (sub) sub.textContent = `${rows.length} composant${rows.length > 1 ? "s" : ""} · Modifie avant de sauvegarder`;
        });

        // Ajouter une ligne
        document.getElementById("tpa-add-row-btn").onclick = () => {
            rows.push({ composant: "", reference: "", couleur: "", quantite: "", status: DEFAULT_STATUS, _id: Date.now() });
            tbody.innerHTML = renderTable();
        };

        // Stocker pour le handler de sauvegarde
        modal._rows       = rows;
        modal._styleCode  = styleCode;
        modal._ctlRef     = ctlRef;
        modal._getRows    = () => rows;
    }

    // ── Sauvegarder depuis la modale ──────────────────────────
    window._tpaSaveComponents = async function() {
        const modal = document.getElementById("tpa-validation-modal");
        if (!modal) return;

        const styleCode = modal._styleCode;
        const ctlRef    = modal._ctlRef;
        const rows      = modal._getRows?.() || [];

        // Filtrer les lignes vides
        const toSave = rows.filter(r => String(r.composant || "").trim());
        if (!toSave.length) {
            typeof showToast === "function" &&
                showToast("Aucun composant à sauvegarder.", "error");
            return;
        }

        const btn = document.getElementById("tpa-save-btn");
        if (btn) { btn.disabled = true; btn.textContent = "Enregistrement…"; }
        typeof showToast === "function" && showToast("Enregistrement en cours…", "info", 10000);

        try {
            const created = await saveComponents(styleCode, ctlRef, toSave);
            modal.remove();

            // Recharger les données Style Components
            if (typeof window.state !== "undefined" && window.state) {
                const gasUrl = window.GOOGLE_APPS_SCRIPT_URL;
                if (gasUrl && gasUrl !== "YOUR_WEB_APP_URL_HERE") {
                    const res  = await fetch(gasUrl);
                    const json = await res.json();
                    const sheetData = json.data?.["style components"]
                                   || json.data?.["Style Components"]
                                   || Object.entries(json.data || {}).find(([k]) =>
                                       k.toLowerCase() === "style components"
                                   )?.[1];
                    if (sheetData?.rows) {
                        window.state.data[SHEET_KEY] = (sheetData.rows || []).map((r, i) => ({
                            ...r, _rowIndex: r._rowIndex ?? (i + 2)
                        }));
                    }
                }
            }

            if (typeof applyFilters === "function") applyFilters();
            if (typeof renderKPIs   === "function") renderKPIs();
            if (typeof window.saRefresh === "function") setTimeout(window.saRefresh, 200);

            typeof showToast === "function" &&
                showToast(`✅ ${created} composant${created > 1 ? "s" : ""} créé${created > 1 ? "s" : ""} dans Style Components`, "success", 5000);

        } catch(err) {
            if (btn) { btn.disabled = false; btn.textContent = "Créer les composants"; }
            typeof showToast === "function" &&
                showToast("Erreur : " + err.message, "error");
        }
    };

    // ── Ouvrir la modale d'analyse ────────────────────────────
    function openAnalyzeModal() {
        document.getElementById("tpa-analyze-modal")?.remove();

        // Styles avec TP_URL dans Details
        const detailRows = window.state?.data?.details || [];
        const stylesWithTP = detailRows
            .filter(r => String(r.TP_URL || "").trim())
            .sort((a, b) => String(a["Cust Style Ref"] || "")
                .localeCompare(String(b["Cust Style Ref"] || "")));

        if (!stylesWithTP.length) {
            typeof showToast === "function" &&
                showToast("Aucun style avec Tech Pack uploadé.", "info");
            return;
        }

        const options = stylesWithTP.map(r => {
            const s = String(r["Cust Style Ref"] || "").trim();
            const c = String(r.Client || r.Coll || "").trim();
            return `<option value="${esc(s)}">${s}${c ? " — " + c : ""}</option>`;
        }).join("");

        const modal = document.createElement("div");
        modal.id = "tpa-analyze-modal";
        modal.className = "modal-overlay";
        modal.innerHTML = `
        <div class="modal" style="max-width:420px;">
            <div class="modal-header">
                <div>
                    <div class="modal-title">🤖 Analyser un Tech Pack</div>
                    <div class="modal-subtitle">
                        L'IA extrait les composants depuis le PDF du TP
                    </div>
                </div>
                <button class="btn-close"
                    onclick="document.getElementById('tpa-analyze-modal').remove()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body"
                style="padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:14px;">

                <div>
                    <label class="form-label" style="margin-bottom:6px;">
                        Sélectionne le style à analyser
                        <span style="color:var(--danger,#dc2626)">*</span>
                    </label>
                    <select id="tpa-style-select" class="form-select"
                        style="width:100%;">
                        <option value="">— Choisir un style —</option>
                        ${options}
                    </select>
                    <div style="font-size:11px;color:var(--text-muted,#9ca3af);margin-top:5px;">
                        Seuls les styles avec un TP uploadé sont listés.
                    </div>
                </div>

                <div style="display:flex;gap:8px;justify-content:flex-end;padding-top:4px;">
                    <button class="btn btn-ghost"
                        onclick="document.getElementById('tpa-analyze-modal').remove()">
                        Annuler
                    </button>
                    <button class="btn" id="tpa-start-btn"
                        style="background:linear-gradient(135deg,#7c3aed,#9333ea);
                               color:#fff;border:none;"
                        onclick="window._tpaStartAnalysis()">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor" width="13" height="13">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                        Lancer l'analyse IA
                    </button>
                </div>
            </div>
        </div>`;

        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add("open"));
    }

    // ── Lancer l'analyse ──────────────────────────────────────
    window._tpaStartAnalysis = async function() {
        const select = document.getElementById("tpa-style-select");
        const styleCode = select?.value?.trim();
        if (!styleCode) {
            typeof showToast === "function" &&
                showToast("Sélectionne un style.", "error");
            return;
        }

        // Récupérer le row Details pour ce style
        const detRow = (window.state?.data?.details || []).find(r =>
            String(r["Cust Style Ref"] || "").trim() === styleCode
        );
        if (!detRow?.TP_URL) {
            typeof showToast === "function" &&
                showToast("Aucun TP trouvé pour ce style.", "error");
            return;
        }

        const ctlRef  = String(detRow.CTLStyleRef || "").trim();
        const tpUrl   = String(detRow.TP_URL || "").trim();
        const fileId  = extractFileId(tpUrl);
        if (!fileId) {
            typeof showToast === "function" &&
                showToast("Impossible d'extraire le fileId depuis l'URL du TP.", "error");
            return;
        }

        const btn = document.getElementById("tpa-start-btn");
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="tpa-spin">⏳</span> Récupération du PDF…`;
        }

        try {
            // Étape 1 : Récupérer le PDF depuis Drive
            typeof showToast === "function" &&
                showToast("📥 Récupération du Tech Pack…", "info", 20000);
            const pdfBase64 = await fetchPDFBase64(fileId);

            // Étape 2 : Extraire le texte
            if (btn) btn.innerHTML = `<span class="tpa-spin">⏳</span> Extraction du texte…`;
            typeof showToast === "function" &&
                showToast("📄 Extraction du texte PDF…", "info", 20000);
            const pdfText = await extractTextFromBase64PDF(pdfBase64);

            if (!pdfText || pdfText.length < 50) {
                throw new Error("Le TP semble vide ou non lisible (PDF scanné sans texte).");
            }

            // Étape 3 : Analyse IA
            if (btn) btn.innerHTML = `<span class="tpa-spin">⏳</span> Analyse IA en cours…`;
            typeof showToast === "function" &&
                showToast("🤖 Analyse IA en cours…", "info", 30000);
            const composants = await analyzeWithAI(pdfText, styleCode);

            if (!composants.length) {
                throw new Error("L'IA n'a trouvé aucun composant dans ce TP. Vérifiez le contenu du PDF.");
            }

            // Étape 4 : Modale de validation
            document.getElementById("tpa-analyze-modal")?.remove();
            openValidationModal(styleCode, ctlRef, composants);
            typeof showToast === "function" &&
                showToast(`✅ ${composants.length} composant${composants.length > 1 ? "s" : ""} extrait${composants.length > 1 ? "s" : ""} — Vérifiez avant de sauvegarder`, "success", 5000);

        } catch(err) {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor" width="13" height="13">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    Réessayer`;
            }
            typeof showToast === "function" &&
                showToast("Erreur : " + err.message, "error", 6000);
        }
    };

    // ── Injecter le bouton dans la toolbar du sheet ───────────
    function injectAnalyzeButton() {
        if (document.getElementById("btn-analyze-tp")) return;
        if (window.state?.activeSheet !== SHEET_KEY) return;

        const titleEl = document.getElementById("header-sheet-title");
        if (!titleEl) return;

        const btn = document.createElement("button");
        btn.id = "btn-analyze-tp";
        btn.title = "Analyser le Tech Pack via IA pour extraire les composants";
        btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" width="13" height="13">
                <path stroke-linecap="round" stroke-linejoin="round"
                    stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            Analyser TP`;
        btn.onclick = openAnalyzeModal;
        titleEl.insertAdjacentElement("afterend", btn);
    }

    // ── Patcher renderAll pour injecter le bouton ─────────────
    function patchRenderAllForButton() {
        if (window._tpaRenderAllPatched) return;
        const orig = window.renderAll;
        if (typeof orig !== "function") return;
        window._tpaRenderAllPatched = true;

        window.renderAll = function(...args) {
            const result = orig.apply(this, args);
            // Nettoyer l'ancien bouton si on a changé de sheet
            if (window.state?.activeSheet !== SHEET_KEY) {
                document.getElementById("btn-analyze-tp")?.remove();
            } else {
                setTimeout(injectAnalyzeButton, 100);
            }
            return result;
        };
    }

    // ── Helper esc ────────────────────────────────────────────
    function esc(s) {
        return String(s || "")
            .replace(/&/g,"&amp;").replace(/</g,"&lt;")
            .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    }

    // ── Init ──────────────────────────────────────────────────
    function init() {
        injectStyles();
        patchRenderAllForButton();
        console.log("[AW27] TP Analyzer ✓");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 900);
    }

})();
