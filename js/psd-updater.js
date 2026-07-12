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

    // ── Parser de date robuste ────────────────────────────────
    function parseFlexDate(val) {
        if (!val) return "";
        const s = String(val).trim();
        if (!s || s === "0") return "";

        // Nombre Excel (serial date)
        if (/^\d+(\.\d+)?$/.test(s)) {
            const n = parseFloat(s);
            if (n > 1000) {
                const d = new Date(Math.round((n - 25569) * 86400 * 1000));
                if (!isNaN(d)) return fmtDateFR(d);
            }
        }
        // DD/MM/YYYY
        const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m1) return `${m1[1].padStart(2,"0")}/${m1[2].padStart(2,"0")}/${m1[3]}`;
        // DD-MM-YYYY
        const m2 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
        if (m2) return `${m2[1].padStart(2,"0")}/${m2[2].padStart(2,"0")}/${m2[3]}`;
        // YYYY-MM-DD
        const m3 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m3) return `${m3[3]}/${m3[2]}/${m3[1]}`;
        // JS natif
        const d = new Date(s);
        if (!isNaN(d)) return fmtDateFR(d);
        return s;
    }

    function fmtDateFR(d) {
        const dd = String(d.getDate()).padStart(2,"0");
        const mm = String(d.getMonth()+1).padStart(2,"0");
        return `${dd}/${mm}/${d.getFullYear()}`;
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
                        const wb     = XL.read(base64, { type: "base64", cellDates: true });

                        // Chercher la feuille avec "Possible PSD"
                        let ws = null;
                        for (const name of wb.SheetNames) {
                            const sheet = wb.Sheets[name];
                            const data  = XL.utils.sheet_to_json(sheet, { header: 1, defval: "" });
                            const flat  = data.slice(0, 15).flat().map(h =>
                                String(h).trim().toLowerCase());
                            if (flat.some(h => h.includes("possible psd"))) {
                                ws = sheet; break;
                            }
                        }
                        if (!ws) ws = wb.Sheets[wb.SheetNames[0]];

                        const data = XL.utils.sheet_to_json(ws, { header: 1, defval: "" });

                        // Trouver la ligne d'en-têtes
                        let headerRow = -1, iRef = -1, iPSD = -1;
                        for (let i = 0; i < Math.min(data.length, 20); i++) {
                            const row = data[i].map(h => String(h).trim().toLowerCase());
                            const rRef = row.findIndex(h =>
                                h.includes("buyer style") || h.includes("style+color") ||
                                h.includes("style + color") || h.includes("buyer ref")
                            );
                            const rPSD = row.findIndex(h =>
                                h.includes("possible psd") ||
                                (h === "psd") ||
                                (h.includes("psd") && h.length < 15)
                            );
                            if (rRef !== -1 && rPSD !== -1) {
                                headerRow = i; iRef = rRef; iPSD = rPSD; break;
                            }
                        }

                        if (headerRow === -1 || iRef === -1 || iPSD === -1) {
                            reject(new Error(
                                `Colonnes "Buyer Style+Color" et "Possible PSD" introuvables.\n` +
                                `En-têtes ligne 1 : ${(data[0]||[]).slice(0,10).join(" | ")}`
                            )); return;
                        }

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

                            // Stocker avec clé lowercase pour matching insensible casse
                            if (!lookup[ref.toLowerCase()]) {
                                lookup[ref.toLowerCase()] = { psdRaw: psdParsed, isAllOK, originalRef: ref };
                            }
                        }

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
        const enriched = items.map(item => {
            const detRow = item.detRow;
            const oldPSD = String(detRow?.PSD || "").trim();
            const newPSD = item.inExcel ? buildNewPSD(item, detRow) : null;
            return { ...item, detRow, oldPSD, newPSD, found: item.inExcel };
        });

        const found    = enriched.filter(e => e.found);
        const notFound = enriched.filter(e => !e.found);

        // HTML des lignes
        const rowsHTML = enriched.map((e, i) => `
        <tr data-idx="${i}">
            <td style="padding:9px 12px;font-size:12px;font-weight:500;
                color:var(--text-primary,#111827);">
                ${e.ref}
            </td>
            <td style="padding:9px 12px;">
                <span class="psd-badge-old">${e.oldPSD || "—"}</span>
            </td>
            <td style="padding:9px 12px;">
                ${e.found
                    ? `<span class="${e.isAllOK ? "psd-badge-allok" : "psd-badge-new"}">${e.newPSD}</span>`
                    : `<span style="color:var(--text-muted,#9ca3af);font-size:11px;font-style:italic;">Absent du fichier</span>`
                }
            </td>
            <td style="padding:9px 12px;text-align:center;">
                ${e.found
                    ? `<input type="checkbox" class="psd-row-check" data-idx="${i}" checked
                        style="width:14px;height:14px;accent-color:#1565c0;cursor:pointer;"/>`
                    : `<span style="color:#d1d5db;font-size:11px;">—</span>`
                }
            </td>
        </tr>`).join("");

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
                            <th style="width:28%;">Buyer Style+Color</th>
                            <th style="width:22%;">PSD actuel</th>
                            <th style="width:30%;">Nouveau PSD</th>
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

        let success = 0;
        for (const item of toUpdate) {
            try {
                if (typeof window.quickUpdate === "function") {
                    await window.quickUpdate(item.rowIdx, "PSD", item.newPSD, "details");
                }
                // Mise à jour en mémoire
                if (item.detRow) item.detRow.PSD = item.newPSD;
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
                        const match   = lookup[ref.toLowerCase()];
                        return {
                            ref,
                            psdRaw:   match?.psdRaw   || null,
                            isAllOK:  match?.isAllOK  || false,
                            inExcel:  !!match,
                            detRow:   r,
                            rowIdx:   r._rowIndex
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
