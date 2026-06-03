import { getLoadingHTML } from './Loading animion/Loading.js';

const CHUNK_SIZE = 20;
let nextCursor = null;
let hasMore = true;
let isLoading = false;
let isRefreshingBackground = false;

// Session Storage cache keys
const CACHE_KEY_PRODUCTS = 'stickitup_cached_chunk1_v2';
const CACHE_KEY_CURSOR = 'stickitup_cached_cursor_v2';
const CACHE_KEY_HASMORE = 'stickitup_cached_hasmore_v2';

// Log telemetry metrics helper
function logTelemetry(type, name, duration) {
  if (window.GlobalPreloader && window.GlobalPreloader.telemetry) {
    if (type === 'api') {
      window.GlobalPreloader.telemetry.api[name] = duration;
    } else if (type === 'render') {
      window.GlobalPreloader.telemetry.renderTime = (window.GlobalPreloader.telemetry.renderTime || 0) + duration;
    } else {
      window.GlobalPreloader.telemetry.assets[name] = duration;
    }
  }
}

// Fetch with a specific timeout
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// Render skeleton loaders for a chunk
function renderSkeletons(grid, count = 8) {
  removeSkeletons(grid);
  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-card';
    skeleton.innerHTML = `
      <div class="skeleton-image skeleton-shimmer-base" style="width: 100%; aspect-ratio: 1 / 1; border-radius: 12px; margin-bottom: 20px;"></div>
      <div class="skeleton-title skeleton-shimmer-base" style="width: 75%; height: 18px; margin-bottom: 12px; border-radius: 4px;"></div>
      <div class="skeleton-rating skeleton-shimmer-base" style="width: 45%; height: 14px; margin-bottom: 12px; border-radius: 4px;"></div>
      <div class="skeleton-price skeleton-shimmer-base" style="width: 35%; height: 20px; margin-bottom: 16px; border-radius: 4px;"></div>
      <div class="skeleton-btn skeleton-shimmer-base" style="width: 100%; height: 40px; margin-top: auto; border-radius: 10px;"></div>
    `;
    grid.appendChild(skeleton);
  }
}

function removeSkeletons(grid) {
  const skeletons = grid.querySelectorAll('.skeleton-card');
  skeletons.forEach(s => s.remove());
}

// Render retry button
function renderRetryButton(grid, retryCallback) {
  removeSkeletons(grid);
  grid.innerHTML = `
    <div class="api-error-container" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #ef4444; font-family: 'Outfit', sans-serif;">
      <i class="fas fa-exclamation-triangle" style="font-size: 2.5rem; margin-bottom: 16px; display: block; color: #f59e0b;"></i>
      <h3 style="margin-bottom: 8px; font-weight: 800; font-size: 1.5rem; color: #000;">Failed to Load Catalog</h3>
      <p style="margin-bottom: 24px; color: #6b7280; font-size: 0.95rem;">The connection timed out or a server error occurred.</p>
      <button class="retry-btn add-to-cart-btn" style="display: inline-block; padding: 12px 24px; font-weight: 800; cursor: pointer; border-radius: 8px; background-color: #000; color: #fff;">Retry Now</button>
    </div>
  `;
  const btn = grid.querySelector('.retry-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      grid.innerHTML = '';
      retryCallback();
    });
  }
}

