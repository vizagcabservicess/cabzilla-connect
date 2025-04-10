
<?php
// This is just a redirect to maintain backward compatibility with existing code
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

// Create the full query string to pass along
$query = '';
if (!empty($_SERVER['QUERY_STRING'])) {
    $query = '?' . $_SERVER['QUERY_STRING'];
}

// Redirect to the test-email.php endpoint with proper params
header('Location: /api/test-email.php' . $query);
exit;
