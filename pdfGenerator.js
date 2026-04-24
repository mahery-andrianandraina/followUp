// ============================================================
//  AW27 CHECKERS – Style Detail PDF Generator
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
  white:      [255, 255, 255],
  success:    [34, 197, 94],
  warning:    [234, 179,  8],
  danger:     [239,  68,  68],
};

function resolvePhotoUrl(style) {
  if (!style) return '';
  return style.photoBase64 || style._imageUrl || style.Photo || style.photo || style.image || style.Image || '';
}

function extractDriveFileId(url) {
  if (!url || typeof url !== 'string' || url.startsWith('data:')) return null;
  const m1 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  const m3 = url.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (m3) return m3[1];
  const m4 = url.match(/([a-zA-Z0-9_-]{25,})/);
  if (m4 && !url.includes('.js') && !url.includes('.css')) return m4[1];
  return null;
}

async function loadImageAsBase64(url) {
  if (!url) return null;
  if (url.startsWith('data:')) return url;

  const gasUrl = window.GOOGLE_APPS_SCRIPT_URL;
  const fileId = extractDriveFileId(url);

  // ── STRATÉGIE 1 : PROXY GAS (POUR DRIVE) ──
  if (fileId && gasUrl && !gasUrl.includes('YOUR_WEB_')) {
    try {
      const cleanUrl = gasUrl.split('?')[0];
      const proxyUrl = cleanUrl + '?fileId=' + encodeURIComponent(fileId);
      const res = await fetch(proxyUrl);
      const json = await res.json();
      if (json.dataUrl) return json.dataUrl;
    } catch (e) { console.warn('[PDF] Proxy Drive échoué'); }
  }

  // ── STRATÉGIE 2 : FETCH DIRECT (POUR LE RESTE) ──
  try {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('[PDF] Échec chargement fini:', url);
    return null;
  }
}

async function generateStylePDF(style) {
  if (!window.jspdf) await new Promise(r => setTimeout(r, 1000));
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 14;

  // Header
  doc.setFillColor(...PDF_CONFIG.primary);
  doc.rect(0, 0, W, 40, 'F');
  doc.setTextColor(...PDF_CONFIG.white);
  doc.setFontSize(22);
  doc.text('AW27 CHECKERS', M, 20);
  doc.setFontSize(14);
  doc.text('FICHE TECHNIQUE STYLE', M, 30);

  let y = 50;
  // Style & Desc
  doc.setFontSize(18);
  doc.setTextColor(...PDF_CONFIG.primary);
  doc.text(style.Style || '—', M, y);
  doc.setFontSize(10);
  doc.setTextColor(...PDF_CONFIG.gray);
  doc.text(style.Description || '', M, y + 7);

  y += 15;
  // Photo
  const imgData = await loadImageAsBase64(resolvePhotoUrl(style));
  if (imgData) {
    try {
      doc.addImage(imgData, 'JPEG', M, y, 70, 70);
    } catch (e) { doc.rect(M, y, 70, 70); doc.text('Format incompatible', M+5, y+35); }
  } else {
    doc.setDrawColor(...PDF_CONFIG.border);
    doc.rect(M, y, 70, 70);
    doc.text('Pas de photo', M + 20, y + 35);
  }

  // Infos
  const infoX = M + 80;
  let iy = y + 5;
  const fields = [
    ['Client', style.Client],
    ['Saison', style.Saison],
    ['Dept', style.Dept],
    ['Fabric', style['Fabric Base']],
    ['Costing', style.Costing],
    ['Qty', style['Order Qty']]
  ];
  fields.forEach(f => {
    doc.setFontSize(8); doc.setTextColor(...PDF_CONFIG.gray);
    doc.text(f[0], infoX, iy);
    doc.setFontSize(10); doc.setTextColor(...PDF_CONFIG.dark);
    doc.text(String(f[1] || '—'), infoX, iy + 5);
    iy += 12;
  });

  doc.save(`Style_${style.Style || 'Export'}.pdf`);
}

window.AWCheckers = window.AWCheckers || {};
window.AWCheckers.generateStylePDF = generateStylePDF;
