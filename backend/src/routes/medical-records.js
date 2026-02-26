import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/pool.js';
import { HttpError } from '../utils/httpError.js';
import { requireAuth } from '../middleware/auth.js';

export const medicalRecordsRouter = Router();

const createMedicalRecordSchema = z.object({
  dogId: z.string().uuid(),
  recordType: z.enum(['vaccination', 'sterilization', 'treatment', 'checkup']),
  description: z.string().min(1, 'Description is required'),
  medications: z.string().optional(),
  nextFollowUp: z.string().optional(),
});

// GET /api/medical-records - Get medical records for logged-in vet
medicalRecordsRouter.get('/medical-records', requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role !== 'veterinarian' && req.user?.role !== 'superadmin') {
      throw new HttpError(403, 'Only veterinarians can view medical records');
    }
    const vetId = req.user?.sub || req.user?.id;
    if (!vetId) throw new HttpError(401, 'Unauthorized');

    const { dogId } = req.query;

    let query = `
      SELECT mr.*, d.name as dog_name, u.name as vet_name
      FROM medical_records mr
      JOIN dogs d ON d.id = mr.dog_id
      JOIN users u ON u.id = mr.vet_id
      WHERE mr.vet_id = ?
    `;
    const params = [vetId];

    if (dogId) {
      query += ` AND mr.dog_id = ?`;
      params.push(String(dogId));
    }

    query += ` ORDER BY mr.created_at DESC`;

    const [rows] = await pool.query(query, params);

    res.json({
      items: rows.map((row) => ({
        id: row.id,
        dogId: row.dog_id,
        dogName: row.dog_name,
        vetId: row.vet_id,
        vetName: row.vet_name,
        type: row.record_type,
        description: row.description,
        medications: row.medications ? row.medications.split(',').map(m => m.trim()).filter(m => m) : [],
        nextFollowUp: row.next_follow_up ? new Date(row.next_follow_up).toISOString() : undefined,
        date: new Date(row.created_at).toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/medical-records - Create a new medical record
medicalRecordsRouter.post('/medical-records', requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role !== 'veterinarian' && req.user?.role !== 'superadmin') {
      throw new HttpError(403, 'Only veterinarians can create medical records');
    }
    const vetId = req.user?.sub || req.user?.id;
    if (!vetId) throw new HttpError(401, 'Unauthorized');

    const data = createMedicalRecordSchema.parse(req.body);

    // Verify dog is assigned to this vet
    const [dogRows] = await pool.query(
      `SELECT id, name, vet_id FROM dogs WHERE id = ? LIMIT 1`,
      [data.dogId]
    );
    const dog = dogRows[0];
    if (!dog) {
      throw new HttpError(404, 'Dog not found');
    }
    if (req.user?.role === 'veterinarian' && dog.vet_id !== vetId) {
      throw new HttpError(403, 'You can only create records for dogs assigned to you');
    }

    // Get vet name
    const [vetRows] = await pool.query(`SELECT name FROM users WHERE id = ? LIMIT 1`, [vetId]);
    const vetName = vetRows[0]?.name || 'Unknown';

    const id = uuidv4();
    const now = new Date();

    await pool.query(
      `INSERT INTO medical_records 
       (id, dog_id, vet_id, record_type, description, medications, next_follow_up, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.dogId,
        vetId,
        data.recordType,
        data.description,
        data.medications || null,
        data.nextFollowUp ? new Date(data.nextFollowUp) : null,
        now,
      ]
    );

    // Update dog's vaccinated/sterilized status if applicable
    if (data.recordType === 'vaccination') {
      await pool.query(`UPDATE dogs SET vaccinated = 1 WHERE id = ?`, [data.dogId]);
    } else if (data.recordType === 'sterilization') {
      await pool.query(`UPDATE dogs SET sterilized = 1 WHERE id = ?`, [data.dogId]);
    }

    res.status(201).json({
      item: {
        id,
        dogId: data.dogId,
        dogName: dog.name,
        vetId,
        vetName,
        type: data.recordType,
        description: data.description,
        medications: data.medications ? data.medications.split(',').map(m => m.trim()).filter(m => m) : [],
        nextFollowUp: data.nextFollowUp || undefined,
        date: now.toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});
