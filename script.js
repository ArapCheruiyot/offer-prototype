let tokenClient;
let gapiLoaded = false;
let gisLoaded = false;

// Load the Google API client
function initializeGapiClient() {
    console.log("Initializing GAPI client...");
    gapi.client.init({}).then(() => {
        gapi.client.load('https://content.googleapis.com/discovery/v1/apis/drive/v3/rest')
            .then(() => {
                gapiLoaded = true;
                console.log("GAPI client loaded.");
                enableAuthButton();
            })
            .catch(error => console.error("Error loading GAPI client:", error));
    });
}

// Enable authentication button when APIs are ready
function enableAuthButton() {
    console.log("Enabling auth button...");
    if (gapiLoaded && gisLoaded) {
        document.getElementById("authButton").disabled = false;
        console.log("Auth button enabled.");
    }
}

// Handle Google OAuth authentication
function authenticate() {
    console.log("Requesting access token...");
    tokenClient.requestAccessToken();
}

// Initialize Google Identity Services (GIS) OAuth 2.0
function initGis() {
    console.log("Initializing GIS...");
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
                console.log("Calling listFiles...");
                listFiles();
            }
        }
    });
    gisLoaded = true;
    enableAuthButton();
}

// List files in Google Drive
function listFiles() {
    console.log("Listing files...");
    gapi.client.drive.files.list({
        'pageSize': 10,
        'fields': "nextPageToken, files(id, name)",
        'q': "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType='application/vnd.ms-excel'"
    }).then(function(response) {
        var files = response.result.files;
        var fileListElement = document.getElementById('fileList');
        fileListElement.innerHTML = '';

        // Ensure the fileList element is visible
        fileListElement.classList.remove('hidden');

        if (files && files.length > 0) {
            console.log('Excel Files:');
            files.forEach(function(file) {
                var fileItem = document.createElement('div');
                fileItem.textContent = file.name;
                fileItem.setAttribute('data-file-id', file.id);
                fileItem.addEventListener('click', function() {
                    var fileId = fileItem.getAttribute('data-file-id');
                    console.log("File clicked:", fileId);
                    downloadFile(fileId, function(workbook) {
                        var searchTerm = document.getElementById('searchInput').value;
                        console.log("Searching in file:", fileId);
                        searchInFile(workbook, searchTerm);
                    });
                });
                fileListElement.appendChild(fileItem);
                console.log(file.name + ' (' + file.id + ')');
            });
        } else {
            fileListElement.textContent = 'No Excel files found.';
            console.log('No Excel files found.');
        }
    }).catch(error => console.error("Error listing files:", error));
}

// Download an Excel file and read its contents
function downloadFile(fileId, callback) {
    console.log("Downloading file with ID:", fileId);
    gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
    }).then(function(response) {
        // Use fetch to get the file content
        fetch(response.result.webContentLink)
            .then(res => res.blob())
            .then(blob => {
                var reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        var data = new Uint8Array(e.target.result);
                        var workbook = XLSX.read(data, {type: 'array'});
                        callback(workbook);
                    } catch (error) {
                        console.error("Error reading Excel file:", error);
                        alert("Error reading Excel file: " + error.message);
                    }
                };
                reader.readAsArrayBuffer(blob);
            })
            .catch(error => console.error("Error fetching file:", error));
    }).catch(error => console.error("Error downloading file:", error));
}

// Process the downloaded file and search for an account number
function searchInFile(workbook, searchTerm) {
    console.log("Searching for term:", searchTerm);
    var sheetName = workbook.SheetNames[0];
    var sheet = workbook.Sheets[sheetName];
    var json = XLSX.utils.sheet_to_json(sheet);

    for (var i = 0; i < json.length; i++) {
        if (json[i]['Account Number'] && json[i]['Account Number'].toString() === searchTerm) {
            console.log('Found matching record: ', json[i]);
            document.getElementById('resultContainer').innerHTML = 'Found matching record: ' + JSON.stringify(json[i]);
            return true;
        }
    }
    console.log('No matching record found.');
    document.getElementById('resultContainer').innerHTML = 'No matching record found.';
    return false;
}

// Initialize everything when the page loads
document.addEventListener("DOMContentLoaded", () => {
    console.log("Page loaded. Initializing...");
    gapi.load("client", initializeGapiClient);
    initGis();
    document.getElementById("authButton").addEventListener("click", authenticate);

    // Add event listener for search button
    document.getElementById("searchButton").addEventListener("click", function() {
        var searchTerm = document.getElementById("searchInput").value;
        console.log("Searching for:", searchTerm);

        // You may need to adjust this part based on your code structure
        var fileList = document.querySelectorAll('#fileList div');
        fileList.forEach(function(fileItem) {
            var fileId = fileItem.getAttribute('data-file-id');
            downloadFile(fileId, function(workbook) {
                searchInFile(workbook, searchTerm);
            });
        });
    });
});
