import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';

export const vetsRouter = Router();

// GET /api/vets - List approved veterinarians (public endpoint, accessible to all)
vetsRouter.get('/', async (req, res, next) => {
  try {

    // Get all veterinarians who can log in
    // Login enforces 'approved' status for vets, so we include:
    // - 'approved' status (normal case)
    // - NULL status (legacy accounts created before verification was required)
    // Note: If a vet can log in, they must have 'approved' status per login logic,
    // but we include NULL to handle edge cases
    const [rows] = await pool.query(
      `SELECT id, name, email, phone, organization, verification_status
       FROM users
       WHERE role = 'veterinarian'
         AND (verification_status = 'approved' OR verification_status IS NULL)
       ORDER BY name ASC`
    );

    // Debug logging to help diagnose issues
    // eslint-disable-next-line no-console
    if (rows.length === 0) {
      // Check if there are any vets at all to help diagnose
      const [allVets] = await pool.query(
        `SELECT id, name, email, verification_status 
         FROM users 
         WHERE role = 'veterinarian'`
      );
      // eslint-disable-next-line no-console
      console.log(`[GET /api/vets] No approved vets found. Total vets in DB:`, 
        allVets.map(v => ({ 
          id: v.id, 
          name: v.name, 
          email: v.email, 
          status: v.verification_status 
        }))
      );
    } else {
      // eslint-disable-next-line no-console
      console.log(`[GET /api/vets] Found ${rows.length} veterinarian(s):`, 
        rows.map(r => r.name).join(', ')
      );
    }

    res.json({
      items: rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone ?? undefined,
        organization: u.organization ?? undefined,
      })),
    });
  } catch (err) {
    next(err);
  }
});

