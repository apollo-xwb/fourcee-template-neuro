import React, { Suspense, lazy, useState } from 'react';
import { createPortal } from 'react-dom';
import { PendantFBX } from './PendantFBX';
import { MiniPhone } from './ui/mini-phone';
import { IncomingCallPhone } from './ui/incoming-call-phone';
import { ValueCalculator } from './ValueCalculator';
import type { AuditData } from '../types/audit';
import {
  BeforeAfterCards,
  CallVolumeBarChart,
  MissedCallDonutChart,
  RevenueLeakLineChart,
  SectionTrustFooter,
  TrafficPieChart,
} from './AuditCharts';

/**
 * Audit page, restyled to match fourcee.online (ivory + dark slatted texture, Michroma display type, ink/brass
 * hairline buttons, no cards/glows). Every binding to content.json is kept; every section is null-guarded and
 * hidden when the scraped field it shows is missing, so the page never fills gaps with invented copy or numbers.
 * Previous version: _superseded/AuditPage.tsx.
 */

const RingStudio = lazy(() => import('./ring-studio/RingStudio'));

interface AuditPageProps {
  isDarkMode: boolean;
  onGetLive: () => void;
  onBookCall: () => void;
  data: AuditData;
}

type DeepPartial<T> = T extends Array<infer U> ? Array<DeepPartial<U>> : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> | null } : T;

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const arr = <T,>(v: T[] | null | undefined): v is T[] => Array.isArray(v) && v.length > 0;

const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

const Kicker: React.FC<{ children: React.ReactNode; light?: boolean }> = ({ children, light }) => (
  <p className={`fx-kicker ${light ? 'text-[#c8b58f]' : 'text-[#6b5f4c]'}`}>{children}</p>
);

const Stat: React.FC<{ label: string; value: string; light?: boolean }> = ({ label, value, light }) => (
  <div className={`border-t pt-4 ${light ? 'border-[rgba(200,181,143,0.28)]' : 'border-[rgba(12,11,9,0.16)]'}`}>
    <p className={`text-[10px] uppercase tracking-[0.22em] ${light ? 'text-[#a8957a]' : 'text-[#6b5f4c]'}`}>{label}</p>
    <p className={`mt-2 font-[Michroma] text-[1.15rem] leading-tight tabular-nums sm:text-2xl ${light ? 'text-[#f4efe4]' : 'text-[#0c0b09]'}`}>{value}</p>
  </div>
);

const Arrow = () => (
  <svg aria-hidden viewBox="0 0 16 16" className="hc-arrow"><path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" /></svg>
);

