const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');

const topHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cream Website</title>
  </head>
  <body>
    <!-- Announcement Bar -->
    <div class="announcement-bar">
      <div class="marquee">
        <span>MADE IN INDIA &nbsp; &bull; &nbsp; 10 LAKH+ CUSTOMERS &nbsp; &bull; &nbsp; EXPRESS YOURSELF &nbsp; &bull; &nbsp; MADE IN INDIA &nbsp; &bull; &nbsp; 10 LAKH+ CUSTOMERS</span>
      </div>
    </div>
    
    <header class="topbar">
      <div class="topbar-left">
        <button class="icon-btn mobile-menu-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <button class="icon-btn mobile-user-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </button>
        <div class="desktop-logo-placeholder"></div>
      </div>
      <div class="topbar-center">
        <div class="mobile-logo-placeholder"></div>
        <div class="desktop-nav-links">
          <a href="home.html">COMBO</a>
          <a href="#" class="has-submenu">MOBILE SKINS <svg class="icon-down" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></a>
          <a href="#">MYSTERY BOX</a>
          <a href="#" class="underlined">NEW ARRIVALS</a>
          <a href="#">CARD SKINS</a>
          <a href="#">MACBOOK SKINS</a>
          <a href="#">ACCESSORIES</a>
        </div>
      </div>
      <div class="topbar-right">
        <div class="customer-support desktop-only">
          <svg class="icon-headset" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>
          <div class="support-text">
            <span class="support-label">Customer support</span>
            <span class="support-email">wecare@stickitup.xyz</span>
          </div>
        </div>
        <button class="icon-btn search-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </button>
        <button class="icon-btn user-btn desktop-only">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </button>
        <div class="cart-section" id="cart-btn">
          <div class="cart-icon-wrapper">
            <svg class="icon-bag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="2" ry="2"></rect><path d="M8 8V6a4 4 0 0 1 8 0v2"></path></svg>
            <span class="cart-badge" id="cart-badge">0</span>
          </div>
          <div class="cart-text desktop-only">
            <span class="cart-label">Subtotal</span>
            <span class="cart-amount" id="topbar-subtotal">Rs. 0.00</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Mobile Menu Drawer -->
    <div class="mobile-menu-drawer" id="mobile-menu">
      <div class="mobile-menu-links">
        <a href="home.html">COMBO</a>
        <a href="#" class="has-submenu">MOBILE SKINS <div class="submenu-icon-wrapper"><svg class="icon-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></div></a>
        <a href="#">MYSTERY BOX</a>
        <a href="#" class="active-link">NEW ARRIVALS</a>
        <a href="#">CARD SKINS</a>
        <a href="#">MACBOOK SKINS</a>
        <a href="#">ACCESSORIES</a>
      </div>

      <div class="customer-support mobile-support">
        <svg class="icon-headset" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>
        <div class="support-text">
          <span class="support-label">Customer support</span>
          <span class="support-email">wecare@stickitup.xyz</span>
        </div>
      </div>

      <div class="mobile-social-links">
        <a href="#" class="social-icon fb"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg></a>
        <a href="#" class="social-icon ig"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg></a>
        <a href="#" class="social-icon yt"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33zM9.75 15.02V8.48L15.5 11.75l-5.75 3.27z"></path></svg></a>
      </div>
    </div>

    <main>
      <!-- Hero Banner -->
      <section class="hero">
        <img src="/IMAGE/1.png" alt="Sale Banner" class="hero-image" />
      </section>

      <!-- Features Bar -->
      <div class="features-bar">
        <span>MADE IN INDIA</span>
        <span class="dot">•</span>
        <span>10 LAKH+ CUSTOMERS</span>
        <span class="dot">•</span>
        <span>EXPRESS YOURSELF</span>
        <span class="dot">•</span>
        <span>MADE IN INDIA</span>
        <span class="dot">•</span>
        <span>10 LAKH+ CUSTOMERS</span>
      </div>

      <!-- Filters Section -->
      <section class="filters-section">
        <div class="filters-left">
          <span class="filter-label">Filter:</span>
          
          <div class="filter-wrapper">
            <button class="filter-pill">Theme <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
            <div class="filter-dropdown">
              <div class="filter-dropdown-header">
                <span class="selected-count">0 selected</span>
                <button class="reset-btn">Reset <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
              </div>
              <div class="filter-dropdown-list">
                <label class="filter-option"><input type="checkbox"><span class="option-text">Anime</span><span class="option-count">120</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Pop Culture</span><span class="option-count">85</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Quotes</span><span class="option-count">210</span></label>
              </div>
            </div>
          </div>

          <div class="filter-wrapper">
            <button class="filter-pill">Vibe <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
            <div class="filter-dropdown">
              <div class="filter-dropdown-header">
                <span class="selected-count">0 selected</span>
                <button class="reset-btn">Reset <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
              </div>
              <div class="filter-dropdown-list">
                <label class="filter-option"><input type="checkbox"><span class="option-text">Adventurous</span><span class="option-count">134</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Artistic</span><span class="option-count">2470</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Chill</span><span class="option-count">686</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Edgy</span><span class="option-count">265</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Extrovert</span><span class="option-count">12</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Funny</span><span class="option-count">86</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Introvert</span><span class="option-count">10</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Minimalist</span><span class="option-count">2394</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Motivational</span><span class="option-count">123</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Romantic</span><span class="option-count">54</span></label>
              </div>
            </div>
          </div>

          <div class="filter-wrapper">
            <button class="filter-pill">Gift For <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
            <div class="filter-dropdown">
              <div class="filter-dropdown-header">
                <span class="selected-count">0 selected</span>
                <button class="reset-btn">Reset <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
              </div>
              <div class="filter-dropdown-list">
                <label class="filter-option"><input type="checkbox"><span class="option-text">Anyone</span><span class="option-count">3273</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Couple</span><span class="option-count">1</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Friends</span><span class="option-count">60</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Her</span><span class="option-count">87</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Him</span><span class="option-count">507</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Kids</span><span class="option-count">10</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Yourself</span><span class="option-count">23</span></label>
              </div>
            </div>
          </div>

          <div class="filter-wrapper">
            <button class="filter-pill">Zodiac Sign <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
            <div class="filter-dropdown">
              <div class="filter-dropdown-header">
                <span class="selected-count">0 selected</span>
                <button class="reset-btn">Reset <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
              </div>
              <div class="filter-dropdown-list">
                <label class="filter-option"><input type="checkbox"><span class="option-text">Aquarius</span><span class="option-count">294</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Aries</span><span class="option-count">434</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Cancer</span><span class="option-count">741</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Capricorn</span><span class="option-count">2517</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Gemini</span><span class="option-count">344</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Leo</span><span class="option-count">724</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Libra</span><span class="option-count">788</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Pisces</span><span class="option-count">108</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Sagittarius</span><span class="option-count">131</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Scorpio</span><span class="option-count">264</span></label>
              </div>
            </div>
          </div>

          <div class="filter-wrapper">
            <button class="filter-pill">Availability <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
            <div class="filter-dropdown">
              <div class="filter-dropdown-header">
                <span class="selected-count">0 selected</span>
                <button class="reset-btn">Reset <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
              </div>
              <div class="filter-dropdown-list">
                <label class="filter-option"><input type="checkbox"><span class="option-text">In Stock</span><span class="option-count">3815</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Out Of Stock</span><span class="option-count">238</span></label>
              </div>
            </div>
          </div>

          <div class="filter-wrapper">
            <button class="filter-pill">Product type <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
            <div class="filter-dropdown">
              <div class="filter-dropdown-header">
                <span class="selected-count">0 selected</span>
                <button class="reset-btn">Reset <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
              </div>
              <div class="filter-dropdown-list">
                <label class="filter-option"><input type="checkbox"><span class="option-text">Bumper Sticker</span><span class="option-count">349</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Custom Sticker</span><span class="option-count">1</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Glitter Stickers</span><span class="option-count">102</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Holographic Stickers</span><span class="option-count">325</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Infinity Stickers</span><span class="option-count">19</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Laptop Skins</span><span class="option-count">105</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Mystery Box</span><span class="option-count">6</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">NoFlexify</span><span class="option-count">5</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Sticker Packs</span><span class="option-count">44</span></label>
                <label class="filter-option"><input type="checkbox"><span class="option-text">Sticker Sheets</span><span class="option-count">89</span></label>
              </div>
            </div>
          </div>
        </div>
        <div class="filters-right">
          <div class="filter-wrapper">
            <button class="filter-pill sort-pill">Date, new to old <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
            <div class="filter-dropdown" style="right: 0; left: auto; transform-origin: top right; width: 220px;">
              <div class="filter-dropdown-list">
                <label class="filter-option"><input type="radio" name="sort" checked><span class="option-text">Date, new to old</span></label>
                <label class="filter-option"><input type="radio" name="sort"><span class="option-text">Date, old to new</span></label>
                <label class="filter-option"><input type="radio" name="sort"><span class="option-text">Price, low to high</span></label>
                <label class="filter-option"><input type="radio" name="sort"><span class="option-text">Price, high to low</span></label>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="products-grid">
