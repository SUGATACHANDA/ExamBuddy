// // public/electron.js
// // This is the SINGLE main entry file for both Development and Production.

// const { app, BrowserWindow, ipcMain, screen, session } = require('electron');
// const path = require('path');
// const url = require('url');
// const isDev = require('electron-is-dev');
// const { exec } = require('child_process');

// let mainWindow;
// let isExamInProgress = false;

// // --- Function to Create the Application Window ---
// function createWindow() {
//     console.log(`--- Running in ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'} mode ---`);

//     const { width, height } = screen.getPrimaryDisplay().workAreaSize;

//     mainWindow = new BrowserWindow({
//         width,
//         height,
//         show: false,
//         frame: isDev,
//         kiosk: !isDev,
//         alwaysOnTop: !isDev,
//         webPreferences: {
//             nodeIntegration: false,
//             contextIsolation: true,
//             preload: path.join(__dirname, 'preload.js'),
//             devTools: isDev,
//         }
//     });

//     const startUrl = isDev
//         ? 'http://localhost:3000'
//         : url.format({
//             pathname: path.join(__dirname, '../build/index.html'),
//             protocol: 'file:',
//             slashes: true
//         });

//     console.log("Loading URL:", startUrl);
//     mainWindow.loadURL(startUrl);

//     mainWindow.once('ready-to-show', () => {
//         mainWindow.show();
//         if (isDev) {
//             mainWindow.webContents.openDevTools();
//         }
//     });

//     // --- Window Event Listeners ---
//     mainWindow.on('blur', () => { if (isExamInProgress) mainWindow.focus(); });
//     mainWindow.on('close', (e) => { if (isExamInProgress) e.preventDefault(); });
//     mainWindow.on('closed', () => (mainWindow = null));
// }

// // --- App Lifecycle ---
// app.whenReady().then(() => {
//     if (!isDev) {
//         session.defaultSession.protocol.registerSchemesAsPrivileged([
//             { scheme: 'file', privileges: { secure: true, standard: true } }
//         ]);
//     }
//     createWindow();
// });

// app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
// app.on('activate', () => { if (mainWindow === null) createWindow(); });


// // --- Inter-Process Communication (IPC) Handlers ---

// // --- THIS IS THE UPDATED SECTION ---
// const normalize = (name) => name.toLowerCase().trim();

// const BASE_WHITELIST = [
//     isDev ? "electron.exe" : "Exam Proctor.exe",
//     "explorer.exe", "dwm.exe", "sihost.exe", "svchost.exe",
//     "ctfmon.exe", "textinputhost.exe", "msmpeng.exe",
//     "securityhealthservice.exe", "nvidia web helper.exe",
//     "nvcontainer.exe", "Code.exe",
//     "cmd.exe", "powershell.exe"
// ].map(normalize);

// const isWhitelistedByName = BASE_WHITELIST.includes(normalize(app.name));

// ipcMain.handle('get-apps-to-close', async () => {
//     try {
//         // --- Stage 1: Get all process data using native WMIC ---
//         const allProcesses = await new Promise((resolve, reject) => {
//             // This command gets Name, PID, and Parent PID for all processes.
//             exec('wmic process get name, processid, parentprocessid /format:csv', (err, stdout) => {
//                 if (err) return reject(err);

//                 const processes = stdout.trim().split('\n').slice(1) // Skip header line
//                     .map(line => {
//                         const parts = line.trim().split(',');
//                         // The order is Node, Name, ParentProcessId, ProcessId
//                         if (parts.length < 4) return null;
//                         return {
//                             name: parts[1],
//                             ppid: parseInt(parts[2]),
//                             pid: parseInt(parts[3])
//                         };
//                     }).filter(Boolean); // Filter out any null or invalid lines
//                 resolve(processes);
//             });
//         });

//         // Create a Map for fast lookups
//         // const processMap = new Map(allProcesses.map(p => [p.pid, p]));

//         // --- Stage 2: Build the complete process tree exclusion (all processes in our tree) ---
//         const processesToExclude = new Set();

//         // Function to recursively add all child processes
//         const addAllChildren = (pid) => {
//             processesToExclude.add(pid);
//             // Find all child processes of this PID
//             allProcesses.forEach(process => {
//                 if (process.ppid === pid && !processesToExclude.has(process.pid)) {
//                     addAllChildren(process.pid);
//                 }
//             });
//         };

//         // Start from our own process and include all children (development server, etc.)
//         addAllChildren(process.pid);

//         console.log("Excluding own process and all its children:", processesToExclude);

//         // --- Stage 3: Get all VISIBLE user applications using tasklist ---
//         const visibleApps = await new Promise((resolve) => {
//             const command = `tasklist /FO CSV /NH /FI "STATUS eq RUNNING" /FI "USERNAME eq %USERNAME%" /FI "WINDOWTITLE ne ''"`;
//             exec(command, (err, stdout) => {
//                 if (err) { resolve([]); return; }
//                 const apps = stdout.trim().split('\n').map(line => {
//                     const parts = line.replace(/"/g, '').split(',');
//                     return { name: parts[0], pid: parseInt(parts[1]) };
//                 }).filter(p => p.name && !isNaN(p.pid));
//                 resolve(apps);
//             });
//         });

