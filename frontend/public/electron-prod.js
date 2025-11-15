/* eslint-disable no-unused-vars */
// public/electron-prod.js
// This is the MAIN entry file for the PACKAGED PRODUCTION application.

// `session` is the key module we need to import for this fix
const { app, BrowserWindow, ipcMain, screen, session, dialog, protocol } = require('electron');
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
let isMainWindowReady = false;
let updateDialogQueue = [];
let isMainWindowVisible = false;
let violationStrikes = 0;
const MAX_STRIKES = 3;

let splashWindow;
let downloadProgressWindow;

function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 400,
        height: 300,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        center: true,
        show: true
    });
    // This assumes you have created the `splash.html` file in the `public` directory.
    splashWindow.loadFile(path.join(__dirname, 'splash.html'));
    splashWindow.on('closed', () => (splashWindow = null));
}

function createDownloadProgressWindow() {
    const progressWindow = new BrowserWindow({
        width: 450,
        height: 280,
        resizable: false,
        minimizable: false,
        maximizable: false,
        closable: false,
        show: false,
        frame: false,
        alwaysOnTop: true,
        transparent: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    progressWindow.loadURL(`data:text/html;charset=utf-8,
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .header h2 {
                    margin: 0 0 5px 0;
                    font-size: 18px;
                    font-weight: 600;
                }
                .header p {
                    margin: 0;
                    font-size: 12px;
                    opacity: 0.9;
                }
                .progress-container {
                    background: rgba(255,255,255,0.1);
                    border-radius: 10px;
                    padding: 15px;
                    margin: 10px 0;
                }
                .progress-info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    font-size: 12px;
                }
                .progress-bar {
                    width: 100%;
                    height: 20px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 10px;
                    overflow: hidden;
                }
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #4CAF50, #45a049);
                    border-radius: 10px;
                    transition: width 0.3s ease;
                    width: 0%;
                }
                .status {
                    text-align: center;
                    font-size: 14px;
                    margin: 10px 0;
                    font-weight: 500;
                }
                .details {
                    background: rgba(255,255,255,0.1);
                    border-radius: 5px;
                    padding: 10px;
                    font-size: 11px;
                    margin: 10px 0;
                    max-height: 60px;
                    overflow-y: auto;
                }
                .buttons {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    margin-top: 15px;
                }
                button {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                    transition: all 0.2s;
                }
                .show-btn {
                    background: #4CAF50;
                    color: white;
                }
                .cancel-btn {
                    background: #f44336;
                    color: white;
                }
                .other-btn {
                    background: #2196F3;
                    color: white;
                }
                button:hover {
                    opacity: 0.9;
                    transform: translateY(-1px);
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>Downloading Update</h2>
                <p>Exam Buddy is being updated...</p>
            </div>
            
            <div class="progress-container">
                <div class="progress-info">
                    <span>Progress:</span>
                    <span id="progress-percent">0%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="progress-fill"></div>
                </div>
            </div>
            
            <div class="status" id="status">Initializing download...</div>
            
            <div class="details" id="details">
                • Preparing update package<br>
                • Connecting to update server
            </div>
            
            <div class="buttons">
                <button class="show-btn" onclick="showDetails()">Show details</button>
                <button class="other-btn" onclick="showOther()">Other</button>
                <button class="cancel-btn" onclick="cancelDownload()">Cancel</button>
            </div>

            <script>
                function showDetails() {
                    window.electronAPI.showDetails();
                }
                function showOther() {
                    window.electronAPI.showOther();
                }
                function cancelDownload() {
                    window.electronAPI.cancelDownload();
                }
                
                // Update progress from main process
                window.electronAPI.onProgressUpdate((percent, status, details) => {
                    document.getElementById('progress-percent').textContent = percent + '%';
                    document.getElementById('progress-fill').style.width = percent + '%';
                    document.getElementById('status').textContent = status;
                    document.getElementById('details').innerHTML = details;
                });
            </script>
        </body>
        </html>
    `.replace(/\s+/g, ' '));

    return progressWindow;
}

function createWindow() {
    console.log("--- Production electron.js (electron-prod.js) is running ---");

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 768,
        fullscreen: true,
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
        console.log("Electron reports: Main window is ready to show.");
        isMainWindowReady = true; // Mark our side of the handshake as complete
    });

    // Security Listeners
    mainWindow.on('blur', () => { if (isExamInProgress) mainWindow.webContents.send('violation', 'TAB_SWITCH'); });
    mainWindow.on('close', (e) => { if (isExamInProgress) e.preventDefault(); });
    mainWindow.on('closed', () => (mainWindow = null));
}

