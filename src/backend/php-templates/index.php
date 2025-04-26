
<?php
/**
 * Main index.php file for the Vizag Cabs application
 * This file serves as the entry point for the React application
 */

// Set proper headers
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('X-Frame-Options: DENY');

// Enable detailed error reporting during development
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Get request URI for debugging
$request_uri = $_SERVER['REQUEST_URI'] ?? '/';
$is_admin_route = preg_match('/^\/admin(\/|$)/', $request_uri);
$base_path = '/';

// Log access
error_log("SPA entry point accessed: " . $request_uri . ", Admin route: " . ($is_admin_route ? 'yes' : 'no'));

// Setup initial route data for client-side JS
$route_data = json_encode([
    'path' => $request_uri,
    'isAdmin' => $is_admin_route,
    'baseUrl' => $base_path,
    'timestamp' => time(),
    'debug' => true
]);

// Determine proper asset paths
$asset_prefix = '';

// Check if we have built assets
$using_vite_dev = true;
if (file_exists('./assets/index.js')) {
    $using_vite_dev = false;
}
?><!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><?php echo $is_admin_route ? 'Admin Dashboard - Vizag Cabs' : 'Vizag Cabs - Book Cabs in Visakhapatnam'; ?></title>
    <meta name="description" content="Book cabs in Visakhapatnam for local, outstation and airport transfers" />
    <meta property="og:image" content="/og-image.png" />
    <!-- Critical for routing - base href MUST be / -->
    <base href="<?php echo $base_path; ?>">
    
    <?php if (!$using_vite_dev): ?>
    <link rel="stylesheet" href="<?php echo $asset_prefix; ?>assets/index.css">
    <?php endif; ?>
  </head>

  <body>
    <div id="root"></div>
    
    <!-- Route data initialization script - Critical for routing -->
    <script>
      window.__initialRoute = <?php echo $route_data; ?>;
      
      console.log("Application initializing from PHP...");
      console.log("Current path:", window.location.pathname);
      console.log("Base URL:", document.baseURI);
      console.log("Route data:", window.__initialRoute);
      
      <?php if($is_admin_route): ?>
      console.log("ADMIN ROUTE DETECTED - initializing admin view");
      <?php endif; ?>
    </script>
    
    <!-- IMPORTANT: DO NOT REMOVE THIS SCRIPT TAG -->
    <script src="https://cdn.gpteng.co/gptengineer.js" type="module"></script>
    
    <?php if (!$using_vite_dev): ?>
    <!-- Production bundle -->
    <script type="module" src="<?php echo $asset_prefix; ?>assets/index.js"></script>
    <?php else: ?>
    <!-- Development bundle -->
    <script type="module" src="/src/main.tsx"></script>
    <?php endif; ?>
  </body>
</html>
