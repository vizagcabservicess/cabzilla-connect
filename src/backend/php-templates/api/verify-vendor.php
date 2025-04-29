<?php
// Enable error reporting
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Vendor Directory Verification</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .success { color: green; }
        .error { color: red; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>Vendor Directory Verification</h1>
    
    <?php
    // Get current include path
    echo "<h2>Include Path:</h2>";
    echo "<pre>" . get_include_path() . "</pre>";
    
    // Check vendor directory
    $vendorPaths = [
        __DIR__ . '/../../../../public_html/vendor',
        $_SERVER['DOCUMENT_ROOT'] . '/public_html/vendor',
        __DIR__ . '/../vendor'
    ];
    
    echo "<h2>Checking Vendor Directories:</h2>";
    echo "<ul>";
    foreach ($vendorPaths as $path) {
        $realPath = realpath($path);
        echo "<li>";
        echo "Path: " . htmlspecialchars($path) . "<br>";
        echo "Real Path: " . ($realPath ? htmlspecialchars($realPath) : "Not resolved") . "<br>";
        echo "Exists: " . (is_dir($path) ? "<span class='success'>Yes</span>" : "<span class='error'>No</span>") . "<br>";
        if (is_dir($path)) {
            echo "Contents:<br><pre>";
            system('dir ' . escapeshellarg($path));
            echo "</pre>";
        }
        echo "</li>";
    }
    echo "</ul>";
    
    // Try to load DomPDF
    echo "<h2>Testing DomPDF:</h2>";
    try {
        foreach ($vendorPaths as $path) {
            $autoloaderPath = $path . '/autoload.php';
            if (file_exists($autoloaderPath)) {
                require_once $autoloaderPath;
                echo "<p class='success'>Successfully loaded autoloader from: " . htmlspecialchars($autoloaderPath) . "</p>";
                break;
            }
        }
        
        if (class_exists('Dompdf\Dompdf')) {
            echo "<p class='success'>DomPDF class found!</p>";
            
            // Try to create an instance
            $dompdf = new \Dompdf\Dompdf();
            echo "<p class='success'>Successfully created DomPDF instance</p>";
            
            // Get DomPDF version
            if (defined('Dompdf\Dompdf::VERSION')) {
                echo "<p>DomPDF Version: " . \Dompdf\Dompdf::VERSION . "</p>";
            }
        } else {
            echo "<p class='error'>DomPDF class not found</p>";
        }
    } catch (Exception $e) {
        echo "<p class='error'>Error: " . htmlspecialchars($e->getMessage()) . "</p>";
        echo "<pre>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
    }
    
    // PHP Info for debugging
    echo "<h2>PHP Information:</h2>";
    echo "<pre>";
    echo "PHP Version: " . phpversion() . "\n";
    echo "Loaded Extensions: " . implode(', ', get_loaded_extensions()) . "\n";
    echo "Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
    echo "Script Path: " . __FILE__ . "\n";
    echo "</pre>";
    ?>
</body>
</html> 