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

    for (const [key, sheetName] of Object.entries(SHEET_NAMES)) {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) { result[key] = { rows: [] }; continue; }

      const data = sheet.getDataRange().getValues();
      if (data.length < 2) { result[key] = { rows: [] }; continue; }

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
      })
      // Filtre uniquement les lignes complètement vides (toutes cellules = "")
      .filter(row => {
        return headers.some(h => row[h] !== "");
      });

      result[key] = { rows };
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", data: result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── POST : CREATE / UPDATE / DELETE ─────────────────────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const { action, sheet: sheetKey, data, rowIndex } = payload;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = SHEET_NAMES[sheetKey];
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
