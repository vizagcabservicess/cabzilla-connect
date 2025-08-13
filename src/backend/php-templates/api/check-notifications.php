<?php
// Admin notification checker
// This page will show you all new form submissions and email attempts

require_once __DIR__ . '/../config.php';

// Set headers
header('Content-Type: text/html; charset=UTF-8');

// Function to get log files
function getLogFiles() {
    $logDir = __DIR__ . '/../logs';
    $files = [];
    
    if (file_exists($logDir)) {
        $logFiles = glob($logDir . '/*.log');
        $txtFiles = glob($logDir . '/*.txt');
        $files = array_merge($logFiles, $txtFiles);
    }
    
    return $files;
}

// Function to read log file content
function readLogFile($filePath) {
    if (file_exists($filePath)) {
        return file_get_contents($filePath);
    }
    return "File not found: " . basename($filePath);
}

// Get today's date
$today = date('Y-m-d');
$yesterday = date('Y-m-d', strtotime('-1 day'));

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vizag Taxi Hub - Admin Notifications</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #1e40af; text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 30px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 6px; }
        .section h2 { color: #374151; margin-top: 0; }
        .log-content { background: #f8fafc; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 12px; white-space: pre-wrap; max-height: 400px; overflow-y: auto; }
        .refresh-btn { background: #10b981; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 10px 0; }
        .refresh-btn:hover { background: #059669; }
        .status { padding: 10px; border-radius: 4px; margin: 10px 0; }
        .status.success { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
        .status.error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
        .status.info { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚗 Vizag Taxi Hub - Admin Notifications</h1>
        
        <div class="status info">
            <strong>Last Updated:</strong> <?php echo date('Y-m-d H:i:s'); ?>
            <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
        </div>
        
        <!-- Today's Form Submissions -->
        <div class="section">
            <h2>📝 Today's Form Submissions (<?php echo $today; ?>)</h2>
            <?php
            $driverHireLog = __DIR__ . '/../logs/driver_hire_' . $today . '.log';
            if (file_exists($driverHireLog)) {
                echo '<div class="log-content">' . htmlspecialchars(readLogFile($driverHireLog)) . '</div>';
            } else {
                echo '<div class="status info">No form submissions today.</div>';
            }
            ?>
        </div>
        
        <!-- Email Attempts -->
        <div class="section">
            <h2>📧 Email Attempts (<?php echo $today; ?>)</h2>
            <?php
            $emailLog = __DIR__ . '/../logs/email_attempts_' . $today . '.log';
            if (file_exists($emailLog)) {
                echo '<div class="log-content">' . htmlspecialchars(readLogFile($emailLog)) . '</div>';
            } else {
                echo '<div class="status info">No email attempts today.</div>';
            }
            ?>
        </div>
        
        <!-- Email Notifications -->
        <div class="section">
            <h2>🔔 Email Notifications (<?php echo $today; ?>)</h2>
            <?php
            $notificationFile = __DIR__ . '/../logs/email_notifications_' . $today . '.txt';
            if (file_exists($notificationFile)) {
                echo '<div class="log-content">' . htmlspecialchars(readLogFile($notificationFile)) . '</div>';
            } else {
                echo '<div class="status info">No email notifications today.</div>';
            }
            ?>
        </div>
        
        <!-- Real Email Logs -->
        <div class="section">
            <h2>📨 Real Email Service Logs (<?php echo $today; ?>)</h2>
            <?php
            $realEmailLog = __DIR__ . '/../logs/real_emails_' . $today . '.log';
            if (file_exists($realEmailLog)) {
                echo '<div class="log-content">' . htmlspecialchars(readLogFile($realEmailLog)) . '</div>';
            } else {
                echo '<div class="status info">No real email service logs today.</div>';
            }
            ?>
        </div>
        
        <!-- Database Records -->
        <div class="section">
            <h2>🗄️ Database Records</h2>
            <?php
            try {
                $conn = getDbConnectionWithRetry();
                
                // Check driver hire requests
                $result = $conn->query("SELECT COUNT(*) as count FROM driver_hire_requests WHERE DATE(created_at) = '$today'");
                $driverCount = $result->fetch_assoc()['count'];
                
                // Check contact messages
                $result = $conn->query("SELECT COUNT(*) as count FROM contact_messages WHERE DATE(created_at) = '$today'");
                $contactCount = $result->fetch_assoc()['count'];
                
                echo '<div class="status success">';
                echo "<strong>Today's Records:</strong><br>";
                echo "Driver Hire Requests: $driverCount<br>";
                echo "Contact Messages: $contactCount<br>";
                echo '</div>';
                
                // Show recent submissions
                if ($driverCount > 0) {
                    echo '<h3>Recent Driver Hire Requests:</h3>';
                    $result = $conn->query("SELECT * FROM driver_hire_requests WHERE DATE(created_at) = '$today' ORDER BY created_at DESC LIMIT 5");
                    echo '<div class="log-content">';
                    while ($row = $result->fetch_assoc()) {
                        echo "ID: {$row['id']} | Name: {$row['name']} | Phone: {$row['phone']} | Service: {$row['service_type']} | Time: {$row['created_at']}\n";
                    }
                    echo '</div>';
                }
                
            } catch (Exception $e) {
                echo '<div class="status error">Database Error: ' . $e->getMessage() . '</div>';
            }
            ?>
        </div>
        
        <!-- SMTP Status -->
        <div class="section">
            <h2>🔧 SMTP Status</h2>
            <div class="status error">
                <strong>SMTP Authentication Failed:</strong><br>
                The Hostinger SMTP credentials are not working. Error: 535 5.7.8 Error: authentication failed<br>
                <strong>Solution:</strong> Check your Hostinger email settings or use an alternative email service.
            </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="section">
            <h2>⚡ Quick Actions</h2>
            <button class="refresh-btn" onclick="location.reload()">🔄 Refresh All</button>
            <button class="refresh-btn" onclick="window.open('test-email-simple.php', '_blank')">📧 Test Email</button>
            <button class="refresh-btn" onclick="window.open('test-smtp.php', '_blank')">🔧 Test SMTP</button>
        </div>
    </div>
    
    <script>
        // Auto-refresh every 30 seconds
        setTimeout(function() {
            location.reload();
        }, 30000);
    </script>
</body>
</html>



