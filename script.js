const CLIENT_ID = "743264679221-omplmhe5mj6vo37dbtk2dgj5vcfv6p4k.apps.googleusercontent.com"; // Replace with your Google Client ID
const API_KEY = "YOUR_GOOGLE_API_KEY"; // Replace with your API Key
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

let fileData = {}; // Store data from files
let uploadedFiles = []; // Store file names

// Authenticate user
document.getElementById("authButton").addEventListener("click", () => {
    gapi.load("client:auth2", () => {
        gapi.client.init({ apiKey: API_KEY, clientId: CLIENT_ID, discoveryDocs: DISCOVERY_DOCS, scope: SCOPES })
            .then(() => {
                gapi.auth2.getAuthInstance().signIn().then(() => {
                    document.getElementById("fetchFilesButton").disabled = false;
                    alert("Authentication successful!");
                });
            })
            .catch(error => alert("Error during authentication: " + error));
    });
});

// Fetch Excel files from Google Drive
document.getElementById("fetchFilesButton").addEventListener("click", async () => {
    let response = await gapi.client.drive.files.list({
        q: "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'",
        fields: "files(id, name)"
    });

    const files = response.result.files;
    if (!files || files.length === 0) {
        alert("No Excel files found in Google Drive.");
        return;
    }

    uploadedFiles = files.map(file => file.name);
    document.getElementById("fileList").innerHTML = "<h3>Available Files:</h3>";
    files.forEach(file => {
        let div = document.createElement("div");
        div.textContent = file.name;
        document.getElementById("fileList").appendChild(div);
        fetchFileContent(file.id, file.name);
    });
});

// Fetch and process file content
async function fetchFileContent(fileId, fileName) {
    let response = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: "media"
    });

    let blob = new Blob([new Uint8Array(response.body)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    let reader = new FileReader();

    reader.onload = function (event) {
        let data = new Uint8Array(event.target.result);
        let workbook = XLSX.read(data, { type: "array" });

        let allData = [];
        workbook.SheetNames.forEach(sheetName => {
            let rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
            allData = allData.concat(rows);
        });

        fileData[fileName] = allData;
    };

    reader.readAsArrayBuffer(blob);
}

// Search for customer number
document.getElementById("searchButton").addEventListener("click", () => {
    let searchValue = document.getElementById("searchInput").value.trim();
    let resultContainer = document.getElementById("resultContainer");
    resultContainer.innerHTML = "";

    if (uploadedFiles.length === 0) {
        resultContainer.innerHTML = '<div class="no-result">No files loaded yet.</div>';
        return;
    }

    let found = false;
    for (let fileName of uploadedFiles) {
        let data = fileData[fileName];
        for (let row of data) {
            if (row.some(cell => String(cell).trim() === searchValue)) {
                resultContainer.innerHTML += `<div class="result">Customer ${searchValue} found in ${fileName}: ${row.join(", ")}</div>`;
                found = true;
                break;
            }
        }
        if (found) break;
    }

    if (!found) {
        resultContainer.innerHTML = '<div class="no-result">Customer not found in any file.</div>';
    }
});
