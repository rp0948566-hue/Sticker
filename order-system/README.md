# Ecommerce Order Management System (Google Sheets Backend)

This system provides a full-stack solution for capturing orders on your frontend and managing them via an Admin Dashboard, all backed by Google Sheets.

## Folder Structure
- `backend/Code.gs`: The Google Apps Script code.
- `frontend/checkout/`: Customer-facing checkout form.
- `frontend/admin/`: Admin-facing order management dashboard.

## Setup Instructions

### 1. Google Sheets & Backend Setup
1. Create a new Google Sheet.
2. Go to **Extensions > Apps Script**.
3. Copy the content of `backend/Code.gs` into the Apps Script editor.
4. Click **Deploy > New Deployment**.
5. Select **Type: Web App**.
6. Set **Execute as: Me**.
7. Set **Who has access: Anyone** (this allows your website to send data).
8. Click **Deploy** and copy the **Web App URL**.

### 2. Frontend Configuration
1. Open `order-system/frontend/checkout/checkout.js`.
2. Replace `"YOUR_APPS_SCRIPT_WEB_APP_URL_HERE"` with your Web App URL.
3. Open `order-system/frontend/admin/admin.js`.
4. Replace `"YOUR_APPS_SCRIPT_WEB_APP_URL_HERE"` with your Web App URL.

### 3. Website Integration
Update your main website's "Checkout" or "Buy Now" buttons to redirect to the checkout page:
```javascript
window.location.href = "/order-system/frontend/checkout/index.html";
```

## Features
- **Auto-Rotation:** Automatically creates a new sheet (Part 1, Part 2, etc.) every 300 orders.
- **Validation:** Server-side validation for phone numbers (Indian 10-digit), emails, and required fields.
- **Admin Dashboard:**
  - Real-time order tracking.
  - Search by Phone, Name, or Order ID.
  - Filter by Status and Date.
  - One-click order detail copying for shipping labels.
  - Status management (Pending -> Delivered -> etc.).
- **Mobile Responsive:** All interfaces are optimized for mobile and desktop.

## Security Note
- The Google Apps Script URL is public. For production use with sensitive data, consider adding an `API_KEY` check in `doGet` and `doPost` to ensure only your frontend can communicate with the script.
