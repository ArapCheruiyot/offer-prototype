// Google Drive API setup
const CLIENT_ID = '743264679221-omplmhe5mj6vo37dbtk2dgj5vcfv6p4k.apps.googleusercontent.com'; // Replace with your Google Cloud Client ID
const API_KEY = 'YOUR_API_KEY'; // Replace with your Google Cloud API Key
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

let gapiInited = false;

// Initialize gapi client
function gapiLoaded() {
  gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
  try {
    await gapi.client.init({
      apiKey: API_KEY,
      discoveryDocs: DISCOVERY_DOCS,
    });
    gapiInited = true;
    console.log('GAPI client initialized');
    maybeEnableButtons();
  } catch (error) {
    console.error('Error initializing GAPI client:', error);
  }
}

// Enable buttons once the API is initialized
function maybeEnableButtons() {
  if (gapiInited) {
    document.getElementById('authButton').disabled = false;
  }
}

// Handle authentication
async function handleAuthClick() {
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (resp) => {
      if (resp.error !== undefined) {
        console.error('Authentication error:', resp.error);
        return;
      }
      document.getElementById('authButton').style.display = 'none';
      document.getElementById('searchInput').disabled = false;
      document.getElementById('searchButton').disabled = false;
    },
  });

  tokenClient.requestAccessToken({ prompt: 'consent' });
}

// Fetch and read Excel file
async function fetchExcelFile(fileId) {
  try {
    const response = await gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media',
    });
    const arrayBuffer = await response.body.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    return workbook;
  } catch (error) {
    console.error('Error fetching Excel file:', error);
    return null;
  }
}

// Search for a value in the Excel file
function searchExcel(workbook, searchValue) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  for (let row of data) {
    if (row.includes(searchValue)) {
      return row;
    }
  }
  return null;
}

// Fetch all Excel files from Google Drive
async function fetchExcelFilesFromDrive() {
  if (!gapiInited) {
    console.error('Google API client is not initialized');
    return [];
  }

  let files = [];
  let pageToken = null;

  try {
    do {
      const response = await gapi.client.drive.files.list({
        q: "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'",
        fields: "nextPageToken, files(id, name)",
        pageToken: pageToken,
      });

      files = files.concat(response.result.files);
      pageToken = response.result.nextPageToken;
    } while (pageToken);
  } catch (error) {
    console.error('Error fetching files from Google Drive:', error);
  }

  return files;
}

// Handle search button click
document.getElementById('searchButton').addEventListener('click', async () => {
  const searchValue = document.getElementById('searchInput').value;
  if (!searchValue) return;

  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = 'Searching...';

  const files = await fetchExcelFilesFromDrive();
  let found = false;

  for (let file of files) {
    const workbook = await fetchExcelFile(file.id);
    if (workbook) {
      const result = searchExcel(workbook, searchValue);
      if (result) {
        resultsDiv.innerHTML = `<strong>Found in:</strong> ${file.name} - ${result.join(', ')}`;
        found = true;
        break; // Stop searching once found
      }
    }
  }

  if (!found) {
    resultsDiv.innerHTML = `<strong>Not Found:</strong> ${searchValue}`;
  }
});

// Initialize Google APIs
document.getElementById('authButton').addEventListener('click', handleAuthClick);
