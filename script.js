// Google API Client ID and API Key
const CLIENT_ID = "YOUR_CLIENT_ID.apps.googleusercontent.com";  // Replace with your actual Client ID
const API_KEY = "YOUR_API_KEY";  // Replace with your actual API Key

// Google Drive API scopes
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

let gapiInitialized = false;

// Load Google API and set up the client
function initializeGAPI() {
    gapi.load("client:auth2", async () => {
        try {
            await gapi.client.init({
                apiKey: API_KEY,
                clientId: CLIENT_ID,
                discoveryDocs: DISCOVERY_DOCS,
                scope: SCOPES,
            });
            gapiInitialized = true;
            console.log("Google API Initialized");
        } catch (error) {
            console.error("Error initializing Google API:", error);
        }
    });
}

// Ensure API is initialized before allowing authentication
async function handleAuthClick() {
    if (!gapiInitialized) {
        alert("Google API not initialized yet. Please wait a few seconds and try again.");
        return;
    }
    await gapi.auth2.getAuthInstance().signIn();
}

// Search for Excel files in Google Drive
async function searchFiles() {
    if (!gapiInitialized) {
        alert("Google API not initialized yet. Please wait a few seconds and try again.");
        return;
    }

    const query = document.getElementById("searchTerm").value;
    if (!query) {
        alert("Please enter a search term.");
        return;
    }

    try {
        const response = await gapi.client.drive.files.list({
            q: `name contains '${query}' and mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'`,
            fields: "files(id, name, webViewLink)",
        });

        displayResults(response.result.files);
    } catch (error) {
        console.error("Error searching files:", error);
        alert("An error occurred while searching. Check console for details.");
    }
}

// Display search results
function displayResults(files) {
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "<h3>Search Results:</h3>";

    if (files.length === 0) {
        resultsDiv.innerHTML += "<p>No matching files found.</p>";
        return;
    }

    files.forEach(file => {
        resultsDiv.innerHTML += `<p><a href="${file.webViewLink}" target="_blank">${file.name}</a></p>`;
    });
}

// Attach event listeners
document.getElementById("authButton").addEventListener("click", handleAuthClick);
document.getElementById("searchButton").addEventListener("click", searchFiles);

// Initialize the Google API when the page loads
window.onload = initializeGAPI;
