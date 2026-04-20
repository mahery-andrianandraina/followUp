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
  primary:    [30,  58, 138],   // bleu marine (identité AW27)
  accent:     [59, 130, 246],   // bleu clair
  light:      [239, 246, 255],  // fond section
  dark:       [15,  23,  42],   // texte principal
  gray:       [100, 116, 139],  // texte secondaire
  border:     [203, 213, 225],  // lignes
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

// Charge une image depuis une URL → base64
function loadImageAsBase64(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(null);
    img.src = url;
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
 * @param {string} style.photoUrl   – URL de la photo produit
 */
async function generateStylePDF(style) {
  // Attendre que jsPDF soit disponible
  if (!window.jspdf) {
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210; // largeur A4
  const H = 297; // hauteur A4
  const M = 14;  // marge
  let y = 0;

  // ── HEADER BANNER ────────────────────────────────────────
  doc.setFillColor(...PDF_CONFIG.primary);
  doc.rect(0, 0, W, 38, 'F');

  // Logo / brand
  doc.setTextColor(...PDF_CONFIG.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('AW27  CHECKERS', M, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_CONFIG.accent);
  doc.text('SUIVI & GESTION DES COMMANDES', M, 22);

  // Titre fiche
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...PDF_CONFIG.white);
  doc.text('FICHE STYLE', M, 33);

  // Date génération
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
  const desc = style.Description || '';
  doc.text(desc.substring(0, 80), M + 4, y + 15);

  // Status badge (coin droit)
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

  // Charger la photo
  const imgData = await loadImageAsBase64(style.photoUrl || style.Photo || style.photo || '');

  if (imgData) {
    doc.addImage(imgData, 'JPEG', photoX, photoY, photoW, photoH, '', 'FAST');
    // Cadre photo
    doc.setDrawColor(...PDF_CONFIG.border);
    doc.setLineWidth(0.4);
    doc.rect(photoX, photoY, photoW, photoH);
  } else {
    // Placeholder si pas de photo
    doc.setFillColor(...PDF_CONFIG.border);
    doc.rect(photoX, photoY, photoW, photoH, 'F');
    doc.setTextColor(...PDF_CONFIG.gray);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('Aucune photo', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
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

    // Séparateur
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

  // Ligne décorative
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
    await generateStylePDF(styleData);
    btn.innerHTML = '✓ Téléchargé';
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