function handlePostUpdateLaunch() {
    try {
        if (fs.existsSync(updateInfoPath)) {
            const data = JSON.parse(fs.readFileSync(updateInfoPath, 'utf8'));
            if (data && data.showOnNextLaunch) {
                if (isMainWindowVisible && mainWindow) {
                    console.log(`First launch after update. Sending release notes to UI for version ${data.version}.`);
                    mainWindow.webContents.send('show-release-notes', data);
                } else {
                    console.log("Release notes pending until main window is visible.");
                    updateDialogQueue.push(() => {
                        if (mainWindow) {
                            mainWindow.webContents.send('show-release-notes', data);
                        }
                    });
                }
            }
        }
    } catch (err) { console.error("Error in handlePostUpdateLaunch:", err); }
}

// public/electron-prod.js




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
    setTimeout(() => {
        createWindow();
        handlePostUpdateLaunch();

        // Perform update check after main window has initialized
        setTimeout(() => {
            autoUpdater.checkForUpdates();
        }, 3000);
    }, 100);

    setInterval(() => {
        log.info("Performing periodic update check...");
        autoUpdater.checkForUpdates();
    }, 1000 * 60 * 60 * 4);
});



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

    const showDownloadPrompt = () => {
        dialog.showMessageBox({
            type: 'info',
            title: 'Update Available',
            message: `A new version (${info.version}) of Exam Buddy is available.`,
            detail: `Would you like to download it now? It will be installed the next time you restart the application.`,
            buttons: ['Download Update', 'Remind Me Later'],
            defaultId: 0,
            cancelId: 1
        }).then(result => {
            if (result.response === 0) {
                log.info('User approved download. Starting download...');
                // CREATE DOWNLOAD PROGRESS WINDOW
                downloadProgressWindow = createDownloadProgressWindow();
                downloadProgressWindow.show();
                autoUpdater.downloadUpdate();
            } else {
                log.info('User deferred the update.');
            }
        });
    }
    if (isMainWindowVisible) {
        showDownloadPrompt();
    } else {
        console.log("Update found, but window not visible yet. Queuing dialog.");
        updateDialogQueue.push(showDownloadPrompt);
    }
});

autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.floor(progressObj.percent);
    const log_message = `Downloading update... ${percent}%`;
    console.log(log_message);

    if (mainWindow) {
        mainWindow.setProgressBar(progressObj.percent / 100);
        mainWindow.webContents.send('update-progress', progressObj);
    }

    // UPDATE DOWNLOAD PROGRESS WINDOW
    if (downloadProgressWindow && !downloadProgressWindow.isDestroyed()) {
        const speed = progressObj.bytesPerSecond ? ` (${(progressObj.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s)` : '';
        const transferred = progressObj.transferred ? `Transferred: ${(progressObj.transferred / 1024 / 1024).toFixed(1)} MB` : '';
        const total = progressObj.total ? `Total: ${(progressObj.total / 1024 / 1024).toFixed(1)} MB` : '';

        const details = `
            • Downloading update package<br>
            • ${transferred}<br>
            • ${total}<br>
            • Speed: ${speed}<br>
            • Estimated time: ${progressObj.eta ? progressObj.eta + 's' : 'calculating...'}
        `.trim();

        downloadProgressWindow.webContents.executeJavaScript(`
            document.getElementById('progress-percent').textContent = '${percent}%';
            document.getElementById('progress-fill').style.width = '${percent}%';
            document.getElementById('status').textContent = 'Downloading update... ${percent}% complete';
            document.getElementById('details').innerHTML = \`${details}\`;
        `);
    }
});

autoUpdater.on('update-downloaded', (info) => {
    log.info(`Update ${info.version} downloaded. Prompting user to restart.`);

    if (mainWindow) mainWindow.setProgressBar(-1);

    // CLOSE DOWNLOAD PROGRESS WINDOW
    if (downloadProgressWindow && !downloadProgressWindow.isDestroyed()) {
        downloadProgressWindow.close();
        downloadProgressWindow = null;
    }

    try {
        const updateData = {
            version: info.version,
            notes: info.releaseNotes || "No release notes provided.",
            showOnNextLaunch: true
        };
        fs.writeFileSync(updateInfoPath, JSON.stringify(updateData));
        log.info("Saved update-info.json for release notes:", updateData);
    } catch (err) {
        log.error("Could not save update-info.json:", err);
    }

    const showRestartPrompt = () => {
        dialog.showMessageBox({
            type: 'info',
            title: 'Update Ready to Install',
            message: 'The new version of Exam Buddy has been downloaded.',
            detail: 'Restart the application now to apply the updates.',
            buttons: ['Restart Now', 'Later'],
            defaultId: 0,
            cancelId: 1
        }).then(result => {
            if (result.response === 0) {
                log.info('User approved restart. Quitting and installing...');
                autoUpdater.quitAndInstall();
            }
        });
    }
    if (isMainWindowVisible) {
        showRestartPrompt();
    } else {
        console.log("Update downloaded, but window not visible. Queuing restart dialog.");
        updateDialogQueue.push(showRestartPrompt);
    }
});

