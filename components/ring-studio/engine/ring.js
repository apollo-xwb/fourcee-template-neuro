// Ring assembly. Units: mm. Ring axis = z, stone on +y, ring centre at origin.
import * as THREE from 'three';
import { makeStone, stoneDims, outline } from './gems.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildOriginal } from './original.js';

const TAU = Math.PI * 2;
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

// ring size letter (SA/UK, BS 6820) -> inner diameter mm
export const SIZES = [];
'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((l, i) => { SIZES.push([l, 37.5 + 1.25 * i]); if (l !== 'Z') SIZES.push([l + '½', 37.5 + 1.25 * i + 0.625]); });
for (let i = 1; i <= 6; i++) SIZES.push(['Z+' + i, 68.75 + 1.25 * i]);
// US / Canada sizes (numeric): inner diameter mm = 11.63 + 0.8128 * size
export const US_SIZES = [];
for (let s = 3; s <= 15; s += 0.5) US_SIZES.push(s);
export const usDiameter = s => 11.63 + 0.8128 * s;
export const sizeDiameter = s => {
  if (typeof s === 'number' || /^\d+(\.\d+)?$/.test(String(s))) return usDiameter(+s);
  const f = SIZES.find(x => x[0] === s); return (f ? f[1] : 53.75) / Math.PI;
};

// profile: closed loop of [u (0 inner .. 1 outer), v (-.5 .. .5 across width)]
function profile(kind, n = 72) {
  const P = [];
  const se = (c, a, nOut, nIn) => {
    for (let i = 0; i < n; i++) {
      const ph = i / n * TAU, s = Math.sin(ph), co = Math.cos(ph);
      const e = s >= 0 ? nOut : nIn, am = s >= 0 ? a[0] : a[1];
      const v = 0.5 * Math.sign(co) * Math.pow(Math.abs(co), 2 / e);
      const u = c + am * Math.sign(s) * Math.pow(Math.abs(s), 2 / e);
      P.push([u, v]);
    }
  };
  if (kind === 'flat') se(0.5, [0.5, 0.5], 9, 9);
  else if (kind === 'd') se(0.12, [0.88, 0.12], 2.1, 10);
  else if (kind === 'knife') { // peaked ridge, comfort inside
    for (let i = 0; i < n; i++) {
      const ph = i / n * TAU, s = Math.sin(ph), co = Math.cos(ph);
      if (s >= 0) { const v = 0.5 * Math.sign(co) * Math.pow(Math.abs(co), 0.9); const x = Math.abs(2 * v); P.push([0.18 + 0.82 * Math.pow(1 - x, 1.25) * Math.pow(s, 0.25), v]); }
      else { const v = 0.5 * Math.sign(co) * Math.pow(Math.abs(co), 2 / 6); P.push([0.18 + 0.18 * Math.sign(s) * Math.pow(Math.abs(s), 2 / 6), v]); }
    }
  } else if (kind === 'bevel' || kind === 'stepped') {
    // explicit outer polygon (v from +.5 to -.5), comfort-fit inside
    const outer = kind === 'bevel'
      ? [[0.5, 0.5], [0.5, 0.49], [0.78, 0.36], [1, 0.27], [1, 0.26], [1, -0.26], [1, -0.27], [0.78, -0.36], [0.5, -0.49], [0.5, -0.5]]
      : [[0.45, 0.5], [0.72, 0.5], [0.73, 0.49], [0.74, 0.25], [0.76, 0.24], [1, 0.235], [1, -0.235], [0.76, -0.24], [0.74, -0.25], [0.73, -0.49], [0.72, -0.5], [0.45, -0.5]];
    for (const [u, v] of outer) P.push([u, v]);
    const m = 28;
    for (let i = 1; i < m; i++) { const ph = Math.PI + i / m * Math.PI, s = Math.sin(ph), co = Math.cos(ph); P.push([0.2 + 0.2 * Math.sign(s) * Math.pow(Math.abs(s), 2 / 6), -0.5 * Math.sign(co) * Math.pow(Math.abs(co), 2 / 6) * -1]); }
  } else se(0.16, [0.84, 0.16], 2.7, 6); // court (comfort fit)
  return P;
}

