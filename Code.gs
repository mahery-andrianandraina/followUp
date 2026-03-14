// ============================================================
// AW27 CHECKERS – Google Apps Script
// ============================================================

const SPREADSHEET_ID = "1l8etAWJxSZTrv-Z5umNBzW-HSy4rC8pm3Kr5CsF3OnY";

// ─── Dossier Google Drive contenant les images des styles ────
// Chemin : AW27 CHECKERS / PICTURES
// Le GAS cherche les images par nom de fichier (ex: CKM10204.jpg)
const PICTURES_FOLDER_NAME = "PICTURES";
const PARENT_FOLDER_NAME   = "AW27 CHECKERS";

const SHEET_NAMES = {
  details:  "Details",
  style:    "Style",
  sample:   "Sample",
  ordering: "Ordering"
};

// ─── Helper : trouver le dossier PICTURES ────────────────────
function getPicturesFolder() {
  try {
    // Chercher le dossier parent "AW27 CHECKERS"
    const parentIter = DriveApp.getFoldersByName(PARENT_FOLDER_NAME);
    while (parentIter.hasNext()) {
      const parent = parentIter.next();
      // Chercher le sous-dossier "PICTURES" dedans
      const childIter = parent.getFoldersByName(PICTURES_FOLDER_NAME);
      if (childIter.hasNext()) {
        return childIter.next();
      }
    }
    // Fallback : chercher directement "PICTURES"
    const directIter = DriveApp.getFoldersByName(PICTURES_FOLDER_NAME);
    if (directIter.hasNext()) return directIter.next();
  } catch(err) {
    Logger.log("getPicturesFolder error: " + err.message);
  }
  return null;
}

// ─── Cache du dossier pour éviter de le rechercher à chaque image ──
let _picturesFolder = null;

function getPicturesFolderCached() {
  if (!_picturesFolder) _picturesFolder = getPicturesFolder();
  return _picturesFolder;
}

// ─── Helper : trouver une image par nom de style et la convertir en base64 ──
// Cherche : CKM10204.jpg / CKM10204.jpeg / CKM10204.png / CKM10204.webp
// La colonne "Image" peut contenir :
//   - Rien (vide) → cherche automatiquement par code Style
//   - Un nom de fichier : "CKM10204.jpg"
//   - Un ID Drive : "1a2b3c4dXXX"
//   - Une URL Drive : "https://drive.google.com/file/d/..."
function getStyleImageBase64(styleCode, imageCell) {
  try {
    const folder = getPicturesFolderCached();
    if (!folder) {
      Logger.log("Dossier PICTURES introuvable");
      return "";
    }

    // ── Cas 1 : cellule Image contient un ID ou URL Drive
    if (imageCell) {
      const raw = String(imageCell).trim();
      if (raw.startsWith("http") || raw.match(/^[a-zA-Z0-9_-]{25,}$/)) {
        let fileId = raw;
        const matchFd = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        const matchId = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if      (matchFd) fileId = matchFd[1];
        else if (matchId) fileId = matchId[1];
        try {
          const file  = DriveApp.getFileById(fileId);
          const blob  = file.getBlob();
          return "data:" + blob.getContentType() + ";base64," + Utilities.base64Encode(blob.getBytes());
        } catch(e) {}
      }
      // Cas 1b : nom de fichier explicite dans la cellule
      if (raw && !raw.startsWith("http")) {
        const fileIter = folder.getFilesByName(raw);
        if (fileIter.hasNext()) {
          const blob = fileIter.next().getBlob();
          return "data:" + blob.getContentType() + ";base64," + Utilities.base64Encode(blob.getBytes());
        }
      }
    }

    // ── Cas 2 : chercher automatiquement par code Style
    if (!styleCode) return "";
    const extensions = ["jpg", "jpeg", "png", "webp", "JPG", "JPEG", "PNG"];
    for (const ext of extensions) {
      const fileIter = folder.getFilesByName(styleCode + "." + ext);
      if (fileIter.hasNext()) {
        const blob = fileIter.next().getBlob();
        return "data:" + blob.getContentType() + ";base64," + Utilities.base64Encode(blob.getBytes());
      }
    }
    // Essai sans extension exacte : chercher tout fichier qui commence par styleCode
    const allFiles = folder.getFiles();
    while (allFiles.hasNext()) {
      const file = allFiles.next();
      const name = file.getName().toLowerCase();
      if (name.startsWith(styleCode.toLowerCase() + ".") ||
          name.startsWith(styleCode.toLowerCase() + "_")) {
        const blob = file.getBlob();
        return "data:" + blob.getContentType() + ";base64," + Utilities.base64Encode(blob.getBytes());
      }
    }

  } catch(err) {
    Logger.log("getStyleImageBase64 error [" + styleCode + "]: " + err.message);
  }
  return "";
}

