<?php
// Proper admin authentication with JWT verification
function validateAdminAuth() {
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : 
                  (isset($headers['authorization']) ? $headers['authorization'] : null);
    
    if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
        return false;
    }
    
    $token = str_replace('Bearer ', '', $authHeader);
    $payload = verifyJwtToken($token);
    
    if (!$payload || !isset($payload['role'])) {
        return false;
    }
    
    // Only allow admin and super_admin roles
    return in_array($payload['role'], ['admin', 'super_admin']);
}

// Add base64url_decode helper function
if (!function_exists('base64url_decode')) {
    function base64url_decode($data) {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $padlen = 4 - $remainder;
            $data .= str_repeat('=', $padlen);
        }
        return base64_decode(strtr($data, '-_', '+/'));
    }
}

// Secure JWT verification function with proper signature validation
if (!function_exists('verifyJwtToken')) {
    function verifyJwtToken($token) {
        try {
            // Check if JWT_SECRET is defined
            if (!defined('JWT_SECRET') || !JWT_SECRET) {
                error_log("JWT_SECRET not defined or empty");
                return false;
            }
            
            $secret = JWT_SECRET;
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                error_log("Invalid JWT format: wrong number of parts");
                return false;
            }
            
            list($headerB64, $payloadB64, $signatureB64) = $parts;
            
            // Verify header
            $header = json_decode(base64url_decode($headerB64), true);
            if (!$header || !isset($header['alg']) || $header['alg'] !== 'HS256') {
                error_log("Invalid JWT header or algorithm");
                return false;
            }
            
            // Verify payload
            $payload = json_decode(base64url_decode($payloadB64), true);
            if (!$payload) {
                error_log("Invalid JWT payload");
                return false;
            }
            
            // Check expiration
            if (isset($payload['exp']) && time() > $payload['exp']) {
                error_log("JWT token expired");
                return false;
            }
            
            // Verify signature
            $signature = base64url_decode($signatureB64);
            $expected = hash_hmac('sha256', "$headerB64.$payloadB64", $secret, true);
            if (!hash_equals($expected, $signature)) {
                error_log("JWT signature verification failed");
                return false;
            }
            
            error_log("JWT verification successful for user: " . ($payload['user_id'] ?? 'unknown'));
            return $payload;
            
        } catch (Exception $e) {
            error_log("JWT verification error: " . $e->getMessage());
            return false;
        }
    }
}
?> 