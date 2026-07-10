// ================================================================
//  AW27 — Order Confirm Notify
//  Affiche une modale de confirmation email quand les 3 conditions
//  sont réunies sur une ligne Details :
//    1. Order Status === "PO RECEIVED"
//    2. CRP Status contient "CONFIRMED"
//    3. BDC_URL non vide
//  Charger après app.js dans index.html.
// ================================================================

(function initOrderConfirmNotify() {

    const SENT_KEY        = "aw27_order_confirm_sent";
    const LAST_EMAIL_KEY  = "aw27_order_confirm_last_email";

    // ── Clé unique par style (Cust Style Ref + Client) ────────
    function _styleKey(row) {
        return (row["Cust Style Ref"] || row["Style"] || "") +
               "__" + (row["Client"] || row["Coll"] || "");
    }

    // ── Tracking envois (localStorage) ────────────────────────
    function _getSentSet() {
        try { return new Set(JSON.parse(localStorage.getItem(SENT_KEY) || "[]")); }
        catch(e) { return new Set(); }
    }

    function hasSentNotification(row) {
        return _getSentSet().has(_styleKey(row));
    }

    function markAsSent(row) {
        const sent = _getSentSet();
        sent.add(_styleKey(row));
        try { localStorage.setItem(SENT_KEY, JSON.stringify([...sent])); } catch(e) {}
    }

    // ── Vérifier les 3 conditions ──────────────────────────────
    function checkConditions(row) {
        if (!row) return false;
        const orderStatus = String(row["Order Status"] || "").trim();
        const crpStatus   = String(row["CRP Status"]   || "").trim().toLowerCase();
        const bdcUrl      = String(row["BDC_URL"]       || "").trim();
        return orderStatus === "PO RECEIVED" &&
               crpStatus.includes("confirm") &&
               bdcUrl.length > 0;
    }

    // ── Format date ────────────────────────────────────────────
    function _fmtDate(val) {
        if (!val) return "—";
        try {
            return new Date(val).toLocaleDateString("fr-FR", {
                day: "2-digit", month: "short", year: "numeric"
            });
        } catch(e) { return String(val); }
    }

    // ── Email HTML complet ─────────────────────────────────────
    function buildEmailHTML(row) {
        const style      = row["Cust Style Ref"]    || row["Style"]  || "—";
        const client     = row["Client"]            || row["Coll"]   || "—";
        const coll       = row["Coll"]              || "—";
        const ctlRef     = row["CTLStyleRef"]       || "—";
        const season     = row["Full Season"]       || row["SEASON"] || "—";
        const p1p2       = row["P1/ P2"]            || "—";
        const theme      = row["Theme"]             || "—";
        const ageGroup   = row["Age Group"]         || "—";
        const styleType  = row["Style Type"]        || "—";
        const fabric     = row["FABRIC"]            || "—";
        const priority   = row["PRIORITY"]          || "—";
        const trimsDev   = row["TRIMS DEVELOPMENT"] || "—";
        const orderStatus= row["Order Status"]      || "—";
        const crpStatus  = row["CRP Status"]        || "—";
        const confTotal  = row["Conf Total"]        || "—";
        const targetQty  = row["Target Qty"]        || "—";
        const price1st   = row["1st Price $"]       ? `$${row["1st Price $"]}` : "—";
        const targetPrice= row["Target Price $"]    ? `$${row["Target Price $"]}` : "—";
        const appPrice   = row["Approved Price $"]  ? `$${row["Approved Price $"]}` : "—";
        const toVal      = row["TO ($)"]            ? `$${row["TO ($)"]}` : "—";
        const poDeadline = _fmtDate(row["PO Deadline"]);
        const poRecDate  = _fmtDate(row["PO Rec Date"]);
        const initVsl    = _fmtDate(row["Initial Vsl Date"]);
        const possVsl    = _fmtDate(row["Possible Vsl date"]);
        const possEtd    = _fmtDate(row["Possible etd"]);
        const sampleReady= _fmtDate(row["SAMPLE LENGTH \nREADY DATE"]);
        const comment    = row["COMMENT"]  || "";
        const remark     = row["remark"]   || "";
        const bdcUrl     = row["BDC_URL"]  || "";

        const todayFR  = new Date().toLocaleDateString("fr-FR", {
            weekday: "long", day: "2-digit", month: "long", year: "numeric"
        });
        const todayCap = todayFR.charAt(0).toUpperCase() + todayFR.slice(1);

        // Helper ligne tableau
        const tr = (label, value) => !value || value === "—" ? "" : `
            <tr>
                <td style="padding:7px 12px;font-size:11px;color:#6b7280;
                    white-space:nowrap;width:160px;
                    border-bottom:1px solid #f3f4f6;
                    text-transform:uppercase;letter-spacing:.04em;">
                    ${label}
                </td>
                <td style="padding:7px 12px;font-size:12px;font-weight:500;
                    color:#111827;border-bottom:1px solid #f3f4f6;">
                    ${String(value).replace(/\n/g, " ")}
                </td>
            </tr>`;

        // Section header
        const section = (title) => `
            <tr>
                <td colspan="2" style="padding:8px 12px;background:#f9fafb;
                    border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">
                    <span style="font-size:10.5px;font-weight:600;color:#374151;
                        text-transform:uppercase;letter-spacing:.07em;">${title}</span>
                </td>
            </tr>`;

        return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0"
    style="max-width:680px;margin:24px auto;background:#fff;
           border-radius:14px;overflow:hidden;
           box-shadow:0 2px 16px rgba(0,0,0,.08);">

    <!-- HEADER -->
    <tr>
        <td style="background:linear-gradient(135deg,#1565c0,#1e88e5);padding:22px 28px;">
            <table cellpadding="0" cellspacing="0"><tr>
                <td style="padding-right:14px;">
                    <div style="background:rgba(255,255,255,.15);border-radius:10px;
                        padding:8px 14px;display:inline-block;">
                        <span style="color:#fff;font-size:19px;font-weight:700;
                            letter-spacing:.06em;">AW27</span>
                    </div>
                </td>
                <td>
                    <div style="color:#fff;font-size:16px;font-weight:600;">
                        Confirmation de commande
                    </div>
                    <div style="color:rgba(255,255,255,.72);font-size:12px;margin-top:3px;">
                        ${todayCap}
                    </div>
                </td>
            </tr></table>
        </td>
    </tr>

    <!-- STYLE TITLE -->
    <tr>
        <td style="padding:18px 28px 12px;">
            <div style="font-size:22px;font-weight:700;color:#111827;letter-spacing:.02em;">
                ${style}
            </div>
            <div style="font-size:13px;color:#6b7280;margin-top:3px;">
                ${client}
                ${coll !== client && coll !== "—" ? " · " + coll : ""}
                ${season !== "—" ? " · " + season : ""}
                ${p1p2 !== "—" ? " · " + p1p2 : ""}
            </div>
        </td>
    </tr>

    <!-- 3 CONDITIONS -->
    <tr>
        <td style="padding:0 28px 16px;">
            <table cellpadding="0" cellspacing="0"><tr>
                <td style="padding-right:8px;">
                    <span style="display:inline-block;padding:5px 12px;border-radius:20px;
                        background:#f0fdf4;border:1px solid #86efac;
                        font-size:11px;font-weight:600;color:#166534;">
                        ✓ PO RECEIVED
                    </span>
                </td>
                <td style="padding-right:8px;">
                    <span style="display:inline-block;padding:5px 12px;border-radius:20px;
                        background:#f0fdf4;border:1px solid #86efac;
                        font-size:11px;font-weight:600;color:#166534;">
                        ✓ CRP CONFIRMED
                    </span>
                </td>
                <td>
                    <span style="display:inline-block;padding:5px 12px;border-radius:20px;
                        background:#f0fdf4;border:1px solid #86efac;
                        font-size:11px;font-weight:600;color:#166534;">
                        ✓ BDC joint
                    </span>
                </td>
            </tr></table>
        </td>
    </tr>

    <!-- RECAP TABLE -->
    <tr>
        <td style="padding:0 28px 20px;">
            <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">

                    ${section("Identification")}
                    ${tr("CTL Style Ref", ctlRef)}
                    ${tr("Client", client)}
                    ${tr("Coll", coll !== client ? coll : "")}
                    ${tr("Saison", season)}
                    ${tr("P1 / P2", p1p2)}
                    ${tr("Thème", theme)}
                    ${tr("Age Group", ageGroup)}
                    ${tr("Style Type", styleType)}
                    ${tr("Fabric", fabric)}
                    ${tr("Priority", priority)}
                    ${tr("Trims Development", trimsDev)}

                    ${section("Statuts")}
                    ${tr("Order Status", orderStatus)}
                    ${tr("CRP Status", crpStatus)}

                    ${section("Quantités & Prix")}
                    ${tr("Target Qty", targetQty)}
                    ${tr("Conf Total", confTotal)}
                    ${tr("1st Price", price1st)}
                    ${tr("Target Price", targetPrice)}
                    ${tr("Approved Price", appPrice)}
                    ${tr("TO ($)", toVal)}

                    ${section("Dates clés")}
                    ${tr("PO Deadline", poDeadline)}
                    ${tr("PO Rec Date", poRecDate)}
                    ${tr("Sample Ready Date", sampleReady)}
                    ${tr("Initial VSL Date", initVsl)}
                    ${tr("Possible VSL Date", possVsl)}
                    ${tr("Possible ETD", possEtd)}

                </table>
            </div>
        </td>
    </tr>

    <!-- COMMENT -->
    ${(comment || remark) ? `
    <tr>
        <td style="padding:0 28px 20px;">
            <div style="background:#fffbeb;border:1px solid #fde68a;
                border-radius:8px;padding:12px 14px;">
                <div style="font-size:10.5px;font-weight:600;color:#92400e;
                    text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">
                    Commentaires / Remarques
                </div>
                <div style="font-size:12px;color:#78350f;line-height:1.6;">
                    ${(comment + (remark ? "\n" + remark : "")).replace(/\n/g, "<br>")}
                </div>
            </div>
        </td>
    </tr>` : ""}

    <!-- BDC BUTTON -->
    ${bdcUrl ? `
    <tr>
        <td style="padding:0 28px 24px;">
            <a href="${bdcUrl}" target="_blank"
                style="display:inline-flex;align-items:center;gap:8px;
                    padding:11px 20px;background:#1565c0;color:#fff;
                    border-radius:8px;text-decoration:none;
                    font-size:13px;font-weight:600;">
                📄 Ouvrir le Bon de Commande
            </a>
        </td>
    </tr>` : ""}

    <!-- FOOTER -->
    <tr>
        <td style="padding:14px 28px;background:#f9fafb;
            border-top:1px solid #e5e7eb;text-align:center;">
            <p style="font-size:11px;color:#9ca3af;margin:0;line-height:1.6;">
                Envoyé depuis <strong style="color:#1565c0;">AW27 Checkers</strong>
                — ${todayCap}
            </p>
        </td>
    </tr>

</table>
</body>
</html>`;
    }

    // ── Envoyer via GAS (réutilise SEND_ALERT_EMAIL sans pièce jointe) ─
    async function sendConfirmEmail(row, recipient) {
        const gasUrl = window.GOOGLE_APPS_SCRIPT_URL;
        if (!gasUrl || gasUrl === "YOUR_WEB_APP_URL_HERE") {
            throw new Error("URL Google Apps Script non configurée.");
        }

        const style   = row["Cust Style Ref"] || row["Style"] || "—";
        const client  = row["Client"] || row["Coll"] || "—";
        const today   = new Date().toISOString().slice(0, 10);
        const subject = `AW27 — Confirmation commande ${style} · ${client} · ${today}`;

        const res = await fetch(gasUrl, {
            method:   "POST",
            headers:  { "Content-Type": "text/plain;charset=utf-8" },
            redirect: "follow",
            body: JSON.stringify({
                action:    "SEND_ALERT_EMAIL",
                recipient,
                subject,
                htmlBody:  buildEmailHTML(row),
                xlsxBase64: "",
                fileName:   ""
            })
        });

        const json = await res.json();
        if (json.status !== "ok") throw new Error(json.message || "Erreur GAS");
    }

    // ── Mini champ pour le récap modal ────────────────────────
    function _miniField(label, value) {
        if (!value || value === "—" || String(value).trim() === "") return "";
        return `<div style="display:flex;flex-direction:column;gap:2px;">
            <span style="font-size:10px;color:var(--text-muted,#9ca3af);
                text-transform:uppercase;letter-spacing:.05em;">${label}</span>
            <span style="font-size:12px;font-weight:500;
                color:var(--text-primary,#111827);">${value}</span>
        </div>`;
    }

    // ── Ouvrir la modale ──────────────────────────────────────
    function openConfirmModal(row, alreadySent) {
        document.getElementById("order-confirm-modal")?.remove();

        const style   = row["Cust Style Ref"] || row["Style"] || "—";
        const client  = row["Client"] || row["Coll"] || "—";
        const season  = row["Full Season"] || row["SEASON"] || "";
        const lastEmail = localStorage.getItem(LAST_EMAIL_KEY) || "";

        const modal = document.createElement("div");
        modal.id = "order-confirm-modal";
        modal.className = "modal-overlay";
        modal._row = row;

        modal.innerHTML = `
        <div class="modal" style="max-width:510px;">
            <div class="modal-header">
                <div>
                    <div class="modal-title">🎉 Commande prête à confirmer</div>
                    <div class="modal-subtitle">
                        ${style} · ${client}${season ? " · " + season : ""}
                    </div>
                </div>
                <button class="btn-close"
                    onclick="document.getElementById('order-confirm-modal').remove()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body"
                style="padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:14px;">

                ${alreadySent ? `
                <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;
                    background:#fef9c3;border:1px solid #fde68a;border-radius:8px;
                    font-size:12px;color:#92400e;">
                    ⚠️ Une confirmation a déjà été envoyée pour ce style.
                    Tu peux quand même en envoyer une nouvelle ci-dessous.
                </div>` : ""}

                <!-- Badges 3 conditions -->
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <span style="padding:4px 10px;border-radius:20px;
                        background:#f0fdf4;border:0.5px solid #86efac;
                        font-size:11px;font-weight:600;color:#166534;">
                        ✓ PO RECEIVED
                    </span>
                    <span style="padding:4px 10px;border-radius:20px;
                        background:#f0fdf4;border:0.5px solid #86efac;
                        font-size:11px;font-weight:600;color:#166534;">
                        ✓ CRP CONFIRMED
                    </span>
                    <span style="padding:4px 10px;border-radius:20px;
                        background:#f0fdf4;border:0.5px solid #86efac;
                        font-size:11px;font-weight:600;color:#166534;">
                        ✓ BDC joint
                    </span>
                </div>

                <!-- Mini récap -->
                <div style="background:var(--surface-1,#f9fafb);
                    border:0.5px solid var(--border,#e5e7eb);border-radius:8px;
                    padding:12px 14px;
                    display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    ${_miniField("CTL Style Ref",  row["CTLStyleRef"])}
                    ${_miniField("Age Group",       row["Age Group"])}
                    ${_miniField("Conf Total",      row["Conf Total"])}
                    ${_miniField("Approved Price",  row["Approved Price $"] ? "$" + row["Approved Price $"] : "")}
                    ${_miniField("PO Deadline",     _fmtDate(row["PO Deadline"]))}
                    ${_miniField("Possible ETD",    _fmtDate(row["Possible etd"]))}
                </div>

                <!-- Email -->
                <div>
                    <label class="form-label" style="margin-bottom:5px;">
                        Envoyer la confirmation à
                        <span style="color:var(--danger,#dc2626)">*</span>
                    </label>
                    <input id="order-confirm-email" class="form-input" type="email"
                        placeholder="email@example.com"
                        value="${lastEmail}"
                        style="width:100%;box-sizing:border-box;"/>
                </div>

                <!-- Actions -->
                <div style="display:flex;gap:8px;justify-content:flex-end;padding-top:4px;">
                    <button class="btn btn-ghost"
                        onclick="document.getElementById('order-confirm-modal').remove()">
                        Ignorer
                    </button>
                    <button class="btn btn-primary" id="order-confirm-send-btn"
                        onclick="window._sendOrderConfirm()">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" width="13" height="13">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                        Envoyer la confirmation
                    </button>
                </div>
            </div>
        </div>`;

        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add("open"));
    }

    // ── Exposer buildEmailHTML pour order-confirm-scan.js ─────
    // Fonction directe expo pour order-confirm-scan.js
    window._directSendOrderConfirm = async function(row, recipient) {
        await sendConfirmEmail(row, recipient);
    };

    // ── Handler envoi exposé globalement ──────────────────────
    window._sendOrderConfirm = async function() {
        const modal = document.getElementById("order-confirm-modal");
        if (!modal) return;
        const row       = modal._row;
        const recipient = (document.getElementById("order-confirm-email")?.value || "").trim();

        if (!recipient) {
            typeof showToast === "function" && showToast("Entrez un email destinataire.", "error");
            document.getElementById("order-confirm-email")?.focus();
            return;
        }

        const btn = document.getElementById("order-confirm-send-btn");
        if (btn) { btn.disabled = true; btn.textContent = "Envoi en cours…"; }
        typeof showToast === "function" && showToast("Envoi en cours…", "info", 8000);

        try {
            await sendConfirmEmail(row, recipient);
            markAsSent(row);
            localStorage.setItem(LAST_EMAIL_KEY, recipient);
            modal.remove();
            typeof showToast === "function" &&
                showToast(`✅ Confirmation envoyée à ${recipient}`, "success", 5000);
        } catch(err) {
            if (btn) { btn.disabled = false; btn.textContent = "Réessayer"; }
            typeof showToast === "function" && showToast("Erreur : " + err.message, "error");
        }
    };

    // ── Point d'entrée principal (exposé sur window) ──────────
    window.checkAndNotifyOrderConfirm = function(rowIndex) {
        const rows = window.state?.data?.details || [];
        const row  = rows.find(r => r._rowIndex === rowIndex);
        if (!row) return;
        if (!checkConditions(row)) return;
        const alreadySent = hasSentNotification(row);
        openConfirmModal(row, alreadySent);
    };

    // ── Patch quickUpdate (édition inline) ────────────────────
    function patchQuickUpdate() {
        if (window._ocnQUPatched) return;
        const orig = window.quickUpdate;
        if (typeof orig !== "function") return;
        window._ocnQUPatched = true;

        window.quickUpdate = async function(rowIndex, field, value, sheet) {
            const result = await orig.apply(this, arguments);
            if (sheet === "details" &&
                ["Order Status", "CRP Status", "BDC_URL"].includes(field)) {
                setTimeout(() => window.checkAndNotifyOrderConfirm(rowIndex), 350);
            }
            return result;
        };
    }

    // ── Patch saveForm (modal d'édition) ──────────────────────
    function patchSaveForm() {
        if (window._ocnSFPatched) return;
        const orig = window.saveForm;
        if (typeof orig !== "function") return;
        window._ocnSFPatched = true;

        window.saveForm = async function() {
            const rowIndex    = window.state?.editingRow;
            const activeSheet = window.state?.activeSheet;
            await orig.apply(this, arguments);
            if (activeSheet === "details" && rowIndex) {
                setTimeout(() => window.checkAndNotifyOrderConfirm(rowIndex), 500);
            }
        };
    }

    // ── Init ──────────────────────────────────────────────────
    function init() {
        const tryPatch = () => {
            if (typeof window.quickUpdate === "function" &&
                typeof window.saveForm    === "function") {
                patchQuickUpdate();
                patchSaveForm();
                console.log("[AW27] Order Confirm Notify ✓");
            } else {
                setTimeout(tryPatch, 300);
            }
        };
        tryPatch();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 700);
    }

})();
