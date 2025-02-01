const CLIENT_ID = '743264679221-omplmhe5mj6vo37dbtk2dgj5vcfv6p4k.apps.googleusercontent.com';
const API_KEY = 'YOUR_API_KEY';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

let gapiInited = false;
let gisInited = false;
let searchActive = false;

// ================== Google API Initialization ==================
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
    console.error('GAPI init error:', error);
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

// ================== Authentication ==================
async function handleAuthClick() {
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (resp) => {
      if (resp.error) {
        console.error('Auth error:', resp);
        return;
      }
      document.getElementById('authButton').style.display = 'none';
      document.getElementById('searchInput').disabled = false;
      document.getElementById('searchButton').disabled = false;
    }
  });
  tokenClient.requestAccessToken({ prompt: 'consent' });
}

// ================== File Handling ==================
async function fetchExcelFile(fileId) {
  try {
    const response = await gapi.client.request({
      path: `/drive/v3/files/${fileId}`,
      method: 'GET',
      params: { alt: 'media' },
      responseType: 'arraybuffer'
    });

    return XLSX.read(new Uint8Array(response.body), { type: 'array' });
  } catch (error) {
    console.error('File fetch error:', error);
    return null;
  }
}

// ================== Search Logic ==================
async function searchExcel(workbook, searchValue) {
  try {
    return workbook.SheetNames.some(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      return data.some(row => row.some(cell => 
        String(cell).includes(searchValue)
      ));
    });
  } catch (error) {
    console.error('Search error:', error);
    return false;
  }
}

// ================== Main Search Function ==================
async function searchAllFiles(searchValue) {
  searchActive = true;
  document.getElementById('results').innerHTML = '';
  
  try {
    let nextPageToken = null;
    let found = false;

    do {
      const response = await gapi.client.drive.files.list({
        q: "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'",
        pageSize: 10,
        pageToken: nextPageToken,
        fields: 'nextPageToken, files(id, name)'
      });

      const files = response.result.files;
      nextPageToken = response.result.nextPageToken;

      for (const file of files) {
        if (!searchActive) break;
        
        updateProgress(`Searching: ${file.name}`);
        const workbook = await fetchExcelFile(file.id);
        if (workbook && await searchExcel(workbook, searchValue)) {
          showResult(`FOUND in ${file.name}`, true);
          found = true;
          break;
        }
      }
    } while (nextPageToken && searchActive && !found);

    if (!found) showResult('Value not found in any files', false);
  } catch (error) {
    console.error('Search failed:', error);
    showResult('Search failed due to error', false);
  }
  searchActive = false;
}

// ================== UI Helpers ==================
function updateProgress(message) {
  document.getElementById('progress').textContent = message;
}

function showResult(message, isFound) {
  const div = document.createElement('div');
  div.className = isFound ? 'found' : 'not-found';
  div.textContent = message;
  document.getElementById('results').appendChild(div);
}

// ================== Event Listeners ==================
document.getElementById('searchButton').addEventListener('click', () => {
  const searchValue = document.getElementById('searchInput').value.trim();
  if (searchValue) searchAllFiles(searchValue);
});

document.getElementById('authButton').addEventListener('click', handleAuthClick);
