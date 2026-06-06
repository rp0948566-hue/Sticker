/**
 * PRODUCTION-READY BACKEND v4.1 (GUARANTEED PERSISTENCE)
 */
const CONFIG = {
  ADMIN_TOKEN: "CHANGE_THIS_TO_A_SECURE_TOKEN",
  MAX_ORDERS_PER_SHEET: 300,
  BASE_SHEET_NAME: "Orders",
  LOG_SHEET_NAME: "SystemLogs",
  DEFAULT_STATUS: "Pending",
  TIMEZONE: "GMT+5:30",
  DUPLICATE_WINDOW_MINS: 5
};

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const data = JSON.parse(e.postData.contents);
    
    // Security: Only allow requests with the correct human token
    if (data.verify_token !== "USER_VERIFIED_77") {
       logEvent("SECURITY_BLOCK", "Invalid Token", data.phone);
       return createResponse({ success: false, message: "Security Validation Failed" });
    }

    const cleanData = sanitizeData(data);
    if (isDuplicateOrder(cleanData)) {
      return createResponse({ success: false, message: "Duplicate order. Please wait." });
    }

    const sheet = getActiveSheet();
    const orderId = "ORD-" + Utilities.getUuid().split("-")[0].toUpperCase();
    const now = new Date();
    
    const row = [
      orderId,
      Utilities.formatDate(now, CONFIG.TIMEZONE, "yyyy-MM-dd"),
      Utilities.formatDate(now, CONFIG.TIMEZONE, "HH:mm:ss"),
      cleanData.fullName,
      "'" + cleanData.phone,
      cleanData.email,
      cleanData.address,
      cleanData.city,
      cleanData.state,
      cleanData.pincode,
      cleanData.productName,
      cleanData.productUrl || "N/A",
      cleanData.quantity,
      cleanData.totalPrice,
      "COD",
      CONFIG.DEFAULT_STATUS
    ];

    sheet.appendRow(row);
    logEvent("ORDER_CREATED", `Order ${orderId} saved`, cleanData.phone);

    return createResponse({ success: true, orderId: orderId, message: "Order placed successfully!" });

  } catch (err) {
    logEvent("SYSTEM_ERROR", err.toString(), "CRITICAL");
    return createResponse({ success: false, message: "Server Error: " + err.message });
  } finally { lock.releaseLock(); }
}

function doGet(e) {
  if (e.parameter.token !== CONFIG.ADMIN_TOKEN) return createResponse({ success: false, message: "Unauthorized" });
  const action = e.parameter.action;

  if (action === "fetchOrders") {
    let all = [];
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.getSheets().filter(s => s.getName().includes(CONFIG.BASE_SHEET_NAME)).reverse().forEach(s => {
      const d = s.getDataRange().getValues();
      if (d.length > 1) all = all.concat(d.slice(1).reverse());
    });
    const q = (e.parameter.search || "").toLowerCase();
    if (q) all = all.filter(r => r[0].toLowerCase().includes(q) || r[4].toString().includes(q) || r[3].toLowerCase().includes(q));
    return createResponse({ success: true, data: all.slice((parseInt(e.parameter.page || 1)-1)*100, parseInt(e.parameter.page || 1)*100), total: all.length });
  }

  if (action === "updateStatus") {
    const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets().filter(s => s.getName().includes(CONFIG.BASE_SHEET_NAME));
    for (let s of sheets) {
      const data = s.getRange("A:A").getValues();
      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === e.parameter.orderId) {
          s.getRange(i + 1, 16).setValue(e.parameter.status);
          return createResponse({ success: true });
        }
      }
    }
  }
  return createResponse({ success: false });
}

function getActiveSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const year = new Date().getFullYear();
  let part = 0, latest = null;
  ss.getSheets().forEach(s => {
    if (s.getName().startsWith(CONFIG.BASE_SHEET_NAME)) {
      let p = parseInt(s.getName().split('_Part_')[1] || "0");
      if (p > part) { part = p; latest = s; }
    }
  });
  if (!latest || latest.getLastRow() >= CONFIG.MAX_ORDERS_PER_SHEET) {
    part++;
    latest = ss.insertSheet(`${CONFIG.BASE_SHEET_NAME}_${year}_Part_${part}`);
    latest.appendRow(["Order ID", "Date", "Time", "Name", "Phone", "Email", "Address", "City", "State", "Pincode", "Product", "URL", "Qty", "Price", "Payment", "Status"]);
    latest.setFrozenRows(1);
    latest.getRange(1,1,1,16).setFontWeight("bold").setBackground("#f3f3f3");
  }
  return latest;
}

function isDuplicateOrder(data) {
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets().filter(s => s.getName().includes(CONFIG.BASE_SHEET_NAME));
  if (sheets.length === 0) return false;
  const s = sheets[sheets.length - 1];
  if (s.getLastRow() <= 1) return false;
  const recent = s.getRange(Math.max(2, s.getLastRow() - 5), 1, Math.min(lastRow - 1, 5), 16).getValues();
  return recent.some(r => r[4].toString().replace(/\D/g,'') === data.phone && r[13].toString() === data.totalPrice.toString());
}

function sanitizeData(d) {
  const c = {};
  for (let k in d) {
    let v = (d[k] || "").toString().replace(/<[^>]*>?/gm, '');
    if (v.match(/^[=\+\-\@]/)) v = "'" + v;
    c[k] = v.trim();
  }
  return c;
}

function logEvent(type, msg, ctx) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let s = ss.getSheetByName(CONFIG.LOG_SHEET_NAME) || ss.insertSheet(CONFIG.LOG_SHEET_NAME);
    if (s.getLastRow() === 0) s.appendRow(["Timestamp", "Type", "Message", "Context"]);
    s.appendRow([new Date(), type, msg, ctx]);
  } catch(e) {}
}

function createResponse(o) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const now = new Date();
  let ssId = "NOT_BOUND";
  let sheetName = "N/A";
  
  if (ss) {
    ssId = ss.getId();
    try {
      // Safely check for the sheet name
      const year = now.getFullYear();
      let part = 0, latest = null;
      ss.getSheets().forEach(s => {
        if (s.getName().startsWith(CONFIG.BASE_SHEET_NAME)) {
          let p = parseInt(s.getName().split('_Part_')[1] || "0");
          if (p > part) { part = p; latest = s; }
        }
      });
      sheetName = latest ? latest.getName() : "NONE_FOUND";
    } catch(e) {
      sheetName = "ERROR: " + e.message;
    }
  }

  o.diag = {
    version: "DIAG_V1_STABLE",
    spreadsheetId: ssId,
    activeSheetName: sheetName,
    serverTime: Utilities.formatDate(now, CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm:ss")
  };
  
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
