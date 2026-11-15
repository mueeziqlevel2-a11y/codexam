import { Download, MonitorSmartphone, X } from 'lucide-react';
import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  async function handleClick() {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-emerald-600/25 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white whitespace-nowrap shrink-0 shadow-xs transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
      >
        <Download className="h-3.5 w-3.5 shrink-0" />
        <span>Install CodeXam</span>
      </button>

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-guide-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <MonitorSmartphone className="h-5 w-5" />
                </span>
                <h2
                  id="pwa-install-guide-title"
                  className="font-display text-lg font-semibold text-slate-900"
                >
                  Install CodeXam
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install instructions"
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="mt-4 space-y-2.5 text-sm leading-relaxed text-slate-600">
                <li>
                  1. Tap the <strong className="font-semibold text-slate-900">Share</strong> icon in Safari&apos;s toolbar.
                </li>
                <li>
                  2. Scroll down and select{' '}
                  <strong className="font-semibold text-slate-900">Add to Home Screen</strong>.
                </li>
                <li>
                  3. Tap <strong className="font-semibold text-slate-900">Add</strong> to launch CodeXam like a native app.
                </li>
              </ol>
            ) : (
              <div className="mt-4 space-y-2.5 text-sm leading-relaxed text-slate-600">
                <p>
                  Open CodeXam in a standalone browser tab on Chrome, Edge, or Android to trigger the one-click native install prompt, or click the{' '}
                  <strong className="font-semibold text-slate-900">Install</strong> icon in your browser&apos;s address bar.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}
