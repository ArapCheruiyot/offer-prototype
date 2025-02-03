let uploadedFiles = []; // To store the list of files
let fileData = {}; // To store the data read from the files

// Step 1: Initialize Google API
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

// Step 2: Initialize the Google API client
async function initializeGapiClient() {
    await gapi.client.init({
        'apiKey': 'YOUR_API_KEY', // Replace with your API key
        'discoveryDocs': ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    });
    console.log('Google API client initialized.');
}

// Step 3: Handle Google Authentication
function authenticate() {
    const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: '743264679221-omplmhe5mj6vo37dbtk2dgj5vcfv6p4k.apps.googleusercontent.com', // Replace with your OAuth client ID
        scope: 'https://www.googleapis.com/auth/drive.readonly', // Request read-only access to Google Drive
        callback: (response) => {
            if (response.error) {
                console.error('Authentication error:', response.error);
                return;
            }
            console.log('Authentication successful!');
            showUI(); // Show the file list and search box
            listFiles(); // List files after authentication
        },
    });
    tokenClient.requestAccessToken({ prompt: '' }); // Prompt the user to authenticate
}

// Step 4: Show the file list and search box
function showUI() {
    document.getElementById('fileList').classList.remove('hidden');
    document.getElementById('searchBox').classList.remove('hidden');
}

// Step 5: List files from Google Drive
async function listFiles() {
    try {
        const response = await gapi.client.drive.files.list({
            'pageSize': 10,
            'fields': "nextPageToken, files(id, name)",
            'q': "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'" // Only list Excel files
        });
        const files = response.result.files;
        if (files && files.length > 0) {
            uploadedFiles = files;
            displayFiles(files); // Display files in the UI
        } else {
            console.log('No files found.');
            alert('No files found.');
        }
    } catch (error) {
        console.error('Error listing files:', error);
        alert('Error listing files. Check the console for details.');
    }
}

// Step 6: Display files in the UI
function displayFiles(files) {
    const filesContainer = document.getElementById('files');
    filesContainer.innerHTML = ''; // Clear previous content
    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.classList.add('file-item');
        fileItem.textContent = `${index + 1}: ${file.name}`;
        filesContainer.appendChild(fileItem);
    });
}

// Step 7: Read an Excel file from Google Drive
async function readExcelFile(fileId, fileName) {
    try {
        const response = await gapi.client.drive.files.get({
            'fileId': fileId,
            'alt': 'media'
        }, { responseType: 'arraybuffer' });
        const data = new Uint8Array(response.body);
        const workbook = XLSX.read(data, { type: 'array' });
        let allData = [];
        workbook.SheetNames.forEach(sheetName => {
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
            allData = allData.concat(rows);
        });
        fileData[fileName] = allData; // Store the file data
    } catch (error) {
        console.error('Error reading file:', error);
        alert('Error reading file. Check the console for details.');
    }
}

// Step 8: Handle search functionality
async function searchFiles() {
    const customerNumber = document.getElementById('searchInput').value.trim();
    const resultContainer = document.getElementById('resultContainer');
    resultContainer.innerHTML = ''; // Clear previous results

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
        await readExcelFile(file.id, file.name); // Read the file content
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
                break; // Stop searching this file after a match is found
            }
        }
        if (found) break; // Stop searching other files after a match is found
    }

    if (!found) {
        resultContainer.innerHTML = '<div class="no-result">Customer not found in any list.</div>';
    }
}

// Step 9: Convert Excel date serial number to JS Date
function excelDateToJSDate(excelDate) {
    const msPerDay = 86400000;
    const epoch = new Date(Date.UTC(1970, 0, 1));
    return new Date(epoch.getTime() + (excelDate - 25569) * msPerDay);
}

// Step 10: Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('authButton').addEventListener('click', authenticate);
    document.getElementById('searchButton').addEventListener('click', searchFiles);
});

// Step 11: Load the Google API script
window.gapiLoaded = gapiLoaded;
