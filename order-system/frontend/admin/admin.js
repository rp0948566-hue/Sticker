const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzCl2byGPvw17w4axjT7iLxrxPlTNPggDFbwMNuVHM7uDW01o1StjdufxQF9qE8p7cNvw/exec";
const STATUS_OPTIONS = ["Pending", "Confirmed", "Processing", "Packed", "Shipped", "Delivered", "Cancelled", "Pending - Review (Stock Conflict)"];
const PAYMENT_STATUS_OPTIONS = ["Pending", "Paid", "COD", "Failed", "Refunded"];

// Column indices in the Orders sheet — must match COL in Code.gs exactly
const COL = {
  ID: 0, DATE: 1, TIME: 2, NAME: 3, PHONE: 4, EMAIL: 5, ADDRESS: 6, CITY: 7, STATE: 8, PINCODE: 9,
  PRODUCT: 10, URL: 11, QTY: 12, TOTAL: 13, PAYMENT: 14, STATUS: 15, PAYMENT_STATUS: 16,
  INVOICE_NO: 17, RZP_ORDER_ID: 18, RZP_PAYMENT_ID: 19, RZP_SIGNATURE: 20, RAW_DATA: 21
};

let ADMIN_TOKEN = sessionStorage.getItem('ap_token') || "";
let orders = [];
let stockMap = {};

const gate = document.getElementById('ap-gate');
const app = document.getElementById('ap-app');
const gateForm = document.getElementById('ap-gate-form');
const gateInput = document.getElementById('ap-gate-input');
const gateError = document.getElementById('ap-gate-error');

// ── Auth gate ────────────────────────────────────────────────────────────
async function tryUnlock(token) {
  gateError.textContent = '';
  try {
    const resp = await fetch(`${SCRIPT_URL}?action=adminPing&token=${encodeURIComponent(token)}`);
    const body = await resp.json();
    if (body.success) {
      ADMIN_TOKEN = token;
      sessionStorage.setItem('ap_token', token);
      showApp();
      return true;
    }
    gateError.textContent = 'Incorrect password.';
    return false;
  } catch (err) {
    gateError.textContent = 'Could not reach the server. Check your connection.';
    return false;
  }
}

gateForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = gateForm.querySelector('button');
  btn.disabled = true;
  await tryUnlock(gateInput.value.trim());
  btn.disabled = false;
});

document.getElementById('ap-logout').addEventListener('click', () => {
  sessionStorage.removeItem('ap_token');
  ADMIN_TOKEN = '';
  location.reload();
});

function showApp() {
  gate.style.display = 'none';
  app.style.display = 'flex';
  loadEverything();
}

// ── View switching ───────────────────────────────────────────────────────
const viewTitles = {
  dashboard: ['Dashboard', 'Live snapshot of your store'],
  orders: ['Orders', 'View and update every order'],
  stock: ['Stock', 'Control what shows as in / out of stock on the live site']
};

document.querySelectorAll('.ap-nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.ap-nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const view = btn.dataset.view;
    document.querySelectorAll('.ap-view').forEach(v => v.style.display = 'none');
    document.getElementById(`view-${view}`).style.display = 'block';
    document.getElementById('ap-view-title').textContent = viewTitles[view][0];
    document.getElementById('ap-view-sub').textContent = viewTitles[view][1];
  });
});

document.getElementById('ap-refresh').addEventListener('click', loadEverything);

// ── Data loading ─────────────────────────────────────────────────────────
async function loadEverything() {
  await Promise.all([loadOrders(), loadStock()]);
  renderDashboard();
  renderOrdersTable(orders);
  renderStockGrid();
}

async function loadOrders() {
  try {
    const resp = await fetch(`${SCRIPT_URL}?action=fetchOrders&token=${encodeURIComponent(ADMIN_TOKEN)}&page=1`);
    const body = await resp.json();
    if (body.success) orders = body.data || [];
  } catch (err) {
    console.error('Failed to load orders', err);
  }
}

async function loadStock() {
  try {
    const resp = await fetch(`${SCRIPT_URL}?action=getStock`);
    const body = await resp.json();
    if (body.success) stockMap = body.stock || {};
  } catch (err) {
    console.error('Failed to load stock', err);
  }
}

