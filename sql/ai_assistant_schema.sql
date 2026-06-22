-- AI Booking Assistant schema (run once on production MySQL)

-- Extend bookings table for AI assistant / Google Sheets sync
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_source VARCHAR(20) DEFAULT 'VTH';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS trip_type VARCHAR(20);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS manager_name VARCHAR(100);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS manager_mobile VARCHAR(15);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_name VARCHAR(100);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS seating_capacity INT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_time VARCHAR(10);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS invoice_no INT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS advance_received INT DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_name VARCHAR(100);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_mobile VARCHAR(15);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_location VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS drop_location VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cost INT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_date DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sync_pending TINYINT(1) DEFAULT 0;

-- Uses existing cab_type column for vehicle; no vehicle_type column needed.

CREATE INDEX IF NOT EXISTS idx_bookings_invoice_no ON bookings (invoice_no);
CREATE INDEX IF NOT EXISTS idx_bookings_sync_pending ON bookings (sync_pending);

CREATE TABLE IF NOT EXISTS sheet_sync_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_no INT,
  sync_status ENUM('success','failed') DEFAULT 'failed',
  response TEXT,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sheet_sync_invoice (invoice_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_booking_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_no INT,
  action VARCHAR(100),
  raw_input TEXT,
  parsed_data JSON,
  performed_by VARCHAR(100),
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ai_booking_logs_invoice (invoice_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_command_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  command_text TEXT,
  parsed_action VARCHAR(100),
  result TEXT,
  performed_by VARCHAR(100),
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
