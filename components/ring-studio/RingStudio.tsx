import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { assetUrl } from '../../lib/asset-url';

/**
 * Ring studio: procedural three.js engine (ray-traced stones, PMREM studio metals) ported from the
 * Eternity Goldsmiths builder, extended with more cuts, styles, bands and men's rings. The template's original
 * WebGi ring (assets/3D/ring_webgi.glb) is kept as the "Signature" style. The last step hands the design to the
 * store (call / website / copy) using only fields from content.json; there is no lead endpoint in static deploys.
 * The engine chunk loads only once this component mounts; the poster stays until the first real frame.
 */

type Gender = 'women' | 'men';
interface StudioCfg {
  gender: Gender;
  style: string;
  shape: string;
  carat: number;
  stone: string;
  band: string;
  profile: string;
  width: number;
  metal: string;
  finish: string;
  size: string;
  twoTone: boolean;
  face: string;
  initials: string;
  box: string;
}
type Viewer = {
  setConfig: (c: Record<string, unknown>) => void;
  frame: (name: string, instant?: boolean) => void;
  zoom: (f: number) => void;
  setAutoRotate: (b: boolean) => void;
  setBox: (s: string | null) => void;
  dispose: () => void;
  readonly autoRotate: boolean;
};

const WOMEN_STYLES = [
  ['original', 'Signature'], ['solitaire', 'Solitaire'], ['halo', 'Halo'], ['trilogy', 'Three-stone'], ['pave', 'Pavé'],
  ['cathedral', 'Cathedral'], ['bezel', 'Bezel'], ['eternity', 'Eternity band'],
] as const;
const MEN_STYLES = [['band', 'Classic band'], ['signet', 'Signet'], ['eternity', 'Diamond band']] as const;
const CUTS = [
  ['round', 'Round'], ['oval', 'Oval'], ['princess', 'Princess'], ['emerald', 'Emerald'], ['cushion', 'Cushion'],
  ['pear', 'Pear'], ['marquise', 'Marquise'], ['radiant', 'Radiant'], ['asscher', 'Asscher'], ['heart', 'Heart'],
] as const;
const CARATS = [0.5, 0.75, 1, 1.5, 2, 3];
const GEMS = [
  ['diamond', 'Natural diamond', '#f4f6f8'], ['labdiamond', 'Lab diamond', '#eef3f8'], ['moissanite', 'Moissanite', '#f6f3ea'],
  ['sapphire', 'Sapphire', '#2747c9'], ['ruby', 'Ruby', '#b3123a'], ['emerald', 'Emerald', '#1f8f55'],
] as const;
const WOMEN_BANDS = [
  ['plain', 'Plain'], ['knife', 'Knife-edge'], ['twisted', 'Twisted'], ['split', 'Split shank'], ['pave', 'Pavé'], ['milgrain', 'Milgrain'],
] as const;
const MEN_PROFILES = [['court', 'Comfort fit'], ['bevel', 'Bevelled'], ['flat', 'Flat'], ['stepped', 'Stepped'], ['d', 'D-shape']] as const;
const METALS = [
  ['y18', 'Yellow gold', '#e3b766'], ['w18', 'White gold', '#d9d8d3'], ['r18', 'Rose gold', '#e5a088'], ['pt', 'Platinum', '#c9c6bf'],
] as const;
const FINISHES = [['polished', 'Polished'], ['brushed', 'Brushed'], ['matte', 'Matte']] as const;
const BOXES = [['', 'No box'], ['velvet', 'Velvet'], ['wood', 'Walnut'], ['leather', 'Leather'], ['acrylic', 'Acrylic'], ['ivory', 'Ivory']] as const;
const SIZES: string[] = [];
for (let s = 3; s <= 15; s += 0.5) SIZES.push(String(s));


const label = (list: readonly (readonly string[])[], id: string) => list.find((x) => x[0] === id)?.[1] ?? id;

const WOMEN_DEFAULT = (metal: string, stone: string): StudioCfg => ({
  gender: 'women', style: 'original', shape: 'round', carat: 1, stone, band: 'plain', profile: 'court', width: 2.2,
  metal, finish: 'polished', size: '6', twoTone: false, face: 'oval', initials: '', box: '',
});
const MEN_DEFAULT = (metal: string, stone: string): StudioCfg => ({
  gender: 'men', style: 'band', shape: 'round', carat: 1, stone, band: 'plain', profile: 'court', width: 6,
  metal, finish: 'brushed', size: '10', twoTone: false, face: 'oval', initials: '', box: '',
});

