import * as THREE from 'three';
import { MeshBVH, MeshBVHUniformStruct, shaderStructs, shaderIntersectFunction } from 'three-mesh-bvh';

// Metal colours: linear-space F0 approximations for jewellery alloys.
export const METALS = {
  y18: { c: [0.98, 0.70, 0.30], r: 0.11 },
  y9: { c: [0.93, 0.74, 0.44], r: 0.12 },
  w18: { c: [0.80, 0.79, 0.76], r: 0.09 },   // rhodium-plated white gold
  w9: { c: [0.80, 0.78, 0.74], r: 0.10 },
  r18: { c: [0.97, 0.62, 0.48], r: 0.11 },
  r9: { c: [0.95, 0.56, 0.42], r: 0.12 },
  pt: { c: [0.68, 0.66, 0.62], r: 0.10 },
  ag: { c: [0.97, 0.96, 0.92], r: 0.10 },
};
export function metalMaterial(key, finish) {
  const m = METALS[key] || METALS.y18;
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color().setRGB(...m.c, THREE.LinearSRGBColorSpace),
    metalness: 1, roughness: finish === 'satin' ? 0.34 : finish === 'brushed' ? 0.27 : finish === 'matte' ? 0.46 : m.r,
    clearcoat: 0, envMapIntensity: 1,
  });
}

export const GEMS = {
  diamond: { ior: 2.42, ab: 0.016, tint: [1, 1, 1], dens: 0, f0: 0.172 },
  labdiamond: { ior: 2.42, ab: 0.016, tint: [1, 1, 1], dens: 0, f0: 0.172 },
  moissanite: { ior: 2.65, ab: 0.034, tint: [1, 0.995, 0.975], dens: 0.6, f0: 0.205 },
  sapphire: { ior: 1.77, ab: 0.008, tint: [0.10, 0.26, 0.92], dens: 0.42, f0: 0.077 },
  ruby: { ior: 1.77, ab: 0.008, tint: [0.92, 0.05, 0.16], dens: 0.40, f0: 0.077 },
  emerald: { ior: 1.58, ab: 0.006, tint: [0.12, 0.72, 0.36], dens: 0.38, f0: 0.05 },
};

const vert = /* glsl */`
uniform mat4 viewMatrixInverse;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying mat4 vModelMatrixInverse;
void main(){
  vModelMatrixInverse = inverse(modelMatrix);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPosition = wp.xyz;
  vNormal = normalize((viewMatrixInverse * vec4(normalMatrix * normal, 0.0)).xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const frag = /* glsl */`
precision highp isampler2D;
precision highp usampler2D;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying mat4 vModelMatrixInverse;
uniform samplerCube envMap;
uniform float bounces;
uniform float ior;
uniform float aberration;
uniform vec3 tint;
uniform float density;
uniform float f0;
uniform float envIntensity;
uniform mat4 modelMatrix;
${shaderStructs}
${shaderIntersectFunction}
uniform BVH bvh;

vec4 traceGem(vec3 rd, vec3 n, float eta){
  vec3 dir = refract(rd, n, 1.0 / eta);
  vec3 ro = (vModelMatrixInverse * vec4(vWorldPosition, 1.0)).xyz;
  dir = normalize((vModelMatrixInverse * vec4(dir, 0.0)).xyz);
  ro += dir * 0.002;
  float len = 0.0;
  for (int i = 0; i < MAX_BOUNCES; i++) {
    if (float(i) >= bounces) break;
    uvec4 fi = uvec4(0u); vec3 fn = vec3(0.0, 0.0, 1.0); vec3 bc = vec3(0.0); float side = 1.0; float dist = 0.0;
    bool hit = bvhIntersectFirstHit(bvh, ro, dir, fi, fn, bc, side, dist);
    if (!hit) break;
    len += dist;
    vec3 hp = ro + dir * dist;
    vec3 t = refract(dir, fn, eta);
    if (dot(t, t) > 0.0) { dir = t; break; }
    dir = reflect(dir, fn);
    ro = hp + dir * 0.002;
  }
  return vec4(normalize((modelMatrix * vec4(dir, 0.0)).xyz), len);
}
vec3 env(vec3 d){ return textureLod(envMap, d, 0.0).rgb; }

void main(){
  vec3 rd = normalize(vWorldPosition - cameraPosition);
  vec3 n = normalize(vNormal);
  if (dot(n, rd) > 0.0) n = -n;
  float cosi = clamp(dot(-rd, n), 0.0, 1.0);
  float F = f0 + (1.0 - f0) * pow(1.0 - cosi, 5.0);
  vec3 refl = env(reflect(rd, n));
  vec3 col;
  float len;
  #ifdef FAST_CHROMA
    vec4 g = traceGem(rd, n, ior);
    len = g.w;
    vec3 dR = normalize(g.xyz * (1.0 + aberration * 0.0) + vec3(aberration * 1.2, 0.0, 0.0));
    vec3 dB = normalize(g.xyz - vec3(aberration * 1.2, 0.0, 0.0));
    col = vec3(env(dR).r, env(g.xyz).g, env(dB).b);
  #else
    vec4 r = traceGem(rd, n, ior * (1.0 - aberration));
    vec4 g = traceGem(rd, n, ior);
    vec4 b = traceGem(rd, n, ior * (1.0 + aberration));
    len = g.w;
    col = vec3(env(r.xyz).r, env(g.xyz).g, env(b.xyz).b);
  #endif
  col *= pow(max(tint, vec3(1e-4)), vec3(len * density));
  vec3 c = mix(col, refl, F) * envIntensity;
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const bvhCache = new WeakMap();
export function gemMaterial(geo, gemKey, envMap, { bounces = 5, fast = false } = {}) {
  const gm = GEMS[gemKey] || GEMS.diamond;
  let bvh = bvhCache.get(geo);
  if (!bvh) { bvh = new MeshBVH(geo); bvhCache.set(geo, bvh); }
  const struct = new MeshBVHUniformStruct();
  struct.updateFrom(bvh);
  const mat = new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag,
    defines: { MAX_BOUNCES: 8, ...(fast ? { FAST_CHROMA: '' } : {}) },
    uniforms: {
      envMap: { value: envMap }, bvh: { value: struct }, bounces: { value: bounces },
      ior: { value: gm.ior }, aberration: { value: gm.ab }, tint: { value: new THREE.Vector3(...gm.tint) },
      density: { value: gm.dens }, f0: { value: gm.f0 }, envIntensity: { value: 1 },
      viewMatrixInverse: { value: new THREE.Matrix4() },
    },
  });
  mat.isGem = true;
  return mat;
}
