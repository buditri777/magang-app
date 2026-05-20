const express = require('express');
const db = require('../db/connection');
const { verifyToken, requireRole, requireActiveAccount } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, requireActiveAccount, requireRole('dosen'));

// GET /api/dosen/students - daftar mahasiswa bimbingan
router.get('/students', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.id, s.nim, s.program_studi, s.fakultas, s.angkatan,
              p.full_name, p.email, p.phone
       FROM students s
       JOIN profiles p ON p.id = s.profile_id
       WHERE s.lecturer_id = ?
       ORDER BY p.full_name ASC`,
      [req.user.id]
    );
    res.json({ students: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dosen/applications - pengajuan mahasiswa bimbingan
router.get('/applications', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ia.*, c.name as company_name, c.city,
              p.full_name as student_name, s.nim, s.program_studi
       FROM internship_applications ia
       JOIN students s ON s.id = ia.student_id
       JOIN profiles p ON p.id = s.profile_id
       JOIN companies c ON c.id = ia.company_id
       WHERE s.lecturer_id = ?
       ORDER BY ia.created_at DESC`,
      [req.user.id]
    );
    res.json({ applications: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
