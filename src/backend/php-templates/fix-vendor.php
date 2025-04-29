<?php
// Set error reporting
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "<h1>Vendor Directory Fix Tool</h1>";

// Define paths
$documentRoot = $_SERVER['DOCUMENT_ROOT'];
$expectedVendorPath = $documentRoot . '/public_html/vendor';
$currentScriptDir = __DIR__;

echo "<h2>Path Information:</h2>";
echo "<pre>";
echo "Document Root: " . $documentRoot . "\n";
echo "Expected Vendor Path: " . $expectedVendorPath . "\n";
echo "Current Script Directory: " . $currentScriptDir . "\n";
echo "</pre>";

// Check if composer.json exists
$composerJsonPath = __DIR__ . '/composer.json';
if (!file_exists($composerJsonPath)) {
    echo "<p style='color: red;'>composer.json not found in " . htmlspecialchars($composerJsonPath) . "</p>";
    exit;
}

// Create vendor directory if it doesn't exist
if (!is_dir($expectedVendorPath)) {
    if (@mkdir($expectedVendorPath, 0755, true)) {
        echo "<p style='color: green;'>Created vendor directory at: " . htmlspecialchars($expectedVendorPath) . "</p>";
    } else {
        echo "<p style='color: red;'>Failed to create vendor directory at: " . htmlspecialchars($expectedVendorPath) . "</p>";
        echo "<p>Please create it manually with:</p>";
        echo "<pre>mkdir -p " . htmlspecialchars($expectedVendorPath) . "</pre>";
    }
}

// Check if composer is installed
exec('composer --version', $output, $returnVar);
if ($returnVar !== 0) {
    echo "<p style='color: red;'>Composer is not installed or not accessible.</p>";
    echo "<p>Please install Composer first: <a href='https://getcomposer.org/download/'>https://getcomposer.org/download/</a></p>";
    exit;
}

// Run composer install
echo "<h2>Running Composer Install:</h2>";
echo "<pre>";
$currentDir = getcwd();
chdir(__DIR__);
system('composer install 2>&1');
chdir($currentDir);
echo "</pre>";

// Verify DomPDF installation
$dompdfPath = $expectedVendorPath . '/dompdf/dompdf';
if (is_dir($dompdfPath)) {
    echo "<p style='color: green;'>DomPDF appears to be installed correctly at: " . htmlspecialchars($dompdfPath) . "</p>";
} else {
    echo "<p style='color: red;'>DomPDF not found at expected location: " . htmlspecialchars($dompdfPath) . "</p>";
    echo "<p>Try running:</p>";
    echo "<pre>cd " . htmlspecialchars(__DIR__) . "\ncomposer require dompdf/dompdf:^2.0</pre>";
}

// Check autoloader
$autoloaderPath = $expectedVendorPath . '/autoload.php';
if (file_exists($autoloaderPath)) {
    echo "<p style='color: green;'>Composer autoloader found at: " . htmlspecialchars($autoloaderPath) . "</p>";
    
    // Test autoloader
    try {
        require_once $autoloaderPath;
        if (class_exists('Dompdf\Dompdf')) {
            echo "<p style='color: green;'>DomPDF class loaded successfully!</p>";
        } else {
            echo "<p style='color: red;'>DomPDF class not found after loading autoloader.</p>";
        }
    } catch (Exception $e) {
        echo "<p style='color: red;'>Error loading autoloader: " . htmlspecialchars($e->getMessage()) . "</p>";
    }
} else {
    echo "<p style='color: red;'>Autoloader not found at: " . htmlspecialchars($autoloaderPath) . "</p>";
}

// Check permissions
echo "<h2>Directory Permissions:</h2>";
echo "<pre>";
system('ls -la ' . escapeshellarg($expectedVendorPath) . ' 2>&1');
echo "</pre>";

// Next steps
echo "<h2>Next Steps:</h2>";
echo "<ol>";
echo "<li>Ensure the vendor directory has correct permissions (755 for directories, 644 for files)</li>";
echo "<li>Try the <a href='/api/test-pdf.php'>PDF test page</a> to verify PDF generation</li>";
echo "<li>Clear your browser cache and try generating an invoice again</li>";
echo "</ol>"; 