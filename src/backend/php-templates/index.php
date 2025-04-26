
<?php
/**
 * Main index.php file for the Vizag Cabs application
 * This file serves as the entry point for the React application
 * All frontend routes are directed here (/, /admin, /booking, etc.)
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
$current_url = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";
$is_admin_route = preg_match('/^\/admin(\/|$)/', $request_uri);

// Log access for debugging
error_log("Access to main SPA index.php, URI: " . $request_uri);

// Define base path as / which works with React Router
$base_path = '/';

// Debug route information
error_log("Request URI: $request_uri");
error_log("Is admin route: " . ($is_admin_route ? 'true' : 'false'));

// Setup initial route data for client-side JS
$route_data = json_encode([
    'path' => $request_uri,
    'isAdmin' => $is_admin_route,
    'baseUrl' => $base_path,
    'timestamp' => time(),
    'debug' => true
]);

// Determine proper asset paths based on environment
$asset_prefix = file_exists('./assets') ? './assets' : '';

?><!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><?php echo $is_admin_route ? 'Admin Dashboard - Vizag Cabs' : 'Vizag Cabs - Book Cabs in Visakhapatnam'; ?></title>
    <meta name="description" content="Book cabs in Visakhapatnam for local, outstation and airport transfers" />
    <!-- Critical for routing: base href must be / -->
    <base href="<?php echo $base_path; ?>">
    
    <?php if (file_exists('./assets/index.css')): ?>
    <link rel="stylesheet" href="<?php echo $asset_prefix; ?>/index.css">
    <?php else: ?>
    <!-- Fallback styles if needed -->
    <style>
      body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    </style>
    <?php endif; ?>
  </head>

  <body>
    <div id="root"></div>
    
    <!-- Critical debugging info passed to React -->
    <script>
      window.__initialRoute = <?php echo $route_data; ?>;
      
      // Debug logging 
      console.log("Application initializing...");
      console.log("Current path:", window.location.pathname);
      console.log("Base URL:", document.baseURI);
      console.log("Route data:", window.__initialRoute);
      
      // Additional debugging for admin routes
      <?php if($is_admin_route): ?>
      console.log("ADMIN ROUTE DETECTED - initializing admin view");
      <?php endif; ?>
    </script>
    
    <!-- Lovable script tag must be before the main app bundle -->
    <script src="https://cdn.gpteng.co/gptengineer.js" type="module"></script>
    
    <?php if (file_exists('./assets/index.js')): ?>
    <!-- Production bundle -->
    <script type="module" src="<?php echo $asset_prefix; ?>/index.js"></script>
    <?php else: ?>
    <!-- Development bundle -->
    <script type="module" src="/src/main.tsx"></script>
    <?php endif; ?>
  </body>
</html>