// ── Dashboard ────────────────────────────────────────────────────────────
function renderDashboard() {
  const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o[COL.TOTAL]) || 0), 0);
  const pending = orders.filter(o => o[COL.STATUS] === 'Pending').length;
  const oosCount = Object.values(stockMap).filter(s => !s.inStock).length;

  document.getElementById('stat-total-orders').textContent = orders.length;
  document.getElementById('stat-revenue').textContent = `Rs. ${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-oos').textContent = oosCount;

  const tbody = document.querySelector('#dash-orders-table tbody');
  const recent = orders.slice(0, 8);
  tbody.innerHTML = recent.length ? recent.map(o => `
    <tr>
      <td><b>${escapeHtml(o[COL.ID])}</b></td>
      <td>${escapeHtml(o[COL.NAME])}</td>
      <td class="ap-td-wrap">${escapeHtml(truncate(o[COL.PRODUCT], 40))}</td>
      <td>Rs. ${escapeHtml(o[COL.TOTAL])}</td>
      <td><span class="ap-status-select ${escapeHtml(o[COL.STATUS])}" style="pointer-events:none;">${escapeHtml(o[COL.STATUS])}</span></td>
    </tr>
  `).join('') : `<tr><td colspan="5" class="ap-empty">No orders yet.</td></tr>`;
}

// ── Orders table ─────────────────────────────────────────────────────────
function renderOrdersTable(list) {
  const tbody = document.querySelector('#orders-table tbody');
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="11" class="ap-empty">No orders found.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(o => {
    const id = o[COL.ID];
    const status = o[COL.STATUS];
    const paymentStatus = o[COL.PAYMENT_STATUS] || (o[COL.PAYMENT] === 'Cash on Delivery' ? 'COD' : 'Pending');
    const address = `${o[COL.ADDRESS]}, ${o[COL.CITY]}, ${o[COL.STATE]} - ${o[COL.PINCODE]}`;
    return `
      <tr>
        <td><b>${escapeHtml(id)}</b><br><small style="color:#9ea2b3;">${escapeHtml(o[COL.INVOICE_NO])}</small></td>
        <td>${escapeHtml(o[COL.DATE])}<br><small style="color:#9ea2b3;">${escapeHtml(o[COL.TIME])}</small></td>
        <td>${escapeHtml(o[COL.NAME])}<br><small style="color:#9ea2b3;">${escapeHtml(o[COL.EMAIL])}</small></td>
        <td>${escapeHtml(o[COL.PHONE])}</td>
        <td class="ap-td-wrap">${escapeHtml(address)}</td>
        <td class="ap-td-wrap">${escapeHtml(truncate(o[COL.PRODUCT], 60))}</td>
        <td>${escapeHtml(o[COL.QTY])}</td>
        <td>Rs. ${escapeHtml(o[COL.TOTAL])}</td>
        <td>
          <select class="ap-status-select ap-payment-status ${escapeHtml(paymentStatus)}" data-order-id="${escapeHtml(id)}">
            ${PAYMENT_STATUS_OPTIONS.map(s => `<option value="${s}" ${s === paymentStatus ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
        <td>
          <select class="ap-status-select ap-order-status" data-order-id="${escapeHtml(id)}">
            ${STATUS_OPTIONS.map(s => `<option value="${s}" ${s === status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
        <td><button class="ap-copy-btn" data-copy-id="${escapeHtml(id)}" title="Copy shipping info"><i class="fa-solid fa-copy"></i></button></td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.ap-order-status').forEach(sel => {
    sel.addEventListener('change', async () => {
      const orderId = sel.dataset.orderId;
      const newStatus = sel.value;
      sel.disabled = true;
      try {
        const resp = await fetch(`${SCRIPT_URL}?action=updateStatus&orderId=${encodeURIComponent(orderId)}&status=${encodeURIComponent(newStatus)}&token=${encodeURIComponent(ADMIN_TOKEN)}`);
        const body = await resp.json();
        if (body.success) {
          sel.className = `ap-status-select ap-order-status ${newStatus}`;
          const row = orders.find(o => o[COL.ID] === orderId);
          if (row) row[COL.STATUS] = newStatus;
          renderDashboard();
        } else {
          alert('Could not update status. Please try again.');
        }
      } catch (err) {
        alert('Could not reach the server.');
      }
      sel.disabled = false;
    });
  });

  tbody.querySelectorAll('.ap-payment-status').forEach(sel => {
    sel.addEventListener('change', async () => {
      const orderId = sel.dataset.orderId;
      const newStatus = sel.value;
      sel.disabled = true;
      try {
        const resp = await fetch(`${SCRIPT_URL}?action=updatePaymentStatus&orderId=${encodeURIComponent(orderId)}&paymentStatus=${encodeURIComponent(newStatus)}&token=${encodeURIComponent(ADMIN_TOKEN)}`);
        const body = await resp.json();
        if (body.success) {
          sel.className = `ap-status-select ap-payment-status ${newStatus}`;
          const row = orders.find(o => o[COL.ID] === orderId);
          if (row) row[COL.PAYMENT_STATUS] = newStatus;
        } else {
          alert('Could not update payment status. Please try again.');
        }
      } catch (err) {
        alert('Could not reach the server.');
      }
      sel.disabled = false;
    });
  });

  tbody.querySelectorAll('.ap-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const o = orders.find(x => x[COL.ID] === btn.dataset.copyId);
      if (!o) return;
      const text = `Order: ${o[COL.ID]}\nName: ${o[COL.NAME]}\nPhone: ${o[COL.PHONE]}\nAddress: ${o[COL.ADDRESS]}, ${o[COL.CITY]}, ${o[COL.STATE]} - ${o[COL.PINCODE]}\nTotal: Rs. ${o[COL.TOTAL]}`;
      navigator.clipboard.writeText(text).then(() => {
        btn.innerHTML = '<i class="fa-solid fa-check"></i>';
        setTimeout(() => { btn.innerHTML = '<i class="fa-solid fa-copy"></i>'; }, 1200);
      });
    });
  });
}

