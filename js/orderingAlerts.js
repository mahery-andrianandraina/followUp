// ============================================================
//  AW27 CHECKERS — Smart Ordering Alerts Extension
//  Fichier : orderingAlerts.js
// ============================================================

(function() {

    // Helper functions
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

    function findQtyValue(row) {
        const key = Object.keys(row).find(k => 
            ["order qty", "ordered qty", "qty ordered", "qty cmd", "quantité commandée", "order quantity", "qty", "quantity", "quantité"].includes(k.toLowerCase().trim())
        );
        return key ? parseFloat(String(row[key] || "0").replace(/[^0-9.-]/g, "")) || 0 : 0;
    }

    // Register our custom alerts collector
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

            // Filtrer les commandes pour ce style
            const styleOrders = ordering.filter(o =>
                norm(o.Description || o.Style) === norm(styleCode)
            );

            // ── 1. Ready Date vs Ex-Fty (Conflit de planning) ──
            const exFtyRaw = row["Possible etd"] || row["Possible Vsl date"] || "";
            if (exFtyRaw) {
                styleOrders.forEach(o => {
                    if (o.Status === "Confirmed" && o["Ready Date"]) {
                        const readyDate = new Date(o["Ready Date"]);
                        const exFtyDate = new Date(exFtyRaw);
                        readyDate.setHours(0,0,0,0);
                        exFtyDate.setHours(0,0,0,0);

                        if (readyDate > exFtyDate) {
                            alerts.push({
                                type:      "planning_conflict",
                                severity:  "danger",
                                style:     styleCode,
                                client,
                                title:     "Ready Date > Ex-Fty (Retard)",
                                shortTitle: "Ready Date > Ex-Fty",
                                details:   [
                                    `Ready Date : ${fmtDate(o["Ready Date"])}`,
                                    `Ex-Fty : ${fmtDate(exFtyRaw)}`,
                                    `Supplier : ${o.Supplier || "Non défini"}`
                                ],
                                action:    "Négocier une avance de production ou décaler le booking navire",
                                icon:      "clock",
                                sheet:     "ordering",
                                rowIndex:  o._rowIndex
                            });
                        }
                    }
                });
            }

            // ── 2. PI Manquante pour PO Confirmé ──
            styleOrders.forEach(o => {
                const hasNoPI = !(o.PI || "").trim() && !(o["PI URL"] || "").trim();
                const poDays = o["PO Date"] ? daysDiff(o["PO Date"]) : null;

                // Alerte si la commande est confirmée mais sans PI après 5 jours
                if (o.Status === "Confirmed" && hasNoPI && poDays !== null && Math.abs(poDays) > 5) {
                    alerts.push({
                        type:      "missing_pi",
                        severity:  "warn",
                        style:     styleCode,
                        client,
                        title:     "PI Manquante pour PO Confirmé",
                        shortTitle: "PI Manquante",
                        details:   [
                            `Confirmé le : ${fmtDate(o["PO Date"])} (${Math.abs(poDays)} jours sans PI)`,
                            `Supplier : ${o.Supplier || "Non défini"}`
                        ],
                        action:    "Relancer le fournisseur pour obtenir la Proforma Invoice",
                        icon:      "alert",
                        sheet:     "ordering",
                        rowIndex:  o._rowIndex
                    });
                }
            });

            // ── 3. Artwork Bloquant face à la production ──
            styleOrders.forEach(o => {
                const readyDiff = daysDiff(o["Ready Date"]);
                const artworkNotApproved = (o["Artwork Approval"] || "").trim() !== "Approved";

                // Alerte si Artwork non approuvé à moins de 14 jours de la mise en production (Ready Date)
                if (o.Status === "Confirmed" && artworkNotApproved && readyDiff !== null && readyDiff <= 14 && readyDiff >= 0) {
                    alerts.push({
                        type:      "artwork_block",
                        severity:  "danger",
                        style:     styleCode,
                        client,
                        title:     `Artwork non approuvé — Prêt dans ${readyDiff}j`,
                        shortTitle: "Artwork bloquant",
                        details:  [
                            `Ready Date : ${fmtDate(o["Ready Date"])}`,
                            `Statut Artwork : ${o["Artwork Approval"] || "Non soumis"}`
                        ],
                        action:    "Valider l'artwork en urgence ou relancer le client",
                        icon:      "alert",
                        sheet:     "ordering",
                        rowIndex:  o._rowIndex
                    });
                }
            });

            // ── 4. Incohérence de quantité commandée ──
            const expectedQty = +row["Conf Total"] || +row["OrderQty"] || +row["Target Qty"] || 0;
            if (expectedQty > 0 && styleOrders.length > 0) {
                // Sommer les quantités des commandes pour ce style (ignorer les commandes annulées)
                const activeOrders = styleOrders.filter(o => o.Status !== "Cancelled");
                const confirmedQty = activeOrders.reduce((sum, o) => sum + findQtyValue(o), 0);

                if (confirmedQty !== expectedQty) {
                    alerts.push({
                        type:      "qty_mismatch",
                        severity:  "warn",
                        style:     styleCode,
                        client,
                        title:     "Incohérence de quantité commandée",
                        shortTitle: "Écart de Qty",
                        details:   [
                            `Quantité attendue (Details) : ${expectedQty.toLocaleString("fr-FR")}`,
                            `Somme allouée (Ordering) : ${confirmedQty.toLocaleString("fr-FR")}`
                        ],
                        action:    "Vérifier la répartition des volumes ou corriger la saisie des commandes",
                        icon:      "sample",
                        sheet:     "details",
                        rowIndex:  row._rowIndex
                    });
                }
            }
        });

        console.log("[orderingAlerts] Alertes générées :", alerts.length, alerts.map(a => a.type));
        return alerts;
    });

    console.log("[AW27] Extension Alertes Ordering Chargée ✓ — Collecteurs enregistrés :", window.smartAlertsCollectors.length);

})();
