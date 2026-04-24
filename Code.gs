// ============================================================
// AW27 CHECKERS – Google Apps Script (Version INDÉFECTIBLE)
// ============================================================

const SPREADSHEET_ID = "1l8etAWJxSZTrv-Z5umNBzW-HSy4rC8pm3Kr5CsF3OnY";

function doGet(e) {
  try {
    const params = e.parameter || {};
    // On cherche styleCode PARTOUT pour être sûr de ne pas le rater
    const styleCode = (params.styleCode || params.stylecode || params.style || "").trim();
    const action = (params.action || "").toUpperCase();

    // ── SI UN STYLECODE EST PRÉSENT, ON PASSE EN MODE PDF (GET_STYLE) ──
    if (styleCode && (action === "GET_STYLE" || action === "" || !params.action)) {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheets = ss.getSheets();
      let styleData = null;

      for (let s of sheets) {
        if (s.getName().startsWith("_")) continue;
        const data = s.getDataRange().getValues();
        if (data.length < 1) continue;
        const h = data[0].map(x => String(x).trim());
        const idx = h.findIndex(x => x.toLowerCase() === "style");
        if (idx === -1) continue;

        for (let i = 1; i < data.length; i++) {
          if (String(data[i][idx]).trim() === styleCode) {
            styleData = {};
            h.forEach((header, j) => styleData[header] = data[i][j]);
            break;
          }
        }
        if (styleData) break;
      }

      if (styleData) {
        styleData["photoBase64"] = findAndEncodeImage(styleCode, styleData["Image"] || styleData["Photo"] || "");
        const output = JSON.stringify({status:"ok", style: styleData, isPdfRequest: true});
        return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JSON);
      }
      // Si non trouvé, on renvoie une erreur explicite
      return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Style " + styleCode + " non trouvé"})).setMimeType(ContentService.MimeType.JSON);
    }

    // ── CHARGEMENT DASHBOARD PAR DÉFAUT ──
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const dash = { 
      details: readSheet(ss, "Details"), 
      style: readSheet(ss, "Style"), 
      sample: readSheet(ss, "Sample"), 
      ordering: readSheet(ss, "Ordering") 
    };
    return ContentService.createTextOutput(JSON.stringify({ status: "ok", data: dash })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function findAndEncodeImage(styleCode, imageCell) {
  try {
    let fId = "";
    const m = String(imageCell).match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || String(imageCell).match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m) fId = m[1];
    if (!fId) {
      const names = [styleCode + ".JPG", styleCode + ".jpg", styleCode + ".png"];
      for (let n of names) {
        const files = DriveApp.getFilesByName(n);
        if (files.hasNext()) { fId = files.next().getId(); break; }
      }
    }
    if (!fId) {
      const files = DriveApp.searchFiles("title contains '" + styleCode + "'");
      if (files.hasNext()) fId = files.next().getId();
    }
    if (fId) {
      const blob = DriveApp.getFileById(fId).getBlob();
      return "data:" + blob.getContentType() + ";base64," + Utilities.base64Encode(blob.getBytes());
    }
  } catch(e) {}
  return "";
}

function readSheet(ss, name) {
  const s = ss.getSheetByName(name);
  if (!s) return { rows: [] };
  const d = s.getDataRange().getValues();
  if (d.length < 2) return { rows: [] };
  const h = d[0].map(x => String(x).trim());
  return { rows: d.slice(1).map(r => {
    let o = {};
    h.forEach((header, j) => o[header] = r[j]);
    return o;
  })};
}
