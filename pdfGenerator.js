// ============================================================
//  AW27 CHECKERS – Style Detail PDF Generator
//  Dépendance : jsPDF (CDN)
//  Usage       : importez ce fichier dans votre HTML/JS
// ============================================================

// ------ 1. INJECTER jsPDF automatiquement si absent --------
(function injectJsPDF() {
  if (window.jspdf) return;
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  script.onload = () => console.log('[PDF] jsPDF chargé');
  document.head.appendChild(script);
})();

// ------ 2. COULEURS & CONFIG --------------------------------
const PDF_CONFIG = {
  primary:    [30,  58, 138],
  accent:     [59, 130, 246],
  light:      [239, 246, 255],
  dark:       [15,  23,  42],
  gray:       [100, 116, 139],
  border:     [203, 213, 225],
  white:      [255, 255, 255],
  success:    [34, 197, 94],
  warning:    [234, 179,  8],
  danger:     [239,  68,  68],
};

// ------ 3. UTILITAIRES --------------------------------------
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function statusColor(status) {
  if (!status) return PDF_CONFIG.gray;
  const s = status.toLowerCase();
  if (s.includes('ok') || s.includes('confirm') || s.includes('valid')) return PDF_CONFIG.success;
  if (s.includes('pend') || s.includes('wip') || s.includes('progress')) return PDF_CONFIG.warning;
  if (s.includes('cancel') || s.includes('hold') || s.includes('ko')) return PDF_CONFIG.danger;
  return PDF_CONFIG.accent;
}

/**
 * Résout l'URL de la photo depuis l'objet style,
 * en testant toutes les clés possibles.
 * FIX : ajout de _imageUrl (clé interne normalisée par app.js/fixRows)
 */
function resolvePhotoUrl(style) {
  if (!style) return '';
  return (
    style.photoBase64   ||  // déjà en base64 → priorité max
    style._imageUrl     ||  // clé normalisée par app.js (fixRows → normalizeDriveUrl)
    style.photoUrl      ||
    style.Photo         ||
    style.photo         ||
    style['Photo URL']  ||
    style['photo_url']  ||
    style.ImageUrl      ||
    style.imageUrl      ||
    style.image         ||
    style.Image         ||
    style.ImageURL      ||
    style.imageURL      ||
    style.url           ||
    style.URL           ||
    ''
  );
}

/**
 * Extrait le File ID Drive depuis n'importe quel format d'URL Drive.
 * Retourne null si ce n'est pas une URL Drive reconnue.
 */
function extractDriveFileId(url) {
  if (!url || typeof url !== 'string' || url.startsWith('data:')) return null;

  // 1. Format thumbnail?id=... ou uc?id=... ou open?id=...
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];

  // 2. Format /file/d/FILE_ID (le plus robuste car supporte plusieurs suites /view, /edit, etc.)
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];

  // 3. Format lh3.googleusercontent.com/d/FILE_ID=w...
  // On capte l'ID avant le '=' ou la fin
  const lh3Match = url.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (lh3Match) return lh3Match[1];

  // 4. Fallback agressif : tout ce qui ressemble à un ID (25+ chars alphanum avec tirets/underscores)
  // en évitant les noms de fichiers connus
  const rawIdMatch = url.match(/([a-zA-Z0-9_-]{25,})/);
  if (rawIdMatch && !url.includes('.js') && !url.includes('.css') && !url.includes('.html')) {
    return rawIdMatch[1];
  }

  return null;
}

/**
 * Charge une image et la retourne en base64.
 *
 * Stratégie 1 (priorité) : proxy GAS
 *   → Appelle ton Google Apps Script avec action=imageProxy&fileId=ID
 *   → Le GAS lit le fichier Drive côté serveur et retourne le base64
 *   → Aucun problème CORS ni canvas taint
 *
 * Stratégie 2 (fallback) : fetch() CORS
 *   → Pour les URLs non-Drive avec headers CORS corrects
 *
 * Stratégie 3 (fallback) : <img> + canvas sans crossOrigin
 *   → Dernier recours, peut échouer sur les URLs authentifiées
 */
