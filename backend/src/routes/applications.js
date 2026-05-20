const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const prisma = require('../db/prisma');
const { verifyToken, requireRole, requireActiveAccount } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, requireActiveAccount);

const signedUpload = multer({
  dest: 'uploads/signed_letters/',
  limits: { fileSize: 10 * 1024 * 1024 },
});
const templateUpload = multer({
  dest: 'uploads/templates/',
  limits: { fileSize: 5 * 1024 * 1024 },
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

    const student = await prisma.student.findUnique({ where: { profile_id: req.user.id } });
    if (!student) return res.status(400).json({ error: 'Profile mahasiswa belum lengkap' });

    const application = await prisma.internshipApplication.create({
      data: {
        student_id: student.id,
        company_id: parseInt(company_id),
        position: position || null,
        division: division || null,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        notes: notes || null,
        status: 'submitted',
        submitted_at: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: { user_id: req.user.id, action: 'submit_application', entity_type: 'application', entity_id: application.id },
    });

    res.status(201).json({ id: application.id, status: 'submitted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/applications/my - mahasiswa list own applications
router.get('/my', requireRole('mahasiswa'), async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { profile_id: req.user.id } });
    if (!student) return res.json({ applications: [] });

    const apps = await prisma.internshipApplication.findMany({
      where: { student_id: student.id },
      include: {
        company: { select: { name: true, city: true, address: true } },
        generatedLetter: { select: { id: true, signed_file_path: true, is_signed: true, letter_number: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const result = apps.map(a => ({
      ...a,
      company_name: a.company.name,
      company_city: a.company.city,
      company_address: a.company.address,
      letter_id: a.generatedLetter?.id,
      signed_file_path: a.generatedLetter?.signed_file_path,
      is_signed: a.generatedLetter?.is_signed || false,
      final_letter_number: a.generatedLetter?.letter_number,
    }));

    res.json({ applications: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/applications/:id - get detail
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const app = await prisma.internshipApplication.findUnique({
      where: { id },
      include: {
        company: { select: { name: true, address: true, city: true } },
        student: {
          select: {
            id: true, nim: true, program_studi: true, profile_id: true,
            profile: { select: { full_name: true } },
          },
        },
        generatedLetter: true,
      },
    });

    if (!app) return res.status(404).json({ error: 'Pengajuan tidak ditemukan' });

    // Permission check
    if (req.user.role === 'mahasiswa') {
      if (app.student.profile_id !== req.user.id) {
        return res.status(403).json({ error: 'Akses ditolak' });
      }
    } else if (req.user.role === 'dosen') {
      const student = await prisma.student.findUnique({ where: { id: app.student_id } });
      if (student.lecturer_id !== req.user.id) {
        return res.status(403).json({ error: 'Akses ditolak' });
      }
    }

    res.json({
      application: {
        ...app,
        company_name: app.company.name,
        company_address: app.company.address,
        company_city: app.company.city,
        student_name: app.student.profile.full_name,
        nim: app.student.nim,
        student_prodi: app.student.program_studi,
        signed_file_path: app.generatedLetter?.signed_file_path,
        generated_file_path: app.generatedLetter?.generated_file_path,
        is_signed: app.generatedLetter?.is_signed || false,
        final_letter_number: app.generatedLetter?.letter_number,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/applications/:id/submit - mahasiswa submit draft (or re-submit)
router.patch('/:id/submit', requireRole('mahasiswa'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const student = await prisma.student.findUnique({ where: { profile_id: req.user.id } });
    if (!student) return res.status(400).json({ error: 'Profile mahasiswa belum lengkap' });

    const app = await prisma.internshipApplication.findUnique({ where: { id } });
    if (!app) return res.status(404).json({ error: 'Pengajuan tidak ditemukan' });
    if (app.student_id !== student.id) return res.status(403).json({ error: 'Akses ditolak' });
    if (!['draft', 'revision'].includes(app.status)) {
      return res.status(400).json({ error: 'Pengajuan tidak dalam status yang bisa disubmit' });
    }

    await prisma.internshipApplication.update({
      where: { id },
      data: { status: 'submitted', submitted_at: new Date() },
    });

    await prisma.auditLog.create({
      data: { user_id: req.user.id, action: 'submit_application', entity_type: 'application', entity_id: id },
    });

    res.json({ message: 'Pengajuan berhasil disubmit', status: 'submitted' });
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
    const where = {};

    if (status) where.status = status;
    if (company_id) where.company_id = parseInt(company_id);
    if (search) {
      where.OR = [
        { student: { profile: { full_name: { contains: search } } } },
        { student: { nim: { contains: search } } },
        { company: { name: { contains: search } } },
      ];
    }

    const apps = await prisma.internshipApplication.findMany({
      where,
      include: {
        company: { select: { name: true, city: true } },
        student: {
          select: {
            nim: true, program_studi: true,
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

// PATCH /api/applications/:id/review - admin approve/reject
router.patch('/:id/review', requireRole('admin_upi'), [
  body('action').isIn(['approve', 'reject']),
], async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { action, rejection_reason, letter_number, template_type } = req.body;

    if (action === 'reject') {
      await prisma.internshipApplication.update({
        where: { id },
        data: {
          status: 'rejected',
          rejection_reason,
          reviewed_at: new Date(),
          reviewed_by: req.user.id,
        },
      });
      return res.json({ message: 'Pengajuan ditolak' });
    }

    // Approve
    const app = await prisma.internshipApplication.findUnique({
      where: { id },
      select: { company_id: true, start_date: true },
    });
    if (!app) return res.status(404).json({ error: 'Not found' });

    const ymd = new Date(app.start_date).toISOString().slice(0, 7);
    const batchKey = `${app.company_id}_${ymd}`;

    let finalTemplateType = template_type;
    if (!finalTemplateType) {
      const batchCount = await prisma.internshipApplication.count({
        where: {
          batch_key: batchKey,
          status: { in: ['approved', 'letter_generated', 'signed'] },
        },
      });
      finalTemplateType = batchCount > 0 ? 'B' : 'A';
    }

    await prisma.internshipApplication.update({
      where: { id },
      data: {
        status: 'approved',
        letter_number,
        template_type: finalTemplateType,
        batch_key: batchKey,
        reviewed_at: new Date(),
        reviewed_by: req.user.id,
      },
    });

    res.json({ message: 'Pengajuan disetujui', batch_key: batchKey, template_type: finalTemplateType });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/applications/:id/upload-signed
router.post('/:id/upload-signed', requireRole('admin_upi'), signedUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File tidak ditemukan' });

    const id = parseInt(req.params.id);
    const app = await prisma.internshipApplication.findUnique({
      where: { id },
      select: { letter_number: true },
    });

    const existing = await prisma.generatedLetter.findUnique({ where: { application_id: id } });

    if (existing) {
      await prisma.generatedLetter.update({
        where: { application_id: id },
        data: { signed_file_path: req.file.path, is_signed: true, signed_at: new Date() },
      });
    } else {
      await prisma.generatedLetter.create({
        data: {
          application_id: id,
          letter_number: app?.letter_number,
          signed_file_path: req.file.path,
          is_signed: true,
          signed_at: new Date(),
        },
      });
    }

    await prisma.internshipApplication.update({
      where: { id },
      data: { status: 'signed' },
    });

    res.json({ message: 'Surat ditandatangani berhasil diupload', file: req.file.filename });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/applications/:id/download-signed
router.get('/:id/download-signed', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const letter = await prisma.generatedLetter.findUnique({
      where: { application_id: id },
      include: {
        application: {
          select: {
            letter_number: true,
            student: {
              select: { nim: true, profile_id: true },
            },
          },
        },
      },
    });

    if (!letter || !letter.is_signed) {
      return res.status(404).json({ error: 'Surat belum tersedia' });
    }

    // Permission check
    if (req.user.role === 'mahasiswa' && letter.application.student.profile_id !== req.user.id) {
      return res.status(403).json({ error: 'Akses ditolak' });
    }

    const filePath = path.resolve(letter.signed_file_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File tidak ditemukan' });

    const safeName = `Surat_Magang_${letter.application.student.nim || 'mahasiswa'}.pdf`;
    res.download(filePath, safeName);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== TEMPLATE MANAGEMENT ==============

router.get('/templates/list', requireRole('admin_upi', 'super_admin'), async (req, res) => {
  try {
    const templates = await prisma.letterTemplate.findMany({
      where: { is_active: true },
      include: { uploader: { select: { full_name: true } } },
      orderBy: [{ type: 'asc' }, { created_at: 'desc' }],
    });

    const result = templates.map(t => ({
      ...t,
      uploaded_by_name: t.uploader?.full_name,
    }));

    res.json({ templates: result });
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

    const template = await prisma.letterTemplate.create({
      data: { name, type, file_path: req.file.path, uploaded_by: req.user.id },
    });
    res.status(201).json({ id: template.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== LETTER GENERATION ==============

const { generateSingleLetter, generateMultiLetter, formatPeriod } = require('../lib/letterGenerator');

// GET /api/applications/:id/generate-letter
// Generate .docx for an approved application (admin_upi/super_admin/mahasiswa-owner)
router.get('/:id/generate-letter', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const app = await prisma.internshipApplication.findUnique({
      where: { id },
      include: {
        student: {
          include: { profile: { select: { full_name: true } } },
        },
        company: true,
      },
    });
    if (!app) return res.status(404).json({ error: 'Pengajuan tidak ditemukan' });

    // Permission check
    if (req.user.role === 'mahasiswa') {
      const myStudent = await prisma.student.findUnique({ where: { profile_id: req.user.id } });
      if (!myStudent || myStudent.id !== app.student_id) {
        return res.status(403).json({ error: 'Akses ditolak' });
      }
    }

    if (!['approved', 'letter_generated', 'signed', 'completed'].includes(app.status)) {
      return res.status(400).json({ error: 'Pengajuan belum disetujui' });
    }

    // For "B" template (multi), find all sibling applications in same batch
    let buffer;
    let filename;
    if (app.template_type === 'B' && app.batch_key) {
      const siblings = await prisma.internshipApplication.findMany({
        where: { batch_key: app.batch_key, status: { in: ['approved', 'letter_generated', 'signed', 'completed'] } },
        include: {
          student: { include: { profile: { select: { full_name: true } } } },
        },
        orderBy: { id: 'asc' },
      });

      buffer = generateMultiLetter({
        letterNumber: app.letter_number,
        recipientTitle: `Pimpinan ${app.company.name}`,
        companyAddress: app.company.address || app.company.city || '',
        students: siblings.map(s => ({
          name: s.student.profile.full_name,
          number: s.student.nim,
          program: s.student.program_studi || '-',
        })),
        internshipRole: app.position || app.division || 'Magang',
        internshipPeriod: formatPeriod(app.start_date, app.end_date),
      });
      filename = `Surat_Magang_${app.company.name.replace(/\s+/g, '_')}_${app.batch_key}.docx`;
    } else {
      buffer = generateSingleLetter({
        letterNumber: app.letter_number,
        recipientTitle: `Pimpinan ${app.company.name}`,
        companyAddress: app.company.address || app.company.city || '',
        studentName: app.student.profile.full_name,
        studentNumber: app.student.nim,
        studentProgram: app.student.program_studi || '-',
        internshipRole: app.position || app.division || 'Magang',
        internshipPeriod: formatPeriod(app.start_date, app.end_date),
      });
      filename = `Surat_Magang_${app.student.nim}.docx`;
    }

    // Update status to letter_generated if still approved
    if (app.status === 'approved') {
      await prisma.internshipApplication.update({
        where: { id },
        data: { status: 'letter_generated' },
      });
      // Save record
      const existing = await prisma.generatedLetter.findUnique({ where: { application_id: id } });
      if (!existing) {
        await prisma.generatedLetter.create({
          data: {
            application_id: id,
            letter_number: app.letter_number,
            generated_at: new Date(),
          },
        });
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('Generate letter error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
