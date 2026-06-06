import '../../src/loader.css';
import '../../src/loader.js';
import './home.css';
import { initLazyLoad } from './lazy-load.js';

const cartBtn = document.getElementById('cart-btn');
const cartDrawer = document.getElementById('cart-drawer');
const cartOverlay = document.getElementById('cart-overlay');
const cartClose = document.getElementById('cart-close');

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
  cartDrawer.classList.remove('active');
  cartOverlay.classList.remove('active');
  document.body.classList.remove('modal-open');
  document.documentElement.classList.remove('modal-open');
}

// Close cart when clicking overlay
if (cartOverlay && cartDrawer) {
  cartOverlay.addEventListener('click', () => {
    cartDrawer.classList.remove('active');
    cartOverlay.classList.remove('active');
  });
}

// Mobile Menu Toggle
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const mobileMenuDrawer = document.getElementById('mobile-menu');
if (mobileMenuBtn && mobileMenuDrawer) {
  mobileMenuBtn.addEventListener('click', () => {
    const isActive = mobileMenuDrawer.classList.toggle('active');
    document.body.classList.toggle('menu-open', isActive);

    // Toggle icon between Hamburger and X using FontAwesome classes
    const icon = mobileMenuBtn.querySelector('i');
    if (icon) {
      if (isActive) {
        icon.className = 'fas fa-times';
      } else {
        icon.className = 'fas fa-bars';
      }
    }
  });
}

const cartInfoBtn = document.getElementById('cart-info-btn');
if (cartBtn) cartBtn.addEventListener('click', toggleCart);
if (cartInfoBtn) cartInfoBtn.addEventListener('click', toggleCart);
if (cartClose) cartClose.addEventListener('click', closeCart);
if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

// Handle Checkout Button
const checkoutBtn = document.getElementById('checkout-btn');
if (checkoutBtn) {
  checkoutBtn.addEventListener('click', () => {
    if (cart.length > 0) {
      // Save cart to localStorage for the checkout page
      localStorage.setItem('cart', JSON.stringify(cart));
      window.location.href = '/order-system/frontend/checkout/index.html';
    } else {
      alert('Your cart is empty!');
    }
  });
}

// Dropdown Toggle Logic
const filterPills = document.querySelectorAll('.filter-pill');
const filterDropdowns = document.querySelectorAll('.filter-dropdown');
let lastScrollY = window.scrollY;

filterPills.forEach((pill) => {
  pill.addEventListener('click', (e) => {
    e.stopPropagation(); // prevent document click from firing immediately
    const wrapper = pill.closest('.filter-wrapper');
    
    // Close all other active dropdowns
    document.querySelectorAll('.filter-wrapper.active').forEach(w => {
      if (w !== wrapper) w.classList.remove('active');
    });
    
    // Toggle current
    const isActive = wrapper.classList.toggle('active');
    if (isActive) {
      // Record scroll position when opened
      lastScrollY = window.scrollY;
    }
  });
});

// Close when clicking anywhere outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.filter-wrapper')) {
    document.querySelectorAll('.filter-wrapper.active').forEach(w => {
      w.classList.remove('active');
    });
  }
});

// Prevent closing when clicking inside the dropdown list
filterDropdowns.forEach(dropdown => {
  dropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });
});

// Close active dropdowns automatically when page is scrolled slightly
window.addEventListener('scroll', () => {
  const activeDropdowns = document.querySelectorAll('.filter-wrapper.active');
  if (activeDropdowns.length > 0) {
    const currentScrollY = window.scrollY;
    // If scrolled by more than 15px, close dropdown to prevent overlapping elements
    if (Math.abs(currentScrollY - lastScrollY) > 15) {
      activeDropdowns.forEach(w => {
        w.classList.remove('active');
      });
    }
  }
}, { passive: true });

// Cart Logic
let cart = [];

