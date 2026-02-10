import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';

export const volunteersRouter = Router();

// All routes require authentication
volunteersRouter.use(requireAuth);

// Only superadmin can access volunteer management
function requireSuperadmin(req, res, next) {
  if (req.user?.role !== 'superadmin') {
    return next(new HttpError(403, 'Only superadmin can manage volunteers'));
  }
  next();
}

volunteersRouter.use(requireSuperadmin);

const createVolunteerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  phone: z.string().min(6).optional(),
  organization: z.string().min(2).optional(),
});

const updateVolunteerSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).optional(),
  phone: z.string().min(6).optional().nullable(),
  organization: z.string().min(2).optional().nullable(),
  password: z.string().min(8).optional(),
});

// GET /api/volunteers - List all volunteers
volunteersRouter.get('/volunteers', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, email, name, role, phone, organization, created_at
       FROM users 
       WHERE role = 'volunteer'
       ORDER BY created_at DESC`
    );

    const volunteers = rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      phone: row.phone ?? undefined,
      organization: row.organization ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
    }));

    res.json({ volunteers });
  } catch (err) {
    next(err);
  }
});

// GET /api/volunteers/:id - Get single volunteer
volunteersRouter.get('/volunteers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT id, email, name, role, phone, organization, created_at
       FROM users 
       WHERE id = ? AND role = 'volunteer'
       LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      throw new HttpError(404, 'Volunteer not found');
    }

    const volunteer = {
      id: rows[0].id,
      email: rows[0].email,
      name: rows[0].name,
      role: rows[0].role,
      phone: rows[0].phone ?? undefined,
      organization: rows[0].organization ?? undefined,
      createdAt: new Date(rows[0].created_at).toISOString(),
    };

    res.json({ volunteer });
  } catch (err) {
    next(err);
  }
});

// POST /api/volunteers - Create new volunteer
volunteersRouter.post('/volunteers', async (req, res, next) => {
  try {
    const data = createVolunteerSchema.parse(req.body);
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(data.password, 10);

    try {
      await pool.query(
        `INSERT INTO users (id, email, password_hash, name, role, phone, organization)
         VALUES (?, ?, ?, ?, 'volunteer', ?, ?)`,
        [
          id,
          data.email.toLowerCase(),
          passwordHash,
          data.name,
          data.phone ?? null,
          data.organization ?? null,
        ]
      );
    } catch (e) {
      if (e?.code === 'ER_DUP_ENTRY') {
        throw new HttpError(409, 'Email already registered');
      }
      throw e;
    }

    const volunteer = {
      id,
      email: data.email.toLowerCase(),
      name: data.name,
      role: 'volunteer',
      phone: data.phone ?? undefined,
      organization: data.organization ?? undefined,
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({ volunteer });
  } catch (err) {
    next(err);
  }
});

// PUT /api/volunteers/:id - Update volunteer
volunteersRouter.put('/volunteers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = updateVolunteerSchema.parse(req.body);

    // Check if volunteer exists
    const [existing] = await pool.query(
      `SELECT id FROM users WHERE id = ? AND role = 'volunteer' LIMIT 1`,
      [id]
    );

    if (existing.length === 0) {
      throw new HttpError(404, 'Volunteer not found');
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email.toLowerCase());
    }
    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      values.push(data.phone);
    }
    if (data.organization !== undefined) {
      updates.push('organization = ?');
      values.push(data.organization);
    }
    if (data.password !== undefined) {
      const passwordHash = await bcrypt.hash(data.password, 10);
      updates.push('password_hash = ?');
      values.push(passwordHash);
    }

    if (updates.length === 0) {
      throw new HttpError(400, 'No fields to update');
    }

    values.push(id);

    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND role = 'volunteer'`,
      values
    );

    // Fetch updated volunteer
    const [rows] = await pool.query(
      `SELECT id, email, name, role, phone, organization, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [id]
    );

    const volunteer = {
      id: rows[0].id,
      email: rows[0].email,
      name: rows[0].name,
      role: rows[0].role,
      phone: rows[0].phone ?? undefined,
      organization: rows[0].organization ?? undefined,
      createdAt: new Date(rows[0].created_at).toISOString(),
    };

    res.json({ volunteer });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/volunteers/:id - Delete volunteer
volunteersRouter.delete('/volunteers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      `DELETE FROM users WHERE id = ? AND role = 'volunteer'`,
      [id]
    );

    if (result.affectedRows === 0) {
      throw new HttpError(404, 'Volunteer not found');
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
