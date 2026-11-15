import { AnimatePresence } from 'motion/react';
import { useCallback, useState } from 'react';
import { AssignmentSolverTab } from './components/AssignmentSolverTab';
import { DebugOriginalityTab } from './components/DebugOriginalityTab';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SplashScreen } from './components/SplashScreen';
import { VivaPrepTab } from './components/VivaPrepTab';
import type { SupportedLanguage, WorkspaceTab } from './types/codexam';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('solver');
  const [vivaPrefill, setVivaPrefill] = useState<{
    code: string;
    language: SupportedLanguage;
  } | null>(null);

  const handleDismissSplash = useCallback(() => {
    setShowSplash(false);
  }, []);

  const handleSendToViva = useCallback((code: string, language: SupportedLanguage) => {
    setVivaPrefill({ code, language });
    setActiveTab('viva');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleConsumePrefill = useCallback(() => {
    setVivaPrefill(null);
  }, []);

  return (
    <div className="bg-white-emerald-canvas flex min-h-screen flex-col bg-[#F8FAFC] text-slate-900">
      <AnimatePresence>
        {showSplash && <SplashScreen onDismiss={handleDismissSplash} />}
      </AnimatePresence>

      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Keep all three tab views mounted so students preserve work when switching tabs */}
        <div className={activeTab === 'solver' ? 'block' : 'hidden'}>
          <AssignmentSolverTab onSendToViva={handleSendToViva} />
        </div>

        <div className={activeTab === 'debugger' ? 'block' : 'hidden'}>
          <DebugOriginalityTab onSendToViva={handleSendToViva} />
        </div>

        <div className={activeTab === 'viva' ? 'block' : 'hidden'}>
          <VivaPrepTab
            prefilledCode={vivaPrefill}
            onConsumePrefill={handleConsumePrefill}
          />
        </div>
      </main>

      <OfflineIndicator />
      <Footer />
    </div>
  );
}
