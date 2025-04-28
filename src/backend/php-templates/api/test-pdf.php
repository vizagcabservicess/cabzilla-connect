
<?php
// Simple test script to verify PDF generation works

// Set headers for better error reporting
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Clear any output buffer
while (ob_get_level()) ob_end_clean();

// Enable debug mode
$debug = true;

echo "<h1>PDF Generation Test</h1>";
echo "<p>Server time: " . date('Y-m-d H:i:s') . "</p>";
echo "<p>PHP Version: " . phpversion() . "</p>";

// Create logs directory if it doesn't exist
$logsDir = dirname(dirname(__FILE__)) . '/logs';
if (!is_dir($logsDir)) {
    echo "<p>Creating logs directory at: " . htmlspecialchars($logsDir) . "</p>";
    $success = @mkdir($logsDir, 0755, true);
    echo "<p>Directory creation " . ($success ? "successful" : "failed") . "</p>";
} else {
    echo "<p>Logs directory already exists at: " . htmlspecialchars($logsDir) . "</p>";
}

// Test if we can write to logs
$testLogFile = $logsDir . '/test_log.txt';
$logWriteTest = @file_put_contents($testLogFile, date('Y-m-d H:i:s') . " - Test log entry\n", FILE_APPEND);
echo "<p>Log write test: " . ($logWriteTest !== false ? "successful" : "failed") . "</p>";

// Store the server's document root and script paths
$docRoot = $_SERVER['DOCUMENT_ROOT'];
echo "<p>Document Root: " . htmlspecialchars($docRoot) . "</p>";
echo "<p>Current script path: " . htmlspecialchars(__FILE__) . "</p>";
echo "<p>Directory of current script: " . htmlspecialchars(dirname(__FILE__)) . "</p>";
echo "<p>Parent directory: " . htmlspecialchars(dirname(dirname(__FILE__))) . "</p>";

// Check for autoloader in multiple possible locations with absolute paths
$autoloaderPaths = [
    $docRoot . '/vendor/autoload.php',
    dirname($docRoot) . '/vendor/autoload.php',
    dirname(dirname(__FILE__)) . '/vendor/autoload.php',
    dirname(dirname(dirname(__FILE__))) . '/vendor/autoload.php',
    dirname(dirname(dirname(dirname(__FILE__)))) . '/vendor/autoload.php',
    // More specific to common project structures
    $docRoot . '/src/backend/vendor/autoload.php',
    dirname(dirname(__FILE__)) . '/../../vendor/autoload.php'
];

$autoloaderPath = null;
$vendorExists = false;
$autloaderCheckResults = [];

foreach ($autoloaderPaths as $path) {
    $exists = file_exists($path);
    $autloaderCheckResults[] = [
        'path' => $path,
        'exists' => $exists,
        'readable' => $exists ? is_readable($path) : false
    ];
    
    if ($exists) {
        $autoloaderPath = $path;
        $vendorExists = true;
        break;
    }
}

echo "<h2>Autoloader Check</h2>";
echo "<ul>";
foreach ($autloaderCheckResults as $result) {
    echo "<li>" . htmlspecialchars($result['path']) . " - " . 
         ($result['exists'] ? 
            "<span style='color:green'>Exists" . ($result['readable'] ? ", Readable" : ", NOT READABLE") . "</span>" : 
            "<span style='color:red'>Not found</span>") . "</li>";
}
echo "</ul>";

