// ============================================================
// AW27 CHECKERS – Google Apps Script Backend
// Deploy as Web App: Execute as "Me", Access: "Anyone"
// ============================================================

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

const SHEETS = {
  details:  { name: "Details",  cols: ["Dept","Style","StyleDescription","FabricBase","Costing","OrderQty","PSD","ExFty"] },
  sample:   { name: "Sample",   cols: ["Dept","Style","StyleDescription","Type","Fabric","Size","SRS Date","Ready Date","Remarks","Approval"] },
  ordering: { name: "Ordering", cols: ["Dept","Style","StyleDescription","Color","Trims","Supplier","UP","PO","PO Date","Ready Date","PI","Comments"] }
};

function doGet(e) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const result = {};

  for (const key in SHEETS) {
    const cfg = SHEETS[key];
    const sheet = ss.getSheetByName(cfg.name);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1).map((row, index) => {
      const obj = { _rowIndex: index + 2 }; // 1-based, skip header
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    }).filter(row => row[headers[0]] !== ""); // skip empty rows
    result[key] = { headers, rows };
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", data: result }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const { action, sheet: sheetKey, data, rowIndex } = payload;

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const cfg = SHEETS[sheetKey];
    if (!cfg) throw new Error("Unknown sheet: " + sheetKey);

    const sheet = ss.getSheetByName(cfg.name);

    if (action === "CREATE") {
      const newRow = cfg.cols.map(col => data[col] || "");
      sheet.appendRow(newRow);
      return jsonResponse({ status: "ok", message: "Row created" });
    }

    if (action === "UPDATE") {
      if (!rowIndex) throw new Error("rowIndex required for UPDATE");
      const newRow = cfg.cols.map(col => data[col] || "");
      const range = sheet.getRange(rowIndex, 1, 1, newRow.length);
      range.setValues([newRow]);
      return jsonResponse({ status: "ok", message: "Row updated" });
    }

    if (action === "DELETE") {
      if (!rowIndex) throw new Error("rowIndex required for DELETE");
      sheet.deleteRow(rowIndex);
      return jsonResponse({ status: "ok", message: "Row deleted" });
    }

    throw new Error("Unknown action: " + action);

  } catch (err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
