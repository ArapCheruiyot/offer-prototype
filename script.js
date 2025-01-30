const CLIENT_ID = "743264679221-omplmhe5mj6vo37dbtk2dgj5vcfv6p4k.apps.googleusercontent.com";
const API_KEY = "YOUR_GOOGLE_API_KEY";
const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

let tokenClient;

// Initialize Google API
function initGoogleAPI() {
    gapi.load("client", async () => {
        await gapi.client.init({ apiKey: API_KEY, discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"] });
        console.log("Google API Initialized");
    });
}

// Authenticate User
document.getElementById("authButton").addEventListener("click", () => {
    if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({  // ✅ Fix: Ensure GIS library loads
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
