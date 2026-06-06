const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwabQOQHxgkxyLXc4q3-VFHBqUEmHl9w6mPieC6eQvKvN7INyP4BxPF-TOxliYRpvZx/exec";
let ADMIN_TOKEN = localStorage.getItem('admin_token') || "";
let orders = [];

document.addEventListener('DOMContentLoaded', () => {
    if (!ADMIN_TOKEN) promptForToken(); else loadOrders();
    document.getElementById('search-input').addEventListener('input', applyFilters);
});

function promptForToken() {
    const t = prompt("Enter Security Token:");
    if (t) { ADMIN_TOKEN = t; localStorage.setItem('admin_token', t); loadOrders(); }
}

async function loadOrders() {
    try {
        const r = await fetch(`${SCRIPT_URL}?action=fetchOrders&token=${ADMIN_TOKEN}`);
        const res = await r.json();
        if (res.success) { orders = res.data; renderTable(orders); }
    } catch (e) { alert("Error loading orders."); }
}

function renderTable(data) {
    const tbody = document.getElementById('order-table-body');
    tbody.innerHTML = data.map(o => `
        <tr>
            <td><b>${o[0]}</b><br><small>${o[1]}</small></td>
            <td>${o[3]}<br><small>${o[4]}</small></td>
            <td>${o[10]} (x${o[12]})</td>
            <td>Rs. ${o[13]}</td>
            <td><span class="status-badge status-${o[15].toLowerCase()}">${o[15]}</span></td>
            <td>
                <button class="action-btn" onclick="copyOrder('${o[0]}')"><i class="fas fa-copy"></i></button>
                <button class="action-btn" onclick="updateStatus('${o[0]}', '${o[15]}')"><i class="fas fa-edit"></i></button>
            </td>
        </tr>`).join('');
}

function applyFilters() {
    const q = document.getElementById('search-input').value.toLowerCase();
    const f = orders.filter(o => o[0].toLowerCase().includes(q) || o[4].toString().includes(q) || o[3].toLowerCase().includes(q));
    renderTable(f);
}

function updateStatus(id, curr) {
    const n = prompt("New status (Pending, Confirmed, Packed, Shipped, Delivered, Cancelled):", curr);
    if (n && n !== curr) {
        fetch(`${SCRIPT_URL}?action=updateStatus&orderId=${id}&status=${n}&token=${ADMIN_TOKEN}`)
            .then(r => r.json()).then(res => { if (res.success) loadOrders(); });
    }
}

function copyOrder(id) {
    const o = orders.find(x => x[0] === id);
    const txt = `Order: ${o[0]}\nName: ${o[3]}\nPhone: ${o[4]}\nAddress: ${o[6]}, ${o[7]}, ${o[8]} - ${o[9]}\nTotal: Rs. ${o[13]}`;
    navigator.clipboard.writeText(txt).then(() => alert("Copied!"));
}
