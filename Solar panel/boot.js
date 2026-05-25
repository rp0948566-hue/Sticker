// ─────────────────────────────────────────────────────────────────────────
// SOLEN — Cinematic boot sequence
// Holds the loader on screen for ~2.6s, then fades it out as the hero
// timeline begins. Fires a `solen:boot-done` event so motion.js can sync.
// ─────────────────────────────────────────────────────────────────────────

(function () {
  const MIN_HOLD = 2400;     // minimum loader display (ms)
  const FADE_DURATION = 900; // loader fade-out (ms)

  // Lock body scroll while booting
  document.documentElement.classList.add('is-booting');

  const start = performance.now();

  function go() {
    const elapsed = performance.now() - start;
    const wait = Math.max(0, MIN_HOLD - elapsed);
    setTimeout(beginExit, wait);
  }

  function beginExit() {
    const boot = document.getElementById('boot');
    if (boot) boot.classList.add('is-leaving');
    document.documentElement.classList.remove('is-booting');
    document.documentElement.classList.add('is-booted');
    // Notify motion.js that hero can reveal
    window.dispatchEvent(new CustomEvent('solen:boot-done'));
    // Remove from DOM after the transition is complete
    setTimeout(() => { if (boot && boot.parentNode) boot.parentNode.removeChild(boot); },
               FADE_DURATION + 100);
  }

  // Start once the page has at least painted once + key fonts have loaded.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', go, { once: true });
  } else {
    go();
  }
})();
