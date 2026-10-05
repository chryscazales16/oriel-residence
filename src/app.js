import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { createModel, FLOOR_H, PODIUM_H, BAL_D } from './model.js';

/* =====================================================================
   Scroll-driven 3D property website.
   All content comes from site.config.js (window.SITE); this file only
   draws and animates it.
   ===================================================================== */

/* ---------------- helpers ---------------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);
const band = (p, a, b, c, d) => Math.min(smooth(inv(a, b, p)), 1 - smooth(inv(c, d, p)));
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, '0');
const yieldUI = () => new Promise((r) => setTimeout(r, 0));
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* value noise (for cloud placement) */
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (i, j) => (hashStr(i * 73856093 + ':' + j * 19349663) % 10000) / 10000;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}

/* ---------------- environment & quality ---------------- */
const TEST = window.__ORIEL_TEST__ || {};
const coarse = matchMedia('(pointer: coarse)').matches;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const smallScreen = Math.min(window.screen.width || 1200, window.screen.height || 800) < 720;
const lowTier = TEST.low ?? (coarse || smallScreen);
const Q = lowTier
  ? { dpr: Math.min(window.devicePixelRatio || 1, 1.5), shadow: 2048, clouds: 300, ground: 2048, msaa: 2, atlas: 512, urban: 1024 }
  : { dpr: Math.min(window.devicePixelRatio || 1, 1.75), shadow: 4096, clouds: 520, ground: 4096, msaa: 4, atlas: 1024, urban: 2048 };
Object.assign(Q, TEST.q || {});

/* =====================================================================
   Residences data (from the settings file)
   ===================================================================== */
const S = window.SITE;
const M = createModel(S);
const T = M.labels;
const LEVELS = M.LEVELS;
const levelBase = (n) => PODIUM_H + (n - 1) * FLOOR_H;
const STATUS_LABEL = T.status;
const GROUPS = ['studio', '1br', '2br', '3br', 'ph'].map((g) => [g, T.groups[g] || g]);
const fpFor = M.fpFor, balconies = M.balconies, unitsForLevel = M.unitsForLevel, levelInfo = M.levelInfo;
const ALL_UNITS = M.all;
const TOTAL_UNITS = ALL_UNITS.length;
const MIN_PRICE = M.fromPrice;
const listJoin = (a) => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ` ${T.and} ` + a[a.length - 1]);
const isPenthouseLevel = (n) => { const u = unitsForLevel(n); return u.length > 0 && u.every((x) => x.group === 'ph'); };
// the camera framing was tuned for a 20-storey tower; taller or shorter towers scale it
const TOWER_SCALE = clamp((PODIUM_H + LEVELS * FLOOR_H + 4) / 84, 0.5, 1.9);

/* WhatsApp + enquiry settings */
const WA_NUMBER = String(S.contact?.whatsapp || '').replace(/\D/g, '');
const waLink = (msg) => (WA_NUMBER ? `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}` : '');
const FORM_READY = (S.form?.provider || 'web3forms') === 'web3forms' && !!S.form?.accessKey;
const WA_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2a8.8 8.8 0 0 0-7.6 13.2L3.2 20.8l4.5-1.2A8.8 8.8 0 1 0 12 3.2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 8.6c.2-.4.5-.5.8-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.3 0 .5-.1.7l-.5.6c.6 1.1 1.5 2 2.6 2.6l.6-.5c.2-.2.5-.2.7-.1l1.6.7c.3.1.4.3.4.5v.5c0 .3-.1.6-.5.8-.6.4-1.6.6-2.9 0-1.8-.8-3.3-2.3-4.1-4.1-.6-1.3-.4-2.3 0-2.9z" fill="currentColor"/></svg>';

/* =====================================================================
   DOM
   ===================================================================== */
const canvas = $('#stage');
const OV = {
  hero: $('#ovHero'), cue: $('#ovCue'), loc: $('#ovLocation'), why: $('#ovWhy'), arch: $('#ovArch'),
  explore: $('#ovExplore'), ruler: $('#ruler'), chapter: $('#chapterIndex'), dev: $('#devMark'),
};
const veil = $('#veil'), scrim = $('#scrim'), track = $('#track'), topbar = $('.topbar');
const levelLine = $('#levelLine'), levelTag = $('#levelTag');
const plan = $('#plan'), planSheet = $('#planSheet'), unitCard = $('#unitCard');
const loaderBar = $('#loaderBar');
const setLoad = (f) => { if (loaderBar) loaderBar.style.transform = `scaleX(${clamp(f, 0.05, 1)})`; };

if (coarse) $('#exploreHint').textContent = M.t(S.explore?.hintTouch || '');

/* =====================================================================
   Three.js setup
   ===================================================================== */
let renderer = null, hasGL = false;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  hasGL = !!renderer.getContext();
} catch (e) {
  hasGL = false;
}
if (!hasGL) {
  document.body.classList.add('no-webgl');
  $('#exploreHint').textContent = M.t(S.explore?.hintNo3D || '');
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 2, 60000);
let rt = null, finalMat = null, finalScene = null;
const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

/* shared uniforms */
const U = {
  zen: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, hor: { value: new THREE.Color() },
  gnd: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() },
  sunI: { value: 1 }, sunVis: { value: 1 }, glow: { value: 0 }, amb: { value: 1 }, ambCol: { value: new THREE.Color() },
  hover: { value: -1 }, sel: { value: -1 }, soffit: { value: 0 }, time: { value: 0 },
  cLit: { value: new THREE.Color() }, cShade: { value: new THREE.Color() }, haze: { value: new THREE.Color() },
  hazeD: { value: 0.0002 }, cloudOpacity: { value: 1 },
};

const quadVS = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/* ---------------- environment presets ---------------- */
const RAW_PRESETS = {
  hero: { zen: '#8399b0', mid: '#a9b4bd', hor: '#d2c9bb', gnd: '#b9ae9d', fog: '#c9c2b7', fogD: 0.000105, sunEl: 20, sunAz: 64, sunCol: '#fff0dc', sunI: 2.4, hemiSky: '#cbd6e0', hemiGnd: '#b4a183', hemiI: 1.05, exp: 0.86, glow: 0, cLit: '#f7f2ea', cShade: '#a2acb8', vign: 0.32 },
  aerial: { zen: '#7896b9', mid: '#aebfcd', hor: '#ddd2bf', gnd: '#c9bca5', fog: '#d3c8b5', fogD: 0.00019, sunEl: 38, sunAz: 132, sunCol: '#fff0d6', sunI: 2.9, hemiSky: '#d2dde8', hemiGnd: '#bda885', hemiI: 1.0, exp: 0.94, glow: 0, cLit: '#fbf7f0', cShade: '#9aa5b2', vign: 0.26 },
  day: { zen: '#3b6fae', mid: '#84aad0', hor: '#cfdae3', gnd: '#c3baa8', fog: '#c7d2db', fogD: 0.000125, sunEl: 52, sunAz: 166, sunCol: '#fff6ea', sunI: 3.0, hemiSky: '#cde0f2', hemiGnd: '#b9a78a', hemiI: 1.0, exp: 0.98, glow: 0, cLit: '#ffffff', cShade: '#a0acba', vign: 0.24 },
  golden: { zen: '#2c4775', mid: '#a28896', hor: '#eeb07c', gnd: '#9a8169', fog: '#cfa587', fogD: 0.00014, sunEl: 6, sunAz: 256, sunCol: '#ffb27a', sunI: 2.2, hemiSky: '#9fb0cf', hemiGnd: '#8a6e55', hemiI: 0.8, exp: 1.04, glow: 0.4, cLit: '#ffd9b8', cShade: '#7d6f82', vign: 0.3 },
  dusk: { zen: '#0e1830', mid: '#433d66', hor: '#d9845a', gnd: '#36303a', fog: '#3c3a52', fogD: 0.00011, sunEl: -4, sunAz: 266, sunCol: '#ff7a45', sunI: 0, hemiSky: '#5a6c98', hemiGnd: '#2e2726', hemiI: 0.85, exp: 1.12, glow: 1, cLit: '#c9b9c8', cShade: '#3d3f58', vign: 0.36 },
};
const COLOR_KEYS = ['zen', 'mid', 'hor', 'gnd', 'fog', 'sunCol', 'hemiSky', 'hemiGnd', 'cLit', 'cShade'];
const PRESETS = {};
for (const [k, v] of Object.entries(RAW_PRESETS)) {
  PRESETS[k] = { ...v };
  for (const c of COLOR_KEYS) PRESETS[k][c] = new THREE.Color(v[c]);
}
const ENVK = [
  { p: 0.0, k: 'hero' }, { p: 0.12, k: 'hero' }, { p: 0.28, k: 'aerial' }, { p: 0.4, k: 'aerial' },
  { p: 0.44, k: 'day' }, { p: 0.62, k: 'day' }, { p: 0.7, k: 'golden' }, { p: 0.79, k: 'dusk' }, { p: 1.0, k: 'dusk' },
];

/* ---------------- camera choreography ---------------- */
const CUT = 0.42;
const K1 = [
  { p: 0.0, pos: [0, 990, 2950], tgt: [80, 330, -2500], fov: 40 },
  { p: 0.09, pos: [0, 950, 2660], tgt: [60, 250, -2200], fov: 40 },
  { p: 0.17, pos: [0, 690, 2060], tgt: [0, 40, -600], fov: 42 },
  { p: 0.24, pos: [0, 430, 1380], tgt: [0, 0, -160], fov: 44 },
  { p: 0.3, pos: [0, 315, 860], tgt: [0, 0, -40], fov: 43 },
  { p: 0.36, pos: [50, 245, 520], tgt: [0, 8, 0], fov: 38 },
  { p: 0.42, pos: [70, 150, 300], tgt: [0, 14, 0], fov: 32 },
];
const K2 = [
  { p: 0.42, pos: [175, 118, 235], tgt: [0, 22, 0], fov: 38 },
  { p: 0.5, pos: [150, 70, 215], tgt: [0, 34, 0], fov: 38 },
  { p: 0.58, pos: [85, 30, 205], tgt: [0, 44, 0], fov: 38 },
  { p: 0.67, pos: [22, 10, 188], tgt: [0, 46, 0], fov: 38 },
  { p: 0.78, pos: [0, 6, 178], tgt: [0, 47, 0], fov: 38 },
  { p: 1.0, pos: [0, 7, 162], tgt: [0, 47, 0], fov: 38 },
];
function makePath(keys) {
  return {
    keys,
    pos: new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.pos)), false, 'centripetal'),
    tgt: new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.tgt)), false, 'centripetal'),
  };
}
const PATH1 = makePath(K1), PATH2 = makePath(K2);
const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3();
function cameraAt(p) {
  const path = p < CUT ? PATH1 : PATH2;
  const k = path.keys;
  let i = 0;
  while (i < k.length - 2 && p >= k[i + 1].p) i++;
  const t = clamp((p - k[i].p) / (k[i + 1].p - k[i].p));
  const u = (i + t) / (k.length - 1);
  path.pos.getPoint(u, camPos);
  path.tgt.getPoint(u, camTgt);
  let fov = lerp(k[i].fov, k[i + 1].fov, smooth(t));
  // taller or shorter towers: aim higher/lower and widen/narrow the lens to match
  if (p >= CUT && TOWER_SCALE !== 1) {
    camTgt.y *= TOWER_SCALE;
    fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * TOWER_SCALE));
  }
  // portrait screens: a taller field of view keeps the whole tower in frame
  const aspect = innerWidth / innerHeight;
  if (aspect < 1 && p >= CUT) fov += 9 * clamp((1 - aspect) / 0.5);
  return Math.min(fov, 75);
}

/* =====================================================================
   Scene construction
   ===================================================================== */
const GROUND_R = 805;
const RINGS = [{ r: 196, w: 14 }, { r: 270, w: 10 }, { r: 344, w: 10 }, { r: 418, w: 12 }, { r: 492, w: 10 }, { r: 566, w: 16 }];
const RADIALS = Array.from({ length: 8 }, (_, i) => Math.PI / 8 + (i * Math.PI) / 4);
const world = {};

function boxGeo(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

/* ---------- sky ---------- */
function buildSky() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uZen: U.zen, uMid: U.mid, uHor: U.hor, uGnd: U.gnd, uSunDir: U.sunDir, uSunCol: U.sunCol, uSunVis: U.sunVis },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vDir = wp.xyz - cameraPosition;
        vec4 p = projectionMatrix * viewMatrix * wp;
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uZen, uMid, uHor, uGnd, uSunDir, uSunCol; uniform float uSunVis;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHor, uMid, smoothstep(-0.01, 0.2, h));
        col = mix(col, uZen, smoothstep(0.12, 0.8, h));
        vec2 sd = normalize(uSunDir.xz + vec2(1e-4));
        vec2 dd = normalize(d.xz + vec2(1e-4));
        float az = max(dot(sd, dd), 0.0);
        col += uSunCol * 0.09 * pow(az, 5.0) * (1.0 - smoothstep(0.0, 0.45, abs(h)));
        if (h < 0.0) col = mix(col, uGnd, smoothstep(0.0, 0.08, -h));
        float s = max(dot(d, uSunDir), 0.0);
        col += uSunCol * uSunVis * (0.07 * pow(s, 10.0) + 0.45 * pow(s, 220.0) + 4.0 * smoothstep(0.99965, 0.9999, s));
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat);
  sky.scale.setScalar(40000);
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  scene.add(sky);
  world.sky = sky;
}

/* ---------- clouds ---------- */
const CLOUD_GEN_FS = /* glsl */`
  varying vec2 vUv;
  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { v += a * noise(p); p = p * 2.07 + 13.7; a *= 0.5; } return v; }
  float shape(vec2 uv, float seed) {
    float s = 0.0;
    for (int i = 0; i < 16; i++) {
      float fi = float(i);
      float hx = hash(vec2(fi * 3.17 + 0.3, seed * 1.31)), hy = hash(vec2(seed * 2.11, fi * 1.73 + 0.7)), hr = hash(vec2(fi + seed * 4.0, 9.1));
      vec2 c = vec2(0.16 + 0.68 * hx, 0.33 + 0.2 * hy * hy);
      float r = (0.07 + 0.12 * hr) * (1.2 - 0.9 * (c.y - 0.33));
      s = max(s, 1.0 - length((uv - c) / vec2(r * 1.55, r)));
    }
    return s * smoothstep(0.2, 0.34, uv.y);
  }
  float dens(vec2 uv, float seed) { return shape(uv, seed) * 1.5 - (1.0 - fbm(uv * vec2(5.5, 7.0) + seed * 3.7)) * 0.82; }
  void main() {
    vec2 cell = floor(vUv * 2.0); vec2 uv = fract(vUv * 2.0);
    float seed = 1.0 + cell.x + cell.y * 2.0;
    float d = dens(uv, seed);
    float edge = smoothstep(0.0, 0.07, uv.x) * smoothstep(1.0, 0.93, uv.x) * smoothstep(0.0, 0.07, uv.y) * smoothstep(1.0, 0.93, uv.y);
    float alpha = smoothstep(0.0, 0.5, d) * edge;
    float above = clamp(dens(uv + vec2(-0.035, 0.085), seed), 0.0, 1.0);
    float n = fbm(uv * 9.0 + seed);
    float lit = clamp(0.98 - above * 0.8 + (n - 0.5) * 0.28, 0.0, 1.0);
    lit = mix(lit, 1.0, smoothstep(0.55, 0.95, uv.y) * 0.45);
    gl_FragColor = vec4(lit, clamp(d, 0.0, 1.0), 0.0, alpha);
  }`;

