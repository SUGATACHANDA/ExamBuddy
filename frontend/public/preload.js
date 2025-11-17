// public/preload.js
const { contextBridge, ipcRenderer } = require('electron');

const keydownHandler = (e) => {
    // --- Determine if the shortcut is forbidden ---
    let isForbidden = false;
    let violationType = '';

    // 1. Check for F-keys (F1-F12)
    if (e.key.startsWith('F') && e.key.length > 1 && parseInt(e.key.substring(1), 10) > 0) {
        isForbidden = true;
        violationType = `FORBIDDEN_KEY (${e.key})`;
    }

    // 2. Check for combinations with Ctrl, Alt, or Meta (Cmd/Win) keys
    if (e.ctrlKey || e.altKey || e.metaKey) {
        const key = e.key.toLowerCase();

        // This is a WHITELIST of shortcuts we might allow ONLY inside text boxes
        const allowedInInputs = ['a', 'c', 'x', 'v', 'z']; // select all, copy, cut, paste, undo
        const targetIsInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

        if (targetIsInput && allowedInInputs.includes(key)) {
            // Let the event through for inputs but we will still monitor it
            // The main process can decide if copy/paste itself is a violation
        } else {
            // If it's any other combo, it's forbidden.
            isForbidden = true;

            let modifier = '';
            if (e.ctrlKey) modifier = 'Ctrl';
            if (e.altKey) modifier = 'Alt';
            if (e.metaKey) modifier = 'Meta';

            violationType = `FORBIDDEN_SHORTCUT (${modifier}+${e.key.toUpperCase()})`;
        }
    }

    // --- Take Action if a Violation is Found ---
    if (isForbidden) {
        // 1. Prevent the browser's default action (e.g., refresh, print)
        e.preventDefault();
        e.stopPropagation(); // Stop it from bubbling up to other listeners

        // 2. THIS IS THE DEFINITIVE FIX:
        // Send a message to the main process, informing it of the specific violation.
        console.warn(`[EXAM SECURITY] Violation Detected. Sending IPC message: 'ipc-violation' with type: ${violationType}`);
        ipcRenderer.send('ipc-violation', violationType);
    }
};

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


    sendLoginScreenReady: () => ipcRenderer.send('login-screen-ready'),

    enterFullscreen: () => ipcRenderer.send('enter-fullscreen'), // For LoginScreen


    getLatestChangelog: () => ipcRenderer.invoke("get-latest-changelog"),
    markChangelogShown: () => ipcRenderer.send("release-notes-shown"),

    // New listener to get the result back from the main process
    onKillProcessesResult: (callback) => ipcRenderer.on('kill-processes-result', (event, result) => callback(result)),

    onShowReleaseNotes: (callback) => ipcRenderer.on('show-release-notes', callback),
    requestReleaseNotes: () => ipcRenderer.send('request-release-notes'),
    releaseNotesShown: () => ipcRenderer.send('release-notes-shown'),

    exitApp: () => ipcRenderer.send('exit-app'),


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
    }),
    onResetToken: (callback) => {
        ipcRenderer.on('reset-token', (event, token) => callback(token));
    },

    toggleKeyboardLock: (lock) => {
        if (lock) {
            console.log("Preload: Enabling keyboard shortcut monitor.");
            window.addEventListener('keydown', keydownHandler, true);
        } else {
            console.log("Preload: Disabling keyboard shortcut monitor.");
            window.removeEventListener('keydown', keydownHandler, true);
        }
    },
    onShowWarningDialog: (callback) => ipcRenderer.on('show-warning-dialog', (event, data) => callback(data)),
});