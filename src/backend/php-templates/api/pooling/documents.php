
<?php
ob_start();
set_exception_handler(function($e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Unhandled exception', 'details' => $e->getMessage()]);
    exit;
});

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetDocuments();
        break;
    case 'POST':
        handleUploadDocument();
        break;
    case 'PUT':
        handleUpdateDocumentStatus();
        break;
    case 'DELETE':
        handleDeleteDocument();
        break;
    default:
        sendError('Method not allowed', 405);
}

function handleGetDocuments() {
    global $pdo;
    
    $providerId = $_GET['provider_id'] ?? null;
    
    if (!$providerId) {
        sendError('Provider ID is required');
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT * FROM pooling_documents 
            WHERE provider_id = ? 
            ORDER BY uploaded_at DESC
        ");
        $stmt->execute([$providerId]);
        $documents = $stmt->fetchAll();
        
        sendResponse($documents);
        
    } catch (PDOException $e) {
        error_log('Database error in get documents: ' . $e->getMessage());
        sendError('Failed to fetch documents', 500);
    }
}

function handleUploadDocument() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $input = sanitizeInput($input);
    
    $required_fields = ['provider_id', 'type', 'file_path'];
    $errors = validateInput($input, $required_fields);
    
    if (!empty($errors)) {
        sendError(implode(', ', $errors));
    }
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO pooling_documents (provider_id, type, file_path, status)
            VALUES (?, ?, ?, 'pending')
        ");
        $stmt->execute([
            $input['provider_id'],
            $input['type'],
            $input['file_path']
        ]);
        
        $documentId = $pdo->lastInsertId();
        
        sendResponse([
            'id' => $documentId,
            'message' => 'Document uploaded successfully'
        ], 201);
        
    } catch (PDOException $e) {
        error_log('Database error in upload document: ' . $e->getMessage());
        sendError('Failed to upload document', 500);
    }
}

function handleUpdateDocumentStatus() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $documentId = $input['id'] ?? null;
    $status = $input['status'] ?? null;
    
    if (!$documentId || !$status) {
        sendError('Document ID and status are required');
    }
    
    if (!in_array($status, ['pending', 'verified', 'rejected'])) {
        sendError('Invalid status. Must be: pending, verified, or rejected');
    }
    
    try {
        $stmt = $pdo->prepare("
            UPDATE pooling_documents 
            SET status = ?, verified_at = CASE WHEN ? = 'verified' THEN NOW() ELSE NULL END
            WHERE id = ?
        ");
        $stmt->execute([$status, $status, $documentId]);
        
        if ($stmt->rowCount() === 0) {
            sendError('Document not found', 404);
        }
        
        sendResponse(['message' => 'Document status updated successfully']);
        
    } catch (PDOException $e) {
        error_log('Database error in update document status: ' . $e->getMessage());
        sendError('Failed to update document status', 500);
    }
}

function handleDeleteDocument() {
    global $pdo;

    $input = json_decode(file_get_contents('php://input'), true);
    $documentId = $input['id'] ?? null;

    if (!$documentId) {
        sendError('Document ID is required for deletion');
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM pooling_documents WHERE id = ?");
        $stmt->execute([$documentId]);

        if ($stmt->rowCount() === 0) {
            sendError('Document not found or already deleted', 404);
        }

        sendResponse(['message' => 'Document deleted successfully']);
    } catch (PDOException $e) {
        error_log('Database error in delete document: ' . $e->getMessage());
        sendError('Failed to delete document', 500);
    }
}
?>
