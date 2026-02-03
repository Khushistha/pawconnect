import { Router } from 'express';
import { pool } from '../db/pool.js';
import { HttpError } from '../utils/httpError.js';

export const dogsRouter = Router();

function mapDogRow(row, photoUrls = []) {
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
  };
}

dogsRouter.get('/dogs', async (req, res, next) => {
  try {
    const { status, district } = req.query;

    const where = [];
    const params = [];
    if (status) {
      where.push('d.status = ?');
      params.push(String(status));
    }
    if (district) {
      where.push('d.location_district = ?');
      params.push(String(district));
    }

    const sql =
      `SELECT d.*
       FROM dogs d
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

    res.json({
      items: dogRows.map((r) => mapDogRow(r, photosByDog.get(r.id) ?? [])),
    });
  } catch (err) {
    next(err);
  }
});

dogsRouter.get('/dogs/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const [rows] = await pool.query(`SELECT * FROM dogs WHERE id = ? LIMIT 1`, [id]);
    const row = rows?.[0];
    if (!row) throw new HttpError(404, 'Dog not found');

    const [photoRows] = await pool.query(
      `SELECT url FROM dog_photos WHERE dog_id = ? ORDER BY sort_order ASC, id ASC`,
      [id]
    );

    res.json({ item: mapDogRow(row, photoRows.map((p) => p.url)) });
  } catch (err) {
    next(err);
  }
});

