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

            const messageDiv = document.createElement("div");
            messageDiv.id = "successMessage";
            messageDiv.textContent = "✅ Login Successful!";
            messageDiv.style.color = "green";
            messageDiv.style.marginTop = "10px";
            document.querySelector(".container").appendChild(messageDiv);

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
        'fields': "nextPageToken, files(id, name, mimeType)",
        'q': "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'"
    }).then(response => {
        let files = response.result.files;
        let fileListElement = document.getElementById('fileList');
        fileListElement.innerHTML = '';

        fileListElement.classList.remove('hidden');

        if (files && files.length > 0) {
            console.log('Excel Files:', files);
            files.forEach(file => {
                let fileItem = document.createElement('div');
                fileItem.textContent = file.name;
                fileItem.setAttribute('data-file-id', file.id);
                fileItem.addEventListener('click', function() {
                    let fileId = fileItem.getAttribute('data-file-id');
                    console.log("File clicked:", fileId);
                    downloadFile(fileId, function(workbook) {
                        let searchTerm = document.getElementById('searchInput').value;
                        console.log("Searching in file:", fileId);
                        searchInFile(workbook, searchTerm);
                    });
                });
                fileListElement.appendChild(fileItem);
            });
        } else {
            fileListElement.textContent = 'No Excel files found.';
            console.log('No Excel files found.');
        }
    }).catch(error => console.error("Error listing files:", error));
}

// Asynchronously download and process Excel files
async function processFiles(fileList, searchTerm) {
    let resultContainer = document.getElementById('resultContainer');
    resultContainer.innerHTML = '';

    for (let fileItem of fileList) {
        let fileId = fileItem.getAttribute('data-file-id');
        console.log("Downloading and searching in file:", fileId);

        try {
            let workbook = await downloadFileAsync(fileId);
            let found = searchInFile(workbook, searchTerm);

            if (found) {
                console.log('Search complete.');
                break;
            }
        } catch (error) {
            console.error("Error processing file:", error);
        }
    }
}

// Convert downloadFile to return a Promise
function downloadFileAsync(fileId) {
    return new Promise((resolve, reject) => {
        fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: {
                'Authorization': `Bearer ${gapi.auth.getToken().access_token}`
            }
        })
        .then(res => {
            if (!res.ok) throw new Error(`Network response was not ok: ${res.statusText}`);
            return res.blob();
        })
        .then(blob => {
            if (blob.size === 0) {
                throw new Error("Downloaded file is empty.");
            }

            let reader = new FileReader();
            reader.onload = function(e) {
                try {
                    let workbook = XLSX.read(e.target.result, { type: 'array' });
                    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                        throw new Error("Invalid Excel file format.");
                    }
                    resolve(workbook);
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsArrayBuffer(blob);
        })
        .catch(error => reject(error));
    });
}

// Process the downloaded file and search for an account number
function searchInFile(workbook, searchTerm) {
    console.log("Searching for term:", searchTerm);
    let sheetName = workbook.SheetNames[0];
    let sheet = workbook.Sheets[sheetName];
    let json = XLSX.utils.sheet_to_json(sheet);

    console.log("JSON data from Excel file:", json);

    let found = false;
    let resultContainer = document.getElementById('resultContainer');
    resultContainer.innerHTML = ''; // Clear previous results

    for (let i = 0; i < json.length; i++) {
        for (let key in json[i]) {
            console.log(`Checking cell [${key}]:`, json[i][key]);
            if (json[i][key] && json[i][key].toString() === searchTerm) {
                console.log('Found matching record:', json[i]);

                // Create a result block
                let resultItem = document.createElement('div');
                resultItem.className = 'result-item';
                for (let field in json[i]) {
                    let resultLabel = document.createElement('span');
                    resultLabel.className = 'result-label';
                    resultLabel.textContent = `${field}: `;
                    let resultValue = document.createElement('span');
                    resultValue.textContent = json[i][field];
                    resultItem.appendChild(resultLabel);
                    resultItem.appendChild(resultValue);
                    resultItem.appendChild(document.createElement('br')); // Line break for each field
                }
                resultContainer.appendChild(resultItem);

                found = true;
                break;
            }
        }
        if (found) break;
    }

    if (!found) {
        console.log('No matching record found.');
        resultContainer.innerHTML = '<div class="result-item">No matching record found.</div>';
    }

    return found;
}


// Initialize everything when the page loads
document.addEventListener("DOMContentLoaded", () => {
    console.log("Page loaded. Initializing...");
    gapi.load("client", initializeGapiClient);
    initGis();
    document.getElementById("authButton").addEventListener("click", authenticate);

    // Add event listener for search button
    document.getElementById("searchButton").addEventListener("click", function() {
        let searchTerm = document.getElementById("searchInput").value;
        console.log("Searching for:", searchTerm);

        let fileList = document.querySelectorAll('#fileList div');
        processFiles(fileList, searchTerm);
    });
});