const cartBadge = document.getElementById('cart-badge');
const topbarSubtotal = document.getElementById('topbar-subtotal');
const cartEmptyState = document.getElementById('cart-empty');
const cartItemsContainer = document.getElementById('cart-items-container');
const drawerSubtotalAmount = document.getElementById('drawer-subtotal');
const continueShoppingBtn = document.getElementById('continue-shopping');

if (continueShoppingBtn) {
  continueShoppingBtn.addEventListener('click', closeCart);
}

// Lowest AF Deals Catalog for endless recommendations
const stickerCatalog = [
  { id: 'recom-1', title: 'Stop thinking start doing Sticker', price: 15.00, originalPrice: 79.00, image: '/IMAGE/1.png' },
  { id: 'recom-2', title: 'HORSE GUY Sticker', price: 15.00, originalPrice: 79.00, image: '/IMAGE/1.png' },
  { id: 'recom-3', title: 'HULK HOGAN Sticker', price: 15.00, originalPrice: 79.00, image: '/IMAGE/1.png' },
  { id: 'recom-4', title: 'HULKAMANIA Sticker', price: 15.00, originalPrice: 79.00, image: '/IMAGE/1.png' },
  { id: 'recom-5', title: 'Keep Distance Sticker', price: 15.00, originalPrice: 79.00, image: '/IMAGE/1.png' },
  { id: 'recom-6', title: 'Combat Sticker', price: 15.00, originalPrice: 79.00, image: '/IMAGE/1.png' }
];
let currentRecomIndex = 0;

function updateCartUI() {
  let totalItems = 0;
  cart.forEach(item => {
    totalItems += item.quantity;
  });

  // Dynamic Discount Logic: 25+ items drops each item's price to ₹12.00!
  const isDiscountApplied = totalItems >= 25;
  let totalPrice = 0;
  cart.forEach(item => {
    item.price = isDiscountApplied ? 12.00 : 15.00;
    totalPrice += item.price * item.quantity;
  });

  if (cartBadge) {
    cartBadge.textContent = totalItems;
    if (totalItems > 0) {
      cartBadge.style.backgroundColor = '#facc15';
      cartBadge.style.color = '#000000';
    } else {
      cartBadge.style.backgroundColor = 'transparent';
      cartBadge.style.color = 'inherit';
    }
  }

  if (topbarSubtotal) topbarSubtotal.textContent = `Rs. ${totalPrice.toFixed(2)}`;
  if (drawerSubtotalAmount) drawerSubtotalAmount.textContent = `Rs. ${totalPrice.toFixed(2)}`;

  // Toggle sections based on cart state
  const cartFooter = document.querySelector('.cart-footer');
  const discountBanner = document.getElementById('cart-discount-banner');
  const recomSection = document.getElementById('cart-recommendation-section');

  if (cart.length === 0) {
    if (cartEmptyState) cartEmptyState.style.display = 'block';
    if (cartItemsContainer) cartItemsContainer.style.display = 'none';
    if (cartFooter) cartFooter.style.display = 'none';
    if (discountBanner) discountBanner.style.display = 'none';
    if (recomSection) recomSection.style.display = 'none';
  } else {
    if (cartEmptyState) cartEmptyState.style.display = 'none';
    if (cartItemsContainer) cartItemsContainer.style.display = 'block';
    if (cartFooter) cartFooter.style.display = 'flex';
    
    // Update lightning discount progress bar banner
    if (discountBanner) {
      discountBanner.style.display = 'block';
      const targetCount = 25;
      const progressPercent = Math.min((totalItems / targetCount) * 100, 100);
      
      const discountProgressBar = document.getElementById('discount-progress-bar');
      const discountProgressBadge = document.getElementById('discount-progress-badge');
      if (discountProgressBar) discountProgressBar.style.width = `${progressPercent}%`;
      if (discountProgressBadge) discountProgressBadge.style.left = `${progressPercent}%`;
      
      const discountDelta = document.getElementById('discount-delta');
      const delta = targetCount - totalItems;
      if (discountDelta) {
        if (delta > 0) {
          discountDelta.parentElement.innerHTML = `<span class="lightning">⚡</span> Add <strong id="discount-delta">${delta}</strong> more stickers — Get 25 for just <strong style="color: #facc15;">₹300 (₹12 each)</strong>!`;
        } else {
          discountDelta.parentElement.innerHTML = `🎉 <strong>Offer Unlocked!</strong> You got the bulk deal at <strong style="color: #facc15;">₹12 each</strong>!`;
        }
      }
    }

    renderCartItems();
    renderRecommendation();
  }
}

