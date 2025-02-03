let uploadedFiles = [];
let fileData = {};
let gapiInited = false;
let gisInited = false;

// Google Drive API initialization
function initializeGapiClient() {
    return gapi.client.init({})
        .then(() => gapi.client.load('https://content.googleapis.com/discovery/v1/apis/drive/v3/rest'))
        .then(() => {
            gapiInited = true;
            maybeEnableButtons();
        });
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('authButton').disabled = false;
    }
}

// Authentication
function authenticate() {
    const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: '743264679221-omplmhe5mj6vo37dbtk2dgj5vcfv6p4k.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: async (response) => {
            if (response.error) return;
            document.getElementById('refreshButton').classList.remove('hidden');
            await listDriveFiles();
        },
    });
    tokenClient.requestAccessToken({ prompt: '' });
}

// List Google Drive files
async function listDriveFiles() {
    try {
        const response = await gapi.client.drive.files.list({
            q: "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'",
            fields: 'files(id,name)'
        });
        
        uploadedFiles = response.result.files;
        updateFileList();
        document.getElementById('fileList').classList.remove('hidden');
    } catch (error) {
        console.error('Error listing files:', error);
    }
}

// Read Excel file from Google Drive
async function readExcelFile(fileId, fileName) {
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
    }
}

// Search functionality
document.getElementById('searchButton').addEventListener('click', async () => {
    const customerNumber = document.getElementById('searchInput').value.trim();
    const resultContainer = document.getElementById('resultContainer');
    resultContainer.innerHTML = '';

    if (!customerNumber) {
        resultContainer.innerHTML = '<div class="no-result">Please enter a customer number</div>';
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
                        return new Date((cell - 25569) * 86400000).toLocaleDateString();
                    }
                    return cell;
                });
                
                resultContainer.innerHTML += `
                    <div class="result">
                        Customer ${customerNumber} found in ${file.name}: 
                        ${formattedRow.join(', ')}
                    </div>`;
                found = true;
                break;
            }
        }
        if (found) break;
    }

    if (!found) {
        resultContainer.innerHTML = '<div class="no-result">Customer not found</div>';
    }
});

// File list management
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    gisInited = true;
    gapi.load('client', initializeGapiClient);
    document.getElementById('authButton').addEventListener('click', authenticate);
    document.getElementById('refreshButton').addEventListener('click', listDriveFiles);
});
