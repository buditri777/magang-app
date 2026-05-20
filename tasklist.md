# Tasklist — Web Magang UDB

**Repo:** buditri777/magang-app (private)
**Live:** https://magang-udb.vercel.app
**Backend:** http://43.133.147.109:3001 (proxied via Vercel `/api/*`)
**Stack:** React 19 + Vite + MUI (Berry theme) | Express + Prisma 7 + MySQL

Status: 🟢 done · 🟡 in-progress · 🔴 pending · ⚪ optional

---

## 0. Status Sekarang (sudah jalan)

- 🟢 Backend Express + Prisma + MySQL (10 tabel, seed admin)
- 🟢 Auth: login, JWT, must-change-password flow
- 🟢 Routes: auth, admin (users CRUD + create manual), applications (full workflow), companies, dosen
- 🟢 Letter generation engine (single + multi template .docx)
- 🟢 Email service (SMTP nodemailer) — welcome + reset password emails
- 🟢 Frontend MUI Berry theme, Layout drawer + topbar
- 🟢 Pages: Login (+ show password), ChangePassword, Admin (Dashboard/Users+Dialog/Import), Mahasiswa (Dashboard/Apply/Applications+Download), AdminUPI (Dashboard/Applications+Review+Approve/Reject+Download Letter), Dosen (Dashboard+Mahasiswa Bimbingan)
- 🟢 Notistack toast notifications (semua alert() diganti)
- 🟢 Vercel deploy production + alias `magang-udb.vercel.app`
- 🟢 Vercel proxy `/api/*` → backend VPS (fix mixed content)
- 🟢 PM2 auto-restart backend
- 🟢 Full E2E test passed (9/9): login → create user → change pw → apply → approve → generate letter

---

## 1. Smoke Test End-to-End (PRIORITAS #1)

- 🟡 1.1 Login `admin@udb.ac.id` / `admin123` → must change password
- 🔴 1.2 Change password → kembali ke dashboard super_admin
- 🔴 1.3 Tampilan dashboard super_admin (stats + table) load tanpa error
- 🔴 1.4 Buat user dosen manual di /admin/users
- 🔴 1.5 Buat user admin_upi manual di /admin/users
- 🔴 1.6 Buat user mahasiswa manual di /admin/users
- 🔴 1.7 Login sebagai dosen → dashboard
- 🔴 1.8 Login sebagai admin_upi → dashboard
- 🔴 1.9 Login sebagai mahasiswa → dashboard
- 🔴 1.10 Mahasiswa apply magang → submit application
- 🔴 1.11 Admin UPI review → approve application
- 🔴 1.12 Verifikasi state DB konsisten

---

## 2. Fitur Inti yang Belum Lengkap

### 2.1 User Management (Super Admin)
- 🔴 Form create user manual (selain Excel import) lengkap dengan role-specific fields (NIM untuk mahasiswa, NIDN untuk dosen)
- 🔴 Edit user (role, status, profile)
- 🔴 Reset password user
- 🔴 Activate/deactivate user
- ⚪ Filter user by role/status

### 2.2 Excel Import
- 🔴 Test import mahasiswa.xlsx (verifikasi success/error rows)
- 🔴 Test import dosen.xlsx
- 🔴 Download template Excel mahasiswa.xlsx & dosen.xlsx
- 🔴 Tampilan detail error import (yang gagal alasannya apa)

### 2.3 Application Workflow
- 🔴 Mahasiswa: form apply (pilih perusahaan baru / existing)
- 🔴 Mahasiswa: edit draft sebelum submit
- 🔴 Mahasiswa: lihat status setiap aplikasi
- 🔴 Admin UPI: list semua applications (filter by status)
- 🔴 Admin UPI: review detail application
- 🔴 Admin UPI: approve/reject dengan alasan
- 🔴 Admin UPI: assign letter number + template type (A/B)

### 2.4 Letter Generation (placeholder, perlu cek)
- 🔴 Upload letter template (.docx) oleh admin UPI
- 🔴 Generate surat dari approved application + template
- 🔴 Download generated letter (.docx atau .pdf)
- 🔴 Upload signed letter scan
- 🔴 Mahasiswa download surat sudah ttd

### 2.5 Dosen Pembimbing
- 🔴 Dosen lihat list mahasiswa bimbingan
- 🔴 Dosen lihat status magang masing-masing mahasiswa
- ⚪ Dosen tambah catatan/feedback

### 2.6 Company Management
- 🔴 List perusahaan (paginated)
- 🔴 Search perusahaan (auto-suggest saat apply)
- 🔴 Edit/merge duplicate perusahaan
- ⚪ Statistik perusahaan (mahasiswa terbanyak)

---

## 3. Polish Frontend

- 🔴 Loading states (skeleton/spinner) di semua page
- 🔴 Empty states yang informatif
- 🔴 Error boundaries
- 🔴 Toast notifications (success/error) — pakai notistack atau MUI Snackbar
- 🔴 Confirm dialog untuk destructive actions (delete, reject)
- 🔴 Form validation visual feedback (zod + react-hook-form)
- 🔴 Mobile responsive check semua page
- ⚪ Dark mode toggle

---

## 4. Backend Hardening

- 🔴 Input validation lengkap di semua route (express-validator)
- 🔴 Error handling middleware terpusat
- 🔴 Rate limit per-route khusus (login lebih ketat)
- 🔴 Logging pakai pino/winston
- 🔴 CORS whitelist (bukan `*`) untuk production
- 🔴 Helmet middleware (security headers)
- ⚪ API documentation (OpenAPI/Swagger)

---

## 5. Database & Migrations

- 🔴 Verify seed script idempotent
- 🔴 Backup script harian (cron)
- ⚪ Migration history bersih (squash kalau perlu)

---

## 6. Production Backend Stability

- 🔴 Pastikan backend running pakai PM2/systemd (auto-restart)
- 🔴 Nginx reverse proxy + HTTPS (Let's Encrypt) — opsi lebih baik dari Vercel proxy
- 🔴 Backend domain proper (mis. `api.magang-udb.com` atau subdomain VPS)
- 🔴 Environment variable management (PM2 ecosystem)
- 🔴 Log rotation

---

## 7. Testing Final

- 🔴 Manual end-to-end full flow semua role
- 🔴 Test dengan data real (10+ mahasiswa, 5+ dosen, 3+ perusahaan)
- 🔴 Test edge cases (duplicate email, invalid Excel, expired JWT)
- 🔴 Test concurrent users (sekedar load test ringan)
- ⚪ Unit tests backend (Jest)
- ⚪ Integration tests (Supertest)

---

## 8. Documentation

- 🔴 README.md proper (setup, deploy, env vars)
- 🔴 User guide singkat per role (PDF atau halaman docs)
- 🔴 Admin guide (cara import Excel, generate surat)

---

## Eksekusi Plan (urutan kerja)

**Fase A — Smoke test sekarang** (Section 1) → identifikasi bug nyata
**Fase B — Fix bug + lengkapi fitur inti** (Section 2.1, 2.3)
**Fase C — Excel import & letter generation** (Section 2.2, 2.4)
**Fase D — Polish UX** (Section 3) + backend hardening minimal (Section 4 critical only)
**Fase E — Production stability** (Section 6 minimal: PM2 + HTTPS)
**Fase F — Final testing** (Section 7) + docs (Section 8)
