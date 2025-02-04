let gapiLoaded = false;

function authenticate() {
    gapi.auth2.getAuthInstance().signIn().then(() => {
        console.log('Sign-in successful');
        listFiles();
        document.getElementById('fileList').classList.remove('hidden');
        document.getElementById('refreshButton').classList.remove('hidden');
    }).catch(error => {
        if (error.error === 'popup_closed_by_user') {
            alert('Authentication was not completed. Please try again and complete the sign-in process.');
        } else {
            console.error('Authentication error', error);
        }
    });
}

function listFiles() {
    gapi.client.drive.files.list({
        pageSize: 10,
        fields: "nextPageToken, files(id, name, mimeType)"
    }).then(function(response) {
        const files = response.result.files;
        const fileListUl = document.getElementById('fileListUl');
        fileListUl.innerHTML = '';
        if (files && files.length > 0) {
            files.forEach(function(file) {
                const li = document.createElement('li');
                li.textContent = `${file.name} (${file.id})`;
                fileListUl.appendChild(li);
            });
        } else {
            fileListUl.innerHTML = '<li>No files found.</li>';
        }
    }).catch(error => console.error('Error listing files', error));
}

function loadGapi() {
    gapi.load('client:auth2', initClient);
}

function initClient() {
    gapi.client.init({
        apiKey: 'YOUR_API_KEY',
        clientId: '743264679221-omplmhe5mj6vo37dbtk2dgj5vcfv6p4k.apps.googleusercontent.com',
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
        scope: 'https://www.googleapis.com/auth/drive.readonly'
    }).then(function () {
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
        gapiLoaded = true;
    }).catch(error => console.error('Client initialization error', error));
}

function updateSigninStatus(isSignedIn) {
    if (isSignedIn) {
        document.getElementById('authButton').style.display = 'none';
        listFiles();
    } else {
        document.getElementById('authButton').style.display = 'block';
    }
}

function searchFiles() {
    const searchTerm = document.getElementById('searchInput').value;
    const fileListUl = document.getElementById('fileListUl');
    if (!fileListUl) {
        console.error('File list element not found');
        return;
    }
    const files = fileListUl.getElementsByTagName('li');
    Array.from(files).forEach(fileItem => {
        const fileId = fileItem.textContent.split('(')[1].replace(')', '').trim();
        gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        }).then(response => {
            const workbook = XLSX.read(new Uint8Array(response.body), { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);

            const results = data.filter(row => {
                return Object.values(row).some(cell => String(cell).includes(searchTerm));
            });

            if (results.length > 0) {
                document.getElementById('resultContainer').innerHTML = `<h3>Results in ${fileItem.textContent}</h3><pre>${JSON.stringify(results, null, 2)}</pre>`;
            } else {
                document.getElementById('resultContainer').innerHTML = `<p>No results found in ${fileItem.textContent}</p>`;
            }
        }).catch(error => console.error('Error reading file:', error));
    });
}

document.getElementById('authButton').addEventListener('click', authenticate);
document.getElementById('searchButton').addEventListener('click', searchFiles);
document.getElementById('refreshButton').addEventListener('click', listFiles);

// Load the Google API library
loadGapi();
