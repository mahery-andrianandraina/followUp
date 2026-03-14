// ============================================================
// AW27 CHECKERS – Google Apps Script
// ============================================================

const SPREADSHEET_ID = "1l8etAWJxSZTrv-Z5umNBzW-HSy4rC8pm3Kr5CsF3OnY";

const SHEET_NAMES = {
  details:  "Details",
  style:    "Style",
  sample:   "Sample",
  ordering: "Ordering"
};


// ─── GET : lecture de toutes les feuilles ─────────────────────
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const result = {};

    // ── Feuilles fixes
    for (const [key, sheetName] of Object.entries(SHEET_NAMES)) {
      result[key] = readSheet(ss, sheetName);
    }

    // ── Injecter _imageUrl depuis la colonne "Image" (URL texte OneDrive) ──
    if (result.details && result.details.rows) {
      result.details.rows = result.details.rows.map(function(row) {
        return Object.assign({}, row, { _imageUrl: row["Image"] || "" });
      });
    }

    // ── Feuilles custom — clé = vrai nom de la feuille
    const fixedNames = new Set(Object.values(SHEET_NAMES));
    ss.getSheets().forEach(sheet => {
      const name = sheet.getName();
      if (!fixedNames.has(name)) {
        result[name] = readSheet(ss, name);  // clé = vrai nom exact
      }
    });

    // ── Charger les menus custom depuis la feuille _Menus
    var menus = [];
    var menusSheet = ss.getSheetByName("_Menus");
    if (menusSheet && menusSheet.getLastRow() >= 1) {
      var menusJson = menusSheet.getRange(1, 1).getValue();
      if (menusJson) {
        try { menus = JSON.parse(menusJson); } catch(e) {}
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", data: result, menus: menus }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── Helper : style en-tête ──────────────────────────────────
function applyHeaderStyle(sheet, numCols) {
  const range = sheet.getRange(1, 1, 1, numCols);
  range.setFontWeight("bold");
  range.setBackground("#f3f4f6");
  range.setFontColor("#374151");
  sheet.setFrozenRows(1);
}

// ─── Helper : lire une feuille → { rows } ────────────────────
function readSheet(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { rows: [] };

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return { rows: [] };

  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = data[0].map(h => String(h).trim());

  const rows = data.slice(1).map((row, i) => {
    const obj = { _rowIndex: i + 2 };
    headers.forEach((h, j) => {
      let val = row[j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      obj[h] = (val === null || val === undefined) ? "" : val;
    });
    return obj;
  }).filter(row => headers.some(h => row[h] !== ""));

  return { rows };
}

// ─── POST : CREATE / UPDATE / DELETE / CREATE_SHEET ──────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const { action, sheet: sheetKey, data, rowIndex } = payload;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // ── CREATE_SHEET : créer une nouvelle feuille custom ──────
    if (action === "CREATE_SHEET") {
      const sheetName = payload.sheetName;
      const columns   = payload.columns || [];

      if (!sheetName) throw new Error("sheetName manquant");

      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }

      // Écrire les en-têtes seulement si la feuille est vide
      if (sheet.getLastRow() === 0 && columns.length > 0) {
        sheet.appendRow(columns);
        applyHeaderStyle(sheet, columns.length);
      }

      return ContentService
        .createTextOutput(JSON.stringify({ status: "ok", message: "Feuille créée : " + sheetName }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── SAVE_MENUS : sauvegarder les menus custom ──────────────
    if (action === "SAVE_MENUS") {
      var menus = payload.menus || [];
      var menusSheet = ss.getSheetByName("_Menus");
      if (!menusSheet) {
        menusSheet = ss.insertSheet("_Menus");
        menusSheet.hideSheet();
      }
      menusSheet.getRange(1, 1).setValue(JSON.stringify(menus));
      return ContentService
        .createTextOutput(JSON.stringify({ status: "ok" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── UPDATE_SHEET_HEADERS : mettre à jour les colonnes ──────
    if (action === "UPDATE_SHEET_HEADERS") {
      const sheetName = payload.sheetName;
      const columns   = payload.columns || [];

      if (!sheetName) throw new Error("sheetName manquant");

      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) throw new Error("Feuille introuvable : " + sheetName);

      const currentCols = sheet.getLastColumn();
      const newCols     = columns.length;

      if (currentCols > 0) {
        sheet.getRange(1, 1, 1, Math.max(currentCols, newCols)).clearContent();
      }

      if (newCols > 0) {
        sheet.getRange(1, 1, 1, newCols).setValues([columns]);
        applyHeaderStyle(sheet, newCols);
      }

      return ContentService
        .createTextOutput(JSON.stringify({ status: "ok", message: "En-têtes mis à jour : " + sheetName }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── Actions sur feuilles existantes ──────────────────────
    let sheetName = SHEET_NAMES[sheetKey] || sheetKey;

    if (!sheetName) throw new Error("Feuille inconnue : " + sheetKey);

    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("Feuille introuvable : " + sheetName);

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn())
                         .getValues()[0].map(h => String(h).trim());

    if (action === "CREATE") {
      const newRow = headers.map(h => data[h] ?? "");
      sheet.appendRow(newRow);

    } else if (action === "UPDATE") {
      const rowValues = headers.map(h => data[h] ?? "");
      sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);

    } else if (action === "DELETE") {
      sheet.deleteRow(rowIndex);

    } else {
      throw new Error("Action inconnue : " + action);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── Test ─────────────────────────────────────────────────────
function testLigne2() {
  const ss = SpreadsheetApp.openById("1l8etAWJxSZTrv-Z5umNBzW-HSy4rC8pm3Kr5CsF3OnY");
  const sheet = ss.getSheetByName("Details");
  const data = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();

  Logger.log("Nombre total de lignes : " + data.length);
  Logger.log("Ligne 1 (en-têtes) : " + JSON.stringify(data[0]));
  Logger.log("Ligne 2 (données)  : " + JSON.stringify(data[1]));
  Logger.log("Ligne 3 (données)  : " + JSON.stringify(data[2]));
}

// ─── Test images ──────────────────────────────────────────────
function testImages() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.details);
  const data = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  const headers = data[0].map(h => String(h).trim());
  const imgColIndex = headers.findIndex(h => h.toLowerCase() === "image");
  Logger.log("Colonne Image à l\'index : " + imgColIndex);
  if (imgColIndex > -1) {
    for (let i = 1; i <= Math.min(5, data.length - 1); i++) {
      Logger.log("Ligne " + (i+1) + " Image: " + data[i][imgColIndex]);
    }
  }
}