function buildClouds() {
  const size = Q.atlas;
  const target = new THREE.WebGLRenderTarget(size, size, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  const genMat = new THREE.ShaderMaterial({ vertexShader: quadVS, fragmentShader: CLOUD_GEN_FS, depthTest: false, depthWrite: false });
  const genScene = new THREE.Scene();
  genScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), genMat));
  renderer.setRenderTarget(target);
  renderer.render(genScene, orthoCam);
  renderer.setRenderTarget(null);
  genMat.dispose();

  const r = rng(4242);
  const list = [];
  let tries = 0;
  while (list.length < Q.clouds && tries < Q.clouds * 60) {
    tries++;
    const x = (r() * 2 - 1) * 3600, z = -2500 + r() * 5600;
    const dn = vnoise(x * 0.0007 + 3.1, z * 0.0007 + 1.7);
    const far = smooth(inv(-2500, -300, z));
    const keep = smooth(inv(0.2, 0.6, dn)) * (0.32 + 0.68 * far);
    if (r() > keep) continue;
    const w = 300 + r() * 460;
    list.push({ x, y: 335 + Math.pow(r(), 1.5) * 190, z, w, h: w * (0.4 + r() * 0.18), v: Math.floor(r() * 4), a: 0.55 + r() * 0.45, d: 0 });
  }
  const N = list.length;
  const geo = new THREE.InstancedBufferGeometry();
  const base = new THREE.PlaneGeometry(1, 1);
  geo.index = base.index;
  geo.setAttribute('position', base.getAttribute('position'));
  geo.setAttribute('uv', base.getAttribute('uv'));
  const aOffset = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const aScale = new THREE.InstancedBufferAttribute(new Float32Array(N * 2), 2).setUsage(THREE.DynamicDrawUsage);
  const aVar = new THREE.InstancedBufferAttribute(new Float32Array(N * 2), 2).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aOffset', aOffset);
  geo.setAttribute('aScale', aScale);
  geo.setAttribute('aVar', aVar);
  geo.instanceCount = N;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uAtlas: { value: target.texture }, uLit: U.cLit, uShade: U.cShade, uHaze: U.haze, uHazeD: U.hazeD, uOpacity: U.cloudOpacity },
    vertexShader: /* glsl */`
      attribute vec3 aOffset; attribute vec2 aScale; attribute vec2 aVar;
      varying vec2 vUv; varying float vA; varying float vAlt; varying float vDist;
      void main() {
        vec4 mv = viewMatrix * vec4(aOffset, 1.0);
        mv.xy += position.xy * aScale;
        gl_Position = projectionMatrix * mv;
        vec2 off = vec2(mod(aVar.x, 2.0), floor(aVar.x / 2.0)) * 0.5;
        vUv = uv * 0.5 + off;
        vA = aVar.y;
        vAlt = clamp((aOffset.y - 330.0) / 200.0, 0.0, 1.0);
        vDist = -mv.z;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uAtlas; uniform vec3 uLit, uShade, uHaze; uniform float uHazeD, uOpacity;
      varying vec2 vUv; varying float vA; varying float vAlt; varying float vDist;
      void main() {
        vec4 t = texture2D(uAtlas, vUv);
        float a = t.a * vA * uOpacity * smoothstep(40.0, 280.0, vDist);
        if (a < 0.004) discard;
        vec3 col = mix(uShade, uLit, t.r) * mix(0.86, 1.04, vAlt);
        float f = 1.0 - exp(-pow(uHazeD * vDist, 2.0));
        col = mix(col, uHaze, f * 0.9);
        gl_FragColor = vec4(col * a, a);
      }`,
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  scene.add(mesh);
  // a thin haze deck that ties the puffs together when seen from above
  const hazeMat = new THREE.ShaderMaterial({
    uniforms: { uCol: U.haze, uLit: U.cLit, uOp: U.cloudOpacity, uTime: U.time, uCamY: { value: 1000 } },
    vertexShader: /* glsl */`varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uCol, uLit; uniform float uOp, uTime, uCamY;
      varying vec3 vW;
      float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float noise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
      float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 7.1; a *= 0.5; } return v; }
      void main() {
        vec2 q = vW.xz * 0.00042 + vec2(uTime * 0.003, 0.0);
        float n = fbm(q);
        float a = smoothstep(0.34, 0.72, n) * 0.6;
        a *= smoothstep(30.0, 190.0, uCamY - 345.0);
        a *= 1.0 - smoothstep(2500.0, 3900.0, length(vW.xz - vec2(0.0, 500.0)));
        a *= uOp;
        if (a < 0.003) discard;
        vec3 col = mix(uCol, uLit, 0.4 + 0.45 * n);
        gl_FragColor = vec4(col * a, a);
      }`,
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const hazeGeo = new THREE.PlaneGeometry(9000, 9000, 1, 1);
  hazeGeo.rotateX(-Math.PI / 2);
  const haze = new THREE.Mesh(hazeGeo, hazeMat);
  haze.position.set(0, 345, 500);
  haze.renderOrder = 4;
  haze.frustumCulled = false;
  scene.add(haze);
  world.clouds = { mesh, list, aOffset, aScale, aVar, N, haze, hazeMat };
}
function updateClouds(dt) {
  const C = world.clouds;
  if (!C) return;
  const drift = reduceMotion ? 0 : dt * 6;
  const cp = camera.position;
  for (const c of C.list) {
    c.x += drift;
    if (c.x > 3600) c.x -= 7200;
    const dx = c.x - cp.x, dy = c.y - cp.y, dz = c.z - cp.z;
    c.d = dx * dx + dy * dy + dz * dz;
  }
  C.list.sort((a, b) => b.d - a.d);
  const o = C.aOffset.array, s = C.aScale.array, v = C.aVar.array;
  for (let i = 0; i < C.N; i++) {
    const c = C.list[i];
    o[i * 3] = c.x; o[i * 3 + 1] = c.y; o[i * 3 + 2] = c.z;
    s[i * 2] = c.w; s[i * 2 + 1] = c.h;
    v[i * 2] = c.v; v[i * 2 + 1] = c.a;
  }
  C.aOffset.needsUpdate = true; C.aScale.needsUpdate = true; C.aVar.needsUpdate = true;
}

/* ---------- community layout ---------- */
function layoutCommunity() {
  const r = rng(7);
  const villas = [];
  for (let b = 0; b < RINGS.length - 1; b++) {
    const inner = RINGS[b].r + RINGS[b].w / 2 + 3, outer = RINGS[b + 1].r - RINGS[b + 1].w / 2 - 3;
    const rowD = (outer - inner) / 2;
    for (const row of [0, 1]) {
      const rMid = row === 0 ? inner + rowD / 2 : outer - rowD / 2;
      const n = Math.floor((2 * Math.PI * rMid) / 21);
      const plotW = (2 * Math.PI * rMid) / n;
      for (let k = 0; k < n; k++) {
        const th = ((k + 0.5) / n) * Math.PI * 2;
        let near = false;
        for (const a of RADIALS) {
          const d = Math.abs((((th - a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
          if (d * rMid < 13) near = true;
        }
        if (near || r() < 0.035) continue;
        const w = 11.5 + r() * 2.5, d = 12 + r() * 3;
        const rc = row === 0 ? inner + 6 + d / 2 : outer - 6 - d / 2;
        villas.push({ th, rc, w, d, row, plotW, plotD: rowD, rPlot: rMid, pool: r() < 0.42, h1: 3.6 + r() * 0.7, upper: r() < 0.86, tone: r(), green: r(), tree: r() });
      }
    }
  }
  const blocks = [];
  for (let k = 0; k < 40; k++) {
    const th = (k / 40) * Math.PI * 2 + 0.04;
    let near = false;
    for (const a of RADIALS) {
      const d = Math.abs((((th - a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      if (d * 630 < 34) near = true;
    }
    if (near || r() < 0.12) continue;
    blocks.push({ th, rc: 618 + r() * 34, w: 34 + r() * 14, d: 15 + r() * 4, h: 16 + Math.floor(r() * 6) * 3.4, tone: r() });
  }
  return { villas, blocks };
}

/* ---------- ground texture ---------- */
function drawGround(L, size) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const S = size / (2 * GROUND_R);
  const X = (x) => (x + GROUND_R) * S, Z = (z) => (z + GROUND_R) * S;
  const r = rng(77);
  const cx = X(0), cz = Z(0);
  const TAU = Math.PI * 2;

  g.fillStyle = '#d3c1a0';
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 360; i++) {
    const x = r() * size, y = r() * size, rad = (25 + r() * 150) * S;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    const c = r() < 0.5 ? '184,158,120' : '231,217,190';
    grd.addColorStop(0, `rgba(${c},${0.1 + r() * 0.16})`);
    grd.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = grd;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const nz = document.createElement('canvas');
  nz.width = nz.height = 256;
  const nzg = nz.getContext('2d');
  const id = nzg.createImageData(256, 256);
  for (let i = 0; i < id.data.length; i += 4) { const v = 100 + r() * 80; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  nzg.putImageData(id, 0, 0);
  g.save(); g.globalAlpha = 0.14; g.globalCompositeOperation = 'overlay'; g.fillStyle = g.createPattern(nz, 'repeat'); g.fillRect(0, 0, size, size); g.restore();

  const ring = (r0, r1) => { g.beginPath(); g.arc(cx, cz, r1 * S, 0, TAU); g.arc(cx, cz, r0 * S, 0, TAU, true); };

  /* central park */
  g.fillStyle = '#86985e';
  ring(58, 189); g.fill();
  g.save(); ring(58, 189); g.clip();
  for (let i = -200; i < 200; i += 7) { g.fillStyle = i % 14 === 0 ? 'rgba(255,255,230,.05)' : 'rgba(30,50,10,.04)'; g.fillRect(X(i), Z(-200), 3.5 * S, 400 * S); }
  for (let i = 0; i < 70; i++) {
    const a = r() * TAU, d = 70 + r() * 110, rad = (6 + r() * 16) * S;
    const x = X(Math.cos(a) * d), y = Z(Math.sin(a) * d);
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, `rgba(${r() < 0.5 ? '70,95,45' : '150,170,100'},.25)`); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // lake (west)
  g.fillStyle = '#5f9fa8';
  g.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * TAU, rr = 1 + 0.18 * Math.sin(a * 3 + 1) + 0.1 * Math.sin(a * 5);
    const x = X(-122 + Math.cos(a) * 34 * rr), y = Z(-18 + Math.sin(a) * 20 * rr);
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.fill();
  g.strokeStyle = 'rgba(230,240,235,.65)'; g.lineWidth = 1.2 * S; g.stroke();
  // paths
  g.strokeStyle = '#e1d6c2'; g.lineWidth = 5 * S;
  g.beginPath(); g.arc(cx, cz, 124 * S, 0, TAU); g.stroke();
  g.lineWidth = 3.5 * S;
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    g.beginPath(); g.moveTo(X(Math.cos(a) * 58), Z(Math.sin(a) * 58)); g.lineTo(X(Math.cos(a) * 189), Z(Math.sin(a) * 189)); g.stroke();
  }
  g.lineWidth = 2.5 * S;
  for (let k = 0; k < 6; k++) {
    const a0 = r() * TAU, a1 = a0 + 0.6 + r() * 0.6, d0 = 80 + r() * 30, d1 = 150 + r() * 30;
    g.beginPath(); g.moveTo(X(Math.cos(a0) * d0), Z(Math.sin(a0) * d0));
    g.quadraticCurveTo(X(Math.cos((a0 + a1) / 2) * (d0 + d1) * 0.62), Z(Math.sin((a0 + a1) / 2) * (d0 + d1) * 0.62), X(Math.cos(a1) * d1), Z(Math.sin(a1) * d1));
    g.stroke();
  }
  // courts + playground
  g.save(); g.translate(X(112), Z(-78)); g.rotate(-0.6);
  g.fillStyle = '#5f8d78'; g.fillRect(-18 * S, -11 * S, 36 * S, 22 * S);
  g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 0.4 * S; g.strokeRect(-16 * S, -9 * S, 15 * S, 18 * S); g.strokeRect(1 * S, -9 * S, 15 * S, 18 * S);
  g.restore();
  g.fillStyle = '#c98f6a'; g.beginPath(); g.arc(X(96), Z(-118), 9 * S, 0, TAU); g.fill();
  g.restore();

  /* plaza, boulevard, drop-off */
  g.fillStyle = '#d6cebf';
  g.beginPath(); g.arc(cx, cz, 58 * S, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(160,150,135,.35)'; g.lineWidth = Math.max(1, 0.12 * S);
  for (let i = -58; i <= 58; i += 3) {
    g.beginPath(); g.moveTo(X(i), Z(-58)); g.lineTo(X(i), Z(58)); g.stroke();
    g.beginPath(); g.moveTo(X(-58), Z(i)); g.lineTo(X(58), Z(i)); g.stroke();
  }
  g.fillStyle = '#e4ddcf'; g.fillRect(X(-9), Z(56), 18 * S, 136 * S);
  g.fillStyle = '#6f8c4c'; g.fillRect(X(-12), Z(60), 3.2 * S, 130 * S); g.fillRect(X(8.8), Z(60), 3.2 * S, 130 * S);
  g.fillStyle = '#67635d'; g.fillRect(X(-4), Z(44), 8 * S, 150 * S);
  g.beginPath(); g.arc(X(0), Z(36), 11 * S, 0, TAU); g.fill();
  g.fillStyle = '#6f8c4c'; g.beginPath(); g.arc(X(0), Z(36), 5.5 * S, 0, TAU); g.fill();
  g.fillStyle = '#9fd2de'; g.beginPath(); g.arc(X(0), Z(36), 2.4 * S, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(236,231,220,.7)'; g.lineWidth = Math.max(1, 0.3 * S); g.setLineDash([3 * S, 4 * S]);
  g.beginPath(); g.moveTo(X(0), Z(48)); g.lineTo(X(0), Z(192)); g.stroke(); g.setLineDash([]);
  // planters around the podium
  g.fillStyle = '#6f8c4c';
  for (const [x0, z0, w, h] of [[-50, -26, 6, 52], [44, -26, 6, 52], [-44, 28, 30, 5], [14, 28, 30, 5], [-44, -30, 88, 4]]) g.fillRect(X(x0), Z(z0), w * S, h * S);

  /* roads */
  const radSeg = (a, r0, r1) => { g.beginPath(); g.moveTo(X(Math.cos(a) * r0), Z(Math.sin(a) * r0)); g.lineTo(X(Math.cos(a) * r1), Z(Math.sin(a) * r1)); g.stroke(); };
  g.strokeStyle = '#cbc2b1';
  for (const rg of RINGS) { g.lineWidth = (rg.w + 7) * S; g.beginPath(); g.arc(cx, cz, rg.r * S, 0, TAU); g.stroke(); }
  g.lineWidth = 17 * S; for (const a of RADIALS) radSeg(a, 196, 760);
  g.strokeStyle = '#67635d';
  for (const rg of RINGS) { g.lineWidth = rg.w * S; g.beginPath(); g.arc(cx, cz, rg.r * S, 0, TAU); g.stroke(); }
  g.lineWidth = 10 * S; for (const a of RADIALS) radSeg(a, 196, 760);
  g.strokeStyle = 'rgba(236,231,220,.72)'; g.lineWidth = Math.max(1, 0.32 * S); g.setLineDash([4 * S, 6 * S]);
  for (const rg of RINGS) { g.beginPath(); g.arc(cx, cz, rg.r * S, 0, TAU); g.stroke(); }
  for (const a of RADIALS) radSeg(a, 203, 760);
  g.setLineDash([]);
  g.fillStyle = '#67635d';
  for (const rg of RINGS) for (const a of RADIALS) { g.beginPath(); g.arc(X(Math.cos(a) * rg.r), Z(Math.sin(a) * rg.r), (rg.w * 0.75) * S, 0, TAU); g.fill(); }

  /* villa plots */
  const greens = ['#8c9c66', '#83945e', '#95a36f', '#7a8b56'];
  for (const v of L.villas) {
    g.save();
    g.translate(X(Math.cos(v.th) * v.rPlot), Z(Math.sin(v.th) * v.rPlot));
    g.rotate(v.th + Math.PI / 2);
    const pw = v.plotW * S, pd = v.plotD * S;
    g.fillStyle = v.green > 0.16 ? greens[Math.floor(v.green * 4) % 4] : '#d6c7a8';
    g.fillRect(-pw / 2 + 0.5 * S, -pd / 2 + 0.5 * S, pw - 1 * S, pd - 1 * S);
    g.strokeStyle = 'rgba(238,230,216,.92)'; g.lineWidth = Math.max(1, 0.5 * S);
    g.strokeRect(-pw / 2, -pd / 2, pw, pd);
    const fs = v.row === 0 ? 1 : -1;
    const hyL = (v.rPlot - v.rc) * S; // local y of the house centre (local +y points inward)
    const hw = v.w * S, hd = v.d * S;
    const houseFront = hyL + fs * hd / 2, plotFront = fs * pd / 2;
    g.fillStyle = '#c6beaf';
    g.fillRect(hw / 2 - 4.6 * S, Math.min(houseFront, plotFront), 4.2 * S, Math.abs(plotFront - houseFront));
    if (v.pool) {
      const backEdge = hyL - fs * hd / 2, plotBack = -fs * pd / 2;
      const mid = (backEdge + plotBack) / 2;
      g.fillStyle = '#ebe3d4'; g.fillRect(-5.4 * S, mid - 2.7 * S, 10.8 * S, 5.4 * S);
      g.fillStyle = '#45aac2'; g.fillRect(-4.2 * S, mid - 1.6 * S, 8.4 * S, 3.2 * S);
    }
    g.fillStyle = '#a69882';
    g.fillRect(-hw / 2 - 0.4 * S, hyL - hd / 2 - 0.4 * S, hw + 0.8 * S, hd + 0.8 * S);
    g.restore();
  }
  /* mid-rise plots in the outer band */
  for (const b of L.blocks) {
    g.save();
    g.translate(X(Math.cos(b.th) * b.rc), Z(Math.sin(b.th) * b.rc));
    g.rotate(b.th + Math.PI / 2);
    g.fillStyle = '#cfc6b6'; g.fillRect((-b.w / 2 - 8) * S, (-b.d / 2 - 10) * S, (b.w + 16) * S, (b.d + 20) * S);
    g.fillStyle = '#6a6762'; g.fillRect((-b.w / 2 - 6) * S, (b.d / 2 + 2) * S, (b.w + 12) * S, 7 * S);
    g.strokeStyle = 'rgba(240,236,228,.7)'; g.lineWidth = Math.max(1, 0.2 * S);
    for (let x = -b.w / 2 - 5; x < b.w / 2 + 6; x += 2.6) { g.beginPath(); g.moveTo(x * S, (b.d / 2 + 2) * S); g.lineTo(x * S, (b.d / 2 + 6) * S); g.stroke(); }
    g.fillStyle = '#7d9a56'; g.fillRect((-b.w / 2 - 6) * S, (-b.d / 2 - 8) * S, (b.w + 12) * S, 4 * S);
    g.fillStyle = '#a69882'; g.fillRect((-b.w / 2) * S, (-b.d / 2) * S, b.w * S, b.d * S);
    g.restore();
  }
  /* soft edge into the desert */
  const edge = g.createRadialGradient(cx, cz, 690 * S, cx, cz, 805 * S);
  edge.addColorStop(0, 'rgba(211,193,160,0)'); edge.addColorStop(1, 'rgba(211,193,160,1)');
  g.fillStyle = edge; g.fillRect(0, 0, size, size);
  return cv;
}

function drawUrban(size) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const T = 1150, S = size / T;
  const r = rng(404);
  g.fillStyle = '#cbbda4'; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 2200; i++) { g.fillStyle = r() < 0.5 ? 'rgba(165,145,115,.12)' : 'rgba(235,225,205,.12)'; const s2 = (3 + r() * 16) * S; g.fillRect(r() * size, r() * size, s2, s2); }
  const B = T / 4;
  const roofs = ['#e7e0d3', '#ddd2bf', '#d2c3a8', '#eee8de', '#c9b495', '#d8ccb9'];
  const shadow = 'rgba(70,60,48,.38)';
  for (let bi = 0; bi < 4; bi++) for (let bj = 0; bj < 4; bj++) {
    const x0 = bi * B + 14, z0 = bj * B + 14, w = B - 28;
    const kind = r();
    if (kind < 0.48) {
      for (let row = 0; row < 4; row++) {
        const sz = z0 + row * (w / 4);
        g.fillStyle = '#9b927f'; g.fillRect(x0 * S, (sz + w / 4 - 7) * S, w * S, 7 * S);
        for (const half of [0, 1]) {
          const hz = sz + 2 + half * ((w / 4 - 9) / 2);
          for (let hx = x0 + 2; hx < x0 + w - 13; hx += 17) {
            if (r() < 0.07) continue;
            const yd = (w / 4 - 9) / 2 - 2;
            g.fillStyle = r() < 0.7 ? '#8d9b66' : '#cdbf9f'; g.fillRect(hx * S, hz * S, 15 * S, yd * S);
            g.fillStyle = shadow; g.fillRect((hx + 1.4) * S, (hz + 2.2) * S, 11 * S, (yd - 3) * S);
            g.fillStyle = roofs[Math.floor(r() * roofs.length)]; g.fillRect(hx * S, (hz + 0.6) * S, 11 * S, (yd - 3) * S);
            if (r() < 0.35) { g.fillStyle = '#4fa9bf'; g.fillRect((hx + 11.5) * S, (hz + 2) * S, 2.6 * S, 5 * S); }
          }
        }
      }
    } else if (kind < 0.82) {
      g.fillStyle = '#c3b8a5'; g.fillRect(x0 * S, z0 * S, w * S, w * S);
      const n = 3 + Math.floor(r() * 4);
      for (let k = 0; k < n; k++) {
        const bw = 34 + r() * 34, bd = 16 + r() * 8;
        const bx = x0 + 8 + r() * (w - bw - 16), bz = z0 + 8 + r() * (w - bd - 30);
        g.fillStyle = '#6c6963'; g.fillRect((bx - 4) * S, (bz + bd + 3) * S, (bw + 8) * S, 9 * S);
        g.fillStyle = 'rgba(240,236,228,.6)';
        for (let sx = bx - 3; sx < bx + bw + 3; sx += 2.6) g.fillRect(sx * S, (bz + bd + 3) * S, 0.25 * S, 4 * S);
        g.fillStyle = shadow; g.fillRect((bx + 4) * S, (bz + 5) * S, bw * S, bd * S);
        g.fillStyle = roofs[Math.floor(r() * roofs.length)]; g.fillRect(bx * S, bz * S, bw * S, bd * S);
        g.fillStyle = 'rgba(120,110,95,.35)'; g.fillRect((bx + bw * 0.3) * S, (bz + bd * 0.3) * S, bw * 0.2 * S, bd * 0.3 * S);
      }
    } else if (kind < 0.92) {
      g.fillStyle = '#7f9358'; g.fillRect(x0 * S, z0 * S, w * S, w * S);
      for (let k = 0; k < 90; k++) { g.fillStyle = r() < 0.5 ? '#5d6e42' : '#6c7d4c'; g.beginPath(); g.arc((x0 + r() * w) * S, (z0 + r() * w) * S, (2 + r() * 3) * S, 0, Math.PI * 2); g.fill(); }
    }
  }
  g.strokeStyle = '#d2c8b5';
  g.lineWidth = 24 * S;
  for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(k * B * S, 0); g.lineTo(k * B * S, size); g.stroke(); g.beginPath(); g.moveTo(0, k * B * S); g.lineTo(size, k * B * S); g.stroke(); }
  g.strokeStyle = '#66625c';
  g.lineWidth = 15 * S;
  for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(k * B * S, 0); g.lineTo(k * B * S, size); g.stroke(); g.beginPath(); g.moveTo(0, k * B * S); g.lineTo(size, k * B * S); g.stroke(); }
  return cv;
}
function buildGround(L) {
  const tex = new THREE.CanvasTexture(drawGround(L, Q.ground));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  const geo = new THREE.CircleGeometry(GROUND_R, 128);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 });
  const ground = new THREE.Mesh(geo, mat);
  ground.receiveShadow = true;
  scene.add(ground);

  // desert and surrounding city fabric beyond the circle
  const sc = document.createElement('canvas');
  sc.width = sc.height = 256;
  const sg = sc.getContext('2d');
  const r = rng(5);
  sg.fillStyle = '#d3c1a0'; sg.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) { sg.fillStyle = r() < 0.5 ? 'rgba(185,160,122,.10)' : 'rgba(236,222,196,.10)'; const s2 = 2 + r() * 10; sg.fillRect(r() * 256, r() * 256, s2, s2 * (0.3 + r())); }
  const stex = new THREE.CanvasTexture(sc);
  stex.colorSpace = THREE.SRGBColorSpace;
  stex.wrapS = stex.wrapT = THREE.RepeatWrapping;
  stex.anisotropy = tex.anisotropy;
  const utex = new THREE.CanvasTexture(drawUrban(Q.urban));
  utex.colorSpace = THREE.SRGBColorSpace;
  utex.wrapS = utex.wrapT = THREE.RepeatWrapping;
  utex.anisotropy = tex.anisotropy;
  const dgeo = new THREE.RingGeometry(GROUND_R - 6, 26000, 96, 6);
  dgeo.rotateX(-Math.PI / 2);
  const dmat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  dmat.onBeforeCompile = (sh) => {
    sh.uniforms.uSand = { value: stex };
    sh.uniforms.uUrban = { value: utex };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vWXZ;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vWXZ; uniform sampler2D uSand; uniform sampler2D uUrban;\n' + URBAN_GLSL)
      .replace('#include <map_fragment>', `
        vec4 sandC = texture2D(uSand, vWXZ / 115.0);
        float dsel = smoothstep(0.47, 0.53, un2(vWXZ / 3100.0 + 5.0));
        vec4 urbC = mix(texture2D(uUrban, vWXZ / 1150.0), texture2D(uUrban, vec2(vWXZ.y, -vWXZ.x) / 1480.0 + 0.37), dsel);
        diffuseColor *= mix(sandC, urbC, urbanMask(vWXZ));`);
  };
  const desert = new THREE.Mesh(dgeo, dmat);
  desert.position.y = -0.2;
  desert.receiveShadow = true;
  scene.add(desert);

  // highways (strips)
  const hc = document.createElement('canvas');
  hc.width = 64; hc.height = 256;
  const hg = hc.getContext('2d');
  hg.fillStyle = '#5a5752'; hg.fillRect(0, 0, 64, 256);
  hg.fillStyle = '#8b847a'; hg.fillRect(31, 0, 2, 256);
  hg.fillStyle = 'rgba(235,230,220,.8)';
  for (const x of [10, 20, 44, 54]) for (let y = 0; y < 256; y += 32) hg.fillRect(x, y, 1, 14);
  hg.fillRect(2, 0, 1, 256); hg.fillRect(61, 0, 1, 256);
  const htex = new THREE.CanvasTexture(hc);
  htex.colorSpace = THREE.SRGBColorSpace;
  htex.wrapS = htex.wrapT = THREE.RepeatWrapping;
  htex.anisotropy = tex.anisotropy;
  const hmat = new THREE.MeshStandardMaterial({ map: htex, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const strip = (x0, z0, x1, z1, w) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const geo2 = new THREE.PlaneGeometry(w, len);
    geo2.rotateX(-Math.PI / 2);
    const m = hmat.clone();
    m.map = htex.clone(); m.map.needsUpdate = true; m.map.repeat.set(1, len / 60);
    const mesh = new THREE.Mesh(geo2, m);
    mesh.position.set((x0 + x1) / 2, 0.05, (z0 + z1) / 2);
    mesh.rotation.y = Math.atan2(x1 - x0, z1 - z0);
    mesh.receiveShadow = true;
    scene.add(mesh);
  };
  strip(-24000, -742, 24000, -742, 46);
  strip(-752, -24000, -752, 24000, 42);
  strip(380, -742, 1250, -6600, 34);
  strip(-9000, -2100, 9000, -5300, 44);
}

/* ---------- community 3D ---------- */
function buildCommunity(L) {
  const up = new THREE.Vector3(0, 1, 0);
  const m = new THREE.Matrix4(), t = new THREE.Vector3(), n = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
  const boxG = new THREE.BoxGeometry(1, 1, 1);
  boxG.translate(0, 0.5, 0);
  const vMat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
  const V = L.villas;
  const base = new THREE.InstancedMesh(boxG, vMat, V.length);
  const upper = new THREE.InstancedMesh(boxG, vMat, V.length);
  const tones = ['#ece6da', '#e2d7c4', '#d8c9ae', '#efe9df', '#cdb89a', '#dcd1bf', '#c9b79d'];
  let ui = 0;
  V.forEach((v, i) => {
    // right-handed basis (x: along the street, z: toward the centre) so faces keep their winding
    t.set(-Math.sin(v.th), 0, Math.cos(v.th));
    n.set(-Math.cos(v.th), 0, -Math.sin(v.th));
    m.makeBasis(t, up, n).scale(s.set(v.w, v.h1, v.d)).setPosition(Math.cos(v.th) * v.rc, 0, Math.sin(v.th) * v.rc);
    base.setMatrixAt(i, m);
    c.set(tones[Math.floor(v.tone * tones.length)]);
    base.setColorAt(i, c);
    if (v.upper) {
      const back = v.row === 0 ? 1 : -1;
      const ru = v.rc + back * v.d * 0.14;
      m.makeBasis(t, up, n).scale(s.set(v.w * 0.7, 3.3, v.d * 0.62)).setPosition(Math.cos(v.th) * ru, v.h1, Math.sin(v.th) * ru);
      upper.setMatrixAt(ui, m);
      c.offsetHSL(0, -0.02, 0.03);
      upper.setColorAt(ui, c);
      ui++;
    }
  });
  upper.count = ui;
  for (const im of [base, upper]) {
    im.castShadow = true; im.receiveShadow = true;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    scene.add(im);
  }

  // trees: gardens + park
  const r = rng(31);
  const trees = [];
  for (const v of V) {
    if (v.tree < 0.25) continue;
    const back = v.row === 0 ? 1 : -1;
    const k = v.tree > 0.7 ? 2 : 1;
    for (let j = 0; j < k; j++) {
      const rr = v.rc + back * (v.d / 2 + 3 + r() * 5);
      const off = (r() - 0.5) * (v.plotW - 4);
      trees.push([Math.cos(v.th) * rr - Math.sin(v.th) * off, Math.sin(v.th) * rr + Math.cos(v.th) * off, 0.7 + r() * 0.45]);
    }
  }
  let guard = 0;
  // park trees grow in loose clusters
  const seeds = [];
  for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, d = 72 + r() * 108; seeds.push([Math.cos(a) * d, Math.sin(a) * d]); }
  while (trees.length < V.length * 1.2 + 260 && guard++ < 8000) {
    const sd = seeds[Math.floor(r() * seeds.length)];
    const x = sd[0] + (r() - 0.5) * 34, z = sd[1] + (r() - 0.5) * 34;
    const d = Math.hypot(x, z);
    if (d < 64 || d > 184) continue;
    if (Math.abs(x) < 24 && z > 40) continue; // boulevard + camera corridor
    if (x > -48 && x < 70 && z > 140) continue;
    if (Math.hypot(x + 122, z + 18) < 42) continue; // lake
    if (Math.hypot(x - 112, z + 78) < 26) continue; // courts
    if (Math.abs(d - 124) < 5) continue;
    trees.push([x, z, 1.1 + r() * 0.8]);
  }
  // an organic canopy: a few displaced spheres welded together, smooth-shaded
  const blobs = [[0, 2.3, 0, 1.25], [0.78, 1.85, 0.3, 0.92], [-0.72, 1.95, -0.25, 0.98], [0.12, 2.85, -0.38, 0.82], [-0.2, 1.7, 0.72, 0.8]];
  const parts = blobs.map(([x, y, z, sc]) => {
    const g = new THREE.IcosahedronGeometry(sc, 2);
    g.deleteAttribute('uv');
    const ps = g.getAttribute('position');
    for (let i = 0; i < ps.count; i++) {
      const vx = ps.getX(i), vy = ps.getY(i), vz = ps.getZ(i);
      const k = 1 + (vnoise(vx * 2.3 + x * 5 + 11, vz * 2.3 + vy * 1.9 + z * 3) - 0.5) * 0.42;
      ps.setXYZ(i, vx * k + x, vy * k * 0.88 + y, vz * k + z);
    }
    const cols = new Float32Array(ps.count * 3).fill(1);
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return g;
  });
  const trunk = new THREE.CylinderGeometry(0.11, 0.17, 1.9, 6).toNonIndexed();
  trunk.deleteAttribute('uv');
  trunk.translate(0, 0.95, 0);
  const tcol = new Float32Array(trunk.getAttribute('position').count * 3);
  for (let i = 0; i < tcol.length; i += 3) { tcol[i] = 0.62; tcol[i + 1] = 0.5; tcol[i + 2] = 0.42; }
  trunk.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
  let tGeo = mergeGeometries([...parts, trunk]);
  tGeo = mergeVertices(tGeo, 1e-3);
  tGeo.computeVertexNormals();
  const tMat = new THREE.MeshStandardMaterial({ roughness: 0.95, vertexColors: true });
  const tm = new THREE.InstancedMesh(tGeo, tMat, trees.length);
  const tcols = ['#566640', '#617147', '#4c5b39', '#6b7a4f', '#5a6b44', '#707f55'];
  trees.forEach(([x, z, sz], i) => {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI * 2);
    m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(sz * 1.6, sz * (1.5 + r() * 0.5), sz * 1.6));
    tm.setMatrixAt(i, m);
    tm.setColorAt(i, c.set(tcols[Math.floor(r() * tcols.length)]));
  });
  tm.castShadow = true; tm.receiveShadow = true;
  tm.instanceMatrix.needsUpdate = true; tm.instanceColor.needsUpdate = true;
  tm.computeBoundingSphere();
  scene.add(tm);
}

/* ---------- skyline (window shader, instanced) ---------- */
function windowMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]),
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vCol; varying vec3 vLocal; varying vec3 vON; varying float vSeed;
      #include <fog_pars_vertex>
      void main() {
        mat4 m = modelMatrix;
        #ifdef USE_INSTANCING
          m = modelMatrix * instanceMatrix;
        #endif
        vec4 w = m * vec4(position, 1.0);
        vN = normalize(mat3(m) * normal);
        vON = normal;
        vLocal = position * vec3(length(m[0].xyz), length(m[1].xyz), length(m[2].xyz));
        #ifdef USE_INSTANCING_COLOR
          vCol = instanceColor;
        #else
          vCol = vec3(0.62, 0.6, 0.58);
        #endif
        vSeed = fract(sin(dot(m[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
        vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSunDir, uSunCol, uAmbCol, uHor; uniform float uSunI, uGlow;
      varying vec3 vN; varying vec3 vCol; varying vec3 vLocal; varying vec3 vON; varying float vSeed;
      #include <fog_pars_fragment>
      void main() {
        vec3 N = normalize(vN);
        float diff = max(dot(N, uSunDir), 0.0);
        vec3 lit = vCol * (uAmbCol + uSunCol * uSunI * 0.32 * diff);
        vec3 col = lit;
        if (abs(vON.y) < 0.5) {
          float along = abs(vON.x) > 0.5 ? vLocal.z : vLocal.x;
          vec2 cell = vec2(along / 3.1, vLocal.y / 3.5);
          vec2 fw = fwidth(cell);
          float aa = clamp(1.0 - max(fw.x, fw.y) * 1.4, 0.0, 1.0);
          vec2 f = fract(cell);
          float win = step(0.14, f.x) * step(f.x, 0.88) * step(0.2, f.y) * step(f.y, 0.86);
          win = mix(0.5, win, aa);
          vec3 glass = mix(vCol * 0.32, uHor * 0.75, 0.42) * (0.55 + 0.45 * diff) + uAmbCol * 0.05;
          col = mix(lit, glass, win * (0.55 + 0.3 * vSeed));
          float r = fract(sin(dot(floor(cell) + vSeed * 71.0, vec2(12.9898, 78.233))) * 43758.5453);
          float litW = mix(uGlow * 0.4 * 0.5, win * step(r, uGlow * 0.4), aa);
          col += litW * vec3(1.0, 0.74, 0.44) * 1.5 * uGlow;
        } else {
          col *= 0.94;
        }
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }`,
    fog: true,
  });
}
let winMats = [];
function makeWindowMat() {
  const mm = windowMaterial();
  mm.uniforms.uSunDir = U.sunDir; mm.uniforms.uSunCol = U.sunCol; mm.uniforms.uAmbCol = U.ambCol;
  mm.uniforms.uHor = U.hor; mm.uniforms.uSunI = U.sunI; mm.uniforms.uGlow = U.glow;
  winMats.push(mm);
  return mm;
}
/* urban mask shared by the ground shader and the 3D mid-rises */
const URBAN_GLSL = /* glsl */`
  float uh2(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float un2(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(uh2(i), uh2(i + vec2(1.0, 0.0)), u.x), mix(uh2(i + vec2(0.0, 1.0)), uh2(i + vec2(1.0, 1.0)), u.x), u.y); }
  float urbanMask(vec2 w) {
    float d = length(w);
    float nm = un2(w / 2600.0) * 0.65 + un2(w / 900.0 + 17.0) * 0.35;
    float m = smoothstep(0.38, 0.54, nm) * (1.0 - smoothstep(5500.0, 9500.0, d));
    m = max(m, 1.0 - smoothstep(3800.0, 5600.0, length(w - vec2(500.0, -4300.0))));
    m = max(m, 1.0 - smoothstep(2200.0, 3600.0, length(w - vec2(-3900.0, -2300.0))));
    return m * smoothstep(835.0, 905.0, d);
  }`;
function urbanMaskJS(x, z) {
  const fr = (v) => v - Math.floor(v);
  const h2 = (px, py) => { px = fr(px * 123.34); py = fr(py * 456.21); const dd = px * (px + 45.32) + py * (py + 45.32); px += dd; py += dd; return fr(px * py); };
  const n2 = (px, py) => {
    const ix = Math.floor(px), iy = Math.floor(py), fx = px - ix, fy = py - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return lerp(lerp(h2(ix, iy), h2(ix + 1, iy), ux), lerp(h2(ix, iy + 1), h2(ix + 1, iy + 1), ux), uy);
  };
  const ss = (e0, e1, v) => smooth(inv(e0, e1, v));
  const d = Math.hypot(x, z);
  const nm = n2(x / 2600, z / 2600) * 0.65 + n2(x / 900 + 17, z / 900 + 17) * 0.35;
  let m = ss(0.38, 0.54, nm) * (1 - ss(5500, 9500, d));
  m = Math.max(m, 1 - ss(3800, 5600, Math.hypot(x - 500, z + 4300)));
  m = Math.max(m, 1 - ss(2200, 3600, Math.hypot(x + 3900, z + 2300)));
  return m * ss(835, 905, d);
}
function buildSkyline(L) {
  const r = rng(99);
  const boxes = [], octs = [];
  const add = (kind, x, z, w, d, h, tone, rot = 0, y = 0) => (kind === 'oct' ? octs : boxes).push({ x, z, w, d, h, tone, rot, y });
  const tower = (x, z, w, d, h, rot = 0) => {
    const kind = r() < 0.3 ? 'oct' : 'box';
    const tone = 0.5 * r();
    add(kind, x, z, w, d, h, tone, rot);
    if (h > 170 && r() < 0.5) { const s2 = 0.58 + r() * 0.15; add(kind, x, z, w * s2, d * s2, 16 + r() * 40, tone, rot, h); }
  };
  for (let i = 0; i < 80; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 720; tower(500 + Math.cos(a) * d, -4300 + Math.sin(a) * d * 0.6, 26 + r() * 30, 26 + r() * 30, 90 + Math.pow(r(), 1.5) * 340); }
  for (let i = 0; i < 150; i++) { const tt = r(); tower(lerp(-7000, 7000, tt) + (r() - 0.5) * 120, lerp(-2300, -5100, tt) + (r() - 0.5) * 240, 22 + r() * 26, 22 + r() * 26, 55 + Math.pow(r(), 2) * 250, 0.3); }
  for (let i = 0; i < 60; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 540; tower(-3900 + Math.cos(a) * d, -2300 + Math.sin(a) * d * 0.7, 24 + r() * 24, 24 + r() * 24, 120 + Math.pow(r(), 1.3) * 250); }
  // mid-rises in the surrounding urban fabric
  let guard = 0, mids = 0;
  while (mids < 170 && guard++ < 6000) {
    const a = r() * Math.PI * 2, d = 880 + Math.pow(r(), 1.4) * 2600;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (urbanMaskJS(x, z) < 0.6) continue;
    if (z > 400 && Math.abs(x) < 700) continue; // keep the hero sightline open
    const rot = r() < 0.5 ? 0 : Math.PI / 2;
    add('box', x, z, 28 + r() * 34, 15 + r() * 8, 12 + Math.floor(r() * 9) * 3.4, 0.55 + 0.45 * r(), rot);
    mids++;
  }
  for (const bl of L.blocks) add('box', Math.cos(bl.th) * bl.rc, Math.sin(bl.th) * bl.rc, bl.w, bl.d, bl.h, 0.55 + 0.45 * bl.tone, -bl.th + Math.PI / 2);

  const glassTones = ['#7d8ea1', '#6b7e93', '#8b99a9', '#a2acb6', '#60718a', '#93a1af'];
  const stoneTones = ['#cdc1ab', '#d8cebc', '#c2b59f', '#e1d8c9', '#bdb3a3'];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), yA = new THREE.Vector3(0, 1, 0);
  const build = (geo, items) => {
    const im = new THREE.InstancedMesh(geo, makeWindowMat(), items.length);
    items.forEach((it, i) => {
      q.setFromAxisAngle(yA, it.rot || 0);
      m.compose(new THREE.Vector3(it.x, it.y, it.z), q, new THREE.Vector3(it.w, it.h, it.d));
      im.setMatrixAt(i, m);
      const pal = it.tone < 0.5 ? glassTones : stoneTones;
      im.setColorAt(i, c.set(pal[Math.floor((it.tone < 0.5 ? it.tone * 2 : (it.tone - 0.5) * 2) * pal.length) % pal.length]));
    });
    im.instanceMatrix.needsUpdate = true;
    im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    im.castShadow = true;
    scene.add(im);
  };
  const boxG = new THREE.BoxGeometry(1, 1, 1); boxG.translate(0, 0.5, 0);
  const octG = new THREE.CylinderGeometry(0.5, 0.5, 1, 8, 1); octG.translate(0, 0.5, 0);
  build(boxG, boxes);
  build(octG, octs);

  // a generic supertall needle in the downtown cluster
  const tiers = [[34, 150], [29, 130], [24, 115], [19, 105], [14, 95], [9.5, 85], [6, 70], [3, 60], [1.2, 70]];
  const parts = [];
  let y = 0;
  tiers.forEach(([rad, h], i) => {
    const g = new THREE.CylinderGeometry(rad * 0.92, rad, h, 6, 1);
    g.rotateY(i * 0.35);
    g.translate(0, y + h / 2, 0);
    parts.push(g);
    y += h;
  });
  const needleMat = makeWindowMat();
  const needle = new THREE.Mesh(mergeGeometries(parts), needleMat);
  needle.position.set(620, 0, -4380);
  scene.add(needle);
}

/* ---------- materials for the tower ---------- */
const MATS = {};
function buildMaterials() {
  MATS.white = new THREE.MeshStandardMaterial({ color: 0xebe6dd, roughness: 0.78, metalness: 0 });
  MATS.white.onBeforeCompile = (sh) => {
    sh.uniforms.uSoffit = U.soffit; sh.uniforms.uHover = U.hover; sh.uniforms.uSel = U.sel;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN; uniform float uSoffit; uniform float uHover; uniform float uSel;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float lvW = floor((vWP.y - 12.0 + 0.7) / 3.4) + 1.0;
        float soffitMask = step(vWN.y, -0.5) * step(10.3, abs(vWP.z));
        totalEmissiveRadiance += vec3(1.0, 0.7, 0.42) * uSoffit * soffitMask;
        totalEmissiveRadiance += vec3(0.55, 0.74, 1.0) * 0.55 * (1.0 - step(0.5, abs(lvW - uHover)));
        totalEmissiveRadiance += vec3(1.0, 0.78, 0.48) * 0.4 * (1.0 - step(0.5, abs(lvW - uSel)));`);
  };
  MATS.plain = new THREE.MeshStandardMaterial({ color: 0xebe6dd, roughness: 0.8, metalness: 0 });
  MATS.concrete = new THREE.MeshStandardMaterial({ color: 0x9f998f, roughness: 0.95 });
  MATS.rail = new THREE.MeshStandardMaterial({ color: 0xb9ccd6, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.24, depthWrite: false });
  MATS.darkGlass = new THREE.MeshStandardMaterial({ color: 0x1c242e, roughness: 0.22, metalness: 0.65, emissive: 0xffc58a, emissiveIntensity: 0 });
  MATS.lobby = new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 0.4, emissive: 0xffd29a, emissiveIntensity: 0.3 });
  MATS.pool = new THREE.MeshStandardMaterial({ color: 0x5fc6d8, roughness: 0.08, metalness: 0.1, emissive: 0x2ab6d2, emissiveIntensity: 0 });
  MATS.deck = new THREE.MeshStandardMaterial({ color: 0xb59d82, roughness: 0.85 });
  MATS.crane = new THREE.MeshStandardMaterial({ color: 0xe0a83a, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide, alphaTest: 0.5 });
  MATS.dark = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.6 });
  MATS.lamp = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, emissive: 0xffd9a0, emissiveIntensity: 0 });
  MATS.pole = new THREE.MeshStandardMaterial({ color: 0x3a3b3d, roughness: 0.5, metalness: 0.5 });
  MATS.glass = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]),
    vertexShader: /* glsl */`
      varying vec3 vW; varying vec3 vN;
      #include <fog_pars_vertex>
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
        vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uZen, uHor, uGnd, uSunDir, uSunCol; uniform float uSunI, uGlow, uHover, uSel, uAmb;
      varying vec3 vW; varying vec3 vN;
      #include <fog_pars_fragment>
      float h21(vec2 p) { p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
      void main() {
        vec3 N = normalize(vN);
        vec3 V = normalize(vW - cameraPosition);
        vec3 R = reflect(V, N);
        vec3 sky = mix(uHor, uZen, smoothstep(0.0, 0.6, R.y));
        if (R.y < 0.0) sky = mix(uHor * 0.55, uGnd * 0.45, smoothstep(0.0, 0.2, -R.y));
        float spec = pow(max(dot(R, uSunDir), 0.0), 320.0) * uSunI * 1.6;
        float fres = 0.07 + 0.93 * pow(1.0 - clamp(dot(-V, N), 0.0, 1.0), 4.0);
        float lv = (vW.y - 12.0) / 3.4;
        float ly = fract(lv);
        float level = floor(lv) + 1.0;
        float facade = abs(N.z) > 0.5 ? (N.z > 0.0 ? 0.0 : 1.0) : (N.x > 0.0 ? 2.0 : 3.0);
        float along = abs(N.z) > 0.5 ? vW.x : vW.z;
        float bx = fract(along / 1.6);
        float bay = floor(along / 1.6);
        float mull = 1.0 - smoothstep(0.0, 0.045, bx) * smoothstep(1.0, 0.955, bx);
        float rnd = h21(vec2(level * 7.0 + facade * 131.0, bay));
        float rnd2 = h21(vec2(bay * 3.1, level + facade * 17.0));
        float lit = step(rnd, 0.04 + 0.34 * uGlow);
        vec3 warm = mix(vec3(1.0, 0.62, 0.32), vec3(1.0, 0.84, 0.62), rnd2);
        vec3 interior = vec3(0.03, 0.035, 0.045) * (0.5 + uAmb) + lit * warm * uGlow * (0.35 + 0.9 * smoothstep(0.1, 0.9, ly)) * 0.95;
        vec3 col = mix(interior, sky, fres * (1.0 - 0.5 * uGlow)) + spec * uSunCol;
        col *= mix(0.55, 1.0, smoothstep(0.99, 0.74, ly));
        col = mix(col, vec3(0.15, 0.16, 0.17) * (0.35 + uAmb * 0.6), mull * 0.8);
        float isH = 1.0 - step(0.5, abs(level - uHover));
        float isS = 1.0 - step(0.5, abs(level - uSel));
        col = mix(col, vec3(0.72, 0.86, 1.0) * 1.5, isH * 0.55);
        col = mix(col, vec3(1.0, 0.8, 0.52) * 1.5, isS * 0.45 * (1.0 - isH));
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }`,
    fog: true,
  });
  Object.assign(MATS.glass.uniforms, { uZen: U.zen, uHor: U.hor, uGnd: U.gnd, uSunDir: U.sunDir, uSunCol: U.sunCol, uSunI: U.sunI, uGlow: U.glow, uHover: U.hover, uSel: U.sel, uAmb: U.amb });
}

