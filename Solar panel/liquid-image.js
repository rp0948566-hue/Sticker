// ─────────────────────────────────────────────────────────────────────────
// SOLEN — Liquid image hover effect
// Real WebGL shader-based fluid distortion + chromatic aberration + glow.
// Applies to every <img data-liquid> on the page.
// Requires Three.js loaded globally.
// ─────────────────────────────────────────────────────────────────────────

(function () {
  if (typeof THREE === 'undefined') return;

  // Single shared TextureLoader (Three caches images by URL)
  const texLoader = new THREE.TextureLoader();
  texLoader.crossOrigin = 'anonymous';

  // ── Vertex shader ────────────────────────────────────────────────────────
  const VERT = /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  // ── Fragment shader: liquid glass distortion ─────────────────────────────
  // - vUv goes 0..1 across the image
  // - uMouse is the smoothed cursor in image-space (0..1, y flipped to GL)
  // - uStrength is the eased hover intensity (0 → 1)
  // - uTime drives subtle ambient breath
  // - uAspect corrects radial math so the "drop" is circular even on
  //   non-square images
  // - Chromatic aberration splits R/G/B along the cursor-to-pixel direction
  // - A soft gold glow highlights the touched zone
  const FRAG = /* glsl */`
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTex;
    uniform vec2 uMouse;
    uniform vec2 uPrevMouse;
    uniform float uStrength;
    uniform float uTime;
    uniform vec2 uAspect; // (1, h/w) or (w/h, 1)
    uniform float uVel;   // recent pointer velocity, 0..1

    // 2d hash + value noise (cheap, ambient breath)
    float hash21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
    float n2(vec2 p){
      vec2 i = floor(p); vec2 f = fract(p);
      float a = hash21(i);
      float b = hash21(i + vec2(1.0,0.0));
      float c = hash21(i + vec2(0.0,1.0));
      float d = hash21(i + vec2(1.0,1.0));
      vec2 u = f*f*(3.0-2.0*f);
      return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
    }

    void main() {
      // aspect-corrected coordinates so a "circle" is actually circular
      vec2 uv = vUv;
      vec2 m  = uMouse;
      vec2 pm = uPrevMouse;
      vec2 d  = (uv - m) * uAspect;          // delta from cursor
      vec2 dp = (uv - pm) * uAspect;
      float dist  = length(d);
      float distP = length(dp);

      // ambient breath (very faint, never zero — keeps photo "alive")
      float breath = (n2(uv * 3.2 + uTime * 0.18) - 0.5) * 0.012;

      // primary blob falloff around cursor
      float blob = exp(-dist * dist * 22.0);

      // secondary blob trailing toward previous mouse → "drip"
      float trail = exp(-distP * distP * 18.0) * 0.7;

      // soft ripple ring (subtle, low frequency)
      float ring = sin(dist * 28.0 - uTime * 2.4) * 0.5 * exp(-dist * 4.5);

      // total push amount
      float push = (blob * 1.0 + trail * 0.6 + ring * 0.15) * uStrength;
      push += breath; // ambient

      // displacement direction: outward from cursor, with a velocity-aligned drag
      vec2 dir = d / max(dist, 0.0001);
      vec2 dragDir = (m - pm);
      vec2 disp = dir * push * 0.045 + dragDir * push * 0.4 * (0.4 + uVel);

      vec2 uvDist = uv + disp;

      // chromatic aberration — split R/G/B along displacement direction
      float ca = (blob * 0.9 + trail * 0.4) * uStrength * 0.010 + 0.0005;
      vec2 caDir = dir;
      float r = texture2D(uTex, uvDist + caDir * ca * 1.0).r;
      float g = texture2D(uTex, uvDist).g;
      float b = texture2D(uTex, uvDist - caDir * ca * 1.0).b;
      vec3 col = vec3(r, g, b);

      // soft luminous "wet" highlight near cursor (golden)
      vec3 glow = vec3(1.0, 0.78, 0.42) * (blob * 0.18 + trail * 0.08) * uStrength;
      col += glow;

      // slight saturation lift inside the touched zone
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(lum), col, 1.0 + (blob * 0.25 * uStrength));

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  // ── Per-image instance ──────────────────────────────────────────────────
  class LiquidImage {
    constructor(img) {
      this.img = img;
      this.host = img.parentElement; // the relatively-positioned wrap
      this.size = { w: 0, h: 0 };
      this.target = { x: 0.5, y: 0.5, s: 0 };
      this.smooth = { x: 0.5, y: 0.5, s: 0 };
      this.prev = { x: 0.5, y: 0.5 };
      this.vel = 0;
      this.lastMove = 0;
      this.visible = false;
      this.ready = false;
      this.disposed = false;

      this._init();
    }

    _init() {
      // Build renderer
      this.renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: 'high-performance',
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const canvas = this.renderer.domElement;
      canvas.className = 'liquid-canvas';
      canvas.style.cssText = `
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        z-index: 0;
        display: block;
        pointer-events: none;
      `;

      // Make sure host is positioned and clipping
      const hs = getComputedStyle(this.host);
      if (hs.position === 'static') this.host.style.position = 'relative';
      this.host.style.overflow = this.host.style.overflow || 'hidden';

      this.host.appendChild(canvas);

      // Scene
      this.scene = new THREE.Scene();
      this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.01, 10);
      this.camera.position.z = 1;

      const geo = new THREE.PlaneGeometry(1, 1, 1, 1);

      // Texture (lazy-load via Three's loader; supports CORS for unsplash)
      this.material = new THREE.ShaderMaterial({
        uniforms: {
          uTex:       { value: null },
          uMouse:     { value: new THREE.Vector2(0.5, 0.5) },
          uPrevMouse: { value: new THREE.Vector2(0.5, 0.5) },
          uStrength:  { value: 0 },
          uTime:      { value: 0 },
          uAspect:    { value: new THREE.Vector2(1, 1) },
          uVel:       { value: 0 },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
      });

      this.mesh = new THREE.Mesh(geo, this.material);
      this.scene.add(this.mesh);

      // Texture load — try the existing <img> first (it's likely cached);
      // fall back to TextureLoader if crossOrigin needs to be (re)negotiated.
      const src = this.img.currentSrc || this.img.src;
      const onTex = (tex) => {
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        tex.colorSpace = THREE.SRGBColorSpace || tex.colorSpace;
        this.material.uniforms.uTex.value = tex;
        this.ready = true;
        // Hide the source <img> visually now that we own the pixels
        this.img.style.opacity = '0';
        this.img.style.visibility = 'hidden';
        this._resize();
      };

      texLoader.load(src, onTex, undefined, () => {
        // CORS or load fail — leave the <img> visible, abort canvas takeover
        this.dispose();
      });

      // Resize observer
      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(this.host);
      window.addEventListener('resize', this._resizeBound = () => this._resize());

      // Hover handlers (on host so the area is whole-card sized)
      this._onMove  = this._onMove.bind(this);
      this._onEnter = this._onEnter.bind(this);
      this._onLeave = this._onLeave.bind(this);
      this.host.addEventListener('mousemove', this._onMove);
      this.host.addEventListener('mouseenter', this._onEnter);
      this.host.addEventListener('mouseleave', this._onLeave);
      // For touch — soft pulse on tap
      this.host.addEventListener('touchstart', this._onEnter, { passive: true });
      this.host.addEventListener('touchend', this._onLeave, { passive: true });

      // Visibility observer (only render when on screen)
      this._io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { this.visible = e.isIntersecting; });
      }, { threshold: 0.05 });
      this._io.observe(this.host);

      // Kick the render loop
      this._tickBound = this._tick.bind(this);
      requestAnimationFrame(this._tickBound);
    }

    _resize() {
      const r = this.host.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width));
      const h = Math.max(1, Math.round(r.height));
      if (w === this.size.w && h === this.size.h) return;
      this.size.w = w; this.size.h = h;
      this.renderer.setSize(w, h, false);
      // Aspect: longer axis = 1, shorter axis = ratio. So the "drop" stays
      // visually circular even when the image is wide or tall.
      if (w >= h) {
        this.material.uniforms.uAspect.value.set(w / h, 1);
      } else {
        this.material.uniforms.uAspect.value.set(1, h / w);
      }
    }

    _onMove(e) {
      const r = this.host.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = 1 - (e.clientY - r.top) / r.height; // flip for GL
      const now = performance.now();
      const dt = Math.max(1, now - this.lastMove);
      const dx = x - this.target.x;
      const dy = y - this.target.y;
      const v = Math.min(1, Math.hypot(dx, dy) / (dt * 0.0015));
      this.vel = this.vel * 0.6 + v * 0.4;
      this.lastMove = now;
      this.target.x = x;
      this.target.y = y;
    }
    _onEnter() {
      this.target.s = 1;
    }
    _onLeave() {
      this.target.s = 0;
      this.vel = 0;
    }

    _tick(t) {
      if (this.disposed) return;
      requestAnimationFrame(this._tickBound);
      if (!this.ready || !this.visible) return;
      const u = this.material.uniforms;

      // Save previous smoothed position before stepping → drives the trail
      u.uPrevMouse.value.copy(u.uMouse.value);

      // Premium cinematic easing — overshoot-free, framerate-tolerant
      const easeP = 0.12;
      const easeS = 0.045;
      this.smooth.x += (this.target.x - this.smooth.x) * easeP;
      this.smooth.y += (this.target.y - this.smooth.y) * easeP;
      this.smooth.s += (this.target.s - this.smooth.s) * easeS;
      this.vel *= 0.92;

      u.uMouse.value.set(this.smooth.x, this.smooth.y);
      u.uStrength.value = this.smooth.s;
      u.uVel.value = this.vel;
      u.uTime.value = t * 0.001;

      this.renderer.render(this.scene, this.camera);
    }

    dispose() {
      this.disposed = true;
      try { this._ro && this._ro.disconnect(); } catch (e) {}
      try { this._io && this._io.disconnect(); } catch (e) {}
      window.removeEventListener('resize', this._resizeBound);
      this.host.removeEventListener('mousemove', this._onMove);
      this.host.removeEventListener('mouseenter', this._onEnter);
      this.host.removeEventListener('mouseleave', this._onLeave);
      try {
        this.renderer.dispose();
        this.material.dispose();
        this.mesh.geometry.dispose();
        if (this.material.uniforms.uTex.value) this.material.uniforms.uTex.value.dispose();
        if (this.renderer.domElement && this.renderer.domElement.parentElement) {
          this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
        }
        this.img.style.opacity = '';
        this.img.style.visibility = '';
      } catch (e) {}
    }
  }

  // ── Auto-init for every <img data-liquid> ──────────────────────────────
  function init() {
    const targets = document.querySelectorAll('img[data-liquid]');
    targets.forEach((img) => {
      // Wait until the image dimensions are known so the canvas sizes correctly.
      const start = () => new LiquidImage(img);
      if (img.complete && img.naturalWidth) start();
      else img.addEventListener('load', start, { once: true });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
