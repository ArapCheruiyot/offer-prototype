// script.js
const CLIENT_ID = '743264679221-omplmhe5mj6vo37dbtk2dgj5vcfv6p4k.apps.googleusercontent.com';
const API_KEY = 'YOUR_API_KEY';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

let gapiInited = false;
let gisInited = false;
let searchActive = false;

function gapiLoaded() {
  gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
  try {
    await gapi.client.init({ apiKey: API_KEY, discoveryDocs: DISCOVERY_DOCS });
    gapiInited = true;
    maybeEnableButtons();
  } catch (error) {
    console.error('Error initializing GAPI:', error);
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
    callback: async (resp) => {
      if (resp.error) {
        console.error('Auth error:', resp.error);
        return;
      }
      document.getElementById('authButton').style.display = 'none';
      document.getElementById('searchInput').disabled = false;
      document.getElementById('searchButton').disabled = false;
    }
  });
  tokenClient.requestAccessToken({ prompt: 'consent' });
}

async function searchAllFiles(searchValue) {
  searchActive = true;
  let nextPageToken = null;
  let found = false;

  do {
    const response = await gapi.client.drive.files.list({
      q: "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'",
      pageSize: 10,
      pageToken: nextPageToken || undefined,
      fields: 'nextPageToken, files(id, name)'
    });

    const files = response.result.files;
    nextPageToken = response.result.nextPageToken;

    for (const file of files) {
      if (!searchActive) break;
      
      updateProgress(`Searching in: ${file.name}`);
      try {
        const workbook = await fetchExcelFile(file.id);
        if (await searchExcel(workbook, searchValue)) {
          showResult(`Found in file: ${file.name}`, true);
          found = true;
        } else {
          showResult(`Not found in: ${file.name}`, false);
        }
      } catch (error) {
        showResult(`Error reading ${file.name}: ${error.message}`, false);
      }
    }

  } while (nextPageToken && searchActive && !found);

  if (!found) showResult('Value not found in any files', false);
  searchActive = false;
}

async function fetchExcelFile(fileId) {
  const response = await gapi.client.drive.files.get({ fileId, alt: 'media' });
  const arrayBuffer = await response.body.arrayBuffer();
  return XLSX.read(arrayBuffer, { type: 'array' });
}

async function searchExcel(workbook, searchValue) {
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    for (const row of data) {
      if (row.some(cell => cell.toString().includes(searchValue))) {
        return true;
      }
    }
  }
  return false;
}

function updateProgress(message) {
  document.getElementById('progress').textContent = message;
}

function showResult(message, isFound) {
  const resultDiv = document.createElement('div');
  resultDiv.textContent = message;
  resultDiv.className = isFound ? 'found' : 'not-found';
  document.getElementById('results').appendChild(resultDiv);
}

document.getElementById('searchButton').addEventListener('click', () => {
  const searchValue = document.getElementById('searchInput').value.trim();
  if (!searchValue) return;
  
  document.getElementById('results').innerHTML = '';
  searchAllFiles(searchValue);
});

document.getElementById('authButton').addEventListener('click', handleAuthClick);
