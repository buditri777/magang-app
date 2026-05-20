const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const prisma = require('../db/prisma');
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

    const user = await prisma.profile.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

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

    await prisma.auditLog.create({
      data: {
        user_id: user.id,
        action: 'login',
        details: { email },
        ip_address: req.ip,
      },
    });

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

    const user = await prisma.profile.findUnique({
      where: { id: req.user.id },
      select: { password_hash: true },
    });
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Password lama salah' });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await prisma.profile.update({
      where: { id: req.user.id },
      data: { password_hash: hash, status: 'active' },
    });

    await prisma.auditLog.create({
      data: { user_id: req.user.id, action: 'change_password', ip_address: req.ip },
    });

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
    const user = await prisma.profile.findUnique({ where: { email }, select: { id: true } });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'Jika email terdaftar, link reset password akan dikirim' });
    }

    const resetToken = jwt.sign(
      { id: user.id, purpose: 'reset_password' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // TODO: Send email with reset link
    await prisma.userProvisioningLog.create({
      data: {
        profile_id: user.id,
        email,
        action: 'password_reset',
        details: JSON.stringify({ token_generated: true }),
      },
    });

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
    await prisma.profile.update({
      where: { id: decoded.id },
      data: { password_hash: hash, status: 'active' },
    });

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
    const user = await prisma.profile.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        status: true,
        phone: true,
        student: {
          select: { nim: true, program_studi: true, fakultas: true, angkatan: true },
        },
        lecturer: {
          select: { nidn: true, program_studi: true, fakultas: true },
        },
      },
    });

    res.json({ user });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
