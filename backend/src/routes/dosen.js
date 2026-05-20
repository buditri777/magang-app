const express = require('express');
const prisma = require('../db/prisma');
const { verifyToken, requireRole, requireActiveAccount } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, requireActiveAccount, requireRole('dosen'));

// GET /api/dosen/students - daftar mahasiswa bimbingan
router.get('/students', async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      where: { lecturer_id: req.user.id },
      include: {
        profile: {
          select: { full_name: true, email: true, phone: true },
        },
      },
      orderBy: { profile: { full_name: 'asc' } },
    });

    const result = students.map(s => ({
      id: s.id,
      nim: s.nim,
      program_studi: s.program_studi,
      fakultas: s.fakultas,
      angkatan: s.angkatan,
      full_name: s.profile.full_name,
      email: s.profile.email,
      phone: s.profile.phone,
    }));

    res.json({ students: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dosen/applications - pengajuan mahasiswa bimbingan
router.get('/applications', async (req, res) => {
  try {
    const apps = await prisma.internshipApplication.findMany({
      where: { student: { lecturer_id: req.user.id } },
      include: {
        company: { select: { name: true, city: true } },
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

    const result = apps.map(a => ({
      ...a,
      company_name: a.company.name,
      city: a.company.city,
      student_name: a.student.profile.full_name,
      nim: a.student.nim,
      program_studi: a.student.program_studi,
    }));

    res.json({ applications: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
