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
        client_id: "534160681000-2c5jtro940cnvd7on62jf022f52h8pfu.apps.googleusercontent.com",
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

            // Call listFiles after successful authentication
            if (gapiLoaded && gisLoaded) {
                listFiles();
            }
        }
    });
    gisLoaded = true;
    enableAuthButton();
}

// List files in Google Drive
function listFiles() {
    gapi.client.drive.files.list({
        'pageSize': 10, // Number of files to retrieve
        'fields': "nextPageToken, files(id, name)", // File ID and name
        'q': "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType='application/vnd.ms-excel'"
    }).then(function(response) {
        var files = response.result.files;
        if (files && files.length > 0) {
            console.log('Excel Files:');
            files.forEach(function(file) {
                console.log(file.name + ' (' + file.id + ')');
            });
        } else {
            console.log('No Excel files found.');
        }
    });
}


// Initialize everything when the page loads
document.addEventListener("DOMContentLoaded", () => {
    gapi.load("client", initializeGapiClient);
    initGis();
    document.getElementById("authButton").addEventListener("click", authenticate);
});
