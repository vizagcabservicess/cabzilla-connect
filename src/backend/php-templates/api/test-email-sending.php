<?php
// Properly redirect to the updated and fixed test-email.php endpoint 
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

// Don't use require_once which keeps executing this file
// Instead redirect the browser to the new endpoint
header('Location: test-email.php' . $query);
exit;