/* ---------- the tower ---------- */
function levelWhiteGeo(parity) {
  const b = balconies(parity === 0 ? 2 : 1);
  const parts = [boxGeo(-17, 17, -0.35, 0, -10, 10)];
  parts.push(boxGeo(-17, 17, -0.45, 0, 10, 10.22), boxGeo(-17, 17, -0.45, 0, -10.22, -10));
  parts.push(boxGeo(-17.22, -17, -0.45, 0, -10, 10), boxGeo(17, 17.22, -0.45, 0, -10, 10));
  // terraces: thick slab, solid white upstand and end returns, so each floor reads as one strong band
  for (const [x0, x1] of b.S) {
    parts.push(boxGeo(x0, x1, -0.62, 0.1, 10.22, 12.6));
    parts.push(boxGeo(x0, x1, 0.1, 1.02, 12.36, 12.6));
    parts.push(boxGeo(x0, x0 + 0.22, 0.1, 1.02, 10.22, 12.36), boxGeo(x1 - 0.22, x1, 0.1, 1.02, 10.22, 12.36));
  }
  for (const [x0, x1] of b.N) {
    parts.push(boxGeo(x0, x1, -0.62, 0.1, -12.6, -10.22));
    parts.push(boxGeo(x0, x1, 0.1, 1.02, -12.6, -12.36));
    parts.push(boxGeo(x0, x0 + 0.22, 0.1, 1.02, -12.36, -10.22), boxGeo(x1 - 0.22, x1, 0.1, 1.02, -12.36, -10.22));
  }
  return mergeGeometries(parts);
}
function buildTower() {
  const tower = new THREE.Group();
  const levels = [];
  const whiteG = [levelWhiteGeo(0), levelWhiteGeo(1)];
  const glassG = boxGeo(-16.75, 16.75, 0, FLOOR_H - 0.35, -9.75, 9.75);
  const colParts = [];
  for (const x of [-16.3, -10, -4.5, 4.5, 10, 16.3]) for (const z of [-9.3, 0, 9.3]) colParts.push(boxGeo(x - 0.35, x + 0.35, 0, FLOOR_H - 0.35, z - 0.35, z + 0.35));
  const colG = mergeGeometries(colParts);
  for (let n = 1; n <= LEVELS; n++) {
    const g = new THREE.Group();
    g.position.y = levelBase(n);
    const white = new THREE.Mesh(whiteG[n % 2], MATS.white);
    const glass = new THREE.Mesh(glassG, MATS.glass);
    const cols = new THREE.Mesh(colG, MATS.concrete);
    white.castShadow = white.receiveShadow = true;
    glass.castShadow = true;
    cols.castShadow = true;
    g.add(white, glass, cols);
    tower.add(g);
    levels.push({ g, white, glass, cols });
  }
  // roof crown
  const roof = new THREE.Group();
  roof.position.y = levelBase(LEVELS + 1);
  const crown = new THREE.Mesh(mergeGeometries([
    boxGeo(-17.4, 17.4, -0.8, 0.35, -10.3, 10.3),
    boxGeo(-9, 9, 0.35, 3.8, -7.5, 2.5),
    boxGeo(-17.4, 17.4, 0.35, 1.2, 10.05, 10.3), boxGeo(-17.4, 17.4, 0.35, 1.2, -10.3, -10.05),
    boxGeo(-17.4, -17.15, 0.35, 1.2, -10.3, 10.3), boxGeo(17.15, 17.4, 0.35, 1.2, -10.3, 10.3),
    ...Array.from({ length: 22 }, (_, i) => boxGeo(-13.6 + i * 1.3, -13.35 + i * 1.3, 3.2, 3.45, 3.2, 9.8)),
    boxGeo(-14, 14, 3.45, 3.6, 3.0, 3.4), boxGeo(-14, 14, 3.45, 3.6, 9.6, 10.0),
  ]), MATS.plain);
  crown.castShadow = crown.receiveShadow = true;
  const louvre = new THREE.Mesh(boxGeo(-9.02, 9.02, 1.4, 3.2, -7.52, 2.52), MATS.dark);
  roof.add(crown, louvre);
  tower.add(roof);
  // concrete core that leads the build
  const core = new THREE.Mesh(boxGeo(-4.5, 4.5, 0, 1, -10, -1.2), MATS.concrete);
  core.position.y = PODIUM_H;
  core.castShadow = true;
  tower.add(core);
  scene.add(tower);
  world.tower = { group: tower, levels, roof, core };

  // invisible proxies for picking levels
  world.proxies = [];
  for (let n = 1; n <= LEVELS; n++) {
    const pm = new THREE.Mesh(new THREE.BoxGeometry(35.2, FLOOR_H, 25.6), new THREE.MeshBasicMaterial());
    pm.position.set(0, levelBase(n) + FLOOR_H / 2 - 0.4, 0);
    pm.updateMatrixWorld(true);
    pm.userData.n = n;
    world.proxies.push(pm);
  }
}

