let uploadedFiles = []; // Store list of files
let fileData = {}; // Store file content

// Hide elements initially
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('authButton').addEventListener('click', authenticate);
    document.getElementById('fileList').style.display = 'none';
    document.querySelector('.search-box').style.display = 'none';
});

// Step 1: Initialize Google API
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

// Step 2: Initialize Google API Client
async function initializeGapiClient() {
    await gapi.client.init({
        'apiKey': 'YOUR_API_KEY', // Replace with your API key
        'discoveryDocs': ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    });
    console.log('Google API client initialized.');
}

// Step 3: Authenticate User
function authenticate() {
    const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: '743264679221-omplmhe5mj6vo37dbtk2dgj5vcfv6p4k.apps.googleusercontent.com', // Replace with your OAuth client ID
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: (response) => {
            if (response.error) {
                console.error('Authentication error:', response.error);
                return;
            }
            console.log('Authentication successful!');
            showUI();
            listFiles();
        },
    });
    tokenClient.requestAccessToken({ prompt: '' });
}

// Step 4: Show UI elements after authentication
function showUI() {
    document.getElementById('fileList').style.display = 'block';
    document.querySelector('.search-box').style.display = 'block';
}

// Step 5: List Excel Files from Google Drive
async function listFiles() {
    try {
        const response = await gapi.client.drive.files.list({
            'pageSize': 10,
            'fields': "nextPageToken, files(id, name)",
            'q': "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'"
        });

        const files = response.result.files;
        if (files && files.length > 0) {
            uploadedFiles = files;
            displayFiles(files);
        } else {
            console.log('No files found.');
            alert('No Excel files found.');
        }
    } catch (error) {
        console.error('Error listing files:', error);
        alert('Error listing files. Check the console for details.');
    }
}

// Step 6: Display files in the UI
function displayFiles(files) {
    const filesContainer = document.getElementById('files');
    filesContainer.innerHTML = '';
    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.classList.add('file-item');
        fileItem.textContent = `${index + 1}: ${file.name}`;
        filesContainer.appendChild(fileItem);
    });
}

// Step 7: Search for a Number in the Files
async function searchNumberInFiles(searchNumber) {
    if (!uploadedFiles.length) {
        alert('No files available to search.');
        return;
    }

    let searchProgress = document.getElementById('searchProgress');
    searchProgress.innerHTML = `Searching in ${uploadedFiles.length} files...`;

    for (let i = 0; i < uploadedFiles.length; i++) {
        let file = uploadedFiles[i];
        searchProgress.innerHTML = `Searching in ${file.name} (${i + 1}/${uploadedFiles.length})...`;

        let fileContent = await readExcelFile(file.id);
        if (!fileContent) continue;

        let match = findNumberInData(fileContent, searchNumber);
        if (match) {
            document.getElementById('resultContainer').innerHTML = `
                <p>Match found in <strong>${file.name}</strong>!</p>
                <pre>${JSON.stringify(match, null, 2)}</pre>
            `;
            return;
        }
    }

    document.getElementById('resultContainer').innerHTML = `<p>No matching record found.</p>`;
}

// Step 8: Read Excel File Content
async function readExcelFile(fileId) {
    try {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });

        let workbook = XLSX.read(response.body, { type: 'binary' });
        let sheetName = workbook.SheetNames[0];
        let sheet = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_json(sheet);
    } catch (error) {
        console.error(`Error reading file ${fileId}:`, error);
        return null;
    }
}

// Step 9: Find Number in Data
function findNumberInData(data, searchNumber) {
    for (let row of data) {
        for (let key in row) {
            if (row[key] == searchNumber) {
                return row;
            }
        }
    }
    return null;
}

// Step 10: Add Event Listener to Search Button
document.getElementById('searchButton').addEventListener('click', () => {
    let searchNumber = document.getElementById('searchInput').value;
    if (!searchNumber) {
        alert('Please enter a number to search.');
        return;
    }
    searchNumberInFiles(searchNumber);
});

// Step 11: Load Google API Script
window.gapiLoaded = gapiLoaded;
