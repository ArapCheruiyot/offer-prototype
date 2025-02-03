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

// Excel File Processing (Updated)
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
            dense: true
        });

        const allData = [];
        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            if(!worksheet['!ref']) return;
            
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            for(let rowNum = range.s.r; rowNum <= range.e.r; rowNum++) {
                const row = [];
                for(let colNum = range.s.c; colNum <= range.e.c; colNum++) {
                    const cell = worksheet[XLSX.utils.encode_cell({r: rowNum, c: colNum})];
                    row.push(cell ? cell.v : '');
                }
                allData.push(row);
            }
        });

        fileData[fileName] = allData.filter(row => row.some(cell => cell !== ''));
        console.timeEnd(`Processed ${fileName}`);
        console.log('Processed data sample:', JSON.parse(JSON.stringify(allData.slice(0, 5))));
    } catch (error) {
        console.error(`Error processing ${fileName}:`, error);
        fileData[fileName] = [];
    }
}

// Search Functionality (Optimized)
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
            `'${cleanSearch}'`, // Excel number-as-text format
            BigInt(cleanSearch).toString() // Handle large integers
        ]);

        console.log('Search variants:', [...searchVariants]);

        for (const file of uploadedFiles) {
            console.groupCollapsed(`Processing ${file.name}`);
            await processDriveFile(file.id, file.name);
            const sheetData = fileData[file.name] || [];

            for (const [rowIndex, row] of sheetData.entries()) {
                const rowValues = row.map(cell => {
                    if (typeof cell === 'number' && cell > 25568) {
                        return new Date((cell - 25569) * 86400000).toLocaleDateString();
                    }
                    return String(cell).replace(/[^0-9]/g, '');
                });

                if (rowValues.some(value => searchVariants.has(value))) {
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
            resultContainer.innerHTML = `
                <div class="no-result">
                    No matches found for "${searchTerm}"<br>
                    Search variants tried: ${[...searchVariants].join(', ')}
                </div>`;
        }
    } catch (error) {
        console.error('Search error:', error);
        resultContainer.innerHTML = '<div class="no-result">Search failed - Check console</div>';
    }
}

// Cell Formatting
function formatCellValue(cell) {
    try {
        // Handle numeric values
        const numericValue = Number(cell);
        if (!isNaN(numericValue)) {
            return numericValue.toLocaleString();
        }
        
        // Handle dates
        if (cell instanceof Date) {
            return cell.toLocaleDateString();
        }
        
    } catch (error) {
        console.warn('Formatting error:', error);
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
