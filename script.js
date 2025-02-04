<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Google Drive Offer Search</title>
    <link rel="stylesheet" href="styles.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.0/xlsx.full.min.js"></script>
    <script src="https://accounts.google.com/gsi/client"></script>
    <script src="https://apis.google.com/js/api.js"></script>
</head>
<body>
    <div class="container">
        <h2>Customer Offer Search</h2>
        <button id="authButton">Connect Google Drive</button>
        
        <div class="file-list hidden" id="fileList">
            <h3>Google Drive Files:</h3>
            <ul id="fileListUl"></ul>
        </div>

        <input type="text" id="searchInput" placeholder="Enter customer number">
        <button id="searchButton">Search</button>
        
        <div id="resultContainer"></div>
        <button id="refreshButton" class="hidden">Refresh File List</button>
    </div>
    <script>
        let gapiLoaded = false;

        function authenticate() {
            gapi.auth2.getAuthInstance().signIn().then(() => {
                console.log('Sign-in successful');
                listFiles();
                document.getElementById('fileList').classList.remove('hidden');
                document.getElementById('refreshButton').classList.remove('hidden');
            });
        }

        function listFiles() {
            gapi.client.drive.files.list({
                pageSize: 10,
                fields: "nextPageToken, files(id, name, mimeType)"
            }).then(function(response) {
                const files = response.result.files;
                const fileListUl = document.getElementById('fileListUl');
                fileListUl.innerHTML = '';
                if (files && files.length > 0) {
                    files.forEach(function(file) {
                        const li = document.createElement('li');
                        li.textContent = `${file.name} (${file.id})`;
                        fileListUl.appendChild(li);
                    });
                } else {
                    fileListUl.innerHTML = '<li>No files found.</li>';
                }
            });
        }

        function loadGapi() {
            gapi.load('client:auth2', initClient);
        }

        function initClient() {
            gapi.client.init({
                apiKey: 'YOUR_API_KEY',
                clientId: 'YOUR_CLIENT_ID',
                discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
                scope: 'https://www.googleapis.com/auth/drive.readonly'
            }).then(function () {
                gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
                updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
                gapiLoaded = true;
            });
        }

        function updateSigninStatus(isSignedIn) {
            if (isSignedIn) {
                document.getElementById('authButton').style.display = 'none';
                listFiles();
            } else {
                document.getElementById('authButton').style.display = 'block';
            }
        }

        function searchFiles() {
            const searchTerm = document.getElementById('searchInput').value;
            const files = document.getElementById('fileListUl').getElementsByTagName('li');
            Array.from(files).forEach(fileItem => {
                const fileId = fileItem.textContent.split('(')[1].replace(')', '').trim();
                gapi.client.drive.files.get({
                    fileId: fileId,
                    alt: 'media'
                }).then(response => {
                    const workbook = XLSX.read(new Uint8Array(response.body), { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const data = XLSX.utils.sheet_to_json(worksheet);

                    const results = data.filter(row => {
                        return Object.values(row).some(cell => String(cell).includes(searchTerm));
                    });

                    if (results.length > 0) {
                        document.getElementById('resultContainer').innerHTML = `<h3>Results in ${fileItem.textContent}</h3><pre>${JSON.stringify(results, null, 2)}</pre>`;
                    } else {
                        document.getElementById('resultContainer').innerHTML = `<p>No results found in ${fileItem.textContent}</p>`;
                    }
                }).catch(error => console.error('Error reading file:', error));
            });
        }

        document.getElementById('authButton').addEventListener('click', authenticate);
        document.getElementById('searchButton').addEventListener('click', searchFiles);
        document.getElementById('refreshButton').addEventListener('click', listFiles);

        // Load the Google API library
        loadGapi();
    </script>
</body>
</html>
