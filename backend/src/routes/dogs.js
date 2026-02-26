import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/pool.js';
import { HttpError } from '../utils/httpError.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadBase64Image } from '../utils/cloudinary.js';
import { sendEmail } from '../utils/email.js';
import { env } from '../config/env.js';

export const dogsRouter = Router();

// Public routes (no authentication required)
// These routes are defined first to ensure they're accessible without auth

function mapDogRow(row, photoUrls = [], reportInfo = null) {
  return {
    id: row.id,
    name: row.name,
    breed: row.breed ?? undefined,
    estimatedAge: row.estimated_age,
    gender: row.gender,
    size: row.size,
    status: row.status,
    description: row.description,
    rescueStory: row.rescue_story ?? undefined,
    photos: photoUrls,
    location: {
      lat: row.location_lat,
      lng: row.location_lng,
      address: row.location_address,
      district: row.location_district ?? undefined,
    },
    vaccinated: !!row.vaccinated,
    sterilized: !!row.sterilized,
    medicalNotes: row.medical_notes ?? undefined,
    reportedAt: new Date(row.reported_at).toISOString(),
    rescuedAt: row.rescued_at ? new Date(row.rescued_at).toISOString() : undefined,
    adoptedAt: row.adopted_at ? new Date(row.adopted_at).toISOString() : undefined,
    adopterId: row.adopter_id ?? undefined,
    vetId: row.vet_id ?? undefined,
    treatmentStatus: row.treatment_status ?? undefined,
    fromReport: reportInfo ? {
      reportId: reportInfo.id,
      reportedBy: reportInfo.reported_by,
      reportedAt: new Date(reportInfo.reported_at).toISOString(),
      urgency: reportInfo.urgency,
    } : undefined,
  };
}

