
<?php
/**
 * Main index.php file for the Vizag Cabs application
 * This file serves as the entry point for the React application
 * All frontend routes are directed here (/, /admin, /booking, etc.)
 */

// Set appropriate headers to prevent caching
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('X-Frame-Options: DENY');

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Get request URI for debugging
$request_uri = $_SERVER['REQUEST_URI'] ?? '';
$is_admin_route = preg_match('/^\/admin(\/|$)/', $request_uri);

// Log access for debugging
error_log("Access to main SPA index.php, URI: " . $request_uri . ", Admin route: " . ($is_admin_route ? 'yes' : 'no'));

// HTML content for the SPA
?><!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vizag Cabs - Book Cabs in Visakhapatnam</title>
    <meta name="description" content="Book cabs in Visakhapatnam for local, outstation and airport transfers" />
    <meta name="author" content="Vizag Cabs" />
    <meta property="og:image" content="/og-image.png" />
    <link rel="icon" href="/favicon.ico" type="image/x-icon">
    
    <!-- Base path - critical for routing -->
    <base href="/">
    
    <!-- CSS styles -->
    <link rel="stylesheet" href="/assets/index.css">
  </head>

  <body>
    <div id="root"></div>
    <!-- React app entry point -->
    <script type="module" src="/assets/index.js"></script>
    
    <!-- Error logging -->
    <script>
      window.onerror = function(message, source, lineno, colno, error) {
        console.error("JS Error:", message, "Source:", source, "Line:", lineno);
        return false;
      };
      
      console.log("Application loading. Route:", window.location.pathname);
    </script>
  </body>
</html>
<?php
// End of file
?>
