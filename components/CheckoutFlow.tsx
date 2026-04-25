
import React, { useEffect, useState } from 'react';
import { PACKAGES, UPSELLS } from '../constants.tsx';
import { CheckoutState } from '../types';
import fcShad from '../public/assets/fcshad.png';
interface CheckoutFlowProps {
  isDarkMode?: boolean;
  initialPackageId?: string | null;
}

const LEGACY_PACKAGE_IDS: Record<string, string> = { premium: 'pro' };

export const CheckoutFlow: React.FC<CheckoutFlowProps> = ({ isDarkMode = false, initialPackageId }) => {
  const normalizedInitial =
    initialPackageId && LEGACY_PACKAGE_IDS[initialPackageId]
      ? LEGACY_PACKAGE_IDS[initialPackageId]
      : initialPackageId;
  const resolvedInitialId =
    normalizedInitial && PACKAGES.some((p) => p.id === normalizedInitial) ? normalizedInitial : PACKAGES[1].id;
  const [state, setState] = useState<CheckoutState>({
    packageId: resolvedInitialId,
    upsells: [],
    form: {},
    step: 1,
    billingCycle: 'monthly',
  });
  const [companyName, setCompanyName] = useState('PLACEHOLDER Business');

  useEffect(() => {
    let mounted = true;
    fetch('/content.json')
      .then((res) => res.json())
      .then((data: { business?: { name?: string } }) => {
        if (!mounted) return;
        const incomingName = data?.business?.name?.trim();
        if (!incomingName) return;
        setCompanyName((current) =>
          current && current !== 'PLACEHOLDER Business' ? current : incomingName
        );
      })
      .catch(() => {
        // Keep placeholder if audit data is unavailable.
      });
    return () => {
      mounted = false;
    };
  }, []);

  const selectedPackage = PACKAGES.find(p => p.id === state.packageId)!;
  const upsellTotal = UPSELLS.filter(u => state.upsells.includes(u.id)).reduce((acc, curr) => acc + (curr.price || 0), 0);
  const upsellMonthlyTotal = UPSELLS.filter(u => state.upsells.includes(u.id))
    .reduce((acc, u) => acc + (('monthlyPrice' in u && (u as { monthlyPrice?: number }).monthlyPrice) || 0), 0);
  /** Due today: annual = yearly + one-time upsells (setup waived). Monthly = setup + first month + monthly upsells + one-time upsells */
  const total =
    state.billingCycle === 'annual'
      ? selectedPackage.yearlyPrice + upsellTotal
      : selectedPackage.price + selectedPackage.monthly + upsellMonthlyTotal + upsellTotal;
  const monthlyTotal = selectedPackage.monthly + upsellMonthlyTotal;

  const nextStep = () => setState(s => ({ ...s, step: s.step + 1 }));
  const prevStep = () => setState(s => ({ ...s, step: Math.max(1, s.step - 1) }));

  const handleUpsellToggle = (id: string) => {
    setState(s => ({
      ...s,
      upsells: s.upsells.includes(id) ? s.upsells.filter(u => u !== id) : [...s.upsells, id]
    }));
  };

  const renderStep = () => {
    switch (state.step) {
      case 1:
        return (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold serif text-navy-900 dark:text-white">
                Get Live in 2 Hours - Choose Your Plan
              </h2>
              <p className="mt-3 text-sm text-navy-600 dark:text-navy-400 leading-relaxed">
                Setup takes less than 2 hours. Once active, you&apos;ll never lose another client to a missed call again.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-navy-700 dark:text-navy-300">
                Billing
              </span>
              <div className="inline-flex rounded-full border border-silver-200 dark:border-navy-700 p-1">
                <button
                  type="button"
                  onClick={() => setState((s) => ({ ...s, billingCycle: 'monthly' }))}
                  className={`rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition ${
                    state.billingCycle === 'monthly'
                      ? 'bg-navy-900 text-white dark:bg-white dark:text-navy-950'
                      : 'text-navy-600 dark:text-navy-400'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setState((s) => ({ ...s, billingCycle: 'annual' }))}
                  className={`rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition ${
                    state.billingCycle === 'annual'
                      ? 'bg-navy-900 text-white dark:bg-white dark:text-navy-950'
                      : 'text-navy-600 dark:text-navy-400'
                  }`}
                >
                  Annual
                </button>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-navy-700 dark:text-navy-300 mb-4">Voice Tier</p>
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[...PACKAGES]
                  .sort((a, b) => b.monthly - a.monthly)
                  .map(pkg => (
                  <div 
                    key={pkg.id}
                    onClick={() => setState(s => ({ ...s, packageId: pkg.id }))}
                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${state.packageId === pkg.id ? 'border-navy-900 dark:border-white bg-white dark:bg-navy-900 shadow-xl' : 'border-silver-200 dark:border-navy-800 hover:border-navy-300'}`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-navy-700 dark:text-navy-300 mb-2">{pkg.name}</p>
                    <p className="text-2xl sm:text-3xl font-bold serif text-navy-900 dark:text-white">
                      {state.billingCycle === 'annual' ? `$${pkg.yearlyPrice.toLocaleString()}` : `$${pkg.monthly.toLocaleString()}`}
                      <span className="text-lg font-sans font-semibold">{state.billingCycle === 'annual' ? '/yr' : '/mo'}</span>
                    </p>
                    <div className="mt-3 space-y-2 rounded-xl border border-silver-200/80 bg-silver-50/70 p-3 dark:border-navy-700 dark:bg-navy-900/40">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setState((s) => ({ ...s, billingCycle: 'monthly' }));
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition ${
                          state.billingCycle === 'monthly'
                            ? 'bg-navy-900 text-white dark:bg-white dark:text-navy-950'
                            : 'text-navy-700 dark:text-navy-300'
                        }`}
                      >
                        <span>Monthly</span>
                        <span>${pkg.monthly.toLocaleString()}/mo + ${pkg.price.toLocaleString()} setup</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setState((s) => ({ ...s, billingCycle: 'annual' }));
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition ${
                          state.billingCycle === 'annual'
                            ? 'bg-navy-900 text-white dark:bg-white dark:text-navy-950'
                            : 'text-navy-700 dark:text-navy-300'
                        }`}
                      >
                        <span>Annual</span>
                        <span>${pkg.yearlyPrice.toLocaleString()}/yr · no setup</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-navy-500 dark:text-navy-500 mt-2">{pkg.description}</p>
                    <ul className="text-xs space-y-2 text-navy-800 dark:text-navy-400 mt-4">
                      {pkg.features.map(f => <li key={f} className="flex items-start gap-2"><span className="text-navy-900 dark:text-white shrink-0">✓</span> {f}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {UPSELLS.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-navy-700 dark:text-navy-300 mb-4">Optional Capabilities</p>
              <div className="space-y-4">
                {[...UPSELLS]
                  .sort((a, b) => ((b as { monthlyPrice?: number }).monthlyPrice ?? 0) - ((a as { monthlyPrice?: number }).monthlyPrice ?? 0))
                  .map(u => {
                  const isChecked = state.upsells.includes(u.id);
                  const isUnifiedChat = u.id === 'unified_chat';
                  const features = 'features' in u ? (u as { features?: string[] }).features : undefined;
                  return (
                    <label
                      key={u.id}
                      className={`flex items-start gap-4 cursor-pointer group block p-5 sm:p-6 rounded-2xl border-2 transition-all ${
                        isUnifiedChat
                          ? 'bg-gradient-to-br from-navy-50 to-white dark:from-navy-900/60 dark:to-navy-950/80 border-navy-200 dark:border-white/20'
                          : 'bg-white dark:bg-navy-900/40 border-silver-100 dark:border-navy-800'
                      } ${isChecked ? 'ring-2 ring-navy-900 dark:ring-white ring-offset-2 dark:ring-offset-navy-950' : ''}`}
                    >
                      <div className="relative flex-shrink-0 mt-0.5">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => handleUpsellToggle(u.id)}
                          className="sr-only peer"
                        />
                        <div className={`w-6 h-6 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                          isChecked 
                            ? 'bg-navy-900 dark:bg-white border-navy-900 dark:border-white' 
                            : 'bg-transparent border-navy-300 dark:border-navy-600 group-hover:border-navy-400'
                        }`}>
                          {isChecked && (
                            <svg className="w-4 h-4 text-white dark:text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="font-bold text-base text-navy-900 dark:text-white">{u.name}</p>
                          {isUnifiedChat && (
                            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-navy-900/10 dark:bg-white/10 text-navy-600 dark:text-navy-300">
                              Concierge
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-navy-700 dark:text-navy-400 leading-relaxed">{u.description}</p>
                        {features && features.length > 0 && (
                          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-navy-700 dark:text-navy-400">
                            {features.map((f, i) => (
                              <li key={i} className="flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-navy-400 dark:bg-navy-500" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <span className="font-bold text-base text-navy-900 dark:text-white flex-shrink-0 ml-4 text-right">
                        {u.price ? `+$${u.price}` : null}
                        {'monthlyPrice' in u && (u as { monthlyPrice?: number }).monthlyPrice ? (
                          <span className="block text-xs font-medium text-navy-700 dark:text-navy-400 mt-0.5">
                            ${(u as { monthlyPrice: number }).monthlyPrice}/mo
                          </span>
                        ) : u.price ? (
                          <span className="block text-xs font-medium text-navy-700 dark:text-navy-400 mt-0.5">one-time</span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            )}
          </div>
        );
      case 2:
        return (
          <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-right duration-500">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold serif text-navy-900 dark:text-white">Business Details</h2>
              <p className="mt-3 text-sm text-navy-600 dark:text-navy-400 leading-relaxed">
                We use this to tailor your onboarding and connect your existing tools. Your data is never shared.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white dark:bg-navy-900/40 p-6 sm:p-8 rounded-3xl border border-silver-100 dark:border-navy-800">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase block mb-2 text-navy-700 dark:text-navy-300">Company / Showroom Name</label>
                <input
                  className="w-full p-4 rounded-xl border border-silver-200 dark:border-navy-700 dark:bg-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-navy-900 dark:focus:ring-white"
                  placeholder="E.g. Royal Diamonds Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase block mb-2 text-navy-700 dark:text-navy-300">Primary Contact</label>
                <input className="w-full p-4 rounded-xl border border-silver-200 dark:border-navy-700 dark:bg-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-navy-900 dark:focus:ring-white" placeholder="Full name" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase block mb-2 text-navy-700 dark:text-navy-300">Email</label>
                <input type="email" className="w-full p-4 rounded-xl border border-silver-200 dark:border-navy-700 dark:bg-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-navy-900 dark:focus:ring-white" placeholder="you@showroom.com" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase block mb-2 text-navy-700 dark:text-navy-300">Primary CRM</label>
                <select className="w-full p-4 rounded-xl border border-silver-200 dark:border-navy-700 dark:bg-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-navy-900 dark:focus:ring-white">
                  <option value="">Select your CRM</option>
                  <option>HubSpot</option>
                  <option>Salesforce</option>
                  <option>Zoho CRM</option>
                  <option>Pipedrive</option>
                  <option>GoHighLevel</option>
                  <option>None / Custom</option>
                </select>
                <p className="mt-1.5 text-xs text-navy-500 dark:text-navy-400">We&apos;ll sync call summaries and lead data here.</p>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="max-w-md mx-auto space-y-6 animate-in zoom-in duration-500">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold serif text-navy-900 dark:text-white">Secure Payment</h2>
              <p className="mt-3 text-sm text-navy-600 dark:text-navy-400 leading-relaxed">
                {state.billingCycle === 'annual'
                  ? 'Annual plan: pay today, then renew each year. One-time setup fee waived when you pay annually.'
                  : 'One-time setup + first month + any add-ons due today. Setup is waived if you switch to annual billing on the previous step.'}
              </p>
            </div>
            <div className="bg-white dark:bg-navy-900/40 p-8 sm:p-10 rounded-3xl shadow-xl border border-silver-100 dark:border-navy-800">
              <div className="mb-8 pb-6 border-b border-navy-100 dark:border-navy-800">
                <p className="text-[10px] font-bold uppercase text-navy-700 dark:text-navy-300 mb-1">Due Today</p>
                <p className="text-4xl sm:text-5xl font-bold serif text-navy-900 dark:text-white">${total.toLocaleString()}</p>
                <p className="text-xs text-navy-700 dark:text-navy-400 mt-2">
                  {state.billingCycle === 'annual' ? (
                    <>Setup fee waived · yearly subscription</>
                  ) : (
                    <>
                      Includes ${selectedPackage.price.toLocaleString()} setup + first month (${selectedPackage.monthly}) + add-ons.
                      Then <span className="font-semibold">${monthlyTotal.toLocaleString()}/mo</span> ongoing.
                    </>
                  )}
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase block mb-1.5 text-navy-700 dark:text-navy-300">Card number</label>
                  <input className="w-full p-4 rounded-xl border border-silver-200 dark:border-navy-700 dark:bg-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-navy-900 dark:focus:ring-white" placeholder="4242 4242 4242 4242" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-1.5 text-navy-700 dark:text-navy-300">Expiry</label>
                    <input className="w-full p-4 rounded-xl border border-silver-200 dark:border-navy-700 dark:bg-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-navy-900 dark:focus:ring-white" placeholder="MM/YY" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-1.5 text-navy-700 dark:text-navy-300">CVC</label>
                    <input className="w-full p-4 rounded-xl border border-silver-200 dark:border-navy-700 dark:bg-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-navy-900 dark:focus:ring-white" placeholder="123" />
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-center text-navy-600 dark:text-navy-500 uppercase tracking-widest">PCI-compliant. Powered by Fourcee Secure Vault.</p>
          </div>
        );
      case 4:
        return (
          <div className="text-center space-y-6 py-16 sm:py-20 animate-in bounce-in duration-700">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto text-5xl">✓</div>
            <h2 className="text-3xl sm:text-4xl font-bold serif text-navy-900 dark:text-white">Deployment Started</h2>
            <p className="text-lg sm:text-xl text-navy-700 dark:text-navy-300 max-w-lg mx-auto leading-relaxed">
              Your tailored voice model is now in fabrication. Expect a reach-out within 2 hours to confirm your onboarding timeline and workshop slot.
            </p>
            <p className="text-sm text-navy-500 dark:text-navy-400 max-w-md mx-auto">
              Check your inbox for deployment details and next steps.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-10 py-4 bg-navy-900 dark:bg-white text-white dark:text-navy-950 rounded-full font-bold text-xs uppercase tracking-widest hover:shadow-2xl transition-all"
            >
              Return to Showroom
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="pt-24 pb-40 md:pb-36 px-6 bg-transparent transition-colors">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-center mb-10">
          <img
            src={fcShad}
            alt="Fourcee mark"
            className={`h-10 md:h-12 object-contain ${isDarkMode ? 'invert' : ''}`}
          />
        </div>
        {state.step < 4 && (
          <div className="flex justify-between items-center mb-16 px-4">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex-1 flex flex-col items-center gap-3 relative">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-md ${state.step >= s ? 'bg-navy-900 dark:bg-white text-white dark:text-navy-950' : 'bg-silver-100 dark:bg-navy-800 text-navy-300'}`}>
                  {s}
                </div>
                <span className={`text-[10px] uppercase tracking-[0.2em] font-bold ${state.step >= s ? 'text-navy-900 dark:text-white' : 'text-navy-500 dark:text-navy-300'}`}>
                  {s === 1 ? 'Configure' : s === 2 ? 'Details' : 'Checkout'}
                </span>
                {s < 3 && <div className={`absolute top-6 left-[60%] w-[80%] h-[2px] ${state.step > s ? 'bg-navy-900 dark:bg-white' : 'bg-silver-100 dark:bg-navy-800'}`} />}
              </div>
            ))}
          </div>
        )}
        
        {renderStep()}

        {state.step < 4 && (
          <div className="mt-16 flex justify-between items-center relative z-30 min-h-[72px] pb-24 sm:pb-20">
            <button 
              type="button"
              onClick={prevStep}
              disabled={state.step === 1}
              className={`text-navy-600 dark:text-navy-500 font-bold text-[10px] uppercase tracking-widest hover:text-navy-900 dark:hover:text-white transition-colors ${state.step === 1 ? 'opacity-0 pointer-events-none' : ''}`}
            >
              ← Prev
            </button>
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                nextStep();
              }}
              className="bg-navy-900 dark:bg-white text-white dark:text-navy-950 px-12 py-5 rounded-full font-bold text-xs uppercase tracking-[0.2em] hover:shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 select-none touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {state.step === 3 ? `Authorize $${total.toLocaleString()}` : 'Forward →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
