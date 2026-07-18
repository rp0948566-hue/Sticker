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
  
  // Clean up zoom lens and window states
  const lens = document.querySelector('.qv-zoom-lens');
  const zoomWindow = document.querySelector('.qv-zoom-window');
  if (lens) lens.style.display = 'none';
  if (zoomWindow) zoomWindow.style.display = 'none';
}

function updateQuickViewVisuals(qvModal) {
  const qvMainImageContainer = qvModal.querySelector('.qv-main-image');
  if (!qvMainImageContainer) return;

  // Handle visual frame toggle in preview
  const activeFrame = qvModal.querySelector('#qv-frame-group .qv-option-pill.active')?.textContent.trim() || 'Without Frame';
  if (activeFrame === 'With Frame') {
    qvMainImageContainer.classList.add('has-frame');
  } else {
    qvMainImageContainer.classList.remove('has-frame');
  }

  // Handle visual size scaling in preview
  const activeSize = qvModal.querySelector('#qv-size-group .qv-option-pill.active')?.textContent.trim() || '3" x 3"';
  if (activeSize === '3" x 3"') {
    qvMainImageContainer.style.transform = 'scale(0.75)';
  } else if (activeSize === '4" x 4"') {
    qvMainImageContainer.style.transform = 'scale(0.88)';
  } else if (activeSize === '5" x 5"') {
    qvMainImageContainer.style.transform = 'scale(1.0)';
  }
}

function injectQuickViewOptions(qvModal, showOptions = true) {
  const addSection = qvModal.querySelector('.qv-add-section');
  if (!addSection) return;

  // Dynamically inject glass overlay if missing
  const qvMainImageContainer = qvModal.querySelector('.qv-main-image');
  if (qvMainImageContainer) {
    let glass = qvMainImageContainer.querySelector('.qv-frame-glass');
    if (!glass) {
      glass = document.createElement('div');
      glass.className = 'qv-frame-glass';
      qvMainImageContainer.appendChild(glass);
    }
  }

  let optionsContainer = qvModal.querySelector('.qv-options');
  if (!optionsContainer) {
    optionsContainer = document.createElement('div');
    optionsContainer.className = 'qv-options';
    optionsContainer.innerHTML = `
      <div class="qv-option-group">
        <span class="qv-option-label">Size</span>
        <div class="qv-option-pills" id="qv-size-group">
          <div class="qv-option-pill active" data-add="0">3" x 3"</div>
          <div class="qv-option-pill" data-add="20">4" x 4"</div>
          <div class="qv-option-pill" data-add="40">5" x 5"</div>
        </div>
      </div>
      <div class="qv-option-group">
        <span class="qv-option-label">Frame</span>
        <div class="qv-option-pills" id="qv-frame-group">
          <div class="qv-option-pill active" data-add="0">Without Frame</div>
          <div class="qv-option-pill" data-add="120">With Frame</div>
        </div>
      </div>
    `;
    addSection.parentNode.insertBefore(optionsContainer, addSection);

    // Wire up listeners for newly created pills
    optionsContainer.querySelectorAll('.qv-option-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const group = pill.parentNode;
        group.querySelectorAll('.qv-option-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        
        updateQuickViewVisuals(qvModal);
        updateQuickViewPrice(qvModal);
      });
    });
  } else {
    // Reset selections to first pill (active) for both groups
    optionsContainer.querySelectorAll('.qv-option-pills').forEach(group => {
      group.querySelectorAll('.qv-option-pill').forEach((p, idx) => {
        if (idx === 0) p.classList.add('active');
        else p.classList.remove('active');
      });
    });
  }

  // Skins (Macbook/Card) aren't sold in 3"/4"/5" sticker sizes or with a
  // frame — hide the pills entirely instead of showing options that don't
  // apply to the product being viewed.
  optionsContainer.style.display = showOptions ? '' : 'none';

  // Ensure visuals match the selected options on load/reset
  updateQuickViewVisuals(qvModal);
}

