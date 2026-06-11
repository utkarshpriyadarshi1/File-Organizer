const { app, BrowserWindow, ipcMain, dialog, Tray, Menu } = require("electron");
const path = require("path");

let mainWindow = null;
let tray = null;
let statusInterval = null;
let isOffline = false;
let activeTaskIds = [];

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on("second-instance", (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });

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

        const startUrl = !app.isPackaged && !process.argv.includes("--prod")
            ? "http://localhost:3000"
            : `file://${path.join(__dirname, "../../build/index.html")}`;
        mainWindow.loadURL(startUrl);

        // Minimize to tray on close
        mainWindow.on("close", (event) => {
            if (!app.isQuitting) {
                event.preventDefault();
                mainWindow.hide();
            }
        });

        // Initialize System Task Tray
        const iconPath = app.isPackaged 
            ? path.join(__dirname, "../../build/favicon.ico") 
            : path.join(__dirname, "../../public/favicon.ico");

        tray = new Tray(iconPath);
        tray.setToolTip("e-Abhilekh Control Client");

        tray.on("double-click", () => {
            if (mainWindow) {
                mainWindow.show();
                mainWindow.focus();
            }
        });

        // Initial update and periodic polling (every 5 seconds)
        updateTrayMenu();
        statusInterval = setInterval(updateTrayMenu, 5000);
    });

async function updateTrayMenu() {
    try {
        // Parallel status fetches using Promise.all
        const [activeTasksRes, syncJobsRes, cacheRes, defaultPathRes] = await Promise.all([
            fetch("http://localhost:8080/api/tasks/active").catch(e => {
                console.error("Tray menu failed to fetch active tasks:", e);
                return { ok: false };
            }),
            fetch("http://localhost:8080/api/sync/jobs").catch(e => {
                console.error("Tray menu failed to fetch sync jobs:", e);
                return { ok: false };
            }),
            fetch("http://localhost:8080/api/settings/cache").catch(e => {
                console.error("Tray menu failed to fetch cache stats:", e);
                return { ok: false };
            }),
            fetch("http://localhost:8080/api/settings/default-path").catch(e => {
                console.error("Tray menu failed to fetch default path:", e);
                return { ok: false };
            })
        ]);

        if (!activeTasksRes.ok) {
            throw new Error("Backend connection unhealthy");
        }

        const activeTasks = await activeTasksRes.json();
        const syncJobs = syncJobsRes.ok ? await syncJobsRes.json() : [];
        const cacheStats = cacheRes.ok ? await cacheRes.json() : [];
        const defaultPathData = defaultPathRes.ok ? await defaultPathRes.json() : {};
        const defaultPath = defaultPathData.defaultPath || "";

        isOffline = false;
        const activeCount = activeTasks.length;
        activeTaskIds = activeTasks.map(t => t.id).filter(Boolean);

        const statusLabel = activeCount > 0 
            ? `App Status: Processing (${activeCount}) Tasks`
            : "App Status: Online / Idle";

        const isVisible = mainWindow && mainWindow.isVisible();

        const template = [
            { label: statusLabel, enabled: false },
            { type: "separator" },
            { 
                label: isVisible ? "Hide Control Center" : "Show Control Center", 
                click: () => {
                    if (mainWindow) {
                        if (isVisible) {
                            mainWindow.hide();
                        } else {
                            mainWindow.show();
                            mainWindow.focus();
                        }
                    }
                }
            },
            { type: "separator" }
        ];

        // 1. Quick Actions Submenu
        const quickActions = [];
        if (defaultPath) {
            const folderName = path.basename(defaultPath) || defaultPath;
            quickActions.push({
                label: `Scan Duplicates in: ${folderName}`,
                click: async () => {
                    try {
                        const res = await fetch("http://localhost:8080/api/duplicates/find", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ folderPath: defaultPath })
                        });
                        if (res.ok) {
                            dialog.showMessageBox(mainWindow, {
                                type: "info",
                                title: "Duplicate Scan Started",
                                message: `Scan initiated for folder: ${defaultPath}`
                            });
                        }
                    } catch (e) {
                        console.error("Failed to run duplicates scan from tray:", e);
                    }
                }
            });
        } else {
            quickActions.push({
                label: "Set Default Folder in App to enable",
                enabled: false
            });
        }
        
        template.push({
            label: "Quick Actions",
            submenu: quickActions
        });

        // 2. Run Sync Job Submenu
        const syncSubmenu = [];
        if (syncJobs.length > 0) {
            syncJobs.forEach(job => {
                syncSubmenu.push({
                    label: `Run: ${job.jobName || 'Unnamed Sync'}`,
                    click: async () => {
                        try {
                            const res = await fetch(`http://localhost:8080/api/sync/${job.id}/run`, {
                                method: "POST"
                            });
                            if (res.ok) {
                                dialog.showMessageBox(mainWindow, {
                                    type: "info",
                                    title: "Sync Job Triggered",
                                    message: `Sync operation started successfully for "${job.jobName}".`
                                });
                            }
                        } catch (err) {
                            console.error("Failed to trigger sync job:", err);
                        }
                    }
                });
            });
        } else {
            syncSubmenu.push({
                label: "No Sync Jobs Configured",
                enabled: false
            });
        }

        template.push({
            label: "Run Sync Job",
            submenu: syncSubmenu
        });

        // 3. Storage & Cache Utilization Submenu
        const storageSubmenu = [];
        if (cacheStats.length > 0) {
            cacheStats.forEach(stat => {
                const mb = (stat.totalSizeBytes / (1024 * 1024)).toFixed(2);
                storageSubmenu.push({
                    label: `${stat.folderName.toUpperCase()}: ${mb} MB (${stat.fileCount} files)`,
                    enabled: false
                });
            });
        } else {
            storageSubmenu.push({
                label: "Cache Info Unavailable",
                enabled: false
            });
        }
        
        template.push({
            label: "Storage & Cache Stats",
            submenu: storageSubmenu
        });

        // 4. Cancel active tasks
        if (activeCount > 0) {
            template.push({
                label: `Cancel Active Tasks (${activeCount})`,
                click: async () => {
                    await cancelAllActiveTasks();
                }
            });
        }

        template.push({
            label: "Prune Caches & Dumps",
            submenu: [
                { label: "Prune Task Reports", click: () => clearBackendCache("reports") },
                { label: "Prune Decryption Temp Files", click: () => clearBackendCache("temp") },
                { label: "Prune Diagnostic Logs", click: () => clearBackendCache("logs") }
            ]
        });

        template.push(
            { type: "separator" },
            { label: "Relaunch App Client", click: () => {
                app.relaunch();
                app.exit(0);
            }},
            { label: "Reset Application Data...", click: () => {
                triggerFactoryReset();
            }},
            { type: "separator" },
            { label: "Exit Application", click: () => {
                shutdownAndExit();
            }}
        );

        const contextMenu = Menu.buildFromTemplate(template);
        tray.setContextMenu(contextMenu);
    } catch (error) {
        isOffline = true;
        activeTaskIds = [];

        const template = [
            { label: "App Status: Offline / Connecting...", enabled: false },
            { type: "separator" },
            { label: "Show Control Center", click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }},
            { label: "Hide Window", click: () => {
                if (mainWindow) {
                    mainWindow.hide();
                }
            }},
            { type: "separator" },
            { label: "Relaunch App Client", click: () => {
                app.relaunch();
                app.exit(0);
            }},
            { type: "separator" },
            { label: "Exit Application", click: () => {
                app.quit();
            }}
        ];

        const contextMenu = Menu.buildFromTemplate(template);
        tray.setContextMenu(contextMenu);
    }
}

