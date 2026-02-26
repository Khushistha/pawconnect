import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';
import { sendVerificationApprovedEmail, sendVerificationRejectedEmail } from '../utils/email.js';

export const verificationsRouter = Router();

// All routes require authentication
verificationsRouter.use(requireAuth);

// Only superadmin can access verification management
function requireSuperadmin(req, res, next) {
  if (req.user?.role !== 'superadmin') {
    return next(new HttpError(403, 'Only superadmin can manage verifications'));
  }
  next();
}

verificationsRouter.use(requireSuperadmin);

const rejectSchema = z.object({
  rejectionReason: z.string().optional(),
});

// GET /api/verifications/pending - Get all pending verifications
verificationsRouter.get('/pending', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, email, name, role, phone, organization, 
              verification_document_url, verification_status, 
              rejection_reason, created_at
       FROM users 
       WHERE verification_status = 'pending'
         AND role IN ('veterinarian', 'ngo_admin')
       ORDER BY created_at ASC`
    );

    const pendingUsers = rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      phone: row.phone ?? undefined,
      organization: row.organization ?? undefined,
      verificationDocumentUrl: row.verification_document_url ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
    }));

    res.json({ users: pendingUsers });
  } catch (err) {
    next(err);
  }
});

// POST /api/verifications/:id/approve - Approve a user
verificationsRouter.post('/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.sub;

    // Check if user exists and is pending
    const [existing] = await pool.query(
      `SELECT id, verification_status FROM users 
       WHERE id = ? AND role IN ('veterinarian', 'ngo_admin') LIMIT 1`,
      [id]
    );

    if (existing.length === 0) {
      throw new HttpError(404, 'User not found');
    }

    if (existing[0].verification_status !== 'pending') {
      throw new HttpError(400, 'User is not pending verification');
    }

    // Get user details before updating
    const [userRows] = await pool.query(
      `SELECT email, name, role FROM users WHERE id = ? LIMIT 1`,
      [id]
    );
    const user = userRows[0];

    // Update verification status
    await pool.query(
      `UPDATE users 
       SET verification_status = 'approved',
           verified_at = NOW(),
           verified_by = ?
       WHERE id = ?`,
      [adminId, id]
    );

    // Send approval email
    try {
      await sendVerificationApprovedEmail(user.email, user.name, user.role);
    } catch (emailError) {
      // Log error but don't fail approval
      // eslint-disable-next-line no-console
      console.error('Failed to send approval email:', emailError);
    }

    res.json({ message: 'User approved successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/verifications/:id/reject - Reject a user
verificationsRouter.post('/:id/reject', async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.sub;
    const data = rejectSchema.parse(req.body);

    // Check if user exists and is pending
    const [existing] = await pool.query(
      `SELECT id, verification_status FROM users 
       WHERE id = ? AND role IN ('veterinarian', 'ngo_admin') LIMIT 1`,
      [id]
    );

    if (existing.length === 0) {
      throw new HttpError(404, 'User not found');
    }

    if (existing[0].verification_status !== 'pending') {
      throw new HttpError(400, 'User is not pending verification');
    }

    // Get user details before updating
    const [userRows] = await pool.query(
      `SELECT email, name, role FROM users WHERE id = ? LIMIT 1`,
      [id]
    );
    const user = userRows[0];

    // Update verification status
    await pool.query(
      `UPDATE users 
       SET verification_status = 'rejected',
           verified_at = NOW(),
           verified_by = ?,
           rejection_reason = ?
       WHERE id = ?`,
      [adminId, data.rejectionReason ?? null, id]
    );

    // Send rejection email
    try {
      await sendVerificationRejectedEmail(
        user.email,
        user.name,
        user.role,
        data.rejectionReason ?? undefined
      );
    } catch (emailError) {
      // Log error but don't fail rejection
      // eslint-disable-next-line no-console
      console.error('Failed to send rejection email:', emailError);
    }

    res.json({ message: 'User rejected successfully' });
  } catch (err) {
    next(err);
  }
});
