// ─────────────────────────────────────────────────────────────────────────
// SOLEN — Cinematic luxury cart
// Cart state (localStorage), open/close, render, add/remove/qty, totals.
// ─────────────────────────────────────────────────────────────────────────

(function () {
  // ── Catalog ────────────────────────────────────────────────────────────
  // Mirrors the engineering cards. Each product has the meta the cart needs.
  const CATALOG = [
    {
      id: 'aureo-i',
      series: 'Aureo I',
      title: 'Monocrystalline glass cell',
      subtitle: 'Roof-integrated capture',
      price: 1840,
      unit: 'per module',
      img: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&q=80&auto=format&fit=crop',
      specs: ['440 W', '22.6% η', '1.96 m²'],
    },
    {
      id: 'aureo-ii',
      series: 'Aureo II',
      title: 'Liquid-immersed inverter',
      subtitle: 'Conversion & control',
      price: 6400,
      unit: 'per unit',
      img: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=600&q=80&auto=format&fit=crop',
      specs: ['12 kW', '98.4% η', '0 dB'],
    },
    {
      id: 'aureo-iii',
      series: 'Aureo III',
      title: 'Modular LFP reservoir',
      subtitle: 'Stackable storage',
      price: 18200,
      unit: 'per stack',
      img: 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=600&q=80&auto=format&fit=crop',
      specs: ['40 kWh', '10,000 cy', '96% rec.'],
    },
    {
      id: 'aureo-iv',
      series: 'Aureo IV',
      title: 'Continuous flush mount',
      subtitle: 'Architectural frame',
      price: 4900,
      unit: 'per residence',
      img: 'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=600&q=80&auto=format&fit=crop',
      specs: ['≤ 4 mm', 'EN 12211', '40 yr'],
    },
    {
      id: 'aureo-v',
      series: 'Aureo V',
      title: 'Companion energy OS',
      subtitle: 'On-device ambient interface',
      price: 0,
      included: true,
      unit: 'included with installation',
      img: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&q=80&auto=format&fit=crop',
      specs: ['On-device AI', 'HomeKit / Matter', 'Encrypted'],
    },
  ];

  const INSTALLATION_FEE = 12000;
  const CONSULTATION_FEE = 1200;
  const KWH_PER_MODULE = 0.55; // rough annual MWh equivalent per unit, illustrative

  // ── State ──────────────────────────────────────────────────────────────
  const STORAGE = 'solen-cart-v1';
  let cart = {};
  try {
    cart = JSON.parse(localStorage.getItem(STORAGE) || '{}');
  } catch (_) { cart = {}; }

  function persist() {
    try { localStorage.setItem(STORAGE, JSON.stringify(cart)); } catch (_) {}
  }

  function totalItems() {
    return Object.values(cart).reduce((a, q) => a + q, 0);
  }

  function getProduct(id) { return CATALOG.find((p) => p.id === id); }

  function subtotal() {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const p = getProduct(id);
      return sum + (p ? p.price * qty : 0);
    }, 0);
  }

  function annualOutputMWh() {
    // illustrative: each cell module adds 0.55 MWh/yr; inverter/reservoir baseline
    const cells   = (cart['aureo-i'] || 0) * 0.66;
    const inverters = (cart['aureo-ii'] || 0) * 0.2;
    const storage   = (cart['aureo-iii'] || 0) * 0.4;
    return Math.max(0, cells + inverters + storage);
  }

  // ── DOM helpers ────────────────────────────────────────────────────────
  const fmt = (n) => n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // ── Cart icon (badge updates) ──────────────────────────────────────────
  function updateBadge() {
    const badge = document.querySelector('.nav-cart .badge');
    if (!badge) return;
    const n = totalItems();
    badge.textContent = n;
    badge.classList.toggle('is-empty', n === 0);
  }

  // ── Add-to-cart from product cards ─────────────────────────────────────
  function add(id, qty = 1) {
    cart[id] = (cart[id] || 0) + qty;
    if (cart[id] < 0) cart[id] = 0;
    if (cart[id] === 0) delete cart[id];
    persist();
    updateBadge();
    render();
    pulse(id);
  }
  function setQty(id, qty) {
    if (qty <= 0) delete cart[id];
    else cart[id] = qty;
    persist();
    updateBadge();
    render();
  }
  function remove(id) {
    delete cart[id];
    persist();
    updateBadge();
    render();
  }

  // Pulse the cart icon when an item is added (cinematic confirmation)
  function pulse(addedId) {
    const icon = document.querySelector('.nav-cart');
    if (!icon) return;
    icon.classList.remove('is-pulsing');
    // force reflow so the animation can restart
    void icon.offsetWidth;
    icon.classList.add('is-pulsing');

    // floating gold confirmation dot
    const card = document.querySelector(`.eng-card[data-pid="${addedId}"]`);
    if (!card || !icon) return;
    const startR = card.getBoundingClientRect();
    const endR = icon.getBoundingClientRect();
    const dot = document.createElement('div');
    dot.className = 'cart-fly';
    dot.style.left = startR.left + startR.width / 2 + 'px';
    dot.style.top = startR.top + 80 + 'px';
    document.body.appendChild(dot);
    requestAnimationFrame(() => {
      dot.style.transform = `translate(${endR.left + endR.width/2 - (startR.left + startR.width/2)}px,
                                       ${endR.top + endR.height/2 - (startR.top + 80)}px) scale(0.4)`;
      dot.style.opacity = '0';
    });
    setTimeout(() => dot.remove(), 900);
  }

  // ── Cart overlay open / close ──────────────────────────────────────────
  const overlay = () => document.getElementById('cartOverlay');

  function open() {
    const o = overlay();
    if (!o) return;
    render();
    o.classList.add('is-open');
    document.body.classList.add('cart-open');
    // disable Lenis if available
    if (window.__lenis) window.__lenis.stop && window.__lenis.stop();
  }
  function close() {
    const o = overlay();
    if (!o) return;
    o.classList.remove('is-open');
    document.body.classList.remove('cart-open');
    if (window.__lenis) window.__lenis.start && window.__lenis.start();
  }

  // ── Render the cart overlay contents ───────────────────────────────────
  function render() {
    const list = document.querySelector('.cart-list');
    const sum  = document.querySelector('.cart-summary');
    if (!list || !sum) return;

    const ids = Object.keys(cart);
    if (ids.length === 0) {
      list.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-glyph">◷</div>
          <h3>Your composition is empty.</h3>
          <p>Begin by selecting modules from the engineering chapter.</p>
          <button class="btn-cart-cta" type="button" data-cart-action="close">Return to chapters</button>
        </div>`;
    } else {
      list.innerHTML = ids.map((id) => {
        const p = getProduct(id); if (!p) return '';
        const qty = cart[id];
        const line = p.included ? 'Included' : `€ ${fmt(p.price * qty)}`;
        const unit = p.included ? '' : `€ ${fmt(p.price)} ${p.unit}`;
        return `
        <article class="cart-line" data-pid="${id}">
          <div class="cart-thumb"><img src="${p.img}" alt="${p.title}"></div>
          <div class="cart-info">
            <div class="cart-series">${p.series}</div>
            <h4 class="cart-title">${p.title}</h4>
            <div class="cart-subtitle">${p.subtitle}</div>
            <div class="cart-specs">${p.specs.map(s => `<span>${s}</span>`).join('')}</div>
          </div>
          <div class="cart-controls">
            <div class="cart-qty">
              <button data-cart-action="dec" data-id="${id}" aria-label="Decrease">−</button>
              <span>${qty}</span>
              <button data-cart-action="inc" data-id="${id}" aria-label="Increase">+</button>
            </div>
            <div class="cart-line-price">${line}</div>
            <div class="cart-line-unit">${unit}</div>
            <button class="cart-remove" data-cart-action="remove" data-id="${id}" aria-label="Remove">Remove</button>
          </div>
        </article>`;
      }).join('');
    }

    // Summary
    const sub = subtotal();
    const consult = ids.length ? CONSULTATION_FEE : 0;
    const inst    = ids.length ? INSTALLATION_FEE : 0;
    const total   = sub + consult + inst;
    const mwh     = annualOutputMWh();

    sum.querySelector('[data-sum="subtotal"]').textContent = '€ ' + fmt(sub);
    sum.querySelector('[data-sum="installation"]').textContent = inst ? '€ ' + fmt(inst) : '—';
    sum.querySelector('[data-sum="consultation"]').textContent = consult ? '€ ' + fmt(consult) : '—';
    sum.querySelector('[data-sum="output"]').textContent = mwh ? mwh.toFixed(1) + ' MWh' : '—';
    sum.querySelector('[data-sum="total"]').textContent = '€ ' + fmt(total);

    // Update item count in header
    const headerCount = document.querySelector('.cart-headline .count');
    if (headerCount) headerCount.textContent = totalItems();
  }

  // ── Init: event delegation ─────────────────────────────────────────────
  function init() {
    updateBadge();

    // Cart icon click
    document.addEventListener('click', (e) => {
      const cartBtn = e.target.closest('.nav-cart');
      if (cartBtn) { e.preventDefault(); open(); return; }
      const action = e.target.closest('[data-cart-action]');
      if (!action) return;
      const op = action.dataset.cartAction;
      const id = action.dataset.id;
      e.preventDefault();
      switch (op) {
        case 'open':  open(); break;
        case 'close': close(); break;
        case 'add':   add(id, 1); break;
        case 'inc':   setQty(id, (cart[id] || 0) + 1); break;
        case 'dec':   setQty(id, Math.max(0, (cart[id] || 0) - 1)); break;
        case 'remove': remove(id); break;
        case 'checkout':
          // smooth-scroll to consultation section inside cart
          const c = document.querySelector('.cart-consult');
          if (c && c.scrollIntoView) c.scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
      }
    });

    // ESC closes cart
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('cart-open')) close();
    });

    // Form submission (placeholder, no backend)
    const form = document.querySelector('.cart-consult-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        showSuccess(data);
        // Reset form quietly after a beat so the next visit is clean
        setTimeout(() => form.reset(), 800);
      });
    }
  }

  // ── Cinematic order-confirmation overlay ───────────────────────────────
  function genRef() {
    // SLN-XXXXXX where X is base36 (uppercase)
    const r = Math.floor(Math.random() * 36 ** 6).toString(36).toUpperCase().padStart(6, '0');
    return 'SLN-' + r;
  }
  function showSuccess(data) {
    const overlay = document.getElementById('orderSuccess');
    if (!overlay) return;
    // populate dynamic fields
    const refEl = overlay.querySelector('[data-success="ref"]');
    const emEl  = overlay.querySelector('[data-success="email"]');
    if (refEl) refEl.textContent = genRef();
    if (emEl)  emEl.textContent  = (data && data.email) ? data.email : '—';

    // open
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('success-open');
    // pause Lenis if we're somehow not in cart-open already
    if (window.__lenis && window.__lenis.stop) window.__lenis.stop();

    // Trigger the truck/box animation after the overlay has settled.
    const btn = overlay.querySelector('.order');
    if (btn) {
      btn.classList.remove('animate');
      // restart the chain
      void btn.offsetWidth;
      setTimeout(() => btn.classList.add('animate'), 600);
    }

    // Auto-clear the .animate flag after 10s so a re-open replays cleanly
    if (btn) setTimeout(() => btn.classList.remove('animate'), 10500);
  }

  function hideSuccess() {
    const overlay = document.getElementById('orderSuccess');
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('success-open');
    if (!document.body.classList.contains('cart-open') && window.__lenis && window.__lenis.start) {
      window.__lenis.start();
    }
  }

  // Wire close handlers (delegated)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-success-action]');
    if (!a) return;
    const op = a.dataset.successAction;
    if (op === 'close')    hideSuccess();
    if (op === 'continue') { hideSuccess(); /* user is already in cart — stay there */ }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('success-open')) hideSuccess();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose minimal API for debugging
  window.SOLEN = window.SOLEN || {};
  window.SOLEN.cart = { add, remove, setQty, open, close, state: () => ({ ...cart }), catalog: CATALOG };
  window.SOLEN.success = { show: showSuccess, hide: hideSuccess };
})();
