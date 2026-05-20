const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const crypto = require('crypto');
const prisma = require('../db/prisma');
const { verifyToken, requireRole } = require('../middleware/auth');
const { sendMail, welcomeEmail, resetPasswordEmail } = require('../lib/email');

const router = express.Router();

const upload = multer({
  dest: 'uploads/imports/',
  limits: { fileSize: 10 * 1024 * 1024 },
});

// All routes require super_admin
router.use(verifyToken, requireRole('super_admin'));

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { role, status, search } = req.query;
    const where = {};

    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { full_name: { contains: search } },
      ];
    }

    const users = await prisma.profile.findMany({
      where,
      select: {
        id: true, email: true, full_name: true, role: true, status: true, phone: true, created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/users — create user manual
router.post('/users', async (req, res) => {
  try {
    const { email, full_name, role, phone, nim, nidn, program_studi, fakultas, angkatan } = req.body;
    if (!email || !full_name || !role) {
      return res.status(400).json({ error: 'email, full_name, dan role wajib diisi' });
    }

    const existing = await prisma.profile.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email sudah terdaftar' });

    const tempPassword = crypto.randomBytes(6).toString('hex');
    const hash = await bcrypt.hash(tempPassword, 10);

    const profile = await prisma.profile.create({
      data: {
        email,
        full_name,
        role,
        phone: phone || null,
        password_hash: hash,
        status: 'must_change_password',
      },
    });

    // Create role-specific record
    if (role === 'mahasiswa' && nim) {
      await prisma.student.create({
        data: {
          profile_id: profile.id,
          nim,
          program_studi: program_studi || null,
          fakultas: fakultas || null,
          angkatan: angkatan ? parseInt(angkatan) : null,
        },
      });
    } else if (role === 'dosen' && nidn) {
      await prisma.lecturer.create({
        data: {
          profile_id: profile.id,
          nidn,
          program_studi: program_studi || null,
          fakultas: fakultas || null,
        },
      });
    }

    await prisma.userProvisioningLog.create({
      data: {
        profile_id: profile.id,
        email,
        action: 'created',
        details: JSON.stringify({ by_admin: req.user.id, role }),
      },
    });

    await prisma.auditLog.create({
      data: {
        user_id: req.user.id,
        action: 'create_user',
        entity_type: 'profile',
        entity_id: profile.id,
        details: { email, role },
      },
    });

    res.status(201).json({ user: { id: profile.id, email, full_name, role }, temp_password: tempPassword });

    // Fire-and-forget email
    sendMail({ to: email, ...welcomeEmail({ name: full_name, email, tempPassword }) })
      .catch(e => console.error('welcome email failed:', e.message));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/users/:id
router.patch('/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, role } = req.body;
    const data = {};
    if (status) data.status = status;
    if (role) data.role = role;
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No updates' });

    await prisma.profile.update({ where: { id }, data });

    await prisma.auditLog.create({
      data: {
        user_id: req.user.id,
        action: 'update_user',
        entity_type: 'profile',
        entity_id: id,
        details: { status, role },
      },
    });

    res.json({ message: 'User berhasil diupdate' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/users/:id/reset-password
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const tempPassword = crypto.randomBytes(6).toString('hex');
    const hash = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.profile.update({
      where: { id },
      data: { password_hash: hash, status: 'must_change_password' },
      select: { email: true, full_name: true },
    });

    await prisma.userProvisioningLog.create({
      data: {
        profile_id: id,
        email: user.email,
        action: 'password_reset',
        details: JSON.stringify({ by_admin: req.user.id }),
      },
    });

    res.json({ message: 'Password direset', temp_password: tempPassword });

    // Fire-and-forget email
    sendMail({ to: user.email, ...resetPasswordEmail({ name: user.full_name || user.email, email: user.email, tempPassword }) })
      .catch(e => console.error('reset email failed:', e.message));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/templates/students
router.get('/templates/students', (req, res) => {
  const wb = xlsx.utils.book_new();
  const data = [
    ['NIM', 'Nama Lengkap', 'Email', 'Program Studi', 'Fakultas', 'Angkatan', 'Nomor HP', 'NIDN Pembimbing'],
    ['12345678', 'Contoh Mahasiswa', 'mhs@udb.ac.id', 'Teknik Informatika', 'FTI', 2023, '08123456789', '1234567890'],
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
    ['1234567890', 'Contoh Dosen', 'dosen@udb.ac.id', 'Teknik Informatika', 'FTI', '08123456789'],
  ];
  const ws = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, 'Dosen');
  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="template_dosen.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// POST /api/admin/import/students
router.post('/import/students', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File tidak ditemukan' });

  try {
    const wb = xlsx.readFile(req.file.path);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    const job = await prisma.importJob.create({
      data: {
        type: 'mahasiswa',
        file_name: req.file.originalname,
        total_rows: rows.length,
        imported_by: req.user.id,
        status: 'processing',
      },
    });

    let success = 0, failed = 0;
    const errors = [];

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

        if (!nim || !email || !fullName) throw new Error('NIM, Email, dan Nama wajib diisi');

        const tempPassword = crypto.randomBytes(6).toString('hex');
        const hash = await bcrypt.hash(tempPassword, 10);

        let lecturerId = null;
        if (nidnPembimbing) {
          const lec = await prisma.lecturer.findUnique({ where: { nidn: nidnPembimbing } });
          if (lec) lecturerId = lec.profile_id;
        }

        await prisma.$transaction(async (tx) => {
          const profile = await tx.profile.create({
            data: {
              email, password_hash: hash, full_name: fullName,
              role: 'mahasiswa', status: 'must_change_password', phone,
            },
          });

          await tx.student.create({
            data: {
              profile_id: profile.id,
              nim, program_studi: prodi, fakultas, angkatan,
              lecturer_id: lecturerId,
            },
          });

          await tx.userProvisioningLog.create({
            data: {
              profile_id: profile.id, email, action: 'created',
              details: JSON.stringify({ temp_password: tempPassword, job_id: job.id }),
            },
          });
        });

        success++;
      } catch (e) {
        failed++;
        errors.push({ row: row['NIM'] || row['Email'] || 'unknown', error: e.message });
      }
    }

    await prisma.importJob.update({
      where: { id: job.id },
      data: { success_rows: success, failed_rows: failed, status: 'completed', error_details: errors },
    });

    fs.unlinkSync(req.file.path);
    res.json({ job_id: job.id, success, failed, errors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Import gagal', details: err.message });
  }
});

// POST /api/admin/import/lecturers
router.post('/import/lecturers', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File tidak ditemukan' });

  try {
    const wb = xlsx.readFile(req.file.path);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    const job = await prisma.importJob.create({
      data: {
        type: 'dosen',
        file_name: req.file.originalname,
        total_rows: rows.length,
        imported_by: req.user.id,
        status: 'processing',
      },
    });

    let success = 0, failed = 0;
    const errors = [];

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

        await prisma.$transaction(async (tx) => {
          const profile = await tx.profile.create({
            data: {
              email, password_hash: hash, full_name: fullName,
              role: 'dosen', status: 'must_change_password', phone,
            },
          });

          await tx.lecturer.create({
            data: { profile_id: profile.id, nidn, program_studi: prodi, fakultas },
          });

          await tx.userProvisioningLog.create({
            data: {
              profile_id: profile.id, email, action: 'created',
              details: JSON.stringify({ temp_password: tempPassword, job_id: job.id }),
            },
          });
        });

        success++;
      } catch (e) {
        failed++;
        errors.push({ row: row['NIDN'] || row['Email'] || 'unknown', error: e.message });
      }
    }

    await prisma.importJob.update({
      where: { id: job.id },
      data: { success_rows: success, failed_rows: failed, status: 'completed', error_details: errors },
    });

    fs.unlinkSync(req.file.path);
    res.json({ job_id: job.id, success, failed, errors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Import gagal', details: err.message });
  }
});

// GET /api/admin/import-jobs
router.get('/import-jobs', async (req, res) => {
  try {
    const jobs = await prisma.importJob.findMany({
      include: { importer: { select: { full_name: true } } },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    const result = jobs.map(j => ({ ...j, imported_by_name: j.importer?.full_name }));
    res.json({ jobs: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
