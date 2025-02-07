// Download an Excel file and read its contents
function downloadFile(fileId, callback) {
    console.log("Downloading file with ID:", fileId);
    gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
    }).then(function(response) {
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
        .catch(error => {
            console.error("Error fetching file:", error);
            alert("Error fetching file: " + error.message);
        });
    }).catch(error => console.error("Error downloading file:", error));
}
