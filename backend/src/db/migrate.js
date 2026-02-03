import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function migrate({ closePool = false } = {}) {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = await fs.readFile(schemaPath, 'utf8');

  // schema.sql contains only CREATE TABLE statements, safe to run in one go.
  await pool.query(sql);

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

