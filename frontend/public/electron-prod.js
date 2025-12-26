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
let checksPassed = false;
const MAX_STRIKES = process.env.MAX_STRIKES;

let splashWindow;
let downloadProgressWindow;
let releaseNotesWindow = null;
let newVersion = '';

const PROTOCOL = "exam-buddy";

if (app.isPackaged) {
    app.setAsDefaultProtocolClient(PROTOCOL);
} else {
    // Fix for dev mode (Windows needs exe and arguments)
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
        path.resolve(process.argv[1])
    ]);
}

function getLocalChangelogNotes() {
    try {
        // packaged path
        const prodPath = path.join(process.resourcesPath, "app", "public", "changelog.md");

        // dev path
        const devPath = path.join(__dirname, "changelog.md");

        const fileToLoad = fs.existsSync(prodPath) ? prodPath : devPath;

        const markdown = fs.readFileSync(fileToLoad, "utf8");

        // Extract bullet notes (- or *)
        const notes = markdown
            .split("\n")
            .map(line => line.trim())
            .filter(line => line.startsWith("-") || line.startsWith("*"))
            .map(line => line.replace(/^[-*]\s*/, "").trim());

        return notes.length > 0 ? notes : ["No release notes available."];
    } catch (err) {
        console.error("ERROR reading changelog.md:", err);
        return ["No release notes available."];
    }
}

function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 400,
        height: 300,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        center: true,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    // This assumes you have created the `splash.html` file in the `public` directory.
    splashWindow.loadFile(path.join(__dirname, 'splash.html'));
    splashWindow.once('ready-to-show', () => {
        console.log("Splash screen is ready to show");
        splashWindow.show();
    });
    splashWindow.on('closed', () => (splashWindow = null));

}

function createDownloadProgressWindow() {
    const progressWindow = new BrowserWindow({
        width: 500, // <-- INCREASED FROM 450
        height: 450,
        resizable: false,
        minimizable: false,
        maximizable: false,
        closable: true,
        show: false,
        frame: false,
        parent: mainWindow,
        modal: true,
        webPreferences: {
            nodeIntegration: true, // <-- CHANGE TO true for this window
            contextIsolation: false, // <-- CHANGE TO false for this window
            enableRemoteModule: true
        }
    });

    // LOAD FROM HTML FILE INSTEAD OF DATA URL
    progressWindow.loadFile(path.join(__dirname, 'download-progress.html'));

    return progressWindow;
}

function createReleaseNotesWindow(releaseData) {
    // Resolve release-notes.html for dev + packaged builds
    function resolveReleaseNotesHTMLPath() {
        // Development
        if (!app.isPackaged) {
            const devPath = path.join(__dirname, 'release-notes.html');
            console.log('DEV release-notes path:', devPath);
            return devPath;
        }

        // Packaged — possible locations depending on your build config
        const candidatePaths = [
            // If you used "files": [ "public/**" ]
            path.join(process.resourcesPath, 'app', 'public', 'release-notes.html'),

            // If electron-builder placed it directly under app/
            path.join(process.resourcesPath, 'app', 'release-notes.html'),

            // Very rare but possible fallback location
            path.join(process.resourcesPath, 'release-notes.html'),

            // If ASAR is on and this file is unpacked (not your case, but safe)
            path.join(process.resourcesPath, 'app.asar.unpacked', 'public', 'release-notes.html'),
            path.join(process.resourcesPath, 'app.asar.unpacked', 'release-notes.html')
        ];

        for (const p of candidatePaths) {
            try {
                if (fs.existsSync(p)) {
                    console.log('Resolved packaged release-notes path:', p);
                    return p;
                }
            } catch (e) { /* ignore errors and try next */ }
        }

        console.warn('release-notes.html not found in any known packaged locations. Using fallback HTML.');
        return null;
    }

    // Create window
    releaseNotesWindow = new BrowserWindow({
        width: 450,
        height: 600,
        show: false,
        resizable: false,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        titleBarStyle: 'hidden',
        modal: true,
        parent: BrowserWindow.getFocusedWindow(),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        }
    });

    releaseNotesWindow.setMenuBarVisibility(false);

    const htmlPath = resolveReleaseNotesHTMLPath();

    if (!htmlPath) {
        // If file missing, load fallback HTML content
        const fallbackHtml = generateFallbackHTML(releaseData);
        releaseNotesWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fallbackHtml)}`);
    } else {
        try {
            releaseNotesWindow.loadFile(htmlPath);
        } catch (err) {
            console.error('Error loading release-notes.html. Using fallback.', err);
            const fallbackHtml = generateFallbackHTML(releaseData);
            releaseNotesWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fallbackHtml)}`);
        }
    }

    // Inject data into the window after load
    releaseNotesWindow.webContents.on('dom-ready', () => {
        console.log("Sending release data on dom-ready");
        releaseNotesWindow.webContents.send('load-release-data', enhanceReleaseData(releaseData));
    });

    releaseNotesWindow.once('ready-to-show', () => {
        releaseNotesWindow.show();
    });

    releaseNotesWindow.on('closed', () => {
        releaseNotesWindow = null;
    });

    return releaseNotesWindow;
}

