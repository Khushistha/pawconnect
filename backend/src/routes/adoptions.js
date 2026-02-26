import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';

export const adoptionsRouter = Router();

adoptionsRouter.use(requireAuth);

function requireNgoOrSuperadmin(req, _res, next) {
  const role = req.user?.role;
  if (role !== 'ngo_admin' && role !== 'superadmin') {
    return next(new HttpError(403, 'Only NGO admins and superadmins can manage adoption applications'));
  }
  next();
}

// POST /api/adoptions/apply - Submit an adoption application (login required)
const applySchema = z.object({
  dogId: z.string().min(1),
  applicantPhone: z.string().min(6),
  homeType: z.string().min(2),
  hasYard: z.boolean().default(false),
  otherPets: z.string().default(''),
  experience: z.string().min(5),
  reason: z.string().min(5),
});

// Mounted under /api/adoptions → full path: POST /api/adoptions/apply
adoptionsRouter.post('/apply', async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) throw new HttpError(401, 'Unauthorized');

    const data = applySchema.parse(req.body);

    // Load applicant details
    const [userRows] = await pool.query(
      `SELECT id, email, name, role FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    const user = userRows?.[0];
    if (!user) throw new HttpError(404, 'User not found');

    // Only logged-in non-superadmin roles can apply
    if (user.role === 'superadmin') throw new HttpError(403, 'Superadmin cannot apply for adoption');

    // Load dog + owning NGO (created_by)
    const [dogRows] = await pool.query(
      `SELECT id, name, status, created_by FROM dogs WHERE id = ? LIMIT 1`,
      [data.dogId]
    );
    const dog = dogRows?.[0];
    if (!dog) throw new HttpError(404, 'Dog not found');

    if (dog.status !== 'adoptable') {
      throw new HttpError(400, 'This dog is not currently available for adoption');
    }

    // Prevent duplicate pending applications by same user for same dog
    const [existingRows] = await pool.query(
      `SELECT id FROM adoption_applications
       WHERE dog_id = ? AND applicant_id = ?
         AND status IN ('pending','under_review')
       LIMIT 1`,
      [data.dogId, userId]
    );
    if (existingRows.length) {
      throw new HttpError(409, 'You already have an active application for this dog');
    }

    const id = uuidv4();
    const now = new Date();
    const ngoId = dog.created_by ?? null;

    await pool.query(
      `INSERT INTO adoption_applications
       (id, dog_id, applicant_id, ngo_id, applicant_phone, home_type, has_yard, other_pets, experience, reason, status, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        id,
        data.dogId,
        userId,
        ngoId,
        data.applicantPhone,
        data.homeType,
        data.hasYard ? 1 : 0,
        data.otherPets ?? '',
        data.experience,
        data.reason,
        now,
      ]
    );

    // Notify NGO if known
    if (ngoId) {
      const nId = uuidv4();
      await pool.query(
        `INSERT INTO notifications (id, user_id, title, message, type, link)
         VALUES (?, ?, ?, ?, 'info', ?)`,
        [
          nId,
          ngoId,
          'New Adoption Application',
          `${user.name} applied to adopt ${dog.name}.`,
          '/dashboard/adoptions',
        ]
      );
    }

    // Notify applicant that application is pending (so user also gets in-app notification)
    {
      const nId = uuidv4();
      await pool.query(
        `INSERT INTO notifications (id, user_id, title, message, type, link)
         VALUES (?, ?, ?, ?, 'info', ?)`,
        [
          nId,
          userId,
          'Adoption Application Submitted',
          `Your request to adopt ${dog.name} is now pending NGO approval.`,
          `/dogs/${dog.id}`,
        ]
      );
    }

    res.status(201).json({
      item: {
        id,
        dogId: data.dogId,
        applicantId: userId,
        applicantName: user.name,
        applicantEmail: user.email,
        applicantPhone: data.applicantPhone,
        status: 'pending',
        homeType: data.homeType,
        hasYard: data.hasYard,
        otherPets: data.otherPets ?? '',
        experience: data.experience,
        reason: data.reason,
        submittedAt: now.toISOString(),
      },
      message: 'Application submitted successfully',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/adoptions/my - My applications
// Mounted under /api/adoptions → full path: GET /api/adoptions/my
adoptionsRouter.get('/my', async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) throw new HttpError(401, 'Unauthorized');

    const [rows] = await pool.query(
      `SELECT a.*,
              u.name as applicant_name,
              u.email as applicant_email,
              ngo.name as ngo_name,
              ngo.email as ngo_email
       FROM adoption_applications a
       JOIN users u ON u.id = a.applicant_id
       LEFT JOIN users ngo ON ngo.id = a.ngo_id
       WHERE a.applicant_id = ?
       ORDER BY a.submitted_at DESC
       LIMIT 200`,
      [userId]
    );

    res.json({
      items: rows.map((a) => ({
        id: a.id,
        dogId: a.dog_id,
        applicantId: a.applicant_id,
        applicantName: a.applicant_name,
        applicantEmail: a.applicant_email,
        applicantPhone: a.applicant_phone,
        status: a.status,
        homeType: a.home_type,
        hasYard: !!a.has_yard,
        otherPets: a.other_pets ?? '',
        experience: a.experience,
        reason: a.reason,
        submittedAt: new Date(a.submitted_at).toISOString(),
        reviewedAt: a.reviewed_at ? new Date(a.reviewed_at).toISOString() : undefined,
        reviewedBy: a.reviewed_by ?? undefined,
        notes: a.notes ?? undefined,
        ngoId: a.ngo_id ?? undefined,
        ngoName: a.ngo_name ?? undefined,
        ngoEmail: a.ngo_email ?? undefined,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/adoptions/ngo - Applications for NGO's dogs
// Mounted under /api/adoptions → full path: GET /api/adoptions/ngo
adoptionsRouter.get('/ngo', requireNgoOrSuperadmin, async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) throw new HttpError(401, 'Unauthorized');

    const isSuperadmin = req.user?.role === 'superadmin';

    const [rows] = await pool.query(
      `SELECT a.*,
              u.name as applicant_name, u.email as applicant_email,
              d.name as dog_name, d.status as dog_status
       FROM adoption_applications a
       JOIN users u ON u.id = a.applicant_id
       JOIN dogs d ON d.id = a.dog_id
       WHERE ${isSuperadmin ? '1=1' : 'a.ngo_id = ?'}
       ORDER BY a.submitted_at DESC
       LIMIT 500`,
      isSuperadmin ? [] : [userId]
    );

    res.json({
      items: rows.map((a) => ({
        id: a.id,
        dogId: a.dog_id,
        dogName: a.dog_name,
        dogStatus: a.dog_status,
        applicantId: a.applicant_id,
        applicantName: a.applicant_name,
        applicantEmail: a.applicant_email,
        applicantPhone: a.applicant_phone,
        status: a.status,
        homeType: a.home_type,
        hasYard: !!a.has_yard,
        otherPets: a.other_pets ?? '',
        experience: a.experience,
        reason: a.reason,
        submittedAt: new Date(a.submitted_at).toISOString(),
        reviewedAt: a.reviewed_at ? new Date(a.reviewed_at).toISOString() : undefined,
        reviewedBy: a.reviewed_by ?? undefined,
        notes: a.notes ?? undefined,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/adoptions/:id/status - Approve/reject application
const updateStatusSchema = z.object({
  status: z.enum(['under_review', 'approved', 'rejected']),
  notes: z.string().optional(),
});

// Mounted under /api/adoptions → full path: PATCH /api/adoptions/:id/status
adoptionsRouter.patch('/:id/status', requireNgoOrSuperadmin, async (req, res, next) => {
  try {
    const reviewerId = req.user?.sub || req.user?.id;
    if (!reviewerId) throw new HttpError(401, 'Unauthorized');

    const { id } = req.params;
    const { status, notes } = updateStatusSchema.parse(req.body);

    // Load application + enforce ownership for NGO admins
    const [appRows] = await pool.query(
      `SELECT a.*, d.name as dog_name
       FROM adoption_applications a
       JOIN dogs d ON d.id = a.dog_id
       WHERE a.id = ? LIMIT 1`,
      [id]
    );
    const app = appRows?.[0];
    if (!app) throw new HttpError(404, 'Application not found');

    if (req.user?.role === 'ngo_admin' && app.ngo_id !== reviewerId) {
      throw new HttpError(403, 'You can only manage applications for your own dogs');
    }

    const now = new Date();
    await pool.query(
      `UPDATE adoption_applications
       SET status = ?, notes = ?, reviewed_at = ?, reviewed_by = ?
       WHERE id = ?`,
      [status, notes ?? null, now, reviewerId, id]
    );

    // On approval, mark dog adopted and set adopter
    if (status === 'approved') {
      await pool.query(
        `UPDATE dogs
         SET status = 'adopted', adopted_at = ?, adopter_id = ?
         WHERE id = ?`,
        [now, app.applicant_id, app.dog_id]
      );
    }

    // Notify applicant
    const nId = uuidv4();
    const title =
      status === 'approved' ? 'Adoption Approved' :
      status === 'rejected' ? 'Adoption Rejected' :
      'Adoption Under Review';
    const message =
      status === 'approved'
        ? `Your adoption request for ${app.dog_name} has been approved.`
        : status === 'rejected'
          ? `Your adoption request for ${app.dog_name} has been rejected.${notes ? ` Reason: ${notes}` : ''}`
          : `Your adoption request for ${app.dog_name} is under review.`;

    await pool.query(
      `INSERT INTO notifications (id, user_id, title, message, type, link)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        nId,
        app.applicant_id,
        title,
        message,
        status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'info',
        `/dogs/${app.dog_id}`,
      ]
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

