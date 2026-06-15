// ============================================================
//  AW27 CHECKERS — Smart Ordering Alerts Extension
//  Fichier : orderingAlerts.js
//  v2 — correction faux positifs artwork_block + qty_mismatch
// ============================================================

(function() {

    // ── Helpers ───────────────────────────────────────────────
    function daysDiff(dateVal) {
        if (!dateVal) return null;
        const d = new Date(dateVal); d.setHours(0,0,0,0);
        const t = new Date(); t.setHours(0,0,0,0);
        return Math.round((d - t) / 86400000);
    }

    function fmtDate(v) {
        if (!v) return "—";
        try { return new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }); }
        catch(_) { return String(v); }
    }

    // Cherche une colonne de quantité dans une ligne ordering
    // Retourne { key, value } ou null si aucune colonne trouvée
    function findQtyField(row) {
        const QTY_KEYS = [
            "order qty", "ordered qty", "qty ordered", "qty cmd",
            "quantité commandée", "order quantity", "qty", "quantity", "quantité"
        ];
        const key = Object.keys(row).find(k =>
            QTY_KEYS.includes(k.toLowerCase().trim()) && !k.match(/date|stat|url/i)
        );
        if (!key) return null;
        const value = parseFloat(String(row[key] || "0").replace(/[^0-9.-]/g, "")) || 0;
        return { key, value };
    }

    // ── Enregistrement du collecteur ──────────────────────────
    window.smartAlertsCollectors = window.smartAlertsCollectors || [];
    window.smartAlertsCollectors.push(function collectOrderingAlerts(st) {
        const details  = st.details  || [];
        const ordering = st.ordering || [];
        const alerts   = [];

        console.log("[orderingAlerts] Collecteur appelé —", details.length, "styles,", ordering.length, "commandes");

        const norm = v => String(v || "").replace(/[\s\-_]/g, "").toLowerCase();

        details.forEach(row => {
            const styleCode = row["Cust Style Ref"] || row.Style || "";
            const client    = row.Client || row["Coll"] || "";
            if (!styleCode) return;

            // Commandes actives pour ce style
            const styleOrders = ordering.filter(o =>
                norm(o.Description || o.Style) === norm(styleCode)
            );
            if (!styleOrders.length) return;

            const confirmedOrders = styleOrders.filter(o => o.Status === "Confirmed");

            // ── 1. Conflit planning : Ready Date > Ex-Fty ────────
            const exFtyRaw = row["Possible etd"] || row["Possible Vsl date"] || "";
            if (exFtyRaw) {
                const exFtyDate = new Date(exFtyRaw);
                exFtyDate.setHours(0,0,0,0);

                confirmedOrders.forEach(o => {
                    if (!o["Ready Date"]) return;
                    const readyDate = new Date(o["Ready Date"]);
                    readyDate.setHours(0,0,0,0);

                    if (readyDate > exFtyDate) {
                        alerts.push({
                            type:       "planning_conflict",
                            severity:   "danger",
                            style:      styleCode,
                            client,
                            title:      `Style ${styleCode} — Conflit Planning (Ready > Ex-Fty)`,
                            shortTitle: `Ex-Fty < Ready [${styleCode}]`,
                            details: [
                                `Ready Date : ${fmtDate(o["Ready Date"])}`,
                                `Ex-Fty prévue : ${fmtDate(exFtyRaw)}`,
                                `Supplier : ${o.Supplier || "Non défini"}`
                            ],
                            action:   "Négocier une avance de production ou décaler le booking navire",
                            icon:     "clock",
                            sheet:    "ordering",
                            rowIndex: o._rowIndex
                        });
                    }
                });
            }

            // ── 2. PI Manquante pour PO Confirmé ─────────────────
            // Seulement si PO Date est renseignée (la commande est réelle)
            confirmedOrders.forEach(o => {
                const hasPODate = (o["PO Date"] || "").trim();
                if (!hasPODate) return; // pas de PO Date = commande non finalisée, on ignore

                const hasNoPI = !(o.PI || "").trim() && !(o["PI URL"] || "").trim();
                const poDays  = daysDiff(o["PO Date"]);

                // Plus de 5 jours depuis le PO et toujours pas de PI
                if (hasNoPI && poDays !== null && Math.abs(poDays) > 5) {
                    alerts.push({
                        type:       "missing_pi",
                        severity:   "warn",
                        style:      styleCode,
                        client,
                        title:      `Style ${styleCode} — PI Manquante pour PO Confirmé`,
                        shortTitle: `PI Manquante [${styleCode}]`,
                        details: [
                            `Confirmé le : ${fmtDate(o["PO Date"])} (${Math.abs(poDays)}j sans PI)`,
                            `Supplier : ${o.Supplier || "Non défini"}`
                        ],
                        action:   "Relancer le fournisseur pour obtenir la Proforma Invoice",
                        icon:     "alert",
                        sheet:    "ordering",
                        rowIndex: o._rowIndex
                    });
                }
            });

            // ── 3. Artwork Bloquant ───────────────────────────────
            // CORRECTION : n'alerter QUE si le champ "Artwork Approval" est
            // EXPLICITEMENT "Pending" ou "Rejected" (pas vide = artwork non suivi)
            confirmedOrders.forEach(o => {
                const artworkApproval = (o["Artwork Approval"] || "").trim();
                const artworkIsTracked = artworkApproval.length > 0; // Le champ est renseigné
                const artworkBlocked  = artworkApproval === "Pending" || artworkApproval === "Rejected";

                if (!artworkIsTracked || !artworkBlocked) return; // Artwork non suivi ou déjà approuvé

                const readyDiff = daysDiff(o["Ready Date"]);
                if (readyDiff === null || readyDiff > 14 || readyDiff < 0) return;

                alerts.push({
                    type:       "artwork_block",
                    severity:   artworkApproval === "Rejected" ? "danger" : "warn",
                    style:      styleCode,
                    client,
                    title:      `Style ${styleCode} — Artwork ${artworkApproval} (Prêt dans ${readyDiff}j)`,
                    shortTitle: `Artwork [${styleCode}]`,
                    details: [
                        `Ready Date : ${fmtDate(o["Ready Date"])}`,
                        `Statut Artwork : ${artworkApproval}`
                    ],
                    action:   artworkApproval === "Rejected"
                        ? "Soumettre une correction et relancer l'approbation en urgence"
                        : "Valider l'artwork avant la mise en production",
                    icon:     "alert",
                    sheet:    "ordering",
                    rowIndex: o._rowIndex
                });
            });

            // ── 4. Incohérence de quantité commandée ─────────────
            // CORRECTION : n'alerter QUE si les lignes ordering ont bien un
            // champ quantité (sinon confirmedQty = 0 = faux positif garanti)
            const expectedQty = +row["Conf Total"] || +row["OrderQty"] || +row["Target Qty"] || 0;
            if (expectedQty > 0) {
                const activeOrders = styleOrders.filter(o => o.Status !== "Cancelled");

                // Vérifier si AU MOINS UNE ligne ordering a un champ quantité reconnu
                const qtyFields = activeOrders.map(o => findQtyField(o)).filter(Boolean);
                if (qtyFields.length === 0) return; // Pas de champ quantité dans ordering → on n'alerte pas

                const confirmedQty = qtyFields.reduce((sum, f) => sum + f.value, 0);

                // N'alerter que si l'écart est significatif (> 0 et différent)
                if (confirmedQty > 0 && confirmedQty !== expectedQty) {
                    const diff = confirmedQty - expectedQty;
                    alerts.push({
                        type:       "qty_mismatch",
                        severity:   "warn",
                        style:      styleCode,
                        client,
                        title:      `Style ${styleCode} — Écart Qty (Attendu: ${expectedQty.toLocaleString("fr-FR")} / Cmd: ${confirmedQty.toLocaleString("fr-FR")})`,
                        shortTitle: `Écart Qty [${styleCode}]`,
                        details: [
                            `Attendu (Details) : ${expectedQty.toLocaleString("fr-FR")} unités`,
                            `Alloué (Ordering) : ${confirmedQty.toLocaleString("fr-FR")} unités`,
                            diff > 0
                                ? `⚠️ Excédent de ${diff.toLocaleString("fr-FR")} unités`
                                : `⚠️ Manque de ${Math.abs(diff).toLocaleString("fr-FR")} unités`
                        ],
                        action:   "Vérifier la répartition des volumes ou corriger la saisie",
                        icon:     "sample",
                        sheet:    "details",
                        rowIndex: row._rowIndex
                    });
                }
            }
        });

        console.log("[orderingAlerts] Alertes générées :", alerts.length, alerts.map(a => a.type));
        return alerts;
    });

    console.log("[AW27] Extension Alertes Ordering Chargée ✓ v2 — Collecteurs :", window.smartAlertsCollectors.length);

})();
