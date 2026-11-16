import {
  AlertCircle,
  ArrowRight,
  Clock,
  Cpu,
  FileImage,
  FileText,
  FileUp,
  HardDrive,
  Loader2,
  Play,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { SUPPORTED_LANGUAGES } from '../constants/languages';
import type {
  AssignmentFileInput,
  SolveResponse,
  SupportedLanguage,
} from '../types/codexam';
import { postStreamingJson } from '../utils/streamApi';
import { CodeBlock } from './CodeBlock';

interface AssignmentSolverTabProps {
  onSendToViva: (code: string, language: SupportedLanguage) => void;
}

interface AttachedFile extends AssignmentFileInput {
  id: string;
  sizeBytes: number;
}

const BINARY_MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'csv',
  'cpp',
  'cc',
  'cxx',
  'h',
  'hpp',
  'py',
  'java',
  'js',
  'ts',
  'c',
  'sql',
]);

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readAssignmentFile(file: File): Promise<AttachedFile> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const binaryMime =
    BINARY_MIME_MAP[ext] ||
    (file.type.startsWith('image/') || file.type === 'application/pdf' ? file.type : '');

  if (binaryMime) {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const resultStr = typeof reader.result === 'string' ? reader.result : '';
        const commaIndex = resultStr.indexOf(',');
        resolve(commaIndex >= 0 ? resultStr.slice(commaIndex + 1) : resultStr);
      };
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    });

    return {
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      mimeType: binaryMime,
      data: base64,
      isText: false,
      sizeBytes: file.size,
    };
  }

  if (TEXT_EXTENSIONS.has(ext) || file.type.startsWith('text/')) {
    const textContent = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsText(file);
    });

    return {
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      mimeType: 'text/plain',
      data: textContent,
      isText: true,
      sizeBytes: file.size,
    };
  }

  throw new Error(
    `Unsupported file "${file.name}". Please upload PDF, PNG, JPG, WEBP, TXT, MD, or source code files.`,
  );
}

