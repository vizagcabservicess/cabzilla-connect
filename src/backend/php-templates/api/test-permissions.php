<?php
// Set error reporting
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Function to check and fix directory permissions
function checkAndFixPermissions($path, $expectedDirPerms = 0755, $expectedFilePerms = 0644) {
    echo "<h3>Checking: " . htmlspecialchars($path) . "</h3>";
    
    if (!file_exists($path)) {
        echo "<p style='color: red;'>Path does not exist: " . htmlspecialchars($path) . "</p>";
        return false;
    }
    
    $currentPerms = fileperms($path) & 0777;
    $isDir = is_dir($path);
    $expectedPerms = $isDir ? $expectedDirPerms : $expectedFilePerms;
    
    echo "<p>Current permissions: " . sprintf('%o', $currentPerms) . "</p>";
    echo "<p>Expected permissions: " . sprintf('%o', $expectedPerms) . "</p>";
    
    if ($currentPerms !== $expectedPerms) {
        echo "<p style='color: orange;'>Permissions mismatch. Attempting to fix...</p>";
        if (@chmod($path, $expectedPerms)) {
            echo "<p style='color: green;'>Successfully updated permissions to " . sprintf('%o', $expectedPerms) . "</p>";
        } else {
            echo "<p style='color: red;'>Failed to update permissions. Please fix manually.</p>";
        }
    } else {
        echo "<p style='color: green;'>Permissions are correct.</p>";
    }
    
    // If it's a directory, check its contents
    if ($isDir) {
        $items = scandir($path);
        foreach ($items as $item) {
            if ($item != "." && $item != "..") {
                $fullPath = $path . DIRECTORY_SEPARATOR . $item;
                checkAndFixPermissions($fullPath, $expectedDirPerms, $expectedFilePerms);
            }
        }
    }
    
    return true;
}

// Function to check if a directory is writable
function checkWritable($path) {
    echo "<h3>Testing write access to: " . htmlspecialchars($path) . "</h3>";
    
    if (!file_exists($path)) {
        echo "<p style='color: red;'>Path does not exist!</p>";
        return false;
    }
    
    $testFile = $path . DIRECTORY_SEPARATOR . 'write_test_' . time() . '.txt';
    $success = @file_put_contents($testFile, 'Test write access');
    
    if ($success !== false) {
        echo "<p style='color: green;'>Successfully wrote test file.</p>";
        @unlink($testFile);
        echo "<p>Test file removed.</p>";
        return true;
    } else {
        echo "<p style='color: red;'>Failed to write test file!</p>";
        return false;
    }
}

// Output as HTML
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Permission Diagnostic Tool</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 4px; }
        .success { color: green; }
        .error { color: red; }
        .warning { color: orange; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Permission Diagnostic Tool</h1>
        
        <?php
        // Get server information
        echo "<h2>Server Information:</h2>";
        echo "<pre>";
        echo "PHP Version: " . phpversion() . "\n";
        echo "Server Software: " . $_SERVER['SERVER_SOFTWARE'] . "\n";
        echo "Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
        echo "Current Script: " . __FILE__ . "\n";
        echo "Current User: " . get_current_user() . "\n";
        echo "Process User: " . posix_getpwuid(posix_geteuid())['name'] . "\n";
        echo "</pre>";
        
        // Critical directories to check
        $criticalPaths = [
            $_SERVER['DOCUMENT_ROOT'] . '/public_html/vendor',
            __DIR__ . '/../logs',
            __DIR__ . '/../../logs',
            __DIR__ . '/../temp',
            __DIR__ . '/../../temp'
        ];
        
        echo "<h2>Checking Critical Directories:</h2>";
        foreach ($criticalPaths as $path) {
            // Create directory if it doesn't exist
            if (!file_exists($path)) {
                echo "<p>Creating directory: " . htmlspecialchars($path) . "</p>";
                if (@mkdir($path, 0755, true)) {
                    echo "<p class='success'>Successfully created directory.</p>";
                } else {
                    echo "<p class='error'>Failed to create directory!</p>";
                }
            }
            
            // Check permissions
            checkAndFixPermissions($path);
            
            // Test write access
            checkWritable($path);
        }
        
        // Check vendor directory specifically
        $vendorPath = $_SERVER['DOCUMENT_ROOT'] . '/public_html/vendor';
        echo "<h2>Vendor Directory Check:</h2>";
        if (is_dir($vendorPath)) {
            echo "<p class='success'>Vendor directory exists at: " . htmlspecialchars($vendorPath) . "</p>";
            
            // Check DomPDF
            $dompdfPath = $vendorPath . '/dompdf/dompdf';
            if (is_dir($dompdfPath)) {
                echo "<p class='success'>DomPDF directory found.</p>";
                checkAndFixPermissions($dompdfPath);
            } else {
                echo "<p class='error'>DomPDF directory not found! Please run composer install.</p>";
            }
            
            // Check autoloader
            $autoloaderPath = $vendorPath . '/autoload.php';
            if (file_exists($autoloaderPath)) {
                echo "<p class='success'>Autoloader found.</p>";
                checkAndFixPermissions($autoloaderPath);
            } else {
                echo "<p class='error'>Autoloader not found! Please run composer install.</p>";
            }
        } else {
            echo "<p class='error'>Vendor directory not found at: " . htmlspecialchars($vendorPath) . "</p>";
        }
        ?>
        
        <h2>Next Steps:</h2>
        <ol>
            <li>If any permissions are incorrect, run:
                <pre>chmod -R 755 <?php echo htmlspecialchars($_SERVER['DOCUMENT_ROOT']); ?>/public_html/vendor
chmod -R 755 <?php echo htmlspecialchars(__DIR__); ?>/../logs
find <?php echo htmlspecialchars($_SERVER['DOCUMENT_ROOT']); ?>/public_html/vendor -type f -exec chmod 644 {} \;</pre>
            </li>
            <li>If vendor directory is missing, run:
                <pre>cd <?php echo htmlspecialchars(__DIR__); ?>/..
composer install</pre>
            </li>
            <li>After fixing permissions, try the <a href="/api/test-pdf.php">PDF test page</a></li>
        </ol>
    </div>
</body>
</html> 