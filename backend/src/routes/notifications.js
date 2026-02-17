import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

// GET /api/notifications - list recent notifications for current user
notificationsRouter.get('/notifications', async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) throw new HttpError(401, 'Unauthorized');

    const [rows] = await pool.query(
      `SELECT id, user_id, title, message, type, link, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({
      items: rows.map((n) => ({
        id: n.id,
        userId: n.user_id,
        title: n.title,
        message: n.message,
        type: n.type,
        link: n.link ?? undefined,
        read: !!n.is_read,
        createdAt: new Date(n.created_at).toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read - mark notification as read
notificationsRouter.patch('/notifications/:id/read', async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) throw new HttpError(401, 'Unauthorized');
    const { id } = req.params;

    const [result] = await pool.query(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (result.affectedRows === 0) throw new HttpError(404, 'Notification not found');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

