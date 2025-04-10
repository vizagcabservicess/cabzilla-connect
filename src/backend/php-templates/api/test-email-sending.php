
<?php
// Redirect to the updated and fixed test-email.php endpoint 
// This file is kept for backward compatibility
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Log the redirect for debugging
error_log("Redirecting from test-email-sending.php to test-email.php with query: " . $_SERVER['QUERY_STRING']);

// Just run the test-email.php script directly rather than redirecting
require_once(__DIR__ . '/test-email.php');
// The script above will handle the response
