// Cinematic WebGL atmosphere: ambient sun, drifting particles, soft fog.
// Uses Three.js loaded via CDN before this script.

(function () {
  const canvas = document.getElementById('atmosphere');
  if (!canvas || typeof THREE === 'undefined') return;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07060a, 0.06);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 8);

  // ── SUN: a soft glowing sphere with a halo sprite ──────────────────────────
  const sunGeo = new THREE.SphereGeometry(1.6, 64, 64);
  const sunMat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uColorCore: { value: new THREE.Color(0xffe6b0) },
      uColorEdge: { value: new THREE.Color(0xff9a2a) },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColorCore;
      uniform vec3 uColorEdge;
      varying vec3 vNormal;
      varying vec3 vPosition;

      // simple noise
      float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float noise(vec3 p) {
        vec3 i = floor(p); vec3 f = fract(p);
        f = f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)), f.x),
                       mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                       mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
      }

      void main() {
        float fres = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.2);
        float n = noise(vPosition * 2.0 + uTime * 0.15);
        vec3 col = mix(uColorCore, uColorEdge, fres);
        col *= 0.85 + 0.25 * n;
        float alpha = smoothstep(0.0, 1.0, 1.0 - fres * 0.6);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  sun.position.set(4.5, 0.6, -2);
  scene.add(sun);

  // halo
  const haloGeo = new THREE.PlaneGeometry(14, 14);
  const haloMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(0xffaf37) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 uColor;
      void main() {
        vec2 c = vUv - 0.5;
        float d = length(c);
        float a = smoothstep(0.5, 0.0, d);
        a = pow(a, 2.4);
        gl_FragColor = vec4(uColor, a * 0.55);
      }
    `,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.position.copy(sun.position);
  halo.position.z -= 0.1;
  scene.add(halo);

  // ── PARTICLES: drifting ambient dust ───────────────────────────────────────
  const particleCount = 900;
  const positions = new Float32Array(particleCount * 3);
  const seeds = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 26;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 18 - 2;
    seeds[i] = Math.random();
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));

  const pMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPixel: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute float seed;
      uniform float uTime;
      uniform float uPixel;
      varying float vSeed;
      void main() {
        vSeed = seed;
        vec3 p = position;
        p.y += sin(uTime * 0.2 + seed * 6.28) * 0.4;
        p.x += cos(uTime * 0.15 + seed * 6.28) * 0.3;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (8.0 + seed * 22.0) * uPixel * (1.0 / -mv.z);
      }
    `,
    fragmentShader: `
      varying float vSeed;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float a = smoothstep(0.5, 0.0, d);
        vec3 col = mix(vec3(1.0, 0.84, 0.55), vec3(0.92, 0.89, 0.83), vSeed);
        gl_FragColor = vec4(col, a * (0.18 + vSeed * 0.35));
      }
    `,
  });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  // ── interaction: subtle parallax on mouse + scroll ─────────────────────────
  const target = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('mousemove', (e) => {
    target.x = (e.clientX / window.innerWidth - 0.5) * 0.6;
    target.y = (e.clientY / window.innerHeight - 0.5) * 0.4;
  });
  let scrollY = 0;
  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
  });

  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();
    sunMat.uniforms.uTime.value = t;
    pMat.uniforms.uTime.value = t;

    // ease camera toward target
    camera.position.x += (target.x - camera.position.x) * 0.04;
    camera.position.y += (-target.y - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    // sun drift with scroll
    const vh = window.innerHeight;
    const k = Math.min(scrollY / (vh * 2), 1);
    sun.position.y = 0.6 - k * 3.5;
    halo.position.y = sun.position.y;
    sun.scale.setScalar(1 - k * 0.25);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
