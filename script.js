// Ensure these functions are defined in the global scope
window.gapiLoaded = function () {
    gapi.load('client', initializeGapiClient);
};

window.gisLoaded = function () {
    gisInited = true;
    maybeEnableButtons();
};

let uploadedFiles = [];
let fileData = {}; // To store the data read from the files
let gapiInited = false;
let gisInited = false;

// Initialize the Google API client
async function initializeGapiClient() {
    try {
        await gapi.client.init({
            'apiKey': 'YOUR_API_KEY', // Replace with your API key
            'discoveryDocs': ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        });
        gapiInited = true;
        maybeEnableButtons();
    } catch (error) {
        console.error('Error initializing GAPI client:', error);
    }
}

// Enable buttons only when both libraries are loaded
function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('authButton').disabled = false;
    }
}

// Authenticate the user
async function authenticate() {
    if (!window.google || !window.google.accounts) {
        console.error('Google Identity Services library not loaded.');
        return;
    }

    const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: '743264679221-omplmhe5mj6vo37dbtk2dgj5vcfv6p4k.apps.googleusercontent.com', // Replace with your OAuth client ID
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: (response) => {
            if (response.error !== undefined) {
                console.error('Authentication error:', response.error);
                return;
            }
            listFiles(); // List files after successful authentication
        },
    });
    tokenClient.requestAccessToken({ prompt: '' });
}

// List files from Google Drive
async function listFiles() {
    let response;
    try {
        response = await gapi.client.drive.files.list({
            'pageSize': 10,
            'fields': "nextPageToken, files(id, name)",
            'q': "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'"
        });
    } catch (err) {
        document.getElementById('resultContainer').innerHTML = '<div class="no-result">Error listing files.</div>';
        console.error('Error listing files:', err);
        return;
    }
    const files = response.result.files;
    if (files && files.length > 0) {
        uploadedFiles = files;
        updateFileList();
    } else {
        document.getElementById('resultContainer').innerHTML = '<div class="no-result">No files found.</div>';
    }
}

// Update the file list in the UI
function updateFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '<h3>Files from Google Drive:</h3>';
    uploadedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.classList.add('file-item');
        fileItem.textContent = `${index + 1}: ${file.name}`;
        fileList.appendChild(fileItem);
    });
}

// Read an Excel file from Google Drive
async function readExcelFile(fileId, fileName) {
    let response;
    try {
        response = await gapi.client.drive.files.get({
            'fileId': fileId,
            'alt': 'media'
        }, { responseType: 'arraybuffer' });
    } catch (err) {
        document.getElementById('resultContainer').innerHTML = '<div class="no-result">Error reading file.</div>';
        console.error('Error reading file:', err);
        return;
    }
    const data = new Uint8Array(response.body);
    const workbook = XLSX.read(data, { type: 'array' });
    let allData = [];
    workbook.SheetNames.forEach(sheetName => {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
        allData = allData.concat(rows);
    });
    fileData[fileName] = allData;
}

// Handle search functionality
document.getElementById('searchButton').addEventListener('click', async () => {
    const customerNumber = document.getElementById('searchInput').value.trim();
    const resultContainer = document.getElementById('resultContainer');
    resultContainer.innerHTML = '';

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
                const formattedRow = row.map(cell => {
                    if (typeof cell === 'number' && cell > 25568) {
                        const date = excelDateToJSDate(cell);
                        return date.toLocaleDateString();
                    }
                    return cell;
                });
                const rowData = formattedRow.map(cell => `<span>${cell}</span>`).join(', ');
                resultContainer.innerHTML += `<div class="result">Customer ${customerNumber} found in ${file.name}: ${rowData}</div>`;
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

// Convert Excel date serial number to JS Date
function excelDateToJSDate(excelDate) {
    const msPerDay = 86400000;
    const epoch = new Date(Date.UTC(1970, 0, 1));
    return new Date(epoch.getTime() + (excelDate - 25569) * msPerDay);
}
