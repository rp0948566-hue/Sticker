const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzCl2byGPvw17w4axjT7iLxrxPlTNPggDFbwMNuVHM7uDW01o1StjdufxQF9qE8p7cNvw/exec";

document.addEventListener('DOMContentLoaded', () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) { window.location.href = "/home"; return; }

    const productName = cart.map(item => `${item.title} (x${item.quantity})`).join(", ");
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

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
    const btn = document.getElementById('submit-btn');
    const payBtnText = btn.querySelector('.co-pay-btn-text');

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

    function setLoading(isLoading) {
        btn.disabled = isLoading;
        btn.classList.toggle('loading', isLoading);
    }

    function showSuccess(orderId) {
        localStorage.removeItem('cart');
        document.querySelector('.co-header').style.display = 'none';
        document.querySelector('.co-main').style.display = 'none';
        document.getElementById('checkout-payment-bar').style.display = 'none';
        document.getElementById('success-order-id').textContent = `Order ID: ${orderId}`;
        document.getElementById('success-panel').classList.add('visible');
    }

    function getBaseFormData() {
        // Custom-sticker items carry their uploaded design as a base64 data URL
        // (needed to preview on this page), which is far too large for a Sheets
        // cell — swap it for the filename before sending to the backend.
        const backendCart = cart.map(item => {
            if (item.customDesign) {
                const { customDesign, ...rest } = item;
                return { ...rest, image: item.customFileName ? `Custom design uploaded: ${item.customFileName}` : rest.image };
            }
            return item;
        });

        return {
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
            cartData: JSON.stringify(backendCart),
            storeDomain: window.location.origin,
            totalPrice: totalPrice,
            quantity: totalQty
        };
    }

    async function postToBackend(payload) {
        const resp = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        return resp.json();
    }

    async function submitCOD() {
        const res = await postToBackend({ ...getBaseFormData(), paymentMethod: "Cash on Delivery" });
        if (res.success) {
            showSuccess(res.orderId);
        } else {
            showMessage(res.message || 'Something went wrong. Please try again.', 'error');
            setLoading(false);
        }
    }

    async function submitOnline() {
        const baseData = getBaseFormData();

        // Step 1: ask the backend to create a Razorpay order for this amount
        const orderRes = await postToBackend({ ...baseData, action: 'createRazorpayOrder' });
        if (!orderRes.success) {
            showMessage(orderRes.message || 'Could not start online payment. Try Cash on Delivery instead.', 'error');
            setLoading(false);
            return;
        }

        // Step 2: open Razorpay Checkout for the shopper to pay
        const rzp = new Razorpay({
            key: orderRes.razorpayKeyId,
            amount: orderRes.amount,
            currency: "INR",
            name: "Classic Cult",
            description: productName.substring(0, 80),
            order_id: orderRes.razorpayOrderId,
            prefill: {
                name: baseData.fullName,
                email: baseData.email,
                contact: baseData.phone
            },
            theme: { color: "#0a0a0a" },
            handler: async function (response) {
                // Step 3: hand the payment proof back to the backend for signature
                // verification — only a verified payment gets saved as an order.
                try {
                    const verifyRes = await postToBackend({
                        ...baseData,
                        action: 'verifyRazorpayPayment',
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature
                    });
                    if (verifyRes.success) {
                        showSuccess(verifyRes.orderId);
                    } else {
                        showMessage(verifyRes.message || 'Payment verification failed. Contact support with your payment ID: ' + response.razorpay_payment_id, 'error');
                        setLoading(false);
                    }
                } catch (err) {
                    showMessage('Payment succeeded but we could not confirm your order. Contact support with your payment ID: ' + response.razorpay_payment_id, 'error');
                    setLoading(false);
                }
            },
            modal: {
                ondismiss: function () {
                    setLoading(false);
                }
            }
        });

        rzp.on('payment.failed', function (response) {
            showMessage('Payment failed: ' + (response.error?.description || 'Please try again.'), 'error');
            setLoading(false);
        });

        rzp.open();
    }

    // Keep the pay button label in sync with the chosen payment method
    form.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', () => {
            payBtnText.textContent = radio.value === 'cod' ? 'Place Order' : 'Pay Now';
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (btn.disabled) return;

        if (!validateForm()) {
            showMessage('Please fix the highlighted fields before continuing.', 'error');
            return;
        }
        clearMessage();
        setLoading(true);

        const method = form.querySelector('input[name="paymentMethod"]:checked')?.value || 'online';

        try {
            if (method === 'cod') {
                await submitCOD();
            } else {
                if (typeof Razorpay === 'undefined') {
                    showMessage('Online payment is unavailable right now. Please use Cash on Delivery.', 'error');
                    setLoading(false);
                    return;
                }
                await submitOnline();
            }
        } catch (err) {
            showMessage('Could not reach the server. Check your connection and try again.', 'error');
            setLoading(false);
        }
    });
});
