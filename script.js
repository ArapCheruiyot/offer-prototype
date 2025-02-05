let tokenClient;
let gapiInited = false;
let gisInited = false;

// Client ID and API key from the Developer Console
const CLIENT_ID = '534160681000-2c5jtro940cnvd7on62jf022f52h8pfu.apps.googleusercontent.com';
const API_KEY = 'YOUR_API_KEY';

// Array of API discovery doc URLs for APIs used by the script
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

function gapiLoaded() {
  gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
  await gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: DISCOVERY_DOCS,
  });
  gapiInited = true;
  maybeEnableButtons();
}

function gisLoaded() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: '', // defined later
  });
  gisInited = true;
  maybeEnableButtons();
}

function maybeEnableButtons() {
  if (gapiInited && gisInited) {
    document.getElementById('authButton').disabled = false;
  }
}

document.getElementById('authButton').addEventListener('click', () => {
  tokenClient.callback = async (resp) => {
    if (resp.error !== undefined) {
      throw (resp);
    }
    document.getElementById('authButton').style.display = 'none';
    document.getElementById('fileList').classList.remove('hidden');
    await listFiles();
  };

  if (gapi.client.getToken() === null) {
    // Prompt the user to select a Google Account and ask for consent to share their data
    tokenClient.requestAccessToken({prompt: 'consent'});
  } else {
    // Skip display of account chooser and consent dialog for an existing token
    tokenClient.requestAccessToken({prompt: ''});
  }
});

async function listFiles() {
  let response;
  try {
    response = await gapi.client.drive.files.list({
      'pageSize': 10,
      'fields': 'files(id, name)',
    });
  } catch (err) {
    console.log(err.message);
    return;
  }
  const files = response.result.files;
  if (files && files.length > 0) {
    const fileList = document.getElementById('fileListUl');
    fileList.innerHTML = '';
    files.forEach((file) => {
      const li = document.createElement('li');
      li.textContent = `${file.name} (${file.id})`;
      fileList.appendChild(li);
    });
  } else {
    console.log('No files found.');
  }
}

document.getElementById('searchButton').addEventListener('click', async () => {
  const searchInput = document.getElementById('searchInput').value.trim();
  const response = await gapi.client.drive.files.list({
    'pageSize': 10,
    'fields': 'files(id, name)',
  });
  const resultContainer = document.getElementById('resultContainer');
  resultContainer.innerHTML = '';

  for (const file of response.result.files) {
    const fileResponse = await gapi.client.drive.files.get({
      fileId: file.id,
      alt: 'media',
    });
    const data = new Uint8Array(fileResponse.body);
    const workbook = XLSX.read(data, {type: 'array'});
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet);

    const found = json.find(row => row.CustomerNumber === searchInput
