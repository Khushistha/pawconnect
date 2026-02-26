import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { dogsRouter } from './routes/dogs.js';
import { reportsRouter } from './routes/reports.js';
import { adoptionsRouter } from './routes/adoptions.js';
import { notificationsRouter } from './routes/notifications.js';
import { volunteersRouter } from './routes/volunteers.js';
import { verificationsRouter } from './routes/verifications.js';
import { profileRouter } from './routes/profile.js';
import { ngosRouter } from './routes/ngos.js';
import { vetsRouter } from './routes/vets.js';
import { medicalRecordsRouter } from './routes/medical-records.js';
import { donationsRouter } from './routes/donations.js';
import { errorHandler } from './middleware/errorHandler.js';
import { pingDb } from './db/pool.js';
import { migrate } from './db/migrate.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  })
);

app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Increased limit to handle base64-encoded images (base64 increases size by ~33%)
// Allow up to 10MB for reports with photos
app.use(express.json({ limit: '10mb' }));

app.get('/', (_req, res) => res.json({ ok: true, service: 'rescue-roots-nepal-backend' }));

app.use('/api', healthRouter);
app.use('/api', authRouter);
// Mount profile router early to avoid conflicts with other routers
app.use('/api', profileRouter);
// Mount reports router BEFORE dogs router to avoid route conflicts
app.use('/api', reportsRouter);
app.use('/api', dogsRouter);

// Scope adoption routes under /api/adoptions so their auth guard
// does not affect other public routes like /api/donations.
app.use('/api/adoptions', adoptionsRouter);

// Scope notifications routes under /api/notifications so their auth guard
// does not affect other public routes like /api/donations.
app.use('/api/notifications', notificationsRouter);

// Scope volunteers router under /api/volunteers so its superadmin-only guard
// does not affect other public or NGO-admin routes like /api/dogs.
app.use('/api/volunteers', volunteersRouter);
app.use('/api/verifications', verificationsRouter);

// Mount vets router at specific path to avoid middleware conflicts
app.use('/api/vets', vetsRouter);

// Other feature routers
app.use('/api', medicalRecordsRouter);
app.use('/api', donationsRouter);
app.use('/api', ngosRouter);

app.use(errorHandler);

async function start() {
  // eslint-disable-next-line no-console
  console.log('🔌 Connecting to MySQL...');
  await pingDb();

  if (env.AUTO_MIGRATE) {
    // eslint-disable-next-line no-console
    console.log('🗄️  Auto-migrate enabled: ensuring tables exist...');
    await migrate();
  }

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`✅ Backend listening on http://localhost:${env.PORT}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Failed to start backend:', err);
  process.exit(1);
});