/* ---------- podium, plaza, site ---------- */
function buildPodium() {
  const fin = new THREE.Group();
  const shell = new THREE.Group();
  // finished podium
  const glassBox = new THREE.Mesh(boxGeo(-35.4, 35.4, 0, 11.6, -17.4, 17.4), MATS.darkGlass);
  const roofSlab = new THREE.Mesh(mergeGeometries([
    boxGeo(-36.4, 36.4, 11.6, 12.2, -18.4, 18.4),
    boxGeo(-35.7, 35.7, 5.8, 6.1, -17.7, 17.7),
    boxGeo(-35.7, 35.7, 8.8, 9.05, -17.7, 17.7),
    boxGeo(-9.5, 9.5, 6.0, 6.5, 17.6, 24.5),
    boxGeo(-8.8, -8.4, 0, 6, 23.6, 24.0), boxGeo(8.4, 8.8, 0, 6, 23.6, 24.0),
  ]), MATS.plain);
  const lobby = new THREE.Mesh(boxGeo(-7.6, 7.6, 0, 5.8, 17.0, 17.7), MATS.lobby);
  const finG = new THREE.BoxGeometry(0.24, 1, 0.9);
  finG.translate(0, 0.5, 0);
  const finPos = [];
  for (let x = -35.6; x <= 35.6; x += 1.2) {
    const lobbyGap = Math.abs(x) < 8.2;
    finPos.push([x, 18.0, lobbyGap ? 6.5 : 0, 0]);
    finPos.push([x, -18.0, 0, 0]);
  }
  for (let z = -17.4; z <= 17.4; z += 1.2) { finPos.push([36.0, z, 0, 1]); finPos.push([-36.0, z, 0, 1]); }
  const fins = new THREE.InstancedMesh(finG, MATS.plain, finPos.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), yAxis = new THREE.Vector3(0, 1, 0);
  finPos.forEach(([x, z, y0, rot], i) => {
    q.setFromAxisAngle(yAxis, rot ? Math.PI / 2 : 0);
    m.compose(new THREE.Vector3(x, y0, z), q, new THREE.Vector3(1, 11.6 - y0, 1));
    fins.setMatrixAt(i, m);
  });
  fins.instanceMatrix.needsUpdate = true;
  fins.computeBoundingSphere();
  const pool = new THREE.Mesh(boxGeo(-31, -14, 12.2, 12.36, 3, 13.5), MATS.pool);
  const deck = new THREE.Mesh(mergeGeometries([boxGeo(-34.5, -10.5, 12.2, 12.3, 0.5, 16.5), boxGeo(10, 34.5, 12.2, 12.3, 2, 16.5)]), MATS.deck);
  const loungers = [];
  for (let i = 0; i < 7; i++) loungers.push(boxGeo(-30 + i * 2.4, -29 + i * 2.4, 12.3, 12.75, 14.4, 16.2));
  for (let i = 0; i < 5; i++) loungers.push(boxGeo(14 + i * 4, 16.5 + i * 4, 12.3, 13.1, 6, 8.5));
  const furniture = new THREE.Mesh(mergeGeometries(loungers), MATS.plain);
  const balust = new THREE.Mesh(mergeGeometries([
    boxGeo(-36.3, 36.3, 12.2, 13.25, 18.25, 18.32), boxGeo(-36.3, 36.3, 12.2, 13.25, -18.32, -18.25),
    boxGeo(36.25, 36.32, 12.2, 13.25, -18.3, 18.3), boxGeo(-36.32, -36.25, 12.2, 13.25, -18.3, 18.3),
  ]), MATS.rail);
  for (const o of [glassBox, roofSlab, fins, furniture]) { o.castShadow = true; o.receiveShadow = true; }
  fin.add(glassBox, roofSlab, lobby, fins, pool, deck, furniture, balust);
  // construction shell
  const shellMesh = new THREE.Mesh(mergeGeometries([
    boxGeo(-36, 36, 11.5, 12.1, -18, 18), boxGeo(-36, 36, 5.6, 6.1, -18, 18),
    ...[-36, -24, -12, 0, 12, 24, 35.4].flatMap((x) => [-17.7, 0, 17.4].map((z) => boxGeo(x - 0.3, x + 0.3, 0, 11.5, z - 0.3, z + 0.3))),
  ]), MATS.concrete);
  shellMesh.castShadow = shellMesh.receiveShadow = true;
  shell.add(shellMesh);
  // site overlay: earth, cabins, materials
  const sc = document.createElement('canvas');
  sc.width = sc.height = 256;
  const sg = sc.getContext('2d');
  const r = rng(12);
  sg.fillStyle = '#b9a588'; sg.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { sg.fillStyle = r() < 0.5 ? 'rgba(140,120,95,.18)' : 'rgba(215,200,175,.18)'; const s = 1 + r() * 6; sg.fillRect(r() * 256, r() * 256, s, s); }
  sg.strokeStyle = 'rgba(120,100,80,.35)'; sg.lineWidth = 3;
  for (let i = 0; i < 6; i++) { sg.beginPath(); sg.moveTo(r() * 256, 0); sg.bezierCurveTo(r() * 256, 90, r() * 256, 170, r() * 256, 256); sg.stroke(); }
  const stex = new THREE.CanvasTexture(sc);
  stex.colorSpace = THREE.SRGBColorSpace;
  const site = new THREE.Group();
  const earthG = new THREE.CircleGeometry(60, 48);
  earthG.rotateX(-Math.PI / 2);
  const earth = new THREE.Mesh(earthG, new THREE.MeshStandardMaterial({ map: stex, roughness: 1, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  earth.position.y = 0.06;
  earth.receiveShadow = true;
  const cabins = new THREE.Mesh(mergeGeometries([
    boxGeo(40, 52, 0, 2.6, 30, 32.6), boxGeo(40, 52, 2.6, 5.2, 30, 32.6), boxGeo(40, 52, 0, 2.6, 34, 36.6),
    boxGeo(-50, -38, 0, 2.6, 34, 36.6), boxGeo(-30, -20, 0, 1.2, 28, 34), boxGeo(24, 30, 0, 1.6, -40, -30),
  ]), MATS.plain);
  cabins.castShadow = true;
  site.add(earth, cabins);
  scene.add(fin, shell, site);
  world.podium = { fin, shell, site };
}

/* ---------- palms ---------- */
function frondTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 512;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 512);
  const r = rng(3);
  const N = 120;
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const y = 506 - t * 498;
    const env = Math.pow(Math.sin(Math.min(1, t * 1.06) * Math.PI), 0.65) * 0.9 + 0.1;
    for (const side of [-1, 1]) {
      if (r() < 0.07) continue;
      const len = 62 * env * (0.82 + r() * 0.22);
      const droop = 20 * env + r() * 8;
      const wid = 2.4 * (1 - t * 0.45) + r() * 1.1;
      g.fillStyle = `rgb(${48 + r() * 26},${80 + r() * 30},${38 + r() * 16})`;
      g.beginPath();
      g.moveTo(64, y - wid);
      g.quadraticCurveTo(64 + side * len * 0.55, y - droop * 0.25 - wid, 64 + side * len, y - droop);
      g.quadraticCurveTo(64 + side * len * 0.55, y - droop * 0.25 + wid, 64, y + wid);
      g.closePath();
      g.fill();
    }
  }
  g.strokeStyle = '#7a7d47'; g.lineWidth = 3.5;
  g.beginPath(); g.moveTo(64, 512); g.lineTo(64, 6); g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function palmGeometries() {
  // trunk
  const trunk = new THREE.CylinderGeometry(0.17, 0.3, 1, 7, 10, true);
  trunk.translate(0, 0.5, 0);
  const tp = trunk.getAttribute('position');
  const cols = [];
  for (let i = 0; i < tp.count; i++) {
    const y = tp.getY(i);
    tp.setX(i, tp.getX(i) + Math.sin(y * 2.2) * 0.12 * y);
    const ring = 0.85 + 0.15 * Math.sin(y * 70);
    cols.push(0.42 * ring, 0.36 * ring, 0.29 * ring);
  }
  trunk.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  trunk.computeVertexNormals();
  // crown: curved fronds
  const fronds = [];
  const NF = 16;
  for (let f = 0; f < NF; f++) {
    const az = (f / NF) * Math.PI * 2 + (f % 2) * 0.18;
    const lift = 0.62 - (f % 3) * 0.36;
    const len = 4.4 + (f % 4) * 0.35;
    const seg = 10;
    const pos = [], uv = [], idx = [];
    for (let s = 0; s <= seg; s++) {
      const t = s / seg;
      const ang = lift - t * t * 2.0;
      const d = t * len;
      const x = Math.cos(ang) * d * 0.95, y = Math.sin(ang) * d * 0.6 + Math.sin(lift) * t * 0.6;
      const w = 1.25 * Math.sin(Math.min(1, t * 1.2) * Math.PI) + 0.06;
      const ca = Math.cos(az), sa = Math.sin(az);
      const px = x * ca, pz = x * sa;
      const sx = -sa * w, sz = ca * w;
      pos.push(px - sx, y - 0.12 * w, pz - sz, px, y + 0.1 * w, pz, px + sx, y - 0.12 * w, pz + sz);
      uv.push(0, t, 0.5, t, 1, t);
      if (s < seg) { const a = s * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    fronds.push(g);
  }
  const crown = mergeGeometries(fronds);
  return { trunk, crown };
}
function buildPalms() {
  const r = rng(21);
  const plot = [], park = [];
  for (let z = 62; z <= 112; z += 10) { plot.push([-10.4, z, 9.5 + r() * 2]); plot.push([10.4, z, 9.5 + r() * 2]); }
  for (let x = -52; x <= 52; x += 8.6) if (Math.abs(x) > 12) plot.push([x, 31 + (r() - 0.5) * 2, 9 + r() * 2.5]);
  for (let z = -24; z <= 24; z += 8) { plot.push([-47, z, 9 + r() * 2.5]); plot.push([47, z, 9 + r() * 2.5]); }
  for (let x = -40; x <= 40; x += 10) plot.push([x, -32, 9 + r() * 2.5]);
  const roof = [[-33, 2], [-33, 16.4], [-11, 16.2], [-11.5, 2], [12, 16.2], [33, 16.2], [33, 2], [22, 2], [-22, 16.6]];
  for (const [x, z] of roof) plot.push([x, z, 6 + r() * 1.5, 12.2]);
  // park clusters flanking the view
  let guard = 0;
  const camZone = (x, z) => (x > -48 && x < 70 && z > 146 && z < 225) || (Math.abs(x) < 40 && z > 112);
  while (park.length < 46 && guard++ < 2000) {
    const x = (r() - 0.5) * 300, z = 50 + r() * 140;
    if (Math.abs(x) < 28 || camZone(x, z)) continue;
    if (Math.hypot(x, z) > 186 || Math.hypot(x, z) < 62) continue;
    park.push([x, z, 9 + r() * 4]);
  }
  for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, d = 70 + r() * 110; const x = Math.cos(a) * d, z = Math.sin(a) * d; if ((z > 40 && Math.abs(x) < 30) || camZone(x, z)) continue; park.push([x, z, 9 + r() * 3]); }

  const { trunk, crown } = palmGeometries();
  const tex = frondTexture();
  const trunkMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  const frondMat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85, color: 0xd7e0c8 });
  const make = (list) => {
    const tm = new THREE.InstancedMesh(trunk, trunkMat, list.length);
    const cm = new THREE.InstancedMesh(crown, frondMat, list.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    list.forEach(([x, z, h, y0 = 0], i) => {
      const lean = new THREE.Euler((r() - 0.5) * 0.12, r() * Math.PI * 2, (r() - 0.5) * 0.12);
      q.setFromEuler(lean);
      m.compose(new THREE.Vector3(x, y0, z), q, s.set(1, h, 1));
      tm.setMatrixAt(i, m);
      const top = new THREE.Vector3(0, h, 0).applyQuaternion(q);
      const k = 1.0 + r() * 0.32;
      m.compose(new THREE.Vector3(x + top.x, y0 + top.y, z + top.z), q, s.set(k, k, k));
      cm.setMatrixAt(i, m);
    });
    for (const im of [tm, cm]) { im.castShadow = true; im.receiveShadow = true; im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); scene.add(im); }
    return [tm, cm];
  };
  world.plotPalms = make(plot);
  world.parkPalms = make(park);
}

