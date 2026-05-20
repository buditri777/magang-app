const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const db = require('../db/connection');
const { verifyToken, requireRole, requireActiveAccount } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, requireActiveAccount);

const templateUpload = multer({
  dest: 'uploads/templates/',
  limits: { fileSize: 5 * 1024 * 1024 },
});
const signedUpload = multer({
  dest: 'uploads/signed_letters/',
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ============== MAHASISWA ENDPOINTS ==============

// POST /api/applications - mahasiswa create application
router.post('/', requireRole('mahasiswa'), [
  body('company_id').isInt(),
  body('start_date').isDate(),
  body('end_date').isDate(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { company_id, position, division, start_date, end_date, notes } = req.body;

    // Get student id
    const [students] = await db.query('SELECT id FROM students WHERE profile_id = ?', [req.user.id]);
    if (students.length === 0) return res.status(400).json({ error: 'Profile mahasiswa belum lengkap' });

    const [result] = await db.query(
      `INSERT INTO internship_applications
       (student_id, company_id, position, division, start_date, end_date, notes, status, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', NOW())`,
      [students[0].id, company_id, position || null, division || null, start_date, end_date, notes || null]
    );

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)',
      [req.user.id, 'submit_application', 'application', result.insertId]
    );

    res.status(201).json({ id: result.insertId, status: 'submitted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/applications/my - mahasiswa list own applications
router.get('/my', requireRole('mahasiswa'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ia.*, c.name as company_name, c.city as company_city, c.address as company_address,
              gl.id as letter_id, gl.signed_file_path, gl.is_signed, gl.letter_number as final_letter_number
       FROM internship_applications ia
       JOIN students s ON s.id = ia.student_id
       JOIN companies c ON c.id = ia.company_id
       LEFT JOIN generated_letters gl ON gl.application_id = ia.id
       WHERE s.profile_id = ?
       ORDER BY ia.created_at DESC`,
      [req.user.id]
    );
    res.json({ applications: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/applications/:id - get detail (with permission check)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT ia.*, c.name as company_name, c.address as company_address, c.city as company_city,
              p.full_name as student_name, s.nim, s.program_studi as student_prodi,
              gl.signed_file_path, gl.generated_file_path, gl.is_signed, gl.letter_number as final_letter_number
       FROM internship_applications ia
       JOIN students s ON s.id = ia.student_id
       JOIN profiles p ON p.id = s.profile_id
       JOIN companies c ON c.id = ia.company_id
       LEFT JOIN generated_letters gl ON gl.application_id = ia.id
       WHERE ia.id = ?`,
      [id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Pengajuan tidak ditemukan' });

    const app = rows[0];

    // Permission: mahasiswa can only see own; admin_upi/super_admin all; dosen sees bimbingan
    if (req.user.role === 'mahasiswa') {
      const [own] = await db.query(
        'SELECT id FROM students WHERE profile_id = ? AND id = ?',
        [req.user.id, app.student_id]
      );
      if (own.length === 0) return res.status(403).json({ error: 'Akses ditolak' });
    } else if (req.user.role === 'dosen') {
      const [check] = await db.query(
        'SELECT id FROM students WHERE id = ? AND lecturer_id = ?',
        [app.student_id, req.user.id]
      );
      if (check.length === 0) return res.status(403).json({ error: 'Akses ditolak' });
    }

    res.json({ application: app });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== ADMIN UPI ENDPOINTS ==============

// GET /api/applications - admin list all
router.get('/', requireRole('admin_upi', 'super_admin'), async (req, res) => {
  try {
    const { status, company_id, search } = req.query;
    let query = `
      SELECT ia.*, c.name as company_name, c.city,
             p.full_name as student_name, s.nim, s.program_studi
      FROM internship_applications ia
      JOIN students s ON s.id = ia.student_id
      JOIN profiles p ON p.id = s.profile_id
      JOIN companies c ON c.id = ia.company_id
      WHERE 1=1
    `;
    const params = [];
    if (status) { query += ' AND ia.status = ?'; params.push(status); }
    if (company_id) { query += ' AND ia.company_id = ?'; params.push(company_id); }
    if (search) {
      query += ' AND (p.full_name LIKE ? OR s.nim LIKE ? OR c.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY ia.created_at DESC';

    const [rows] = await db.query(query, params);
    res.json({ applications: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/applications/:id/review - admin approve/reject
router.patch('/:id/review', requireRole('admin_upi'), [
  body('action').isIn(['approve', 'reject']),
], async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejection_reason, letter_number, template_type } = req.body;

    if (action === 'reject') {
      await db.query(
        `UPDATE internship_applications
         SET status = 'rejected', rejection_reason = ?, reviewed_at = NOW(), reviewed_by = ?
         WHERE id = ?`,
        [rejection_reason, req.user.id, id]
      );
      return res.json({ message: 'Pengajuan ditolak' });
    }

    // Approve: set letter_number, template_type, batch_key
    const [appRows] = await db.query(
      'SELECT company_id, start_date FROM internship_applications WHERE id = ?',
      [id]
    );
    if (appRows.length === 0) return res.status(404).json({ error: 'Not found' });

    const ymd = new Date(appRows[0].start_date).toISOString().slice(0, 7);
    const batchKey = `${appRows[0].company_id}_${ymd}`;

    // Determine template type: count applications in same batch
    let finalTemplateType = template_type;
    if (!finalTemplateType) {
      const [batchCount] = await db.query(
        `SELECT COUNT(*) as cnt FROM internship_applications
         WHERE batch_key = ? AND status IN ('approved', 'letter_generated', 'signed')`,
        [batchKey]
      );
      finalTemplateType = batchCount[0].cnt > 0 ? 'B' : 'A';
    }

    await db.query(
      `UPDATE internship_applications
       SET status = 'approved', letter_number = ?, template_type = ?, batch_key = ?,
           reviewed_at = NOW(), reviewed_by = ?
       WHERE id = ?`,
      [letter_number, finalTemplateType, batchKey, req.user.id, id]
    );

    res.json({ message: 'Pengajuan disetujui', batch_key: batchKey, template_type: finalTemplateType });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/applications/:id/upload-signed - admin upload surat ttd
router.post('/:id/upload-signed', requireRole('admin_upi'), signedUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File tidak ditemukan' });

    const { id } = req.params;

    // Insert or update generated_letters
    const [existing] = await db.query('SELECT id FROM generated_letters WHERE application_id = ?', [id]);

    const [appRows] = await db.query('SELECT letter_number FROM internship_applications WHERE id = ?', [id]);
    const letterNumber = appRows[0]?.letter_number;

    if (existing.length > 0) {
      await db.query(
        'UPDATE generated_letters SET signed_file_path = ?, is_signed = TRUE, signed_at = NOW() WHERE application_id = ?',
        [req.file.path, id]
      );
    } else {
      await db.query(
        `INSERT INTO generated_letters (application_id, letter_number, signed_file_path, is_signed, signed_at)
         VALUES (?, ?, ?, TRUE, NOW())`,
        [id, letterNumber, req.file.path]
      );
    }

    await db.query(
      `UPDATE internship_applications SET status = 'signed' WHERE id = ?`,
      [id]
    );

    res.json({ message: 'Surat ditandatangani berhasil diupload', file: req.file.filename });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/applications/:id/download-signed
router.get('/:id/download-signed', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT gl.signed_file_path, ia.letter_number, p.full_name, s.nim, s.profile_id
       FROM generated_letters gl
       JOIN internship_applications ia ON ia.id = gl.application_id
       JOIN students s ON s.id = ia.student_id
       JOIN profiles p ON p.id = s.profile_id
       WHERE gl.application_id = ? AND gl.is_signed = TRUE`,
      [id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Surat belum tersedia' });

    // Permission check
    if (req.user.role === 'mahasiswa' && rows[0].profile_id !== req.user.id) {
      return res.status(403).json({ error: 'Akses ditolak' });
    }

    const filePath = path.resolve(rows[0].signed_file_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File tidak ditemukan' });

    const safeName = `Surat_Magang_${rows[0].nim || 'mahasiswa'}.pdf`;
    res.download(filePath, safeName);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== TEMPLATE MANAGEMENT (Admin UPI) ==============

router.get('/templates/list', requireRole('admin_upi', 'super_admin'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT lt.*, p.full_name as uploaded_by_name
       FROM letter_templates lt
       LEFT JOIN profiles p ON p.id = lt.uploaded_by
       WHERE lt.is_active = TRUE
       ORDER BY lt.type, lt.created_at DESC`
    );
    res.json({ templates: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/templates/upload', requireRole('admin_upi'), templateUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File tidak ditemukan' });
    const { name, type } = req.body;
    if (!['A', 'B'].includes(type)) return res.status(400).json({ error: 'Type harus A atau B' });

    const [result] = await db.query(
      'INSERT INTO letter_templates (name, type, file_path, uploaded_by) VALUES (?, ?, ?, ?)',
      [name, type, req.file.path, req.user.id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
