const CLIENT_ID = "743264679221-omplmhe5mj6vo37dbtk2dgj5vcfv6p4k.apps.googleusercontent.com";
const API_KEY = "YOUR_GOOGLE_API_KEY";  // 🔴 Replace with your real API Key
const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

let tokenClient;
let gapiInitialized = false;

// ✅ Step 1: Initialize Google API
function initGoogleAPI() {
    console.log("⏳ Initializing Google API...");
    gapi.load("client:auth2", async () => {
        try {
            await gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
            });
            gapiInitialized = true;
            console.log("✅ Google API Initialized Successfully");
        } catch (error) {
            console.error("❌ Google API Initialization Failed:", error);
        }
    });
}

// ✅ Step 2: Authenticate User
document.getElementById("authButton").addEventListener("click", () => {
    if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
                gapi.client.setToken(tokenResponse);
                console.log("✅ Authentication Successful");
                alert("Authenticated! You can now search Excel files.");
            },
        });
    }
    tokenClient.requestAccessToken();
});

// ✅ Step 3: Search Google Drive for Excel Files
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
        console.log("🔎 Searching for Excel files in Google Drive...");
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
            resultsDiv.innerHTML = "<p>No Excel files found in your Google Drive.</p>";
            console.log("❌ No Excel files found.");
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

            console.log(`📂 Found file: ${file.name} (ID: ${file.id})`);

            // ✅ Step 4: Read the file and search for the term
            await searchInExcelFile(file.id, searchTerm);
        }
    } catch (error) {
        console.error("❌ Error searching files:", error);
        alert("Error searching for files. Check console for details.");
    }
});

// ✅ Step 4: Open & Search Inside Each Excel File
async function searchInExcelFile(fileId, searchTerm) {
    try {
        console.log(`📖 Opening file ${fileId} to search for "${searchTerm}"...`);

        // Step 4.1: Download the file content as text
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: "media",
        });

        // Step 4.2: Extract file content
        const fileContent = response.body;
        console.log("📄 File Content Loaded:", fileContent.substring(0, 500)); // Show only first 500 characters

        // Step 4.3: Search for the term in the file content
        if (fileContent.includes(searchTerm)) {
            alert(`✅ Match found in file: ${fileId}`);
   
