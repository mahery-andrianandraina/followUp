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
    doc.text('AW27 CHECKERS', M, 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(186, 230, 253); // light blue
    doc.text('FICHE STYLE COMPLETE', M, 24);

    // Date
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Genere le ' + new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }), W - M, 16, { align: 'right' });

    Y = 42;

    // ══════════════════════════════════════════════════════════
    //  KPI STRIP (compact metrics bar)
    // ══════════════════════════════════════════════════════════
    // Days to Ex-Fty
    const exFtyDate = detailRow['Ex-Fty'] ? new Date(detailRow['Ex-Fty']) : null;
    const psdDate = detailRow['PSD'] ? new Date(detailRow['PSD']) : null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const daysToExFty = exFtyDate ? Math.round((exFtyDate - today) / 86400000) : null;
    const daysLabel = daysToExFty !== null ? (daysToExFty < 0 ? Math.abs(daysToExFty) + 'j en retard' : daysToExFty + ' jours') : '---';
    const daysColor = daysToExFty !== null ? (daysToExFty < 0 ? RED : daysToExFty <= 14 ? AMBER : GREEN) : GRAY1;

    // OK to Production (PPS approved?)
    const ppsRow = sampleRows.find(r => (r.Type || '').toUpperCase().includes('PPS') || (r.Type || '').toUpperCase().includes('PP SAMPLE'));
    const ppsApproved = ppsRow && ppsRow.Approval === 'Approved';
    const okToProdLabel = !ppsRow ? 'No PPS launched yet' : ppsApproved ? 'YES' : 'NO';
    const okToProdColor = !ppsRow ? GRAY1 : ppsApproved ? GREEN : RED;

    // Delivery progress
    const ordersDelivered = orderRows.filter(r => r['Delivery Status'] === 'Delivered').length;
    const delivLabel = orderRows.length === 0 ? 'No order' : ordersDelivered + ' / ' + orderRows.length;
    const delivColor = orderRows.length === 0 ? GRAY1
      : ordersDelivered === orderRows.length ? GREEN
        : ordersDelivered > 0 ? BLUE : AMBER;

    // Lead Time (PSD to Ex-Fty)
    const leadDays = (psdDate && exFtyDate) ? Math.round((exFtyDate - psdDate) / 86400000) : null;
    const leadLabel = leadDays !== null ? leadDays + ' jours' : '---';
    const leadColor = leadDays !== null ? (leadDays < 30 ? RED : leadDays <= 60 ? AMBER : BLUE) : GRAY1;

    const kpis = [
      { label: 'EX-FTY', value: daysLabel, color: daysColor },
      { label: 'OK TO PROD', value: okToProdLabel, color: okToProdColor },
      { label: 'DELIVERY', value: delivLabel, color: delivColor },
      { label: 'LEAD TIME', value: leadLabel, color: leadColor },
    ];

    const kpiW = CW / kpis.length;
    const kpiH = 10;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(M, Y, CW, kpiH, 1.5, 1.5, 'F');

    kpis.forEach((k, i) => {
      const kx = M + i * kpiW;
      // Vertical separator
      if (i > 0) {
        doc.setDrawColor(...GRAY3);
        doc.setLineWidth(0.2);
        doc.line(kx, Y + 1.5, kx, Y + kpiH - 1.5);
      }
      // Label
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY1);
      doc.text(k.label, kx + kpiW / 2, Y + 3.5, { align: 'center' });
      // Value
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...k.color);
      doc.text(k.value, kx + kpiW / 2, Y + 8.5, { align: 'center' });
    });

    Y += kpiH + 4;

    // ══════════════════════════════════════════════════════════
    //  SECTION 1 — INFORMATIONS GÉNÉRALES + PHOTO
    // ══════════════════════════════════════════════════════════
    const d = detailRow;
    const infoFields = [
      ['Style', d.Style || code],
      ['Client', d.Client || '---'],
      ['Description', d.Description || d.StyleDescription || '---'],
      ['Saison', d.Saison || '---'],
      ['Departement', d.Dept || '---'],
      ['Fabric Base', d['Fabric Base'] || d.Fabric || '---'],
      ['Costing', d.Costing || '---'],
      ['Order Qty', d['Order Qty'] || d.Qty || '---'],
      ['PSD', fmtDate(d.PSD)],
      ['Ex-Fty', fmtDate(d['Ex-Fty'])],
    ];
    const commentsVal = d.Comments || d.Remarks || '';

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
    const imgW = 48, imgH = 48;
    const infoStartX = photoData ? M + imgW + 6 : M;
    const infoAreaW = photoData ? CW - imgW - 6 : CW;

    // Photo
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

    // Info fields in 2-column grid
    const savedY = Y;
    const col1X = infoStartX;
    const col2X = infoStartX + infoAreaW / 2;
    const colW = infoAreaW / 2 - 2;
    let fieldY = Y;

    infoFields.forEach((f, i) => {
      const col = i % 2; // 0 = left, 1 = right
      const x = col === 0 ? col1X : col2X;

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY1);
      doc.text(f[0].toUpperCase(), x, fieldY);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLACK);
      const val = String(f[1] || '---');
      const lines = doc.splitTextToSize(val, colW);
      doc.text(lines[0], x, fieldY + 4);

      // Move Y down only after right column (or last item)
      if (col === 1 || i === infoFields.length - 1) {
        fieldY += 9;
      }
    });

    // Comments on full width below (if any)
    if (commentsVal) {
      fieldY += 1;
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY1);
      doc.text('COMMENTS', infoStartX, fieldY);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...BLACK);
      const cLines = doc.splitTextToSize(commentsVal, infoAreaW - 4);
      cLines.slice(0, 2).forEach(l => {
        fieldY += 4;
        doc.text(l, infoStartX, fieldY);
      });
      fieldY += 2;
    }

    Y = Math.max(fieldY, savedY + (photoData ? imgH + 4 : 0)) + 3;

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