autoUpdater.on('error', (err) => {
    log.error('Auto-Updater Error:', err);
    // CLOSE DOWNLOAD PROGRESS WINDOW ON ERROR
    if (downloadProgressWindow && !downloadProgressWindow.isDestroyed()) {
        downloadProgressWindow.close();
        downloadProgressWindow = null;
    }
});

// Add IPC handlers for the download progress window buttons
ipcMain.handle('cancel-download', () => {
    log.info('User cancelled download.');
    if (downloadProgressWindow && !downloadProgressWindow.isDestroyed()) {
        downloadProgressWindow.close();
        downloadProgressWindow = null;
    }
    // You might want to add logic to actually cancel the download
});

ipcMain.handle('show-details', () => {
    // Implement details showing logic if needed
    console.log('Show details clicked');
});

ipcMain.handle('show-other', () => {
    // Implement other options logic if needed
    console.log('Other button clicked');
});

ipcMain.on('login-screen-ready', () => {
    console.log("React reports: Login screen has mounted.");

    // Only proceed if BOTH sides of the handshake are complete.
    // This is the failsafe against race conditions.
    if (isMainWindowReady) {
        console.log("Handshake complete. Closing splash and showing main window.");
        setTimeout(() => {
            if (splashWindow && !splashWindow.isDestroyed()) {
                splashWindow.close();
                splashWindow = null;
            }
            mainWindow.show();
            isMainWindowVisible = true;
            console.log("Gatekeeper: Main window is now visible.");
            handlePostUpdateLaunch();

            if (updateDialogQueue.length > 0) {
                console.log("Processing queued update dialog...");
                const showDialog = updateDialogQueue.shift();
                showDialog();
            }
        }, 500);
        mainWindow.show();
        isMainWindowVisible = true;
        console.log("Gatekeeper: Main window is now visible. Dialogs are allowed.");
        handlePostUpdateLaunch(); // Check for release notes now

        if (updateDialogQueue.length > 0) {
            console.log("Processing queued update dialog...");
            const showDialog = updateDialogQueue.shift(); // Get the first dialog in the queue
            showDialog(); // Execute it now that the window is visible
        }

    } else {
        // This is an edge case, but good to have. If React is ready before Electron, we wait.
        console.log("React is ready, but waiting for Electron window...");
        mainWindow.once('ready-to-show', () => {
            console.log("...Electron window is now ready. Handshake complete.");
            if (splashWindow && !splashWindow.isDestroyed()) {
                splashWindow.close();
                splashWindow = null;
            }
            mainWindow.show();
            handlePostUpdateLaunch();
        });
    }
});

ipcMain.on('enter-fullscreen', () => {
    if (mainWindow) {
        console.log("IPC: Received signal to enter fullscreen mode.");
        mainWindow.setFullScreen(true);
    }
});

// ipcMain.on('react-app-ready', () => {
//     console.log("React app has signaled it is ready.");
//     if (splashWindow) {
//         splashWindow.close();
//     }
//     mainWindow.center();
//     mainWindow.show();
// });

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
            data.showOnNextLaunch = false;
            fs.writeFileSync(updateInfoPath, JSON.stringify(data));
        }
    } catch (err) {
        console.error("Could not mark release notes as shown:", err);
    }
});

// ipcMain.handle("get-latest-changelog", () => {
//     return getLatestChangelog();
// });

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
ipcMain.on('exam-started', () => {
    console.log('IPC: Exam started. Lockdowns enabled. Strike count reset to 0.');
    isExamInProgress = true;
    violationStrikes = 0; // Reset for every new exam attempt
});

// The 'exam-finished' handler can also reset it as a failsafe.
ipcMain.on('exam-finished', () => {
    console.log('IPC: Exam finished. Lockdowns disabled. Resetting strike count.');
    isExamInProgress = false;
    violationStrikes = 0;
});


// --- THE NEW, DEFINITIVE VIOLATION HANDLER with 3-STRIKES LOGIC ---
ipcMain.on('ipc-violation', (event, violationType) => {
    if (!isExamInProgress) return; // Ignore violations if exam is not active

    // 1. Increment the strike count
    violationStrikes++;
    console.log(`Violation detected. Type: ${violationType}. Strike count is now: ${violationStrikes}`);

    // 2. Check the strike count
    if (violationStrikes >= MAX_STRIKES) {
        // --- EXPULSION ---
        console.log("Maximum strikes reached. Sending final expulsion signal to renderer.");
        // We send the standard 'violation' message which ExamScreen is already listening for to trigger expulsion.
        if (mainWindow) {
            mainWindow.webContents.send('violation', `Maximum warnings (${MAX_STRIKES}) reached due to: ${violationType}`);
        }
    } else {
        // --- SHOW A WARNING ---
        console.log("Sending warning signal to renderer.");
        // Send a new, specific message to the renderer to show a warning dialog.
        if (mainWindow) {
            mainWindow.webContents.send('show-warning-dialog', {
                strike: violationStrikes,
                max: MAX_STRIKES,
                type: violationType
            });
        }
    }
});