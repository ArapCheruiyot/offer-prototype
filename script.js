let uploadedFiles = [];
let fileData = {};
let gapiInited = false;
let gisInited = false;

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
      listFiles(); // Call listFiles after authentication
    },
  });
  tokenClient.requestAccessToken({ prompt: '' });
}

// Show UI elements after authentication
function showUI() {
  document.getElementById('fileList').classList.remove('hidden');
  document.getElementById('searchBox').classList.remove('hidden');
}

// List files from Google Drive based on search query
async function listFiles(query = "") {
  try {
    const response = await gapi.client.drive.files.list({
      pageSize: 10,
      fields: "files(id, name)",
      q: `mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' and lower(name) contains '${query.toLowerCase()}'`
    });

    if (response.result.files.length === 0) {
      alert('No files found with the provided search term.');
    }

    uploadedFiles = response.result.files;
    displayFiles(uploadedFiles);
  } catch (error) {
    console.error('Error listing files:', error);
  }
}

// Function to search files based on the entered query
function searchFiles() {
  const searchTerm = document.getElementById('searchInput').value.trim(); // Get the search term from the input box
  console.log('Search term:', searchTerm); // Debugging log

  // Ensure the search term is not empty
  if (!searchTerm) {
    alert('Please enter a search term');
    return;
  }

  // Pass the search term to listFiles
  listFiles(searchTerm);
}

// Display files in the UI
function displayFiles(files) {
  const filesContainer = document.getElementById('files');
  filesContainer.innerHTML = files.map((file, index) => `
    <div class="file-item" onclick="downloadFileContent('${file.id}', '${file.name}')">${index + 1}: ${file.name}</div>
  `).join('');
}

// Download and read content of an Excel file
async function downloadFileContent(fileId, fileName) {
  try {
    // Fetch the file content
    const response = await gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media',
    });

    const fileContent = response.body;
    const file = new Blob([fileContent]);
    
    // Use xlsx to read the content of the Excel file
    const reader = new FileReader();
    reader.onload = function(e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Assume that the file has a single sheet
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      // Search for the record in the rows
      const searchTerm = document.getElementById('searchInput').value.trim();
      let found = false;

      rows.forEach((row, index) => {
        if (Object.values(row).includes(searchTerm)) {
          found = true;
          alert(`Found in file: ${fileName}\nRow: ${JSON.stringify(row)}`);
          return; // Stop searching after finding the record
        }
      });

      if (!found) {
        alert(`Record not found in file: ${fileName}`);
      }
    };
    reader.readAsArrayBuffer(file);
  } catch (error) {
    console.error('Error downloading file:', error);
  }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize GIS (no explicit initialization needed)
  gisInited = true;
  maybeEnableButtons();

  // Initialize GAPI
  gapi.load('client', initializeGapiClient);

  // Add event listeners
  document.getElementById('authButton').addEventListener('click', authenticate);
  document.getElementById('searchButton').addEventListener('click', searchFiles);
});
