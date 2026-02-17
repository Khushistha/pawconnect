import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/pool.js';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';
import { uploadBase64Image } from '../utils/cloudinary.js';
import { sendVerificationPendingEmail, sendPasswordResetOTPEmail } from '../utils/email.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  role: z.enum(['public', 'ngo_admin', 'volunteer', 'veterinarian', 'adopter']).optional(),
  phone: z.string().min(6).optional(),
  organization: z.string().min(2).optional(),
  verificationDocument: z.string().optional(), // Base64 image for vet/NGO admin
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, name: user.name },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

authRouter.post('/auth/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const role = data.role ?? 'public';
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Roles that require verification
    const requiresVerification = role === 'veterinarian' || role === 'ngo_admin';
    
    let verificationStatus = null;
    let verificationDocumentUrl = null;

    // Handle document upload for vet/NGO admin
    if (requiresVerification) {
      if (!data.verificationDocument) {
        throw new HttpError(400, 'Verification document is required for this role');
      }

      try {
        // Upload document to Cloudinary
        const uploadResult = await uploadBase64Image(
          data.verificationDocument,
          `verification-docs/${role}`
        );
        verificationDocumentUrl = uploadResult.url;
        verificationStatus = 'pending';
      } catch (uploadError) {
        throw new HttpError(500, `Failed to upload document: ${uploadError.message}`);
      }
    }

    try {
      await pool.query(
        `INSERT INTO users (
          id, email, password_hash, name, role, phone, organization,
          verification_status, verification_document_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.email.toLowerCase(),
          passwordHash,
          data.name,
          role,
          data.phone ?? null,
          data.organization ?? null,
          verificationStatus,
          verificationDocumentUrl,
        ]
      );
    } catch (e) {
      // Duplicate email
      if (e?.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Email already registered');
      throw e;
    }

    const user = {
      id,
      email: data.email.toLowerCase(),
      name: data.name,
      role,
      phone: data.phone ?? undefined,
      organization: data.organization ?? undefined,
      verificationStatus: verificationStatus ?? undefined,
      createdAt: new Date().toISOString(),
    };

    // Only return token if user doesn't need verification or is already approved
    if (!requiresVerification) {
      res.status(201).json({ token: signToken(user), user });
    } else {
      // User needs verification - don't return token
      // Send verification pending email
      try {
        await sendVerificationPendingEmail(data.email.toLowerCase(), data.name, role);
      } catch (emailError) {
        // Log error but don't fail registration
        // eslint-disable-next-line no-console
        console.error('Failed to send verification email:', emailError);
      }

      res.status(201).json({
        user,
        message: 'Registration successful. Your account is pending verification. You will be notified via email once approved.',
        requiresVerification: true,
      });
    }
  } catch (err) {
    next(err);
  }
});

authRouter.post('/auth/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const [rows] = await pool.query(
      `SELECT id, email, password_hash, name, role, avatar, phone, organization, 
              verification_status, rejection_reason, created_at
       FROM users WHERE email = ? LIMIT 1`,
      [data.email.toLowerCase()]
    );

    const userRow = rows?.[0];
    if (!userRow) throw new HttpError(401, 'Invalid email or password');

    const ok = await bcrypt.compare(data.password, userRow.password_hash);
    if (!ok) throw new HttpError(401, 'Invalid email or password');

    // Check verification status for roles that require it
    const requiresVerification = userRow.role === 'veterinarian' || userRow.role === 'ngo_admin';
    
    if (requiresVerification) {
      if (userRow.verification_status === 'pending') {
        throw new HttpError(403, 'Your account is pending verification. Please wait for admin approval.');
      }
      if (userRow.verification_status === 'rejected') {
        const reason = userRow.rejection_reason 
          ? ` Your registration was rejected: ${userRow.rejection_reason}`
          : '';
        throw new HttpError(403, `Your account verification was rejected.${reason}`);
      }
      if (userRow.verification_status !== 'approved') {
        throw new HttpError(403, 'Your account verification is required before you can login.');
      }
    }

    const user = {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      role: userRow.role,
      avatar: userRow.avatar ?? undefined,
      phone: userRow.phone ?? undefined,
      organization: userRow.organization ?? undefined,
      createdAt: new Date(userRow.created_at).toISOString(),
    };

    res.json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
});

// Forgot password - Send OTP
const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

authRouter.post('/auth/forgot-password', async (req, res, next) => {
  try {
    const data = forgotPasswordSchema.parse(req.body);
    const email = data.email.toLowerCase();

    // Find user by email
    const [rows] = await pool.query(
      `SELECT id, email, name, role FROM users WHERE email = ? LIMIT 1`,
      [email]
    );

    const user = rows?.[0];
    
    // Don't reveal if user exists or not (security best practice)
    // But also don't allow superadmin to reset password
    if (user && user.role === 'superadmin') {
      throw new HttpError(403, 'Password reset is not available for superadmin accounts. Please contact system administrator.');
    }

    // If user exists and is not superadmin, generate and send OTP
    if (user) {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpId = uuidv4();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      // Invalidate any existing unused OTPs for this user
      await pool.query(
        `UPDATE password_reset_otps SET used = 1 WHERE user_id = ? AND used = 0`,
        [user.id]
      );

      // Store OTP
      await pool.query(
        `INSERT INTO password_reset_otps (id, user_id, email, otp, expires_at) VALUES (?, ?, ?, ?, ?)`,
        [otpId, user.id, email, otp, expiresAt]
      );

      // Send OTP email
      try {
        await sendPasswordResetOTPEmail(email, user.name, otp);
      } catch (emailError) {
        // eslint-disable-next-line no-console
        console.error('Failed to send password reset OTP email:', emailError);
        // Don't fail the request, but log the error
      }
    }

    // Always return success (don't reveal if user exists)
    res.json({
      message: 'If an account with that email exists, a password reset OTP has been sent.',
    });
  } catch (err) {
    next(err);
  }
});

// Reset password - Verify OTP and update password
const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

authRouter.post('/auth/reset-password', async (req, res, next) => {
  try {
    const data = resetPasswordSchema.parse(req.body);
    const email = data.email.toLowerCase();

    // Find user
    const [userRows] = await pool.query(
      `SELECT id, role FROM users WHERE email = ? LIMIT 1`,
      [email]
    );

    const user = userRows?.[0];
    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    if (user.role === 'superadmin') {
      throw new HttpError(403, 'Password reset is not available for superadmin accounts.');
    }

    // Find valid OTP
    const [otpRows] = await pool.query(
      `SELECT id, user_id, otp, expires_at, used 
       FROM password_reset_otps 
       WHERE email = ? AND used = 0 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    );

    const otpRecord = otpRows?.[0];
    if (!otpRecord) {
      throw new HttpError(400, 'Invalid or expired OTP. Please request a new one.');
    }

    if (otpRecord.user_id !== user.id) {
      throw new HttpError(400, 'OTP does not match this user.');
    }

    if (otpRecord.otp !== data.otp) {
      throw new HttpError(400, 'Invalid OTP code.');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(data.newPassword, 10);

    // Update password
    await pool.query(
      `UPDATE users SET password_hash = ? WHERE id = ?`,
      [passwordHash, user.id]
    );

    // Mark OTP as used
    await pool.query(
      `UPDATE password_reset_otps SET used = 1 WHERE id = ?`,
      [otpRecord.id]
    );

    res.json({
      message: 'Password has been reset successfully. You can now login with your new password.',
    });
  } catch (err) {
    next(err);
  }
});

