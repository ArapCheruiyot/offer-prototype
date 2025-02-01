// script.js (Updated Version)
const CLIENT_ID = '743264679221-omplmhe5mj6vo37dbtk2dgj5vcfv6p4k.apps.googleusercontent.com';
const API_KEY = 'YOUR_API_KEY';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

let gapiInited = false;
let gisInited = false;
let searchActive = false;
let accessToken = null; // Track access token

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
    showResult('Failed to initialize Google API', false);
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
        showResult('Authentication failed', false);
        return;
      }
      accessToken = resp.access_token; // Store access token
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
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const arrayBuffer = await response.arrayBuffer();
    return XLSX.read(arrayBuffer, { type: 'array' });
  } catch (error) {
    console.error('File fetch error:', error);
    showResult(`Failed to read file: ${error.message}`, false);
    return null;
  }
}

// ================== Search Logic ==================
function searchExcel(workbook, searchValue) {
  try {
    const searchString = searchValue.toString().toLowerCase();
    
    return workbook.SheetNames.some(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      return data.some(row => 
        row.some(cell => 
          String(cell).toLowerCase().includes(searchString)
        )
      );
    });
  } catch (error) {
    console.error('Search error:', error);
    return false;
  }
}

// ================== Main Search Function ==================
async function searchAllFiles(searchValue) {
  if (!searchValue.trim()) return;
  
  searchActive = true;
  document.getElementById('results').innerHTML = '';
  showResult('Starting search...', true);
  
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
        
        if (workbook) {
          if (searchExcel(workbook, searchValue)) {
            showResult(`✅ Found in: ${file.name}`, true);
            found = true;
            break;
          } else {
            showResult(`❌ Not found in: ${file.name}`, false);
          }
        }
      }
    } while (nextPageToken && searchActive && !found);

    if (!found) showResult('🔍 Value not found in any files', false);
  } catch (error) {
    console.error('Search failed:', error);
    showResult(`❌ Search failed: ${error.message}`, false);
  }
  searchActive = false;
}

// ================== UI Helpers ==================
function updateProgress(message) {
  const progress = document.getElementById('progress');
  progress.textContent = message;
  progress.scrollIntoView({ behavior: 'smooth' });
}

function showResult(message, isFound) {
  const resultsDiv = document.getElementById('results');
  const div = document.createElement('div');
  div.className = isFound ? 'found' : 'not-found';
  div.innerHTML = message;
  resultsDiv.appendChild(div);
  div.scrollIntoView({ behavior: 'smooth' });
}

// ================== Event Listeners ==================
document.getElementById('searchButton').addEventListener('click', () => {
  const searchValue = document.getElementById('searchInput').value.trim();
  if (searchValue) searchAllFiles(searchValue);
});

document.getElementById('authButton').addEventListener('click', handleAuthClick);