function updateQuickViewPrice(qvModal) {
  const basePrice = parseFloat(qvModal.dataset.basePrice) || 0;
  const activeSize = qvModal.querySelector('#qv-size-group .qv-option-pill.active');
  const activeFrame = qvModal.querySelector('#qv-frame-group .qv-option-pill.active');

  const sizeAdd = parseFloat(activeSize?.dataset.add) || 0;
  const frameAdd = parseFloat(activeFrame?.dataset.add) || 0;

  const total = basePrice + sizeAdd + frameAdd;
  const priceDisplay = qvModal.querySelector('.qv-price-current');
  if (priceDisplay) {
    priceDisplay.textContent = `Rs. ${total.toFixed(2)}`;
  }
}

function updateCartUI() {
  try {
    localStorage.setItem('cart', JSON.stringify(cart));
  } catch (err) {
    // Custom-sticker uploads carry base64 image data — if storage is full,
    // drop the just-added item with a clear message rather than silently
    // corrupting the whole cart.
    alert('Your uploaded design is too large to add to the cart. Please upload a smaller image file.');
    cart.pop();
    localStorage.setItem('cart', JSON.stringify(cart));
  }
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
const continueShoppingBtn = document.getElementById('continue-shopping');
if (continueShoppingBtn) continueShoppingBtn.addEventListener('click', closeCart);
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
        // .qv-main-image has two <img> tags (visible photo + zoom source) —
        // update both, or the second silently keeps whatever product's
        // image was shown last time Quick View was opened.
        qvModal.querySelectorAll('.qv-main-image img').forEach(mainImg => { mainImg.src = img; });
        qvModal.querySelectorAll('.qv-thumb img').forEach(thumb => { thumb.src = img; });

        const qvCurrent = qvModal.querySelector('.qv-price-current');
        const qvOld = qvModal.querySelector('.qv-price-old');
        const qvSave = qvModal.querySelector('.qv-save-badge');

        if (qvCurrent) qvCurrent.textContent = currentPrice;
        if (qvOld) qvOld.textContent = oldPrice;
        if (qvSave) qvSave.textContent = saveBadge;

        // Parse and store base price + category code, then inject size and frame options
        const basePrice = parseFloat(currentPrice.replace('Rs. ', '').trim()) || 0;
        qvModal.dataset.basePrice = basePrice;
        qvModal.dataset.cc = card.dataset.cc || '';
        qvModal.dataset.ref = card.dataset.ref || '';
        qvModal.dataset.sku = card.dataset.sku || '';

        // Description copy is generic "glitter sticker" text baked into the
        // modal HTML — wrong for skins, which aren't stickers at all.
        const qvHeading = qvModal.querySelector('#qv-desc-heading');
        const qvBody = qvModal.querySelector('#qv-desc-body');
        const qvDims = qvModal.querySelector('#qv-desc-dims');
        const pc = card.dataset.pagecode;
        if (pc === 'M') {
          if (qvHeading) qvHeading.textContent = 'CLASSIC CULT Premium Card:';
          if (qvBody) qvBody.textContent = 'Protect and personalize your device with our premium card, printed on durable vinyl with a smooth matte finish that resists scratches and fading. Easy to apply, bubble-free, and residue-free on removal.';
          if (qvDims) qvDims.style.display = 'none';
        } else {
          if (qvHeading) qvHeading.textContent = 'CLASSIC CULT Premium Glitter Stickers:';
          if (qvBody) qvBody.textContent = "Add instant sparkle to your everyday essentials with our premium glitter stickers, designed with high-quality glitter material and a smooth protective finish that shines beautifully from every angle. Perfect for adding bold personality and shimmer to any surface.";
          if (qvDims) qvDims.style.display = '';
        }

        injectQuickViewOptions(qvModal);
        updateQuickViewPrice(qvModal);

        // Reset the quantity input to 1
        const qvQtyInput = qvModal.querySelector('#qv-qty-input');
        if (qvQtyInput) qvQtyInput.value = 1;

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
    const baseTitle = card.querySelector('.product-title').textContent.trim();
    const priceText = card.querySelector('.price-current').textContent.trim();
    const price = parseFloat(priceText.replace('Rs. ', '').trim());
    const cartImgEl = card.querySelector('.placeholder-image img') || card.querySelector('img.placeholder-image') || card.querySelector('.product-image-container img') || card.querySelector('img');
    const image = cartImgEl?.src || CONFIG.CART_IMAGE_DEFAULT;

    const sizePill = card.querySelector('[data-group="size"].active');
    const framePill = card.querySelector('[data-group="frame"].active');
    const title = sizePill
      ? `${baseTitle} (${sizePill.textContent.trim()}, ${framePill?.textContent.trim() === 'With' ? 'With Frame' : 'Without Frame'})`
      : baseTitle;
    const sku = `${card.dataset.sku || baseTitle}::${sizePill?.textContent.trim() || ''}::${framePill?.textContent.trim() || ''}`;

    const productUrl = window.location.origin + window.location.pathname + '?product=' + encodeURIComponent(baseTitle);

    const existingItem = cart.find(item => item.sku === sku);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ title, price, image, quantity: 1, url: productUrl, categoryCode: card.dataset.cc || '', sku, ref: card.dataset.ref || '' });
    }
    updateCartUI();
  }
});

