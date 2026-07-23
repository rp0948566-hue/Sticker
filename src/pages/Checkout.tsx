import React, { useState } from 'react';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { useCartStore } from '@/store/cartStore';
import { api } from '@/api/client';

export const Checkout: React.FC = () => {
  const { items, getCartTotal, clearCart } = useCartStore();
  const [formData, setFormData] = useState({
    fullName: '', phone: '', email: '', address: '', city: '', state: '', pincode: '', paymentMethod: 'online', hpCompany: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const totalQty = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
  const totalPrice = getCartTotal();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, name, value } = e.target;
    setFormData(prev => ({ ...prev, [name || id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.hpCompany) return;
    setLoading(true);

    try {
      const data = new FormData();
      data.append('action', 'createOrder');
      data.append('name', formData.fullName);
      data.append('phone', formData.phone);
      data.append('email', formData.email);
      data.append('address', formData.address);
      data.append('city', formData.city);
      data.append('state', formData.state);
      data.append('pincode', formData.pincode);
      data.append('payment', formData.paymentMethod === 'online' ? 'Online' : 'COD');
      data.append('cart', JSON.stringify(items));
      data.append('totalAmt', String(totalPrice));

      const res = await api.submitOrder(data);
      if (res.success) {
        clearCart();
        setSuccess(true);
      } else {
        alert(res.message || 'Order failed');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <Navbar />
        <div id="success-panel" className="co-success-overlay active">
          <div className="co-success-box">
             <i className="fa-regular fa-circle-check co-success-icon"></i>
             <h2>Order Confirmed!</h2>
             <p>Thank you for shopping with us.</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="co-main">
        <div className="co-layout">
          <section className="co-form-section">
            <header className="co-header">
              <a href="/home"><img src="/classic-cult-logo-cropped.png" alt="Classic Cult" className="co-logo" /></a>
              <h1 className="co-title">Secure Checkout</h1>
            </header>

            <form id="checkout-form" onSubmit={handleSubmit} noValidate>
              <div className="co-field-group">
                <h2 className="co-section-label">Contact &amp; Shipping</h2>

                <div className="co-field">
                  <label htmlFor="fullName">Full Name</label>
                  <input type="text" id="fullName" placeholder="John Doe" required value={formData.fullName} onChange={handleInputChange} />
                </div>

                <div className="co-field-row">
                  <div className="co-field">
                    <label htmlFor="phone">Phone Number</label>
                    <input type="tel" id="phone" placeholder="98765 43210" required pattern="[6-9][0-9]{9}" value={formData.phone} onChange={handleInputChange} />
                  </div>
                  <div className="co-field">
                    <label htmlFor="email">Email Address</label>
                    <input type="email" id="email" placeholder="you@example.com" required value={formData.email} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="co-field">
                  <label htmlFor="address">Full Address</label>
                  <textarea id="address" rows={3} placeholder="House no., street, locality" required value={formData.address} onChange={handleInputChange} />
                </div>

                <div className="co-field-row co-field-row-3">
                  <div className="co-field">
                    <label htmlFor="city">City</label>
                    <input type="text" id="city" placeholder="Mumbai" required value={formData.city} onChange={handleInputChange} />
                  </div>
                  <div className="co-field">
                    <label htmlFor="state">State</label>
                    <input type="text" id="state" placeholder="Maharashtra" required value={formData.state} onChange={handleInputChange} />
                  </div>
                  <div className="co-field">
                    <label htmlFor="pincode">Pincode</label>
                    <input type="text" id="pincode" placeholder="400001" required pattern="\d{6}" maxLength={6} value={formData.pincode} onChange={handleInputChange} />
                  </div>
                </div>
              </div>

              <div className="co-field-group">
                <h2 className="co-section-label">Payment Method</h2>
                <label className="co-payment-option" data-method="online">
                  <input type="radio" name="paymentMethod" value="online" checked={formData.paymentMethod === 'online'} onChange={handleInputChange} />
                  <span className="co-payment-radio"></span>
                  <i className="fas fa-shield-halved"></i>
                  <span>Pay Online — Cards, UPI, Netbanking</span>
                </label>
                <label className="co-payment-option" data-method="cod">
                  <input type="radio" name="paymentMethod" value="cod" checked={formData.paymentMethod === 'cod'} onChange={handleInputChange} />
                  <span className="co-payment-radio"></span>
                  <i className="fas fa-wallet"></i>
                  <span>Cash on Delivery</span>
                </label>
              </div>
            </form>
          </section>

          <aside className="co-summary-section">
            <div className="co-summary-card">
              <h2 className="co-summary-title">Order Summary</h2>
              <div id="order-items-list" className="co-items-list">
                {items.map((item: any) => (
                  <div key={item.id} className="co-item-row">
                    <img src={item.image} alt={item.title} />
                    <div className="co-item-info">
                      <div className="co-item-title">{item.title}</div>
                      <div className="co-item-meta">Qty {item.quantity} &times; Rs. {item.price.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="co-summary-totals">
                <div className="co-summary-row"><span id="summary-qty-label">{totalQty} items</span></div>
                <div className="co-summary-row co-summary-row-total"><span>Total</span><span id="summary-total">Rs. {totalPrice.toFixed(2)}</span></div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <div className="co-payment-bar" id="checkout-payment-bar">
        <div className="co-payment-bar-inner">
          <div className="co-payment-bar-total">
            <span className="co-payment-bar-label">Total</span>
            <span className="co-payment-bar-amount" id="bar-total">Rs. {totalPrice.toFixed(2)}</span>
          </div>
          <button type="submit" form="checkout-form" className="co-pay-btn" id="submit-btn" disabled={loading}>
            <span className="co-pay-btn-text">{loading ? 'Processing...' : 'Place Order'}</span>
          </button>
        </div>
      </div>
    </>
  );
};
