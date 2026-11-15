import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  GeminiServiceError,
  debugAndAnalyze,
  prepareViva,
  solveAssignment,
} from './server/geminiService.ts';
import type {
  ExaminerStrictness,
  SupportedLanguage,
} from './src/types/codexam.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '20mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'CodeXam' });
  });

  app.post('/api/solve', async (req, res) => {
    try {
      const { prompt, files, language, includeComments } = req.body ?? {};
      const cleanPrompt = typeof prompt === 'string' ? prompt.trim() : '';
      const validFiles = Array.isArray(files)
        ? files.filter(
            (f) =>
              f &&
              typeof f.name === 'string' &&
              typeof f.mimeType === 'string' &&
              typeof f.data === 'string' &&
              f.data.length > 0,
          )
        : [];

      if (cleanPrompt.length < 5 && validFiles.length === 0) {
        res.status(400).json({
          error:
            'Please upload an assignment file (PDF, image, or text) or enter a problem statement.',
        });
        return;
      }
      if (!isValidLanguage(language)) {
        res.status(400).json({ error: 'Unsupported target language selected.' });
        return;
      }

      const result = await solveAssignment({
        prompt: cleanPrompt,
        files: validFiles,
        language,
        includeComments: Boolean(includeComments),
      });
      res.json(result);
    } catch (error) {
      const status = error instanceof GeminiServiceError ? error.statusCode : 500;
      const message =
        error instanceof Error ? error.message : 'Unexpected server error while solving assignment.';
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/debug', async (req, res) => {
    try {
      const { code, language } = req.body ?? {};
      if (typeof code !== 'string' || code.trim().length < 5) {
        res.status(400).json({
          error: 'Please paste or upload source code to debug and analyze.',
        });
        return;
      }
      if (!isValidLanguage(language)) {
        res.status(400).json({ error: 'Unsupported language selected.' });
        return;
      }

      const result = await debugAndAnalyze({
        code: code.trim(),
        language,
      });
      res.json(result);
    } catch (error) {
      const status = error instanceof GeminiServiceError ? error.statusCode : 500;
      const message =
        error instanceof Error ? error.message : 'Unexpected server error while debugging code.';
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/viva', async (req, res) => {
    try {
      const { code, language, strictness } = req.body ?? {};
      if (typeof code !== 'string' || code.trim().length < 5) {
        res.status(400).json({
          error: 'Please paste or upload your solved assignment code before generating viva prep.',
        });
        return;
      }
      const resolvedLanguage: SupportedLanguage = isValidLanguage(language) ? language : 'C++';
      const resolvedStrictness: ExaminerStrictness = isValidStrictness(strictness)
        ? strictness
        : 'friendly';

      const result = await prepareViva({
        code: code.trim(),
        language: resolvedLanguage,
        strictness: resolvedStrictness,
      });
      res.json(result);
    } catch (error) {
      const status = error instanceof GeminiServiceError ? error.statusCode : 500;
      const message =
        error instanceof Error ? error.message : 'Unexpected server error while generating viva prep.';
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`CodeXam server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start CodeXam server:', err);
  process.exit(1);
});
