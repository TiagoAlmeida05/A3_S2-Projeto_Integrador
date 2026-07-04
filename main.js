const { app, BrowserWindow, ipcMain, dialog } = require('electron');
app.setName('jUPiter QDA');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'build', 'logo.ico'), 
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true, 
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.maximize();
  mainWindow.removeMenu();
  
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }
}

const fs = require('fs');
const logPath = path.join(app.getPath('userData'), 'backend.log');
function log(msg) {
  fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
}

// Function to start the FastAPI sidecar
function startBackend() {
  if (app.isPackaged) {
    const backendPath = path.join(process.resourcesPath, 'backend', 'jupiter-backend', 'jupiter-backend.exe');
    const userDataPath = app.getPath('userData');
    
    backendProcess = spawn(backendPath, [], {
      cwd: path.join(process.resourcesPath, 'backend'),
      env: { ...process.env, JUPITER_DATA_DIR: userDataPath }
    });

    backendProcess.on('error', (err) => console.error(`Failed to start backend: ${err.message}`));
    backendProcess.on('exit', (code, signal) => console.error(`Backend exited: code=${code} signal=${signal}`));
  } else {
    console.log("Running in dev mode. Ensure your FastAPI server is running on port 8000.");
  }

  if (backendProcess) {
    backendProcess.stdout.on('data', (data) => console.log(`Backend: ${data}`));
    backendProcess.stderr.on('data', (data) => console.error(`Backend Error: ${data}`));
  }
}

ipcMain.handle('dialog:openDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: "Select Project Destination"
  });
  return canceled ? null : filePaths[0];
});

ipcMain.handle('system:getDefaultPath', () => {
  return path.join(app.getPath('documents'), 'jUPiter_Projects');
});

function waitForBackend(url, timeoutMs = 15000, intervalMs = 300) {
  const http = require('http');
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(url, (res) => {
        resolve(true);
      }).on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error('Backend did not start in time'));
        } else {
          setTimeout(check, intervalMs);
        }
      });
    };
    check();
  });
}

app.whenReady().then(async() => {
  startBackend();

   if (app.isPackaged) {
    try {
      await waitForBackend('http://127.0.0.1:8000/');
      log('Backend is ready.');
    } catch (err) {
      log(`Backend failed to start in time: ${err.message}`);
    }
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});