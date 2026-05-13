// ============================================================
// AW27 CHECKERS – Google Apps Script (Version VERDICT)
// ============================================================

const SPREADSHEET_ID = "1l8etAWJxSZTrv-Z5umNBzW-HSy4rC8pm3Kr5CsF3OnY";
const SHEET_NAMES = { details: "Details", style: "Style", sample: "Sample" };

function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = ss.getSheets();
    const result = {};
    
    sheets.forEach(s => {
      const name = s.getName();
      if (name.startsWith("_")) return;
      // On cherche la clé dans SHEET_NAMES, sinon on utilise le nom en minuscules
      const key = Object.keys(SHEET_NAMES).find(k => SHEET_NAMES[k] === name) || name.toLowerCase();
      result[key] = readSheet(ss, name);
    });
    
    return ContentService.createTextOutput(JSON.stringify({ status: "ok", data: result })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action || "";
    
    // ── GESTION PDF ──
    if (action === "GET_STYLE") {
      const styleCode = (payload.styleCode || "").trim().toUpperCase();
      if (!styleCode) throw new Error("StyleCode manquant dans la requête.");

      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheets = ss.getSheets();
      let styleData = null;

      for (let s of sheets) {
        if (s.getName().startsWith("_")) continue;
        const data = s.getDataRange().getValues();
        const h = data[0].map(x => String(x).trim());
        const idx = h.findIndex(x => x.toLowerCase().includes("style"));
        if (idx === -1) continue;

        for (let i = 1; i < data.length; i++) {
          const cellVal = String(data[i][idx]).trim().toUpperCase();
          if (cellVal === styleCode) {
            styleData = {};
            h.forEach((header, j) => styleData[header] = data[i][j]);
            break;
          }
        }
        if (styleData) break;
      }

      if (styleData) {
        styleData["photoBase64"] = findAndEncodeImage(styleCode, styleData["Image"] || styleData["Photo"] || "");
        return ContentService.createTextOutput(JSON.stringify({status:"ok", style: styleData})).setMimeType(ContentService.MimeType.JSON);
      } else {
        // ON ARRÊTE TOUT ICI SI NON TROUVÉ
        return ContentService.createTextOutput(JSON.stringify({status:"error", message: "Style '" + styleCode + "' introuvable dans le fichier Sheets."})).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // ── GESTION DONNÉES (CREATE/UPDATE/DELETE) ──
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheetKey = payload.sheet;
    if (!sheetKey) throw new Error("Paramètre 'sheet' manquant dans le payload.");

    let sheetName = (SHEET_NAMES[sheetKey] || sheetKey).toString().trim();
    
    // Recherche de la feuille (insensible à la casse)
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      const allSheets = ss.getSheets();
      const found = allSheets.find(s => s.getName().toLowerCase() === sheetName.toLowerCase());
      if (found) {
        sheet = found;
        sheetName = sheet.getName();
      }
    }

    // ── GESTION IMPORTATION EN BLOC (NOUVELLE FEUILLE) ──
    if (action === "FORCE_IMPORT_V2") {
      if (!sheet) {
        try {
          sheet = ss.insertSheet(sheetName);
        } catch (e) {
          throw new Error("[V2] Échec création feuille '" + sheetName + "'. Erreur Google : " + e.message);
        }
      }
      const { headers, rows } = payload;
      
      if (sheet.getLastRow() === 0 && headers && headers.length) {
        sheet.appendRow(headers);
        SpreadsheetApp.flush();
      }
      
      let currentHeaders = [];
      if (sheet.getLastColumn() > 0) {
        currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(x => String(x).trim());
      }
      
      const finalHeaders = (currentHeaders.length === 0 || (currentHeaders.length === 1 && !currentHeaders[0])) 
        ? headers 
        : currentHeaders;

      if (!finalHeaders || !finalHeaders.length) throw new Error("[V2] En-têtes introuvables pour '" + sheetName + "'");

      const values = rows.map(r => finalHeaders.map(h => r[h] !== undefined && r[h] !== null ? String(r[h]) : ""));
      
      if (values.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, values.length, finalHeaders.length).setValues(values);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "ok", version: "V2_FORCE", action: action, sheet: sheetName })).setMimeType(ContentService.MimeType.JSON);
    }

    // Pour les autres actions (CREATE/UPDATE/DELETE)
    if (!sheet && action === "CREATE") {
      sheet = ss.insertSheet(sheetName);
      const dataKeys = Object.keys(payload.data || {});
      if (dataKeys.length) {
        sheet.appendRow(dataKeys);
        SpreadsheetApp.flush();
      }
    }

    if (!sheet) {
      throw new Error("[V2] Feuille '" + sheetName + "' introuvable dans le classeur. (ID: " + SPREADSHEET_ID + ")");
    }

    const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(x => String(x).trim());
    const { rowIndex, data } = payload;

    if (action === "CREATE") {
      sheet.appendRow(currentHeaders.map(h => data[h] !== undefined && data[h] !== null ? String(data[h]) : ""));
    } else if (action === "UPDATE") {
      if (!rowIndex || rowIndex < 2) throw new Error("Index de ligne invalide pour l'update : " + rowIndex);
      const r = sheet.getRange(rowIndex, 1, 1, currentHeaders.length);
      const cur = r.getValues()[0];
      const next = currentHeaders.map((h, i) => Object.prototype.hasOwnProperty.call(data, h) ? String(data[h]) : cur[i]);
      r.setValues([next]);
    } else if (action === "DELETE") {
      if (!rowIndex || rowIndex < 2) throw new Error("Index de ligne invalide pour la suppression : " + rowIndex);
      sheet.deleteRow(rowIndex);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "ok", version: "V2", action: action, sheet: sheetName })).setMimeType(ContentService.MimeType.JSON);

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
