-- User Privileges System Schema
-- This creates the necessary tables for role-based access control

-- Create user_privileges table to store module-level permissions
CREATE TABLE IF NOT EXISTS user_privileges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    role ENUM('guest', 'admin', 'super_admin') DEFAULT 'guest',
    module_privileges JSON DEFAULT '[]',
    custom_permissions JSON DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_privileges (user_id)
);

-- Update users table to include new role types
ALTER TABLE users 
MODIFY COLUMN role ENUM('guest', 'admin', 'super_admin', 'driver', 'customer', 'user', 'provider') DEFAULT 'guest';

-- Create audit log for privilege changes
CREATE TABLE IF NOT EXISTS privilege_audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    changed_by INT NOT NULL,
    old_privileges JSON,
    new_privileges JSON,
    action ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert default super admin privileges (adjust user_id as needed)
INSERT INTO user_privileges (user_id, role, module_privileges, custom_permissions) 
VALUES (1, 'super_admin', '[]', '{}') 
ON DUPLICATE KEY UPDATE role = 'super_admin';

-- Sample data for testing admin user with limited privileges
INSERT INTO user_privileges (user_id, role, module_privileges, custom_permissions) 
VALUES (2, 'admin', '["bookings_view", "bookings_create", "vehicles_view", "drivers_view"]', '{"canAssignDrivers": true}') 
ON DUPLICATE KEY UPDATE 
    role = 'admin',
    module_privileges = '["bookings_view", "bookings_create", "vehicles_view", "drivers_view"]',
    custom_permissions = '{"canAssignDrivers": true}';

-- Index for better performance
CREATE INDEX idx_user_privileges_role ON user_privileges(role);
CREATE INDEX idx_privilege_audit_user ON privilege_audit_log(user_id);
CREATE INDEX idx_privilege_audit_changed_by ON privilege_audit_log(changed_by);