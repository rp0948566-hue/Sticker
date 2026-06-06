const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzCl2byGPvw17w4axjT7iLxrxPlTNPggDFbwMNuVHM7uDW01o1StjdufxQF9qE8p7cNvw/exec";
const ADMIN_TOKEN = localStorage.getItem('admin_token');

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('id');
    const referrer = document.referrer;

    // Security Gate: Referrer must be Google Sheets or the Admin Dashboard
    const isReferrerValid = referrer.includes('google.com') || referrer.includes('/admin/');
    
    // IF unauthorized access detected (no token, no ID, or direct URL entry)
    if (!ADMIN_TOKEN || !orderId || !isReferrerValid) {
        setTimeout(showDecoy, 1200);
        return;
    }

    try {
        const response = await fetch(`${SCRIPT_URL}?action=fetchSingleOrder&orderId=${orderId}&token=${ADMIN_TOKEN}`);
        const result = await response.json();

        if (result.success && result.order) {
            renderShowcase(result.order);
        } else {
            showDecoy();
        }
    } catch (error) {
        showDecoy();
    } finally {
        setTimeout(hideGate, 1000);
    }
});

function renderShowcase(order) {
    const container = document.getElementById('content-area');
    
    // Attempt to parse detailed data for links, fallback to string parsing
    let productItems = [];
    try {
        if (order.cartData) {
            const raw = JSON.parse(order.cartData);
            productItems = raw.map(item => ({
                name: item.title,
                qty: item.quantity,
                url: item.url || (window.location.origin + "?product=" + encodeURIComponent(item.title)),
                price: item.price
            }));
        } else {
            // Fallback for old data
            productItems = order.products.split(', ').map(p => {
                const match = p.match(/(.*) \(x(\d+)\)/);
                return match ? { name: match[1], qty: parseInt(match[2]), url: "#", price: 0 } : { name: p, qty: 1, url: "#", price: 0 };
            });
        }
    } catch (e) {
        console.error("Data Parse Error", e);
    }

    const subtotal = parseFloat(order.total);

    container.innerHTML = `
        <div class="invoice-card">
            <h1>Order Summary</h1>
            <div class="order-date">Ordered on ${order.date} | ID: ${order.id}</div>
            
            <div class="info-grid">
                <div>
                    <span class="section-title">Shipping Address</span>
                    <p class="info-text"><strong>${order.customer}</strong></p>
                    <p class="info-text">${order.address}</p>
                    <p class="info-text">Mob: ${order.phone}</p>
                </div>
                <div>
                    <span class="section-title">Payment Mode</span>
                    <p class="info-text"><i class="fas fa-money-bill-transfer"></i> ${order.payment}</p>
                </div>
                <div>
                    <span class="section-title">Order Status</span>
                    <p class="info-text"><i class="fas fa-circle-check" style="color:green"></i> ${order.status}</p>
                </div>
            </div>

            <div class="showcase-header">Product Details</div>
            <div class="items-list">
                ${productItems.map(item => `
                    <div class="product-row">
                        <div class="product-img">
                            <a href="${item.url}" target="_blank">
                                <img src="/IMAGE/1.png" alt="Icon">
                            </a>
                        </div>
                        <div class="product-info">
                            <a href="${item.url}" target="_blank" class="product-name" style="text-decoration:none;">${item.name}</a>
                            <div class="product-meta">Qty: ${item.qty}</div>
                            <a href="${item.url}" target="_blank" class="product-meta" style="margin-top:5px; color:#007185; display:block; text-decoration:none;">View item source <i class="fas fa-external-link-alt" style="font-size:10px;"></i></a>
                        </div>
                        <div class="product-price">₹${item.price > 0 ? (item.price * item.qty).toFixed(2) : (subtotal / order.qty * item.qty).toFixed(2)}</div>
                    </div>
                `).join('')}
            </div>

            <div class="grand-total-box">
                <div class="total-line"><span>Subtotal:</span><span>₹${subtotal.toFixed(2)}</span></div>
                <div class="total-line"><span>Shipping:</span><span>₹0.00</span></div>
                <div class="total-line final-total"><span>Grand Total:</span><span>₹${subtotal.toFixed(2)}</span></div>
            </div>
        </div>
    `;
    
    container.style.display = 'block';
}

function showDecoy() {
    document.getElementById('content-area').style.display = 'none';
    document.getElementById('decoy-view').style.display = 'block';
    hideGate();
}

function hideGate() {
    const gate = document.getElementById('security-gate');
    if (gate) {
        gate.style.opacity = '0';
        setTimeout(() => gate.style.display = 'none', 500);
    }
}
