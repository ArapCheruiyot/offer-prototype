let uploadedFiles = []; // To store the list of files
let fileData = {}; // To store the data read from the files
let tokenClient; // Store the token client for re-use

// Step 1: Ensure Google API is Loaded
window.onload = function () {
    if (typeof gapi !== 'undefined') {
        console.log("Google API script found, initializing...");
        gapiLoaded();
    } else {
        console.error("Google API script not found!");
        alert("Failed to load Google API. Refresh the page and try again.");
    }
};

// Step 2: Google API Load Handler
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

// Step 3: Initialize Google API Client
async function initializeGapiClient() {
    try {
        await gapi.client.init({
            apiKey: 'YOUR_API_KEY', // Replace with your API key
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        });

        // Ensure Drive API is loaded before proceeding
        await gapi.client.load('drive', 'v3');
        console.log('Google API client initialized.');
    } catch (error) {
        console.error('Error initializing Google API client:', error);
        alert('Failed to initialize Google API. Check the console.');
    }
}

// Step 4: Handle Google Authentication
function authenticate() {
    if (!gapi.client || !gapi.client.drive) {
        console.error("Google API client is not ready yet.");
        alert('Google API not loaded yet. Try again.');
        return;
    }

    if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: '743264679221-omplmhe5mj6vo37dbtk2dgj5vcfv6p4k.apps.googleusercontent.com', // Replace with your OAuth client ID
            scope: 'https://www.googleapis.com/auth/drive.readonly',
            callback: (response) => {
                if (response.error) {
                    console.error('Authentication error:', response.error);
                    alert('Authentication failed.');
                    return;
                }
                console.log('Authentication successful!');
                showUI();
                listFiles();
            },
        });
    }

    tokenClient.requestAccessToken({ prompt: '' });
}

// Step 5: Show UI after authentication
function showUI() {
    document.getElementById('fileList').classList.remove('hidden');
    document.getElementById('searchBox').classList.remove('hidden');
}

// Step 6: List files from Google Drive
async function listFiles() {
    try {
        const response = await gapi.client.drive.files.list({
            pageSize: 10,
            fields: "nextPageToken, files(id, name)",
            q: "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'"
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
        alert('Error listing files. Check the console.');
    }
}

// Step 7: Display files in UI
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

// Step 8: Read an Excel file from Google Drive
async function readExcelFile(fileId, fileName) {
    if (fileData[fileName]) return; // Avoid redundant API calls

    try {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        }, { responseType: 'arraybuffer' });

        const data = new Uint8Array(response.body);
        const workbook = XLSX.read(data, { type: 'array' });

        let allData = [];
        workbook.SheetNames.forEach(sheetName => {
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
            allData = allData.concat(rows);
        });

        fileData[fileName] = allData;
    } catch (error) {
        console.error('Error reading file:', error);
        alert('Error reading file. Check the console.');
    }
}

// Step 9: Search for Customer Number
async function searchFiles() {
    const customerNumber = document.getElementById('searchInput').value.trim();
    const resultContainer = document.getElementById('resultContainer');
    resultContainer.innerHTML = '';

    if (!customerNumber) {
        alert('Please enter a customer number to search.');
        return;
    }

    if (uploadedFiles.length === 0) {
        resultContainer.innerHTML = '<div class="no-result">No files uploaded yet.</div>';
        return;
    }

    let found = false;

    for (const file of uploadedFiles) {
        await readExcelFile(file.id, file.name); // Read file content if not already read

        const data = fileData[file.name];
        if (!data) continue; // Skip if file reading failed

        for (const row of data) {
            if (row.some(cell => String(cell).trim() === customerNumber)) {
                const formattedRow = row.map(cell => {
                    if (typeof cell === 'number' && cell > 25568) {
                        return excelDateToJSDate(cell).toLocaleDateString();
                    }
                    return cell;
                });

                const rowData = formattedRow.map(cell => `<span>${cell}</span>`).join(', ');
                resultContainer.innerHTML += `<div class="result">Customer ${customerNumber} found in ${file.name}: ${rowData}</div>`;
                found = true;
                break; // Stop searching this file after finding a match
            }
        }

        if (found) break; // Stop searching once a match is found
    }

    if (!found) {
        resultContainer.innerHTML = '<div class="no-result">Customer not found in any list.</div>';
    }
}

// Step 10: Convert Excel Date Serial to JS Date
function excelDateToJSDate(excelDate) {
    const msPerDay = 86400000;
    const epoch = new Date(Date.UTC(1970, 0, 1));
    return new Date(epoch.getTime() + (excelDate - 25569) * msPerDay);
}

// Step 11: Add Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('authButton').addEventListener('click', authenticate);
    document.getElementById('searchButton').addEventListener('click', searchFiles);
});

// Step 12: Ensure `gapiLoaded` is globally available
window.gapiLoaded = gapiLoaded;
