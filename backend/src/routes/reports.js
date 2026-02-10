import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';

export const reportsRouter = Router();

const createReportSchema = z.object({
  description: z.string().min(20),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  reportedBy: z.string().min(2).default('Anonymous'),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().min(2),
    district: z.string().min(2).optional(),
  }),
  photos: z.array(z.string().url()).max(10).optional(),
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
  };
}

reportsRouter.post('/reports', async (req, res, next) => {
  try {
    const data = createReportSchema.parse(req.body);
    const id = uuidv4();
    const now = new Date();

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

    if (data.photos?.length) {
      const values = data.photos.map((url, idx) => [id, url, idx]);
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

    res.status(201).json({ item: mapReportRow(row, data.photos ?? []) });
  } catch (err) {
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