/* ---------- street lights ---------- */
function buildLights() {
  const poles = [], bollards = [];
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; if (Math.sin(a) > 0.9) continue; poles.push([Math.cos(a) * 57, Math.sin(a) * 57]); }
  for (let i = 0; i < 44; i++) { const a = (i / 44) * Math.PI * 2; poles.push([Math.cos(a) * 205, Math.sin(a) * 205]); }
  for (let z = 50; z <= 192; z += 9) { bollards.push([-4.9, z]); bollards.push([4.9, z]); }
  const poleG = new THREE.CylinderGeometry(0.07, 0.09, 6.4, 6);
  poleG.translate(0, 3.2, 0);
  const headG = boxGeo(-0.38, 0.38, 6.3, 6.46, -0.16, 0.16);
  const bolG = new THREE.CylinderGeometry(0.09, 0.1, 0.95, 8);
  bolG.translate(0, 0.475, 0);
  const capG = new THREE.CylinderGeometry(0.1, 0.1, 0.12, 8);
  capG.translate(0, 0.86, 0);
  const m = new THREE.Matrix4();
  const inst = (geo, mat, pts) => {
    const im = new THREE.InstancedMesh(geo, mat, pts.length);
    pts.forEach(([x, z], i) => { m.makeTranslation(x, 0, z); im.setMatrixAt(i, m); });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    scene.add(im);
    return im;
  };
  inst(poleG, MATS.pole, poles).castShadow = true;
  inst(headG, MATS.lamp, poles);
  inst(bolG, MATS.pole, bollards);
  inst(capG, MATS.lamp, bollards);
}

/* ---------- cranes ---------- */
function latticeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 64);
  g.strokeStyle = '#fff'; g.lineWidth = 5;
  g.strokeRect(2.5, -4, 59, 72);
  g.lineWidth = 3.5;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 64); g.moveTo(64, 0); g.lineTo(0, 64); g.stroke();
  g.lineWidth = 4; g.beginPath(); g.moveTo(0, 2); g.lineTo(64, 2); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function buildCranes() {
  const lat = latticeTexture();
  const cranes = [];
  for (const [x, z, rot] of [[-27, -5, 0.6], [25, 7, 2.6]]) {
    const g = new THREE.Group();
    g.position.set(x, PODIUM_H, z);
    const mastMat = MATS.crane.clone(); mastMat.map = lat.clone(); mastMat.map.needsUpdate = true;
    const jibMat = MATS.crane.clone(); jibMat.map = lat.clone(); jibMat.map.needsUpdate = true; jibMat.map.repeat.set(26, 1);
    const mastG = new THREE.BoxGeometry(2, 1, 2); mastG.translate(0, 0.5, 0);
    const mast = new THREE.Mesh(mastG, mastMat);
    const head = new THREE.Group();
    const jib = new THREE.Mesh(boxGeo(-1, 52, -0.7, 0.7, -0.7, 0.7), jibMat);
    const counter = new THREE.Mesh(boxGeo(-15, -1, -0.6, 0.6, -0.9, 0.9), jibMat);
    const weight = new THREE.Mesh(boxGeo(-14, -10, -2.6, -0.6, -1.1, 1.1), MATS.concrete);
    const cab = new THREE.Mesh(boxGeo(0.9, 3.2, -2.6, -0.4, -1.2, 1.2), MATS.plain);
    const apex = new THREE.Mesh(new THREE.ConeGeometry(1.3, 7, 4), MATS.crane);
    apex.position.y = 4.2;
    const trolley = new THREE.Mesh(boxGeo(30, 32, -1.2, -0.7, -0.8, 0.8), MATS.dark);
    const cable = new THREE.Mesh(boxGeo(30.95, 31.05, -26, -1.2, -0.05, 0.05), MATS.dark);
    const hook = new THREE.Mesh(boxGeo(30.4, 31.6, -27.4, -26, -0.6, 0.6), MATS.crane);
    head.add(jib, counter, weight, cab, apex, trolley, cable, hook);
    head.rotation.y = rot;
    for (const o of [mast, jib, counter, weight, apex, cab]) o.castShadow = true;
    g.add(mast, head);
    scene.add(g);
    cranes.push({ g, mast, head, mastMat, rot });
  }
  world.cranes = cranes;
}

/* ---------- lights ---------- */
function buildLighting() {
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(Q.shadow, Q.shadow);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 6000;
  sun.shadow.bias = -0.00035;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1);
  scene.add(hemi);
  const lobby = new THREE.PointLight(0xffc98a, 0, 110, 1.4);
  lobby.position.set(0, 4.5, 27);
  scene.add(lobby);
  const fill = new THREE.DirectionalLight(0xb4c2e6, 0);
  fill.position.set(-30, 60, 400);
  fill.target.position.set(0, 40, 0);
  scene.add(fill, fill.target);
  scene.fog = new THREE.FogExp2(0xcccccc, 0.0002);
  world.sun = sun; world.hemi = hemi; world.lobby = lobby; world.fill = fill;
}

