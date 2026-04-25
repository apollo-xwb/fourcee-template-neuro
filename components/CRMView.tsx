import React, { useEffect, useMemo, useState } from 'react';
import fcWhite from '../public/assets/fcwhite.png';
import fcBlack from '../public/assets/fcblack.png';

interface CRMViewProps {
  isDarkMode?: boolean;
  /** Same source as audit (`content.json` → `business.name`). */
  businessName?: string;
}

type TranscriptLine = { speaker: string; line: string; at: string };

interface LeadLog {
  id: string;
  time: string;
  customerName: string;
  intent: string;
  status: string;
  transcript: TranscriptLine[];
}

interface SimulatedCall {
  id: string;
  customerName: string;
  phone: string;
  intent: string;
  status: 'active' | 'resolved';
  impact: string;
  startedAgo: string;
  transcript: TranscriptLine[];
}

type PortalTab = 'simulation' | 'overview';

const formatMoney = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const gridOnDark: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
  backgroundSize: '26px 26px',
};

const gridOnLightPanel: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(rgba(15,23,42,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.07) 1px, transparent 1px)',
  backgroundSize: '26px 26px',
};

function buildHistoryTranscript(customerName: string, intent: string, businessName: string): TranscriptLine[] {
  return [
    { speaker: 'Agent', line: `Thank you for calling ${businessName}. This is the concierge line.`, at: '00:01' },
    { speaker: 'Customer', line: `Hi - ${customerName} here. I'm calling about ${intent.toLowerCase()}.`, at: '00:06' },
    { speaker: 'Agent', line: "I've pulled your preferences from our last visit. I can hold inventory or book a specialist.", at: '00:14' },
    { speaker: 'Customer', line: "Let's book. What's the soonest private appointment?", at: '00:22' },
    { speaker: 'Agent', line: "I have tomorrow at 11:15 or Thursday at 3:00. I'll text you both options to confirm.", at: '00:30' },
    { speaker: 'Customer', line: 'Tomorrow works. Please send the confirmation.', at: '00:38' },
    { speaker: 'Agent', line: `Done - you're confirmed at ${businessName} for tomorrow 11:15. A calendar invite is on the way.`, at: '00:45' },
  ];
}

const GridWash: React.FC<{ style: React.CSSProperties; opacity?: string }> = ({ style, opacity = 'opacity-[0.18]' }) => (
  <div className={`pointer-events-none absolute inset-0 ${opacity}`} style={style} aria-hidden />
);

