// ============================================================
//  PDF Fiche Style – dynamique par style
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
  } catch (_) { }
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
  } catch (_) { }
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

    // Ligne Details principale (flexible)
    const detailRow = (st.details || []).find(r => (r["Cust Style Ref"] || r.Style || '').toLowerCase().trim() === codeLow.trim()) || cardData;
    // Lignes Style (couleurs / Pantone / articles)
    const styleRows = (st.style || []).filter(r => (r.Style || r["Cust Style Ref"] || '').toLowerCase().trim() === codeLow.trim());
    // Lignes Sample
    const sampleRows = (st.sample || []).filter(r => (r.Style || r["Cust Style Ref"] || '').toLowerCase().trim() === codeLow.trim());
    // Lignes Ordering
    const orderRows = (st.ordering || []).filter(r => (r.Style || r["Cust Style Ref"] || '').toLowerCase().trim() === codeLow.trim());

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
    const NAVY = [15, 23, 42];
    const BLUE = [2, 132, 199];
    const INDIGO = [99, 102, 241];
    const GRAY1 = [100, 116, 139];
    const GRAY2 = [148, 163, 184];
    const GRAY3 = [226, 232, 240];
    const WHITE = [255, 255, 255];
    const BLACK = [15, 23, 42];
    const GREEN = [22, 163, 74];
    const AMBER = [245, 158, 11];
    const RED = [239, 68, 68];

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
    const headerTitle = detailRow['Cust Style Ref'] || code || 'STYLE';
    doc.text(headerTitle, M, 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(186, 230, 253); // light blue
    const subHeaderTitle = detailRow['CTLStyleRef'] || '';
    doc.text(subHeaderTitle, M, 24);

    // Date
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Genere le ' + new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }), W - M, 16, { align: 'right' });

    Y = 42;

    // (KPI strip removed per user request)

    // ══════════════════════════════════════════════════════════
    //  SECTION 1 — INFORMATIONS GÉNÉRALES + PHOTO (Regroupées)
    // ══════════════════════════════════════════════════════════
    const d = detailRow;

    // Helper: render a themed field group box
    function renderFieldGroup(title, fields, colCount = 3) {
      checkPage(12 + Math.ceil(fields.length / colCount) * 8.5);
      
      // Section header inside group
      doc.setFillColor(248, 250, 252);
      doc.rect(M, Y, CW, 6, 'F');
      
      // Left border accent
      doc.setFillColor(...BLUE);
      doc.rect(M, Y, 1, 6, 'F');

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(title, M + 3, Y + 4.2);
      
      doc.setDrawColor(...GRAY3);
      doc.setLineWidth(0.2);
      doc.line(M, Y + 6, M + CW, Y + 6);
      Y += 8;

      const startY = Y;
      const colW = CW / colCount;
      fields.forEach((f, i) => {
        const col = i % colCount;
        const row = Math.floor(i / colCount);
        const x = M + col * colW + 3;
        const fieldY = startY + row * 8.5;

        doc.setFontSize(5.8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY1);
        doc.text(f[0].toUpperCase(), x, fieldY);

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        
        let val = String(f[1] || '—').trim();
        if (val === '—') {
          doc.setTextColor(...GRAY2);
          doc.setFont('helvetica', 'normal');
        } else {
          doc.setTextColor(...BLACK);
          doc.setFont('helvetica', 'bold');
        }
        
        const lines = doc.splitTextToSize(val, colW - 5);
        doc.text(lines[0], x, fieldY + 3.8);
      });
      Y = startY + Math.ceil(fields.length / colCount) * 8.5 + 2;
    }

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

    // Layout: photo left, 2-column info grid right
    const imgW = 44, imgH = 44;
    const infoStartX = photoData ? M + imgW + 6 : M;
    const infoAreaW = photoData ? CW - imgW - 6 : CW;

    // Photo style
    if (photoData) {
      try {
        doc.addImage(photoData, 'JPEG', M, Y, imgW, imgH);
        doc.setDrawColor(...GRAY3);
        doc.setLineWidth(0.3);
        doc.rect(M, Y, imgW, imgH);
      } catch (e) {
        doc.setDrawColor(...GRAY3);
        doc.rect(M, Y, imgW, imgH);
        doc.setFontSize(8); doc.setTextColor(...GRAY2);
        doc.text('Photo indisponible', M + 8, Y + imgH / 2);
      }
    }

    // Top fields right next to photo
    const topFields = [
      ['Cust Style Ref', d['Cust Style Ref'] || code || '—'],
      ['Client', d['Client'] || '—'],
      ['Saison', d['Full Season'] || d['SEASON'] || '—'],
      ['Matière', d['FABRIC'] || '—'],
      ['Quantité Conf.', d['Conf Total'] ? Number(d['Conf Total']).toLocaleString('fr-FR') + ' u.' : '—'],
      ['Prix Approuvé', d['Approved Price $'] ? '$' + d['Approved Price $'] : '—'],
    ];

    const savedY = Y;
    let fieldY = Y + 2;
    const col1X = infoStartX;
    const col2X = infoStartX + infoAreaW / 2;
    const colW = infoAreaW / 2 - 2;

    topFields.forEach((f, i) => {
      const col = i % 2;
      const x = col === 0 ? col1X : col2X;

      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY1);
      doc.text(f[0].toUpperCase(), x, fieldY);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLACK);
      const val = String(f[1] || '—');
      const lines = doc.splitTextToSize(val, colW - 2);
      doc.text(lines[0], x, fieldY + 3.8);

      if (col === 1 || i === topFields.length - 1) {
        fieldY += 8.5;
      }
    });

    Y = Math.max(fieldY, savedY + (photoData ? imgH : 0)) + 4;

    // Groups Definition
    const generalFields = [
      ['Collection (Coll)', d['Coll'] || '—'],
      ['P1 / P2', d['P1/ P2'] || '—'],
      ['CTL Style Ref', d['CTLStyleRef'] || '—'],
      ['Style Type', d['Style Type'] || '—'],
      ['Theme', d['Theme'] || '—'],
      ['Priorité', d['PRIORITY'] || '—'],
    ];

    const commercialFields = [
      ['Quantité Cible', d['Target Qty'] ? Number(d['Target Qty']).toLocaleString('fr-FR') + ' u.' : '—'],
      ['Quantité Confirmée', d['Conf Total'] ? Number(d['Conf Total']).toLocaleString('fr-FR') + ' u.' : '—'],
      ['Premier Prix', d['1st Price $'] ? '$' + d['1st Price $'] : '—'],
      ['Prix Cible', d['Target Price $'] ? '$' + d['Target Price $'] : '—'],
      ['Prix Approuvé', d['Approved Price $'] ? '$' + d['Approved Price $'] : '—'],
      ['Chiffre d\'Affaires ($)', d['TO ($)'] ? '$' + d['TO ($)'] : '—'],
    ];

    const logisticsFields = [
      ['Deadline PO', fmtDate(d['PO Deadline'])],
      ['Date Réception PO', fmtDate(d['PO Rec Date'])],
      ['Date Vsl Initiale', fmtDate(d['Initial Vsl Date'])],
      ['Date Vsl Possible', fmtDate(d['Possible Vsl date'])],
      ['ETD Possible', fmtDate(d['Possible etd'])],
    ];

    const technicalFields = [
      ['Matière Principale', d['FABRIC'] || '—'],
      ['Matière Bulk (Fabric)', d['BULK FAB'] || '—'],
      ['Fournitures (Trims)', d['TRIMS DEVELOPMENT'] || '—'],
      ['Statut CRP', d['CRP Status'] || '—'],
      ['Statut Commande', d['Order Status'] || '—'],
    ];

    const developmentFields = [
      ['Fabric Ready Date', fmtDate(d['SAMPLE LENGTH \nREADY DATE'])],
      ['Dispatch Éch. Prov.', fmtDate(d['PROV SAMPLE DISPATCH DATE'])],
      ['Dispatch Éch. Réel', fmtDate(d['ACTUAL SAMPLE DISPATCH DATE'])],
      ['Date Réception DT', fmtDate(d['DT RECEIVED'])],
      ['Date Réception Spec', fmtDate(d['SPEC RECEIVED'])],
    ];

    // Rendering all groups
    renderFieldGroup('IDENTIFICATION & CARACTERISTIQUES', generalFields, 3);
    renderFieldGroup('TARIFS & QUANTITES', commercialFields, 3);
    renderFieldGroup('PLANNING & LOGISTIQUE', logisticsFields, 3);
    renderFieldGroup('MATIERES & TECHNIQUE', technicalFields, 3);
    renderFieldGroup('DEVELOPPEMENT & ECHANTILLONS (DATES)', developmentFields, 3);

    // Comments & Remarks Box
    const commentVal = d['COMMENT'] || d['Comments'] || '';
    const remarkVal = d['remark'] || d['Remarks'] || '';
    if (commentVal || remarkVal) {
      checkPage(18);
      doc.setFillColor(248, 250, 252);
      doc.rect(M, Y, CW, 6, 'F');
      doc.setFillColor(...BLUE);
      doc.rect(M, Y, 1, 6, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text('COMMENTAIRES & REMARQUES', M + 3, Y + 4.2);
      doc.setDrawColor(...GRAY3);
      doc.setLineWidth(0.2);
      doc.line(M, Y + 6, M + CW, Y + 6);
      Y += 8;

      if (commentVal) {
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY1);
        doc.text('COMMENTAIRE GENERAL', M + 3, Y);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BLACK);
        const lines = doc.splitTextToSize(commentVal, CW - 6);
        lines.forEach(l => {
          Y += 3.8;
          doc.text(l, M + 3, Y);
        });
        Y += 6;
      }

      if (remarkVal) {
        checkPage(12);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY1);
        doc.text('REMARQUES INTERNES', M + 3, Y);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BLACK);
        const lines = doc.splitTextToSize(remarkVal, CW - 6);
        lines.forEach(l => {
          Y += 3.8;
          doc.text(l, M + 3, Y);
        });
        Y += 6;
      }
    }

    // ══════════════════════════════════════════════════════════
    //  SECTION 2 — COULEURS & ARTICLES (Style sheet)
    // ══════════════════════════════════════════════════════════
    if (styleRows.length > 0) {
      sectionTitle('COULEURS & ARTICLES  (' + styleRows.length + ')', INDIGO);

      // Table header
      const colorsHeaders = ['GMT Color', 'Pantone', 'Color Code', 'Approval', 'PO', 'Articles', 'Prepack'];
      const cColW = [24, 28, 24, 22, 28, 28, CW - 24 - 28 - 24 - 22 - 28 - 28];
      let cx = M;

      doc.setFillColor(241, 245, 249);
      doc.rect(M, Y, CW, 7, 'F');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GRAY1);
      colorsHeaders.forEach((h, i) => {
        doc.text(h.toUpperCase(), cx + 1.5, Y + 4.8);
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
        doc.setFontSize(7.5);
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
          sr['Articles'] || '---',
          sr['Prepack Barcode'] || '---'
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
      const sColW = [16, 14, 22, 22, 22, 22, 28, CW - 16 - 14 - 22 - 22 - 22 - 22 - 28];

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
      const oColW = [22, 24, 24, 22, 22, 16, 22, CW - 22 - 24 - 24 - 22 - 22 - 16 - 22];

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
        checkPage(20);

        // ── Row background: alternating colors for clarity ──
        // Calculate total row height (data + comments + trims)
        const hasComments = or.Comments ? 1 : 0;
        const hasTrims = (or.Trims || or.PI) ? 1 : 0;
        const rowH = 7 + (hasComments * 8) + (hasTrims * 5);

        if (ri % 2 === 0) {
          doc.setFillColor(232, 240, 254); // light blue tint
        } else {
          doc.setFillColor(248, 250, 252); // very light gray
        }
        doc.rect(M, Y - 1, CW, rowH, 'F');

        // Left accent bar
        doc.setFillColor(...(ri % 2 === 0 ? BLUE : INDIGO));
        doc.rect(M, Y - 1, 1.2, rowH, 'F');

        const status = or.Status || '';
        const delivery = or['Delivery Status'] || '';
        const statusColor = status === 'Confirmed' ? GREEN :
          status === 'Cancelled' ? RED :
            status === 'Pending' ? AMBER : GRAY1;
        const delivColor = delivery === 'Delivered' ? GREEN :
          delivery === 'In Transit' ? BLUE :
            delivery === 'Not Shipped' ? AMBER : GRAY1;

        const vals = [
          or.Color || '---',
          or.Supplier || '---',
          or.PO || '---',
          fmtDate(or['PO Date']),
          fmtDate(or['Ready Date']),
          or.UP || '---',
          status || '---',
          delivery || '---'
        ];

        ox = M + 2;
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
            doc.text(l, M + 5, Y + 2.5);
            Y += 4;
          });
        }

        // Trims + PI line
        if (or.Trims || or.PI) {
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...GRAY2);
          const extra = [or.Trims ? 'Trims: ' + or.Trims : '', or.PI ? 'PI: ' + or.PI : ''].filter(Boolean).join('   |   ');
          doc.text(extra, M + 5, Y + 2.5);
          Y += 5;
        }

        // Bottom separator
        Y += 1;
      });
      Y += 4;
    }


    // ══════════════════════════════════════════════════════════
    //  DYNAMIC SECTIONS (ALL CUSTOM MENUS)
    // ══════════════════════════════════════════════════════════
    const baseKeys = ['details', 'sample', 'ordering', 'style'];
    const customKeys = Object.keys(st).filter(k => !baseKeys.includes(k) && !k.startsWith('_'));
    
    let colorIndex = 0;
    const customColors = [
      [190, 24, 93],  // Pink
      [107, 33, 168], // Purple
      [13, 148, 136], // Teal
      [234, 88, 12]   // Orange
    ];

    customKeys.forEach(cKey => {
      // Find the label from SHEET_CONFIG if possible
      let title = cKey;
      if (window.SHEET_CONFIG && window.SHEET_CONFIG[cKey] && window.SHEET_CONFIG[cKey].label) {
        title = window.SHEET_CONFIG[cKey].label;
      } else {
        title = title.replace('custom_', '').replace(/_[a-z0-9]+$/, '').replace(/_/g, ' ');
      }

      const rows = (st[cKey] || []).filter(r => {
        let s = r.Style || r.style || r.STYLE || r['Style '] || r['Style Code'];
        if (!s) {
          const styleKey = Object.keys(r).find(k => k.toLowerCase().includes('style'));
          if (styleKey) s = r[styleKey];
        }
        
        // Exact match via Style column
        if (s && String(s).toLowerCase().trim() === codeLow.trim()) return true;
        
        // Fallback: check if ANY cell contains the style code
        return Object.values(r).some(v => String(v || '').toLowerCase().includes(codeLow.trim()));
      });
      
      if (rows.length === 0) return;
      
      const themeColor = customColors[colorIndex % customColors.length];
      colorIndex++;
      
      checkPage(20);
      sectionTitle(title.toUpperCase() + '  (' + rows.length + ')', themeColor);
      
      // Extract columns (exclude internal keys and the style column itself)
      const excludeKeys = ['_rowIndex', '_sheetName'];
      let keys = [];
      rows.forEach(r => {
        Object.keys(r).forEach(k => {
          const isStyleCol = k.toLowerCase().includes('style');
          if (!excludeKeys.includes(k) && !k.startsWith('_') && !isStyleCol && !keys.includes(k)) {
            keys.push(k);
          }
        });
      });
      // Limit to 7 columns
      keys = keys.slice(0, 7);
      if (keys.length === 0) return;
      
      const colW = CW / keys.length;
      
      // Header
      doc.setFillColor(241, 245, 249);
      doc.rect(M, Y, CW, 7, 'F');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GRAY1);
      
      keys.forEach((k, i) => {
        doc.text(String(k).substring(0, 15).toUpperCase(), M + (i * colW) + 1.5, Y + 4.8);
      });
      Y += 9;
      
      // Rows
      rows.forEach((r, ri) => {
        checkPage(10);
        if (ri % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(M, Y - 1, CW, 7, 'F');
        }
        
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BLACK);
        
        keys.forEach((k, i) => {
          let val = String(r[k] || '---');
          if (val.match(/^\d{4}-\d{2}-\d{2}T/)) val = fmtDate(val);
          val = val.substring(0, 20);
          
          if (val === 'Approved' || val === 'Pass') {
            doc.setTextColor(...GREEN);
            doc.setFont('helvetica', 'bold');
          } else if (val === 'Rejected' || val === 'Fail') {
            doc.setTextColor(...RED);
            doc.setFont('helvetica', 'bold');
          } else {
            doc.setTextColor(...BLACK);
            doc.setFont('helvetica', 'normal');
          }
          
          doc.text(val, M + (i * colW) + 1.5, Y + 3.5);
        });
        Y += 7;
      });
      Y += 4;
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
