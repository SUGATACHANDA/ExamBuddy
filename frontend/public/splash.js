const { ipcRenderer } = require("electron");

async function runSystemChecks() {
    // simulate system checks
    await new Promise(r => setTimeout(r, 2000));

    // check maintenance AFTER checks
    const isMaintenance = await ipcRenderer.invoke("check-maintenance");

    if (isMaintenance) {
        // replace splash content with maintenance page
        window.location.href = "maintenance.html";
    } else {
        // open login screen
        ipcRenderer.send("open-login");
    }
}

window.onload = runSystemChecks;