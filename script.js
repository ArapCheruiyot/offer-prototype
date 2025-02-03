let uploadedFiles = [];
let fileData = {};
let gapiInited = false;
let gisInited = false;

// Google Drive API Initialization
function initializeGapiClient() {
    return gapi.client.init({})
        .then(() => gapi.client.load('https://content.googleapis.com/discovery/v1/apis/drive/v3/rest'))
        .then(() => {
            gapiInited = true;
            toggleAuthButton();
            console.log('Google Drive API initialized');
        });
}

function toggleAuthButton() {
    const authBtn = document.getElementById('authButton');
    authBtn.disabled = !(gapiInited && gisInited);
}

// Authentication Flow
function handleAuthClick() {
    const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: 'YOUR_CLIENT_ID',
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: async (response) => {
            if (response.error) return;
            document.getElementById('refreshButton').classList.remove('hidden');
            await loadDriveFiles();
        },
    });
    tokenClient.requestAccessToken({ prompt: '' });
}

// File Management
async function loadDriveFiles() {
    try {
        const response = await gapi.client.drive.files.list({
            q: "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'",
            fields: 'files(id,name)',
            orderBy: 'name'
        });
        
        uploadedFiles = response.result.files;
        updateFileList();
        document.getElementById('fileList').classList.remove('hidden');
    } catch (error) {
        console.error('File loading error:', error);
    }
}

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

// Excel File Processing
async function processDriveFile(fileId, fileName) {
    try {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        }, { responseType: 'arraybuffer' });

        const data = new Uint8Array(response.body);
        const workbook = XLSX.read(data, { type: 'array' });
        const allData = [];

        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            allData.push(...rows.filter(row => row.length));
        });

        fileData[fileName] = allData;
        console.log(`Processed: ${fileName}`, allData);
    } catch (error) {
        console.error(`Error processing ${fileName}:`, error);
        fileData[fileName] = [];
    }
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
        
        for (const file of uploadedFiles) {
            await processDriveFile(file.id, file.name);
            const sheetData = fileData[file.name] || [];

            for (const row of sheetData) {
                if (!Array.isArray(row)) continue;

                const match = row.some(cell => 
                    String(cell).trim().toLowerCase() === searchTerm.toLowerCase()
                );

                if (match) {
                    const formattedRow = row.map(cell => {
                        if (typeof cell === 'number' && cell > 25568) {
                            try {
                                return new Date((cell - 25569) * 86400000).toLocaleDateString();
                            } catch {
                                return cell;
                            }
                        }
                        return cell;
                    });

                    resultContainer.innerHTML += `
                        <div class="result">
                            Match found in ${file.name}: 
                            ${formattedRow.join(' | ')}
                        </div>`;
                    found = true;
                    break;
                }
            }
            if (found) break;
        }

        if (!found) {
            resultContainer.innerHTML = '<div class="no-result">No matches found</div>';
        }
    } catch (error) {
        console.error('Search error:', error);
        resultContainer.innerHTML = '<div class="no-result">Search failed</div>';
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    gisInited = true;
    gapi.load('client', initializeGapiClient);
    
    document.getElementById('authButton').addEventListener('click', handleAuthClick);
    document.getElementById('searchButton').addEventListener('click', executeSearch);
    document.getElementById('refreshButton').addEventListener('click', loadDriveFiles);
});
