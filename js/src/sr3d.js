/* Sufian Rasheed — shared WebGL runtime (home story + inner-page touches).
   Source file; the site loads the bundled js/sr3d.min.js. Rebuild with:
   esbuild js/src/sr3d.js --bundle --minify --format=esm --target=es2019 \
     --alias:three=<node_modules>/three/build/three.module.js --legal-comments=none --outfile=js/sr3d.min.js
   (three@0.169.0, MIT — see js/vendor/three.LICENSE.txt) */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Color, Vector2, Vector3,
  LatheGeometry, RingGeometry, TorusGeometry, BoxGeometry, OctahedronGeometry, SphereGeometry,
  PlaneGeometry, ConeGeometry, InstancedMesh, Object3D, BufferGeometry, BufferAttribute, Points,
  MeshStandardMaterial, MeshBasicMaterial, ShaderMaterial, CanvasTexture, PMREMGenerator,
  SpotLight, DirectionalLight, AmbientLight, PointLight,
  BackSide, DoubleSide, CustomBlending, OneFactor, OneMinusSrcAlphaFactor, NormalBlending, SRGBColorSpace, ACESFilmicToneMapping
} from 'three';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const small = () => innerWidth < 768;
const lowPower = coarse || innerWidth < 768 || (navigator.hardwareConcurrency || 8) <= 4;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const x = clamp((v - a) / (b - a)); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
const ease = x => 1 - Math.pow(1 - clamp(x), 3);

const GOLD = new Color('#d9ae55');
/* additive colour, but alpha stays honest so the canvas composites cleanly over the page */
const GLOW = { transparent: true, depthWrite: false, blending: CustomBlending, blendSrc: OneFactor, blendDst: OneFactor, blendSrcAlpha: OneFactor, blendDstAlpha: OneMinusSrcAlphaFactor };
const GOLD_HI = new Color('#f3d98f');

