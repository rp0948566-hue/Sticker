const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwabQOQHxgkxyLXc4q3-VFHBqUEmHl9w6mPieC6eQvKvN7INyP4BxPF-TOxliYRpvZx/exec";

document.addEventListener('DOMContentLoaded', () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) { window.location.href = "/"; return; }

    const productName = cart.map(item => `${item.title} (x${item.quantity})`).join(", ");
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    document.getElementById('summary-product').textContent = productName.substring(0, 50);
    document.getElementById('summary-qty').textContent = totalQty;
    document.getElementById('summary-total').textContent = `Rs. ${totalPrice.toFixed(2)}`;

    const form = document.getElementById('checkout-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submit-btn');
        if (btn.disabled) return;

        const formData = {
            fullName: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
            pincode: document.getElementById('pincode').value,
            verify_token: "USER_VERIFIED_77", // Matches Backend
            productName: productName,
            productUrl: window.location.origin,
            totalPrice: totalPrice,
            quantity: totalQty
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
                document.getElementById('message').innerHTML = `🎉 Success! Order ID: ${res.orderId}`;
                document.getElementById('message').className = "message success";
                document.getElementById('message').style.display = "block";
                localStorage.removeItem('cart');
                form.reset();
                setTimeout(() => window.location.href = "/", 5000);
            } else {
                alert(res.message);
                btn.disabled = false;
                btn.classList.remove('loading');
            }
        } catch (err) {
            alert("Submission failed. Try again.");
            btn.disabled = false;
            btn.classList.remove('loading');
        }
    });
});
