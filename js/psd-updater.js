// ================================================================
//  AW27 — PSD Updater
//  Analyse un fichier Excel hebdomadaire et met à jour la colonne
//  PSD dans le sheet Details. Lecture côté client uniquement.
//  Charger après app.js dans index.html.
// ================================================================

(function initPSDUpdater() {

    // ── Styles CSS ────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById("psd-styles")) return;
        const s = document.createElement("style");
        s.id = "psd-styles";
        s.textContent = `
        #btn-psd-updater {
            display: flex; align-items: center; justify-content: center;
            width: 34px; height: 34px; border-radius: 50%; padding: 0;
            background: var(--surface-1, #f3f4f6);
            border: 1px solid var(--border, #e5e7eb);
            color: var(--text-secondary, #6b7280); cursor: pointer;
            transition: background .15s, color .15s;
            position: relative;
        }
        #btn-psd-updater:hover { background: #fef9c3; color: #854d0e; }
        #btn-psd-updater:disabled { opacity: .5; cursor: not-allowed; }

        @keyframes psd-spin { to { transform: rotate(360deg); } }
        .psd-spin { display: inline-block; animation: psd-spin .7s linear infinite; }

        /* Tableau de validation */
        .psd-val-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .psd-val-table th {
            padding: 8px 12px; text-align: left; font-size: 10px;
            color: var(--text-muted, #9ca3af); text-transform: uppercase;
            letter-spacing: .07em; font-weight: 600;
            border-bottom: 1.5px solid var(--border, #e5e7eb);
            background: var(--surface-2, #f9fafb);
            position: sticky; top: 0; z-index: 1;
        }
        .psd-val-table td {
            padding: 9px 12px;
            border-bottom: 0.5px solid var(--border, #e5e7eb);
            vertical-align: middle;
        }
        .psd-val-table tr:hover td { background: var(--surface-1, #f9fafb); }
        .psd-badge-new {
            display: inline-block; padding: 2px 8px; border-radius: 20px;
            font-size: 10.5px; font-weight: 600;
            background: #f0fdf4; color: #166534; border: 0.5px solid #86efac;
        }
        .psd-badge-allok {
            display: inline-block; padding: 2px 8px; border-radius: 20px;
            font-size: 10.5px; font-weight: 600;
            background: #eff6ff; color: #1e40af; border: 0.5px solid #93c5fd;
        }
        .psd-badge-old {
            font-size: 11px; color: var(--text-muted, #9ca3af);
        }
        .psd-badge-notfound {
            display: inline-block; padding: 2px 8px; border-radius: 20px;
            font-size: 10.5px; font-weight: 600;
            background: #fef2f2; color: #991b1b; border: 0.5px solid #fca5a5;
        }
        `;
        document.head.appendChild(s);
    }

    // ── Normaliser une référence style pour le matching ──────
    // Gère : "LARIDEL BG VEM" / "LARIDEL-BG-VEM" / "laridel_bg_vem"
    function normalizeRef(s) {
        return String(s || "").trim()
            .toLowerCase()
            .replace(/[\s_\.]+/g, "-")   // espaces, underscores, points → tiret
            .replace(/-+/g, "-")          // tirets multiples → un seul
            .replace(/^-|-$/g, "");       // supprimer tirets en début/fin
    }

    // ── Parser de date robuste ────────────────────────────────
    function parseFlexDate(val) {
        if (!val) return "";

        // Objet Date JS direct (SheetJS avec raw:true retourne des Date objects)
        if (val instanceof Date) {
            if (!isNaN(val) && val.getFullYear() > 2000) return fmtDateFR(val);
            return "";
        }

        const s = String(val).trim();
        if (!s || s === "0") return "";

        // Format "Fri Jul 24 2026 00:00:00 GMT+0300 (timezone)" → supprimer la partie timezone
        if (s.includes("GMT") || s.match(/^[A-Z][a-z]{2} [A-Z][a-z]{2}/)) {
            const clean = s.replace(/\([^)]*\)/g, "").trim();
            const d = new Date(clean);
            if (!isNaN(d) && d.getFullYear() > 2000) return fmtDateFR(d);
        }

        // Nombre Excel serial date (ex: 45849 = 06/07/2026)
        // Formule : (serial - 25569) * 86400 * 1000 ms depuis epoch Unix
        if (/^\d+(\.\d+)?$/.test(s)) {
            const n = parseFloat(s);
            if (n > 40000) { // dates après 2009
                // Corriger le bug Excel du 29/02/1900 (+1)
                const d = new Date(Math.round((n - 25569) * 86400 * 1000));
                if (!isNaN(d) && d.getFullYear() > 2000) return fmtDateFR(d);
            }
        }
        // DD/MM/YYYY (format French)
        const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m1) {
            const year = parseInt(m1[3]);
            // Corriger les années sur 2 chiffres interprétées comme 19xx
            const fullYear = year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year;
            return `${m1[1].padStart(2,"0")}/${m1[2].padStart(2,"0")}/${fullYear}`;
        }
        // DD/MM/YY (2 chiffres)
        const m1b = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
        if (m1b) {
            const year = parseInt(m1b[3]);
            const fullYear = year < 50 ? 2000 + year : 1900 + year;
            return `${m1b[1].padStart(2,"0")}/${m1b[2].padStart(2,"0")}/${fullYear}`;
        }
        // DD-MM-YYYY
        const m2 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
        if (m2) return `${m2[1].padStart(2,"0")}/${m2[2].padStart(2,"0")}/${m2[3]}`;
        // YYYY-MM-DD
        const m3 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m3) return `${m3[3]}/${m3[2]}/${m3[1]}`;
        // JS natif (ISO string etc.)
        const d = new Date(s);
        if (!isNaN(d) && d.getFullYear() > 2000) return fmtDateFR(d);
        return s;
    }

    function fmtDateFR(d) {
        const dd = String(d.getDate()).padStart(2,"0");
        const mm = String(d.getMonth()+1).padStart(2,"0");
        return `${dd}/${mm}/${d.getFullYear()}`;
    }

    // ── Convertir une date vers YYYY-MM-DD (identique à bdc-upload.js) ──
    function convertBDCDate(dateStr) {
        if (!dateStr) return "";
        const s = String(dateStr).trim();
        if (!s || s.toLowerCase().replace(/\s/g,"") === "inhouse") return s;
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) return s; // déjà DD/MM/YYYY
        const m1 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
        if (m1) return `${m1[1].padStart(2,"0")}/${m1[2].padStart(2,"0")}/${m1[3]}`;
        const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m2) return `${m2[3]}/${m2[2]}/${m2[1]}`;
        if (s.includes("GMT") || s.match(/^[A-Z][a-z]{2} [A-Z][a-z]{2}/)) {
            const d = new Date(s.replace(/\([^)]*\)/g,"").trim());
            if (!isNaN(d)) {
                return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
            }
        }
        return s;
    }

    // ── Analyser le fichier Excel PSD → retourne un lookup map ──
    // { "LARIDEL-BG-VEM": { psdRaw, isAllOK }, ... }
    function analyzePSDFile(file) {
        return new Promise((resolve, reject) => {
            if (typeof _waitForXLSX !== "function") {
                reject(new Error("SheetJS non disponible.")); return;
            }
            _waitForXLSX(XL => {
                if (!XL) { reject(new Error("SheetJS non chargé.")); return; }

                const rd = new FileReader();
                rd.onerror = () => reject(new Error("Lecture du fichier échouée."));
                rd.onload  = e => {
                    try {
                        const base64 = e.target.result.split(",")[1];
                        const wb     = XL.read(base64, {
                            type:        "base64",
                            cellDates:   false,  // on parse les dates nous-mêmes
                            cellFormula: true,   // lire les formules
                            cellNF:      true,
                            raw:         true    // valeur brute (serial pour dates, texte pour texte)
                        });

                        // Chercher la feuille "commitment" (insensible à la casse)
                        // Fallback : feuille avec "Possible PSD" ou première feuille
                        let ws = null;
                        const commitmentSheet = wb.SheetNames.find(n =>
                            n.trim().toLowerCase() === "commitment"
                        );
                        if (commitmentSheet) {
                            ws = wb.Sheets[commitmentSheet];
                            console.log("[PSD] Feuille trouvée :", commitmentSheet);
                        } else {
                            for (const name of wb.SheetNames) {
                                const sheet = wb.Sheets[name];
                                const data  = XL.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
                                const flat  = data.slice(0, 15).flat().map(h =>
                                    String(h).trim().toLowerCase());
                                if (flat.some(h => h.includes("possible psd"))) {
                                    ws = sheet;
                                    console.log("[PSD] Feuille fallback :", name);
                                    break;
                                }
                            }
                        }
                        if (!ws) ws = wb.Sheets[wb.SheetNames[0]];

                        const data = XL.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });

                        // Trouver la ligne d'en-têtes
                        let headerRow = -1, iRef = -1, iPSD = -1;

                        // Étape 1 : trouver la ligne avec "ctlstyleref"
                        for (let i = 0; i < Math.min(data.length, 20); i++) {
                            const row = data[i].map(h => String(h).trim().toLowerCase());
                            const rRef = row.findIndex(h =>
                                h === "ctlstyleref" ||
                                h === "ctl style ref" ||
                                h === "ctl style" ||
                                h.includes("ctlstyle") ||
                                h.includes("ctl style") ||
                                h.includes("ctl ref")
                            );
                            if (rRef !== -1) {
                                headerRow = i;
                                iRef      = rRef;
                                console.log("[PSD] Header ligne", i,
                                    "| CTL Style col", iRef, "=", data[i][iRef]);
                                break;
                            }
                        }

                        if (headerRow === -1 || iRef === -1) {
                            reject(new Error(
                                `Colonne CTL Style introuvable.\n` +
                                `En-têtes ligne 1 : ${(data[1]||[]).slice(0,12).join(" | ")}`
                            )); return;
                        }

                        // Colonne PSD = colonne Z (index 25, confirmé par l'utilisateur)
                        // Vérification : chercher d'abord par texte, sinon hardcode Z
                        const headerRow2 = data[headerRow].map(h => String(h).trim().toLowerCase());
                        iPSD = headerRow2.findIndex(h =>
                            h.includes("possible psd") || h === "psd" ||
                            (h.includes("psd") && !h.includes("crp") && h.length < 20)
                        );
                        if (iPSD === -1) {
                            iPSD = 25; // Colonne Z (PSD, confirmé)
                        }
                        // Colonnes commitments hardcodées (confirmées)
                        const iSRS     = 16; // Colonne Q — SRS Launching
                        const iSewing  = 18; // Colonne S — Sewing Trims
                        const iPacking = 19; // Colonne T — Packing Trims

                        console.log("[PSD] Colonnes → CTL:", iRef,
                            "| PSD:", iPSD, "| SRS:", iSRS,
                            "| Sewing:", iSewing, "| Packing:", iPacking);

                        // Construire le lookup map (insensible à la casse)
                        const lookup = {};
                        for (let i = headerRow + 1; i < data.length; i++) {
                            const row    = data[i];
                            const ref    = String(row[iRef] || "").trim();
                            const psdRaw = String(row[iPSD] || "").trim();
                            if (!ref || !psdRaw) continue;

                            const isAllOK   = psdRaw.toLowerCase().replace(/\s/g,"") === "allok";
                            const psdParsed = isAllOK ? "ALL OK" : parseFlexDate(psdRaw);
                            if (!psdParsed) continue;

                            // Stocker avec clé normalisée (insensible casse + séparateurs)
                            const normKey = normalizeRef(ref);
                            if (!lookup[normKey]) {
                                const readVal = (idx) => {
                                    const v = String(row[idx] || "").trim();
                                    if (!v) return null;
                                    const lo = v.toLowerCase().replace(/\s/g,"");
                                    if (lo === "inhouse") return "In House";
                                    return convertBDCDate(v) || v;
                                };
                                lookup[normKey] = {
                                    psdRaw:        psdParsed,
                                    isAllOK,
                                    originalRef:   ref,
                                    srsLaunching:  readVal(iSRS),
                                    sewingTrims:   readVal(iSewing),
                                    packingTrims:  readVal(iPacking)
                                };
                            }
                        }

                        // Log pour debug : afficher les 5 premières entrées
                        const keys = Object.keys(lookup);
                        console.log("[PSD] Lookup Excel", keys.length, "entrées :");
                        keys.slice(0, 8).forEach(k =>
                            console.log("  clé:", k, "→", lookup[k].psdRaw)
                        );
                        resolve(lookup);
                    } catch(err) {
                        reject(err);
                    }
                };
                rd.readAsDataURL(file);
            });
        });
    }

    // ── Construire la valeur PSD finale ───────────────────────
    // Si ALL OK → "All OK - {ancienne date PSD}"
    // Sinon → la date parsée
    function buildNewPSD(item, detRow) {
        if (item.isAllOK) {
            const oldPSD = String(detRow?.PSD || "").trim();
            return oldPSD ? `All OK - ${oldPSD}` : "All OK";
        }
        return item.psdRaw;
    }

    // ── Ouvrir la modale de validation ────────────────────────
    function openPSDValidationModal(items) {
        document.getElementById("psd-val-modal")?.remove();

        // Les items viennent déjà enrichis depuis triggerPSDUpload
        const toISO_local = v => {
            if (!v || v === "In House") return v;
            const m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
            return v;
        };

        const enriched = items.map(item => {
            const detRow    = item.detRow;
            const oldPSD    = String(detRow?.PSD              || "").trim();
            const oldSRS    = String(detRow?.SRS_Launching    || "").trim();
            const oldSewing = String(detRow?.Sewing_Trims     || "").trim();
            const oldPacking= String(detRow?.Packing_Trims    || "").trim();
            const newPSD    = item.inExcel ? buildNewPSD(item, detRow) : null;
            const newSRS    = item.inExcel && item.srsLaunching  ? item.srsLaunching  : null;
            const newSewing = item.inExcel && item.sewingTrims   ? item.sewingTrims   : null;
            const newPacking= item.inExcel && item.packingTrims  ? item.packingTrims  : null;
            return {
                ...item, detRow,
                oldPSD, newPSD,
                oldSRS, newSRS,
                oldSewing, newSewing,
                oldPacking, newPacking,
                found: item.inExcel
            };
        });

        const found    = enriched.filter(e => e.found);
        const notFound = enriched.filter(e => !e.found);

        // HTML des lignes
        const COMMIT_DEFS = [
            { key:"newPSD",     oldKey:"oldPSD",     label:"PSD"           },
            { key:"newSRS",     oldKey:"oldSRS",     label:"SRS Launching" },
            { key:"newSewing",  oldKey:"oldSewing",  label:"Sewing Trims"  },
            { key:"newPacking", oldKey:"oldPacking", label:"Packing Trims" }
        ];

        const rowsHTML = enriched.map((e, i) => {
            const commitCells = COMMIT_DEFS.map(cd => {
                const nv = e[cd.key];
                const ov = e[cd.oldKey] || "";
                const isAO = nv && String(nv).toLowerCase() === "in house";
                return `<td style="padding:7px 10px;border-bottom:0.5px solid var(--border,#e5e7eb);">
                    <div style="font-size:9px;color:var(--text-muted,#9ca3af);
                        text-transform:uppercase;margin-bottom:2px;">${cd.label}</div>
                    ${ov ? `<div class="psd-badge-old" style="margin-bottom:3px;">${ov}</div>` : ""}
                    ${e.found && nv
                        ? `<span class="${isAO ? "psd-badge-allok" : "psd-badge-new"}">${nv}</span>`
                        : !e.found
                            ? `<span style="color:var(--text-muted,#9ca3af);font-size:10px;
                                font-style:italic;">Absent</span>`
                            : `<span style="color:#d1d5db;font-size:11px;">—</span>`
                    }
                </td>`;
            }).join("");

            return `<tr data-idx="${i}">
                <td style="padding:9px 12px;">
                    <div style="font-size:12px;font-weight:500;
                        color:var(--text-primary,#111827);">${e.ref}</div>
                    <div style="font-size:10px;color:var(--text-muted,#9ca3af);margin-top:1px;">
                        CTL: ${String(e.detRow?.CTLStyleRef || e.detRow?.["CTL Style Ref"] || "—")}
                    </div>
                </td>
                ${commitCells}
                <td style="padding:9px 12px;text-align:center;">
                    ${e.found
                        ? `<input type="checkbox" class="psd-row-check" data-idx="${i}" checked
                            style="width:14px;height:14px;accent-color:#1565c0;cursor:pointer;"/>`
                        : `<span style="color:#d1d5db;font-size:11px;">—</span>`
                    }
                </td>
            </tr>`;
        }).join("");

        const modal = document.createElement("div");
        modal.id = "psd-val-modal";
        modal.className = "modal-overlay";
        modal.innerHTML = `
        <div class="modal" style="max-width:700px;width:95vw;">
            <div class="modal-header">
                <div>
                    <div class="modal-title">
                        📅 Mise à jour PSD — Résultats de l'analyse
                    </div>
                    <div class="modal-subtitle">
                        ${enriched.length} style${enriched.length > 1 ? "s" : ""} dans Details
                        · ${found.length} trouvé${found.length > 1 ? "s" : ""} dans le fichier
                        ${notFound.length > 0 ? ` · ${notFound.length} absent${notFound.length > 1 ? "s" : ""}` : ""}
                    </div>
                </div>
                <button class="btn-close"
                    onclick="document.getElementById('psd-val-modal').remove()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body"
                style="padding:0 0 1rem;display:flex;flex-direction:column;gap:0;">

                <!-- Sélectionner tout -->
                <div style="display:flex;align-items:center;justify-content:space-between;
                    padding:10px 16px;border-bottom:0.5px solid var(--border,#e5e7eb);
                    background:var(--surface-2,#f9fafb);">
                    <div style="display:flex;gap:12px;">
                        <button type="button"
                            style="font-size:11px;background:none;border:none;
                                color:var(--text-accent,#1565c0);cursor:pointer;padding:0;"
                            onclick="document.querySelectorAll('.psd-row-check').forEach(c=>c.checked=true);">
                            Tout sélectionner
                        </button>
                        <span style="color:var(--border-strong,#d1d5db);">|</span>
                        <button type="button"
                            style="font-size:11px;background:none;border:none;
                                color:var(--text-secondary,#6b7280);cursor:pointer;padding:0;"
                            onclick="document.querySelectorAll('.psd-row-check').forEach(c=>c.checked=false);">
                            Tout désélectionner
                        </button>
                    </div>
                    <div style="font-size:11px;color:var(--text-muted,#9ca3af);">
                        <span style="color:#166534;font-weight:600;">■</span> Nouvelle date &nbsp;
                        <span style="color:#1e40af;font-weight:600;">■</span> All OK &nbsp;
                        <span style="color:#991b1b;font-weight:600;">■</span> Introuvable
                    </div>
                </div>

                <!-- Tableau -->
                <div style="max-height:420px;overflow-y:auto;">
                    <table class="psd-val-table">
                        <thead><tr>
                            <th style="width:22%;">Style</th>
                            <th style="width:18%;">PSD</th>
                            <th style="width:16%;">SRS Launching</th>
                            <th style="width:16%;">Sewing Trims</th>
                            <th style="width:16%;">Packing Trims</th>
                            <th style="width:10%;text-align:center;">Appliquer</th>
                        </tr></thead>
                        <tbody>${rowsHTML}</tbody>
                    </table>
                </div>

                <!-- Actions -->
                <div style="display:flex;gap:8px;justify-content:flex-end;
                    padding:12px 16px;border-top:0.5px solid var(--border,#e5e7eb);">
                    <button class="btn btn-ghost"
                        onclick="document.getElementById('psd-val-modal').remove()">
                        Annuler
                    </button>
                    <button class="btn btn-primary" id="psd-apply-btn"
                        onclick="window._psdApplyUpdates()">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor" width="13" height="13">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        Appliquer les mises à jour
                    </button>
                </div>
            </div>
        </div>`;

        modal._enriched = enriched;
        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add("open"));
    }

    // ── Appliquer les mises à jour ────────────────────────────
    // ── Convertir DD/MM/YYYY → YYYY-MM-DD pour stockage correct ──
    // Évite que JS interprète "04/09/2026" comme MM/DD (9 avril au lieu de 4 sept.)
    function toISO(psd) {
        if (!psd || psd.toLowerCase().startsWith("all ok")) return psd;
        const m = psd.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
        return psd;
    }

    window._psdApplyUpdates = async function() {
        const modal = document.getElementById("psd-val-modal");
        if (!modal) return;

        const enriched  = modal._enriched || [];
        const btn       = document.getElementById("psd-apply-btn");
        const checked   = [...document.querySelectorAll(".psd-row-check:checked")]
                            .map(c => parseInt(c.dataset.idx));

        const toUpdate  = enriched.filter((_, i) => checked.includes(i) && enriched[i].found);
        if (!toUpdate.length) {
            typeof showToast === "function" && showToast("Aucune ligne sélectionnée.", "error");
            return;
        }

        if (btn) { btn.disabled = true; btn.textContent = "Mise à jour en cours…"; }
        typeof showToast === "function" &&
            showToast(`Mise à jour de ${toUpdate.length} style${toUpdate.length > 1 ? "s" : ""}…`, "info", 15000);

        // Sauvegarder un champ via UPLOAD_ORDERING_FILE (crée la colonne si absente)
        async function saveField(rowIdx, colKey, value) {
            if (!value) return;
            const gasUrl = window.GOOGLE_APPS_SCRIPT_URL;
            if (!gasUrl || gasUrl === "YOUR_WEB_APP_URL_HERE") return;
            await fetch(gasUrl, {
                method:"POST",
                headers:{"Content-Type":"text/plain;charset=utf-8"},
                redirect:"follow",
                body: JSON.stringify({
                    action:"UPLOAD_ORDERING_FILE",
                    sheet:"Details", colKey, rowIndex: rowIdx,
                    fileUrl: value, base64Data:"", mimeType:"", fileName:""
                })
            });
        }

        let success = 0;
        for (const item of toUpdate) {
            try {
                // PSD via quickUpdate (colonne existante)
                if (item.newPSD) {
                    const psdISO = toISO(item.newPSD);
                    if (typeof window.quickUpdate === "function")
                        await window.quickUpdate(item.rowIdx, "PSD", psdISO, "details");
                    if (item.detRow) item.detRow.PSD = psdISO;
                }
                // Commitments via saveField (crée la colonne si absente)
                if (item.newSRS) {
                    const v = toISO(item.newSRS);
                    await saveField(item.rowIdx, "SRS_Launching", v);
                    if (item.detRow) item.detRow.SRS_Launching = v;
                }
                if (item.newSewing) {
                    const v = toISO(item.newSewing);
                    await saveField(item.rowIdx, "Sewing_Trims", v);
                    if (item.detRow) item.detRow.Sewing_Trims = v;
                }
                if (item.newPacking) {
                    const v = toISO(item.newPacking);
                    await saveField(item.rowIdx, "Packing_Trims", v);
                    if (item.detRow) item.detRow.Packing_Trims = v;
                }
                success++;
            } catch(err) {
                console.error(`[PSD] Erreur pour ${item.ref} :`, err);
            }
        }

        modal.remove();

        // Rafraîchir la table
        if (typeof window.renderAll === "function") setTimeout(window.renderAll, 100);
        else if (typeof applyFilters === "function") setTimeout(applyFilters, 100);

        typeof showToast === "function" &&
            showToast(`✅ ${success} PSD mis à jour`, "success", 5000);
    };

    // ── Déclencher le sélecteur de fichier ───────────────────
    function triggerPSDUpload() {
        const input    = document.createElement("input");
        input.type     = "file";
        input.accept   = ".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;

            const btn = document.getElementById("btn-psd-updater");
            if (btn) { btn.disabled = true; btn.innerHTML = `<span class="psd-spin">⏳</span>`; }
            typeof showToast === "function" &&
                showToast("Analyse du fichier PSD…", "info", 10000);

            try {
                const lookup = await analyzePSDFile(file);
                if (!Object.keys(lookup).length) {
                    typeof showToast === "function" &&
                        showToast("Aucune donnée PSD trouvée dans le fichier.", "error");
                    return;
                }

                // Parcourir TOUS les styles de Details et chercher dans le lookup
                const detailRows = window.state?.data?.details || [];
                const items = detailRows
                    .filter(r => String(r["Cust Style Ref"] || "").trim())
                    .map(r => {
                        const ref     = String(r["Cust Style Ref"] || "").trim();
                        // Matching par CTL Style Ref (colonne CTLStyleRef dans Details)
                        // qui correspond à Buyer Style+Color dans l'Excel
                        const ctlRef  = String(r["CTLStyleRef"] || r["CTL Style Ref"] || "").trim();
                        const normRef = normalizeRef(ctlRef);
                        let match = lookup[normRef];
                        // Fallback sans coloris (CALVAIRE-BF-VEM → calvaire-bf)
                        if (!match) {
                            const parts = normRef.split("-");
                            for (let cut = parts.length-1; cut >= 1; cut--) {
                                const shorter = parts.slice(0,cut).join("-");
                                if (lookup[shorter]) { match = lookup[shorter]; break; }
                            }
                        }
                        return {
                            ref,
                            psdRaw:        match?.psdRaw        || null,
                            isAllOK:       match?.isAllOK        || false,
                            srsLaunching:  match?.srsLaunching   || null,
                            sewingTrims:   match?.sewingTrims    || null,
                            packingTrims:  match?.packingTrims   || null,
                            inExcel:       !!match,
                            detRow:        r,
                            rowIdx:        r._rowIndex
                        };
                    });

                if (!items.length) {
                    typeof showToast === "function" &&
                        showToast("Aucun style trouvé dans Details.", "error");
                    return;
                }

                openPSDValidationModal(items);
            } catch(err) {
                typeof showToast === "function" &&
                    showToast("Erreur : " + err.message, "error", 7000);
            } finally {
                if (btn) {
                    btn.disabled  = false;
                    btn.innerHTML = btnHTML();
                }
            }
        };
        input.click();
    }

    // ── HTML du bouton ────────────────────────────────────────
    function btnHTML() {
        return `<svg xmlns="http://www.w3.org/2000/svg" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" width="17" height="17"
            aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0
                00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>`;
    }

    // ── Injecter le bouton dans le header ─────────────────────
    function injectHeaderButton() {
        if (document.getElementById("btn-psd-updater")) return;

        const btn   = document.createElement("button");
        btn.id      = "btn-psd-updater";
        btn.title   = "Importer et mettre à jour les dates PSD";
        btn.innerHTML = btnHTML();
        btn.onclick   = triggerPSDUpload;

        const targets = [
            document.getElementById("btn-components-pdf"),
            document.getElementById("btn-order-scan"),
            document.getElementById("btn-mail-alerts"),
            document.getElementById("btn-notif-global"),
            document.querySelector(".header-right button")
        ];
        const target      = targets.find(Boolean);
        const headerRight = document.querySelector(".header-right");
        if (target?.parentNode) {
            target.parentNode.insertBefore(btn, target);
        } else if (headerRight) {
            headerRight.prepend(btn);
        }
    }

    // ── Observer le header pour réinjection ───────────────────
    function startButtonGuard() {
        let count = 0;
        const g = setInterval(() => {
            if (++count > 120) { clearInterval(g); return; }
            if (!document.getElementById("btn-psd-updater")) injectHeaderButton();
        }, 1000);
    }

    // ── Init ──────────────────────────────────────────────────
    function init() {
        injectStyles();
        const tryInject = () => {
            if (document.querySelector(".header-right")) {
                injectHeaderButton();
                startButtonGuard();
            } else {
                setTimeout(tryInject, 300);
            }
        };
        tryInject();
        console.log("[AW27] PSD Updater ✓");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 850);
    }

})();
