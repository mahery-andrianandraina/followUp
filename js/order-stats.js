// ============================================================
//  AW27 CHECKERS — Statistiques de commande
//  Fichier : order-stats.js
//  Charger après smartAlerts.js et header-google.js :
//  <script src="js/order-stats.js"></script>
//
//  • Nouvel onglet « Statistiques » dans la barre latérale (sous Dashboard)
//  • Les 5 cartes KPI quittent le dashboard et viennent ici :
//      Total styles · PO reçus · Ex-Fty dépassées · Ex-Fty ≤ 14 j · Alertes actives
//  • Calendriers en liste (style Google Agenda), chaque style avec sa date :
//      - Calendrier Ex-Fty    (Details › Possible etd)
//      - Calendrier PSD       (Details › PSD) — PSD proches mises en avant
//  • Alertes par type (alertes intelligentes) et Statut des commandes (Ordering)
//  • Filtre par saison (Details › Full Season) appliqué à toute la page
//  • Le dashboard ne garde que le grand titre et les filtres
// ============================================================

(function initOrderStats() {

    const EXFTY_SOON_DAYS = 14;
    const PSD_SOON_DAYS   = 14;
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


        .os-box { background: #fff; border: 1px solid #e3e3e3; border-radius: 16px; padding: 16px 18px; min-width: 0; }
        .os-bt { font-size: 15px; font-weight: 500; margin-bottom: 2px; }
        .os-bs { font-size: 12.5px; color: #5f6368; margin-bottom: 14px; }
        .os-empty { font-size: 13px; color: #5f6368; padding: 24px 0; text-align: center; }

        /* Calendriers en liste (Ex-Fty / PSD) */
        .os-cal { max-height: 440px; overflow-y: auto; margin: 0 -8px; padding: 0 8px; }
        .os-gh { font-size: 12px; font-weight: 500; color: #444746; padding: 12px 4px 6px; display: flex; align-items: center; gap: 8px; position: sticky; top: 0; background: #fff; z-index: 1; }
        .os-gh .c { font-weight: 400; color: #5f6368; }
        .os-gh.late { color: #c5221f; }
        .os-row { display: flex; align-items: center; gap: 12px; padding: 8px 6px; border-radius: 12px; cursor: pointer; }
        .os-row:hover { background: #f0f4f9; }
        .os-date { width: 46px; flex-shrink: 0; text-align: center; border-radius: 10px; padding: 4px 0; background: #f0f4f9; }
        .os-date .d { font-size: 18px; line-height: 20px; font-weight: 500; color: #1f1f1f; }
        .os-date .m { font-size: 11px; color: #5f6368; text-transform: lowercase; }
        .os-row.late .os-date { background: #fce8e6; } .os-row.late .os-date .d { color: #c5221f; }
        .os-row.soon .os-date { background: #fef7e0; } .os-row.soon .os-date .d { color: #b06000; }
        .os-row.near .os-date { background: #d3e3fd; } .os-row.near .os-date .d { color: #0b57d0; }
        .os-st { flex: 1; min-width: 0; }
        .os-st .n { font-size: 14px; font-weight: 500; color: #1f1f1f; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .os-st .s { font-size: 12px; color: #5f6368; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .os-cd { flex-shrink: 0; height: 24px; padding: 0 10px; border-radius: 8px; font-size: 12px; font-weight: 500; display: inline-flex; align-items: center; white-space: nowrap; }
        .os-cd.late { background: #fce8e6; color: #c5221f; } .os-cd.soon { background: #fef7e0; color: #b06000; }
        .os-cd.near { background: #d3e3fd; color: #041e49; } .os-cd.far { background: #f1f3f4; color: #444746; }
        .os-cd.done { background: #e6f4ea; color: #137333; }
        .os-foot { font-size: 12px; color: #5f6368; padding: 10px 4px 0; border-top: 1px solid #e3e3e3; margin-top: 6px; }
        .os-grid2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; margin-bottom: 12px; }
        @media (max-width: 1000px) { .os-grid2 { grid-template-columns: 1fr; } }

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
            if (k.dataset.os === "row" && typeof window.navigateToRow === "function") {
                closeStats();
                window.navigateToRow("details", +k.dataset.row);
            }
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
        const kpisHTML = () => [
            kpi("os-blue", "ti-shirt", total, "Total styles"),
            kpi("os-green", "ti-file-check", poRec, "PO reçus"),
            kpi(late.length ? "os-red" : "os-green", "ti-ship", late.length, "Ex-Fty dépassées", late.length ? { tip: names(late) } : {}),
            kpi(soon.length ? "os-amber" : "os-green", "ti-clock-hour-4", soon.length, `Ex-Fty ≤ ${EXFTY_SOON_DAYS} j`, soon.length ? { tip: names(soon) } : {}),
            kpi(calPsd.soonCount ? "os-amber" : "os-green", "ti-calendar-event", calPsd.soonCount, `PSD ≤ ${PSD_SOON_DAYS} j`, calPsd.soonCount ? { tip: names(calPsd.soonList) } : {}),
            kpi(dangers ? "os-red" : alerts.length ? "os-amber" : "os-green", "ti-bell-ringing", alerts.length, "Alertes actives", { os: "alerts", tip: "Ouvrir les notifications" })
        ].join("");

        // ── Calendriers en liste : chaque style avec sa date ──
        const psdOf = r => parseD(r.PSD);
        const isDoneText = v => /^(all\s*ok|in\s*house)/i.test(String(v || "").trim());
        const endOfWeek = (() => { const e = mondayOf(today0()); e.setDate(e.getDate() + 6); return e; })();
        const endNextWeek = (() => { const e = new Date(endOfWeek); e.setDate(e.getDate() + 7); return e; })();

        function calendar(getDate, soonDays, opts) {
            const rows = [], noDate = [], done = [];
            details.forEach(r => {
                const raw = opts.raw(r);
                if (opts.doneText && isDoneText(raw)) { done.push(r); return; }
                const d = getDate(r);
                if (d) rows.push({ r, d, n: dayDiff(d) }); else noDate.push(r);
            });
            rows.sort((a, b) => a.d - b.d);
            const groups = [
                { key: "late", title: opts.lateTitle, list: rows.filter(x => x.n < 0) },
                { key: "week", title: "Cette semaine", list: rows.filter(x => x.n >= 0 && x.d <= endOfWeek) },
                { key: "next", title: "Semaine prochaine", list: rows.filter(x => x.d > endOfWeek && x.d <= endNextWeek) },
                { key: "later", title: "Plus tard", list: rows.filter(x => x.d > endNextWeek) }
            ];
            const cd = n => n < 0 ? `${opts.lateWord} de ${-n} j` : n === 0 ? "Aujourd'hui" : n === 1 ? "Demain" : `Dans ${n} j`;
            const cls = n => n < 0 ? "late" : n <= 7 ? "soon" : n <= soonDays ? "near" : "far";
            const row = x => {
                const st = x.r["Cust Style Ref"] || x.r.Style || "—";
                const sub = [x.r.CTLStyleRef || x.r["CTL Style Ref"], x.r.Client || x.r.Coll, opts.sub ? opts.sub(x.r) : ""].filter(Boolean).join(" · ");
                return `<div class="os-row ${cls(x.n)}" data-os="row" data-row="${x.r._rowIndex}" role="button" tabindex="0" data-tip="Ouvrir ${esc(st)} dans Details">
                    <div class="os-date"><div class="d">${x.d.getDate()}</div><div class="m">${x.d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}</div></div>
                    <div class="os-st"><div class="n">${esc(st)}</div><div class="s">${esc(sub)}</div></div>
                    <span class="os-cd ${cls(x.n)}">${cd(x.n)}</span>
                </div>`;
            };
            let html = groups.filter(g => g.list.length).map(g =>
                `<div class="os-gh ${g.key === "late" ? "late" : ""}">${g.title}<span class="c">· ${g.list.length}</span></div>${g.list.map(row).join("")}`).join("");
            if (done.length) {
                html += `<div class="os-gh">Terminé<span class="c">· ${done.length}</span></div>` + done.map(r => {
                    const st = r["Cust Style Ref"] || r.Style || "—";
                    return `<div class="os-row" data-os="row" data-row="${r._rowIndex}" role="button" tabindex="0">
                        <div class="os-date"><div class="d" style="color:#137333">✓</div><div class="m">ok</div></div>
                        <div class="os-st"><div class="n">${esc(st)}</div><div class="s">${esc([r.CTLStyleRef, r.Client].filter(Boolean).join(" · "))}</div></div>
                        <span class="os-cd done">${esc(String(opts.raw(r)).trim())}</span></div>`;
                }).join("");
            }
            if (!html) html = `<div class="os-empty">${opts.empty}</div>`;
            const foot = noDate.length ? `<div class="os-foot">${noDate.length} style${noDate.length > 1 ? "s" : ""} sans date : ${esc(noDate.slice(0, 8).map(r => r["Cust Style Ref"] || r.Style).join(", "))}${noDate.length > 8 ? "…" : ""}</div>` : "";
            const soonCount = rows.filter(x => x.n >= 0 && x.n <= soonDays).length;
            const lateCount = rows.filter(x => x.n < 0).length;
            return { html: `<div class="os-cal">${html}</div>${foot}`, soonCount, lateCount, soonList: rows.filter(x => x.n >= 0 && x.n <= soonDays).map(x => x.r) };
        }

        const calEx = calendar(exfty, EXFTY_SOON_DAYS, {
            raw: r => r["Possible etd"] || r["Possible Vsl date"], lateTitle: "Ex-Fty dépassée", lateWord: "Dépassée",
            empty: "Aucune date Ex-Fty.", sub: r => r.PSD && parseD(r.PSD) ? `PSD ${fmtShort(parseD(r.PSD))}` : ""
        });
        const calPsd = calendar(psdOf, PSD_SOON_DAYS, {
            raw: r => r.PSD, doneText: true, lateTitle: "PSD dépassée", lateWord: "Retard",
            empty: "Aucune PSD renseignée.", sub: r => exfty(r) ? `Ex-Fty ${fmtShort(exfty(r))}` : ""
        });

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
            <div class="os-kpis">${kpisHTML()}</div>
            <div class="os-grid2">
                <div class="os-box">
                    <div class="os-bt">Calendrier Ex-Fty</div>
                    <div class="os-bs">Chaque style avec sa date Ex-Fty (Possible etd)</div>
                    ${calEx.html}
                </div>
                <div class="os-box">
                    <div class="os-bt">Calendrier PSD</div>
                    <div class="os-bs">${calPsd.soonCount ? `<b style="color:#b06000;font-weight:500">${calPsd.soonCount} PSD dans les ${PSD_SOON_DAYS} prochains jours</b>` : `Aucune PSD dans les ${PSD_SOON_DAYS} prochains jours`}${calPsd.lateCount ? ` · <b style="color:#c5221f;font-weight:500">${calPsd.lateCount} en retard</b>` : ""}</div>
                    ${calPsd.html}
                </div>
            </div>
            <div class="os-grid2">
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
