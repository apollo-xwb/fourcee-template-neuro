// Gem geometry: explicit faceted cuts, built in millimetres, girdle centred on y=0.
import * as THREE from 'three';

const TAU = Math.PI * 2;

// ---- outlines: return r(theta) in mm for a stone of length L (x) and width W (z)
function polyRadius(poly) {
  return th => {
    const dx = Math.cos(th), dy = Math.sin(th);
    let best = Infinity;
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length];
      const ex = q[0] - p[0], ey = q[1] - p[1];
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-12) continue;
      const t = (p[0] * ey - p[1] * ex) / den;
      const s = (p[0] * dy - p[1] * dx) / den;
      if (t > 0 && s >= -1e-9 && s <= 1 + 1e-9 && t < best) best = t;
    }
    return best === Infinity ? 0 : best;
  };
}
export function octagon(a, b, c) {
  return [[a, b - c], [a - c, b], [-a + c, b], [-a, b - c], [-a, -b + c], [-a + c, -b], [a - c, -b], [a, -b + c]];
}
function pearPoly(a, b) {
  const pts = [];
  let maxW = 0;
  for (let i = 0; i < 400; i++) { const t = i / 400 * TAU; maxW = Math.max(maxW, Math.sin(t) * Math.sin(t / 2)); }
  for (let i = 0; i < 160; i++) {
    const t = i / 160 * TAU;
    pts.push([Math.cos(t) * a, Math.sin(t) * Math.sin(t / 2) / maxW * b]);
  }
  return pts;
}
// dims (mm) of a 1ct diamond-density stone: [length, width]
export const BASE_DIMS = { round: [6.5, 6.5], oval: [7.7, 5.7], princess: [5.5, 5.5], emerald: [7.0, 5.0], pear: [8.6, 5.6], cushion: [6.0, 6.0], marquise: [10.0, 5.0], radiant: [6.6, 5.3], asscher: [5.6, 5.6], heart: [6.6, 6.6] };
export const CUTS = Object.keys(BASE_DIMS);
function marquisePoly(a, b) {
  // two circular arcs meeting in points at +-a on x
  const R = (a * a + b * b) / (2 * b), cy = R - b, pts = [];
  const t0 = Math.atan2(a, cy);
  for (let i = 0; i < 80; i++) { const t = -t0 + 2 * t0 * i / 79; pts.push([R * Math.sin(t), -(R * Math.cos(t) - cy)]); }
  for (let i = 1; i < 79; i++) { const t = t0 - 2 * t0 * i / 79; pts.push([R * Math.sin(t), R * Math.cos(t) - cy]); }
  return pts;
}
function heartPoly(a, b) {
  const raw = [];
  for (let i = 0; i < 240; i++) {
    const t = i / 240 * TAU;
    raw.push([13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t), 16 * Math.pow(Math.sin(t), 3)]);
  }
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  raw.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
  // centre slightly toward the lobes so the outline stays star-shaped from the origin
  const cx = (x0 + x1) / 2 + (x1 - x0) * 0.06, cy = (y0 + y1) / 2;
  return raw.map(([x, y]) => [(x - cx) / ((x1 - x0) / 2) * a, (y - cy) / ((y1 - y0) / 2) * b]);
}
export function outline(shape, L, W) {
  const a = L / 2, b = W / 2;
  if (shape === 'round') return () => a;
  if (shape === 'oval') return th => a * b / Math.hypot(b * Math.cos(th), a * Math.sin(th));
  if (shape === 'princess') return th => a / Math.max(Math.abs(Math.cos(th)), Math.abs(Math.sin(th)));
  if (shape === 'cushion') return th => { const n = 4; return a / Math.pow(Math.pow(Math.abs(Math.cos(th)), n) + Math.pow(Math.abs(Math.sin(th)), n), 1 / n); };
  if (shape === 'emerald') return polyRadius(octagon(a, b, b * 0.32));
  if (shape === 'pear') return polyRadius(pearPoly(a, b));
  if (shape === 'radiant') return polyRadius(octagon(a, b, b * 0.2));
  if (shape === 'asscher') return polyRadius(octagon(a, b, b * 0.42));
  if (shape === 'marquise') return polyRadius(marquisePoly(a, b));
  if (shape === 'heart') return polyRadius(heartPoly(a, b));
  return () => a;
}

