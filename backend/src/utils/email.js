import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

// Initialize email transporter if credentials are provided
if (env.EMAIL_USER && env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS,
    },
  });
}

/**
 * Send an email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML email body
 * @returns {Promise<void>}
 */
export async function sendEmail(to, subject, html) {
  if (!transporter) {
    // eslint-disable-next-line no-console
    console.warn('⚠️  Email not configured. Skipping email to:', to);
    return;
  }

  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM || env.EMAIL_USER,
      to,
      subject,
      html,
    });
    // eslint-disable-next-line no-console
    console.log(`✅ Email sent to: ${to}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    throw error;
  }
}

/**
 * Send verification pending notification
 * @param {string} email - User email
 * @param {string} name - User name
 * @param {string} role - User role
 */
export async function sendVerificationPendingEmail(email, name, role) {
  const roleLabel = role === 'veterinarian' ? 'Veterinarian' : 'NGO Admin';
  
  const html = `
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
          <h2>Registration Received - Verification Pending</h2>
          <p>Hello ${name},</p>
          <p>Thank you for registering as a <strong>${roleLabel}</strong> on PawConnect Nepal!</p>
          <p>Your registration has been received and is currently pending verification. Our admin team will review your submitted documents and get back to you shortly.</p>
          <p><strong>What happens next?</strong></p>
          <ul>
            <li>Our team will review your verification document</li>
            <li>You will receive an email notification once your account is approved</li>
            <li>Once approved, you'll be able to log in and access your dashboard</li>
          </ul>
          <p>This process typically takes 1-2 business days. We appreciate your patience!</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
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

  await sendEmail(email, 'Registration Pending Verification - PawConnect Nepal', html);
}

/**
 * Send verification approved notification
 * @param {string} email - User email
 * @param {string} name - User name
 * @param {string} role - User role
 */
export async function sendVerificationApprovedEmail(email, name, role) {
  const roleLabel = role === 'veterinarian' ? 'Veterinarian' : 'NGO Admin';
  const dashboardUrl = `${env.FRONTEND_ORIGIN}/login`;
  
  const html = `
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
          <h2>🎉 Account Verified - Welcome to PawConnect!</h2>
          <p>Hello ${name},</p>
          <p>Great news! Your ${roleLabel} account has been <strong>verified and approved</strong> by our admin team.</p>
          <p>You can now log in to your dashboard and start using PawConnect Nepal to help rescue and care for dogs in need.</p>
          <a href="${dashboardUrl}" class="button">Login to Dashboard</a>
          <p>If you have any questions or need assistance, please don't hesitate to reach out to us.</p>
          <p>Welcome aboard!<br>The PawConnect Nepal Team</p>
        </div>
        <div class="footer">
          <p>© 2024 PawConnect Nepal. All rights reserved.</p>
          <p>Nayabazar, Pokhara, Nepal</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(email, 'Account Verified - Welcome to PawConnect Nepal!', html);
}

/**
 * Send verification rejected notification
 * @param {string} email - User email
 * @param {string} name - User name
 * @param {string} role - User role
 * @param {string} reason - Rejection reason (optional)
 */
export async function sendVerificationRejectedEmail(email, name, role, reason) {
  const roleLabel = role === 'veterinarian' ? 'Veterinarian' : 'NGO Admin';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .reason-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🐾 PawConnect Nepal</h1>
        </div>
        <div class="content">
          <h2>Verification Status Update</h2>
          <p>Hello ${name},</p>
          <p>We regret to inform you that your ${roleLabel} account verification has been <strong>rejected</strong>.</p>
          ${reason ? `
            <div class="reason-box">
              <strong>Reason:</strong><br>
              ${reason}
            </div>
          ` : ''}
          <p>If you believe this is an error or would like to resubmit your application with additional documentation, please contact our support team.</p>
          <p>We appreciate your interest in joining PawConnect Nepal and helping rescue dogs in need.</p>
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

  await sendEmail(email, 'Verification Status - PawConnect Nepal', html);
}