function renderCartItems() {
  if (!cartItemsContainer) return;
  cartItemsContainer.innerHTML = '';

  cart.forEach((item, index) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item';
    itemEl.innerHTML = `
      <img src="${item.image || '/IMAGE/1.png'}" class="cart-item-image" alt="${item.title}" onerror="this.src='/IMAGE/1.png'">
      <div class="cart-item-details">
        <div class="cart-item-title">${item.title}</div>
        <div class="cart-item-price">Rs. ${item.price.toFixed(2)}</div>
      </div>
      <div class="cart-item-right">
        <div class="quantity-controls-new">
          <span class="qty-amount-new">${item.quantity}</span>
          <div class="qty-arrows-new">
            <button class="qty-arrow-btn plus" data-index="${index}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"></polyline></svg>
            </button>
            <button class="qty-arrow-btn minus" data-index="${index}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
          </div>
        </div>
        <button class="remove-btn" data-index="${index}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    `;
    cartItemsContainer.appendChild(itemEl);
  });

  // Re-bind click event listeners
  document.querySelectorAll('.qty-arrow-btn.minus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = e.currentTarget.dataset.index;
      if (cart[idx].quantity > 1) {
        cart[idx].quantity -= 1;
        updateCartUI();
      }
    });
  });

  document.querySelectorAll('.qty-arrow-btn.plus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = e.currentTarget.dataset.index;
      cart[idx].quantity += 1;
      updateCartUI();
    });
  });

  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = e.currentTarget.dataset.index;
      cart.splice(idx, 1);
      updateCartUI();
    });
  });
}

function renderRecommendation() {
  const recomCard = document.getElementById('recom-card');
  const recomSection = document.getElementById('cart-recommendation-section');
  
  if (!recomCard) return;
  
  if (cart.length === 0) {
    if (recomSection) recomSection.style.display = 'none';
    return;
  }
  
  if (recomSection) recomSection.style.display = 'block';
  
  const recomItem = stickerCatalog[currentRecomIndex];
  recomCard.innerHTML = `
    <div class="recom-img">
      <img src="${recomItem.image}" alt="${recomItem.title}" onerror="this.src='/IMAGE/1.png'">
    </div>
    <div class="recom-details">
      <div class="recom-name">${recomItem.title}</div>
      <div class="recom-price-box">
        <span class="recom-price-old">Rs. ${recomItem.originalPrice.toFixed(2)}</span>
        <span class="recom-price-current" style="color: #ff4444; font-weight: bold;">Rs. ${recomItem.price.toFixed(2)}</span>
      </div>
    </div>
    <button class="recom-add-btn" id="recom-add-btn">Add to cart</button>
  `;
  
  const addBtn = document.getElementById('recom-add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const existing = cart.find(item => item.title === recomItem.title);
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({
          id: recomItem.id + '-' + Date.now(),
          title: recomItem.title,
          price: recomItem.price,
          originalPrice: recomItem.originalPrice,
          image: recomItem.image,
          quantity: 1
        });
      }
      
      // Endless recommendation loop: load NEXT sticker when this one is added!
      currentRecomIndex = (currentRecomIndex + 1) % stickerCatalog.length;
      updateCartUI();
    });
  }
}

// Arrow bindings for recommendation slider
const recomPrevBtn = document.getElementById('recom-prev');
const recomNextBtn = document.getElementById('recom-next');
if (recomPrevBtn && recomNextBtn) {
  recomPrevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentRecomIndex = (currentRecomIndex - 1 + stickerCatalog.length) % stickerCatalog.length;
    renderRecommendation();
  });
  
  recomNextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentRecomIndex = (currentRecomIndex + 1) % stickerCatalog.length;
    renderRecommendation();
  });
}

