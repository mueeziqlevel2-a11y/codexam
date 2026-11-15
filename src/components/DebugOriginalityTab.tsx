import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bug,
  CheckCircle2,
  FileCode2,
  FlaskConical,
  Info,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';
import {
  SAMPLE_BUGGY_CPP,
  SUPPORTED_LANGUAGES,
  inferLanguageFromFilename,
} from '../constants/languages';
import type { DebugResponse, SupportedLanguage } from '../types/codexam';
import { CodeBlock } from './CodeBlock';

interface DebugOriginalityTabProps {
  onSendToViva: (code: string, language: SupportedLanguage) => void;
}

export function DebugOriginalityTab({ onSendToViva }: DebugOriginalityTabProps) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<SupportedLanguage>('C++');
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DebugResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleLoadSampleCpp() {
    setLanguage('C++');
    setCode(SAMPLE_BUGGY_CPP);
    setUploadedFilename('student_scores_buggy.cpp');
    setError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      setCode(content);
      setUploadedFilename(file.name);
      const inferred = inferLanguageFromFilename(file.name);
      if (inferred) {
        setLanguage(inferred);
      }
      setError(null);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length < 5) {
      setError('Please paste your code or upload a source file before running analysis.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          language,
        }),
      });
      const rawText = await response.text();
      let data: Partial<DebugResponse> & { error?: string } = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error(
          response.ok
            ? 'Received an unexpected non-JSON response from the server.'
            : `Server error (${response.status}). Check your GEMINI_API_KEY configuration and try again.`,
        );
      }
      if (!response.ok) {
        throw new Error(data.error || `Failed to debug and analyze code (HTTP ${response.status}).`);
      }
      setResult(data as DebugResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  const lineCount = code ? code.split('\n').length : 0;

  function renderSeverityIndicator(severity: 'critical' | 'warning' | 'info') {
    if (severity === 'critical') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
          <AlertCircle className="h-3.5 w-3.5 text-red-600" />
          <span>Critical Bug</span>
        </span>
      );
    }
    if (severity === 'warning') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          <span>Warning</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
        <Info className="h-3.5 w-3.5 text-emerald-600" />
        <span>Suggestion</span>
      </span>
    );
  }

  function renderRiskIndicator(risk: 'Low' | 'Moderate' | 'High') {
    if (risk === 'Low') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Low Duplication Risk</span>
        </span>
      );
    }
    if (risk === 'Moderate') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <span>Moderate Boilerplate Risk</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
        <ShieldAlert className="h-4 w-4 text-red-600" />
        <span>High Generic Pattern Risk</span>
      </span>
    );
  }

  return (
    <section aria-labelledby="debugger-heading" className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
        <div>
          <h1 id="debugger-heading" className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Debug & Originality Check
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
            Detect syntax bugs, C++ pointer/memory leaks, generic copied boilerplate, and get a plain-English walkthrough of your code.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadSampleCpp}
          className="inline-flex min-h-[40px] items-center gap-2 self-start rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 whitespace-nowrap shrink-0 transition-colors hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:self-auto"
        >
          <FlaskConical className="h-4 w-4 text-emerald-600" />
          <span>Load Sample Buggy C++ Code</span>
        </button>
      </div>

      {/* Code Editor Form */}
      <form
        onSubmit={handleAnalyze}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-800">
              <FileCode2 className="h-4 w-4 text-emerald-600" />
              <span>Source Code Input</span>
              {uploadedFilename && (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="font-mono text-xs font-normal text-emerald-700">
                    {uploadedFilename}
                  </span>
                </>
              )}
              {lineCount > 0 && (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="font-mono text-xs font-normal tabular-nums text-slate-500">
                    {lineCount} lines
                  </span>
                </>
              )}
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".cpp,.cc,.cxx,.py,.java,.js,.c,.h,.hpp,.sql,.txt"
                onChange={handleFileChange}
                className="sr-only"
                aria-label="Upload source code file"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 whitespace-nowrap transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
              >
                <Upload className="h-3.5 w-3.5 text-emerald-600" />
                <span>Upload Source File</span>
              </button>
            </div>
          </div>

          <textarea
            aria-label="Paste your source code here"
            rows={13}
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your C++, Python, Java, JavaScript, C, or SQL code here, or upload a file (.cpp, .py, .java, .js, .c, .txt)..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-4 font-mono text-[13px] leading-6 text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />

          <div className="flex flex-col justify-between gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <label
                htmlFor="debug-language"
                className="text-sm font-medium text-slate-700 whitespace-nowrap"
              >
                Language
              </label>
              <select
                id="debug-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                className="min-h-[40px] rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white whitespace-nowrap shrink-0 shadow-xs transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analyzing Code...</span>
                </>
              ) : (
                <>
                  <Bug className="h-4 w-4" />
                  <span>Debug & Analyze Code</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Loading Indicator */}
      {loading && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3.5 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-900"
        >
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-emerald-600" />
          <span>Scanning for syntax flaws, memory leaks, edge-case crashes & boilerplate patterns...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !result && !error && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center">
          <Bug className="mx-auto h-9 w-9 text-emerald-600/70" />
          <h2 className="mt-3 font-display text-base font-semibold text-slate-900">
            No code analyzed yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
            Paste your code, upload a source file, or click &ldquo;Load Sample Buggy C++ Code&rdquo; above to test memory leak detection and originality analysis.
          </p>
        </div>
      )}

      {/* 3 Structured Output Cards */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Card 1: Errors, Bugs & Fixes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <Bug className="h-5 w-5 text-emerald-600" />
                <h2 className="font-display text-xl font-semibold text-slate-900">
                  1. Errors, Bugs & Fixes
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs tabular-nums text-slate-500">
                  {result.bugsAndFixes.issues.length} issue{result.bugsAndFixes.issues.length === 1 ? '' : 's'} detected
                </span>
                <button
                  type="button"
                  onClick={() => onSendToViva(result.bugsAndFixes.fixedCode, language)}
                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 whitespace-nowrap transition-colors hover:bg-emerald-100"
                >
                  <span>Prep Viva on Fixed Code</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-700">
              {result.bugsAndFixes.summary}
            </p>

            {result.bugsAndFixes.issues.length === 0 ? (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>No critical bugs or memory leaks detected.</span>
              </div>
            ) : (
              <div className="mt-5 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-slate-50/70">
                {result.bugsAndFixes.issues.map((issue, idx) => (
                  <div key={idx} className="p-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {renderSeverityIndicator(issue.severity)}
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="font-semibold text-slate-900">{issue.category}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="font-mono text-slate-500">{issue.location}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">
                      {issue.description}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-emerald-800">
                      <span className="font-semibold text-emerald-700">Fix applied: </span>
                      {issue.fixExplanation}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                Fixed Working Code
              </h3>
              <CodeBlock
                code={result.bugsAndFixes.fixedCode}
                language={language}
                title={`fixed_${language === 'Java' ? 'Solution.java' : language === 'C++' ? 'code.cpp' : 'code'}`}
                showDownload={true}
              />
            </div>
          </div>

          {/* Card 2: Duplication & Generic Pattern Guard */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h2 className="font-display text-xl font-semibold text-slate-900">
                  2. Duplication & Generic Pattern Guard
                </h2>
              </div>
              {renderRiskIndicator(result.originalityGuard.similarityRisk)}
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-700">
              {result.originalityGuard.assessment}
            </p>

            {result.originalityGuard.flaggedPatterns.length > 0 && (
              <div className="mt-5">
                <h3 className="text-xs font-semibold tracking-wide text-slate-500">
                  Flagged Generic or Boilerplate Patterns
                </h3>
                <ul className="mt-2.5 space-y-2.5">
                  {result.originalityGuard.flaggedPatterns.map((item, idx) => (
                    <li
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    >
                      <div className="font-mono text-xs font-semibold text-amber-700">
                        {item.pattern}
                      </div>
                      <p className="mt-1 text-slate-700">{item.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.originalityGuard.refactoringTips.length > 0 && (
              <div className="mt-5">
                <h3 className="text-xs font-semibold tracking-wide text-slate-500">
                  Authenticity & Naming Refactoring Tips
                </h3>
                <div className="mt-2.5 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                        <th className="px-4 py-2.5">Current Pattern</th>
                        <th className="px-4 py-2.5">Suggested Refactor</th>
                        <th className="px-4 py-2.5">Why It Helps</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {result.originalityGuard.refactoringTips.map((tip, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 font-mono text-xs text-red-700 whitespace-nowrap">
                            {tip.original}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-700 whitespace-nowrap">
                            {tip.suggested}
                          </td>
                          <td className="px-4 py-3 text-xs leading-relaxed text-slate-700">
                            {tip.rationale}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Plain-English Code Explainer */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2.5 border-b border-slate-200 pb-4">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              <h2 className="font-display text-xl font-semibold text-slate-900">
                3. Plain-English Code Explainer
              </h2>
            </div>

            <ul className="mt-5 divide-y divide-slate-200">
              {result.plainEnglishExplainer.map((section, idx) => (
                <li key={idx} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-xs font-semibold tabular-nums text-emerald-700">
                      0{idx + 1}.
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {section.sectionTitle}
                    </h3>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="font-mono text-xs text-slate-500">{section.lines}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                    {section.explanation}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