function generateFallbackHTML(releaseData) {
    const enhancedData = enhanceReleaseData(releaseData);
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
            padding: 20px; 
            background: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .modal { 
            background: white; 
            padding: 20px; 
            border-radius: 12px; 
            max-width: 400px; 
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
    </style>
</head>
<body>
    <div class="modal">
        <h3>What's New</h3>
        <p>Version ${enhancedData.version}</p>
        <ul>
            ${enhancedData.notes.map(note => `<li>${note}</li>`).join('')}
        </ul>
        <button onclick="window.close()">Close</button>
    </div>
</body>
</html>`;
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
            if (!data.showOnNextLaunch) {
                console.log("Release notes already shown. Skipping.");
                return;
            }
            if (data && data.showOnNextLaunch) {
                if (isMainWindowVisible && mainWindow) {
                    console.log(`First launch after update. Showing release notes for version ${data.version}.`);
                    showReleaseNotes(data);
                } else {
                    console.log("Release notes pending until main window is visible.");
                    updateDialogQueue.push(() => {
                        showReleaseNotes(data);
                    });
                }
            }
        }
    } catch (err) { console.error("Error in handlePostUpdateLaunch:", err); }
}

function showReleaseNotes(releaseData) {
    console.log('Showing release notes with data:', releaseData);

    if (!releaseNotesWindow || releaseNotesWindow.isDestroyed()) {
        // Enhance release data with structured content
        const enhancedData = enhanceReleaseData(releaseData);
        console.log('Enhanced data:', enhancedData);
        releaseNotesWindow = createReleaseNotesWindow(enhancedData);
    } else {
        // If window already exists, just show it and update content
        console.log('Window exists, updating content...');
        releaseNotesWindow.webContents.send('load-release-data', enhanceReleaseData(releaseData));
        releaseNotesWindow.show();
        releaseNotesWindow.focus();
    }
}

function enhanceReleaseData(releaseData) {
    return {
        version: releaseData.version || "1.0.0",
        title: releaseData.title || "What's New",
        releaseDate: releaseData.releaseDate || new Date().toISOString(),
        notes: getLocalChangelogNotes()   // ALWAYS load from changelog.md
    };
}

ipcMain.on('request-release-notes', () => {
    try {
        console.log('Release notes requested, checking update info...');
        if (fs.existsSync(updateInfoPath)) {
            const data = JSON.parse(fs.readFileSync(updateInfoPath, 'utf8'));
            console.log('Update data found:', data);

            if (data && data.showOnNextLaunch) {
                // Reset the flag so it doesn't show again
                data.showOnNextLaunch = false;
                fs.writeFileSync(updateInfoPath, JSON.stringify(data, null, 2));

                const enhancedData = enhanceReleaseData(data);
                showReleaseNotes(enhanceReleaseData(data));
            } else {
                console.log('showOnNextLaunch is false, not showing release notes');
            }
        } else {
            console.log('No update info file found at:', updateInfoPath);
        }
    } catch (err) {
        console.error("Error handling release notes request:", err);
    }
});

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
        handlePostUpdateLaunch();

        // Perform update check after main window has initialized
        setTimeout(() => {
            autoUpdater.checkForUpdates();
        }, 3000);
    }, 1500);

    setInterval(() => {
        log.info("Performing periodic update check...");
        autoUpdater.checkForUpdates();
    }, 1000 * 60 * 60 * 4);
});

let deeplinkUrl = null;

// Windows deep linking handler
if (process.platform === "win32") {
    const deeplinkArg = process.argv.find(arg => arg.startsWith(`${PROTOCOL}://`));
    if (deeplinkArg) {
        deeplinkUrl = deeplinkArg;
    }
}

app.on('open-url', (event, url) => {
    event.preventDefault();
    deeplinkUrl = url;
    const params = new URL(url);
    const examId = params.searchParams.get("examId");
    if (mainWindow) {
        mainWindow.webContents.send("deeplink", { examId });
    }
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
    newVersion = info.version;

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
        const speed = progressObj.bytesPerSecond ?
            (progressObj.bytesPerSecond > 1024 * 1024 ?
                `${(progressObj.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s` :
                `${(progressObj.bytesPerSecond / 1024).toFixed(1)} KB/s`) :
            '0 KB/s';

        const downloaded = progressObj.transferred ?
            `${(progressObj.transferred / 1024 / 1024).toFixed(1)} MB` :
            '0 MB';

        const total = progressObj.total ?
            `${(progressObj.total / 1024 / 1024).toFixed(1)} MB` :
            '0 MB';

        let timeLeft = 'Calculating...';
        if (progressObj.eta && progressObj.eta > 0) {
            const minutes = Math.floor(progressObj.eta / 60);
            const seconds = progressObj.eta % 60;
            if (minutes > 0) {
                timeLeft = `${minutes}m ${seconds}s`;
            } else {
                timeLeft = `${seconds}s`;
            }
        }

        // Determine download stage based on progress
        let stage = 'Downloading update...';
        let status = `Downloading update... ${percent}% complete`;

        if (percent < 10) stage = 'Initializing download...';
        else if (percent < 30) stage = 'Downloading files...';
        else if (percent < 70) stage = 'Download in progress...';
        else if (percent < 95) stage = 'Finalizing download...';
        else stage = 'Almost complete...';

        const displayVersion = newVersion || (autoUpdater.currentVersion ? autoUpdater.currentVersion.version : '1.4.1');

        // Send progress update to the window
        downloadProgressWindow.webContents.send('progress-update', {
            percent: percent,
            status: status,
            stage: stage,
            speed: speed,
            downloaded: downloaded,
            total: total,
            timeLeft: timeLeft,
            ersion: displayVersion, // This will now show the new version
            newVersion: newVersion
        });
    }
});