/* ---------- post-process ---------- */
function buildPost() {
  const w = Math.floor(innerWidth * Q.dpr), h = Math.floor(innerHeight * Q.dpr);
  const gl = renderer.getContext();
  const floatOK = !!(renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
  // only ask for as many MSAA samples as the GPU supports for half-float targets
  let samples = Math.min(Q.msaa, gl.getParameter(gl.MAX_SAMPLES) || 0);
  if (floatOK) {
    try {
      const list = gl.getInternalformatParameter(gl.RENDERBUFFER, gl.RGBA16F, gl.SAMPLES);
      samples = Math.min(samples, list && list.length ? Math.max(...list) : 0);
    } catch (e) { samples = 0; }
  }
  rt = new THREE.WebGLRenderTarget(w, h, {
    type: floatOK ? THREE.HalfFloatType : THREE.UnsignedByteType,
    samples,
    generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter,
  });
  finalMat = new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: rt.texture }, uBlur: { value: 0 }, uWhite: { value: 0 }, uWhiteCol: { value: new THREE.Color(0xf4f1ec) },
      uVignette: { value: 0.3 }, uTime: { value: 0 }, uGrain: { value: 0.022 }, uBloom: { value: 0.5 }, uDim: { value: 0 }, uExposure: { value: 1 },
      uRes: { value: new THREE.Vector2(w, h) },
    },
    vertexShader: quadVS,
    fragmentShader: /* glsl */`
      uniform sampler2D tScene; uniform float uBlur, uWhite, uVignette, uTime, uGrain, uBloom, uDim, uExposure; uniform vec3 uWhiteCol; uniform vec2 uRes;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec3 col;
        if (uBlur > 0.003) {
          vec2 d = vUv - 0.5; col = vec3(0.0); float tw = 0.0;
          for (int i = 0; i < 14; i++) { float t = float(i) / 13.0; float w = 1.0 - t * 0.55; col += texture2D(tScene, 0.5 + d * (1.0 - uBlur * 0.14 * t)).rgb * w; tw += w; }
          col /= tw;
        } else {
          col = texture2D(tScene, vUv).rgb;
        }
        vec3 b = textureLod(tScene, vUv, 3.0).rgb * 0.3 + textureLod(tScene, vUv, 4.5).rgb * 0.35 + textureLod(tScene, vUv, 6.0).rgb * 0.35;
        col += max(b - vec3(1.05), vec3(0.0)) * uBloom;
        col = mix(col, uWhiteCol, uWhite);
        float lg = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(vec3(lg), col, 0.9);
        col *= mix(vec3(0.97, 0.99, 1.04), vec3(1.035, 1.0, 0.955), smoothstep(0.04, 0.8, lg));
        float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(col, vec3(l) * vec3(0.62, 0.68, 0.82), uDim * 0.55) * (1.0 - uDim * 0.55);
        vec2 q = vUv - 0.5;
        float vig = smoothstep(0.95, 0.22, length(q * vec2(1.05, 1.0)));
        col *= mix(1.0 - uVignette, 1.0, vig);
        col *= uExposure;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.rgb += (hash(vUv * uRes + fract(uTime) * 91.0) - 0.5) * uGrain;
      }`,
    depthTest: false, depthWrite: false,
  });
  finalScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), finalMat);
  quad.frustumCulled = false;
  finalScene.add(quad);
}

/* =====================================================================
   State, update & render
   ===================================================================== */
let p = 0, pTarget = 0, afterT = 0, time = 0, ready = false, built = false;
let blur = 0, dimV = 0, dimTarget = 0;
const prevCam = new THREE.Vector3();
let lastBuildKey = '';
const _sunDir = new THREE.Vector3();

function maxScroll() { return Math.max(1, track.offsetHeight - innerHeight); }
function readScroll() {
  const y = window.scrollY, m = maxScroll();
  pTarget = clamp(y / m);
  afterT = clamp((y - m) / (innerHeight * 0.8));
}

function envAt(pp) {
  let i = 0;
  while (i < ENVK.length - 2 && pp >= ENVK[i + 1].p) i++;
  const a = PRESETS[ENVK[i].k], b = PRESETS[ENVK[i + 1].k];
  const t = smooth(clamp((pp - ENVK[i].p) / (ENVK[i + 1].p - ENVK[i].p)));
  return { a, b, t };
}
const E = {};
function applyEnv(pp) {
  const { a, b, t } = envAt(pp);
  const L = (k) => lerp(a[k], b[k], t);
  U.zen.value.copy(a.zen).lerp(b.zen, t);
  U.mid.value.copy(a.mid).lerp(b.mid, t);
  U.hor.value.copy(a.hor).lerp(b.hor, t);
  U.gnd.value.copy(a.gnd).lerp(b.gnd, t);
  U.sunCol.value.copy(a.sunCol).lerp(b.sunCol, t);
  U.cLit.value.copy(a.cLit).lerp(b.cLit, t);
  U.cShade.value.copy(a.cShade).lerp(b.cShade, t);
  const el = THREE.MathUtils.degToRad(L('sunEl')), az = THREE.MathUtils.degToRad(L('sunAz'));
  _sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
  U.sunDir.value.copy(_sunDir);
  E.sunI = L('sunI');
  U.sunI.value = E.sunI;
  U.sunVis.value = smooth(inv(-2, 1.5, L('sunEl')));
  E.glow = L('glow');
  U.glow.value = E.glow;
  U.soffit.value = E.glow * 0.42;
  E.hemiI = L('hemiI');
  U.amb.value = E.hemiI;
  E.exp = L('exp');
  E.vign = L('vign');
  if (hasGL && built) {
    scene.fog.color.copy(a.fog).lerp(b.fog, t);
    scene.fog.density = L('fogD');
    U.haze.value.copy(scene.fog.color);
    U.hazeD.value = scene.fog.density;
    world.sun.color.copy(U.sunCol.value);
    world.sun.intensity = E.sunI;
    world.hemi.color.copy(a.hemiSky).lerp(b.hemiSky, t);
    world.hemi.groundColor.copy(a.hemiGnd).lerp(b.hemiGnd, t);
    world.hemi.intensity = E.hemiI;
    U.ambCol.value.copy(world.hemi.color).multiplyScalar(E.hemiI * 0.62).lerp(world.hemi.groundColor.clone().multiplyScalar(E.hemiI * 0.4), 0.3);
    MATS.darkGlass.emissiveIntensity = 0.03 + E.glow * 0.3;
    MATS.lobby.emissiveIntensity = 0.3 + E.glow * 1.25;
    MATS.pool.emissiveIntensity = E.glow * 0.9;
    MATS.lamp.emissiveIntensity = E.glow * 2.6;
    world.lobby.intensity = E.glow * 150;
    world.fill.intensity = E.glow * 0.75;
  }
}

function applyBuild(build, preCut) {
  const T = world.tower;
  const nb = build * LEVELS;
  const key = `${Math.round(nb * 200)}|${preCut}`;
  if (key === lastBuildKey) return;
  lastBuildKey = key;
  for (let n = 1; n <= LEVELS; n++) {
    const Lv = T.levels[n - 1];
    const f = clamp(nb - (n - 1));
    const fin = build >= 0.999 || (!preCut && nb >= n + 1.6);
    Lv.g.visible = f > 0.002;
    Lv.g.scale.y = Math.max(0.002, smooth(f));
    Lv.white.material = fin ? MATS.white : MATS.concrete;
    Lv.glass.visible = fin;
    Lv.cols.visible = !fin;
  }
  T.roof.visible = build >= 0.999;
  const coreFloors = preCut ? 2.2 : Math.min(LEVELS, nb + 1.6);
  T.core.visible = build < 0.999;
  T.core.scale.y = Math.max(0.1, coreFloors * FLOOR_H);
  world.podium.fin.visible = !preCut;
  world.podium.shell.visible = preCut;
  world.podium.site.visible = preCut;
  for (const im of world.plotPalms) im.visible = !preCut;
  const top = preCut ? 26 : PODIUM_H + coreFloors * FLOOR_H;
  for (const c of world.cranes) {
    c.g.visible = build < 0.999;
    const mh = Math.max(30, top - PODIUM_H + 16);
    c.mast.scale.y = mh;
    c.mastMat.map.repeat.set(1, mh / 2);
    c.head.position.y = mh;
  }
}

function sampleState(pp) {
  const fov = cameraAt(pp);
  const preCut = pp < CUT;
  const build = preCut ? 0 : smooth(inv(0.47, 0.62, pp));
  const veilO = preCut ? smooth(inv(0.375, 0.405, pp)) : 1 - smooth(inv(0.435, 0.47, pp));
  return { fov, preCut, build, veilO };
}

const tmpV = new THREE.Vector3();
function update(dt) {
  const s = sampleState(p);
  // idle drift in the hero
  const heroW = 1 - inv(0.0, 0.1, p);
  if (heroW > 0 && !reduceMotion) { camPos.x += Math.sin(time * 0.17) * 14 * heroW; camPos.y += Math.sin(time * 0.11) * 6 * heroW; }
  const G = hasGL && built;
  if (G) {
    camera.position.copy(camPos);
    camera.fov = s.fov;
    camera.aspect = innerWidth / innerHeight;
    camera.lookAt(camTgt);
    // wide screens: nudge the tower right so the copy column has room.
    // portrait screens: lift it above the bottom sheet.
    const aspect = innerWidth / innerHeight;
    const settle = smooth(inv(0.44, 0.53, p));
    const vo = 0.075 * clamp((aspect - 1.15) / 0.5) * settle;
    const vy = 0.2 * clamp((1 - aspect) / 0.5) * settle;
    if (vo > 0.0005 || vy > 0.0005) camera.setViewOffset(innerWidth, innerHeight, -vo * innerWidth, vy * innerHeight, innerWidth, innerHeight);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    world.sky.position.copy(camera.position);
  }
  applyEnv(p);
  if (G) {
    applyBuild(s.build, s.preCut);
    // clouds
    const cOp = 1 - smooth(inv(0.265, 0.33, p));
    U.cloudOpacity.value = cOp;
    U.time.value = time;
    world.clouds.mesh.visible = cOp > 0.002;
    world.clouds.haze.visible = cOp > 0.002;
    world.clouds.hazeMat.uniforms.uCamY.value = camera.position.y;
    if (cOp > 0.002) updateClouds(dt);
    // cranes swing
    if (!reduceMotion) for (const c of world.cranes) c.head.rotation.y = c.rot + Math.sin(time * 0.08 + c.rot) * 0.5;
    // shadows follow the action
    const close = smooth(inv(0.34, 0.47, p));
    const size = lerp(1750, 330, close);
    const sc = world.sun.shadow.camera;
    sc.left = -size / 2; sc.right = size / 2; sc.top = size / 2; sc.bottom = -size / 2;
    sc.updateProjectionMatrix();
    tmpV.set(camTgt.x, 0, camTgt.z);
    if (p < CUT) { tmpV.lerp(new THREE.Vector3(0, 0, 0), smooth(inv(0.24, 0.36, p))); tmpV.x = clamp(tmpV.x, -400, 400); tmpV.z = clamp(tmpV.z, -400, 400); }
    else tmpV.set(0, 0, 20);
    world.sun.target.position.copy(tmpV);
    world.sun.position.copy(tmpV).addScaledVector(U.sunDir.value.y > 0.02 ? U.sunDir.value : tmpV.set(0, 1, 0).add(U.sunDir.value).normalize(), 2600);
    world.sun.target.updateMatrixWorld();
    world.sun.shadow.normalBias = (size / Q.shadow) * 1.4;
    // keep the light's shadow flag constant (toggling it recompiles every material); just stop updating the map
    renderer.shadowMap.autoUpdate = E.sunI > 0.05;
    // camera velocity drives the zoom blur
    const v = dt > 0 ? camera.position.distanceTo(prevCam) / dt : 0;
    const dist = Math.max(30, camera.position.distanceTo(camTgt));
    const bTarget = reduceMotion ? 0 : clamp((v / dist) * 0.9 - 0.06, 0, 1) * (p > 0.78 ? 0 : 1);
    blur += (bTarget - blur) * (1 - Math.exp(-dt * 8));
    prevCam.copy(camera.position);
    // whiteout inside the cloud deck
    const cy = camera.position.y;
    const white = p < 0.31 ? smooth(inv(560, 480, cy)) * smooth(inv(300, 390, cy)) * 0.22 : 0;
    dimV += (dimTarget - dimV) * (1 - Math.exp(-dt * 6));
    const fu = finalMat.uniforms;
    fu.uBlur.value = blur;
    fu.uWhite.value = white;
    fu.uWhiteCol.value.copy(U.cLit.value).lerp(scene.fog.color, 0.3);
    fu.uVignette.value = E.vign;
    fu.uExposure.value = E.exp;
    fu.uTime.value = reduceMotion ? 0 : time;
    fu.uBloom.value = 0.25 + E.glow * 0.65;
    fu.uDim.value = dimV;
  }
  updateOverlays(s);
  updateExploreLine();
}

function render() {
  if (!hasGL || !built) return;
  renderer.setRenderTarget(rt);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.render(finalScene, orthoCam);
}

/* =====================================================================
   Overlays
   ===================================================================== */
const ovCache = new Map();
function setOv(el, o, dy = 26) {
  const prev = ovCache.get(el);
  if (prev !== undefined && Math.abs(prev - o) < 0.002 && !(o === 0 && prev !== 0) && !(o === 1 && prev !== 1)) return;
  ovCache.set(el, o);
  el.style.opacity = o.toFixed(3);
  el.style.transform = o >= 0.999 || reduceMotion ? 'none' : `translate3d(0, ${((1 - o) * dy).toFixed(1)}px, 0)`;
  el.style.visibility = o < 0.004 ? 'hidden' : 'visible';
  el.style.pointerEvents = o > 0.6 ? '' : 'none';
}
const CHAPTERS = [[0, 'Arrival'], [0.25, 'Location'], [0.38, 'The rise'], [0.63, 'Architecture'], [0.78, 'Residences']];
let lastChapter = -1;
function updateOverlays(s) {
  const fadeAfter = 1 - afterT;
  setOv(OV.hero, 1 - smooth(inv(0.035, 0.1, p)), -30);
  setOv(OV.cue, (1 - smooth(inv(0.0, 0.03, p))) * (ready ? 1 : 0), 10);
  setOv(OV.loc, band(p, 0.27, 0.3, 0.355, 0.375));
  setOv(OV.why, band(p, 0.495, 0.525, 0.615, 0.64));
  setOv(OV.arch, band(p, 0.665, 0.69, 0.755, 0.775));
  const ex = smooth(inv(0.8, 0.835, p)) * fadeAfter * (planOpen ? 0 : 1);
  setOv(OV.explore, ex);
  setOv(OV.ruler, ex, 0);
  const chO = (1 - s.veilO) * fadeAfter * (planOpen ? 0 : 1);
  setOv(OV.chapter, chO, 0);
  setOv(OV.dev, chO * (1 - smooth(inv(0.76, 0.8, p))), 0);
  // veil
  veil.style.opacity = s.veilO.toFixed(3);
  veil.style.visibility = s.veilO < 0.004 ? 'hidden' : 'visible';
  const vt = veil.firstElementChild;
  const vtO = p < CUT ? smooth(inv(0.392, 0.41, p)) : 1 - smooth(inv(0.43, 0.448, p));
  vt.style.opacity = vtO.toFixed(3);
  vt.style.transform = reduceMotion ? 'none' : `translate3d(0, ${((1 - vtO) * (p < CUT ? 18 : -18)).toFixed(1)}px, 0)`;
  // scrim strength follows the text chapters and the bright day sky
  const textO = Math.max(band(p, 0.27, 0.3, 0.355, 0.375), band(p, 0.495, 0.525, 0.615, 0.64), band(p, 0.665, 0.69, 0.755, 0.775), smooth(inv(0.8, 0.835, p)));
  const heroO = 1 - smooth(inv(0.035, 0.1, p));
  scrim.style.opacity = (Math.max(heroO * 0.55, textO * 0.95, 0.12) * fadeAfter).toFixed(3);
  // chapter index
  let ci = 0;
  for (let i = 0; i < CHAPTERS.length; i++) if (p >= CHAPTERS[i][0] - 0.0001) ci = i;
  if (ci !== lastChapter) {
    lastChapter = ci;
    $('#chNum').textContent = `${pad(ci + 1)} / ${pad(CHAPTERS.length)}`;
    $('#chName').textContent = CHAPTERS[ci][1];
  }
  $('#chBar').style.transform = `scaleX(${p.toFixed(4)})`;
  const fab = $('#fab');
  const hideFab = planOpen || afterT > 0.3;
  fab.style.opacity = hideFab ? '0' : '1';
  fab.style.pointerEvents = hideFab ? 'none' : '';
  topbar.classList.toggle('solid', afterT > 0.55);
}

/* =====================================================================
   Explore: levels on the tower
   ===================================================================== */
