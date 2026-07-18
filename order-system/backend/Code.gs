/**
 * PRODUCTION-READY BACKEND v6.0 (Razorpay hardening: idempotency, pending-sync
 * recovery, inventory lock, invoice numbers, payment status, email receipts)
 */
const CONFIG = {
  ADMIN_TOKEN: "cdBBfngoULsxvLPtQTzWmPdwd7M3OuJR", // Rotate this in the Apps Script console if it is ever exposed
  MAX_ORDERS_PER_SHEET: 300,
  BASE_SHEET_NAME: "Orders",
  LOG_SHEET_NAME: "SystemLogs",
  STOCK_SHEET_NAME: "Stock",
  PENDING_SYNC_SHEET_NAME: "PendingSync",
  DEFAULT_STATUS: "Pending",
  TIMEZONE: "GMT+5:30",
  DUPLICATE_WINDOW_MINS: 5,
  SEND_EMAILS: true
};

// Sheet column layout (0-indexed) — keep in sync with getActiveSheet() header
const COL = {
  ID: 0, DATE: 1, TIME: 2, NAME: 3, PHONE: 4, EMAIL: 5, ADDRESS: 6, CITY: 7,
  STATE: 8, PINCODE: 9, PRODUCT: 10, URL: 11, QTY: 12, PRICE: 13, PAYMENT_METHOD: 14,
  ORDER_STATUS: 15, PAYMENT_STATUS: 16, INVOICE_NO: 17, RZP_ORDER_ID: 18,
  RZP_PAYMENT_ID: 19, RZP_SIGNATURE: 20, RAW_DATA: 21
};

// All category codes the storefront can carry stock status for.
// Keep this in sync with CAT_CODES in frontend/*/catalogue.js.
const ALL_STOCK_CODES = {
  ANM: 'Anime', ANM2: 'Anime Mini', ANM3: 'New Anime', MOV: 'Movies', CAR: 'Cars',
  SPO: 'Sports', MAR: 'Marvels', AST: 'Aesthetic', QOU: 'Quotes', ART: 'Artist Prints',
  VVG: 'Van Gogh', SONM: 'Songs', SC: 'Song Cover 8x8', DEV: 'Devotional',
  VSN: 'Vision Board', GIR: 'Pink Lavender', SHCN: 'Shinchan', A3: 'A3 Size',
  SPL: 'Split Posters', SPLA: 'Split Art', LAP: 'Laptop Stickers',
  M: 'Card', A: 'Accessories', F: 'Frame/Poster'
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
    if (data.action === 'setStock') return handleSetStock(data);

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

    // Inventory lock: don't accept an order for something that just went out of stock
    const outOfStock = findOutOfStockItems(data.cartData);
    if (outOfStock.length) {
      return createResponse({ success: false, message: `Sorry, these items just went out of stock: ${outOfStock.join(', ')}. Please remove them and try again.`, outOfStock });
    }

    // Cash on Delivery path — save immediately as Pending
    const { orderId, invoiceNo } = saveOrder(cleanData, data, "Cash on Delivery", CONFIG.DEFAULT_STATUS, "COD");
    logEvent("ORDER_CREATED", `COD order ${orderId} saved`, cleanData.phone);
    return createResponse({ success: true, orderId, invoiceNo, message: "Order placed successfully!" });

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
  const outOfStock = findOutOfStockItems(data.cartData);
  if (outOfStock.length) {
    return createResponse({ success: false, message: `Sorry, these items just went out of stock: ${outOfStock.join(', ')}. Please remove them and try again.`, outOfStock });
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

  // Idempotency: this exact Razorpay payment has already been saved as an
  // order (retry, double-submit, refreshed page) — return the existing order
  // instead of creating a second one for a payment that was only captured once.
  const existing = findExistingOrderByPaymentId(razorpay_payment_id);
  if (existing) {
    return createResponse({ success: true, orderId: existing.orderId, invoiceNo: existing.invoiceNo, message: "Payment successful! Order placed." });
  }

  const cleanData = sanitizeData(data);

  // Inventory lock: the payment is already captured by Razorpay at this point,
  // so we can no longer reject the order outright — but if the item went out
  // of stock while the customer was paying, flag it for manual review instead
  // of silently shipping something you don't have.
  const outOfStock = findOutOfStockItems(data.cartData);
  const orderStatus = outOfStock.length ? "Pending - Review (Stock Conflict)" : CONFIG.DEFAULT_STATUS;

  try {
    const { orderId, invoiceNo } = saveOrder(
      cleanData, data, "Razorpay (Online)", orderStatus, "Paid",
      { orderId: razorpay_order_id, paymentId: razorpay_payment_id, signature: razorpay_signature }
    );
    logEvent("ORDER_CREATED", `Paid order ${orderId} saved`, cleanData.phone);
    return createResponse({ success: true, orderId, invoiceNo, message: "Payment successful! Order placed." });
  } catch (err) {
    // Money is already taken — never lose it. Log everything needed to
    // manually recover/re-sync this order, and tell the customer their
    // payment succeeded rather than showing a false failure.
    logPendingSync(data, razorpay_order_id, razorpay_payment_id);
    logEvent("PENDING_SYNC", `Payment ${razorpay_payment_id} captured but order save failed: ${err.toString()}`, data.phone || "unknown");
    return createResponse({
      success: true,
      orderId: "PENDING-" + razorpay_payment_id.slice(-8).toUpperCase(),
      message: "Payment received! We're finalizing your order — you'll get a confirmation shortly. Contact support with your payment ID if you don't hear back within a day.",
      pendingSync: true
    });
  }
}

// ── Stock management ────────────────────────────────────────────────────
function getStockSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.STOCK_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.STOCK_SHEET_NAME);
    sheet.appendRow(["Code", "Name", "InStock", "UpdatedAt"]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#f3f3f3");
  }
  return sheet;
}

