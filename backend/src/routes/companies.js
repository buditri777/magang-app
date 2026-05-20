const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/connection');
const { verifyToken, requireRole, requireActiveAccount } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, requireActiveAccount);

// GET /api/companies - search companies
router.get('/', async (req, res) => {
  try {
    const { search, city } = req.query;
    let query = 'SELECT * FROM companies WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR name_normalized LIKE ? OR address LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (city) {
      query += ' AND city LIKE ?';
      params.push(`%${city}%`);
    }
    query += ' ORDER BY name ASC LIMIT 50';

    const [rows] = await db.query(query, params);
    res.json({ companies: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/companies - add new company (mahasiswa)
router.post('/', requireRole('mahasiswa', 'admin_upi', 'super_admin'), [
  body('name').notEmpty().trim(),
  body('address').notEmpty().trim(),
  body('city').notEmpty().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, address, city, contact } = req.body;
    const nameNormalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check duplicate
    const [existing] = await db.query(
      'SELECT id, name FROM companies WHERE name_normalized = ?',
      [nameNormalized]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        error: 'Perusahaan dengan nama serupa sudah ada',
        existing: existing[0],
      });
    }

    const [result] = await db.query(
      'INSERT INTO companies (name, name_normalized, address, city, contact, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [name, nameNormalized, address, city, contact || null, req.user.id]
    );

    res.status(201).json({ id: result.insertId, name, address, city });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/companies/:id/applicants - mahasiswa lain di perusahaan yang sama
router.get('/:id/applicants', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT ia.id as application_id, ia.status, ia.position, ia.start_date, ia.end_date,
              p.full_name, s.nim, s.program_studi
       FROM internship_applications ia
       JOIN students s ON s.id = ia.student_id
       JOIN profiles p ON p.id = s.profile_id
       WHERE ia.company_id = ? AND ia.status NOT IN ('draft', 'rejected')
       ORDER BY ia.created_at DESC`,
      [id]
    );
    res.json({ applicants: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