export const CRMView: React.FC<CRMViewProps> = ({ isDarkMode = true, businessName = 'PLACEHOLDER Business' }) => {
  const [activeTab, setActiveTab] = useState<PortalTab>('simulation');
  const [revenueSaved, setRevenueSaved] = useState(125500);
  const [appointmentsBooked, setAppointmentsBooked] = useState(48);
  const [logEntries, setLogEntries] = useState<LeadLog[]>([]);
  const [liveSeconds, setLiveSeconds] = useState(98);
  const [waveHeights, setWaveHeights] = useState<number[]>([12, 20, 15, 25, 14, 22, 10, 24, 16, 19, 12, 21]);
  const [selectedKey, setSelectedKey] = useState<string>('call-1');

  const simulatedNames = useMemo(
    () => [
      'Amelia Stone',
      'Noah Patel',
      'Harper Wellington',
      'Mason Brooks',
      'Sophia Vale',
      'Ethan Rhodes',
      'Olivia Sterling',
      'Liam Carter',
    ],
    []
  );

  const simulatedIntents = useMemo(
    () => [
      'Oval Diamond Query',
      'Halo Ring Consultation',
      'Emerald Cut Upgrade',
      'Lab-Grown Bridal Request',
      'Custom Setting Appointment',
      'Eye-Clean Diamond Clarification',
      '2.5ct Comparison Request',
    ],
    []
  );

  const calls = useMemo<SimulatedCall[]>(
    () => [
      {
        id: 'call-1',
        customerName: 'Amelia Stone',
        phone: '+1 (212) 555-0191',
        intent: 'Oval diamond comparison',
        status: 'active',
        impact: '$$$',
        startedAgo: '01:38',
        transcript: [
          { speaker: 'Agent', line: `Thank you for calling ${businessName}. How may I assist you?`, at: '00:02' },
          { speaker: 'Customer', line: 'I am looking for eye-clean ovals around 2 carats.', at: '00:08' },
          { speaker: 'Agent', line: 'Great choice. I can compare premium options for you right now.', at: '00:14' },
          { speaker: 'Customer', line: 'Can I come in today to view them in person?', at: '00:28' },
          { speaker: 'Agent', line: 'Yes. We have a 2 PM private slot available. Shall I secure it?', at: '00:38' },
          { speaker: 'Customer', line: 'Please do.', at: '00:45' },
          { speaker: 'Agent', line: "Wonderful - I've reserved 2 PM under your name. You'll receive a confirmation text shortly.", at: '00:52' },
          { speaker: 'Customer', line: 'Perfect. Thank you.', at: '00:58' },
          { speaker: 'Agent', line: `We'll have the stones ready in the private viewing room. We look forward to seeing you at ${businessName}.`, at: '01:04' },
          { speaker: 'Customer', line: 'See you then.', at: '01:10' },
        ],
      },
      {
        id: 'call-2',
        customerName: 'Noah Patel',
        phone: '+1 (917) 555-0107',
        intent: 'Custom halo redesign',
        status: 'active',
        impact: '$$',
        startedAgo: '00:52',
        transcript: [
          { speaker: 'Agent', line: `${businessName} concierge desk, how can I help?`, at: '00:01' },
          { speaker: 'Customer', line: 'I want to redesign my engagement ring into a halo setting.', at: '00:11' },
          { speaker: 'Agent', line: 'Understood. I can book you with our custom design specialist.', at: '00:19' },
          { speaker: 'Customer', line: 'This week if possible.', at: '00:26' },
          { speaker: 'Agent', line: 'I have Wednesday at 10 AM. Shall I lock that in?', at: '00:33' },
          { speaker: 'Customer', line: 'Yes, please.', at: '00:40' },
          { speaker: 'Agent', line: "You're set for Wednesday 10 AM with design. I'll email the prep checklist.", at: '00:48' },
        ],
      },
      {
        id: 'call-3',
        customerName: 'Harper Wellington',
        phone: '+1 (646) 555-0169',
        intent: 'Appointment booking',
        status: 'resolved',
        impact: '$',
        startedAgo: 'Resolved',
        transcript: [
          { speaker: 'Agent', line: `Welcome to ${businessName}, how may I assist?`, at: '00:02' },
          { speaker: 'Customer', line: 'I would like to book a viewing for Saturday.', at: '00:06' },
          { speaker: 'Agent', line: 'Done. You are confirmed for Saturday at 11 AM.', at: '00:15' },
        ],
      },
      {
        id: 'call-4',
        customerName: 'Sophia Vale',
        phone: '+1 (332) 555-0188',
        intent: 'Lab-grown bridal request',
        status: 'resolved',
        impact: '$$',
        startedAgo: 'Resolved',
        transcript: [
          { speaker: 'Agent', line: `Thank you for calling ${businessName}.`, at: '00:01' },
          { speaker: 'Customer', line: 'I am looking for a lab-grown bridal set under 15k.', at: '00:09' },
          { speaker: 'Agent', line: 'Perfect. I can shortlist options and send them over today.', at: '00:18' },
        ],
      },
    ],
    [businessName]
  );

  const activeCalls = useMemo(() => calls.filter((call) => call.status === 'active'), [calls]);
  const callHistory = useMemo(() => calls.filter((call) => call.status !== 'active'), [calls]);

  const displayConversation = useMemo(() => {
    if (selectedKey.startsWith('log:')) {
      const logId = selectedKey.slice(4);
      const entry = logEntries.find((e) => e.id === logId);
      if (entry) {
        return {
          id: entry.id,
          customerName: entry.customerName,
          intent: entry.intent,
          isLive: false,
          transcript: entry.transcript,
        };
      }
    }
    const call = calls.find((c) => c.id === selectedKey && !selectedKey.startsWith('log:')) ?? calls[0];
    return {
      id: call.id,
      customerName: call.customerName,
      intent: call.intent,
      isLive: call.status === 'active',
      transcript: call.transcript,
    };
  }, [selectedKey, logEntries, calls]);

  useEffect(() => {
    const pushLead = () => {
      const now = new Date();
      const customerName = simulatedNames[Math.floor(Math.random() * simulatedNames.length)];
      const intent = simulatedIntents[Math.floor(Math.random() * simulatedIntents.length)];
      const id = `${now.getTime()}-${Math.random()}`;

      setLogEntries((prev) =>
        [
          {
            id,
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            customerName,
            intent,
            status: '✅ Qualified & Booked',
            transcript: buildHistoryTranscript(customerName, intent, businessName),
          },
          ...prev,
        ].slice(0, 12)
      );
    };

    pushLead();
    const startDelayMs = 10000 + Math.floor(Math.random() * 5001);
    let nextTimeout: ReturnType<typeof setTimeout>;
    let timeoutCancelled = false;

    const schedule = (delayMs: number) => {
      nextTimeout = setTimeout(() => {
        if (timeoutCancelled) return;
        pushLead();
        schedule(10000 + Math.floor(Math.random() * 5001));
      }, delayMs);
    };

    schedule(startDelayMs);
    return () => {
      timeoutCancelled = true;
      clearTimeout(nextTimeout);
    };
  }, [simulatedIntents, simulatedNames, businessName]);

  useEffect(() => {
    const metricInterval = setInterval(() => {
      setRevenueSaved((prev) => prev + Math.floor(Math.random() * 1900) + 300);
      setAppointmentsBooked((prev) => prev + (Math.random() > 0.45 ? 1 : 0));
    }, 5000);
    return () => clearInterval(metricInterval);
  }, []);

  useEffect(() => {
    const liveTicker = setInterval(() => {
      setLiveSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(liveTicker);
  }, []);

  useEffect(() => {
    const waveInterval = setInterval(() => {
      setWaveHeights((prev) => prev.map(() => 10 + Math.round(Math.random() * 24)));
    }, 320);
    return () => clearInterval(waveInterval);
  }, []);

  const liveDuration = `${String(Math.floor(liveSeconds / 60)).padStart(2, '0')}:${String(liveSeconds % 60).padStart(2, '0')}`;

  const pageClass = isDarkMode ? 'text-[#E7E7E7]' : 'text-navy-900';
  const portalTitleClass = isDarkMode ? 'text-amber-200/90' : 'text-navy-800';
  const tabShellClass = isDarkMode
    ? 'rounded-full border border-white/10 bg-black/50 p-1 backdrop-blur-xl'
    : 'rounded-full border border-slate-200 bg-slate-100/95 p-1 shadow-sm';
  const tabActiveClass = isDarkMode
    ? 'bg-gradient-to-r from-slate-200 via-amber-200 to-slate-400 text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]'
    : 'bg-navy-900 text-white shadow-sm';
  const tabInactiveClass = isDarkMode ? 'text-white/70 hover:text-white' : 'text-navy-600 hover:text-navy-900';

  const heroClass = isDarkMode
    ? 'relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-black via-[#111111] to-[#1C1C1C] p-6 md:p-8 shadow-[0_20px_100px_rgba(0,0,0,0.65)]'
    : 'relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] md:p-8';
  const heroWashClass = isDarkMode
    ? 'absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(212,175,55,0.16),transparent_38%)]'
    : 'absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_80%_-10%,rgba(15,23,42,0.05),transparent_50%)]';

  const engineSubClass = isDarkMode ? 'text-slate-200' : 'text-navy-600';
  const syncBoxClass = isDarkMode
    ? 'relative z-10 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl'
    : 'relative z-10 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3';
  const syncLabelClass = isDarkMode ? 'text-white/60' : 'text-navy-500';
  const onlineClass = isDarkMode ? 'text-[#CCFF00]' : 'text-emerald-700';
  const onlineDotClass = isDarkMode ? 'bg-[#CCFF00]' : 'bg-emerald-600';

  const panelClass = isDarkMode
    ? 'relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
    : 'relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)]';
  const sectionHeadingClass = isDarkMode ? 'text-slate-200' : 'text-navy-800';
  const mutedClass = isDarkMode ? 'text-white/55' : 'text-navy-500';
  const callCardBase = isDarkMode
    ? 'border-white/10 bg-black/40 hover:border-white/20'
    : 'border-slate-200 bg-slate-50 hover:border-slate-300';
  const callCardSelected = isDarkMode ? 'border-amber-300/35 bg-amber-100/5' : 'border-navy-400 bg-navy-50';
  const callNameClass = isDarkMode ? 'text-white' : 'text-navy-900';
  const callIntentClass = isDarkMode ? 'text-white/70' : 'text-navy-600';
  const callPhoneClass = isDarkMode ? 'text-white/50' : 'text-navy-500';
  const impactLabelClass = isDarkMode ? 'text-white/50' : 'text-navy-500';
  const impactValueClass = isDarkMode ? 'text-amber-200' : 'text-navy-800';

  const historyRowClass = isDarkMode
    ? 'border-white/10 bg-black/40'
    : 'border-slate-200 bg-slate-50/90';
  const historyMutedClass = isDarkMode ? 'text-white/60' : 'text-navy-500';
  const historyNameClass = isDarkMode ? 'text-white' : 'text-navy-900';
  const historyIntentClass = isDarkMode ? 'text-white/80' : 'text-navy-700';
  const statusClass = isDarkMode ? 'text-emerald-300' : 'text-emerald-700';

  const asideClass = isDarkMode
    ? 'relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl'
    : 'relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)]';
  const transcriptShellClass = isDarkMode
    ? 'relative z-10 mt-4 rounded-2xl border border-white/10 bg-black/50 p-4'
    : 'relative z-10 mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4';
  const transcriptHeaderClass = isDarkMode
    ? 'flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2'
    : 'flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2';
  const transcriptMetaClass = isDarkMode ? 'text-white/60' : 'text-navy-500';
  const liveBadgeClass = isDarkMode ? 'text-emerald-300' : 'text-emerald-700';

  const voicePanelClass = isDarkMode
    ? 'mt-3 rounded-xl border border-white/10 bg-black/60 px-3 py-2'
    : 'mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2';
  const voiceLabelClass = isDarkMode ? 'text-white/50' : 'text-navy-500';

  const scrollAreaClass = isDarkMode
    ? 'mt-3 max-h-[340px] space-y-2 overflow-auto rounded-xl border border-white/10 bg-black/40 p-3'
    : 'mt-3 max-h-[340px] space-y-2 overflow-auto rounded-xl border border-slate-200 bg-white p-3';

  const bubbleLatestClass = isDarkMode
    ? 'border-emerald-300/35 bg-emerald-100/[0.04] shadow-[0_0_18px_rgba(16,185,129,0.2)]'
    : 'border-emerald-300/60 bg-emerald-50/90 shadow-sm';
  const bubbleDefaultClass = isDarkMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50';
  const agentLabelClass = isDarkMode ? 'text-slate-100' : 'text-navy-900';
  const customerLabelClass = isDarkMode ? 'text-blue-300' : 'text-blue-700';
  const timeSmallClass = isDarkMode ? 'text-white/45' : 'text-navy-400';
  const lineTextClass = isDarkMode ? 'text-white/85' : 'text-navy-800';

  const businessDisplay = businessName.toUpperCase();
  const gridForPanel = isDarkMode ? gridOnDark : gridOnLightPanel;

  return (
    <div className={`min-h-screen px-4 py-8 md:px-8 md:py-10 ${pageClass}`}>
      <div className="mx-auto w-full max-w-7xl">
        <p
          className={`text-center text-[10px] font-bold uppercase tracking-[0.42em] md:text-left ${
            isDarkMode ? 'text-slate-500' : 'text-navy-600'
          }`}
        >
          {businessDisplay}
        </p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className={`text-center text-xs font-semibold uppercase tracking-[0.35em] sm:text-left ${portalTitleClass}`}>
            Concierge Intelligence Portal
          </h1>
          <div className={`mx-auto sm:mx-0 ${tabShellClass}`}>
            {(['simulation', 'overview'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] transition ${
                  activeTab === tab ? tabActiveClass : tabInactiveClass
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="mx-auto mt-8 w-full max-w-7xl space-y-6">
          <div
            className={`relative overflow-hidden rounded-[2rem] border p-6 md:p-10 ${
              isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white shadow-md'
            }`}
          >
            <GridWash style={gridForPanel} opacity={isDarkMode ? 'opacity-[0.2]' : 'opacity-[0.35]'} />
            <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-[0.3em] ${isDarkMode ? 'text-amber-200/80' : 'text-navy-600'}`}>
                  Executive overview
                </p>
                <h2 className={`mt-2 font-serif text-3xl font-semibold tracking-tight md:text-4xl ${isDarkMode ? 'text-white' : 'text-navy-900'}`}>
                  Concierge performance at a glance
                </h2>
                <p className={`mt-3 max-w-xl text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-navy-600'}`}>
                  Live funnel health, revenue impact, and handling efficiency - synced with your showroom routing rules.
                </p>
              </div>
              <div
                className={`flex flex-wrap gap-3 rounded-2xl border px-4 py-3 ${
                  isDarkMode ? 'border-emerald-500/25 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50'
                }`}
              >
                <div>
                  <p className={`text-[9px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-emerald-200/80' : 'text-emerald-800'}`}>
                    Sync status
                  </p>
                  <p className={`mt-1 text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-navy-900'}`}>All channels nominal</p>
                </div>
                <div className={`hidden h-10 w-px sm:block ${isDarkMode ? 'bg-white/15' : 'bg-emerald-200'}`} />
                <div>
                  <p className={`text-[9px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-emerald-200/80' : 'text-emerald-800'}`}>
                    Last refresh
                  </p>
                  <p className={`mt-1 text-sm font-semibold tabular-nums ${isDarkMode ? 'text-white' : 'text-navy-900'}`}>Just now</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <OverviewCard
              title="Revenue Saved"
              value={formatMoney(revenueSaved)}
              hint="Attribution from recovered high-intent calls"
              isDarkMode={isDarkMode}
            />
            <OverviewCard
              title="Appointments Booked (AI)"
              value={appointmentsBooked.toString()}
              hint="Qualified slots confirmed without staff lift"
              isDarkMode={isDarkMode}
            />
            <OverviewCard
              title="Average Handling Time"
              value="1.2 Mins"
              hint="Median duration - voice + wrap-up"
              isDarkMode={isDarkMode}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div
              className={`relative overflow-hidden rounded-3xl border p-6 ${
                isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'
              }`}
            >
              <GridWash style={gridForPanel} />
              <div className="relative z-10">
                <h3 className={`text-sm font-semibold uppercase tracking-[0.28em] ${sectionHeadingClass}`}>Pipeline mix</h3>
                <p className={`mt-2 text-xs ${mutedClass}`}>Illustrative split of concierge-touched outcomes this period.</p>
                <div className="mt-6 space-y-4">
                  {[
                    { label: 'Booked consults', pct: 62 },
                    { label: 'Qualified, follow-up', pct: 24 },
                    { label: 'Service / repair triage', pct: 14 },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="flex justify-between text-xs">
                        <span className={callNameClass}>{row.label}</span>
                        <span className={mutedClass}>{row.pct}%</span>
                      </div>
                      <div className={`mt-2 h-2.5 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}`}>
                        <div
                          className={`h-full rounded-full ${isDarkMode ? 'bg-gradient-to-r from-amber-400 to-amber-200' : 'bg-gradient-to-r from-navy-800 to-navy-600'}`}
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div
              className={`relative overflow-hidden rounded-3xl border p-6 ${
                isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'
              }`}
            >
              <GridWash style={gridForPanel} />
              <div className="relative z-10">
                <h3 className={`text-sm font-semibold uppercase tracking-[0.28em] ${sectionHeadingClass}`}>Operational notes</h3>
                <ul className={`mt-4 space-y-3 text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-navy-700'}`}>
                  <li className="flex gap-2">
                    <span className={isDarkMode ? 'text-amber-200' : 'text-navy-900'}>•</span>
                    After-hours capture is outperforming weekday lunch dips - consider promoting SMS handoff.
                  </li>
                  <li className="flex gap-2">
                    <span className={isDarkMode ? 'text-amber-200' : 'text-navy-900'}>•</span>
                    Custom design intents convert highest when a specialist slot is offered within 48 hours.
                  </li>
                  <li className="flex gap-2">
                    <span className={isDarkMode ? 'text-amber-200' : 'text-navy-900'}>•</span>
                    Average handle time remains under target; no staffing alerts this week.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto mt-8 flex w-full max-w-7xl flex-col gap-6">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Revenue Saved" value={formatMoney(revenueSaved)} isDarkMode={isDarkMode} variant="top" />
            <MetricCard label="Appointments Booked (AI)" value={appointmentsBooked.toString()} isDarkMode={isDarkMode} variant="top" />
            <MetricCard label="Average Handling Time" value="1.2 Mins" isDarkMode={isDarkMode} variant="top" />
          </div>

          <header className={`${heroClass} relative overflow-hidden`}>
            <div className={heroWashClass} />
            <GridWash style={gridOnDark} opacity={isDarkMode ? 'opacity-[0.12]' : 'opacity-0'} />
            {!isDarkMode && <GridWash style={gridOnLightPanel} opacity="opacity-[0.25]" />}
            <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <img src={isDarkMode ? fcWhite : fcBlack} alt="Fourcee" className="mt-2 h-10 w-auto object-contain md:h-12" />
                <p className={`mt-2 text-sm font-medium tracking-wide md:text-base ${engineSubClass}`}>Concierge Intelligence Engine</p>
              </div>
              <div className={syncBoxClass}>
                <p className={`text-[10px] uppercase tracking-[0.28em] ${syncLabelClass}`}>Concierge Brain Sync</p>
                <div className={`mt-2 flex items-center gap-2 text-sm font-semibold ${onlineClass}`}>
                  <span className={`h-2.5 w-2.5 rounded-full animate-pulse ${onlineDotClass}`} />
                  Online
                </div>
              </div>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <section className={panelClass}>
              <GridWash style={gridForPanel} />
              <div className="relative z-10">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className={`text-sm font-semibold uppercase tracking-[0.3em] ${sectionHeadingClass}`}>Current Concierge Calls</h3>
                  <p className={`text-[10px] uppercase tracking-[0.25em] ${mutedClass}`}>{activeCalls.length} live</p>
                </div>
                <div className="space-y-3">
                  {activeCalls.map((call) => (
                    <button
                      key={call.id}
                      type="button"
                      onClick={() => setSelectedKey(call.id)}
                      className={`grid w-full gap-2 rounded-2xl border p-4 text-left text-xs transition md:grid-cols-[1fr_auto] ${
                        selectedKey === call.id ? callCardSelected : callCardBase
                      }`}
                    >
                      <div>
                        <p className={`font-semibold ${callNameClass}`}>{call.customerName}</p>
                        <p className={`mt-1 ${callIntentClass}`}>{call.intent}</p>
                        <p className={`mt-1 ${callPhoneClass}`}>{call.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-[10px] uppercase tracking-[0.2em] ${impactLabelClass}`}>Impact</p>
                        <p className={`mt-1 font-semibold ${impactValueClass}`}>{call.impact}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-6 mb-4 flex items-center justify-between">
                  <h3 className={`text-sm font-semibold uppercase tracking-[0.3em] ${sectionHeadingClass}`}>Concierge Call History</h3>
                  <p className={`text-[10px] uppercase tracking-[0.25em] ${mutedClass}`}>Recent</p>
                </div>
                <div className="space-y-2">
                  {logEntries.map((entry) => {
                    const logKey = `log:${entry.id}`;
                    const selected = selectedKey === logKey;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setSelectedKey(logKey)}
                        className={`grid w-full gap-2 rounded-2xl border p-4 text-left text-xs transition md:grid-cols-[0.7fr_1fr_1.4fr_1fr] ${
                          selected ? callCardSelected : historyRowClass
                        }`}
                      >
                        <span className={historyMutedClass}>{entry.time}</span>
                        <span className={`font-medium ${historyNameClass}`}>{entry.customerName}</span>
                        <span className={historyIntentClass}>{entry.intent}</span>
                        <span className={`font-medium ${statusClass}`}>{entry.status}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 space-y-2">
                  {callHistory.map((call) => (
                    <button
                      key={call.id}
                      type="button"
                      onClick={() => setSelectedKey(call.id)}
                      className={`grid w-full gap-2 rounded-2xl border p-3 text-left text-xs transition md:grid-cols-[1fr_auto] ${
                        selectedKey === call.id ? callCardSelected : callCardBase
                      }`}
                    >
                      <div>
                        <p className={`font-medium ${callNameClass}`}>{call.customerName}</p>
                        <p className={`mt-1 ${historyMutedClass}`}>{call.intent}</p>
                      </div>
                      <span className={`self-center text-[10px] uppercase tracking-[0.2em] ${impactLabelClass}`}>Resolved</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <aside className={asideClass}>
              <GridWash style={gridForPanel} />
              <div className="relative z-10">
                <h3 className={`text-sm font-semibold uppercase tracking-[0.3em] ${sectionHeadingClass}`}>AI Concierge Conversation Transcript</h3>
                <div className={transcriptShellClass}>
                  <div className={transcriptHeaderClass}>
                    <div>
                      <p className={`text-xs font-semibold ${callNameClass}`}>{displayConversation.customerName}</p>
                      <p className={`text-[10px] uppercase tracking-[0.2em] ${transcriptMetaClass}`}>{displayConversation.intent}</p>
                    </div>
                    <span className={`text-xs font-semibold ${liveBadgeClass}`}>
                      {displayConversation.isLive ? `LIVE ${liveDuration}` : 'ENDED'}
                    </span>
                  </div>

                  <div className={voicePanelClass}>
                    <p className={`text-[10px] uppercase tracking-[0.2em] ${voiceLabelClass}`}>Voice activity</p>
                    <div className="mt-2 flex h-10 items-end gap-1">
                      {waveHeights.map((h, i) => (
                        <span
                          // eslint-disable-next-line react/no-array-index-key
                          key={i}
                          className={
                            isDarkMode
                              ? `w-1.5 rounded-full ${
                                  i % 3 === 0
                                    ? 'bg-gradient-to-t from-emerald-500/30 to-emerald-300'
                                    : i % 2 === 0
                                      ? 'bg-gradient-to-t from-amber-500/35 to-amber-300'
                                      : 'bg-gradient-to-t from-slate-500/35 to-slate-200'
                                }`
                              : `w-1.5 rounded-full ${
                                  i % 3 === 0 ? 'bg-emerald-500/70' : i % 2 === 0 ? 'bg-navy-400/60' : 'bg-slate-300'
                                }`
                          }
                          style={{ height: `${h}px` }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className={scrollAreaClass}>
                    {displayConversation.transcript.map((row, idx) => {
                      const isLatest =
                        displayConversation.isLive && idx === displayConversation.transcript.length - 1;
                      return (
                        <div
                          key={`${displayConversation.id}-${idx}`}
                          className={`rounded-lg border p-2.5 transition ${isLatest ? bubbleLatestClass : bubbleDefaultClass}`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[11px] font-semibold ${row.speaker === 'Agent' ? agentLabelClass : customerLabelClass}`}
                            >
                              {row.speaker}
                            </span>
                            <span className={`text-[10px] ${timeSmallClass}`}>{row.at}</span>
                          </div>
                          <p className={`mt-1 text-sm leading-relaxed ${lineTextClass}`}>
                            {row.line}
                            {isLatest && (
                              <span
                                className={`ml-1 inline-block h-2 w-2 animate-pulse rounded-full ${
                                  isDarkMode ? 'bg-emerald-300' : 'bg-emerald-600'
                                }`}
                              />
                            )}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string; isDarkMode: boolean; variant?: 'default' | 'top' }> = ({
  label,
  value,
  isDarkMode,
  variant = 'default',
}) => {
  const isTop = variant === 'top';

  const shell = (() => {
    if (isTop && isDarkMode) {
      return 'relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl';
    }
    if (isTop && !isDarkMode) {
      return 'relative overflow-hidden rounded-3xl border border-navy-800/40 bg-[#071a2e] p-5 text-white shadow-[0_14px_40px_rgba(7,26,46,0.25)]';
    }
    if (isDarkMode) {
      return 'rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl';
    }
    return 'rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.05)]';
  })();

  const labelCls =
    isTop && !isDarkMode
      ? 'text-[10px] uppercase tracking-[0.28em] text-white/70'
      : isDarkMode
        ? 'text-[10px] uppercase tracking-[0.28em] text-white/60'
        : 'text-[10px] uppercase tracking-[0.28em] text-navy-600';

  const valueCls =
    isTop && !isDarkMode
      ? 'mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl'
      : isDarkMode
        ? 'mt-3 text-2xl font-semibold tracking-tight text-amber-200 md:text-3xl'
        : 'mt-3 text-2xl font-semibold tracking-tight text-navy-900 md:text-3xl';

  const showGrid = isTop;

  return (
    <div className={shell}>
      {showGrid && (
        <GridWash style={gridOnDark} opacity={isTop && !isDarkMode ? 'opacity-[0.22]' : 'opacity-[0.14]'} />
      )}
      <div className={showGrid ? 'relative z-10' : undefined}>
        <p className={labelCls}>{label}</p>
        <p className={valueCls}>{value}</p>
      </div>
    </div>
  );
};

const OverviewCard: React.FC<{ title: string; value: string; hint: string; isDarkMode: boolean }> = ({
  title,
  value,
  hint,
  isDarkMode,
}) => (
  <div
    className={`relative overflow-hidden rounded-3xl border p-6 ${
      isDarkMode
        ? 'border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)]'
        : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.08)]'
    }`}
  >
    <GridWash style={isDarkMode ? gridOnDark : gridOnLightPanel} opacity={isDarkMode ? 'opacity-[0.18]' : 'opacity-[0.4]'} />
    <div className="relative z-10">
      <p className={`text-[10px] uppercase tracking-[0.28em] ${isDarkMode ? 'text-white/60' : 'text-navy-600'}`}>{title}</p>
      <p className={`mt-3 text-3xl font-semibold tracking-tight ${isDarkMode ? 'text-amber-200' : 'text-navy-900'}`}>{value}</p>
      <p className={`mt-3 text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-navy-600'}`}>{hint}</p>
    </div>
  </div>
);
