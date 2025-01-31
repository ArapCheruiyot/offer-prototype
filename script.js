let uploadedFiles = [];
let fileData = {};
let gapiInited = false;
let gisInited = false;
let accessToken = null;

// Load Google API Client
window.gapiLoaded = function () {
    gapi.load('client', initializeGapiClient);
};

// Load Google Identity Services (GIS)
window.gisLoaded = function () {
    gisInited = true;
    maybeEnableButtons();
};

// Initialize Google API Client
async function initializeGapiClient() {
    try {
        await gapi.client.init({
            apiKey: 'YOUR_API_KEY', // Replace with actual API key
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        });
        gapiInited = true;
        maybeEnableButtons();
    } catch (error) {
        console.error('Error initializing Google API Client:', error);
    }
}

// Enable buttons only when both libraries are ready
function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('authButton').disabled = false;
    }
}

// Authenticate user and store access token
async function authenticate() {
    if (!window.google || !window.google.accounts) {
        console.error('Google Identity Services not loaded.');
        return;
    }

    const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: 'YOUR_CLIENT_ID', // Replace with actual OAuth Client ID
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: (response) => {
            if (response.error) {
                console.error('Authentication error:', response.error);
                return;
            }
            accessToken = response.access_token;
            listFiles(); // Proceed to list files after authentication
        },
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
}

// List files from Google Drive
async function listFiles() {
    if (!accessToken) {
        console.error('Access token not available.');
        return;
    }

    try {
        const response = await gapi.client.drive.files.list({
            pageSize: 10,
            fields: "nextPageToken, files(id, name)",
            q: "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'"
        });

        uploadedFiles = response.result.files || [];
        updateFileList();
    } catch (error) {
        console.error('Error fetching files:', error);
        document.getElementById('resultContainer').innerHTML = '<div class="no-result">Error listing files.</div>';
    }
}

// Update the UI with file list
function updateFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '<h3>Files from Google Drive:</h3>';

    if (uploadedFiles.length === 0) {
        fileList.innerHTML += '<p>No files found.</p>';
        return;
    }

    uploadedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.classList.add('file-item');
        fileItem.textContent = `${index + 1}: ${file.name}`;
        fileList.appendChild(fileItem);
    });
}

// Read an Excel file from Google Drive
async function readExcelFile(fileId, fileName) {
    if (!accessToken) {
        console.error('Cannot fetch file, no access token available.');
        return;
    }

    try {
        const response = await gapi.client.drive.files.get({
            fileId,
            alt: 'media'
        }, { responseType: 'arraybuffer' });

        const data = new Uint8Array(response.body);
        const workbook = XLSX.read(data, { type: 'array' });

        fileData[fileName] = workbook.SheetNames.flatMap(sheetName => 
            XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 })
        );
    } catch (error) {
        console.error('Error reading file:', error);
        document.getElementById('resultContainer').innerHTML = '<div class="no-result">Error reading file.</div>';
    }
}

// Convert Excel serial date to JavaScript Date
function excelDateToJSDate(excelDate) {
    const msPerDay = 86400000;
    const epoch = new Date(Date.UTC(1970, 0, 1));
    return new Date(epoch.getTime() + (excelDate - 25569) * msPerDay);
}

// Search functionality
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchButton').addEventListener('click', async () => {
        const customerNumber = document.getElementById('searchInput').value.trim();
        const resultContainer = document.getElementById('resultContainer');
        resultContainer.innerHTML = '';

        if (!customerNumber) {
            resultContainer.innerHTML = '<div class="no-result">Please enter a customer number.</div>';
            return;
        }

        if (uploadedFiles.length === 0) {
            resultContainer.innerHTML = '<div class="no-result">No files uploaded yet.</div>';
            return;
        }

        let found = false;
        for (const file of uploadedFiles) {
            await readExcelFile(file.id, file.name);
            const data = fileData[file.name];

            for (const row of data) {
                if (row.some(cell => String(cell).trim() === customerNumber)) {
                    const formattedRow = row.map(cell => 
                        typeof cell === 'number' && cell > 25568 ? excelDateToJSDate(cell).toLocaleDateString() : cell
                    ).join(', ');

                    resultContainer.innerHTML += `<div class="result">Customer ${customerNumber} found in ${file.name}: ${formattedRow}</div>`;
                    found = true;
                    break;
                }
            }
            if (found) break;
        }

        if (!found) {
            resultContainer.innerHTML = '<div class="no-result">Customer not found in any list.</div>';
        }
    });

    // Handle authentication button
    document.getElementById('authButton').addEventListener('click', authenticate);
});