/* ------------------------------------------------------------------ */
/* renderer + studio environment (warm softboxes, reflected by the gold) */
let glOK = null;
const hasWebGL = () => {
  if (glOK !== null) return glOK;
  try { const c = document.createElement('canvas'); glOK = !!(window.WebGL2RenderingContext && c.getContext('webgl2')); } catch (e) { glOK = false; }
  return glOK;
};
function makeRenderer(canvas) {
  if (!hasWebGL()) return null;
  let r;
  try {
    r = new WebGLRenderer({ canvas, antialias: !lowPower, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  if (!r || !r.getContext()) return null;
  r.setClearColor(0x000000, 0);
  r.outputColorSpace = SRGBColorSpace;
  r.toneMapping = ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  return r;
}

function makeEnv(renderer) {
  const s = new Scene();
  s.add(new Mesh(new SphereGeometry(12, 24, 12), new MeshBasicMaterial({ color: 0x0d0a07, side: BackSide })));
  const panel = (w, h, pos, col, k) => {
    const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(col).multiplyScalar(k), side: DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(9, 2.4, [0, 9, 1], '#fff4dc', 5.5);   // top spotlight box
  panel(3, 7, [-8, 1.5, 4], '#ffe2a8', 2.2);  // key softbox left
  panel(2, 8, [8, 0.5, -3], '#f0b45a', 3.2);  // warm rim right/back
  panel(7, 1.2, [0, -7, 5], '#6b5232', 1.0);  // floor bounce
  panel(1.2, 5, [3, 2, 9], '#ffffff', 1.4);   // front kicker strip
  const pm = new PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.035).texture;
  pm.dispose();
  return tex;
}

/* ------------------------------------------------------------------ */
/* funnel profile: wide mouth on top, narrow spout below */
const Y_TOP = 1.0, Y_BOT = -1.3, H = Y_TOP - Y_BOT, BANDS = 7;
const radiusAt = s => 0.2 + 1.08 * Math.pow(1 - s, 1.7);   // s: 0 top .. 1 bottom
const yAt = s => Y_TOP - s * H;
export const WORDS = ['REACH', 'ENGAGEMENT', 'LEADS', 'SALES'];

/* engraved words: one word per side, one tier lower each quarter turn */
function engraveTextures() {
  const W = 2048, HH = 1024;
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = HH; return c; };
  const col = mk(), emi = mk();
  const a = col.getContext('2d'), e = emi.getContext('2d');
  a.fillStyle = '#ffffff'; a.fillRect(0, 0, W, HH);
  e.fillStyle = '#000000'; e.fillRect(0, 0, W, HH);
  const pxPerUnitY = HH / H;
  // fine engraved hairlines (machined look)
  a.strokeStyle = 'rgba(70,70,70,.55)'; a.lineWidth = 2;
  for (let i = 0; i < BANDS; i++) {
    for (const f of [0.18, 0.82]) {
      const y = (1 - (yAt((i + f) / BANDS) - Y_BOT) / H) * HH;
      a.beginPath(); a.moveTo(0, y); a.lineTo(W, y); a.stroke();
    }
  }
  WORDS.forEach((word, i) => {
    const s = (i + 0.5) / BANDS, r = radiusAt(s);
    const pxPerUnitX = W / (2 * Math.PI * r);
    const cx = (0.125 + 0.25 * i) * W;
    const cy = (1 - (yAt(s) - Y_BOT) / H) * HH;
    const size = 0.118 * pxPerUnitY;
    for (const [ctx, fill] of [[a, '#2c2c2c'], [e, '#ffd889']]) {
      ctx.save(); ctx.translate(cx, cy); ctx.scale(pxPerUnitX / pxPerUnitY, 1);
      ctx.font = `600 ${size}px "Bricolage Grotesque", "Arial Narrow", Arial, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${size * 0.16}px`;
      ctx.fillStyle = fill; ctx.fillText(word, 0, size * 0.04);
      // small index mark under each word
      ctx.font = `500 ${size * 0.34}px "JetBrains Mono", monospace`;
      ctx.fillText('0' + (i + 1), 0, size * 0.78);
      ctx.restore();
    }
  });
  const t1 = new CanvasTexture(col), t2 = new CanvasTexture(emi);
  t1.colorSpace = SRGBColorSpace; t2.colorSpace = SRGBColorSpace;
  t1.anisotropy = t2.anisotropy = 4;
  return { map: t1, emissive: t2 };
}

/* one tier of the funnel = a thick ring (outer engraved shell, inner shell, two lips) */
function makeBand(i, mats) {
  const g = new Group();
  const gap = 0.022;
  const s0 = i / BANDS + gap / H, s1 = (i + 1) / BANDS;
  const N = 8, pts = [];
  for (let k = 0; k <= N; k++) { const s = lerp(s1, s0, k / N); pts.push(new Vector2(radiusAt(s), yAt(s))); }
  const seg = lowPower ? 64 : 96;
  const outer = new LatheGeometry(pts, seg, -Math.PI / 4, Math.PI * 2);
  const uv = outer.attributes.uv, pos = outer.attributes.position;
  for (let k = 0; k < uv.count; k++) uv.setY(k, (pos.getY(k) - Y_BOT) / H);
  const th = 0.055;
  const inner = new LatheGeometry(pts.map(p => new Vector2(Math.max(0.05, p.x - th), p.y)), seg, -Math.PI / 4, Math.PI * 2);
  g.add(new Mesh(outer, mats.engraved));
  g.add(new Mesh(inner, mats.inner));
  const lip = (s, up) => {
    const r = radiusAt(s);
    const m = new Mesh(new RingGeometry(Math.max(0.05, r - th), r, seg, 1), mats.lip);
    m.rotation.x = up ? -Math.PI / 2 : Math.PI / 2; m.position.y = yAt(s); return m;
  };
  g.add(lip(s0, true)); g.add(lip(s1, false));
  g.userData = { sc: (i + 0.5) / BANDS };
  return g;
}

/* the hero sculpture: engraved funnel + compass gimbal + growth needle */
function buildSculpture(env, opts = {}) {
  const tex = engraveTextures();
  const base = { color: GOLD, metalness: 1, roughness: 0.24, envMap: env, envMapIntensity: 1.25 };
  const mats = {
    engraved: new MeshStandardMaterial({ ...base, map: tex.map, bumpMap: tex.map, bumpScale: 2.2, emissiveMap: tex.emissive, emissive: new Color('#ffcf73'), emissiveIntensity: 0 }),
    inner: new MeshStandardMaterial({ ...base, color: new Color('#a87a33'), roughness: 0.38, side: DoubleSide }),
    lip: new MeshStandardMaterial({ ...base, color: GOLD_HI, roughness: 0.18, side: DoubleSide }),
    ring: new MeshStandardMaterial({ ...base, roughness: 0.2 }),
    needle: new MeshStandardMaterial({ ...base, color: GOLD_HI, roughness: 0.12, emissive: new Color('#ffb84a'), emissiveIntensity: 0.12 })
  };
  const root = new Group();
  const body = new Group(); root.add(body);
  const bands = [];
  if (opts.bands !== false) for (let i = 0; i < BANDS; i++) { const b = makeBand(i, mats); bands.push(b); body.add(b); }

  const gimbal = new Group(); gimbal.position.y = 0.72; root.add(gimbal);
  const ringA = new Mesh(new TorusGeometry(1.62, 0.02, 12, 180), mats.ring);
  ringA.rotation.x = Math.PI / 2; gimbal.add(ringA);
  const ringB = new Mesh(new TorusGeometry(1.5, 0.012, 10, 160), mats.ring);
  gimbal.add(ringB);
  const ticks = new InstancedMesh(new BoxGeometry(0.012, 0.075, 0.03), mats.lip, 72);
  const o = new Object3D();
  for (let k = 0; k < 72; k++) {
    const a = (k / 72) * Math.PI * 2, big = k % 18 === 0;
    o.position.set(Math.cos(a) * 1.62, 0, Math.sin(a) * 1.62);
    o.rotation.set(0, -a, 0); o.scale.set(1, big ? 2.4 : 1, 1); o.updateMatrix();
    ticks.setMatrixAt(k, o.matrix);
  }
  gimbal.add(ticks);

  const needle = new Group(); needle.position.y = 1.42; root.add(needle);
  const nm = new Mesh(new OctahedronGeometry(1, 0), mats.needle);
  nm.scale.set(0.075, 0.5, 0.075); needle.add(nm);
  const cap = new Mesh(new SphereGeometry(0.06, 20, 12), mats.lip); needle.add(cap);

  return { root, body, bands, gimbal, ringA, ringB, needle, mats };
}

/* ------------------------------------------------------------------ */
/* atmosphere: halo, spotlight cone, smoke, gold dust */
function makeHalo(size = 7, strength = 0.55) {
  const m = new ShaderMaterial({
    ...GLOW,
    uniforms: { uA: { value: strength }, uC: { value: new Color('#c99a45') } },
    vertexShader: 'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec2 v;uniform float uA;uniform vec3 uC;void main(){float d=length(v-.5)*2.;float g=pow(max(0.,1.-d),2.6);vec3 c=uC*g*uA;gl_FragColor=vec4(c,max(c.r,max(c.g,c.b)));}'
  });
  const mesh = new Mesh(new PlaneGeometry(size, size), m); mesh.position.z = -2.2; return mesh;
}

function makeBeam() {
  const m = new ShaderMaterial({
    ...GLOW, side: DoubleSide,
    uniforms: { uA: { value: 0.0 } },
    vertexShader: 'varying vec2 v;varying vec3 n;void main(){v=uv;n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec2 v;varying vec3 n;uniform float uA;void main(){float e=pow(abs(n.z),1.6);float h=smoothstep(0.,.55,v.y)*smoothstep(1.,.75,v.y);vec3 c=vec3(1.,.86,.6)*e*h*uA;gl_FragColor=vec4(c,c.r);}'
  });
  const mesh = new Mesh(new ConeGeometry(2.3, 7, 48, 1, true), m);
  mesh.position.y = 3.2; return mesh;
}

const NOISE = `
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int k=0;k<5;k++){v+=a*n(p);p*=2.03;a*=.5;}return v;}`;

function makeSmoke(count) {
  const g = new Group(), mats = [];
  for (let i = 0; i < count; i++) {
    const m = new ShaderMaterial({
      transparent: true, depthWrite: false, blending: NormalBlending,
      uniforms: { uT: { value: 0 }, uA: { value: 0 }, uS: { value: Math.random() * 10 }, uLift: { value: 0 } },
      vertexShader: 'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: NOISE + `varying vec2 v;uniform float uT,uA,uS,uLift;
        void main(){vec2 p=v*vec2(2.6,1.4)+vec2(uS+uT*.025,-uT*.045-uLift);
        float f=fbm(p+fbm(p*1.7+uT*.02));
        float m=smoothstep(0.,.3,v.x)*smoothstep(1.,.7,v.x)*smoothstep(0.,.25,v.y)*smoothstep(1.,.35,v.y);
        float a=smoothstep(.35,.85,f)*m*uA;
        vec3 c=mix(vec3(.16,.13,.09),vec3(.55,.45,.3),smoothstep(.5,1.,f)*v.y);
        gl_FragColor=vec4(c,a);}`
    });
    const mesh = new Mesh(new PlaneGeometry(8, 3.6), m);
    mesh.position.set((Math.random() - 0.5) * 2.5, -1.55 + Math.random() * 0.5, -0.6 + i * 0.45);
    g.add(mesh); mats.push(m);
  }
  return { group: g, mats };
}

function makeDust(count, spread = [6.5, 4.2, 3.2]) {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 2 * spread[0];
    pos[i * 3 + 1] = (Math.random() - 0.5) * 2 * spread[1];
    pos[i * 3 + 2] = (Math.random() - 0.5) * 2 * spread[2];
    for (let k = 0; k < 4; k++) seed[i * 4 + k] = Math.random();
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new BufferAttribute(seed, 4));
  const m = new ShaderMaterial({
    ...GLOW,
    uniforms: { uT: { value: 0 }, uForm: { value: 0 }, uPix: { value: 1 }, uSize: { value: 26 }, uA: { value: 1 },
      uF: { value: new Vector3(-1.9, 0.3, 0.6) }, uFS: { value: 1 }, uRise: { value: 0 } },
    vertexShader: `attribute vec4 aSeed;uniform float uT,uForm,uPix,uSize,uFS,uRise;uniform vec3 uF;varying float vA;
      void main(){vec3 p=position;
        p.y+=mod(uT*(.05+aSeed.x*.08)+aSeed.y*9.+uRise,8.4)-4.2-position.y*0.;
        p.y=mod(p.y+4.2,8.4)-4.2;
        p.x+=sin(uT*.21+aSeed.z*6.28)*.18;p.z+=cos(uT*.17+aSeed.w*6.28)*.15;
        float hgt=fract(aSeed.z-uT*.11);
        float r=mix(.05,.62,hgt*hgt);
        float ang=aSeed.w*6.2832+uT*(2.4-hgt*1.4);
        vec3 f=uF+vec3(cos(ang)*r,(hgt-.5)*1.35,sin(ang)*r)*uFS;
        float join=step(aSeed.x,.72)*uForm;
        p=mix(p,f,join);
        vec4 mv=modelViewMatrix*vec4(p,1.);
        gl_PointSize=uSize*(.35+aSeed.y*.9)*uPix/-mv.z;
        float tw=.55+.45*sin(uT*(1.5+aSeed.x*2.)+aSeed.w*40.);
        vA=tw*mix(1.,smoothstep(0.,.12,hgt)*smoothstep(1.,.8,hgt)*1.9,join);
        gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying float vA;uniform float uA;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);a*=a;vec3 c=vec3(1.,.83,.52)*a*vA*uA;gl_FragColor=vec4(c,min(1.,c.r));}`
  });
  return { points: new Points(geo, m), mat: m };
}

function lights(scene) {
  const spot = new SpotLight('#fff1d6', 60, 20, 0.42, 0.6, 1.6);
  spot.position.set(0, 7, 2); scene.add(spot); scene.add(spot.target);
  const rim = new DirectionalLight('#f2b35b', 2.2); rim.position.set(4, 2, -5); scene.add(rim);
  const rim2 = new DirectionalLight('#ffe6b8', 0.9); rim2.position.set(-5, 1, -3); scene.add(rim2);
  const amb = new AmbientLight('#3a2d1c', 0.6); scene.add(amb);
  const glow = new PointLight('#ffbf5e', 0, 6, 2); glow.position.set(0, 0.6, 1.4); scene.add(glow);
  return { spot, rim, amb, glow };
}

/* visibility-gated render loop */
function loop(el, frame) {
  let vis = false, raf = 0;
  const tick = now => { raf = 0; if (!vis) return; frame(now / 1000); raf = requestAnimationFrame(tick); };
  const io = new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis && !raf) raf = requestAnimationFrame(tick); }, { rootMargin: '120px' });
  io.observe(el);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { vis = false; } else { const r = el.getBoundingClientRect(); vis = r.bottom > -120 && r.top < innerHeight + 120; if (vis && !raf) raf = requestAnimationFrame(tick); } });
}

/* ================================================================== */
/* HOME STORY — four chapters scrubbed by scroll                      */
function story(section) {
  const canvas = section.querySelector('.story__gl');
  const stage = section.querySelector('.story__stage');
  const renderer = makeRenderer(canvas);
  if (!renderer) return false;
  const env = makeEnv(renderer);
  const scene = new Scene();
  const cam = new PerspectiveCamera(32, 1, 0.1, 60);
  const L = lights(scene);
  const S = buildSculpture(env);
  const stand = new Group(); stand.add(S.root); scene.add(stand);
  const halo = makeHalo(8.5, 0.5); stand.add(halo);
  const beam = makeBeam(); stand.add(beam);
  const smoke = makeSmoke(lowPower ? 3 : 5); stand.add(smoke.group);
  const dust = makeDust(lowPower ? 380 : 1100); scene.add(dust.points);
  L.spot.target = S.root;

  const chaps = [...section.querySelectorAll('.chap')];
  const hudN = section.querySelector('.hud__n'), hudName = section.querySelector('.hud__name'), hudBar = section.querySelector('.hud__bar i');
  const labels = [...section.querySelectorAll('.lbl')];
  const lines = [...section.querySelectorAll('.story__lines line')];
  const svg = section.querySelector('.story__lines');
  const names = chaps.map(c => c.dataset.name || '');

  let W = 1, Hh = 1, layout = {};
  const resize = () => {
    W = stage.clientWidth; Hh = stage.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, lowPower ? 1.5 : 1.75);
    renderer.setPixelRatio(dpr); renderer.setSize(W, Hh, false);
    dust.mat.uniforms.uPix.value = dpr * Hh / 900;
    cam.aspect = W / Hh;
    const pinned = document.documentElement.classList.contains('sr-motion');
    const wide = pinned && W >= 900 && W / Hh > 1.05;
    const t = Math.tan((cam.fov * Math.PI) / 360) * 2;
    if (!pinned) {
      layout = { nx: 0, ny: 0, wide: false, D: Math.max(3.6 / (t * 0.9), 3.9 / (t * cam.aspect * 0.9)) };
    } else if (wide) {
      layout = { nx: 0.36, ny: -0.02, wide };
      layout.D = Math.max(3.4 / (t * 0.66), 3.6 / (t * cam.aspect * 0.5));
    } else {
      layout = { nx: 0, ny: W / Hh < 0.8 ? 0.34 : 0.3, wide };
      layout.D = Math.max(3.4 / (t * 0.4), 3.7 / (t * cam.aspect * 0.86));
    }
    cam.position.set(0, 0.15, layout.D); cam.lookAt(0, 0.15, 0);
    cam.setViewOffset(W, Hh, -layout.nx * W / 2, layout.ny * Hh / 2, W, Hh);
    cam.updateProjectionMatrix();
    svg && svg.setAttribute('viewBox', `0 0 ${W} ${Hh}`);
  };
  new ResizeObserver(resize).observe(stage); resize();

  /* scroll → story time t: -1..0 entering, 0..4 chapters */
  const target = () => {
    const r = section.getBoundingClientRect(), sh = stage.clientHeight, span = section.offsetHeight - sh;
    if (r.top > 0) return clamp(-r.top / sh, -1, 0);
    return clamp(-r.top / span) * 4;
  };
  let t = target(), first = true, lastChap = -1;
  const v3 = new Vector3();

  /* chapter number + name decode in place (driven by the render loop, never by timers) */
  const scr = [];
  const scramble = (el, txt, now) => { if (el) scr.push({ el, txt, t0: now }); };
  const tickScramble = now => {
    const chars = '0123456789#%&*';
    for (let k = scr.length - 1; k >= 0; k--) {
      const s0 = scr[k], n = (now - s0.t0) / 0.045;
      if (scr.some((o, j) => j > k && o.el === s0.el)) { scr.splice(k, 1); continue; }
      if (n >= s0.txt.length * 2) { s0.el.textContent = s0.txt; scr.splice(k, 1); continue; }
      s0.el.textContent = s0.txt.split('').map((c, i) => (i < n / 2 || c === ' ' ? c : chars[(Math.random() * chars.length) | 0])).join('');
    }
  };

  const pose = (tt, time) => {
    /* chapter 01 — rises out of smoke under the spotlight */
    const rise = ease(smooth(-0.85, 0.75, tt));
    S.root.position.y = lerp(-2.6, 0, rise);
    S.root.scale.setScalar(lerp(0.82, 1, rise));
    smoke.mats.forEach(m => { m.uniforms.uA.value = lerp(0.95, 0.18, smooth(0.2, 1.4, tt)) * (1 - smooth(3.0, 3.6, tt) * 0.6); m.uniforms.uT.value = time; m.uniforms.uLift.value = tt * 0.6; });
    beam.material.uniforms.uA.value = 0.1 + 0.16 * smooth(-0.6, 0.6, tt) + 0.1 * smooth(3.1, 3.7, tt);
    L.spot.intensity = lerp(8, 60, smooth(-0.9, 0.5, tt)) + 25 * smooth(3.1, 3.7, tt);
    halo.material.uniforms.uA.value = lerp(0.12, 0.5, smooth(-0.5, 0.8, tt)) + 0.18 * smooth(3.1, 3.8, tt);

    /* chapter 02 — quarter turns: REACH → ENGAGEMENT → LEADS → SALES */
    const c2 = clamp(tt - 1);
    const steps = c2 * 3.4, k = Math.floor(steps), f = steps - k;
    const turn = Math.min(3, k + ease(smooth(0.15, 0.85, f)));
    const idle = (1 - smooth(0.6, 1.1, tt)) * Math.sin(time * 0.25) * 0.25;
    let rotY = -turn * (Math.PI / 2) + idle - 0.18;
    /* chapter 04 — settle to a three-quarter hero angle */
    rotY = lerp(rotY, -3 * Math.PI / 2 - 0.55 + Math.sin(time * 0.3) * 0.06, smooth(3.05, 3.6, tt));
    S.body.rotation.y = rotY;
    S.root.rotation.x = 0.16 + 0.1 * smooth(1, 1.3, tt) - 0.1 * smooth(2.0, 2.3, tt);
    S.root.rotation.z = lerp(0, -0.12, smooth(3.05, 3.6, tt));
    S.mats.engraved.emissiveIntensity = 0.55 * smooth(0.95, 1.2, tt) * (1 - smooth(1.9, 2.15, tt)) + 0.15 * smooth(3.2, 3.6, tt);
    S.gimbal.rotation.y = time * 0.12 + tt * 0.9;
    S.ringB.rotation.y = tt * 1.6;
    S.gimbal.rotation.z = Math.sin(time * 0.4) * 0.04 + 0.14 * smooth(1.0, 1.6, tt) * (1 - smooth(3.0, 3.5, tt));

    /* chapter 03 — tiers separate into the seven service rings, then lock back */
    const spread = ease(smooth(2.05, 2.45, tt)) * (1 - smooth(2.78, 3.02, tt));
    S.bands.forEach((b, i) => {
      b.position.y = (3 - i) * 0.34 * spread;
      b.rotation.y = (i % 2 ? 1 : -1) * spread * (0.5 + time * 0.08);
      b.position.x = (i % 2 ? 1 : -1) * 0.05 * spread;
    });
    S.gimbal.position.y = 0.72 + 1.15 * spread;
    S.needle.position.y = 1.42 + 1.35 * spread;
    S.gimbal.scale.setScalar(1 + 0.12 * spread);
    stand.scale.setScalar(1 - (layout.wide ? 0.3 : 0.36) * spread);
    stand.position.y = 0;

    /* growth needle: spins, then points up-right in the final shot */
    const fin = smooth(3.1, 3.6, tt);
    S.needle.rotation.y = time * 0.9;
    S.needle.rotation.z = lerp(0, -0.62, fin);
    S.mats.needle.emissiveIntensity = 0.12 + 0.5 * fin;
    L.glow.intensity = 3.5 * fin;

    /* chapter 04 — gold dust gathers into a small funnel beside the sculpture */
    dust.mat.uniforms.uT.value = time;
    dust.mat.uniforms.uRise.value = tt * 0.8;
    dust.mat.uniforms.uForm.value = ease(smooth(3.05, 3.65, tt));
    dust.mat.uniforms.uA.value = 0.55 + 0.45 * smooth(-0.6, 0.4, tt);
    if (!layout.nx && !layout.ny) { dust.mat.uniforms.uF.value.set(1.85, -0.5, 0.6); dust.mat.uniforms.uFS.value = 0.7; }
    else if (layout.wide) { dust.mat.uniforms.uF.value.set(-1.8, -1.0, 0.9); dust.mat.uniforms.uFS.value = 0.9; }
    else { dust.mat.uniforms.uF.value.set(1.55, 1.45, 0.6); dust.mat.uniforms.uFS.value = 0.62; }
    return spread;
  };

  const placeLabels = spread => {
    const on = spread > 0.55 ? smooth(0.55, 0.95, spread) : 0;
    section.style.setProperty('--lbl', on.toFixed(3));
    if (on <= 0) return;
    S.root.updateMatrixWorld(true);
    const wide = layout.wide;
    labels.forEach((el, i) => {
      const b = S.bands[i]; if (!b) return;
      const sc = b.userData.sc, r = radiusAt(sc), side = wide ? 1 : (i % 2 ? -1 : 1);
      v3.set(side * r * 0.98, yAt(sc) + b.position.y, 0);
      S.root.localToWorld(v3); v3.project(cam);
      const x = (v3.x * 0.5 + 0.5) * W, y = (-v3.y * 0.5 + 0.5) * Hh;
      const ew = el.offsetWidth;
      const lx = wide ? Math.min(W - ew - 24, x + 70 + i * 4) : (side > 0 ? W - 14 - ew : 14);
      el.style.transform = `translate(${lx.toFixed(1)}px,${y.toFixed(1)}px)`;
      el.classList.toggle('lbl--l', side < 0 && !wide);
      const ln = lines[i];
      if (ln) { ln.setAttribute('x1', x.toFixed(1)); ln.setAttribute('y1', y.toFixed(1)); ln.setAttribute('x2', (wide || side > 0 ? lx - 6 : lx + ew + 6).toFixed(1)); ln.setAttribute('y2', y.toFixed(1)); }
    });
  };

  const copy = (tt, now) => {
    chaps.forEach((c, k) => {
      const inn = k === 0 ? smooth(-0.55, -0.1, tt) : smooth(k - 0.1, k + 0.12, tt);
      const out = k === chaps.length - 1 ? 1 : 1 - smooth(k + 0.8, k + 0.98, tt);
      const w = inn * out;
      const dir = tt < k + 0.5 ? 1 : -1;
      c.style.opacity = w.toFixed(3);
      c.style.transform = `translate3d(0,${((1 - w) * 46 * dir).toFixed(1)}px,0)`;
      c.style.filter = w > 0.98 ? 'none' : `blur(${((1 - w) * 8).toFixed(1)}px)`;
      c.style.visibility = w < 0.01 ? 'hidden' : 'visible';
      c.classList.toggle('is-on', w > 0.5);
    });
    const ci = clamp(Math.floor(tt + 0.0001), 0, 3);
    if (ci !== lastChap) { lastChap = ci; scramble(hudN, '0' + (ci + 1), now); scramble(hudName, names[ci], now); }
    tickScramble(now);
    if (hudBar) hudBar.style.transform = `scaleX(${clamp(tt / 4).toFixed(3)})`;
    section.style.setProperty('--enter', clamp(tt + 1).toFixed(3));
  };

  let last = 0;
  const render = time => {
    const tg = target();
    const dt = Math.min(0.1, last ? time - last : 0.016); last = time;
    t = first ? tg : lerp(t, tg, 1 - Math.exp(-dt * (Math.abs(tg - t) > 1.2 ? 22 : 9)));
    if (Math.abs(tg - t) < 0.0005) t = tg;
    first = false;
    /* gentle pointer parallax on desktop */
    const kp = 1 - Math.exp(-dt * 3);
    stand.rotation.y = lerp(stand.rotation.y, px * 0.12, kp);
    stand.rotation.x = lerp(stand.rotation.x, py * 0.06, kp);
    const spread = pose(t, time);
    copy(t, time);
    placeLabels(spread);
    renderer.render(scene, cam);
  };
  let px = 0, py = 0;
  if (!coarse) addEventListener('pointermove', e => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; }, { passive: true });

  if (reduce || !document.documentElement.classList.contains('sr-motion')) {
    /* static: one well-lit final frame, all copy visible via CSS */
    const still = () => { pose(3.7, 2.0); renderer.render(scene, cam); };
    new ResizeObserver(() => { resize(); still(); }).observe(stage);
    still();
  } else {
    loop(section, render);
    render(performance.now() / 1000);
  }
  section.classList.add('gl-ready');
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); section.classList.remove('gl-ready'); });
  return true;
}

/* ================================================================== */
/* INNER PAGES — one small gold piece per page, same material + light */
function mini(canvas) {
  const kind = canvas.dataset.mini || 'compass';
  const renderer = makeRenderer(canvas);
  if (!renderer) { canvas.remove(); return; }
  const env = makeEnv(renderer);
  const scene = new Scene();
  const cam = new PerspectiveCamera(30, 1, 0.1, 40);
  cam.position.set(0, 0.2, 9.6); cam.lookAt(0, 0.1, 0);
  const L = lights(scene); L.spot.intensity = 45;
  const S = buildSculpture(env, { bands: kind !== 'compass' });
  scene.add(S.root);
  scene.add(makeHalo(7, 0.38));
  const dust = makeDust(lowPower ? 90 : 220, [3.2, 3, 1.5]); scene.add(dust.points);
  dust.mat.uniforms.uSize.value = 22;
  if (kind === 'compass') { S.gimbal.position.y = 0; S.needle.position.y = 0; S.needle.scale.setScalar(1.6); S.gimbal.scale.setScalar(1.12); }
  if (kind === 'contact') { dust.mat.uniforms.uF.value.set(0, 2.3, 0.4); dust.mat.uniforms.uFS.value = 0.85; dust.mat.uniforms.uForm.value = 1; S.root.position.y = -0.55; S.root.scale.setScalar(0.85); }
  S.root.rotation.x = 0.2;

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    const dpr = Math.min(devicePixelRatio || 1, lowPower ? 1.5 : 1.75);
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    dust.mat.uniforms.uPix.value = dpr * h / 600;
    cam.aspect = w / h; cam.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas); resize();

  let px = 0, py = 0;
  if (!coarse) addEventListener('pointermove', e => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; }, { passive: true });
  const pose = (sp, time) => {
    S.body.rotation.y = -0.5 - sp * 2.2 + Math.sin(time * 0.3) * 0.15;
    S.gimbal.rotation.y = time * 0.15 + sp * 1.5;
    S.ringB.rotation.y = sp * 2.4;
    S.needle.rotation.y = time * 0.8;
    S.needle.rotation.z = kind === 'compass' ? -0.62 + Math.sin(time * 0.6) * 0.05 : 0;
    S.root.rotation.y = lerp(S.root.rotation.y, px * 0.25, 0.06);
    S.root.rotation.x = lerp(S.root.rotation.x, 0.2 + py * 0.12, 0.06);
    if (kind === 'services' || kind === 'process') {
      const n = kind === 'process' ? 5 : 7;
      const spread = 0.35 + 0.65 * clamp(sp * 1.6);
      S.bands.forEach((b, i) => {
        const on = i < n ? 1 : 0;
        b.visible = !!on;
        b.position.y = (3 - i) * 0.3 * spread;
        b.rotation.y = (i % 2 ? 1 : -1) * (time * 0.1 + sp * 1.2) * (kind === 'process' ? 1 : 0.5);
      });
      S.gimbal.position.y = 0.72 + 1.0 * spread; S.needle.position.y = 1.42 + 1.2 * spread;
      S.root.scale.setScalar(0.78);
    }
    if (kind === 'work') S.mats.engraved.emissiveIntensity = 0.25;
    dust.mat.uniforms.uT.value = time;
    dust.mat.uniforms.uRise.value = sp * 2;
  };
  const sp = () => clamp(scrollY / Math.max(1, innerHeight));
  if (reduce) {
    const still = () => { resize(); pose(0.2, 1.5); renderer.render(scene, cam); };
    new ResizeObserver(still).observe(canvas); still();
  } else {
    loop(canvas, time => { pose(sp(), time); renderer.render(scene, cam); });
  }
  canvas.classList.add('is-ready');
}

/* ------------------------------------------------------------------ */
function boot() {
  const s = document.querySelector('.story');
  if (s) {
    let ok = false;
    try { ok = story(s); } catch (e) { ok = false; }
    if (!ok) {
      document.documentElement.classList.remove('sr-motion');
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    }
  }
  document.querySelectorAll('canvas[data-mini]').forEach(c => { try { mini(c); } catch (e) { c.remove(); } });
}
if (document.fonts && document.fonts.ready) {
  let done = false; const go = () => { if (!done) { done = true; boot(); } };
  document.fonts.ready.then(go); setTimeout(go, 1500);
} else boot();
