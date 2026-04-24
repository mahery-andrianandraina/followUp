// ============================================================
//  AW27 CHECKERS – PDF Generator Final Robust
// ============================================================

(function injectJsPDF() {
  if (window.jspdf) return;
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  s.async = true;
  document.head.appendChild(s);
})();

async function generateStylePDF(style) {
  const gasUrl = window.GOOGLE_APPS_SCRIPT_URL || localStorage.getItem('last_gas_url');
  const code = style.Style || style.StyleCode;

  if (!code || !gasUrl) {
    alert("Erreur : Code Style introuvable dans la ligne sélectionnée.");
    return;
  }

  console.log('[PDF] 🔎 Recherche serveur pour :', code);

  try {
    // ÉTAPE 1 : Demander au serveur les données fraîches
    // On simplifie l'URL au maximum pour éviter les pertes pendant les redirections Google
    const target = gasUrl.split('?')[0] + '?styleCode=' + encodeURIComponent(code);
    const res = await fetch(target);
    const json = await res.json();
    
    if (json.status !== "ok") throw new Error(json.message);
    const s = json.style;
    if (!s) throw new Error("Le serveur a répondu 'OK' mais n'a pas renvoyé les données du style.");

    // 2. Attente jsPDF
    if (!window.jspdf) {
       console.log('[PDF] Chargement bibliothèque...');
       await new Promise(r => setTimeout(r, 2000));
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Design
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('AW27 CHECKERS', 15, 25);
    
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(18);
    doc.text('STYLE : ' + (s.Style || code), 15, 55);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Description : ' + (s.Description || 'N/A'), 15, 62);

    // Image
    if (s.photoBase64) {
      console.log('[PDF] ✅ Image reçue du serveur');
      doc.addImage(s.photoBase64, 'JPEG', 15, 70, 80, 80);
    } else {
      console.warn('[PDF] ⚠️ Aucune image trouvée par le serveur');
      doc.setDrawColor(200);
      doc.rect(15, 70, 80, 80);
      doc.text('Photo non trouvée sur Drive', 25, 110);
    }

    // Infos secondaires
    let y = 75;
    const infoX = 110;
    const rows = [
      ['Client', s.Client],
      ['Saison', s.Saison],
      ['Dépt', s.Dept],
      ['Fabric', s['Fabric Base'] || s['Fabric']],
      ['Qty', s['Order Qty'] || s['Qty']]
    ];

    rows.forEach(r => {
      doc.setFontSize(8); doc.setTextColor(150);
      doc.text(r[0].toUpperCase(), infoX, y);
      doc.setFontSize(11); doc.setTextColor(0);
      doc.text(String(r[1] || '—'), infoX, y + 5);
      y += 15;
    });

    doc.save(`Fiche_${code}.pdf`);

  } catch (err) {
    console.error('[PDF] Erreur :', err);
    alert("Échec de génération : " + err.message);
  }
}

window.AWCheckers = window.AWCheckers || {};
window.AWCheckers.generateStylePDF = generateStylePDF;