// Event listeners moved to global click handler below

// Quick View Logic
const qvModal = document.getElementById('quick-view-modal');
const qvOverlay = document.getElementById('quick-view-overlay');
const qvClose = document.getElementById('quick-view-close');

const qvTitle = document.getElementById('qv-title');
const qvPriceCurrent = document.querySelector('.qv-price-current');
const qvPriceOld = document.querySelector('.qv-price-old');

const qvQtyInput = document.getElementById('qv-qty-input');
const qvQtyUp = document.querySelector('.qv-qty-up');
const qvQtyDown = document.querySelector('.qv-qty-down');
const qvAddBtn = document.getElementById('qv-add-btn');

document.addEventListener('click', (e) => {
  const quickViewBtn = e.target.closest('.quick-view');
  if (quickViewBtn) {
    e.preventDefault();
    if (quickViewBtn.classList.contains('is-loading')) return;

    const card = quickViewBtn.closest('.product-card');
    if (!card) return;

    // Dynamically insert loading-dots if not present
    if (!quickViewBtn.querySelector('.loading-dots')) {
      const dots = document.createElement('div');
      dots.className = 'loading-dots';
      dots.innerHTML = '<span></span><span></span><span></span>';
      quickViewBtn.appendChild(dots);
    }

    // Show loading state
    quickViewBtn.classList.add('is-loading');

    // Total 2 second delay (1.5s animation + extra)
    setTimeout(() => {
      const title = card.querySelector('.product-title').textContent;
      const currentPriceText = card.querySelector('.price-current').textContent;
      const currentPrice = parseFloat(currentPriceText.replace('Rs. ', '').trim());
      const oldPriceElement = card.querySelector('.price-old');
      const oldPrice = oldPriceElement ? oldPriceElement.textContent : '';
      
      if (qvTitle) qvTitle.textContent = title;
      if (qvPriceOld) qvPriceOld.textContent = oldPrice;
      if (qvQtyInput) qvQtyInput.value = 1;
      
      const qvModalEl = document.getElementById('quick-view-modal');
      if (qvModalEl) {
        qvModalEl.dataset.unitPrice = currentPrice;
        qvModalEl.dataset.unitOldPrice = oldPrice ? parseFloat(oldPrice.replace('Rs. ', '').trim()) : '';
      }
      
      updateQuickViewPrice();
      
      if (qvModal) qvModal.classList.add('active');
      if (qvOverlay) qvOverlay.classList.add('active');
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');

      quickViewBtn.classList.remove('is-loading');
    }, 2000);
    return;
  }

  const addToCartBtn = e.target.closest('.add-to-cart-btn');
  if (addToCartBtn) {
    e.preventDefault();
    const card = addToCartBtn.closest('.product-card');
    if (!card) return;
    
    const title = card.querySelector('.product-title').textContent.trim();
    const priceText = card.querySelector('.price-current').textContent.trim();
    const price = parseFloat(priceText.replace('Rs. ', '').trim());
    const productUrl = window.location.origin + window.location.pathname + '?product=' + encodeURIComponent(title);
    
    const existingItem = cart.find(item => item.title === title);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ title, price, image: '/IMAGE/1.png', quantity: 1, url: productUrl });
    }
    
    updateCartUI();
    updateQuickViewPrice(); // Update progress bar if modal is open
  }
});

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