// ─── GET : lecture de toutes les feuilles ─────────────────────
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const result = {};

    // ── Feuilles fixes
    for (const [key, sheetName] of Object.entries(SHEET_NAMES)) {
      result[key] = readSheet(ss, sheetName);
    }

    // ── Injecter _imageUrl : cherche dans Drive/PICTURES par Style ──
    if (result.details && result.details.rows) {
      result.details.rows = result.details.rows.map(function(row) {
        const imageData = getStyleImageBase64(row["Style"] || "", row["Image"] || "");
        return Object.assign({}, row, { _imageUrl: imageData });
      });
    }

    // ── Feuilles custom — clé = vrai nom de la feuille
    const fixedNames = new Set(Object.values(SHEET_NAMES));
    ss.getSheets().forEach(sheet => {
      const name = sheet.getName();
      if (!fixedNames.has(name)) {
        result[name] = readSheet(ss, name);
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

    if (action === "CREATE_SHEET") {
      const sheetName = payload.sheetName;
      const columns   = payload.columns || [];
      if (!sheetName) throw new Error("sheetName manquant");
      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) sheet = ss.insertSheet(sheetName);
      if (sheet.getLastRow() === 0 && columns.length > 0) {
        sheet.appendRow(columns);
        applyHeaderStyle(sheet, columns.length);
      }
      return ContentService
        .createTextOutput(JSON.stringify({ status: "ok", message: "Feuille créée : " + sheetName }))
        .setMimeType(ContentService.MimeType.JSON);
    }

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

    if (action === "UPDATE_SHEET_HEADERS") {
      const sheetName = payload.sheetName;
      const columns   = payload.columns || [];
      if (!sheetName) throw new Error("sheetName manquant");
      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) throw new Error("Feuille introuvable : " + sheetName);
      const currentCols = sheet.getLastColumn();
      const newCols     = columns.length;
      if (currentCols > 0) sheet.getRange(1, 1, 1, Math.max(currentCols, newCols)).clearContent();
      if (newCols > 0) {
        sheet.getRange(1, 1, 1, newCols).setValues([columns]);
        applyHeaderStyle(sheet, newCols);
      }
      return ContentService
        .createTextOutput(JSON.stringify({ status: "ok", message: "En-têtes mis à jour : " + sheetName }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    let sheetName = SHEET_NAMES[sheetKey] || sheetKey;
    if (!sheetName) throw new Error("Feuille inconnue : " + sheetKey);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("Feuille introuvable : " + sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn())
                         .getValues()[0].map(h => String(h).trim());

    // ── Convertir les strings de dates en vrais objets Date pour Google Sheets ──
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
      sheet.getRange(rowIndex, 1, 1, headers.length).setValues([headers.map(h => parseVal(data[h] ?? ""))]);
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

// ─── Test général ─────────────────────────────────────────────
function testLigne2() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Details");
  const data = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  Logger.log("Nombre total de lignes : " + data.length);
  Logger.log("Ligne 1 (en-têtes) : " + JSON.stringify(data[0]));
  Logger.log("Ligne 2 (données)  : " + JSON.stringify(data[1]));
}

// ─── Test dossier PICTURES ────────────────────────────────────
function testPicturesFolder() {
  const folder = getPicturesFolder();
  if (!folder) {
    Logger.log("ERREUR : dossier PICTURES introuvable sous AW27 CHECKERS");
    return;
  }
  Logger.log("Dossier trouvé : " + folder.getName() + " (ID: " + folder.getId() + ")");
  const files = folder.getFiles();
  let count = 0;
  while (files.hasNext() && count < 10) {
    Logger.log("Fichier : " + files.next().getName());
    count++;
  }
  Logger.log("Total affiché : " + count);
}

// ─── Test image d'un style précis ─────────────────────────────
function testStyleImage() {
  const styleCode = "CKM10204"; // ← changez par un vrai code style
  const result = getStyleImageBase64(styleCode, "");
  Logger.log(result.startsWith("data:image")
    ? "Image OK pour " + styleCode + " — taille base64: " + result.length
    : "Pas d image trouvée pour : " + styleCode);
}
