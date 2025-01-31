const CLIENT_ID = "743264679221-omplmhe5mj6vo37dbtk2dgj5vcfv6p4k.apps.googleusercontent.com";
const API_KEY = "YOUR_GOOGLE_API_KEY";  // Replace with your real API Key
const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

let tokenClient;
let gapiInitialized = false;

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

// ✅ Authenticate User
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

// ✅ Search for Excel Files in Google Drive
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
            q: "(mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType='application/vnd.ms-excel')",
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
            console.log(`📂 Found file: ${file.name} (ID: ${file.id})`);
            await searchInExcelFile(file.id, searchTerm);
        }
    } catch (error) {
        console.error("❌ Error searching files:", error);
        alert("Error searching for files. Check console for details.");
    }
});

// ✅ Read and Search Inside Each Excel File
async function searchInExcelFile(fileId, searchTerm) {
    try {
        console.log(`📖 Downloading file ${fileId}...`);

        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: "media",
        });

        const fileContent = response.body;  // This is the raw binary data
        console.log("📄 File Content Loaded:", fileContent.substring(0, 500)); // Show preview

        // Convert file content to a Workbook (Using SheetJS - xlsx.js)
        const workbook = XLSX.read(fileContent, { type: "binary" });
        
        let found = false;
        let resultHTML = "";

        // Loop through each sheet
        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            // Loop through rows to find matching search term
            jsonData.forEach((row, index) => {
                if (row.some(cell => cell && cell.toString().includes(searchTerm))) {
                    found = true;
                    resultHTML += `<p>Match found in <b>${sheetName}</b> at row ${index + 1}: ${row.join(" | ")}</p>`;
                }
            });
        });

        // Display the results
        const resultsDiv = document.getElementById("results");
        if (found) {
            resultsDiv.innerHTML += `<h4>✅ Matches found in file: <a href="https://drive.google.com/open?id=${fileId}" target="_blank">${fileId}</a></h4>` + resultHTML;
        } else {
            resultsDiv.innerHTML += `<h4>❌ No matches found in file: ${fileId}</h4>`;
        }

    } catch (error) {
        console.error(`❌ Error reading file ${fileId}:`, error);
        alert(`Error reading file: ${fileId}. Check console for details.`);
    }
}
