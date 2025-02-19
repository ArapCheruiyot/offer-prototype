// Global variables
let tokenClient;
let gapiLoaded = false;
let gisLoaded = false;
window.combinedData = null; // Cached combined dataset from all Excel files

// Initialize the Google API client
function initializeGapiClient() {
  console.log("Initializing GAPI client...");
  gapi.client.init({}).then(() => {
    gapi.client
      .load("https://content.googleapis.com/discovery/v1/apis/drive/v3/rest")
      .then(() => {
        gapiLoaded = true;
        console.log("GAPI client loaded.");
        enableAuthButton();
      })
      .catch((error) => {
        console.error("Error loading GAPI client:", error);
      });
  });
}

// Enable the authentication button when both APIs are ready
function enableAuthButton() {
  if (gapiLoaded && gisLoaded) {
    document.getElementById("authButton").disabled = false;
    console.log("Auth button enabled.");
  }
}

// Request an access token via Google Identity Services
function authenticate() {
  console.log("Requesting access token...");
  tokenClient.requestAccessToken();
}

// Initialize Google Identity Services (GIS) OAuth 2.0
function initGis() {
  console.log("Initializing GIS...");
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id:
      "534160681000-2c5jtro940cnvd7on62jf022f52h8pfu.apps.googleusercontent.com",
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
    },
  });
  gisLoaded = true;
  enableAuthButton();
}

// List Excel files from Google Drive
function listFiles() {
  console.log("Listing files...");
  gapi.client.drive.files
    .list({
      pageSize: 50,
      fields: "nextPageToken, files(id, name, mimeType)",
      q: "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'",
    })
    .then((response) => {
      let files = response.result.files;
      let fileListElement = document.getElementById("fileList");
      fileListElement.innerHTML = "<h3>Google Drive Excel Files:</h3>";
      fileListElement.classList.remove("hidden");

      if (files && files.length > 0) {
        console.log("Excel Files:", files);
        files.forEach((file) => {
          let fileItem = document.createElement("div");
          fileItem.textContent = file.name;
          fileItem.setAttribute("data-file-id", file.id);
          fileListElement.appendChild(fileItem);
        });
        // Show refresh button in case new files are added later
        document.getElementById("refreshButton").classList.remove("hidden");
        // Automatically combine files after listing them
        combineExcelFiles();
      } else {
        fileListElement.textContent = "No Excel files found.";
        console.log("No Excel files found.");
      }
    })
    .catch((error) => console.error("Error listing files:", error));
}

// Download an Excel file and return a Promise that resolves with the workbook
function downloadFileAsync(fileId) {
  return new Promise((resolve, reject) => {
    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${gapi.auth.getToken().access_token}`,
      },
    })
      .then((res) => {
        if (!res.ok)
          throw new Error(`Network response was not ok: ${res.statusText}`);
        return res.blob();
      })
      .then((blob) => {
        if (blob.size === 0) {
          throw new Error("Downloaded file is empty.");
        }
        let reader = new FileReader();
        reader.onload = function (e) {
          try {
            let workbook = XLSX.read(e.target.result, { type: "array" });
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
      .catch((error) => reject(error));
  });
}

// Combine all Excel files into one dataset (an array of records)
async function combineExcelFiles() {
  // Get the loading indicator element (create if not present)
  let loadingIndicator = document.getElementById("loadingIndicator");
  if (!loadingIndicator) {
    loadingIndicator = document.createElement("div");
    loadingIndicator.id = "loadingIndicator";
    document.querySelector(".container").appendChild(loadingIndicator);
  }
  loadingIndicator.classList.remove("hidden");
  
  console.log("Combining Excel files...");
  let combinedData = [];
  const fileItems = Array.from(document.querySelectorAll("#fileList div"));
  const totalFiles = fileItems.length;
  if (totalFiles === 0) {
    alert("No files to combine. Make sure you are authenticated and files are listed.");
    loadingIndicator.classList.add("hidden");
    return;
  }
  
  let processedCount = 0;
  const downloadPromises = fileItems.map((fileItem) => {
    const fileId = fileItem.getAttribute("data-file-id");
    return downloadFileAsync(fileId)
      .then((workbook) => {
        processedCount++;
        loadingIndicator.textContent = `Loading and combining files, please wait... (${processedCount} of ${totalFiles} files processed)`;
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_json(sheet);
      })
      .catch((error) => {
        processedCount++;
        loadingIndicator.textContent = `Loading and combining files, please wait... (${processedCount} of ${totalFiles} files processed)`;
        console.error("Error processing file:", error);
        return [];
      });
  });
  
  const results = await Promise.all(downloadPromises);
  results.forEach((jsonArray) => {
    combinedData = combinedData.concat(jsonArray);
  });
  window.combinedData = combinedData; // Cache the combined data
  console.log("Combined data ready. Total records:", combinedData.length);
  loadingIndicator.classList.add("hidden");
}

// Convert an Excel serial date to a JavaScript date string
function excelSerialDateToJSDate(serial) {
  const excelEpoch = new Date(1899, 11, 30);
  const msPerDay = 24 * 60 * 60 * 1000;
  const jsDate = new Date(excelEpoch.getTime() + serial * msPerDay);
  return jsDate.toLocaleDateString();
}

// Search for the term in the combined dataset (case-insensitive, partial match)
function searchInCombinedData(searchTerm) {
  console.log("Searching in combined data for:", searchTerm);
  const resultContainer = document.getElementById("resultContainer");
  resultContainer.innerHTML = "";
  let found = false;

  if (!window.combinedData || window.combinedData.length === 0) {
    resultContainer.innerHTML =
      '<div class="result-item">No data available. Please refresh the files if new ones have been added.</div>';
    return;
  }

  window.combinedData.forEach((record) => {
    for (let key in record) {
      let cellVal = record[key];
      if (
        cellVal &&
        cellVal.toString().toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        // Create a result block for this record
        let resultItem = document.createElement("div");
        resultItem.className = "result-item";
        for (let field in record) {
          let resultLabel = document.createElement("span");
          resultLabel.className = "result-label";
          resultLabel.textContent = `${field}: `;
          let resultValue = document.createElement("span");
          if (
            field.toLowerCase().includes("date") &&
            !isNaN(record[field])
          ) {
            resultValue.textContent = excelSerialDateToJSDate(record[field]);
          } else {
            resultValue.textContent = record[field];
          }
          resultItem.appendChild(resultLabel);
          resultItem.appendChild(resultValue);
          resultItem.appendChild(document.createElement("br"));
        }
        resultContainer.appendChild(resultItem);
        found = true;
        break; // Stop checking further fields for this record
      }
    }
  });

  if (!found) {
    resultContainer.innerHTML =
      '<div class="result-item">No matching record found.</div>';
  }
}

// Initialize everything when the page loads
document.addEventListener("DOMContentLoaded", () => {
  console.log("Page loaded. Initializing...");
  gapi.load("client", initializeGapiClient);
  initGis();

  document.getElementById("authButton").addEventListener("click", authenticate);

  // Allow manual refresh (e.g., when new files are added)
  document.getElementById("refreshButton").addEventListener("click", combineExcelFiles);

  // When "Search" is clicked, search the combined dataset
  document.getElementById("searchButton").addEventListener("click", () => {
    const searchTerm = document.getElementById("searchInput").value.trim();
    if (!searchTerm) {
      alert("Please enter a search term.");
      return;
    }
    searchInCombinedData(searchTerm);
  });
});
