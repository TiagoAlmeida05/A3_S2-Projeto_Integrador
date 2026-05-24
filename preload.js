const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    loginToGoogle: () => ipcRenderer.invoke('login-to-google'),
    registerEmergencyLock: (lockId, token) => ipcRenderer.send('register-emergency-lock', { lockId, token }),
    clearEmergencyLock: () => ipcRenderer.send('clear-emergency-lock'),
    refreshGoogleToken: (refreshToken) => ipcRenderer.invoke('refresh-google-token', refreshToken)
});