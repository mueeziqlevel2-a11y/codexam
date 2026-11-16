import { ExternalLink } from 'lucide-react';
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
          <a
            href="https://mueez-80.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit Mueez Ahmed's portfolio website"
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800 whitespace-nowrap transition-colors hover:border-emerald-300 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            <span>Made by Mueez Ahmed</span>
            <ExternalLink className="h-3 w-3 text-emerald-600" />
          </a>
        </div>
      </div>
    </footer>
  );
}
