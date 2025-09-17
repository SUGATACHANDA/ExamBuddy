// public/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // --- Functions called FROM React ---
    examStarted: () => ipcRenderer.send('exam-started'),
    examFinished: () => ipcRenderer.send('exam-finished'),

    // --- Listeners for events FROM Electron main process ---
    onViolation: (callback) => ipcRenderer.on('violation', (event, type) => callback(type)),
    onExpel: (callback) => ipcRenderer.on('exam-expelled-by-proctor', () => callback()),

    killOtherProcesses: () => ipcRenderer.send('kill-other-processes'),
    getRunningApps: () => ipcRenderer.invoke('get-running-apps'),
    getVisibleApps: () => ipcRenderer.invoke('get-visible-apps'), // Get the list of apps
    killAppList: (appList) => ipcRenderer.send('kill-app-list', appList),

    getAppsToClose: () => ipcRenderer.invoke('get-apps-to-close'), // New name
    closeApp: () => ipcRenderer.send('close-app'),
    isDev: () => ipcRenderer.invoke('is-dev'),

    sendAppReady: () => ipcRenderer.send('react-app-ready'),

    getReleaseNotes: () => ipcRenderer.invoke('get-release-notes'),
    releaseNotesShown: () => ipcRenderer.send('release-notes-shown'),

    enterFullscreen: () => ipcRenderer.send('enter-fullscreen'), // For LoginScreen
    onShowReleaseNotes: (callback) => ipcRenderer.on('show-release-notes', (event, data) => callback(data)),

    // New listener to get the result back from the main process
    onKillProcessesResult: (callback) => ipcRenderer.on('kill-processes-result', (event, result) => callback(result)),

    // --- Security: Detect and prevent copy/paste ---
    setupSecurityListeners: () => {
        const eventsToBlock = ['copy', 'cut', 'paste'];
        eventsToBlock.forEach(type => {
            window.addEventListener(type, (e) => {
                // Stop the event
                e.preventDefault();
                // Notify the main process (which can then notify the renderer)
                ipcRenderer.send('violation-detected', 'COPY_PASTE_ATTEMPT');
            });
        });
    },

    // --- Notify React about copy/paste violation ---
    onCopyPasteViolation: (callback) => ipcRenderer.on('violation', (event, type) => {
        if (type === 'COPY_PASTE_ATTEMPT') {
            callback();
        }
    })
});