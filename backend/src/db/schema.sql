-- Rescue Roots Nepal - Initial schema (MySQL 8+ recommended)

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(120) NOT NULL,
  role ENUM('superadmin','public','ngo_admin','volunteer','veterinarian','adopter') NOT NULL DEFAULT 'public',
  avatar VARCHAR(512) NULL,
  phone VARCHAR(40) NULL,
  organization VARCHAR(255) NULL,
  verification_status ENUM('pending','approved','rejected') NULL,
  verification_document_url VARCHAR(1024) NULL,
  verified_at DATETIME NULL,
  verified_by CHAR(36) NULL,
  rejection_reason TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_verification_status (verification_status),
  INDEX idx_role_verification (role, verification_status)
);

-- Ensure enum contains superadmin even if table already existed
ALTER TABLE users
  MODIFY COLUMN role ENUM('superadmin','public','ngo_admin','volunteer','veterinarian','adopter')
  NOT NULL DEFAULT 'public';

-- Add verification columns (MySQL doesn't support IF NOT EXISTS, so we'll handle errors gracefully)
-- These will be added by migrate.js if they don't exist

CREATE TABLE IF NOT EXISTS dogs (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  breed VARCHAR(120) NULL,
  estimated_age VARCHAR(64) NOT NULL,
  gender ENUM('male','female','unknown') NOT NULL DEFAULT 'unknown',
  size ENUM('small','medium','large') NOT NULL DEFAULT 'medium',
  status ENUM('reported','in_progress','treated','adoptable','adopted') NOT NULL DEFAULT 'reported',
  description TEXT NOT NULL,
  rescue_story TEXT NULL,
  location_lat DOUBLE NOT NULL,
  location_lng DOUBLE NOT NULL,
  location_address VARCHAR(255) NOT NULL,
  location_district VARCHAR(120) NULL,
  vaccinated TINYINT(1) NOT NULL DEFAULT 0,
  sterilized TINYINT(1) NOT NULL DEFAULT 0,
  medical_notes TEXT NULL,
  reported_at DATETIME NOT NULL,
  rescued_at DATETIME NULL,
  adopted_at DATETIME NULL,
  adopter_id CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_dogs_status (status),
  INDEX idx_dogs_district (location_district)
);

CREATE TABLE IF NOT EXISTS dog_photos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  dog_id CHAR(36) NOT NULL,
  url VARCHAR(1024) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dog_photos_dog FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE CASCADE,
  INDEX idx_dog_photos_dog (dog_id)
);

CREATE TABLE IF NOT EXISTS rescue_reports (
  id CHAR(36) PRIMARY KEY,
  description TEXT NOT NULL,
  status ENUM('pending','assigned','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
  urgency ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  reported_by VARCHAR(255) NOT NULL,
  reported_at DATETIME NOT NULL,
  assigned_to CHAR(36) NULL,
  dog_id CHAR(36) NULL,
  notes TEXT NULL,
  location_lat DOUBLE NOT NULL,
  location_lng DOUBLE NOT NULL,
  location_address VARCHAR(255) NOT NULL,
  location_district VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reports_status (status),
  INDEX idx_reports_urgency (urgency)
);

CREATE TABLE IF NOT EXISTS rescue_report_photos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  report_id CHAR(36) NOT NULL,
  url VARCHAR(1024) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_report_photos_report FOREIGN KEY (report_id) REFERENCES rescue_reports(id) ON DELETE CASCADE,
  INDEX idx_report_photos_report (report_id)
);

-- Password reset OTPs table
CREATE TABLE IF NOT EXISTS password_reset_otps (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at DATETIME NOT NULL,
  used TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_otp_email (email),
  INDEX idx_otp_expires (expires_at),
  INDEX idx_otp_used (used)
);

-- Adoption applications (submitted by logged-in users; reviewed by NGO admins)
CREATE TABLE IF NOT EXISTS adoption_applications (
  id CHAR(36) PRIMARY KEY,
  dog_id CHAR(36) NOT NULL,
  applicant_id CHAR(36) NOT NULL,
  ngo_id CHAR(36) NULL,
  applicant_phone VARCHAR(40) NOT NULL,
  home_type VARCHAR(120) NOT NULL,
  has_yard TINYINT(1) NOT NULL DEFAULT 0,
  other_pets VARCHAR(255) NOT NULL DEFAULT '',
  experience TEXT NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending','under_review','approved','rejected') NOT NULL DEFAULT 'pending',
  notes TEXT NULL,
  submitted_at DATETIME NOT NULL,
  reviewed_at DATETIME NULL,
  reviewed_by CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_adopt_app_dog FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE CASCADE,
  CONSTRAINT fk_adopt_app_applicant FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_adopt_app_dog (dog_id),
  INDEX idx_adopt_app_applicant (applicant_id),
  INDEX idx_adopt_app_ngo (ngo_id),
  INDEX idx_adopt_app_status (status)
);

-- In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info','success','warning','error') NOT NULL DEFAULT 'info',
  link VARCHAR(255) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user_read (user_id, is_read),
  INDEX idx_notifications_created (created_at)
);

