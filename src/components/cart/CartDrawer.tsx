import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';

export const CartDrawer: React.FC = () => {
  const { items, removeFromCart, updateQuantity, getCartTotal } = useCartStore();
  const navigate = useNavigate();

  const handleCheckout = () => {
    navigate('/order-system/frontend/checkout/index.html');
  };

  const closeCart = () => {
    document.getElementById('cart-drawer')?.classList.remove('open');
  };

  return (
    <div id="cart-drawer" className="cart-drawer">
      <div className="cart-header">
        <h2>Your Cart</h2>
        <button id="cart-close" aria-label="Close cart" onClick={closeCart}>
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div id="cart-items" className="cart-items">
        {items.length === 0 ? (
          <div className="empty-cart-msg">Your cart is empty.</div>
        ) : (
          items.map((item: any) => (
            <div key={item.id} className="cart-item">
              <img src={item.image || '/IMAGE/1.png'} alt={item.title} className="cart-item-img" />
              <div className="cart-item-details">
                <div className="cart-item-title">{item.title}</div>
                <div className="cart-item-price">Rs. {item.price.toFixed(2)}</div>
                <div className="qty-controls">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                </div>
              </div>
              <button className="remove-item-btn" onClick={() => removeFromCart(item.id)}>
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>
          ))
        )}
      </div>

      {items.length > 0 && (
        <div className="cart-footer">
          <div className="cart-subtotal">
            <span>Subtotal:</span>
            <span>Rs. {getCartTotal().toFixed(2)}</span>
          </div>
          <button id="checkout-btn" onClick={handleCheckout}>
            Proceed to Checkout
          </button>
        </div>
      )}
    </div>
  );
};
