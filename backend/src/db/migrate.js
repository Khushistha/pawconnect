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

  // ----- Additive migrations (safe to run multiple times) -----
  async function columnExists(table, column) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) as cnt
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?`,
      [table, column]
    );
    return Number(rows?.[0]?.cnt ?? 0) > 0;
  }

  // dogs.created_by - used to route adoption notifications to the NGO who manages the dog
  if (!(await columnExists('dogs', 'created_by'))) {
    await pool.query(`ALTER TABLE dogs ADD COLUMN created_by CHAR(36) NULL AFTER adopter_id`);
    await pool.query(`CREATE INDEX idx_dogs_created_by ON dogs(created_by)`);
  }

  // dogs.vet_id + treatment_status - used to assign patients to veterinarians
  if (!(await columnExists('rescue_reports', 'assigned_ngo_id'))) {
    await pool.query(
      `ALTER TABLE rescue_reports ADD COLUMN assigned_ngo_id CHAR(36) NULL AFTER dog_id`
    );
    await pool.query(`CREATE INDEX idx_reports_assigned_ngo ON rescue_reports (assigned_ngo_id)`);
  }

  if (!(await columnExists('dogs', 'vet_id'))) {
    await pool.query(
      `ALTER TABLE dogs
         ADD COLUMN vet_id CHAR(36) NULL AFTER adopter_id,
         ADD COLUMN treatment_status ENUM('pending','in_progress','completed') NOT NULL DEFAULT 'pending' AFTER vet_id`
    );
    await pool.query(`CREATE INDEX idx_dogs_vet ON dogs(vet_id)`);
  }

  // medical_records table - created by veterinarians
  async function tableExists(tableName) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) as cnt
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?`,
      [tableName]
    );
    return Number(rows?.[0]?.cnt ?? 0) > 0;
  }

  if (!(await tableExists('signup_verification_otps'))) {
    await pool.query(`
      CREATE TABLE signup_verification_otps (
        id CHAR(36) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(120) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('volunteer','adopter') NOT NULL,
        phone VARCHAR(40) NOT NULL,
        organization VARCHAR(255) NULL,
        otp VARCHAR(6) NOT NULL,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_signup_otp_email (email),
        INDEX idx_signup_otp_expires (expires_at),
        INDEX idx_signup_otp_used (used)
      )
    `);
  }

  if (!(await tableExists('medical_records'))) {
    await pool.query(`
      CREATE TABLE medical_records (
        id CHAR(36) PRIMARY KEY,
        dog_id CHAR(36) NOT NULL,
        vet_id CHAR(36) NOT NULL,
        record_type ENUM('vaccination','sterilization','treatment','checkup') NOT NULL,
        description TEXT NOT NULL,
        medications TEXT NULL,
        next_follow_up DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_medical_records_dog FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE CASCADE,
        CONSTRAINT fk_medical_records_vet FOREIGN KEY (vet_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_medical_records_dog (dog_id),
        INDEX idx_medical_records_vet (vet_id),
        INDEX idx_medical_records_created (created_at)
      )
    `);
  }

  // donations table - for Stripe payment tracking
  if (!(await tableExists('donations'))) {
    await pool.query(`
      CREATE TABLE donations (
        id CHAR(36) PRIMARY KEY,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'usd',
        donor_name VARCHAR(120) NULL,
        donor_email VARCHAR(255) NULL,
        message TEXT NULL,
        stripe_session_id VARCHAR(255) NULL,
        stripe_payment_intent_id VARCHAR(255) NULL,
        status ENUM('pending','completed','failed') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        paid_at DATETIME NULL,
        INDEX idx_donations_status (status),
        INDEX idx_donations_created (created_at)
      )
    `);
  }

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

