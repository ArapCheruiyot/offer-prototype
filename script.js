let tokenClient;
let gapiLoaded = false;
let gisLoaded = false;

// Load the Google API client
function initializeGapiClient() {
    gapi.client.init({}).then(() => {
        gapi.client.load('https://content.googleapis.com/discovery/v1/apis/drive/v3/rest')
            .then(() => {
                gapiLoaded = true;
                enableAuthButton();
            })
            .catch(error => console.error("Error loading Google Drive API:", error));
    });
}

// Enable authentication button when APIs are ready
function enableAuthButton() {
    if (gapiLoaded && gisLoaded) {
        document.getElementById("authButton").disabled = false;
    }
}

// Handle Google OAuth authentication
function authenticate() {
    tokenClient.requestAccessToken();
}

// Initialize Google Identity Services (GIS) OAuth 2.0
function initGis() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: "YOUR_CLIENT_ID",
        scope: "https://www.googleapis.com/auth/drive.readonly",
        callback: (response) => {
            if (response.error) {
                console.error("Authentication failed:", response);
                alert("Authentication failed! Please try again.");
                return;
            }
            
            console.log("Authentication successful!");
            document.getElementById("authButton").textContent = "Authenticated";
            document.getElementById("authButton").disabled = true;

            // Show success message
            const messageDiv = document.createElement("div");
            messageDiv.id = "successMessage";
            messageDiv.textContent = "✅ Login Successful!";
            messageDiv.style.color = "green";
            messageDiv.style.marginTop = "10px";

            document.querySelector(".container").appendChild(messageDiv);
        }
    });
    gisLoaded = true;
    enableAuthButton();
}

// Initialize everything when the page loads
document.addEventListener("DOMContentLoaded", () => {
    gapi.load("client", initializeGapiClient);
    initGis();
    document.getElementById("authButton").addEventListener("click", authenticate);
});
