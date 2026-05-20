const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../db/prisma');
const { verifyToken, requireRole, requireActiveAccount } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, requireActiveAccount);

// GET /api/companies - search companies
router.get('/', async (req, res) => {
  try {
    const { search, city } = req.query;
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { name_normalized: { contains: search } },
        { address: { contains: search } },
      ];
    }
    if (city) {
      where.city = { contains: city };
    }

    const companies = await prisma.company.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 50,
    });
    res.json({ companies });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/companies - add new company
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

    const existing = await prisma.company.findFirst({
      where: { name_normalized: nameNormalized },
      select: { id: true, name: true },
    });
    if (existing) {
      return res.status(409).json({
        error: 'Perusahaan dengan nama serupa sudah ada',
        existing,
      });
    }

    const company = await prisma.company.create({
      data: {
        name,
        name_normalized: nameNormalized,
        address,
        city,
        contact: contact || null,
        created_by: req.user.id,
      },
    });

    res.status(201).json({ id: company.id, name, address, city });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/companies/:id/applicants
router.get('/:id/applicants', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const applications = await prisma.internshipApplication.findMany({
      where: {
        company_id: id,
        status: { notIn: ['draft', 'rejected'] },
      },
      select: {
        id: true,
        status: true,
        position: true,
        start_date: true,
        end_date: true,
        student: {
          select: {
            nim: true,
            program_studi: true,
            profile: { select: { full_name: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const applicants = applications.map(a => ({
      application_id: a.id,
      status: a.status,
      position: a.position,
      start_date: a.start_date,
      end_date: a.end_date,
      full_name: a.student.profile.full_name,
      nim: a.student.nim,
      program_studi: a.student.program_studi,
    }));

    res.json({ applicants });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
