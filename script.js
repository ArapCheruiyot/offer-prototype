<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Customer Offer Search</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.0/xlsx.full.min.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            padding: 10px;
            background-color: #f8f8f8;
            display: flex;
            justify-content: flex-start; /* Align content to the left */
            align-items: flex-start; /* Align content to the top */
        }
        .container {
            border: 1px solid #ccc;
            padding: 20px;
            background-color: #fff;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            width: 300px; /* Reduced width */
        }
        .file-list {
            margin: 20px 0;
            padding: 10px;
            border: 1px dashed #ccc;
            border-radius: 5px;
            background-color: #fafafa;
            max-height: 150px; /* Limit the height */
            overflow-y: auto; /* Enable scrolling if content overflows */
        }
        .file-item {
            margin: 5px 0;
        }
        .result, .no-result {
            margin-top: 10px;
            padding: 10px;
            border-radius: 5px;
            word-wrap: break-word; /* Break long words to avoid overflow */
            overflow: hidden; /* Prevent overflow */
            white-space: normal; /* Allow text to wrap */
        }
        .result {
            background-color: #e7f4e4;
            border: 1px solid #d6e9c6;
        }
        .no-result {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
        }
    </style>
</head>
<body>

<div class="container">
    <h2>Customer Offer Search</h2>

    <!-- Button to Upload Excel Files -->
    <input type="file" id="fileInput" accept=".xlsx, .xls" multiple>
    <button id="uploadButton">Add Files</button>
    
    <div class="file-list" id="fileList">
        <h3>Uploaded Files:</h3>
    </div>

    <!-- Search Box -->
    <input type="text" id="searchInput" placeholder="Enter customer number">
    <button id="searchButton">Search</button>

    <!-- Result Display -->
    <div id="resultContainer"></div>

    <!-- Delete Button -->
    <button id="deleteButton">Delete Selected File</button>
</div>

<script>
    let uploadedFiles = [];
    let fileData = {}; // To store the data read from the files

    // Handle file uploads
    document.getElementById('uploadButton').addEventListener('click', () => {
        const fileInput = document.getElementById('fileInput');
        const files = fileInput.files;
        
        if (files.length === 0) {
            alert('Please select at least one file.');
            return;
        }

        for (let i = 0; i < files.length; i++) {
            const fileName = files[i].name;
            if (!uploadedFiles.includes(fileName)) { // Check for duplicates
                uploadedFiles.push(fileName);
                readExcelFile(files[i]); // Read the file
            } else {
                alert(File ${fileName} is already uploaded.);
            }
        }

        updateFileList();
    });

    // Update file list display
    function updateFileList() {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '<h3>Uploaded Files:</h3>'; // Reset list
        uploadedFiles.forEach((fileName, index) => {
            const fileItem = document.createElement('div');
            fileItem.classList.add('file-item');
            fileItem.textContent = ${index + 1}: ${fileName};
            fileList.appendChild(fileItem);
        });
    }

    // Read the content of the uploaded Excel file
    function readExcelFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            let allData = [];

            workbook.SheetNames.forEach(sheetName => {
                const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {header: 1});
                allData = allData.concat(rows); // Concatenate data from all sheets
            });

            // Store the data for search functionality
            fileData[file.name] = allData;
        };
        reader.readAsArrayBuffer(file);
    }

    // Function to convert Excel date serial number to JS Date
    function excelDateToJSDate(excelDate) {
        const msPerDay = 86400000; // milliseconds in a day
        const epoch = new Date(Date.UTC(1970, 0, 1)); // 1970-01-01
        return new Date(epoch.getTime() + (excelDate - 25569) * msPerDay);
    }

    // Handle search functionality
    document.getElementById('searchButton').addEventListener('click', () => {
        const customerNumber = document.getElementById('searchInput').value.trim();
        const resultContainer = document.getElementById('resultContainer');

        // Reset result display
        resultContainer.innerHTML = '';

        if (uploadedFiles.length === 0) {
            resultContainer.innerHTML = '<div class="no-result">No files uploaded yet.</div>';
            return;
        }

        // Search through all uploaded files
        let found = false;
        for (const fileName of uploadedFiles) {
            const data = fileData[fileName];
            for (const row of data) {
                // Check if customer number is in the row
                if (row.some(cell => String(cell).trim() === customerNumber)) {
                    // Convert any Excel date serial numbers to date strings
                    const formattedRow = row.map(cell => {
                        // Check if the cell is a number and in the expected range for Excel dates
                        if (typeof cell === 'number' && cell > 25568) {
                            const date = excelDateToJSDate(cell);
                            return date.toLocaleDateString(); // Convert to local date string
                        }
                        return cell; // Return cell as is if it's not a date
                    });

                    // Display the entire row information
                    const rowData = formattedRow.map(cell => <span>${cell}</span>).join(', ');
                    resultContainer.innerHTML += <div class="result">Customer ${customerNumber} found in ${fileName}: ${rowData}</div>;
                    found = true;
                    break; // Exit the inner loop if found
                }
            }
            if (found) break; // Exit the outer loop if found
        }

        if (!found) {
            resultContainer.innerHTML = '<div class="no-result">Customer not found in any list.</div>';
        }
    });

    // Handle delete functionality
    document.getElementById('deleteButton').addEventListener('click', () => {
        const selectedFileIndex = prompt("Enter the number of the file to delete:");
        const index = parseInt(selectedFileIndex) - 1;

        if (index >= 0 && index < uploadedFiles.length) {
            const deletedFileName = uploadedFiles[index];
            uploadedFiles.splice(index, 1);
            delete fileData[deletedFileName]; // Remove corresponding data
            updateFileList();
            alert(${deletedFileName} deleted successfully.);
        } else {
            alert('Invalid file number.');
        }
    });
</script>

</body>
</html>
