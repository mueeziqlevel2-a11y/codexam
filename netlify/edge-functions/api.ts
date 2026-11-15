import type {
  DebugResponse,
  ExaminerStrictness,
  SolveResponse,
  SupportedLanguage,
  VivaResponse,
} from '../../src/types/codexam.ts';

const PRIMARY_MODEL = 'gemini-4-hydrogen';
const FALLBACK_MODEL = 'gemini-2.5-flash';
const VALID_LANGUAGES: SupportedLanguage[] = ['C++', 'Python', 'Java', 'JavaScript', 'C', 'SQL'];

function getEnvApiKey(): string | undefined {
  const g = globalThis as {
    Netlify?: { env?: { get?: (key: string) => string | undefined } };
    Deno?: { env?: { get?: (key: string) => string | undefined } };
  };
  const raw = g.Netlify?.env?.get?.('GEMINI_API_KEY') ?? g.Deno?.env?.get?.('GEMINI_API_KEY');
  if (!raw) return undefined;
  const cleaned = raw.trim().replace(/^["']|["']$/g, '').trim();
  return cleaned || undefined;
}

function isValidLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && VALID_LANGUAGES.includes(value as SupportedLanguage);
}

function isValidStrictness(value: unknown): value is ExaminerStrictness {
  return value === 'friendly' || value === 'strict';
}

function getExtensionForLanguage(language: SupportedLanguage): string {
  switch (language) {
    case 'C++':
      return '.cpp';
    case 'Python':
      return '.py';
    case 'Java':
      return '.java';
    case 'JavaScript':
      return '.js';
    case 'C':
      return '.c';
    case 'SQL':
      return '.sql';
  }
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

interface ParsedGoogleError {
  statusText: string;
  message: string;
  reason: string;
}

function parseGoogleErrorBody(rawBody: string): ParsedGoogleError {
  const sanitize = (text: string) => text.replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_KEY]');
  try {
    const parsed = JSON.parse(rawBody) as {
      error?: {
        status?: string;
        message?: string;
        details?: Array<{ reason?: string }>;
      };
    };
    const statusText = typeof parsed?.error?.status === 'string' ? parsed.error.status : '';
    const message = typeof parsed?.error?.message === 'string' ? sanitize(parsed.error.message) : '';
    let reason = '';
    if (Array.isArray(parsed?.error?.details)) {
      for (const detail of parsed.error.details) {
        if (typeof detail?.reason === 'string' && detail.reason) {
          reason = detail.reason;
          break;
        }
      }
    }
    return { statusText, message, reason };
  } catch {
    return { statusText: '', message: sanitize(rawBody.slice(0, 300).trim()), reason: '' };
  }
}

function mapHttpError(status: number, rawBody: string): string {
  const { statusText, message, reason } = parseGoogleErrorBody(rawBody);
  const lower = `${statusText} ${reason} ${message}`.toLowerCase();

  if (
    reason === 'API_KEY_INVALID' ||
    rawBody.includes('API_KEY_INVALID') ||
    lower.includes('api key not valid') ||
    lower.includes('api_key_invalid')
  ) {
    return 'Your GEMINI_API_KEY in Netlify is invalid. Create a Gemini API key at aistudio.google.com/apikey, paste only the raw AIza... key (without quotes or spaces) in Netlify Site configuration > Environment variables > GEMINI_API_KEY, and trigger a new deploy.';
  }

  if (
    reason === 'API_KEY_HTTP_REFERRER_BLOCKED' ||
    reason === 'API_KEY_IP_ADDRESS_BLOCKED' ||
    reason === 'API_KEY_ANDROID_APP_BLOCKED' ||
    reason === 'API_KEY_IOS_APP_BLOCKED' ||
    reason === 'API_KEY_SERVICE_BLOCKED'
  ) {
    return `Your GEMINI_API_KEY has Google Cloud restrictions blocking Netlify Edge requests (${message || reason}). Set API restrictions to None or allow the Generative Language API.`;
  }

  if (status === 403 || statusText === 'PERMISSION_DENIED' || rawBody.includes('PERMISSION_DENIED')) {
    return `Gemini API permission denied${message ? `: ${message}` : '. Verify GEMINI_API_KEY in Netlify Site configuration > Environment variables.'}`;
  }

  if (status === 429 || statusText === 'RESOURCE_EXHAUSTED' || rawBody.includes('RESOURCE_EXHAUSTED')) {
    return `Rate limit or quota reached on the Gemini API${message ? `: ${message}` : '. Please wait a moment and try again.'}`;
  }

  if (status === 404 || statusText === 'NOT_FOUND' || rawBody.includes('NOT_FOUND')) {
    return `Configured Gemini model was not found${message ? `: ${message}` : '.'}`;
  }

  if (status === 400) {
    return message
      ? `Gemini rejected the request: ${message}`
      : 'Gemini API rejected the request (HTTP 400). Check your uploaded file and GEMINI_API_KEY.';
  }

  return message ? `Gemini request failed (HTTP ${status}): ${message}` : `Gemini request failed (HTTP ${status}).`;
}

function shouldFallbackModelOrConfig(status: number, rawBody: string): boolean {
  if (status !== 400 && status !== 404) return false;
  const { statusText, message, reason } = parseGoogleErrorBody(rawBody);
  const lower = `${statusText} ${reason} ${message}`.toLowerCase();
  if (
    reason.startsWith('API_KEY_') ||
    lower.includes('api key') ||
    lower.includes('location is not supported') ||
    lower.includes('unable to process') ||
    lower.includes('no pages') ||
    lower.includes('password')
  ) {
    return false;
  }
  return (
    status === 404 ||
    lower.includes('model') ||
    lower.includes('thinkinglevel') ||
    lower.includes('thinking_level') ||
    lower.includes('thinkingconfig') ||
    lower.includes('not found') ||
    lower.includes('not supported')
  );
}

function parseJsonSafely<T>(rawText: string | undefined, fallbackMessage: string): T {
  const trimmed = (rawText ?? '').trim();
  if (!trimmed) {
    throw new Error(fallbackMessage);
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const cleaned = trimmed
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      throw new Error(fallbackMessage);
    }
  }
}

