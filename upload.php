<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

$response = ['success' => false, 'message' => ''];

try {
    // Validate request
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Invalid request method');
    }

    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('No file uploaded or upload error');
    }

    $file = $_FILES['file'];
    $targetDir = __DIR__ . '/data/';
    
    // Create data directory if it doesn't exist
    if (!file_exists($targetDir)) {
        if (!mkdir($targetDir, 0777, true)) {
            throw new Exception('Failed to create data directory');
        }
    }

    // Validate file type
    $allowedExtensions = ['json', 'csv'];
    $fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    
    if (!in_array($fileExt, $allowedExtensions)) {
        throw new Exception('Only JSON and CSV files are allowed');
    }

    $targetFile = $targetDir . 'sales_data.json';
    $backupFile = $targetDir . 'sales_data_backup_' . date('YmdHis') . '.json';

    // Create backup if replacing
    if (file_exists($targetFile)) {
        if (!copy($targetFile, $backupFile)) {
            throw new Exception('Could not create backup of existing data');
        }
    }

    // Process file
    if ($fileExt === 'csv') {
        // Convert CSV to JSON
        $csvData = array_map('str_getcsv', file($file['tmp_name']));
        $headers = array_shift($csvData);
        $jsonData = [];
        
        foreach ($csvData as $row) {
            if (count($row) !== count($headers)) continue;
            $jsonData[] = array_combine($headers, $row);
        }
        
        if (file_put_contents($targetFile, json_encode($jsonData, JSON_PRETTY_PRINT)) === false) {
            throw new Exception('Failed to save JSON data');
        }
    } else {
        // Move JSON file directly
        if (!move_uploaded_file($file['tmp_name'], $targetFile)) {
            throw new Exception('Failed to move uploaded file');
        }
        
        // Validate JSON
        $jsonData = json_decode(file_get_contents($targetFile), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            unlink($targetFile);
            throw new Exception('Invalid JSON format: ' . json_last_error_msg());
        }
    }

    $response = [
        'success' => true,
        'message' => 'Data uploaded successfully'
    ];
} catch (Exception $e) {
    // Restore backup if error occurred
    if (isset($backupFile) && file_exists($backupFile)) {
        copy($backupFile, $targetFile);
        unlink($backupFile);
    }
    
    $response['message'] = $e->getMessage();
}

echo json_encode($response);
?>