function updateQuickViewPrice() {
  const qvModalEl = document.getElementById('quick-view-modal');
  if (!qvModalEl) return;
  
  const unitPrice = parseFloat(qvModalEl.dataset.unitPrice) || 0;
  const unitOldPrice = parseFloat(qvModalEl.dataset.unitOldPrice) || 0;
  const qtyInput = document.getElementById('qv-qty-input');
  const qty = qtyInput ? (parseInt(qtyInput.value) || 1) : 1;
  
  const totalCurrent = unitPrice * qty;
  const totalOld = unitOldPrice * qty;
  
  const priceCurrentEl = document.querySelector('.qv-price-current');
  const priceOldEl = document.querySelector('.qv-price-old');
  
  if (priceCurrentEl) priceCurrentEl.textContent = `Rs. ${totalCurrent.toFixed(2)}`;
  if (priceOldEl) {
    if (unitOldPrice > 0) {
      priceOldEl.textContent = `Rs. ${totalOld.toFixed(2)}`;
    } else {
      priceOldEl.textContent = '';
    }
  }
  
  let cartTotal = 0;
  cart.forEach(item => cartTotal += item.price * item.quantity);
  const combinedTotal = cartTotal + totalCurrent;
  const threshold = 499.00;
  const remaining = Math.max(0, threshold - combinedTotal);
  const progressPercent = Math.min(100, (combinedTotal / threshold) * 100);
  
  const unlockText = document.querySelector('.qv-unlock-text');
  const progressBar = document.querySelector('.qv-progress-bar');
  const progressText = document.querySelector('.qv-progress-text');
  
  if (unlockText) {
    if (remaining > 0) {
      unlockText.innerHTML = `Spend <strong>Rs. ${remaining.toFixed(2)}</strong> more to <strong>UNLOCK CHECKOUT!</strong>`;
    } else {
      unlockText.innerHTML = `<strong>CHECKOUT UNLOCKED!</strong>`;
    }
  }
  if (progressBar) progressBar.style.width = `${progressPercent}%`;
  if (progressText) progressText.textContent = `${Math.floor(progressPercent)}%`;
}

function closeQuickView() {
  const qvModalEl = document.getElementById('quick-view-modal');
  const qvOverlayEl = document.getElementById('quick-view-overlay');
  if (qvModalEl) qvModalEl.classList.remove('active');
  if (qvOverlayEl) qvOverlayEl.classList.remove('active');
  document.body.classList.remove('modal-open');
  document.documentElement.classList.remove('modal-open');
}

const qvOverlayEl = document.getElementById('quick-view-overlay');
if (qvClose) qvClose.addEventListener('click', closeQuickView);
if (qvOverlayEl) qvOverlayEl.addEventListener('click', closeQuickView);
if (qvModal) {
  qvModal.addEventListener('click', (e) => {
    if (e.target === qvModal) {
      closeQuickView();
    }
  });
}

if (qvQtyUp) {
  qvQtyUp.addEventListener('click', () => {
    qvQtyInput.value = parseInt(qvQtyInput.value) + 1;
    updateQuickViewPrice();
  });
}
if (qvQtyDown) {
  qvQtyDown.addEventListener('click', () => {
    if (parseInt(qvQtyInput.value) > 1) {
      qvQtyInput.value = parseInt(qvQtyInput.value) - 1;
      updateQuickViewPrice();
    }
  });
}
if (qvQtyInput) {
  qvQtyInput.addEventListener('input', updateQuickViewPrice);
}

if (qvAddBtn) {
  qvAddBtn.addEventListener('click', () => {
    const qvModalEl = document.getElementById('quick-view-modal');
    if (!qvModalEl) return;
    const title = qvTitle.textContent.trim();
    const price = parseFloat(qvModalEl.dataset.unitPrice) || 0;
    const qty = parseInt(qvQtyInput.value) || 1;
    const productUrl = window.location.origin + window.location.pathname + '?product=' + encodeURIComponent(title);
    
    const existingItem = cart.find(item => item.title === title);
    if (existingItem) {
      existingItem.quantity += qty;
    } else {
      cart.push({ title, price, image: '/IMAGE/1.png', quantity: qty, url: productUrl });
    }
    
    updateCartUI();
    closeQuickView();
  });
}

// Lazy Loading, Sorting & Carousel Logic
const sortRadios = document.querySelectorAll('input[name="sort"]');
const productsGrid = document.querySelector('.products-grid');
let allProductCards = [];
let loadedCount = 150; // Show all 150 products in the horizontal carousel
let isLoading = false;

