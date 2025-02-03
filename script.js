let uploadedFiles = [];
let fileData = {};
let gapiInited = false;
let gisInited = false;

// Include the XLSX library
if (typeof XLSX === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.1/xlsx.full.min.js';
    document.head.appendChild(script);
}

// Initialize Google API client
function initializeGapiClient() {
  return new Promise(async (resolve) => {
    await gapi.client.init({});
    await gapi.client.load('https://content.googleapis.com/discovery/v1/apis/drive/v3/rest');
    gapiInited = true;
    maybeEnableButtons();
    resolve();
  });
}

// Check if both clients are initialized
function maybeEnableButtons() {
  if (gapiInited && gisInited) {
    document.getElementById('authButton').disabled = false;
  }
}

// Authenticate the user
function authenticate() {
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: '743264679221-omplmhe5mj6vo37dbtk2dgj5vcfv6p4k.apps.googleusercontent.com',
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    callback: (response) => {
      if (response.error) {
        console.error('Authentication error:', response.error);
        return;
      }
      showUI();
      listFiles();
    },
  });
  tokenClient.requestAccessToken({ prompt: '' });
}

// Show UI elements after authentication
function showUI() {
  document.getElementById('fileList').classList.remove('hidden');
  document.getElementById('searchBox').classList.remove('hidden');
}

// List files from Google Drive
async function listFiles() {
  try {
    const response = await gapi.client.drive.files.list({
      pageSize: 10,
      fields: "files(id, name)",
      q: "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'"
    });
    uploadedFiles = response.result.files;
    displayFiles(uploadedFiles);
  } catch (error) {
    console.error('Error listing files:', error);
  }
}

// Display files in the UI
function displayFiles(files) {
  const filesContainer = document.getElementById('files');
  filesContainer.innerHTML = files.map((file, index) => `
    <div class="file-item">${index + 1}: ${file.name}</div>
  `).join('');
}

// Read Excel file content
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
    fileData[fileName] = allData; // Store parsed data
  } catch (error) {
    console.error('Error reading file:', error);
  }
}

// Handle search functionality
async function searchFiles() {
  const customerNumber = document.getElementById('searchInput').value.trim();
  const resultContainer = document.getElementById('resultContainer');
  resultContainer.innerHTML = ''; // Clear previous results

  if (!customerNumber) {
    alert('Please enter a customer number.');
    return;
  }

  let found = false;
  for (const file of uploadedFiles) {
    await readExcelFile(file.id, file.name); // Read file content
    const data = fileData[file.name];
    if (data && Array.isArray(data)) {
      for (const row of data) {
        if (row.some(cell => String(cell).trim() === customerNumber)) {
          const formattedRow = row.map(cell => {
            if (typeof cell === 'number' && cell > 25568) { // Check for Excel date
              const date = excelDateToJSDate(cell);
              return date.toLocaleDateString();
            }
            return cell;
          });
          const rowData = formattedRow.join(', ');
          resultContainer.innerHTML += `<div class="result">Found in ${file.name}: ${rowData}</div>`;
          found = true;
          break;
        }
      }
    } else {
      console.error('No valid data found in file:', file.name);
    }
    if (found) break; // Stop searching if found
  }

  if (!found) {
    resultContainer.innerHTML = '<div class="no-result">Customer not found.</div>';
  }
}

// Convert Excel date to JS Date
function excelDateToJSDate(excelDate) {
  const msPerDay = 86400000;
  const epoch = new Date(Date.UTC(1970, 0, 1));
  return new Date(epoch.getTime() + (excelDate - 25569) * msPerDay);
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  gisInited = true;
  maybeEnableButtons();
  gapi.load('client', initializeGapiClient);
  document.getElementById('authButton').addEventListener('click', authenticate);
  document.getElementById('searchButton').addEventListener('click', searchFiles);
});
