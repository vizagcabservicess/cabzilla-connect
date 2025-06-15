
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

// IMPORTANT: Using API keys directly in code is not recommended for production.
// It's better to store this in a secure environment variable.
define('OPENAI_API_KEY', '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');

// Get the request body
$input = json_decode(file_get_contents('php://input'), true);
$user_message = $input['message'] ?? '';
$history = $input['history'] ?? [];

if (empty($user_message)) {
    sendError('Message is required.', 400);
}

if (OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_HERE' || empty(OPENAI_API_KEY)) {
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
        'Authorization: Bearer ' . OPENAI_API_KEY,
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

    if ($httpcode >= 400) {
        error_log("OpenAI API Error: HTTP " . $httpcode . " - " . $response);
        sendError('Error communicating with AI service.', 500);
    }
    
    $result = json_decode($response, true);

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

