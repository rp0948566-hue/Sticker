// Lenis smooth scroll + GSAP-driven cinematic reveals.
// Loaded after Lenis, GSAP, and ScrollTrigger CDN bundles.

(function () {
  if (typeof Lenis === 'undefined' || typeof gsap === 'undefined') return;

  const lenis = new Lenis({
    duration: 1.4,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    smoothTouch: false,
    wheelMultiplier: 0.9,
  });
  window.__lenis = lenis;
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  gsap.registerPlugin(ScrollTrigger);
  lenis.on('scroll', ScrollTrigger.update);

  // ── Split words/chars in [data-split] elements ────────────────────────────
  document.querySelectorAll('[data-split="words"]').forEach((el) => {
    const text = el.textContent.trim();
    el.innerHTML = '';
    text.split(/\s+/).forEach((w, i) => {
      const wrap = document.createElement('span');
      wrap.className = 'sp-word';
      const inner = document.createElement('span');
      inner.className = 'sp-word-inner';
      inner.textContent = w;
      wrap.appendChild(inner);
      el.appendChild(wrap);
      if (i < text.split(/\s+/).length - 1) el.appendChild(document.createTextNode(' '));
    });
  });

  document.querySelectorAll('[data-split="lines"]').forEach((el) => {
    // wrap each child line in a mask
    const html = el.innerHTML;
    const parts = html.split(/<br\s*\/?>/i);
    el.innerHTML = parts
      .map((p) => `<span class="sp-line"><span class="sp-line-inner">${p}</span></span>`)
      .join('');
  });

  // ── Hero opening sequence (waits for boot/loader to finish) ──────────────
  const heroTl = gsap.timeline({ paused: true, delay: 0.05 });
  heroTl
    .from('.hero-eyebrow', { opacity: 0, y: 14, duration: 1, ease: 'power3.out' })
    .from('.hero-title .sp-word-inner', {
      yPercent: 110,
      duration: 1.6,
      stagger: 0.07,
      ease: 'expo.out',
    }, '-=0.5')
    .from('.hero-sub .sp-line-inner', {
      yPercent: 110,
      duration: 1.2,
      stagger: 0.1,
      ease: 'expo.out',
    }, '-=1.0')
    .from('.hero-meta > *', {
      opacity: 0,
      y: 16,
      duration: 0.9,
      stagger: 0.08,
      ease: 'power3.out',
    }, '-=0.7')
    .from('.nav-inner > *', {
      opacity: 0,
      y: -10,
      duration: 0.9,
      stagger: 0.05,
      ease: 'power3.out',
    }, '-=1.2')
    .from('.scroll-cue', { opacity: 0, y: -10, duration: 0.9, ease: 'power3.out' }, '-=0.6');

  // Play the hero timeline only after the boot loader has exited.
  // If the boot completed before motion.js loaded, play right away.
  function playHero() {
    if (heroTl.progress() === 0 && !heroTl.isActive()) heroTl.play();
  }
  if (document.documentElement.classList.contains('is-booted')) {
    // Brief breath, then go
    gsap.delayedCall(0.15, playHero);
  } else {
    window.addEventListener('solen:boot-done', () => {
      gsap.delayedCall(0.05, playHero);
    }, { once: true });
    // Safety fallback: if boot.js never fires (e.g. it failed to load), play after 4s
    gsap.delayedCall(4.0, playHero);
  }

  // ── Generic scroll reveals ────────────────────────────────────────────────
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    const split = el.querySelectorAll('.sp-word-inner, .sp-line-inner');
    if (split.length) {
      gsap.from(split, {
        yPercent: 110,
        duration: 1.4,
        stagger: 0.05,
        ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 80%' },
      });
    } else {
      gsap.from(el, {
        opacity: 0,
        y: 30,
        filter: 'blur(10px)',
        duration: 1.3,
        ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 85%' },
      });
    }
  });

  // ── Image clip-path reveals ───────────────────────────────────────────────
  gsap.utils.toArray('[data-clip-reveal]').forEach((el) => {
    gsap.fromTo(
      el,
      { clipPath: 'inset(100% 0% 0% 0%)' },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: 1.8,
        ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 80%' },
      }
    );
    const inner = el.querySelector('img, .img-inner');
    if (inner) {
      gsap.fromTo(
        inner,
        { scale: 1.25 },
        {
          scale: 1,
          duration: 1.8,
          ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 80%' },
        }
      );
    }
  });

  // ── Parallax layers ───────────────────────────────────────────────────────
  gsap.utils.toArray('[data-parallax]').forEach((el) => {
    const speed = parseFloat(el.dataset.parallax) || 0.2;
    gsap.to(el, {
      yPercent: -speed * 100,
      ease: 'none',
      scrollTrigger: {
        trigger: el.closest('section') || el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
  });

  // ── Pinned manifesto: word-by-word opacity reveal (theme-safe) ────────────
  const manifesto = document.querySelector('.manifesto-text');
  if (manifesto) {
    const words = manifesto.querySelectorAll('.sp-word-inner');
    gsap.set(words, { opacity: 0.14 });
    gsap.to(words, {
      opacity: 1,
      stagger: 0.05,
      ease: 'none',
      scrollTrigger: {
        trigger: '.manifesto',
        start: 'top top',
        end: '+=120%',
        scrub: 0.5,
        pin: true,
      },
    });
  }

  // ── Pinned engineering horizontal scroll ──────────────────────────────────
  const horiz = document.querySelector('.engineering-track');
  if (horiz) {
    const cards = horiz.querySelectorAll('.eng-card');
    const totalShift = () => horiz.scrollWidth - window.innerWidth;
    gsap.to(horiz, {
      x: () => -totalShift(),
      ease: 'none',
      scrollTrigger: {
        trigger: '.engineering',
        start: 'top top',
        end: () => '+=' + totalShift(),
        scrub: 1,
        pin: true,
        invalidateOnRefresh: true,
      },
    });
  }

  // ── Magnetic buttons ──────────────────────────────────────────────────────
  // Removed per user request to disable all button animations.


  // ── Section dividers: drawing line ────────────────────────────────────────
  gsap.utils.toArray('.divider-line').forEach((el) => {
    gsap.fromTo(
      el,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: 1.6,
        ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 85%' },
      }
    );
  });

  // ── Section label letter-by-letter ────────────────────────────────────────
  gsap.utils.toArray('.section-label').forEach((el) => {
    gsap.from(el, {
      opacity: 0,
      x: -10,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  // ── Ecosystem flow lines ──────────────────────────────────────────────────
  document.querySelectorAll('.flow-path').forEach((path) => {
    const len = path.getTotalLength ? path.getTotalLength() : 800;
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    gsap.to(path, {
      strokeDashoffset: 0,
      duration: 2.4,
      ease: 'expo.out',
      scrollTrigger: { trigger: '.ecosystem', start: 'top 60%' },
    });
  });

  // ── Nav background after scroll ───────────────────────────────────────────
  ScrollTrigger.create({
    start: 100,
    end: 99999,
    onUpdate: (self) => {
      document.body.classList.toggle('scrolled', self.scroll() > 100);
    },
  });

  // ── Custom cursor ─────────────────────────────────────────────────────────
  const cursor = document.querySelector('.cursor');
  const cursorDot = document.querySelector('.cursor-dot');
  if (cursor && cursorDot && matchMedia('(pointer: fine)').matches) {
    const c = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const d = { x: c.x, y: c.y };
    window.addEventListener('mousemove', (e) => {
      c.x = e.clientX;
      c.y = e.clientY;
      cursorDot.style.transform = `translate(${c.x}px, ${c.y}px)`;
    });
    function loop() {
      d.x += (c.x - d.x) * 0.14;
      d.y += (c.y - d.y) * 0.14;
      cursor.style.transform = `translate(${d.x}px, ${d.y}px)`;
      requestAnimationFrame(loop);
    }
    loop();

    document.querySelectorAll('a, button, [data-magnetic], [data-cursor="hover"]').forEach((el) => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
    });
  }

  // ── Anchor smooth scroll via Lenis ────────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target, { offset: 0, duration: 1.6 });
        }
      }
    });
  });

  // ── Liquid cursor tracking on image surfaces ──────────────────────────────
  const liquidTargets = document.querySelectorAll('.silent-vis, .arch-img, .eng-card');
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    liquidTargets.forEach((el) => {
    let raf = null;
    let pendingX = 0, pendingY = 0;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      pendingX = ((e.clientX - r.left) / r.width) * 100;
      pendingY = ((e.clientY - r.top) / r.height) * 100;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--mx', pendingX + '%');
        el.style.setProperty('--my', pendingY + '%');
        raf = null;
      });
    };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', () => {
      el.style.setProperty('--mx', '50%');
      el.style.setProperty('--my', '50%');
    });
  });
  }


  // ── Floating "Connect" fan menu ────────────────────────────────────────
  const connect = document.querySelector('.connect-menu');
  if (connect) {
    const toggle = connect.querySelector('.connect-toggle');
    toggle.addEventListener('click', () => {
      const open = connect.classList.toggle('is-active');
      toggle.setAttribute('aria-expanded', String(open));
    });
    // Click-outside closes the fan
    document.addEventListener('click', (e) => {
      if (!connect.classList.contains('is-active')) return;
      if (!connect.contains(e.target)) {
        connect.classList.remove('is-active');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
    // ESC closes the fan
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && connect.classList.contains('is-active')) {
        connect.classList.remove('is-active');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // refresh after fonts load
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