// If no autoloader was found, look for the vendor directory and dompdf specifically
if (!$vendorExists) {
    echo "<p style='color:red; font-weight:bold;'>ERROR: Composer autoloader not found.</p>";
    
    // Look for vendor directory
    echo "<h2>Searching for vendor directory and DomPDF...</h2>";
    $possibleVendorDirs = [
        $docRoot . '/vendor',
        dirname($docRoot) . '/vendor',
        dirname(dirname(__FILE__)) . '/vendor',
        dirname(dirname(dirname(__FILE__))) . '/vendor',
        $docRoot . '/src/backend/vendor'
    ];
    
    echo "<ul>";
    foreach ($possibleVendorDirs as $dir) {
        $dirExists = is_dir($dir);
        $dompdfExists = $dirExists && is_dir($dir . '/dompdf');
        
        echo "<li>" . htmlspecialchars($dir) . " - " . 
             ($dirExists ? 
                "<span style='color:green'>Directory exists</span>" : 
                "<span style='color:red'>Directory not found</span>");
        
        if ($dirExists) {
            if ($dompdfExists) {
                echo " <span style='color:green'>DomPDF directory found!</span>";
                // Check if we have the main dompdf.php file
                if (file_exists($dir . '/dompdf/src/Dompdf.php')) {
                    echo " <span style='color:green'>Dompdf.php exists!</span>";
                } else {
                    echo " <span style='color:red'>Dompdf.php missing!</span>";
                }
            } else {
                echo " <span style='color:red'>No DomPDF directory</span>";
                // List contents to help debugging
                $contents = scandir($dir);
                echo "<ul>";
                foreach ($contents as $item) {
                    if ($item != "." && $item != "..") {
                        echo "<li>" . htmlspecialchars($item) . "</li>";
                    }
                }
                echo "</ul>";
            }
        }
        echo "</li>";
    }
    echo "</ul>";
    
    echo "<h2>Looking for composer.json...</h2>";
    $possibleComposerFiles = [
        $docRoot . '/composer.json',
        dirname($docRoot) . '/composer.json',
        dirname(dirname(__FILE__)) . '/composer.json',
        dirname(dirname(dirname(__FILE__))) . '/composer.json'
    ];
    
    echo "<ul>";
    foreach ($possibleComposerFiles as $file) {
        echo "<li>" . htmlspecialchars($file) . " - " . 
             (file_exists($file) ? 
                "<span style='color:green'>File exists</span>" : 
                "<span style='color:red'>File not found</span>") . "</li>";
        
        if (file_exists($file)) {
            $contents = file_get_contents($file);
            echo "<pre>" . htmlspecialchars(substr($contents, 0, 500)) . 
                 (strlen($contents) > 500 ? "..." : "") . "</pre>";
            
            if (strpos($contents, 'dompdf') !== false) {
                echo " <span style='color:green'>This composer.json includes DomPDF!</span>";
            } else {
                echo " <span style='color:orange'>This composer.json does not seem to include DomPDF.</span>";
            }
        }
    }
    echo "</ul>";
    
    echo "<p>Please run these commands in your project root:</p>";
    echo "<pre style='background-color: #f8f8f8; padding: 10px; border: 1px solid #ddd;'>
composer require dompdf/dompdf:^2.0
composer install
</pre>";
    
    exit;
}

echo "<p>Found composer autoloader at: " . htmlspecialchars($autoloaderPath) . "</p>";

// Try to include the autoloader
try {
    require_once $autoloaderPath;
    echo "<p style='color:green;'>Successfully included composer autoloader.</p>";
} catch (Exception $e) {
    echo "<p style='color:red;'>ERROR loading autoloader: " . htmlspecialchars($e->getMessage()) . "</p>";
    exit;
}

// Check if DomPDF class exists
if (!class_exists('Dompdf\Dompdf')) {
    echo "<p style='color:red;'>ERROR: DomPDF class not found. The package may not be installed correctly.</p>";
    
    // Check inside vendor directory
    echo "<p>Checking vendor directory structure...</p>";
    $dompdfPath = dirname($autoloaderPath) . '/dompdf';
    
    if (is_dir($dompdfPath)) {
        echo "<p style='color:green;'>DomPDF directory found at: " . htmlspecialchars($dompdfPath) . "</p>";
        echo "<p>Files in DomPDF directory:</p>";
        echo "<pre>";
        print_r(scandir($dompdfPath));
        echo "</pre>";
    } else {
        echo "<p style='color:red;'>DomPDF directory not found at expected location: " . htmlspecialchars($dompdfPath) . "</p>";
    }
    
    // Display installed packages
    echo "<h2>Installed Packages:</h2>";
    $composerJson = @file_get_contents(dirname($autoloaderPath) . '/composer/installed.json');
    if ($composerJson) {
        $packages = json_decode($composerJson, true);
        echo "<ul>";
        if (is_array($packages)) {
            if (isset($packages['packages'])) {
                // Newer composer structure
                foreach ($packages['packages'] as $package) {
                    echo "<li>" . htmlspecialchars($package['name'] ?? 'Unknown') . " - " . htmlspecialchars($package['version'] ?? 'Unknown version') . "</li>";
                }
            } else {
                // Older composer structure
                foreach ($packages as $package) {
                    echo "<li>" . htmlspecialchars($package['name'] ?? 'Unknown') . " - " . htmlspecialchars($package['version'] ?? 'Unknown version') . "</li>";
                }
            }
        } else {
            echo "<li>Error parsing composer packages.</li>";
        }
        echo "</ul>";
    } else {
        echo "<p>Could not read installed packages.</p>";
    }
    
    echo "<p>Please verify DomPDF is correctly installed. Try running:</p>";
    echo "<pre style='background-color: #f8f8f8; padding: 10px; border: 1px solid #ddd;'>
composer require dompdf/dompdf:^2.0
composer install
</pre>";
    exit;
}

