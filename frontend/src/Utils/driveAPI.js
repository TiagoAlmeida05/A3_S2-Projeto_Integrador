const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const FOLDER_NAME = 'jUPiter-QDA-Projects';

const fetchWithAuth = async (url, options = {}) => {
    let token = localStorage.getItem('google_drive_tokens');
    if (!token) throw new Error('No Google Drive token found');
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        console.log("Token expired! Pausing to refresh...");
        const refreshToken = localStorage.getItem('google_drive_refresh_token');

        if(!refreshToken) throw new Error("No refresh token found. Please reconnect to Google Drive.");

        try {
            const newTokens = await window.electronAPI.refreshGoogleToken(refreshToken);

            localStorage.setItem('google_drive_tokens', newTokens.access_token);
            if (newTokens.refresh_token) {
                localStorage.setItem('google_drive_refresh_token', newTokens.refresh_token);
            }

            const retryHeaders = {
                ...options.headers,
                'Authorization': `Bearer ${newTokens.access_token}`
            };
            response = await fetch(url, { ...options, headers: retryHeaders });
            console.log("Token refreshed and request retried successfully!");
        } catch (error) {
            localStorage.removeItem('google_drive_tokens');
            localStorage.removeItem('google_drive_refresh_token');
            throw new Error("Session completely expired. Please disconnect and reconnect.");
        }
    }

    return response;
}

export const initializeDriveFolder = async () => {
    const token = localStorage.getItem('google_drive_tokens');
    if (!token) { throw new Error('No Google Drive token found'); }

    const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`);

    const searchResponse = await fetchWithAuth(`${DRIVE_API_URL}?q=${query}&fields=files(id, name)`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const searchData = await searchResponse.json();

    if (searchData.error){
        throw new Error(searchData.error.message);
    }

    if (searchData.files && searchData.files.length > 0) {
        console.log('Folder already exists! ID:', searchData.files[0].id);
        return searchData.files[0].id;
    }

    console.log('Folder not found. Creating a new one...');
    const createResponse = await fetchWithAuth(DRIVE_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder',
        })
    });

    const createData = await createResponse.json();

    if (createData.error){
        throw new Error(createData.error.message);
    }
    
    console.log("New folder created! ID:", createData.id);
    return createData.id;
};

export const getOrCreateProjectFolder = async (projectName, parentFolderId) => {
    const token = localStorage.getItem('google_drive_tokens');
    if (!token) throw new Error('No Google Drive token found');

    const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${projectName}' and '${parentFolderId}' in parents and trashed=false`);

    const searchResponse = await fetchWithAuth(`${DRIVE_API_URL}?q=${query}&fields=files(id, name)`, {
       method: 'GET',
         headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const searchData = await searchResponse.json();
    if (searchData.error) throw new Error(searchData.error.message);

    if (searchData.files && searchData.files.length > 0) {
        console.log(`Project folder "${projectName}" already exists! ID:`, searchData.files[0].id);
        return searchData.files[0].id;
    }

    console.log(`Creating project folder '${projectName}'...`);
    const createResponse = await fetchWithAuth(DRIVE_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: projectName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentFolderId]
        })
    });

    const createData = await createResponse.json();
    if (createData.error) throw new Error(createData.error.message);

    console.log(`New project folder created! ID:`, createData.id);
    return createData.id;
}

export const getProjectFolderIfExists = async (projectName, parentFolderId) => {
    const token = localStorage.getItem('google_drive_tokens');
    if (!token) return null;

    const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${projectName}' and '${parentFolderId}' in parents and trashed=false`);
    const searchResponse = await fetchWithAuth(`${DRIVE_API_URL}?q=${query}&fields=files(id, name)`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const searchData = await searchResponse.json();
    if (searchData.error) return null;

    if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
    }

    return null;
};

