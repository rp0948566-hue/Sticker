/**
 * ADMIN INTEGRATION v2.1
 * Fully compatible with Hardened Backend v2.1
 */

// 1. SET YOUR WEB APP URL HERE
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwabQOQHxgkxyLXc4q3-VFHBqUEmHl9w6mPieC6eQvKvN7INyP4BxPF-TOxliYRpvZx/exec";
let ADMIN_TOKEN = localStorage.getItem('admin_token') || "";

let orders = [];
let currentPage = 1;
const limit = 100;

// Security: Session Expiration
let inactivityTimer;
const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    if (ADMIN_TOKEN) {
        inactivityTimer = setTimeout(() => {
            localStorage.removeItem('admin_token');
            ADMIN_TOKEN = "";
            alert("Session expired due to inactivity. Please log in again.");
            location.reload();
        }, INACTIVITY_LIMIT_MS);
    }
}

// Track user activity to prevent premature expiration
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, resetInactivityTimer, true);
});

document.addEventListener('DOMContentLoaded', () => {
    if (!ADMIN_TOKEN) {
        promptForToken();
    } else {
        loadOrders();
    }
    
    // Setup Search & Filters
    document.getElementById('search-input').addEventListener('input', () => {
        // For production scale, you'd trigger a server-side search
        // Here we filter locally for responsiveness, but fallback to server if empty
        applyFilters();
    });
    
    // Server-side search on Enter
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadOrders(1, document.getElementById('search-input').value);
        }
    });

    document.getElementById('filter-date').addEventListener('change', applyFilters);
    document.getElementById('filter-status').addEventListener('change', applyFilters);
});

function promptForToken() {
    const token = prompt("Enter Admin Security Token:");
    if (token) {
        ADMIN_TOKEN = token;
        localStorage.setItem('admin_token', token);
        loadOrders();
    } else {
        alert("Authorization required.");
    }
}

async function loadOrders(page = 1, searchQuery = "") {
    if (!ADMIN_TOKEN) return;
    showLoading(true);
    try {
        const url = `${SCRIPT_URL}?action=fetchOrders&token=${ADMIN_TOKEN}&page=${page}&limit=${limit}&search=${encodeURIComponent(searchQuery)}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            orders = result.data;
            currentPage = result.page;
            renderTable(orders);
            updateStats(orders);
        } else {
            if (result.message === "Unauthorized") {
                localStorage.removeItem('admin_token');
                alert("Session expired or invalid token.");
                promptForToken();
            } else {
                alert("Error: " + result.message);
            }
        }
    } catch (error) {
        console.error("Fetch error:", error);
        alert("Connection failed. Check SCRIPT_URL.");
    } finally {
        showLoading(false);
    }
}

function renderTable(data) {
    const tbody = document.getElementById('order-table-body');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 40px;">No matching orders found.</td></tr>';
        return;
    }

    data.forEach(order => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="font-weight: 700;">${order[0]}</div>
                <div style="font-size: 11px; color: #888;">${order[1]} | ${order[2]}</div>
            </td>
            <td>
                <div style="font-weight: 600;">${order[3]}</div>
                <div style="font-size: 12px; color: #555;">${order[4]}</div>
            </td>
            <td style="max-width: 200px;">
                <div style="font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${order[10]}</div>
                <div style="font-size: 11px; color: #888;">Qty: ${order[12]}</div>
            </td>
            <td>
                <div style="font-weight: 800;">Rs. ${order[13]}</div>
                <div style="font-size: 10px; color: #27ae60;">${order[14]}</div>
            </td>
            <td>
                <span class="status-badge status-${order[15].toLowerCase()}">${order[15]}</span>
            </td>
            <td>
                <button class="action-btn copy-btn" onclick="copyOrderDetails('${order[0]}')"><i class="fas fa-copy"></i></button>
                <button class="action-btn update-btn" onclick="promptStatusUpdate('${order[0]}', '${order[15]}')"><i class="fas fa-edit"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function applyFilters() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const date = document.getElementById('filter-date').value;
    const status = document.getElementById('filter-status').value;
    
    const filtered = orders.filter(order => {
        const matchesSearch = order[0].toLowerCase().includes(search) || order[4].toString().includes(search) || order[3].toLowerCase().includes(search);
        const matchesDate = !date || order[1] === date;
        const matchesStatus = !status || order[15] === status;
        return matchesSearch && matchesDate && matchesStatus;
    });
    
    renderTable(filtered);
}

function updateStats(data) {
    document.getElementById('stat-total').textContent = data.length;
    document.getElementById('stat-pending').textContent = data.filter(o => o[15] === "Pending").length;
    document.getElementById('stat-delivered').textContent = data.filter(o => o[15] === "Delivered").length;
    const revenue = data.reduce((sum, o) => sum + (o[15] !== "Cancelled" ? parseFloat(o[13]) : 0), 0);
    document.getElementById('stat-revenue').textContent = `Rs. ${revenue.toLocaleString()}`;
}

async function promptStatusUpdate(orderId, currentStatus) {
    const statuses = ["Pending", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled"];
    const newStatus = prompt(`Update status for ${orderId}:`, currentStatus);
    
    if (newStatus && statuses.includes(newStatus) && newStatus !== currentStatus) {
        showLoading(true);
        try {
            const url = `${SCRIPT_URL}?action=updateStatus&orderId=${orderId}&status=${newStatus}&token=${ADMIN_TOKEN}`;
            const response = await fetch(url);
            const result = await response.json();
            if (result.success) {
                alert("Updated!");
                loadOrders(currentPage, document.getElementById('search-input').value);
            } else {
                alert("Error: " + result.message);
            }
        } catch (error) {
            alert("Update failed.");
        } finally {
            showLoading(false);
        }
    }
}

function copyOrderDetails(orderId) {
    const order = orders.find(o => o[0] === orderId);
    if (!order) return;
    const details = `Order: ${order[0]}\nCustomer: ${order[3]}\nPhone: ${order[4]}\nAddr: ${order[6]}, ${order[7]} - ${order[9]}\nTotal: Rs. ${order[13]}`;
    navigator.clipboard.writeText(details).then(() => alert("Copied!"));
}

function showLoading(show) {
    document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
}
