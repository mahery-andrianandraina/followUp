// ================================================================
//  AW27 — Order Confirm Scanner
//  Bouton manuel qui scanne toutes les lignes Details et liste
//  les styles éligibles (3 con ditions réunies) dans une modale.
//  Charger après order-confirm-notify.js dans index.html.
// ================================================================

(function initOrderConfirmScan() {

    // ── Styles CSS ────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById("ocn-scan-styles")) return;
        const s = document.createElement("style");
        s.id = "ocn-scan-styles";
        s.textContent = `
        #btn-order-scan {
            display: flex; align-items: center; justify-content: center;
            width: 34px; height: 34px; border-radius: 50%; padding: 0;
            background: var(--surface-1, #f3f4f6);
            border: 1px solid var(--border, #e5e7eb);
            color: var(--text-secondary, #6b7280); cursor: pointer;
            transition: background .15s, color .15s;
            position: relative;
        }
        #btn-order-scan:hover {
            background: var(--surface-0, #f0fdf4); color: #166534;
        }
        #btn-order-scan .ocn-scan-badge {
            display: inline-flex; align-items: center; justify-content: center;
            min-width: 17px; height: 17px; padding: 0 4px;
            border-radius: 20px; background: #ef4444; color: #fff;
            font-size: 10px; font-weight: 700; line-height: 1;
        }

        /* Modale scan */
        .ocn-scan-row {
            display: flex; align-items: center; gap: 12px;
            padding: 12px 16px;
            border-bottom: 0.5px solid var(--border, #e5e7eb);
            transition: background .1s;
        }
        .ocn-scan-row:last-child { border-bottom: none; }
        .ocn-scan-row:hover { background: var(--surface-1, #f9fafb); }
        .ocn-scan-info { flex: 1; min-width: 0; }
        .ocn-scan-style {
            font-size: 13px; font-weight: 500;
            color: var(--text-primary, #111827);
        }
        .ocn-scan-meta {
            font-size: 11px; color: var(--text-muted, #9ca3af);
            margin-top: 2px; white-space: nowrap;
            overflow: hidden; text-overflow: ellipsis;
        }
        .ocn-sent-badge {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 2px 8px; border-radius: 20px;
            background: #fef9c3; border: 0.5px solid #fde68a;
            font-size: 10px; font-weight: 600; color: #92400e;
            white-space: nowrap; flex-shrink: 0;
        }
        .ocn-new-badge {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 2px 8px; border-radius: 20px;
            background: #f0fdf4; border: 0.5px solid #86efac;
            font-size: 10px; font-weight: 600; color: #166534;
            white-space: nowrap; flex-shrink: 0;
        }
        .ocn-scan-send-btn {
            display: inline-flex; align-items: center; gap: 5px;
            padding: 5px 12px; border-radius: 7px;
            background: var(--surface-2, #f3f4f6);
            border: 0.5px solid var(--border-strong, #d1d5db);
            color: var(--text-primary, #374151);
            font-size: 11px; font-weight: 500; font-family: inherit;
            cursor: pointer; white-space: nowrap; flex-shrink: 0;
            transition: all .15s;
        }
        .ocn-scan-send-btn:hover {
            background: #1565c0; color: #fff; border-color: #1565c0;
        }
        .ocn-scan-send-btn:disabled {
            opacity: .45; cursor: not-allowed;
        }
        .ocn-scan-send-btn.sent {
            background: #f0fdf4; color: #166534;
            border-color: #86efac; cursor: default;
        }

        @keyframes ocn-spin { to { transform: rotate(360deg); } }
        .ocn-spin {
            display: inline-block;
            animation: ocn-spin .7s linear infinite;
        }

        /* Email inline input dans la row */
        .ocn-email-wrap {
            display: none; align-items: center; gap: 6px;
            padding: 8px 16px 10px 16px;
            background: var(--surface-1, #f9fafb);
            border-bottom: 0.5px solid var(--border, #e5e7eb);
        }
        .ocn-email-wrap.open { display: flex; }
        .ocn-email-input {
            flex: 1; border: 1px solid var(--border-strong, #d1d5db);
            border-radius: 7px; padding: 6px 10px;
            font-size: 12px; font-family: inherit;
            background: var(--surface-2, #fff);
            color: var(--text-primary, #111827); outline: none;
        }
        .ocn-email-input:focus { border-color: #1565c0; }
        .ocn-email-confirm {
            padding: 6px 12px; border-radius: 7px;
            background: #1565c0; color: #fff; border: none;
            font-size: 11px; font-weight: 600; font-family: inherit;
            cursor: pointer; white-space: nowrap; flex-shrink: 0;
        }
        .ocn-email-cancel {
            padding: 6px 10px; border-radius: 7px;
            background: none; border: 0.5px solid var(--border-strong, #d1d5db);
            color: var(--text-secondary, #6b7280); font-size: 11px;
            font-family: inherit; cursor: pointer; flex-shrink: 0;
        }
        `;
        document.head.appendChild(s);
    }

    // ── Récupérer les styles éligibles ────────────────────────
    function getEligibleRows() {
        const rows = window.state?.data?.details || [];
        return rows.filter(row => {
            const orderStatus = String(row["Order Status"] || "").trim();
            const crpStatus   = String(row["CRP Status"]   || "").trim().toLowerCase();
            const bdcUrl      = String(row["BDC_URL"]       || "").trim();
            return orderStatus === "PO RECEIVED" &&
                   crpStatus.includes("confirm") &&
                   bdcUrl.length > 0;
        });
    }

    // ── Récupérer les styles déjà notifiés ────────────────────
    function _getSentSet() {
        try { return new Set(JSON.parse(localStorage.getItem("aw27_order_confirm_sent") || "[]")); }
        catch(e) { return new Set(); }
    }

    function _styleKey(row) {
        return (row["Cust Style Ref"] || row["Style"] || "") +
               "__" + (row["Client"] || row["Coll"] || "");
    }

    function _markSent(row) {
        const sent = _getSentSet();
        sent.add(_styleKey(row));
        try { localStorage.setItem("aw27_order_confirm_sent", JSON.stringify([...sent])); } catch(e) {}
    }

    // ── Envoyer un email de confirmation pour une ligne ───────
    // Délègue à window._directSendOrderConfirm exposé par order-confirm-notify.js
    async function _sendOneConfirmEmail(row, recipient) {
        if (typeof window._directSendOrderConfirm !== "function") {
            throw new Error(
                "order-confirm-notify.js doit être chargé avant order-confirm-scan.js."
            );
        }
        await window._directSendOrderConfirm(row, recipient);
    }

    // ── Construire la modale ──────────────────────────────────
    function openScanModal() {
        document.getElementById("ocn-scan-modal")?.remove();

        const eligible = getEligibleRows();
        const sentSet  = _getSentSet();
        const lastEmail= localStorage.getItem("aw27_order_confirm_last_email") || "";

        const modal = document.createElement("div");
        modal.id = "ocn-scan-modal";
        modal.className = "modal-overlay";

        const newCount  = eligible.filter(r => !sentSet.has(_styleKey(r))).length;
        const sentCount = eligible.filter(r =>  sentSet.has(_styleKey(r))).length;

        // ── Header stats
        const statsHtml = `
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:4px;">
            <div style="display:flex;align-items:center;gap:6px;padding:6px 12px;
                border-radius:8px;background:#f0fdf4;border:0.5px solid #86efac;">
                <span style="font-size:18px;font-weight:700;color:#166534;">${newCount}</span>
                <span style="font-size:11px;color:#166534;">à notifier</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;padding:6px 12px;
                border-radius:8px;background:#fef9c3;border:0.5px solid #fde68a;">
                <span style="font-size:18px;font-weight:700;color:#92400e;">${sentCount}</span>
                <span style="font-size:11px;color:#92400e;">déjà envoyé${sentCount > 1 ? "s" : ""}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;padding:6px 12px;
                border-radius:8px;background:var(--surface-1,#f9fafb);
                border:0.5px solid var(--border,#e5e7eb);">
                <span style="font-size:18px;font-weight:700;color:var(--text-primary,#111);">${eligible.length}</span>
                <span style="font-size:11px;color:var(--text-secondary,#6b7280);">total</span>
            </div>
        </div>`;

        // ── Ligne par style éligible
        const rowsHtml = eligible.length === 0
            ? `<div style="padding:2.5rem;text-align:center;color:var(--text-muted,#9ca3af);font-size:13px;">
                Aucun style avec les 3 conditions réunies pour le moment.
               </div>`
            : eligible.map((row, idx) => {
                const alreadySent = sentSet.has(_styleKey(row));
                const style    = row["Cust Style Ref"] || row["Style"] || "—";
                const client   = row["Client"] || row["Coll"] || "—";
                const season   = row["Full Season"] || row["SEASON"] || "";
                const confTotal= row["Conf Total"] || "";
                const appPrice = row["Approved Price $"] ? `$${row["Approved Price $"]}` : "";
                const etd      = row["Possible etd"] ? new Date(row["Possible etd"])
                    .toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" }) : "";

                const metaParts = [client, season, confTotal ? confTotal + " u." : "", appPrice, etd ? "ETD " + etd : ""].filter(Boolean);

                return `
                <div class="ocn-scan-row" id="ocn-row-${idx}">
                    <div class="ocn-scan-info">
                        <div class="ocn-scan-style">${style}</div>
                        <div class="ocn-scan-meta">${metaParts.join(" · ")}</div>
                    </div>
                    ${alreadySent
                        ? `<span class="ocn-sent-badge">⚠ déjà envoyé</span>`
                        : `<span class="ocn-new-badge">✓ prêt</span>`
                    }
                    <button class="ocn-scan-send-btn" id="ocn-btn-${idx}"
                        onclick="window._ocnToggleEmail(${idx})">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" width="11" height="11">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                        ${alreadySent ? "Renvoyer" : "Envoyer"}
                    </button>
                </div>
                <div class="ocn-email-wrap" id="ocn-email-wrap-${idx}">
                    <input class="ocn-email-input" id="ocn-email-${idx}"
                        type="email" placeholder="email@example.com"
                        value="${lastEmail}"/>
                    <button class="ocn-email-confirm"
                        onclick="window._ocnSendOne(${idx}, ${row._rowIndex})">
                        Confirmer l'envoi
                    </button>
                    <button class="ocn-email-cancel"
                        onclick="window._ocnToggleEmail(${idx})">
                        Annuler
                    </button>
                </div>`;
            }).join("");

        modal.innerHTML = `
        <div class="modal" style="max-width:600px;">
            <div class="modal-header">
                <div>
                    <div class="modal-title">
                        📋 Commandes prêtes à notifier
                    </div>
                    <div class="modal-subtitle">
                        Styles avec PO RECEIVED + CRP CONFIRMED + BDC joint
                    </div>
                </div>
                <button class="btn-close"
                    onclick="document.getElementById('ocn-scan-modal').remove()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body" style="padding:1rem 1.5rem 0.5rem;
                display:flex;flex-direction:column;gap:12px;">
                ${statsHtml}
            </div>
            <div style="max-height:420px;overflow-y:auto;border-top:0.5px solid var(--border,#e5e7eb);">
                ${rowsHtml}
            </div>
            <div style="padding:12px 16px;border-top:0.5px solid var(--border,#e5e7eb);
                text-align:right;">
                <button class="btn btn-ghost"
                    onclick="document.getElementById('ocn-scan-modal').remove()">
                    Fermer
                </button>
            </div>
        </div>`;

        // Stocker les rows pour accès depuis les handlers
        modal._eligible = eligible;
        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add("open"));
    }

    // ── Toggle champ email inline ─────────────────────────────
    window._ocnToggleEmail = function(idx) {
        const wrap = document.getElementById(`ocn-email-wrap-${idx}`);
        if (!wrap) return;
        const isOpen = wrap.classList.contains("open");
        // Fermer tous les autres
        document.querySelectorAll(".ocn-email-wrap.open").forEach(w => w.classList.remove("open"));
        if (!isOpen) {
            wrap.classList.add("open");
            setTimeout(() => document.getElementById(`ocn-email-${idx}`)?.focus(), 50);
        }
    };

    // ── Envoyer pour une ligne ────────────────────────────────
    window._ocnSendOne = async function(idx, rowIndex) {
        const modal = document.getElementById("ocn-scan-modal");
        if (!modal) return;

        const recipient = (document.getElementById(`ocn-email-${idx}`)?.value || "").trim();
        if (!recipient) {
            typeof showToast === "function" && showToast("Entrez un email.", "error");
            document.getElementById(`ocn-email-${idx}`)?.focus();
            return;
        }

        const row = (window.state?.data?.details || []).find(r => r._rowIndex === rowIndex);
        if (!row) { typeof showToast === "function" && showToast("Ligne introuvable.", "error"); return; }

        const btn       = document.getElementById(`ocn-btn-${idx}`);
        const origLabel = btn?.innerHTML;
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="ocn-spin">⏳</span>`;
        }

        try {
            await _sendOneConfirmEmail(row, recipient);
            _markSent(row);
            localStorage.setItem("aw27_order_confirm_last_email", recipient);

            // Mettre à jour la row visuellement
            const wrap = document.getElementById(`ocn-email-wrap-${idx}`);
            if (wrap) wrap.classList.remove("open");

            if (btn) {
                btn.innerHTML = `✓ Envoyé`;
                btn.classList.add("sent");
                btn.disabled = true;
                btn.onclick  = null;
            }

            // Remplacer le badge "prêt" par "déjà envoyé"
            const rowEl = document.getElementById(`ocn-row-${idx}`);
            if (rowEl) {
                const newBadge = rowEl.querySelector(".ocn-new-badge");
                if (newBadge) {
                    newBadge.className = "ocn-sent-badge";
                    newBadge.textContent = "⚠ déjà envoyé";
                }
            }

            typeof showToast === "function" &&
                showToast(`✅ Confirmation envoyée à ${recipient}`, "success", 4000);

            // Mettre à jour le compteur du bouton header
            _refreshHeaderBadge();

        } catch(err) {
            if (btn) { btn.disabled = false; btn.innerHTML = origLabel; }
            typeof showToast === "function" && showToast("Erreur : " + err.message, "error");
        }
    };

    // ── Mettre à jour le badge du bouton header ───────────────
    function _refreshHeaderBadge() {
        const eligible  = getEligibleRows();
        const sentSet   = _getSentSet();
        const newCount  = eligible.filter(r => !sentSet.has(_styleKey(r))).length;
        const badge = document.getElementById("btn-order-scan-badge");
        if (!badge) return;
        if (newCount > 0) {
            badge.textContent = newCount;
            badge.style.display = "inline-flex";
        } else {
            badge.style.display = "none";
        }
    }

    // ── Injecter le bouton dans le header ─────────────────────
    // Exposer pour le menu Actions
    window._ocsOpenScanModal = openScanModal;

    function injectHeaderButton() { /* intégré au menu Actions de style-components.js */ }

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

        console.log("[AW27] Order Confirm Scanner ✓");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 900);
    }

})();
