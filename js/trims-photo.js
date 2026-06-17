// ================================================================
//  AW27 — Colonne "Trim Photo" pour le menu Trims Devo
//  Upload image + miniature + clic pour agrandir
// ================================================================
(function() {

    const SHEET_KEY = "custom_trims_devo_mqgrzgap";
    const URL_COL   = "Trim Photo URL";
    const NAME_COL  = "Trim Photo Name";

    // ── Styles ────────────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById("trim-photo-css")) return;
        const s = document.createElement("style");
        s.id = "trim-photo-css";
        s.textContent = `
        .tp-cell { display:flex; align-items:center; gap:6px; }
        .tp-thumb {
            width:40px; height:40px; border-radius:6px; object-fit:cover;
            border:1px solid #e0e0e0; cursor:pointer; transition:transform .15s, box-shadow .15s;
            background:#f5f5f5;
        }
        .tp-thumb:hover { transform:scale(1.05); box-shadow:0 2px 8px rgba(0,0,0,.2); }
        .tp-upload-btn {
            display:inline-flex; align-items:center; gap:4px;
            padding:4px 10px; border-radius:20px;
            border:1px dashed #bdc1c6; background:transparent; color:#5f6368;
            font-size:11px; font-weight:500; cursor:pointer;
            font-family:system-ui,sans-serif; transition:all .15s; white-space:nowrap;
        }
        .tp-upload-btn:hover { border-style:solid; border-color:#1a73e8; background:#e8f0fe; color:#1a73e8; }
        .tp-act {
            display:inline-flex; align-items:center; justify-content:center;
            width:22px; height:22px; border-radius:50%;
            border:1px solid #e8eaed; background:#f8f9fa; color:#80868b;
            cursor:pointer; font-size:11px; transition:all .15s; flex-shrink:0;
        }
        .tp-act:hover { background:#fce8e6; border-color:#f5c6c2; color:#c5221f; }
        .tp-act.rep:hover { background:#fef7e0; border-color:#fde396; color:#b06000; }
        @keyframes tp-spin { to { transform:rotate(360deg); } }
        .tp-spin { display:inline-block; animation:tp-spin .7s linear infinite; }

        /* Lightbox plein écran */
        #tp-lightbox {
            position:fixed; inset:0; z-index:99999;
            background:rgba(0,0,0,.9); display:none;
            align-items:center; justify-content:center; cursor:zoom-out;
        }
        #tp-lightbox img { max-width:92vw; max-height:92vh; border-radius:8px; box-shadow:0 8px 40px rgba(0,0,0,.5); }
        #tp-lightbox .tp-close {
            position:absolute; top:20px; right:24px; width:42px; height:42px;
            border-radius:50%; border:none; background:#3c4043; color:#fff;
            font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center;
        }
        `;
        document.head.appendChild(s);
    }

    const _names = {};

    // ── Lightbox ──────────────────────────────────────────────────
    function buildLightbox() {
        let lb = document.getElementById("tp-lightbox");
        if (lb) return lb;
        lb = document.createElement("div");
        lb.id = "tp-lightbox";
        lb.innerHTML = `<button class="tp-close"><i class="ti ti-x"></i></button><img src="" alt="Trim">`;
        document.body.appendChild(lb);
        lb.addEventListener("click", () => { lb.style.display = "none"; });
        return lb;
    }
    function openLightbox(url) {
        const lb = buildLightbox();
        lb.querySelector("img").src = url;
        lb.style.display = "flex";
    }
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") {
            const lb = document.getElementById("tp-lightbox");
            if (lb) lb.style.display = "none";
        }
    });

    // ── Cellule avec photo ────────────────────────────────────────
    function buildPhoto(url, rowIndex) {
        const wrap = document.createElement("div");
        wrap.className = "tp-cell";

        const img = document.createElement("img");
        img.className = "tp-thumb";
        img.src = toThumbUrl(url);
        img.title = "Cliquer pour agrandir";
        img.onclick = e => { e.stopPropagation(); openLightbox(toViewUrl(url)); };
        img.onerror = () => { img.src = toViewUrl(url); };

        const repl = document.createElement("button");
        repl.className = "tp-act rep";
        repl.title = "Remplacer";
        repl.innerHTML = `<i class="ti ti-refresh"></i>`;
        repl.onclick = e => { e.stopPropagation(); _triggerUpload(rowIndex, wrap); };

        const del = document.createElement("button");
        del.className = "tp-act";
        del.title = "Supprimer";
        del.innerHTML = `<i class="ti ti-trash"></i>`;
        del.onclick = async e => {
            e.stopPropagation();
            if (!confirm("Supprimer cette photo ?")) return;
            wrap.innerHTML = `<i class="ti ti-loader-2 tp-spin" style="color:#ea4335"></i>`;
            await _save(rowIndex, "", "");
            buildEmpty(wrap, rowIndex);
        };

        wrap.appendChild(img);
        wrap.appendChild(repl);
        wrap.appendChild(del);
        return wrap;
    }

    function buildEmpty(wrap, rowIndex) {
        wrap.innerHTML = "";
        const btn = document.createElement("button");
        btn.className = "tp-upload-btn";
        btn.innerHTML = `<i class="ti ti-camera"></i> Photo`;
        btn.onclick = e => { e.stopPropagation(); _triggerUpload(rowIndex, wrap); };
        wrap.appendChild(btn);
        return wrap;
    }

    // ── Conversions URL Drive ─────────────────────────────────────
    function fileId(url) {
        const m = (url || "").match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || (url || "").match(/[?&]id=([a-zA-Z0-9_-]+)/);
        return m ? m[1] : "";
    }
    function toThumbUrl(url) {
        const id = fileId(url);
        return id ? `https://lh3.googleusercontent.com/d/${id}=w120` : url;
    }
    function toViewUrl(url) {
        const id = fileId(url);
        return id ? `https://lh3.googleusercontent.com/d/${id}=w1600` : url;
    }

    // ── Upload ────────────────────────────────────────────────────
    function _triggerUpload(rowIndex, wrapEl) {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;
            if (file.size > 15 * 1024 * 1024) {
                typeof showToast === "function" && showToast("Image trop lourde (max 15 Mo)", "error");
                return;
            }
            const orig = wrapEl.innerHTML;
            wrapEl.innerHTML = `<i class="ti ti-loader-2 tp-spin" style="color:#1a73e8"></i><span style="font-size:11px;color:#5f6368"> Upload...</span>`;
            typeof showToast === "function" && showToast("Upload photo…", "info", 8000);
            try {
                const b64 = await new Promise((res, rej) => {
                    const rd = new FileReader();
                    rd.onload = e => res(e.target.result);
                    rd.onerror = rej;
                    rd.readAsDataURL(file);
                });
                const url = await _uploadToGAS(file.name, b64.split(",")[1], file.type || "image/jpeg", rowIndex);
                if (!url) throw new Error("Aucune URL retournée");
                _names[url] = file.name;
                await _save(rowIndex, url, file.name);
                typeof showToast === "function" && showToast("Photo uploadée", "success");
                wrapEl.innerHTML = "";
                const nw = buildPhoto(url, rowIndex);
                Array.from(nw.children).forEach(c => wrapEl.appendChild(c));
            } catch(err) {
                wrapEl.innerHTML = orig;
                typeof showToast === "function" && showToast("Erreur : " + err.message, "error");
            }
        };
        input.click();
    }

    async function _uploadToGAS(filename, base64Data, mimeType, rowIndex) {
        const gasUrl = window.GOOGLE_APPS_SCRIPT_URL;
        if (!gasUrl) throw new Error("GOOGLE_APPS_SCRIPT_URL introuvable");
        const resp = await fetch(gasUrl, {
            method:  "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body:    JSON.stringify({
                action:     "UPLOAD_ORDERING_FILE",
                fileName:   filename,
                base64Data: base64Data,
                mimeType:   mimeType,
                folder:     "TRIMS",
                sheet:      SHEET_KEY,
                colKey:     URL_COL,
                rowIndex:   rowIndex
            })
        });
        const text = await resp.text();
        let result;
        try { result = JSON.parse(text); }
        catch(e) { throw new Error("Réponse serveur invalide : " + text.substring(0, 120)); }
        if (result.status === "error") throw new Error(result.message || "Erreur serveur");
        return result.url || result.fileUrl || result.driveUrl || "";
    }

    async function _save(rowIndex, url, name) {
        try {
            await window.quickUpdate(rowIndex, URL_COL,  url,  SHEET_KEY);
            await window.quickUpdate(rowIndex, NAME_COL, name, SHEET_KEY);
            const row = (window.state?.data?.[SHEET_KEY] || []).find(r => r._rowIndex === rowIndex);
            if (row) { row[URL_COL] = url; row[NAME_COL] = name; }
        } catch(e) { typeof showToast === "function" && showToast("Erreur : " + e.message, "error"); }
    }

    // ── Injecter la colonne dans la config ────────────────────────
    function patchConfig() {
        const cfg = window.SHEET_CONFIG?.[SHEET_KEY];
        if (!cfg || !cfg.cols) return;
        if (!cfg.cols.find(c => c.key === URL_COL)) {
            cfg.cols.push({ key: URL_COL,  label: "Trim Photo", type: "text" });
        }
        if (!cfg.cols.find(c => c.key === NAME_COL)) {
            cfg.cols.push({ key: NAME_COL, label: "Trim Photo Name", type: "text" });
        }
    }

    // ── Injecter les cellules dans le tableau ─────────────────────
    function injectCells() {
        if (window.state?.activeSheet !== SHEET_KEY) return;
        const rows = window.state?.data?.[SHEET_KEY] || [];
        const tbody = document.getElementById("table-body");
        if (!tbody || !rows.length) return;

        Array.from(tbody.querySelectorAll("tr[data-row-index]")).forEach(tr => {
            const rowIndex = parseInt(tr.dataset.rowIndex, 10);
            if (isNaN(rowIndex)) return;
            const row = rows.find(r => r._rowIndex === rowIndex);
            if (!row) return;

            const td = tr.querySelector(`td[data-key="${URL_COL}"]`);
            if (!td || td.querySelector(".tp-cell")) return;

            const url = (row[URL_COL] || "").trim();
            td.innerHTML = "";
            td.style.padding = "4px 10px";
            const wrap = document.createElement("div");
            wrap.className = "tp-cell";
            if (url.startsWith("http")) {
                const p = buildPhoto(url, rowIndex);
                Array.from(p.children).forEach(c => wrap.appendChild(c));
            } else {
                buildEmpty(wrap, rowIndex);
            }
            td.appendChild(wrap);
        });
    }

    // ── Init ──────────────────────────────────────────────────────
    function init() {
        injectStyles();

        // Hook renderTable — réappliquer la config AVANT chaque rendu
        const _wait = setInterval(() => {
            if (typeof window.renderTable !== "function") return;
            clearInterval(_wait);
            if (window._tpRenderPatched) return;
            window._tpRenderPatched = true;
            const _orig = window.renderTable;
            window.renderTable = function() {
                // S'assurer que la colonne existe juste avant le rendu
                if (window.state?.activeSheet === SHEET_KEY) patchConfig();
                _orig.apply(this, arguments);
                if (window.state?.activeSheet === SHEET_KEY) setTimeout(injectCells, 120);
            };
        }, 100);

        // Patch initial + ré-essais (le menu custom peut charger tard)
        let tries = 0;
        const t = setInterval(() => {
            tries++;
            patchConfig();
            // Forcer un re-render si on est déjà sur le menu et que la colonne vient d'être ajoutée
            if (window.state?.activeSheet === SHEET_KEY && typeof window.renderTable === "function") {
                window.renderTable(document.getElementById("aw-search-input")?.value || "");
            }
            if (tries > 25) clearInterval(t);
        }, 400);

        // Observer tbody
        const watch = setInterval(() => {
            const tb = document.getElementById("table-body");
            if (!tb) return;
            clearInterval(watch);
            new MutationObserver(() => {
                if (window.state?.activeSheet === SHEET_KEY) setTimeout(injectCells, 120);
            }).observe(tb, { childList: true });
        }, 300);

        console.log("[AW27] Trims Devo photo ✓");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        setTimeout(init, 300);
    }
})();
