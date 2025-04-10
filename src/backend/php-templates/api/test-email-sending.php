
<?php
// Redirect to the updated and fixed test-email.php endpoint 
// This file is kept for backward compatibility
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Log the redirect for debugging
error_log("Redirecting from test-email-sending.php to test-email.php with query: " . $_SERVER['QUERY_STRING']);

// Create a valid query string to pass along
$query = '';
if (!empty($_SERVER['QUERY_STRING'])) {
    $query = '?' . $_SERVER['QUERY_STRING'];
}

// Run the test-email.php script directly
require_once(__DIR__ . '/test-email.php');
// The included script will handle the response
