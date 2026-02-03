import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/pool.js';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  role: z.enum(['public', 'ngo_admin', 'volunteer', 'veterinarian', 'adopter']).optional(),
  phone: z.string().min(6).optional(),
  organization: z.string().min(2).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, name: user.name },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

authRouter.post('/auth/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(data.password, 10);

    try {
      await pool.query(
        `INSERT INTO users (id, email, password_hash, name, role, phone, organization)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.email.toLowerCase(),
          passwordHash,
          data.name,
          data.role ?? 'public',
          data.phone ?? null,
          data.organization ?? null,
        ]
      );
    } catch (e) {
      // Duplicate email
      if (e?.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Email already registered');
      throw e;
    }

    const user = {
      id,
      email: data.email.toLowerCase(),
      name: data.name,
      role: data.role ?? 'public',
      phone: data.phone ?? undefined,
      organization: data.organization ?? undefined,
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/auth/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const [rows] = await pool.query(
      `SELECT id, email, password_hash, name, role, avatar, phone, organization, created_at
       FROM users WHERE email = ? LIMIT 1`,
      [data.email.toLowerCase()]
    );

    const userRow = rows?.[0];
    if (!userRow) throw new HttpError(401, 'Invalid email or password');

    const ok = await bcrypt.compare(data.password, userRow.password_hash);
    if (!ok) throw new HttpError(401, 'Invalid email or password');

    const user = {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      role: userRow.role,
      avatar: userRow.avatar ?? undefined,
      phone: userRow.phone ?? undefined,
      organization: userRow.organization ?? undefined,
      createdAt: new Date(userRow.created_at).toISOString(),
    };

    res.json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
});

