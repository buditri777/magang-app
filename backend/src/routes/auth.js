const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../db/connection');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const [rows] = await db.query(
      'SELECT * FROM profiles WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const user = rows[0];

    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'Akun nonaktif, hubungi admin' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [user.id, 'login', JSON.stringify({ email }), req.ip]
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', verifyToken, [
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 8 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { current_password, new_password } = req.body;

    const [rows] = await db.query('SELECT password_hash FROM profiles WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Password lama salah' });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await db.query(
      'UPDATE profiles SET password_hash = ?, status = ? WHERE id = ?',
      [hash, 'active', req.user.id]
    );

    await db.query(
      'INSERT INTO audit_logs (user_id, action, ip_address) VALUES (?, ?, ?)',
      [req.user.id, 'change_password', req.ip]
    );

    res.json({ message: 'Password berhasil diubah' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
], async (req, res) => {
  try {
    const { email } = req.body;
    const [rows] = await db.query('SELECT id FROM profiles WHERE email = ?', [email]);

    // Always return success to prevent email enumeration
    if (rows.length === 0) {
      return res.json({ message: 'Jika email terdaftar, link reset password akan dikirim' });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { id: rows[0].id, purpose: 'reset_password' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // TODO: Send email with reset link
    // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await db.query(
      'INSERT INTO user_provisioning_logs (profile_id, email, action, details) VALUES (?, ?, ?, ?)',
      [rows[0].id, email, 'password_reset', JSON.stringify({ token_generated: true })]
    );

    res.json({ message: 'Jika email terdaftar, link reset password akan dikirim' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', [
  body('token').notEmpty(),
  body('new_password').isLength({ min: 8 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, new_password } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose !== 'reset_password') {
      return res.status(400).json({ error: 'Token tidak valid' });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await db.query(
      'UPDATE profiles SET password_hash = ?, status = ? WHERE id = ?',
      [hash, 'active', decoded.id]
    );

    res.json({ message: 'Password berhasil direset' });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Token sudah expired' });
    }
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.id, p.email, p.full_name, p.role, p.status, p.phone,
              s.nim, s.program_studi as student_prodi, s.fakultas as student_fakultas, s.angkatan,
              l.nidn, l.program_studi as lecturer_prodi, l.fakultas as lecturer_fakultas
       FROM profiles p
       LEFT JOIN students s ON s.profile_id = p.id
       LEFT JOIN lecturers l ON l.profile_id = p.id
       WHERE p.id = ?`,
      [req.user.id]
    );

    res.json({ user: rows[0] });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
