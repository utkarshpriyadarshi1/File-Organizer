import axios from "axios";
import React, { useState } from "react";
import { useTasks } from "../services/TaskContext";

const Organizer = () => {
    const { addToast, syncActiveTasks } = useTasks();
    const [sourceFolder, setSourceFolder] = useState("");
    const [destinationFolder, setDestinationFolder] = useState("");

    const selectFolder = async (setFolder) => {
        console.log("[Organizer] Prompting user to select folder...");
        if (window.electron && window.electron.selectFolder) {
            const selectedFolder = await window.electron.selectFolder();
            console.log(`[Organizer] Folder selected: "${selectedFolder}"`);
            setFolder(selectedFolder);
        } else {
            console.warn("[Organizer] Electron API selectFolder not available in this window context.");
            alert("Electron API is not available. Please run the application through run-dev.bat (Electron desktop window).");
        }
    };

    const startOrganization = async () => {
        console.log(`[Organizer] Preparing to trigger file organization. Source: "${sourceFolder}", Destination: "${destinationFolder}"`);
        if (!sourceFolder || !destinationFolder) {
            console.warn("[Organizer] Missing source or destination folders for organization operation.");
            alert("Please select both source and destination folders.");
            return;
        }

        try {
            const res = await axios.post("http://localhost:8080/api/organize", {
                sourceFolder,
                destinationFolder,
            });
            console.info(`[Organizer] File organization task successfully triggered. Server Task ID: ${res.data}`);
            addToast("Organization task triggered! Task ID: " + res.data, "info");
            syncActiveTasks();
        } catch (e) {
            console.error("[Organizer] Failed to initiate organization task.", e);
            addToast("Failed to initiate organization task.", "error");
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center space-y-6 flex flex-col justify-between h-full shadow-sm">
            <div>
                <h2 className="text-xl font-extrabold text-gray-800 flex items-center justify-center gap-2">
                    <i className="fa-solid fa-folder-tree text-blue-600"></i>
                    Automatic File Organizer
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
                                onClick={() => selectFolder(setSourceFolder)} 
                                className="bg-blue-600 hover:bg-blue-700 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white text-xs font-bold px-4 py-3 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-sm"
                            >
                                <i className="fa-solid fa-folder-open"></i>
                                Select
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1.5">
                            <i className="fa-solid fa-right-to-bracket text-emerald-500"></i>
                            Destination Directory
                        </label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={destinationFolder} 
                                readOnly
                                placeholder="No directory selected"
                                className="bg-gray-50 text-xs border border-gray-200 rounded-xl p-3 flex-grow focus:outline-none font-medium text-gray-700"
                            />
                            <button 
                                onClick={() => selectFolder(setDestinationFolder)} 
                                className="bg-blue-600 hover:bg-blue-700 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white text-xs font-bold px-4 py-3 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-sm"
                            >
                                <i className="fa-solid fa-folder-open"></i>
                                Select
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <button 
                onClick={startOrganization} 
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white font-semibold text-sm py-3 rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2 mt-4"
            >
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                Start File Organization
            </button>
        </div>
    );
};

export default Organizer;
