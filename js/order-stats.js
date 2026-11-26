// ============================================================
//  AW27 CHECKERS — Statistiques de commande
//  Fichier : order-stats.js
//  Charger après smartAlerts.js et header-google.js :
//  <script src="js/order-stats.js"></script>
//
//  • Nouvel onglet « Statistiques » dans la barre latérale (sous Dashboard)
//  • Les 5 cartes KPI quittent le dashboard et viennent ici :
//      Total styles · PO reçus · Ex-Fty dépassées · Ex-Fty ≤ 14 j · Alertes actives
//  • 3 graphiques avec les vraies données :
//      - Ex-Fty par semaine   (Details › Possible etd)
//      - Alertes par type     (alertes intelligentes)
//      - Statut des commandes (Ordering › Delivery Status)
//  • Filtre par saison (Details › Full Season) appliqué à toute la page
//  • Le dashboard ne garde que le grand titre et les filtres
// ============================================================

(function initOrderStats() {

    const EXFTY_SOON_DAYS = 14;
    let _season = "";        // "" = toutes les saisons
    let _updatedAt = null;

    function esc(s) {
        return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    const norm = v => String(v || "").replace(/[\s\-_]/g, "").toLowerCase();

    // ── Dates (ISO du Sheet en heure locale, YYYY-MM-DD, JJ/MM/AAAA) ──
    function parseD(v) {
        const s = String(v == null ? "" : v).trim();
        if (!s || /invalid/i.test(s)) return null;
        let m;
        if (/^\d{4}-\d{2}-\d{2}T/.test(s)) { const d = new Date(s); return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
        if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return new Date(+m[1], +m[2] - 1, +m[3]);
        if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return new Date(+m[3], +m[2] - 1, +m[1]);
        return null;
    }
    function today0() { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }
    const dayDiff = d => Math.round((d - today0()) / 86400000);
    function mondayOf(d) { const x = new Date(d); const k = (x.getDay() + 6) % 7; x.setDate(x.getDate() - k); x.setHours(0, 0, 0, 0); return x; }
    function isoWeek(d) {
        const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const day = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - day);
        const y0 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
        return Math.ceil(((x - y0) / 86400000 + 1) / 7);
    }
    const fmtShort = d => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

    // ══════════════════════════════════════════════════════════
    //  DONNÉES
    // ══════════════════════════════════════════════════════════
    function seasonOf(r) { return String(r["Full Season"] || r.SEASON || "").trim(); }

    function data() {
        const st = window.state?.data || {};
        const allDetails = st.details || [];
        const details = _season ? allDetails.filter(r => seasonOf(r) === _season) : allDetails;

        // Styles de la saison (pour filtrer Ordering et les alertes)
        const keys = new Set();
        details.forEach(r => [r["Cust Style Ref"], r.CTLStyleRef, r["CTL Style Ref"], r.Style].forEach(k => { if (k) keys.add(norm(k)); }));
        const inSeason = k => !_season || keys.has(norm(k));

        const ordering = (st.ordering || []).filter(r => inSeason(r.Style) || inSeason(r.Description));
        const alerts = (typeof window.saGetAlerts === "function" ? window.saGetAlerts() : [])
            .filter(a => !_season || [a.style].concat(a.styles || []).some(inSeason));

        const seasons = [...new Set(allDetails.map(seasonOf).filter(Boolean))].sort();
        return { details, ordering, alerts, seasons };
    }

    // ══════════════════════════════════════════════════════════
    //  CSS
    // ══════════════════════════════════════════════════════════
    function injectCSS() {
        if (document.getElementById("os-styles")) return;
        const s = document.createElement("style");
        s.id = "os-styles";
        s.textContent = `
        /* Le dashboard ne garde que le grand titre et les filtres */
        html body #sa-kpi-bar { display: none !important; }
        html body .header .header-title p { display: none !important; }
        html body .header .header-title h1, html body #header-sheet-title { font-size: 28px !important; line-height: 36px !important; font-weight: 400 !important; }

        #stats-screen { display: none; padding: 4px 24px 32px; font-family: "Google Sans", Roboto, "Segoe UI", Arial, sans-serif; color: #1f1f1f; }
        #stats-screen.show { display: block; }
        .os-top { display: flex; align-items: center; gap: 12px; margin: 4px 0 16px; flex-wrap: wrap; }
        .os-upd { font-size: 13px; color: #5f6368; }
        .os-season {
            margin-left: auto; -webkit-appearance: none; appearance: none; height: 32px; border-radius: 8px;
            border: 1px solid #747775; padding: 0 30px 0 12px; font: 500 13.5px Roboto, Arial, sans-serif; color: #444746; cursor: pointer;
            background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23444746'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E") no-repeat right 6px center / 20px;
        }
        .os-season.on { background-color: #d3e3fd; border-color: #d3e3fd; color: #041e49; }

        .os-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin-bottom: 16px; }
        .os-k { display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid #e3e3e3; border-radius: 16px; padding: 14px 16px; transition: box-shadow .15s; }
        .os-k.click { cursor: pointer; }
        .os-k.click:hover { box-shadow: 0 1px 2px rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15); }
        .os-ic { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .os-v { font-size: 26px; line-height: 30px; font-weight: 400; }
        .os-l { font-size: 13px; color: #444746; }
        .os-blue  { background: #d3e3fd; color: #0b57d0; } .os-green { background: #e6f4ea; color: #137333; }
        .os-red   { background: #fce8e6; color: #c5221f; } .os-amber { background: #fef7e0; color: #b06000; }

        .os-grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 12px; }
        @media (max-width: 1000px) { .os-grid { grid-template-columns: 1fr; } }
        .os-box { background: #fff; border: 1px solid #e3e3e3; border-radius: 16px; padding: 16px 18px; min-width: 0; }
        .os-bt { font-size: 15px; font-weight: 500; margin-bottom: 2px; }
        .os-bs { font-size: 12.5px; color: #5f6368; margin-bottom: 14px; }
        .os-empty { font-size: 13px; color: #5f6368; padding: 24px 0; text-align: center; }

        /* Barres verticales (Ex-Fty par semaine) */
        .os-weeks { display: flex; align-items: flex-end; gap: 8px; height: 190px; padding-top: 18px; border-bottom: 1px solid #e3e3e3; }
        .os-wcol { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; min-width: 0; }
        .os-wbar { width: 100%; max-width: 42px; border-radius: 6px 6px 0 0; background: #a8c7fa; position: relative; transition: filter .15s; min-height: 2px; }
        .os-wbar:hover { filter: brightness(.92); }
        .os-wbar.past { background: #f28b82; } .os-wbar.now { background: #0b57d0; }
        .os-wn { font-size: 11.5px; color: #444746; margin-bottom: 4px; font-weight: 500; }
        .os-wl { display: flex; gap: 8px; margin-top: 6px; }
        .os-wl span { flex: 1; text-align: center; font-size: 11px; color: #5f6368; min-width: 0; }
        .os-wl span.now { color: #0b57d0; font-weight: 500; }
        .os-leg { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: #444746; margin-top: 12px; }
        .os-leg i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }

        /* Barres horizontales (Alertes par type) */
        .os-hb { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 13px; color: #444746; }
        .os-hb .lbl { width: 130px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .os-hb .tr { flex: 1; height: 12px; border-radius: 6px; background: #e9eef6; overflow: hidden; }
        .os-hb .fl { height: 100%; border-radius: 6px; }
        .os-hb .n { width: 24px; text-align: right; font-weight: 500; color: #1f1f1f; }

        /* Barre empilée (Statut des commandes) */
        .os-stack { display: flex; height: 14px; border-radius: 7px; overflow: hidden; background: #e9eef6; margin: 6px 0 10px; }
        .os-stack div { height: 100%; }
        .os-sl { display: flex; flex-direction: column; gap: 8px; }
        .os-sl div { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #444746; }
        .os-sl b { margin-left: auto; font-weight: 500; color: #1f1f1f; }
        .os-sl i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
        `;
        document.head.appendChild(s);
    }

    // ══════════════════════════════════════════════════════════
    //  ONGLET + ÉCRAN
    // ══════════════════════════════════════════════════════════
    function ensureNav() {
        if (document.getElementById("tab-stats")) return true;
        const dash = document.getElementById("tab-dashboard");
        if (!dash) return false;
        const b = document.createElement("button");
        b.className = "nav-item"; b.id = "tab-stats";
        b.setAttribute("role", "tab"); b.setAttribute("aria-selected", "false");
        b.innerHTML = `<span class="nav-icon"><i class="ti ti-chart-bar" style="font-size:18px" aria-hidden="true"></i></span>
                       <span class="nav-label">Statistiques</span>`;
        b.addEventListener("click", openStats);
        dash.insertAdjacentElement("afterend", b);
        return true;
    }

    function ensureScreen() {
        let sc = document.getElementById("stats-screen");
        if (sc) return sc;
        const ds = document.getElementById("dashboard-screen");
        if (!ds) return null;
        sc = document.createElement("div");
        sc.id = "stats-screen";
        sc.setAttribute("role", "region"); sc.setAttribute("aria-label", "Statistiques de commande");
        ds.insertAdjacentElement("afterend", sc);
        sc.addEventListener("change", e => {
            if (e.target.classList.contains("os-season")) { _season = e.target.value; render(); }
        });
        sc.addEventListener("click", e => {
            const k = e.target.closest("[data-os]");
            if (!k) return;
            if (k.dataset.os === "alerts" && window.openHGNotifications) window.openHGNotifications("smart");
        });
        return sc;
    }

    function openStats() {
        if (!window.state) return;
        window.state.activeView = "stats";
        document.querySelectorAll(".nav-item").forEach(x => { x.classList.remove("active"); x.setAttribute("aria-selected", "false"); });
        const tab = document.getElementById("tab-stats");
        tab.classList.add("active"); tab.setAttribute("aria-selected", "true");

        ["dashboard-screen", "kpi-grid", "table-card-wrap", "db-filter-bar", "sample-alerts-panel"].forEach(id => {
            const el = document.getElementById(id); if (el) el.style.display = "none";
        });
        const t = document.getElementById("header-sheet-title");
        if (t) t.textContent = "Statistiques de commande";

        const sc = ensureScreen();
        if (sc) { sc.classList.add("show"); render(); }
    }

    function closeStats() {
        document.getElementById("stats-screen")?.classList.remove("show");
        document.getElementById("tab-stats")?.classList.remove("active");
    }

    // ══════════════════════════════════════════════════════════
    //  RENDU
    // ══════════════════════════════════════════════════════════
    function render() {
        const sc = document.getElementById("stats-screen");
        if (!sc || !sc.classList.contains("show")) return;
        const { details, ordering, alerts, seasons } = data();
        _updatedAt = new Date();

        // ── KPI (mêmes règles que les anciennes cartes du dashboard) ──
        const exfty = r => parseD(r["Possible etd"] || r["Possible Vsl date"]);
        const total = details.length;
        const poRec = details.filter(r => String(r["Order Status"] || "").trim().toUpperCase() === "PO RECEIVED").length;
        const late  = details.filter(r => { const d = exfty(r); return d && dayDiff(d) < 0; });
        const soon  = details.filter(r => { const d = exfty(r); return d && dayDiff(d) >= 0 && dayDiff(d) <= EXFTY_SOON_DAYS; });
        const dangers = alerts.filter(a => a.severity === "danger").length;
        const names = list => list.slice(0, 6).map(r => r["Cust Style Ref"] || r.Style).join("\n") + (list.length > 6 ? `\n+ ${list.length - 6}` : "");

        // opt : { os: action au clic, tip: infobulle }
        const kpi = (cls, icon, v, l, opt = {}) =>
            `<div class="os-k ${opt.os ? "click" : ""}" ${opt.os ? `data-os="${opt.os}" role="button" tabindex="0"` : ""} ${opt.tip ? `data-tip="${esc(opt.tip)}"` : ""}>
                <div class="os-ic ${cls}"><i class="ti ${icon}" aria-hidden="true"></i></div>
                <div><div class="os-v">${v.toLocaleString("fr-FR")}</div><div class="os-l">${l}</div></div>
             </div>`;
        const kpis = [
            kpi("os-blue", "ti-shirt", total, "Total styles"),
            kpi("os-green", "ti-file-check", poRec, "PO reçus"),
            kpi(late.length ? "os-red" : "os-green", "ti-ship", late.length, "Ex-Fty dépassées", late.length ? { tip: names(late) } : {}),
            kpi(soon.length ? "os-amber" : "os-green", "ti-clock-hour-4", soon.length, `Ex-Fty ≤ ${EXFTY_SOON_DAYS} j`, soon.length ? { tip: names(soon) } : {}),
            kpi(dangers ? "os-red" : alerts.length ? "os-amber" : "os-green", "ti-bell-ringing", alerts.length, "Alertes actives", { os: "alerts", tip: "Ouvrir les notifications" })
        ].join("");

        // ── Ex-Fty par semaine : 2 semaines passées → 9 à venir ──
        const start = mondayOf(today0()); start.setDate(start.getDate() - 14);
        const weeks = Array.from({ length: 12 }, (_, i) => { const m = new Date(start); m.setDate(m.getDate() + i * 7); return { m, list: [] }; });
        let outRange = 0;
        details.forEach(r => {
            const d = exfty(r); if (!d) return;
            const i = Math.floor((mondayOf(d) - start) / (7 * 86400000));
            if (i >= 0 && i < weeks.length) weeks[i].list.push(r); else outRange++;
        });
        const nowMon = mondayOf(today0()).getTime();
        const maxW = Math.max(1, ...weeks.map(w => w.list.length));
        const weekHTML = weeks.some(w => w.list.length) ? `
            <div class="os-weeks">${weeks.map(w => {
                const cls = w.m.getTime() < nowMon ? "past" : w.m.getTime() === nowMon ? "now" : "";
                const h = w.list.length ? Math.max(4, Math.round(w.list.length / maxW * 100)) : 0;
                const tip = w.list.length ? `S${isoWeek(w.m)} · semaine du ${fmtShort(w.m)}\n${names(w.list)}` : "";
                return `<div class="os-wcol">${w.list.length ? `<div class="os-wn">${w.list.length}</div>` : ""}
                        <div class="os-wbar ${cls}" style="height:${h}%" ${tip ? `data-tip="${esc(tip)}"` : ""}></div></div>`;
            }).join("")}</div>
            <div class="os-wl">${weeks.map(w => `<span class="${w.m.getTime() === nowMon ? "now" : ""}">S${isoWeek(w.m)}</span>`).join("")}</div>
            <div class="os-leg"><span><i style="background:#f28b82"></i>Semaines passées</span><span><i style="background:#0b57d0"></i>Cette semaine</span><span><i style="background:#a8c7fa"></i>À venir</span>
            ${outRange ? `<span style="margin-left:auto;color:#5f6368">${outRange} style${outRange > 1 ? "s" : ""} hors période</span>` : ""}</div>`
            : `<div class="os-empty">Aucune date Ex-Fty sur les 12 semaines autour d'aujourd'hui.</div>`;

        // ── Alertes par type ──
        const byType = {};
        alerts.forEach(a => {
            const l = typeof window.saTypeLabel === "function" ? window.saTypeLabel(a.type) : a.type;
            const g = byType[l] || (byType[l] = { n: 0, sev: "info" });
            g.n++;
            if (a.severity === "danger") g.sev = "danger"; else if (a.severity === "warn" && g.sev !== "danger") g.sev = "warn";
        });
        const types = Object.entries(byType).sort((a, b) => b[1].n - a[1].n).slice(0, 8);
        const maxT = Math.max(1, ...types.map(t => t[1].n));
        const COL = { danger: "#d93025", warn: "#e37400", info: "#0b57d0" };
        const typeHTML = types.length
            ? types.map(([l, g]) => `<div class="os-hb"><span class="lbl" title="${esc(l)}">${esc(l)}</span>
                <div class="tr"><div class="fl" style="width:${Math.round(g.n / maxT * 100)}%;background:${COL[g.sev]}"></div></div><span class="n">${g.n}</span></div>`).join("")
            : `<div class="os-empty">Aucune alerte active 🎉</div>`;

        // ── Statut des commandes (Ordering) ──
        const st = { done: 0, transit: 0, todo: 0 };
        ordering.forEach(r => {
            const d = String(r["Delivery Status"] || "").toLowerCase();
            if (d.includes("deliver") || d.includes("livr")) st.done++;
            else if (d.includes("transit")) st.transit++;
            else st.todo++;
        });
        const nOrd = st.done + st.transit + st.todo;
        const SEG = [["done", "Livré", "#0b57d0"], ["transit", "En transit", "#a8c7fa"], ["todo", "À venir", "#c4c7c5"]];
        const ordHTML = nOrd ? `
            <div class="os-stack">${SEG.map(([k, , c]) => st[k] ? `<div style="flex:${st[k]};background:${c}" data-tip="${esc(SEG.find(x => x[0] === k)[1])} : ${st[k]}"></div>` : "").join("")}</div>
            <div class="os-sl">${SEG.map(([k, l, c]) => `<div><i style="background:${c}"></i>${l}<b>${st[k]} · ${Math.round(st[k] / nOrd * 100)} %</b></div>`).join("")}</div>`
            : `<div class="os-empty">Aucune ligne Ordering pour cette saison.</div>`;

        sc.innerHTML = `
            <div class="os-top">
                <span class="os-upd">Mis à jour à ${_updatedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}${_season ? ` · ${esc(_season)}` : ""}</span>
                <select class="os-season ${_season ? "on" : ""}" aria-label="Filtrer par saison">
                    <option value="">Toutes les saisons</option>
                    ${seasons.map(x => `<option value="${esc(x)}" ${x === _season ? "selected" : ""}>${esc(x)}</option>`).join("")}
                </select>
            </div>
            <div class="os-kpis">${kpis}</div>
            <div class="os-grid">
                <div class="os-box">
                    <div class="os-bt">Ex-Fty par semaine</div>
                    <div class="os-bs">Nombre de styles par semaine d'Ex-Fty (Possible etd)</div>
                    ${weekHTML}
                </div>
                <div style="display:flex;flex-direction:column;gap:12px;min-width:0">
                    <div class="os-box">
                        <div class="os-bt">Alertes par type</div>
                        <div class="os-bs">Alertes intelligentes actives</div>
                        ${typeHTML}
                    </div>
                    <div class="os-box">
                        <div class="os-bt">Statut des commandes</div>
                        <div class="os-bs">${nOrd} ligne${nOrd > 1 ? "s" : ""} Ordering · Delivery Status</div>
                        ${ordHTML}
                    </div>
                </div>
            </div>`;
    }

    // ══════════════════════════════════════════════════════════
    //  INIT
    // ══════════════════════════════════════════════════════════
    function init() {
        injectCSS();
        let tries = 0;
        const t = setInterval(() => {
            if ((ensureNav() && ensureScreen()) || ++tries > 60) clearInterval(t);
        }, 400);

        // Tout autre onglet du menu ferme la page Statistiques
        document.addEventListener("click", e => {
            const nav = e.target.closest(".nav-item, .hg-new");
            if (nav && nav.id !== "tab-stats" && nav.id !== "hg-settings") closeStats();
        }, true);

        // Rafraîchir quand les données ou les alertes changent
        document.addEventListener("sa:updated", render);
        setInterval(render, 60000);

        window.openOrderStats = openStats;
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else setTimeout(init, 350);

})();
