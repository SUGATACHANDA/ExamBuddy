/* eslint-disable no-unused-vars */
// public/electron-prod.js
// This is the MAIN entry file for the PACKAGED PRODUCTION application.

// `session` is the key module we need to import for this fix
const { app, BrowserWindow, ipcMain, screen, session, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const url = require('url');
const fs = require('fs');

const log = require('electron-log');
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
const updateInfoPath = path.join(app.getPath('userData'), 'update-info.json');

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow;
let isExamInProgress = false;

let splashWindow;

function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 400,
        height: 300,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        center: true,
    });
    // This assumes you have created the `splash.html` file in the `public` directory.
    splashWindow.loadFile(path.join(__dirname, 'splash.html'));
    splashWindow.on('closed', () => (splashWindow = null));
}

function createWindow() {
    console.log("--- Production electron.js (electron-prod.js) is running ---");

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 768,
        show: false, // Window will be created hidden.
        frame: true, // Show the normal window frame for login.
        // kiosk and alwaysOnTop are now handled programmatically.
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
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
        if (splashWindow) {
            splashWindow.close();
        }
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

    createSplashWindow();
    createWindow();
    setTimeout(() => {
        autoUpdater.checkForUpdates();
    }, 3000);

    setInterval(() => {
        log.info("Performing periodic update check...");
        autoUpdater.checkForUpdates();
    }, 1000 * 60 * 60 * 4);
});

function handlePostUpdateLaunch() {
    try {
        if (fs.existsSync(updateInfoPath)) {
            const data = JSON.parse(fs.readFileSync(updateInfoPath, 'utf8'));

            // Check if we need to show the "What's New" dialog
            if (data && data.showOnNextLaunch) {
                console.log(`First launch after updating to ${data.version}. Sending release notes to UI.`);
                // Send the release notes to the frontend to be displayed.
                mainWindow.webContents.send('show-release-notes', data);

                // Now, immediately update the flag to false so it doesn't show again.
                data.showOnNextLaunch = false;
                fs.writeFileSync(updateInfoPath, JSON.stringify(data));
            }
        }
    } catch (err) {
        console.error("Error handling post-update launch:", err);
    }
}

// ------------------------------------------

autoUpdater.on('error', (err) => {
    log.error('Auto-Updater Error:', err);
});

autoUpdater.on('update-not-available', () => {
    log.info('No update available.');
});

// This event fires when a new version is found, BEFORE downloading.
autoUpdater.on('update-available', (info) => {
    log.info(`Update found: version ${info.version}. Prompting user to download.`);

    dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) of Exam Buddy is available.`,
        detail: `Would you like to download it now? It will be installed the next time you restart the application.`,
        buttons: ['Download Update', 'Remind Me Later'],
        defaultId: 0,
        cancelId: 1
    }).then(result => {
        if (result.response === 0) { // 'Download Update' was clicked
            log.info('User approved download. Starting download...');
            autoUpdater.downloadUpdate();
        } else {
            log.info('User deferred the update.');
        }
    });
});

autoUpdater.on('update-downloaded', (info) => {
    log.info(`Update ${info.version} downloaded. Prompting user to restart.`);

    dialog.showMessageBox({
        type: 'info',
        title: 'Update Ready to Install',
        message: 'The new version of Exam Buddy has been downloaded.',
        detail: 'Restart the application now to apply the updates.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1
    }).then(result => {
        if (result.response === 0) { // 'Restart Now' was clicked
            log.info('User approved restart. Quitting and installing...');
            autoUpdater.quitAndInstall();
        }
    });
});

ipcMain.on('enter-fullscreen', () => {
    if (mainWindow) {
        console.log("IPC: Received signal to enter fullscreen mode.");
        mainWindow.setFullScreen(true);
    }
});
ipcMain.on('react-app-ready', () => {
    console.log("React app has signaled it is ready.");
    if (splashWindow) {
        splashWindow.close();
    }
    mainWindow.center();
    mainWindow.show();
});

ipcMain.handle('get-release-notes', () => {
    try {
        if (fs.existsSync(updateInfoPath)) {
            const data = JSON.parse(fs.readFileSync(updateInfoPath, 'utf8'));
            // If the "show" flag is true, return the data.
            if (data && data.showOnNextLaunch) {
                return data;
            }
        }
    } catch (err) {
        console.error("Could not read release notes:", err);
    }
    return null; // Return null if there are no notes to show.
});

// Another handler to mark the notes as "read" so they don't show again.
ipcMain.on('release-notes-shown', () => {
    try {
        if (fs.existsSync(updateInfoPath)) {
            const data = JSON.parse(fs.readFileSync(updateInfoPath, 'utf8'));
            data.showOnNextLaunch = false; // Set the flag to false
            fs.writeFileSync(updateInfoPath, JSON.stringify(data));
        }
    } catch (err) {
        console.error("Could not mark release notes as shown:", err);
    }
});

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
ipcMain.on('exam-started', () => {
    console.log('IPC: Exam started. Entering kiosk mode.');
    isExamInProgress = true;
    if (mainWindow) {
        mainWindow.setKiosk(true);
        mainWindow.setAlwaysOnTop(true);
    }
});

ipcMain.on('exam-finished', () => {
    console.log('IPC: Exam finished. Exiting kiosk mode.');
    isExamInProgress = false;
    if (mainWindow) {
        mainWindow.setKiosk(false);
        mainWindow.setAlwaysOnTop(false);
    }
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