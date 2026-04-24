// ============================================================
// AW27 CHECKERS – Google Apps Script (Version ULTIME SANS PERMISSIONS)
// ============================================================

const SPREADSHEET_ID = "1l8etAWJxSZTrv-Z5umNBzW-HSy4rC8pm3Kr5CsF3OnY";
const SHEET_NAMES = { details: "Details", style: "Style", sample: "Sample", ordering: "Ordering" };

function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const fId = (params.fileId || params.fileid || "").trim();

    // ── PROXY UNIVERSEL (Ne nécessite pas de partage Drive complexe) ──
    if (fId && fId.length > 20) {
      try {
        // On récupère l'image comme un visiteur externe via le Thumbnail public
        const thumbUrl = "https://drive.google.com/thumbnail?id=" + fId + "&sz=w600";
        const response = UrlFetchApp.fetch(thumbUrl, { muteHttpExceptions: true });
        
        if (response.getResponseCode() === 200) {
          const blob = response.getBlob();
          const base64 = Utilities.base64Encode(blob.getBytes());
          const dataUrl = "data:" + (blob.getContentType() || "image/jpeg") + ";base64," + base64;
          return ContentService.createTextOutput(JSON.stringify({status:"ok", dataUrl: dataUrl})).setMimeType(ContentService.MimeType.JSON);
        } else {
          return ContentService.createTextOutput(JSON.stringify({status:"error", message: "Accès Drive refusé au script (Vérifiez le partage du dossier PICTURES)"})).setMimeType(ContentService.MimeType.JSON);
        }
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({status:"error", message: err.message})).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // ── LECTURE DES DONNÉES (Pour le Dashboard) ──
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const result = {};
    for (const [key, sheetName] of Object.entries(SHEET_NAMES)) {
      result[key] = readSheet(ss, sheetName);
    }
    
    // Injection des URLs pour le dashboard
    for (const key in result) {
      if (result[key] && result[key].rows) {
        result[key].rows = result[key].rows.map(function(row) {
          const imgCell = row["Image"] || row["Photo"] || row["photo"] || row["ImageUrl"] || "";
          let fId = "";
          const m = imgCell.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || imgCell.match(/[?&]id=([a-zA-Z0-9_-]+)/) || imgCell.match(/^([a-zA-Z0-9_-]{25,})$/);
          if (m) fId = m[1] || m[0];
          const thumb = fId ? "https://drive.google.com/thumbnail?id=" + fId + "&sz=w400" : "";
          return Object.assign({}, row, { _imageUrl: thumb });
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "ok", data: result })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function readSheet(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { rows: [] };
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { rows: [] };
  const headers = data[0].map(h => String(h).trim());
  const rows = data.slice(1).map((row, i) => {
    const obj = { _rowIndex: i + 2 };
    headers.forEach((h, j) => {
      let val = row[j];
      if (val instanceof Date) val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
      obj[h] = (val === null || val === undefined) ? "" : val;
    });
    return obj;
  }).filter(r => headers.some(h => r[h] !== ""));
  return { rows };
}
