import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/pool.js';
import { HttpError } from '../utils/httpError.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadBase64Image } from '../utils/cloudinary.js';

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
        where.push(`(d.status = ? OR r.status = 'completed')`);
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
          statusQuery === 'adoptable' && r.report_status === 'completed'
            ? { ...r, status: 'adoptable' }
            : r;

        return mapDogRow(effectiveRow, photosByDog.get(r.id) ?? [], reportInfo);
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

const updateDogSchema = createDogSchema.partial();

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