export function AssignmentSolverTab({ onSendToViva }: AssignmentSolverTabProps) {
  const [prompt, setPrompt] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [language, setLanguage] = useState<SupportedLanguage>('C++');
  const [includeComments, setIncludeComments] = useState(true);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SolveResponse | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<'all' | number>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const incoming = Array.from(fileList);
    if (attachedFiles.length + incoming.length > 5) {
      setError('You can attach up to 5 assignment files at once.');
      return;
    }

    const totalSize =
      attachedFiles.reduce((sum, f) => sum + f.sizeBytes, 0) +
      incoming.reduce((sum, f) => sum + f.size, 0);

    if (totalSize > 12 * 1024 * 1024) {
      setError('Total attached file size must be 12 MB or less.');
      return;
    }

    try {
      const parsed = await Promise.all(incoming.map(readAssignmentFile));
      setAttachedFiles((prev) => [...prev, ...parsed]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read attached file.');
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    void addFiles(e.target.files);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    void addFiles(e.dataTransfer.files);
  }

  function removeFile(id: string) {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (prompt.trim().length < 5 && attachedFiles.length === 0) {
      setError('Upload your assignment file (PDF, image, or text) or enter a problem statement.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedQuestion('all');
    setStatusText(
      attachedFiles.length > 0
        ? `Reading attached assignment file(s) and streaming ${language} solutions...`
        : `Analyzing problem and streaming ${language} solution...`,
    );

    try {
      const finalData = await postStreamingJson<SolveResponse>({
        url: '/api/solve',
        body: {
          prompt: prompt.trim(),
          files: attachedFiles.map(({ name, mimeType, data, isText }) => ({
            name,
            mimeType,
            data,
            isText,
          })),
          language,
          includeComments,
        },
        onStatus: (message) => setStatusText(message),
        onPartial: (partial) => {
          setResult(partial as SolveResponse);
        },
      });
      setResult(finalData);
      setSelectedQuestion('all');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
      setStatusText('');
    }
  }

  const visibleSolutions =
    result?.solutions.filter((s) =>
      selectedQuestion === 'all' ? true : s.questionNumber === selectedQuestion,
    ) ?? [];

  return (
    <section aria-labelledby="solver-heading" className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
        <div>
          <h1 id="solver-heading" className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Assignment Solver
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
            Upload your assignment sheet (PDF, screenshot, or text) or paste a problem statement. CodeXam extracts every question automatically and solves each one with Big-O analysis.
          </p>
        </div>
      </div>

      {/* Input Card */}
      <form
        onSubmit={handleGenerate}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
      >
        <div className="space-y-5">
          {/* Assignment File Upload Dropzone */}
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-800">
                Upload Assignment Question File(s)
              </span>
              <span className="text-xs text-slate-500">
                PDF, PNG, JPG, WEBP, TXT, MD, or code files (max 5 files)
              </span>
            </div>

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
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.csv,.cpp,.cc,.cxx,.h,.hpp,.py,.java,.js,.ts,.c,.sql"
                onChange={handleFileChange}
                className="sr-only"
                aria-label="Upload assignment files"
              />
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <FileUp className="h-5 w-5" />
              </span>
              <p className="mt-2.5 text-sm font-semibold text-slate-800">
                Drop your assignment PDF, screenshots, or text file here, or click to browse
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Multi-question lab sheets are automatically detected and solved question by question
              </p>
            </div>

            {/* Attached Files List */}
            {attachedFiles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {attachedFiles.map((file) => {
                  const isImage = file.mimeType.startsWith('image/');
                  return (
                    <div
                      key={file.id}
                      className="inline-flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs text-slate-800"
                    >
                      {isImage ? (
                        <FileImage className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                      )}
                      <span className="max-w-[190px] truncate font-medium">{file.name}</span>
                      <span className="font-mono text-slate-500 tabular-nums">
                        {formatFileSize(file.sizeBytes)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(file.id);
                        }}
                        aria-label={`Remove ${file.name}`}
                        className="rounded p-0.5 text-slate-500 transition-colors hover:bg-emerald-100 hover:text-slate-900"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Prompt Textarea */}
          <div>
            <label
              htmlFor="assignment-prompt"
              className="block text-sm font-semibold text-slate-800"
            >
              {attachedFiles.length > 0
                ? 'Additional Instructions (Optional)'
                : 'Or Paste Assignment Prompt / Problem Statement'}
            </label>
            <textarea
              id="assignment-prompt"
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                attachedFiles.length > 0
                  ? 'Optional: Add constraints such as "Only solve Questions 1–3" or "Use STL vectors instead of raw arrays"...'
                  : 'Example: Implement a C++ singly linked list for a university course waitlist with insertAtEnd, removeByStudentId, search, and proper destructor memory cleanup.'
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-4 font-sans text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Controls Bar */}
          <div className="flex flex-col justify-between gap-4 border-t border-slate-200 pt-5 lg:flex-row lg:items-center">
            <div className="flex flex-wrap items-center gap-5">
              {/* Language Selector */}
              <div className="flex items-center gap-2.5">
                <label
                  htmlFor="solver-language"
                  className="text-sm font-medium text-slate-700 whitespace-nowrap"
                >
                  Language
                </label>
                <select
                  id="solver-language"
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

              {/* Step-by-Step Comments Toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  id="comments-toggle"
                  aria-checked={includeComments}
                  onClick={() => setIncludeComments((prev) => !prev)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                    includeComments ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      includeComments ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <label
                  htmlFor="comments-toggle"
                  onClick={() => setIncludeComments((prev) => !prev)}
                  className="cursor-pointer text-sm font-medium text-slate-700 select-none"
                >
                  Include Step-by-Step Comments
                </label>
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
                  <span>Extracting & Solving...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Generate Code Solution</span>
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
          className="flex items-center gap-3.5 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm font-medium text-emerald-900"
        >
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-emerald-600" />
          <span>
            {statusText ||
              (attachedFiles.length > 0
                ? `Reading attached assignment file(s), extracting all questions, and streaming ${language} solutions...`
                : `Designing algorithm, handling edge cases, and streaming ${language} solution...`)}
          </span>
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

      {/* Empty State before first run */}
      {!loading && !result && !error && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center">
          <Terminal className="mx-auto h-9 w-9 text-emerald-600/70" />
          <h2 className="mt-3 font-display text-base font-semibold text-slate-900">
            Ready to solve your assignment
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
            Upload your lab PDF or screenshots above, or paste a problem statement. Multi-part assignments will be extracted and answered one by one.
          </p>
        </div>
      )}

      {/* Multi-Question / Single-Question Output Area */}
      {result && (
        <div className="space-y-6">
          {/* Assignment Header & Question Filter Bar */}
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-xs sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900">
                {result.assignmentTitle}
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                <span className="font-mono font-semibold tabular-nums text-emerald-700">
                  {result.solutions.length}
                </span>{' '}
                {loading
                  ? `solution${result.solutions.length === 1 ? '' : 's'} streaming in ${language}...`
                  : `${result.solutions.length === 1 ? 'question solved' : 'questions extracted & solved'} in ${language}`}
              </p>
            </div>

            {result.solutions.length > 1 && (
              <div
                role="tablist"
                aria-label="Filter solved questions"
                className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedQuestion === 'all'}
                  onClick={() => setSelectedQuestion('all')}
                  className={`min-h-[34px] rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedQuestion === 'all'
                      ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-emerald-500/25'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({result.solutions.length})
                </button>
                {result.solutions.map((sol) => (
                  <button
                    key={sol.questionNumber}
                    type="button"
                    role="tab"
                    aria-selected={selectedQuestion === sol.questionNumber}
                    onClick={() => setSelectedQuestion(sol.questionNumber)}
                    className={`min-h-[34px] rounded-lg px-3 py-1 font-mono text-xs font-semibold tabular-nums whitespace-nowrap transition-colors ${
                      selectedQuestion === sol.questionNumber
                        ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-emerald-500/25'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Q{sol.questionNumber}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hidden AI-Trap / Prompt-Injection Shield Card */}
          {Array.isArray(result.hiddenTrapsDetected) && result.hiddenTrapsDetected.length > 0 && (
            <div
              role="region"
              aria-label="Hidden AI Traps Detected and Blocked"
              className="rounded-2xl border border-amber-300 bg-amber-50/90 p-5 shadow-xs sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="h-5 w-5 shrink-0 text-amber-700" />
                  <h3 className="font-display text-base font-bold text-amber-950">
                    Hidden AI Watermark Traps Detected &amp; Blocked ({result.hiddenTrapsDetected.length})
                  </h3>
                </div>
                <span className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900">
                  Excluded from generated code
                </span>
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-amber-900">
                CodeXam detected hidden prompt-injection instructions (e.g., white text or invisible AI canary directives) embedded in your assignment. None of these trap variables or comments were placed in your solutions.
              </p>
              <ul className="mt-4 space-y-3">
                {result.hiddenTrapsDetected.map((trap, idx) => (
                  <li
                    key={idx}
                    className="rounded-xl border border-amber-200 bg-white p-3.5 text-xs text-slate-800"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-amber-900">{trap.location ?? 'Assignment Document'}</span>
                      <span className="font-mono font-semibold text-red-700">
                        Blocked: {trap.trapArtifact ?? 'Hidden canary'}
                      </span>
                    </div>
                    {trap.hiddenInstruction && (
                      <p className="mt-1.5 leading-relaxed text-slate-700">
                        {trap.hiddenInstruction}
                      </p>
                    )}
                    {trap.actionTaken && (
                      <p className="mt-1 font-medium text-emerald-700">{trap.actionTaken}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Extracted Rubric Constraints Card */}
          {Array.isArray(result.rubricConstraints) && result.rubricConstraints.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-xs">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4.5 w-4.5 shrink-0 text-emerald-700" />
                <h3 className="font-display text-sm font-semibold text-emerald-950">
                  Detected Rubric Constraints Enforced
                </h3>
              </div>
              <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                {result.rubricConstraints.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                    <span className="leading-relaxed">{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Render Each Solved Question */}
          <div className="space-y-8">
            {visibleSolutions.map((sol) => (
              <article
                key={sol.questionNumber}
                className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold tabular-nums text-emerald-700">
                        Question {sol.questionNumber}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="text-slate-500">{language}</span>
                    </div>
                    <h3 className="font-display text-lg font-semibold text-slate-900">
                      {sol.questionTitle}
                    </h3>
                  </div>

                  {!loading && sol.code && (
                    <button
                      type="button"
                      onClick={() => onSendToViva(sol.code, language)}
                      className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-800 whitespace-nowrap shrink-0 transition-colors hover:bg-emerald-100"
                    >
                      <span>Practice Viva on Q{sol.questionNumber}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Extracted Question Text */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
                  <div className="text-xs font-semibold text-slate-500">
                    Extracted Problem Statement
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-800">
                    {sol.extractedQuestion || 'Extracting question details...'}
                  </p>
                </div>

                {/* Code Output */}
                {sol.code ? (
                  <CodeBlock
                    code={sol.code}
                    language={language}
                    showDownload={!loading}
                    filename={
                      language === 'Java'
                        ? `Question${sol.questionNumber}Solution.java`
                        : `question_${sol.questionNumber}${sol.fileExtension}`
                    }
                  />
                ) : (
                  <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-[#0F172A] px-4 py-5 font-mono text-xs text-emerald-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Streaming {language} code for Question {sol.questionNumber}...</span>
                  </div>
                )}

                {/* Logic & Complexity Summary */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
                  <div className="flex items-center gap-2.5">
                    <Cpu className="h-4 w-4 text-emerald-600" />
                    <h4 className="font-display text-base font-semibold text-slate-900">
                      Logic & Complexity
                    </h4>
                  </div>

                  <p className="mt-2.5 text-sm leading-relaxed text-slate-700">
                    {sol.approachSummary || (loading ? 'Generating approach & Big-O summary...' : '')}
                  </p>

                  <div className="mt-4 grid gap-4 border-t border-b border-slate-200 py-3.5 sm:grid-cols-2">
                    <div className="flex items-start gap-3">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <div>
                        <div className="text-xs font-medium text-slate-500">Time Complexity</div>
                        <div className="mt-0.5 font-mono text-sm font-semibold text-slate-900">
                          {sol.timeComplexity || (loading ? 'Computing...' : 'N/A')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <div>
                        <div className="text-xs font-medium text-slate-500">Space Complexity</div>
                        <div className="mt-0.5 font-mono text-sm font-semibold text-slate-900">
                          {sol.spaceComplexity || (loading ? 'Computing...' : 'N/A')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {sol.keySteps.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs font-semibold text-slate-500">
                        Execution Flow Breakdown
                      </div>
                      <ul className="mt-2.5 space-y-2">
                        {sol.keySteps.map((step, index) => (
                          <li key={index} className="flex items-start gap-3 text-sm text-slate-700">
                            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-100 font-mono text-xs font-semibold tabular-nums text-emerald-800">
                              {index + 1}
                            </span>
                            <span className="leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
