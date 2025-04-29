<?php
// Simple test script to verify PDF generation works

// Set error handling
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Register error handler
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    error_log("PDF Error: [$errno] $errstr in $errfile on line $errline");
    if (isset($_GET['debug'])) {
        echo "Error: [$errno] $errstr in $errfile on line $errline\n";
    }
});

// Register shutdown function to catch fatal errors
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== NULL && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        error_log("Fatal Error: " . print_r($error, true));
        if (isset($_GET['debug'])) {
            echo "Fatal Error: " . print_r($error, true);
        }
    }
});

// Clear any output buffer
while (ob_get_level()) ob_end_clean();

// Enable debug mode
$debug = true;

// Only send HTML header if not in download mode
if (!isset($_GET['download'])) {
    header('Content-Type: text/html; charset=utf-8');
    echo "<h1>PDF Generation Test</h1>";
    echo "<p>Server time: " . date('Y-m-d H:i:s') . "</p>";
    echo "<p>PHP Version: " . phpversion() . "</p>";
    echo "<p>Server IP: " . $_SERVER['SERVER_ADDR'] . "</p>";
    echo "<p>Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "</p>";
    echo "<p>Script Path: " . __FILE__ . "</p>";
}

// Create logs directory if it doesn't exist
$logsDir = dirname(dirname(__FILE__)) . '/logs';
if (!is_dir($logsDir)) {
    if (!isset($_GET['download'])) {
        echo "<p>Creating logs directory at: " . htmlspecialchars($logsDir) . "</p>";
    }
    $success = @mkdir($logsDir, 0755, true);
    if (!isset($_GET['download'])) {
        echo "<p>Directory creation " . ($success ? "successful" : "failed") . "</p>";
    }
} else {
    if (!isset($_GET['download'])) {
        echo "<p>Logs directory already exists at: " . htmlspecialchars($logsDir) . "</p>";
    }
}

// Test if we can write to logs
$testLogFile = $logsDir . '/test_log.txt';
$logWriteTest = @file_put_contents($testLogFile, date('Y-m-d H:i:s') . " - Test log entry\n", FILE_APPEND);
if (!isset($_GET['download'])) {
    echo "<p>Log write test: " . ($logWriteTest !== false ? "successful" : "failed") . "</p>";

    // Store the server's document root and script paths
    $docRoot = $_SERVER['DOCUMENT_ROOT'];
    echo "<p>Document Root: " . htmlspecialchars($docRoot) . "</p>";
    echo "<p>Current script path: " . htmlspecialchars(__FILE__) . "</p>";
    echo "<p>Directory of current script: " . htmlspecialchars(dirname(__FILE__)) . "</p>";
    echo "<p>Parent directory: " . htmlspecialchars(dirname(dirname(__FILE__))) . "</p>";
}

// CRITICAL: Improved autoloader detection with absolute paths
$autoloaderPaths = [
    // Primary location - public_html/vendor
    __DIR__ . '/../../../../public_html/vendor/autoload.php',
    
    // Backup locations
    $_SERVER['DOCUMENT_ROOT'] . '/vendor/autoload.php',
    dirname($_SERVER['DOCUMENT_ROOT']) . '/vendor/autoload.php',
    __DIR__ . '/../../vendor/autoload.php',
    __DIR__ . '/../vendor/autoload.php',
    dirname(dirname(__DIR__)) . '/vendor/autoload.php'
];

$vendorExists = false;
$autoloaderPath = null;
$autoloaderSearchResults = [];

foreach ($autoloaderPaths as $path) {
    $realPath = realpath($path);
    $autoloaderSearchResults[$path] = [
        'exists' => file_exists($path),
        'readable' => is_readable($path),
        'realpath' => $realPath
    ];
    
    if (file_exists($path) && is_readable($path)) {
        $autoloaderPath = $path;
        $vendorExists = true;
        error_log("Found autoloader at: " . $path . " (realpath: " . $realPath . ")");
        break;
    }
}

// Log search results
error_log("Autoloader search results: " . json_encode($autoloaderSearchResults));

if (!isset($_GET['download'])) {
    echo "<h2>Autoloader Check</h2>";
    echo "<ul>";
    foreach ($autoloaderSearchResults as $path => $result) {
        echo "<li>" . htmlspecialchars($path) . " - " . 
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
            // Include the confirmed path first
            $_SERVER['DOCUMENT_ROOT'] . '/public_html/vendor',
            
            // Try common variations
            $_SERVER['DOCUMENT_ROOT'] . '/vendor',
            dirname($_SERVER['DOCUMENT_ROOT']) . '/vendor',
            __DIR__ . '/../vendor',
            dirname(__DIR__) . '/vendor',
            dirname(dirname(__DIR__)) . '/vendor',
            dirname(dirname(dirname(__DIR__))) . '/vendor'
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
        
        // Show composer commands to fix the issue
        echo "<p>Please run these commands in your project root:</p>";
        echo "<pre style='background-color: #f8f8f8; padding: 10px; border: 1px solid #ddd;'>
cd " . htmlspecialchars($_SERVER['DOCUMENT_ROOT']) . "
composer require dompdf/dompdf:^2.0
composer install
</pre>";
    }

    echo "<p>Found composer autoloader at: " . ($autoloaderPath ? htmlspecialchars($autoloaderPath) : "Not found") . "</p>";
}

