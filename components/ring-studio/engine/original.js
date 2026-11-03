import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { sizeDiameter } from './ring.js';

// The template's original 3D ring (public/assets/3D/ring_webgi.glb), offered as the "Signature" style.
// The GLB is Draco-compressed and authored band-in-xz (axis y, centre stone +z) in arbitrary units; we turn it into the
// engine frame (axis z, head +y, millimetres) and scale it so its inner diameter matches the chosen ring size.
// Geometry comes straight from the mesh accessors; node transforms are not applied (the GLB carries a scene-level
// rotation/scale meant for its original WebGi viewer).

let raw = null;
let pending = null;

const base = () => {
  const b = (import.meta.env && import.meta.env.BASE_URL) || '/';
  return b.endsWith('/') ? b : `${b}/`;
};

export function originalLoaded() { return !!raw; }

export function loadOriginal() {
  if (raw) return Promise.resolve(raw);
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    const draco = new DRACOLoader();
    draco.setDecoderPath(`${base()}libs/draco/gltf/`);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    loader.load(`${base()}assets/3D/ring_webgi.glb`, (gltf) => {
      const metal = [], gems = [];
      const toEngine = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        const geo = o.geometry.clone();
        for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
        geo.applyMatrix4(toEngine);
        if (!geo.attributes.normal) geo.computeVertexNormals();
        const name = `${o.name} ${(o.material && o.material.name) || ''}`.toLowerCase();
        if (name.includes('diamond')) gems.push(geo);
        else metal.push({ geo, alt: name.includes('silver') });
      });
      draco.dispose();
      if (!metal.length) { reject(new Error('original ring: no metal meshes')); return; }
      // inner radius / bottom thickness / width from the main metal
      let rInner = Infinity, rOuterBottom = 0, zMin = Infinity, zMax = -Infinity;
      const v = new THREE.Vector3();
      for (const m of metal) {
        const p = m.geo.attributes.position;
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i);
          const r = Math.hypot(v.x, v.y);
          if (v.y < 0 && r < rInner) rInner = r;
          if (v.y < 0 && Math.abs(v.x) < r * 0.2 && r > rOuterBottom) rOuterBottom = r;
          if (v.z < zMin) zMin = v.z; if (v.z > zMax) zMax = v.z;
        }
      }
      // centre stone: the diamond mesh whose bounds reach highest
      let centreIdx = -1, best = -Infinity;
      gems.forEach((g, i) => { g.computeBoundingBox(); if (g.boundingBox.max.y > best) { best = g.boundingBox.max.y; centreIdx = i; } });
      raw = { metal, gems: gems.map((geo, i) => ({ geo, centre: i === centreIdx })), rInner, rOuterBottom, width: zMax - zMin, top: best };
      resolve(raw);
    }, undefined, (e) => { pending = null; reject(e); });
  });
  return pending;
}

/** Same shape as buildRing()'s result, for cfg.style === 'original'. Requires loadOriginal() to have resolved. */
export function buildOriginal(cfg) {
  if (!raw) throw new Error('original ring not loaded');
  const rIn = sizeDiameter(cfg.size || 7) / 2;
  const s = rIn / raw.rInner;
  const scale = (g) => { const c = g.clone(); c.scale(s, s, s); c.computeBoundingBox(); c.computeBoundingSphere(); return c; };
  const metal = raw.metal.map((m) => ({ geo: scale(m.geo), alt: m.alt }));
  const gems = raw.gems.map((g) => ({ geo: scale(g.geo), centre: g.centre }));
  const t0 = Math.max(0.8, (raw.rOuterBottom - raw.rInner) * s);
  const W0 = raw.width * s;
  return {
    metal, gems, heads: [], rIn, t0, headTop: raw.top * s, face: null, style: 'original', gemKey: cfg.stone || 'diamond',
    setting: 'original', tBottom: t0, W0, wFn: () => W0, tFn: () => t0,
  };
}