// Every category defaults to In Stock unless explicitly marked out —
// this way a brand-new category code never gets hidden by accident.
function getStockMap() {
  const sheet = getStockSheet();
  const rows = sheet.getDataRange().getValues().slice(1);
  const overrides = {};
  rows.forEach(r => { if (r[0]) overrides[r[0]] = r[2] === true || r[2] === "TRUE"; });

  const stock = {};
  Object.keys(ALL_STOCK_CODES).forEach(code => {
    stock[code] = { name: ALL_STOCK_CODES[code], inStock: overrides.hasOwnProperty(code) ? overrides[code] : true };
  });
  return stock;
}

function handleSetStock(data) {
  if (data.token !== CONFIG.ADMIN_TOKEN) {
    return createResponse({ success: false, message: "Unauthorized" });
  }
  const code = (data.code || "").toString().trim();
  if (!ALL_STOCK_CODES[code]) {
    return createResponse({ success: false, message: "Unknown category code" });
  }
  const inStock = data.inStock === true || data.inStock === "true";
  const sheet = getStockSheet();
  const rows = sheet.getDataRange().getValues();
  let found = false;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === code) {
      sheet.getRange(i + 1, 3).setValue(inStock);
      sheet.getRange(i + 1, 4).setValue(new Date());
      found = true;
      break;
    }
  }
  if (!found) {
    sheet.appendRow([code, ALL_STOCK_CODES[code], inStock, new Date()]);
  }
  logEvent("STOCK_UPDATED", `${code} -> ${inStock ? "In Stock" : "Out of Stock"}`, "admin");
  return createResponse({ success: true, stock: getStockMap() });
}

function computeHmacSha256Hex(message, secret) {
  const signatureBytes = Utilities.computeHmacSha256Signature(message, secret);
  return signatureBytes.map(b => {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? "0" + v : v;
  }).join("");
}

// rzpMeta: { orderId, paymentId, signature } — omitted entirely for COD orders
function saveOrder(cleanData, rawData, paymentMethod, orderStatus, paymentStatus, rzpMeta) {
  const sheet = getActiveSheet();
  const orderId = "ORD-" + Utilities.getUuid().split("-")[0].toUpperCase();
  const invoiceNo = "INV-" + orderId.slice(4);
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
    orderStatus,
    paymentStatus,
    invoiceNo,
    rzpMeta ? rzpMeta.orderId : "",
    rzpMeta ? rzpMeta.paymentId : "",
    rzpMeta ? rzpMeta.signature : "",
    rawData.cartData || ""
  ]);

  sendOrderEmail(cleanData, orderId, invoiceNo, paymentMethod, paymentStatus);
  return { orderId, invoiceNo };
}

// Best-effort order confirmation email — never blocks or breaks order saving.
function sendOrderEmail(cleanData, orderId, invoiceNo, paymentMethod, paymentStatus) {
  if (!CONFIG.SEND_EMAILS || !cleanData.email) return;
  try {
    const subject = `Order Confirmed — ${orderId} | Classic Cult`;
    const body =
      `Hi ${cleanData.fullName},\n\n` +
      `Thanks for your order! Here are your details:\n\n` +
      `Order ID: ${orderId}\n` +
      `Invoice No: ${invoiceNo}\n` +
      `Payment: ${paymentMethod} (${paymentStatus})\n` +
      `Total: Rs. ${cleanData.totalPrice}\n\n` +
      `Product(s): ${cleanData.productName}\n\n` +
      `Shipping to: ${cleanData.address}, ${cleanData.city}, ${cleanData.state} - ${cleanData.pincode}\n\n` +
      `We'll notify you again once your order ships.\n\n— Classic Cult`;
    MailApp.sendEmail(cleanData.email, subject, body);
  } catch (err) {
    logEvent("EMAIL_FAILED", err.toString(), orderId);
  }
}