// Try to include the autoloader
try {
    if ($vendorExists) {
        require_once $autoloaderPath;
        if (!isset($_GET['download'])) {
            echo "<p style='color:green;'>Successfully included composer autoloader.</p>";
        }
    } else {
        throw new Exception("Autoloader not found. Vendor directory may not exist or may be in the wrong location.");
    }
} catch (Exception $e) {
    if (!isset($_GET['download'])) {
        echo "<p style='color:red;'>ERROR loading autoloader: " . htmlspecialchars($e->getMessage()) . "</p>";
    }
    if (isset($_GET['download'])) {
        // For download requests, return a simple plain text error
        header('Content-Type: text/plain');
        echo "ERROR: Could not load DomPDF library. Please install it using composer.\n";
        echo "Run: composer require dompdf/dompdf:^2.0\n";
        echo "Error: " . $e->getMessage();
        exit;
    }
}

// Check if DomPDF class exists
if ($vendorExists && !class_exists('Dompdf\Dompdf')) {
    if (!isset($_GET['download'])) {
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
    }
    
    if (isset($_GET['download'])) {
        // For download requests, return a simple plain text error
        header('Content-Type: text/plain');
        echo "ERROR: DomPDF class not found. Please install it correctly using composer.\n";
        exit;
    }
}

// Try to create a simple PDF
try {
    if ($vendorExists && class_exists('Dompdf\Dompdf')) {
        // Import DomPDF classes
        use Dompdf\Dompdf;
        use Dompdf\Options;
        
        if (!isset($_GET['download'])) {
            echo "<p>Creating DomPDF instance...</p>";
        }
        
        // Configure DomPDF options
        $options = new Options();
        $options->set('isRemoteEnabled', true);
        $options->set('isHtml5ParserEnabled', true);
        $options->set('defaultFont', 'DejaVu Sans');
        
        // Create DomPDF instance
        $dompdf = new Dompdf($options);
        $dompdf->setPaper('A4', 'portrait');
        
        if (!isset($_GET['download'])) {
            echo "<p style='color:green;'>DomPDF instance created successfully.</p>";
        }
        
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
                        <td>' . ($autoloaderPath ?? 'Unknown') . '</td>
                    </tr>
                </table>
            </div>
        </body>
        </html>';
        
        // Load HTML
        $dompdf->loadHtml($html);
        if (!isset($_GET['download'])) {
            echo "<p>HTML loaded into DomPDF.</p>";
        }
        
        // Render PDF
        $dompdf->render();
        if (!isset($_GET['download'])) {
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
            
            // Show HTML version link
            echo "<div style='text-align:center; margin:30px;'>";
            echo "<a href='?show_html=1' style='display:inline-block; padding:15px 30px; background:#607D8B; color:white; text-decoration:none; border-radius:5px; font-size:18px;'>View HTML Version</a>";
            echo "</div>";
        }
        
        // If show_html parameter is set, output the HTML content
        if (isset($_GET['show_html'])) {
            header('Content-Type: text/html; charset=utf-8');
            echo $html;
            exit;
        }
        
        // If download parameter is set, output the PDF
        if (isset($_GET['download'])) {
            // Clear all output buffers
            while (ob_get_level()) ob_end_clean();
            
            // Set appropriate headers for PDF download
            header('Content-Type: application/pdf');
            header('Content-Disposition: inline; filename="test.pdf"');
            header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
            header('Pragma: no-cache');
            header('Expires: 0');
            
            // Output the PDF
            echo $dompdf->output();
            exit;
        }
        
    }
} catch (Exception $e) {
    if (!isset($_GET['download'])) {
        echo "<p style='color:red;'>ERROR creating PDF: " . htmlspecialchars($e->getMessage()) . "</p>";
        echo "<p>Trace: <pre style='background-color:#fff8f8; padding:10px; overflow:auto; max-height:400px; border:1px solid #f5c6cb;'>" . htmlspecialchars($e->getTraceAsString()) . "</pre></p>";
    } else {
        // For download requests, return a simple plain text error
        header('Content-Type: text/plain');
        echo "ERROR generating PDF: " . $e->getMessage() . "\n\n";
        echo "Trace:\n" . $e->getTraceAsString();
        exit;
    }
}

if (!isset($_GET['download'])) {
    // Only show the remaining HTML if not in download mode
    
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
    echo "<a href='/api/download-invoice.php?id=1&format=html' style='display:inline-block; margin:0 10px; padding:8px 15px; background:#2196F3; color:white; text-decoration:none; border-radius:5px;'>HTML Invoice</a>";
    echo "<a href='/api/download-invoice.php?id=1' style='display:inline-block; margin:0 10px; padding:8px 15px; background:#4CAF50; color:white; text-decoration:none; border-radius:5px;'>PDF Invoice</a>";
    echo "<a href='/' style='display:inline-block; margin:0 10px; padding:8px 15px; background:#607D8B; color:white; text-decoration:none; border-radius:5px;'>Return to Home</a>";
    echo "</div>";
}

// Restore error handler
restore_error_handler();
