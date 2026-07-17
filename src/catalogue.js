import { getLoadingHTML } from './Loading animion/Loading.js';

const CHUNK = 30;

// ── Category → filter metadata ───────────────────────────────────────────
const CAT_VIBES = {
  MOV:['Adventurous','Edgy'],  ANM:['Adventurous','Artistic'],
  CAR:['Adventurous','Edgy'],  SPO:['Adventurous'],
  MAR:['Adventurous','Edgy'],  AST:['Artistic','Minimalist','Chill'],
  QOU:['Motivational','Chill'],ART:['Artistic'],
  VVG:['Artistic','Minimalist'],SONM:['Chill','Romantic'],
  DEV:['Chill'],               VSN:['Motivational'],
  GIR:['Romantic','Artistic'], SHCN:['Funny'],
  SC:['Chill','Romantic'],     A3:['Artistic','Minimalist'],
  SPL:['Artistic'],            SPLA:['Artistic'],
  ANM3:['Adventurous','Artistic'], ANM2:['Adventurous','Artistic'],
  LAP:['Adventurous','Funny','Artistic','Edgy'],
};

const CAT_GIFT = {
  MOV:['Him','Anyone'],   ANM:['Anyone'],      CAR:['Him','Anyone'],
  SPO:['Him','Anyone'],   MAR:['Him','Anyone'],AST:['Her','Anyone'],
  QOU:['Yourself','Anyone'],ART:['Her','Anyone'],VVG:['Her','Anyone'],
  SONM:['Anyone'],        DEV:['Anyone'],      VSN:['Yourself','Anyone'],
  GIR:['Her','Friends','Anyone'],SHCN:['Kids','Anyone'],
  SC:['Anyone'],          A3:['Anyone'],       SPL:['Anyone'],
  SPLA:['Anyone'],        ANM3:['Anyone'],     ANM2:['Anyone'],
  LAP:['Him','Her','Anyone'],
};

// Theme label (lowercase) → matching category codes
const THEME_MAP = {
  'anime':['ANM','ANM2','ANM3'],     'pop culture':['MOV','MAR','LAP'],
  'quotes':['QOU'],                   'movie':['MOV','LAP'],
  'marvels':['MAR','LAP'],            'cars':['CAR','LAP'],
  'sports':['SPO','LAP'],             'aesthetic':['AST'],
  'artist':['ART'],                   'van gogh':['VVG'],
  'songs':['SONM','SC'],              'devotional':['DEV'],
  'vision board':['VSN'],             'pink lavender':['GIR'],
  'shinchan':['SHCN'],               'a3':['A3'],
  'split':['SPL','SPLA'],            'new anime':['ANM3'],
  'laptop stickers':['LAP'],         'meme':['LAP'],
  'funny':['LAP','SHCN'],
};

// Product type label (lowercase) → page codes that match
const PROD_TYPE_PAGES = {
  'laptop skins':['M','LAP'], 'macbook':['M'], 'laptop stickers':['LAP','M'],
  'card skin':['C'], 'sticker sheets':['C','A'], 'sticker packs':['A'],
  'accessory':['A'],          'frame':['F'],
};

// ── Helpers ───────────────────────────────────────────────────────────────
export function detectPage() {
  const p = window.location.pathname.toUpperCase();
  if (p.includes('MACBOOK'))  return 'M';
  if (p.includes('CARD'))     return 'C';
  if (p.includes('MYSTERY'))  return 'MYSTERY';
  if (p.includes('ACCESSORIES')) return 'A';
  if (p.includes('NEW') && p.includes('ARRIVAL')) return 'N';
  if (p.includes('FRAME'))    return 'F';
  // Category-specific pages — order matters (more specific first)
  if (p.includes('ANIME%20MINI') || p.includes('ANIME MINI')) return 'ANM2';
  if (p.includes('NEW%20ANIME') || p.includes('NEW ANIME'))   return 'ANM3';
  if (p.includes('ANIME'))          return 'ANM';
  if (p.includes('MOVIES') || p.includes('MOVIE')) return 'MOV';
  if (p.includes('CARS') || (p.includes('CAR') && !p.includes('CARD'))) return 'CAR';
  if (p.includes('SPORTS') || p.includes('SPORT')) return 'SPO';
  if (p.includes('MARVEL'))         return 'MAR';
  if (p.includes('AESTHETIC'))      return 'AST';
  if (p.includes('QUOTES') || p.includes('QUOTE')) return 'QOU';
  if (p.includes('ARTIST'))         return 'ART';
  if (p.includes('VAN') && p.includes('GOGH')) return 'VVG';
  if (p.includes('SONG%20COVER') || p.includes('SONG COVER') || p.includes('8X8')) return 'SC';
  if (p.includes('SONGS') || (p.includes('SONG') && !p.includes('COVER'))) return 'SONM';
  if (p.includes('DEVOTIONAL'))     return 'DEV';
  if (p.includes('VISION'))         return 'VSN';
  if (p.includes('PINK') || p.includes('LAVENDER')) return 'GIR';
  if (p.includes('SHINCHAN'))       return 'SHCN';
  if (p.includes('A3'))             return 'A3';
  if (p.includes('SPLIT%20ART') || p.includes('SPLIT ART')) return 'SPLA';
  if (p.includes('SPLIT'))          return 'SPL';
  if (p.includes('LAPTOP'))         return 'LAP';
  return 'HOME';
}

