// Load the Google API client library
function loadGapiClient() {
    gapi.load('client:auth2', initClient);
}

// Initialize the Google API client library
function initClient() {
    gapi.client.init({
        apiKey: 'YOUR_API_KEY',
        clientId: 'YOUR_CLIENT_ID',
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        scope: 'https://www.googleapis.com/auth/drive.readonly'
    }).then(() => {
        // Handle the initial sign-in state.
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());

        // Attach sign-in handler to button.
        document.getElementById('authButton').onclick = handleAuthClick;
    });
}

// Update the UI based on sign-in status
function updateSigninStatus(isSignedIn) {
    const statusMessage = document.getElementById('resultContainer');
    if (isSignedIn) {
        // User is signed in.
        statusMessage.innerHTML = 'Authentication successful!';
    } else {
        // User is not signed in.
        statusMessage.innerHTML = 'Please sign in to authenticate.';
    }
}

// Handle the sign-in button click
function handleAuthClick(event) {
    gapi.auth2.getAuthInstance().signIn().then(() => {
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    });
}

// Load the API client and auth library
gapi.load('client:auth2', loadGapiClient);
