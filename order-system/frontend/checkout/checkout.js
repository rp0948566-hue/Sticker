const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzCl2byGPvw17w4axjT7iLxrxPlTNPggDFbwMNuVHM7uDW01o1StjdufxQF9qE8p7cNvw/exec";

document.addEventListener('DOMContentLoaded', () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) { window.location.href = "/home"; return; }

    const productName = cart.map(item => `${item.title} (x${item.quantity})`).join(", ");
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const productUrls = cart.map(item => item.url || (window.location.origin + "?product=" + encodeURIComponent(item.title))).join(", ");

    const itemsList = document.getElementById('order-items-list');
    itemsList.innerHTML = cart.map(item => `
        <div class="co-item-row">
            <img src="${item.image || '/IMAGE/1.png'}" alt="${item.title}" onerror="this.src='/IMAGE/1.png'">
            <div class="co-item-info">
                <div class="co-item-title">${item.title}</div>
                <div class="co-item-meta">Qty ${item.quantity} &times; Rs. ${item.price.toFixed(2)}</div>
            </div>
            <div class="co-item-subtotal">Rs. ${(item.price * item.quantity).toFixed(2)}</div>
        </div>
    `).join('');

    document.getElementById('summary-qty-label').textContent = `${totalQty} item${totalQty === 1 ? '' : 's'}`;
    document.getElementById('summary-total').textContent = `Rs. ${totalPrice.toFixed(2)}`;
    document.getElementById('bar-total').textContent = `Rs. ${totalPrice.toFixed(2)}`;

    const form = document.getElementById('checkout-form');
    const messageEl = document.getElementById('message');

    function showMessage(text, type) {
        messageEl.textContent = text;
        messageEl.className = `co-message ${type}`;
    }

    function clearMessage() {
        messageEl.className = 'co-message';
        messageEl.textContent = '';
    }

    function clearFieldErrors() {
        form.querySelectorAll('.co-field.invalid').forEach(g => g.classList.remove('invalid'));
    }

    function validateForm() {
        clearFieldErrors();
        let firstInvalid = null;
        form.querySelectorAll('[required]').forEach(field => {
            if (!field.checkValidity()) {
                field.closest('.co-field')?.classList.add('invalid');
                if (!firstInvalid) firstInvalid = field;
            }
        });
        if (firstInvalid) firstInvalid.focus();
        return !firstInvalid;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submit-btn');
        if (btn.disabled) return;

        if (!validateForm()) {
            showMessage('Please fix the highlighted fields before continuing.', 'error');
            return;
        }
        clearMessage();

        const formData = {
            fullName: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
            pincode: document.getElementById('pincode').value,
            hp_company: document.getElementById('hp-company').value, // Honeypot — must stay empty
            verify_token: "USER_VERIFIED_77", // Matches Backend
            productName: productName,
            cartData: JSON.stringify(cart), // Send full cart with URLs
            storeDomain: window.location.origin,
            totalPrice: totalPrice,
            quantity: totalQty,
            paymentMethod: "Paytm"
        };

        btn.disabled = true;
        btn.classList.add('loading');

        try {
            const resp = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(formData)
            });
            const res = await resp.json();
            if (res.success) {
                localStorage.removeItem('cart');
                document.querySelector('.co-header').style.display = 'none';
                document.querySelector('.co-main').style.display = 'none';
                document.getElementById('checkout-payment-bar').style.display = 'none';
                document.getElementById('success-order-id').textContent = `Order ID: ${res.orderId}`;
                document.getElementById('success-panel').classList.add('visible');
            } else {
                showMessage(res.message || 'Something went wrong. Please try again.', 'error');
                btn.disabled = false;
                btn.classList.remove('loading');
            }
        } catch (err) {
            showMessage('Could not reach the server. Check your connection and try again.', 'error');
            btn.disabled = false;
            btn.classList.remove('loading');
        }
    });
});
