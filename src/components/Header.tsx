import { Bug, Code2, ExternalLink, GraduationCap } from 'lucide-react';
import type { WorkspaceTab } from '../types/codexam';
import { CodeXamLogo } from './CodeXamLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
}

const TABS: Array<{
  id: WorkspaceTab;
  shortLabel: string;
  label: string;
  icon: typeof Code2;
}> = [
  {
    id: 'solver',
    shortLabel: '1. Solver',
    label: 'Assignment Solver',
    icon: Code2,
  },
  {
    id: 'debugger',
    shortLabel: '2. Debugger',
    label: 'Debug & Originality Check',
    icon: Bug,
  },
  {
    id: 'viva',
    shortLabel: '3. Viva Prep',
    label: 'Demo & Viva Prep',
    icon: GraduationCap,
  },
];

export function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex shrink-0 items-center gap-3">
          <CodeXamLogo size={38} />
          <span className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap">
            Code<span className="text-emerald-600">Xam</span>
          </span>
        </div>

        {/* Desktop 3-Tab Switcher */}
        <nav
          aria-label="Workspace tools"
          className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 lg:flex"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex min-h-[38px] items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                  isActive
                    ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-emerald-500/25'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Actions & Creator Badge */}
        <div className="flex shrink-0 items-center gap-2.5">
          <PWAInstallButton />
          <a
            href="https://mueez-80.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit Mueez Ahmed's portfolio website"
            className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 whitespace-nowrap transition-colors hover:border-emerald-300 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:inline-flex"
          >
            <span>Made by Mueez Ahmed</span>
            <ExternalLink className="h-3 w-3 text-emerald-600" />
          </a>
        </div>
      </div>

      {/* Mobile / Tablet Tab Switcher */}
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 lg:hidden">
        <nav
          aria-label="Workspace tools mobile"
          className="mx-auto grid max-w-2xl grid-cols-3 gap-1.5"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-emerald-500/30'
                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span className="truncate">{tab.shortLabel}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
