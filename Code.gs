// ============================================================
// AW27 CHECKERS – Google Apps Script (FINAL SURVIVAL MODE)
// ============================================================

const SPREADSHEET_ID = "1l8etAWJxSZTrv-Z5umNBzW-HSy4rC8pm3Kr5CsF3OnY";

function doGet(e) {
  try {
    const params = e.parameter || {};
    const action = params.action || "";
    const styleCode = params.styleCode || "";

    // ── ACTION PDF : RÉCUPÉRATION COMPLÈTE DU STYLE + IMAGE ──
    if (action === "GET_STYLE" && styleCode) {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheets = ss.getSheets();
      let styleData = null;
      let headers = [];

      // Recherche universelle du style dans TOUTES les feuilles
      for (let s of sheets) {
        if (s.getName() === "_Menus") continue;
        const data = s.getDataRange().getValues();
        if (data.length < 1) continue;
        headers = data[0].map(h => String(h).trim());
        const styleIdx = headers.findIndex(h => h.toLowerCase() === "style");
        if (styleIdx === -1) continue;

        for (let i = 1; i < data.length; i++) {
          if (String(data[i][styleIdx]).trim() === styleCode) {
            styleData = {};
            headers.forEach((h, j) => styleData[h] = data[i][j]);
            break;
          }
        }
        if (styleData) break;
      }

      if (styleData) {
        // Recherche d'image ultra-poussée
        const imageCell = styleData["Image"] || styleData["Photo"] || styleData["photo"] || styleData["image"] || "";
        styleData["photoBase64"] = findAndEncodeImage(styleCode, imageCell);
        return ContentService.createTextOutput(JSON.stringify({status:"ok", style: styleData})).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Style non trouvé"})).setMimeType(ContentService.MimeType.JSON);
    }

    // ── CHARGEMENT DASHBOARD (VIGNETTES RAPIDES) ──
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const result = { details: readSheet(ss, "Details"), style: readSheet(ss, "Style"), sample: readSheet(ss, "Sample"), ordering: readSheet(ss, "Ordering") };
    return ContentService.createTextOutput(JSON.stringify({ status: "ok", data: result })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function findAndEncodeImage(styleCode, imageCell) {
  try {
    let fId = "";
    // 1. Essayer d'extraire un ID de la cellule
    const m = String(imageCell).match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || String(imageCell).match(/[?&]id=([a-zA-Z0-9_-]+)/) || String(imageCell).match(/^([a-zA-Z0-9_-]{25,})$/);
    if (m) fId = m[1] || m[0];

    // 2. Si pas d'ID, chercher par NOM DE FICHIER dans tout le Drive
    if (!fId) {
      const fileName = imageCell || (styleCode + ".jpg");
      const files = DriveApp.getFilesByName(String(fileName).trim());
      if (files.hasNext()) fId = files.next().getId();
    }
    
    // 3. Fallback : chercher n'importe quel fichier commençant par le code style
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
  return { rows: d.slice(1).map(row => {
    let obj = {};
    h.forEach((header, j) => obj[header] = row[j]);
    return obj;
  })};
}