export const checkLockStatus = async (projectFolderId) => {
    const token = localStorage.getItem('google_drive_tokens');
    if (!token) throw new Error('No Google Drive token found');

    const query = encodeURIComponent(`name='~lock.json' and '${projectFolderId}' in parents and trashed=false`);
    const searchResponse = await fetchWithAuth(`${DRIVE_API_URL}?q=${query}&fields=files(id, name)`,{
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const searchData = await searchResponse.json();
    if (searchData.error) throw new Error(searchData.error.message);

    if (!searchData.files || searchData.files.length === 0) {
        return {isLocked: false, lockedBy: null, lockFileId: null};
    }

    const lockFileId = searchData.files[0].id;
    const contentResponse = await fetchWithAuth(`${DRIVE_API_URL}/${lockFileId}?alt=media`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    try {
        const lockData = await contentResponse.json();
        return {
            isLocked: true,
            lockedBy: lockData.lockedBy || 'Unknown user',
            lockFileId: lockFileId
        };
    }catch (e) {
        return {isLocked: true, lockedBy: 'Unknown user', lockFileId: lockFileId};
    }
};

export const acquireLock = async (projectFolderId, nickName) => {
    const token = localStorage.getItem('google_drive_tokens');
    if (!token) throw new Error('No Google Drive token found');

    console.log(`Locking project for "${nickName}"...`);

    const createResponse = await fetchWithAuth(DRIVE_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: '~lock.json',
            mimeType: 'application/json',
            parents: [projectFolderId],
        })
    });

    const createData = await createResponse.json();
    if (createData.error) throw new Error(createData.error.message);

    const newLockFileId = createData.id;

    const lockContent = JSON.stringify({
        lockedBy: nickName || "Anonymous",
        timestamp: new Date().toISOString()
    });

    const updateResponse = await fetchWithAuth(`https://www.googleapis.com/upload/drive/v3/files/${newLockFileId}?uploadType=media`,{
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: lockContent
    });

    if (!updateResponse.ok) throw new Error('Failed to write lock data');

    console.log("Project successfully locked!");
    return newLockFileId;
};

