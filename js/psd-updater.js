// ================================================================
//  AW27 — PSD Updater
//  Analyse un fichier Excel hebdomadaire et met à jour la colonne
//  PSD dans le sheet Details. Lecture côté client uniquement.
//  Charger après app.js dans index.html.
//
//  v3 — Import fidèle de la valeur Excel :
//   • DATE (serial Excel, 09/12/2026, 9-Dec, Dec 9 2026…) → écrite "YYYY-MM-DD"
//     pour que le Sheet et l'app la lisent comme une vraie date
//   • TEXTE (IN HOUSE, ALL OK, TBC, autre…) → écrit EXACTEMENT comme dans l'Excel
//   • Cellule vide → rien n'est écrit
//   • Valeur identique à celle du Sheet → "inchangé", rien n'est réécrit
//   Le traitement de chaque type (alertes, etc.) se fait ensuite dans les modules.
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
        .psd-badge-text {
            display: inline-block; padding: 2px 8px; border-radius: 20px;
            font-size: 10.5px; font-weight: 600;
            background: #fffbeb; color: #92400e; border: 0.5px solid #fcd34d;
        }
        .psd-badge-ignored {
            display: inline-block; padding: 2px 8px; border-radius: 20px;
            font-size: 10.5px; font-weight: 600; text-decoration: line-through;
            background: #f3f4f6; color: #6b7280; border: 0.5px solid #d1d5db;
        }
        .psd-excel-raw {
            display: block; margin-top: 3px; font-size: 9.5px;
            color: var(--text-muted, #9ca3af); white-space: nowrap;
            overflow: hidden; text-overflow: ellipsis; max-width: 150px;
        }
        .psd-badge-same {
            font-size: 10.5px; color: var(--text-muted, #9ca3af); font-style: italic;
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

    // ══════════════════════════════════════════════════════════
    //  CLASSIFICATION DES VALEURS
    //  Sert à savoir de quel TYPE est la valeur Excel (pour l'affichage
    //  et pour convertir les dates). La valeur importée reste celle de l'Excel :
    //   • date  → écrite "YYYY-MM-DD"
    //   • texte → écrit tel quel (IN HOUSE, ALL OK, TBC, #N/A…)
    //   • vide  → rien n'est écrit
    // ══════════════════════════════════════════════════════════
    const MONTHS = {
        jan:0, janv:0, janvier:0, january:0,
        feb:1, february:1, fev:1, fevr:1, fevrier:1,
        mar:2, mars:2, march:2,
        apr:3, april:3, avr:3, avril:3,
        may:4, mai:4,
        jun:5, june:5, juin:5,
        jul:6, july:6, juil:6, juillet:6,
        aug:7, august:7, aou:7, aout:7,
        sep:8, sept:8, september:8, septembre:8,
        oct:9, october:9, octobre:9,
        nov:10, november:10, novembre:10,
        dec:11, december:11, decembre:11
    };

    function monthIdx(w) {
        const k = String(w || "").toLowerCase()
            .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\./g, "");
        return Object.prototype.hasOwnProperty.call(MONTHS, k) ? MONTHS[k] : null;
    }

    // Construit une date valide ou null (contrôle jour/mois/année)
    function mkDate(y, m, d) {
        if (y < 100) y += 2000;
        if (y < 2000 || y > 2100 || m < 0 || m > 11 || d < 1 || d > 31) return null;
        const dt = new Date(y, m, d);
        return dt.getMonth() === m ? dt : null; // rejette 31/02 etc.
    }

    // Date sans année ("9-Dec") → année la plus proche d'aujourd'hui (± 6 mois)
    function nearYearDate(m, d) {
        const t = new Date(); t.setHours(0, 0, 0, 0);
        let dt = mkDate(t.getFullYear(), m, d);
        if (!dt) return null;
        if ((dt - t) / 86400000 > 183) dt = mkDate(t.getFullYear() - 1, m, d);
        else if ((t - dt) / 86400000 > 183) dt = mkDate(t.getFullYear() + 1, m, d);
        return dt;
    }

    // Essaie de lire une date. Retourne un objet Date (minuit local) ou null.
    function parseDateOnly(val) {
        if (val === null || val === undefined || val === "") return null;

        // Objet Date
        if (val instanceof Date) {
            return isNaN(val) ? null : mkDate(val.getFullYear(), val.getMonth(), val.getDate());
        }

        // Nombre Excel (serial) — reçu en number avec raw:true
        if (typeof val === "number") return fromExcelSerial(val);

        const s = String(val).trim();
        if (!s) return null;

        // Serial Excel en texte ("46000")
        if (/^\d+(\.\d+)?$/.test(s)) return fromExcelSerial(parseFloat(s));

        // ISO avec heure (…T21:00:00.000Z) → heure locale
        if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
            const d = new Date(s);
            return isNaN(d) ? null : mkDate(d.getFullYear(), d.getMonth(), d.getDate());
        }
        let m;
        // YYYY-MM-DD ou YYYY/MM/DD
        if ((m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/))) return mkDate(+m[1], +m[2] - 1, +m[3]);
        // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (et années sur 2 chiffres) — format français
        if ((m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/))) return mkDate(+m[3], +m[2] - 1, +m[1]);
        // DD-Mon, DD-Mon-YY, DD Mon YYYY, 9th Dec
        if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th|er)?[\s\-.\/]*([A-Za-zÀ-ÿ]{3,9})\.?(?:[\s\-.\/,]+(\d{2,4}))?$/))) {
            const mi = monthIdx(m[2]);
            if (mi !== null) return m[3] ? mkDate(+m[3], mi, +m[1]) : nearYearDate(mi, +m[1]);
        }
        // Mon DD, Mon DD YYYY, Dec 9, 2026
        if ((m = s.match(/^([A-Za-zÀ-ÿ]{3,9})\.?[\s\-.]*(\d{1,2})(?:st|nd|rd|th)?(?:[\s,\-.]+(\d{2,4}))?$/))) {
            const mi = monthIdx(m[1]);
            if (mi !== null) return m[3] ? mkDate(+m[3], mi, +m[2]) : nearYearDate(mi, +m[2]);
        }
        // "Fri Jul 24 2026 00:00:00 GMT+0300 (…)"
        if (/GMT/.test(s)) {
            const d = new Date(s.replace(/\([^)]*\)/g, "").trim());
            return isNaN(d) ? null : mkDate(d.getFullYear(), d.getMonth(), d.getDate());
        }
        return null; // pas une date reconnue → JAMAIS de new Date() "au hasard"
    }

    function fromExcelSerial(n) {
        if (!(n > 36526 && n < 73051)) return null; // années 2000 à 2099
        const d = new Date(Math.round((n - 25569) * 86400 * 1000));
        return mkDate(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }

    function colToLetter(i) {
        let n = i + 1, out = "";
        while (n > 0) { const r = (n - 1) % 26; out = String.fromCharCode(65 + r) + out; n = Math.floor((n - 1) / 26); }
        return out;
    }

    function toISODate(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    function fmtDateFR(d) {
        return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    }

    // Classe une valeur brute (Excel ou Sheet)
    // → { kind: "empty" | "invalid" | "date" | "inhouse" | "allok" | "pending" | "text", date?, raw }
    function classifyValue(val) {
        if (val === null || val === undefined) return { kind: "empty", raw: "" };
        if (val instanceof Date || typeof val === "number") {
            const d = parseDateOnly(val);
            return d ? { kind: "date", date: d, raw: val } : { kind: "text", raw: String(val) };
        }
        const s  = String(val).trim();
        if (!s) return { kind: "empty", raw: "" };
        const lo = s.toLowerCase().replace(/\s+/g, "");

        // Erreurs Excel / valeurs vides déguisées
        if (/^#/.test(s) || lo.includes("invalid") ||
            ["0", "-", "--", "—", "n/a", "na", "null", "undefined", "nan"].includes(lo)) {
            return { kind: "invalid", raw: s };
        }
        if (lo.startsWith("inhouse")) return { kind: "inhouse", raw: s };
        if (lo.startsWith("allok")) {
            // "All OK - 2026-12-09" → garder la date si présente
            const rest = s.replace(/^\s*all\s*ok\s*[-–—:]*\s*/i, "");
            return { kind: "allok", date: rest ? parseDateOnly(rest) : null, raw: s };
        }
        if (["tbc", "tba", "tbd"].includes(lo)) return { kind: "pending", raw: s };

        const d = parseDateOnly(s);
        if (d) return { kind: "date", date: d, raw: s };
        return { kind: "text", raw: s };
    }

    // Valeur finale à écrire dans le Sheet (ou null = ne rien écrire)
    //  • date  → "YYYY-MM-DD"
    //  • tout le reste → la valeur Excel telle quelle
    function toStoredValue(cls) {
        if (cls.kind === "empty") return null;
        if (cls.kind === "date")  return toISODate(cls.date);
        return String(cls.raw).trim();
    }

    // Comparaison ancien / nouveau : même date ou même texte (casse ignorée)
    function sameValue(newVal, oldVal) {
        const a = classifyValue(newVal), b = classifyValue(oldVal);
        if (a.kind === "date" && b.kind === "date") return toISODate(a.date) === toISODate(b.date);
        return String(newVal || "").trim().toLowerCase() === String(oldVal || "").trim().toLowerCase();
    }

    // Affichage lisible (modale)
    function displayValue(val) {
        const c = classifyValue(val);
        switch (c.kind) {
            case "date":    return fmtDateFR(c.date);
            case "empty":   return "";
            default:        return String(c.raw);
        }
    }

    // Classe CSS du badge selon le type de nouvelle valeur
    function badgeClass(kind) {
        if (kind === "date") return "psd-badge-new";
        if (kind === "inhouse" || kind === "allok") return "psd-badge-allok";
        return "psd-badge-text"; // tout autre texte
    }

    // ══════════════════════════════════════════════════════════
    //  LECTURE FIABLE DES CELLULES
    //  Certaines versions / surcouches de SheetJS transforment les textes
    //  des colonnes au format date en "Invalid Date". On lit donc chaque
    //  cellule nous-mêmes : valeur brute si elle est sûre, sinon le texte
    //  affiché dans Excel (cell.w / h / r).
    // ══════════════════════════════════════════════════════════
    function cellText(cell) {
        const t = cell.w ?? cell.h ?? (typeof cell.r === "string" ? cell.r.replace(/<[^>]*>/g, "") : undefined);
        return t === undefined || t === null ? "" : String(t);
    }

    function cellValue(cell) {
        if (!cell) return "";
        const v = cell.v;
        // Date JS : valide → on la garde ; invalide → c'était un texte, on reprend le texte affiché
        if (v instanceof Date) return isNaN(v) ? cellText(cell) : v;
        if (cell.t === "s" || cell.t === "str") return v === undefined || v === null ? cellText(cell) : String(v);
        if (cell.t === "n") return typeof v === "number" ? v : cellText(cell);
        if (cell.t === "d") {
            const d = new Date(v);
            return isNaN(d) ? cellText(cell) : d;
        }
        if (cell.t === "b" || cell.t === "e") return cellText(cell);
        if (v === undefined || v === null || v === "") return cellText(cell);
        // Sécurité : une chaîne "Invalid Date" alors qu'Excel affiche autre chose
        if (typeof v === "string" && /^invalid date$/i.test(v) && cellText(cell) && !/^invalid date$/i.test(cellText(cell))) {
            return cellText(cell);
        }
        return v;
    }

    // Équivalent de sheet_to_json(header:1) mais cellule par cellule
    function readSheetRows(XL, ws, maxRows) {
        if (!ws || !ws["!ref"]) return [];
        const range = XL.utils.decode_range(ws["!ref"]);
        const last  = maxRows ? Math.min(range.e.r, range.s.r + maxRows - 1) : range.e.r;
        const rows  = [];
        for (let r = range.s.r; r <= last; r++) {
            const row = [];
            for (let c = 0; c <= range.e.c; c++) {
                row[c] = cellValue(ws[XL.utils.encode_cell({ r, c })]);
            }
            rows.push(row);
        }
        return rows;
    }

    // ── Analyser le fichier Excel PSD → retourne un lookup map ──
    // { "laridel-bg-vem": { originalRef, psd, srs, sewing, packing } } (valeurs classées)
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
                                const data  = readSheetRows(XL, sheet, 15);
                                const flat  = data.flat().map(h =>
                                    String(h).trim().toLowerCase());
                                if (flat.some(h => h.includes("possible psd"))) {
                                    ws = sheet;
                                    console.log("[PSD] Feuille fallback :", name);
                                    break;
                                }
                            }
                        }
                        if (!ws) ws = wb.Sheets[wb.SheetNames[0]];

                        const data = readSheetRows(XL, ws);
                        console.log("[PSD] SheetJS version :", XL.version || "?");

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

                        // ── Colonnes recherchées par leur EN-TÊTE (le fichier change chaque semaine)
                        //    avec repli sur les positions habituelles si l'en-tête est introuvable
                        const H = data[headerRow].map(h => String(h).trim().toLowerCase().replace(/\s+/g, " "));

                        // PSD : "Possible PSD Wxx" → la semaine la plus récente (1re occurrence)
                        //       sinon en-tête exact "psd" ; JAMAIS "PSD_FR" ni "CRP"
                        let bestWeek = -1;
                        H.forEach((h, i) => {
                            if (!/^possible\s*psd/.test(h)) return;
                            const wk = parseInt((h.match(/w\s*(\d{1,2})/) || [])[1] || "0", 10);
                            if (wk > bestWeek) { bestWeek = wk; iPSD = i; }
                        });
                        if (iPSD === -1) iPSD = H.findIndex(h => h === "psd" || h === "possible psd");
                        if (iPSD === -1) iPSD = 25; // repli : colonne Z

                        const findCol = (re, fallback) => {
                            const i = H.findIndex(h => re.test(h));
                            return i !== -1 ? i : fallback;
                        };
                        const iSRS     = findCol(/^srs\s*launch/, 16);   // repli Q
                        const iSewing  = findCol(/^sewing\s*trim/, 18);  // repli S
                        const iPacking = findCol(/^packing\s*trim/, 19); // repli T

                        console.log("[PSD] Colonnes → CTL:", iRef,
                            "| PSD:", iPSD, "| SRS:", iSRS,
                            "| Sewing:", iSewing, "| Packing:", iPacking);

                        // Construire le lookup map (insensible à la casse)
                        // On garde les cellules BRUTES classées ; la valeur finale
                        // est calculée plus tard (ALL OK a besoin de l'ancien PSD)
                        const lookup = {};
                        for (let i = headerRow + 1; i < data.length; i++) {
                            const row = data[i];
                            const ref = String(row[iRef] || "").trim();
                            if (!ref) continue;

                            const psd     = classifyValue(row[iPSD]);
                            const srs     = classifyValue(row[iSRS]);
                            const sewing  = classifyValue(row[iSewing]);
                            const packing = classifyValue(row[iPacking]);

                            if (![psd, srs, sewing, packing].some(c => c.kind !== "empty")) continue;

                            const key = normalizeRef(ref);
                            if (!lookup[key]) {
                                lookup[key] = {
                                    originalRef: ref, psd, srs, sewing, packing,
                                    cols: { psd: iPSD, srs: iSRS, sewing: iSewing, packing: iPacking }
                                };
                            }
                        }

                        // Diagnostic : cellule PSD brute de la 1re ligne de données
                        try {
                            const firstR = headerRow + 1 + (XL.utils.decode_range(ws["!ref"]).s.r || 0);
                            console.log("[PSD] Cellule brute PSD ligne", firstR + 1, ":",
                                ws[XL.utils.encode_cell({ r: firstR, c: iPSD })]);
                        } catch (_) {}

                        // Diagnostic : en-têtes réellement utilisés + aperçu des valeurs lues
                        const hdr = data[headerRow] || [];
                        console.log("[PSD] Feuille utilisée, ligne d'en-têtes", headerRow + 1);
                        console.table([
                            { champ: "CTL Style",     colonne: colToLetter(iRef),     entete: hdr[iRef] },
                            { champ: "PSD",           colonne: colToLetter(iPSD),     entete: hdr[iPSD] },
                            { champ: "SRS Launching", colonne: colToLetter(iSRS),     entete: hdr[iSRS] },
                            { champ: "Sewing Trims",  colonne: colToLetter(iSewing),  entete: hdr[iSewing] },
                            { champ: "Packing Trims", colonne: colToLetter(iPacking), entete: hdr[iPacking] }
                        ]);
                        console.table(Object.values(lookup).slice(0, 15).map(v => ({
                            ref: v.originalRef,
                            PSD: String(v.psd.raw), "PSD type": v.psd.kind,
                            SRS: String(v.srs.raw), Sewing: String(v.sewing.raw), Packing: String(v.packing.raw)
                        })));

                        // Log pour debug : afficher les 5 premières entrées
                        const keys = Object.keys(lookup);
                        console.log("[PSD] Lookup Excel", keys.length, "entrées :");
                        keys.slice(0, 8).forEach(k =>
                            console.log("  clé:", k, "→", lookup[k].psd.kind, lookup[k].psd.raw)
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

    // ── Ouvrir la modale de validation ────────────────────────
    function openPSDValidationModal(items) {
        document.getElementById("psd-val-modal")?.remove();

        // Pour chaque champ : ancienne valeur, nouvelle valeur à écrire, type, changement ?
        const FIELDS = [
            { id: "PSD",     col: "PSD",           label: "PSD" },
            { id: "SRS",     col: "SRS_Launching", label: "SRS Launching" },
            { id: "Sewing",  col: "Sewing_Trims",  label: "Sewing Trims" },
            { id: "Packing", col: "Packing_Trims", label: "Packing Trims" }
        ];
        const SRC_KEY = { PSD: "psd", SRS: "srs", Sewing: "sewing", Packing: "packing" };

        const enriched = items.map(item => {
            const detRow = item.detRow;
            const fields = {};
            FIELDS.forEach(f => {
                const oldRaw  = detRow?.[f.col];
                const cls     = item.inExcel ? item.match[SRC_KEY[f.id]] : { kind: "empty", raw: "" };
                const newVal  = item.inExcel ? toStoredValue(cls) : null;
                const same    = newVal !== null && sameValue(newVal, oldRaw);
                const colIdx  = item.match?.cols?.[SRC_KEY[f.id]];
                const colLetter = colIdx === undefined ? "?" : colToLetter(colIdx);
                fields[f.id]  = { col: f.col, label: f.label, oldRaw, cls, newVal, same, colLetter };
            });
            const changes    = Object.values(fields).filter(x => x.newVal !== null && !x.same);
            return {
                ...item, detRow, fields,
                found:      item.inExcel,
                hasChange:  changes.length > 0,
                preChecked: item.inExcel && changes.length > 0
            };
        });

        const found    = enriched.filter(e => e.found);
        const notFound = enriched.filter(e => !e.found);

        // HTML des lignes
        const rowsHTML = enriched.map((e, i) => {
            const commitCells = FIELDS.map(f => {
                const x   = e.fields[f.id];
                const ov  = displayValue(x.oldRaw);
                let newHTML;
                if (!e.found) {
                    newHTML = `<span style="color:var(--text-muted,#9ca3af);font-size:10px;font-style:italic;">Absent</span>`;
                } else if (x.newVal === null) {
                    newHTML = `<span style="color:#d1d5db;font-size:11px;">—</span>`;
                } else if (x.same) {
                    newHTML = `<span class="psd-badge-same">inchangé</span>`;
                } else {
                    newHTML = `<span class="${badgeClass(x.cls.kind)}">${displayValue(x.newVal)}</span>`;
                }
                // Ce qui a été réellement lu dans l'Excel (diagnostic)
                const KIND_FR = { empty: "vide", date: "date", inhouse: "texte", allok: "texte",
                                  pending: "texte", text: "texte", invalid: "texte" };
                const excelInfo = e.found
                    ? `<span class="psd-excel-raw" title="Valeur lue dans l'Excel (colonne ${x.colLetter})">Excel ${x.colLetter} : ${
                        x.cls.kind === "empty" ? "(vide)" : String(x.cls.raw)} · ${KIND_FR[x.cls.kind] || x.cls.kind}</span>`
                    : "";
                return `<td style="padding:7px 10px;border-bottom:0.5px solid var(--border,#e5e7eb);">
                    ${ov ? `<div class="psd-badge-old" style="margin-bottom:3px;">${ov}</div>` : ""}
                    ${newHTML}
                    ${excelInfo}
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
                    ${e.found && e.hasChange
                        ? `<input type="checkbox" class="psd-row-check" data-idx="${i}" ${e.preChecked ? "checked" : ""}
                            style="width:14px;height:14px;accent-color:#1565c0;cursor:pointer;"/>`
                        : `<span style="color:#d1d5db;font-size:11px;">—</span>`
                    }
                </td>
            </tr>`;
        }).join("");

        const nbChanges = enriched.filter(e => e.found && e.hasChange).length;

        const modal = document.createElement("div");
        modal.id = "psd-val-modal";
        modal.className = "modal-overlay";
        modal.innerHTML = `
        <div class="modal" style="max-width:960px;width:96vw;">
            <div class="modal-header">
                <div>
                    <div class="modal-title">
                        📅 Mise à jour PSD — Résultats de l'analyse
                    </div>
                    <div class="modal-subtitle">
                        ${enriched.length} style${enriched.length > 1 ? "s" : ""} dans Details
                        · ${found.length} trouvé${found.length > 1 ? "s" : ""} dans le fichier
                        ${notFound.length > 0 ? ` · ${notFound.length} absent${notFound.length > 1 ? "s" : ""}` : ""}
                        · ${nbChanges} à mettre à jour
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
                        <span style="color:#166534;font-weight:600;">■</span> Date &nbsp;
                        <span style="color:#1e40af;font-weight:600;">■</span> In House / All OK &nbsp;
                        <span style="color:#92400e;font-weight:600;">■</span> Autre texte
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
    window._psdApplyUpdates = async function() {
        const modal = document.getElementById("psd-val-modal");
        if (!modal) return;

        const enriched  = modal._enriched || [];
        const btn       = document.getElementById("psd-apply-btn");
        const checked   = [...document.querySelectorAll(".psd-row-check:checked")]
                            .map(c => parseInt(c.dataset.idx));

        const toUpdate  = enriched.filter((_, i) => checked.includes(i) && enriched[i].found && enriched[i].hasChange);
        if (!toUpdate.length) {
            typeof showToast === "function" && showToast("Aucune ligne sélectionnée.", "error");
            return;
        }

        if (btn) { btn.disabled = true; btn.textContent = "Mise à jour en cours…"; }
        typeof showToast === "function" &&
            showToast(`Mise à jour de ${toUpdate.length} style${toUpdate.length > 1 ? "s" : ""}…`, "info", 15000);

        // Sauvegarder un champ via CREATE_OR_UPDATE_FIELD (crée la colonne si absente)
        async function saveField(rowIdx, colKey, value) {
            if (!value) return;
            const gasUrl = window.GOOGLE_APPS_SCRIPT_URL;
            if (!gasUrl || gasUrl === "YOUR_WEB_APP_URL_HERE") return;
            const res = await fetch(gasUrl, {
                method:   "POST",
                headers:  { "Content-Type": "text/plain;charset=utf-8" },
                redirect: "follow",
                body: JSON.stringify({
                    action:   "CREATE_OR_UPDATE_FIELD",
                    sheet:    "Details",
                    colKey,
                    rowIndex: rowIdx,
                    value
                })
            });
            const json = await res.json();
            if (json.status !== "ok") {
                console.error("[PSD] saveField erreur:", json.message, "| col:", colKey, "| val:", value);
            } else {
                console.log("[PSD] Saved", colKey, "=", value, "row", rowIdx);
            }
        }

        let success = 0;
        for (const item of toUpdate) {
            try {
                for (const x of Object.values(item.fields)) {
                    if (x.newVal === null || x.same) continue;

                    if (x.col === "PSD") {
                        // PSD via quickUpdate (colonne existante)
                        if (typeof window.quickUpdate === "function")
                            await window.quickUpdate(item.rowIdx, "PSD", x.newVal, "details");
                    } else {
                        // Commitments via saveField (crée la colonne si absente)
                        await saveField(item.rowIdx, x.col, x.newVal);
                    }
                    if (item.detRow) item.detRow[x.col] = x.newVal;
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
                            match:   match || null,
                            inExcel: !!match,
                            detRow:  r,
                            rowIdx:  r._rowIndex
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
    function injectHeaderButton() { /* Géré par sc-actions-menu.js */ }

    // ── Observer le header pour réinjection ───────────────────
    function startButtonGuard() {
        let count = 0;
        const g = setInterval(() => {
            if (++count > 120) { clearInterval(g); return; }
            /* btn géré par sc-actions-menu.js */;
        }, 1000);
    }

    // ── Init ──────────────────────────────────────────────────
    function init() {
        // Exposer pour le menu Actions
        window._psdTriggerUpload = triggerPSDUpload;
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
        console.log("[AW27] PSD Updater v5 ✓ (lecture cellule par cellule, texte importé tel quel)");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 850);
    }

})();