export const AuditPage: React.FC<AuditPageProps> = ({ onGetLive, onBookCall, data }) => {
  const d = data as unknown as DeepPartial<AuditData>;
  const [showIntroSplash, setShowIntroSplash] = useState(true);
  const [logoOk, setLogoOk] = useState(true);

  const meta = d.auditMeta ?? {};
  const biz = d.business ?? {};
  const name = str(biz.name) ? biz.name : '';
  const location = str(biz.location) ? biz.location : '';
  const sym = str(meta.currencySymbol) ? meta.currencySymbol : '';
  const locale = str(meta.locale) ? meta.locale : undefined;
  const money = (n: number) => `${sym}${n.toLocaleString(locale)}`;
  const range = (a: unknown, b: unknown) => (num(a) && num(b) ? `${a}–${b}` : num(a) ? `${a}` : num(b) ? `${b}` : '');
  const sourceLine = str(d.compliance?.dataSourceLine) ? d.compliance!.dataSourceLine! : '';
  const Trust = ({ light }: { light?: boolean }) => (sourceLine ? <SectionTrustFooter dataSourceLine={sourceLine} isDarkMode={!!light} /> : null);

  const cm = d.callModel ?? {};
  const rm = d.revenueModel ?? {};
  const callStats = [
    { label: 'Estimated inbound calls / week', value: range(cm.inboundCallsPerWeekMin, cm.inboundCallsPerWeekMax) },
    { label: 'Typical answer rate', value: range(cm.answerRateMin, cm.answerRateMax) && `${range(cm.answerRateMin, cm.answerRateMax)}%` },
    { label: 'Likely missed calls / week', value: range(cm.missedCallsPerWeekMin, cm.missedCallsPerWeekMax) },
  ].filter((s) => s.value);
  const hasLoss = num(rm.monthlyLossMin) && num(rm.monthlyLossMax);
  const hasVolumeChart = [cm.inboundCallsPerWeekMin, cm.inboundCallsPerWeekMax, cm.answeredCallsPerWeekMin, cm.answeredCallsPerWeekMax, cm.missedCallsPerWeekMin, cm.missedCallsPerWeekMax].every(num);
  const split = (cm.missedCallTypeSplit ?? []).filter((s) => s && str(s.label) && num(s.percent)) as Array<{ label: string; percent: number }>;
  const series = (rm.lineSeries ?? []).filter(num) as number[];
  const hasLine = series.length > 1 && num(rm.sixMonthCumulativeLeak);
  const rows = (d.breakdown?.rows ?? []).filter((r) => r && str(r.callType)) as AuditData['breakdown']['rows'];
  const cards = (d.breakdown?.opportunityCards ?? []).filter((c) => c && str(c.title));
  const traffic = (d.traffic?.sources ?? []).filter((s) => s && str(s.label) && num(s.percent)) as AuditData['traffic']['sources'];
  const cmp = d.comparison ?? {};
  const hasCmp = [cmp.currentAnsweredRate, cmp.currentMonthlyLoss, cmp.projectedAnsweredRate, cmp.projectedMonthlyLoss].every(num);
  const p90 = d.projection90d ?? {};
  const projections = [
    { label: 'Answer rate', value: p90.answerRateProjected },
    { label: 'Monthly revenue recovered', value: p90.monthlyRecoveredProjected },
    { label: 'Typical payback period', value: p90.paybackPeriodProjected },
  ].filter((p) => str(p.value)) as Array<{ label: string; value: string }>;
  const rev = d.reviews ?? {};
  const hasReviews = num(rev.rating) && num(rev.count) && rev.count > 0;
  const quotes = [rev.quote1, rev.quote2].filter(str) as string[];
  const themes = (rev.themes ?? []).filter(str) as string[];
  const plan = d.recoveryPlan ?? {};
  const caps = (plan.capabilities ?? []).filter(str) as string[];
  const media = str(plan.supportingMediaUrl) && !/placeholder\.gif$/i.test(plan.supportingMediaUrl) ? plan.supportingMediaUrl : '';
  const hasPlan = str(plan.body) || caps.length > 0 || !!media;
  const disclaimer = str(d.compliance?.disclaimerShort) ? d.compliance!.disclaimerShort! : '';
  const live = d.liveDemo ?? {};

  return (
    <div className="relative min-h-screen bg-[#faf5ea] font-sans text-[#0c0b09]" data-testid="audit-page">
      {showIntroSplash && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-5 fourcee-ribbed-wash" role="dialog" aria-modal="true" aria-label="Audit cover">
          <div className="w-full max-w-xl text-center">
            <div className="mx-auto h-[170px] w-[170px] sm:h-[210px] sm:w-[210px]">
              <PendantFBX className="h-full w-full" isDarkMode />
            </div>
            {str(meta.confidentialityLabel) && <p className="fx-kicker mt-2 text-[#c8b58f]">{meta.confidentialityLabel}</p>}
            <h2 className="fx-display mt-4 text-[1.35rem] leading-[1.1] text-[#f4efe4] sm:text-3xl">
              {str(meta.preparedForLabel) && <span className="block text-[11px] tracking-[0.24em] text-[#ddd4c6] sm:text-xs">{meta.preparedForLabel}</span>}
              <span className="mt-2 block">{name}</span>
            </h2>
            <button type="button" onClick={() => setShowIntroSplash(false)} className="hc-btn hc-primary mt-8" data-testid="audit-proceed">
              <span>Proceed to report</span><Arrow />
            </button>
          </div>
        </div>
      , document.body)}

      {/* Header bar: client identity only from content.json */}
      <header className="sticky top-0 z-40 border-b border-[rgba(12,11,9,0.12)] bg-[rgba(250,245,234,0.86)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-5 py-3 sm:px-8">
          {str(biz.logoUrl) && logoOk && (
            <img src={biz.logoUrl} alt="" className="h-8 w-8 rounded-full object-contain" onError={() => setLogoOk(false)} />
          )}
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold uppercase tracking-[0.16em]">{name}</p>
            {location && <p className="truncate text-[10px] uppercase tracking-[0.18em] text-[#6b5f4c]">{location}</p>}
          </div>
          {hasReviews && (
            <p className="ml-auto shrink-0 text-[11px] tabular-nums text-[#3a342b]" data-testid="header-rating">
              {rev.rating!.toFixed(1)} ★ <span className="hidden sm:inline">· {rev.count!.toLocaleString(locale)} reviews</span>
            </p>
          )}
        </div>
      </header>

      {/* Hero: same treatment as fourcee.online (untinted slatted photo, directional beige fade/wash, glass headline plate) */}
      <section id="hero" className="fourcee-hero-beige relative overflow-hidden">
        <div className="fourcee-hero-overlay pointer-events-none absolute inset-0" data-testid="hero-overlay" aria-hidden />
        <div className="fx-grid z-[1]" aria-hidden />
        <div className="fourcee-hero-fade pointer-events-none absolute inset-0 z-[2] lg:hidden" aria-hidden />
        <div className="fourcee-hero-wash pointer-events-none absolute inset-0 z-[2] hidden lg:block" aria-hidden />
        <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-start gap-6 px-5 pt-10 pb-16 sm:px-8 md:px-12 lg:min-h-[calc(100svh-56px)] lg:grid-cols-2 lg:items-center lg:gap-10 lg:py-16">
          <div className="relative hidden h-full min-h-[420px] lg:block" aria-hidden>
            <PendantFBX className="absolute inset-0 h-full w-full" isDarkMode />
          </div>
          <div className="w-full max-w-xl text-left lg:justify-self-end">
            <div className="fx-chip mb-3 sm:mb-5"><span className="fx-dot" />{str(meta.confidentialityLabel) ? meta.confidentialityLabel : 'Phone performance audit'}</div>
            <div className="hero-head-glass -mx-1 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 lg:mx-0 lg:rounded-none lg:p-0">
              <h1 className="fx-display text-[22px] leading-[1.05] text-[#0c0b09] sm:text-[30px] md:text-4xl lg:text-5xl">
                <span className="block">Phone performance</span>
                <span className="block">audit report</span>
              </h1>
              <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-[#3a342b] sm:mt-4 sm:text-[11px] sm:tracking-[0.22em]" data-testid="hero-prepared-for">
                {str(meta.preparedForLabel) ? `${meta.preparedForLabel} ` : ''}{name}{location ? ` · ${location}` : ''}
              </p>
              {str(meta.generatedDate) && <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#6b5f4c]">{meta.generatedDate}</p>}
            </div>
            <div className="liquid-glass mt-4 max-w-[440px] rounded-2xl px-5 py-3.5 sm:mt-6 sm:py-4">
              <p className="fx-kicker">What Fourcee does</p>
              <p className="mt-1.5 text-sm font-medium tracking-wide text-[#0c0b09] sm:text-base">Picks up when your team can&apos;t</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-[#3a342b] sm:text-[13px]">
                It answers stock, repair and pricing questions, books consultations into your calendar, and puts serious buyers straight through to you.
              </p>
            </div>
            <div className="hero-ctas mt-5 flex flex-wrap items-center gap-x-3 gap-y-3 sm:mt-7" data-testid="hero-ctas">
              <button type="button" onClick={() => scrollToId('ring-studio')} className="hc-btn hc-primary" data-testid="hero-cta-ring">
                <span>Try the Ring Builder</span><Arrow />
              </button>
              <button type="button" onClick={() => scrollToId('audit-full-report')} className="hc-btn hc-secondary" data-testid="hero-cta-audit">
                See the audit
              </button>
              <button type="button" onClick={() => scrollToId('audit-roi')} className="hc-link" data-testid="hero-cta-roi">
                Calculate ROI
              </button>
            </div>
            <div id="audit-live-test" className="mt-5 max-w-sm scroll-mt-24 sm:mt-7">
              <MiniPhone
                isDarkMode={false}
                className="w-full"
                businessName={data.business?.name}
                leadId={data.lead_id}
              />
              {str(live.helperCopy) && <p className="mt-2 text-[11px] text-[#3a342b]">{live.helperCopy}</p>}
            </div>
          </div>
        </div>
      </section>

      {/* Ring studio (dark textured band) */}
      <section id="ring-studio" className="fourcee-ribbed-wash scroll-mt-14 px-0 pt-10 pb-16 sm:px-6 md:pt-14 md:pb-24">
        <div className="mx-auto mb-5 w-full max-w-6xl px-5 sm:px-1">
          <Kicker light>Try it yourself</Kicker>
          <h2 className="fx-display mt-2 text-[1.55rem] leading-[1.02] text-[#f4efe4] sm:text-2xl md:text-3xl">Ring Builder</h2>
          <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-[#ddd4c6] sm:text-sm">
            The 3D ring builder we set up on jewelers&apos; websites. Pick a style, stone and metal, then send the design to the store.
          </p>
        </div>
        <div className="mx-auto w-full max-w-6xl overflow-hidden sm:rounded-[1.5rem]">
          <Suspense fallback={<div className="h-[520px]" aria-hidden />}>
            <RingStudio businessName={name} phone={biz.primaryPhone ?? undefined} website={biz.website ?? undefined} />
          </Suspense>
        </div>
      </section>

      <main className="fourcee-surface-bg">
        {/* Key findings (benchmark estimates from content.json) */}
        {(callStats.length > 0 || hasLoss) && (
          <section className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 md:py-20" data-testid="audit-findings">
            <Kicker>Key findings</Kicker>
            <h2 className="fx-display mt-2 text-[1.35rem] leading-[1.08] sm:text-3xl">Where calls are going unanswered</h2>
            {callStats.length > 0 && (
              <div className="mt-8 grid gap-6 sm:grid-cols-3">
                {callStats.map((s) => <Stat key={s.label} label={s.label} value={s.value} />)}
              </div>
            )}
            {hasLoss && (
              <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1fr_minmax(0,380px)]">
                <div>
                  <Kicker>Revenue impact</Kicker>
                  <p className="fx-display mt-3 text-[1.25rem] leading-[1.12] sm:text-[2rem]">
                    {money(rm.monthlyLossMin!)} – {money(rm.monthlyLossMax!)}
                    <span className="mt-2 block text-[11px] tracking-[0.2em] text-[#6b5f4c]">Estimated monthly lost revenue</span>
                  </p>
                  {num(rm.monthlyLossMidpoint) && <p className="mt-3 text-sm text-[#3a342b]">About {money(rm.monthlyLossMidpoint)} a month at mid-range assumptions.</p>}
                  {disclaimer && <p className="mt-2 text-[12px] text-[#6b5f4c]">{disclaimer}</p>}
                </div>
                <div className="mx-auto w-full max-w-sm">
                  <IncomingCallPhone isDarkMode={false} className="w-full" onAction={() => { scrollToId('audit-booking-cta'); onBookCall(); }} />
                </div>
              </div>
            )}
            <Trust />
          </section>
        )}

        {/* Charts */}
        {(hasVolumeChart || split.length > 0 || hasLine) && (
          <section id="audit-full-report" className="mx-auto w-full max-w-6xl scroll-mt-16 space-y-10 border-t border-[rgba(12,11,9,0.12)] px-5 py-14 sm:px-8 md:py-20">
            <div>
              <Kicker>Full report</Kicker>
              <h2 className="fx-display mt-2 text-[1.35rem] leading-[1.08] sm:text-3xl">Call volume and revenue leak</h2>
            </div>
            {hasVolumeChart && <CallVolumeBarChart callModel={cm as AuditData['callModel']} isDarkMode={false} />}
            {(split.length > 0 || hasLine) && (
              <div className="grid gap-10 lg:grid-cols-2">
                {split.length > 0 && <MissedCallDonutChart missedCallTypeSplit={split} isDarkMode={false} />}
                {hasLine && <RevenueLeakLineChart lineSeries={series} currencySymbol={sym} cumulativeLeak={rm.sixMonthCumulativeLeak!} isDarkMode={false} />}
              </div>
            )}
            <Trust />
          </section>
        )}
        {!(hasVolumeChart || split.length > 0 || hasLine) && <span id="audit-full-report" />}

        {/* Breakdown table */}
        {rows.length > 0 && (
          <section className="mx-auto w-full max-w-6xl border-t border-[rgba(12,11,9,0.12)] px-5 py-14 sm:px-8 md:py-20" data-testid="audit-breakdown">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <Kicker>Breakdown</Kicker>
                <h2 className="fx-display mt-2 text-[1.35rem] leading-[1.08] sm:text-3xl">Missed calls by type</h2>
              </div>
              {str(d.breakdown?.riskBadge) && <span className="fx-chip">{d.breakdown!.riskBadge}</span>}
            </div>
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.22em] text-[#6b5f4c]">
                    <th className="py-3 pr-4 font-medium">Call type</th>
                    <th className="py-3 pr-4 font-medium">Est. missed / week</th>
                    <th className="py-3 font-medium">Monthly impact</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.callType} className="border-t border-[rgba(12,11,9,0.12)] text-sm">
                      <td className="py-4 pr-4">{r.callType}</td>
                      <td className="py-4 pr-4 tabular-nums">{range(r.weeklyMissedMin, r.weeklyMissedMax) || '—'}</td>
                      <td className="py-4 font-medium tabular-nums">{num(r.monthlyImpactMin) && num(r.monthlyImpactMax) ? `${money(r.monthlyImpactMin)} – ${money(r.monthlyImpactMax)}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {cards.length > 0 && (
              <div className="mt-10 grid gap-6 md:grid-cols-2">
                {cards.map((c) => (
                  <div key={c!.title} className="border-t border-[rgba(12,11,9,0.16)] pt-4">
                    <p className="text-base font-semibold">{c!.title}</p>
                    {str(c!.subtitle) && <p className="mt-1 text-sm text-[#3a342b]">{c!.subtitle}</p>}
                    {str(c!.valueNote) && <p className="mt-2 text-sm font-medium">{c!.valueNote}</p>}
                    {str(c!.impactTier) && <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[#6b5f4c]">Monthly impact · {c!.impactTier}</p>}
                  </div>
                ))}
              </div>
            )}
            <Trust />
          </section>
        )}

        {/* Reviews + traffic (only real scraped values) */}
        {(hasReviews || traffic.length > 0) && (
          <section className="mx-auto grid w-full max-w-6xl gap-12 border-t border-[rgba(12,11,9,0.12)] px-5 py-14 sm:px-8 md:py-20 lg:grid-cols-2" data-testid="audit-proof">
            {hasReviews && (
              <div>
                <Kicker>Google Business Profile</Kicker>
                <p className="fx-display mt-3 text-[2rem] leading-none sm:text-[2.6rem]">{rev.rating!.toFixed(1)} <span className="text-[#6b5f4c]">★</span></p>
                <p className="mt-2 text-sm text-[#3a342b]">{rev.count!.toLocaleString(locale)} public reviews{name ? ` for ${name}` : ''}</p>
                {quotes.map((q) => (
                  <blockquote key={q} className="mt-5 border-l border-[#c8b58f] pl-4 text-sm italic leading-relaxed text-[#3a342b]">&ldquo;{q}&rdquo;</blockquote>
                ))}
                {themes.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{themes.map((t) => <span key={t} className="fx-chip">{t}</span>)}</div>}
              </div>
            )}
            {traffic.length > 0 && <TrafficPieChart trafficSources={traffic} isDarkMode={false} />}
          </section>
        )}

        {/* Before / after + 90-day projection */}
        {(hasCmp || projections.length > 0) && (
          <section className="mx-auto w-full max-w-6xl border-t border-[rgba(12,11,9,0.12)] px-5 py-14 sm:px-8 md:py-20" data-testid="audit-projection">
            <Kicker>With Fourcee</Kicker>
            <h2 className="fx-display mt-2 text-[1.35rem] leading-[1.08] sm:text-3xl">Projected within 90 days</h2>
            {hasCmp && <div className="mt-8"><BeforeAfterCards comparison={cmp as AuditData['comparison']} currencySymbol={sym} isDarkMode={false} /></div>}
            {projections.length > 0 && (
              <div className="mt-8 grid gap-6 sm:grid-cols-3">{projections.map((p) => <Stat key={p.label} label={p.label} value={p.value} />)}</div>
            )}
            <Trust />
          </section>
        )}

        {/* Recovery plan (only the content.json body / capabilities / media) */}
        {hasPlan && (
          <section className="mx-auto grid w-full max-w-6xl gap-10 border-t border-[rgba(12,11,9,0.12)] px-5 py-14 sm:px-8 md:py-20 lg:grid-cols-2" data-testid="audit-plan">
            <div>
              <Kicker>Recovery plan</Kicker>
              <h2 className="fx-display mt-2 text-[1.35rem] leading-[1.08] sm:text-3xl">{str(plan.headline) ? plan.headline : 'Recovery plan'}</h2>
              {str(plan.body) && <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#3a342b]">{plan.body}</p>}
              {caps.length > 0 && (
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {caps.map((c) => <li key={c} className="border-t border-[rgba(12,11,9,0.16)] pt-3 text-sm">{c}</li>)}
                </ul>
              )}
            </div>
            {media && <img src={media} alt="" className="h-full max-h-[380px] w-full rounded-2xl object-cover" loading="lazy" />}
          </section>
        )}
      </main>

      {/* ROI calculator (user inputs only) */}
      <section id="audit-roi" className="fourcee-ribbed-wash scroll-mt-14 px-5 py-14 sm:px-8 md:py-20">
        <div className="mx-auto w-full max-w-5xl">
          <Kicker light>Your numbers</Kicker>
          <h2 className="fx-display mt-2 mb-8 text-[1.35rem] leading-[1.08] text-[#f4efe4] sm:text-3xl">Calculate the ROI</h2>
          <ValueCalculator isDarkMode businessName={data.business?.name} />
        </div>
      </section>

      {/* Closing CTA */}
      <section id="audit-booking-cta" className="fourcee-hero-beige relative scroll-mt-14 overflow-hidden px-5 py-16 text-center sm:px-8 md:py-24">
        <div className="fx-grid" aria-hidden />
        <div className="relative mx-auto max-w-2xl">
          <Kicker>Next step</Kicker>
          <h2 className="fx-display mt-3 text-[1.4rem] leading-[1.08] sm:text-3xl">{name ? `Answer every call at ${name}` : 'Answer every call'}</h2>
          <div className="hero-ctas mt-8 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={onGetLive} className="hc-btn hc-primary" data-testid="cta-get-live"><span>Get live</span><Arrow /></button>
            <button type="button" onClick={onBookCall} className="hc-btn hc-secondary" data-testid="cta-book-call">Book a 15-minute call</button>
          </div>
          {str(d.compliance?.disclaimerLong) && <p className="mx-auto mt-8 max-w-xl text-[11px] leading-relaxed text-[#6b5f4c]">{d.compliance!.disclaimerLong}</p>}
        </div>
      </section>
      <div className="h-24" aria-hidden />
    </div>
  );
};