// Dropdown Toggles
// Backdrop: transparent overlay that sits above product cards (z-index 9998)
// but below the dropdown (9999). Captures outside taps on mobile — fixes the
// iOS issue where 'click' doesn't bubble from non-interactive elements.
const filterBackdrop = document.createElement('div');
filterBackdrop.className = 'filter-backdrop';
document.body.appendChild(filterBackdrop);

function closeAllFilterDropdowns() {
  document.querySelectorAll('.filter-wrapper.active').forEach(w => w.classList.remove('active'));
  filterBackdrop.classList.remove('active');
}

document.querySelectorAll('.filter-pill').forEach(pill => {
  pill.addEventListener('click', (e) => {
    e.stopPropagation();
    const wrapper = pill.closest('.filter-wrapper');
    document.querySelectorAll('.filter-wrapper.active').forEach(w => {
      if (w !== wrapper) w.classList.remove('active');
    });
    wrapper.classList.toggle('active');
    // Show backdrop whenever any dropdown is open
    filterBackdrop.classList.toggle(
      'active',
      document.querySelectorAll('.filter-wrapper.active').length > 0
    );
  });
});

// Backdrop tap (click + touchstart) closes all dropdowns
filterBackdrop.addEventListener('click', closeAllFilterDropdowns);
filterBackdrop.addEventListener('touchstart', closeAllFilterDropdowns, { passive: true });

// Desktop: close on click outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.filter-wrapper')) {
    closeAllFilterDropdowns();
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