document.getElementById('orders-search').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  if (!q) { renderOrdersTable(orders); return; }
  const filtered = orders.filter(o =>
    (o[COL.ID] || '').toString().toLowerCase().includes(q) ||
    (o[COL.NAME] || '').toString().toLowerCase().includes(q) ||
    (o[COL.PHONE] || '').toString().toLowerCase().includes(q)
  );
  renderOrdersTable(filtered);
});

// ── Stock grid ───────────────────────────────────────────────────────────
function renderStockGrid() {
  const grid = document.getElementById('stock-grid');
  const codes = Object.keys(stockMap);
  if (!codes.length) {
    grid.innerHTML = `<div class="ap-empty">Stock data unavailable.</div>`;
    return;
  }
  grid.innerHTML = codes.map(code => {
    const entry = stockMap[code];
    return `
      <div class="ap-stock-item ${entry.inStock ? '' : 'out'}" data-code="${code}">
        <div>
          <div class="ap-stock-name">${escapeHtml(entry.name)}</div>
          <div class="ap-stock-status ${entry.inStock ? 'in' : 'out'}">${entry.inStock ? 'In Stock' : 'Out of Stock'}</div>
        </div>
        <label class="ap-switch">
          <input type="checkbox" ${entry.inStock ? 'checked' : ''} data-stock-toggle="${code}">
          <span class="ap-switch-track"></span>
        </label>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('[data-stock-toggle]').forEach(cb => {
    cb.addEventListener('change', async () => {
      const code = cb.dataset.stockToggle;
      const inStock = cb.checked;
      cb.disabled = true;
      try {
        const resp = await fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'setStock', token: ADMIN_TOKEN, code, inStock })
        });
        const body = await resp.json();
        if (body.success) {
          stockMap = body.stock;
          renderStockGrid();
          renderDashboard();
        } else {
          alert(body.message || 'Could not update stock.');
          cb.checked = !inStock;
        }
      } catch (err) {
        alert('Could not reach the server.');
        cb.checked = !inStock;
      }
      cb.disabled = false;
    });
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────
function escapeHtml(v) {
  return (v === undefined || v === null ? '' : v.toString())
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function truncate(v, n) {
  const s = (v || '').toString();
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// ── Boot ─────────────────────────────────────────────────────────────────
if (ADMIN_TOKEN) {
  tryUnlock(ADMIN_TOKEN);
} else {
  gateInput.focus();
}
