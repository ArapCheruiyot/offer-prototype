<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Google Drive File Uploader</title>
    <style>
        /* Styles remain unchanged */
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f9;
            color: #333;
        }
        header {
            background-color: #4CAF50;
            color: white;
            padding: 15px;
            text-align: center;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }
        main {
            max-width: 600px;
            margin: 40px auto;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
            font-size: 1.8em;
            margin-bottom: 20px;
            text-align: center;
            color: #4CAF50;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            margin: 10px 0;
            font-size: 1em;
            font-weight: bold;
            color: white;
            background-color: #4CAF50;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            text-align: center;
            text-decoration: none;
            transition: background-color 0.3s ease;
        }
        .button:hover {
            background-color: #45a049;
        }
        #uploadSection {
            display: none;
            margin-top: 20px;
        }
        input[type="file"] {
            margin: 10px 0;
            padding: 10px;
            width: 100%;
            font-size: 1em;
            border: 1px solid #ccc;
            border-radius: 4px;
            background: #f9f9f9;
            box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .notice {
            font-size: 0.9em;
            color: #888;
            margin-top: 10px;
        }
        .file-list {
            margin: 20px 0;
            list-style-type: none;
            padding: 0;
        }
        .file-list li {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 5px 0;
            padding: 10px;
            background: #f9f9f9;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
        .delete-button {
            background: #e74c3c;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 5px 10px;
            cursor: pointer;
        }
        .delete-button:hover {
            background: #c0392b;
        }
        footer {
            text-align: center;
            margin-top: 20px;
            font-size: 0.9em;
            color: #777;
        }
        /* Progress bar styles */
        .progress-container {
            width: 100%;
            background-color: #f3f3f3;
            border-radius: 4px;
            margin-top: 20px;
        }
        .progress-bar {
            width: 0;
            height: 20px;
            background-color: #4CAF50;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <header>
        <h1>Google Drive File Uploader</h1>
    </header>
    <main>
        <h1>Upload Files Easily</h1>
        <button id="authorize_button" class="button" style="display: none;" onclick="handleAuthClick()">Authorize Access</button>
        <button id="signout_button" class="button" style="display: none;" onclick="handleSignoutClick()">Sign Out</button>

        <div id="uploadSection">
            <label for="file_input">Select Excel files to upload:</label>
            <input type="file" id="file_input" multiple accept=".xlsx, .xls" onchange="handleFileSelection()">
            <ul id="file_list" class="file-list"></ul>
            <button class="button" onclick="uploadFiles()">Upload Files</button>
            <p class="notice">Note: Only Excel files (.xlsx, .xls) are allowed. You can select multiple files.</p>
            
            <!-- Search Box -->
            <input type="text" id="searchInput" placeholder="Enter customer number">
            <button id="searchButton">Search</button> 
            
            <!-- Progress bar container -->
            <div class="progress-container">
                <div id="progress_bar" class="progress-bar"></div>
            </div>
        </div>
    </main>
    <footer>
        &copy; 2025 FileUploader Inc. All rights reserved.
    </footer>
    <script async defer src="https://apis.google.com/js/api.js" onload="gapiLoaded()"></script>
    <script async defer src="https://accounts.google.com/gsi/client" onload="gisLoaded()"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.1/xlsx.full.min.js"></script>
    <script>
        const CLIENT_ID = '958416089916-1embl17stmkectofeqb74c54ccs38rb5.apps.googleusercontent.com';
        const API_KEY = 'YOUR_API_KEY';
        const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
        const SCOPES = 'https://www.googleapis.com/auth/drive.file';

        let tokenClient;
        let gapiInited = false;
        let gisInited = false;
        let selectedFiles = [];

        function gapiLoaded() {
            gapi.load('client', initializeGapiClient);
        }

        async function initializeGapiClient() {
            await gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: DISCOVERY_DOCS,
            });
            gapiInited = true;
            maybeEnableButtons();
        }

        function gisLoaded() {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '',
            });
            gisInited = true;
            maybeEnableButtons();
        }

        function maybeEnableButtons() {
            if (gapiInited && gisInited) {
                document.getElementById('authorize_button').style.display = 'block';
            }
        }

        function handleAuthClick() {
            tokenClient.callback = async (resp) => {
                if (resp.error) {
                    throw (resp);
                }
                document.getElementById('authorize_button').style.display = 'none';
                document.getElementById('signout_button').style.display = 'block';
                document.getElementById('uploadSection').style.display = 'block';
            };

            if (gapi.client.getToken() === null) {
                tokenClient.requestAccessToken({ prompt: 'consent' });
            } else {
                tokenClient.requestAccessToken({ prompt: '' });
            }
        }

        function handleSignoutClick() {
            const token = gapi.client.getToken();
            if (token !== null) {
                google.accounts.oauth2.revoke(token.access_token);
                gapi.client.setToken('');
                document.getElementById('authorize_button').style.display = 'block';
                document.getElementById('signout_button').style.display = 'none';
                document.getElementById('uploadSection').style.display = 'none';
            }
        }

        function handleFileSelection() {
            const fileInput = document.getElementById('file_input');
            selectedFiles = Array.from(fileInput.files);
            const fileList = document.getElementById('file_list');
            fileList.innerHTML = '';
            selectedFiles.forEach(file => {
                const li = document.createElement('li');
                li.textContent = file.name;
                fileList.appendChild(li);
            });
        }

        async function uploadFiles() {
            if (!selectedFiles.length) {
                alert('Please select at least one file to upload.');
                return;
            }

            const folderId = '1rSxY5C7YCGFS1mpwlAckQQuBTAn8OQH-'; // Replace with your folder ID

            let uploadedFilesCount = 0;

            for (let file of selectedFiles) {
                const metadata = {
                    'name': file.name,
                    'mimeType': file.type || 'application/octet-stream',
                    'parents': [folderId],
                };
                const accessToken = gapi.auth.getToken().access_token;
                const form = new FormData();
                form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                form.append('file', file);

                const xhr = new XMLHttpRequest();
                xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
                xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const percent = (e.loaded / e.total) * 100;
                        document.getElementById('progress_bar').style.width = percent + '%';
                    }
                };
                xhr.onload = () => {
                    if (xhr.status === 200) {
                        uploadedFilesCount++;
                    }
                    if (uploadedFilesCount === selectedFiles.length) {
                        alert('All files uploaded successfully!');
                    }
                };
                xhr.send(form);
            }
        }

        // Function to fetch files from Google Drive
        async function fetchFilesFromDrive(folderId) {
            try {
                const response = await gapi.client.drive.files.list({
                    q: '${folderId}' in parents,
                    fields: 'files(id, name)',
                });
                return response.result.files;
            } catch (error) {
                console.error("Error fetching files from Google Drive:", error);
                throw error;
            }
        }

        // Function to download file content from Google Drive
        async function downloadFileContent(fileId) {
            try {
                const response = await gapi.client.drive.files.get({
                    fileId: fileId,
                    alt: 'media',
                }, { responseType: 'arraybuffer' });
                return response.body;
            } catch (error) {
                console.error("Error downloading file content:", error);
                throw error;
            }
        }

        // Search function to find customer number inside files
        document.getElementById("searchButton").addEventListener("click", async () => {
            if (!gapi.client.getToken()) {
                alert("Please authorize access to Google Drive first.");
                return;
            }

            const searchTerm = document.getElementById('searchInput').value.trim();
            if (!searchTerm) {
                alert("Please enter a customer number.");
                return;
            }

            console.log("Searching for:", searchTerm); // Debugging

            const folderId = '1rSxY5C7YCGFS1mpwlAckQQuBTAn8OQH-'; // Replace with your folder ID
            console.log("Fetching files from folder:", folderId); // Debugging

            try {
                const files = await fetchFilesFromDrive(folderId);
                console.log("Files fetched:", files); // Debugging

                let found = false;

                for (let file of files) {
                    console.log("Downloading file:", file.name); // Debugging
                    const fileContent = await downloadFileContent(file.id);
                    console.log("File content downloaded:", file.name); // Debugging

                    const workbook = XLSX.read(new Uint8Array(fileContent), { type: 'array' });

                    // Loop through sheets in the workbook
                    for (const sheetName of workbook.SheetNames) {
                        const sheet = workbook.Sheets[sheetName];
                        const jsonData = XLSX.utils.sheet_to_json(sheet);
                        console.log("Searching in sheet:", sheetName); // Debugging

                        // Loop through rows to find the customer number
                        for (let row of jsonData) {
                            for (let key in row) {
                                if (row[key] && row[key].toString().includes(searchTerm)) {
                                    found = true;
                                    alert(Found ${searchTerm} in file: ${file.name}, Sheet: ${sheetName});
                                    return;
                                }
                            }
                        }
                    }
                }

                if (!found) {
                    alert(Customer number ${searchTerm} not found in any file.);
                }
            } catch (error) {
                console.error("Error during search:", error); // Debugging
                alert("An error occurred while searching. Check the console for details.");
            }
        });
    </script>
</body>
</html>
