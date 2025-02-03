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

// Excel File Processing (Enhanced)
async function processDriveFile(fileId, fileName) {
    try {
        console.time(`Processed ${fileName}`);
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        }, { responseType: 'arraybuffer' });

        const data = new Uint8Array(response.body);
        const workbook = XLSX.read(data, { 
            type: 'array',
            cellText: false,
            cellDates: true,
            dateNF: 'yyyy-mm-dd'
        });

        const allData = [];
        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1,
                defval: null,
                rawNumbers: false
            });
            
            allData.push(...rows.filter(row => row.some(cell => cell !== null)));
        });

        fileData[fileName] = allData;
        console.timeEnd(`Processed ${fileName}`);
        console.log('Processed data sample:', allData.slice(0, 3));
    } catch (error) {
        console.error(`Error processing ${fileName}:`, error);
        fileData[fileName] = [];
    }
}

// Search Functionality (Enhanced)
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
        console.log('Starting search for:', searchTerm);

        for (const file of uploadedFiles) {
            console.group('Processing file:', file.name);
            await processDriveFile(file.id, file.name);
            const sheetData = fileData[file.name] || [];
            console.log('File data:', sheetData);

            for (const [rowIndex, row] of sheetData.entries()) {
                if (!Array.isArray(row)) {
                    console.warn(`Skipping non-array row at index ${rowIndex}`);
                    continue;
                }

                const cleanRow = row.map(cell => {
                    const strCell = String(cell).trim();
                    return strCell.replace(/[\s\u00A0]+/g, ' ');
                });

                const match = cleanRow.some(cell => {
                    const compareResult = cell === searchTerm;
                    console.log(`Comparing "${cell}" vs "${searchTerm}":`, compareResult);
                    return compareResult;
                });

                if (match) {
                    console.log('Match found at row:', rowIndex + 1);
                    const formattedRow = row.map(cell => formatCellValue(cell));
                    resultContainer.innerHTML += `
                        <div class="result">
                            Match found in ${file.name} (Row ${rowIndex + 1}):
                            ${formattedRow.join(' | ')}
                        </div>`;
                    found = true;
                    break;
                }
            }
            
            console.groupEnd();
            if (found) break;
        }

        if (!found) {
            console.warn('No matches found in any files');
            resultContainer.innerHTML = '<div class="no-result">No matches found</div>';
        }
    } catch (error) {
        console.error('Search error:', error);
        resultContainer.innerHTML = '<div class="no-result">Search failed</div>';
    }
}

// New Helper Function
function formatCellValue(cell) {
    try {
        const numericValue = Number(cell);
        if (!isNaN(numericValue)) {
            if (numericValue > 25568 && numericValue < 2958466) {
                return new Date((numericValue - 25569) * 86400000).toLocaleDateString();
            }
            return numericValue.toLocaleString();
        }
    } catch {
        // Fallback to string representation
    }
    return String(cell).trim();
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    gisInited = true;
    gapi.load('client', initializeGapiClient);
    
    document.getElementById('authButton').addEventListener('click', handleAuthClick);
    document.getElementById('searchButton').addEventListener('click', executeSearch);
    document.getElementById('refreshButton').addEventListener('click', loadDriveFiles);
});