/** Engine config from UI state. */
function toEngine(c: StudioCfg): Record<string, unknown> {
  const men = c.gender === 'men';
  return {
    style: c.style,
    shape: c.shape,
    carat: c.carat,
    stone: c.stone,
    band: men ? 'plain' : c.band,
    profile: men ? c.profile : 'court',
    width: c.width,
    metal: c.metal,
    finish: c.finish,
    size: c.size === 'unsure' ? (men ? '10' : '6') : c.size,
    twoTone: men && c.style === 'band' ? c.twoTone : false,
    face: c.face,
    initials: c.style === 'signet' ? c.initials : '',
    setting: 'prong4',
    bandStones: c.style === 'eternity' ? 'full' : 'none',
    engraving: '',
  };
}

function steps(c: StudioCfg) {
  const s = ['Ring', 'Style'];
  if (c.gender === 'women' && c.style !== 'eternity') s.push('Stone');
  if (c.gender === 'men' && c.style === 'eternity') s.push('Stone');
  if (c.style !== 'original') s.push(c.gender === 'men' && c.style === 'signet' ? 'Face' : 'Band');
  s.push('Metal', 'Size', 'Your design');
  return s;
}

function describe(c: StudioCfg): string {
  const men = c.gender === 'men';
  const parts = [`${men ? "Men's" : "Women's"} ${label([...WOMEN_STYLES, ...MEN_STYLES], c.style).toLowerCase()}`];
  if (c.style === 'original') {
    parts.push(label(GEMS, c.stone).toLowerCase(), `${c.finish} ${label(METALS, c.metal).toLowerCase()}`, c.size === 'unsure' ? 'size to be measured' : `US size ${c.size}`);
    return parts.join(' · ');
  }
  if (!men && c.style !== 'eternity') parts.push(`${c.carat} ct ${label(CUTS, c.shape).toLowerCase()} ${label(GEMS, c.stone).toLowerCase()}`);
  else if (c.style === 'eternity') parts.push(`${label(GEMS, c.stone).toLowerCase()} all round`);
  if (men && c.style !== 'signet') parts.push(`${label(MEN_PROFILES, c.profile).toLowerCase()} ${c.width} mm`);
  else if (!men && c.style !== 'eternity') parts.push(`${label(WOMEN_BANDS, c.style === 'pave' ? 'pave' : c.band).toLowerCase()} band ${c.width} mm`);
  if (men && c.style === 'signet') parts.push(`${c.face} face${c.initials ? `, initials ${c.initials.toUpperCase()}` : ''}`);
  parts.push(`${c.finish} ${label(METALS, c.metal).toLowerCase()}${c.twoTone && men && c.style === 'band' ? ' with two-tone inlay' : ''}`);
  parts.push(c.size === 'unsure' ? 'size to be measured' : `US size ${c.size}`);
  return parts.join(' · ');
}

const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.23 0 0 0 0 0.2 0 0 0 0 0.16 0 0 0 .07 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

// ---------- ui atoms (module level so chips keep focus across re-renders) ----------
const chip = (active: boolean) =>
  `inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3.5 text-[12px] tracking-[0.02em] transition-[background-color,border-color,color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8b58f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0b09] ${
    active ? 'border-[#c8b58f] bg-[#c8b58f] text-[#0c0b09]' : 'border-[rgba(200,181,143,0.3)] text-[#ddd4c6] hover:border-[rgba(200,181,143,0.7)] hover:text-[#f4efe4]'
  }`;
const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <fieldset className="mt-5 first:mt-0">
    <legend className="fx-kicker mb-2.5 text-[#a8957a]">{title}</legend>
    <div className="flex flex-wrap gap-2">{children}</div>
  </fieldset>
);
function Chips<T extends string | number>({ items, value, onPick, swatch }: { items: readonly (readonly [T, string, string?])[] | readonly (readonly [T, string])[]; value: T; onPick: (v: T) => void; swatch?: boolean }) {
  return (
  <>
    {(items as readonly (readonly [T, string, string?])[]).map(([id, name, color]) => (
      <button key={String(id)} type="button" className={chip(value === id)} aria-pressed={value === id} onClick={() => onPick(id)}>
        {swatch && color ? <span className="h-3 w-3 rounded-full border border-black/20" style={{ background: color }} /> : null}
        {name}
      </button>
    ))}
  </>
  );
}

interface Props {
  compact?: boolean;
  heroEmbed?: boolean;
  /** From content.json; each hand-off action is hidden when its field is missing. */
  businessName?: string;
  phone?: string;
  website?: string;
}

const clean = (v?: string) => (v || '').trim();

