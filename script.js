const CLIENT_ID = "743264679221-omplmhe5mj6vo37dbtk2dgj5vcfv6p4k.apps.googleusercontent.com";
const API_KEY = "YOUR_GOOGLE_API_KEY";
const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

let tokenClient;
let gapiInitialized = false;

// Initialize Google API
function initGoogleAPI() {
    console.log("Initializing Google API...");
    gapi.load("client:auth2", () => {
        gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
        }).then(() => {
            gapiInitialized = true;
            console.log("Google API Initialized ✅");
        }).catch(error => {
            console.error("Error initializing Google API:", error);
        });
    });
}

// Authenticate User
document.getElementById("authButton").addEventListener("click", () => {
    if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
                gapi.client.setToken(tokenResponse);
                alert("Authenticated! You can now search Excel files.");
            },
        });
    }
    tokenClient.requestAccessToken();
});

// Search Google Drive for Excel Files and Open Them
document.getElementById("searchButton").addEventListener("click", async () => {
    if (!gapiInitialized) {
        alert("Google API not initialized yet. Please wait a few seconds and try again.");
        return;
    }

    const searchTerm = document.getElementById("searchTerm").value.trim();
    if (!searchTerm) {
        alert("Please enter a search term.");
        return;
    }

    try {
        console.log("Searching for Excel files...");
        const response = await gapi.client.drive.files.list({
            q: "(mimeType='application/vnd.ms-excel' or mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType='text/csv')",
            fields: "files(id, name, webViewLink)",
            spaces: "drive",
            pageSize: 10,
        });

        const files = response.result.files;
        const resultsDiv = document.getElementById("results");
        resultsDiv.innerHTML = ""; // Clear previous results

        if (!files || files.length === 0) {
            resultsDiv.innerHTML = "<p>No Excel files found in your Drive.</p>";
            return;
        }

        resultsDiv.innerHTML = "<h3>Matching Excel Files:</h3>";
        for (const file of files) {
            const fileLink = document.createElement("a");
            fileLink.href = file.webViewLink;
            fileLink.textContent = file.name;
            fileLink.target = "_blank";
            resultsDiv.appendChild(fileLink);
            resultsDiv.appendChild(document.createElement("br"));

            // Now read file contents and search for term
            await searchIn
