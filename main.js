const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true, 
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.maximize()
  
  win.loadURL('http://localhost:5173')
}

// Listen for React asking to open the folder picker
ipcMain.handle('dialog:openDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: "Select Project Destination"
  });
  
  if (canceled) {
    return null;
  } else {
    return filePaths[0]; // Returns the chosen path to React
  }
});

ipcMain.handle('system:getDefaultPath', () => {
  // Automatically gets the user's "Documents" folder
  const docsPath = app.getPath('documents'); 
  return path.join(docsPath, 'jUPiter_Projects');
});

app.whenReady().then(() => {
  createWindow()

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