if (productsGrid) {
  allProductCards = Array.from(productsGrid.querySelectorAll('.product-card'));
  productsGrid.innerHTML = '';
  
  renderCards();
  
  // Carousel Scroll Navigation
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  if (prevBtn && nextBtn) {
    let isAnimating = false;

    function smoothScrollTo(element, target, duration, direction) {
      if (isAnimating) return;
      isAnimating = true;

      const start = element.scrollLeft;
      const change = target - start;
      const startTime = performance.now();

      // Add momentum physical deformation class
      element.classList.add(direction === 'next' ? 'sliding-next' : 'sliding-prev');

      function animateScroll(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Premium ease-out-quint curve for buttery fluid motion
        const ease = 1 - Math.pow(1 - progress, 5);

        element.scrollLeft = start + change * ease;

        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        } else {
          // Finished animating, let cards settle back smoothly
          setTimeout(() => {
            element.classList.remove('sliding-next', 'sliding-prev');
            isAnimating = false;
          }, 150);
        }
      }

      requestAnimationFrame(animateScroll);
    }

    prevBtn.addEventListener('click', () => {
      if (isAnimating) return;
      const isMobile = window.innerWidth <= 768;
      const gap = isMobile ? 12 : 30; // responsive flex gap
      const cardWidth = isMobile ? (productsGrid.clientWidth - 12) / 2 : 340; // dynamic card width to fit exactly 2 cards on mobile
      const cardScale = cardWidth + gap;
      
      // Calculate how many complete cards fit in the viewport
      const visibleCards = Math.max(1, Math.floor(productsGrid.clientWidth / cardScale));
      const scrollAmount = visibleCards * cardScale;
      const targetScroll = Math.max(0, productsGrid.scrollLeft - scrollAmount);
      
      smoothScrollTo(productsGrid, targetScroll, 750, 'prev');
    });

    nextBtn.addEventListener('click', () => {
      if (isAnimating) return;
      const isMobile = window.innerWidth <= 768;
      const gap = isMobile ? 12 : 30;
      const cardWidth = isMobile ? (productsGrid.clientWidth - 12) / 2 : 340;
      const cardScale = cardWidth + gap;
      
      const visibleCards = Math.max(1, Math.floor(productsGrid.clientWidth / cardScale));
      const scrollAmount = visibleCards * cardScale;
      const maxScroll = productsGrid.scrollWidth - productsGrid.clientWidth;
      const targetScroll = Math.min(maxScroll, productsGrid.scrollLeft + scrollAmount);
      
      smoothScrollTo(productsGrid, targetScroll, 750, 'next');
    });
  }

  if (sortRadios.length > 0) {
    sortRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const sortBy = e.target.nextElementSibling.textContent.trim();
        
        allProductCards.sort((a, b) => {
          const priceA = parseFloat(a.querySelector('.price-current').textContent.replace('Rs. ', ''));
          const priceB = parseFloat(b.querySelector('.price-current').textContent.replace('Rs. ', ''));
          const numA = parseInt(a.querySelector('.product-title').textContent.replace(/[^0-9]/g, '')) || 0;
          const numB = parseInt(b.querySelector('.product-title').textContent.replace(/[^0-9]/g, '')) || 0;
          
          if (sortBy === 'Price, low to high') return priceA - priceB;
          if (sortBy === 'Price, high to low') return priceB - priceA;
          if (sortBy === 'Date, old to new') return numA - numB;
          return numB - numA;
        });
        
        renderCards();
        
        document.querySelectorAll('.filter-wrapper.active').forEach(w => w.classList.remove('active'));
      });
    });
  }
}

function renderCards() {
  if (!productsGrid) return;
  productsGrid.innerHTML = '';
  const cardsToShow = allProductCards.slice(0, loadedCount);
  cardsToShow.forEach(card => {
    card.style.display = 'block';
    productsGrid.appendChild(card);
  });
}

