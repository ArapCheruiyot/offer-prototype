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

// List files from Google Drive
async function listFiles(query = "") {
  try {
    const response = await gapi.client.drive.files.list({
      pageSize: 10,
      fields: "files(id, name)",
      q: `mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' and name contains '${query}'`
    });
    uploadedFiles = response.result.files;
    displayFiles(uploadedFiles);
  } catch (error) {
    console.error('Error listing files:', error);
  }
}

// Function to search files based on the entered query
function searchFiles() {
  const query = document.getElementById('searchBox').value; // Get the search query
  if (query) {
    listFiles(query); // Pass the query to listFiles
  } else {
    alert('Please enter a search term');
  }
}

// Display files in the UI
function displayFiles(files) {
  const filesContainer = document.getElementById('files');
  filesContainer.innerHTML = files.map((file, index) => `
    <div class="file-item">${index + 1}: ${file.name}</div>
  `).join('');
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
