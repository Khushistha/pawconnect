-- Rescue Roots Nepal - Initial schema (MySQL 8+ recommended)

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(120) NOT NULL,
  role ENUM('public','ngo_admin','volunteer','veterinarian','adopter') NOT NULL DEFAULT 'public',
  avatar VARCHAR(512) NULL,
  phone VARCHAR(40) NULL,
  organization VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

