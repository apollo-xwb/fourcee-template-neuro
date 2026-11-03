import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader.js';
import { metalMaterial } from './materials.js';
import { populateRing, applyMetal, updateGemViews } from './ringobj.js';
import { buildBox } from './boxes.js';

const TAU = Math.PI * 2;

// ---------- procedural studio (lightformers) ----------
export function studio(kind) {
  const s = new THREE.Scene();
  const gem = kind === 'gem';
  const col = (r, g, b) => new THREE.Vector3(r, g, b);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 64, 32), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      top: { value: gem ? col(.05, .05, .05) : col(.78, .77, .75) },
      hor: { value: gem ? col(.09, .085, .08) : col(.36, .35, .33) },
      bot: { value: gem ? col(.42, .38, .32) : col(.80, .73, .62) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top,hor,bot; varying vec3 vP; void main(){ float y=vP.y; vec3 c = y>0. ? mix(hor,top,pow(y,.7)) : mix(hor,bot,pow(-y,.45)); gl_FragColor=vec4(c,1.); }',
  }));
  s.add(sky);
  const lf = (w, h, I, p, color = [1, .985, .96], round = false) => {
    const geo = round ? new THREE.CircleGeometry(w / 2, 48) : new THREE.PlaneGeometry(w, h);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color[0] * I, color[1] * I, color[2] * I), side: THREE.DoubleSide, toneMapped: false }));
    m.position.copy(p); m.lookAt(0, 0, 0); s.add(m);
  };
  const P = (r, az, y) => new THREE.Vector3(r * Math.sin(az), y, r * Math.cos(az));
  if (!gem) {
    lf(26, 14, 3.2, new THREE.Vector3(0, 22, 0));                  // overhead softbox
    [20, 110, 200, 290].forEach((a, i) => lf(3.2, 26, i % 2 ? 4.2 : 6, P(20, a * Math.PI / 180, 3)));  // strip boxes
    [65, 245].forEach(a => lf(6, 18, 0.06, P(17, a * Math.PI / 180, 6), [1, 1, 1])); // dark flags for contrast
    lf(26, 5, 1.6, P(22, 0, 1.5), [1, .96, .9]);                     // low front fill (warm)
    lf(8, 8, 2.4, P(18, 2.6, 12), [1, .97, .92], true);               // round key
  } else {
    // ring of softboxes high up, dark zenith (the 'viewer' shadow that gives a diamond its contrast)
    for (let i = 0; i < 8; i++) lf(5, 9, i % 2 ? 7 : 11, P(15, i / 8 * TAU + 0.2, 15));
    for (let i = 0; i < 6; i++) lf(1.8, 22, i % 2 ? 6 : 10, P(19, i / 6 * TAU + 0.45, 3));
    for (let i = 0; i < 18; i++) lf(1.1, 1.1, 22, P(17, i / 18 * TAU, 9 + (i % 3) * 3), [1, .99, .97]);
    lf(4, 4, 6, new THREE.Vector3(0, 24, 0), [1, 1, 1], true);
    lf(26, 4, 1.4, P(20, 0, 1), [1, .95, .86]);
  }
  return s;
}

