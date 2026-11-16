import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import {
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

async function streamEndpoint<T>(
  _req: Request,
  res: Response,
  initialStatus: string,
  runner: (emitPartial: (partial: T) => void) => Promise<T>,
): Promise<void> {
  let clientClosed = false;
  res.on('close', () => {
    if (!res.writableFinished) {
      clientClosed = true;
    }
  });

  res.status(200);
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const writeEvent = (payload: unknown) => {
    if (clientClosed || res.destroyed || res.writableEnded) return;
    res.write(`${JSON.stringify(payload)}\n`);
  };

  writeEvent({ type: 'status', message: initialStatus });

  try {
    const result = await runner((partial) => {
      writeEvent({ type: 'partial', data: partial });
    });
    writeEvent({ type: 'done', data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    writeEvent({ type: 'error', error: message });
  } finally {
    if (!res.writableEnded && !res.destroyed) {
      res.end();
    }
  }
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '20mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'CodeXam' });
  });

  app.post('/api/solve', async (req, res) => {
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

    const initialStatus =
      validFiles.length > 0
        ? `Reading uploaded file(s) and streaming ${language} solutions...`
        : `Analyzing problem and streaming ${language} solution...`;

    await streamEndpoint(req, res, initialStatus, (onPartial) =>
      solveAssignment(
        {
          prompt: cleanPrompt,
          files: validFiles,
          language,
          includeComments: Boolean(includeComments),
        },
        onPartial,
      ),
    );
  });

  app.post('/api/debug', async (req, res) => {
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

    await streamEndpoint(
      req,
      res,
      `Scanning ${language} code for bugs, traps & boilerplate...`,
      (onPartial) =>
        debugAndAnalyze(
          {
            code: code.trim(),
            language,
          },
          onPartial,
        ),
    );
  });

  app.post('/api/viva', async (req, res) => {
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

    await streamEndpoint(
      req,
      res,
      `Preparing ${resolvedStrictness === 'strict' ? 'strict examiner' : 'friendly TA'} demo script & viva questions...`,
      (onPartial) =>
        prepareViva(
          {
            code: code.trim(),
            language: resolvedLanguage,
            strictness: resolvedStrictness,
          },
          onPartial,
        ),
    );
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
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

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`CodeXam server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start CodeXam server:', err);
  process.exit(1);
});
