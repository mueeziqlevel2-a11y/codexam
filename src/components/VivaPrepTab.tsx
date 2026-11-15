import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  EyeOff,
  FileUp,
  GraduationCap,
  HelpCircle,
  Loader2,
  MessageSquareText,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  SUPPORTED_LANGUAGES,
  inferLanguageFromFilename,
} from '../constants/languages';
import type {
  ExaminerStrictness,
  SupportedLanguage,
  VivaResponse,
} from '../types/codexam';

interface VivaPrepTabProps {
  prefilledCode?: { code: string; language: SupportedLanguage } | null;
  onConsumePrefill?: () => void;
}

export function VivaPrepTab({ prefilledCode, onConsumePrefill }: VivaPrepTabProps) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<SupportedLanguage>('C++');
  const [strictness, setStrictness] = useState<ExaminerStrictness>('friendly');
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VivaResponse | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [revealedHints, setRevealedHints] = useState<Record<number, boolean>>({});
  const [studentNotes, setStudentNotes] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prefilledCode) {
      setCode(prefilledCode.code);
      setLanguage(prefilledCode.language);
      setUploadedFilename('imported_from_workspace');
      setError(null);
      onConsumePrefill?.();
    }
  }, [prefilledCode, onConsumePrefill]);

  function loadFile(file: File) {
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
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      loadFile(file);
    }
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      loadFile(file);
    }
  }

  async function handleGenerateViva(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length < 5) {
      setError('Please paste or upload your solved assignment code first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/viva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          language,
          strictness,
        }),
      });
      const rawText = await response.text();
      let data: Partial<VivaResponse> & { error?: string } = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error(
          response.ok
            ? 'Received an unexpected non-JSON response from the server.'
            : `Server error (${response.status}). Check your GEMINI_API_KEY configuration and try again.`,
        );
      }
      if (!response.ok || data.error) {
        throw new Error(data.error || `Failed to generate viva preparation (HTTP ${response.status}).`);
      }
      setResult(data as VivaResponse);
      setRevealedAnswers({});
      setRevealedHints({});
      setStudentNotes({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function toggleAnswer(id: number) {
    setRevealedAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleHint(id: number) {
    setRevealedHints((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <section aria-labelledby="viva-heading" className="space-y-8">
      {/* Section Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 id="viva-heading" className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Demo & Viva Prep
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
          Upload or paste your final assignment code to generate a 2-minute live screen-share script and 8 targeted cross-examination questions.
        </p>
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleGenerateViva}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
      >
        <div className="space-y-5">
          {/* File Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-slate-300 bg-slate-50/70 hover:border-emerald-400 hover:bg-emerald-50/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".cpp,.cc,.cxx,.py,.java,.js,.c,.h,.hpp,.sql,.txt"
              onChange={handleFileChange}
              className="sr-only"
              aria-label="Upload solved assignment file"
            />
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <FileUp className="h-5 w-5" />
            </span>
            <p className="mt-2.5 text-sm font-semibold text-slate-800">
              Drop your final code file here, or click to browse
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Supports .cpp, .py, .java, .js, .c, .sql, and .txt
              {uploadedFilename ? ` · Loaded: ${uploadedFilename}` : ''}
            </p>
          </div>

          {/* Code Paste Area */}
          <div>
            <label htmlFor="viva-code-input" className="block text-sm font-semibold text-slate-800">
              Final Assignment Code
            </label>
            <textarea
              id="viva-code-input"
              rows={11}
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your final working code here..."
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/70 p-4 font-mono text-[13px] leading-6 text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Controls Row */}
          <div className="flex flex-col justify-between gap-4 border-t border-slate-200 pt-5 lg:flex-row lg:items-center">
            <div className="flex flex-wrap items-center gap-5">
              {/* Language Selector */}
              <div className="flex items-center gap-2.5">
                <label
                  htmlFor="viva-language"
                  className="text-sm font-medium text-slate-700 whitespace-nowrap"
                >
                  Language
                </label>
                <select
                  id="viva-language"
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

              {/* Examiner Strictness Toggle */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
                  Examiner Mode
                </span>
                <div
                  role="group"
                  aria-label="Examiner Strictness"
                  className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1"
                >
                  <button
                    type="button"
                    onClick={() => setStrictness('friendly')}
                    className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                      strictness === 'friendly'
                        ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-emerald-500/30'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Friendly Lab TA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStrictness('strict')}
                    className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                      strictness === 'strict'
                        ? 'bg-white text-amber-800 shadow-xs ring-1 ring-amber-500/30'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Shield className="h-3.5 w-3.5 text-amber-600" />
                    <span>Strict Viva Examiner</span>
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white whitespace-nowrap shrink-0 shadow-xs transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Preparing Viva Pack...</span>
                </>
              ) : (
                <>
                  <GraduationCap className="h-4 w-4" />
                  <span>Prepare Me for the Demo</span>
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
          <span>Analyzing logic flow & generating viva questions...</span>
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
          <GraduationCap className="mx-auto h-9 w-9 text-emerald-600/70" />
          <h2 className="mt-3 font-display text-base font-semibold text-slate-900">
            Rehearse before you present
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
            Upload or paste your solved code, pick Friendly Lab TA or Strict Viva Examiner, and get a timed walkthrough plus 8 code-specific defense questions.
          </p>
        </div>
      )}

      {/* Output Sections */}
      {result && !loading && (
        <div className="space-y-8">
          {/* 1. 2-Minute Live Demo Script */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <MessageSquareText className="h-5 w-5 text-emerald-600" />
                <h2 className="font-display text-xl font-semibold text-slate-900">
                  2-Minute Live Demo Script
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold tabular-nums text-emerald-700">
                <Clock className="h-3.5 w-3.5 text-emerald-600" />
                <span>{result.demoScript.estimatedDuration}</span>
              </span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-700">
              {result.demoScript.overview}
            </p>

            <ol className="mt-6 space-y-4">
              {result.demoScript.steps.map((step) => (
                <li
                  key={step.stepNumber}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 font-mono text-xs font-bold tabular-nums text-emerald-800">
                        {step.stepNumber}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {step.phase}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-medium text-emerald-700">
                      Point to: {step.codeFocus}
                    </span>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-700">
                    &ldquo;{step.talkingPoint}&rdquo;
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {/* 2. Top 8 Expected Viva Questions & Answers */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-slate-900">
                  Top 8 Expected Viva Questions & Answers
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Test your own explanation first, then expand the model answer to compare.
                </p>
              </div>
              <span className="font-mono text-xs text-slate-500">
                Mode: {strictness === 'strict' ? 'Strict Viva Examiner' : 'Friendly Lab TA'}
              </span>
            </div>

            <div className="space-y-3">
              {result.vivaQuestions.map((q) => {
                const isAnswerOpen = Boolean(revealedAnswers[q.id]);
                const isHintOpen = Boolean(revealedHints[q.id]);

                return (
                  <div
                    key={q.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-colors"
                  >
                    <div className="p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2 text-slate-500">
                          <span className="font-mono font-bold tabular-nums text-emerald-700">
                            Q{q.id}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-slate-800">{q.topic}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              q.difficulty === 'Deep Dive'
                                ? 'font-semibold text-amber-700'
                                : q.difficulty === 'Edge Case'
                                  ? 'font-semibold text-teal-700'
                                  : 'font-semibold text-emerald-700'
                            }
                          >
                            {q.difficulty}
                          </span>
                        </div>

                        <span className="font-mono text-xs text-slate-500">
                          {q.codeReference}
                        </span>
                      </div>

                      <h3 className="mt-2.5 text-base font-semibold leading-snug text-slate-900">
                        {q.question}
                      </h3>

                      {/* Student Self-Test Input */}
                      <div className="mt-3.5">
                        <label
                          htmlFor={`viva-attempt-${q.id}`}
                          className="sr-only"
                        >
                          Practice your answer for Question {q.id}
                        </label>
                        <textarea
                          id={`viva-attempt-${q.id}`}
                          rows={2}
                          value={studentNotes[q.id] ?? ''}
                          onChange={(e) =>
                            setStudentNotes((prev) => ({
                              ...prev,
                              [q.id]: e.target.value,
                            }))
                          }
                          placeholder="Draft your answer here to test yourself before revealing the model answer..."
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Interactive Controls */}
                      <div className="mt-3.5 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleAnswer(q.id)}
                          aria-expanded={isAnswerOpen}
                          className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 whitespace-nowrap transition-colors hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                        >
                          {isAnswerOpen ? (
                            <>
                              <EyeOff className="h-3.5 w-3.5" />
                              <span>Hide Model Answer</span>
                              <ChevronUp className="h-3.5 w-3.5" />
                            </>
                          ) : (
                            <>
                              <Eye className="h-3.5 w-3.5" />
                              <span>Reveal Model Answer</span>
                              <ChevronDown className="h-3.5 w-3.5" />
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleHint(q.id)}
                          aria-expanded={isHintOpen}
                          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 whitespace-nowrap transition-colors hover:border-slate-300 hover:bg-slate-50"
                        >
                          <HelpCircle className="h-3.5 w-3.5 text-amber-600" />
                          <span>{isHintOpen ? 'Hide Hint' : 'Need a Hint?'}</span>
                        </button>
                      </div>

                      {isHintOpen && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
                          <span className="font-semibold text-amber-800">Hint: </span>
                          {q.hint}
                        </div>
                      )}

                      {isAnswerOpen && (
                        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3.5 text-sm leading-relaxed text-slate-800">
                          <div className="mb-1 text-xs font-semibold text-emerald-800">
                            Model Examiner Answer
                          </div>
                          {q.modelAnswer}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
