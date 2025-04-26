
<?php
/**
 * Main index.php file for the Vizag Cabs application
 * This file serves as the entry point for the React application
 * All admin and client routes are directed here
 */

// Set appropriate headers
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('X-Frame-Options: DENY');

// Get request URI for debugging
$request_uri = $_SERVER['REQUEST_URI'] ?? '';
$is_admin_route = preg_match('/^\/admin(\/|$)/', $request_uri);

// Log access for debugging
error_log("Access to main index.php, URI: " . $request_uri . ", Admin route: " . ($is_admin_route ? 'yes' : 'no'));

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
  </head>

  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
<?php
// End of file
?>
