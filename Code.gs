// ============================================================
// AW27 CHECKERS – Universal Image Search (CORRECTED)
// ============================================================

const SPREADSHEET_ID = "1l8etAWJxSZTrv-Z5umNBzW-HSy4rC8pm3Kr5CsF3OnY";

function doGet(e) {
  try {
    const params = e.parameter || {};
    const action = params.action || "";
    const styleCode = (params.styleCode || "").trim();

    if (action === "GET_STYLE" && styleCode) {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheets = ss.getSheets();
      let styleData = null;

      for (let s of sheets) {
        if (s.getName() === "_Menus") continue;
        const data = s.getDataRange().getValues();
        if (data.length < 1) continue;
        const headers = data[0].map(h => String(h).trim());
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
        styleData["photoBase64"] = findAndEncodeImage(styleCode, styleData["Image"] || styleData["Photo"] || "");
        // CRITIQUE : Ajout du return explicite ici !
        return ContentService.createTextOutput(JSON.stringify({status:"ok", style: styleData})).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Style " + styleCode + " non trouvé dans les feuilles"})).setMimeType(ContentService.MimeType.JSON);
    }

    // Dashboard
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const res = { details: readSheet(ss, "Details"), style: readSheet(ss, "Style"), sample: readSheet(ss, "Sample"), ordering: readSheet(ss, "Ordering") };
    return ContentService.createTextOutput(JSON.stringify({ status: "ok", data: res })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function findAndEncodeImage(styleCode, imageCell) {
  try {
    let fId = "";
    // 1. Recherche par ID direct
    const m = String(imageCell).match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || String(imageCell).match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m) fId = m[1];

    // 2. Recherche par Nom exact (avec .JPG ou .jpg)
    if (!fId) {
      const names = [styleCode + ".JPG", styleCode + ".jpg", styleCode + ".jpeg", styleCode + ".png"];
      for (let name of names) {
        const files = DriveApp.getFilesByName(name);
        if (files.hasNext()) { fId = files.next().getId(); break; }
      }
    }
    
    // 3. Recherche floue
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
