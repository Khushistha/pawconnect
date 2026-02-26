import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import { pool } from '../db/pool.js';
import { HttpError } from '../utils/httpError.js';
import { env } from '../config/env.js';

export const donationsRouter = Router();

// Initialize Stripe
let stripe = null;
if (env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-11-20.acacia',
  });
} else {
  // eslint-disable-next-line no-console
  console.warn('⚠️  Stripe is not configured. Donation functionality will be disabled.');
}

const createDonationSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('usd'),
  donorName: z.string().min(1, 'Name is required').optional(),
  donorEmail: z.string().email('Valid email is required').optional(),
  message: z.string().optional(),
});

// POST /api/donations/create-checkout - Create Stripe checkout session
donationsRouter.post('/donations/create-checkout', async (req, res, next) => {
  try {
    if (!stripe) {
      throw new HttpError(500, 'Stripe is not configured. Please contact support.');
    }

    const data = createDonationSchema.parse(req.body);
    const donationId = uuidv4();

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: data.currency || 'usd',
            product_data: {
              name: 'Donation to PawConnect Nepal',
              description: data.message || 'Supporting street dog rescue and care in Nepal',
            },
            unit_amount: Math.round(data.amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${env.FRONTEND_ORIGIN}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_ORIGIN}/donate?canceled=true`,
      metadata: {
        donationId,
        donorName: data.donorName || 'Anonymous',
        donorEmail: data.donorEmail || '',
        message: data.message || '',
      },
    });

    // Store donation record (pending)
    await pool.query(
      `INSERT INTO donations 
       (id, amount, currency, donor_name, donor_email, message, stripe_session_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [
        donationId,
        data.amount,
        data.currency || 'usd',
        data.donorName || null,
        data.donorEmail || null,
        data.message || null,
        session.id,
      ]
    );

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/donations/success - Verify payment and update donation status
donationsRouter.get('/donations/success', async (req, res, next) => {
  try {
    if (!stripe) {
      throw new HttpError(500, 'Stripe is not configured');
    }

    const { session_id } = req.query;
    if (!session_id) {
      throw new HttpError(400, 'Session ID is required');
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(String(session_id));

    if (session.payment_status === 'paid') {
      // Update donation status
      await pool.query(
        `UPDATE donations 
         SET status = 'completed', 
             paid_at = NOW(),
             stripe_payment_intent_id = ?
         WHERE stripe_session_id = ?`,
        [session.payment_intent || null, session.id]
      );

      res.json({
        success: true,
        message: 'Thank you for your donation!',
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency,
      });
    } else {
      res.json({
        success: false,
        message: 'Payment is still processing',
      });
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/donations/stats - Get donation statistics (public)
donationsRouter.get('/donations/stats', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        COUNT(*) as total_donations,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_amount,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_donations
       FROM donations`
    );

    const stats = rows[0];

    res.json({
      stats: {
        totalDonations: Number(stats.completed_donations) || 0,
        totalAmount: Number(stats.total_amount) || 0,
        currency: 'USD',
      },
    });
  } catch (err) {
    next(err);
  }
});