async function sendGenerateContent(
  apiKey: string,
  model: string,
  payload: Record<string, unknown>,
): Promise<Response> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
      'User-Agent': 'aistudio-build',
    },
    body: JSON.stringify(payload),
  });
}

function stripThinkingConfig(payload: Record<string, unknown>): Record<string, unknown> {
  const genCfg = payload.generationConfig;
  if (!genCfg || typeof genCfg !== 'object') return payload;
  const { thinkingConfig: _removed, ...restCfg } = genCfg as Record<string, unknown>;
  return { ...payload, generationConfig: restCfg };
}

async function callGeminiStructured<T>(
  apiKey: string,
  payload: Record<string, unknown>,
  fallbackMessage: string,
): Promise<T> {
  const strategies: Array<{ model: string; body: Record<string, unknown> }> = [
    { model: PRIMARY_MODEL, body: payload },
    { model: PRIMARY_MODEL, body: stripThinkingConfig(payload) },
    { model: FALLBACK_MODEL, body: stripThinkingConfig(payload) },
  ];

  let lastError: Error | null = null;

  for (let sIdx = 0; sIdx < strategies.length; sIdx++) {
    const { model, body } = strategies[sIdx];
    let canTryNextStrategy = false;

    for (let attempt = 1; attempt <= 2; attempt++) {
      const res = await sendGenerateContent(apiKey, model, body);

      if (res.ok) {
        const json = (await res.json()) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };
        const text = json.candidates?.[0]?.content?.parts
          ?.map((p) => p.text ?? '')
          .join('')
          .trim();
        return parseJsonSafely<T>(text, fallbackMessage);
      }

      const errText = await res.text();
      lastError = new Error(mapHttpError(res.status, errText));

      if ((res.status === 500 || res.status === 503) && attempt < 2) {
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }

      if (sIdx < strategies.length - 1 && shouldFallbackModelOrConfig(res.status, errText)) {
        canTryNextStrategy = true;
        break;
      }

      throw lastError;
    }

    if (!canTryNextStrategy) {
      break;
    }
  }

  throw lastError ?? new Error(fallbackMessage);
}

