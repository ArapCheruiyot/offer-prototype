let uploadedFiles = [];
let fileData = {};
let gapiInited = false;
let gisInited = false;

// Google Drive API Initialization
async function initializeGapiClient() {
    try {
        await gapi.client.init({
            apiKey: '',
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        });
        gapiInited = true;
        toggleAuthButton();
        console.log('Google Drive API initialized');
    } catch (error) {
        console.error('Error initializing Google Drive API:', error);
    }
}

function toggleAuthButton() {
    document.getElementById('authButton').disabled = !(gapiInited && gisInited);
}

// Authentication Flow
function handleAuthClick() {
    const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: '743264679221-omplmhe5mj6vo37dbtk2dgj5vcfv6p4k.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: async (response) => {
            if (response.error) return;
            document.getElementById('refreshButton').classList.remove('hidden');
            await loadDriveFiles();
        },
    });
    tokenClient.requestAccessToken({ prompt: '' });
}

// File Management (Fixed)
async function loadDriveFiles() {
    try {
        const response = await gapi.client.drive.files.list({
            q: "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'",
            fields: 'files(id,name)',
            orderBy: 'name'
        });
        
        uploadedFiles = response.result.files || [];
        await processAllFiles();
        updateFileList(); // Now properly defined
        document.getElementById('fileList').classList.remove('hidden');
    } catch (error) {
        console.error('File loading error:', error);
    }
}

// Add missing function
function updateFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '<h3>Google Drive Files:</h3>';
    uploadedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.textContent = `${index + 1}: ${file.name}`;
        fileList.appendChild(fileItem);
    });
}

// Add missing processing function
async function processAllFiles() {
    const processingPromises = uploadedFiles.map(file => 
        processDriveFile(file.id, file.name)
    );
    await Promise.all(processingPromises);
}

// Rest of your existing code for processDriveFile, executeSearch, etc...

// Excel Processing
async function processDriveFile(fileId, fileName) {
    try {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        }, { responseType: 'arraybuffer' });

        const data = new Uint8Array(response.body);
        const workbook = XLSX.read(data, {
            type: 'array',
            cellDates: true,
            cellText: false,
            dense: true
        });

        const allData = [];
        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: '',
                blankrows: false
            });
            allData.push(...jsonData);
        });

        fileData[fileName] = allData.filter(row => 
            row.some(cell => cell !== '' && cell !== null)
        );
    } catch (error) {
        console.error(`Error processing ${fileName}:`, error);
        fileData[fileName] = [];
    }
}

function formatCellValue(cell) {
    if (typeof cell === 'number') {
        if (cell > 25568) { // Excel date threshold
            const date = new Date((cell - 25569) * 86400000);
            return isNaN(date) ? cell : date.toLocaleDateString();
        }
        return cell.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,'); // Format numbers
    }
    return cell;
}

// Search Functionality
async function executeSearch() {
    const searchTerm = document.getElementById('searchInput').value.trim();
    const resultContainer = document.getElementById('resultContainer');
    resultContainer.innerHTML = '';
    
    if (!searchTerm) {
        resultContainer.innerHTML = '<div class="no-result">Please enter a search term</div>';
        return;
    }

    try {
        let found = false;
        const normalizedSearch = searchTerm.replace(/[^0-9]/g, '');

        for (const file of uploadedFiles) {
            const sheetData = fileData[file.name] || [];
            for (const [rowIndex, row] of sheetData.entries()) {
                const stringRow = row.map(cell => {
                    if (typeof cell === 'number') {
                        if (cell > 25568) {
                            const date = new Date((cell - 25569) * 86400000);
                            return isNaN(date) ? cell.toString() : date.toLocaleDateString();
                        }
                        return cell.toString();
                    }
                    return String(cell).trim().replace(/^'+|'+$/g, '');
                });

                if (stringRow.some(cell => cell.includes(normalizedSearch))) {
                    const formattedRow = row.map(formatCellValue);
                    resultContainer.innerHTML += 
                        `<div class="result">
                            Match found in ${file.name} (Row ${rowIndex + 1}):<br>
                            ${formattedRow.join(' | ')}
                        </div>`;
                    found = true;
                    break;
                }
            }
            if (found) break;
        }

        if (!found) {
            resultContainer.innerHTML = 
                `<div class="no-result">
                    No matches found for "${searchTerm}"
                </div>`;
        }
    } catch (error) {
        console.error('Search error:', error);
        resultContainer.innerHTML = '<div class="no-result">Search failed - Check console</div>';
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    gisInited = true;
    gapi.load('client', initializeGapiClient);
    
    document.getElementById('authButton').addEventListener('click', handleAuthClick);
    document.getElementById('searchButton').addEventListener('click', executeSearch);
    document.getElementById('refreshButton').addEventListener('click', () => {
        uploadedFiles = [];
        fileData = {};
        loadDriveFiles();
    });
});
