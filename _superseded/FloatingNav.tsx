import React from 'react';
import { AppView } from '../types';

/** Slightly thinner strokes for a lighter nav read */
const sw = 1.35;

interface FloatingNavProps {
  onNavigate: (view: AppView) => void;
  currentView: AppView;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
}

export const FloatingNav: React.FC<FloatingNavProps> = ({ onNavigate, currentView, toggleDarkMode, isDarkMode }) => {
  const isActive = (view: AppView) => currentView === view;
  const navItems = [
    {
      view: AppView.LANDING,
      label: 'Home',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      view: AppView.BLOG,
      label: 'Insights',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw} d="M14 4v4h4" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw} d="M7 8h1" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw} d="M7 12h10" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw} d="M7 16h10" />
        </svg>
      ),
    },
    {
      view: AppView.DASHBOARD,
      label: 'CRM',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={sw}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      view: AppView.LEAD_MAGNET,
      label: 'Audit',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];
  const activeItem = navItems.find((item) => item.view === currentView) ?? navItems[0];
  const inactiveItems = navItems.filter((item) => item.view !== activeItem.view);
  const midpoint = Math.ceil(inactiveItems.length / 2);
  const leftItems = inactiveItems.slice(0, midpoint);
  const rightItems = inactiveItems.slice(midpoint);

  return (
    <div className="nav-floating animate-in slide-in-from-bottom duration-700 w-full max-w-[calc(100vw-2rem)] sm:max-w-none">
      <div className="relative glass-card shadow-2xl rounded-full pl-2 pr-2 sm:pl-4 sm:pr-4 py-2.5 sm:py-3 flex items-center justify-center gap-1 sm:gap-3 border border-navy-900/10 transition-all mx-auto w-fit max-w-full">
        <div className="pointer-events-none absolute inset-0 rounded-full border border-amber-300/35 animate-pulse" />
        {leftItems.map((item) => (
          <NavItem
            key={item.label}
            onClick={() => onNavigate(item.view)}
            active={false}
            label={item.label}
            icon={item.icon}
            isDarkMode={isDarkMode}
          />
        ))}
        <NavItem onClick={() => onNavigate(activeItem.view)} active label={activeItem.label} icon={activeItem.icon} isDarkMode={isDarkMode} />
        {rightItems.map((item) => (
          <NavItem
            key={item.label}
            onClick={() => onNavigate(item.view)}
            active={false}
            label={item.label}
            icon={item.icon}
            isDarkMode={isDarkMode}
          />
        ))}
        <div className="w-px h-5 sm:h-6 bg-navy-200 dark:bg-white/20 mx-1 sm:mx-2 shrink-0" />
        <button
          type="button"
          onClick={toggleDarkMode}
          className={`p-2 sm:p-2.5 transition-colors shrink-0 ${
            isDarkMode
              ? 'text-white/90 hover:text-white'
              : 'text-navy-800 hover:text-navy-950'
          }`}
          title="Toggle Theme"
        >
          {isDarkMode ? (
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw} d="M12 3v1m0 16v1m9-9h1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l.707-.707M6.343 6.343l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={() => onNavigate(AppView.CHECKOUT)}
          className={`px-3 py-2 sm:px-6 sm:py-2.5 rounded-full text-[10px] sm:text-xs font-semibold transition-all uppercase tracking-[0.14em] shrink-0 ${
            isActive(AppView.CHECKOUT)
              ? 'bg-navy-900 text-white dark:bg-white dark:text-navy-950 shadow-lg scale-105'
              : 'bg-navy-900 dark:bg-white text-white dark:text-navy-950 hover:shadow-xl hover:scale-105 active:scale-95'
          }`}
        >
          {isActive(AppView.CHECKOUT) ? 'Paying' : 'Get Fourcee'}
        </button>
      </div>
    </div>
  );
};

const NavItem: React.FC<{
  onClick: () => void;
  active: boolean;
  label: string;
  icon: React.ReactNode;
  isDarkMode?: boolean;
}> = ({ onClick, active, label, icon, isDarkMode = true }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-full transition-all duration-300 shrink-0 [&>svg]:h-4 [&>svg]:w-4 sm:[&>svg]:h-5 sm:[&>svg]:w-5 ${
      active
        ? 'bg-navy-900 text-white shadow-md scale-105 dark:bg-white dark:text-navy-950'
        : isDarkMode
          ? 'text-white/90 hover:text-white'
          : 'text-navy-800 hover:text-navy-950'
    }`}
  >
    {icon}
    {active && (
      <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-[0.12em] animate-in fade-in slide-in-from-left-2 duration-300">
        {label}
      </span>
    )}
  </button>
);
