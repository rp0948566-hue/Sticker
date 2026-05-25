(function(){const f=document.createElement("link").relList;if(f&&f.supports&&f.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))d(o);new MutationObserver(o=>{for(const r of o)if(r.type==="childList")for(const n of r.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&d(n)}).observe(document,{childList:!0,subtree:!0});function v(o){const r={};return o.integrity&&(r.integrity=o.integrity),o.referrerPolicy&&(r.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?r.credentials="include":o.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function d(o){if(o.ep)return;o.ep=!0;const r=v(o);fetch(o.href,r)}})();(function(){document.documentElement.classList.add("is-booting");const v=performance.now();function d(){const r=performance.now()-v,n=Math.max(0,2400-r);setTimeout(o,n)}function o(){const r=document.getElementById("boot");r&&r.classList.add("is-leaving"),document.documentElement.classList.remove("is-booting"),document.documentElement.classList.add("is-booted"),window.dispatchEvent(new CustomEvent("solen:boot-done")),setTimeout(()=>{r&&r.parentNode&&r.parentNode.removeChild(r)},1e3)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",d,{once:!0}):d()})();(function(){const x=document.getElementById("atmosphere");if(!x||typeof THREE>"u")return;const f=new THREE.WebGLRenderer({canvas:x,antialias:!0,alpha:!0,powerPreference:"high-performance"});f.setPixelRatio(Math.min(window.devicePixelRatio,2)),f.setSize(window.innerWidth,window.innerHeight),f.setClearColor(0,0);const v=new THREE.Scene;v.fog=new THREE.FogExp2(460298,.06);const d=new THREE.PerspectiveCamera(55,window.innerWidth/window.innerHeight,.1,100);d.position.set(0,0,8);const o=new THREE.SphereGeometry(1.6,64,64),r=new THREE.ShaderMaterial({transparent:!0,uniforms:{uTime:{value:0},uColorCore:{value:new THREE.Color(16770736)},uColorEdge:{value:new THREE.Color(16751146)}},vertexShader:`
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,fragmentShader:`
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
    `}),n=new THREE.Mesh(o,r);n.position.set(4.5,.6,-2),v.add(n);const a=new THREE.PlaneGeometry(14,14),m=new THREE.ShaderMaterial({transparent:!0,depthWrite:!1,blending:THREE.AdditiveBlending,uniforms:{uColor:{value:new THREE.Color(16756535)}},vertexShader:`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,fragmentShader:`
      varying vec2 vUv;
      uniform vec3 uColor;
      void main() {
        vec2 c = vUv - 0.5;
        float d = length(c);
        float a = smoothstep(0.5, 0.0, d);
        a = pow(a, 2.4);
        gl_FragColor = vec4(uColor, a * 0.55);
      }
    `}),u=new THREE.Mesh(a,m);u.position.copy(n.position),u.position.z-=.1,v.add(u);const w=900,e=new Float32Array(w*3),s=new Float32Array(w);for(let b=0;b<w;b++)e[b*3+0]=(Math.random()-.5)*26,e[b*3+1]=(Math.random()-.5)*14,e[b*3+2]=(Math.random()-.5)*18-2,s[b]=Math.random();const l=new THREE.BufferGeometry;l.setAttribute("position",new THREE.BufferAttribute(e,3)),l.setAttribute("seed",new THREE.BufferAttribute(s,1));const c=new THREE.ShaderMaterial({transparent:!0,depthWrite:!1,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uPixel:{value:f.getPixelRatio()}},vertexShader:`
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
    `,fragmentShader:`
      varying float vSeed;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float a = smoothstep(0.5, 0.0, d);
        vec3 col = mix(vec3(1.0, 0.84, 0.55), vec3(0.92, 0.89, 0.83), vSeed);
        gl_FragColor = vec4(col, a * (0.18 + vSeed * 0.35));
      }
    `}),T=new THREE.Points(l,c);v.add(T);const E={x:0,y:0};window.addEventListener("mousemove",b=>{E.x=(b.clientX/window.innerWidth-.5)*.6,E.y=(b.clientY/window.innerHeight-.5)*.4});let S=0;window.addEventListener("scroll",()=>{S=window.scrollY});const A=new THREE.Clock;function _(){const b=A.getElapsedTime();r.uniforms.uTime.value=b,c.uniforms.uTime.value=b,d.position.x+=(E.x-d.position.x)*.04,d.position.y+=(-E.y-d.position.y)*.04,d.lookAt(0,0,0);const H=window.innerHeight,C=Math.min(S/(H*2),1);n.position.y=.6-C*3.5,u.position.y=n.position.y,n.scale.setScalar(1-C*.25),f.render(v,d),requestAnimationFrame(_)}_(),window.addEventListener("resize",()=>{d.aspect=window.innerWidth/window.innerHeight,d.updateProjectionMatrix(),f.setSize(window.innerWidth,window.innerHeight)})})();(function(){if(typeof THREE>"u")return;const x=new THREE.TextureLoader;x.crossOrigin="anonymous";const f=`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,v=`
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
  `;class d{constructor(n){this.img=n,this.host=n.parentElement,this.size={w:0,h:0},this.target={x:.5,y:.5,s:0},this.smooth={x:.5,y:.5,s:0},this.prev={x:.5,y:.5},this.vel=0,this.lastMove=0,this.visible=!1,this.ready=!1,this.disposed=!1,this._init()}_init(){this.renderer=new THREE.WebGLRenderer({antialias:!1,alpha:!0,powerPreference:"high-performance"}),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));const n=this.renderer.domElement;n.className="liquid-canvas",n.style.cssText=`
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        z-index: 0;
        display: block;
        pointer-events: none;
      `,getComputedStyle(this.host).position==="static"&&(this.host.style.position="relative"),this.host.style.overflow=this.host.style.overflow||"hidden",this.host.appendChild(n),this.scene=new THREE.Scene,this.camera=new THREE.OrthographicCamera(-.5,.5,.5,-.5,.01,10),this.camera.position.z=1;const m=new THREE.PlaneGeometry(1,1,1,1);this.material=new THREE.ShaderMaterial({uniforms:{uTex:{value:null},uMouse:{value:new THREE.Vector2(.5,.5)},uPrevMouse:{value:new THREE.Vector2(.5,.5)},uStrength:{value:0},uTime:{value:0},uAspect:{value:new THREE.Vector2(1,1)},uVel:{value:0}},vertexShader:f,fragmentShader:v,transparent:!0}),this.mesh=new THREE.Mesh(m,this.material),this.scene.add(this.mesh);const u=this.img.currentSrc||this.img.src,w=e=>{e.minFilter=THREE.LinearFilter,e.magFilter=THREE.LinearFilter,e.generateMipmaps=!1,e.colorSpace=THREE.SRGBColorSpace||e.colorSpace,this.material.uniforms.uTex.value=e,this.ready=!0,this.img.style.opacity="0",this.img.style.visibility="hidden",this._resize()};x.load(u,w,void 0,()=>{this.dispose()}),this._ro=new ResizeObserver(()=>this._resize()),this._ro.observe(this.host),window.addEventListener("resize",this._resizeBound=()=>this._resize()),this._onMove=this._onMove.bind(this),this._onEnter=this._onEnter.bind(this),this._onLeave=this._onLeave.bind(this),this.host.addEventListener("mousemove",this._onMove),this.host.addEventListener("mouseenter",this._onEnter),this.host.addEventListener("mouseleave",this._onLeave),this.host.addEventListener("touchstart",this._onEnter,{passive:!0}),this.host.addEventListener("touchend",this._onLeave,{passive:!0}),this._io=new IntersectionObserver(e=>{e.forEach(s=>{this.visible=s.isIntersecting})},{threshold:.05}),this._io.observe(this.host),this._tickBound=this._tick.bind(this),requestAnimationFrame(this._tickBound)}_resize(){const n=this.host.getBoundingClientRect(),a=Math.max(1,Math.round(n.width)),m=Math.max(1,Math.round(n.height));a===this.size.w&&m===this.size.h||(this.size.w=a,this.size.h=m,this.renderer.setSize(a,m,!1),a>=m?this.material.uniforms.uAspect.value.set(a/m,1):this.material.uniforms.uAspect.value.set(1,m/a))}_onMove(n){const a=this.host.getBoundingClientRect(),m=(n.clientX-a.left)/a.width,u=1-(n.clientY-a.top)/a.height,w=performance.now(),e=Math.max(1,w-this.lastMove),s=m-this.target.x,l=u-this.target.y,c=Math.min(1,Math.hypot(s,l)/(e*.0015));this.vel=this.vel*.6+c*.4,this.lastMove=w,this.target.x=m,this.target.y=u}_onEnter(){this.target.s=1}_onLeave(){this.target.s=0,this.vel=0}_tick(n){if(this.disposed||(requestAnimationFrame(this._tickBound),!this.ready||!this.visible))return;const a=this.material.uniforms;a.uPrevMouse.value.copy(a.uMouse.value);const m=.12,u=.045;this.smooth.x+=(this.target.x-this.smooth.x)*m,this.smooth.y+=(this.target.y-this.smooth.y)*m,this.smooth.s+=(this.target.s-this.smooth.s)*u,this.vel*=.92,a.uMouse.value.set(this.smooth.x,this.smooth.y),a.uStrength.value=this.smooth.s,a.uVel.value=this.vel,a.uTime.value=n*.001,this.renderer.render(this.scene,this.camera)}dispose(){this.disposed=!0;try{this._ro&&this._ro.disconnect()}catch{}try{this._io&&this._io.disconnect()}catch{}window.removeEventListener("resize",this._resizeBound),this.host.removeEventListener("mousemove",this._onMove),this.host.removeEventListener("mouseenter",this._onEnter),this.host.removeEventListener("mouseleave",this._onLeave);try{this.renderer.dispose(),this.material.dispose(),this.mesh.geometry.dispose(),this.material.uniforms.uTex.value&&this.material.uniforms.uTex.value.dispose(),this.renderer.domElement&&this.renderer.domElement.parentElement&&this.renderer.domElement.parentElement.removeChild(this.renderer.domElement),this.img.style.opacity="",this.img.style.visibility=""}catch{}}}function o(){document.querySelectorAll("img[data-liquid]").forEach(n=>{const a=()=>new d(n);n.complete&&n.naturalWidth?a():n.addEventListener("load",a,{once:!0})})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",o):o()})();(function(){if(typeof Lenis>"u"||typeof gsap>"u")return;const x=new Lenis({duration:1.4,easing:e=>Math.min(1,1.001-Math.pow(2,-10*e)),smoothWheel:!0,smoothTouch:!1,wheelMultiplier:.9});window.__lenis=x;function f(e){x.raf(e),requestAnimationFrame(f)}requestAnimationFrame(f),gsap.registerPlugin(ScrollTrigger),x.on("scroll",ScrollTrigger.update),document.querySelectorAll('[data-split="words"]').forEach(e=>{const s=e.textContent.trim();e.innerHTML="",s.split(/\s+/).forEach((l,c)=>{const T=document.createElement("span");T.className="sp-word";const E=document.createElement("span");E.className="sp-word-inner",E.textContent=l,T.appendChild(E),e.appendChild(T),c<s.split(/\s+/).length-1&&e.appendChild(document.createTextNode(" "))})}),document.querySelectorAll('[data-split="lines"]').forEach(e=>{const l=e.innerHTML.split(/<br\s*\/?>/i);e.innerHTML=l.map(c=>`<span class="sp-line"><span class="sp-line-inner">${c}</span></span>`).join("")});const v=gsap.timeline({paused:!0,delay:.05});v.from(".hero-eyebrow",{opacity:0,y:14,duration:1,ease:"power3.out"}).from(".hero-title .sp-word-inner",{yPercent:110,duration:1.6,stagger:.07,ease:"expo.out"},"-=0.5").from(".hero-sub .sp-line-inner",{yPercent:110,duration:1.2,stagger:.1,ease:"expo.out"},"-=1.0").from(".hero-meta > *",{opacity:0,y:16,duration:.9,stagger:.08,ease:"power3.out"},"-=0.7").from(".nav-inner > *",{opacity:0,y:-10,duration:.9,stagger:.05,ease:"power3.out"},"-=1.2").from(".scroll-cue",{opacity:0,y:-10,duration:.9,ease:"power3.out"},"-=0.6");function d(){v.progress()===0&&!v.isActive()&&v.play()}document.documentElement.classList.contains("is-booted")?gsap.delayedCall(.15,d):(window.addEventListener("solen:boot-done",()=>{gsap.delayedCall(.05,d)},{once:!0}),gsap.delayedCall(4,d)),gsap.utils.toArray("[data-reveal]").forEach(e=>{const s=e.querySelectorAll(".sp-word-inner, .sp-line-inner");s.length?gsap.from(s,{yPercent:110,duration:1.4,stagger:.05,ease:"expo.out",scrollTrigger:{trigger:e,start:"top 80%"}}):gsap.from(e,{opacity:0,y:30,filter:"blur(10px)",duration:1.3,ease:"expo.out",scrollTrigger:{trigger:e,start:"top 85%"}})}),gsap.utils.toArray("[data-clip-reveal]").forEach(e=>{gsap.fromTo(e,{clipPath:"inset(100% 0% 0% 0%)"},{clipPath:"inset(0% 0% 0% 0%)",duration:1.8,ease:"expo.out",scrollTrigger:{trigger:e,start:"top 80%"}});const s=e.querySelector("img, .img-inner");s&&gsap.fromTo(s,{scale:1.25},{scale:1,duration:1.8,ease:"expo.out",scrollTrigger:{trigger:e,start:"top 80%"}})}),gsap.utils.toArray("[data-parallax]").forEach(e=>{const s=parseFloat(e.dataset.parallax)||.2;gsap.to(e,{yPercent:-s*100,ease:"none",scrollTrigger:{trigger:e.closest("section")||e,start:"top bottom",end:"bottom top",scrub:!0}})});const o=document.querySelector(".manifesto-text");if(o){const e=o.querySelectorAll(".sp-word-inner");gsap.set(e,{opacity:.14}),gsap.to(e,{opacity:1,stagger:.05,ease:"none",scrollTrigger:{trigger:".manifesto",start:"top top",end:"+=120%",scrub:.5,pin:!0}})}const r=document.querySelector(".engineering-track");if(r){r.querySelectorAll(".eng-card");const e=()=>r.scrollWidth-window.innerWidth;gsap.to(r,{x:()=>-e(),ease:"none",scrollTrigger:{trigger:".engineering",start:"top top",end:()=>"+="+e(),scrub:1,pin:!0,invalidateOnRefresh:!0}})}document.querySelectorAll("[data-magnetic]").forEach(e=>{const s=parseFloat(e.dataset.magnetic)||.35;e.addEventListener("mousemove",l=>{const c=e.getBoundingClientRect(),T=l.clientX-(c.left+c.width/2),E=l.clientY-(c.top+c.height/2);gsap.to(e,{x:T*s,y:E*s,duration:.6,ease:"power3.out"})}),e.addEventListener("mouseleave",()=>{gsap.to(e,{x:0,y:0,duration:.8,ease:"elastic.out(1, 0.4)"})})}),gsap.utils.toArray(".divider-line").forEach(e=>{gsap.fromTo(e,{scaleX:0},{scaleX:1,duration:1.6,ease:"expo.out",scrollTrigger:{trigger:e,start:"top 85%"}})}),gsap.utils.toArray(".section-label").forEach(e=>{gsap.from(e,{opacity:0,x:-10,duration:1,ease:"power3.out",scrollTrigger:{trigger:e,start:"top 88%"}})}),document.querySelectorAll(".flow-path").forEach(e=>{const s=e.getTotalLength?e.getTotalLength():800;e.style.strokeDasharray=s,e.style.strokeDashoffset=s,gsap.to(e,{strokeDashoffset:0,duration:2.4,ease:"expo.out",scrollTrigger:{trigger:".ecosystem",start:"top 60%"}})}),ScrollTrigger.create({start:100,end:99999,onUpdate:e=>{document.body.classList.toggle("scrolled",e.scroll()>100)}});const n=document.querySelector(".cursor"),a=document.querySelector(".cursor-dot");if(n&&a&&matchMedia("(pointer: fine)").matches){let l=function(){s.x+=(e.x-s.x)*.14,s.y+=(e.y-s.y)*.14,n.style.transform=`translate(${s.x}px, ${s.y}px)`,requestAnimationFrame(l)};var w=l;const e={x:window.innerWidth/2,y:window.innerHeight/2},s={x:e.x,y:e.y};window.addEventListener("mousemove",c=>{e.x=c.clientX,e.y=c.clientY,a.style.transform=`translate(${e.x}px, ${e.y}px)`}),l(),document.querySelectorAll('a, button, [data-magnetic], [data-cursor="hover"]').forEach(c=>{c.addEventListener("mouseenter",()=>n.classList.add("is-hover")),c.addEventListener("mouseleave",()=>n.classList.remove("is-hover"))})}document.querySelectorAll('a[href^="#"]').forEach(e=>{e.addEventListener("click",s=>{const l=e.getAttribute("href");if(l.length>1){const c=document.querySelector(l);c&&(s.preventDefault(),x.scrollTo(c,{offset:0,duration:1.6}))}})});const m=document.querySelectorAll(".silent-vis, .arch-img, .eng-card");matchMedia("(hover: hover) and (pointer: fine)").matches&&m.forEach(e=>{let s=null,l=0,c=0;const T=E=>{const S=e.getBoundingClientRect();l=(E.clientX-S.left)/S.width*100,c=(E.clientY-S.top)/S.height*100,!s&&(s=requestAnimationFrame(()=>{e.style.setProperty("--mx",l+"%"),e.style.setProperty("--my",c+"%"),s=null}))};e.addEventListener("mousemove",T),e.addEventListener("mouseleave",()=>{e.style.setProperty("--mx","50%"),e.style.setProperty("--my","50%")})});const u=document.querySelector(".connect-menu");if(u){const e=u.querySelector(".connect-toggle");e.addEventListener("click",()=>{const s=u.classList.toggle("is-active");e.setAttribute("aria-expanded",String(s))}),document.addEventListener("click",s=>{u.classList.contains("is-active")&&(u.contains(s.target)||(u.classList.remove("is-active"),e.setAttribute("aria-expanded","false")))}),document.addEventListener("keydown",s=>{s.key==="Escape"&&u.classList.contains("is-active")&&(u.classList.remove("is-active"),e.setAttribute("aria-expanded","false"))})}document.fonts&&document.fonts.ready.then(()=>ScrollTrigger.refresh())})();(function(){const x=[{id:"aureo-i",series:"Aureo I",title:"Monocrystalline glass cell",subtitle:"Roof-integrated capture",price:1840,unit:"per module",img:"https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&q=80&auto=format&fit=crop",specs:["440 W","22.6% η","1.96 m²"]},{id:"aureo-ii",series:"Aureo II",title:"Liquid-immersed inverter",subtitle:"Conversion & control",price:6400,unit:"per unit",img:"https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=600&q=80&auto=format&fit=crop",specs:["12 kW","98.4% η","0 dB"]},{id:"aureo-iii",series:"Aureo III",title:"Modular LFP reservoir",subtitle:"Stackable storage",price:18200,unit:"per stack",img:"https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=600&q=80&auto=format&fit=crop",specs:["40 kWh","10,000 cy","96% rec."]},{id:"aureo-iv",series:"Aureo IV",title:"Continuous flush mount",subtitle:"Architectural frame",price:4900,unit:"per residence",img:"https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=600&q=80&auto=format&fit=crop",specs:["≤ 4 mm","EN 12211","40 yr"]},{id:"aureo-v",series:"Aureo V",title:"Companion energy OS",subtitle:"On-device ambient interface",price:0,included:!0,unit:"included with installation",img:"https://images.unsplash.com/photo-1558002038-1055907df827?w=600&q=80&auto=format&fit=crop",specs:["On-device AI","HomeKit / Matter","Encrypted"]}],f=12e3,v=1200,d="solen-cart-v1";let o={};try{o=JSON.parse(localStorage.getItem(d)||"{}")}catch{o={}}function r(){try{localStorage.setItem(d,JSON.stringify(o))}catch{}}function n(){return Object.values(o).reduce((t,i)=>t+i,0)}function a(t){return x.find(i=>i.id===t)}function m(){return Object.entries(o).reduce((t,[i,h])=>{const p=a(i);return t+(p?p.price*h:0)},0)}function u(){const t=(o["aureo-i"]||0)*.66,i=(o["aureo-ii"]||0)*.2,h=(o["aureo-iii"]||0)*.4;return Math.max(0,t+i+h)}const w=t=>t.toLocaleString("de-DE",{minimumFractionDigits:0,maximumFractionDigits:0});function e(){const t=document.querySelector(".nav-cart .badge");if(!t)return;const i=n();t.textContent=i,t.classList.toggle("is-empty",i===0)}function s(t,i=1){o[t]=(o[t]||0)+i,o[t]<0&&(o[t]=0),o[t]===0&&delete o[t],r(),e(),_(),T(t)}function l(t,i){i<=0?delete o[t]:o[t]=i,r(),e(),_()}function c(t){delete o[t],r(),e(),_()}function T(t){const i=document.querySelector(".nav-cart");if(!i)return;i.classList.remove("is-pulsing"),i.offsetWidth,i.classList.add("is-pulsing");const h=document.querySelector(`.eng-card[data-pid="${t}"]`);if(!h||!i)return;const p=h.getBoundingClientRect(),y=i.getBoundingClientRect(),g=document.createElement("div");g.className="cart-fly",g.style.left=p.left+p.width/2+"px",g.style.top=p.top+80+"px",document.body.appendChild(g),requestAnimationFrame(()=>{g.style.transform=`translate(${y.left+y.width/2-(p.left+p.width/2)}px,
                                       ${y.top+y.height/2-(p.top+80)}px) scale(0.4)`,g.style.opacity="0"}),setTimeout(()=>g.remove(),900)}const E=()=>document.getElementById("cartOverlay");function S(){const t=E();t&&(_(),t.classList.add("is-open"),document.body.classList.add("cart-open"),window.__lenis&&window.__lenis.stop&&window.__lenis.stop())}function A(){const t=E();t&&(t.classList.remove("is-open"),document.body.classList.remove("cart-open"),window.__lenis&&window.__lenis.start&&window.__lenis.start())}function _(){const t=document.querySelector(".cart-list"),i=document.querySelector(".cart-summary");if(!t||!i)return;const h=Object.keys(o);h.length===0?t.innerHTML=`
        <div class="cart-empty">
          <div class="cart-empty-glyph">◷</div>
          <h3>Your composition is empty.</h3>
          <p>Begin by selecting modules from the engineering chapter.</p>
          <button class="btn-cart-cta" type="button" data-cart-action="close">Return to chapters</button>
        </div>`:t.innerHTML=h.map(M=>{const L=a(M);if(!L)return"";const k=o[M],D=L.included?"Included":`€ ${w(L.price*k)}`,F=L.included?"":`€ ${w(L.price)} ${L.unit}`;return`
        <article class="cart-line" data-pid="${M}">
          <div class="cart-thumb"><img src="${L.img}" alt="${L.title}"></div>
          <div class="cart-info">
            <div class="cart-series">${L.series}</div>
            <h4 class="cart-title">${L.title}</h4>
            <div class="cart-subtitle">${L.subtitle}</div>
            <div class="cart-specs">${L.specs.map(I=>`<span>${I}</span>`).join("")}</div>
          </div>
          <div class="cart-controls">
            <div class="cart-qty">
              <button data-cart-action="dec" data-id="${M}" aria-label="Decrease">−</button>
              <span>${k}</span>
              <button data-cart-action="inc" data-id="${M}" aria-label="Increase">+</button>
            </div>
            <div class="cart-line-price">${D}</div>
            <div class="cart-line-unit">${F}</div>
            <button class="cart-remove" data-cart-action="remove" data-id="${M}" aria-label="Remove">Remove</button>
          </div>
        </article>`}).join("");const p=m(),y=h.length?v:0,g=h.length?f:0,R=p+y+g,P=u();i.querySelector('[data-sum="subtotal"]').textContent="€ "+w(p),i.querySelector('[data-sum="installation"]').textContent=g?"€ "+w(g):"—",i.querySelector('[data-sum="consultation"]').textContent=y?"€ "+w(y):"—",i.querySelector('[data-sum="output"]').textContent=P?P.toFixed(1)+" MWh":"—",i.querySelector('[data-sum="total"]').textContent="€ "+w(R);const O=document.querySelector(".cart-headline .count");O&&(O.textContent=n())}function b(){e(),document.addEventListener("click",i=>{if(i.target.closest(".nav-cart")){i.preventDefault(),S();return}const p=i.target.closest("[data-cart-action]");if(!p)return;const y=p.dataset.cartAction,g=p.dataset.id;switch(i.preventDefault(),y){case"open":S();break;case"close":A();break;case"add":s(g,1);break;case"inc":l(g,(o[g]||0)+1);break;case"dec":l(g,Math.max(0,(o[g]||0)-1));break;case"remove":c(g);break;case"checkout":const R=document.querySelector(".cart-consult");R&&R.scrollIntoView&&R.scrollIntoView({behavior:"smooth",block:"start"});break}}),document.addEventListener("keydown",i=>{i.key==="Escape"&&document.body.classList.contains("cart-open")&&A()});const t=document.querySelector(".cart-consult-form");t&&t.addEventListener("submit",i=>{i.preventDefault();const h=Object.fromEntries(new FormData(t));C(h),setTimeout(()=>t.reset(),800)})}function H(){return"SLN-"+Math.floor(Math.random()*2176782336).toString(36).toUpperCase().padStart(6,"0")}function C(t){const i=document.getElementById("orderSuccess");if(!i)return;const h=i.querySelector('[data-success="ref"]'),p=i.querySelector('[data-success="email"]');h&&(h.textContent=H()),p&&(p.textContent=t&&t.email?t.email:"—"),i.classList.add("is-open"),i.setAttribute("aria-hidden","false"),document.body.classList.add("success-open"),window.__lenis&&window.__lenis.stop&&window.__lenis.stop();const y=i.querySelector(".order");y&&(y.classList.remove("animate"),y.offsetWidth,setTimeout(()=>y.classList.add("animate"),600)),y&&setTimeout(()=>y.classList.remove("animate"),10500)}function q(){const t=document.getElementById("orderSuccess");t&&(t.classList.remove("is-open"),t.setAttribute("aria-hidden","true"),document.body.classList.remove("success-open"),!document.body.classList.contains("cart-open")&&window.__lenis&&window.__lenis.start&&window.__lenis.start())}document.addEventListener("click",t=>{const i=t.target.closest("[data-success-action]");if(!i)return;const h=i.dataset.successAction;h==="close"&&q(),h==="continue"&&q()}),document.addEventListener("keydown",t=>{t.key==="Escape"&&document.body.classList.contains("success-open")&&q()}),document.readyState==="loading"?document.addEventListener("DOMContentLoaded",b):b(),window.SOLEN=window.SOLEN||{},window.SOLEN.cart={add:s,remove:c,setQty:l,open:S,close:A,state:()=>({...o}),catalog:x},window.SOLEN.success={show:C,hide:q}})();
