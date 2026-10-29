<?php
// Define helper functions locally to avoid dependency issues on config files.
function sendResponse($data) {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
        exit(0);
    }
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function sendError($message, $code = 500) {
    http_response_code($code);
    header('Access-Control-Allow-Origin: *');
    header('Content-Type: application/json');
    echo json_encode(['message' => $message]);
    exit;
}

function cabzilla_server_env($name) {
    $fromEnv = getenv($name);
    if (is_string($fromEnv) && trim($fromEnv) !== '') {
        return trim($fromEnv);
    }
    if (isset($_ENV[$name]) && trim((string) $_ENV[$name]) !== '') {
        return trim((string) $_ENV[$name]);
    }
    static $fileVars = null;
    if ($fileVars === null) {
        $fileVars = [];
        foreach ([__DIR__ . '/../.env', __DIR__ . '/.env', dirname(__DIR__, 2) . '/.env'] as $path) {
            if (!is_file($path)) {
                continue;
            }
            $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if (!is_array($lines)) {
                continue;
            }
            foreach ($lines as $line) {
                if ($line === '' || $line[0] === '#') {
                    continue;
                }
                $parts = explode('=', $line, 2);
                if (count($parts) !== 2) {
                    continue;
                }
                $k = trim($parts[0]);
                $v = trim($parts[1]);
                $q = strlen($v) >= 2 ? $v[0] : '';
                if (($q === '"' || $q === "'") && substr($v, -1) === $q) {
                    $v = substr($v, 1, -1);
                }
                $fileVars[$k] = $v;
            }
            break;
        }
    }
    return isset($fileVars[$name]) ? trim((string) $fileVars[$name]) : '';
}

function cabzilla_rate_limit($bucket, $max, $windowSec) {
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '0');
    $dir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'cabzilla-rl';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    $file = $dir . DIRECTORY_SEPARATOR . hash('sha256', $bucket . '|' . $ip) . '.json';
    $now = time();
    $hits = [];
    if (is_file($file)) {
        $raw = json_decode((string) @file_get_contents($file), true);
        if (is_array($raw)) {
            $hits = $raw;
        }
    }
    $fresh = [];
    foreach ($hits as $t) {
        if (is_int($t) && $t > $now - $windowSec) {
            $fresh[] = $t;
        }
    }
    if (count($fresh) >= $max) {
        return false;
    }
    $fresh[] = $now;
    @file_put_contents($file, json_encode($fresh), LOCK_EX);
    return true;
}

$openaiKey = cabzilla_server_env('OPENAI_API_KEY');

// Get the request body
$input = json_decode(file_get_contents('php://input'), true);
$user_message = $input['message'] ?? '';
$history = $input['history'] ?? [];

if (empty($user_message)) {
    sendError('Message is required.', 400);
}
if (strlen($user_message) > 500) {
    sendError('Message is too long.', 400);
}
if (!cabzilla_rate_limit('chatbot', 20, 600)) {
    sendError('Too many messages. Try again in a few minutes.', 429);
}

if ($openaiKey === '' || $openaiKey === 'YOUR_OPENAI_API_KEY_HERE') {
    sendResponse(['reply' => 'The chatbot is not configured yet. An API key for the AI service is missing.']);
}

try {
    // The database part is removed for now to ensure the chatbot works.
    // The context is simplified/hardcoded.
    $vehicle_list = 'Sedans, SUVs, Ertiga, Innova Crysta';

    // System prompt to guide the AI
    $system_prompt = "You are a friendly and helpful chatbot for 'Vizag Taxi Hub'. Your goal is to assist users with car pooling and taxi services.
    - Be concise and friendly.
    - You can answer questions about available taxi types.
    - Our available vehicle types are: " . ($vehicle_list ?: 'Sedans, SUVs') . ".
    - When asked about fares, explain that the price depends on the trip and vehicle, and they can see it by entering details.
    - When asked to book, guide the user to use the interface to search for and book rides.
    - If you don't know the answer, say that you can't help with that and suggest they contact support.";

    $messages = [
        ['role' => 'system', 'content' => $system_prompt]
    ];
    
    // Add history, making sure it's not too long
    $messages = array_merge($messages, array_slice($history, -6)); 
    
    $messages[] = ['role' => 'user', 'content' => $user_message];

    // Call OpenAI API
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://api.openai.com/v1/chat/completions');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'model' => 'gpt-3.5-turbo',
        'messages' => $messages,
    ]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $openaiKey,
        'Content-Type: application/json'
    ]);

    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (curl_errno($ch)) {
        $error_msg = curl_error($ch);
        curl_close($ch);
        error_log("cURL Error: " . $error_msg);
        sendError('Error communicating with AI service (cURL).', 500);
    }
    
    curl_close($ch);

    $result = json_decode($response, true);

    if ($httpcode >= 400) {
        error_log("OpenAI API Error: HTTP " . $httpcode);
        sendError('Error communicating with AI service.', 500);
    }
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("Failed to decode JSON from OpenAI: " . $response);
        sendError('Invalid response from AI service.', 500);
    }

    $reply = $result['choices'][0]['message']['content'] ?? 'I am sorry, I could not generate a response.';

    sendResponse(['reply' => $reply]);

} catch (Exception $e) {
    error_log("Chatbot Error: " . $e->getMessage());
    sendError('An internal error occurred.', 500);
}
