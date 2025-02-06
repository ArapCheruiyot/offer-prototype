let tokenClient;
let gapiLoaded = false;
let gisLoaded = false;
let filesData = [];

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

            // Now proceed to list files
            listFiles();
        }
    });
    gisLoaded = true;
    enableAuthButton();
}

// List files in Google Drive (Excel files)
function listFiles() {
    gapi.client.drive.files.list({
        'q': "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'",  // Filter for Excel files
        'fields': "files(id, name)"
    }).then((response) => {
        const files = response.result.files;
        if (files.length) {
            // Show success message
            const messageDiv = document.createElement("div");
            messageDiv.id = "fileListSuccessMessage";
            messageDiv.textContent = "✅ Files Listed Successfully!";
            messageDiv.style.color = "green";
            messageDiv.style.marginTop = "10px";
            document.querySelector(".container").appendChild(messageDiv);

            // Process and display the list of files
            displayFileList(files);
        } else {
            console.log("No Excel files found.");
        }
    }).catch((error) => {
        console.error("Error listing files:", error);
    });
}

// Display file list in the HTML
function displayFileList(files) {
    const fileListUl = document.getElementById("fileListUl");
    fileListUl.innerHTML = "";  // Clear any previous entries

    files.forEach((file) => {
        const li = document.createElement("li");
        li.textContent = file.name;
        li.setAttribute("data-file-id", file.id);  // Store file ID
        fileListUl.appendChild(li);
    });

    // Add event listener to each file in the list for opening
    document.getElementById("fileListUl").addEventListener("click", (event) => {
        const fileId = event.target.getAttribute("data-file-id");
        if (fileId) {
            openFile(fileId);  // Open the file and process it
        }
    });
}

// Open Excel file for processing
function openFile(fileId) {
    gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
    }).then((response) => {
        const arrayBuffer = response.body;
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // Store the file data in memory (JavaScript objects)
        const sheetNames = workbook.SheetNames;
        const firstSheet = workbook.Sheets[sheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        filesData.push({
            fileId: fileId,
            data: jsonData
        });

        // Show success message
        const messageDiv = document.createElement("div");
        messageDiv.id = "fileOpenSuccessMessage";
        messageDiv.textContent = "✅ File Opened and Stored in Memory Successfully!";
        messageDiv.style.color = "green";
        messageDiv.style.marginTop = "10px";
        document.querySelector(".container").appendChild(messageDiv);

        console.log("File data processed:", jsonData);
    }).catch((error) => {
        console.error("Error opening file:", error);
    });
}

// Initialize everything when the page loads
document.addEventListener("DOMContentLoaded", () => {
    gapi.load("client", initializeGapiClient);
    initGis();
    document.getElementById("authButton").addEventListener("click", authenticate);
});
