<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Customer Offer Search</title>
    <link rel="stylesheet" href="styles.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.0/xlsx.full.min.js"></script>
    <script src="https://apis.google.com/js/api.js" onload="gapiLoaded()"></script>
    <script src="https://accounts.google.com/gsi/client" onload="gisLoaded()"></script>
    <script src="script.js" defer></script>
</head>
<body>
    <div class="container">
        <h2>Customer Offer Search</h2>

        <!-- Button to Authenticate and List Google Drive Files -->
        <button id="authButton" disabled>Authenticate and List Files</button>
        
        <div class="file-list" id="fileList">
            <h3>Files from Google Drive:</h3>
        </div>

        <!-- Search Box -->
        <input type="text" id="searchInput" placeholder="Enter customer number">
        <button id="searchButton">Search</button>

        <!-- Result Display -->
        <div id="resultContainer"></div>
    </div>
</body>
</html>