// Render product cards incrementally in idle callback
function renderCardsIdle(grid, products, isFirstChunk = false) {
  return new Promise((resolve) => {
    const renderStartTime = performance.now();
    const renderTask = () => {
      const fragment = document.createDocumentFragment();
      const imagePromises = [];

      products.forEach((p) => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.cursor = 'pointer';
        
        // Link to product details
        card.addEventListener('click', (e) => {
          if (e.target.closest('.add-to-cart-btn')) return;
          window.location.href = `/product-details.html?id=${p._id}`;
        });

        const savedAmt = p.compareAtPrice ? p.compareAtPrice - p.price : 0;
        const saveBadge = savedAmt > 0 ? `<div class="save-badge">Save Rs. ${savedAmt.toFixed(2)}</div>` : '';
        const oldPrice = p.compareAtPrice ? `<span class="price-old">Rs. ${p.compareAtPrice.toFixed(2)}</span>` : '';
        const discountBadge = savedAmt > 0 ? `<span class="price-badge">-Rs. ${savedAmt.toFixed(2)}</span>` : '';

        // For first chunk, preload images and track them. For others, native lazy load.
        const imageLoadingAttr = isFirstChunk ? '' : 'loading="lazy"';
        
        card.innerHTML = `
          <div class="product-image-container" style="position: relative; width: 100%; aspect-ratio: 1 / 1; border-radius: 12px; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
            ${saveBadge}
            <div class="placeholder-image" style="background: rgba(0,0,0,0.02); height: 100%; display:flex; align-items:center; justify-content:center; width:100%;">
              <img class="product-image-fade" src="${p.image}" alt="${p.title}" ${imageLoadingAttr} style="max-height: 100%; max-width: 90%; object-fit: contain; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.25));" />
            </div>
            <div class="quick-view">
              <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </div>
          </div>
          <div class="product-info">
            <h3 class="product-title">${p.title}</h3>
            <div class="product-rating">
              <span class="stars">★★★★★</span>
              <span class="reviews-count">(39)</span>
            </div>
            <div class="product-pricing">
              ${oldPrice}
              ${discountBadge}
            </div>
            <div class="price-current">Rs. ${p.price.toFixed(2)}</div>
            <div style="font-size: 0.85rem; color: #9ca3af; margin: 0.25rem 0 0.75rem 0;">
              Status: <span style="font-weight:600; color: ${p.inventoryStatus === 'In Stock' ? '#10b981' : p.inventoryStatus === 'Low Stock' ? '#f59e0b' : '#ef4444'}">${p.inventoryStatus}</span>
            </div>
            <button class="add-to-cart-btn" data-id="${p._id}">Add to cart</button>
          </div>
        `;

        fragment.appendChild(card);

        // Bind image load events
        const img = card.querySelector('img');
        if (img) {
          const imgPromise = new Promise((imgResolve) => {
            if (img.complete) {
              img.classList.add('loaded');
              imgResolve();
            } else {
              img.onload = () => {
                img.classList.add('loaded');
                imgResolve();
              };
              img.onerror = () => {
                img.classList.add('loaded'); // Resolve even on error
                imgResolve();
              };
            }
          });
          imagePromises.push(imgPromise);
        }
      });

      grid.appendChild(fragment);
      
      const renderDuration = performance.now() - renderStartTime;
      logTelemetry('render', 'chunk-render', renderDuration);
      
      resolve(imagePromises);
    };

    if (window.requestIdleCallback) {
      window.requestIdleCallback(renderTask);
    } else {
      setTimeout(renderTask, 1);
    }
  });
}

// Initial chunk loading orchestrator
async function loadFirstChunk(grid) {
  if (isLoading) return;
  isLoading = true;

  // 1. Check if we have cached Chunk 1 in sessionStorage
  const cachedProductsText = sessionStorage.getItem(CACHE_KEY_PRODUCTS);
  const cachedCursor = sessionStorage.getItem(CACHE_KEY_CURSOR);
  const cachedHasMoreText = sessionStorage.getItem(CACHE_KEY_HASMORE);

  if (cachedProductsText) {
    try {
      const cachedProducts = JSON.parse(cachedProductsText);
      nextCursor = cachedCursor || null;
      hasMore = cachedHasMoreText === 'true';
      
      console.log('[Preloader] Found cached Chunk 1 products. Rendering immediately.');
      grid.innerHTML = '';
      await renderCardsIdle(grid, cachedProducts, true);
      
      // Cache-hit: immediately complete the loader so content is visible instantly!
      if (window.GlobalPreloader) {
        window.GlobalPreloader.complete();
      }
      
      // Trigger background refresh silently
      isLoading = false;
      refreshFirstChunkInBackground(grid);
      return;
    } catch (err) {
      console.warn('[Preloader] Error parsing cached products:', err);
    }
  }

  // 2. Cache miss: standard preloading path
  renderSkeletons(grid, 8);
  const apiPromise = fetchFirstChunkFromAPI(grid);
  
  if (window.GlobalPreloader) {
    window.GlobalPreloader.registerApi(apiPromise, 'products-chunk-1');
    window.GlobalPreloader.complete(); // Hides loader once the API is done and first batch images are loaded
  } else {
    // Fallback if no preloader is defined
    apiPromise.catch(err => console.error(err));
  }
}

// Fetch Chunk 1 from server
async function fetchFirstChunkFromAPI(grid) {
  const startFetchTime = performance.now();
  try {
    const res = await fetchWithTimeout(`/api/v1/products?limit=${CHUNK_SIZE}`, {}, 5000);
    if (!res.ok) throw new Error('API server returned error');
    
    const data = await res.json();
    const fetchDuration = performance.now() - startFetchTime;
    logTelemetry('api', 'products-chunk-1', fetchDuration);

    nextCursor = data.nextCursor;
    hasMore = data.hasMore;

    // Cache products in sessionStorage
    sessionStorage.setItem(CACHE_KEY_PRODUCTS, JSON.stringify(data.products));
    sessionStorage.setItem(CACHE_KEY_CURSOR, nextCursor || '');
    sessionStorage.setItem(CACHE_KEY_HASMORE, String(hasMore));

    // Clear skeletons and render Chunk 1
    grid.innerHTML = '';
    const imagePromises = await renderCardsIdle(grid, data.products, true);
    
    // Register image load promises as critical assets to let loader wait for them
    if (window.GlobalPreloader) {
      imagePromises.forEach((promise, idx) => {
        window.GlobalPreloader.register(promise, `product-image-${idx}`);
      });
    } else {
      await Promise.all(imagePromises);
    }

    isLoading = false;
  } catch (err) {
    console.error('[Preloader] Critical API request failed:', err);
    isLoading = false;
    renderRetryButton(grid, () => {
      loadFirstChunk(grid);
    });
    throw err;
  }
}

