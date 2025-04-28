
<?php
// Simple test script to verify PDF generation works

// Clear any output buffer
while (ob_get_level()) ob_end_clean();

// Set headers for better error reporting
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Check for autoloader in multiple possible locations
$autoloaderPaths = [
    __DIR__ . '/../vendor/autoload.php',
    __DIR__ . '/../../vendor/autoload.php',
    dirname(dirname(dirname(__FILE__))) . '/vendor/autoload.php'
];

$autoloaderPath = null;
$vendorExists = false;

foreach ($autoloaderPaths as $path) {
    if (file_exists($path)) {
        $autoloaderPath = $path;
        $vendorExists = true;
        break;
    }
}

echo "<h1>PDF Generation Test</h1>";

if (!$vendorExists) {
    echo "<p style='color:red;'>ERROR: Composer autoloader not found. Checked paths:</p><ul>";
    foreach ($autoloaderPaths as $path) {
        echo "<li>" . htmlspecialchars($path) . " - " . (file_exists($path) ? "Exists" : "Not found") . "</li>";
    }
    echo "</ul>";
    echo "<p>Please ensure the vendor directory with all dependencies is uploaded correctly.</p>";
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
    
    // Display installed packages
    echo "<h2>Installed Packages:</h2>";
    $composerJson = file_get_contents(dirname($autoloaderPath) . '/composer/installed.json');
    if ($composerJson) {
        $packages = json_decode($composerJson, true);
        echo "<pre>" . htmlspecialchars(print_r($packages, true)) . "</pre>";
    } else {
        echo "<p>Could not read installed packages.</p>";
    }
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
        </style>
    </head>
    <body>
        <div class="container">
            <h1>PDF Generation Test</h1>
            <p class="success">If you can see this PDF, DomPDF is working correctly!</p>
            <p>Generated on: ' . date('Y-m-d H:i:s') . '</p>
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
    echo "<p><a href='?download=1' style='display:inline-block; padding:10px; background:#4CAF50; color:white; text-decoration:none; border-radius:5px;'>Download Test PDF</a></p>";
    
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
    echo "<p>Trace: <pre>" . htmlspecialchars($e->getTraceAsString()) . "</pre></p>";
}

// Display PHP info for debugging
echo "<h2>PHP Information:</h2>";
echo "<p>PHP Version: " . phpversion() . "</p>";
echo "<p>Extensions loaded: " . implode(', ', get_loaded_extensions()) . "</p>";

// GD is required for DomPDF
echo "<p>GD Info: " . (function_exists('gd_info') ? "Installed" : "Not installed") . "</p>";
if (function_exists('gd_info')) {
    echo "<pre>" . htmlspecialchars(print_r(gd_info(), true)) . "</pre>";
}
