
const { app, BrowserWindow, ipcMain, screen, session } = require('electron');
const path = require('path');
const url = require('url');
const isDev = require('electron-is-dev');
const { exec } = require('child_process');

let mainWindow;
let isExamInProgress = false;

let violationStrikes = 0;
const MAX_STRIKES = 3;

const protocol = 'exambuddy';
app.setAsDefaultProtocolClient(protocol);


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
    createWindow();
});

app.on("open-url", (event, url) => {
    event.preventDefault();
    window.webContents.send("deep-link", url);
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
ipcMain.on('close-app', () => { app.quit(); });
ipcMain.on('force-expel-student', () => { if (mainWindow) mainWindow.webContents.send('exam-expelled-by-proctor'); });
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