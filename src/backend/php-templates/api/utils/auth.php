<?php
// Placeholder for admin authentication. Allows all requests (development only).
function validateAdminAuth() {
    return true;
}

// Real JWT verification function matching generateJwtToken in config.php
if (!function_exists('verifyJwtToken')) {
    function verifyJwtToken($token) {
        $secret = 'cabzilla_secret_key_2024'; // Use the same key as in generateJwtToken
        $parts = explode('.', $token);
        if (count($parts) !== 3) return false;
        list($headerB64, $payloadB64, $signatureB64) = $parts;
        $header = json_decode(base64_decode($headerB64), true);
        $payload = json_decode(base64_decode($payloadB64), true);
        $signature = base64_decode($signatureB64);
        $expected = hash_hmac('sha256', "$headerB64.$payloadB64", $secret, true);
        if (!hash_equals($expected, $signature)) return false;
        if (isset($payload['exp']) && time() > $payload['exp']) return false;
        return $payload;
    }
} 