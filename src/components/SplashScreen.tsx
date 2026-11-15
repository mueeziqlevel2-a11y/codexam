import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect } from 'react';
import { CodeXamLogo } from './CodeXamLogo';

interface SplashScreenProps {
  onDismiss: () => void;
}

export function SplashScreen({ onDismiss }: SplashScreenProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onDismiss();
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
      className="bg-white-emerald-canvas fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F8FAFC] px-6"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to CodeXam"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.14)_0%,rgba(5,150,105,0.04)_36%,transparent_66%)]"
      />

      <div className="relative flex w-full max-w-md flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 rounded-3xl border border-emerald-200/80 bg-white p-3 shadow-[0_12px_36px_rgba(5,150,105,0.14)]"
        >
          <CodeXamLogo size={78} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl"
        >
          Code<span className="text-emerald-600">Xam</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-3 text-base font-medium tracking-wide text-slate-600 sm:text-lg"
        >
          Solve. Debug. Ace Your Viva.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-5 py-2 text-sm font-semibold text-emerald-800 shadow-[0_4px_20px_rgba(16,185,129,0.16)]"
        >
          Made by Mueez Ahmed
        </motion.div>

        <div className="mt-8 h-1.5 w-56 overflow-hidden rounded-full bg-slate-200">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 2.5, ease: 'linear' }}
            style={{ transformOrigin: 'left' }}
            className="h-full w-full bg-gradient-to-r from-emerald-500 to-emerald-600"
          />
        </div>

        <motion.button
          type="button"
          onClick={onDismiss}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          className="mt-6 inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-800 shadow-xs transition-colors hover:border-emerald-300 hover:bg-emerald-50/60 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          <span>Skip / Get Started</span>
          <ArrowRight className="h-4 w-4 text-emerald-600" />
        </motion.button>
      </div>
    </motion.div>
  );
}
