<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Directory Permissions Check</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .success { color: green; }
        .error { color: red; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>Directory Permissions Check</h1>
    
    <?php
    function checkPermissions($path) {
        echo "<h3>Checking: " . htmlspecialchars($path) . "</h3>";
        
        if (!file_exists($path)) {
            echo "<p class='error'>Path does not exist!</p>";
            return;
        }
        
        $realPath = realpath($path);
        echo "<p>Real path: " . htmlspecialchars($realPath) . "</p>";
        
        $perms = fileperms($path);
        $owner = fileowner($path);
        $group = filegroup($path);
        
        echo "<pre>";
        echo "Permissions: " . substr(sprintf('%o', $perms), -4) . "\n";
        echo "Owner: " . (function_exists('posix_getpwuid') ? posix_getpwuid($owner)['name'] : $owner) . "\n";
        echo "Group: " . (function_exists('posix_getgrgid') ? posix_getgrgid($group)['name'] : $group) . "\n";
        echo "Is readable: " . (is_readable($path) ? "Yes" : "No") . "\n";
        echo "Is writable: " . (is_writable($path) ? "Yes" : "No") . "\n";
        echo "</pre>";
        
        if (is_dir($path)) {
            echo "<p>Directory contents:</p>";
            echo "<pre>";
            $files = scandir($path);
            foreach ($files as $file) {
                if ($file != "." && $file != "..") {
                    $fullPath = $path . DIRECTORY_SEPARATOR . $file;
                    $filePerms = substr(sprintf('%o', fileperms($fullPath)), -4);
                    echo sprintf("%-40s %s\n", $file, $filePerms);
                }
            }
            echo "</pre>";
        }
    }
    
    // Check critical directories
    $directories = [
        __DIR__ . '/../../../../public_html/vendor',
        __DIR__ . '/../logs',
        __DIR__ . '/../../logs',
        sys_get_temp_dir()
    ];
    
    foreach ($directories as $dir) {
        checkPermissions($dir);
    }
    
    // Test file creation
    echo "<h2>Testing File Operations</h2>";
    
    $testFile = __DIR__ . '/../logs/test.txt';
    echo "<h3>Testing file creation at: " . htmlspecialchars($testFile) . "</h3>";
    
    try {
        $content = "Test content: " . date('Y-m-d H:i:s');
        if (file_put_contents($testFile, $content)) {
            echo "<p class='success'>Successfully created test file</p>";
            echo "<p>Content written: " . htmlspecialchars($content) . "</p>";
            
            $readContent = file_get_contents($testFile);
            echo "<p>Content read back: " . htmlspecialchars($readContent) . "</p>";
            
            if (unlink($testFile)) {
                echo "<p class='success'>Successfully deleted test file</p>";
            } else {
                echo "<p class='error'>Failed to delete test file</p>";
            }
        } else {
            echo "<p class='error'>Failed to create test file</p>";
        }
    } catch (Exception $e) {
        echo "<p class='error'>Error: " . htmlspecialchars($e->getMessage()) . "</p>";
    }
    
    // PHP Info
    echo "<h2>PHP Information</h2>";
    echo "<pre>";
    echo "PHP Version: " . phpversion() . "\n";
    echo "Server Software: " . $_SERVER['SERVER_SOFTWARE'] . "\n";
    echo "Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
    echo "Current Script: " . __FILE__ . "\n";
    echo "Temp Directory: " . sys_get_temp_dir() . "\n";
    echo "Include Path: " . get_include_path() . "\n";
    echo "</pre>";
    ?>
</body>
</html> 