`;

const productTemplate = (i) => `
        <div class="product-card" style="display: none;">
          <div class="product-image-container">
            <div class="save-badge">Save Rs. 40.00</div>
            <div class="placeholder-image"></div>
            <div class="quick-view">
              <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </div>
          </div>
          <div class="product-info">
            <h3 class="product-title">Glitter Sticker ${i}</h3>
            <div class="product-rating">
              <span class="stars">★★★★★</span>
              <span class="reviews-count">(${Math.floor(Math.random() * 100) + 1})</span>
            </div>
            <div class="product-pricing">
              <span class="price-old">Rs. 99.00</span>
              <span class="price-badge">-Rs. 40.00</span>
            </div>
            <div class="price-current">Rs. 59.00</div>
            <button class="add-to-cart-btn">Add to cart</button>
          </div>
        </div>`;

let productsHtml = '';
for (let i = 1; i <= 150; i++) {
  productsHtml += productTemplate(i);
}

const bottomHtml = `
        </div>
      </section>
    </main>

    <!-- Quick View Modal Overlay -->
    <div class="quick-view-overlay" id="quick-view-overlay"></div>

    <!-- Quick View Modal Wrapper -->
    <div class="quick-view-modal" id="quick-view-modal">
      <button class="quick-view-close" id="quick-view-close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
      </button>
      
      <div class="quick-view-inner">
        <div class="quick-view-content">
        <!-- Left: Image Gallery -->
        <div class="qv-gallery">
          <div class="qv-thumbnails">
            <div class="qv-thumb active"><img src="/IMAGE/1.png" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"></div>
            <div class="qv-thumb"><img src="/IMAGE/1.png" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"></div>
            <div class="qv-thumb"><img src="/IMAGE/1.png" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"></div>
            <div class="qv-thumb"><img src="/IMAGE/1.png" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"></div>
          </div>
          <div class="qv-main-image">
            <div class="qv-expand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
            </div>
            <img src="/IMAGE/1.png" style="width:100%;height:100%;object-fit:contain;border-radius:16px;">
          </div>
        </div>
        
        <!-- Right: Product Info -->
        <div class="qv-info">
          <div class="qv-vendor">By STICK IT UP</div>
          <h2 class="qv-title" id="qv-title">Xox Sticker Glitter Sticker</h2>
          <div class="qv-rating">
            <span class="stars" style="color:#d1d5db;font-size:18px;">★★★★★</span>
          </div>
          <div class="qv-pricing">
            <span class="qv-price-old">Rs. 99.00</span>
            <span class="qv-price-current">Rs. 59.00</span>
            <span class="qv-save-badge">Save Rs. 40.00</span>
          </div>
          <div class="qv-shipping-text"><u>Shipping</u> calculated at checkout.</div>
          
          <div class="qv-unlock-box">
            <div class="qv-unlock-text">Spend <strong>Rs. 249.00</strong> more to <strong>UNLOCK CHECKOUT!</strong></div>
            <div class="qv-progress-bar-container">
              <div class="qv-progress-bar"></div>
            </div>
            <div class="qv-progress-text">0%</div>
          </div>
          
          <div class="qv-add-section">
            <div class="qv-quantity-wrapper">
              <label>Quantity</label>
              <div class="qv-quantity-controls">
                <input type="number" value="1" min="1" id="qv-qty-input">
                <div class="qv-qty-arrows">
                  <button class="qv-qty-up"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg></button>
                  <button class="qv-qty-down"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                </div>
              </div>
            </div>
            <button class="qv-add-to-cart-btn" id="qv-add-btn">Add to cart</button>
          </div>
          
          <div class="qv-description">
            <p><strong><a href="#" style="color:#1d4ed8;text-decoration:underline;text-underline-offset:4px;">STICK IT UP Premium Glitter Stickers:</a></strong></p>
            <p>Add instant sparkle to your everyday essentials with our premium glitter stickers, designed with high-quality glitter material and a smooth protective finish that shines beautifully from every angle. Perfect for adding bold personality and shimmer to any surface.</p>
            <ul>
              <li><strong>Dimensions -</strong></li>
              <li>Fits within <strong>3 x 3 inches</strong> area.</li>
              <li>Height & width depends on the aspect ratio of the design.</li>
            </ul>
            <p class="qv-note"><span class="highlight-text"><span style="color:#1d4ed8; font-weight: bold;">Please Note:</span> Colours and glitter effect may slightly vary depending on your screen brightness and lighting conditions.</span></p>
            <p class="qv-disclaimer">* This is a demonstration store — no orders shall be fulfilled.</p>
          </div>
        </div>
      </div>
      </div>
    </div>

    <!-- Cart Overlay -->
    <div class="cart-overlay" id="cart-overlay"></div>

    <!-- Cart Drawer -->
    <div class="cart-drawer" id="cart-drawer">
      <div class="cart-header">
        <h2 class="cart-title">Your cart</h2>
        <button class="cart-close" id="cart-close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- FIXED DISCOUNT PROGRESS BANNER -->
      <div class="cart-discount-banner" id="cart-discount-banner" style="display: none;">
        <div class="discount-text">
          <span class="lightning">⚡</span> Add <strong id="discount-delta">4</strong> more stickers — Get 25 for just <strong style="color: #facc15;">₹300 (₹12 each)</strong>!
        </div>
        <div class="discount-progress-wrapper">
          <div class="discount-progress-track">
            <div class="discount-progress-bar" id="discount-progress-bar"></div>
            <div class="discount-progress-badge" id="discount-progress-badge">
              <svg viewBox="0 0 24 24" fill="currentColor" style="width: 10px; height: 10px; color: #000;"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 c-0.11,0.2-0.06,0.47,0.12,0.61l2.03,1.58C4.84,11.36,4.8,11.68,4.8,12c0,0.32,0.03,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.11-0.2,0.06-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"></path></svg>
            </div>
          </div>
        </div>
      </div>

      <!-- SCROLLABLE CART CONTENT -->
      <div class="cart-content" id="cart-content">
        <div class="cart-empty" id="cart-empty">
          <div class="cart-empty-main">
            <h2 class="cart-empty-title-new">Your cart is empty</h2>
            <h3 class="cart-empty-subtitle-new">Check out our most wanted collections!</h3>
            
            <a href="#" class="wanted-collection-card">
              <div class="wanted-logo-box">
                <span class="wasted-logo" style="color: #d10000; font-weight: 900; font-size: 11px; letter-spacing: -0.5px; font-family: Impact, sans-serif; text-transform: lowercase;">wasted</span>
              </div>
              <span class="wanted-text">All Stickers</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="wanted-chevron"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </a>

            <button class="continue-shopping-btn-new" id="continue-shopping">Continue shopping</button>
          </div>
          
          <div class="cart-empty-footer-new">
            <h2>Have an account?</h2>
            <p><a href="#">Log in</a> to check out faster.</p>
          </div>
        </div>

        <!-- Dynamic Cart Items Container -->
        <div id="cart-items-container" class="cart-items-container"></div>
      </div>

      <!-- FIXED BOTTOM RECOMMENDATION WIDGET -->
      <div class="cart-recommendation-section" id="cart-recommendation-section" style="display: none;">
        <div class="recom-header">
          <span class="recom-title">Lowest AF Deals 😈</span>
          <div class="recom-arrows">
            <button class="recom-arrow prev" id="recom-prev">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <button class="recom-arrow next" id="recom-next">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </div>
        <div class="recom-card" id="recom-card"></div>
      </div>

      <!-- FIXED FOOTER -->
      <div class="cart-footer" style="display: none;">
        <div class="cart-subtotal-row">
          <span class="subtotal-label">SUBTOTAL</span>
          <span class="subtotal-amount" id="drawer-subtotal">Rs. 0.00</span>
        </div>
        <div class="cart-shipping-note">
          Taxes and <a href="#" style="text-decoration: underline; color: #000; text-underline-offset: 3px;">shipping</a> calculated at checkout
        </div>
        <div class="free-shipping-badge">
          FREE SHIPPING ON ALL ORDERS
        </div>
        <button class="buy-now-btn" id="checkout-btn">
          <span>BUY NOW</span>
          <div class="payment-icons">
            <svg viewBox="0 0 40 16" width="30" height="12" style="display:block;"><path fill="#4285F4" d="M5.4,8.2V4.5H2.6v3.7c0,1.2,0.9,2.1,2.1,2.1h0.7V8.2C5.4,8.2,5.4,8.2,5.4,8.2z"/><path fill="#34A853" d="M10.8,4.5H8v3.7c0,1.2,0.9,2.1,2.1,2.1h0.7V8.2L10.8,4.5z"/><path fill="#FBBC05" d="M8,12v1.5H5.4v-2c0-1.2,0.9-2.1,2.1-2.1h0.7V10.9L8,12z"/><path fill="#EA4335" d="M2.6,12v1.5H5.4v-2c0-1.2-0.9-2.1-2.1-2.1H2.6V12z"/></svg>
            <span style="font-size: 8px; font-weight: 800; color: #00baf2; font-family: sans-serif;">paytm</span>
          </div>
        </button>
      </div>
    </div>
    
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`;

// Re-wire COMBO links to clean URL '/home'
const topHtmlClean = topHtml.replace(/href="home\.html"/g, 'href="/home"');

// 1. Generate index.html (standard vertical grid)
const indexHtmlContent = topHtmlClean + productsHtml + bottomHtml;
fs.writeFileSync(filePath, indexHtmlContent, 'utf8');
console.log('index.html restored successfully.');

// 2. Generate home.html (horizontal carousel wrapper)
// Replace open tag
const homeTopHtml = topHtmlClean.replace(
  '<section class="products-grid">',
  '<div class="carousel-container"><section class="products-carousel products-grid" id="products-carousel">'
);
// Replace close tag and append controls plus 3 empty sections below it
const homeBottomHtml = bottomHtml
  .replace(
    '</div>\n      </section>',
    `</section>
        
        <div class="carousel-controls">
          <button class="view-all-btn">View all</button>
          <div class="arrow-buttons">
            <button class="carousel-arrow prev-btn" id="carousel-prev">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>
            <button class="carousel-arrow next-btn" id="carousel-next">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Combined Autoplay Section (Gold Yellow Background) -->
      <section class="empty-section empty-sec-combined" style="padding: 40px 0; overflow: hidden; display: flex; flex-direction: column; gap: 30px;">
        <!-- Track 1: Scroll Right -->
        <div class="marquee-row">
          <div class="marquee-row-track track-right">
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
          </div>
        </div>
        <!-- Track 2: Scroll Left -->
        <div class="marquee-row">
          <div class="marquee-row-track track-left">
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
            <div class="empty-product-frame"></div>
          </div>
        </div>
      </section>

      <!-- Section 3 Spacer -->
      <section class="empty-section empty-sec-3"></section>`
  )
  .replace('/src/main.js', '/src/home.js');

const homeHtmlContent = homeTopHtml + productsHtml + homeBottomHtml;
fs.writeFileSync(path.join(__dirname, 'home.html'), homeHtmlContent, 'utf8');
console.log('home.html generated successfully.');
