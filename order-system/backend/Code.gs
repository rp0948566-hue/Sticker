/**
 * PRODUCTION-READY BACKEND v5.0 (Razorpay online payments + COD)
 */
const CONFIG = {
  ADMIN_TOKEN: "cdBBfngoULsxvLPtQTzWmPdwd7M3OuJR", // Rotate this in the Apps Script console if it is ever exposed
  MAX_ORDERS_PER_SHEET: 300,
  BASE_SHEET_NAME: "Orders",
  LOG_SHEET_NAME: "SystemLogs",
  DEFAULT_STATUS: "Pending",
  TIMEZONE: "GMT+5:30",
  DUPLICATE_WINDOW_MINS: 5
};

// Razorpay credentials are never hardcoded here — set them once via
// Apps Script UI: Project Settings -> Script Properties ->
//   RAZORPAY_KEY_ID     (public, safe to send to the browser)
//   RAZORPAY_KEY_SECRET (private, never sent to the browser)
function getRazorpayCreds() {
  const props = PropertiesService.getScriptProperties();
  return {
    keyId: props.getProperty('RAZORPAY_KEY_ID'),
    keySecret: props.getProperty('RAZORPAY_KEY_SECRET')
  };
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const data = JSON.parse(e.postData.contents);

    if (data.action === 'createRazorpayOrder') return handleCreateRazorpayOrder(data);
    if (data.action === 'verifyRazorpayPayment') return handleVerifyRazorpayPayment(data);

    // Honeypot: real users never fill this hidden field — bots that auto-fill forms do
    if (data.hp_company) {
      logEvent("BOT_BLOCKED", "Honeypot field filled", data.phone || "unknown");
      return createResponse({ success: false, message: "Security Validation Failed" });
    }

    // Security Token Check
    if (data.verify_token !== "USER_VERIFIED_77") {
       return createResponse({ success: false, message: "Security Validation Failed" });
    }

    const cleanData = sanitizeData(data);
    if (isDuplicateOrder(cleanData)) {
      return createResponse({ success: false, message: "Duplicate order. Please wait." });
    }

    // Cash on Delivery path — save immediately as Pending
    const orderId = saveOrder(cleanData, data, "Cash on Delivery", CONFIG.DEFAULT_STATUS);
    logEvent("ORDER_CREATED", `COD order ${orderId} saved`, cleanData.phone);
    return createResponse({ success: true, orderId: orderId, message: "Order placed successfully!" });

  } catch (err) {
    logEvent("SYSTEM_ERROR", err.toString(), "CRITICAL");
    return createResponse({ success: false, message: "Server Error" });
  } finally { lock.releaseLock(); }
}

