/* eslint-disable no-unused-vars */
// public/electron-prod.js
// This is the MAIN entry file for the PACKAGED PRODUCTION application.

// `session` is the key module we need to import for this fix
const { app, BrowserWindow, ipcMain, screen, session } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;
let isExamInProgress = false;

function createWindow() {
    console.log("--- Production electron.js (electron-prod.js) is running ---");

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width,
        height,
        show: false,
        frame: false,
        kiosk: true,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            // devTools: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    const startUrl = url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    });

    console.log("PRODUCTION MODE: Loading URL:", startUrl);
    mainWindow.loadURL(startUrl);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        // mainWindow.webContents.openDevTools();
    });

    // Security Listeners
    mainWindow.on('blur', () => { if (isExamInProgress) mainWindow.webContents.send('violation', 'TAB_SWITCH'); });
    mainWindow.on('close', (e) => { if (isExamInProgress) e.preventDefault(); });
    mainWindow.on('closed', () => (mainWindow = null));
}

// == App Lifecycle ==

// --- THIS IS THE PRODUCTION SCREEN SHARE FIX ---
// The `app.on('ready', ...)` block is replaced by the more modern `app.whenReady().then(...)`
app.whenReady().then(() => {
    // We get the default session for our application.
    const defaultSession = session.defaultSession;

    // This is the critical line. It tells Electron's underlying browser engine
    // to treat the 'file://' protocol as a secure origin.
    // This allows powerful APIs like getDisplayMedia (screen share) to work.
    if (defaultSession && defaultSession.protocol && defaultSession.protocol.registerSchemesAsPrivileged) {
        defaultSession.protocol.registerSchemesAsPrivileged([
            {
                scheme: 'file',
                privileges: {
                    secure: true,
                    standard: true,
                    corsEnabled: true,
                    allowServiceWorkers: true,
                    supportFetchAPI: true
                }
            }
        ]);
    }

    // Now that the protocol is configured, we can create our main window.
    createWindow();
});
// ------------------------------------------

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// == Inter-Process Communication (IPC) ==
ipcMain.on('exam-started', () => { isExamInProgress = true; });
ipcMain.on('exam-finished', () => {
    console.log('IPC: Production exam finished signal received. Quitting application.');
    isExamInProgress = false; // Disable lockdowns just in case quit fails
    // if (mainWindow) {
    //     mainWindow.setKiosk(false);
    //     mainWindow.setAlwaysOnTop(false);
    //     mainWindow.setFullScreen(false);
    //     // Optionally resize the window
    //     const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    //     mainWindow.setSize(Math.round(width * 0.8), Math.round(height * 0.8), true);
    //     mainWindow.center();
    // }
});
ipcMain.on('force-expel-student', () => { if (mainWindow) mainWindow.webContents.send('exam-expelled-by-proctor'); });

app.on('ready', createWindow);
const { exec } = require('child_process');
// --- THE FINAL, CORRECT IPC HANDLER ---
// NOTE: We do not require or import 'ps-list' here at the top level.

const normalize = (name) => (name || "").toLowerCase().trim();

// --- WHITELIST: processes that should never be killed ---
const BASE_WHITELIST = [
    // isDev ? "electron.exe" : 
    "Exam Proctor.exe",
    "explorer.exe", "dwm.exe", "sihost.exe", "svchost.exe",
    "ctfmon.exe", "textinputhost.exe", "msmpeng.exe",
    "securityhealthservice.exe", "nvidia web helper.exe",
    "nvcontainer.exe", "code.exe",
    "cmd.exe", "conhost.exe",
    "powershell.exe", "windows powershell", "chrome.exe"
].map(normalize);

ipcMain.handle('get-apps-to-close', async () => {
    try {
        // --- Stage 1: Get all process data using WMIC ---
        const allProcesses = await new Promise((resolve, reject) => {
            exec('wmic process get name, processid, parentprocessid /format:csv', (err, stdout) => {
                if (err) return reject(err);

                const processes = stdout.trim().split('\n').slice(1) // Skip header line
                    .map(line => {
                        const parts = line.trim().split(',');
                        if (parts.length < 4) return null;
                        return {
                            name: parts[1],
                            ppid: parseInt(parts[2]),
                            pid: parseInt(parts[3])
                        };
                    }).filter(Boolean);
                resolve(processes);
            });
        });

        // --- Stage 2: Build exclusion list of our own process tree ---
        const processesToExclude = new Set();
        const addAllChildren = (pid) => {
            processesToExclude.add(pid);
            allProcesses.forEach(process => {
                if (process.ppid === pid && !processesToExclude.has(process.pid)) {
                    addAllChildren(process.pid);
                }
            });
        };
        addAllChildren(process.pid);

        // --- Stage 3: Get all VISIBLE user apps ---
        const visibleApps = await new Promise((resolve) => {
            const command = `tasklist /FO CSV /NH /FI "STATUS eq RUNNING" /FI "USERNAME eq %USERNAME%" /FI "WINDOWTITLE ne ''"`;
            exec(command, (err, stdout) => {
                if (err) { resolve([]); return; }
                const apps = stdout.trim().split('\n').map(line => {
                    const parts = line.replace(/"/g, '').split(',');
                    return { name: parts[0], pid: parseInt(parts[1]) };
                }).filter(p => p.name && !isNaN(p.pid));
                resolve(apps);
            });
        });

        // --- Stage 4: Apply filter ---
        const appsToKill = visibleApps.filter(app => {
            const isDevelopmentProcess = processesToExclude.has(app.pid);
            const isWhitelistedByName = BASE_WHITELIST.includes(normalize(app.name));
            return !isDevelopmentProcess && !isWhitelistedByName;
        });

        const uniqueAppNamesToKill = [...new Set(appsToKill.map(app => app.name))];
        console.log("Final list of apps to be closed:", uniqueAppNamesToKill);

        return uniqueAppNamesToKill;

    } catch (err) {
        console.error("FATAL ERROR in get-apps-to-close:", err);
        return [];
    }
});

// 2. Kill the provided list of apps
ipcMain.on('kill-app-list', (event, appList) => {
    if (!appList || !Array.isArray(appList)) return;

    console.log(`User confirmed. Killing ${appList.length} non-essential applications.`);
    appList.forEach(appName => {
        // Use /IM to kill by name, and /F to force it.
        exec(`taskkill /IM "${appName}" /F`);
    });
});

ipcMain.on('close-app', () => {
    console.log('IPC: Received signal to quit the application.');
    app.quit();
});