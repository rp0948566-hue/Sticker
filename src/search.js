const IMG_BASE = (import.meta.env?.VITE_IMAGE_BASE_URL ?? '/whatsapp catalogue').replace(/\/$/, '');

const NAME_PREFIXES = {
  MOV: 'Movie Poster', ANM: 'Anime Art', CAR: 'Car Design', SPO: 'Sports Art',
  MAR: 'Marvel Design', AST: 'Aesthetic Art', QOU: 'Motivational Quote',
  ART: 'Artist Print', VVG: 'Van Gogh Art', SONM: 'Song Poster',
  DEV: 'Devotional Art', VSN: 'Vision Board', GIR: 'Pink Lavender Art',
  SHCN: 'Shinchan Art', SC: 'Song Cover', A3: 'A3 Wall Poster',
  SPL: 'Split Poster', SPLA: 'Split Art Design', ANM3: 'New Anime Art',
  ANM2: 'Anime Mini Art',
};

function makeName(cc, fn, catNames) {
  const base = NAME_PREFIXES[cc] || (catNames[cc] ? catNames[cc] + ' Art' : cc);
  const m = fn.match(/\((\d+)\)/) || fn.match(/(?:^|[^a-z])(\d+)(?=[.\s_(])/i);
  const n = m ? m[1] : null;
  return n ? `${base} #${n}` : base;
}

export function initSearch() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  // Build the fixed search panel, injected once
  const panel = document.createElement('div');
  panel.id = 'site-search-panel';
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = `
    <div class="sp-inner">
      <i class="fa-solid fa-magnifying-glass sp-icon"></i>
      <input type="search" id="sp-input" placeholder="Search stickers, posters, skins..." autocomplete="off" spellcheck="false">
      <button id="sp-close" aria-label="Close search"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div id="sp-results" class="sp-results" role="listbox" aria-label="Search results"></div>
  `;
  document.body.appendChild(panel);

  const spInput = document.getElementById('sp-input');
  const spResults = document.getElementById('sp-results');
  const spClose = document.getElementById('sp-close');

  function positionPanel() {
    panel.style.top = navbar.offsetHeight + 'px';
  }
  positionPanel();
  window.addEventListener('resize', positionPanel, { passive: true });

  function openPanel() {
    positionPanel();
    panel.classList.add('active');
    panel.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => spInput.focus());
  }

  function closePanel() {
    panel.classList.remove('active');
    panel.setAttribute('aria-hidden', 'true');
    spInput.value = '';
    spResults.innerHTML = '';
  }

  // Search icon triggers (desktop + mobile menu)
  document.addEventListener('click', (e) => {
    if (e.target.closest('.search-btn') || e.target.closest('.search-btn-mobile')) {
      e.preventDefault();
      panel.classList.contains('active') ? closePanel() : openPanel();
    }
  });

  spClose.addEventListener('click', closePanel);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('active')) closePanel();
  });

  document.addEventListener('click', (e) => {
    if (
      panel.classList.contains('active') &&
      !panel.contains(e.target) &&
      !e.target.closest('.search-btn') &&
      !e.target.closest('.search-btn-mobile')
    ) closePanel();
  });

  // Pre-load catalogue data
  let CAT = null, CF = null, CN = null;
  import('./catalogue-data.js').then(m => {
    CAT = m.CATALOGUE;
    CF = m.CAT_FOLDERS;
    CN = m.CAT_NAMES;
  }).catch(() => {});

  let debounceTimer;
  spInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = spInput.value.trim().toLowerCase();
    if (!q) { spResults.innerHTML = ''; return; }

    debounceTimer = setTimeout(() => {
      if (!CAT) return;

      const hits = [];
      for (const r of CAT) {
        const [cc,, fn] = r;
        const name = makeName(cc, fn, CN);
        const haystack = name.toLowerCase() + ' ' + (CN[cc] || '').toLowerCase() + ' ' + cc.toLowerCase();
        if (haystack.includes(q)) {
          hits.push({ r, name });
          if (hits.length >= 8) break;
        }
      }

      if (!hits.length) {
        spResults.innerHTML = `<p class="sp-empty">No results for "<em>${spInput.value}</em>"</p>`;
        return;
      }

      const frag = document.createDocumentFragment();
      hits.forEach(({ r, name }) => {
        const [cc,, fn] = r;
        const src = encodeURI(`${IMG_BASE}/${CF[cc] || ''}/${fn}`);
        const div = document.createElement('div');
        div.className = 'sp-result';
        div.setAttribute('role', 'option');
        div.innerHTML = `
          <img src="${src}" alt="${name}" loading="lazy" onerror="this.style.visibility='hidden'">
          <div class="sp-result-info">
            <span class="sp-result-name">${name}</span>
            <span class="sp-result-price">Rs. 15.00</span>
          </div>
          <i class="fa-solid fa-up-right-from-square sp-arrow"></i>
        `;
        frag.appendChild(div);
      });
      spResults.innerHTML = '';
      spResults.appendChild(frag);
    }, 200);
  });
}
