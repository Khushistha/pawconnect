import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool } from './pool.js';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function migrate({ closePool = false } = {}) {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = await fs.readFile(schemaPath, 'utf8');

  // schema.sql contains only CREATE TABLE statements, safe to run in one go.
  await pool.query(sql);

  // Seed superadmin if configured and not present
  if (env.SUPERADMIN_EMAIL && env.SUPERADMIN_PASSWORD) {
    const email = env.SUPERADMIN_EMAIL.toLowerCase();
    const [rows] = await pool.query(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      const id = uuidv4();
      const passwordHash = await bcrypt.hash(env.SUPERADMIN_PASSWORD, 10);
      await pool.query(
        `INSERT INTO users (id, email, password_hash, name, role)
         VALUES (?, ?, ?, ?, 'superadmin')`,
        [id, email, passwordHash, env.SUPERADMIN_NAME]
      );
      // eslint-disable-next-line no-console
      console.log(`👑 Superadmin created with email: ${email}`);
    }
  }

  // eslint-disable-next-line no-console
  console.log('✅ Migration complete');
  if (closePool) await pool.end();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate({ closePool: true }).catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error('❌ Migration failed:', err);
    try {
      await pool.end();
    } catch {
      // ignore
    }
    process.exit(1);
  });
}