const CAT_CODES = new Set(['ANM','ANM2','ANM3','MOV','CAR','SPO','MAR','AST','QOU','ART','VVG','SONM','SC','DEV','VSN','GIR','SHCN','A3','SPL','SPLA','LAP']);

export function isDynamicPage() {
  const pageCode = detectPage();
  return ['M', 'C', 'A', 'F', 'N'].includes(pageCode) || CAT_CODES.has(pageCode);
}

// Home page "Shop Stickers" preview — a handful of products spread across
// the most popular categories, not the full catalogue.
const FEATURED_HOME_CODES = ['ANM', 'MOV', 'AST', 'QOU', 'CAR', 'SPO', 'GIR', 'DEV', 'ART', 'SONM', 'VVG', 'LAP'];
function getFeaturedHomeProducts(catalogue) {
  const featured = [];
  FEATURED_HOME_CODES.forEach(code => {
    const first = catalogue.find(item => item[0] === code);
    if (first) featured.push(first);
  });
  return featured;
}

function getProductsForPage(catalogue, pageCode) {
  if (pageCode === 'HOME') return getFeaturedHomeProducts(catalogue);
  if (CAT_CODES.has(pageCode)) return catalogue.filter(item => item[0] === pageCode);
  if (pageCode === 'N') return catalogue.filter(item => item[1] === 'N' || item[1] === 'NF');
  return catalogue.filter(item => item[1] === pageCode);
}

// Descriptive name prefixes per category code
const PROD_LABELS = {
  MOV: 'Movie Poster', ANM: 'Anime Art', CAR: 'Car Design', SPO: 'Sports Art',
  MAR: 'Marvel Design', AST: 'Aesthetic Art', QOU: 'Motivational Quote',
  ART: 'Artist Print', VVG: 'Van Gogh Art', SONM: 'Song Poster',
  DEV: 'Devotional Art', VSN: 'Vision Board', GIR: 'Pink Lavender Art',
  SHCN: 'Shinchan Art', SC: 'Song Cover', A3: 'A3 Wall Poster',
  SPL: 'Split Poster', SPLA: 'Split Art Design', ANM3: 'New Anime Art',
  ANM2: 'Anime Mini Art', LAP: 'Laptop Sticker',
};

// Display name is just the category label (no "#4" numbering shown on the
// site) — the number/filename is kept only as a hidden ref (card.dataset.ref)
// so cart lines for different designs still stay distinct behind the scenes.
//
// The same artwork is sold as different physical products (a "Movie" design
// can be printed as a poster on the Poster page, or as a skin on the Macbook
// Skins page) — the catalogue reuses cc for the artwork's theme regardless
// of which product page it's sold on, so the displayed name must follow the
// page's product type, not just the artwork's theme, or a movie-themed
// design would misleadingly say "Movie Poster" while shown as a laptop skin.
const PAGE_PRODUCT_LABELS = { M: 'Macbook Skin', C: 'Card Skin' };
function getProductName(cc, filename, catNames, pageCode) {
  if (pageCode && PAGE_PRODUCT_LABELS[pageCode]) return PAGE_PRODUCT_LABELS[pageCode];
  return PROD_LABELS[cc] || (catNames[cc] ? catNames[cc] + ' Art' : cc);
}

