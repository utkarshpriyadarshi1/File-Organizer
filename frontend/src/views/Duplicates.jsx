import axios from "axios";
import React, { useState, useEffect } from "react";
import { useTasks } from "../services/TaskContext";

const Duplicates = () => {
    const { activeTasks, addToast, syncActiveTasks } = useTasks();
    const [folderPath, setFolderPath] = useState("");
    const [scanTaskId, setScanTaskId] = useState(null);
    const [duplicates, setDuplicates] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [status, setStatus] = useState("");
    const [dupSearch, setDupSearch] = useState("");
    const [dupSort, setDupSort] = useState("countDesc");

    const getFilteredDuplicates = () => {
        return duplicates.filter(group => {
            if (!dupSearch.trim()) return true;
            return group.files.some(file => file.toLowerCase().includes(dupSearch.toLowerCase())) || 
                   group.hash.toLowerCase().includes(dupSearch.toLowerCase());
        });
    };

    const getSortedDuplicates = () => {
        return [...getFilteredDuplicates()].sort((a, b) => {
            if (dupSort === "countDesc") return b.files.length - a.files.length;
            if (dupSort === "countAsc") return a.files.length - b.files.length;
            if (dupSort === "hash") return a.hash.localeCompare(b.hash);
            return 0;
        });
    };

    const selectFolder = async () => {
        console.log("[Duplicates] Prompting user to select target folder...");
        if (window.electron && window.electron.selectFolder) {
            const selectedFolder = await window.electron.selectFolder();
            console.log(`[Duplicates] Target folder selected: "${selectedFolder}"`);
            setFolderPath(selectedFolder);
        } else {
            console.warn("[Duplicates] Electron API selectFolder not available in this window context.");
            alert("Electron API is not available. Please run the application through run-dev.bat (Electron desktop window).");
        }
    };

    // Monitor scanning progress if scanTaskId is active
    useEffect(() => {
        if (!scanTaskId) return;

        const activeTask = activeTasks[scanTaskId];
        if (activeTask) {
            console.log(`[Duplicates] Scanning progress update for task ${scanTaskId}: ${activeTask.progress.toFixed(0)}%`);
            setStatus(`Scanning for duplicates... ${activeTask.progress.toFixed(0)}%`);
        } else {
            // Task has completed and was removed from activeTasks. Check results
            console.log(`[Duplicates] Duplicate scan task ${scanTaskId} completed. Fetching results...`);
            setStatus("Scan completed! Fetching results...");
            axios.get(`http://localhost:8080/api/tasks/${scanTaskId}/results`)
                .then(res => {
                    console.info(`[Duplicates] Successfully fetched ${res.data.length} duplicate groups for scan task ${scanTaskId}`);
                    setDuplicates(res.data);
                    setStatus("");
                    setScanTaskId(null);
                })
                .catch(err => {
                    console.error(`[Duplicates] Failed to fetch scan results for task ID ${scanTaskId}`, err);
                    setStatus("Failed to fetch results.");
                    setScanTaskId(null);
                });
        }
    }, [activeTasks, scanTaskId]);

    const findDuplicates = async () => {
        console.log(`[Duplicates] Requesting duplicates scan in path: "${folderPath}"`);
        if (!folderPath) {
            console.warn("[Duplicates] Missing target folder path for scan operation.");
            alert("Please select a folder first.");
            return;
        }

        setStatus("Initializing scanning task...");
        setDuplicates([]);
        try {
            const response = await axios.post("http://localhost:8080/api/duplicates/find", { folderPath });
            console.info(`[Duplicates] Duplicate scan task successfully triggered. Server Task ID: ${response.data}`);
            setScanTaskId(response.data);
            addToast("Duplicate scan triggered! Task ID: " + response.data, "info");
            syncActiveTasks();
        } catch (e) {
            console.error("[Duplicates] Failed to trigger duplicate scan task.", e);
            setStatus("Failed to trigger scan.");
        }
    };

    const toggleSelection = (filePath) => {
        console.log(`[Duplicates] Toggling file selection: "${filePath}"`);
        setSelectedFiles(prev => {
            const isSelected = prev.includes(filePath);
            const nextSelection = isSelected ? prev.filter(f => f !== filePath) : [...prev, filePath];
            console.log(`[Duplicates] Active selection count: ${nextSelection.length}`);
            return nextSelection;
        });
    };

    const removeSelected = async () => {
        console.log(`[Duplicates] Preparing duplicate deletion task for files:`, selectedFiles);
        if (selectedFiles.length === 0) {
            console.warn("[Duplicates] Deletion request rejected because no files are selected.");
            alert("No files selected for deletion.");
            return;
        }

        setStatus("Removing duplicates...");
        try {
            const response = await axios.post("http://localhost:8080/api/duplicates/remove", { filesToDelete: selectedFiles });
            console.info(`[Duplicates] Duplicate removal task triggered successfully. Server Task ID: ${response.data}`);
            addToast("Duplicate removal task triggered! Task ID: " + response.data, "info");
            syncActiveTasks();
            
            // Clean up state locally
            setDuplicates(duplicates.map(d => ({ ...d, files: d.files.filter(f => !selectedFiles.includes(f)) })));
            setSelectedFiles([]);
            setStatus("");
        } catch (e) {
            console.error("[Duplicates] Failed to run duplicate removal task.", e);
            addToast("Failed to remove duplicates.", "error");
            setStatus("");
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center space-y-6 h-full shadow-sm">
            <div>
                <h2 className="text-xl font-extrabold text-gray-800 flex items-center justify-center gap-2">
                    <i className="fa-solid fa-copy text-rose-500"></i>
                    Duplicate Cleaner
                </h2>
                
                <div className="space-y-4 text-left mt-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1.5">
                            <i className="fa-solid fa-folder-magnifying-glass text-blue-500"></i>
                            Target Directory
                        </label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={folderPath} 
                                readOnly
                                placeholder="No directory selected"
                                className="bg-gray-50 text-xs border border-gray-200 rounded-xl p-3 flex-grow focus:outline-none font-medium text-gray-700"
                            />
                            <button 
                                onClick={selectFolder} 
                                className="bg-blue-600 hover:bg-blue-700 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white text-xs font-bold px-4 py-3 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-sm"
                            >
                                <i className="fa-solid fa-folder-open"></i>
                                Select Folder
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <button 
                onClick={findDuplicates} 
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white font-semibold text-sm py-3 rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2 mt-4"
            >
                <i className="fa-solid fa-barcode"></i>
                Scan for Duplicates
            </button>

            {status && (
                <div className="bg-blue-50 border border-blue-100 text-blue-700 text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2">
                    <i className="fa-solid fa-circle-notch animate-spin text-sm"></i>
                    {status}
                </div>
            )}

            {duplicates.length > 0 && (
                <div className="mt-4 text-left border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center justify-between flex-grow">
                            <h3 className="font-bold text-gray-800 flex items-center gap-1.5">
                                <i className="fa-solid fa-images text-slate-500"></i>
                                Duplicate Sets Found
                            </h3>
                            <span className="text-xs text-gray-500 font-semibold md:hidden">{duplicates.length} groups</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-gray-500 items-center">
                            <span className="text-xs text-gray-500 font-semibold hidden md:inline">{duplicates.length} groups</span>
                            <input 
                                type="text"
                                value={dupSearch}
                                onChange={(e) => setDupSearch(e.target.value)}
                                placeholder="Search path/hash..."
                                className="border border-gray-200 rounded-lg p-1.5 bg-white text-gray-750 focus:outline-none focus:ring-1 focus:ring-blue-500 text-[10px] w-28"
                            />
                            <select 
                                onChange={(e) => setDupSort(e.target.value)}
                                value={dupSort}
                                className="border border-gray-200 rounded-lg p-1.5 bg-white text-gray-750 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 text-[10px]"
                            >
                                <option value="countDesc">Files: High to Low</option>
                                <option value="countAsc">Files: Low to High</option>
                                <option value="hash">Hash Alphabetical</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                        {getSortedDuplicates().length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-6">No duplicate sets match your search filter.</p>
                        ) : getSortedDuplicates().map((dup, index) => (
                            <div key={index} className="border border-gray-150 rounded-xl p-3 bg-slate-50">
                                <p className="text-xs font-mono text-gray-500 mb-2 truncate flex items-center gap-1.5">
                                    <i className="fa-solid fa-hashtag text-gray-400"></i>
                                    Hash: {dup.hash}
                                </p>
                                <div className="space-y-1.5">
                                    {dup.files.map((file, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                onChange={() => toggleSelection(file)}
                                                checked={selectedFiles.includes(file)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-xs text-gray-700 truncate max-w-lg flex items-center gap-1.5">
                                                <i className="fa-solid fa-file text-slate-400 text-[10px]"></i>
                                                {file}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                            <i className="fa-solid fa-square-check text-rose-500"></i>
                            {selectedFiles.length} files selected for deletion
                        </span>
                        <button 
                            onClick={removeSelected} 
                            className="bg-red-500 hover:bg-red-600 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/20 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-colors duration-150 flex items-center gap-1.5 shadow-sm"
                        >
                            <i className="fa-solid fa-trash-can"></i>
                            Remove Selected
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Duplicates;
