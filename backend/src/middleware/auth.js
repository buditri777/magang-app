const jwt = require('jsonwebtoken');
const db = require('../db/connection');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token tidak ditemukan' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await db.query(
      'SELECT id, email, full_name, role, status FROM profiles WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'User tidak ditemukan' });
    }

    if (rows[0].status === 'inactive') {
      return res.status(403).json({ error: 'Akun nonaktif' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid' });
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Belum login' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Akses ditolak: role tidak diizinkan' });
    }
    next();
  };
};

const requireActiveAccount = (req, res, next) => {
  if (req.user.status === 'must_change_password') {
    return res.status(403).json({
      error: 'Wajib ganti password terlebih dahulu',
      code: 'MUST_CHANGE_PASSWORD',
    });
  }
  if (req.user.status === 'pending_activation') {
    return res.status(403).json({ error: 'Akun belum diaktivasi' });
  }
  next();
};

module.exports = { verifyToken, requireRole, requireActiveAccount };