autoUpdater.on('update-downloaded', (info) => {
    log.info(`Update ${info.version} downloaded. Prompting user to restart.`);

    if (mainWindow) mainWindow.setProgressBar(-1);

    // CLOSE DOWNLOAD PROGRESS WINDOW
    if (downloadProgressWindow && !downloadProgressWindow.isDestroyed()) {
        downloadProgressWindow.webContents.send('download-complete', {
            version: info.version // This is the new version
        });

        // Close progress window after a delay
        setTimeout(() => {
            if (downloadProgressWindow && !downloadProgressWindow.isDestroyed()) {
                downloadProgressWindow.close();
                downloadProgressWindow = null;
            }
        }, 2000);
    }

    try {
        const updateData = {
            version: info.version,
            notes: null,
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
    newVersion = '';
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
ipcMain.on('cancel-download', () => {
    log.info('User cancelled download.');
    if (downloadProgressWindow && !downloadProgressWindow.isDestroyed()) {
        downloadProgressWindow.close();
        downloadProgressWindow = null;
    }
    // Optionally add logic to actually cancel the autoUpdater download
});

ipcMain.handle('show-details', () => {
    // Implement details showing logic if needed
    console.log('Show details clicked');
});

ipcMain.handle('show-other', () => {
    // Implement other options logic if needed
    console.log('Other button clicked');
});

// ipcMain.on('login-screen-ready', () => {
//     console.log("React reports: Login screen has mounted.");

//     // Only proceed if BOTH sides of the handshake are complete.
//     // This is the failsafe against race conditions.
//     if (isMainWindowReady) {
//         console.log("Handshake complete. Closing splash and showing main window.");
//         if (splashWindow && !splashWindow.isDestroyed()) {
//             splashWindow.close();
//             splashWindow = null;
//         }
//         mainWindow.show();
//         isMainWindowVisible = true;
//         console.log("Gatekeeper: Main window is now visible. Dialogs are allowed.");
//         handlePostUpdateLaunch(); // Check for release notes now

//         if (updateDialogQueue.length > 0) {
//             console.log("Processing queued update dialog...");
//             const showDialog = updateDialogQueue.shift(); // Get the first dialog in the queue
//             showDialog(); // Execute it now that the window is visible
//         }

//     } else {
//         // This is an edge case, but good to have. If React is ready before Electron, we wait.
//         console.log("React is ready, but waiting for Electron window...");
//         mainWindow.once('ready-to-show', () => {
//             console.log("...Electron window is now ready. Handshake complete.");
//             if (splashWindow && !splashWindow.isDestroyed()) {
//                 splashWindow.close();
//                 splashWindow = null;
//             }
//             if (deeplinkUrl) {
//                 mainWindow.webContents.send("deeplink", deeplinkUrl);
//             }
//             mainWindow.show();
//             handlePostUpdateLaunch();
//         });
//     }
// });

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
ipcMain.on("release-notes-shown", () => {
    try {
        if (fs.existsSync(updateInfoPath)) {
            const data = JSON.parse(fs.readFileSync(updateInfoPath, "utf8"));
            data.showOnNextLaunch = false;
            fs.writeFileSync(updateInfoPath, JSON.stringify(data, null, 2));
            console.log("Release notes marked as shown.");
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
ipcMain.handle("perform-system-checks", async () => {
    const results = {
        camera: false,
        microphone: false,
        internet: false,
        singleDisplay: false
    };

    try {
        // 1️⃣ Camera & Microphone
        const devices = await session.defaultSession.getMediaDevices();
        results.camera = devices.some(d => d.kind === "videoinput");
        results.microphone = devices.some(d => d.kind === "audioinput");

        // 2️⃣ Internet check (simple + reliable)
        try {
            await require("dns").promises.resolve("google.com");
            results.internet = true;
        } catch {
            results.internet = false;
        }

        // 3️⃣ Single display check
        const displays = screen.getAllDisplays();
        results.singleDisplay = displays.length === 1;

        return results;

    } catch (err) {
        console.error("System check failed:", err);
        return results;
    }
});
ipcMain.on("system-check-failed", (event, failedItems) => {
    const readable = {
        camera: "Camera not detected",
        microphone: "Microphone not detected",
        internet: "No internet connection",
        singleDisplay: "Multiple displays detected"
    };

    const message = failedItems.map(i => "• " + readable[i]).join("\n");

    dialog.showMessageBox({
        type: "error",
        title: "System Requirements Not Met",
        message: "Please fix the following issues before continuing:",
        detail: message,
        buttons: ["Retry", "Exit"],
        defaultId: 0,
        cancelId: 1
    }).then(result => {
        if (result.response === 0) {
            // Retry → reload splash
            if (splashWindow) splashWindow.reload();
        } else {
            app.quit();
        }
    });
});
ipcMain.on("system-checks-passed", () => {
    console.log("System checks passed. Launching main window.");

    checksPassed = true;

    if (!mainWindow) {
        createWindow();   // 🔒 main window ONLY after checks
    }

    if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
    }

    mainWindow.show();
    isMainWindowVisible = true;
});
ipcMain.handle("checks-passed", () => checksPassed);