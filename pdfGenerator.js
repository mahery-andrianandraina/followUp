// ============================================================
//  AW27 CHECKERS – PDF Fiche Style Complète
//  Regroupe : Details + Couleurs/Style + Samples + Ordering
// ============================================================

(function injectJsPDF() {
  if (window.jspdf) return;
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  s.async = true;
  document.head.appendChild(s);
})();

// ── Helper : download image URL → base64 ──────────────────────
async function imgToBase64(url) {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
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
  } catch (_) {}
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img, 0, 0);
          resolve(c.toDataURL('image/jpeg', 0.92));
        } catch (e) { reject(e); }
      };
      img.onerror = reject;
      img.src = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
      setTimeout(() => reject('timeout'), 8000);
    });
  } catch (_) {}
  return null;
}

// ── Format date helper ────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return String(d);
    return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (_) { return String(d); }
}

// ══════════════════════════════════════════════════════════════
//  MAIN : generateStylePDF
// ══════════════════════════════════════════════════════════════
async function generateStylePDF(cardData) {
  const code = cardData.Style || cardData.StyleCode;
  if (!code) { alert("Erreur : Code Style introuvable."); return; }

  console.log('[PDF] 🔎 Fiche complète pour :', code);

  try {
    // ─── Collecter les données depuis state ───────────────────
    const st = window.state && window.state.data ? window.state.data : {};
    const codeLow = code.toLowerCase();

    // Ligne Details principale
    const detailRow = (st.details || []).find(r => (r.Style || '').toLowerCase() === codeLow) || cardData;
    // Lignes Style (couleurs / Pantone / articles)
    const styleRows = (st.style || []).filter(r => (r.Style || '').toLowerCase() === codeLow);
    // Lignes Sample
    const sampleRows = (st.sample || []).filter(r => (r.Style || '').toLowerCase() === codeLow);
    // Lignes Ordering
    const orderRows = (st.ordering || []).filter(r => (r.Style || '').toLowerCase() === codeLow);

    // ─── Image ────────────────────────────────────────────────
    let photoData = cardData.photoBase64 || null;
    if (!photoData && (cardData._imageUrl || cardData.photoUrl || detailRow._imageUrl)) {
      const imgUrl = cardData._imageUrl || cardData.photoUrl || detailRow._imageUrl;
      console.log('[PDF] 📥 Téléchargement image :', imgUrl);
      photoData = await imgToBase64(imgUrl);
    }

    // ─── jsPDF ────────────────────────────────────────────────
    if (!window.jspdf) {
      await new Promise(r => setTimeout(r, 2000));
    }
    if (!window.jspdf) throw new Error("jsPDF non chargé.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const W = 210, M = 12; // page width, margin
    const CW = W - 2 * M;  // content width

    // ── Colors ──
    const NAVY   = [15, 23, 42];
    const BLUE   = [2, 132, 199];
    const INDIGO  = [99, 102, 241];
    const GRAY1  = [100, 116, 139];
    const GRAY2  = [148, 163, 184];
    const GRAY3  = [226, 232, 240];
    const WHITE  = [255, 255, 255];
    const BLACK  = [15, 23, 42];
    const GREEN  = [22, 163, 74];
    const AMBER  = [245, 158, 11];
    const RED    = [239, 68, 68];

    let Y = 0; // current Y position

    // ── Helper: check page break ──
    function checkPage(needed) {
      if (Y + needed > 280) {
        doc.addPage();
        Y = 15;
        return true;
      }
      return false;
    }

    // ══════════════════════════════════════════════════════════
    //  HEADER BAND
    // ══════════════════════════════════════════════════════════
    // Gradient effect: two rectangles
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 38, 'F');
    doc.setFillColor(...BLUE);
    doc.rect(0, 36, W, 4, 'F');

    doc.setTextColor(...WHITE);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('AW27 CHECKERS', M, 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(186, 230, 253); // light blue
    doc.text('FICHE STYLE COMPLETE', M, 24);

    // Date
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Genere le ' + new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }), W - M, 16, { align: 'right' });

    Y = 46;

    // ══════════════════════════════════════════════════════════
    //  SECTION 1 — INFORMATIONS GÉNÉRALES + PHOTO
    // ══════════════════════════════════════════════════════════
    const d = detailRow;
    const infoFields = [
      ['Style',       d.Style || code],
      ['Description', d.Description || d.StyleDescription || '—'],
      ['Client',      d.Client || '—'],
      ['Saison',      d.Saison || '—'],
      ['Departement', d.Dept || '---'],
      ['Fabric Base', d['Fabric Base'] || d.Fabric || '—'],
      ['Costing',     d.Costing || '—'],
      ['Order Qty',   d['Order Qty'] || d.Qty || '—'],
      ['PSD',         fmtDate(d.PSD)],
      ['Ex-Fty',      fmtDate(d['Ex-Fty'])],
      ['Comments',    d.Comments || d.Remarks || '---'],
    ];

    // Section title
    function sectionTitle(title, color) {
      checkPage(14);
      doc.setFillColor(...(color || BLUE));
      doc.roundedRect(M, Y, CW, 8, 1.5, 1.5, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(title, M + 4, Y + 5.5);
      Y += 12;
    }

    sectionTitle('INFORMATIONS GENERALES', NAVY);

    // Layout: image left (if available), info right
    const imgW = 55, imgH = 55;
    const infoStartX = photoData ? M + imgW + 8 : M;
    const infoColW = photoData ? CW - imgW - 8 : CW;

    // Photo
    if (photoData) {
      try {
        doc.addImage(photoData, 'JPEG', M, Y, imgW, imgH);
        // Photo border
        doc.setDrawColor(...GRAY3);
        doc.setLineWidth(0.3);
        doc.rect(M, Y, imgW, imgH);
      } catch (e) {
        doc.setDrawColor(...GRAY3);
        doc.rect(M, Y, imgW, imgH);
        doc.setFontSize(8); doc.setTextColor(...GRAY2);
        doc.text('Photo indisponible', M + 10, Y + imgH / 2);
      }
    }

    // Info fields
    const savedY = Y;
    let fieldY = Y;
    infoFields.forEach((f, i) => {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY1);
      doc.text(f[0].toUpperCase(), infoStartX, fieldY);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLACK);
      const val = String(f[1] || '—');
      // Truncate long values
      const maxW = infoColW - 4;
      const lines = doc.splitTextToSize(val, maxW);
      doc.text(lines[0], infoStartX, fieldY + 4.5);
      fieldY += 11;
    });

    Y = Math.max(fieldY, savedY + (photoData ? imgH + 4 : 0)) + 4;

    // ══════════════════════════════════════════════════════════
    //  SECTION 2 — COULEURS & ARTICLES (Style sheet)
    // ══════════════════════════════════════════════════════════
    if (styleRows.length > 0) {
      sectionTitle('COULEURS & ARTICLES  (' + styleRows.length + ')', INDIGO);

      // Table header
      const colorsHeaders = ['GMT Color', 'Pantone', 'Color Code', 'Approval', 'PO', 'Articles'];
      const cColW = [28, 32, 28, 24, 34, CW - 28 - 32 - 28 - 24 - 34];
      let cx = M;

      doc.setFillColor(241, 245, 249);
      doc.rect(M, Y, CW, 7, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GRAY1);
      colorsHeaders.forEach((h, i) => {
        doc.text(h.toUpperCase(), cx + 2, Y + 4.8);
        cx += cColW[i];
      });
      Y += 9;

      // Rows
      styleRows.forEach((sr, ri) => {
        checkPage(8);
        if (ri % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(M, Y - 1, CW, 7, 'F');
        }
        cx = M;
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BLACK);

        const apvl = sr['Approval'] || '';
        const apvlColor = apvl === 'Approved' ? GREEN : apvl === 'Rejected' ? RED : GRAY1;

        const vals = [
          sr['GMT Color'] || '---',
          sr['Pantone'] || '---',
          sr['Color Code'] || '---',
          apvl || '---',
          sr['PO'] || '---',
          sr['Articles'] || '---'
        ];
        vals.forEach((v, i) => {
          if (i === 3) {
            // Approval with color
            doc.setTextColor(...apvlColor);
            doc.setFont('helvetica', 'bold');
          } else {
            doc.setTextColor(...BLACK);
            doc.setFont('helvetica', 'normal');
          }
          doc.text(String(v).substring(0, 30), cx + 2, Y + 3.5);
          cx += cColW[i];
        });

        // Color swatch
        if (sr['GMT Color'] || sr['Pantone']) {
          const hex = (typeof resolveColorHex === 'function')
            ? resolveColorHex(sr['GMT Color'], sr['Pantone'])
            : null;
          if (hex && !hex.includes('gradient')) {
            const r = parseInt(hex.slice(1, 3), 16) || 200;
            const g = parseInt(hex.slice(3, 5), 16) || 200;
            const b = parseInt(hex.slice(5, 7), 16) || 200;
            doc.setFillColor(r, g, b);
            doc.circle(M + 25, Y + 2.5, 2.2, 'F');
            doc.setDrawColor(...GRAY3);
            doc.circle(M + 25, Y + 2.5, 2.2, 'S');
          }
        }
        Y += 7;
      });
      Y += 4;
    }

    // ══════════════════════════════════════════════════════════
    //  SECTION 3 — SAMPLES
    // ══════════════════════════════════════════════════════════
    if (sampleRows.length > 0) {
      sectionTitle('SUIVI DES SAMPLES  (' + sampleRows.length + ')', [22, 163, 74]);

      const sHeaders = ['Type', 'Size', 'Fabric', 'SRS Date', 'Ready', 'Sending', 'AWB', 'Approval'];
      const sColW   = [16, 14, 22, 22, 22, 22, 28, CW - 16 - 14 - 22 - 22 - 22 - 22 - 28];

      // Header
      doc.setFillColor(241, 245, 249);
      doc.rect(M, Y, CW, 7, 'F');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GRAY1);
      let sx = M;
      sHeaders.forEach((h, i) => {
        doc.text(h.toUpperCase(), sx + 1.5, Y + 4.8);
        sx += sColW[i];
      });
      Y += 9;

      sampleRows.forEach((sr, ri) => {
        checkPage(14);
        if (ri % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(M, Y - 1, CW, 7, 'F');
        }

        const approval = sr.Approval || '';
        const approvalColor = approval === 'Approved' ? GREEN :
                              approval === 'Rejected' ? RED :
                              approval === 'Pending' ? AMBER : GRAY1;

        const vals = [
          sr.Type || '—',
          sr.Size || '—',
          sr.Fabric || '—',
          fmtDate(sr['SRS Date']),
          fmtDate(sr['Ready Date']),
          fmtDate(sr['Sending Date']),
          sr.AWB || '—',
          approval || '—'
        ];

        sx = M;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        vals.forEach((v, i) => {
          if (i === vals.length - 1) {
            // Approval badge
            doc.setTextColor(...approvalColor);
            doc.setFont('helvetica', 'bold');
          } else {
            doc.setTextColor(...BLACK);
            doc.setFont('helvetica', 'normal');
          }
          doc.text(String(v).substring(0, 20), sx + 1.5, Y + 3.5);
          sx += sColW[i];
        });
        Y += 7;

        // Remarks line (if any)
        if (sr.Remarks) {
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(...GRAY1);
          const remarkLines = doc.splitTextToSize('Remarques : ' + sr.Remarks, CW - 8);
          remarkLines.slice(0, 2).forEach(l => {
            doc.text(l, M + 4, Y + 2.5);
            Y += 4;
          });
        }
      });
      Y += 4;
    }

    // ══════════════════════════════════════════════════════════
    //  SECTION 4 — ORDERING
    // ══════════════════════════════════════════════════════════
    if (orderRows.length > 0) {
      sectionTitle('COMMANDES / ORDERING  (' + orderRows.length + ')', [234, 88, 12]);

      const oHeaders = ['Color', 'Supplier', 'PO #', 'PO Date', 'Ready', 'UP', 'Status', 'Delivery'];
      const oColW   = [22, 24, 24, 22, 22, 16, 22, CW - 22 - 24 - 24 - 22 - 22 - 16 - 22];

      // Header
      doc.setFillColor(241, 245, 249);
      doc.rect(M, Y, CW, 7, 'F');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GRAY1);
      let ox = M;
      oHeaders.forEach((h, i) => {
        doc.text(h.toUpperCase(), ox + 1.5, Y + 4.8);
        ox += oColW[i];
      });
      Y += 9;

      orderRows.forEach((or, ri) => {
        checkPage(14);
        if (ri % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(M, Y - 1, CW, 7, 'F');
        }

        const status = or.Status || '';
        const delivery = or['Delivery Status'] || '';
        const statusColor = status === 'Confirmed' ? GREEN :
                            status === 'Cancelled' ? RED :
                            status === 'Pending' ? AMBER : GRAY1;
        const delivColor = delivery === 'Delivered' ? GREEN :
                           delivery === 'In Transit' ? BLUE :
                           delivery === 'Not Shipped' ? AMBER : GRAY1;

        const vals = [
          or.Color || '—',
          or.Supplier || '—',
          or.PO || '—',
          fmtDate(or['PO Date']),
          fmtDate(or['Ready Date']),
          or.UP || '—',
          status || '—',
          delivery || '—'
        ];

        ox = M;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        vals.forEach((v, i) => {
          if (i === 6) {
            doc.setTextColor(...statusColor);
            doc.setFont('helvetica', 'bold');
          } else if (i === 7) {
            doc.setTextColor(...delivColor);
            doc.setFont('helvetica', 'bold');
          } else {
            doc.setTextColor(...BLACK);
            doc.setFont('helvetica', 'normal');
          }
          doc.text(String(v).substring(0, 20), ox + 1.5, Y + 3.5);
          ox += oColW[i];
        });
        Y += 7;

        // Comments (if any)
        if (or.Comments) {
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(...GRAY1);
          const cLines = doc.splitTextToSize('Note : ' + or.Comments, CW - 8);
          cLines.slice(0, 2).forEach(l => {
            doc.text(l, M + 4, Y + 2.5);
            Y += 4;
          });
        }

        // Trims + PI line
        if (or.Trims || or.PI) {
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...GRAY2);
          const extra = [or.Trims ? 'Trims: ' + or.Trims : '', or.PI ? 'PI: ' + or.PI : ''].filter(Boolean).join('   |   ');
          doc.text(extra, M + 4, Y + 2.5);
          Y += 5;
        }
      });
      Y += 4;
    }

    // ══════════════════════════════════════════════════════════
    //  SECTION 5 — RÉSUMÉ STATISTIQUE
    // ══════════════════════════════════════════════════════════
    checkPage(30);
    sectionTitle('RESUME', NAVY);

    const totalOrderQty = +detailRow['Order Qty'] || 0;
    const samplesApproved = sampleRows.filter(r => r.Approval === 'Approved').length;
    const samplesPending = sampleRows.filter(r => r.Approval === 'Pending').length;
    const samplesRejected = sampleRows.filter(r => r.Approval === 'Rejected').length;
    const ordersConfirmed = orderRows.filter(r => r.Status === 'Confirmed').length;
    const ordersDelivered = orderRows.filter(r => r['Delivery Status'] === 'Delivered').length;

    const stats = [
      ['Order Qty',       totalOrderQty.toLocaleString('fr-FR')],
      ['Couleurs',        styleRows.length + ' variantes'],
      ['Samples',         sampleRows.length + ' total - ' + samplesApproved + ' approuve(s), ' + samplesPending + ' en attente, ' + samplesRejected + ' rejete(s)'],
      ['Commandes',       orderRows.length + ' lignes - ' + ordersConfirmed + ' confirmee(s), ' + ordersDelivered + ' livree(s)'],
    ];

    stats.forEach(s => {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLUE);
      doc.text(s[0].toUpperCase(), M + 4, Y + 1);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BLACK);
      doc.setFontSize(9);
      doc.text(s[1], M + 40, Y + 1);
      Y += 7;
    });

    // ══════════════════════════════════════════════════════════
    //  FOOTER
    // ══════════════════════════════════════════════════════════
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setTextColor(...GRAY2);
      doc.text('AW27 CHECKERS - Fiche Style ' + code, M, 292);
      doc.text('Page ' + p + ' / ' + totalPages, W - M, 292, { align: 'right' });
      // Bottom line
      doc.setDrawColor(...GRAY3);
      doc.setLineWidth(0.3);
      doc.line(M, 289, W - M, 289);
    }

    doc.save('Fiche_' + code + '.pdf');
    console.log('[PDF] ✅ Fiche complète générée');

  } catch (err) {
    console.error('[PDF] Erreur :', err);
    alert("Échec de génération : " + err.message);
  }
}

window.AWCheckers = window.AWCheckers || {};
window.AWCheckers.generateStylePDF = generateStylePDF;
window.AWCheckers.imgToBase64 = imgToBase64;