function getProductRef(filename) {
  const m = filename.match(/\((\d+)\)/) || filename.match(/(?:^|[^a-z])(\d+)(?=[.\s_(])/i);
  return m ? m[1] : filename;
}

function revCount(idx) { return 12 + ((idx * 41 + 17) % 238); }

// Product photos are hosted in a public Google Drive folder rather than
// bundled with the site. IMAGE_DRIVE_MAP resolves "<category folder>/<filename>"
// to that file's Drive ID (loaded once in initProductGrid). Falls back to the
// old local /STICKER path (which won't resolve) only for the handful of files
// not found in Drive, so a missing mapping fails the same way it always did.
let IMAGE_DRIVE_MAP = {};

async function loadImageDriveMap() {
  try {
    const resp = await fetch('/image-drive-map.json');
    IMAGE_DRIVE_MAP = await resp.json();
  } catch (err) {
    // Best-effort — falls back to local /STICKER paths if the map can't load
  }
}

function driveImageUrl(id) {
  return `https://lh3.googleusercontent.com/d/${id}=w800`;
}

function createCard(record, idx, catFolders, catNames) {
  const [cc, pageCode, filename] = record;
  const folder = catFolders[cc] || '';
  const relPath = cc === 'LAP' ? `laptop stickers file/laptopp stickers/${filename}` : `FRAME/${folder}/${filename}`;
  // Images now live locally in public/STICKER — fast and reliable. If a
  // specific file is somehow missing locally, fall back to hotlinking the
  // same file from Drive (see the onerror handler below), then finally to a
  // placeholder if both fail.
  const imgSrc = encodeURI(`/STICKER/${relPath}`);
  const driveId = IMAGE_DRIVE_MAP[relPath];
  const imgFallback = driveId ? driveImageUrl(driveId) : '/IMAGE/1.png';
  const name = getProductName(cc, filename, catNames, pageCode);
  const ref = getProductRef(filename);
  const isFramed = pageCode === 'NF' || pageCode === 'F';
  // Laptop stickers/skins are cut to a specific laptop model, not sold in
  // 3"/4"/5" sticker sizes or with a frame — those pills don't apply here.
  const hasSizeFrameOptions = cc !== 'LAP';
  const card = document.createElement('div');
  card.className = 'product-card';
  card.dataset.cc = cc;
  card.dataset.ref = ref;
  card.dataset.sku = `${cc}-${ref}`;
  card.innerHTML = `
    <div class="product-image-container${isFramed ? ' has-frame' : ''}">
      <div class="save-badge">Save Rs. 64.00</div>
      <div class="placeholder-image${isFramed ? ' frame-on' : ''}">
        <img src="${imgSrc}" alt="${name}" loading="lazy" data-fallback="${imgFallback}" onerror="if (this.src !== this.dataset.fallback && this.dataset.fallback) { this.src = this.dataset.fallback; } else { this.onerror=null; this.src='/IMAGE/1.png'; this.closest('.product-card')?.classList.add('img-fallback'); }">
      </div>
      <div class="quick-view">
        <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
      </div>
    </div>
    <div class="product-info">
      <h3 class="product-title">${name}</h3>
      <div class="product-rating">
        <span class="stars">★★★★★</span>
        <span class="reviews-count">(${revCount(idx)})</span>
      </div>
      <div class="product-pricing">
        <span class="price-old">Rs. 79.00</span>
        <span class="price-badge">-Rs. 64.00</span>
      </div>
      <div class="price-current">Rs. 15.00</div>
      ${hasSizeFrameOptions ? `
      <div class="card-selectors">
        <div class="card-sel-row">
          <span class="card-sel-label">Size</span>
          <div class="card-pills">
            <button class="card-pill active" data-group="size" data-val='3"×3"'>3"×3"</button>
            <button class="card-pill" data-group="size" data-val='4"×4"'>4"×4"</button>
            <button class="card-pill" data-group="size" data-val='5"×5"'>5"×5"</button>
          </div>
        </div>
        <div class="card-sel-row">
          <span class="card-sel-label">Frame</span>
          <div class="card-pills">
            <button class="card-pill${isFramed ? '' : ' active'}" data-group="frame" data-val="without">Without</button>
            <button class="card-pill${isFramed ? ' active' : ''}" data-group="frame" data-val="with">With</button>
          </div>
        </div>
      </div>` : ''}
      <button class="add-to-cart-btn">Add to cart</button>
    </div>
  `;
  // Wire frame pill toggle
  card.querySelectorAll('[data-group="frame"]').forEach(btn => {
    btn.addEventListener('click', () => {
      card.querySelectorAll('[data-group="frame"]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const img = card.querySelector('.placeholder-image');
      if (btn.dataset.val === 'with') img.classList.add('frame-on');
      else img.classList.remove('frame-on');
    });
  });
  return card;
}

function appendChunk(grid, products, startIdx, catFolders, catNames, imageMap) {
  const end = Math.min(startIdx + CHUNK, products.length);
  const frag = document.createDocumentFragment();
  for (let i = startIdx; i < end; i++) {
    frag.appendChild(createCard(products[i], i, catFolders, catNames, imageMap));
  }
  grid.appendChild(frag);
  return end;
}

// ── Filter matching ───────────────────────────────────────────────────────
function matchesFilters(record, filters) {
  const cc = record[0];
  const pageCode = record[1];

  if (filters.theme.size > 0) {
    const ok = [...filters.theme].some(t => {
      const codes = THEME_MAP[t.toLowerCase()];
      return codes ? codes.includes(cc) : false;
    });
    if (!ok) return false;
  }

  if (filters.vibe.size > 0) {
    const vibes = CAT_VIBES[cc] || [];
    if (![...filters.vibe].some(v => vibes.includes(v))) return false;
  }

  if (filters.giftFor.size > 0) {
    const gifts = CAT_GIFT[cc] || ['Anyone'];
    if (![...filters.giftFor].some(g => gifts.includes(g))) return false;
  }

  // Zodiac: no per-product data — all match anything
  // Availability: all products are In Stock
  if (filters.availability.size > 0 && filters.availability.has('Out Of Stock')) return false;

  if (filters.productType.size > 0) {
    const ok = [...filters.productType].some(t => {
      const pages = PROD_TYPE_PAGES[t.toLowerCase()];
      return pages ? pages.includes(pageCode) : true;
    });
    if (!ok) return false;
  }

  return true;
}

function sortProducts(products, sortOrder) {
  const copy = [...products];
  if (sortOrder === 'old') return copy.reverse();
  return copy; // new to old = default; price sorting not applicable (all Rs. 15)
}

// ── Animation element per grid (stored on grid object) ────────────────────
function getAnimEl(grid) {
  // Clean up any old animation for THIS grid
  if (grid._anim) {
    grid._anim.remove();
    grid._anim = null;
  }
  // Create fresh animation element
  const tmp = document.createElement('div');
  tmp.innerHTML = getLoadingHTML();
  const el = tmp.firstElementChild;
  el.id = 'grid-load-anim-' + Math.random().toString(36).slice(2, 9);
  el.style.display = 'none';
  grid._anim = el;
  return el;
}

// ── Chunk loader (called on init and on every filter change) ──────────────
function setupChunkLoader(grid, products, catFolders, catNames, pageCode) {
  // Tear down previous observer
  if (grid._obs) { grid._obs.disconnect(); grid._obs = null; }

  // Clean up old sentinel & animation for THIS grid
  document.getElementById('grid-sentinel')?.remove();
  if (grid._anim) { grid._anim.remove(); grid._anim = null; }

  grid.innerHTML = '';
  let loaded = appendChunk(grid, products, 0, catFolders, catNames);
  if (loaded >= products.length) {
    // All products fit in first chunk — done
    return;
  }

  // Create animation element (stored on grid, not global)
  const animEl = getAnimEl(grid);
  grid.after(animEl);

  // Sentinel sits after the animation
  const sentinel = document.createElement('div');
  sentinel.id = 'grid-sentinel';
  sentinel.style.cssText = 'height:1px;width:100%;';
  animEl.after(sentinel);

  const isHome = pageCode === 'HOME';
  let busy = false;

  const obs = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting || busy) return;
    busy = true;
    obs.unobserve(sentinel);

    // Show tetromino animation for 2 seconds max then load next chunk
    animEl.style.display = 'flex';
    setTimeout(() => {
      requestAnimationFrame(() => {
        loaded = appendChunk(grid, products, loaded, catFolders, catNames);
        animEl.style.display = 'none';
        busy = false;
        if (loaded < products.length) obs.observe(sentinel);
        else { sentinel.remove(); animEl.remove(); }
      });
    }, 2000);
  }, { rootMargin: '50px' });

  grid._obs = obs;
  obs.observe(sentinel);
}

