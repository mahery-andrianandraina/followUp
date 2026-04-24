// ============================================================
//  AW27 CHECKERS – Style Detail PDF Generator (Version EXPERTE)
// ============================================================

(function injectJsPDF() {
  if (window.jspdf) return;
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  script.onload = () => console.log('[PDF] jsPDF chargé');
  document.head.appendChild(script);
})();

const PDF_CONFIG = {
  primary:    [30,  58, 138],
  accent:     [59, 130, 246],
  light:      [239, 246, 255],
  dark:       [15,  23,  42],
  gray:       [100, 116, 139],
  border:     [203, 213, 225],
  white:      [255, 255, 255]
};

function resolvePhotoUrl(style) {
  if (!style) return '';
  // Priorité aux clés normalisées
  return style.photoBase64 || style._imageUrl || style.Photo || style.photo || style.Image || '';
}

function extractDriveFileId(url) {
  if (!url || typeof url !== 'string' || url.startsWith('data:')) return null;
  const m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  const m2 = url.match(/([a-zA-Z0-9_-]{25,})/);
  if (m2 && !url.includes('.js') && !url.includes('.css')) return m2[1];
  return null;
}

async function loadImageAsBase64(url) {
  if (!url) return null;
  if (url.startsWith('data:')) return url;

  // Récupération sécurisée de l'URL du script
  const gasUrl = window.GOOGLE_APPS_SCRIPT_URL || (window.AWCheckers ? window.AWCheckers.gasUrl : null);
  const fileId = extractDriveFileId(url);

  if (fileId && gasUrl && !gasUrl.includes('YOUR_WEB_')) {
    try {
      const cleanUrl = gasUrl.split('?')[0];
      const proxyUrl = cleanUrl + '?fileId=' + encodeURIComponent(fileId);
      console.log('[PDF] 🔄 Appel Proxy GAS :', proxyUrl);
      
      const res = await fetch(proxyUrl);
      const json = await res.json();
      
      if (json.status === "ok" && json.dataUrl) {
        return json.dataUrl;
      } else {
        console.error('[PDF] Erreur Proxy GAS:', json.message || 'ID non trouvé ou non partagé');
      }
    } catch (e) {
      console.error('[PDF] Échec connexion Proxy GAS:', e.message);
    }
  }

  // Fallback direct (CORS)
  try {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('[PDF] Impossible de charger l\'image en direct (CORS/Permissions Drive)');
    return null;
  }
}

async function generateStylePDF(style) {
  if (!window.jspdf) {
    console.log('[PDF] Attente jsPDF...');
    await new Promise(r => setTimeout(r, 1500));
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 14;

  // Header Banner
  doc.setFillColor(...PDF_CONFIG.primary);
  doc.rect(0, 0, W, 40, 'F');
  doc.setTextColor(...PDF_CONFIG.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('AW27 CHECKERS', M, 20);
  doc.setFontSize(14);
  doc.text('FICHE TECHNIQUE STYLE', M, 30);

  let y = 50;
  // Style
  doc.setFontSize(18);
  doc.setTextColor(...PDF_CONFIG.primary);
  doc.text(style.Style || '—', M, y);
  
  // Description
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_CONFIG.gray);
  const desc = style.Description || '';
  doc.text(desc.substring(0, 80), M, y + 8);

  y += 18;
  // Photo Section
  const photoUrl = resolvePhotoUrl(style);
  console.log('[PDF] Chargement image:', photoUrl);
  const imgData = await loadImageAsBase64(photoUrl);

  if (imgData) {
    try {
      // Auto-détection du format PNG/JPEG
      const format = imgData.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(imgData, format, M, y, 75, 75, undefined, 'FAST');
    } catch (e) {
      console.warn('[PDF] addImage error:', e.message);
      doc.rect(M, y, 75, 75);
      doc.text('Image incompatible', M + 15, y + 38);
    }
  } else {
    doc.setDrawColor(...PDF_CONFIG.border);
    doc.rect(M, y, 75, 75);
    doc.setTextColor(...PDF_CONFIG.gray);
    doc.text('Photo non disponible', M + 12, y + 38);
  }

  // Infos Grid
  const xInfo = M + 85;
  let iy = y + 5;
  const fields = [
    { L: 'Client',       V: style.Client },
    { L: 'Saison',       V: style.Saison },
    { L: 'Département',  V: style.Dept },
    { L: 'Fabric Base',  V: style['Fabric Base'] },
    { L: 'Costing',      V: style.Costing },
    { L: 'Order Qty',    V: style['Order Qty'] }
  ];

  fields.forEach(f => {
    doc.setFontSize(8); doc.setTextColor(...PDF_CONFIG.gray);
    doc.setFont('helvetica', 'bold');
    doc.text(f.L.toUpperCase(), xInfo, iy);
    doc.setFontSize(10); doc.setTextColor(...PDF_CONFIG.dark);
    doc.text(String(f.V || '—'), xInfo, iy + 5);
    iy += 12;
  });

  doc.save(`Style_${style.Style || 'Export'}.pdf`);
  console.log('[PDF] Génération terminée.');
}

// Exposition globale
window.AWCheckers = window.AWCheckers || {};
window.AWCheckers.generateStylePDF = generateStylePDF;