echo "<p style='color:green;'>DomPDF class found.</p>";

// Try to create a simple PDF
try {
    // Import DomPDF classes
    use Dompdf\Dompdf;
    use Dompdf\Options;
    
    echo "<p>Creating DomPDF instance...</p>";
    
    // Configure DomPDF options
    $options = new Options();
    $options->set('isRemoteEnabled', true);
    $options->set('isHtml5ParserEnabled', true);
    $options->set('defaultFont', 'DejaVu Sans');
    
    // Create DomPDF instance
    $dompdf = new Dompdf($options);
    $dompdf->setPaper('A4', 'portrait');
    
    echo "<p style='color:green;'>DomPDF instance created successfully.</p>";
    
    // Simple HTML content
    $html = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Test PDF</title>
        <style>
            body { font-family: DejaVu Sans, Arial, sans-serif; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #333; }
            .success { color: green; }
            .info-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .info-table th, .info-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .info-table th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>PDF Generation Test</h1>
            <p class="success">If you can see this PDF, DomPDF is working correctly!</p>
            <p>Generated on: ' . date('Y-m-d H:i:s') . '</p>
            
            <h2>System Information</h2>
            <table class="info-table">
                <tr>
                    <th>PHP Version</th>
                    <td>' . phpversion() . '</td>
                </tr>
                <tr>
                    <th>DomPDF Version</th>
                    <td>' . (defined('Dompdf\Dompdf::VERSION') ? Dompdf\Dompdf::VERSION : 'Unknown') . '</td>
                </tr>
                <tr>
                    <th>Server</th>
                    <td>' . ($_SERVER['SERVER_SOFTWARE'] ?? 'Unknown') . '</td>
                </tr>
                <tr>
                    <th>Document Root</th>
                    <td>' . ($_SERVER['DOCUMENT_ROOT'] ?? 'Unknown') . '</td>
                </tr>
                <tr>
                    <th>Autoloader Path</th>
                    <td>' . $autoloaderPath . '</td>
                </tr>
            </table>
        </div>
    </body>
    </html>';
    
    // Load HTML
    $dompdf->loadHtml($html);
    echo "<p>HTML loaded into DomPDF.</p>";
    
    // Render PDF
    $dompdf->render();
    echo "<p style='color:green;'>PDF rendered successfully.</p>";
    
    // Display link to download PDF
    echo "<div style='text-align:center; margin:30px;'>";
    echo "<a href='?download=1' style='display:inline-block; padding:15px 30px; background:#4CAF50; color:white; text-decoration:none; border-radius:5px; font-size:18px;'>Download Test PDF</a>";
    echo "</div>";
    
    echo "<h2>PDF Generation Testing Tools</h2>";
    echo "<div style='display:flex; justify-content:center; gap:10px; margin-bottom:20px;'>";
    echo "<a href='?download=1&debug=1' style='padding:10px; background:#2196F3; color:white; text-decoration:none; border-radius:4px;'>Debug Mode PDF</a>";
    echo "<a href='/api/download-invoice.php?id=1&debug=1' style='padding:10px; background:#FF9800; color:white; text-decoration:none; border-radius:4px;'>Test Invoice Endpoint</a>";
    echo "</div>";
    
    // If download parameter is set, output the PDF
    if (isset($_GET['download'])) {
        // Clear all output buffers
        while (ob_get_level()) ob_end_clean();
        
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="test.pdf"');
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        
        echo $dompdf->output();
        exit;
    }
    
} catch (Exception $e) {
    echo "<p style='color:red;'>ERROR creating PDF: " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<p>Trace: <pre style='background-color:#fff8f8; padding:10px; overflow:auto; max-height:400px; border:1px solid #f5c6cb;'>" . htmlspecialchars($e->getTraceAsString()) . "</pre></p>";
}

// Display PHP info for debugging
echo "<h2>PHP Information:</h2>";
echo "<p>PHP Version: " . phpversion() . "</p>";
echo "<p>Extensions loaded: " . implode(', ', get_loaded_extensions()) . "</p>";

// GD is required for DomPDF
echo "<p>GD Info: " . (function_exists('gd_info') ? "<span style='color:green;'>Installed</span>" : "<span style='color:red;'>Not installed</span>") . "</p>";
if (function_exists('gd_info')) {
    $gdInfo = gd_info();
    echo "<table style='border-collapse: collapse; width: 100%; margin-top: 10px;'>";
    echo "<tr style='background-color: #f2f2f2;'><th style='border: 1px solid #ddd; padding: 8px; text-align: left;'>Feature</th><th style='border: 1px solid #ddd; padding: 8px; text-align: left;'>Status</th></tr>";
    
    foreach ($gdInfo as $key => $value) {
        echo "<tr>";
        echo "<td style='border: 1px solid #ddd; padding: 8px;'>" . htmlspecialchars($key) . "</td>";
        echo "<td style='border: 1px solid #ddd; padding: 8px;'>" . (is_bool($value) ? ($value ? 'Yes' : 'No') : htmlspecialchars($value)) . "</td>";
        echo "</tr>";
    }
    echo "</table>";
}

// Check mbstring extension
echo "<p>mbstring Extension: " . (extension_loaded('mbstring') ? "<span style='color:green;'>Installed</span>" : "<span style='color:red;'>Not installed</span>") . "</p>";

// Check file permissions
echo "<h2>File Permissions Check:</h2>";
$folderToCheck = dirname($autoloaderPath);
echo "<p>Checking folder: " . htmlspecialchars($folderToCheck) . "</p>";

function checkPermission($path) {
    if (file_exists($path)) {
        $perms = fileperms($path);
        $readable = is_readable($path) ? "<span style='color:green;'>Yes</span>" : "<span style='color:red;'>No</span>";
        $writable = is_writable($path) ? "<span style='color:green;'>Yes</span>" : "<span style='color:red;'>No</span>";
        $type = is_dir($path) ? "Directory" : "File";
        
        $symbolic = '';
        
        if (($perms & 0xC000) == 0xC000) {
            $symbolic = 's';
        } elseif (($perms & 0xA000) == 0xA000) {
            $symbolic = 'l';
        } elseif (($perms & 0x8000) == 0x8000) {
            $symbolic = '-';
        } elseif (($perms & 0x6000) == 0x6000) {
            $symbolic = 'b';
        } elseif (($perms & 0x4000) == 0x4000) {
            $symbolic = 'd';
        } elseif (($perms & 0x2000) == 0x2000) {
            $symbolic = 'c';
        } elseif (($perms & 0x1000) == 0x1000) {
            $symbolic = 'p';
        } else {
            $symbolic = 'u';
        }

        // Owner
        $symbolic .= (($perms & 0x0100) ? 'r' : '-');
        $symbolic .= (($perms & 0x0080) ? 'w' : '-');
        $symbolic .= (($perms & 0x0040) ?
                    (($perms & 0x0800) ? 's' : 'x' ) :
                    (($perms & 0x0800) ? 'S' : '-'));

        // Group
        $symbolic .= (($perms & 0x0020) ? 'r' : '-');
        $symbolic .= (($perms & 0x0010) ? 'w' : '-');
        $symbolic .= (($perms & 0x0008) ?
                    (($perms & 0x0400) ? 's' : 'x' ) :
                    (($perms & 0x0400) ? 'S' : '-'));

        // World
        $symbolic .= (($perms & 0x0004) ? 'r' : '-');
        $symbolic .= (($perms & 0x0002) ? 'w' : '-');
        $symbolic .= (($perms & 0x0001) ?
                    (($perms & 0x0200) ? 't' : 'x' ) :
                    (($perms & 0x0200) ? 'T' : '-'));
                    
        return [
            'type' => $type,
            'perms' => $symbolic,
            'octal' => substr(sprintf('%o', $perms), -4),
            'readable' => $readable,
            'writable' => $writable
        ];
    }
    
    return null;
}

// Check a few important directories and files
$importantPaths = [
    $folderToCheck,
    dirname($folderToCheck) . '/dompdf',
    $folderToCheck . '/dompdf',
    $autoloaderPath,
    sys_get_temp_dir()
];

echo "<table style='border-collapse: collapse; width: 100%; margin-top: 10px;'>";
echo "<tr style='background-color: #f2f2f2;'>";
echo "<th style='border: 1px solid #ddd; padding: 8px; text-align: left;'>Path</th>";
echo "<th style='border: 1px solid #ddd; padding: 8px; text-align: left;'>Type</th>";
echo "<th style='border: 1px solid #ddd; padding: 8px; text-align: left;'>Permissions</th>";
echo "<th style='border: 1px solid #ddd; padding: 8px; text-align: left;'>Readable</th>";
echo "<th style='border: 1px solid #ddd; padding: 8px; text-align: left;'>Writable</th>";
echo "</tr>";

foreach ($importantPaths as $path) {
    $permInfo = checkPermission($path);
    if ($permInfo) {
        echo "<tr>";
        echo "<td style='border: 1px solid #ddd; padding: 8px;'>" . htmlspecialchars($path) . "</td>";
        echo "<td style='border: 1px solid #ddd; padding: 8px;'>" . $permInfo['type'] . "</td>";
        echo "<td style='border: 1px solid #ddd; padding: 8px;'>" . $permInfo['perms'] . " (" . $permInfo['octal'] . ")</td>";
        echo "<td style='border: 1px solid #ddd; padding: 8px;'>" . $permInfo['readable'] . "</td>";
        echo "<td style='border: 1px solid #ddd; padding: 8px;'>" . $permInfo['writable'] . "</td>";
        echo "</tr>";
    } else {
        echo "<tr>";
        echo "<td style='border: 1px solid #ddd; padding: 8px;'>" . htmlspecialchars($path) . "</td>";
        echo "<td colspan='4' style='border: 1px solid #ddd; padding: 8px; color: red;'>Path does not exist</td>";
        echo "</tr>";
    }
}
echo "</table>";

// Check for error logs
echo "<h2>Recent Error Logs:</h2>";
$logFile = dirname(dirname(__FILE__)) . '/logs/invoice_errors.log';
if (file_exists($logFile) && is_readable($logFile)) {
    echo "<p>Found invoice error log file at: " . htmlspecialchars($logFile) . "</p>";
    echo "<pre style='background-color: #f8f8f8; padding: 10px; border: 1px solid #ddd; max-height: 300px; overflow: auto;'>";
    // Get last 50 lines of the log file
    $logContent = file_get_contents($logFile);
    $lines = explode("\n", $logContent);
    $lines = array_slice($lines, -50);
    echo htmlspecialchars(implode("\n", $lines));
    echo "</pre>";
} else {
    echo "<p>No invoice error log file found at: " . htmlspecialchars($logFile) . "</p>";
    echo "<p>Creating a sample log file for testing...</p>";
    
    // Try to create the log file
    $testContent = date('Y-m-d H:i:s') . " - Test log entry created from test-pdf.php\n";
    $writeResult = @file_put_contents($logFile, $testContent);
    
    if ($writeResult !== false) {
        echo "<p style='color:green;'>Successfully created test log file.</p>";
    } else {
        echo "<p style='color:red;'>Failed to create test log file. Check permissions.</p>";
    }
}

// PHP error log location
$phpErrorLogPath = ini_get('error_log');
echo "<p>PHP error log path: " . htmlspecialchars($phpErrorLogPath ?: 'Not configured') . "</p>";

echo "<h2>Next Steps for Troubleshooting</h2>";
echo "<ol>";
echo "<li>Make sure DomPDF is installed properly: <code>composer require dompdf/dompdf:^2.0</code></li>";
echo "<li>Check that the vendor directory has proper permissions</li>";
echo "<li>Verify all required PHP extensions are enabled (GD, mbstring)</li>";
echo "<li>Create a logs directory with proper permissions: <code>mkdir -p " . htmlspecialchars(dirname(dirname(__FILE__))) . "/logs</code> with permission 0755</li>";
echo "<li>Try the direct PDF test link above to isolate issues</li>";
echo "</ol>";

// Show a footer with links
echo "<div style='margin-top:30px; padding-top:20px; border-top:1px solid #ddd; text-align:center;'>";
echo "<p>Other test links:</p>";
echo "<a href='/api/download-invoice.php?id=1' style='display:inline-block; margin:0 10px; padding:8px 15px; background:#4CAF50; color:white; text-decoration:none; border-radius:5px;'>Test Invoice Download</a>";
echo "<a href='/' style='display:inline-block; margin:0 10px; padding:8px 15px; background:#607D8B; color:white; text-decoration:none; border-radius:5px;'>Return to Home</a>";
echo "</div>";
