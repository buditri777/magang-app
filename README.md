# Aplikasi Manajemen Magang

Sistem manajemen administrasi magang mahasiswa berbasis web dengan stack **React JS + Node.js + MySQL**.

## Stack

- **Frontend:** React 18 + Vite + React Router + TanStack Query + Axios
- **Backend:** Node.js + Express + JWT + Bcrypt + Multer + XLSX
- **Database:** MySQL 8

## Fitur

### 4 Role:
1. **Super Admin** - Manajemen user, import data master via Excel
2. **Admin UPI** - Validasi pengajuan, nomor surat, upload template, upload surat ttd
3. **Dosen** - Lihat mahasiswa bimbingan & status pengajuan
4. **Mahasiswa** - Ajukan magang, cari/tambah perusahaan, download surat

### Modul:
- ✅ Authentication (JWT, force change password, reset password)
- ✅ Import Excel mahasiswa & dosen (bulk create akun)
- ✅ Manajemen user (filter, aktivasi, reset password)
- ✅ Pengajuan surat magang (search/add company, status tracking)
- ✅ Validasi admin UPI (approve/reject, nomor surat, batch logic)
- ✅ Upload template surat (Tipe A/B)
- ✅ Upload surat bertandatangan
- ✅ Lihat mahasiswa lain di perusahaan yang sama
- ✅ Dashboard dosen
- ✅ Audit log

## Setup

### 1. MySQL
```bash
sudo apt install mysql-server
sudo mysql -e "CREATE DATABASE magang_db CHARACTER SET utf8mb4; CREATE USER 'magang_user'@'localhost' IDENTIFIED BY 'MagangPass2026!'; GRANT ALL ON magang_db.* TO 'magang_user'@'localhost';"
mysql -u magang_user -p magang_db < backend/src/db/schema.sql
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env  # edit credentials
node src/db/seed.js   # seed super admin
npm run dev
```

API jalan di `http://localhost:3001`

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

App jalan di `http://localhost:5173`

## Login Default

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@upi.edu | admin123 |
| Admin UPI | adminupi@upi.edu | adminupi123 |

Wajib ganti password saat login pertama.

## Endpoint API Utama

| Method | Path | Role |
|--------|------|------|
| POST | /api/auth/login | All |
| POST | /api/auth/change-password | All |
| GET | /api/admin/users | super_admin |
| POST | /api/admin/import/students | super_admin |
| POST | /api/admin/import/lecturers | super_admin |
| GET | /api/admin/templates/students | super_admin |
| GET | /api/companies | All |
| POST | /api/companies | mahasiswa, admin |
| GET | /api/companies/:id/applicants | All |
| POST | /api/applications | mahasiswa |
| GET | /api/applications/my | mahasiswa |
| GET | /api/applications | admin_upi |
| PATCH | /api/applications/:id/review | admin_upi |
| POST | /api/applications/:id/upload-signed | admin_upi |
| GET | /api/applications/:id/download-signed | All (with permission) |
| GET | /api/dosen/students | dosen |
| GET | /api/dosen/applications | dosen |

## Database Schema

10 tabel: profiles, students, lecturers, companies, internship_applications, letter_templates, generated_letters, import_jobs, user_provisioning_logs, audit_logs.

## Catatan Pengembangan

### Yang sudah jadi:
- Auth full + RBAC + force change password
- Import Excel dengan validasi & rollback
- CRUD perusahaan dengan deduplikasi by name normalized
- Workflow application full (draft → submitted → approved → signed)
- Batch logic Tipe A/B otomatis
- Permission check per role di setiap endpoint
- Audit log

### TODO (fase berikutnya):
- Email notification (SMTP)
- Generate surat PDF dari template (saat ini admin upload manual)
- E-signature integration
- Dashboard analitik per prodi
- WhatsApp notification

## Lisensi

Proprietary - UPI Internal Use
