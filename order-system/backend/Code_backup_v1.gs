/**
 * PRODUCTION-READY BACKEND v3.2 (FINAL)
 */

const CONFIG = {
  ADMIN_TOKEN: "CHANGE_THIS_TO_A_SECURE_TOKEN", // Set your password here
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
    
    if (!e.postData || !e.postData.contents) throw new Error("Empty Payload");
    const data = JSON.parse(e.postData.contents);

    // 1. Honeypot (Security)
    if (data._form_security_check && data._sys_v_id !== "VALID_USER") {
       logEvent("BOT_BLOCKED", "Honeypot Triggered", data.phone);
       return createResponse({ success: true, orderId: "ORD-SEC-001", message: "Order placed!" });
    }

    // 2. Sanitize & Validate
    const cleanData = sanitizeData(data);
    const vErr = validateOrderData(cleanData);
    if (vErr) return createResponse({ success: false, message: vErr });

    // 3. Duplicate Prevention (Stable Logic)
    if (isDuplicateOrder(cleanData)) {
      return createResponse({ success: false, message: "Duplicate order detected. Please wait 5 minutes." });
    }

    // 4. Persistence
    const sheet = getActiveSheet();
    const orderId = "ORD-" + Utilities.getUuid().split("-")[0].toUpperCase();
    const now = new Date();
    
    const rowData = [
      orderId,
      Utilities.formatDate(now, CONFIG.TIMEZONE, "yyyy-MM-dd"),
      Utilities.formatDate(now, CONFIG.TIMEZONE, "HH:mm:ss"),
      cleanData.fullName,
      "'" + cleanData.phone, // Force string for phone
      cleanData.email,
      cleanData.address,
      cleanData.city,
      cleanData.state,
      cleanData.pincode,
      cleanData.productName,
      cleanData.productUrl,
      cleanData.quantity,
      cleanData.totalPrice,
      "COD",
      CONFIG.DEFAULT_STATUS
    ];

    sheet.appendRow(rowData);
    logEvent("ORDER_CREATED", `Order ${orderId} saved`, cleanData.phone);

    return createResponse({ success: true, orderId: orderId, message: "Order placed successfully!" });

  } catch (error) {
    logEvent("CRITICAL_ERROR", error.toString(), "SYSTEM");
    return createResponse({ success: false, message: "System Error: " + error.message });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const action = e.parameter.action;
  const token = e.parameter.token;
  
  if (token !== CONFIG.ADMIN_TOKEN) return createResponse({ success: false, message: "Unauthorized" });

  if (action === "fetchOrders") {
    const page = parseInt(e.parameter.page || 1);
    const limit = parseInt(e.parameter.limit || 100);
    const search = (e.parameter.search || "").toLowerCase();
    
    let allRows = [];
    SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(s => {
      if (s.getName().includes(CONFIG.BASE_SHEET_NAME)) {
        const d = s.getDataRange().getValues();
        if (d.length > 1) allRows = allRows.concat(d.slice(1).reverse());
      }
    });

    if (search) {
      allRows = allRows.filter(r => r[0].toLowerCase().includes(search) || r[4].toString().includes(search) || r[3].toLowerCase().includes(search));
    }

    return createResponse({
      success: true,
      data: allRows.slice((page-1)*limit, page*limit),
      total: allRows.length
    });
  }

  if (action === "updateStatus") {
    const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets().filter(s => s.getName().includes(CONFIG.BASE_SHEET_NAME));
    for (let s of sheets) {
      const ids = s.getRange("A:A").getValues();
      for (let i = 0; i < ids.length; i++) {
        if (ids[i][0] === e.parameter.orderId) {
          s.getRange(i + 1, 16).setValue(e.parameter.status);
          return createResponse({ success: true });
        }
      }
    }
  }
  return createResponse({ success: false, message: "Action Failed" });
}

function getActiveSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const year = new Date().getFullYear();
  let latest = null;
  let part = 0;
  
  ss.getSheets().forEach(s => {
    if (s.getName().startsWith(CONFIG.BASE_SHEET_NAME)) {
      let p = parseInt(s.getName().split('_Part_')[1]);
      if (p > part) { part = p; latest = s; }
    }
  });

  if (!latest || latest.getLastRow() >= CONFIG.MAX_ORDERS_PER_SHEET) {
    part++;
    latest = ss.insertSheet(`${CONFIG.BASE_SHEET_NAME}_${year}_Part_${part}`);
    latest.appendRow(["Order ID", "Date", "Time", "Name", "Phone", "Email", "Address", "City", "State", "Pincode", "Product", "URL", "Qty", "Price", "Payment", "Status"]);
    latest.setFrozenRows(1);
  }
  return latest;
}

function isDuplicateOrder(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets().filter(s => s.getName().includes(CONFIG.BASE_SHEET_NAME));
  if (sheets.length === 0) return false;
  
  const lastSheet = sheets[sheets.length - 1];
  const lastRow = lastSheet.getLastRow();
  if (lastRow <= 1) return false;
  
  const recent = lastSheet.getRange(Math.max(2, lastRow - 5), 1, Math.min(lastRow - 1, 5), 16).getValues();
  return recent.some(r => r[4].toString().replace(/\D/g,'') === data.phone && r[13].toString() === data.totalPrice.toString());
}

function sanitizeData(data) {
  const clean = {};
  for (let key in data) {
    let val = (data[key] || "").toString().replace(/<[^>]*>?/gm, '');
    if (val.match(/^[=\+\-\@]/)) val = "'" + val;
    clean[key] = val.trim();
  }
  return clean;
}

function validateOrderData(d) {
  if (!d.fullName || d.fullName.length < 2) return "Full Name Required";
  if (!d.phone || d.phone.length < 10) return "Valid Phone Required";
  if (!d.address || d.address.length < 5) return "Full Address Required";
  if (!d.pincode || d.pincode.length < 6) return "Pincode Required";
  return null;
}

function logEvent(type, msg, ctx) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(CONFIG.LOG_SHEET_NAME) || ss.insertSheet(CONFIG.LOG_SHEET_NAME);
  if (s.getLastRow() === 0) s.appendRow(["Timestamp", "Type", "Message", "Context"]);
  s.appendRow([new Date(), type, msg, ctx]);
}

function createResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