// ---------- contact shadow (depth from below, blurred) ----------
export class ContactShadow {
  constructor(size, res, far, blur, opacity, color) {
    this.size = size; this.blur = blur; this.far = far;
    const opt = { type: THREE.HalfFloatType };
    this.rt = new THREE.WebGLRenderTarget(res, res, opt); this.rt.texture.generateMipmaps = false;
    this.rtB = new THREE.WebGLRenderTarget(res, res, opt); this.rtB.texture.generateMipmaps = false;
    const g = new THREE.PlaneGeometry(size, size);
    this.mat = new THREE.MeshBasicMaterial({ map: this.rt.texture, transparent: true, opacity, depthWrite: false, toneMapped: false });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.rotation.x = -Math.PI / 2; this.mesh.scale.y = -1; this.mesh.renderOrder = -1;
    this.mesh.position.y = 0;
    this.cam = new THREE.OrthographicCamera(-size / 2, size / 2, size / 2, -size / 2, 0, far);
    this.cam.rotation.x = Math.PI / 2;
    this.depth = new THREE.MeshDepthMaterial();
    this.depth.depthTest = this.depth.depthWrite = false;
    const c = new THREE.Color(color);
    this.depth.onBeforeCompile = sh => {
      sh.uniforms.ucolor = { value: c };
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform vec3 ucolor;\nvoid main() {')
        .replace('vec4( vec3( 1.0 - fragCoordZ ), opacity );', 'vec4( ucolor, pow( 1.0 - fragCoordZ, 1.6 ) );');
    };
    this.hb = new THREE.ShaderMaterial(HorizontalBlurShader); this.vb = new THREE.ShaderMaterial(VerticalBlurShader);
    this.hb.depthTest = this.vb.depthTest = false;
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.hb);
    this.qcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  render(renderer, scene, parent) {
    const prevTarget = renderer.getRenderTarget(), prevBg = scene.background, prevTM = renderer.toneMapping;
    const prevClear = renderer.getClearAlpha(); const cc = new THREE.Color(); renderer.getClearColor(cc);
    parent.updateMatrixWorld(true);
    this.cam.position.set(0, 0, 0); this.cam.updateMatrixWorld();
    const wm = new THREE.Matrix4().copy(parent.matrixWorld);
    this.cam.matrixWorld.multiplyMatrices(wm, this.cam.matrix); this.cam.matrixWorldInverse.copy(this.cam.matrixWorld).invert();
    this.mesh.visible = false;
    scene.background = null; scene.overrideMaterial = this.depth;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(this.rt); renderer.clear(); renderer.render(scene, this.cam);
    scene.overrideMaterial = null;
    const pass = (amt) => {
      this.quad.material = this.hb; this.hb.uniforms.tDiffuse.value = this.rt.texture; this.hb.uniforms.h.value = amt / 256;
      renderer.setRenderTarget(this.rtB); renderer.clear(); renderer.render(this.quad, this.qcam);
      this.quad.material = this.vb; this.vb.uniforms.tDiffuse.value = this.rtB.texture; this.vb.uniforms.v.value = amt / 256;
      renderer.setRenderTarget(this.rt); renderer.clear(); renderer.render(this.quad, this.qcam);
    };
    pass(this.blur); pass(this.blur * 0.5);
    this.mesh.visible = true;
    scene.background = prevBg; renderer.toneMapping = prevTM;
    renderer.setRenderTarget(prevTarget); renderer.setClearColor(cc, prevClear);
  }
}

// ---------- viewer ----------
export function createViewer(canvas, opts = {}) {
  const mobile = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 600;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  if (!renderer.capabilities.isWebGL2) throw new Error('webgl2');
  const maxDpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2);
  let dpr = maxDpr;
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = opts.exposure || 1.0;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const metalEnv = pmrem.fromScene(studio('metal'), 0.035, 0.1, 100).texture;
  scene.environment = metalEnv;
  const cubeRT = new THREE.WebGLCubeRenderTarget(mobile ? 256 : 512, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const cubeCam = new THREE.CubeCamera(0.1, 100, cubeRT);
  cubeCam.update(renderer, studio('gem'));
  const gemEnv = cubeRT.texture;

  const camera = new THREE.PerspectiveCamera(26, 1, 1, 1000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
  controls.minDistance = 20; controls.maxDistance = 150; controls.maxPolarAngle = Math.PI * 0.49; controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.8;
  // Never trap page scroll: vertical swipes scroll the page on touch, wheel scrolls the page unless pinch (ctrlKey).
  canvas.style.touchAction = 'pan-y';
  const wheelGuard = e => { if (!e.ctrlKey) e.stopImmediatePropagation(); };
  canvas.addEventListener('wheel', wheelGuard, { capture: true });

  const turntable = new THREE.Group(); scene.add(turntable);
  const ringGroup = new THREE.Group(); turntable.add(ringGroup);
  const shadowA = new ContactShadow(40, 512, 5, 0.9, 1.0, 0x1e150c);
  const shadowB = new ContactShadow(64, 256, 26, 3.2, 0.55, 0x2e2216);
  turntable.add(shadowA.mesh, shadowB.mesh);

  let cfg = null, metalMat = null, built = null, engraveMesh = null, faceMesh = null;
  const disposables = [];
  let autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let needsShadow = true, dirty = true;

  function clearRing() {
    ringGroup.clear(); disposables.forEach(d => d.dispose()); disposables.length = 0;
    engraveMesh = faceMesh = null;
  }

  function setMetal() {
    if (metalMat) metalMat.dispose();
    metalMat = metalMaterial(cfg.metal, cfg.finish);
    applyMetal(ringGroup, metalMat);
  }

  function rebuild() {
    clearRing();
    const r = populateRing(ringGroup, cfg, { gemEnv, mobile, metalMat, disposables });
    built = r.built; metalMat = r.metalMat;
    seatRing();
    needsShadow = true; dirty = true;
  }

  // ---------- ring box concepts ----------
  let box = null, boxStyle = null;
  const shadowBox = new ContactShadow(150, 512, 40, 2.6, 0.75, 0x2a2016);
  const shadowBoxNear = new ContactShadow(96, 512, 3, 1.1, 0.85, 0x1e150c);
  shadowBox.mesh.visible = shadowBoxNear.mesh.visible = false;
  turntable.add(shadowBox.mesh, shadowBoxNear.mesh);
  function seatRing() {
    if (!built) return;
    if (box) {
      const rOut = built.rIn + built.tBottom;
      ringGroup.position.set(0, box.seatY + rOut * 0.3, box.seatZ);
    } else ringGroup.position.set(0, built.rIn + built.tBottom + 0.04, 0);
  }
  function setBox(style) {
    style = style || null;
    if (style === boxStyle) return;
    if (box) { turntable.remove(box.group); box.dispose(); box = null; }
    boxStyle = style;
    if (style) { box = buildBox(style, { onUpdate: () => { dirty = true; kick(); } }); turntable.add(box.group); }
    const on = !!box;
    shadowA.mesh.visible = shadowB.mesh.visible = !on;
    shadowBox.mesh.visible = shadowBoxNear.mesh.visible = on;
    controls.maxDistance = on ? 420 : 150;
    seatRing(); needsShadow = true; dirty = true;
    frame('hero', false); kick();
  }

  function setConfig(next) {
    const prev = cfg; cfg = { ...next };
    if (prev && (prev.metal !== cfg.metal || prev.finish !== cfg.finish) && cfg.twoTone) { if (metalMat) metalMat.dispose(); metalMat = null; }
    const geomKeys = ['style', 'stone', 'shape', 'carat', 'setting', 'profile', 'band', 'width', 'bandStones', 'size', 'face', 'engraving', 'initials', 'twoTone', 'metal2'];
    if (!prev || geomKeys.some(k => prev[k] !== cfg[k]) || (cfg.twoTone && (prev.metal !== cfg.metal || prev.finish !== cfg.finish))) rebuild();
    else if (prev.metal !== cfg.metal || prev.finish !== cfg.finish) { setMetal(); dirty = true; }
    if (!prev) frame('hero', true);
  }

  // ---------- camera views ----------
  let tween = null;
  const views = {
    hero: { az: 0.62, pol: 1.18, dist: 0.9, tgt: 0.54 },
    close: { az: 0.35, pol: 0.9, dist: 0.36, tgt: 'stone' },
    side: { az: Math.PI / 2, pol: 1.45, dist: 0.95, tgt: 0.55 },
    inside: { az: 0.18, pol: 0.42, dist: 0.62, tgt: 'inside' },
    box: { az: 0.5, pol: 1.12, dist: 0.9, tgt: 'box' },
  };
  function boxBounds() {
    const top = built ? ringGroup.position.y + (built.heads[0] ? built.heads[0].userData.yG + 2 : built.headTop) : 0;
    const lo = box.center.y - box.size.y / 2, hi = Math.max(box.center.y + box.size.y / 2, top);
    const c = new THREE.Vector3(box.center.x, (lo + hi) / 2, box.center.z);
    return { c, R: Math.hypot(box.size.x, hi - lo, box.size.z) / 2 };
  }
  function viewTarget(v) {
    const H = built ? ringGroup.position.y - 0.04 : 12;
    if (box && v.tgt === 'box') { const u = boxBounds(); return new THREE.Vector3(0, u.c.y * 0.92, box.center.z * 0.5); }
    if (v.tgt === 'stone') { const h = built && built.heads[0]; return new THREE.Vector3(0, H + (h ? h.userData.yG : built.headTop), 0); }
    if (v.tgt === 'inside') return new THREE.Vector3(0, H - built.rIn * 0.9, 0);
    const top = H + (built && built.heads[0] ? built.heads[0].userData.yG + 2 : built ? built.headTop : 12);
    return new THREE.Vector3(0, top * v.tgt, 0);
  }
  function frame(name, instant) {
    const v = box && name === 'hero' ? views.box : (views[name] || views.hero);
    const R = box && v === views.box ? boxBounds().R * 0.8 : built ? built.rIn + built.tBottom + 4 : 14;
    const fit = R * 2.2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (camera.aspect < 1.1 ? 1.3 / Math.max(camera.aspect, 0.6) : 1) * 0.55;
    const dist = Math.max(controls.minDistance, fit * v.dist);
    const tgt = viewTarget(v);
    const pos = new THREE.Vector3().setFromSphericalCoords(dist, v.pol, v.az).add(tgt);
    if (instant) { camera.position.copy(pos); controls.target.copy(tgt); controls.update(); dirty = true; return; }
    if (name !== 'hero') { autoRotate = false; opts.onAutoRotate && opts.onAutoRotate(false); }
    if (name === 'inside' || name === 'close') { turntable.rotation.y = 0; }
    tween = { t0: performance.now(), dur: 950, p0: camera.position.clone(), t0v: controls.target.clone(), p1: pos, t1: tgt };
  }

  // ---------- loop ----------
  let w = 0, h = 0;
  function resize() {
    const r = canvas.getBoundingClientRect();
    if (r.width === w && r.height === h) return;
    w = r.width; h = r.height;
    renderer.setSize(w, h, false); camera.aspect = w / Math.max(h, 1); camera.updateProjectionMatrix(); dirty = true;
  }
  const ro = new ResizeObserver(() => { resize(); dirty = true; }); ro.observe(canvas);
  let interacting = false, lastInteract = 0;
  controls.addEventListener('start', () => { interacting = true; tween = null; });
  controls.addEventListener('end', () => { interacting = false; lastInteract = performance.now(); });
  controls.addEventListener('change', () => { dirty = true; });

  let visible = true, raf = 0, last = performance.now(), ft = [], frames = 0;
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }, { threshold: 0 });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }

  function loop(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    resize();
    if (tween) {
      const k = Math.min(1, (now - tween.t0) / tween.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0v, tween.t1, e);
      if (k >= 1) tween = null; dirty = true;
    }
    if (autoRotate && !interacting && now - lastInteract > 2500 && !tween) { turntable.rotation.y += dt * 0.32; dirty = true; }
    const moving = controls.update() || dirty;
    if (moving) {
      if (needsShadow) {
        const ry = turntable.rotation.y; turntable.rotation.y = 0;
        if (box) { shadowBox.render(renderer, scene, turntable); shadowBoxNear.render(renderer, scene, turntable); }
        else { shadowA.render(renderer, scene, turntable); shadowB.render(renderer, scene, turntable); }
        turntable.rotation.y = ry; needsShadow = false;
      }
      updateGemViews(scene, camera);
      const t0 = performance.now();
      renderer.render(scene, camera);
      frames++;
      if (frames === 2 && opts.onReady) opts.onReady();
      // adaptive resolution
      ft.push(dt * 1000); if (ft.length > 40) ft.shift();
      if (ft.length === 40 && frames % 20 === 0) {
        const avg = ft.reduce((a, b) => a + b, 0) / ft.length;
        if (avg > 26 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); w = 0; ft = []; }
        else if (avg < 14 && dpr < maxDpr) { dpr = Math.min(maxDpr, dpr + 0.25); renderer.setPixelRatio(dpr); w = 0; ft = []; }
      }
      void t0;
      dirty = false;
    }
    if (autoRotate || tween || interacting || moving) raf = requestAnimationFrame(loop);
  }

  function setAutoRotate(b) { autoRotate = b; kick(); }
  function snapshot(caption = [], logo) {
    // render a dedicated 1100x820 hero frame (front-facing, fixed angle), compose on linen, then restore the live view
    const W = 1200, H = 1000, SW = 1100, SH = 820;
    const keep = { rot: turntable.rotation.y, pos: camera.position.clone(), tgt: controls.target.clone(), dpr: renderer.getPixelRatio(), tw: tween };
    tween = null; turntable.rotation.y = 0;
    const hadBox = boxStyle; if (hadBox) { box.group.visible = false; const b0 = box; box = null; seatRing(); box = b0; shadowA.mesh.visible = shadowB.mesh.visible = true; shadowBox.mesh.visible = shadowBoxNear.mesh.visible = false; shadowA.render(renderer, scene, turntable); shadowB.render(renderer, scene, turntable); }
    const keepBox = box; if (hadBox) box = null;
    renderer.setPixelRatio(1); renderer.setSize(SW, SH, false); camera.aspect = SW / SH; camera.updateProjectionMatrix();
    frame('hero', true);
    scene.traverse(o => { if (o.material && o.material.isGem) o.material.uniforms.viewMatrixInverse.value.copy(camera.matrixWorld); });
    renderer.render(scene, camera);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = '#F3EEE6'; x.fillRect(0, 0, W, H);
    x.drawImage(canvas, (W - SW) / 2, 10, SW, SH);
    x.fillStyle = '#8F6B39'; x.fillRect(60, H - 128, 48, 2);
    x.fillStyle = '#1F1B16'; x.font = '500 30px Jost, system-ui, sans-serif'; x.textBaseline = 'alphabetic';
    x.fillText(caption[0] || '', 60, H - 82);
    x.fillStyle = '#6B6258'; x.font = '400 21px Jost, system-ui, sans-serif';
    x.fillText(caption[1] || '', 60, H - 48, W - 340);
    if (logo && logo.complete && logo.naturalWidth) { const lw = 200, lh = lw * logo.naturalHeight / logo.naturalWidth; x.drawImage(logo, W - 60 - lw, H - 60 - lh, lw, lh); }
    const url = c.toDataURL('image/png');
    renderer.setPixelRatio(keep.dpr); renderer.setSize(w, h, false); camera.aspect = w / Math.max(h, 1); camera.updateProjectionMatrix();
    if (hadBox) { box = keepBox; box.group.visible = true; seatRing(); shadowA.mesh.visible = shadowB.mesh.visible = false; shadowBox.mesh.visible = shadowBoxNear.mesh.visible = true; needsShadow = true; }
    camera.position.copy(keep.pos); controls.target.copy(keep.tgt); controls.update(); turntable.rotation.y = keep.rot; tween = keep.tw; dirty = true; kick();
    return url;
  }
  function dispose() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); canvas.removeEventListener('wheel', wheelGuard, { capture: true }); controls.dispose(); clearRing(); renderer.dispose(); }
  function zoom(f) {
    tween = null; autoRotate = false; opts.onAutoRotate && opts.onAutoRotate(false);
    const off = camera.position.clone().sub(controls.target);
    const d = THREE.MathUtils.clamp(off.length() * f, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(off.setLength(d)); controls.update(); dirty = true; kick();
  }

  // exportable copy of what is on the stage (ring, plus the box if one is shown), in metres for AR
  function exportObject() {
    const root = new THREE.Group(); root.name = 'Ring';
    const holder = new THREE.Group(); holder.scale.setScalar(0.001); root.add(holder);
    const rg = ringGroup.clone(true); rg.position.copy(ringGroup.position); holder.add(rg);
    if (box) holder.add(box.group.clone(true));
    return { root, ringGroup: rg, hasBox: !!box };
  }

  kick();
  return { setConfig, frame, zoom, setAutoRotate, snapshot, dispose, setBox, exportObject, get box() { return boxStyle; }, get autoRotate() { return autoRotate; }, renderer, scene, camera, kick: () => { dirty = true; kick(); }, info: () => ({ dpr, mobile }) };
}