// sweep a profile around the z axis; t(th), w(th) give thickness and width per angle
function bandGeo(rIn, kind, tFn, wFn, segs = 240, zFn = () => 0) {
  const prof = profile(kind);
  const n = prof.length, pos = [], idx = [];
  for (let i = 0; i < segs; i++) {
    const th = i / segs * TAU, t = tFn(th), w = wFn(th), z0 = zFn(th);
    for (const [u, v] of prof) {
      const r = rIn + u * t;
      pos.push(r * Math.sin(th), r * Math.cos(th), v * w + z0);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < n; j++) {
    const a = i * n + j, b = ((i + 1) % segs) * n + j, c = ((i + 1) % segs) * n + (j + 1) % n, d = i * n + (j + 1) % n;
    idx.push(a, d, b, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// sweep a closed profile [s (scale of outline), o (mm offset), y] around a stone outline (seat / bezel / halo)
function outlineSweep(O, prof, segs = 96) {
  const pos = [], idx = [], n = prof.length;
  for (let i = 0; i < segs; i++) {
    const th = i / segs * TAU, R = O(th), c = Math.cos(th), s = Math.sin(th);
    for (const [k, o, y] of prof) { const r = R * k + o; pos.push(r * c, y, r * s); }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < n; j++) {
    const a = i * n + j, b = ((i + 1) % segs) * n + j, c = ((i + 1) % segs) * n + (j + 1) % n, d = i * n + (j + 1) % n;
    idx.push(a, b, d, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function tube(points, r, segs = 28) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  return new THREE.TubeGeometry(curve, segs, r, 18, false);
}
function ball(r, p) { const g = new THREE.SphereGeometry(r, 28, 20); g.translate(p.x, p.y, p.z); return g; }

// arc-length samples around an outline (for halos)
function evenlyAround(O, offset, count) {
  const N = 720, pts = [], cum = [0];
  for (let i = 0; i <= N; i++) { const th = i / N * TAU, r = O(th) + offset; pts.push([r * Math.cos(th), r * Math.sin(th), th]); if (i) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); }
  const total = cum[N];
  const n = count || 0, out = [];
  for (let k = 0; k < n; k++) { const target = (k + 0.5) / n * total; let i = cum.findIndex(c => c >= target); i = Math.max(1, i); out.push(pts[i]); }
  return { total, out };
}

/**
 * Build the ring. Returns { metal: [geos], gems: [{geo, mats key, matrix}], engraveSpec, bounds }
 */
export function buildRing(cfg) {
  if (cfg.style === 'original') return buildOriginal(cfg);
  const D = sizeDiameter(cfg.size || 7), rIn = D / 2;
  let style = cfg.style || 'solitaire';
  let setting = cfg.setting || 'prong4';
  let bandStonesCfg = cfg.bandStones || 'none';
  if (style === 'bezel') { style = 'solitaire'; setting = 'bezel'; }
  if (style === 'eternity') { style = 'band'; bandStonesCfg = cfg.bandStones === 'half' ? 'half' : 'full'; }
  const cathedral = style === 'cathedral';
  const band = style === 'pave' ? 'pave' : (cfg.band || 'plain');
  const prof = band === 'knife' ? 'knife' : (cfg.profile || 'court');
  const W0 = +cfg.width || 2.2;
  const metal = [], gems = [];
  const gemKey = style === 'signet' || (style === 'band' && bandStonesCfg === 'none') ? null : (cfg.stone || 'diamond');
  let t0 = prof === 'flat' ? 1.7 : 1.8;
  if (W0 >= 4) t0 = Math.min(2.4, 1.6 + W0 * 0.1); // men's widths read heavier
  if (style === 'band' && bandStonesCfg !== 'none') t0 = 2.0;
  let tFn = () => t0, wFn = () => W0;
  let headTop = rIn + t0;
  let face = null;

  if (style === 'signet') {
    const fw = 10.5, fh = cfg.face === 'round' ? 10.5 : 9;
    tFn = th => t0 + 2.3 * Math.pow(Math.max(0, Math.cos(th)), 2.4);
    wFn = th => W0 + (fh * 0.86 - W0) * Math.pow(Math.max(0, Math.cos(th)), 3.2);
    headTop = rIn + t0 + 2.3;
    const shape = new THREE.Shape();
    if (cfg.face === 'cushion') {
      const a = fw / 2, b = fh / 2, rr = 2.2;
      shape.moveTo(-a + rr, -b); shape.lineTo(a - rr, -b); shape.quadraticCurveTo(a, -b, a, -b + rr); shape.lineTo(a, b - rr); shape.quadraticCurveTo(a, b, a - rr, b);
      shape.lineTo(-a + rr, b); shape.quadraticCurveTo(-a, b, -a, b - rr); shape.lineTo(-a, -b + rr); shape.quadraticCurveTo(-a, -b, -a + rr, -b);
    } else shape.absellipse(0, 0, fw / 2, fh / 2, 0, TAU, false, 0);
    const fg = new THREE.ExtrudeGeometry(shape, { depth: 1.1, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 10, curveSegments: 96 });
    fg.rotateX(-Math.PI / 2); // extrusion now +y, shape in x/-z
    fg.translate(0, headTop - 1.4, 0);
    metal.push(fg);
    face = { y: headTop - 1.4 + 1.1 + 0.5, w: fw, h: fh };
  } else if (cathedral) {
    // shoulders sweep up into arches that cradle the head
    tFn = th => t0 + 1.7 * Math.pow(Math.max(0, Math.cos(th)), 2.2);
    wFn = th => W0 * (1 - 0.12 * Math.pow(Math.max(0, Math.cos(th)), 3));
    headTop = rIn + t0 + 1.7;
  } else if (style !== 'band') {
    tFn = th => t0 + 0.25 * Math.pow(Math.max(0, Math.cos(th)), 6);
    wFn = th => W0 * (1 - 0.22 * Math.pow(Math.max(0, Math.cos(th)), 4)) + 0.0;
    headTop = rIn + t0 + 0.25;
  }
  const headStyle = style !== 'band' && style !== 'signet';
  if (band === 'split' && headStyle) {
    const sp = th => Math.pow(Math.max(0, Math.cos(th)), 1.5);
    for (const k of [-1, 1]) metal.push(bandGeo(rIn, prof, tFn, th => wFn(th) * (1 - 0.48 * sp(th)), 240, th => k * (W0 * 0.26 + 1.9) * sp(th)));
  } else if (band === 'twisted' && style !== 'signet') {
    const rs = Math.min(t0, W0) * 0.37, A = W0 * 0.23;
    const turns = Math.max(8, Math.round(rIn * TAU / (W0 * 2.6)));
    for (const ph of [0, Math.PI]) {
      const pts = [], N = 900;
      for (let i = 0; i < N; i++) {
        const th = i / N * TAU, q = turns * th + ph;
        const r = rIn + rs + 0.05 + (tFn(th) - t0) * 0.6 + A * 0.35 * Math.sin(q);
        pts.push(new THREE.Vector3(r * Math.sin(th), r * Math.cos(th), A * Math.cos(q)));
      }
      metal.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 1400, rs, 12, true));
    }
  } else {
    metal.push(bandGeo(rIn, prof, tFn, wFn));
  }
  if (band === 'milgrain' && style !== 'signet') {
    const beads = [], rb = Math.max(0.11, Math.min(0.17, W0 * 0.045));
    const e = 2.7;
    for (const k of [-1, 1]) {
      const N = Math.floor(TAU * (rIn + t0) / (rb * 2.25));
      for (let i = 0; i < N; i++) {
        const th = i / N * TAU;
        if (headStyle && Math.cos(th) > 0.97) continue;
        const w = wFn(th), v = 0.5 - (rb * 1.1) / w;
        const co = Math.pow(Math.min(1, 2 * v), e / 2), sn = Math.sqrt(Math.max(0, 1 - co * co));
        const u = 0.16 + 0.84 * Math.pow(sn, 2 / e);
        const r = rIn + u * tFn(th) - rb * 0.25;
        const b = new THREE.SphereGeometry(rb, 8, 6); b.translate(r * Math.sin(th), r * Math.cos(th), k * v * w);
        beads.push(b);
      }
    }
    metal.push(mergeGeometries(beads)); beads.forEach(b => b.dispose());
  }
  if (cfg.twoTone && style === 'band' && bandStonesCfg === 'none') {
    // contrasting inlay strip in the second metal, set flush into the band top
    metal.push({ geo: bandGeo(rIn + t0 * 0.5, 'flat', () => t0 * 0.53, () => W0 * 0.36, 240), alt: true });
  }

  // ---- centre stone + head
  const addHead = (shape, carat, posAngle, setting, isCentre) => {
    const [L, Wd] = stoneDims(shape, carat, gemKey);
    const st = makeStone(shape, L, Wd);
    const O = st.O;
    const lift = setting === 'bezel' ? 0.7 : (isCentre ? 0.8 : 0.45);
    const yG = headTop + lift + st.Hp * 0.92; // girdle height in ring space (when at top)
    const g = new THREE.Group();
    const parts = [];
    const pr = THREE.MathUtils.clamp(0.15 + 0.045 * Math.min(L, Wd), 0.26, 0.52);
    if (setting === 'bezel') {
      const lip = 0.55, wall = 0.55;
      parts.push(outlineSweep(O, [
        [0.985, 0, -0.25], [0.97, 0, st.Hc * 0.30], [1, wall * 0.25, st.Hc * 0.42], [1, wall, st.Hc * 0.22],
        [1, wall + 0.05, -st.G - 0.3], [0.86, wall, -st.Hp * 0.55], [0.5, wall * 0.6, -(yG - headTop) - 0.4],
        [0.38, 0, -(yG - headTop) - 0.4], [0.62, 0, -st.Hp * 0.55], [0.95, 0, -0.25],
      ]));
      void lip;
    } else {
      const angles = [];
      if (shape === 'round' || shape === 'oval') {
        const n = setting === 'prong6' ? 6 : 4, off = n === 4 ? Math.PI / 4 : 0;
        for (let i = 0; i < n; i++) angles.push(off + i / n * TAU);
      } else if (shape === 'pear') { angles.push(0, 0.62 * Math.PI, -0.62 * Math.PI, 0.86 * Math.PI, -0.86 * Math.PI); }
      else if (shape === 'marquise') { angles.push(0, Math.PI, 0.36 * Math.PI, 0.64 * Math.PI, -0.36 * Math.PI, -0.64 * Math.PI); }
      else if (shape === 'heart') { angles.push(Math.PI, 0.3 * Math.PI, -0.3 * Math.PI); }
      else { // princess / emerald: corners
        const a = Math.atan2(Wd, L) * (shape === 'emerald' || shape === 'radiant' || shape === 'asscher' ? 0.92 : 1);
        angles.push(a, Math.PI - a, Math.PI + a, -a);
      }
      const depth = yG - headTop + 0.6;
      for (const th of angles) {
        const R = O(th), c = Math.cos(th), s = Math.sin(th);
        const P = (r, y) => new THREE.Vector3(r * c, y, r * s);
        const pts = [P(R * 0.32, -depth), P(R * 0.66, -st.Hp * 0.62), P(R + pr * 0.5, -st.G * 0.5 - pr * 0.3), P(R + pr * 0.3, st.Hc * 0.22), P(R - pr * 0.3, st.Hc * 0.4)];
        parts.push(tube(pts, pr, 48));
        parts.push(ball(pr * 1.0, pts[pts.length - 1]));
      }
      // gallery rail under the stone
      const railY = -st.Hp * 0.42, rail = [];
      for (let i = 0; i < 64; i++) { const th = i / 64 * TAU, r = O(th) * 0.74; rail.push(new THREE.Vector3(r * Math.cos(th), railY, r * Math.sin(th))); }
      parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail, true), 96, pr * 0.62, 10, true));
    }
    parts.forEach(p => metal.push({ geo: p, group: g }));
    gems.push({ geo: st.geo, group: g, centre: isCentre, size: Math.min(L, Wd) });
    g.userData = { yG, posAngle, st, pr, O };
    return g;
  };

  const heads = [];
  if (gemKey && style !== 'band') {
    const shape = cfg.shape || 'round';
    const carat = +cfg.carat || 1;
    const centre = addHead(shape, carat, 0, setting, true);
    heads.push(centre);
    if (style === 'trilogy') {
      const sideShape = shape === 'pear' ? 'round' : shape;
      const sc = carat * 0.3;
      const [sL] = stoneDims(sideShape, sc, gemKey);
      const cW = Math.max(...stoneDims(shape, carat, gemKey));
      // angle along band so stones nearly touch
      const ang = ((cW / 2 + sL / 2 + 0.55) / (headTop + 1.6));
      for (const sgn of [-1, 1]) {
        const h = addHead(sideShape, sc, sgn * ang, setting === 'bezel' ? 'bezel' : 'prong4', false);
        h.userData.sideRot = sgn * ang;
        heads.push(h);
      }
    }
    if (style === 'halo') {
      const { st, yG } = centre.userData;
      const dm = THREE.MathUtils.clamp(0.16 * Math.min(st.L, st.W) + 0.25, 1.0, 1.7);
      const off = dm / 2 + 0.28;
      const { total } = evenlyAround(st.O, off, 0);
      const count = Math.max(10, Math.round(total / (dm * 1.1)));
      const { out } = evenlyAround(st.O, off, count);
      const ms = makeStone('round', dm, dm);
      const hy = -st.Hp * 0.18 - 0.05;
      const melee = [];
      out.forEach(([x, z]) => melee.push(new THREE.Matrix4().makeTranslation(x, hy, z)));
      gems.push({ geo: ms.geo, group: centre, instances: melee, size: dm });
      // halo frame: cup under the melee plus beads
      centre.userData.halo = { off, dm };
      metal.push({ geo: outlineSweep(st.O, [[1, off - dm * 0.62, hy - ms.G], [1, off + dm * 0.62, hy - ms.G], [1, off + dm * 0.56, hy - ms.Hp * 0.95], [1, off - dm * 0.2, hy - ms.Hp * 1.6], [1, off - dm * 0.56, hy - ms.Hp * 0.9]], 160), group: centre });
      const { out: beadsAt } = evenlyAround(st.O, off, count * 2);
      beadsAt.forEach(([x, z], i) => {
        if (i % 2) return;
        const th = Math.atan2(z, x), R = st.O(th);
        for (const k of [-1, 1]) { const rr = R + off + k * dm * 0.52; metal.push({ geo: ball(0.17 + dm * 0.06, new THREE.Vector3(rr * Math.cos(th), hy + ms.Hc * 0.45, rr * Math.sin(th))), group: centre }); }
      });
      // reposition halo beads to sit between stones (rotate half a pitch)
    }
  }

  // ---- pave shoulders: melee down both sides of the band, beads between stones
  if (band === 'pave' && headStyle && heads.length) {
    let clear = 0;
    for (const h of heads) {
      const { st } = h.userData; const half = Math.max(st.L, st.W) / 2 + (h.userData.halo ? h.userData.halo.off + h.userData.halo.dm : 0);
      clear = Math.max(clear, Math.abs(h.userData.posAngle || 0) + (half + 0.5) / headTop);
    }
    const dm = THREE.MathUtils.clamp(W0 * 0.5, 0.9, 1.5);
    const ms = makeStone('round', dm, dm), inst = [], beads = [];
    const pitch = (dm + 0.16) / (rIn + t0);
    const n = Math.max(4, Math.floor(1.15 / pitch));
    for (const sgn of [-1, 1]) for (let i = 0; i < n; i++) {
      const th = sgn * (clear + pitch * (i + 0.5));
      const gy = rIn + tFn(th) + 0.08 - ms.Hc * 0.35;
      inst.push(new THREE.Matrix4().makeRotationZ(-th).multiply(new THREE.Matrix4().makeTranslation(0, gy, 0)));
      const tb = th + sgn * pitch * 0.5, rr = rIn + tFn(tb) + 0.12, w = wFn(tb);
      for (const k of [-1, 1]) { const b = new THREE.SphereGeometry(0.13, 8, 6); b.translate(rr * Math.sin(tb), rr * Math.cos(tb), k * Math.min(dm * 0.5, w * 0.42)); beads.push(b); }
    }
    gems.push({ geo: ms.geo, instances: inst, size: dm, bandStones: true });
    metal.push(mergeGeometries(beads)); beads.forEach(b => b.dispose());
  }

  // ---- band stones (eternity / half eternity)
  const bandStones = style === 'band' ? bandStonesCfg : 'none';
  if (style === 'band' && bandStones !== 'none' && gemKey) {
    const dm = THREE.MathUtils.clamp(W0 * 0.62, 1.2, 3.0);
    const rTop = rIn + t0;
    const pitch = (dm + 0.18) / rTop;
    const span = bandStones === 'full' ? TAU : Math.PI * 0.9;
    const n = bandStones === 'full' ? Math.floor(TAU / pitch) : Math.floor(span / pitch);
    const realPitch = bandStones === 'full' ? TAU / n : pitch;
    const ms = makeStone('round', dm, dm);
    const inst = [];
    const start = bandStones === 'full' ? 0 : -((n - 1) * realPitch) / 2;
    const gy = rTop + 0.12 - ms.Hc * 0.35; // crown just proud of the channel walls
    for (let i = 0; i < n; i++) {
      const th = start + i * realPitch;
      inst.push(new THREE.Matrix4().makeRotationZ(-th).multiply(new THREE.Matrix4().makeTranslation(0, gy, 0)));
    }
    gems.push({ geo: ms.geo, instances: inst, size: dm, bandStones: true });
    // channel walls along both edges
    const wallR = Math.max(0.2, (W0 - dm) / 4 + 0.08);
    const a0 = bandStones === 'full' ? 0 : start - realPitch * 0.6, a1 = bandStones === 'full' ? TAU : -start + realPitch * 0.6;
    for (const k of [-1, 1]) {
      const pts = [], N = 160;
      for (let i = 0; i <= N; i++) { const th = a0 + (a1 - a0) * i / N, rr = rTop - 0.05; pts.push(new THREE.Vector3(rr * Math.sin(th), rr * Math.cos(th), k * (W0 / 2 - wallR * 0.9))); }
      const curve = new THREE.CatmullRomCurve3(pts, bandStones === 'full');
      metal.push(new THREE.TubeGeometry(curve, 320, wallR, 14, bandStones === 'full'));
    }
  }

  return { metal, gems, heads, rIn, t0, headTop, face, style, gemKey, setting, tBottom: tFn(Math.PI), W0, wFn, tFn };
}