async function loadImageAsBase64(url) {
  if (!url) return null;
  if (url.startsWith('data:')) return url;

  // Helper interne pour forcer la conversion en JPEG via canvas (sécurise formats WebP/etc)
  const forceToJpeg = async (dataUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height); // fond blanc pour JPEG (si transparence)
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        } catch(e) { resolve(dataUrl); }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // 🔍 DIAGNOSTIC LOG : Voir exactement quelle URL arrive ici
  console.log('[PDF] 📥 Tentative de chargement :', url ? (url.substring(0, 80) + '...') : '(vide)');

  // ── Stratégie 1 : Proxy GAS (solution Drive authentifiée) ────────────
  const fileId = extractDriveFileId(url);
  const gasUrl = window.GOOGLE_APPS_SCRIPT_URL;
  
  if (!fileId) console.log('[PDF] ℹ️ Stratégie 1 ignorée : Pas un ID Drive reconnu.');
  if (!gasUrl || gasUrl === 'YOUR_WEB_APP_URL_HERE') console.log('[PDF] ⚠️ Stratégie 1 ignorée : URL GAS non configurée.');

  if (fileId && gasUrl && gasUrl !== 'YOUR_WEB_APP_URL_HERE') {
    try {
      const separator = gasUrl.includes('?') ? '&' : '?';
      const proxyUrl = gasUrl + separator + 'action=imageProxy&fileId=' + encodeURIComponent(fileId);
      
      console.log('[PDF] 🚀 Stratégie 1 (Proxy) en cours pour ID :', fileId);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s pour le proxy

      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.dataUrl && (json.status === "ok" || !json.status)) {
        console.log('[PDF] ✅ Image chargée via proxy GAS');
        if (json.dataUrl.includes('image/webp') || json.dataUrl.includes('image/avif') || json.dataUrl.includes('image/octet-stream')) {
          return await forceToJpeg(json.dataUrl);
        }
        return json.dataUrl;
      }
      if (json.error) throw new Error(json.error);
    } catch (proxyErr) {
      console.warn('[PDF] ❌ Proxy GAS échoué :', proxyErr.message);
      // Fallback vers les autres stratégies si le proxy échoue réellement
    }
  }

  // ── Stratégie 2 : fetch() CORS (URLs non-Drive) ──────────────────────
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror  = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(blob);
    });
  } catch (fetchErr) {
    console.warn('[PDF] fetch() CORS échoué :', fetchErr.message);
  }

  // ── Stratégie 3 : <img> + canvas sans crossOrigin (dernier recours) ──
  return new Promise((resolve) => {
    const img = new Image();
    const timeoutId = setTimeout(() => { img.src = ''; resolve(null); }, 5000);
    img.onload = () => {
      clearTimeout(timeoutId);
      try {
        const canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth  || 400;
        canvas.height = img.naturalHeight || 400;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (e) {
        console.warn('[PDF] Canvas tainted (image authentifiée Drive) :', e.message);
        resolve(null);
      }
    };
    img.onerror = () => { clearTimeout(timeoutId); resolve(null); };
    img.src = url + (url.includes('?') ? '&' : '?') + '_cb=' + Date.now();
  });
}

// ------ 4. GENERATEUR PRINCIPAL -----------------------------
/**
 * Génère et télécharge la fiche PDF d'un style.
 *
 * @param {Object} style  – objet avec les champs du Google Sheet
 * @param {string} style.Saison
 * @param {string} style.Client
 * @param {string} style.Dept
 * @param {string} style.Style
 * @param {string} style.Description
 * @param {string} style['Fabric Base']
 * @param {string} style.Costing
 * @param {string} style['Order Qty']
 * @param {string} style['PLC Booking']
 * @param {string} style['CRP Booking']
 * @param {string} style.Status
 * @param {string} style.PSD
 * @param {string} style['Ex-Fty']
 * @param {string} style.Comments
 * @param {string} style._imageUrl     – URL normalisée par app.js (fixRows)
 * @param {string} style.photoUrl      – alias (optionnel)
 * @param {string} style.photoBase64   – photo déjà en base64 (prioritaire)
 */
