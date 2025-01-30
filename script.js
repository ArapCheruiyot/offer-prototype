const CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID";
const API_KEY = "YOUR_GOOGLE_API_KEY";
const SCOPES = "https://www.googleapis.com/auth/drive.readonly";
let tokenClient;

// Load Google API
function initGoogleAPI() {
    gapi.load("client", () => {
        gapi.client.init({ apiKey: API_KEY, discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"] });
    });
}

// Authenticate User
document.getElementById("authButton").addEventListener("click", () => {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
            gapi.client.setToken(tokenResponse);
            alert("Authenticated! You can now search Excel files.");
        },
    });
    tokenClient.requestAccessToken();
});

// Search Excel Files in Google Drive
document.getElementById("searchButton").addEventListener("click", async () => {
    const searchTerm = document.getElementById("searchTerm").value.trim();
    if (!searchTerm) return alert("Enter a search term!");

    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "Searching...";
    
    try {
        const response = await gapi.client.drive.files.list({
            q: "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType='application/vnd.ms-excel'",
            fields: "files(id, name)"
        });

        const files = response.result.files;
        if (!files.length) return resultsDiv.innerHTML = "No Excel files found in Google Drive.";

        for (const file of files) {
            const found = await searchInExcelFile(file.id, searchTerm);
            if (found) {
                resultsDiv.innerHTML += `<p>✅ Found in: <b>${file.name}</b></p>`;
            }
        }
    } catch (error) {
        resultsDiv.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
    }
});

// Search within an Excel file
async function searchInExcelFile(fileId, searchTerm) {
    try {
        const fileResponse = await gapi.client.drive.files.get({ fileId, alt: "media" });
        const workbook = XLSX.read(fileResponse.body, { type: "binary" });

        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            for (const row of data) {
                if (row.includes(searchTerm)) return true;
            }
        }
    } catch (error) {
        console.error("Error reading file:", error);
    }
    return false;
}

// Initialize Google API
initGoogleAPI();