// PUBLIC ROUTE - No authentication required
dogsRouter.get('/dogs', async (req, res, next) => {
  // eslint-disable-next-line no-console
  console.log('[PUBLIC GET /dogs] Route hit - no auth required');
  try {
    const { status, district } = req.query;

    const where = [];
    const params = [];
    if (status) {
      const s = String(status);
      // Special case: adoptable should also include dogs whose linked rescue report is completed.
      // This covers legacy rows where the dog.status wasn't updated when report status changed.
      if (s === 'adoptable') {
        where.push(`(d.status = ? OR (d.status != 'adopted' AND r.status = 'completed'))`);
        params.push(s);
      } else {
        where.push('d.status = ?');
        params.push(s);
      }
    }
    if (district) {
      where.push('d.location_district = ?');
      params.push(String(district));
    }

    const sql =
      `SELECT d.*, 
              r.id as report_id, 
              r.status as report_status,
              r.reported_by, 
              r.reported_at as report_reported_at, 
              r.urgency
       FROM dogs d
       LEFT JOIN rescue_reports r ON r.dog_id = d.id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY d.reported_at DESC
       LIMIT 200`;

    const [dogRows] = await pool.query(sql, params);
    const dogIds = dogRows.map((r) => r.id);

    let photosByDog = new Map();
    if (dogIds.length) {
      const [photoRows] = await pool.query(
        `SELECT dog_id, url FROM dog_photos WHERE dog_id IN (${dogIds.map(() => '?').join(',')})
         ORDER BY sort_order ASC, id ASC`,
        dogIds
      );
      photosByDog = photoRows.reduce((m, pr) => {
        const arr = m.get(pr.dog_id) ?? [];
        arr.push(pr.url);
        m.set(pr.dog_id, arr);
        return m;
      }, new Map());
    }

    const statusQuery = status ? String(status) : null;

    res.json({
      items: dogRows.map((r) => {
        const reportInfo = r.report_id ? {
          id: r.report_id,
          reported_by: r.reported_by,
          reported_at: r.report_reported_at,
          urgency: r.urgency,
        } : null;

        // If caller asked for adoptable dogs, treat "completed report" as adoptable in the API response.
        // This keeps UI consistent even for older rows where dog.status wasn't updated.
        const effectiveRow =
          statusQuery === 'adoptable' &&
          r.report_status === 'completed' &&
          r.status !== 'adopted'
            ? { ...r, status: 'adoptable' }
            : r;

        return mapDogRow(effectiveRow, photosByDog.get(r.id) ?? [], reportInfo);
      }),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dogs/vet-stats - Get statistics for veterinarian dashboard
// MUST be defined BEFORE /dogs/:id to avoid route conflicts
dogsRouter.get('/dogs/vet-stats', requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role !== 'veterinarian' && req.user?.role !== 'superadmin') {
      throw new HttpError(403, 'Only veterinarians can view dashboard statistics');
    }
    const vetId = req.user?.sub || req.user?.id;
    if (!vetId) throw new HttpError(401, 'Unauthorized');

    // Get all assigned dogs (not adopted)
    const [statsRows] = await pool.query(
      `SELECT 
        COUNT(*) as total_patients,
        COUNT(CASE WHEN DATE(d.reported_at) = CURDATE() THEN 1 END) as patients_today,
        COUNT(CASE WHEN d.vaccinated = 1 THEN 1 END) as vaccinated_count,
        COUNT(CASE WHEN d.sterilized = 1 THEN 1 END) as sterilized_count,
        COUNT(CASE WHEN d.treatment_status = 'pending' THEN 1 END) as pending_treatment,
        COUNT(CASE WHEN d.treatment_status = 'in_progress' THEN 1 END) as in_progress_treatment,
        COUNT(CASE WHEN d.treatment_status = 'completed' THEN 1 END) as completed_treatment
       FROM dogs d
       WHERE d.vet_id = ? AND d.status != 'adopted'`,
      [vetId]
    );

    const stats = statsRows[0];

    res.json({
      stats: {
        totalPatients: Number(stats.total_patients) || 0,
        patientsToday: Number(stats.patients_today) || 0,
        vaccinated: Number(stats.vaccinated_count) || 0,
        sterilized: Number(stats.sterilized_count) || 0,
        pendingTreatment: Number(stats.pending_treatment) || 0,
        inProgressTreatment: Number(stats.in_progress_treatment) || 0,
        completedTreatment: Number(stats.completed_treatment) || 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dogs/for-vet - Dogs assigned to logged-in veterinarian
// MUST be defined BEFORE /dogs/:id to avoid route conflicts
dogsRouter.get('/dogs/for-vet', requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role !== 'veterinarian' && req.user?.role !== 'superadmin') {
      throw new HttpError(403, 'Only veterinarians can view assigned patients');
    }
    const vetId = req.user?.sub || req.user?.id;
    if (!vetId) throw new HttpError(401, 'Unauthorized');

    // Debug logging
    // eslint-disable-next-line no-console
    console.log('[GET /api/dogs/for-vet] Vet ID from token:', vetId, 'User:', req.user);

    // Check if there are any dogs assigned to this vet (for debugging)
    const [debugRows] = await pool.query(
      `SELECT id, name, vet_id FROM dogs WHERE vet_id = ? LIMIT 5`,
      [vetId]
    );
    // eslint-disable-next-line no-console
    console.log('[GET /api/dogs/for-vet] Dogs with vet_id matching token:', debugRows);

    const [dogRows] = await pool.query(
      `SELECT d.*,
              r.id as report_id,
              r.status as report_status,
              r.reported_by,
              r.reported_at as report_reported_at,
              r.urgency
       FROM dogs d
       LEFT JOIN rescue_reports r ON r.dog_id = d.id
       WHERE d.vet_id = ?
         AND d.status != 'adopted'
       ORDER BY d.reported_at DESC
       LIMIT 200`,
      [vetId]
    );

    // eslint-disable-next-line no-console
    console.log('[GET /api/dogs/for-vet] Found', dogRows.length, 'dogs for vet');

    const dogIds = dogRows.map((r) => r.id);
    let photosByDog = new Map();
    if (dogIds.length) {
      const [photoRows] = await pool.query(
        `SELECT dog_id, url FROM dog_photos WHERE dog_id IN (${dogIds.map(() => '?').join(',')})
         ORDER BY sort_order ASC, id ASC`,
        dogIds
      );
      photosByDog = photoRows.reduce((m, pr) => {
        const arr = m.get(pr.dog_id) ?? [];
        arr.push(pr.url);
        m.set(pr.dog_id, arr);
        return m;
      }, new Map());
    }

    res.json({
      items: dogRows.map((r) => {
        const reportInfo = r.report_id
          ? {
              id: r.report_id,
              reported_by: r.reported_by,
              reported_at: r.report_reported_at,
              urgency: r.urgency,
            }
          : null;
        return mapDogRow(r, photosByDog.get(r.id) ?? [], reportInfo);
      }),
    });
  } catch (err) {
    next(err);
  }
});

dogsRouter.get('/dogs/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const [rows] = await pool.query(
      `SELECT d.*, r.id as report_id, r.reported_by, r.reported_at as report_reported_at, r.urgency
       FROM dogs d
       LEFT JOIN rescue_reports r ON r.dog_id = d.id
       WHERE d.id = ? LIMIT 1`,
      [id]
    );
    const row = rows?.[0];
    if (!row) throw new HttpError(404, 'Dog not found');

    const [photoRows] = await pool.query(
      `SELECT url FROM dog_photos WHERE dog_id = ? ORDER BY sort_order ASC, id ASC`,
      [id]
    );

    const reportInfo = row.report_id ? {
      id: row.report_id,
      reported_by: row.reported_by,
      reported_at: row.report_reported_at,
      urgency: row.urgency,
    } : null;

    res.json({ item: mapDogRow(row, photoRows.map((p) => p.url), reportInfo) });
  } catch (err) {
    next(err);
  }
});

// ========== NGO Admin CRUD Routes ==========

// Middleware to check if user is NGO admin or superadmin
function requireNGOAdmin(req, _res, next) {
  if (req.user?.role !== 'ngo_admin' && req.user?.role !== 'superadmin') {
    return next(new HttpError(403, 'Only NGO admins can manage rescue cases'));
  }
  next();
}

const createDogSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  breed: z.string().optional(),
  estimatedAge: z.string().min(1, 'Estimated age is required'),
  gender: z.enum(['male', 'female', 'unknown']).default('unknown'),
  size: z.enum(['small', 'medium', 'large']).default('medium'),
  status: z.enum(['reported', 'in_progress', 'treated', 'adoptable', 'adopted']).default('reported'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  rescueStory: z.string().optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().min(1, 'Address is required'),
    district: z.string().optional(),
  }),
  vaccinated: z.boolean().default(false),
  sterilized: z.boolean().default(false),
  medicalNotes: z.string().optional(),
  photos: z.array(z.string()).max(10, 'Maximum 10 photos allowed').optional(),
});

