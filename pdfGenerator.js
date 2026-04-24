// ============================================================
//  AW27 CHECKERS – Style Detail PDF Generator (Version FINALE)
// ============================================================

(function injectJsPDF() {
  if (window.jspdf) return;
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  document.head.appendChild(script);
})();

const PDF_CONFIG = {
  primary: [30, 58, 138],
  gray: [100, 116, 139],
  white: [255, 255, 255]
};

async function generateStylePDF(style) {
  const gasUrl = window.GOOGLE_APPS_SCRIPT_URL || localStorage.getItem('last_gas_url');
  const styleCode = style.Style;

  if (!styleCode || !gasUrl) {
    alert("Impossible de générer le PDF : Code Style ou URL manquante.");
    return;
  }

  console.log('[PDF] 🕒 Récupération des données serveur pour :', styleCode);

  try {
    // ÉTAPE 1 : Demander au serveur les données fraîches avec l'image en BASE64
    const res = await fetch(gasUrl.split('?')[0] + '?action=GET_STYLE&styleCode=' + encodeURIComponent(styleCode));
    const json = await res.json();
    
    if (json.status !== "ok") throw new Error(json.message || "Erreur serveur");
    
    // On utilise les données enrichies reçues du serveur
    const s = json.style;
    const imgData = s.photoBase64;

    // ÉTAPE 2 : Générer le PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const M = 15;

    doc.setFillColor(...PDF_CONFIG.primary);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(...PDF_CONFIG.white);
    doc.setFontSize(22);
    doc.text('AW27 CHECKERS', M, 20);
    doc.setFontSize(12);
    doc.text('STYLE DATA SHEET', M, 28);

    doc.setTextColor(...PDF_CONFIG.primary);
    doc.setFontSize(18);
    doc.text(s.Style || '—', M, 50);
    doc.setFontSize(10);
    doc.setTextColor(...PDF_CONFIG.gray);
    doc.text(s.Description || '', M, 58);

    if (imgData) {
      doc.addImage(imgData, 'JPEG', M, 65, 80, 80);
    } else {
      doc.rect(M, 65, 80, 80);
      doc.text('Image non disponible', M + 15, 105);
    }

    const infoX = 110;
    let iy = 70;
    [['Saison', s.Saison], ['Client', s.Client], ['Dept', s.Dept], ['Fabric', s['Fabric Base']], ['Qty', s['Order Qty']], ['Ex-Fty', s['Ex-Fty']]].forEach(f => {
      doc.setFontSize(8); doc.text(f[0], infoX, iy);
      doc.setFontSize(10); doc.text(String(f[1] || '—'), infoX, iy + 5);
      iy += 15;
    });

    doc.save(`Style_${styleCode}.pdf`);
    console.log('[PDF] Succès.');

  } catch (err) {
    console.error('[PDF] Erreur :', err);
    alert("Erreur lors de la génération du PDF : " + err.message);
  }
}

window.AWCheckers = window.AWCheckers || {};
window.AWCheckers.generateStylePDF = generateStylePDF;
