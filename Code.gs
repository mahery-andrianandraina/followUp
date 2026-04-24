// ============================================================
// AW27 CHECKERS – Google Apps Script (Version FINALE ABSOLUE)
// ============================================================

const SPREADSHEET_ID = "1l8etAWJxSZTrv-Z5umNBzW-HSy4rC8pm3Kr5CsF3OnY";
const PICTURES_FOLDER_NAME = "PICTURES";
const PARENT_FOLDER_NAME   = "AW27 CHECKERS";

const SHEET_NAMES = { details: "Details", style: "Style", sample: "Sample", ordering: "Ordering" };

function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action || "";
    const styleCode = params.styleCode || "";

    // ── NOUVELLE ACTION: RÉCUPÉRATION D'UN STYLE UNIQUE AVEC IMAGE BASE64 ──
    if (action === "GET_STYLE" && styleCode) {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName("Details");
      const data = sheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim());
      
      let styleData = null;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][headers.indexOf("Style")]) === styleCode) {
          styleData = {};
          headers.forEach((h, j) => styleData[h] = data[i][j]);
          break;
        }
      }

      if (styleData) {
        // Encodage image côté SERVEUR (Zéro problème CORS)
        const imageCell = styleData["Image"] || styleData["Photo"] || styleData["photo"] || "";
        styleData["photoBase64"] = getBase64Image(styleCode, imageCell);
        return ContentService.createTextOutput(JSON.stringify({status:"ok", style: styleData})).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({status:"error", message:"Style introuvable"})).setMimeType(ContentService.MimeType.JSON);
    }

    // ── CHARGEMENT STANDARD DU DASHBOARD (Toujours rapide) ──
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const result = {};
    for (const [key, sheetName] of Object.entries(SHEET_NAMES)) {
      result[key] = readSheet(ss, sheetName);
    }
    
    // On ne renvoie que des vignettes simples pour le dashboard
    for (const key in result) {
      if (result[key] && result[key].rows) {
        result[key].rows = result[key].rows.map(function(row) {
          const imgCell = row["Image"] || row["Photo"] || row["photo"] || "";
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

// Fonction serveur pour encoder l'image en base64
function getBase64Image(styleCode, imageCell) {
  try {
    let fId = "";
    const m = imageCell.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || imageCell.match(/[?&]id=([a-zA-Z0-9_-]+)/) || imageCell.match(/^([a-zA-Z0-9_-]{25,})$/);
    if (m) fId = m[1] || m[0];

    if (!fId) {
      const parentIter = DriveApp.getFoldersByName(PARENT_FOLDER_NAME);
      if (parentIter.hasNext()) {
        const p = parentIter.next();
        const c = p.getFoldersByName(PICTURES_FOLDER_NAME);
        if (c.hasNext()) {
          const folder = c.next();
          const files = folder.getFilesByName(styleCode + ".jpg"); // simplifié pour le test
          if (files.hasNext()) fId = files.next().getId();
        }
      }
    }

    if (fId) {
      const blob = DriveApp.getFileById(fId).getBlob();
      return "data:" + blob.getContentType() + ";base64," + Utilities.base64Encode(blob.getBytes());
    }
  } catch(e) {}
  return "";
}

function readSheet(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  return {
    rows: data.slice(1).map((row, i) => {
      const obj = { _rowIndex: i + 2 };
      headers.forEach((h, j) => {
        let val = row[j];
        if (val instanceof Date) val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
        obj[h] = val ?? "";
      });
      return obj;
    }).filter(r => headers.some(h => r[h] !== ""))
  };
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const { action, sheet: sheetKey, data, rowIndex } = payload;
    let sheetName = SHEET_NAMES[sheetKey] || sheetKey;
    const sheet = ss.getSheetByName(sheetName);
    const h = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(x => String(x).trim());
    
    if (action === "CREATE") sheet.appendRow(h.map(col => data[col] ?? ""));
    else if (action === "UPDATE") {
      const r = sheet.getRange(rowIndex, 1, 1, h.length);
      const vals = r.getValues()[0];
      const next = h.map((col, i) => Object.prototype.hasOwnProperty.call(data, col) ? data[col] : vals[i]);
      r.setValues([next]);
    } else if (action === "DELETE") sheet.deleteRow(rowIndex);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}