// ---- facet list -> flat-shaded geometry
function newell(poly) {
  const n = new THREE.Vector3();
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    n.x += (p.y - q.y) * (p.z + q.z);
    n.y += (p.z - q.z) * (p.x + q.x);
    n.z += (p.x - q.x) * (p.y + q.y);
  }
  return n;
}
function build(facets) {
  const pos = [], nor = [];
  for (let f of facets) {
    // drop duplicate consecutive vertices
    f = f.filter((p, i) => p.distanceToSquared(f[(i + 1) % f.length]) > 1e-10);
    if (f.length < 3) continue;
    const n = newell(f);
    const area = n.length();
    if (area < 1e-7) continue;
    n.normalize();
    const c = new THREE.Vector3(); f.forEach(p => c.add(p)); c.divideScalar(f.length);
    if (n.dot(c) < 0) { f = f.slice().reverse(); n.negate(); }
    for (let i = 1; i < f.length - 1; i++) {
      for (const p of [f[0], f[i], f[i + 1]]) { pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

// ---- modified round brilliant, radially remapped onto any convex outline O(theta)
export function brilliant(O, Hc, Hp, G, sub = 4) {
  const T = 0.57, RS = 0.765, RL = 0.23;
  const P = (r, th, y) => new THREE.Vector3(r * O(th) * Math.cos(th), y, r * O(th) * Math.sin(th));
  const yc = r => G / 2 + Hc * Math.min(1, (1 - r) / (1 - T));
  const yp = r => -G / 2 - Hp * (1 - r);
  const d = TAU / 8, h = d / 2;
  const F = [];
  const table = [];
  for (let k = 0; k < 8; k++) table.push(P(T, k * d, G / 2 + Hc));
  F.push(table);
  const arc = (a0, a1, y) => { const pts = []; for (let i = 0; i <= sub; i++) { const t = a0 + (a1 - a0) * i / sub; pts.push(P(1, t, y)); } return pts; };
  const C = new THREE.Vector3(0, -G / 2 - Hp, 0);
  for (let k = 0; k < 8; k++) {
    const a = k * d;
    const S = P(RS, a + h, yc(RS * Math.cos(0) * 0.985));
    const Sp = P(RS, a - h, yc(RS * 0.985));
    const Tk = P(T, a, G / 2 + Hc), Tk1 = P(T, a + d, G / 2 + Hc);
    F.push([Tk, Tk1, S]); // star
    F.push([Tk, Sp, P(1, a, G / 2), S]); // bezel (kite)
    F.push([S, ...arc(a, a + h, G / 2)]); // upper girdle A
    F.push([S, ...arc(a + h, a + d, G / 2)]); // upper girdle B
    // girdle band
    const top = arc(a, a + d, G / 2), bot = arc(a, a + d, -G / 2);
    for (let i = 0; i < top.length - 1; i++) F.push([top[i], top[i + 1], bot[i + 1], bot[i]]);
    // pavilion
    const L = P(RL, a + h, yp(RL)), Lp = P(RL, a - h, yp(RL));
    F.push([...arc(a, a + h, -G / 2), L]);
    F.push([...arc(a + h, a + d, -G / 2), L]);
    F.push([C, Lp, P(1, a, -G / 2), L]);
  }
  return build(F);
}

// ---- step cut (emerald) from concentric octagons with a keel
export function stepCut(L, W, Hc, Hp, G, corner = 0.32) {
  const a = L / 2, b = W / 2, c = b * corner, k = Math.SQRT2 - 1;
  const ring = (d, y) => octagon(a - d, Math.max(b - d, 0), Math.max(c - d * k, 0)).map(p => new THREE.Vector3(p[0], y, p[1]));
  const crown = [[0, 0], [0.09, 0.38], [0.18, 0.7], [0.27, 1]].map(([d, f]) => ring(d * b, G / 2 + Hc * f));
  const pav = [[0, 0], [0.3, 0.36], [0.58, 0.66], [0.82, 0.88], [1, 1]].map(([d, f]) => ring(d * b, -G / 2 - Hp * f));
  const F = [crown[3]];
  const strip = (A, B) => { for (let j = 0; j < 8; j++) F.push([A[j], A[(j + 1) % 8], B[(j + 1) % 8], B[j]]); };
  for (let i = 0; i < 3; i++) strip(crown[i], crown[i + 1]);
  strip(crown[0], pav[0]);
  for (let i = 0; i < 4; i++) strip(pav[i], pav[i + 1]);
  return build(F);
}

// carat -> dims (mm), accounting for density (same weight, different size)
export const DENSITY = { diamond: 3.52, labdiamond: 3.52, moissanite: 3.21, sapphire: 4.0, ruby: 4.0, emerald: 2.72 };
export function stoneDims(shape, carat, gem) {
  const f = Math.cbrt(carat * 3.52 / (DENSITY[gem] || 3.52));
  const [L, W] = BASE_DIMS[shape] || BASE_DIMS.round;
  return [L * f, W * f];
}
export function makeStone(shape, L, W) {
  const w = Math.min(L, W);
  let Hc, Hp, G = Math.max(0.06, 0.025 * w);
  if (shape === 'round') { Hc = 0.162 * w; Hp = 0.431 * w; }
  else if (shape === 'princess') { Hc = 0.11 * w; Hp = 0.58 * w; }
  else if (shape === 'emerald' || shape === 'asscher') { Hc = 0.13 * w; Hp = 0.46 * w; }
  else if (shape === 'radiant') { Hc = 0.12 * w; Hp = 0.52 * w; }
  else { Hc = 0.15 * w; Hp = 0.44 * w; }
  const geo = shape === 'emerald' ? stepCut(L, W, Hc, Hp, G) : shape === 'asscher' ? stepCut(L, W, Hc, Hp, G, 0.42)
    : brilliant(outline(shape, L, W), Hc, Hp, G, shape === 'round' ? 3 : 5);
  return { geo, Hc, Hp, G, O: outline(shape, L, W), L, W };
}
