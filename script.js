let uploadedFiles = [];
let fileData = {}; // To store the data read from the files
let gapiInited = false;
let gisInited = false;

function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        'apiKey': '743264679221-omplmhe5mj6vo37dbtk2dgj5vcfv6p4k.apps.googleusercontent.com',
        'discoveryDocs': ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    });
    gapiInited = true;
    maybeEnableButtons();
}

function gisLoaded() {
    gisInited = true;
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('authButton').disabled = false;
    }
}

async function authenticate() {
    const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: 'YOUR_CLIENT_ID',
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: (response) => {
            if (response.error !== undefined) {
                throw response;
            }
            listFiles();
        },
    });
    tokenClient.requestAccessToken({prompt: ''});
}

async function listFiles() {
    let response;
    try {
        response = await gapi.client.drive.files.list({
            'pageSize': 10,
            'fields': "nextPageToken, files(id, name)",
            'q': "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'"
        });
    } catch (err) {
        document.getElementById('resultContainer').innerHTML = '<div class="no-result">Error listing files.</div>';
        return;
    }
    const files = response.result.files;
    if (files && files.length > 0) {
        uploadedFiles = files;
        updateFileList();
    } else {
        document.getElementById('resultContainer').innerHTML = '<div class="no-result">No files found.</div>';
    }
}

function updateFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '<h3>Files from Google Drive:</h3>';
    uploadedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.classList.add('file-item');
        fileItem.textContent = `${index + 1}: ${file.name}`;
        fileList.appendChild(fileItem);
    });
}

async function readExcelFile(fileId, fileName) {
    let response;
    try {
        response = await gapi.client.drive.files.get({
            'fileId': fileId,
            'alt': 'media'
        }, {responseType: 'arraybuffer'});
    } catch (err) {
        document.getElementById('resultContainer').innerHTML = '<div class="no-result">Error reading file.</div>';
        return;
    }
    const data = new Uint8Array(response.body);
    const workbook = XLSX.read(data, {type: 'array'});
    let allData = [];
    workbook.SheetNames.forEach(sheetName => {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {header: 1});
        allData = allData.concat(rows);
    });
    fileData[fileName] = allData;
}

document.getElementById('authButton').addEventListener('click', authenticate);

document.getElementById('searchButton').addEventListener('click', async () => {
    const customerNumber = document.getElementById('searchInput').value.trim();
    const resultContainer = document.getElementById('resultContainer');
    resultContainer.innerHTML = '';

    if (uploadedFiles.length === 0) {
        resultContainer.innerHTML = '<div class="no-result">No files uploaded yet.</div>';
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
                        const date = excelDateToJSDate(cell);
                        return date.toLocaleDateString();
                    }
                    return cell;
                });
                const rowData = formattedRow.map(cell => `<span>${cell}</span>`).join(', ');
                resultContainer.innerHTML += `<div class="result">Customer ${customerNumber} found in ${file.name}: ${rowData}</div>`;
                found = true;
                break;
            }
        }
        if (found) break;
    }

    if (!found) {
        resultContainer.innerHTML = '<div class="no-result">Customer not found in any list.</div>';
    }
});

function excelDateToJSDate(excelDate) {
    const msPerDay = 86400000;
    const epoch = new Date(Date.UTC(1970, 0, 1));
    return new Date(epoch.getTime() + (excelDate - 25569) * msPerDay);
}
