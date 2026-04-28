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
// Uses fetch + blob + FileReader to avoid CORS canvas tainting.
// Falls back to drawing from a fresh <img> with crossOrigin if fetch fails.
async function imgToBase64(url) {
  if (!url) return null;
  // Already base64
  if (url.startsWith('data:')) return url;

  // ── Strategy 1 : fetch as blob → FileReader ─────────────────
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
  } catch (_) { /* try next strategy */ }

  // ── Strategy 2 : load into img with crossOrigin → canvas ────
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

// ── Extract base64 from an already-loaded <img> element ───────
// The browser has already downloaded the image, so we can draw it
// onto a canvas and extract the data URI — no network needed.
function imgElementToBase64(imgEl) {
  if (!imgEl || !imgEl.naturalWidth) return null;
  try {
    const c = document.createElement('canvas');
    c.width = imgEl.naturalWidth;
    c.height = imgEl.naturalHeight;
    c.getContext('2d').drawImage(imgEl, 0, 0);
    return c.toDataURL('image/jpeg', 0.92);
  } catch (_) {
    // Canvas tainted by CORS — can't extract
    return null;
  }
}

async function generateStylePDF(style) {
  const gasUrl = window.GOOGLE_APPS_SCRIPT_URL || localStorage.getItem('last_gas_url');
  const code = style.Style || style.StyleCode;

  if (!code || !gasUrl) {
    alert("Erreur : Code Style introuvable dans la ligne sélectionnée.");
    return;
  }

  console.log('[PDF] 🔎 Génération PDF pour :', code);

  try {
    // ─── ÉTAPE 1 : Récupérer l'image depuis la card du dashboard ───
    // style.photoBase64 est injecté par extractCardData() dans index.html
    let photoData = style.photoBase64 || null;

    // Si pas de base64 de la card, essayer de télécharger depuis l'URL
    if (!photoData && (style._imageUrl || style.photoUrl)) {
      const imgUrl = style._imageUrl || style.photoUrl;
      console.log('[PDF] 📥 Téléchargement image depuis URL :', imgUrl);
      photoData = await imgToBase64(imgUrl);
    }

    // ─── ÉTAPE 2 : Charger les données fraîches du serveur ─────────
    const res = await fetch(gasUrl, {
      method: "POST",
      body: JSON.stringify({ action: "GET_STYLE", styleCode: code })
    });
    const json = await res.json();

    if (json.status !== "ok") throw new Error(json.message);
    const s = json.style;
    if (!s) throw new Error("Le serveur a répondu 'OK' mais n'a pas renvoyé les données du style.");

    // Si on n'a toujours pas de photo, essayer le base64 du serveur en dernier recours
    if (!photoData && s.photoBase64) {
      console.log('[PDF] 📥 Image reçue du serveur (fallback)');
      photoData = s.photoBase64;
    }

    // 3. Attente jsPDF
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
    if (photoData) {
      console.log('[PDF] ✅ Image injectée dans le PDF');
      try {
        doc.addImage(photoData, 'JPEG', 15, 70, 80, 80);
      } catch (imgErr) {
        console.warn('[PDF] ⚠️ Erreur addImage, format invalide :', imgErr.message);
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
window.AWCheckers.imgToBase64 = imgToBase64;
window.AWCheckers.imgElementToBase64 = imgElementToBase64;
