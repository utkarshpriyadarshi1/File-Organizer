const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");

let mainWindow = null;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "electron.js"),
        },
    });

    mainWindow.loadURL("http://localhost:3000");
});

ipcMain.handle("select-folder", async () => {
    const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
    return result.filePaths[0] || "";
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
