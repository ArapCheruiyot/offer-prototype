const CLIENT_ID = "743264679221-omplmhe5mj6vo37dbtk2dgj5vcfv6p4k.apps.googleusercontent.com";
const API_KEY = "YOUR_GOOGLE_API_KEY";  // Replace with your actual API Key
const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

let tokenClient;
let gapiInitialized = false;

// Initialize Google API
function initGoogleAPI() {
    console.log("Initializing Google API...");
    gapi.load("client:auth2", async () => {
        try {
            await gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
            });
            gapiInitialized = true;
            console.log("Google API Initialized");
        } catch (error) {
            console.error("Error initializing Google API:", error);
        }
    });
}

// Authenticate User
document.getElementById("authButton").addEventListener("click", () => {
    if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
                console.log("Authentication Successful:", tokenResponse);
                gapi.client.setToken(tokenResponse);
                alert("Authenticated! You can now search Excel files.");
            },
        });
    }
    tokenClient.requestAccessToken();
});

// Search Google Drive for Excel Files
document.getElementById("searchButton").addEventListener("click", async () => {
    console.log("Search button clicked");

    // Check if API is initialized and user is authenticated
    if (!gapiInitialized) {
        alert("Google API not initialized yet. Try again in a few seconds.");
        return;
    }

    const searchTerm = document.getElementById("searchTerm").value.trim();
    if (!searchTerm) {
        alert("Please enter a search term.");
        return;
    }

    console.log("Searching for files containing:", searchTerm);

    try {
        // Make the API request
        const response = await gapi.client.drive.files.list({
            q: `name contains '${searchTerm}' and (mimeType='application/vnd.ms-excel' or mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType='text/csv')`,
            fields: "files(id, name, webViewLink)",
            spaces: "drive",
            pageSize: 10,
        });

        console.log("Drive API response:", response);

        const files = response.result.files;
        const resultsDiv = document.getElementById("results");
        resultsDiv.innerHTML = ""; // Clear previous results

        if (!files || files.length === 0) {
            resultsDiv.innerHTML = "<p>No matching Excel files found.</p>";
            return;
        }

        files.forEach(file => {
            const link = document.createElement("a");
            link.href = file.webViewLink;
            link.textContent = file.name;
            link.target = "_blank";
            resultsDiv.appendChild(link);
            resultsDiv.appendChild(document.createElement("br"));
        });

    } catch (error) {
        console.error("Error searching files:", error);
        alert("Error searching for files. Check the console for details.");
    }
});
