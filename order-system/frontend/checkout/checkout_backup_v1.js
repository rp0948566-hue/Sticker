/**
 * CHECKOUT INTEGRATION v3.2
 * Fully compatible with Hardened Backend v3.2
 */

// 1. SET YOUR WEB APP URL HERE
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwabQOQHxgkxyLXc4q3-VFHBqUEmHl9w6mPieC6eQvKvN7INyP4BxPF-TOxliYRpvZx/exec";

document.addEventListener('DOMContentLoaded', () => {
    // Get Cart Data
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    if (cart.length === 0) {
        showMessage("Your cart is empty. Redirecting...", "error");
        setTimeout(() => window.location.href = "/", 2000);
        return;
    }

    // Populate Summary
    const productName = cart.map(item => `${item.title} (x${item.quantity})`).join(", ");
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    document.getElementById('summary-product').textContent = productName.length > 50 ? productName.slice(0, 47) + "..." : productName;
    document.getElementById('summary-qty').textContent = totalQty;
    document.getElementById('summary-total').textContent = `Rs. ${totalPrice.toFixed(2)}`;

    // Form Submission
    const form = document.getElementById('checkout-form');
    const submitBtn = document.getElementById('submit-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (submitBtn.disabled) return;
        
        const formData = {
            fullName: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
            pincode: document.getElementById('pincode').value,
            _form_security_check: document.getElementById('_form_security_check').value,
            _sys_v_id: "VALID_USER", // Identifies real human
            productName: productName,
            quantity: totalQty,
            totalPrice: totalPrice,
            paymentMethod: "COD"
        };

        setLoading(true);
        hideMessage();

        try {
            // POST as text/plain to bypass CORS preflight issues with GAS
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                showMessage(`🎉 Success! Order ID: ${result.orderId}`, "success");
                localStorage.removeItem('cart');
                form.reset();
                // Optional: Redirect home after 5 seconds
                setTimeout(() => window.location.href = "/", 5000);
            } else {
                showMessage(`❌ ${result.message}`, "error");
            }

        } catch (error) {
            console.error("Submission Error:", error);
            showMessage("❌ Submission failed. Check connection and try again.", "error");
        } finally {
            setLoading(false);
        }
    });
});

function setLoading(isLoading) {
    const btn = document.getElementById('submit-btn');
    if (isLoading) {
        btn.classList.add('loading');
        btn.disabled = true;
    } else {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

function showMessage(text, type) {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.className = `message ${type}`;
    msg.style.display = 'block';
}

function hideMessage() {
    const msg = document.getElementById('message');
    msg.style.display = 'none';
}