// ── Filter wiring ─────────────────────────────────────────────────────────
function initFilters(grid, allProducts, catFolders, catNames, pageCode) {
  const section = document.querySelector('.filters-section');
  if (!section) return;

  const state = {
    theme: new Set(), vibe: new Set(), giftFor: new Set(),
    zodiac: new Set(), availability: new Set(), productType: new Set(),
    sort: 'new',
  };

  function rerender() {
    let products = allProducts.filter(r => matchesFilters(r, state));
    products = sortProducts(products, state.sort);
    setupChunkLoader(grid, products, catFolders, catNames, pageCode);
  }

  function pillKey(wrapper) {
    const t = wrapper.querySelector('.filter-pill')?.textContent?.trim().toLowerCase() || '';
    if (t.startsWith('theme'))   return 'theme';
    if (t.startsWith('vibe'))    return 'vibe';
    if (t.startsWith('gift'))    return 'giftFor';
    if (t.startsWith('zodiac'))  return 'zodiac';
    if (t.startsWith('avail'))   return 'availability';
    if (t.startsWith('product')) return 'productType';
    return null;
  }

  section.querySelectorAll('.filter-wrapper').forEach(wrapper => {
    const key = pillKey(wrapper);
    if (!key) return; // sort wrapper handled below

    wrapper.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const label = cb.closest('.filter-option')?.querySelector('.option-text')?.textContent?.trim();
        if (!label) return;
        cb.checked ? state[key].add(label) : state[key].delete(label);
        const cnt = wrapper.querySelector('.selected-count');
        if (cnt) cnt.textContent = state[key].size + ' selected';
        rerender();
      });
    });

    wrapper.querySelector('.reset-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      wrapper.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; });
      state[key].clear();
      const cnt = wrapper.querySelector('.selected-count');
      if (cnt) cnt.textContent = '0 selected';
      rerender();
    });
  });

  // Sort radios
  section.querySelectorAll('input[type="radio"][name="sort"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      const label = radio.closest('.filter-option')?.querySelector('.option-text')?.textContent?.trim().toLowerCase() || '';
      state.sort = label.includes('old to new') ? 'old'
        : label.includes('low to high') || label.includes('high to low') ? 'new' // all same price
        : 'new';
      // Update sort pill text (preserve the SVG child, only change text node)
      const sortPill = section.querySelector('.sort-pill');
      if (sortPill) {
        const svgEl = sortPill.querySelector('svg');
        const text = radio.closest('.filter-option')?.querySelector('.option-text')?.textContent?.trim() || 'Sort';
        // Replace only the text node, keep SVG intact
        const firstChild = sortPill.firstChild;
        if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
          firstChild.textContent = text + ' ';
        } else {
          sortPill.insertBefore(document.createTextNode(text + ' '), svgEl || null);
        }
      }
      rerender();
    });
  });
}

