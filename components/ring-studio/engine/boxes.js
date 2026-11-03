import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Procedural ring-box concepts (mm). Each returns { group, seatY, seatZ, R (framing radius), cy (framing centre) }.
// The ring stands upright (hole axis = z) in a slit between two cushion halves.

export const BOX_STYLES = ['velvet', 'wood', 'leather', 'acrylic', 'ivory'];

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function canvasTex(w, h, draw, { srgb = true, repeat = [1, 1] } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8; return t;
}
function noiseTex(seed, amp = 40, base = 128, size = 256) {
  const r = rng(seed);
  return canvasTex(size, size, (x, w, h) => {
    const d = x.createImageData(w, h);
    for (let i = 0; i < w * h; i++) { const v = base + (r() - 0.5) * amp; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; }
    x.putImageData(d, 0, 0);
  }, { srgb: false, repeat: [3, 3] });
}
function walnutTex() {
  const r = rng(7);
  return canvasTex(1024, 512, (x, w, h) => {
    x.fillStyle = '#4a2f1d'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const y0 = r() * h, a = 2 + r() * 10, f = 0.002 + r() * 0.01, ph = r() * 6.28, lw = 0.6 + r() * 2.6;
      const dark = r() < 0.55; x.strokeStyle = dark ? `rgba(30,17,9,${0.12 + r() * 0.3})` : `rgba(140,96,60,${0.08 + r() * 0.18})`;
      x.lineWidth = lw; x.beginPath();
      for (let X = 0; X <= w; X += 8) { const Y = y0 + Math.sin(X * f + ph) * a + Math.sin(X * f * 3.1 + ph * 2) * a * 0.3; X ? x.lineTo(X, Y) : x.moveTo(X, Y); }
      x.stroke();
    }
  });
}
function leatherBump() {
  const r = rng(11);
  return canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#808080'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const v = 90 + r() * 80 | 0; x.fillStyle = `rgb(${v},${v},${v})`; const s = 1 + r() * 3.5; x.beginPath(); x.arc(r() * w, r() * h, s, 0, 6.29); x.fill(); }
  }, { srgb: false, repeat: [2, 2] });
}
function logoTex(onUpdate) {
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 1024, 1024);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8;
  const img = new Image(); img.decoding = 'async';
  img.onload = () => {
    // white = foil, black = suede (used as a mask between two materials)
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = 1024; const y = tmp.getContext('2d');
    y.drawImage(img, 212, 150, 600, 600); y.globalCompositeOperation = 'source-in'; y.fillStyle = '#fff'; y.fillRect(0, 0, 1024, 1024);
    x.drawImage(tmp, 0, 0); t.needsUpdate = true; onUpdate && onUpdate();
  };
  img.src = '/assets/logo/logo_gold.svg';
  return t;
}

const velvet = (hex, sheen) => new THREE.MeshPhysicalMaterial({ color: hex, roughness: 1, metalness: 0, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(sheen), envMapIntensity: 0.6 });

// shell = outer box material; lining = lid lining; cushion = pillow; well = base interior floor
function hingedBox({ W, D, Hb, Hl, rad, open, shell, lining, cushion, well, wall = 3, rise = 2.2, slit, extra }) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new RoundedBoxGeometry(W, Hb, D, 6, rad), shell); base.position.y = Hb / 2; g.add(base);
  // interior well (inset floor)
  const iw = W - wall * 2, id = D - wall * 2;
  const wellM = new THREE.Mesh(new RoundedBoxGeometry(iw, 1, id, 3, Math.max(0.3, rad - wall)), well); wellM.position.y = Hb + 0.02 - 0.45; wellM.scale.y = 1; g.add(wellM);
  // two cushion halves with a slit along x
  const ch = rise + 9, cz = (id - slit) / 2;
  const cg = new RoundedBoxGeometry(iw - 1.2, ch, cz, 5, Math.min(3.6, cz / 2.2));
  const c1 = new THREE.Mesh(cg, cushion); c1.position.set(0, Hb + rise - ch / 2, slit / 2 + cz / 2); g.add(c1);
  const c2 = new THREE.Mesh(cg, cushion); c2.position.set(0, Hb + rise - ch / 2, -slit / 2 - cz / 2); g.add(c2);
  // lid on a hinge at the back top edge
  const hinge = new THREE.Group(); hinge.position.set(0, Hb, -D / 2); g.add(hinge);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(W, Hl, D, 6, rad), shell); lid.position.set(0, Hl / 2, D / 2); hinge.add(lid);
  const lin = new THREE.Mesh(new RoundedBoxGeometry(iw, 0.6, id, 3, Math.max(0.3, rad - wall)), lining); lin.position.set(0, -0.2, D / 2); hinge.add(lin);
  hinge.rotation.x = -open;
  if (extra) extra(g, { hinge, iw, id, W, D, Hb, Hl });
  return { group: g, seatY: Hb + rise, seatZ: 0, hinge };
}

