let uploadedFiles = [];
let fileData = {};
let gapiInited = false;
let gisInited = false;

// Google Drive API Initialization
async function initializeGapiClient() {
    try {
        await gapi.client.init({});
        await gapi.client.load('https://content.googleapis.com/discovery/v1/apis/drive/v3/rest');
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

// File Management
async function loadDriveFiles() {
    try {
        const response = await gapi.client.drive.files.list({
            q: "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'",
            fields: 'files(id,name)',
            orderBy: 'name'
        });
        
        uploadedFiles = response.result.files || [];
        // Process each file immediately after loading the list
        for (const file of uploadedFiles) {
            await processDriveFile(file.id, file.name);
        }
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

// Excel File Processing (Corrected Date Handling)
async function processDriveFile(fileId, fileName) {
    try {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        }, { responseType: 'arraybuffer' });

        const data = new Uint8Array(response.body);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        const allData = [];
        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            allData.push(...rows);
        });

        fileData[fileName] = allData.filter(row => row.some(cell => cell !== ''));
        console.log(`Processed ${fileName} data:`, fileData[fileName]);
    } catch (error) {
        console.error(`Error processing ${fileName}:`, error);
        fileData[fileName] = [];
    }
}

// Search Functionality (Using Preprocessed Data)
function formatCellValue(cell) {
    if (typeof cell === 'number') {
        // Check if it's a valid Excel date
        const jsDate = new Date((cell - 25569) * 86400000);
        if (!isNaN(jsDate.getTime())) {
            return jsDate.toLocaleDateString();
        }
    }
    return String(cell).trim();
}

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
        const cleanSearch = searchTerm.replace(/[^0-9]/g, '');
        const searchVariants = new Set([
            cleanSearch,
            `'${cleanSearch}'`, // Excel might store numbers as text with leading '
            searchTerm
        ]);

        console.log(`Searching for variants:`, [...searchVariants]);

        for (const file of uploadedFiles) {
            const sheetData = fileData[file.name] || [];
            console.log(`Searching in ${file.name} (${sheetData.length} rows)`);

            for (const [rowIndex, row] of sheetData.entries()) {
                const rowValues = row.map(cell => formatCellValue(cell));
                if (rowValues.some(value => searchVariants.has(value))) {
                    const formattedRow = row.map(cell => formatCellValue(cell));
                    resultContainer.innerHTML += 
                        `<div class="result">
                            Match found in ${file.name} (Row ${rowIndex + 1}): 
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
                    No matches found for "${searchTerm}"<br>
                    Search variants tried: ${[...searchVariants].join(', ')}
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
    document.getElementById('refreshButton').addEventListener('click', loadDriveFiles);
});
