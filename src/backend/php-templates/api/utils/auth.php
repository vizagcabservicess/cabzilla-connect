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
        $secret = JWT_SECRET; // Use environment-based secret
        $parts = explode('.', $token);
        if (count($parts) !== 3) return false;
        
        list($headerB64, $payloadB64, $signatureB64) = $parts;
        
        // Verify header
        $header = json_decode(base64url_decode($headerB64), true);
        if (!$header || !isset($header['alg']) || $header['alg'] !== 'HS256') {
            return false;
        }
        
        // Verify payload
        $payload = json_decode(base64url_decode($payloadB64), true);
        if (!$payload) return false;
        
        // Check expiration
        if (isset($payload['exp']) && time() > $payload['exp']) {
            return false;
        }
        
        // Verify signature
        $signature = base64url_decode($signatureB64);
        $expected = hash_hmac('sha256', "$headerB64.$payloadB64", $secret, true);
        if (!hash_equals($expected, $signature)) {
            return false;
        }
        
        return $payload;
    }
} 