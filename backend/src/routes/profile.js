import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';
import { uploadBase64Image } from '../utils/cloudinary.js';
import { env } from '../config/env.js';

export const profileRouter = Router();

// GET /api/profile - Get current user's profile
profileRouter.get('/profile', requireAuth, async (req, res, next) => {
  try {
    // JWT payload uses 'sub' for user ID, not 'id'
    const userId = req.user?.sub || req.user?.id;
    if (!userId) {
      // eslint-disable-next-line no-console
      console.log('[GET /profile] No user ID found in token. User object:', req.user);
      throw new HttpError(401, 'Unauthorized');
    }

    const [rows] = await pool.query(
      `SELECT id, email, name, role, avatar, phone, organization, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    const user = rows?.[0];
    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar ?? undefined,
        phone: user.phone ?? undefined,
        organization: user.organization ?? undefined,
        createdAt: new Date(user.created_at).toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/profile - Update current user's profile (requires authentication)
const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(6).optional().nullable(),
  organization: z.string().min(2).optional().nullable(),
  avatar: z.string().optional(), // Base64 image
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
});

profileRouter.put('/profile', requireAuth, async (req, res, next) => {
  try {
    // JWT payload uses 'sub' for user ID, not 'id'
    const userId = req.user?.sub || req.user?.id;
    if (!userId) {
      // eslint-disable-next-line no-console
      console.log('[PUT /profile] No user ID found in token. User object:', req.user);
      throw new HttpError(401, 'Unauthorized');
    }

    const data = updateProfileSchema.parse(req.body);

    // If changing password, verify current password
    if (data.newPassword) {
      if (!data.currentPassword) {
        throw new HttpError(400, 'Current password is required to change password');
      }

      // Get current password hash
      const [userRows] = await pool.query(
        `SELECT password_hash FROM users WHERE id = ? LIMIT 1`,
        [userId]
      );

      const user = userRows?.[0];
      if (!user) {
        throw new HttpError(404, 'User not found');
      }

      // Verify current password
      const isValid = await bcrypt.compare(data.currentPassword, user.password_hash);
      if (!isValid) {
        throw new HttpError(400, 'Current password is incorrect');
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      values.push(data.phone || null);
    }
    if (data.organization !== undefined) {
      updates.push('organization = ?');
      values.push(data.organization || null);
    }
    if (data.avatar !== undefined) {
      // Upload avatar to Cloudinary if provided
      let avatarUrl = null;
      if (data.avatar) {
        try {
          // Check if it's already a URL
          if (data.avatar.startsWith('http://') || data.avatar.startsWith('https://')) {
            avatarUrl = data.avatar;
          } else {
            // It's base64, upload to Cloudinary
            const uploadResult = await uploadBase64Image(data.avatar, `user-avatars/${userId}`);
            avatarUrl = uploadResult.url;
          }
        } catch (uploadError) {
          throw new HttpError(400, `Failed to upload avatar: ${uploadError.message}`);
        }
      }
      updates.push('avatar = ?');
      values.push(avatarUrl);
    }
    if (data.newPassword) {
      const passwordHash = await bcrypt.hash(data.newPassword, 10);
      updates.push('password_hash = ?');
      values.push(passwordHash);
    }

    if (updates.length === 0) {
      throw new HttpError(400, 'No fields to update');
    }

    values.push(userId);

    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Fetch updated user
    const [rows] = await pool.query(
      `SELECT id, email, name, role, avatar, phone, organization, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    const updatedUser = {
      id: rows[0].id,
      email: rows[0].email,
      name: rows[0].name,
      role: rows[0].role,
      avatar: rows[0].avatar ?? undefined,
      phone: rows[0].phone ?? undefined,
      organization: rows[0].organization ?? undefined,
      createdAt: new Date(rows[0].created_at).toISOString(),
    };

    res.json({
      user: updatedUser,
      message: 'Profile updated successfully',
    });
  } catch (err) {
    next(err);
  }
});