//         // --- Stage 4: Apply the final filter ---
//         const appsToKill = visibleApps.filter(app => {
//             const isDevelopmentProcess = processesToExclude.has(app.pid);
//             // const isWhitelistedByName = BASE_WHITELIST.some(white => white.toLowerCase() === app.name.toLowerCase());
//             return !isDevelopmentProcess && !isWhitelistedByName;
//         });

//         const uniqueAppNamesToKill = [...new Set(appsToKill.map(app => app.name))];
//         console.log("Final list of apps to be closed:", uniqueAppNamesToKill);

//         return uniqueAppNamesToKill;

//     } catch (err) {
//         console.error("FATAL ERROR in get-apps-to-close:", err);
//         return []; // Return empty array on any failure
//     }
// });

// // The kill command handler is simple and correct as is.
// ipcMain.on('kill-app-list', (event, appList) => {
//     if (!appList || !Array.isArray(appList)) return;
//     appList.forEach(appName => exec(`taskkill /IM "${appName}" /F`));
// });

// ipcMain.on('exam-started', () => { isExamInProgress = true; });
// ipcMain.on('exam-finished', () => { isExamInProgress = false; if (!isDev) app.quit(); });
// ipcMain.on('close-app', () => { app.quit(); });
// ipcMain.on('force-expel-student', () => { if (mainWindow) mainWindow.webContents.send('exam-expelled-by-proctor'); });

// public/electron.js
// This is the SINGLE main entry file for both Development and Production.

const { app, BrowserWindow, ipcMain, screen, session, protocol } = require('electron');
const path = require('path');
const url = require('url');
const isDev = require('electron-is-dev');
const { exec } = require('child_process');

let mainWindow;
let isExamInProgress = false;

// --- Function to Create the Application Window ---
function createWindow() {
    console.log(`--- Running in ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'} mode ---`);

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width,
        height,
        show: false,
        frame: isDev,
        kiosk: !isDev,
        alwaysOnTop: !isDev,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            devTools: isDev,
        }
    });

    const startUrl = isDev
        ? 'http://localhost:3000'
        : url.format({
            pathname: path.join(__dirname, '../build/index.html'),
            protocol: 'file:',
            slashes: true
        });

    console.log("Loading URL:", startUrl);
    mainWindow.loadURL(startUrl);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        if (isDev) {
            mainWindow.webContents.openDevTools();
        }
    });

    // --- Window Event Listeners ---
    mainWindow.on('blur', () => { if (isExamInProgress) mainWindow.focus(); });
    mainWindow.on('close', (e) => { if (isExamInProgress) e.preventDefault(); });
    mainWindow.on('closed', () => (mainWindow = null));
}

// --- App Lifecycle ---
app.whenReady().then(() => {
    const defaultSession = session.defaultSession;
    if (!isDev) {
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

        // --- Register custom protocol for deep links ---
        protocol.registerSchemesAsPrivileged([
            { scheme: 'exam-buddy', privileges: { standard: true, secure: true } }
        ]);

        protocol.registerFileProtocol('exam-buddy', (request, callback) => {
            const token = request.url.split('/').pop();
            console.log("Received deep link token:", token);

            if (mainWindow) {
                mainWindow.webContents.send('reset-token', token); // send token to renderer
                mainWindow.show();
            }

            callback(path.join(__dirname, 'index.html'));
        });
    }
    createWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (mainWindow === null) createWindow(); });


// --- Inter-Process Communication (IPC) Handlers ---

// Normalize process names to lowercase
const normalize = (name) => (name || "").toLowerCase().trim();

// --- WHITELIST: processes that should never be killed ---
const BASE_WHITELIST = [
    isDev ? "electron.exe" : "Exam Proctor.exe",
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

// --- Kill handler with extra whitelist protection ---
ipcMain.on('kill-app-list', (event, appList) => {
    if (!appList || !Array.isArray(appList)) return;

    appList.forEach(appName => {
        const safeName = normalize(appName);

        if (BASE_WHITELIST.includes(safeName)) {
            console.log(`Skipping whitelisted app: ${appName}`);
            return;
        }

        exec(`taskkill /IM "${appName}" /F`, (err) => {
            if (err) console.error(`Failed to kill ${appName}:`, err);
            else console.log(`Killed ${appName}`);
        });
    });
});

ipcMain.on('exam-started', () => { isExamInProgress = true; });
ipcMain.on('exam-finished', () => { isExamInProgress = false; if (!isDev) app.quit(); });
ipcMain.on('close-app', () => { app.quit(); });
ipcMain.on('force-expel-student', () => { if (mainWindow) mainWindow.webContents.send('exam-expelled-by-proctor'); });
