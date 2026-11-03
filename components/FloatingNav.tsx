import React from 'react';
import { Menu } from 'lucide-react';
import { AppView } from '../types';

/** Slightly thinner strokes for a lighter nav read */
const sw = 1.35;

interface FloatingNavProps {
  onNavigate: (view: AppView) => void;
  currentView: AppView;
  toggleDarkMode?: () => void;
  isDarkMode?: boolean;
  onOpenMenu?: () => void;
  onBookMeeting?: () => void;
  portalNotifCount?: number;
  showPortalGuide?: boolean;
  onDismissPortalGuide?: () => void;
  onHidePortalGuideForever?: () => void;
  onReopenPortalGuide?: () => void;
  onStartSetup?: () => void;
}

/**
 * SpaceX / Grok-simple dock: few clear actions, generous tap targets.
 * Secondary destinations (Ops, walkthrough, ROI) live in the side menu. Light theme only.
 */
export const FloatingNav: React.FC<FloatingNavProps> = ({
  onNavigate,
  currentView,
  isDarkMode = false,
  onOpenMenu,
  onBookMeeting,
  portalNotifCount = 0,
  showPortalGuide = false,
  onDismissPortalGuide,
  onHidePortalGuideForever,
  onStartSetup,
}) => {
  const isActive = (view: AppView) => currentView === view;
  const iconBtn = isDarkMode
    ? 'text-white/90 hover:text-white hover:bg-white/10'
    : 'text-navy-800 hover:text-navy-950 hover:bg-navy-900/5';

  const homeActive = isActive(AppView.LANDING);
  const auditActive = isActive(AppView.LEAD_MAGNET);

  return (
    <div className="nav-floating animate-in slide-in-from-bottom duration-700 w-full max-w-[calc(100vw-1.5rem)] sm:max-w-none">
      <div className="relative liquid-glass-dock shadow-2xl rounded-full pl-2 pr-2 sm:pl-3 sm:pr-3 py-2 sm:py-2.5 flex items-center justify-center gap-1 sm:gap-2 transition-all mx-auto w-fit max-w-full">
        <div className="pointer-events-none absolute inset-0 rounded-full border border-amber-300/25" />

        {/* 1 · Menu (side drawer holds the rest) */}
        {onOpenMenu && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={onOpenMenu}
              className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-colors sm:h-12 sm:w-12 ${iconBtn}`}
              aria-label="Open menu"
              title="Menu"
            >
              <Menu className="h-5 w-5" />
              {portalNotifCount > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {portalNotifCount}
                </span>
              )}
            </button>
            {showPortalGuide && (
              <div
                className="absolute bottom-[calc(100%+0.5rem)] left-0 w-[min(78vw,280px)] rounded-2xl border border-[#d9c39a]/70 bg-white/95 shadow-2xl p-3 z-10 pointer-events-auto"
                role="dialog"
                aria-label="Portal walkthrough"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-[0.23em] text-[#7a6648] dark:text-amber-200/80">
                    Portal tip
                  </p>
                  <button
                    type="button"
                    onClick={onDismissPortalGuide}
                    className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-navy-600 dark:text-slate-300 hover:bg-navy-900/5 dark:hover:bg-white/10"
                    aria-label="Dismiss walkthrough"
                  >
                    ✕
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-navy-800 dark:text-slate-200 leading-relaxed">
                  {onStartSetup
                    ? 'Five quick questions about your phones, then we suggest a setup.'
                    : 'Menu opens Ops, walkthrough, and ROI tools. Dock stays clear for the journey.'}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={onStartSetup ?? onDismissPortalGuide}
                    className="rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] bg-navy-900 text-white dark:bg-white dark:text-navy-950"
                    data-testid="portal-tip-primary"
                  >
                    {onStartSetup ? 'Start setup' : 'Got it'}
                  </button>
                  <button
                    type="button"
                    onClick={onHidePortalGuideForever}
                    className="rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] border border-navy-200 dark:border-white/20 text-navy-700 dark:text-slate-200"
                  >
                    Don&apos;t show again
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2 · Home */}
        <DockItem
          label="Home"
          active={homeActive}
          isDarkMode={isDarkMode}
          onClick={() => onNavigate(AppView.LANDING)}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={sw}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          }
        />

        {/* 3 · Audit */}
        <DockItem
          label="Audit"
          active={auditActive}
          isDarkMode={isDarkMode}
          onClick={() => onNavigate(AppView.LEAD_MAGNET)}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={sw}
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          }
        />

        <div className="w-px h-6 bg-navy-200 dark:bg-white/20 mx-0.5 sm:mx-1 shrink-0" />

        {/* 4 · Book */}
        {onBookMeeting && (
          <button
            type="button"
            onClick={onBookMeeting}
            className={`inline-flex h-11 sm:h-12 items-center px-3.5 sm:px-4 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] shrink-0 border border-dashed border-[#d4af37] transition-all hover:scale-[1.03] active:scale-95 ${
              isDarkMode ? 'text-white/95 bg-white/5' : 'text-navy-900 bg-navy-900/[0.03]'
            }`}
          >
            Book
          </button>
        )}

        {/* 5 · Primary CTA */}
        <button
          type="button"
          onClick={() => onNavigate(AppView.CHECKOUT)}
          className={`h-11 sm:h-12 px-4 sm:px-5 rounded-full text-[10px] sm:text-xs font-semibold transition-all uppercase tracking-[0.14em] shrink-0 ${
            isActive(AppView.CHECKOUT)
              ? 'bg-navy-900 text-white dark:bg-white dark:text-navy-950 shadow-lg scale-105'
              : 'bg-navy-900 dark:bg-white text-white dark:text-navy-950 hover:shadow-xl hover:scale-105 active:scale-95'
          }`}
        >
          {isActive(AppView.CHECKOUT) ? 'Request invoice' : 'Get Fourcee'}
        </button>
      </div>
    </div>
  );
};

const DockItem: React.FC<{
  onClick: () => void;
  active: boolean;
  label: string;
  icon: React.ReactNode;
  isDarkMode?: boolean;
}> = ({ onClick, active, label, icon, isDarkMode = true }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`flex h-11 sm:h-12 items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 rounded-full transition-all duration-300 shrink-0 ${
      active
        ? 'bg-navy-900 text-white shadow-md scale-105 dark:bg-white dark:text-navy-950'
        : isDarkMode
          ? 'text-white/90 hover:text-white hover:bg-white/10'
          : 'text-navy-800 hover:text-navy-950 hover:bg-navy-900/5'
    }`}
  >
    {icon}
    <span
      className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
        active ? 'inline' : 'hidden sm:inline opacity-70'
      }`}
    >
      {label}
    </span>
  </button>
);
