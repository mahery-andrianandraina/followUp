// ============================================================
// AW27 CHECKERS – Google Apps Script
// ============================================================

const SPREADSHEET_ID = "1l8etAWJxSZTrv-Z5umNBzW-HSy4rC8pm3Kr5CsF3OnY";

const PICTURES_FOLDER_NAME = "PICTURES";
const PARENT_FOLDER_NAME   = "AW27 CHECKERS";

const SHEET_NAMES = {
  details:  "Details",
  style:    "Style",
  sample:   "Sample",
  ordering: "Ordering"
};

function getPicturesFolder() {
  try {
    const parentIter = DriveApp.getFoldersByName(PARENT_FOLDER_NAME);
    while (parentIter.hasNext()) {
      const parent = parentIter.next();
      const childIter = parent.getFoldersByName(PICTURES_FOLDER_NAME);
      if (childIter.hasNext()) return childIter.next();
    }
    const directIter = DriveApp.getFoldersByName(PICTURES_FOLDER_NAME);
    if (directIter.hasNext()) return directIter.next();
  } catch(err) { Logger.log("getPicturesFolder error: " + err.message); }
  return null;
}

let _picturesFolder = null;
function getPicturesFolderCached() {
  if (!_picturesFolder) _picturesFolder = getPicturesFolder();
  return _picturesFolder;
}

// Pour le Dashboard : URLs thumbnails (RAPIDE)
function getStyleImageUrl(styleCode, imageCell) {
  try {
    function extractFileId(raw) {
      const mFd = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (mFd) return mFd[1];
      const mId = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (mId) return mId[1];
      if (/^[a-zA-Z0-9_-]{25,}$/.test(raw)) return raw;
      return null;
    }
    function toThumb(id) { return "https://drive.google.com/thumbnail?id=" + id + "&sz=w400"; }

    if (imageCell) {
      const raw = String(imageCell).trim();
      const fileId = extractFileId(raw);
      if (fileId) return toThumb(fileId);
      const folder = getPicturesFolderCached();
      if (folder) {
        const fileIter = folder.getFilesByName(raw);
        if (fileIter.hasNext()) return toThumb(fileIter.next().getId());
      }
    }

    if (!styleCode) return "";
    const folder = getPicturesFolderCached();
    if (!folder) return "";
    const extensions = ["jpg", "jpeg", "png", "webp", "JPG", "JPEG", "PNG"];
    for (const ext of extensions) {
      const fileIter = folder.getFilesByName(styleCode + "." + ext);
      if (fileIter.hasNext()) return toThumb(fileIter.next().getId());
    }
  } catch(e) {}
  return "";
}

function doGet(e) {
  try {
    // ── ENDPOINT PROXY IMAGE (POUR LE PDF) ──
    const params = (e && e.parameter) ? e.parameter : {};
    const fId = (params.fileId || params.fileid || "").trim();
    if (fId && fId.length > 20) {
      const file = DriveApp.getFileById(fId);
      const blob = file.getBlob();
      const base64 = Utilities.base64Encode(blob.getBytes());
      const dataUrl = "data:" + (blob.getContentType() || "image/jpeg") + ";base64," + base64;
      return ContentService.createTextOutput(JSON.stringify({status:"ok", dataUrl: dataUrl})).setMimeType(ContentService.MimeType.JSON);
    }

    // ── CHARGEMENT DONNÉES (POUR LE DASHBOARD) ──
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const result = {};
    for (const [key, sheetName] of Object.entries(SHEET_NAMES)) {
      result[key] = readSheet(ss, sheetName);
    }
    for (const key in result) {
      if (result[key] && result[key].rows) {
        result[key].rows = result[key].rows.map(function(row) {
          const imageCell = row["Image"] || row["Photo"] || row["image"] || row["photo"] || row["Picture"] || row["ImageUrl"] || "";
          const imageData = getStyleImageUrl(row["Style"] || "", imageCell);
          return Object.assign({}, row, { _imageUrl: imageData });
        });
      }
    }
    const fixedNames = new Set(Object.values(SHEET_NAMES));
    ss.getSheets().forEach(function(sheet) {
      const name = sheet.getName();
      if (!fixedNames.has(name)) result[name] = readSheet(ss, name);
    });
    var menus = [];
    var menusSheet = ss.getSheetByName("_Menus");
    if (menusSheet && menusSheet.getLastRow() >= 1) {
      var menusJson = menusSheet.getRange(1, 1).getValue();
      if (menusJson) { try { menus = JSON.parse(menusJson); } catch(e) {} }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "ok", data: result, menus: menus })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function applyHeaderStyle(sheet, numCols) {
  const range = sheet.getRange(1, 1, 1, numCols);
  range.setFontWeight("bold");
  range.setBackground("#f3f4f6");
  range.setFontColor("#374151");
  sheet.setFrozenRows(1);
}

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
      if (val instanceof Date) val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
      obj[h] = (val === null || val === undefined) ? "" : val;
    });
    return obj;
  }).filter(row => headers.some(h => row[h] !== ""));
  return { rows };
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const { action, sheet: sheetKey, data, rowIndex } = payload;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    if (action === "CREATE_SHEET") {
      const sheetName = payload.sheetName;
      const columns   = payload.columns || [];
      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) sheet = ss.insertSheet(sheetName);
      if (sheet.getLastRow() === 0 && columns.length > 0) {
        sheet.appendRow(columns);
        applyHeaderStyle(sheet, columns.length);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === "SAVE_MENUS") {
      var menus = payload.menus || [];
      var menusSheet = ss.getSheetByName("_Menus");
      if (!menusSheet) { menusSheet = ss.insertSheet("_Menus"); menusSheet.hideSheet(); }
      menusSheet.getRange(1, 1).setValue(JSON.stringify(menus));
      return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
    }
    let sheetName = SHEET_NAMES[sheetKey] || sheetKey;
    const sheet = ss.getSheetByName(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
    function parseVal(val) {
      if (!val || val === "") return "";
      if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
        const parts = val.trim().split("-");
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
      return val;
    }
    if (action === "CREATE") {
      sheet.appendRow(headers.map(h => parseVal(data[h] ?? "")));
    } else if (action === "UPDATE") {
      const rowRange = sheet.getRange(rowIndex, 1, 1, headers.length);
      const rowValues = rowRange.getValues()[0];
      const newVals = headers.map((h, i) => Object.prototype.hasOwnProperty.call(data, h) ? parseVal(data[h]) : rowValues[i]);
      rowRange.setValues([newVals]);
    } else if (action === "DELETE") {
      sheet.deleteRow(rowIndex);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}
