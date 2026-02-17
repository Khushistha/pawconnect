import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';

function requireSuperadmin(req, res, next) {
  const userRole = req.user?.role;
  if (userRole !== 'superadmin') {
    return next(new HttpError(403, 'Only superadmin can manage NGOs'));
  }
  next();
}

export const ngosRouter = Router();

// All routes require authentication
ngosRouter.use(requireAuth);

// Only superadmin can access NGO management
ngosRouter.use(requireSuperadmin);

// GET /api/ngos - List all verified NGOs
ngosRouter.get('/ngos', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        u.id, 
        u.email, 
        u.name, 
        u.role, 
        u.phone, 
        u.organization, 
        u.avatar,
        u.verification_status,
        u.verified_at,
        u.verified_by,
        u.created_at,
        COUNT(DISTINCT d.id) as total_dogs,
        COUNT(DISTINCT r.id) as total_reports,
        COUNT(DISTINCT CASE WHEN r.status = 'completed' THEN r.id END) as completed_rescues
       FROM users u
       LEFT JOIN dogs d ON d.id IN (
         SELECT id FROM dogs WHERE reported_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
       )
       LEFT JOIN rescue_reports r ON r.dog_id = d.id OR r.reported_by = u.email
       WHERE u.role = 'ngo_admin' 
         AND u.verification_status = 'approved'
       GROUP BY u.id, u.email, u.name, u.role, u.phone, u.organization, u.avatar,
                u.verification_status, u.verified_at, u.verified_by, u.created_at
       ORDER BY u.created_at DESC`
    );

    const ngos = await Promise.all(rows.map(async (row) => {
      // Get detailed rescue operations
      const [dogRows] = await pool.query(
        `SELECT COUNT(*) as count FROM dogs WHERE id IN (
          SELECT DISTINCT dog_id FROM rescue_reports WHERE dog_id IS NOT NULL
        ) AND reported_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)`
      );

      const [reportRows] = await pool.query(
        `SELECT COUNT(*) as count FROM rescue_reports 
         WHERE reported_by = ? OR dog_id IN (
           SELECT id FROM dogs WHERE reported_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
         )`,
        [row.email]
      );

      return {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        phone: row.phone ?? undefined,
        organization: row.organization ?? undefined,
        avatar: row.avatar ?? undefined,
        verificationStatus: row.verification_status,
        verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : undefined,
        verifiedBy: row.verified_by ?? undefined,
        createdAt: new Date(row.created_at).toISOString(),
        stats: {
          totalDogs: Number(row.total_dogs) || 0,
          totalReports: Number(row.total_reports) || 0,
          completedRescues: Number(row.completed_rescues) || 0,
        },
      };
    }));

    res.json({ ngos });
  } catch (err) {
    next(err);
  }
});

// GET /api/ngos/:id - Get single NGO with detailed rescue operations
ngosRouter.get('/ngos/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get NGO details
    const [userRows] = await pool.query(
      `SELECT id, email, name, role, phone, organization, avatar,
              verification_status, verified_at, verified_by, created_at
       FROM users 
       WHERE id = ? AND role = 'ngo_admin' AND verification_status = 'approved'
       LIMIT 1`,
      [id]
    );

    if (userRows.length === 0) {
      throw new HttpError(404, 'NGO not found');
    }

    const ngo = userRows[0];

    // Get rescue operations (dogs and reports) for this NGO
    const [dogRows] = await pool.query(
      `SELECT d.id, d.name, d.status, d.reported_at, d.rescued_at, d.adopted_at,
              d.location_address, d.location_district
       FROM dogs d
       WHERE d.reported_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
       ORDER BY d.reported_at DESC
       LIMIT 100`
    );

    const [reportRows] = await pool.query(
      `SELECT r.id, r.description, r.status, r.urgency, r.reported_by, 
              r.reported_at, r.location_address, r.location_district,
              r.dog_id
       FROM rescue_reports r
       WHERE r.reported_by = ?
       ORDER BY r.reported_at DESC
       LIMIT 100`,
      [ngo.email]
    );

    const rescueOperations = {
      dogs: dogRows.map(d => ({
        id: d.id,
        name: d.name,
        status: d.status,
        reportedAt: new Date(d.reported_at).toISOString(),
        rescuedAt: d.rescued_at ? new Date(d.rescued_at).toISOString() : undefined,
        adoptedAt: d.adopted_at ? new Date(d.adopted_at).toISOString() : undefined,
        location: {
          address: d.location_address,
          district: d.location_district ?? undefined,
        },
      })),
      reports: reportRows.map(r => ({
        id: r.id,
        description: r.description,
        status: r.status,
        urgency: r.urgency,
        reportedBy: r.reported_by,
        reportedAt: new Date(r.reported_at).toISOString(),
        location: {
          address: r.location_address,
          district: r.location_district ?? undefined,
        },
        dogId: r.dog_id ?? undefined,
      })),
    };

    res.json({
      ngo: {
        id: ngo.id,
        email: ngo.email,
        name: ngo.name,
        role: ngo.role,
        phone: ngo.phone ?? undefined,
        organization: ngo.organization ?? undefined,
        avatar: ngo.avatar ?? undefined,
        verificationStatus: ngo.verification_status,
        verifiedAt: ngo.verified_at ? new Date(ngo.verified_at).toISOString() : undefined,
        verifiedBy: ngo.verified_by ?? undefined,
        createdAt: new Date(ngo.created_at).toISOString(),
      },
      rescueOperations,
    });
  } catch (err) {
    next(err);
  }
});
