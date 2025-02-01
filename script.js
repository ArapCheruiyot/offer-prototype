// Google Drive API setup
const CLIENT_ID = '743264679221-omplmhe5mj6vo37dbtk2dgj5vcfv6p4k.apps.googleusercontent.com'; // Replace with your Google Cloud Client ID
const API_KEY = 'YOUR_API_KEY'; // Replace with your Google Cloud API Key
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

let gapiInited = false;
let gisInited = false;

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
    maybeEnableButtons();
  } catch (error) {
    console.error('Error initializing GAPI client:', error);
  }
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

// Handle search button click
document.getElementById('searchButton').addEventListener('click', async () => {
  const searchValue = document.getElementById('searchInput').value;
  if (!searchValue) return;

  const fileId = 'YOUR_EXCEL_FILE_ID'; // Replace with your Excel file ID from Google Drive
  const workbook = await fetchExcelFile(fileId);

  if (workbook) {
    const result = searchExcel(workbook, searchValue);
    const resultsDiv = document.getElementById('results');
    if (result) {
      resultsDiv.innerHTML = `<strong>Found:</strong> ${result.join(', ')}`;
    } else {
      resultsDiv.innerHTML = `<strong>Not Found:</strong> ${searchValue}`;
    }
  } else {
    console.error('Failed to load workbook.');
  }
});

// Initialize Google APIs
document.getElementById('authButton').addEventListener('click', handleAuthClick);
