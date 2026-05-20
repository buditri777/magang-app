const express = require('express');
const prisma = require('../db/prisma');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/settings — public, semua user bisa lihat
router.get('/', async (req, res) => {
  try {
    const settings = await prisma.appSetting.findMany();
    const result = {};
    for (const s of settings) {
      result[s.key] = { value: s.value, label: s.label };
    }
    res.json({ settings: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/settings — super_admin only, update multiple settings
router.put('/', verifyToken, requireRole('super_admin'), async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Body harus berisi { settings: { key: value, ... } }' });
    }

    const updates = [];
    for (const [key, value] of Object.entries(settings)) {
      updates.push(
        prisma.appSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      );
    }
    await Promise.all(updates);

    await prisma.auditLog.create({
      data: {
        user_id: req.user.id,
        action: 'update_settings',
        entity_type: 'app_settings',
        details: settings,
      },
    });

    res.json({ message: 'Settings berhasil diupdate' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
