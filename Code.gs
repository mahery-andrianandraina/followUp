// ============================================================
// AW27 CHECKERS – Google Apps Script (Version VERDICT)
// ============================================================

const SPREADSHEET_ID = "1l8etAWJxSZTrv-Z5umNBzW-HSy4rC8pm3Kr5CsF3OnY";
const SHEET_NAMES = { details: "Details", style: "Style", sample: "Sample" };

function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Les 3 feuilles standards
    const result = {
      details: readSheetWithImages(ss, "Details"),
      style:   readSheet(ss, "Style"),
      sample:  readSheet(ss, "Sample")
    };
    
    // Ajout dynamique des feuilles supplémentaires
    const standardNames = ["Details", "Style", "Sample"];
    ss.getSheets().forEach(function(s) {
      var name = s.getName();
      if (name.startsWith("_")) return;
      if (standardNames.indexOf(name) !== -1) return;
      result[name.toLowerCase()] = readSheet(ss, name);
    });

    // Lire la configuration des menus sauvegardés depuis le Spreadsheet
    var menus = [];
    var configSheet = ss.getSheetByName("_menus_config");
    if (configSheet) {
      var val = configSheet.getRange(1, 1).getValue();
      if (val) {
        try {
          menus = JSON.parse(val);
        } catch(e) {}
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "ok", data: result, menus: menus })).setMimeType(ContentService.MimeType.JSON);
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

    // ── UPLOAD TECH PACK (PDF → Google Drive) ──
    if (action === "UPLOAD_TP") {
      var styleCode = (payload.styleCode || "").trim();
      var fileName  = payload.fileName || (styleCode + ".pdf");
      var base64Data = payload.base64Data || "";
      var mimeType   = payload.mimeType || "application/pdf";

      if (!styleCode) throw new Error("styleCode manquant.");
      if (!base64Data) throw new Error("Aucune donnée PDF reçue.");

      // 1. Trouver ou créer le dossier "TP" dans le même dossier que le spreadsheet
      var ssFile = DriveApp.getFileById(SPREADSHEET_ID);
      var parents = ssFile.getParents();
      var parentFolder = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
      
      var tpFolder;
      var tpFolders = parentFolder.getFoldersByName("TP");
      if (tpFolders.hasNext()) {
        tpFolder = tpFolders.next();
      } else {
        tpFolder = parentFolder.createFolder("TP");
      }

      // 2. Supprimer l'ancien fichier s'il existe (même nom)
      var existingFiles = tpFolder.getFilesByName(fileName);
      while (existingFiles.hasNext()) {
        var old = existingFiles.next();
        old.setTrashed(true);
      }

      // 3. Créer le blob et uploader
      var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
      var newFile = tpFolder.createFile(blob);
      
      // 4. Rendre accessible via lien (anyone with link can view)
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      var fileUrl = "https://drive.google.com/file/d/" + newFile.getId() + "/view";

      // 5. Écrire l'URL dans la colonne TP_URL de la feuille Details
      try {
        var ss2 = SpreadsheetApp.openById(SPREADSHEET_ID);
        var detailsSheet = ss2.getSheetByName("Details");
        if (detailsSheet) {
          var dData = detailsSheet.getDataRange().getValues();
          var dHeaders = dData[0].map(function(x) { return String(x).trim(); });
          
          // Trouver ou créer la colonne TP_URL
          var tpColIdx = dHeaders.indexOf("TP_URL");
          if (tpColIdx === -1) {
            // Ajouter la colonne TP_URL
            tpColIdx = dHeaders.length;
            detailsSheet.getRange(1, tpColIdx + 1).setValue("TP_URL");
          }
          
          // Trouver la colonne Style (recherche flexible)
          var styleIdx = dHeaders.findIndex(function(h) { return h.toLowerCase() === "style" || h.toLowerCase() === "cust style ref"; });
          if (styleIdx === -1) styleIdx = dHeaders.findIndex(function(h) { return h.toLowerCase().includes("style"); });
          
          if (styleIdx !== -1) {
            for (var i = 1; i < dData.length; i++) {
              if (String(dData[i][styleIdx]).trim() === styleCode) {
                detailsSheet.getRange(i + 1, tpColIdx + 1).setValue(fileUrl);
                break;
              }
            }
          }
        }
      } catch(writeErr) {
        // Non-bloquant : le fichier est uploadé même si l'écriture échoue
        Logger.log("TP_URL write error: " + writeErr.message);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "ok",
        url: fileUrl,
        fileId: newFile.getId(),
        fileName: fileName
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ── UPLOAD IMAGE STYLE (Image/Photo → Google Drive) ──
    if (action === "UPLOAD_IMAGE") {
      var styleCode = (payload.styleCode || "").trim();
      var fileName  = payload.fileName || (styleCode + ".jpg");
      var base64Data = payload.base64Data || "";
      var mimeType   = payload.mimeType || "image/jpeg";

      if (!styleCode) throw new Error("styleCode manquant.");
      if (!base64Data) throw new Error("Aucune donnée image reçue.");

      // 1. Trouver ou créer le dossier "Images" dans le même dossier que le spreadsheet
      var ssFile = DriveApp.getFileById(SPREADSHEET_ID);
      var parents = ssFile.getParents();
      var parentFolder = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
      
      var imgFolder;
      var imgFolders = parentFolder.getFoldersByName("Images");
      if (imgFolders.hasNext()) {
        imgFolder = imgFolders.next();
      } else {
        imgFolder = parentFolder.createFolder("Images");
      }

      // 2. Supprimer l'ancien fichier s'il existe (même nom)
      var existingFiles = imgFolder.getFilesByName(fileName);
      while (existingFiles.hasNext()) {
        var old = existingFiles.next();
        old.setTrashed(true);
      }

      // 3. Créer le blob et uploader
      var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
      var newFile = imgFolder.createFile(blob);
      
      // 4. Rendre accessible via lien (anyone with link can view)
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      var fileUrl = "https://drive.google.com/file/d/" + newFile.getId() + "/view";
      var thumbUrl = "https://lh3.googleusercontent.com/d/" + newFile.getId();

      // 5. Écrire l'URL dans la colonne Image de la feuille Details
      try {
        var ss2 = SpreadsheetApp.openById(SPREADSHEET_ID);
        var detailsSheet = ss2.getSheetByName("Details");
        if (detailsSheet) {
          var dData = detailsSheet.getDataRange().getValues();
          var dHeaders = dData[0].map(function(x) { return String(x).trim(); });
          
          // Trouver ou créer la colonne Image (flexible)
          var imgColIdx = dHeaders.findIndex(function(h) { return /image|photo|picture|img|pic/i.test(h); });
          if (imgColIdx === -1) {
            imgColIdx = dHeaders.length;
            detailsSheet.getRange(1, imgColIdx + 1).setValue("Image");
          }
          
          // Trouver la colonne Style (flexible)
          var styleIdx = dHeaders.findIndex(function(h) { return h.toLowerCase() === "style" || h.toLowerCase() === "cust style ref"; });
          if (styleIdx === -1) styleIdx = dHeaders.findIndex(function(h) { return h.toLowerCase().includes("style"); });
          
          if (styleIdx !== -1) {
            for (var i = 1; i < dData.length; i++) {
              if (String(dData[i][styleIdx]).trim() === styleCode) {
                detailsSheet.getRange(i + 1, imgColIdx + 1).setValue(fileUrl);
                break;
              }
            }
          }
        }
      } catch(writeErr) {
        Logger.log("Image URL write error: " + writeErr.message);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "ok",
        url: fileUrl,
        thumbUrl: thumbUrl,
        fileId: newFile.getId(),
        fileName: fileName
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ── SAUVEGARDE DES CONFIGURATIONS DE MENUS PERSO (Cross-navigateur) ──
    if (action === "SAVE_MENUS") {
      var ssConfig = SpreadsheetApp.openById(SPREADSHEET_ID);
      var configSheet = ssConfig.getSheetByName("_menus_config");
      if (!configSheet) {
        configSheet = ssConfig.insertSheet("_menus_config");
        configSheet.hideSheet();
      }
      var menusJson = JSON.stringify(payload.menus || []);
      configSheet.getRange(1, 1).setValue(menusJson);
      return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
    }

    // ── SUPPRESSION D'UNE FEUILLE ENTIÈRE ──
    if (action === "DELETE_SHEET") {
      var sheetNameToDelete = (payload.sheetName || "").trim();
      if (!sheetNameToDelete) throw new Error("Nom de feuille manquant.");
      var ssConfig = SpreadsheetApp.openById(SPREADSHEET_ID);
      var targetSheet = ssConfig.getSheetByName(sheetNameToDelete);
      if (targetSheet) {
        ssConfig.deleteSheet(targetSheet);
        return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Feuille introuvable." })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // ── JOURNAL D'ACTIVITE (LOGS) ──
    if (action === "LOG_ACTIVITY") {
      var sheetNameLog = payload.sheet || "_activity_log";
      var ss2 = SpreadsheetApp.openById(SPREADSHEET_ID);
      var logSheet = ss2.getSheetByName(sheetNameLog);
      if (!logSheet) {
        logSheet = ss2.insertSheet(sheetNameLog);
        logSheet.hideSheet();
        logSheet.appendRow(["timestamp", "user", "action", "sheet", "style", "rowIndex", "field", "oldValue", "newValue", "detail"]);
      }
      var entry = payload.entry || {};
      logSheet.appendRow([
        entry.timestamp || new Date().toISOString(),
        entry.user || "",
        entry.action || "",
        entry.sheet || "",
        entry.style || "",
        entry.rowIndex || "",
        entry.field || "",
        entry.oldValue || "",
        entry.newValue || "",
        entry.detail || ""
      ]);
      return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "GET_LOGS") {
      var sheetNameLogGet = payload.sheet || "_activity_log";
      var ss2Get = SpreadsheetApp.openById(SPREADSHEET_ID);
      var logSheetGet = ss2Get.getSheetByName(sheetNameLogGet);
      if (!logSheetGet) {
        return ContentService.createTextOutput(JSON.stringify({ status: "ok", logs: [] })).setMimeType(ContentService.MimeType.JSON);
      }
      var dataLog = logSheetGet.getDataRange().getValues();
      if (dataLog.length < 2) {
        return ContentService.createTextOutput(JSON.stringify({ status: "ok", logs: [] })).setMimeType(ContentService.MimeType.JSON);
      }
      var headersLogRaw = dataLog[0].map(function(h) { return String(h).trim().toLowerCase(); });
      var keyMapping = [];
      for (var i = 0; i < headersLogRaw.length; i++) {
        var h = headersLogRaw[i];
        if (h.indexOf('time') !== -1 || h.indexOf('date') !== -1) keyMapping[i] = 'timestamp';
        else if (h.indexOf('user') !== -1 || h.indexOf('util') !== -1) keyMapping[i] = 'user';
        else if (h.indexOf('action') !== -1) keyMapping[i] = 'action';
        else if (h.indexOf('sheet') !== -1 || h.indexOf('feuille') !== -1) keyMapping[i] = 'sheet';
        else if (h.indexOf('style') !== -1) keyMapping[i] = 'style';
        else if (h.indexOf('row') !== -1 || h.indexOf('ligne') !== -1) keyMapping[i] = 'rowIndex';
        else if (h.indexOf('field') !== -1 || h.indexOf('champ') !== -1) keyMapping[i] = 'field';
        else if (h.indexOf('old') !== -1 || h.indexOf('ancien') !== -1) keyMapping[i] = 'oldValue';
        else if (h.indexOf('new') !== -1 || h.indexOf('nouveau') !== -1) keyMapping[i] = 'newValue';
        else if (h.indexOf('detail') !== -1 || h.indexOf('détail') !== -1 || h.indexOf('desc') !== -1) keyMapping[i] = 'detail';
        else keyMapping[i] = h; // fallback
      }

      var logs = dataLog.slice(1).map(function(row) {
        var obj = {};
        keyMapping.forEach(function(key, j) { 
          var val = row[j];
          if (key === 'timestamp' && val instanceof Date) {
            val = val.toISOString();
          }
          obj[key] = val; 
        });
        return obj;
      }).reverse(); // Du plus récent au plus ancien
      return ContentService.createTextOutput(JSON.stringify({ status: "ok", logs: logs })).setMimeType(ContentService.MimeType.JSON);
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

// Comme readSheet mais encode les images en base64 pour le dashboard
function readSheetWithImages(ss, name) {
  const s = ss.getSheetByName(name);
  if (!s) return { rows: [], _debug: { error: "Sheet not found: " + name } };
  const d = s.getDataRange().getValues();
  if (d.length < 2) return { rows: [], _debug: { error: "Sheet empty" } };
  const h = d[0].map(x => String(x).trim());

  // Trouver la colonne Style (flexible)
  let styleIdx = h.findIndex(x => /^style$/i.test(x));
  if (styleIdx === -1) styleIdx = h.findIndex(x => /cust style ref/i.test(x));
  if (styleIdx === -1) styleIdx = h.findIndex(x => /style/i.test(x));
  
  // Trouver la colonne Image/Photo (très flexible)
  const imgIdx = h.findIndex(x => /image|photo|picture|img|pic/i.test(x));

  var imgCount = 0;
  var firstStyleCodes = [];

  var rows = d.slice(1).map(function(r) {
    var o = {};
    h.forEach(function(header, j) { o[header] = r[j]; });

    // Encoder l'image en base64 si on a un style code
    if (styleIdx !== -1) {
      var styleCode = String(r[styleIdx] || "").trim();
      var imageCell = imgIdx !== -1 ? String(r[imgIdx] || "") : "";
      
      if (firstStyleCodes.length < 3) {
        firstStyleCodes.push({ style: styleCode, imgCol: imageCell.substring(0, 80) });
      }
      
      if (styleCode) {
        var b64 = findAndEncodeImage(styleCode, imageCell);
        if (b64) {
          o["_imageUrl"] = b64;
          imgCount++;
        }
      }
    }

    return o;
  });

  return { 
    rows: rows, 
    _debug: {
      headers: h,
      styleColIndex: styleIdx,
      imgColIndex: imgIdx,
      imgColName: imgIdx !== -1 ? h[imgIdx] : "NOT FOUND",
      totalRows: rows.length,
      imagesEncoded: imgCount,
      sampleData: firstStyleCodes
    }
  };
}

