
-- Create financial_ledger table
CREATE TABLE IF NOT EXISTS financial_ledger (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    type ENUM('income', 'expense', 'emi') NOT NULL,
    category VARCHAR(100) NOT NULL,
    payment_method VARCHAR(100) NOT NULL,
    reference VARCHAR(100),
    entity_type ENUM('vehicle', 'driver', 'customer', 'project'),
    entity_id VARCHAR(50),
    status ENUM('completed', 'pending', 'cancelled', 'reconciled') DEFAULT 'completed',
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_date (date),
    INDEX idx_type (type),
    INDEX idx_category (category),
    INDEX idx_payment_method (payment_method),
    INDEX idx_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create vehicle_emis table
CREATE TABLE IF NOT EXISTS vehicle_emis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id VARCHAR(50) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('paid', 'pending', 'overdue') DEFAULT 'pending',
    bank_name VARCHAR(100) NOT NULL,
    loan_reference VARCHAR(100),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_vehicle (vehicle_id),
    INDEX idx_due_date (due_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    budget_amount DECIMAL(12, 2),
    color VARCHAR(20),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create expense_budgets table
CREATE TABLE IF NOT EXISTS expense_budgets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_name_date (name, start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create budget_category_allocations table
CREATE TABLE IF NOT EXISTS budget_category_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    budget_id INT NOT NULL,
    category_id INT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (budget_id) REFERENCES expense_budgets(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE CASCADE,
    UNIQUE INDEX idx_budget_category (budget_id, category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert some sample data for testing
INSERT INTO financial_ledger (date, description, amount, type, category, payment_method, reference, status)
VALUES 
('2025-05-01', 'Trip Revenue - Vizag to Araku', 4500.00, 'income', 'Trip Revenue', 'Cash', 'ORD-1234', 'completed'),
('2025-05-01', 'Fuel Payment', 2100.00, 'expense', 'Fuel', 'Cash', 'INV-4321', 'completed'),
('2025-05-02', 'Airport Transfer - Vizag Airport', 2500.00, 'income', 'Airport Transfer', 'Bank Transfer', 'ORD-2345', 'completed'),
('2025-05-03', 'Vehicle Insurance - AP 31 AB 1234', 15000.00, 'expense', 'Insurance', 'Bank Transfer', 'INV-5432', 'reconciled'),
('2025-05-04', 'Corporate Booking - Infosys', 8000.00, 'income', 'Corporate Booking', 'Bank Transfer', 'ORD-3456', 'completed'),
('2025-05-05', 'Driver Salary - Rajesh Kumar', 15000.00, 'expense', 'Driver Salary', 'Bank Transfer', 'SAL-1001', 'reconciled'),
('2025-05-06', 'Package Revenue - Vizag City Tour', 3500.00, 'income', 'Package Revenue', 'Cash', 'ORD-4567', 'completed'),
('2025-05-07', 'Vehicle EMI - AP 31 AB 1234', 12500.00, 'emi', 'Vehicle EMI', 'Bank Transfer', 'EMI-1001', 'reconciled'),
('2025-05-08', 'Trip Revenue - Vizag to Hyderabad', 9500.00, 'income', 'Trip Revenue', 'UPI', 'ORD-5678', 'completed'),
('2025-05-09', 'Vehicle Maintenance', 3200.00, 'expense', 'Maintenance', 'Cash', 'INV-6543', 'pending');

-- Insert sample vehicle EMIs
INSERT INTO vehicle_emis (vehicle_id, amount, due_date, status, bank_name, loan_reference)
VALUES 
('VEH001', 12500.00, '2025-05-15', 'pending', 'HDFC Bank', 'LOAN-1234'),
('VEH002', 8500.00, '2025-05-20', 'pending', 'ICICI Bank', 'LOAN-5678'),
('VEH003', 15000.00, '2025-05-05', 'paid', 'SBI', 'LOAN-9012'),
('VEH004', 10200.00, '2025-05-25', 'pending', 'Axis Bank', 'LOAN-3456'),
('VEH005', 9300.00, '2025-04-30', 'overdue', 'Kotak Bank', 'LOAN-7890');

-- Insert sample expense categories
INSERT INTO expense_categories (name, description, budget_amount, color)
VALUES 
('Fuel', 'All fuel expenses for vehicles', 50000.00, '#FF5733'),
('Maintenance', 'Vehicle maintenance and repairs', 30000.00, '#33A1FF'),
('Insurance', 'Vehicle insurance premiums', 20000.00, '#33FF57'),
('Driver Salary', 'Monthly salary for drivers', 100000.00, '#A133FF'),
('Office Rent', 'Office space rental', 15000.00, '#FF33A1'),
('Vehicle EMI', 'EMI payments for vehicles', 75000.00, '#FFD700'),
('Other Expenses', 'Miscellaneous expenses', 20000.00, '#808080');
