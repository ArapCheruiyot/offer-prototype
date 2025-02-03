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

// Excel File Processing
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
            dateNF: 'yyyy-mm-dd',
            rawNumbers: false
        });

        const allData = [];
        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1,
                defval: '',
                raw: false
            });
            
            allData.push(...rows.filter(row => row.some(cell => cell !== '')));
        });

        fileData[fileName] = allData;
        console.timeEnd(`Processed ${fileName}`);
        console.log('Processed data sample:', JSON.parse(JSON.stringify(allData.slice(0, 3))));
    } catch (error) {
        console.error(`Error processing ${fileName}:`, error);
        fileData[fileName] = [];
    }
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
        const normalizedSearch = searchTerm.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        console.log('Ultimate search analysis:', {
            original: searchTerm,
            normalized: normalizedSearch,
            codes: Array.from(normalizedSearch).map(c => c.charCodeAt(0)),
            length: normalizedSearch.length
        });

        for (const file of uploadedFiles) {
            console.groupCollapsed(`PROCESSING ${file.name}`);
            await processDriveFile(file.id, file.name);
            const sheetData = fileData[file.name] || [];

            for (const [rowIndex, row] of sheetData.entries()) {
                if (!Array.isArray(row)) continue;

                const matchAnalysis = row.map((cell, cellIndex) => {
                    // Deep inspection
                    const rawValue = cell;
                    const type = typeof cell;
                    const strValue = String(cell).trim();
                    const normalizedCell = strValue.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    
                    return {
                        cellIndex,
                        rawValue,
                        type,
                        strValue,
                        normalizedCell,
                        codes: Array.from(normalizedCell).map(c => c.charCodeAt(0)),
                        isExactMatch: normalizedCell === normalizedSearch,
                        isNumericMatch: !isNaN(Number(normalizedCell)) && 
                                      !isNaN(Number(normalizedSearch)) && 
                                      Number(normalizedCell) === Number(normalizedSearch)
                    };
                });

                console.log(`Row ${rowIndex + 1} analysis:`, matchAnalysis);
                
                if (matchAnalysis.some(cell => cell.isExactMatch || cell.isNumericMatch)) {
                    const matches = matchAnalysis.filter(cell => cell.isExactMatch || cell.isNumericMatch);
                    console.log('MATCH FOUND:', matches);
                    
                    const formattedRow = row.map(cell => formatCellValue(cell));
                    resultContainer.innerHTML += `
                        <div class="result">
                            Match found in ${file.name} (Row ${rowIndex + 1}):<br>
                            ${formattedRow.join(' | ')}<br>
                            Match Type: ${matches.map(m => m.isExactMatch ? 'Exact' : 'Numeric').join(', ')}
                        </div>`;
                    found = true;
                    break;
                }
            }
            
            console.groupEnd();
            if (found) break;
        }

        if (!found) {
            console.warn('DEEP ANALYSIS: No matches found');
            resultContainer.innerHTML = `
                <div class="no-result">
                    No matches found for "${searchTerm}"<br>
                    Normalized: "${normalizedSearch}"<br>
                    Character codes: [${Array.from(normalizedSearch).map(c => c.charCodeAt(0)).join(', ')}]
                </div>`;
        }
    } catch (error) {
        console.error('Search error:', error);
        resultContainer.innerHTML = '<div class="no-result">Search failed - Check console</div>';
    }
}
// Enhanced Cell Formatting
function formatCellValue(cell) {
    try {
        // Handle Excel date serial numbers
        if (typeof cell === 'number' && cell > 25568 && cell < 2958466) {
            const date = new Date((cell - 25569) * 86400000);
            return isNaN(date) ? cell : date.toLocaleDateString();
        }
        
        // Handle numeric values
        const numericValue = Number(cell);
        if (!isNaN(numericValue)) {
            return numericValue.toLocaleString();
        }
        
        // Handle boolean values
        if (typeof cell === 'boolean') {
            return cell ? 'Yes' : 'No';
        }
        
    } catch (error) {
        console.warn('Formatting error:', error);
    }
    
    // Default string handling
    return String(cell).trim().replace(/[\s\u00A0]+/g, ' ');
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    gisInited = true;
    gapi.load('client', initializeGapiClient);
    
    document.getElementById('authButton').addEventListener('click', handleAuthClick);
    document.getElementById('searchButton').addEventListener('click', executeSearch);
    document.getElementById('refreshButton').addEventListener('click', loadDriveFiles);
});
