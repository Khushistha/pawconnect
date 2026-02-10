import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load env from (in order):
// 1) ENV_FILE (absolute or relative)
// 2) backend/.env
// 3) project-root .env
const explicitEnvFile = process.env.ENV_FILE;
const candidates = [
  explicitEnvFile ? path.resolve(process.cwd(), explicitEnvFile) : null,
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
].filter(Boolean);

for (const p of candidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

// Support common alternative variable names (helps when reusing an existing .env)
const normalized = {
  ...process.env,
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN ?? process.env.FRONTEND_URL,
  MYSQL_HOST: process.env.MYSQL_HOST ?? process.env.DB_HOST,
  MYSQL_PORT: process.env.MYSQL_PORT ?? process.env.DB_PORT,
  MYSQL_USER: process.env.MYSQL_USER ?? process.env.DB_USER,
  MYSQL_PASSWORD: process.env.MYSQL_PASSWORD ?? process.env.DB_PASSWORD,
  MYSQL_DATABASE: process.env.MYSQL_DATABASE ?? process.env.DB_NAME,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM ?? process.env.EMAIL_USER,
};

const envSchema = z.object({
  NODE_ENV: z.string().optional().default('development'),
  PORT: z.coerce.number().int().positive().optional().default(8080),
  FRONTEND_ORIGIN: z.string().optional().default('http://localhost:5173'),
  AUTO_MIGRATE: z
    .enum(['true', 'false'])
    .optional()
    .default('true')
    .transform((v) => v === 'true'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().optional().default('7d'),

  SUPERADMIN_EMAIL: z.string().email().optional(),
  SUPERADMIN_PASSWORD: z.string().min(8).optional(),
  SUPERADMIN_NAME: z.string().min(2).optional().default('Super Admin'),

  MYSQL_HOST: z.string().min(1),
  MYSQL_PORT: z.coerce.number().int().positive().optional().default(3306),
  MYSQL_USER: z.string().min(1),
  MYSQL_PASSWORD: z.string().optional().default(''),
  MYSQL_DATABASE: z.string().min(1),

  // Cloudinary (for image/document uploads)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Email (for notifications and OTP)
  EMAIL_USER: z.string().email().optional(),
  EMAIL_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
});

export const env = envSchema.parse(normalized);