// Quick View Zoom Effect (Amazon Style)
function initQuickViewZoom() {
  const qvMainImageContainer = document.querySelector('.qv-main-image');
  const qvContent = document.querySelector('.quick-view-content');
  
  if (qvMainImageContainer && qvContent) {
    // 1. Create or select the lens
    let lens = qvMainImageContainer.querySelector('.qv-zoom-lens');
    if (!lens) {
      lens = document.createElement('div');
      lens.className = 'qv-zoom-lens';
      qvMainImageContainer.appendChild(lens);
    }
    
    // 2. Create or select the zoom window
    let zoomWindow = qvContent.querySelector('.qv-zoom-window');
    if (!zoomWindow) {
      zoomWindow = document.createElement('div');
      zoomWindow.className = 'qv-zoom-window';
      
      const zoomImg = document.createElement('img');
      zoomImg.className = 'qv-zoom-image';
      zoomWindow.appendChild(zoomImg);
      
      qvContent.appendChild(zoomWindow);
    }
    
    const qvImg = qvMainImageContainer.querySelector('img');
    const zoomImg = zoomWindow.querySelector('.qv-zoom-image');
    const zoomFactor = 2.5;
    
    // Set up hover/mousemove events
    qvMainImageContainer.addEventListener('mouseenter', () => {
      // Only show zoom on desktop
      if (window.innerWidth > 768) {
        lens.style.display = 'block';
        zoomWindow.style.display = 'block';
        if (qvImg && zoomImg) {
          zoomImg.src = qvImg.src;
        }
      }
    });
    
    qvMainImageContainer.addEventListener('mousemove', (e) => {
      if (window.innerWidth <= 768) return;
      
      const rect = qvMainImageContainer.getBoundingClientRect();
      
      // Calculate lens size proportionally
      const lensWidth = rect.width / zoomFactor;
      const lensHeight = rect.height / zoomFactor;
      
      lens.style.width = lensWidth + 'px';
      lens.style.height = lensHeight + 'px';
      
      // Calculate mouse position relative to container
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Center the lens on the cursor
      let left = x - lensWidth / 2;
      let top = y - lensHeight / 2;
      
      // Constrain lens inside container boundaries
      left = Math.max(0, Math.min(left, rect.width - lensWidth));
      top = Math.max(0, Math.min(top, rect.height - lensHeight));
      
      // Position the lens
      lens.style.left = left + 'px';
      lens.style.top = top + 'px';
      
      // Position and size the zoomed image inside the zoom window
      if (zoomImg) {
        zoomImg.style.width = (rect.width * zoomFactor) + 'px';
        zoomImg.style.height = (rect.height * zoomFactor) + 'px';
        zoomImg.style.left = (-left * zoomFactor) + 'px';
        zoomImg.style.top = (-top * zoomFactor) + 'px';
      }
    });
    
    qvMainImageContainer.addEventListener('mouseleave', () => {
      lens.style.display = 'none';
      zoomWindow.style.display = 'none';
    });
  }
}

// Quick View Quantity and Add to Cart action wiring
function initQuickViewActions() {
  const qtyInput = document.getElementById('qv-qty-input');
  const qtyUpBtn = document.querySelector('.qv-qty-up');
  const qtyDownBtn = document.querySelector('.qv-qty-down');
  const qvAddToCartBtn = document.getElementById('qv-add-btn');

  if (qtyUpBtn && qtyInput) {
    qtyUpBtn.addEventListener('click', () => {
      let val = parseInt(qtyInput.value) || 1;
      qtyInput.value = val + 1;
    });
  }

  if (qtyDownBtn && qtyInput) {
    qtyDownBtn.addEventListener('click', () => {
      let val = parseInt(qtyInput.value) || 1;
      if (val > 1) {
        qtyInput.value = val - 1;
      }
    });
  }

  if (qtyInput) {
    qtyInput.addEventListener('change', () => {
      let val = parseInt(qtyInput.value) || 1;
      if (val < 1) {
        qtyInput.value = 1;
      }
    });
  }

  if (qvAddToCartBtn) {
    qvAddToCartBtn.addEventListener('click', () => {
      if (!qvModal) return;
      const baseTitle = qvModal.querySelector('.qv-title').textContent.trim();
      
      // Get selected option values
      const activeSize = qvModal.querySelector('#qv-size-group .qv-option-pill.active')?.textContent.trim() || '3" x 3"';
      const activeFrame = qvModal.querySelector('#qv-frame-group .qv-option-pill.active')?.textContent.trim() || 'Without Frame';
      
      // Construct formatted title
      const title = `${baseTitle} (${activeSize}, ${activeFrame})`;
      
      const priceText = qvModal.querySelector('.qv-price-current').textContent.trim();
      const price = parseFloat(priceText.replace('Rs. ', '').trim()) || 0;
      const img = qvModal.querySelector('.qv-main-image img')?.src || CONFIG.CART_IMAGE_DEFAULT;
      const qty = parseInt(qtyInput?.value) || 1;
      const productUrl = window.location.origin + window.location.pathname + '?product=' + encodeURIComponent(baseTitle);
      const sku = `${qvModal.dataset.sku || baseTitle}::${activeSize}::${activeFrame}`;

      const existingItem = cart.find(item => item.sku === sku);
      if (existingItem) {
        existingItem.quantity += qty;
      } else {
        cart.push({ title, price, image: img, quantity: qty, url: productUrl, categoryCode: qvModal.dataset.cc || '', sku, ref: qvModal.dataset.ref || '' });
      }

      updateCartUI();
      closeQuickView();

      // Open cart drawer for feedback
      if (cartDrawer && cartOverlay) {
        cartDrawer.classList.add('active');
        cartOverlay.classList.add('active');
        document.body.classList.add('modal-open');
        document.documentElement.classList.add('modal-open');
      }
    });
  }
}