// ── Inventory lock: re-check stock right before an order is actually saved,
// since time passes between "added to cart" and "payment verified" and an
// admin may have marked a category out of stock in between.
function findOutOfStockItems(cartDataJson) {
  let cart;
  try { cart = JSON.parse(cartDataJson || "[]"); } catch (e) { return []; }
  if (!Array.isArray(cart) || !cart.length) return [];

  const stock = getStockMap();
  return cart
    .filter(item => item.categoryCode && stock[item.categoryCode] && stock[item.categoryCode].inStock === false)
    .map(item => item.title);
}

// ── Duplicate-payment protection: a given Razorpay payment must only ever
// create one order, even if the browser retries or the user double-submits.
function findExistingOrderByPaymentId(paymentId) {
  if (!paymentId) return null;
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets().filter(s => s.getName().includes(CONFIG.BASE_SHEET_NAME));
  for (const s of sheets) {
    const data = s.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][COL.RZP_PAYMENT_ID] === paymentId) {
        return { orderId: data[i][COL.ID], invoiceNo: data[i][COL.INVOICE_NO] };
      }
    }
  }
  return null;
}

// ── Pending-sync recovery: if the payment is already verified/captured by
// Razorpay but writing the order to Sheets throws, we must NOT tell the
// customer their payment failed — the money is already taken. Log everything
// needed to manually recover the order instead of silently losing it.
function logPendingSync(data, razorpay_order_id, razorpay_payment_id) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let s = ss.getSheetByName(CONFIG.PENDING_SYNC_SHEET_NAME);
    if (!s) {
      s = ss.insertSheet(CONFIG.PENDING_SYNC_SHEET_NAME);
      s.appendRow(["Timestamp", "Razorpay Order ID", "Razorpay Payment ID", "Name", "Phone", "Email", "Total", "CartData Raw"]);
      s.setFrozenRows(1);
    }
    s.appendRow([new Date(), razorpay_order_id, razorpay_payment_id, data.fullName, data.phone, data.email, data.totalPrice, data.cartData || ""]);
  } catch (e) {}
}

function doGet(e) {
  const token = e.parameter.token;
  const action = e.parameter.action;

  // Public: every storefront page checks this on load to know what to grey out.
  // No token required — it only ever reveals in-stock/out-of-stock flags.
  if (action === "getStock") {
    return createResponse({ success: true, stock: getStockMap() });
  }

  // Admin login check: the admin panel calls this with the password the user
  // typed: it only succeeds if that password matches CONFIG.ADMIN_TOKEN.
  if (action === "adminPing") {
    return createResponse({ success: token === CONFIG.ADMIN_TOKEN });
  }

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
        if (data[i][COL.ID] === orderId) {
          return createResponse({
            success: true,
            order: {
              id: data[i][COL.ID],
              date: data[i][COL.DATE],
              time: data[i][COL.TIME],
              customer: data[i][COL.NAME],
              phone: data[i][COL.PHONE],
              email: data[i][COL.EMAIL],
              address: `${data[i][COL.ADDRESS]}, ${data[i][COL.CITY]}, ${data[i][COL.STATE]} - ${data[i][COL.PINCODE]}`,
              products: data[i][COL.PRODUCT],
              qty: data[i][COL.QTY],
              total: data[i][COL.PRICE],
              payment: data[i][COL.PAYMENT_METHOD],
              status: data[i][COL.ORDER_STATUS],
              paymentStatus: data[i][COL.PAYMENT_STATUS],
              invoiceNo: data[i][COL.INVOICE_NO],
              cartData: data[i][COL.RAW_DATA]
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
          s.getRange(i + 1, COL.ORDER_STATUS + 1).setValue(e.parameter.status);
          return createResponse({ success: true });
        }
      }
    }
    return createResponse({ success: false });
  }

  if (action === "updatePaymentStatus") {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets().filter(s => s.getName().includes(CONFIG.BASE_SHEET_NAME));
    for (let s of sheets) {
      const data = s.getRange("A:A").getValues();
      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === e.parameter.orderId) {
          s.getRange(i + 1, COL.PAYMENT_STATUS + 1).setValue(e.parameter.paymentStatus);
          return createResponse({ success: true });
        }
      }
    }
    return createResponse({ success: false });
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
    latest.appendRow([
      "Order ID", "Date", "Time", "Name", "Phone", "Email", "Address", "City", "State", "Pincode",
      "Product", "URL", "Qty", "Price", "Payment Method", "Order Status", "Payment Status",
      "Invoice No", "Razorpay Order ID", "Razorpay Payment ID", "Razorpay Signature", "RawData"
    ]);
    latest.setFrozenRows(1);
    latest.getRange(1, 1, 1, 22).setFontWeight("bold").setBackground("#f3f3f3");
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
    version: "v6.0_HARDENED"
  };
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
