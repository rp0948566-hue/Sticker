import './home.css';
import './loader.css';
import './loader.js';
import { initLazyLoad } from './lazy-load.js';
import { initProductGrid } from './catalogue.js';
import { initSearch } from './search.js';

// Always start every page at the top
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

// Configuration
const CONFIG = {
  CHECKOUT_THRESHOLD: 249.00,
  QUICK_VIEW_DELAY: 0,
  CART_IMAGE_DEFAULT: '/IMAGE/1.png'
};

let cart = JSON.parse(localStorage.getItem('cart') || '[]');

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
  localStorage.setItem('cart', JSON.stringify(cart));
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

// Event Listeners for Cart Actions
document.addEventListener('click', (e) => {
  if (e.target.closest('.qty-btn.plus')) {
    const index = e.target.closest('.qty-btn').dataset.index;
    cart[index].quantity++;
    updateCartUI();
  }
  if (e.target.closest('.qty-btn.minus')) {
    const index = e.target.closest('.qty-btn').dataset.index;
    if (cart[index].quantity > 1) {
      cart[index].quantity--;
    } else {
      cart.splice(index, 1);
    }
    updateCartUI();
  }
  if (e.target.closest('.remove-btn')) {
    const index = e.target.closest('.remove-btn').dataset.index;
    cart.splice(index, 1);
    updateCartUI();
  }
});

// Initialization
if (cartBtn) cartBtn.addEventListener('click', toggleCart);
if (cartInfoBtn) cartInfoBtn.addEventListener('click', toggleCart);
if (cartClose) cartClose.addEventListener('click', closeCart);
if (cartOverlay) cartOverlay.addEventListener('click', closeCart);
if (qvClose) qvClose.addEventListener('click', closeQuickView);
if (qvOverlay) qvOverlay.addEventListener('click', closeQuickView);
if (qvModal) {
  qvModal.addEventListener('click', (e) => {
    if (e.target === qvModal) {
      closeQuickView();
    }
  });
}

// Handle Checkout Button
const checkoutBtn = document.getElementById('checkout-btn');
if (checkoutBtn) {
  checkoutBtn.addEventListener('click', () => {
    if (cart.length > 0) {
      localStorage.setItem('cart', JSON.stringify(cart));
      window.location.href = '/order-system/frontend/checkout/index.html';
    } else {
      alert('Your cart is empty!');
    }
  });
}

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
      const title = card.querySelector('.product-title').textContent;
      const currentPrice = card.querySelector('.price-current').textContent;
      const oldPrice = card.querySelector('.price-old')?.textContent || "";
      const saveBadge = card.querySelector('.save-badge')?.textContent || "";
      const imgEl = card.querySelector('.placeholder-image img') || card.querySelector('img.placeholder-image') || card.querySelector('.product-image-container img') || card.querySelector('img');
      const img = imgEl?.src || CONFIG.CART_IMAGE_DEFAULT;
      
      if (qvModal) {
        qvModal.querySelector('.qv-title').textContent = title;
        qvModal.querySelector('.qv-main-image img').src = img;
        qvModal.querySelectorAll('.qv-thumb img').forEach(thumb => { thumb.src = img; });
        
        const qvCurrent = qvModal.querySelector('.qv-price-current');
        const qvOld = qvModal.querySelector('.qv-price-old');
        const qvSave = qvModal.querySelector('.qv-save-badge');
        
        if (qvCurrent) qvCurrent.textContent = currentPrice;
        if (qvOld) qvOld.textContent = oldPrice;
        if (qvSave) qvSave.textContent = saveBadge;

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
    const card = addToCartBtn.closest('.product-card');
    const title = card.querySelector('.product-title').textContent.trim();
    const priceText = card.querySelector('.price-current').textContent.trim();
    const price = parseFloat(priceText.replace('Rs. ', '').trim());
    const cartImgEl = card.querySelector('.placeholder-image img') || card.querySelector('img.placeholder-image') || card.querySelector('.product-image-container img') || card.querySelector('img');
    const image = cartImgEl?.src || CONFIG.CART_IMAGE_DEFAULT;
    const productUrl = window.location.origin + window.location.pathname + '?product=' + encodeURIComponent(title);

    const existingItem = cart.find(item => item.title === title);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ title, price, image, quantity: 1, url: productUrl });
    }
    updateCartUI();
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

// Deep Linking: Auto-open Quick View from URL parameter
function handleDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const productTitle = params.get('product');
  if (productTitle) {
    setTimeout(() => {
      const cards = document.querySelectorAll('.product-card');
      const targetCard = Array.from(cards).find(card => 
        card.querySelector('.product-title')?.textContent.trim() === productTitle
      );
      if (targetCard) {
        const qvBtn = targetCard.querySelector('.quick-view');
        if (qvBtn) qvBtn.click();
      }
    }, 500);
  }
}

initProductGrid();
initLazyLoad();
updateCartUI();
handleDeepLink();
initSearch();