function streamJsonWork(work: () => Promise<unknown>): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Flush initial byte immediately so Netlify Edge never hits header/10s timeouts
      controller.enqueue(encoder.encode(' '));
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(' '));
        } catch {
          // Stream already closed
        }
      }, 2500);

      try {
        const result = await work();
        controller.enqueue(encoder.encode(JSON.stringify(result)));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected server error.';
        controller.enqueue(encoder.encode(JSON.stringify({ error: message })));
      } finally {
        clearInterval(keepalive);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api/, '');

  if (req.method === 'GET' && (route === '/health' || route === '' || route === '/')) {
    return jsonResponse({ status: 'ok', service: 'CodeXam', runtime: 'netlify-edge' });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  const apiKey = getEnvApiKey();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.toUpperCase().includes('YOUR_API_KEY')) {
    return jsonResponse(
      {
        error:
          'GEMINI_API_KEY is missing or still set to a placeholder. Add your Google AI Studio key (AIza...) in Netlify Site configuration > Environment variables and redeploy.',
      },
      500,
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: 'Invalid JSON request body.' }, 400);
  }

  if (route === '/solve') {
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    const rawFiles = Array.isArray(body?.files) ? body.files : [];
    const validFiles = rawFiles.filter(
      (f): f is { name: string; mimeType: string; data: string; isText: boolean } =>
        Boolean(f) &&
        typeof f.name === 'string' &&
        typeof f.mimeType === 'string' &&
        typeof f.data === 'string' &&
        f.data.length > 0,
    );

    if (prompt.length < 5 && validFiles.length === 0) {
      return jsonResponse(
        {
          error:
            'Please upload an assignment file (PDF, image, or text) or enter a problem statement.',
        },
        400,
      );
    }
    if (!isValidLanguage(body?.language)) {
      return jsonResponse({ error: 'Unsupported target language selected.' }, 400);
    }

    const language = body.language;
    const includeComments = Boolean(body?.includeComments);
    const expectedExt = getExtensionForLanguage(language);

    return streamJsonWork(async () => {
      const commentDirective = includeComments
        ? 'Include clear, concise, educational step-by-step comments directly inside the code explaining key logic, data structures, memory handling, and edge cases.'
        : 'Do NOT include step-by-step instructional comments inside the code; output clean, self-documenting code only.';

      const systemText = [
        'You are CodeXam, an expert university Computer Science & Software Engineering teaching assistant.',
        'Analyze all provided assignment documents (PDFs, images/screenshots, or text files) and any user instructions.',
        'Automatically detect and extract EVERY distinct question, problem, or lab task present in the uploaded files or prompt.',
        'If the assignment contains multiple questions, provide a complete, independent, compilable/runnable solution for EACH question in order.',
        'If there is only one question, return an array containing that single solution.',
        'Handle boundary and edge cases gracefully (empty input, negative values, zero sizes, memory deallocation in C/C++).',
        commentDirective,
        'Keep explanations crisp, accurate, and tailored to a CS/SE university rubric.',
      ].join(' ');

      const textSections: string[] = [
        `Target Language: ${language} (file extension: ${expectedExt})`,
        `Step-by-Step Comments Enabled: ${includeComments ? 'YES' : 'NO'}`,
      ];

      if (prompt.length > 0) {
        textSections.push('', 'Additional Instructions / Pasted Prompt:', prompt);
      } else {
        textSections.push(
          '',
          'No separate text prompt was typed — extract all questions directly from the attached assignment file(s) and solve every single one.',
        );
      }

      const inferBinaryMime = (name: string, currentMime: string): string => {
        if (currentMime && currentMime !== 'application/octet-stream') return currentMime;
        const ext = name.split('.').pop()?.toLowerCase() ?? '';
        if (ext === 'pdf') return 'application/pdf';
        if (ext === 'png') return 'image/png';
        if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
        if (ext === 'webp') return 'image/webp';
        return currentMime || 'application/pdf';
      };

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
      for (const file of validFiles) {
        if (file.isText) {
          textSections.push('', `--- Uploaded File: ${file.name} ---`, file.data, `--- End of ${file.name} ---`);
        } else {
          const cleanBase64 = file.data.replace(/^data:[^;]+;base64,/i, '').replace(/\s+/g, '');
          if (cleanBase64.length > 0) {
            parts.push({
              inlineData: {
                mimeType: inferBinaryMime(file.name, file.mimeType),
                data: cleanBase64,
              },
            });
          }
        }
      }
      parts.push({ text: textSections.join('\n') });

      const parsed = await callGeminiStructured<SolveResponse>(
        apiKey,
        {
          systemInstruction: { role: 'user', parts: [{ text: systemText }] },
          contents: [{ role: 'user', parts }],
          generationConfig: {
            thinkingConfig: { thinkingLevel: 'LOW' },
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                assignmentTitle: { type: 'STRING' },
                solutions: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      questionNumber: { type: 'INTEGER' },
                      questionTitle: { type: 'STRING' },
                      extractedQuestion: { type: 'STRING' },
                      code: { type: 'STRING' },
                      fileExtension: { type: 'STRING' },
                      approachSummary: { type: 'STRING' },
                      timeComplexity: { type: 'STRING' },
                      spaceComplexity: { type: 'STRING' },
                      keySteps: { type: 'ARRAY', items: { type: 'STRING' } },
                    },
                    required: [
                      'questionNumber',
                      'questionTitle',
                      'extractedQuestion',
                      'code',
                      'fileExtension',
                      'approachSummary',
                      'timeComplexity',
                      'spaceComplexity',
                      'keySteps',
                    ],
                  },
                },
              },
              required: ['assignmentTitle', 'solutions'],
            },
          },
        },
        'Could not parse generated solution(s) from Gemini.',
      );

      const normalizedSolutions = (parsed.solutions ?? []).map((sol, idx) => ({
        ...sol,
        questionNumber: sol.questionNumber || idx + 1,
        fileExtension: sol.fileExtension?.startsWith('.') ? sol.fileExtension : expectedExt,
        keySteps: Array.isArray(sol.keySteps) ? sol.keySteps : [],
      }));

      if (normalizedSolutions.length === 0) {
        throw new Error('No solvable questions could be extracted from the provided input or files.');
      }

      return {
        assignmentTitle: parsed.assignmentTitle || 'Assignment Solution',
        solutions: normalizedSolutions,
      };
    });
  }

  if (route === '/debug') {
    const code = typeof body?.code === 'string' ? body.code : '';
    if (code.trim().length < 5) {
      return jsonResponse({ error: 'Please paste or upload source code to debug and analyze.' }, 400);
    }
    if (!isValidLanguage(body?.language)) {
      return jsonResponse({ error: 'Unsupported language selected.' }, 400);
    }

    const language = body.language;
    const cleanCode = code.trim();

    return streamJsonWork(async () => {
      const systemText = [
        'You are CodeXam, a senior CS/SE code reviewer, static analyzer, and academic integrity mentor.',
        'Perform three thorough analyses on the student code:',
        '1. Bugs & Fixes: Identify syntax errors, logical flaws, off-by-one errors, null/dangling pointers, memory leaks (especially new/delete or malloc/free in C/C++), and edge-case crashes. Provide the fully fixed, working, well-formatted code.',
        '2. Duplication & Generic Pattern Guard: Inspect variable naming, control-flow fingerprints, and boilerplate habits. Flag if it closely resembles overused textbook/online template solutions and provide concrete refactoring tips.',
        '3. Plain-English Code Explainer: Break down the logic section-by-section in clear, accessible bullet points.',
      ].join(' ');

      const parsed = await callGeminiStructured<DebugResponse>(
        apiKey,
        {
          systemInstruction: { role: 'user', parts: [{ text: systemText }] },
          contents: [
            {
              role: 'user',
              parts: [{ text: `Language: ${language}\n\nStudent Source Code to Debug & Analyze:\n${cleanCode}` }],
            },
          ],
          generationConfig: {
            thinkingConfig: { thinkingLevel: 'LOW' },
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                bugsAndFixes: {
                  type: 'OBJECT',
                  properties: {
                    summary: { type: 'STRING' },
                    issues: {
                      type: 'ARRAY',
                      items: {
                        type: 'OBJECT',
                        properties: {
                          severity: { type: 'STRING' },
                          category: { type: 'STRING' },
                          location: { type: 'STRING' },
                          description: { type: 'STRING' },
                          fixExplanation: { type: 'STRING' },
                        },
                        required: ['severity', 'category', 'location', 'description', 'fixExplanation'],
                      },
                    },
                    fixedCode: { type: 'STRING' },
                  },
                  required: ['summary', 'issues', 'fixedCode'],
                },
                originalityGuard: {
                  type: 'OBJECT',
                  properties: {
                    similarityRisk: { type: 'STRING' },
                    assessment: { type: 'STRING' },
                    flaggedPatterns: {
                      type: 'ARRAY',
                      items: {
                        type: 'OBJECT',
                        properties: {
                          pattern: { type: 'STRING' },
                          reason: { type: 'STRING' },
                        },
                        required: ['pattern', 'reason'],
                      },
                    },
                    refactoringTips: {
                      type: 'ARRAY',
                      items: {
                        type: 'OBJECT',
                        properties: {
                          original: { type: 'STRING' },
                          suggested: { type: 'STRING' },
                          rationale: { type: 'STRING' },
                        },
                        required: ['original', 'suggested', 'rationale'],
                      },
                    },
                  },
                  required: ['similarityRisk', 'assessment', 'flaggedPatterns', 'refactoringTips'],
                },
                plainEnglishExplainer: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      sectionTitle: { type: 'STRING' },
                      lines: { type: 'STRING' },
                      explanation: { type: 'STRING' },
                    },
                    required: ['sectionTitle', 'lines', 'explanation'],
                  },
                },
              },
              required: ['bugsAndFixes', 'originalityGuard', 'plainEnglishExplainer'],
            },
          },
        },
        'Could not parse debugging report from Gemini.',
      );

      const normalizedIssues = (parsed.bugsAndFixes?.issues ?? []).map((issue) => {
        const sev = issue.severity?.toLowerCase();
        const validSeverity: 'critical' | 'warning' | 'info' =
          sev === 'critical' || sev === 'warning' || sev === 'info' ? sev : 'warning';
        return { ...issue, severity: validSeverity };
      });

      const riskRaw = parsed.originalityGuard?.similarityRisk;
      const validRisk: 'Low' | 'Moderate' | 'High' =
        riskRaw === 'Low' || riskRaw === 'Moderate' || riskRaw === 'High' ? riskRaw : 'Moderate';

      return {
        bugsAndFixes: {
          summary: parsed.bugsAndFixes?.summary ?? 'Analysis complete.',
          issues: normalizedIssues,
          fixedCode: parsed.bugsAndFixes?.fixedCode ?? cleanCode,
        },
        originalityGuard: {
          similarityRisk: validRisk,
          assessment: parsed.originalityGuard?.assessment ?? '',
          flaggedPatterns: parsed.originalityGuard?.flaggedPatterns ?? [],
          refactoringTips: parsed.originalityGuard?.refactoringTips ?? [],
        },
        plainEnglishExplainer: parsed.plainEnglishExplainer ?? [],
      };
    });
  }

  if (route === '/viva') {
    const code = typeof body?.code === 'string' ? body.code : '';
    if (code.trim().length < 5) {
      return jsonResponse(
        { error: 'Please paste or upload your solved assignment code before generating viva prep.' },
        400,
      );
    }

    const resolvedLanguage: SupportedLanguage = isValidLanguage(body?.language)
      ? body.language
      : 'C++';
    const resolvedStrictness: ExaminerStrictness = isValidStrictness(body?.strictness)
      ? body.strictness
      : 'friendly';
    const cleanCode = code.trim();

    return streamJsonWork(async () => {
      const personaDirective =
        resolvedStrictness === 'strict'
          ? 'Adopt the persona of a Strict University Viva Examiner: ask probing, rigorous cross-examination questions that test deep understanding of memory, edge cases, invariants, Big-O tradeoffs, and alternative implementations.'
          : 'Adopt the persona of a Friendly Lab TA: ask supportive yet sharp conceptual questions that check whether the student genuinely understands their own loops, conditions, functions, and edge cases, with encouraging hints.';

      const systemText = [
        'You are CodeXam, a university CS/SE viva and live-demo preparation coach.',
        personaDirective,
        'Generate: 1. A clear 2-Minute Live Demo Script walking sequentially through the execution flow from the entry point to termination. 2. Exactly 8 sharp, code-specific Viva Questions & Model Answers referencing actual identifiers found in the submitted code.',
      ].join(' ');

      const parsed = await callGeminiStructured<VivaResponse>(
        apiKey,
        {
          systemInstruction: { role: 'user', parts: [{ text: systemText }] },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Language: ${resolvedLanguage}\nExaminer Mode: ${resolvedStrictness === 'strict' ? 'Strict Viva Examiner' : 'Friendly Lab TA'}\n\nStudent Final Assignment Code:\n${cleanCode}`,
                },
              ],
            },
          ],
          generationConfig: {
            thinkingConfig: { thinkingLevel: 'LOW' },
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                demoScript: {
                  type: 'OBJECT',
                  properties: {
                    overview: { type: 'STRING' },
                    estimatedDuration: { type: 'STRING' },
                    steps: {
                      type: 'ARRAY',
                      items: {
                        type: 'OBJECT',
                        properties: {
                          stepNumber: { type: 'INTEGER' },
                          phase: { type: 'STRING' },
                          talkingPoint: { type: 'STRING' },
                          codeFocus: { type: 'STRING' },
                        },
                        required: ['stepNumber', 'phase', 'talkingPoint', 'codeFocus'],
                      },
                    },
                  },
                  required: ['overview', 'estimatedDuration', 'steps'],
                },
                vivaQuestions: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      id: { type: 'INTEGER' },
                      topic: { type: 'STRING' },
                      difficulty: { type: 'STRING' },
                      question: { type: 'STRING' },
                      hint: { type: 'STRING' },
                      modelAnswer: { type: 'STRING' },
                      codeReference: { type: 'STRING' },
                    },
                    required: ['id', 'topic', 'difficulty', 'question', 'hint', 'modelAnswer', 'codeReference'],
                  },
                },
              },
              required: ['demoScript', 'vivaQuestions'],
            },
          },
        },
        'Could not parse viva preparation guide from Gemini.',
      );

      const normalizedQuestions = (parsed.vivaQuestions ?? []).slice(0, 8).map((q, idx) => {
        const diff = q.difficulty;
        const validDifficulty: 'Core' | 'Edge Case' | 'Deep Dive' =
          diff === 'Core' || diff === 'Edge Case' || diff === 'Deep Dive' ? diff : 'Core';
        return {
          ...q,
          id: idx + 1,
          difficulty: validDifficulty,
        };
      });

      return {
        demoScript: {
          overview: parsed.demoScript?.overview ?? '',
          estimatedDuration: parsed.demoScript?.estimatedDuration ?? '2:00 min',
          steps: parsed.demoScript?.steps ?? [],
        },
        vivaQuestions: normalizedQuestions,
      };
    });
  }

  return jsonResponse({ error: `Unknown API route: ${route}` }, 404);
}
