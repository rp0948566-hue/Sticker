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
};

const CAT_GIFT = {
  MOV:['Him','Anyone'],   ANM:['Anyone'],      CAR:['Him','Anyone'],
  SPO:['Him','Anyone'],   MAR:['Him','Anyone'],AST:['Her','Anyone'],
  QOU:['Yourself','Anyone'],ART:['Her','Anyone'],VVG:['Her','Anyone'],
  SONM:['Anyone'],        DEV:['Anyone'],      VSN:['Yourself','Anyone'],
  GIR:['Her','Friends','Anyone'],SHCN:['Kids','Anyone'],
  SC:['Anyone'],          A3:['Anyone'],       SPL:['Anyone'],
  SPLA:['Anyone'],        ANM3:['Anyone'],     ANM2:['Anyone'],
};

// Theme label (lowercase) → matching category codes
const THEME_MAP = {
  'anime':['ANM','ANM2','ANM3'],     'pop culture':['MOV','MAR'],
  'quotes':['QOU'],                   'movie':['MOV'],
  'marvels':['MAR'],                  'cars':['CAR'],
  'sports':['SPO'],                   'aesthetic':['AST'],
  'artist':['ART'],                   'van gogh':['VVG'],
  'songs':['SONM','SC'],              'devotional':['DEV'],
  'vision board':['VSN'],             'pink lavender':['GIR'],
  'shinchan':['SHCN'],               'a3':['A3'],
  'split':['SPL','SPLA'],            'new anime':['ANM3'],
};

// Product type label (lowercase) → page codes that match
const PROD_TYPE_PAGES = {
  'laptop skins':['M'], 'macbook':['M'], 'card skin':['C'],
  'sticker sheets':['C','A'], 'sticker packs':['A'],
  'accessory':['A'],          'frame':['F'],
};

// ── Helpers ───────────────────────────────────────────────────────────────
export function detectPage() {
  const p = window.location.pathname.toUpperCase();
  if (p.includes('MACBOOK'))  return 'M';
  if (p.includes('CARD'))     return 'C';
  if (p.includes('MYSTERY'))  return 'MYSTERY';
  if (p.includes('FRAME'))    return 'F';
  if (p.includes('ACCESSORIES')) return 'A';
  if (p.includes('NEW') && p.includes('ARRIVAL')) return 'N';
  return 'HOME';
}

export function isDynamicPage() {
  const pageCode = detectPage();
  return ['M', 'C', 'A', 'F', 'N'].includes(pageCode);
}

function getProductsForPage(catalogue, pageCode) {
  if (pageCode === 'HOME') return [];
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
  ANM2: 'Anime Mini Art',
};

function getProductName(cc, filename, catNames) {
  const base = PROD_LABELS[cc] || (catNames[cc] ? catNames[cc] + ' Art' : cc);
  const m = filename.match(/\((\d+)\)/) || filename.match(/(?:^|[^a-z])(\d+)(?=[.\s_(])/i);
  const n = m ? m[1] : null;
  return n ? `${base} #${n}` : base;
}

function revCount(idx) { return 12 + ((idx * 41 + 17) % 238); }

function createCard(record, idx, catFolders, catNames) {
  const [cc,, filename] = record;
  const folder = catFolders[cc] || '';
  const imgSrc = encodeURI(`/whatsapp catalogue/${folder}/${filename}`);
  const name = getProductName(cc, filename, catNames);
  const card = document.createElement('div');
  card.className = 'product-card';
  card.dataset.cc = cc;
  card.innerHTML = `
    <div class="product-image-container">
      <div class="save-badge">Save Rs. 64.00</div>
      <div class="placeholder-image">
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
      <div class="card-selectors">
        <div class="card-sel-row">
          <span class="card-sel-label">Size</span>
          <div class="card-pills">
            <button class="card-pill" data-group="size" data-val='3"×3"'>3"×3"</button>
            <button class="card-pill" data-group="size" data-val='4"×4"'>4"×4"</button>
            <button class="card-pill active" data-group="size" data-val='5"×5"'>5"×5"</button>
          </div>
        </div>
        <div class="card-sel-row">
          <span class="card-sel-label">Frame</span>
          <div class="card-pills">
            <button class="card-pill active" data-group="frame" data-val="without">Without</button>
            <button class="card-pill" data-group="frame" data-val="with">With</button>
          </div>
        </div>
      </div>
      <button class="add-to-cart-btn">Add to cart</button>
    </div>
  `;
  return card;
}

function appendChunk(grid, products, startIdx, catFolders, catNames) {
  const end = Math.min(startIdx + CHUNK, products.length);
  const frag = document.createDocumentFragment();
  for (let i = startIdx; i < end; i++) {
    frag.appendChild(createCard(products[i], i, catFolders, catNames));
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

// ── Main export ───────────────────────────────────────────────────────────
export async function initProductGrid() {
  const grid = document.querySelector('#products-carousel, .products-grid');
  if (!grid) return;

  const { CATALOGUE, CAT_FOLDERS, CAT_NAMES } = await import('./catalogue-data.js');
  const pageCode = detectPage();
  const allProducts = getProductsForPage(CATALOGUE, pageCode);
  if (!allProducts.length) return;

  setupChunkLoader(grid, allProducts, CAT_FOLDERS, CAT_NAMES, pageCode);
  initFilters(grid, allProducts, CAT_FOLDERS, CAT_NAMES, pageCode);
}