async function cancelAllActiveTasks() {
    if (activeTaskIds.length === 0) return;
    try {
        const response = await fetch("http://localhost:8080/api/tasks/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskIds: activeTaskIds })
        });
        if (response.ok) {
            dialog.showMessageBox(mainWindow, {
                type: "info",
                title: "Tasks Canceled",
                message: "All active background tasks have been signaled for cancellation."
            });
            updateTrayMenu();
        }
    } catch (err) {
        console.error("Failed to cancel active tasks:", err);
    }
}

async function clearBackendCache(folderName) {
    try {
        const response = await fetch(`http://localhost:8080/api/settings/cache?folderName=${folderName}`, {
            method: "DELETE"
        });
        if (response.ok) {
            const text = await response.text();
            dialog.showMessageBox(mainWindow, {
                type: "info",
                title: "Cache Cleared",
                message: text || `Pruned ${folderName} cache successfully.`
            });
        }
    } catch (err) {
        console.error(`Failed to clear cache ${folderName}:`, err);
    }
}

async function triggerFactoryReset() {
    const choice = dialog.showMessageBoxSync(mainWindow, {
        type: "warning",
        buttons: ["Cancel", "Yes, Reset Everything"],
        defaultId: 0,
        title: "Confirm Factory Reset",
        message: "Are you sure you want to reset all application data? This will permanently wipe all sync jobs, background task histories, ignore rules, database records, and caches."
    });

    if (choice === 1) {
        try {
            const response = await fetch("http://localhost:8080/api/settings/reset", {
                method: "POST"
            });
            if (response.ok) {
                const text = await response.text();
                dialog.showMessageBox(mainWindow, {
                    type: "info",
                    title: "Factory Reset Successful",
                    message: text || "All application database records and local caches have been fully wiped."
                });
                app.relaunch();
                app.exit(0);
            } else {
                throw new Error("Failed to reset application data.");
            }
        } catch (err) {
            console.error("Failed to perform factory reset:", err);
            dialog.showErrorBox("Reset Failed", "Could not complete the factory reset operation. Please make sure the backend server is running.");
        }
    }
}

async function shutdownAndExit() {
    app.isQuitting = true;
    try {
        await fetch("http://localhost:8080/api/settings/shutdown", {
            method: "POST"
        }).catch(() => {
            // Ignore connection termination errors
        });
    } catch (err) {
        // Ignore
    }
    app.quit();
}

    ipcMain.handle("select-folder", async () => {
        const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
        return result.filePaths[0] || "";
    });

    app.on("window-all-closed", () => {
        if (process.platform !== "darwin") app.quit();
    });

    app.on("will-quit", () => {
        if (statusInterval) {
            clearInterval(statusInterval);
        }
    });
}