// Background refresh of Chunk 1 for session cache updates
async function refreshFirstChunkInBackground(grid) {
  if (isRefreshingBackground) return;
  isRefreshingBackground = true;
  console.log('[BackgroundRefresh] Loading fresh catalog in background...');

  try {
    const res = await fetchWithTimeout(`/api/v1/products?limit=${CHUNK_SIZE}`, {}, 5000);
    if (!res.ok) throw new Error('API server returned error');
    const data = await res.json();

    // Verify if data is different from cache. If yes, perform soft update
    const cachedProductsText = sessionStorage.getItem(CACHE_KEY_PRODUCTS);
    if (cachedProductsText !== JSON.stringify(data.products)) {
      console.log('[BackgroundRefresh] Catalog changed. Re-rendering Chunk 1.');
      
      // Cache update
      sessionStorage.setItem(CACHE_KEY_PRODUCTS, JSON.stringify(data.products));
      sessionStorage.setItem(CACHE_KEY_CURSOR, data.nextCursor || '');
      sessionStorage.setItem(CACHE_KEY_HASMORE, String(data.hasMore));
      
      // Update variables
      nextCursor = data.nextCursor;
      hasMore = data.hasMore;

      // Soft re-render: preserve user scroll and state
      grid.innerHTML = '';
      await renderCardsIdle(grid, data.products, true);
    } else {
      console.log('[BackgroundRefresh] Catalog unchanged. Session cache is fresh.');
    }
  } catch (err) {
    console.warn('[BackgroundRefresh] Failed to refresh catalog in background:', err.message);
  } finally {
    isRefreshingBackground = false;
  }
}

// Fetch next product chunk
async function loadNextChunk(grid) {
  if (isLoading || !hasMore || !nextCursor) return;
  isLoading = true;

  console.log('[LazyLoad] Loading next chunk with cursor:', nextCursor);
  
  // Show skeletons at the bottom of the grid
  renderSkeletons(grid, 4);

  const startFetchTime = performance.now();
  try {
    const res = await fetchWithTimeout(`/api/v1/products?limit=${CHUNK_SIZE}&cursor=${nextCursor}`, {}, 5000);
    if (!res.ok) throw new Error('API server returned error');
    const data = await res.json();
    
    const fetchDuration = performance.now() - startFetchTime;
    logTelemetry('api', `products-chunk-next`, fetchDuration);

    nextCursor = data.nextCursor;
    hasMore = data.hasMore;

    // Remove skeletons and append new products
    removeSkeletons(grid);
    await renderCardsIdle(grid, data.products, false);
    
    isLoading = false;
  } catch (err) {
    console.error('[LazyLoad] Error loading chunk:', err);
    removeSkeletons(grid);
    isLoading = false;
    
    // Create an inline warning banner that allows retry
    const errBanner = document.createElement('div');
    errBanner.className = 'chunk-error-banner';
    errBanner.style = 'grid-column: 1 / -1; text-align: center; padding: 20px; font-family: "Outfit", sans-serif;';
    errBanner.innerHTML = `
      <span style="color: #ef4444; font-weight: 600; margin-right: 15px;">Connection failed while loading more products.</span>
      <button class="retry-chunk-btn add-to-cart-btn" style="padding: 6px 14px; border-radius: 6px; font-size: 0.85rem; font-weight: 800; cursor: pointer; background: #000; color: #fff;">Retry</button>
    `;
    grid.appendChild(errBanner);
    
    errBanner.querySelector('.retry-chunk-btn').addEventListener('click', () => {
      errBanner.remove();
      loadNextChunk(grid);
    });
  }
}

// Watch scroll position for 70% height prefetch
function setupScrollHandler(grid) {
  const handleScroll = () => {
    if (isLoading || !hasMore || !nextCursor) return;

    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    const scrollTop = window.scrollY || window.pageYOffset;
    
    const scrollProgress = (scrollTop + clientHeight) / scrollHeight;
    // Pre-emptively load when user reaches 70% scroll progress
    if (scrollProgress >= 0.7) {
      loadNextChunk(grid);
    }
  };

  window.addEventListener('scroll', handleScroll);
}

export function initLazyLoad() {
  const grid = document.querySelector('.products-grid');
  if (!grid || grid.classList.contains('products-carousel')) {
    if (grid) {
      grid.querySelectorAll('.product-card').forEach(card => {
        card.style.display = '';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      });
    }
    return;
  }

  // Load first chunk and configure scroll listeners
  loadFirstChunk(grid);
  setupScrollHandler(grid);
}
