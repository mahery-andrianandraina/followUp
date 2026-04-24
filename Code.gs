// ============================================================
// AW27 CHECKERS – Google Apps Script
// ============================================================

const SPREADSHEET_ID = "1l8etAWJxSZTrv-Z5umNBzW-HSy4rC8pm3Kr5CsF3OnY";

// ─── Dossier Google Drive contenant les images des styles ────
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
    const parentIter = DriveApp.getFoldersByName(PARENT_FOLDER_NAME);
    while (parentIter.hasNext()) {
      const parent = parentIter.next();
      const childIter = parent.getFoldersByName(PICTURES_FOLDER_NAME);
      if (childIter.hasNext()) return childIter.next();
    }
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

// ─── Helper : trouver une image par nom de style → retourne une URL thumbnail ──
// ⚠️  On NE convertit plus en base64 (lourd + dépendant des permissions du déployeur).
//     On retourne directement l'URL thumbnail Drive, chargée par le navigateur du client.
//     Prérequis : le dossier PICTURES doit être partagé "Tout le monde avec le lien".
//
// La colonne "Image" peut contenir :
//   - Rien (vide)                           → cherche automatiquement par code Style
//   - Un nom de fichier : "CKM10204.jpg"    → cherche dans PICTURES
//   - Un ID Drive     : "1a2b3c4dXXX"       → thumbnail direct
//   - Une URL Drive   : "https://drive.google.com/file/d/..." → thumbnail direct
function getStyleImageUrl(styleCode, imageCell) {
  try {
    // ── Utilitaire : extraire un File ID depuis une URL ou un ID brut ──
    function extractFileId(raw) {
      const mFd = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (mFd) return mFd[1];
      const mId = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (mId) return mId[1];
      if (/^[a-zA-Z0-9_-]{25,}$/.test(raw)) return raw;
      return null;
    }

    // ── Utilitaire : construire l'URL thumbnail depuis un File ID ──
    function toThumbnailUrl(fileId) {
      return "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w400";
    }

    // ── Cas 1 : cellule Image contient une URL ou un ID Drive ──
    if (imageCell) {
      const raw = String(imageCell).trim();
      if (raw) {
        const fileId = extractFileId(raw);
        if (fileId) return toThumbnailUrl(fileId);

        // Cas 1b : nom de fichier explicite → chercher dans PICTURES
        const folder = getPicturesFolderCached();
        if (folder) {
          const fileIter = folder.getFilesByName(raw);
          if (fileIter.hasNext()) {
            return toThumbnailUrl(fileIter.next().getId());
          }
        }
      }
    }

    // ── Cas 2 : chercher automatiquement par code Style dans PICTURES ──
    if (!styleCode) return "";
    const folder = getPicturesFolderCached();
    if (!folder) {
      Logger.log("Dossier PICTURES introuvable");
      return "";
    }

    const extensions = ["jpg", "jpeg", "png", "webp", "JPG", "JPEG", "PNG"];
    for (const ext of extensions) {
      const fileIter = folder.getFilesByName(styleCode + "." + ext);
      if (fileIter.hasNext()) {
        return toThumbnailUrl(fileIter.next().getId());
      }
    }

    // Fallback : tout fichier qui commence par styleCode
    const allFiles = folder.getFiles();
    while (allFiles.hasNext()) {
      const file = allFiles.next();
      const name = file.getName().toLowerCase();
      if (name.startsWith(styleCode.toLowerCase() + ".") ||
          name.startsWith(styleCode.toLowerCase() + "_")) {
        return toThumbnailUrl(file.getId());
      }
    }

  } catch(err) {
    Logger.log("getStyleImageUrl error [" + styleCode + "]: " + err.message);
  }
  return "";
}

// ─── GET : lecture de toutes les feuilles ─────────────────────
function doGet(e) {
  try {
    // ── Action dédiée : proxy image Drive -> data URL base64 pour le PDF ──
    // Utilisée par pdfGenerator.js pour éviter les soucis CORS/canvas taint.
    const action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action) : "";
    if (action === "imageProxy") {
      const fileId = (e.parameter.fileId || "").trim();
      if (!fileId) {
        return ContentService
          .createTextOutput(JSON.stringify({ status: "error", error: "fileId manquant" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      try {
        const file = DriveApp.getFileById(fileId);
        const blob = file.getBlob();
        const contentType = blob.getContentType() || "image/jpeg";
        const bytes = blob.getBytes();
        const base64 = Utilities.base64Encode(bytes);
        const dataUrl = "data:" + contentType + ";base64," + base64;
        return ContentService
          .createTextOutput(JSON.stringify({ status: "ok", dataUrl: dataUrl }))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (imgErr) {
        return ContentService
          .createTextOutput(JSON.stringify({ status: "error", error: imgErr.message }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const result = {};

    // ── Feuilles fixes
    for (const [key, sheetName] of Object.entries(SHEET_NAMES)) {
      result[key] = readSheet(ss, sheetName);
    }

    // ── Injecter _imageUrl : cherche dans Drive/PICTURES par Style ──
    if (result.details && result.details.rows) {
      result.details.rows = result.details.rows.map(function(row) {
        const imageData = getStyleImageUrl(row["Style"] || "", row["Image"] || "");
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

    if (action === "IMPORT_EXCEL") {
      const sheetName = payload.sheetName;
      const columns   = payload.columns || [];
      const rowsData  = payload.rows || [];
      if (!sheetName) throw new Error("sheetName manquant");
      if (columns.length === 0) throw new Error("columns manquants");

      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      } else {
        sheet.clear();
      }

      sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
      applyHeaderStyle(sheet, columns.length);

      if (rowsData.length > 0) {
        const matrix = rowsData.map(rowObj => {
          return columns.map(col => {
            let val = rowObj[col];
            return (val === null || val === undefined) ? "" : val;
          });
        });
        sheet.getRange(2, 1, matrix.length, columns.length).setValues(matrix);
      }
      return ContentService
        .createTextOutput(JSON.stringify({ status: "ok", message: "Fichier importé sur : " + sheetName }))
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
      // Pour CREATE, s'il manque des clés, mettre vide (on laisse les formules se propager si ArrayFormula)
      const values = headers.map(h => parseVal(data[h] ?? ""));
      sheet.appendRow(values);
    } else if (action === "UPDATE") {
      // Pour UPDATE, ne mettre à jour que les colonnes fournies dans le payload 'data'
      // Cela préserve les formules dans les autres colonnes (ex: Balance)
      const rowRange = sheet.getRange(rowIndex, 1, 1, headers.length);
      const rowValues = rowRange.getValues()[0];
      const newRowValues = headers.map((h, i) => {
        if (Object.prototype.hasOwnProperty.call(data, h)) {
          return parseVal(data[h]);
        }
        return rowValues[i]; // Garder la valeur (ou la formule) actuelle
      });
      rowRange.setValues([newRowValues]);
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
  const result = getStyleImageUrl(styleCode, "");
  Logger.log(result
    ? "URL image OK pour " + styleCode + " → " + result
    : "Pas d'image trouvée pour : " + styleCode);
}