initProductGrid();
initLazyLoad();
updateCartUI();
handleDeepLink();
initSearch();
initQuickViewZoom();
initQuickViewActions();

// Card inline size + frame pill selection
(function () {
  const grid = document.querySelector('.products-grid');
  if (!grid) return;
  grid.addEventListener('click', (e) => {
    const pill = e.target.closest('.card-pill');
    if (!pill) return;
    e.stopPropagation();
    const card = pill.closest('.product-card');
    const group = pill.dataset.group;
    card.querySelectorAll(`.card-pill[data-group="${group}"]`).forEach(p => p.classList.remove('active'));
    pill.classList.add('active');

    if (group === 'frame') {
      const imgContainer = card.querySelector('.placeholder-image');
      if (imgContainer) {
        if (pill.dataset.val === 'with') {
          imgContainer.classList.add('frame-on');
        } else {
          imgContainer.classList.remove('frame-on');
        }
      }
    } // Add visual frame logic
    
    // Update card price based on size
    if (group === 'size') {
      const priceDisplay = card.querySelector('.price-current');
      const oldPriceDisplay = card.querySelector('.price-old');
      const badgeDisplay = card.querySelector('.price-badge');
      
      let newPrice = '15.00';
      let oldPrice = '79.00';
      let discount = '64.00';
      
      if (pill.dataset.val.includes('3')) {
        newPrice = '15.00'; oldPrice = '79.00'; discount = '64.00';
      } else if (pill.dataset.val.includes('4')) {
        newPrice = '29.00'; oldPrice = '89.00'; discount = '60.00';
      } else if (pill.dataset.val.includes('5')) {
        newPrice = '39.00'; oldPrice = '99.00'; discount = '60.00';
      }
      
      if (priceDisplay) priceDisplay.textContent = 'Rs. ' + newPrice;
      if (oldPriceDisplay) oldPriceDisplay.textContent = 'Rs. ' + oldPrice;
      if (badgeDisplay) badgeDisplay.textContent = '-Rs. ' + discount;
    }
  });
})();

// Close FRAME dropdown smoothly when user scrolls
(function () {
  const dropdownItem = document.querySelector('.nav-links li.has-dropdown');
  if (!dropdownItem) return;
  let scrollTimer;
  window.addEventListener('scroll', () => {
    dropdownItem.classList.add('force-closed');
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      dropdownItem.classList.remove('force-closed');
    }, 1200);
  }, { passive: true });
  dropdownItem.addEventListener('mouseenter', () => {
    dropdownItem.classList.remove('force-closed');
  });
})();

// Mobile FRAME submenu accordion
(function () {
  const caret   = document.querySelector('.mobile-frame-caret');
  const submenu = document.querySelector('.mobile-frame-submenu');
  if (!caret || !submenu) return;

  caret.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isOpen = submenu.classList.toggle('open');
    caret.classList.toggle('open', isOpen);
  });

  // Close submenu when any category link is tapped
  submenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      submenu.classList.remove('open');
      caret.classList.remove('open');
    });
  });
})();

