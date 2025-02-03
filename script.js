let uploadedFiles = []; // To store the list of files
let fileData = {}; // To store the data read from the files

// Step 1: Initialize Google API
function gapiLoaded() {
  gapi.load('client', initializeGapiClient);
}

// Step 2: Initialize the Google API client
async function initializeGapiClient() {
  try {
    await gapi.client.init({});
    // Explicitly load the Drive API client library
    await gapi.client.load('https://content.googleapis.com/discovery/v1/apis/drive/v3/rest');
    console.log('Google Drive API client initialized.');
  } catch (error) {
    console.error('Error initializing GAPI client:', error);
  }
}

// Step 3: Handle Google Authentication
function authenticate() {
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: 'YOUR_CLIENT_ID', // Replace with your OAuth client ID
    scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.metadata.readonly',
    callback: (response) => {
      if (response.error) {
        console.error('Authentication error:', response.error);
        return;
      }
      console.log('Authentication successful!');
      showUI(); // Show the file list and search box
      listFiles(); // List files after authentication
    },
  });
  tokenClient.requestAccessToken({ prompt: '' });
}

// ... rest of your existing code (showUI(), listFiles(), etc.)