// ── Stock status (admin-controlled, checked on every page load) ───────────
const STOCK_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzCl2byGPvw17w4axjT7iLxrxPlTNPggDFbwMNuVHM7uDW01o1StjdufxQF9qE8p7cNvw/exec";

function showOutOfStockBanner(grid) {
  if (document.querySelector('.oos-banner')) return;
  const banner = document.createElement('div');
  banner.className = 'oos-banner';
  banner.innerHTML = `
    <span>This collection is currently <strong>Out of Stock</strong>.</span>
    <button type="button" class="oos-notify-btn">Notify Me When Available</button>
  `;
  grid.parentNode.insertBefore(banner, grid);
  banner.querySelector('.oos-notify-btn').addEventListener('click', () => {
    alert("Thanks! We'll notify you when this collection is back in stock.");
  });
}

function disableAddToCart(root = document) {
  root.querySelectorAll('.add-to-cart-btn, .qv-add-to-cart-btn, #qv-add-btn').forEach(btn => {
    if (btn.dataset.oosApplied) return;
    btn.dataset.oosApplied = '1';
    btn.disabled = true;
    btn.classList.add('oos-disabled');
    btn.textContent = 'Out of Stock';
  });
}

async function applyStockStatus(pageCode, grid) {
  if (!pageCode || pageCode === 'HOME') return;
  try {
    const resp = await fetch(`${STOCK_SCRIPT_URL}?action=getStock`);
    const body = await resp.json();
    const entry = body?.stock?.[pageCode];
    if (entry && entry.inStock === false) {
      if (grid) showOutOfStockBanner(grid);
      disableAddToCart();
      document.body.classList.add('page-out-of-stock');
      // Cards keep loading via infinite scroll after this check runs —
      // keep disabling new "Add to cart" buttons as they're appended.
      if (grid) {
        const obs = new MutationObserver(() => disableAddToCart(grid));
        obs.observe(grid, { childList: true });
      }
    }
  } catch (err) {
    // Stock check is best-effort — never block shopping if the backend is unreachable
  }
}

// ── Main export ───────────────────────────────────────────────────────────
export async function initProductGrid() {
  const grid = document.querySelector('#products-carousel, .products-grid');
  if (!grid) return;

  const [{ CATALOGUE, CAT_FOLDERS, CAT_NAMES }] = await Promise.all([
    import('./catalogue-data.js'),
    loadImageDriveMap()
  ]);
  const pageCode = detectPage();
  const allProducts = getProductsForPage(CATALOGUE, pageCode);
  if (!allProducts.length) return;

  setupChunkLoader(grid, allProducts, CAT_FOLDERS, CAT_NAMES, pageCode);
  initFilters(grid, allProducts, CAT_FOLDERS, CAT_NAMES, pageCode);
  applyStockStatus(pageCode, grid);
}
