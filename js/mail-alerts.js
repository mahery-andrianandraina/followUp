// ================================================================
//  AW27 — Mail Alert Reporter
//  Envoie un rapport d'alertes par email avec Excel joint.
//  Charger après app.js dans index.html.
// ================================================================

(function initMailAlerts() {

    const SETTINGS_KEY = "aw27_mail_alert_settings";

    // ── Paramètres persistants (localStorage) ─────────────────
    function getSettings() {
        try {
            const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
            return {
                recipient:   s.recipient   ?? (window.currentUser?.email || ""),
                includeHigh: s.includeHigh ?? true,
                includeMid:  s.includeMid  ?? true,
                includeLow:  s.includeLow  ?? false
            };
        } catch(e) {
            return { recipient: window.currentUser?.email || "", includeHigh: true, includeMid: true, includeLow: false };
        }
    }

    function saveSettings(s) {
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch(e) {}
    }

    // ── Collecter et filtrer les alertes ──────────────────────
    function collectFilteredAlerts(settings) {
        if (typeof collectAllAlerts !== "function") return {};
        const all = collectAllAlerts();
        const keep = new Set();
        if (settings.includeHigh) keep.add("high");
        if (settings.includeMid)  keep.add("mid");
        if (settings.includeLow)  keep.add("low");

        const out = {};
        Object.entries(all).forEach(([key, data]) => {
            const items = data.items.filter(i => keep.has(i.urgency));
            if (items.length) out[key] = { ...data, items };
        });
        return out;
    }

    // ── Compter par urgence ────────────────────────────────────
    function countByUrgency(alerts) {
        const all = Object.values(alerts).flatMap(d => d.items);
        return {
            total: all.length,
            high:  all.filter(i => i.urgency === "high").length,
            mid:   all.filter(i => i.urgency === "mid").length,
            low:   all.filter(i => i.urgency === "low").length
        };
    }

    // ── Construire le fichier Excel en base64 ─────────────────
    function buildXLSXBase64(alerts) {
        return new Promise((resolve, reject) => {
            // _waitForXLSX est défini globalement dans app.js
            if (typeof _waitForXLSX !== "function") {
                reject(new Error("_waitForXLSX non disponible — app.js doit être chargé avant."));
                return;
            }
            _waitForXLSX(function(XL) {
                if (!XL) { reject(new Error("Bibliothèque SheetJS non chargée.")); return; }

                const wb   = XL.utils.book_new();
                const today = new Date().toLocaleDateString("fr-FR");
                const urgLabel = u =>
                    u === "high" ? "🔴 Urgente" : u === "mid" ? "🟡 Moyenne" : "🔵 Info";

                // ── Feuille 1 : Résumé global ─────────────────
                const summaryRows = [];
                Object.entries(alerts).forEach(([, data]) => {
                    data.items.forEach(item => {
                        summaryRows.push({
                            "Date":           today,
                            "Menu":           data.label,
                            "Style":          item.style   || "—",
                            "Client":         item.client  || "—",
                            "Urgence":        urgLabel(item.urgency),
                            "Alerte":         item.title   || "",
                            "Action requise": item.action  || "",
                            "Détail":         item.meta    || ""
                        });
                    });
                });
                const HEADERS = ["Date","Menu","Style","Client","Urgence","Alerte","Action requise","Détail"];
                const ws1 = XL.utils.json_to_sheet(summaryRows, { header: HEADERS });
                ws1["!cols"] = [{wch:12},{wch:22},{wch:15},{wch:15},{wch:12},{wch:45},{wch:45},{wch:40}];
                XL.utils.book_append_sheet(wb, ws1, "Alertes du jour");

                // ── Feuille 2+ : Une feuille par menu ─────────
                Object.entries(alerts).forEach(([, data]) => {
                    if (!data.items.length) return;
                    const rows = data.items.map(item => ({
                        "Style":          item.style   || "—",
                        "Client":         item.client  || "—",
                        "Urgence":        urgLabel(item.urgency),
                        "Alerte":         item.title   || "",
                        "Action requise": item.action  || "",
                        "Détail":         item.meta    || ""
                    }));
                    const ws = XL.utils.json_to_sheet(rows);
                    ws["!cols"] = [{wch:15},{wch:15},{wch:12},{wch:45},{wch:45},{wch:40}];
                    // Nom de feuille : max 31 caractères
                    XL.utils.book_append_sheet(wb, ws, data.label.slice(0, 31));
                });

                // Exporter en base64
                const b64 = XL.write(wb, { type: "base64", bookType: "xlsx" });
                resolve(b64);
            });
        });
    }

    // ── Construire le corps HTML de l'email ───────────────────
    function buildEmailHTML(alerts) {
        const counts  = countByUrgency(alerts);
        const todayFR = new Date().toLocaleDateString("fr-FR", {
            weekday: "long", day: "2-digit", month: "long", year: "numeric"
        });
        const todayCap = todayFR.charAt(0).toUpperCase() + todayFR.slice(1);

        // ── Lignes de tableau par menu ─────────────────────────
        const urgCfg = {
            high: { bg: "#fee2e2", color: "#991b1b", label: "🔴 Urgent"  },
            mid:  { bg: "#fef9c3", color: "#854d0e", label: "🟡 Moyen"   },
            low:  { bg: "#eff6ff", color: "#1e40af", label: "🔵 Info"    }
        };

        let tableBody = "";
        Object.entries(alerts).forEach(([, data]) => {
            const hasHigh = data.items.some(i => i.urgency === "high");
            const hasMid  = !hasHigh && data.items.some(i => i.urgency === "mid");
            const sectionBg = hasHigh ? "#fff5f5" : hasMid ? "#fffef0" : "#f9fafb";
            const borderColor = hasHigh ? "#ef4444" : hasMid ? "#f59e0b" : "#3b82f6";
            const highCnt = data.items.filter(i => i.urgency === "high").length;

            // En-tête de section menu
            tableBody += `
            <tr>
                <td colspan="5" style="padding:10px 14px 8px;
                    background:${sectionBg};
                    border-top:2px solid ${borderColor};
                    border-bottom:1px solid #e5e7eb;">
                    <strong style="font-size:13px;color:#111827;">${data.label}</strong>
                    <span style="font-size:11px;color:#6b7280;margin-left:8px;">
                        ${data.items.length} alerte${data.items.length > 1 ? "s" : ""}
                    </span>
                    ${highCnt > 0 ? `
                    <span style="font-size:11px;color:#991b1b;margin-left:6px;font-weight:600;">
                        · ${highCnt} urgente${highCnt > 1 ? "s" : ""}
                    </span>` : ""}
                </td>
            </tr>`;

            // Lignes d'alertes
            data.items.forEach(item => {
                const c = urgCfg[item.urgency] || urgCfg.low;
                tableBody += `
                <tr style="border-bottom:1px solid #f3f4f6;">
                    <td style="padding:8px 10px;font-size:12px;font-weight:500;color:#111827;
                        white-space:nowrap;">${item.style || "—"}</td>
                    <td style="padding:8px 10px;font-size:12px;color:#6b7280;
                        white-space:nowrap;">${item.client || "—"}</td>
                    <td style="padding:8px 10px;white-space:nowrap;">
                        <span style="display:inline-block;padding:2px 8px;border-radius:20px;
                            background:${c.bg};color:${c.color};
                            font-size:11px;font-weight:600;">
                            ${c.label}
                        </span>
                    </td>
                    <td style="padding:8px 10px;font-size:12px;color:#111827;">
                        ${item.title || ""}
                    </td>
                    <td style="padding:8px 10px;font-size:12px;color:#374151;">
                        → ${item.action || ""}
                    </td>
                </tr>`;
            });

            // Espaceur entre sections
            tableBody += `<tr><td colspan="5" style="padding:4px 0;"></td></tr>`;
        });

        return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0"
    style="max-width:780px;margin:24px auto;background:#ffffff;
           border-radius:14px;overflow:hidden;
           box-shadow:0 2px 16px rgba(0,0,0,0.08);">

    <!-- ══ HEADER ═══════════════════════════════════════════ -->
    <tr>
        <td style="background:linear-gradient(135deg,#1565c0 0%,#1e88e5 100%);
            padding:22px 28px;">
            <table cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding-right:14px;">
                        <div style="background:rgba(255,255,255,0.15);border-radius:10px;
                            padding:8px 14px;display:inline-block;">
                            <span style="color:#fff;font-size:19px;font-weight:700;
                                letter-spacing:0.06em;">AW27</span>
                        </div>
                    </td>
                    <td>
                        <div style="color:#fff;font-size:16px;font-weight:600;">
                            Rapport d'alertes quotidien
                        </div>
                        <div style="color:rgba(255,255,255,0.72);font-size:12px;margin-top:3px;">
                            ${todayCap}
                        </div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    <!-- ══ BADGES RÉSUMÉ ════════════════════════════════════ -->
    <tr>
        <td style="padding:16px 28px;background:#f8fafc;border-bottom:1px solid #e5e7eb;">
            <table cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding-right:10px;">
                        <div style="background:#fee2e2;border-radius:10px;
                            padding:10px 16px;text-align:center;min-width:72px;">
                            <div style="font-size:24px;font-weight:700;color:#991b1b;">
                                ${counts.high}
                            </div>
                            <div style="font-size:10px;color:#b91c1c;text-transform:uppercase;
                                letter-spacing:.06em;margin-top:2px;">Urgentes</div>
                        </div>
                    </td>
                    <td style="padding-right:10px;">
                        <div style="background:#fef9c3;border-radius:10px;
                            padding:10px 16px;text-align:center;min-width:72px;">
                            <div style="font-size:24px;font-weight:700;color:#854d0e;">
                                ${counts.mid}
                            </div>
                            <div style="font-size:10px;color:#92400e;text-transform:uppercase;
                                letter-spacing:.06em;margin-top:2px;">Moyennes</div>
                        </div>
                    </td>
                    <td style="padding-right:10px;">
                        <div style="background:#eff6ff;border-radius:10px;
                            padding:10px 16px;text-align:center;min-width:72px;">
                            <div style="font-size:24px;font-weight:700;color:#1e40af;">
                                ${counts.low}
                            </div>
                            <div style="font-size:10px;color:#1d4ed8;text-transform:uppercase;
                                letter-spacing:.06em;margin-top:2px;">Infos</div>
                        </div>
                    </td>
                    <td>
                        <div style="background:#f0fdf4;border-radius:10px;
                            padding:10px 16px;text-align:center;min-width:72px;
                            border:1px solid #bbf7d0;">
                            <div style="font-size:24px;font-weight:700;color:#166534;">
                                ${counts.total}
                            </div>
                            <div style="font-size:10px;color:#15803d;text-transform:uppercase;
                                letter-spacing:.06em;margin-top:2px;">Total</div>
                        </div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    <!-- ══ TABLEAU D'ALERTES ═════════════════════════════════ -->
    <tr>
        <td style="padding:0 28px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0"
                style="border-collapse:collapse;margin-top:18px;">
                <!-- En-tête tableau -->
                <thead>
                    <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb;">
                        <th style="padding:8px 10px;text-align:left;font-size:10.5px;
                            color:#6b7280;text-transform:uppercase;letter-spacing:.07em;
                            font-weight:600;">Style</th>
                        <th style="padding:8px 10px;text-align:left;font-size:10.5px;
                            color:#6b7280;text-transform:uppercase;letter-spacing:.07em;
                            font-weight:600;">Client</th>
                        <th style="padding:8px 10px;text-align:left;font-size:10.5px;
                            color:#6b7280;text-transform:uppercase;letter-spacing:.07em;
                            font-weight:600;">Urgence</th>
                        <th style="padding:8px 10px;text-align:left;font-size:10.5px;
                            color:#6b7280;text-transform:uppercase;letter-spacing:.07em;
                            font-weight:600;">Alerte</th>
                        <th style="padding:8px 10px;text-align:left;font-size:10.5px;
                            color:#6b7280;text-transform:uppercase;letter-spacing:.07em;
                            font-weight:600;">Action requise</th>
                    </tr>
                </thead>
                <tbody>${tableBody}</tbody>
            </table>
        </td>
    </tr>

    <!-- ══ FOOTER ════════════════════════════════════════════ -->
    <tr>
        <td style="padding:14px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;
            text-align:center;">
            <p style="font-size:11px;color:#9ca3af;margin:0;line-height:1.6;">
                Rapport généré automatiquement par
                <strong style="color:#1565c0;">AW27 Checkers</strong> — ${todayCap}.<br>
                Le fichier Excel complet est joint à cet email.
            </p>
        </td>
    </tr>

</table>
</body>
</html>`;
    }

    // ── Envoyer l'email via GAS ───────────────────────────────
    async function sendAlertEmail(settings) {
        const gasUrl = window.GOOGLE_APPS_SCRIPT_URL;
        if (!gasUrl || gasUrl === "YOUR_WEB_APP_URL_HERE") {
            throw new Error("URL Google Apps Script non configurée.");
        }

        const alerts = collectFilteredAlerts(settings);
        const counts  = countByUrgency(alerts);

        if (counts.total === 0) {
            typeof showToast === "function" &&
                showToast("Aucune alerte à envoyer ✓", "success");
            return { sent: false, total: 0 };
        }

        // Générer XLSX
        const xlsxBase64 = await buildXLSXBase64(alerts);
        const htmlBody   = buildEmailHTML(alerts);
        const today      = new Date().toISOString().slice(0, 10);
        const urgStr     = counts.high > 0
            ? `${counts.high} urgente${counts.high > 1 ? "s" : ""} · `
            : "";
        const subject = `AW27 — ${counts.total} alerte${counts.total > 1 ? "s" : ""} · ${urgStr}${today}`;
        const fileName = `AW27_Alertes_${today}.xlsx`;

        const res = await fetch(gasUrl, {
            method:   "POST",
            headers:  { "Content-Type": "text/plain;charset=utf-8" },
            redirect: "follow",
            body: JSON.stringify({
                action:     "SEND_ALERT_EMAIL",
                recipient:  settings.recipient,
                subject,
                htmlBody,
                xlsxBase64,
                fileName
            })
        });

        const json = await res.json();
        if (json.status !== "ok") throw new Error(json.message || "Erreur GAS");
        return { sent: true, total: counts.total, subject };
    }

    // ── Mettre à jour le compteur live dans la modal ──────────
    function refreshModalPreview() {
        const s = _getModalSettings();
        const a = collectFilteredAlerts(s);
        const c = countByUrgency(a);
        const previewEl = document.getElementById("mail-preview-count");
        const subtitleEl = document.querySelector("#mail-alert-modal .modal-subtitle");
        if (previewEl) {
            previewEl.innerHTML = c.total === 0
                ? `<em>Aucune alerte pour les filtres sélectionnés.</em>`
                : `📊 <strong>${c.total}</strong> alerte${c.total > 1 ? "s" : ""} dans le rapport` +
                  (c.high > 0 ? ` · <span style="color:#991b1b;font-weight:600;">${c.high} urgente${c.high > 1 ? "s" : ""}</span>` : "") +
                  ` · fichier Excel joint automatiquement`;
        }
        if (subtitleEl) {
            subtitleEl.textContent = c.total === 0
                ? "Aucune alerte sélectionnée"
                : `${c.total} alerte${c.total > 1 ? "s" : ""}` +
                  (c.high > 0 ? ` · ${c.high} urgente${c.high > 1 ? "s" : ""}` : "");
        }
    }

    // Lire les settings depuis la modal ouverte
    function _getModalSettings() {
        return {
            recipient:   (document.getElementById("mail-recipient")?.value || "").trim(),
            includeHigh: document.getElementById("filter-high")?.checked ?? true,
            includeMid:  document.getElementById("filter-mid")?.checked  ?? true,
            includeLow:  document.getElementById("filter-low")?.checked  ?? false
        };
    }

    // ── Exposé globalement pour les onclick inline ────────────
    window._mailAlertSend = async function() {
        const settings = _getModalSettings();
        if (!settings.recipient) {
            typeof showToast === "function" &&
                showToast("Entrez au moins un destinataire.", "error");
            document.getElementById("mail-recipient")?.focus();
            return;
        }

        saveSettings(settings);

        const btn = document.getElementById("mail-send-btn");
        if (btn) {
            btn.disabled = true;
            btn.innerHTML =
                `<span style="display:inline-block;animation:ma-spin .7s linear infinite">⏳</span>` +
                ` Envoi en cours…`;
        }
        typeof showToast === "function" &&
            showToast("Génération du rapport Excel…", "info", 15000);

        try {
            const result = await sendAlertEmail(settings);
            document.getElementById("mail-alert-modal")?.remove();
            if (result.sent) {
                typeof showToast === "function" &&
                    showToast(
                        `✅ Rapport envoyé à ${settings.recipient} (${result.total} alertes)`,
                        "success", 6000
                    );
            }
        } catch(err) {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML =
                    `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="13" height="13">` +
                    `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>` +
                    ` Réessayer`;
            }
            typeof showToast === "function" &&
                showToast("Erreur envoi : " + err.message, "error");
        }
    };

    // ── Ouvrir la modal ───────────────────────────────────────
    function openMailModal() {
        document.getElementById("mail-alert-modal")?.remove();

        const settings = getSettings();
        const alerts   = collectFilteredAlerts(settings);
        const counts   = countByUrgency(alerts);

        const modal = document.createElement("div");
        modal.id = "mail-alert-modal";
        modal.className = "modal-overlay";
        modal.innerHTML = `
        <div class="modal" style="max-width:480px;">
            <div class="modal-header">
                <div>
                    <div class="modal-title">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" width="17" height="17"
                            style="vertical-align:middle;margin-right:6px;">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                        Rapport d'alertes par email
                    </div>
                    <div class="modal-subtitle">
                        ${counts.total} alerte${counts.total > 1 ? "s" : ""}
                        ${counts.high > 0 ? `· ${counts.high} urgente${counts.high > 1 ? "s" : ""}` : ""}
                    </div>
                </div>
                <button class="btn-close"
                    onclick="document.getElementById('mail-alert-modal').remove()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body" style="padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:16px;">

                <!-- Destinataire(s) -->
                <div>
                    <label class="form-label" style="margin-bottom:5px;">
                        Destinataire(s)
                        <span style="color:var(--danger,#dc2626)">*</span>
                    </label>
                    <input id="mail-recipient" class="form-input" type="email"
                        placeholder="email@example.com, autre@example.com"
                        value="${settings.recipient}"
                        style="width:100%;box-sizing:border-box;"/>
                    <div style="font-size:11px;color:#9ca3af;margin-top:4px;">
                        Séparer plusieurs destinataires par une virgule.
                    </div>
                </div>

                <!-- Filtre urgence -->
                <div>
                    <label class="form-label" style="margin-bottom:8px;">
                        Alertes à inclure dans le rapport
                    </label>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        <label style="display:flex;align-items:center;gap:9px;cursor:pointer;font-size:13px;">
                            <input type="checkbox" id="filter-high"
                                ${settings.includeHigh ? "checked" : ""}
                                onchange="refreshMailPreview()"/>
                            <span style="display:inline-flex;align-items:center;gap:6px;">
                                <span style="width:9px;height:9px;border-radius:50%;
                                    background:#ef4444;display:inline-block;flex-shrink:0;"></span>
                                <strong>Urgentes</strong> — retards, bloqués, dépassements
                            </span>
                        </label>
                        <label style="display:flex;align-items:center;gap:9px;cursor:pointer;font-size:13px;">
                            <input type="checkbox" id="filter-mid"
                                ${settings.includeMid ? "checked" : ""}
                                onchange="refreshMailPreview()"/>
                            <span style="display:inline-flex;align-items:center;gap:6px;">
                                <span style="width:9px;height:9px;border-radius:50%;
                                    background:#f59e0b;display:inline-block;flex-shrink:0;"></span>
                                <strong>Moyennes</strong> — à surveiller, envois en attente
                            </span>
                        </label>
                        <label style="display:flex;align-items:center;gap:9px;cursor:pointer;font-size:13px;">
                            <input type="checkbox" id="filter-low"
                                ${settings.includeLow ? "checked" : ""}
                                onchange="refreshMailPreview()"/>
                            <span style="display:inline-flex;align-items:center;gap:6px;">
                                <span style="width:9px;height:9px;border-radius:50%;
                                    background:#3b82f6;display:inline-block;flex-shrink:0;"></span>
                                <strong>Informations</strong> — suivi normal, prochains RDV
                            </span>
                        </label>
                    </div>
                </div>

                <!-- Aperçu -->
                <div id="mail-preview-count"
                    style="background:#f0f6ff;border:1px solid #cce0f5;
                    border-radius:8px;padding:11px 14px;font-size:12px;color:#1a5296;
                    line-height:1.5;">
                    📊 <strong>${counts.total}</strong> alerte${counts.total > 1 ? "s" : ""} dans le rapport
                    ${counts.high > 0 ? `· <span style="color:#991b1b;font-weight:600;">${counts.high} urgente${counts.high > 1 ? "s" : ""}</span>` : ""}
                    · fichier Excel joint automatiquement
                </div>

                <!-- Actions -->
                <div style="display:flex;gap:8px;justify-content:flex-end;padding-top:4px;">
                    <button class="btn btn-ghost"
                        onclick="document.getElementById('mail-alert-modal').remove()">
                        Annuler
                    </button>
                    <button class="btn btn-primary" id="mail-send-btn"
                        onclick="window._mailAlertSend()">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" width="13" height="13">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                        Envoyer le rapport
                    </button>
                </div>
            </div>
        </div>`;

        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add("open"));
    }

    // Exposé globalement pour le onchange inline
    window.refreshMailPreview = refreshModalPreview;

    // ── Injecter le bouton dans le header ─────────────────────
    function injectStyles() {
        if (document.getElementById("mail-alert-styles")) return;
        const s = document.createElement("style");
        s.id = "mail-alert-styles";
        s.textContent = `
        @keyframes ma-spin { to { transform: rotate(360deg); } }
        #btn-mail-alerts {
            display: inline-flex; align-items: center; gap: 5px;
            padding: 6px 12px; border-radius: 8px;
            background: var(--surface-2, #f3f4f6);
            border: 1px solid var(--border, #e5e7eb);
            color: var(--text-2, #6b7280); cursor: pointer;
            font-size: 12px; font-weight: 500; font-family: inherit;
            transition: background .15s, color .15s, border-color .15s;
        }
        #btn-mail-alerts:hover {
            background: #e8f0fe; color: #1a73e8; border-color: #c5d9f9;
        }
        `;
        document.head.appendChild(s);
    }

    function injectHeaderButton() {
        if (document.getElementById("btn-mail-alerts")) return;

        const btn = document.createElement("button");
        btn.id = "btn-mail-alerts";
        btn.title = "Envoyer le rapport d'alertes par email";
        btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" width="13" height="13">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            Rapport email`;
        btn.onclick = openMailModal;

        // Insérer juste avant le bouton notifications
        const target = document.getElementById("btn-notif-global")
                     || document.querySelector(".header-right button")
                     || document.querySelector(".header-right");
        if (target?.parentNode) {
            target.parentNode.insertBefore(btn, target);
        } else if (document.querySelector(".header-right")) {
            document.querySelector(".header-right").prepend(btn);
        }
    }

    // ── Init ──────────────────────────────────────────────────
    function init() {
        injectStyles();

        const tryInject = () => {
            if (document.querySelector(".header-right")) {
                injectHeaderButton();
            } else {
                setTimeout(tryInject, 300);
            }
        };
        tryInject();

        console.log("[AW27] Mail Alerts ✓");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 800);
    }

})();
