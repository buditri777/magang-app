-- ============================================
-- SCHEMA: Aplikasi Manajemen Magang
-- Database: magang_db
-- ============================================

-- Profiles (semua user)
CREATE TABLE IF NOT EXISTS profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'admin_upi', 'dosen', 'mahasiswa') NOT NULL,
    status ENUM('active', 'inactive', 'pending_activation', 'must_change_password') NOT NULL DEFAULT 'pending_activation',
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Students
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profile_id INT NOT NULL,
    nim VARCHAR(20) NOT NULL UNIQUE,
    program_studi VARCHAR(100),
    fakultas VARCHAR(100),
    angkatan YEAR,
    lecturer_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (lecturer_id) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Lecturers
CREATE TABLE IF NOT EXISTS lecturers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profile_id INT NOT NULL,
    nidn VARCHAR(20) NOT NULL UNIQUE,
    program_studi VARCHAR(100),
    fakultas VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Companies
CREATE TABLE IF NOT EXISTS companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_normalized VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    contact VARCHAR(100),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_companies_name_norm ON companies(name_normalized);

-- Internship Applications
CREATE TABLE IF NOT EXISTS internship_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    company_id INT NOT NULL,
    position VARCHAR(255),
    division VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    notes TEXT,
    status ENUM('draft', 'submitted', 'under_review', 'rejected', 'approved', 'letter_generated', 'signed', 'completed') NOT NULL DEFAULT 'draft',
    rejection_reason TEXT,
    letter_number VARCHAR(100),
    template_type ENUM('A', 'B'),
    batch_key VARCHAR(255),
    submitted_at TIMESTAMP NULL,
    reviewed_at TIMESTAMP NULL,
    reviewed_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_applications_status ON internship_applications(status);
CREATE INDEX idx_applications_company ON internship_applications(company_id);
CREATE INDEX idx_applications_batch ON internship_applications(batch_key);

-- Letter Templates
CREATE TABLE IF NOT EXISTS letter_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('A', 'B') NOT NULL COMMENT 'A=1 mahasiswa, B=multi mahasiswa',
    file_path VARCHAR(500) NOT NULL,
    uploaded_by INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Generated Letters
CREATE TABLE IF NOT EXISTS generated_letters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    letter_number VARCHAR(100),
    template_id INT,
    generated_file_path VARCHAR(500),
    signed_file_path VARCHAR(500),
    is_signed BOOLEAN DEFAULT FALSE,
    signed_at TIMESTAMP NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES internship_applications(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES letter_templates(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Import Jobs
CREATE TABLE IF NOT EXISTS import_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('mahasiswa', 'dosen') NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    total_rows INT DEFAULT 0,
    success_rows INT DEFAULT 0,
    failed_rows INT DEFAULT 0,
    status ENUM('processing', 'completed', 'failed') NOT NULL DEFAULT 'processing',
    error_details JSON,
    imported_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (imported_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- User Provisioning Logs
CREATE TABLE IF NOT EXISTS user_provisioning_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profile_id INT,
    email VARCHAR(255) NOT NULL,
    action ENUM('created', 'email_sent', 'activated', 'password_reset') NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    details JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);

-- Seed Super Admin
INSERT INTO profiles (email, password_hash, full_name, role, status)
VALUES ('admin@upi.edu', '$2b$10$placeholder', 'Super Admin', 'super_admin', 'must_change_password');
