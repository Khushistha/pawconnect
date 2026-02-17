import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';
import { uploadBase64Image } from '../utils/cloudinary.js';

export const reportsRouter = Router();

// IMPORTANT: This router has NO authentication middleware applied
// All routes here are PUBLIC unless explicitly marked with requireAuth

// Debug middleware to log all requests to this router
// This runs BEFORE any route handlers, so if you see this log, the router is being hit
reportsRouter.use((req, res, next) => {
  // eslint-disable-next-line no-console
  console.log(`[REPORTS ROUTER DEBUG] ${req.method} ${req.path} - Original URL: ${req.originalUrl} - NO AUTH CHECK`);
  // eslint-disable-next-line no-console
  console.log(`[REPORTS ROUTER DEBUG] Headers:`, { authorization: !!req.headers.authorization });
  next();
});

// Test route to verify router is working (PUBLIC)
// This should be accessible at GET /api/reports/test
reportsRouter.get('/reports/test', (_req, res) => {
  res.json({ message: 'Reports router is working! This route is public. POST /api/reports is also public.' });
});

const createReportSchema = z.object({
  description: z.string().min(20),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  reportedBy: z.string().min(2).default('Anonymous'),
  contactPhone: z.string().optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().min(2),
    district: z.string().min(2).optional(),
  }),
  photos: z.array(z.string()).max(10).optional(), // Can be base64 or URL
});

function mapReportRow(row, photoUrls = []) {
  return {
    id: row.id,
    description: row.description,
    photos: photoUrls,
    location: {
      lat: row.location_lat,
      lng: row.location_lng,
      address: row.location_address,
      district: row.location_district ?? undefined,
    },
    status: row.status,
    reportedBy: row.reported_by,
    reportedAt: new Date(row.reported_at).toISOString(),
    assignedTo: row.assigned_to ?? undefined,
    dogId: row.dog_id ?? undefined,
    urgency: row.urgency,
    notes: row.notes ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
  };
}

