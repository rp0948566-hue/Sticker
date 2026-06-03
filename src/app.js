import './home.css';
import './loader.css';
import './loader.js';
import { initLazyLoad } from './lazy-load.js';

// Configuration
const CONFIG = {
  CHECKOUT_THRESHOLD: 249.00,
  QUICK_VIEW_DELAY: 0, // Removed artificial delay
  CART_IMAGE_DEFAULT: '/IMAGE/1.png'
};

let cart = JSON.parse(localStorage.getItem('cart') || '[]');
// Add header auth sign-in indicator links
const updateAuthHeader = () => {
  const actions = document.querySelector('.nav-actions-new') || document.querySelector('.nav-right-new');
  if (actions) {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (token && user) {
      actions.innerHTML = `
        <span style="font-size:0.9rem; color:#fff; font-weight:600;">Hi, ${user.name}</span>
        ${user.isAdmin ? `<a href="/admin.html" class="nav-btn-new" style="color:var(--accent); font-weight:700;">Admin</a>` : ''}
        <a id="auth-signout" style="cursor:pointer; font-size:0.9rem; color:#ef4444; font-weight:500;">Sign Out</a>
      `;
      document.getElementById('auth-signout')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('cart');
        window.location.reload();
      });
    }
  }
};
setTimeout(updateAuthHeader, 500);

// DOM Elements
const cartBtn = document.getElementById('cart-btn');
const cartDrawer = document.getElementById('cart-drawer');
const cartOverlay = document.getElementById('cart-overlay');
const cartClose = document.getElementById('cart-close');
const cartInfoBtn = document.getElementById('cart-info-btn');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const mobileMenuDrawer = document.getElementById('mobile-menu');
const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
const qvModal = document.getElementById('quick-view-modal');
const qvOverlay = document.getElementById('quick-view-overlay');
const qvClose = document.getElementById('quick-view-close');

// Cart Functions
function toggleCart(e) {
  if(e) e.stopPropagation();
  const isActive = cartDrawer.classList.toggle('active');
  cartOverlay.classList.toggle('active');
  if (isActive) {
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
  } else {
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
  }
}

function closeCart() {
  if (cartDrawer) cartDrawer.classList.remove('active');
  if (cartOverlay) cartOverlay.classList.remove('active');
  document.body.classList.remove('modal-open');
  document.documentElement.classList.remove('modal-open');
}

function closeQuickView() {
  if (qvModal) qvModal.classList.remove('active');
  if (qvOverlay) qvOverlay.classList.remove('active');
  document.body.classList.remove('modal-open');
  document.documentElement.classList.remove('modal-open');
}

