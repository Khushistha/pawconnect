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
import { volunteersRouter } from './routes/volunteers.js';
import { verificationsRouter } from './routes/verifications.js';
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

app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => res.json({ ok: true, service: 'rescue-roots-nepal-backend' }));

app.use('/api', healthRouter);
app.use('/api', authRouter);
app.use('/api', dogsRouter);
app.use('/api', reportsRouter);
app.use('/api', volunteersRouter);
app.use('/api', verificationsRouter);

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