// BEST SELLERS Carousel Scroll Navigation
const bestSellersCarousel = document.getElementById('bestsellers-carousel');
const bestSellersPrevBtn = document.getElementById('bestsellers-prev');
const bestSellersNextBtn = document.getElementById('bestsellers-next');

if (bestSellersCarousel && bestSellersPrevBtn && bestSellersNextBtn) {
  let isBSAnimating = false;

  function bsSmoothScrollTo(element, target, duration, direction) {
    if (isBSAnimating) return;
    isBSAnimating = true;

    const start = element.scrollLeft;
    const change = target - start;
    const startTime = performance.now();

    // Add momentum physical deformation class
    element.classList.add(direction === 'next' ? 'sliding-next' : 'sliding-prev');

    function animateScroll(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Premium ease-out-quint curve for buttery fluid motion
      const ease = 1 - Math.pow(1 - progress, 5);

      element.scrollLeft = start + change * ease;

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      } else {
        // Finished animating, let cards settle back smoothly
        setTimeout(() => {
          element.classList.remove('sliding-next', 'sliding-prev');
          isBSAnimating = false;
        }, 150);
      }
    }

    requestAnimationFrame(animateScroll);
  }

  bestSellersPrevBtn.addEventListener('click', () => {
    if (isBSAnimating) return;
    const isMobile = window.innerWidth <= 768;
    const gap = isMobile ? 12 : 30; // responsive flex gap
    const cardWidth = isMobile ? (bestSellersCarousel.clientWidth - 12) / 2 : 340; // dynamic card width to fit exactly 2 cards on mobile
    const cardScale = cardWidth + gap;
    
    // Calculate how many complete cards fit in the viewport
    const visibleCards = Math.max(1, Math.floor(bestSellersCarousel.clientWidth / cardScale));
    const scrollAmount = visibleCards * cardScale;
    const targetScroll = Math.max(0, bestSellersCarousel.scrollLeft - scrollAmount);
    
    bsSmoothScrollTo(bestSellersCarousel, targetScroll, 750, 'prev');
  });

  bestSellersNextBtn.addEventListener('click', () => {
    if (isBSAnimating) return;
    const isMobile = window.innerWidth <= 768;
    const gap = isMobile ? 12 : 30;
    const cardWidth = isMobile ? (bestSellersCarousel.clientWidth - 12) / 2 : 340;
    const cardScale = cardWidth + gap;
    
    const visibleCards = Math.max(1, Math.floor(bestSellersCarousel.clientWidth / cardScale));
    const scrollAmount = visibleCards * cardScale;
    const maxScroll = bestSellersCarousel.scrollWidth - bestSellersCarousel.clientWidth;
    const targetScroll = Math.min(maxScroll, bestSellersCarousel.scrollLeft + scrollAmount);
    
    bsSmoothScrollTo(bestSellersCarousel, targetScroll, 750, 'next');
  });
}

// Dynamic active/disabled arrow morphing on scroll
const topPrevBtn = document.getElementById('carousel-prev');
const topNextBtn = document.getElementById('carousel-next');
if (productsGrid && topPrevBtn && topNextBtn) {
  productsGrid.addEventListener('scroll', () => {
    // Left button dash toggling
    if (productsGrid.scrollLeft <= 5) {
      topPrevBtn.classList.add('is-dash');
    } else {
      topPrevBtn.classList.remove('is-dash');
    }
    
    // Right button dash toggling
    const maxScroll = productsGrid.scrollWidth - productsGrid.clientWidth;
    if (productsGrid.scrollLeft >= maxScroll - 5) {
      topNextBtn.classList.add('is-dash');
    } else {
      topNextBtn.classList.remove('is-dash');
    }
  });
}