function updateCartUI() {
  const cartItemsContainer = document.querySelector('.cart-items-container');
  const cartEmpty = document.querySelector('.cart-empty');
  const cartFooter = document.querySelector('.cart-footer');
  const cartBadge = document.getElementById('cart-badge');
  const topbarSubtotal = document.getElementById('topbar-subtotal');
  
  if (!cartItemsContainer || !cartBadge) return;

  if (cart.length === 0) {
    if (cartEmpty) cartEmpty.style.display = 'flex';
    if (cartFooter) cartFooter.style.display = 'none';
    cartItemsContainer.innerHTML = '';
    cartBadge.textContent = '0';
    if (topbarSubtotal) topbarSubtotal.textContent = 'Rs. 0.00';
    return;
  }

  if (cartEmpty) cartEmpty.style.display = 'none';
  if (cartFooter) cartFooter.style.display = 'flex';

  let subtotal = 0;
  let totalItems = 0;
  cartItemsContainer.innerHTML = '';

  cart.forEach((item, index) => {
    subtotal += item.price * item.quantity;
    totalItems += item.quantity;

    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item';
    itemEl.innerHTML = `
      <img src="${item.image}" class="cart-item-image" alt="${item.title}">
      <div class="cart-item-details">
        <div class="cart-item-title">${item.title}</div>
        <div class="cart-item-price">Rs. ${item.price.toFixed(2)}</div>
        <div class="cart-item-actions">
          <div class="quantity-controls">
            <button class="qty-btn minus" data-index="${index}">-</button>
            <span class="qty-amount">${item.quantity}</span>
            <button class="qty-btn plus" data-index="${index}">+</button>
          </div>
          <button class="remove-btn" data-index="${index}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;
    cartItemsContainer.appendChild(itemEl);
  });

  cartBadge.textContent = totalItems;
  if (topbarSubtotal) topbarSubtotal.textContent = `Rs. ${subtotal.toFixed(2)}`;
  
  const drawerSubtotal = document.getElementById('topbar-subtotal'); // Reuse if ID is same
  const footerSubtotal = document.getElementById('footer-subtotal');
  if (footerSubtotal) footerSubtotal.textContent = `Rs. ${subtotal.toFixed(2)}`;

  // Threshold logic
  const remaining = Math.max(0, CONFIG.CHECKOUT_THRESHOLD - subtotal);
  const progressPercent = Math.min(100, (subtotal / CONFIG.CHECKOUT_THRESHOLD) * 100);
  
  const unlockText = document.querySelector('.qv-unlock-text');
  const progressBar = document.querySelector('.qv-progress-bar');
  
  if (unlockText) {
    if (remaining > 0) {
      unlockText.innerHTML = `Spend <strong>Rs. ${remaining.toFixed(2)}</strong> more to <strong>UNLOCK CHECKOUT!</strong>`;
    } else {
      unlockText.innerHTML = `<strong>CHECKOUT UNLOCKED!</strong>`;
    }
  }
  if (progressBar) progressBar.style.width = `${progressPercent}%`;
}

// Event Listeners for Cart Actions (API synchronised)
document.addEventListener('click', async (e) => {
  const token = localStorage.getItem('token');

  if (e.target.closest('.qty-btn.plus')) {
    if (!token) return;
    const index = e.target.closest('.qty-btn').dataset.index;
    const item = cart[index];
    
    // Call reserve API for 1 more
    try {
      const res = await fetch('/api/cart/reserve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId: item.productId, quantity: 1 })
      });
      if (res.ok) {
        item.quantity++;
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
        syncCartWithDB();
      } else {
        const data = await res.json();
        alert(data.message || 'Cannot add more units.');
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (e.target.closest('.qty-btn.minus')) {
    if (!token) return;
    const index = e.target.closest('.qty-btn').dataset.index;
    const item = cart[index];

    try {
      // Call release API for whole lock, then re-reserve lower quantity
      await fetch('/api/cart/release', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId: item.productId })
      });

      if (item.quantity > 1) {
        const newQty = item.quantity - 1;
        const res = await fetch('/api/cart/reserve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ productId: item.productId, quantity: newQty })
        });
        if (res.ok) {
          item.quantity = newQty;
        } else {
          cart.splice(index, 1);
        }
      } else {
        cart.splice(index, 1);
      }

      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartUI();
      syncCartWithDB();
    } catch (err) {
      console.error(err);
    }
  }

  if (e.target.closest('.remove-btn')) {
    if (!token) return;
    const index = e.target.closest('.remove-btn').dataset.index;
    const item = cart[index];

    try {
      await fetch('/api/cart/release', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId: item.productId })
      });
      cart.splice(index, 1);
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartUI();
      syncCartWithDB();
    } catch (err) {
      console.error(err);
    }
  }
});

// Helper sync
const syncCartWithDB = () => {
  const token = localStorage.getItem('token');
  if (token) {
    fetch('/api/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity }))
      })
    });
  }
};

// Initialization
if (cartBtn) cartBtn.addEventListener('click', toggleCart);
if (cartInfoBtn) cartInfoBtn.addEventListener('click', toggleCart);
if (cartClose) cartClose.addEventListener('click', closeCart);
if (cartOverlay) cartOverlay.addEventListener('click', closeCart);
if (qvClose) qvClose.addEventListener('click', closeQuickView);
if (qvOverlay) qvOverlay.addEventListener('click', closeQuickView);

// Escape key to close all modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeCart();
    closeQuickView();
  }
});

// Mobile Menu Functions
function toggleMobileMenu(force) {
  if (!mobileMenuDrawer) return;
  
  const isActive = typeof force === 'boolean' ? force : !mobileMenuDrawer.classList.contains('active');
  
  if (isActive) {
    mobileMenuDrawer.classList.add('active');
    if (mobileMenuOverlay) mobileMenuOverlay.classList.add('active');
    document.body.classList.add('menu-open');
  } else {
    mobileMenuDrawer.classList.remove('active');
    if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('active');
    document.body.classList.remove('menu-open');
  }
  
  const icon = document.querySelector('.mobile-menu-btn i');
  if (icon) icon.className = isActive ? 'fas fa-times' : 'fas fa-bars';
}

// Mobile Menu Toggle Logic
document.addEventListener('click', (e) => {
  const menuBtn = e.target.closest('.mobile-menu-btn');
  const overlayClick = e.target === mobileMenuOverlay;
  
  if (menuBtn) {
    toggleMobileMenu();
  } else if (overlayClick) {
    toggleMobileMenu(false);
  }
});

// Global Product Click Handler (Quick View & Add to Cart)
document.addEventListener('click', (e) => {
  const quickViewBtn = e.target.closest('.quick-view');
  if (quickViewBtn) {
    const card = quickViewBtn.closest('.product-card');
    quickViewBtn.classList.add('is-loading');
    
    setTimeout(() => {
      // Mocking Quick View Data Population
      const title = card.querySelector('.product-title').textContent;
      const img = card.querySelector('.placeholder-image img')?.src || CONFIG.CART_IMAGE_DEFAULT;
      
      if (qvModal) {
        qvModal.querySelector('.qv-title').textContent = title;
        qvModal.querySelector('.qv-main-image img').src = img;
        qvModal.classList.add('active');
      }
      if (qvOverlay) qvOverlay.classList.add('active');
      
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
      quickViewBtn.classList.remove('is-loading');
    }, CONFIG.QUICK_VIEW_DELAY);
  }

  const addToCartBtn = e.target.closest('.add-to-cart-btn');
  if (addToCartBtn) {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to reserve items and checkout.');
      window.location.href = '/frontend/Glassmorphism Login Page/index.html';
      return;
    }

    const card = addToCartBtn.closest('.product-card');
    const title = card.querySelector('.product-title').textContent.trim();
    const priceText = card.querySelector('.price-current').textContent.trim();
    const price = parseFloat(priceText.replace('Rs. ', '').trim());
    const image = card.querySelector('.placeholder-image img')?.src || CONFIG.CART_IMAGE_DEFAULT;
    const productId = addToCartBtn.dataset.id;

    if (!productId) {
      alert('Error: Product ID missing.');
      return;
    }

    addToCartBtn.disabled = true;
    addToCartBtn.textContent = 'Locking...';

    fetch('/api/cart/reserve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ productId, quantity: 1 })
    })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ status, data }) => {
      addToCartBtn.disabled = false;
      addToCartBtn.textContent = 'Add to cart';

      if (status !== 201) {
        alert(data.message || 'Failed to place stock reservation.');
        return;
      }

      // Add to local cart representation
      const existingItem = cart.find(item => item.productId === productId);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        cart.push({ productId, title, price, image, quantity: 1 });
      }
      localStorage.setItem('cart', JSON.stringify(cart));

      // Sync Cart DB model
      syncCartWithDB();

      // Update UI and toggle drawer
      updateCartUI();
      toggleCart(true);
    })
    .catch(err => {
      addToCartBtn.disabled = false;
      addToCartBtn.textContent = 'Add to cart';
      console.error(err);
      alert('Communication error.');
    });
  }
});

// Dropdown Toggles
document.querySelectorAll('.filter-pill').forEach(pill => {
  pill.addEventListener('click', (e) => {
    e.stopPropagation();
    const wrapper = pill.closest('.filter-wrapper');
    document.querySelectorAll('.filter-wrapper.active').forEach(w => {
      if (w !== wrapper) w.classList.remove('active');
    });
    wrapper.classList.toggle('active');
  });
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.filter-wrapper')) {
    document.querySelectorAll('.filter-wrapper.active').forEach(w => w.classList.remove('active'));
  }
});

// Register critical static images and font loads with GlobalPreloader
if (window.GlobalPreloader) {
  // 1. Fonts preload promise
  if (document.fonts) {
    window.GlobalPreloader.register(document.fonts.ready, 'fonts-loading');
  }

  // 2. Preload critical images: Hero image & Collection banners (desktop + mobile)
  const criticalImageUrls = [
    '/IMAGE/1.png',
    '/collection-desktop.png',
    '/collection-mobile.jpg'
  ];

  criticalImageUrls.forEach(url => {
    const p = new Promise(resolve => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve();
      img.onerror = () => resolve(); // Always resolve to avoid deadlock
    });
    window.GlobalPreloader.register(p, `static-image-${url.split('/').pop()}`);
  });
}

initLazyLoad();

// Run Cart UI update on load
setTimeout(updateCartUI, 100);