let selLevel = 7, hoverLevel = 0, planOpen = false, planLevel = 7, selUnit = null;
const exploreOn = () => p > 0.795 && pTarget > 0.79 && afterT < 0.3 && !planOpen;
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pickLevel(x, y) {
  if (!hasGL || !world.proxies) return 0;
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(world.proxies, false)[0];
  return hit ? hit.object.userData.n : 0;
}
function projectY(n) {
  const v = new THREE.Vector3(0, levelBase(n) + 1.4, 12.6).project(camera);
  return (-v.y * 0.5 + 0.5) * innerHeight;
}
function towerRightX(n) {
  const v = new THREE.Vector3(17.4, levelBase(n) + 1.4, 12.6).project(camera);
  return (v.x * 0.5 + 0.5) * innerWidth;
}
function floorRect(n) {
  const yb = levelBase(n);
  const pts = [];
  for (const x of [-17, 17]) for (const y of [yb - 0.6, yb + FLOOR_H - 0.35]) for (const z of [-12.6, 12.6]) pts.push(new THREE.Vector3(x, y, z).project(camera));
  const xs = pts.map((v) => (v.x * 0.5 + 0.5) * innerWidth), ys = pts.map((v) => (-v.y * 0.5 + 0.5) * innerHeight);
  return { l: Math.min(...xs), r: Math.max(...xs), t: Math.min(...ys), b: Math.max(...ys) };
}
function lineLevel() { return exploreOn() ? (hoverLevel || (coarse ? selLevel : 0)) : 0; }
function updateExploreLine() {
  const n = lineLevel();
  if (!n || !hasGL || !built) { levelLine.style.opacity = '0'; return; }
  const y = projectY(n);
  levelLine.style.opacity = '1';
  levelLine.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
  const tw = levelTag.offsetWidth || 180;
  levelTag.style.left = `${Math.max(12, Math.min(innerWidth - tw - 12, towerRightX(n) + 18)).toFixed(0)}px`;
}
function tagHTML(n) {
  const info = levelInfo(n);
  const a = info.c.available;
  return `<span class="dot" style="${a ? '' : 'background:rgba(242,238,231,.35)'}"></span>${esc(M.t(a ? T.tagAvailable : T.tagSoldOut, { level: pad(n), available: a }))}`;
}
function showLevel(n) {
  const info = levelInfo(n);
  $('#lcNum').textContent = pad(n);
  $('#lcFp').textContent = M.t(T.plateLine, { plate: info.fp.name, count: info.units.length });
  $('#lcMix').textContent = info.types.join(' · ');
  const bar = $('#lcBar').children;
  bar[0].style.flexGrow = info.c.available; bar[1].style.flexGrow = info.c.reserved; bar[2].style.flexGrow = info.c.sold;
  $('#lcAvail').textContent = M.t(T.availability, info.c);
  $('#lcFrom').textContent = info.minPrice != null ? M.t(T.from, { price: M.fmtMoney(info.minPrice) }) : (info.c.sold === info.units.length ? T.soldOut : T.priceOnRequest);
  $('#openPlanBtn').firstChild.textContent = M.t(T.openPlan, { level: pad(n) }) + ' ';
  levelTag.innerHTML = tagHTML(n);
  for (const r of [$('#ruler'), $('#planRuler')]) {
    for (const b of r.children) {
      const bn = +b.dataset.n;
      b.classList.toggle('is-hover', bn === hoverLevel);
      b.classList.toggle('is-sel', bn === (planOpen ? planLevel : selLevel));
    }
  }
}
function setHover(n) {
  if (n === hoverLevel) return;
  hoverLevel = n;
  U.hover.value = n || -1;
  document.body.style.cursor = n ? 'pointer' : '';
  showLevel(n || selLevel);
  kick();
}
function setSel(n) {
  selLevel = clamp(n, 1, LEVELS);
  U.sel.value = coarse ? selLevel : -1;
  showLevel(selLevel);
  kick();
}
function buildRulers() {
  for (const r of [$('#ruler'), $('#planRuler')]) {
    let h = '';
    for (let n = LEVELS; n >= 1; n--) {
      const info = levelInfo(n);
      const aria = M.t(info.c.available ? T.tagAvailable : T.tagSoldOut, { level: pad(n), available: info.c.available });
      h += `<button type="button" data-n="${n}" class="${info.c.available ? '' : 'sold-out'}" aria-label="${esc(aria)}"><span>${isPenthouseLevel(n) ? '<em class="ph">PH</em> ' : ''}${pad(n)}</span><i></i></button>`;
    }
    r.innerHTML = h;
    r.style.setProperty('--levels', LEVELS);
    r.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-n]');
      if (!b) return;
      const n = +b.dataset.n;
      if (planOpen) setPlanLevel(n);
      else openPlan(n, b);
    });
    r.addEventListener('pointerover', (e) => {
      const b = e.target.closest('button[data-n]');
      if (b && !planOpen) setHover(+b.dataset.n);
    });
    r.addEventListener('pointerleave', () => { if (!planOpen) setHover(0); });
  }
}

window.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch' || !exploreOn()) { if (hoverLevel && !planOpen && !e.target.closest('.ruler')) setHover(0); return; }
  if (e.target.closest('.explore, .ruler, .topbar, .fab, .plan')) return;
  setHover(pickLevel(e.clientX, e.clientY));
}, { passive: true });
window.addEventListener('click', (e) => {
  if (!exploreOn()) return;
  if (e.target.closest('button, a, input, select, textarea, .explore, .ruler, .plan')) return;
  const n = pickLevel(e.clientX, e.clientY);
  if (!n) return;
  if (coarse && n !== selLevel) { setSel(n); return; }
  openPlan(n);
});
$('#lvDown').addEventListener('click', () => setSel(selLevel - 1));
$('#lvUp').addEventListener('click', () => setSel(selLevel + 1));
$('#openPlanBtn').addEventListener('click', (e) => openPlan(selLevel, e.currentTarget));

/* =====================================================================
   Floor plans
   ===================================================================== */
function zoneRooms(z) {
  const [x0, y0, x1, y1] = z.r;
  const rooms = [];
  if (z.f === 'N' || z.f === 'S') {
    const fd = (y1 - y0) * 0.58;
    const fy = z.f === 'S' ? [y1 - fd, y1] : [y0, y0 + fd];
    const by = z.f === 'S' ? [y0, y1 - fd] : [y0 + fd, y1];
    let cx = x0;
    for (const [name, w] of z.front) { const ww = (x1 - x0) * w; rooms.push({ name, r: [cx, fy[0], cx + ww, fy[1]], front: true, edge: z.f === 'S' ? 'top' : 'bottom' }); cx += ww; }
    cx = x0;
    for (const [name, w] of z.back) { const ww = (x1 - x0) * w; rooms.push({ name, r: [cx, by[0], cx + ww, by[1]], front: false, edge: z.f === 'S' ? 'bottom' : 'top' }); cx += ww; }
  } else {
    const fd = (x1 - x0) * 0.58;
    const fx = z.f === 'W' ? [x0, x0 + fd] : [x1 - fd, x1];
    const bx = z.f === 'W' ? [x0 + fd, x1] : [x0, x1 - fd];
    let cy = y0;
    for (const [name, w] of z.front) { const hh = (y1 - y0) * w; rooms.push({ name, r: [fx[0], cy, fx[1], cy + hh], front: true, edge: z.f === 'W' ? 'right' : 'left' }); cy += hh; }
    cy = y0;
    for (const [name, w] of z.back) { const hh = (y1 - y0) * w; rooms.push({ name, r: [bx[0], cy, bx[1], cy + hh], front: false, edge: z.f === 'W' ? 'left' : 'right' }); cy += hh; }
  }
  return rooms;
}
const f2 = (v) => (Math.round(v * 100) / 100).toString();
function doorPath(rm) {
  // a door leaf + swing on the room's inner edge (the edge facing the other band)
  const [x0, y0, x1, y1] = rm.r;
  const L = 0.78;
  if (/Living|Entry|Studio|Dining|Family/.test(rm.name)) return '';
  let hx, hy, dx = 0, dy = 0, ax = 0, ay = 0;
  if (rm.edge === 'top') { hx = x0 + 0.35; hy = y0; dy = 1; ax = 1; }
  else if (rm.edge === 'bottom') { hx = x0 + 0.35; hy = y1; dy = -1; ax = 1; }
  else if (rm.edge === 'left') { hx = x0; hy = y0 + 0.35; dx = 1; ay = 1; }
  else { hx = x1; hy = y0 + 0.35; dx = -1; ay = 1; }
  if (rm.front === false) { dx = -dx; dy = -dy; }
  const ex = hx + dx * L, ey = hy + dy * L, ox = hx + ax * L, oy = hy + ay * L;
  return `<path class="door" d="M${f2(hx)} ${f2(hy)} L${f2(ex)} ${f2(ey)} Q${f2(ox + dx * L)} ${f2(oy + dy * L)} ${f2(ox)} ${f2(oy)}"/>`;
}
function unitSVG(u, uid) {
  const fill = `var(--t-${u.group})`;
  const d = 'M' + u.poly.map(([x, y]) => `${x} ${y}`).join(' L') + ' Z';
  const rooms = u.zones.flatMap(zoneRooms);
  const out = [];
  out.push(`<g class="unit ${u.status}" data-id="${u.id}" tabindex="0" role="button" aria-label="${esc(M.t(T.residence, { id: u.id }))}, ${esc(u.type)}, ${esc(STATUS_LABEL[u.status])}">`);
  for (const [x0, x1] of u.bS) out.push(`<rect x="${x0}" y="10.22" width="${f2(x1 - x0)}" height="${f2(BAL_D - 0.22)}" style="fill:${fill};fill-opacity:.22"/><rect x="${x0}" y="10.22" width="${f2(x1 - x0)}" height="${f2(BAL_D - 0.22)}" style="fill:url(#deck${uid})"/>`);
  for (const [x0, x1] of u.bN) out.push(`<rect x="${x0}" y="${-10 - BAL_D}" width="${f2(x1 - x0)}" height="${f2(BAL_D - 0.22)}" style="fill:${fill};fill-opacity:.22"/><rect x="${x0}" y="${-10 - BAL_D}" width="${f2(x1 - x0)}" height="${f2(BAL_D - 0.22)}" style="fill:url(#deck${uid})"/>`);
  out.push(`<path class="u-fill" d="${d}" style="fill:${fill}"/>`);
  if (u.status === 'sold') out.push(`<path class="u-hatch" d="${d}" style="fill:url(#hatch${uid})"/>`);
  const z0 = u.zones[0].r;
  const badgeAt = [(z0[0] + z0[2]) / 2, (z0[1] + z0[3]) / 2];
  for (const rm of rooms) {
    const [x0, y0, x1, y1] = rm.r, w = x1 - x0, h = y1 - y0;
    out.push(`<rect class="room" x="${f2(x0)}" y="${f2(y0)}" width="${f2(w)}" height="${f2(h)}"/>`);
    out.push(doorPath(rm));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    // skip room labels that would collide with the unit badge (and its id line above it)
    if (Math.abs(cx - badgeAt[0]) < 3.2 && cy + 0.65 > badgeAt[1] - 1.45 && cy - 0.5 < badgeAt[1] + 0.75) continue;
    if (Math.min(w, h) < 1.6) continue;
    const vertical = h > w * 1.6 && w < 2.6;
    const tr = vertical ? ` transform="rotate(-90 ${f2(cx)} ${f2(cy)})"` : '';
    out.push(`<text class="room-name" x="${f2(cx)}" y="${f2(cy + (rm.front ? -0.05 : 0.14))}" text-anchor="middle"${tr}>${esc(rm.name)}</text>`);
    if (rm.front && w > 2.4 && h > 2.4) out.push(`<text class="room-dim" x="${f2(cx)}" y="${f2(cy + 0.48)}" text-anchor="middle">${w.toFixed(1)} × ${h.toFixed(1)}</text>`);
  }
  out.push(`<g class="badge" transform="translate(${f2(badgeAt[0])} ${f2(badgeAt[1])})"><rect x="-2" y="-.55" width="4" height="1.1" rx=".55"/><circle class="${u.status}" cx="-1.4" cy="0" r=".17"/><text class="b-full" x="-1.05" y=".16">${esc(u.type)}</text><text class="b-id" x="0" y="-.8" text-anchor="middle">${u.id}</text></g>`);
  out.push('</g>');
  return out.join('');
}
function coreSVG() {
  const o = [];
  o.push('<rect class="core" x="-4.5" y="-10" width="9" height="8.8"/>');
  for (const x of [-3.3, -1.1, 1.1]) o.push(`<rect class="core-line" x="${x}" y="-3.9" width="2.1" height="2.3"/><path class="core-line" d="M${x} -3.9 L${f2(x + 2.1)} -1.6 M${f2(x + 2.1)} -3.9 L${x} -1.6"/>`);
  for (const x0 of [-4.2, 1.6]) {
    o.push(`<rect class="core-line" x="${x0}" y="-9.7" width="2.6" height="5.2"/>`);
    let t = '';
    for (let y = -9.4; y < -4.6; y += 0.3) t += `M${x0} ${f2(y)} H${f2(x0 + 2.6)} `;
    o.push(`<path class="core-line" d="${t}" style="opacity:.6"/><path class="core-line" d="M${f2(x0 + 1.3)} -9.4 V-4.9"/>`);
  }
  o.push('<rect class="core-line" x="-0.9" y="-9.7" width="1.8" height="1.8"/><path class="core-line" d="M-0.9 -9.7 L0.9 -7.9"/>');
  o.push(`<text class="corr-label" x="0" y="-4.5" text-anchor="middle">${esc(String(T.plan.lifts).toLocaleUpperCase())}</text>`);
  return o.join('');
}
let planUid = 0;
function planSVG(n) {
  const uid = ++planUid;
  const fp = fpFor(n), units = unitsForLevel(n), b = balconies(n);
  const o = [];
  o.push(`<svg class="plan-svg" viewBox="-22 -17.4 44 34.8" preserveAspectRatio="xMidYMid meet" role="group" aria-label="${esc(M.t(T.planOf, { level: pad(n) }))}">`);
  o.push(`<defs><pattern id="hatch${uid}" width=".5" height=".5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2=".5" stroke="rgba(242,238,231,.42)" stroke-width=".07"/></pattern><pattern id="deck${uid}" width=".42" height=".42" patternUnits="userSpaceOnUse"><line x1="0" y1=".21" x2=".42" y2=".21" stroke="rgba(242,238,231,.2)" stroke-width=".04"/></pattern></defs>`);
  o.push('<rect class="ctx" x="-21" y="-16.4" width="42" height="32.8" rx=".3"/>');
  const OR = S.building?.orientation || {};
  o.push(`<text class="ctx-label" x="0" y="-15.5" text-anchor="middle">${esc(OR.north || '')}</text>`);
  o.push(`<text class="ctx-label" x="0" y="16.0" text-anchor="middle">${esc(OR.south || '')}</text>`);
  o.push(`<text class="ctx-label" transform="translate(-20.3 0) rotate(-90)" text-anchor="middle">${esc(OR.west || '')}</text>`);
  o.push(`<text class="ctx-label" transform="translate(20.3 0) rotate(90)" text-anchor="middle">${esc(OR.east || '')}</text>`);
  for (const [x0, x1] of b.S) o.push(`<rect class="bal" x="${x0}" y="10" width="${x1 - x0}" height="${BAL_D}"/>`);
  for (const [x0, x1] of b.N) o.push(`<rect class="bal" x="${x0}" y="${-10 - BAL_D}" width="${x1 - x0}" height="${BAL_D}"/>`);
  o.push('<rect class="slab" x="-17" y="-10" width="34" height="20"/>');
  const c = fp.corridor;
  o.push(`<rect class="corr" x="${c[0]}" y="${c[1]}" width="${c[2] - c[0]}" height="${c[3] - c[1]}"/>`);
  for (const u of units) o.push(unitSVG(u, uid));
  o.push(coreSVG());
  const corr = esc(String(T.plan.corridor).toLocaleUpperCase()), lobby = esc(String(T.plan.lobby).toLocaleUpperCase());
  if (c[2] - c[0] > 12) { o.push(`<text class="corr-label" x="-7.2" y=".15" text-anchor="middle">${corr}</text><text class="corr-label" x="7.2" y=".15" text-anchor="middle">${corr}</text>`); }
  else o.push(`<text class="corr-label" x="0" y=".15" text-anchor="middle">${lobby}</text>`);
  o.push('<path class="glaze" d="M-16.75 9.86 H16.75 M-16.75 -9.86 H-4.5 M4.5 -9.86 H16.75 M-16.86 -9.75 V9.75 M16.86 -9.75 V9.75"/>');
  o.push('<rect x="-17" y="-10" width="34" height="20" fill="none" stroke="rgba(242,238,231,.95)" stroke-width=".22"/>');
  o.push('<path class="dim" d="M-17 -14.1 V-13.3 M17 -14.1 V-13.3 M-17 -13.7 H17"/><text class="dim-label" x="0" y="-13.9" text-anchor="middle">34.0 m</text>');
  o.push('<path class="dim" d="M-18.9 -10 H-18.1 M-18.9 10 H-18.1 M-18.5 -10 V10"/><text class="dim-label" transform="translate(-18.7 0) rotate(-90)" text-anchor="middle">20.0 m</text>');
  o.push('<g transform="translate(-19 13.6)"><circle class="north" r=".75"/><path d="M0 -.62 L.28 .38 L0 .2 L-.28 .38 Z" fill="rgba(242,238,231,.85)"/><text class="north-n" y="-.98" text-anchor="middle">N</text></g>');
  o.push('<g transform="translate(14.4 14.1)"><path class="dim" d="M0 0 H5 M0 -.22 V.22 M2.5 -.15 V.15 M5 -.22 V.22"/><text class="dim-label" x="0" y="-.42">0</text><text class="dim-label" x="5" y="-.42" text-anchor="end">5 m</text></g>');
  o.push('</svg>');
  return o.join('');
}
function fitBadges(root) {
  for (const g of root.querySelectorAll('.badge')) {
    const t = g.querySelector('text.b-full');
    const rc = g.querySelector('rect');
    const c = g.querySelector('circle');
    let w = 3;
    try { w = t.getComputedTextLength(); } catch (e) { /* not rendered */ }
    const fs = parseFloat(getComputedStyle(t).fontSize) || 0.44;
    const padX = fs * 0.9, dot = fs * 0.85;
    const total = padX * 2 + dot + w;
    rc.setAttribute('x', f2(-total / 2)); rc.setAttribute('width', f2(total));
    rc.setAttribute('y', f2(-fs * 1.2)); rc.setAttribute('height', f2(fs * 2.4)); rc.setAttribute('rx', f2(fs * 1.2));
    c.setAttribute('cx', f2(-total / 2 + padX + dot * 0.3)); c.setAttribute('r', f2(fs * 0.36));
    t.setAttribute('x', f2(-total / 2 + padX + dot)); t.setAttribute('y', f2(fs * 0.36));
  }
}
function unitMessage(u) {
  return M.t(S.contact?.whatsappUnitMessage || S.contact?.whatsappMessage || '', { unit: u.id, type: u.type });
}
function unitCardHTML(u) {
  if (!u) return `<p class="uc-empty">${esc(T.planHint)}</p>`;
  const can = u.status !== 'sold';
  const showPrice = can || S.money?.showSoldPrices;
  const wa = can ? waLink(unitMessage(u)) : '';
  const enquireBtn = FORM_READY || !wa
    ? `<button class="btn amber" type="button" id="enquireBtn" ${can ? '' : 'disabled'}>${esc(can ? M.t(T.enquire, { id: u.id }) : STATUS_LABEL.sold)}</button>`
    : '';
  const waBtn = wa ? `<a class="btn ${enquireBtn ? 'ghost' : 'amber'} wa" href="${wa}" target="_blank" rel="noopener" id="unitWa">${WA_ICON}<span>${esc(T.whatsapp)}</span></a>` : '';
  return `<p class="label uc-id">${esc(M.t(T.residence, { id: u.id }))}</p>
    <h3>${esc(u.type)}</h3>
    <p class="uc-status"><span class="sdot ${u.status}"></span>${esc(STATUS_LABEL[u.status])}</p>
    <dl>
      <div><dt>${esc(T.interior)}</dt><dd>${esc(M.fmtArea(u.interior))}</dd></div>
      <div><dt>${esc(T.terrace)}</dt><dd>${esc(M.fmtArea(u.terrace))}</dd></div>
      <div><dt>${esc(T.total)}</dt><dd>${esc(M.fmtArea(u.total))}</dd></div>
      <div class="uc-view"><dt>${esc(T.view)}</dt><dd>${esc(u.view)}</dd></div>
      <div class="uc-price"><dt>${esc(T.price)}</dt><dd>${esc(showPrice ? M.fmtMoney(u.price) : STATUS_LABEL.sold)}</dd></div>
    </dl>
    <div class="uc-actions">${enquireBtn}${waBtn}</div>`;
}
function renderUnitCard(u) {
  unitCard.innerHTML = unitCardHTML(u);
  const b = $('#enquireBtn');
  if (b && u && u.status !== 'sold') b.addEventListener('click', () => enquire(u));
}
function renderLegend() {
  const used = new Set(ALL_UNITS.map((u) => u.group));
  const items = GROUPS.filter(([g]) => used.has(g)).map(([g, label]) => `<li><span class="sw" style="background:var(--t-${g})"></span>${esc(label)}</li>`).join('');
  $('#legend').innerHTML = items + '<li class="sep" aria-hidden="true"></li>' +
    Object.entries(STATUS_LABEL).map(([k, v]) => `<li><span class="sdot ${k}"></span>${esc(v)}</li>`).join('');
}
function planHeader(n) {
  const info = levelInfo(n);
  $('#planEyebrow').textContent = info.fp.name;
  $('#planLevel').textContent = `${T.level} ${pad(n)}`;
  $('#planMix').textContent = info.types.join(' · ');
  const others = info.shared.filter((m) => m !== n).map(pad);
  $('#planShared').textContent = others.length ? M.t(T.sharedWith, { levels: listJoin(others) }) : M.t(T.uniquePlate, { level: pad(n) });
  $('#planAvail').innerHTML = ['available', 'reserved', 'sold'].map((k) => `<span><span class="sdot ${k}"></span>${info.c[k]} ${esc(String(STATUS_LABEL[k]).toLocaleLowerCase())}</span>`).join('');
  $('#planCaption').textContent = info.shared.length > 1 ? M.t(T.typicalPlan, { levels: listJoin(info.shared.map(pad)) }) : M.t(T.planOf, { level: pad(n) });
}
function mountPlan(n) {
  planSheet.innerHTML = planSVG(n);
  fitBadges(planSheet);
  const units = unitsForLevel(n);
  selUnit = units.find((u) => u.status === 'available') || units.find((u) => u.status === 'reserved') || units[0];
  markSel();
  renderUnitCard(selUnit);
}
function markSel() {
  for (const g of planSheet.querySelectorAll('.unit')) g.classList.toggle('is-sel', selUnit && g.dataset.id === selUnit.id);
}
function unitById(id) { return ALL_UNITS.find((u) => u.id === id); }
planSheet.addEventListener('pointerover', (e) => {
  const g = e.target.closest('.unit');
  if (g && e.pointerType !== 'touch') renderUnitCard(unitById(g.dataset.id));
});
planSheet.addEventListener('pointerleave', () => renderUnitCard(selUnit));
planSheet.addEventListener('click', (e) => {
  const g = e.target.closest('.unit');
  if (!g) return;
  selUnit = unitById(g.dataset.id);
  markSel();
  renderUnitCard(selUnit);
});
planSheet.addEventListener('keydown', (e) => {
  const g = e.target.closest('.unit');
  if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selUnit = unitById(g.dataset.id); markSel(); renderUnitCard(selUnit); }
});
planSheet.addEventListener('focusin', (e) => { const g = e.target.closest('.unit'); if (g) renderUnitCard(unitById(g.dataset.id)); });

