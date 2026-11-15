import {
  GeminiServiceError,
  debugAndAnalyze,
  prepareViva,
  solveAssignment,
} from '../../server/geminiService.ts';
import type {
  ExaminerStrictness,
  SupportedLanguage,
} from '../../src/types/codexam.ts';

const VALID_LANGUAGES: SupportedLanguage[] = [
  'C++',
  'Python',
  'Java',
  'JavaScript',
  'C',
  'SQL',
];

function isValidLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && VALID_LANGUAGES.includes(value as SupportedLanguage);
}

function isValidStrictness(value: unknown): value is ExaminerStrictness {
  return value === 'friendly' || value === 'strict';
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const route = url.pathname
    .replace(/^\/\.netlify\/functions\/api/, '')
    .replace(/^\/api/, '');

  if (req.method === 'GET' && (route === '/health' || route === '' || route === '/')) {
    return jsonResponse({ status: 'ok', service: 'CodeXam', runtime: 'netlify-function' });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;

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

      const result = await solveAssignment({
        prompt,
        files: validFiles,
        language: body.language,
        includeComments: Boolean(body?.includeComments),
      });
      return jsonResponse(result);
    }

    if (route === '/debug') {
      const code = typeof body?.code === 'string' ? body.code : '';
      if (code.trim().length < 5) {
        return jsonResponse(
          { error: 'Please paste or upload source code to debug and analyze.' },
          400,
        );
      }
      if (!isValidLanguage(body?.language)) {
        return jsonResponse({ error: 'Unsupported language selected.' }, 400);
      }

      const result = await debugAndAnalyze({
        code: code.trim(),
        language: body.language,
      });
      return jsonResponse(result);
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

      const result = await prepareViva({
        code: code.trim(),
        language: resolvedLanguage,
        strictness: resolvedStrictness,
      });
      return jsonResponse(result);
    }

    return jsonResponse({ error: `Unknown API route: ${route}` }, 404);
  } catch (error) {
    const status = error instanceof GeminiServiceError ? error.statusCode : 500;
    const message =
      error instanceof Error ? error.message : 'Unexpected server error.';
    return jsonResponse({ error: message }, status);
  }
}