// Step 1 of online payment: create a Razorpay order for the given amount.
// The frontend then opens Razorpay Checkout with this order_id.
function handleCreateRazorpayOrder(data) {
  const creds = getRazorpayCreds();
  if (!creds.keyId || !creds.keySecret) {
    return createResponse({ success: false, message: "Online payments are not configured yet. Please use Cash on Delivery." });
  }
  if (data.hp_company) {
    return createResponse({ success: false, message: "Security Validation Failed" });
  }
  const amountPaise = Math.round(Number(data.totalPrice) * 100);
  if (!amountPaise || amountPaise <= 0) {
    return createResponse({ success: false, message: "Invalid order amount." });
  }

  const receipt = "rcpt_" + Utilities.getUuid().split("-")[0];
  const payload = {
    amount: amountPaise,
    currency: "INR",
    receipt: receipt,
    payment_capture: 1
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Basic " + Utilities.base64Encode(creds.keyId + ":" + creds.keySecret) },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const resp = UrlFetchApp.fetch("https://api.razorpay.com/v1/orders", options);
  const body = JSON.parse(resp.getContentText());

  if (resp.getResponseCode() !== 200 || !body.id) {
    logEvent("RAZORPAY_ORDER_FAILED", resp.getContentText(), data.phone || "unknown");
    return createResponse({ success: false, message: "Could not start payment. Please try again." });
  }

  return createResponse({
    success: true,
    razorpayOrderId: body.id,
    razorpayKeyId: creds.keyId, // public key only
    amount: amountPaise
  });
}

// Step 2 of online payment: verify the signature Razorpay Checkout returns,
// and only then save the order as Paid. Never trust the client's word alone.
function handleVerifyRazorpayPayment(data) {
  const creds = getRazorpayCreds();
  if (!creds.keySecret) {
    return createResponse({ success: false, message: "Payment verification is not configured." });
  }
  if (data.hp_company) {
    return createResponse({ success: false, message: "Security Validation Failed" });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return createResponse({ success: false, message: "Missing payment details." });
  }

  const expectedSignature = computeHmacSha256Hex(razorpay_order_id + "|" + razorpay_payment_id, creds.keySecret);
  if (expectedSignature !== razorpay_signature) {
    logEvent("PAYMENT_SIGNATURE_MISMATCH", razorpay_order_id, data.phone || "unknown");
    return createResponse({ success: false, message: "Payment verification failed." });
  }

  const cleanData = sanitizeData(data);
  if (isDuplicateOrder(cleanData)) {
    return createResponse({ success: false, message: "Duplicate order. Please wait." });
  }

  const orderId = saveOrder(cleanData, data, "Razorpay (Online)", "Paid");
  logEvent("ORDER_CREATED", `Paid order ${orderId} saved`, cleanData.phone);
  return createResponse({ success: true, orderId: orderId, message: "Payment successful! Order placed." });
}

function computeHmacSha256Hex(message, secret) {
  const signatureBytes = Utilities.computeHmacSha256Signature(message, secret);
  return signatureBytes.map(b => {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? "0" + v : v;
  }).join("");
}

function saveOrder(cleanData, rawData, paymentMethod, status) {
  const sheet = getActiveSheet();
  const orderId = "ORD-" + Utilities.getUuid().split("-")[0].toUpperCase();
  const now = new Date();

  const storeDomain = rawData.storeDomain || "";
  const sandboxUrl = storeDomain + "/order-system/frontend/product-showcase-area/index.html?id=" + orderId;
  const clickableUrl = '=HYPERLINK("' + sandboxUrl + '", "View Order Sandbox")';

  sheet.appendRow([
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
    clickableUrl,
    cleanData.quantity,
    cleanData.totalPrice,
    paymentMethod,
    status,
    rawData.cartData || ""
  ]);

  return orderId;
}

function doGet(e) {
  const token = e.parameter.token;
  const action = e.parameter.action;

  // Security Decoy for fetchSingleOrder without token
  if (action === "fetchSingleOrder" && (!token || token !== CONFIG.ADMIN_TOKEN)) {
    return createResponse({ success: false, message: "Link Expired" });
  }

  if (token !== CONFIG.ADMIN_TOKEN) return createResponse({ success: false, message: "Unauthorized" });

  if (action === "fetchOrders") {
    let all = [];
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.getSheets().filter(s => s.getName().includes(CONFIG.BASE_SHEET_NAME)).reverse().forEach(s => {
      const d = s.getDataRange().getValues();
      if (d.length > 1) all = all.concat(d.slice(1).reverse());
    });
    return createResponse({ success: true, data: all.slice((parseInt(e.parameter.page || 1)-1)*100, parseInt(e.parameter.page || 1)*100), total: all.length });
  }

  if (action === "fetchSingleOrder") {
    const orderId = e.parameter.orderId;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets().filter(s => s.getName().includes(CONFIG.BASE_SHEET_NAME));

    for (let s of sheets) {
      const data = s.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === orderId) {
          return createResponse({
            success: true,
            order: {
              id: data[i][0],
              date: data[i][1],
              time: data[i][2],
              customer: data[i][3],
              phone: data[i][4],
              email: data[i][5],
              address: `${data[i][6]}, ${data[i][7]}, ${data[i][8]} - ${data[i][9]}`,
              products: data[i][10],
              qty: data[i][12],
              total: data[i][13],
              payment: data[i][14],
              status: data[i][15],
              cartData: data[i][16] // Return detailed links
            }
          });
        }
      }
    }
    return createResponse({ success: false });
  }

  if (action === "updateStatus") {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets().filter(s => s.getName().includes(CONFIG.BASE_SHEET_NAME));
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
    latest.appendRow(["Order ID", "Date", "Time", "Name", "Phone", "Email", "Address", "City", "State", "Pincode", "Product", "URL", "Qty", "Price", "Payment", "Status", "RawData"]);
    latest.setFrozenRows(1);
    latest.getRange(1,1,1,17).setFontWeight("bold").setBackground("#f3f3f3");
  }
  return latest;
}

function isDuplicateOrder(data) {
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets().filter(s => s.getName().includes(CONFIG.BASE_SHEET_NAME));
  if (sheets.length === 0) return false;
  const s = sheets[sheets.length - 1];
  const lastRow = s.getLastRow();
  if (lastRow <= 1) return false;
  const recent = s.getRange(Math.max(2, lastRow - 5), 1, Math.min(lastRow - 1, 5), 16).getValues();
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
  o.diag = {
    ss_id: ss ? ss.getId() : "NOT_BOUND",
    version: "v5.0_RAZORPAY"
  };
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