// Home page product carousel — prev/next arrow scrolling
(function () {
  const carousel = document.getElementById('products-carousel');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  if (!carousel || !prevBtn || !nextBtn) return;

  let isAnimating = false;

  function smoothScrollTo(target, direction) {
    if (isAnimating) return;
    isAnimating = true;

    const start = carousel.scrollLeft;
    const change = target - start;
    const startTime = performance.now();
    const duration = 750;
    carousel.classList.add(direction === 'next' ? 'sliding-next' : 'sliding-prev');

    function animateScroll(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 5);
      carousel.scrollLeft = start + change * ease;

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      } else {
        setTimeout(() => {
          carousel.classList.remove('sliding-next', 'sliding-prev');
          isAnimating = false;
        }, 150);
      }
    }
    requestAnimationFrame(animateScroll);
  }

  function scrollAmount() {
    const isMobile = window.innerWidth <= 768;
    const gap = isMobile ? 12 : 30;
    const cardWidth = isMobile ? (carousel.clientWidth - 12) / 2 : 340;
    const cardScale = cardWidth + gap;
    const visibleCards = Math.max(1, Math.floor(carousel.clientWidth / cardScale));
    return visibleCards * cardScale;
  }

  prevBtn.addEventListener('click', () => {
    const target = Math.max(0, carousel.scrollLeft - scrollAmount());
    smoothScrollTo(target, 'prev');
  });

  nextBtn.addEventListener('click', () => {
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    const target = Math.min(maxScroll, carousel.scrollLeft + scrollAmount());
    smoothScrollTo(target, 'next');
  });

  carousel.addEventListener('scroll', () => {
    prevBtn.classList.toggle('is-dash', carousel.scrollLeft <= 5);
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    nextBtn.classList.toggle('is-dash', carousel.scrollLeft >= maxScroll - 5);
  });
  prevBtn.classList.add('is-dash');
})();

// Highlight the current page in the nav bar (based on actual path, not a hardcoded guess)
(function () {
  const normalize = (p) => decodeURIComponent(p || '').replace(/\/index\.html$/i, '').replace(/\/$/, '').toLowerCase() || '/';
  const currentPath = normalize(window.location.pathname);
  const isHome = currentPath === '/home' || currentPath === '/' || currentPath === '/home.html';

  document.querySelectorAll('.nav-links > li > a').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href === '#') return;
    const hrefPath = normalize(href);
    const matches = isHome ? hrefPath === '/home' : hrefPath === currentPath;
    a.classList.toggle('active-link', matches);
  });

  // POSTER dropdown: highlight the parent link if the current page is one of its submenu items
  const dropdownParent = document.querySelector('li.has-dropdown');
  if (dropdownParent && !isHome) {
    const subLinks = dropdownParent.querySelectorAll('.frame-categories-dropdown a, .mobile-frame-submenu a');
    const isInDropdown = Array.from(subLinks).some(a => normalize(a.getAttribute('href')) === currentPath);
    const parentLink = dropdownParent.querySelector(':scope > a');
    if (isInDropdown && parentLink) {
      parentLink.classList.add('active-link');
      dropdownParent.classList.add('active-parent');
    }
  }
})();

// Highlight the current page in the nav bar (based on actual path, not a hardcoded guess)
(function () {
  const normalize = (p) => decodeURIComponent(p || '').replace(/\/index\.html$/i, '').replace(/\/$/, '').toLowerCase() || '/';
  const currentPath = normalize(window.location.pathname);
  const isHome = currentPath === '/home' || currentPath === '/' || currentPath === '/home.html';

  document.querySelectorAll('.nav-links > li > a').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href === '#') return;
    const hrefPath = normalize(href);
    const matches = isHome ? hrefPath === '/home' : hrefPath === currentPath;
    a.classList.toggle('active-link', matches);
  });

  // POSTER dropdown: highlight the parent link if the current page is one of its submenu items
  const dropdownParent = document.querySelector('li.has-dropdown');
  if (dropdownParent && !isHome) {
    const subLinks = dropdownParent.querySelectorAll('.frame-categories-dropdown a, .mobile-frame-submenu a');
    const isInDropdown = Array.from(subLinks).some(a => normalize(a.getAttribute('href')) === currentPath);
    const parentLink = dropdownParent.querySelector(':scope > a');
    if (isInDropdown && parentLink) {
      parentLink.classList.add('active-link');
      dropdownParent.classList.add('active-parent');
    }
  }
})();