let lastTrigger = null, planAnim = null, swapToken = 0;
function openPlan(n, trigger) {
  if (planOpen) { setPlanLevel(n); return; }
  n = clamp(n, 1, LEVELS);
  planOpen = true;
  planLevel = n;
  selLevel = n;
  lastTrigger = trigger || document.activeElement;
  setHover(0);
  U.sel.value = n;
  planHeader(n);
  plan.hidden = false;
  document.documentElement.classList.add('plan-open');
  mountPlan(n);
  showLevel(n);
  requestAnimationFrame(() => {
    plan.classList.add('is-open');
    const sr = planSheet.getBoundingClientRect();
    let from = 'translate(0, 30px) scale(.92)';
    if (hasGL) {
      const fr = floorRect(n);
      const fw = Math.min(sr.width, sr.height * (44 / 34.8)) * (34 / 44);
      const s = clamp((fr.r - fr.l) / fw, 0.06, 1);
      const dx = (fr.l + fr.r) / 2 - (sr.left + sr.width / 2), dy = (fr.t + fr.b) / 2 - (sr.top + sr.height / 2);
      from = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s.toFixed(3)}) rotateX(80deg)`;
    }
    planAnim?.cancel();
    planAnim = reduceMotion
      ? planSheet.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 })
      : planSheet.animate([
        { transform: from, opacity: 0.25 },
        { transform: 'translate(0,0) scale(1) rotateX(0deg)', opacity: 1 },
      ], { duration: 1050, easing: 'cubic-bezier(.22,.8,.18,1)' });
    $('#planBack').focus({ preventScroll: true });
  });
  dimTarget = 1;
  kick();
}
function closePlan() {
  if (!planOpen) return;
  const n = planLevel;
  plan.classList.remove('is-open');
  dimTarget = 0;
  const done = () => {
    plan.hidden = true;
    planOpen = false;
    document.documentElement.classList.remove('plan-open');
    U.sel.value = coarse ? selLevel : -1;
    showLevel(selLevel);
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus({ preventScroll: true });
    kick();
  };
  if (reduceMotion || !hasGL) { done(); return; }
  const sr = planSheet.getBoundingClientRect();
  const fr = floorRect(n);
  const fw = Math.min(sr.width, sr.height * (44 / 34.8)) * (34 / 44);
  const s = clamp((fr.r - fr.l) / fw, 0.06, 1);
  const dx = (fr.l + fr.r) / 2 - (sr.left + sr.width / 2), dy = (fr.t + fr.b) / 2 - (sr.top + sr.height / 2);
  planAnim?.cancel();
  planAnim = planSheet.animate([
    { transform: 'translate(0,0) scale(1) rotateX(0deg)', opacity: 1 },
    { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s.toFixed(3)}) rotateX(80deg)`, opacity: 0 },
  ], { duration: 650, easing: 'cubic-bezier(.5,0,.75,.3)', fill: 'forwards' });
  let closed = false;
  const finish = () => { if (closed) return; closed = true; planAnim?.cancel(); done(); };
  planAnim.onfinish = finish;
  setTimeout(finish, 700);
  kick();
}
function setPlanLevel(n) {
  n = clamp(n, 1, LEVELS);
  if (n === planLevel) return;
  const dir = n > planLevel ? -1 : 1;
  planLevel = n;
  selLevel = n;
  U.sel.value = n;
  planHeader(n);
  showLevel(n);
  planAnim?.cancel();
  const token = ++swapToken;
  const out = reduceMotion ? null : planSheet.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateY(${dir * 18}px)` }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
  let swapped = false;
  const swap = () => {
    if (swapped || token !== swapToken) return;
    swapped = true;
    out?.cancel();
    mountPlan(planLevel);
    if (!reduceMotion) planAnim = planSheet.animate([{ opacity: 0, transform: `translateY(${-dir * 18}px)` }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.75,.15,1)' });
  };
  if (out) { out.onfinish = swap; setTimeout(swap, 190); } else swap();
  kick();
}
$('#planBack').addEventListener('click', closePlan);
$('#planDown').addEventListener('click', () => setPlanLevel(planLevel - 1));
$('#planUp').addEventListener('click', () => setPlanLevel(planLevel + 1));
window.addEventListener('keydown', (e) => {
  if (!planOpen) return;
  if (e.key === 'Escape') { e.preventDefault(); closePlan(); }
  else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); setPlanLevel(planLevel + 1); }
  else if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); setPlanLevel(planLevel - 1); }
});
window.addEventListener('resize', () => { if (planOpen) fitBadges(planSheet); });

/* =====================================================================
   Register form & navigation
   ===================================================================== */
function enquire(u) {
  closePlan();
  const unitField = $('#fUnit'), typeField = $('#fType');
  if (unitField) unitField.value = `${u.id} · ${u.type}`;
  if (typeField && [...typeField.options].some((o) => o.value === u.type)) typeField.value = u.type;
  setTimeout(() => {
    goTo('register');
    setTimeout(() => $('#fName')?.focus({ preventScroll: true }), 700);
  }, reduceMotion ? 0 : 450);
}

/* Sends an enquiry through Web3Forms (https://web3forms.com), which emails it to the site owner. */
async function sendEnquiry(f) {
  const subject = M.t(S.form?.subject || 'New enquiry: {project}') + (f.unit ? ` · ${f.unit}` : '');
  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      access_key: S.form.accessKey,
      subject,
      from_name: S.project?.name || 'Website',
      replyto: f.email,
      botcheck: f.botcheck,
      name: f.name,
      email: f.email,
      phone: f.phone || '-',
      [T.form.type]: f.type || '-',
      [T.form.unit]: f.unit || '-',
      message: f.message || '-',
      page: location.href,
    }),
  });
  let json = {};
  try { json = await res.json(); } catch (e) { /* not JSON */ }
  if (!res.ok || json.success === false) throw new Error(json.message || `HTTP ${res.status}`);
}
const regForm = $('#regForm');
regForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('#fName'), email = $('#fEmail'), consent = $('#fConsent'), err = $('#formErr'), done = $('#formDone');
  const btn = regForm.querySelector('button[type="submit"]');
  const okName = name.value.trim().length > 1;
  const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
  const okConsent = !consent || consent.checked;
  name.setAttribute('aria-invalid', String(!okName));
  email.setAttribute('aria-invalid', String(!okEmail));
  if (consent) consent.setAttribute('aria-invalid', String(!okConsent));
  const showErr = (msg) => { err.hidden = false; err.textContent = msg; };
  if (!okName || !okEmail || !okConsent) {
    showErr(!okName ? T.form.nameError : !okEmail ? T.form.emailError : T.form.consentError);
    (!okName ? name : !okEmail ? email : consent).focus();
    return;
  }
  err.hidden = true;
  done.hidden = true;
  const fields = {
    name: name.value.trim(), email: email.value.trim(), phone: $('#fPhone')?.value.trim() || '',
    type: $('#fType')?.value || '', unit: $('#fUnit')?.value.trim() || '', message: $('#fMsg')?.value.trim() || '',
    botcheck: !!regForm.querySelector('input[name="botcheck"]')?.checked,
  };
  const first = fields.name.split(/\s+/)[0];
  const success = () => {
    done.hidden = false;
    done.innerHTML = `<p>${esc(M.t(T.form.success, { name: first }))}</p>`;
    regForm.reset();
    done.focus?.();
  };
  if (fields.botcheck) { success(); return; } // a bot ticked the hidden box: pretend it worked
  if (!FORM_READY) { showErr(T.form.notReady); return; }
  const label = btn.textContent;
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  btn.textContent = T.form.sending;
  try {
    await sendEnquiry(fields);
    success();
  } catch (error) {
    console.warn('Enquiry failed:', error);
    showErr(T.form.error);
  } finally {
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    btn.textContent = label;
  }
});

const GO = { location: 0.315, architecture: 0.715, residences: 0.9 };
function goTo(key) {
  if (planOpen) closePlan();
  if (key === 'register') {
    $('#register').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    return;
  }
  const pp = key === 'top' ? 0 : GO[key];
  if (pp === undefined) return;
  window.scrollTo({ top: pp * maxScroll(), behavior: 'auto' });
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-go], #brandLink');
  if (!a) return;
  e.preventDefault();
  goTo(a.id === 'brandLink' ? 'top' : a.dataset.go);
});

/* =====================================================================
   Loop
   ===================================================================== */
let last = performance.now(), kicked = 2, raf = 0;
// step the render resolution down on slower GPUs so scrolling stays smooth
let slowFrames = 0, adaptCooldown = 0;
function adapt(dt) {
  if (!ready || !hasGL || TEST.noAdapt) return;
  if (adaptCooldown > 0) { adaptCooldown--; return; }
  slowFrames = dt > 0.034 ? slowFrames + 1 : Math.max(0, slowFrames - 2);
  if (slowFrames > 40 && Q.dpr > 1) {
    Q.dpr = Math.max(1, Q.dpr - 0.25);
    slowFrames = 0;
    adaptCooldown = 90;
    doResize();
  }
}
function kick() { kicked = Math.max(kicked, 2); if (!raf) raf = requestAnimationFrame(tick); }
function tick(now) {
  raf = 0;
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  time += dt;
  readScroll();
  const prevP = p;
  const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 5.2);
  p += (pTarget - p) * k;
  if (Math.abs(pTarget - p) < 0.00002) p = pTarget;
  const moving = Math.abs(p - prevP) > 1e-7;
  const ambient = !reduceMotion && (p < 0.33 || (p >= CUT && p < 0.63));
  const animating = moving || ambient || kicked > 0 || Math.abs(dimV - dimTarget) > 0.002 || blur > 0.004;
  if (animating) {
    update(dt);
    if (ready) render();
    kicked = Math.max(0, kicked - 1);
    adapt(dt);
  }
  raf = requestAnimationFrame(tick);
}
window.addEventListener('scroll', () => { if (!raf) kick(); }, { passive: true });

let resizeT = 0, lastW = innerWidth, lastH = innerHeight;
function doResize() {
  if (!hasGL) return;
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(Q.dpr);
  renderer.setSize(w, h, false);
  rt.setSize(Math.floor(w * Q.dpr), Math.floor(h * Q.dpr));
  finalMat.uniforms.uRes.value.set(Math.floor(w * Q.dpr), Math.floor(h * Q.dpr));
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  lastW = w; lastH = h;
  kick();
}
window.addEventListener('resize', () => {
  clearTimeout(resizeT);
  const big = Math.abs(innerWidth - lastW) > 2 || Math.abs(innerHeight - lastH) > 90;
  resizeT = setTimeout(() => { if (big || !coarse) doResize(); else kick(); }, 120);
});

/* =====================================================================
   Boot
   ===================================================================== */
async function boot() {
  buildRulers();
  renderLegend();
  showLevel(selLevel);
  readScroll();
  p = pTarget;
  update(0);
  kick();
  if (!hasGL) { ready = true; document.body.classList.add('ready'); return; }
  try {
    renderer.setPixelRatio(Q.dpr);
    renderer.setSize(innerWidth, innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    setLoad(0.08);
    buildPost();
    buildLighting();
    buildMaterials();
    buildSky();
    await yieldUI();
    buildClouds();
    setLoad(0.2);
    await yieldUI();
    const L = layoutCommunity();
    buildGround(L);
    setLoad(0.45);
    await yieldUI();
    buildCommunity(L);
    buildSkyline(L);
    setLoad(0.6);
    await yieldUI();
    buildTower();
    buildPodium();
    buildPalms();
    buildLights();
    buildCranes();
    built = true;
    setLoad(0.78);
    await yieldUI();
    // compile every program up front so nothing hitches mid-scroll
    const hidden = [];
    scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
    const swap = world.tower.levels.map((l) => l.white);
    camera.position.set(0, 200, 400); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    renderer.compile(scene, camera);
    swap.forEach((w) => { w.material = MATS.concrete; });
    renderer.compile(scene, camera);
    swap.forEach((w) => { w.material = MATS.white; });
    hidden.forEach((o) => { o.visible = false; });
    lastBuildKey = '';
    setLoad(0.95);
    await yieldUI();
    readScroll();
    p = pTarget;
    prevCam.set(0, 0, 0);
    update(0);
    blur = 0;
    render();
    ready = true;
    document.body.classList.add('ready');
    setLoad(1);
    const h = (location.hash || '').slice(1);
    if (GO[h] !== undefined || h === 'register') setTimeout(() => goTo(h), 400);
    kick();
  } catch (err) {
    console.error(err);
    hasGL = false;
    document.body.classList.add('no-webgl');
    ready = true;
    document.body.classList.add('ready');
  }
}
renderer?.getContext()?.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); hasGL = false; document.body.classList.add('no-webgl'); });

/* test hooks (harmless in production) */
window.__oriel = {
  isReady: () => ready,
  jump(pp) { window.scrollTo(0, pp * maxScroll()); readScroll(); p = pTarget = clamp(pp); prevCam.copy(camera.position); blur = 0; update(0.016); prevCam.copy(camera.position); update(0.016); blur = 0; if (finalMat) finalMat.uniforms.uBlur.value = 0; render(); },
  renderFrames(k = 2) { for (let i = 0; i < k; i++) { update(0.016); render(); } },
  state: () => ({ p, pTarget, selLevel, planOpen, units: TOTAL_UNITS, minPrice: MIN_PRICE, levels: LEVELS, formReady: FORM_READY }),
  openPlan: (n) => openPlan(n), closePlan, setHover, setSel, pickLevel, floorRect, projectY,
};
boot();