if (bestSellersCarousel && bestSellersPrevBtn && bestSellersNextBtn) {
  bestSellersCarousel.addEventListener('scroll', () => {
    // Left button dash toggling
    if (bestSellersCarousel.scrollLeft <= 5) {
      bestSellersPrevBtn.classList.add('is-dash');
    } else {
      bestSellersPrevBtn.classList.remove('is-dash');
    }
    
    // Right button dash toggling
    const maxScroll = bestSellersCarousel.scrollWidth - bestSellersCarousel.clientWidth;
    if (bestSellersCarousel.scrollLeft >= maxScroll - 5) {
      bestSellersNextBtn.classList.add('is-dash');
    } else {
      bestSellersNextBtn.classList.remove('is-dash');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {

  // Customer Reviews Testimonials Slider Logic
  const reviewSlides = document.querySelectorAll('.review-slide');
  const reviewPrevBtn = document.getElementById('reviews-prev');
  const reviewNextBtn = document.getElementById('reviews-next');
  const reviewsSection = document.querySelector('.reviews-section');
  let currentReviewIndex = 0;
  let reviewInterval = null;

  function showReview(index) {
    if (reviewSlides.length === 0) return;
    reviewSlides.forEach(slide => slide.classList.remove('active'));
    currentReviewIndex = (index + reviewSlides.length) % reviewSlides.length;
    reviewSlides[currentReviewIndex].classList.add('active');
  }

  function nextReview() {
    showReview(currentReviewIndex + 1);
  }

  function prevReview() {
    showReview(currentReviewIndex - 1);
  }

  function startReviewAutoplay() {
    stopReviewAutoplay();
    reviewInterval = setInterval(nextReview, 6000); // 6s rotation
  }

  function stopReviewAutoplay() {
    if (reviewInterval) {
      clearInterval(reviewInterval);
      reviewInterval = null;
    }
  }

  if (reviewPrevBtn && reviewNextBtn) {
    reviewPrevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      prevReview();
      startReviewAutoplay(); // Reset rotation timer
    });

    reviewNextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      nextReview();
      startReviewAutoplay(); // Reset rotation timer
    });
  }

  // Hover Pause & Resume state
  if (reviewsSection) {
    reviewsSection.addEventListener('mouseenter', stopReviewAutoplay);
    reviewsSection.addEventListener('mouseleave', startReviewAutoplay);
  }

  // Initial Rotation start
// Initial Rotation start
  if (reviewSlides.length > 0) {
    startReviewAutoplay();
  }
});

// Optimized Eye-tracking logic
let activeEyeGroup = null;
let activeCardRect = null;
let targetX = 0;
let targetY = 0;
let currentX = 0;
let currentY = 0;

document.addEventListener('mouseover', (e) => {
  const card = e.target.closest('.product-card');
  if (card) {
    activeEyeGroup = card.querySelector('.eye-pupil-group');
    if (activeEyeGroup) {
      activeCardRect = card.getBoundingClientRect();
    }
  }
});

document.addEventListener('mouseout', (e) => {
  if (!e.relatedTarget || !e.relatedTarget.closest('.product-card')) {
    if (activeEyeGroup) {
      activeEyeGroup.style.transform = 'translate(0, 0)';
    }
    activeEyeGroup = null;
    activeCardRect = null;
    targetX = 0;
    targetY = 0;
  }
});

document.addEventListener('mousemove', (e) => {
  if (window.innerWidth <= 1024 || !activeEyeGroup || !activeCardRect) return;
  
  const rect = activeCardRect;
  const cardCenterX = rect.left + rect.width / 2;
  const cardCenterY = rect.top + rect.height / 2;
  
  const angle = Math.atan2(e.clientY - cardCenterY, e.clientX - cardCenterX);
  const distance = Math.min(2.5, Math.hypot(e.clientX - cardCenterX, e.clientY - cardCenterY) / 60);
  
  targetX = Math.cos(angle) * distance;
  targetY = Math.sin(angle) * distance;
});

function animateEye() {
  if (activeEyeGroup) {
    currentX += (targetX - currentX) * 0.15;
    currentY += (targetY - currentY) * 0.15;
    activeEyeGroup.style.transform = `translate(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px)`;
  }
  requestAnimationFrame(animateEye);
}
requestAnimationFrame(animateEye);

initLazyLoad();
updateCartUI();
handleDeepLink();
