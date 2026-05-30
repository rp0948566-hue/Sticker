import './home.css';
import { getLoadingHTML } from './Loading animion/Loading.js';

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

    // Toggle icon between Hamburger and X
    if (isActive) {
      mobileMenuBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    } else {
      mobileMenuBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
    }
  });
}

if (cartBtn) cartBtn.addEventListener('click', toggleCart);
if (cartClose) cartClose.addEventListener('click', closeCart);
if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

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
const drawerSubtotalRow = document.getElementById('drawer-subtotal-row');
const drawerSubtotalAmount = document.getElementById('drawer-subtotal');
const checkoutBtn = document.getElementById('checkout-btn');
const continueShoppingBtn = document.getElementById('continue-shopping');

if (continueShoppingBtn) {
  continueShoppingBtn.addEventListener('click', closeCart);
}

function updateCartUI() {
  let totalItems = 0;
  let totalPrice = 0;
  
  cart.forEach(item => {
    totalItems += item.quantity;
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
  
  if (cart.length === 0) {
    if (cartEmptyState) cartEmptyState.style.display = 'block';
    if (cartItemsContainer) cartItemsContainer.style.display = 'none';
    if (drawerSubtotalRow) drawerSubtotalRow.style.display = 'none';
    if (checkoutBtn) checkoutBtn.style.display = 'none';
  } else {
    if (cartEmptyState) cartEmptyState.style.display = 'none';
    if (cartItemsContainer) cartItemsContainer.style.display = 'block';
    if (drawerSubtotalRow) {
      drawerSubtotalRow.style.display = 'flex';
      drawerSubtotalAmount.textContent = `Rs. ${totalPrice.toFixed(2)}`;
    }
    if (checkoutBtn) checkoutBtn.style.display = 'block';
    
    renderCartItems();
  }
}

function renderCartItems() {
  if (!cartItemsContainer) return;
  cartItemsContainer.innerHTML = '';
  
  cart.forEach((item, index) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item';
    itemEl.innerHTML = `
      <div class="cart-item-image placeholder"></div>
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;
    cartItemsContainer.appendChild(itemEl);
  });
  
  document.querySelectorAll('.qty-btn.minus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = e.currentTarget.dataset.index;
      if (cart[idx].quantity > 1) {
        cart[idx].quantity -= 1;
        updateCartUI();
      }
    });
  });
  
  document.querySelectorAll('.qty-btn.plus').forEach(btn => {
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

// Event listeners moved to global click handler below

updateCartUI();

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
    
    const existingItem = cart.find(item => item.title === title);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ title, price, quantity: 1 });
    }
    
    updateCartUI();
    updateQuickViewPrice(); // Update progress bar if modal is open
  }
});

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
    
    const existingItem = cart.find(item => item.title === title);
    if (existingItem) {
      existingItem.quantity += qty;
    } else {
      cart.push({ title, price, quantity: qty });
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

// PROMPT SPACE AI Generator Simulation
document.addEventListener('DOMContentLoaded', () => {
  const promptInput = document.querySelector('.prompt-input');
  const promptBtn = document.querySelector('.prompt-btn');
  const promptWrapper = document.querySelector('.prompt-input-wrapper');
  const productsGrid = document.getElementById('products-carousel');

  if (!promptInput || !promptBtn || !promptWrapper) return;

  function triggerAIStickerGeneration() {
    const promptText = promptInput.value.trim();
    if (!promptText) {
      // Trigger a sleek error shake animation
      promptWrapper.classList.add('shake-error');
      setTimeout(() => promptWrapper.classList.remove('shake-error'), 400);
      return;
    }

    // Enter loading state
    promptBtn.classList.add('is-loading');
    const btnSpan = promptBtn.querySelector('span');
    const originalBtnText = btnSpan.textContent;
    btnSpan.textContent = 'CREATING...';

    // Simulate AI Generation
    setTimeout(() => {
      // Exit loading state
      promptBtn.classList.remove('is-loading');
      btnSpan.textContent = originalBtnText;
      promptInput.value = ''; // Clear input

      // Create a premium custom toast notification
      showPremiumToast(`✨ Custom sticker created: "${promptText}"!`);

      // Add custom card to TOP PICKS carousel!
      if (productsGrid) {
        // Find a template card to clone
        const templateCard = productsGrid.querySelector('.product-card');
        if (templateCard) {
          const newCard = templateCard.cloneNode(true);
          newCard.style.display = 'block'; // Make sure it's visible
          
          // Customize details
          const titleEl = newCard.querySelector('.product-title');
          if (titleEl) titleEl.textContent = promptText.length > 25 ? promptText.substring(0, 25) + '...' : promptText;
          
          const saveBadge = newCard.querySelector('.save-badge');
          if (saveBadge) {
            saveBadge.textContent = 'AI Custom';
            saveBadge.style.display = 'block';
          }
          
          // Randomize rating & pricing
          const reviewsEl = newCard.querySelector('.reviews-count');
          if (reviewsEl) reviewsEl.textContent = '(1)';
          
          const currentPriceEl = newCard.querySelector('.price-current');
          if (currentPriceEl) currentPriceEl.textContent = 'Rs. 49.00';
          
          const oldPriceEl = newCard.querySelector('.price-old');
          if (oldPriceEl) oldPriceEl.textContent = 'Rs. 99.00';

          const priceBadge = newCard.querySelector('.price-badge');
          if (priceBadge) {
            priceBadge.textContent = '-50%';
            priceBadge.style.display = 'inline-block';
          }

          // Give placeholder image a custom vibrant gradient
          const placeholderImg = newCard.querySelector('.placeholder-image');
          if (placeholderImg) {
            placeholderImg.style.background = 'linear-gradient(135deg, #ff3366 0%, #ff8a00 100%)';
            placeholderImg.style.boxShadow = 'inset 0 0 20px rgba(0,0,0,0.15)';
          }

          // Prepend card and smooth scroll to it
          productsGrid.prepend(newCard);
          productsGrid.scrollTo({ left: 0, behavior: 'smooth' });

          // Re-wire Add to Cart button for this new card
          const newAddBtn = newCard.querySelector('.add-to-cart-btn');
          if (newAddBtn && typeof cart !== 'undefined') {
            newAddBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              const product = {
                id: 'ai-custom-' + Date.now(),
                title: titleEl.textContent,
                price: 49.00,
                originalPrice: 99.00,
                rating: 5,
                reviews: 1,
                image: ''
              };
              cart.push({ ...product, quantity: 1 });
              if (typeof updateCartUI === 'function') {
                updateCartUI();
                if (typeof toggleCart === 'function') toggleCart();
              }
            });
          }
        }
      }
    }, 2500);
  }

  promptBtn.addEventListener('click', triggerAIStickerGeneration);
  promptInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      triggerAIStickerGeneration();
    }
  });

  // Helper to show modern toast
  function showPremiumToast(message) {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = 'premium-toast';
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-message">${message}</span>
      </div>
    `;

    toastContainer.appendChild(toast);
    
    // Trigger slide in
    setTimeout(() => toast.classList.add('visible'), 50);

    // Auto dismiss
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  }

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