export const RingStudio: React.FC<Props> = ({ compact = false, heroEmbed = false, businessName, phone, website }) => {
  const defMetal = 'y18';
  const defGem = 'diamond';
  const [cfg, setCfg] = useState<StudioCfg>(() => WOMEN_DEFAULT(defMetal, defGem));
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [spin, setSpin] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;
  const stack = heroEmbed || compact;
  const poster = assetUrl('assets/plates/plate_hero_ring.webp');
  const list = useMemo(() => steps(cfg), [cfg]);
  const current = list[Math.min(step, list.length - 1)];

  // The Signature style needs its GLB first; until it arrives the poster stays up.
  const apply = useCallback((c: StudioCfg) => {
    const v = viewerRef.current;
    if (!v) return;
    if (c.style !== 'original') { v.setConfig(toEngine(c)); return; }
    import('./engine/original.js')
      .then((m) => m.loadOriginal())
      .then(() => { if (viewerRef.current === v && cfgRef.current.style === 'original') v.setConfig(toEngine(cfgRef.current)); })
      .catch((e) => {
        console.warn('[ring-studio] signature ring unavailable, showing solitaire', e);
        setCfg((p) => (p.style === 'original' ? { ...p, style: 'solitaire' } : p));
      });
  }, []);

  useEffect(() => {
    let dead = false;
    import('./engine/viewer.js')
      .then((m) => {
        if (dead || !canvasRef.current) return;
        try {
          const v = m.createViewer(canvasRef.current, {
            onReady: () => !dead && setReady(true),
            onAutoRotate: (b: boolean) => !dead && setSpin(b),
          }) as unknown as Viewer;
          viewerRef.current = v;
          apply(cfgRef.current);
        } catch (e) {
          console.warn('[ring-studio] 3D unavailable', e);
          setFailed(true);
        }
      })
      .catch((e) => { console.warn('[ring-studio] engine failed to load', e); if (!dead) setFailed(true); });
    return () => { dead = true; viewerRef.current?.dispose(); viewerRef.current = null; };
  }, []);

  useEffect(() => { apply(cfg); }, [cfg, apply]);
  useEffect(() => { viewerRef.current?.setBox(cfg.box || null); }, [cfg.box]);

  const set = useCallback(<K extends keyof StudioCfg>(k: K, v: StudioCfg[K]) => setCfg((c) => ({ ...c, [k]: v })), []);
  const setGender = (g: Gender) => {
    if (g === cfg.gender) return;
    setCfg((c) => ({ ...(g === 'men' ? MEN_DEFAULT : WOMEN_DEFAULT)(c.metal, c.stone), box: c.box }));
    viewerRef.current?.frame('hero');
  };
  const setStyle = (s: string) => {
    setCfg((c) => {
      const n = { ...c, style: s };
      if (s === 'eternity' && c.gender === 'women' && c.width < 2.2) n.width = 2.2;
      if (c.gender === 'men' && s === 'eternity' && c.width > 5) n.width = 4;
      if (c.gender === 'men' && s === 'signet') n.width = 4;
      if (c.gender === 'men' && s === 'band' && c.width < 4) n.width = 6;
      return n;
    });
  };
  const go = (i: number) => setStep(Math.max(0, Math.min(list.length - 1, i)));
  const view = (name: string) => viewerRef.current?.frame(name);

  // ---------- hand-off (no fake submission: only real store fields) ----------
  const [copied, setCopied] = useState(false);
  const store = clean(businessName);
  const tel = clean(phone).replace(/[^+\d]/g, '');
  const site = /^https?:\/\//i.test(clean(website)) ? clean(website) : '';
  const copy = async () => {
    try { await navigator.clipboard.writeText(describe(cfg)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); }
  };

  const iconBtn =
    'inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-[rgba(12,11,9,0.18)] bg-[rgba(244,239,228,0.72)] px-3 text-[11px] uppercase tracking-[0.14em] text-[#0c0b09] backdrop-blur transition-[background-color,transform] duration-300 hover:bg-[#f4efe4] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c0b09]';

  const men = cfg.gender === 'men';
  const widths = men ? (cfg.style === 'signet' ? [3, 4, 5] : cfg.style === 'eternity' ? [3, 4, 5] : [4, 5, 6, 8]) : cfg.style === 'eternity' ? [2.2, 2.6, 3, 3.5] : [1.8, 2.2, 2.6, 3];

  const panel = (() => {
    switch (current) {
      case 'Ring':
        return (
          <Group title="Who is it for">
            <Chips items={[['women', 'Women'], ['men', 'Men']] as const} value={cfg.gender} onPick={setGender} />
          </Group>
        );
      case 'Style':
        return (
          <Group title={men ? "Men's styles" : 'Setting style'}>
            <Chips items={men ? MEN_STYLES : WOMEN_STYLES} value={cfg.style} onPick={setStyle} />
          </Group>
        );
      case 'Stone':
        return (
          <>
            {cfg.style !== 'eternity' && cfg.style !== 'original' && (
              <>
                <Group title="Cut"><Chips items={CUTS} value={cfg.shape} onPick={(v) => set('shape', v)} /></Group>
                <Group title="Carat"><Chips items={CARATS.map((c) => [c, `${c} ct`] as const)} value={cfg.carat} onPick={(v) => set('carat', v)} /></Group>
              </>
            )}
            <Group title="Stone"><Chips items={GEMS} value={cfg.stone} onPick={(v) => set('stone', v)} swatch /></Group>
          </>
        );
      case 'Band':
        return (
          <>
            {men ? (
              cfg.style === 'band' && (
                <>
                  <Group title="Profile"><Chips items={MEN_PROFILES} value={cfg.profile} onPick={(v) => set('profile', v)} /></Group>
                  <Group title="Two-tone inlay"><Chips items={[['no', 'One metal'], ['yes', 'Two-tone']] as const} value={cfg.twoTone ? 'yes' : 'no'} onPick={(v) => set('twoTone', v === 'yes')} /></Group>
                </>
              )
            ) : (
              cfg.style !== 'eternity' && cfg.style !== 'pave' && (
                <Group title="Band"><Chips items={WOMEN_BANDS} value={cfg.band} onPick={(v) => set('band', v)} /></Group>
              )
            )}
            <Group title="Width"><Chips items={widths.map((w) => [w, `${w} mm`] as const)} value={cfg.width} onPick={(v) => set('width', v)} /></Group>
          </>
        );
      case 'Face':
        return (
          <>
            <Group title="Signet face"><Chips items={[['oval', 'Oval'], ['cushion', 'Cushion'], ['round', 'Round']] as const} value={cfg.face} onPick={(v) => set('face', v)} /></Group>
            <label className="mt-5 block">
              <span className="fx-kicker mb-2 block text-[#a8957a]">Initials (up to 3)</span>
              <input value={cfg.initials} maxLength={3} onChange={(e) => set('initials', e.target.value.replace(/[^a-zA-Z&]/g, ''))} onFocus={() => view('close')}
                className="h-11 w-32 rounded-full border border-[rgba(200,181,143,0.35)] bg-transparent px-4 text-[15px] uppercase tracking-[0.3em] text-[#f4efe4] outline-none focus:border-[#c8b58f]" />
            </label>
          </>
        );
      case 'Metal':
        return (
          <>
            <Group title="Metal"><Chips items={METALS} value={cfg.metal} onPick={(v) => set('metal', v)} swatch /></Group>
            <Group title="Finish"><Chips items={FINISHES} value={cfg.finish} onPick={(v) => set('finish', v)} /></Group>
            <Group title="Presentation"><Chips items={BOXES} value={cfg.box} onPick={(v) => set('box', v)} /></Group>
          </>
        );
      case 'Size':
        return (
          <>
            <label className="block">
              <span className="fx-kicker mb-2.5 block text-[#a8957a]">Ring size (US)</span>
              <select value={cfg.size} onChange={(e) => set('size', e.target.value)}
                className="h-11 rounded-full border border-[rgba(200,181,143,0.35)] bg-[#0c0b09] px-4 text-[14px] text-[#f4efe4] outline-none focus:border-[#c8b58f]">
                {SIZES.map((s) => <option key={s} value={s}>US {s} · {(11.63 + 0.8128 * +s).toFixed(1)} mm</option>)}
                <option value="unsure">Not sure yet</option>
              </select>
            </label>
            <p className="mt-3 max-w-sm text-[12px] leading-relaxed text-[#a8957a]">
              {cfg.size === 'unsure' ? 'No problem. The workshop will send a sizer or measure in store.' : 'Inner diameter shown next to each size. The workshop confirms before casting.'}
            </p>
          </>
        );
      default:
        return (
          <div>
            <p className="fx-kicker mb-2 text-[#a8957a]">Your design</p>
            <p className="max-w-md text-[13px] leading-relaxed text-[#ddd4c6]" data-testid="ring-design-summary">{describe(cfg)}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {tel && <a href={`tel:${tel}`} className="fx-btn fx-btn-primary">{store ? `Call ${store}` : 'Call the store'}</a>}
              {site && <a href={site} target="_blank" rel="noopener noreferrer" className="fx-btn fx-btn-ghost">Visit website</a>}
              <button type="button" onClick={copy} className="fx-btn fx-btn-ghost">{copied ? 'Copied' : 'Copy design'}</button>
            </div>
            <p className="mt-3 text-[11px] text-[#8a7d69]">No prices online. The store quotes on your exact design.</p>
          </div>
        );
    }
  })();

  const stage = (
    <div
      className={`relative w-full overflow-hidden ${stack ? 'h-[340px] sm:h-[400px]' : 'h-[min(58svh,440px)] md:h-[560px]'}`}
      style={{ backgroundColor: '#ebe4d6', backgroundImage: `${NOISE}, linear-gradient(180deg,#efe9dd 0%,#e4dccb 100%)` }}
      data-testid="ring-stage"
    >
      <img src={poster} alt="" width={1280} height={720} decoding="async"
        className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${ready && !failed ? 'opacity-0' : 'opacity-100'}`} />
      <canvas ref={canvasRef} className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`} aria-label={`3D preview: ${describe(cfg)}`} role="img" />
      {failed && (
        <p className="absolute inset-x-4 bottom-4 text-center text-[12px] text-[#3a342b]">3D preview needs WebGL 2. You can still build your design below.</p>
      )}
      {!failed && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            <button type="button" className={iconBtn} onClick={() => { const v = viewerRef.current; if (!v) return; const on = !v.autoRotate; v.setAutoRotate(on); setSpin(on); if (on) v.frame('hero'); }} aria-pressed={spin}>{spin ? 'Pause' : 'Spin'}</button>
            <button type="button" className={iconBtn} onClick={() => view('close')}>Close-up</button>
            <button type="button" className={`${iconBtn} hidden sm:inline-flex`} onClick={() => view('side')}>Profile</button>
          </div>
          <div className="flex gap-1.5">
            <button type="button" className={iconBtn} aria-label="Zoom in" onClick={() => viewerRef.current?.zoom(0.8)}>+</button>
            <button type="button" className={iconBtn} aria-label="Zoom out" onClick={() => viewerRef.current?.zoom(1.25)}>−</button>
          </div>
        </div>
      )}
      <p className="pointer-events-none absolute left-4 top-3 text-[10px] uppercase tracking-[0.2em] text-[#3a342b]/70">Drag to turn · pinch to zoom</p>
    </div>
  );

  return (
    <div
      className={`relative w-full text-left text-[#f4efe4] ${stack ? '' : 'md:grid md:grid-cols-[1.2fr_1fr]'}`}
      style={{ backgroundColor: '#0c0b09', backgroundImage: NOISE }}
      data-testid="ring-studio"
    >
      <div className={stack ? '' : 'md:sticky md:top-0 md:self-start'}>{stage}</div>
      <div className="flex flex-col px-5 pb-6 pt-5 sm:px-7">
        <div className="flex items-baseline justify-between gap-3">
          <p className="fx-kicker text-[#c8b58f]">{businessName ? `${businessName} · ` : ''}Ring studio</p>
          <p className="text-[11px] tabular-nums text-[#8a7d69]">{Math.min(step, list.length - 1) + 1} / {list.length}</p>
        </div>
        <nav aria-label="Ring studio steps" className="-mx-5 mt-3 overflow-x-auto px-5 sm:-mx-7 sm:px-7 [scrollbar-width:none]">
          <ol className="flex min-w-max gap-5 border-b border-[rgba(200,181,143,0.18)]">
            {list.map((s, i) => (
              <li key={s}>
                <button type="button" onClick={() => go(i)} aria-current={i === step ? 'step' : undefined}
                  className={`-mb-px border-b py-2.5 text-[11px] uppercase tracking-[0.18em] transition-colors duration-300 focus-visible:outline-none focus-visible:text-[#f4efe4] ${i === step ? 'border-[#c8b58f] text-[#f4efe4]' : 'border-transparent text-[#8a7d69] hover:text-[#ddd4c6]'}`}>
                  {s}
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <div className="min-h-[150px] pt-5" key={current}>{panel}</div>
        {current !== 'Your design' && (
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-[rgba(200,181,143,0.18)] pt-4">
            <button type="button" className="fx-btn fx-btn-ghost disabled:opacity-40" disabled={step === 0} onClick={() => go(step - 1)}>Back</button>
            <button type="button" className="fx-btn fx-btn-primary" onClick={() => go(step + 1)}>{list[step + 1] === 'Your design' ? 'See my design' : 'Next'}</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RingStudio;