const updateDogSchema = createDogSchema
  .extend({
    vetId: z.string().uuid().optional(),
    treatmentStatus: z.enum(['pending', 'in_progress', 'completed']).optional(),
  })
  .partial();

const treatmentStatusSchema = z.object({
  treatmentStatus: z.enum(['pending', 'in_progress', 'completed']),
});

const assignVetSchema = z.object({
  vetId: z.string().uuid().nullable(),
});

// POST /api/dogs - Create a new rescue case (dog)
dogsRouter.post('/dogs', requireAuth, requireNGOAdmin, async (req, res, next) => {
  try {
    const data = createDogSchema.parse(req.body);
    const id = uuidv4();
    const now = new Date();

    // Upload photos to Cloudinary if provided
    let photoUrls = [];
    if (data.photos && data.photos.length > 0) {
      try {
        const uploadPromises = data.photos.map((base64, index) =>
          uploadBase64Image(base64, `rescue-dogs/${id}`).then(result => ({
            url: result.url,
            sortOrder: index,
          }))
        );
        const uploadResults = await Promise.all(uploadPromises);
        photoUrls = uploadResults.map(r => r.url);
      } catch (uploadError) {
        // eslint-disable-next-line no-console
        console.error('Photo upload error:', uploadError);
        throw new HttpError(400, 'Failed to upload photos: ' + uploadError.message);
      }
    }

    // Insert dog record
    const createdBy = req.user?.sub || req.user?.id || null;

    await pool.query(
      `INSERT INTO dogs 
       (id, name, breed, estimated_age, gender, size, status, description, rescue_story,
        location_lat, location_lng, location_address, location_district,
        vaccinated, sterilized, medical_notes, reported_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.breed ?? null,
        data.estimatedAge,
        data.gender,
        data.size,
        data.status,
        data.description,
        data.rescueStory ?? null,
        data.location.lat,
        data.location.lng,
        data.location.address,
        data.location.district ?? null,
        data.vaccinated ? 1 : 0,
        data.sterilized ? 1 : 0,
        data.medicalNotes ?? null,
        now,
        createdBy,
      ]
    );

    // Insert photos
    if (photoUrls.length > 0) {
      const photoValues = photoUrls.map((url, idx) => [id, url, idx]);
      await pool.query(
        `INSERT INTO dog_photos (dog_id, url, sort_order) VALUES ${photoValues
          .map(() => '(?, ?, ?)')
          .join(',')}`,
        photoValues.flat()
      );
    }

    // Fetch created dog with photos and report info
    const [rows] = await pool.query(
      `SELECT d.*, r.id as report_id, r.reported_by, r.reported_at as report_reported_at, r.urgency
       FROM dogs d
       LEFT JOIN rescue_reports r ON r.dog_id = d.id
       WHERE d.id = ? LIMIT 1`,
      [id]
    );
    const row = rows?.[0];
    if (!row) throw new HttpError(500, 'Failed to create dog');

    const [photoRows] = await pool.query(
      `SELECT url FROM dog_photos WHERE dog_id = ? ORDER BY sort_order ASC, id ASC`,
      [id]
    );

    const reportInfo = row.report_id ? {
      id: row.report_id,
      reported_by: row.reported_by,
      reported_at: row.report_reported_at,
      urgency: row.urgency,
    } : null;

    res.status(201).json({ item: mapDogRow(row, photoRows.map((p) => p.url), reportInfo) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/dogs/:id - Update a rescue case (dog)
dogsRouter.put('/dogs/:id', requireAuth, requireNGOAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = updateDogSchema.parse(req.body);

    // Check if dog exists
    const [existing] = await pool.query(`SELECT id FROM dogs WHERE id = ? LIMIT 1`, [id]);
    if (existing.length === 0) {
      throw new HttpError(404, 'Dog not found');
    }

    // Ensure handler NGO is recorded (needed for adoption notifications)
    const updaterId = req.user?.sub || req.user?.id || null;
    if (updaterId) {
      await pool.query(
        `UPDATE dogs SET created_by = COALESCE(created_by, ?) WHERE id = ?`,
        [updaterId, id]
      );
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.breed !== undefined) {
      updates.push('breed = ?');
      values.push(data.breed || null);
    }
    if (data.estimatedAge !== undefined) {
      updates.push('estimated_age = ?');
      values.push(data.estimatedAge);
    }
    if (data.gender !== undefined) {
      updates.push('gender = ?');
      values.push(data.gender);
    }
    if (data.size !== undefined) {
      updates.push('size = ?');
      values.push(data.size);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.vetId !== undefined) {
      updates.push('vet_id = ?');
      values.push(data.vetId || null);
    }
    if (data.treatmentStatus !== undefined) {
      updates.push('treatment_status = ?');
      values.push(data.treatmentStatus);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.rescueStory !== undefined) {
      updates.push('rescue_story = ?');
      values.push(data.rescueStory || null);
    }
    if (data.location !== undefined) {
      updates.push('location_lat = ?', 'location_lng = ?', 'location_address = ?');
      values.push(data.location.lat, data.location.lng, data.location.address);
      if (data.location.district !== undefined) {
        updates.push('location_district = ?');
        values.push(data.location.district || null);
      }
    }
    if (data.vaccinated !== undefined) {
      updates.push('vaccinated = ?');
      values.push(data.vaccinated ? 1 : 0);
    }
    if (data.sterilized !== undefined) {
      updates.push('sterilized = ?');
      values.push(data.sterilized ? 1 : 0);
    }
    if (data.medicalNotes !== undefined) {
      updates.push('medical_notes = ?');
      values.push(data.medicalNotes || null);
    }

    if (updates.length === 0) {
      throw new HttpError(400, 'No fields to update');
    }

    values.push(id);
    await pool.query(`UPDATE dogs SET ${updates.join(', ')} WHERE id = ?`, values);

    // Handle photo updates if provided
    if (data.photos !== undefined) {
      // Delete existing photos
      await pool.query(`DELETE FROM dog_photos WHERE dog_id = ?`, [id]);

      // Upload new photos
      if (data.photos.length > 0) {
        try {
          const uploadPromises = data.photos.map((base64, index) =>
            uploadBase64Image(base64, `rescue-dogs/${id}`).then(result => ({
              url: result.url,
              sortOrder: index,
            }))
          );
          const uploadResults = await Promise.all(uploadPromises);
          const photoUrls = uploadResults.map(r => r.url);

          // Insert new photos
          const photoValues = photoUrls.map((url, idx) => [id, url, idx]);
          await pool.query(
            `INSERT INTO dog_photos (dog_id, url, sort_order) VALUES ${photoValues
              .map(() => '(?, ?, ?)')
              .join(',')}`,
            photoValues.flat()
          );
        } catch (uploadError) {
          // eslint-disable-next-line no-console
          console.error('Photo upload error:', uploadError);
          throw new HttpError(400, 'Failed to upload photos: ' + uploadError.message);
        }
      }
    }

    // Fetch updated dog with report info
    const [rows] = await pool.query(
      `SELECT d.*, r.id as report_id, r.reported_by, r.reported_at as report_reported_at, r.urgency
       FROM dogs d
       LEFT JOIN rescue_reports r ON r.dog_id = d.id
       WHERE d.id = ? LIMIT 1`,
      [id]
    );
    const row = rows?.[0];
    if (!row) throw new HttpError(500, 'Failed to fetch updated dog');

    const [photoRows] = await pool.query(
      `SELECT url FROM dog_photos WHERE dog_id = ? ORDER BY sort_order ASC, id ASC`,
      [id]
    );

    const reportInfo = row.report_id ? {
      id: row.report_id,
      reported_by: row.reported_by,
      reported_at: row.report_reported_at,
      urgency: row.urgency,
    } : null;

    res.json({ item: mapDogRow(row, photoRows.map((p) => p.url), reportInfo) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/dogs/:id/assign-vet - Assign or unassign a veterinarian (NGO admin)
dogsRouter.patch('/dogs/:id/assign-vet', requireAuth, requireNGOAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { vetId } = assignVetSchema.parse(req.body);

    // Ensure dog exists
    const [existingDogs] = await pool.query(`SELECT id FROM dogs WHERE id = ? LIMIT 1`, [id]);
    if (!existingDogs.length) {
      throw new HttpError(404, 'Dog not found');
    }

    let vetRow = null;
    if (vetId) {
      const [rows] = await pool.query(
        `SELECT id, name, email 
         FROM users 
         WHERE id = ? 
           AND role = 'veterinarian' 
           AND verification_status = 'approved'
         LIMIT 1`,
        [vetId]
      );
      vetRow = rows?.[0];
      if (!vetRow) {
        throw new HttpError(404, 'Veterinarian not found or not approved');
      }
    }

    // Get dog name for notification
    const [dogRows] = await pool.query(`SELECT name FROM dogs WHERE id = ? LIMIT 1`, [id]);
    const dogName = dogRows[0]?.name || 'a dog';

    await pool.query(
      `UPDATE dogs 
       SET vet_id = ?, 
           treatment_status = COALESCE(treatment_status, 'pending')
       WHERE id = ?`,
      [vetId || null, id]
    );

    // Send notification and email to vet if assigned
    if (vetId && vetRow) {
      const notificationId = uuidv4();
      await pool.query(
        `INSERT INTO notifications (id, user_id, title, message, type, link)
         VALUES (?, ?, ?, ?, 'info', ?)`,
        [
          notificationId,
          vetId,
          'New Patient Assigned',
          `You have been assigned to treat ${dogName}. Please review the patient details and update the treatment status.`,
          `/dashboard/vet`,
        ]
      );

      // Send email notification
      try {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🐾 PawConnect Nepal</h1>
              </div>
              <div class="content">
                <h2>New Patient Assigned</h2>
                <p>Hello ${vetRow.name},</p>
                <p>You have been assigned to treat <strong>${dogName}</strong>.</p>
                <p>Please log in to your dashboard to review the patient details and update the treatment status.</p>
                <a href="${env.FRONTEND_ORIGIN}/dashboard/vet" class="button">View Dashboard</a>
                <p>Thank you for your continued support in helping rescue and care for dogs in need.</p>
                <p>Best regards,<br>The PawConnect Nepal Team</p>
              </div>
              <div class="footer">
                <p>© 2024 PawConnect Nepal. All rights reserved.</p>
                <p>Nayabazar, Pokhara, Nepal</p>
              </div>
            </div>
          </body>
          </html>
        `;
        await sendEmail(
          vetRow.email,
          `New Patient Assigned - ${dogName} - PawConnect Nepal`,
          emailHtml
        );
      } catch (emailError) {
        // Log error but don't fail the assignment
        // eslint-disable-next-line no-console
        console.error('Failed to send assignment email:', emailError);
      }
    }

    // Return updated dog
    const [rows] = await pool.query(
      `SELECT d.*, r.id as report_id, r.reported_by, r.reported_at as report_reported_at, r.urgency
       FROM dogs d
       LEFT JOIN rescue_reports r ON r.dog_id = d.id
       WHERE d.id = ? LIMIT 1`,
      [id]
    );
    const row = rows?.[0];
    if (!row) throw new HttpError(500, 'Failed to fetch updated dog');

    const [photoRows] = await pool.query(
      `SELECT url FROM dog_photos WHERE dog_id = ? ORDER BY sort_order ASC, id ASC`,
      [id]
    );

    const reportInfo = row.report_id
      ? {
          id: row.report_id,
          reported_by: row.reported_by,
          reported_at: row.report_reported_at,
          urgency: row.urgency,
        }
      : null;

    res.json({ item: mapDogRow(row, photoRows.map((p) => p.url), reportInfo) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/dogs/:id/treatment - Update treatment status (vet)
dogsRouter.patch('/dogs/:id/treatment', requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role !== 'veterinarian' && req.user?.role !== 'superadmin') {
      throw new HttpError(403, 'Only veterinarians can update treatment status');
    }
    const vetId = req.user?.sub || req.user?.id;
    if (!vetId) throw new HttpError(401, 'Unauthorized');

    const { id } = req.params;
    const { treatmentStatus } = treatmentStatusSchema.parse(req.body);

    // Load dog to ensure assignment and current status
    const [rowsExisting] = await pool.query(
      `SELECT id, vet_id, status 
       FROM dogs 
       WHERE id = ? 
       LIMIT 1`,
      [id]
    );
    const dog = rowsExisting?.[0];
    if (!dog) throw new HttpError(404, 'Dog not found');

    if (req.user?.role === 'veterinarian' && dog.vet_id !== vetId) {
      throw new HttpError(403, 'You can only update treatment for dogs assigned to you');
    }

    let newStatus = dog.status;
    if (dog.status !== 'adopted' && dog.status !== 'adoptable') {
      if (treatmentStatus === 'pending') newStatus = 'reported';
      else if (treatmentStatus === 'in_progress') newStatus = 'in_progress';
      else if (treatmentStatus === 'completed') newStatus = 'treated';
    }

    await pool.query(
      `UPDATE dogs 
       SET treatment_status = ?, status = ? 
       WHERE id = ?`,
      [treatmentStatus, newStatus, id]
    );

    const [rows] = await pool.query(
      `SELECT d.*, r.id as report_id, r.reported_by, r.reported_at as report_reported_at, r.urgency
       FROM dogs d
       LEFT JOIN rescue_reports r ON r.dog_id = d.id
       WHERE d.id = ? LIMIT 1`,
      [id]
    );
    const row = rows?.[0];
    if (!row) throw new HttpError(500, 'Failed to fetch updated dog');

    const [photoRows] = await pool.query(
      `SELECT url FROM dog_photos WHERE dog_id = ? ORDER BY sort_order ASC, id ASC`,
      [id]
    );

    const reportInfo = row.report_id
      ? {
          id: row.report_id,
          reported_by: row.reported_by,
          reported_at: row.report_reported_at,
          urgency: row.urgency,
        }
      : null;

    res.json({ item: mapDogRow(row, photoRows.map((p) => p.url), reportInfo) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/dogs/:id - Delete a rescue case (dog)
dogsRouter.delete('/dogs/:id', requireAuth, requireNGOAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if dog exists
    const [existing] = await pool.query(`SELECT id FROM dogs WHERE id = ? LIMIT 1`, [id]);
    if (existing.length === 0) {
      throw new HttpError(404, 'Dog not found');
    }

    // Delete dog (photos will be deleted automatically due to CASCADE)
    await pool.query(`DELETE FROM dogs WHERE id = ?`, [id]);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