export const releaseLock = async (lockFileId) => {
    const token = localStorage.getItem('google_drive_tokens');
    if (!token) throw new Error('No Google Drive token found');

    console.log("Releasing project lock...");
    const response = await fetchWithAuth(`${DRIVE_API_URL}/${lockFileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to release lock');
    console.log("Lock successfully removed! Project is free.");
    return true;
};

export const uploadProjectDataToDrive = async (projectFolderId, projectData) => {
    const token = localStorage.getItem('google_drive_tokens');
    if (!token) throw new Error('No Google Drive token found');

    console.log("Packaging project data for cloud sync...");
    const fileName = `project_data.json`;
    const fileContent = JSON.stringify(projectData);

    const query = encodeURIComponent(`name='${fileName}' and '${projectFolderId}' in parents and trashed=false`);
    const searchResponse = await fetchWithAuth(`${DRIVE_API_URL}?q=${query}&fields=files(id)`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const searchData = await searchResponse.json();
    if (searchData.error) throw new Error(searchData.error.message);
    
    let fileId;

    if (searchData.files && searchData.files.length > 0) {
        fileId = searchData.files[0].id;
    } else {
        const createResponse = await fetchWithAuth(DRIVE_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: fileName,
                mimeType: 'application/json',
                parents: [projectFolderId],
            })
        });
        const createData = await createResponse.json();
        if (createData.error) throw new Error(createData.error.message);
        fileId = createData.id;
    } 

    const updateResponse = await fetchWithAuth(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: fileContent
    });

    if (!updateResponse.ok) throw new Error('Failed to write JSON data to Google Drive');

    console.log("Data successfully synced to the cloud! ☁️✅");    
    return true;
};

export const downloadProjectDataFromDrive = async (projectFolderId) => {
    const token = localStorage.getItem('google_drive_tokens');
    if (!token) throw new Error('No Google Drive token found');

    console.log("Looking for existing cloud data...");
    
    const query = encodeURIComponent(`name='project_data.json' and '${projectFolderId}' in parents and trashed=false`);
    const searchResponse = await fetchWithAuth(`${DRIVE_API_URL}?q=${query}&fields=files(id)`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const searchData = await searchResponse.json();

    if(!searchData.files || searchData.files.length === 0) {
        console.log("No cloud data found. This must be a new cloud project!");
        return null;
    }

    const fileId = searchData.files[0].id;
    const contentResponse = await fetchWithAuth(`${DRIVE_API_URL}/${fileId}?alt=media`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!contentResponse.ok) throw new Error("Failed to download project data");

    console.log("Cloud data downloaded successfully! ☁️⬇️");
    return await contentResponse.json();
};

export const uploadRawFileToDrive = async (projectFolderId, fileName, fileBlob) => {
    console.log(`Syncing file to cloud: ${fileName}...`);
    const query = encodeURIComponent(`name='${fileName}' and '${projectFolderId}' in parents and trashed=false`);
    const searchResponse = await fetchWithAuth(`${DRIVE_API_URL}?q=${query}&fields=files(id)`, { method: 'GET' });
    const searchData = await searchResponse.json();

    let fileId;
    if(searchData.files && searchData.files.length > 0) {
        fileId = searchData.files[0].id;
    } else {
        const createResponse = await fetchWithAuth(DRIVE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: fileName, 
                parents: [projectFolderId] 
            })
        });
        const createData = await createResponse.json();
        if (createData.error) throw new Error(createData.error.message);
        fileId = createData.id;
    }

    const updateResponse = await fetchWithAuth(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        body: fileBlob
    });

    if(!updateResponse.ok) throw new Error(`Failed to write file ${fileName} to Drive`);
    return true;
};

export const shareDriveFolder = async (folderId, emailAddress) => {
    console.log(`Sharing folder ${folderId} with ${emailAddress}...`);
    
    const url = `https://www.googleapis.com/drive/v3/files/${folderId}/permissions`;
    
    const body = {
        role: 'writer', 
        type: 'user',
        emailAddress: emailAddress
    };

    try {
        const response = await fetchWithAuth(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || "Failed to share folder.");
        }

        console.log(`Successfully shared with ${emailAddress}!`);
        return true;
    } catch (error) {
        console.error("Error sharing folder:", error);
        throw error;
    }
};

export const getSharedProjects = async () => {
    console.log("Searching for projects shared with me...");
    
    const query = encodeURIComponent(`name='project_data.json' and trashed=false`);
    const searchResponse = await fetchWithAuth(`${DRIVE_API_URL}?q=${query}&fields=files(id, parents)`, { 
        method: 'GET' 
    });
    
    const searchData = await searchResponse.json();
    if (!searchData.files || searchData.files.length === 0) {
        return [];
    }

    const sharedProjects = [];
    for (const file of searchData.files) {
        if (file.parents && file.parents.length > 0) {
            const folderId = file.parents[0];
            
            const folderRes = await fetchWithAuth(`${DRIVE_API_URL}/${folderId}?fields=id,name`, { 
                method: 'GET' 
            });
            const folderData = await folderRes.json();
            
            sharedProjects.push({ 
                id: folderData.id, 
                name: folderData.name, 
                isShared: true,
                driveFileId: file.id
            });
        }
    }
    
    return sharedProjects;
};

export const downloadCloudProjectData = async (fileId) => {
    console.log("Downloading project data from cloud...");
    
    const response = await fetchWithAuth(`${DRIVE_API_URL}/${fileId}?alt=media`, {
        method: 'GET'
    });

    if(!response.ok) {
        throw new Error("Failed to download project data from Google Drive");
    }

    return await response.json();
};

export const deleteDriveFolder = async (folderId) => {
    const response = await fetchWithAuth(`${DRIVE_API_URL}/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trashed: true })
    });
    if(!response.ok) throw new Error("Failed to trash cloud folder");
    return true;
};