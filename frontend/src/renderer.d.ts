// src/renderer.d.ts

// This exports a blank module, turning the file into a module that can augment global types.
export { };

// We define a new interface for our API that matches the one in our preload.js
export interface IElectronAPI {
    examStarted: () => void;
    examFinished: () => void;
    onViolation: (callback: (type: string) => void) => void;
    onExpel: (callback: () => void) => void;
    setupSecurityListeners: () => void;
    onCopyPasteViolation: (callback: () => void) => void;

    // These are the new functions we are adding types for
    killOtherProcesses: () => void;
    onKillProcessesResult: (callback: (result: { success: boolean; message: string; }) => void) => void;

    getVisibleApps: () => Promise<string[]>;
    getAppsToClose: () => Promise<string[]>;
    killAppList: (appList: string[]) => void;
    closeApp: () => void;

    isDev: () => Promise<boolean>;

    sendAppReady: () => void;

    getReleaseNotes: () => Promise<{ version: string; notes: string; } | null>;
    releaseNotesShown: () => void;

    enterFullscreen: () => void;
    onShowReleaseNotes: (callback: (data: { version: string, notes: string }) => void) => void;
}

// Now, we augment the global Window interface to include our `electronAPI` property
declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}