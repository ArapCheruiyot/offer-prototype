// 1️⃣ Google Authentication (Already in place)
function authenticateGoogle() {
    gapi.load("client:auth2", () => {
        gapi.client.init({
            clientId: "534160681000-2c5jtro940cnvd7on62jf022f52h8pfu.apps.googleusercontent.com",
            scope: "https://www.googleapis.com/auth/drive.readonly",
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
        }).then(() => {
            gapi.auth2.getAuthInstance().signIn().then(() => {
                document.getElementById("authButton").textContent = "Authenticated ✅";
                alert("✅ Login successful!");
            });
        }).catch(error => console.error("Authentication failed", error));
    });
}

document.getElementById("authButton").addEventListener("click", authenticateGoogle);

// 2️⃣ Paste the "List & Load Excel Files" Code Here 👇
async function listExcelFiles() {
    try {
        const response = await gapi.client.drive.files.list({
            q: "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType='application/vnd.ms-excel'",
            fields: "files(id, name)",
        });

        const files = response.result.files;
        if (!files || files.length === 0) {
            alert("No Excel files found in Google Drive.");
            return;
        }

        document.getElementById("fileList").classList.remove("hidden");
        const fileListUl = document.getElementById("fileListUl");
        fileListUl.innerHTML = ""; // Clear previous results

        window.preloadedFiles = {}; // Reset preloaded files

        for (const file of files) {
            const listItem = document.createElement("li");
            listItem.textContent = `📂 ${file.name} - ⏳ Loading...`;
            fileListUl.appendChild(listItem);

            try {
                await loadExcelFile(file.id, file.name);
                listItem.textContent = `📂 ${file.name} - ✅ Loaded Successfully`;
            } catch (error) {
                listItem.textContent = `📂 ${file.name} - ❌ Failed to Load`;
            }
        }

        alert("✅ All available Excel files have been processed.");
    } catch (error) {
        console.error("Error fetching Excel files:", error);
        alert("❌ Failed to fetch Excel files. Check console for details.");
    }
}

async function loadExcelFile(fileId, fileName) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: "media",
            });

            const workbook = XLSX.read(response.body, { type: "array" });
            window.preloadedFiles[fileName] = workbook;
            console.log(`✅ Successfully loaded: ${fileName}`);
            resolve(); // Success
        } catch (error) {
            console.error(`❌ Error loading ${fileName}:`, error);
            reject(error); // Failure
        }
    });
}

// 3️⃣ Attach the File Loading to "Refresh Button"
document.getElementById("refreshButton").addEventListener("click", listExcelFiles);
