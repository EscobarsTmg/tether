import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import { scraperFactory } from './scrapers/scraperFactory.js';
import { ensureConnection, ensureAccount, persistTransactions } from './persistence/bankPersistence.js';

const app = express();

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const SCRAPER_PORT = Number(process.env.SCRAPER_PORT || 3001);

app.use(express.json());
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// --- HEALTH ---
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// --- CONNECT ---
app.post('/api/connect', async (req, res) => {
  const { bankId, connectionId, credentials } = req.body;
  // credentials = { username, password }  → frontend'den gelir, kullanıldıktan sonra ATILIR

  if (!bankId || !credentials?.username || !credentials?.password) {
    return res.status(400).json({ error: 'bankId, username, password zorunlu' });
  }

  const browser = await puppeteer.launch({
    headless: process.env.NODE_ENV === 'production',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    const connection = await ensureConnection(bankId, { bankName: bankId });
    const scraper = scraperFactory(bankId, connection.id, credentials);

    // 👇 USER_IMPLEMENT kısmının scraper versiyonu
    await page.goto(scraper.config.startUrl, { waitUntil: 'networkidle2' });
    await scraper.loginAndGetSession(page);
    await scraper.saveCookies(page); // çerezler Supabase'e gider

    await browser.close();
    // credentials burada scope dışına çıkar, saklanmaz.
    res.json({ success: true, connectionId: connection.id });
  } catch (err: any) {
    await browser.close();
    res.status(500).json({ error: err.message });
  }
});

// --- SYNC ---
app.post('/api/sync', async (req, res) => {
  const { connectionId, bankId } = req.body;
  if (!connectionId || !bankId) {
    return res.status(400).json({ error: 'connectionId ve bankId zorunlu' });
  }

  const browser = await puppeteer.launch({
    headless: process.env.NODE_ENV === 'production',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const scraper = scraperFactory(bankId, connectionId, null); // credential gerekmiyor, cookie var

    const hasCookies = await scraper.loadCookies(page);
    if (!hasCookies) {
      await browser.close();
      return res.status(401).json({ error: 'SESSION_EXPIRED', message: 'Yeniden bağlanmanız gerekiyor' });
    }

    await page.goto(scraper.config.startUrl, { waitUntil: 'networkidle2' });
    const snapshot = await scraper.scrapeAccountSnapshot(page);

    // Supabase'e yaz
    const account = await ensureAccount(connectionId, snapshot);
    await persistTransactions(account.id, snapshot.transactions);

    // Çerezleri yenile (bankalar her istekte cookie yeniler)
    await scraper.saveCookies(page);

    await browser.close();
    res.json({ success: true, account });
  } catch (err: any) {
    await browser.close();
    res.status(500).json({ error: err.message });
  }
});

// --- ERROR HANDLER ---
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal error' });
});

app.listen(SCRAPER_PORT, '0.0.0.0', () => {
  console.log(`✅ Scraper server çalışıyor: http://0.0.0.0:${SCRAPER_PORT}`);
  console.log(`   Frontend origin: ${FRONTEND_ORIGIN}`);
});