async function generateStylePDF(style) {
  // Attendre que jsPDF soit disponible
  if (!window.jspdf) {
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  if (!window.jspdf) {
    console.error('[PDF] jsPDF non disponible après attente');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210;
  const H = 297;
  const M = 14;
  let y = 0;

  // ── HEADER BANNER ────────────────────────────────────────
  doc.setFillColor(...PDF_CONFIG.primary);
  doc.rect(0, 0, W, 38, 'F');

  doc.setTextColor(...PDF_CONFIG.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('AW27  CHECKERS', M, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_CONFIG.accent);
  doc.text('SUIVI & GESTION DES COMMANDES', M, 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...PDF_CONFIG.white);
  doc.text('FICHE STYLE', M, 33);

  const now = new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_CONFIG.accent);
  doc.text(`Généré le ${now}`, W - M, 33, { align: 'right' });

  y = 46;

  // ── STYLE CODE + DESCRIPTION ─────────────────────────────
  doc.setFillColor(...PDF_CONFIG.light);
  doc.roundedRect(M, y, W - 2 * M, 20, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...PDF_CONFIG.primary);
  doc.text(style.Style || '—', M + 4, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_CONFIG.gray);
  // FIX : fallback sur StyleDescription (champ alternatif dans app.js)
  const desc = style.Description || style.StyleDescription || '';
  doc.text(desc.substring(0, 80), M + 4, y + 15);

  const statusTxt = style.Status || 'N/A';
  const sColor = statusColor(statusTxt);
  doc.setFillColor(...sColor);
  const badgeW = doc.getTextWidth(statusTxt) + 8;
  doc.roundedRect(W - M - badgeW - 4, y + 5, badgeW + 4, 10, 2, 2, 'F');
  doc.setTextColor(...PDF_CONFIG.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(statusTxt.toUpperCase(), W - M - badgeW / 2 - 2, y + 11.5, { align: 'center' });

  y += 26;

  // ── PHOTO + INFOS PRINCIPALES ────────────────────────────
  const photoX = M;
  const photoY = y;
  const photoW = 68;
  const photoH = 72;

  // Résolution multi-clés (inclut _imageUrl) + chargement robuste
  const photoUrl = resolvePhotoUrl(style);
  console.log('[PDF] URL photo résolue :', photoUrl || '(aucune)');
  const imgData = await loadImageAsBase64(photoUrl);

  if (imgData) {
    // Détecter le format pour jsPDF
    let imgFormat = 'JPEG';
    if (imgData.startsWith('data:image/png'))  imgFormat = 'PNG';
    if (imgData.startsWith('data:image/webp')) imgFormat = 'WEBP';

    try {
      doc.addImage(imgData, imgFormat, photoX, photoY, photoW, photoH, '', 'FAST');
    } catch (addImgErr) {
      console.warn('[PDF] addImage échoué (format non supporté ?) :', addImgErr.message);
      // Fallback discret : cadre gris avec info
      doc.setFillColor(245, 247, 250);
      doc.rect(photoX, photoY, photoW, photoH, 'F');
      doc.setTextColor(...PDF_CONFIG.gray);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.text('Format image bloqué', photoX + photoW/2, photoY + photoH/2, { align: 'center' });
    }
    doc.setDrawColor(...PDF_CONFIG.border);
    doc.setLineWidth(0.4);
    doc.rect(photoX, photoY, photoW, photoH);
  } else {
    // Placeholder stylé si vraiment aucune photo disponible
    doc.setFillColor(...PDF_CONFIG.border);
    doc.rect(photoX, photoY, photoW, photoH, 'F');
    doc.setFillColor(180, 190, 210);
    doc.rect(photoX + photoW / 2 - 10, photoY + photoH / 2 - 12, 20, 16, 'F');
    doc.setFillColor(150, 160, 185);
    doc.circle(photoX + photoW / 2, photoY + photoH / 2 - 6, 4, 'F');
    doc.setTextColor(...PDF_CONFIG.gray);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('Aucune photo', photoX + photoW / 2, photoY + photoH / 2 + 10, { align: 'center' });
  }

  // Grille d'infos à droite de la photo
  const infoX = M + photoW + 6;
  const infoW = W - infoX - M;

  const mainFields = [
    { label: 'Client',       value: style.Client },
    { label: 'Saison',       value: style.Saison },
    { label: 'Département',  value: style.Dept },
    { label: 'Fabric Base',  value: style['Fabric Base'] },
    { label: 'Costing',      value: style.Costing },
    { label: 'Order Qty',    value: style['Order Qty'] },
  ];

  let iy = photoY;
  mainFields.forEach((f, i) => {
    const bg = i % 2 === 0 ? PDF_CONFIG.white : PDF_CONFIG.light;
    doc.setFillColor(...bg);
    doc.rect(infoX, iy, infoW, 11, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...PDF_CONFIG.gray);
    doc.text(f.label.toUpperCase(), infoX + 3, iy + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_CONFIG.dark);
    doc.text(String(f.value || '—'), infoX + 3, iy + 9.5);

    doc.setDrawColor(...PDF_CONFIG.border);
    doc.setLineWidth(0.2);
    doc.line(infoX, iy + 11, infoX + infoW, iy + 11);

    iy += 11;
  });

  y = Math.max(photoY + photoH, iy) + 8;

  // ── SECTION PLANNING ─────────────────────────────────────
  doc.setFillColor(...PDF_CONFIG.primary);
  doc.rect(M, y, W - 2 * M, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_CONFIG.white);
  doc.text('PLANNING & BOOKINGS', M + 3, y + 5);
  y += 9;

  const planFields = [
    { label: 'PSD',          value: style.PSD },
    { label: 'Ex-Fty',       value: style['Ex-Fty'] },
    { label: 'PLC Booking',  value: style['PLC Booking'] },
    { label: 'CRP Booking',  value: style['CRP Booking'] },
  ];

  const colW = (W - 2 * M) / 2;
  planFields.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const fx = M + col * colW;
    const fy = y + row * 13;

    doc.setFillColor(...(row % 2 === 0 ? PDF_CONFIG.light : PDF_CONFIG.white));
    doc.rect(fx, fy, colW, 13, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...PDF_CONFIG.gray);
    doc.text(f.label.toUpperCase(), fx + 3, fy + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...PDF_CONFIG.primary);
    doc.text(String(f.value || '—'), fx + 3, fy + 11);

    doc.setDrawColor(...PDF_CONFIG.border);
    doc.setLineWidth(0.2);
    doc.rect(fx, fy, colW, 13);
  });

  y += Math.ceil(planFields.length / 2) * 13 + 8;

  // ── SECTION COMMENTS ─────────────────────────────────────
  doc.setFillColor(...PDF_CONFIG.primary);
  doc.rect(M, y, W - 2 * M, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_CONFIG.white);
  doc.text('COMMENTAIRES', M + 3, y + 5);
  y += 9;

  const comments = style.Comments || 'Aucun commentaire.';
  doc.setFillColor(...PDF_CONFIG.light);
  doc.rect(M, y, W - 2 * M, 28, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_CONFIG.dark);
  const commentLines = doc.splitTextToSize(comments, W - 2 * M - 6);
  doc.text(commentLines, M + 3, y + 7);

  y += 34;

  // ── FOOTER ───────────────────────────────────────────────
  doc.setFillColor(...PDF_CONFIG.primary);
  doc.rect(0, H - 14, W, 14, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...PDF_CONFIG.accent);
  doc.text('AW27 CHECKERS  •  Suivi & Gestion des Commandes', M, H - 5);
  doc.text(`${style.Style || ''} — Document confidentiel`, W - M, H - 5, { align: 'right' });

  doc.setFillColor(...PDF_CONFIG.accent);
  doc.rect(0, H - 15, W, 1, 'F');

  // ── TÉLÉCHARGEMENT ───────────────────────────────────────
  const filename = `fiche_style_${(style.Style || 'style').replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
  console.log(`[PDF] Généré : ${filename}`);
}

// ------ 5. BOUTON PDF HELPER --------------------------------
/**
 * Crée et insère un bouton "Export PDF" dans un élément container.
 * Appelle generateStylePDF(styleData) au clic.
 *
 * @param {HTMLElement} container  – l'élément dans lequel insérer le bouton
 * @param {Object}      styleData  – les données du style (voir generateStylePDF)
 */
function createPDFButton(container, styleData) {
  const btn = document.createElement('button');
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" stroke-width="2.5"
         stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;vertical-align:middle">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="12" y1="18" x2="12" y2="12"/>
      <line x1="9" y1="15" x2="15" y2="15"/>
    </svg>
    Export PDF
  `;
  btn.style.cssText = `
    display:inline-flex; align-items:center; justify-content:center;
    padding:8px 16px; border-radius:8px; border:none; cursor:pointer;
    background:linear-gradient(135deg,#1e3a8a,#3b82f6);
    color:#fff; font-size:13px; font-weight:600; font-family:sans-serif;
    box-shadow:0 2px 8px rgba(30,58,138,.35);
    transition:opacity .2s, transform .15s;
  `;
  btn.addEventListener('mouseenter', () => { btn.style.opacity = '.85'; btn.style.transform = 'translateY(-1px)'; });
  btn.addEventListener('mouseleave', () => { btn.style.opacity = '1';   btn.style.transform = 'translateY(0)'; });
  btn.addEventListener('click', async () => {
    btn.textContent = 'Génération...';
    btn.disabled = true;
    try {
      await generateStylePDF(styleData);
      btn.innerHTML = '✓ Téléchargé';
    } catch (err) {
      console.error('[PDF] Erreur génération :', err);
      btn.innerHTML = '❌ Erreur';
    }
    setTimeout(() => {
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;vertical-align:middle">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
        Export PDF`;
      btn.disabled = false;
    }, 2000);
  });
  container.appendChild(btn);
  return btn;
}

// Exporter pour usage en module ES ou accès global
if (typeof module !== 'undefined') {
  module.exports = { generateStylePDF, createPDFButton };
} else {
  window.AWCheckers = window.AWCheckers || {};
  window.AWCheckers.generateStylePDF = generateStylePDF;
  window.AWCheckers.createPDFButton  = createPDFButton;
}
