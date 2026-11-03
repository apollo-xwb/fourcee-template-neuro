import * as THREE from 'three';
import { buildRing } from './ring.js';
import { metalMaterial, gemMaterial, GEMS } from './materials.js';

// Builds the ring meshes for a config into `group`. Shared by the designer viewer and the try-on renderer
// (each WebGL context needs its own instance). Returns helpers to swap the metal and to dispose.
export const altMetalFor = cfg => cfg.metal2 || (['w18', 'w9', 'pt', 'ag'].includes(cfg.metal) ? 'y18' : 'pt');
export function populateRing(group, cfg, { gemEnv, mobile, metalMat = null, disposables = [] }) {
  const built = buildRing(cfg);
  if (!metalMat) metalMat = metalMaterial(cfg.metal, cfg.finish);
  let altMat = null;
  const gemMat = (geo, key, centre) => {
    const m = gemMaterial(geo, key, gemEnv, { bounces: centre ? (mobile ? 5 : 7) : 4, fast: mobile || !centre });
    if (!centre) m.uniforms.envIntensity.value = 1.3;
    disposables.push(m); return m;
  };
  const textTexture = (text, w, h, font, o = {}) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = font;
    if (o.letterSpacing) x.letterSpacing = o.letterSpacing;
    x.fillText(text, w / 2, h / 2 + (o.dy || 0));
    const t = new THREE.CanvasTexture(c); t.anisotropy = 8; disposables.push(t); return t;
  };
  const pivots = new Map();
  const headNode = h => {
    if (pivots.has(h)) return pivots.get(h);
    const pivot = new THREE.Group(); pivot.rotation.z = -(h.userData.posAngle || 0);
    h.position.set(0, h.userData.yG, 0); pivot.add(h); group.add(pivot); pivots.set(h, h); return h;
  };
  built.heads.forEach(headNode);
  for (const m of built.metal) {
    const geo = m.geo || m, parent = m.group ? headNode(m.group) : group;
    if (m.alt && !altMat) { altMat = metalMaterial(altMetalFor(cfg), cfg.finish); disposables.push(altMat); }
    const mesh = new THREE.Mesh(geo, m.alt ? altMat : metalMat); mesh.userData.metal = !m.alt; mesh.userData.metalAlt = !!m.alt; parent.add(mesh); disposables.push(geo);
  }
  const gemKey = built.gemKey || cfg.stone || 'diamond';
  for (const g of built.gems) {
    const parent = g.group ? headNode(g.group) : group;
    const mat = gemMat(g.geo, gemKey, g.centre);
    disposables.push(g.geo);
    if (g.instances) {
      for (const m of g.instances) { const mesh = new THREE.Mesh(g.geo, mat); mesh.applyMatrix4(m); mesh.userData.gem = true; mesh.userData.gemKey = gemKey; parent.add(mesh); }
    } else { const mesh = new THREE.Mesh(g.geo, mat); mesh.userData.gem = true; mesh.userData.gemKey = gemKey; parent.add(mesh); }
  }
  if (cfg.engraving && cfg.engraving.trim()) {
    const r = built.rIn - 0.012, w = built.W0 * 0.66, text = cfg.engraving.trim().slice(0, 30);
    const font = 'italic 500 112px "Cormorant Garamond", Georgia, serif';
    const mc = document.createElement('canvas').getContext('2d'); mc.font = font;
    const tw = Math.ceil(mc.measureText(text).width) + 60, th = 168;
    const span = Math.min(2.6, (tw / th) * w / r);
    const geo = new THREE.CylinderGeometry(r, r, w, 128, 1, true, -span / 2, span);
    geo.rotateX(Math.PI / 2);
    const tex = textTexture(text, tw, th, font, { dy: 6 });
    tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, -1);
    const mat = new THREE.MeshPhysicalMaterial({ color: metalMat.color.clone().multiplyScalar(0.28), metalness: 1, roughness: 0.75, alphaMap: tex, transparent: true, side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
    disposables.push(geo, mat);
    const mesh = new THREE.Mesh(geo, mat); mesh.userData.engrave = true; group.add(mesh);
  }
  if (built.face) {
    const { y, w, h } = built.face;
    const txt = (cfg.initials || '').toUpperCase().slice(0, 3);
    if (txt) {
      const geo = new THREE.PlaneGeometry(w * 0.82, h * 0.82); geo.rotateX(-Math.PI / 2); geo.translate(0, y + 0.004, 0);
      const tex = textTexture(txt, 1024, 1024 * h / w, `500 ${txt.length > 2 ? 300 : 380}px "Cormorant Garamond", Georgia, serif`, { letterSpacing: '20px', dy: 20 });
      const mat = new THREE.MeshPhysicalMaterial({ color: metalMat.color.clone().multiplyScalar(0.22), metalness: 1, roughness: 0.8, alphaMap: tex, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
      disposables.push(geo, mat);
      const mesh = new THREE.Mesh(geo, mat); mesh.userData.engrave = true; group.add(mesh);
    }
  }
  return { built, metalMat, disposables };
}

export function applyMetal(group, metalMat) {
  group.traverse(o => { if (o.isMesh && o.userData.metal) o.material = metalMat; if (o.userData.engrave) o.material.color.copy(metalMat.color).multiplyScalar(0.25); });
}

export function updateGemViews(root, camera) {
  root.traverse(o => { if (o.material && o.material.isGem) o.material.uniforms.viewMatrixInverse.value.copy(camera.matrixWorld); });
}

// Exportable stand-in for the ray-traced stone shader (glTF / USDZ cannot carry a custom shader).
export function exportGemMaterial(key) {
  const g = GEMS[key] || GEMS.diamond;
  const t = g.tint, clear = (key === 'diamond' || key === 'labdiamond' || key === 'moissanite');
  const c = new THREE.Color().setRGB(clear ? 0.93 : t[0] * 0.85 + 0.05, clear ? 0.95 : t[1] * 0.85 + 0.05, clear ? 0.97 : t[2] * 0.85 + 0.05, THREE.LinearSRGBColorSpace);
  return new THREE.MeshPhysicalMaterial({ color: c, metalness: clear ? 0.9 : 0.55, roughness: 0.03, ior: g.ior, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.4 });
}
