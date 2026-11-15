import hljs from 'highlight.js/lib/core';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import { Check, Copy, Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getLanguageMeta } from '../constants/languages';
import type { SupportedLanguage } from '../types/codexam';

hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('c', c);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('sql', sql);

interface CodeBlockProps {
  code: string;
  language: SupportedLanguage;
  title?: string;
  filename?: string;
  showDownload?: boolean;
}

export function CodeBlock({
  code,
  language,
  title,
  filename,
  showDownload = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const meta = getLanguageMeta(language);
  const resolvedFilename = filename ?? meta.defaultFilename;

  const lines = useMemo(() => code.replace(/\n$/, '').split('\n'), [code]);

  const highlightedLines = useMemo(() => {
    try {
      const result = hljs.highlight(code.replace(/\n$/, ''), {
        language: meta.hljsLang,
        ignoreIllegals: true,
      });
      return result.value.split('\n');
    } catch {
      return null;
    }
  }, [code, meta.hljsLang]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  function handleDownload() {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = resolvedFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-[#0F172A] shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#1E293B] px-4 py-2.5">
        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <span className="font-mono font-semibold text-emerald-300">{title ?? resolvedFilename}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-slate-300">{language}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="font-mono tabular-nums text-slate-400">{lines.length} lines</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 whitespace-nowrap transition-colors hover:border-emerald-400/60 hover:text-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-400" />
                <span>Copy Code</span>
              </>
            )}
          </button>

          {showDownload && (
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-200 whitespace-nowrap transition-colors hover:bg-emerald-500/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              <Download className="h-3.5 w-3.5 text-emerald-300" />
              <span>Download {meta.extension}</span>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto p-4">
        <pre className="font-mono text-[13px] leading-6 text-slate-100">
          <code>
            {lines.map((line, index) => (
              <div key={index} className="table-row">
                <span className="table-cell select-none pr-4 text-right font-mono text-xs tabular-nums text-slate-500">
                  {index + 1}
                </span>
                {highlightedLines && highlightedLines[index] !== undefined ? (
                  <span
                    className="table-cell whitespace-pre"
                    dangerouslySetInnerHTML={{
                      __html: highlightedLines[index] || '&nbsp;',
                    }}
                  />
                ) : (
                  <span className="table-cell whitespace-pre">{line || ' '}</span>
                )}
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