// PUBLIC ROUTE - No authentication required
// Mounted at /api, so this route is POST /api/reports
reportsRouter.post('/reports', async (req, res, next) => {
  try {
    // eslint-disable-next-line no-console
    console.log('Received PUBLIC report submission (no auth required):', {
      hasDescription: !!req.body.description,
      hasLocation: !!req.body.location,
      hasPhotos: !!req.body.photos,
      photoCount: req.body.photos?.length || 0,
      hasAuthHeader: !!req.headers.authorization,
    });

    const data = createReportSchema.parse(req.body);
    const id = uuidv4();
    const now = new Date();

    // Upload photos to Cloudinary if they're base64
    let photoUrls = [];
    if (data.photos && data.photos.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`Uploading ${data.photos.length} photo(s) to Cloudinary...`);
      try {
        const uploadPromises = data.photos.map(async (photo, index) => {
          // Check if it's already a URL or base64
          if (photo.startsWith('http://') || photo.startsWith('https://')) {
            // eslint-disable-next-line no-console
            console.log(`Photo ${index + 1}: Already a URL, skipping upload`);
            return photo; // Already a URL
          }
          // It's base64, upload to Cloudinary
          try {
            // eslint-disable-next-line no-console
            console.log(`Photo ${index + 1}: Uploading to Cloudinary...`);
            const result = await uploadBase64Image(photo, `rescue-reports/${id}`);
            // eslint-disable-next-line no-console
            console.log(`Photo ${index + 1}: Uploaded successfully`);
            return result.url;
          } catch (cloudinaryError) {
            // If Cloudinary is not configured, skip photo upload but continue with report
            // eslint-disable-next-line no-console
            console.warn(`Photo ${index + 1}: Cloudinary upload failed, skipping:`, cloudinaryError.message);
            return null; // Return null for failed uploads
          }
        });
        const results = await Promise.all(uploadPromises);
        // Filter out null values (failed uploads)
        photoUrls = results.filter(url => url !== null);
        // eslint-disable-next-line no-console
        console.log(`Successfully uploaded ${photoUrls.length} out of ${data.photos.length} photo(s)`);
      } catch (uploadError) {
        // eslint-disable-next-line no-console
        console.error('Photo upload error:', uploadError);
        // Don't fail the entire request if photo upload fails
        // Just log and continue without photos
        photoUrls = [];
      }
    }

    try {
      await pool.query(
        `INSERT INTO rescue_reports
         (id, description, status, urgency, reported_by, reported_at,
          location_lat, location_lng, location_address, location_district)
         VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.description,
          data.urgency,
          data.reportedBy,
          now,
          data.location.lat,
          data.location.lng,
          data.location.address,
          data.location.district ?? null,
        ]
      );
    } catch (dbError) {
      // eslint-disable-next-line no-console
      console.error('Database error:', dbError);
      throw new HttpError(500, 'Failed to save report to database: ' + (dbError.message || 'Unknown error'));
    }

    if (photoUrls.length > 0) {
      const values = photoUrls.map((url, idx) => [id, url, idx]);
      await pool.query(
        `INSERT INTO rescue_report_photos (report_id, url, sort_order) VALUES ${values
          .map(() => '(?, ?, ?)')
          .join(',')}`,
        values.flat()
      );
    }

    const [rows] = await pool.query(`SELECT * FROM rescue_reports WHERE id = ? LIMIT 1`, [id]);
    const row = rows?.[0];
    if (!row) throw new HttpError(500, 'Failed to create report');

    const [photoRows] = await pool.query(
      `SELECT url FROM rescue_report_photos WHERE report_id = ? ORDER BY sort_order ASC, id ASC`,
      [id]
    );

    res.status(201).json({ item: mapReportRow(row, photoRows.map((p) => p.url)) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /reports:', err);
    next(err);
  }
});

// GET /api/reports - List all reports (public or admin)
reportsRouter.get('/reports', async (_req, res, next) => {
  try {
    const [reportRows] = await pool.query(
      `SELECT * FROM rescue_reports ORDER BY reported_at DESC LIMIT 200`
    );
    const reportIds = reportRows.map((r) => r.id);

    let photosByReport = new Map();
    if (reportIds.length) {
      const [photoRows] = await pool.query(
        `SELECT report_id, url FROM rescue_report_photos
         WHERE report_id IN (${reportIds.map(() => '?').join(',')})
         ORDER BY sort_order ASC, id ASC`,
        reportIds
      );
      photosByReport = photoRows.reduce((m, pr) => {
        const arr = m.get(pr.report_id) ?? [];
        arr.push(pr.url);
        m.set(pr.report_id, arr);
        return m;
      }, new Map());
    }

    res.json({
      items: reportRows.map((r) => mapReportRow(r, photosByReport.get(r.id) ?? [])),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/my-tasks - Get reports assigned to logged-in volunteer
reportsRouter.get('/reports/my-tasks', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new HttpError(401, 'Unauthorized');
    }

    // Only volunteers can access their tasks
    if (req.user?.role !== 'volunteer') {
      throw new HttpError(403, 'Only volunteers can access their tasks');
    }

    const [reportRows] = await pool.query(
      `SELECT * FROM rescue_reports 
       WHERE assigned_to = ? 
       ORDER BY 
         CASE urgency 
           WHEN 'critical' THEN 1 
           WHEN 'high' THEN 2 
           WHEN 'medium' THEN 3 
           ELSE 4 
         END,
         reported_at DESC
       LIMIT 100`,
      [userId]
    );
    
    const reportIds = reportRows.map((r) => r.id);

    let photosByReport = new Map();
    if (reportIds.length) {
      const [photoRows] = await pool.query(
        `SELECT report_id, url FROM rescue_report_photos
         WHERE report_id IN (${reportIds.map(() => '?').join(',')})
         ORDER BY sort_order ASC, id ASC`,
        reportIds
      );
      photosByReport = photoRows.reduce((m, pr) => {
        const arr = m.get(pr.report_id) ?? [];
        arr.push(pr.url);
        m.set(pr.report_id, arr);
        return m;
      }, new Map());
    }

    res.json({
      items: reportRows.map((r) => mapReportRow(r, photosByReport.get(r.id) ?? [])),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/my-reports - Get reports created by logged-in user (volunteer/adopter)
reportsRouter.get('/reports/my-reports', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new HttpError(401, 'Unauthorized');
    }

    // Get user's name/email to match with reported_by
    const [userRows] = await pool.query(`SELECT name, email FROM users WHERE id = ?`, [userId]);
    const user = userRows?.[0];
    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    // Match reports by reported_by field (name or email)
    const [reportRows] = await pool.query(
      `SELECT * FROM rescue_reports 
       WHERE reported_by = ? OR reported_by = ?
       ORDER BY reported_at DESC
       LIMIT 100`,
      [user.name, user.email]
    );
    
    const reportIds = reportRows.map((r) => r.id);

    let photosByReport = new Map();
    if (reportIds.length) {
      const [photoRows] = await pool.query(
        `SELECT report_id, url FROM rescue_report_photos
         WHERE report_id IN (${reportIds.map(() => '?').join(',')})
         ORDER BY sort_order ASC, id ASC`,
        reportIds
      );
      photosByReport = photoRows.reduce((m, pr) => {
        const arr = m.get(pr.report_id) ?? [];
        arr.push(pr.url);
        m.set(pr.report_id, arr);
        return m;
      }, new Map());
    }

    res.json({
      items: reportRows.map((r) => mapReportRow(r, photosByReport.get(r.id) ?? [])),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/all - Get all reports (NGO admin/superadmin only)
reportsRouter.get('/reports/all', requireAuth, async (req, res, next) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'ngo_admin' && userRole !== 'superadmin') {
      throw new HttpError(403, 'Only NGO admins and superadmins can access all reports');
    }

    const [reportRows] = await pool.query(
      `SELECT * FROM rescue_reports 
       ORDER BY 
         CASE urgency 
           WHEN 'critical' THEN 1 
           WHEN 'high' THEN 2 
           WHEN 'medium' THEN 3 
           ELSE 4 
         END,
         reported_at DESC
       LIMIT 200`
    );
    
    const reportIds = reportRows.map((r) => r.id);

    let photosByReport = new Map();
    if (reportIds.length) {
      const [photoRows] = await pool.query(
        `SELECT report_id, url FROM rescue_report_photos
         WHERE report_id IN (${reportIds.map(() => '?').join(',')})
         ORDER BY sort_order ASC, id ASC`,
        reportIds
      );
      photosByReport = photoRows.reduce((m, pr) => {
        const arr = m.get(pr.report_id) ?? [];
        arr.push(pr.url);
        m.set(pr.report_id, arr);
        return m;
      }, new Map());
    }

    res.json({
      items: reportRows.map((r) => mapReportRow(r, photosByReport.get(r.id) ?? [])),
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/reports/:id/status - Update report status (NGO admin/superadmin only)
reportsRouter.patch('/reports/:id/status', requireAuth, async (req, res, next) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'ngo_admin' && userRole !== 'superadmin') {
      throw new HttpError(403, 'Only NGO admins and superadmins can update report status');
    }

    const { id } = req.params;
    const { status } = z.object({
      status: z.enum(['pending', 'assigned', 'in_progress', 'completed', 'cancelled']),
    }).parse(req.body);

    const [result] = await pool.query(
      `UPDATE rescue_reports SET status = ? WHERE id = ?`,
      [status, id]
    );

    if (result.affectedRows === 0) {
      throw new HttpError(404, 'Report not found');
    }

    // Fetch updated report
    const [rows] = await pool.query(`SELECT * FROM rescue_reports WHERE id = ?`, [id]);
    const row = rows?.[0];
    if (!row) throw new HttpError(404, 'Report not found');

    const [photoRows] = await pool.query(
      `SELECT url FROM rescue_report_photos WHERE report_id = ? ORDER BY sort_order ASC, id ASC`,
      [id]
    );

    res.json({ item: mapReportRow(row, photoRows.map((p) => p.url)) });
  } catch (err) {
    next(err);
  }
});
