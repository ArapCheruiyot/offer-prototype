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
            });
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

            // List Excel files
            listExcelFiles();
        }
    });
    gisLoaded = true;
    enableAuthButton();
}

// List Excel files in the user's Google Drive
function listExcelFiles() {
    gapi.client.drive.files.list({
        'pageSize': 10,
        'fields': 'nextPageToken, files(id, name, mimeType)',
        'q': "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType='application/vnd.ms-excel'"
    }).then((response) => {
        const files = response.result.files;
        const fileListUl = document.getElementById('fileListUl');
        fileListUl.innerHTML = '';

        if (files && files.length > 0) {
            files.forEach((file) => {
                const li = document.createElement('li');
                li.textContent = `${file.name} (${file.id})`;
                fileListUl.appendChild(li);
            });
        } else {
            fileListUl.innerHTML = 'No Excel files found.';
        }
    });
}

// Initialize everything when the page loads
document.addEventListener("DOMContentLoaded", () => {
    gapi.load("client", initializeGapiClient);
    initGis();
    document.getElementById("authButton").addEventListener("click", authenticate);
});
