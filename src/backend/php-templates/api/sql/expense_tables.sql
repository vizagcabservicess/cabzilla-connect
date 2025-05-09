
-- SQL Script for Expense Management related tables

-- Check if expense_categories table exists, if not create it
CREATE TABLE IF NOT EXISTS expense_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT '#6B7280',
    budget_amount DECIMAL(12,2) DEFAULT 0,
    is_deleted BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add default expense categories if table is empty
INSERT INTO expense_categories (name, description, color)
SELECT * FROM (
    SELECT 'Marketing' AS name, 'Marketing and advertising expenses' AS description, '#F97316' AS color UNION
    SELECT 'Utilities', 'Electricity, water, internet bills', '#0EA5E9' UNION
    SELECT 'Rent', 'Office and garage rent', '#8B5CF6' UNION
    SELECT 'Maintenance', 'Office and equipment maintenance', '#22C55E' UNION
    SELECT 'Salaries', 'Staff salaries excluding drivers', '#EF4444' UNION
    SELECT 'Miscellaneous', 'Other business expenses', '#6B7280' UNION
    SELECT 'Events', 'Team events and parties', '#EC4899'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM expense_categories LIMIT 1);

-- Check if financial_ledger table exists, if not create it
CREATE TABLE IF NOT EXISTS financial_ledger (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('income', 'expense', 'emi') NOT NULL,
    date DATE NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    category VARCHAR(100),
    reference VARCHAR(100),
    payment_method VARCHAR(50),
    vehicle_id VARCHAR(50),
    driver_id VARCHAR(50),
    customer_id VARCHAR(50),
    project_id VARCHAR(50),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    
    -- Additional fields specific to expenses
    vendor VARCHAR(100),
    bill_number VARCHAR(50),
    bill_date DATE,
    is_recurring BOOLEAN DEFAULT 0,
    recurring_frequency ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly'),
    
    is_deleted BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Check if budget_management table exists, if not create it
CREATE TABLE IF NOT EXISTS budget_management (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    category_id INT,
    notes TEXT,
    is_deleted BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL
);