export function buildBox(style, { onUpdate } = {}) {
  let out;
  if (style === 'velvet') {
    const shell = velvet(0x17203a, 0x5d6d9a);
    out = hingedBox({ W: 54, D: 50, Hb: 22, Hl: 15, rad: 7.5, open: 1.78, shell, lining: new THREE.MeshPhysicalMaterial({ color: 0xf1ebdf, roughness: 0.32, sheen: 0.8, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.3 }), cushion: velvet(0x1a2442, 0x6a7aa8), well: velvet(0x141b31, 0x4a5880), slit: 2.2 });
  } else if (style === 'wood') {
    const map = walnutTex();
    const shell = new THREE.MeshPhysicalMaterial({ map, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.3, envMapIntensity: 0.9 });
    const linen = new THREE.MeshPhysicalMaterial({ color: 0xe6ddcf, roughness: 0.95, sheen: 0.5, sheenColor: new THREE.Color(0xfff6e8), bumpMap: noiseTex(3, 60), bumpScale: 0.25 });
    out = hingedBox({ W: 58, D: 56, Hb: 25, Hl: 13, rad: 1.4, open: 1.70, shell, lining: linen, cushion: linen, well: linen, slit: 2.2, wall: 4 });
  } else if (style === 'leather') {
    const bump = leatherBump();
    const shell = new THREE.MeshPhysicalMaterial({ color: 0x7c4322, roughness: 0.58, bumpMap: bump, bumpScale: 0.35, clearcoat: 0.25, clearcoatRoughness: 0.5, sheen: 0.3, sheenColor: new THREE.Color(0xc98a5a) });
    const suede = velvet(0x1c1915, 0x5b544b);
    out = hingedBox({ W: 56, D: 54, Hb: 24, Hl: 15, rad: 3.6, open: 1.74, shell, lining: suede, cushion: suede, well: suede, slit: 2.2,
      extra: (g, { W, D, Hb }) => {
        // saddle stitching around the base, 3 mm under the rim
        const parts = [], step = 2.1, y = Hb - 3.2, m = 0.25;
        const edge = (x0, z0, x1, z1, nx, nz) => {
          const L = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(L / step);
          for (let i = 0; i < n; i++) {
            const t = (i + 0.5) / n, s = new THREE.BoxGeometry(1.15, 0.38, 0.38);
            s.rotateY(Math.atan2(-(z1 - z0), x1 - x0)); s.translate(x0 + (x1 - x0) * t + nx * m, y, z0 + (z1 - z0) * t + nz * m); parts.push(s);
          }
        };
        const a = W / 2 - 4, b = D / 2 - 4;
        edge(-a, D / 2, a, D / 2, 0, 1); edge(-a, -D / 2, a, -D / 2, 0, -1); edge(W / 2, -b, W / 2, b, 1, 0); edge(-W / 2, -b, -W / 2, b, -1, 0);
        const st = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ color: 0xe9dcc4, roughness: 0.8 })); g.add(st);
      } });
  } else if (style === 'acrylic') {
    const g = new THREE.Group();
    const plinth = new THREE.Mesh(new RoundedBoxGeometry(46, 6, 46, 4, 1.2), new THREE.MeshPhysicalMaterial({ color: 0x15130f, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.2 }));
    plinth.position.y = 3; g.add(plinth);
    const acr = new THREE.MeshPhysicalMaterial({ color: 0xf2f6f5, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.2, clearcoat: 1, clearcoatRoughness: 0.02, specularIntensity: 1, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide });
    const block = new THREE.Mesh(new RoundedBoxGeometry(36, 20, 36, 6, 2.2), acr);
    block.position.y = 6 + 10; block.renderOrder = 2; g.add(block);
    // the slot the band stands in, read as a fine dark line on the top face
    const slot = new THREE.Mesh(new THREE.BoxGeometry(22, 0.2, 0.9), new THREE.MeshBasicMaterial({ color: 0x2a2620, transparent: true, opacity: 0.32, depthWrite: false }));
    slot.position.y = 26.05; slot.renderOrder = 3; g.add(slot);
    out = { group: g, seatY: 23.5, seatZ: 0 };
  } else { // ivory
    const ivory = new THREE.MeshPhysicalMaterial({ color: 0xeee6d8, roughness: 0.62, sheen: 0.4, sheenColor: new THREE.Color(0xffffff), bumpMap: noiseTex(5, 70), bumpScale: 0.18, clearcoat: 0.1 });
    const black = velvet(0x14120f, 0x4d463d);
    const gold = new THREE.MeshPhysicalMaterial({ color: new THREE.Color().setRGB(0.92, 0.70, 0.36, THREE.LinearSRGBColorSpace), metalness: 1, roughness: 0.22 });
    out = hingedBox({ W: 60, D: 58, Hb: 26, Hl: 15, rad: 2.6, open: 1.72, shell: ivory, lining: black, cushion: black, well: black, slit: 2.2, wall: 3.4,
      extra: (g, { hinge, iw, id, W, D, Hb }) => {
        // gold pinline round the base, foil mark inside the lid
        const pin = new THREE.Mesh(new RoundedBoxGeometry(W + 0.24, 0.5, D + 0.24, 2, 2.7), gold); pin.position.y = Hb - 2.4; g.add(pin);
        // (Fourcee: no third-party foil mark inside the lid)
        void id; void hinge; void iw; void logoTex; void onUpdate;
      } });
  }
  const b = new THREE.Box3().setFromObject(out.group);
  const s = new THREE.Vector3(); b.getSize(s); const c = new THREE.Vector3(); b.getCenter(c);
  out.size = s; out.center = c; out.R = s.length() / 2;
  out.dispose = () => out.group.traverse(o => { if (o.isMesh) { o.geometry.dispose(); const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); }); } });
  return out;
}
