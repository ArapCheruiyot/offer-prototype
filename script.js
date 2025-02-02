async function searchNumberInFiles(searchNumber) {
    if (!uploadedFiles.length) {
        alert('No files available to search.');
        return;
    }

    let searchProgress = document.getElementById('searchProgress');
    searchProgress.innerHTML = `Searching in ${uploadedFiles.length} files...`;

    for (let i = 0; i < uploadedFiles.length; i++) {
        let file = uploadedFiles[i];
        searchProgress.innerHTML = `Searching in ${file.name} (${i + 1}/${uploadedFiles.length})...`;
        
        let fileContent = await readExcelFile(file.id);
        if (!fileContent) continue;
        
        let match = findNumberInData(fileContent, searchNumber);
        if (match) {
            alert(`Match found in ${file.name}!\nRow Data: ${JSON.stringify(match)}`);
            return;
        }
    }
    alert('No matching record found in any file.');
}

async function readExcelFile(fileId) {
    try {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });
        
        let workbook = XLSX.read(response.body, { type: 'binary' });
        let sheetName = workbook.SheetNames[0];
        let sheet = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_json(sheet);
    } catch (error) {
        console.error(`Error reading file ${fileId}:`, error);
        return null;
    }
}

function findNumberInData(data, searchNumber) {
    for (let row of data) {
        for (let key in row) {
            if (row[key] == searchNumber) {
                return row;
            }
        }
    }
    return null;
}

document.getElementById('searchButton').addEventListener('click', () => {
    let searchNumber = document.getElementById('searchInput').value;
    if (!searchNumber) {
        alert('Please enter a number to search.');
        return;
    }
    searchNumberInFiles(searchNumber);
});
