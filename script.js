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

// Search Google Drive for Excel Files and Parse them
document.getElementById("searchButton").addEventListener("click", async () => {
    console.log("Search button clicked");

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
        const response = await gapi.client.drive.files.list({
            q: `mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType='application/vnd.ms-excel'`,
            fields: "files(id, name)",
            spaces: "drive",
            pageSize: 10,
        });

        const files = response.result.files;
        const resultsDiv = document.getElementById("results");
        resultsDiv.innerHTML = ""; // Clear previous results

        if (!files || files.length === 0) {
            resultsDiv.innerHTML = "<p>No Excel files found in Google Drive.</p>";
            return;
        }

        let recordFound = false;
        let foundInFiles = [];

        for (const file of files) {
            console.log("Checking file:", file.name);
            const fileContent = await fetchFileContent(file.id);

            if (fileContent) {
                const found = searchInExcel(fileContent, searchTerm);
                if (found) {
                    recordFound = true;
                    foundInFiles.push(file.name);
                }
            }
        }

        // Display results
        if (recordFound) {
            resultsDiv.innerHTML = `<p>Record found in the following files:</p><ul>`;
            foundInFiles.forEach(fileName => {
                resultsDiv.innerHTML += `<li>${fileName}</li>`;
            });
            resultsDiv.innerHTML += `</ul>`;
        } else {
            resultsDiv.innerHTML = `<p>No matching records found in any Excel files.</p>`;
        }

    } catch (error) {
        console.error("Error searching files:", error);
        alert("Error searching for files. Check the console for details.");
    }
});

// Fetch the file content from Google Drive
async function fetchFileContent(fileId) {
    try {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: "media",
        });

        return response.body;
    } catch (error) {
        console.error("Error fetching file content:", error);
        return null;
    }
}

// Search for a record in the Excel file
function searchInExcel(fileContent, searchTerm) {
    try {
        const workbook = XLSX.read(fileContent, { type: "binary" });
        let found = false;

        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            for (let row of data) {
                if (row.some(cell => cell && cell.toString().includes(searchTerm))) {
                    found = true;
                }
            }
        });

        return found;
    } catch (error) {
        console.error("Error parsing Excel file:", error);
        return false;
    }
}
