import axios from "axios";
import React, { useState, useEffect } from "react";
import { useTasks } from "../services/TaskContext";

const Backup = () => {
    const { addToast, selectFolder, syncActiveTasks } = useTasks();
    const [sourceFolder, setSourceFolder] = useState("");
    const [backupFolder, setBackupFolder] = useState("");

    // Fetch default directory on load
    useEffect(() => {
        axios.get("http://localhost:8080/api/settings/default-path")
            .then(res => {
                if (res.data.defaultPath) {
                    setSourceFolder(res.data.defaultPath);
                }
            })
            .catch(err => console.error("[Backup] Failed to fetch default path:", err));
    }, []);

    const handleSelectFolder = async (setFolder) => {
        console.log("[Backup] Prompting user to select a folder...");
        const selectedFolder = await selectFolder();
        if (selectedFolder) {
            console.log(`[Backup] Folder selected: "${selectedFolder}"`);
            setFolder(selectedFolder);
        }
    };

    const startBackup = async () => {
        console.log(`[Backup] Preparing to start full backup. Source: "${sourceFolder}", Backup Destination: "${backupFolder}"`);
        if (!sourceFolder || !backupFolder) {
            console.warn("[Backup] Missing source or destination folders for full backup operation.");
            alert("Please select both source and backup folders.");
            return;
        }

        try {
            const res = await axios.post("http://localhost:8080/api/backup/create", {
                sourceFolder,
                backupFolder,
            });
            console.info(`[Backup] Full backup task successfully triggered. Server Task ID: ${res.data}`);
            addToast("Backup task triggered! Task ID: " + res.data, "info");
            syncActiveTasks();
        } catch (e) {
            console.error("[Backup] Failed to initiate full backup task.", e);
            addToast("Failed to initiate backup task.", "error");
        }
    };

    const updateBackup = async () => {
        console.log(`[Backup] Preparing to update backup. Source: "${sourceFolder}", Backup Destination: "${backupFolder}"`);
        if (!sourceFolder || !backupFolder) {
            console.warn("[Backup] Missing source or destination folders for backup update operation.");
            alert("Please select both source and backup folders.");
            return;
        }

        try {
            const res = await axios.post("http://localhost:8080/api/backup/update", {
                sourceFolder,
                backupFolder,
            });
            console.info(`[Backup] Backup update task successfully triggered. Server Task ID: ${res.data}`);
            addToast("Backup update task triggered! Task ID: " + res.data, "info");
            syncActiveTasks();
        } catch (e) {
            console.error("[Backup] Failed to initiate backup update task.", e);
            addToast("Failed to initiate backup update task.", "error");
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center space-y-6 flex flex-col justify-between h-full shadow-sm">
            <div>
                <h2 className="text-xl font-extrabold text-gray-800 flex items-center justify-center gap-2">
                    <i className="fa-solid fa-shield-halved text-amber-550"></i>
                    Incremental Backup Manager
                </h2>
                
                <div className="space-y-4 text-left mt-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1.5">
                            <i className="fa-solid fa-right-from-bracket text-blue-500"></i>
                            Source Directory
                        </label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={sourceFolder} 
                                readOnly
                                placeholder="No directory selected"
                                className="bg-gray-50 text-xs border border-gray-200 rounded-xl p-3 flex-grow focus:outline-none font-medium text-gray-700"
                            />
                            <button 
                                onClick={() => handleSelectFolder(setSourceFolder)} 
                                className="bg-blue-600 hover:bg-blue-700 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white text-xs font-bold px-4 py-3 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-sm"
                            >
                                <i className="fa-solid fa-folder-open"></i>
                                Select
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1.5">
                            <i className="fa-solid fa-vault text-amber-500"></i>
                            Backup Destination
                        </label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={backupFolder} 
                                readOnly
                                placeholder="No directory selected"
                                className="bg-gray-50 text-xs border border-gray-200 rounded-xl p-3 flex-grow focus:outline-none font-medium text-gray-700"
                            />
                            <button 
                                onClick={() => handleSelectFolder(setBackupFolder)} 
                                className="bg-blue-600 hover:bg-blue-700 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white text-xs font-bold px-4 py-3 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-sm"
                            >
                                <i className="fa-solid fa-folder-open"></i>
                                Select
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-2 mt-4">
                <button 
                    onClick={startBackup} 
                    className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white font-semibold text-xs py-3 rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-1.5"
                >
                    <i className="fa-solid fa-circle-play"></i>
                    Start Full Backup
                </button>
                <button 
                    onClick={updateBackup} 
                    className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-white font-semibold text-xs py-3 rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-1.5"
                >
                    <i className="fa-solid fa-rotate"></i>
                    Update Backup
                </button>
            </div>
        </div>
    );
};

export default Backup;
