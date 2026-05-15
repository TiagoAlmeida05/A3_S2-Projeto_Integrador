const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const crypto = require('crypto');
require('dotenv').config({path: path.join(__dirname, '.env')});

let emergencyLockInfo = null;

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.maximize()
  
  win.loadURL('http://localhost:5173')
}

app.whenReady().then(() => {
  createWindow()

  ipcMain.on('register-emergency-lock', (event, info) => {
    console.log("Main Process: Emergency lock registered for ID:", info.lockId);
    emergencyLockInfo = info;
  });

  ipcMain.on('clear-emergency-lock', () => {
    console.log("Main Process: Emergency lock cleared.");
    emergencyLockInfo = null;
  });

  ipcMain.handle('login-to-google', async () => {
    return new Promise((resolve, reject) => {
      let isAuthComplete = false;
      
      const verifier = crypto.randomBytes(32).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/, '');
      const challenge = crypto.createHash('sha256').update(verifier).digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/, '');

      const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
      const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

      const REDIRECT_URI = 'http://127.0.0.1';
      const SCOPES = 'https://www.googleapis.com/auth/drive.file email profile';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${SCOPES}&access_type=offline&prompt=consent&code_challenge=${challenge}&code_challenge_method=S256`;
  
      let authWindow = new BrowserWindow({
        width: 500,
        height: 600,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      authWindow.loadURL(authUrl);

      const checkUrl = async (event, newUrl) => {

        if (newUrl.includes('code=') || newUrl.includes('error=')) {
          event.preventDefault();
          isAuthComplete = true;

          const urlObj = new URL(newUrl);
          const code = urlObj.searchParams.get('code');
          const error = urlObj.searchParams.get('error');

          if (error) {
            authWindow.close();
            reject(error);
            return;
          }
          if (code) {
            if (authWindow) authWindow.hide();

            try {
              const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                  client_id: CLIENT_ID,
                  client_secret: CLIENT_SECRET,
                  code: code,
                  code_verifier: verifier,
                  redirect_uri: REDIRECT_URI,
                  grant_type: 'authorization_code'
                })
              });
              const tokens = await response.json();

              if (tokens.error) {
                reject(new Error(tokens.error_description || tokens.error));
              } else {
                resolve(tokens);
              }
            } catch (error) {
              reject(error);
            }finally {
              if (authWindow) authWindow.close();
            }
          }
        }
      };
      authWindow.webContents.on('will-redirect', checkUrl);
      authWindow.webContents.on('will-navigate', checkUrl);

      authWindow.on('closed', () => {
        if(!isAuthComplete){
          reject(new Error('User closed the login window'));          
        }
        authWindow = null;
      });
    })
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async (event) => {
  if (emergencyLockInfo) {
    event.preventDefault();
    console.log("Main Process: Wait! Deleting Google Drive lock before closing...");

    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${emergencyLockInfo.lockId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${emergencyLockInfo.token}` }
      });
      console.log("Main Process: Lock deleted successfully.");
    } catch (error) {
      console.error("Main Process: Failed to delete lock:", error);
    }
    emergencyLockInfo = null;
    app.quit();
  }
});