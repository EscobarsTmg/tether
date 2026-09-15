import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { writeAudit } from './persistence/bankPersistence.js';

const app = express();
const port = Number(process.env.SCRAPER_PORT || 3001);
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '32kb' }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  console.info(`[automation] ${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/connect', async (req, res) => {
  try {
    const { bankId, connectionId } = req.body ?? {};
    if (typeof bankId !== 'string' || !bankId.trim()) {
      return res.status(400).json({ error: 'bankId is required' });
    }
    if (connectionId !== undefined && (typeof connectionId !== 'string' || !connectionId.trim())) {
      return res.status(400).json({ error: 'connectionId must be a non-empty string' });
    }

    await writeAudit('bank_connect_requested', `${bankId}: authorization requested`);

    // USER_IMPLEMENT: start the provider-hosted OAuth/SCA authorization flow here.
    // Do not collect bank passwords, PINs, OTPs, or browser session cookies in this endpoint.
    return res.status(202).json({
      status: 'authorization_required',
      bankId,
      connectionId: connectionId ?? null,
      message: 'Continue with the bank/provider authorization flow.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[automation] connect failed:', message);
    return res.status(500).json({ error: 'Unable to start bank authorization' });
  }
});

app.post('/api/sync', async (req, res) => {
  try {
    const { connectionId } = req.body ?? {};
    if (typeof connectionId !== 'string' || !connectionId.trim()) {
      return res.status(400).json({ error: 'connectionId is required' });
    }

    await writeAudit('bank_sync_requested', `${connectionId}: synchronization requested`);

    // USER_IMPLEMENT: invoke an authorized provider adapter here after resolving a
    // provider-issued consent/token reference for connectionId. The HTTP layer must
    // not accept raw bank credentials or browser cookies.
    return res.status(501).json({
      status: 'adapter_required',
      connectionId,
      message: 'Authorized provider adapter is not configured yet.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[automation] sync failed:', message);
    return res.status(500).json({ error: 'Unable to synchronize bank connection' });
  }
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[automation] request error:', error.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.info(`[automation] HTTP service listening on :${port}`);
});
