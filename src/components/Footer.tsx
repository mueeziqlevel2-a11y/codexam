import { CodeXamLogo } from './CodeXamLogo';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5 text-sm text-slate-600">
          <CodeXamLogo size={26} />
          <span className="font-display font-semibold text-slate-900">CodeXam</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>Solve. Debug. Ace Your Viva.</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800 whitespace-nowrap">
            Made by Mueez Ahmed
          </span>
        </div>
      </div>
    </footer>
  );
}
