const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db/connection');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  dest: 'uploads/imports/',
  limits: { fileSize: 10 * 1024 * 1024 },
});

// All routes here require super_admin
router.use(verifyToken, requireRole('super_admin'));

// GET /api/admin/users - list users with filter
router.get('/users', async (req, res) => {
  try {
    const { role, status, search } = req.query;
    let query = 'SELECT id, email, full_name, role, status, phone, created_at FROM profiles WHERE 1=1';
    const params = [];

    if (role) { query += ' AND role = ?'; params.push(role); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (search) {
      query += ' AND (email LIKE ? OR full_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY created_at DESC';

    const [rows] = await db.query(query, params);
    res.json({ users: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/users/:id - update user (status, role)
router.patch('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, role } = req.body;
    const updates = [];
    const params = [];

    if (status) { updates.push('status = ?'); params.push(status); }
    if (role) { updates.push('role = ?'); params.push(role); }
    if (updates.length === 0) return res.status(400).json({ error: 'No updates' });

    params.push(id);
    await db.query(`UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`, params);

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'update_user', 'profile', id, JSON.stringify({ status, role })]
    );

    res.json({ message: 'User berhasil diupdate' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/users/:id/reset-password
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const tempPassword = crypto.randomBytes(6).toString('hex');
    const hash = await bcrypt.hash(tempPassword, 10);

    await db.query(
      'UPDATE profiles SET password_hash = ?, status = ? WHERE id = ?',
      [hash, 'must_change_password', id]
    );

    const [rows] = await db.query('SELECT email FROM profiles WHERE id = ?', [id]);
    await db.query(
      'INSERT INTO user_provisioning_logs (profile_id, email, action, details) VALUES (?, ?, ?, ?)',
      [id, rows[0].email, 'password_reset', JSON.stringify({ by_admin: req.user.id })]
    );

    // TODO: send email with temp password
    res.json({ message: 'Password direset', temp_password: tempPassword });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/templates/students - download Excel template
router.get('/templates/students', (req, res) => {
  const wb = xlsx.utils.book_new();
  const data = [
    ['NIM', 'Nama Lengkap', 'Email', 'Program Studi', 'Fakultas', 'Angkatan', 'Nomor HP', 'NIDN Pembimbing'],
    ['12345678', 'Contoh Mahasiswa', 'mhs@upi.edu', 'Teknik Informatika', 'FPMIPA', 2023, '08123456789', '1234567890'],
  ];
  const ws = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, 'Mahasiswa');
  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="template_mahasiswa.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// GET /api/admin/templates/lecturers
router.get('/templates/lecturers', (req, res) => {
  const wb = xlsx.utils.book_new();
  const data = [
    ['NIDN', 'Nama Lengkap', 'Email', 'Program Studi', 'Fakultas', 'Nomor HP'],
    ['1234567890', 'Contoh Dosen', 'dosen@upi.edu', 'Teknik Informatika', 'FPMIPA', '08123456789'],
  ];
  const ws = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, 'Dosen');
  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="template_dosen.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// POST /api/admin/import/students - import students from Excel
router.post('/import/students', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File tidak ditemukan' });

  const conn = await db.getConnection();
  try {
    const wb = xlsx.readFile(req.file.path);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    const [jobResult] = await conn.query(
      'INSERT INTO import_jobs (type, file_name, total_rows, imported_by, status) VALUES (?, ?, ?, ?, ?)',
      ['mahasiswa', req.file.originalname, rows.length, req.user.id, 'processing']
    );
    const jobId = jobResult.insertId;

    let success = 0, failed = 0;
    const errors = [];

    await conn.beginTransaction();

    for (const row of rows) {
      try {
        const nim = String(row['NIM'] || '').trim();
        const email = String(row['Email'] || '').trim().toLowerCase();
        const fullName = String(row['Nama Lengkap'] || '').trim();
        const prodi = String(row['Program Studi'] || '').trim();
        const fakultas = String(row['Fakultas'] || '').trim();
        const angkatan = parseInt(row['Angkatan']) || null;
        const phone = String(row['Nomor HP'] || '').trim();
        const nidnPembimbing = String(row['NIDN Pembimbing'] || '').trim();

        if (!nim || !email || !fullName) {
          throw new Error('NIM, Email, dan Nama wajib diisi');
        }

        const tempPassword = crypto.randomBytes(6).toString('hex');
        const hash = await bcrypt.hash(tempPassword, 10);

        const [profResult] = await conn.query(
          'INSERT INTO profiles (email, password_hash, full_name, role, status, phone) VALUES (?, ?, ?, ?, ?, ?)',
          [email, hash, fullName, 'mahasiswa', 'must_change_password', phone]
        );

        let lecturerId = null;
        if (nidnPembimbing) {
          const [lecRows] = await conn.query(
            'SELECT profile_id FROM lecturers WHERE nidn = ?',
            [nidnPembimbing]
          );
          if (lecRows.length > 0) lecturerId = lecRows[0].profile_id;
        }

        await conn.query(
          'INSERT INTO students (profile_id, nim, program_studi, fakultas, angkatan, lecturer_id) VALUES (?, ?, ?, ?, ?, ?)',
          [profResult.insertId, nim, prodi, fakultas, angkatan, lecturerId]
        );

        await conn.query(
          'INSERT INTO user_provisioning_logs (profile_id, email, action, details) VALUES (?, ?, ?, ?)',
          [profResult.insertId, email, 'created', JSON.stringify({ temp_password: tempPassword, job_id: jobId })]
        );

        success++;
      } catch (e) {
        failed++;
        errors.push({ row: row['NIM'] || row['Email'] || 'unknown', error: e.message });
      }
    }

    await conn.commit();
    await conn.query(
      'UPDATE import_jobs SET success_rows = ?, failed_rows = ?, status = ?, error_details = ? WHERE id = ?',
      [success, failed, 'completed', JSON.stringify(errors), jobId]
    );

    fs.unlinkSync(req.file.path);
    res.json({ job_id: jobId, success, failed, errors });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Import gagal', details: err.message });
  } finally {
    conn.release();
  }
});

// POST /api/admin/import/lecturers
router.post('/import/lecturers', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File tidak ditemukan' });

  const conn = await db.getConnection();
  try {
    const wb = xlsx.readFile(req.file.path);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    const [jobResult] = await conn.query(
      'INSERT INTO import_jobs (type, file_name, total_rows, imported_by, status) VALUES (?, ?, ?, ?, ?)',
      ['dosen', req.file.originalname, rows.length, req.user.id, 'processing']
    );
    const jobId = jobResult.insertId;

    let success = 0, failed = 0;
    const errors = [];

    await conn.beginTransaction();

    for (const row of rows) {
      try {
        const nidn = String(row['NIDN'] || '').trim();
        const email = String(row['Email'] || '').trim().toLowerCase();
        const fullName = String(row['Nama Lengkap'] || '').trim();
        const prodi = String(row['Program Studi'] || '').trim();
        const fakultas = String(row['Fakultas'] || '').trim();
        const phone = String(row['Nomor HP'] || '').trim();

        if (!nidn || !email || !fullName) throw new Error('NIDN, Email, dan Nama wajib diisi');

        const tempPassword = crypto.randomBytes(6).toString('hex');
        const hash = await bcrypt.hash(tempPassword, 10);

        const [profResult] = await conn.query(
          'INSERT INTO profiles (email, password_hash, full_name, role, status, phone) VALUES (?, ?, ?, ?, ?, ?)',
          [email, hash, fullName, 'dosen', 'must_change_password', phone]
        );

        await conn.query(
          'INSERT INTO lecturers (profile_id, nidn, program_studi, fakultas) VALUES (?, ?, ?, ?)',
          [profResult.insertId, nidn, prodi, fakultas]
        );

        await conn.query(
          'INSERT INTO user_provisioning_logs (profile_id, email, action, details) VALUES (?, ?, ?, ?)',
          [profResult.insertId, email, 'created', JSON.stringify({ temp_password: tempPassword, job_id: jobId })]
        );

        success++;
      } catch (e) {
        failed++;
        errors.push({ row: row['NIDN'] || row['Email'] || 'unknown', error: e.message });
      }
    }

    await conn.commit();
    await conn.query(
      'UPDATE import_jobs SET success_rows = ?, failed_rows = ?, status = ?, error_details = ? WHERE id = ?',
      [success, failed, 'completed', JSON.stringify(errors), jobId]
    );

    fs.unlinkSync(req.file.path);
    res.json({ job_id: jobId, success, failed, errors });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Import gagal', details: err.message });
  } finally {
    conn.release();
  }
});

// GET /api/admin/import-jobs
router.get('/import-jobs', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT j.*, p.full_name as imported_by_name
       FROM import_jobs j
       LEFT JOIN profiles p ON p.id = j.imported_by
       ORDER BY j.created_at DESC LIMIT 50`
    );
    res.json({ jobs: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
