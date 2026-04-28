// ============================================================
//  AW27 CHECKERS – PDF Generator (image from dashboard card)
// ============================================================

(function injectJsPDF() {
  if (window.jspdf) return;
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  s.async = true;
  document.head.appendChild(s);
})();

// ── Helper : download an image URL → base64 data URI ──────────
async function imgToBase64(url) {
  if (!url) return null;
  if (url.startsWith('data:')) return url;

  // Strategy 1 : fetch as blob → FileReader
  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (res.ok) {
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch (_) { /* try next */ }

  // Strategy 2 : img crossOrigin → canvas
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img, 0, 0);
          resolve(c.toDataURL('image/jpeg', 0.92));
        } catch (e) { reject(e); }
      };
      img.onerror = reject;
      img.src = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
      setTimeout(() => reject(new Error('timeout')), 8000);
    });
  } catch (_) { /* give up */ }

  return null;
}

async function generateStylePDF(style) {
  const code = style.Style || style.StyleCode;

  if (!code) {
    alert("Erreur : Code Style introuvable dans la ligne sélectionnée.");
    return;
  }

  console.log('[PDF] 🔎 Génération PDF pour :', code);

  try {
    // ─── DONNÉES : utiliser les données passées par la card (pas de serveur) ───
    // Enrichir avec state.data.details si disponible
    const s = { ...style };
    if (window.state && window.state.data && window.state.data.details) {
      const match = window.state.data.details.find(r =>
        (r.Style || '').toLowerCase() === code.toLowerCase()
      );
      if (match) {
        // Compléter les champs manquants avec les données du state
        Object.keys(match).forEach(k => {
          if (!s[k] && match[k]) s[k] = match[k];
        });
      }
    }

    // ─── IMAGE : priorité au base64 déjà extrait de la card ───────
    let photoData = s.photoBase64 || null;

    // Si pas de base64, essayer de télécharger depuis l'URL
    if (!photoData && (s._imageUrl || s.photoUrl)) {
      const imgUrl = s._imageUrl || s.photoUrl;
      console.log('[PDF] 📥 Téléchargement image depuis URL :', imgUrl);
      photoData = await imgToBase64(imgUrl);
    }

    // ─── jsPDF ────────────────────────────────────────────────────
    if (!window.jspdf) {
      console.log('[PDF] Chargement bibliothèque...');
      await new Promise(r => setTimeout(r, 2000));
    }
    if (!window.jspdf) {
      throw new Error("La bibliothèque jsPDF n'a pas pu être chargée.");
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // ── Header band ──
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('AW27 CHECKERS', 15, 25);

    // ── Style title ──
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(18);
    doc.text('STYLE : ' + (s.Style || code), 15, 55);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Description : ' + (s.Description || s.StyleDescription || 'N/A'), 15, 62);

    // ── Image ──
    if (photoData) {
      console.log('[PDF] ✅ Image injectée dans le PDF');
      try {
        doc.addImage(photoData, 'JPEG', 15, 70, 80, 80);
      } catch (imgErr) {
        console.warn('[PDF] ⚠️ Erreur addImage :', imgErr.message);
        doc.setDrawColor(200);
        doc.rect(15, 70, 80, 80);
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('Photo : format non supporté', 25, 110);
      }
    } else {
      console.warn('[PDF] ⚠️ Aucune image disponible');
      doc.setDrawColor(200);
      doc.rect(15, 70, 80, 80);
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text('Photo non disponible', 30, 110);
    }

    // ── Infos secondaires ──
    let y = 75;
    const infoX = 110;
    const rows = [
      ['Client', s.Client],
      ['Saison', s.Saison],
      ['Dépt', s.Dept],
      ['Fabric', s['Fabric Base'] || s['Fabric']],
      ['Qty', s['Order Qty'] || s['Qty']],
      ['PSD', s.PSD],
      ['Ex-Fty', s['Ex-Fty']]
    ];

    rows.forEach(r => {
      doc.setFontSize(8); doc.setTextColor(150);
      doc.text(r[0].toUpperCase(), infoX, y);
      doc.setFontSize(11); doc.setTextColor(0);
      doc.text(String(r[1] || '—'), infoX, y + 5);
      y += 15;
    });

    doc.save(`Fiche_${code}.pdf`);
    console.log('[PDF] ✅ PDF généré avec succès');

  } catch (err) {
    console.error('[PDF] Erreur :', err);
    alert("Échec de génération : " + err.message);
  }
}

window.AWCheckers = window.AWCheckers || {};
window.AWCheckers.generateStylePDF = generateStylePDF;
window.AWCheckers.imgToBase64 = imgToBase64;
