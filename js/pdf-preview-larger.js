// ================================================================
//  AW27 — Aperçu PDF plein écran (modal autonome)
//  Définit window.openCPDFPreview si absent, sinon le remplace
//  par un modal plein écran. Gère les URLs Google Drive.
// ================================================================
(function() {

    const MODAL_ID = "aw-pdf-fs-modal";

    // Convertir une URL Drive ".../view" en ".../preview" (embed sans UI Drive)
    function toEmbedUrl(url) {
        if (!url) return url;
        // https://drive.google.com/file/d/FILEID/view  →  /preview
        const m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (m) {
            return "https://drive.google.com/file/d/" + m[1] + "/preview";
        }
        // https://...?id=FILEID
        const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (m2) {
            return "https://drive.google.com/file/d/" + m2[1] + "/preview";
        }
        return url;
    }

    function buildModal() {
        let modal = document.getElementById(MODAL_ID);
        if (modal) return modal;

        modal = document.createElement("div");
        modal.id = MODAL_ID;
        modal.style.cssText = `
            position: fixed; inset: 0; z-index: 99999;
            background: rgba(0,0,0,.85);
            display: none; flex-direction: column;
        `;

        // Barre supérieure
        const bar = document.createElement("div");
        bar.style.cssText = `
            display:flex; align-items:center; justify-content:space-between;
            padding:10px 16px; background:#202124; color:#fff;
            font-family:'Google Sans','Roboto',sans-serif; flex-shrink:0;
        `;

        const titleEl = document.createElement("div");
        titleEl.id = "aw-pdf-fs-title";
        titleEl.style.cssText = "font-size:15px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
        titleEl.textContent = "Aperçu PDF";

        const btns = document.createElement("div");
        btns.style.cssText = "display:flex;gap:8px;flex-shrink:0;";

        // Bouton ouvrir dans Drive
        const openBtn = document.createElement("a");
        openBtn.id = "aw-pdf-fs-open";
        openBtn.target = "_blank";
        openBtn.title = "Ouvrir dans un nouvel onglet";
        openBtn.style.cssText = `
            display:inline-flex;align-items:center;gap:5px;
            padding:6px 14px;border-radius:20px;border:1px solid #5f6368;
            color:#fff;text-decoration:none;font-size:13px;cursor:pointer;
        `;
        openBtn.innerHTML = `<i class="ti ti-external-link"></i> Ouvrir`;

        // Bouton fermer
        const closeBtn = document.createElement("button");
        closeBtn.title = "Fermer (Échap)";
        closeBtn.style.cssText = `
            display:inline-flex;align-items:center;justify-content:center;
            width:36px;height:36px;border-radius:50%;border:none;
            background:#3c4043;color:#fff;cursor:pointer;font-size:18px;
        `;
        closeBtn.innerHTML = `<i class="ti ti-x"></i>`;
        closeBtn.onclick = closeModal;

        btns.appendChild(openBtn);
        btns.appendChild(closeBtn);
        bar.appendChild(titleEl);
        bar.appendChild(btns);

        // Zone iframe
        const frameWrap = document.createElement("div");
        frameWrap.style.cssText = "flex:1 1 auto;background:#525659;overflow:hidden;";
        const iframe = document.createElement("iframe");
        iframe.id = "aw-pdf-fs-iframe";
        iframe.style.cssText = "width:100%;height:100%;border:none;display:block;";
        iframe.setAttribute("allow", "autoplay");
        frameWrap.appendChild(iframe);

        modal.appendChild(bar);
        modal.appendChild(frameWrap);
        document.body.appendChild(modal);

        // Fermer en cliquant sur le fond noir (hors barre/iframe)
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeModal();
        });

        return modal;
    }

    function closeModal() {
        const modal = document.getElementById(MODAL_ID);
        if (!modal) return;
        modal.style.display = "none";
        const iframe = document.getElementById("aw-pdf-fs-iframe");
        if (iframe) iframe.src = "about:blank";  // stopper le chargement
    }

    function openModal(url, title) {
        const modal   = buildModal();
        const iframe  = document.getElementById("aw-pdf-fs-iframe");
        const titleEl = document.getElementById("aw-pdf-fs-title");
        const openBtn = document.getElementById("aw-pdf-fs-open");

        const isExcel = /\.(xlsx|xls)$/i.test(title || "") || /\.(xlsx|xls)(\?|$)/i.test(url || "");

        if (isExcel) {
            // Excel : pas d'aperçu inline fiable → ouvrir directement
            window.open(url, "_blank");
            return;
        }

        titleEl.textContent = title || "Aperçu PDF";
        openBtn.href        = url;
        iframe.src          = toEmbedUrl(url);
        modal.style.display = "flex";
    }

    // Échap pour fermer
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeModal();
    });

    // Exposer / remplacer openCPDFPreview
    window.openCPDFPreview = openModal;

    // Réappliquer après chargement complet (au cas où app.js le redéfinit)
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => { window.openCPDFPreview = openModal; });
    }
    setTimeout(() => { window.openCPDFPreview = openModal; }, 1000);
    setTimeout(() => { window.openCPDFPreview = openModal; }, 2500);

    console.log("[AW27] PDF preview plein écran (modal) ✓");
})();
