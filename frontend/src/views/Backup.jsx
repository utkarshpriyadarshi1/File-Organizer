import axios from "axios";
import React, { useState } from "react";
import { useTasks } from "../services/TaskContext";

const Backup = () => {
    const { addToast, syncActiveTasks } = useTasks();
    const [sourceFolder, setSourceFolder] = useState("");
    const [backupFolder, setBackupFolder] = useState("");

    const selectFolder = async (setFolder) => {
        const selectedFolder = await window.electron.selectFolder();
        setFolder(selectedFolder);
    };

    const startBackup = async () => {
        if (!sourceFolder || !backupFolder) {
            alert("Please select both source and backup folders.");
            return;
        }

        try {
            const res = await axios.post("http://localhost:8080/api/backup/create", {
                sourceFolder,
                backupFolder,
            });
            addToast("Backup task triggered! Task ID: " + res.data, "info");
            syncActiveTasks();
        } catch (e) {
            addToast("Failed to initiate backup task.", "error");
        }
    };

    const updateBackup = async () => {
        if (!sourceFolder || !backupFolder) {
            alert("Please select both source and backup folders.");
            return;
        }

        try {
            const res = await axios.post("http://localhost:8080/api/backup/update", {
                sourceFolder,
                backupFolder,
            });
            addToast("Backup update task triggered! Task ID: " + res.data, "info");
            syncActiveTasks();
        } catch (e) {
            addToast("Failed to initiate backup update task.", "error");
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded-2xl shadow border border-gray-100 text-center space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Incremental Backup Manager</h2>
            
            <div className="space-y-3 text-left">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Source Directory</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={sourceFolder} 
                            readOnly
                            placeholder="No directory selected"
                            className="bg-gray-50 text-xs border border-gray-200 rounded-xl p-3 flex-grow focus:outline-none"
                        />
                        <button 
                            onClick={() => selectFolder(setSourceFolder)} 
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-3 rounded-xl transition-all duration-200"
                        >
                            Select
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Backup Destination</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={backupFolder} 
                            readOnly
                            placeholder="No directory selected"
                            className="bg-gray-50 text-xs border border-gray-200 rounded-xl p-3 flex-grow focus:outline-none"
                        />
                        <button 
                            onClick={() => selectFolder(setBackupFolder)} 
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-3 rounded-xl transition-all duration-200"
                        >
                            Select
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                <button 
                    onClick={startBackup} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-3 rounded-xl shadow-md transition-all duration-200"
                >
                    Start Full Backup
                </button>
                <button 
                    onClick={updateBackup} 
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm py-3 rounded-xl shadow-md transition-all duration-200"
                >
                    Update Backup
                </button>
            </div>
        </div>
    );
};

export default Backup;
