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

    function currentMethodLabel() {
        return (form.querySelector('input[name="paymentMethod"]:checked')?.value === 'cod') ? 'Place Order' : 'Pay Now';
    }

    // During submission the button text doubles as a status line — humans
    // click buttons repeatedly, so every disabled state needs to say why.
    function setLoading(isLoading, statusText) {
        btn.disabled = isLoading;
        btn.classList.toggle('loading', isLoading);
        payBtnText.textContent = isLoading ? (statusText || 'Processing...') : currentMethodLabel();
    }

    function setStatus(text) {
        payBtnText.textContent = text;
    }

    function showSuccess(orderId, invoiceNo) {
        localStorage.removeItem('cart');
        document.querySelector('.co-header').style.display = 'none';
        document.querySelector('.co-main').style.display = 'none';
        document.getElementById('checkout-payment-bar').style.display = 'none';
        document.getElementById('success-order-id').textContent = invoiceNo ? `Order ID: ${orderId} · Invoice: ${invoiceNo}` : `Order ID: ${orderId}`;
        document.getElementById('success-panel').classList.add('visible');
    }

    // Fetch with a timeout — a hung request should fail fast with a clear
    // message instead of leaving the button stuck on "Processing..." forever.
    function fetchWithTimeout(promise, ms = 20000) {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms))
        ]);
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

    async function postToBackend(payload, timeoutMs) {
        try {
            const resp = await fetchWithTimeout(fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            }), timeoutMs);
            return await resp.json();
        } catch (err) {
            if (err.message === 'TIMEOUT') throw new Error('TIMEOUT');
            throw new Error('NETWORK');
        }
    }

    function describeConnectionError(err, fallback) {
        if (err.message === 'TIMEOUT') return "This is taking longer than expected. Please check your connection and try again.";
        if (err.message === 'NETWORK') return "Network error — could not reach the server. Check your connection and try again.";
        return fallback;
    }

    async function submitCOD() {
        setLoading(true, 'Saving Order...');
        try {
            const res = await postToBackend({ ...getBaseFormData(), paymentMethod: "Cash on Delivery" });
            if (res.success) {
                showSuccess(res.orderId, res.invoiceNo);
            } else {
                showMessage(res.message || 'Something went wrong. Please try again.', 'error');
                setLoading(false);
            }
        } catch (err) {
            showMessage(describeConnectionError(err, 'Something went wrong. Please try again.'), 'error');
            setLoading(false);
        }
    }

    async function submitOnline() {
        const baseData = getBaseFormData();

        // Step 1: ask the backend to create a Razorpay order for this amount
        setLoading(true, 'Creating Secure Payment...');
        let orderRes;
        try {
            orderRes = await postToBackend({ ...baseData, action: 'createRazorpayOrder' });
        } catch (err) {
            showMessage(describeConnectionError(err, 'Could not start online payment. Try Cash on Delivery instead.'), 'error');
            setLoading(false);
            return;
        }
        if (!orderRes.success) {
            showMessage(orderRes.message || 'Could not start online payment. Try Cash on Delivery instead.', 'error');
            setLoading(false);
            return;
        }

        // Step 2: open Razorpay Checkout for the shopper to pay
        setStatus('Opening Razorpay...');

        // Guards against the success handler firing more than once for the
        // same payment (e.g. a stray duplicate event) — only the first call
        // through should ever hit the backend for this attempt.
        let handlerFired = false;

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
                if (handlerFired) return;
                handlerFired = true;

                // Step 3: hand the payment proof back to the backend for signature
                // verification — only a verified payment gets saved as an order.
                setLoading(true, 'Verifying Payment...');
                try {
                    const verifyRes = await postToBackend({
                        ...baseData,
                        action: 'verifyRazorpayPayment',
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature
                    }, 30000);
                    if (verifyRes.success) {
                        setStatus('Saving Order...');
                        showSuccess(verifyRes.orderId, verifyRes.invoiceNo);
                    } else {
                        showMessage(verifyRes.message || 'Payment verification failed. Contact support with your payment ID: ' + response.razorpay_payment_id, 'error');
                        setLoading(false);
                    }
                } catch (err) {
                    // The payment itself already succeeded on Razorpay's side at this
                    // point — a network hiccup here must never be shown as "failed".
                    showMessage('Payment received! We could not confirm it instantly — contact support with your payment ID if you don\'t get a confirmation shortly: ' + response.razorpay_payment_id, 'success');
                    setLoading(false);
                }
            },
            modal: {
                ondismiss: function () {
                    if (handlerFired) return;
                    showMessage('Payment cancelled — your card was not charged.', 'error');
                    setLoading(false);
                }
            }
        });

        rzp.on('payment.failed', function (response) {
            if (handlerFired) return;
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
