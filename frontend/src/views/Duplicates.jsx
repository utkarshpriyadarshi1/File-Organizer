import axios from "axios";
import React, { useState, useEffect } from "react";
import { useTasks } from "../services/TaskContext";

const Duplicates = () => {
    const { activeTasks, addToast, selectFolder, syncActiveTasks } = useTasks();
    const [folderPath, setFolderPath] = useState("");
    const [scanTaskId, setScanTaskId] = useState(null);
    const [duplicates, setDuplicates] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [status, setStatus] = useState("");
    const [dupSearch, setDupSearch] = useState("");
    const [dupSort, setDupSort] = useState("countDesc");
    const [skipFolder, setSkipFolder] = useState("");
    const [targetFolder, setTargetFolder] = useState("");
    const [dryRun, setDryRun] = useState(false);

    // Fetch default directory on load
    useEffect(() => {
        axios.get("http://localhost:8080/api/settings/default-path")
            .then(res => {
                if (res.data.defaultPath) {
                    setFolderPath(res.data.defaultPath);
                }
            })
            .catch(err => console.error("[Duplicates] Failed to fetch default path:", err));
    }, []);

    const autoSelectDuplicates = (strategy) => {
        if (strategy === "selectAll") {
            const confirmAll = window.confirm("WARNING: Selecting ALL copies of duplicate files will delete every single copy, leaving zero files. Are you sure you want to proceed?");
            if (!confirmAll) return;
        }

        let toSelect = [];
        duplicates.forEach(group => {
            if (group.files.length <= 1) return;

            const filterEligible = (file) => {
                const pathLower = file.path.toLowerCase();
                if (skipFolder.trim() && pathLower.includes(skipFolder.trim().toLowerCase())) {
                    return false;
                }
                if (targetFolder.trim() && !pathLower.includes(targetFolder.trim().toLowerCase())) {
                    return false;
                }
                return true;
            };

            if (strategy === "selectAll") {
                group.files.forEach(f => {
                    if (filterEligible(f)) {
                        toSelect.push(f.path);
                    }
                });
            } else if (strategy === "clearAll") {
                // Will clear everything since toSelect remains empty
            } else {
                const sorted = [...group.files].sort((a, b) => {
                    const timeA = a.modifiedAt ? new Date(a.modifiedAt).getTime() : 0;
                    const timeB = b.modifiedAt ? new Date(b.modifiedAt).getTime() : 0;
                    return timeA - timeB;
                });

                if (strategy === "keepOldest") {
                    for (let i = 1; i < sorted.length; i++) {
                        if (filterEligible(sorted[i])) {
                            toSelect.push(sorted[i].path);
                        }
                    }
                } else if (strategy === "keepLatest") {
                    for (let i = 0; i < sorted.length - 1; i++) {
                        if (filterEligible(sorted[i])) {
                            toSelect.push(sorted[i].path);
                        }
                    }
                }
            }
        });
        setSelectedFiles(toSelect);
    };

    const getFilteredDuplicates = () => {
        return duplicates.filter(group => {
            if (!dupSearch.trim()) return true;
            return group.files.some(file => file.path.toLowerCase().includes(dupSearch.toLowerCase())) || 
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

    const handleSelectFolder = async () => {
        console.log("[Duplicates] Prompting user to select target folder...");
        const selectedFolder = await selectFolder();
        if (selectedFolder) {
            console.log(`[Duplicates] Target folder selected: "${selectedFolder}"`);
            setFolderPath(selectedFolder);
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
        console.log(`[Duplicates] Preparing duplicate deletion task for files:`, selectedFiles, `Dry Run: ${dryRun}`);
        if (selectedFiles.length === 0) {
            console.warn("[Duplicates] Deletion request rejected because no files are selected.");
            alert("No files selected for deletion.");
            return;
        }

        setStatus(dryRun ? "Simulating duplicate removal..." : "Removing duplicates...");
        try {
            const response = await axios.post("http://localhost:8080/api/duplicates/remove", { filesToDelete: selectedFiles, dryRun });
            console.info(`[Duplicates] Duplicate removal task triggered successfully. Server Task ID: ${response.data}`);
            addToast((dryRun ? "Dry run simulation triggered! " : "Duplicate removal task triggered! ") + "Task ID: " + response.data, "info");
            syncActiveTasks();
            
            // Clean up state locally
            if (!dryRun) {
                setDuplicates(duplicates.map(d => ({ ...d, files: d.files.filter(f => !selectedFiles.includes(f.path)) })));
            }
            setSelectedFiles([]);
            setStatus("");
        } catch (e) {
            console.error("[Duplicates] Failed to run duplicate removal task.", e);
            addToast(dryRun ? "Failed to run dry run simulation." : "Failed to remove duplicates.", "error");
            setStatus("");
        }
    };

    return (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 text-center space-y-4 h-full shadow-sm">
            <div>
                <div className="space-y-4 text-left mt-0">
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
                                onClick={handleSelectFolder} 
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
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white font-semibold text-sm py-3 rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2 mt-2"
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

                    {/* Auto-Select and Folder Pattern Controls */}
                    <div className="p-4 bg-slate-50/70 border-b border-gray-150 space-y-3 text-left">
                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                            <div className="flex-grow flex items-center gap-2">
                                <label className="text-[11px] font-bold text-gray-500 uppercase shrink-0 w-24 flex items-center gap-1">
                                    <i className="fa-solid fa-filter-circle-xmark text-rose-400"></i>
                                    Skip Folder:
                                </label>
                                <input 
                                    type="text"
                                    value={skipFolder}
                                    onChange={(e) => setSkipFolder(e.target.value)}
                                    placeholder="e.g. KeepThisFolder"
                                    className="w-full border border-gray-200 rounded-lg p-2 bg-white text-gray-755 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-medium"
                                />
                            </div>
                            <div className="flex-grow flex items-center gap-2">
                                <label className="text-[11px] font-bold text-gray-500 uppercase shrink-0 w-24 flex items-center gap-1">
                                    <i className="fa-solid fa-filter-circle-dollar text-green-400"></i>
                                    Target Only:
                                </label>
                                <input 
                                    type="text"
                                    value={targetFolder}
                                    onChange={(e) => setTargetFolder(e.target.value)}
                                    placeholder="e.g. DeleteThisFolder"
                                    className="w-full border border-gray-200 rounded-lg p-2 bg-white text-gray-755 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-medium"
                                />
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-dashed border-gray-200">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mr-1">Selection Helper:</span>
                                <button 
                                    onClick={() => autoSelectDuplicates("keepOldest")}
                                    className="bg-white hover:bg-slate-100 border border-gray-200 px-3 py-1.5 rounded-lg active:scale-95 transition-all text-[11px] font-bold text-blue-600 hover:text-blue-700 shadow-sm flex items-center gap-1 cursor-pointer"
                                >
                                    <i className="fa-solid fa-clock-rotate-left"></i> Keep Oldest
                                </button>
                                <button 
                                    onClick={() => autoSelectDuplicates("keepLatest")}
                                    className="bg-white hover:bg-slate-100 border border-gray-200 px-3 py-1.5 rounded-lg active:scale-95 transition-all text-[11px] font-bold text-indigo-600 hover:text-indigo-700 shadow-sm flex items-center gap-1 cursor-pointer"
                                >
                                    <i className="fa-solid fa-clock"></i> Keep Latest
                                </button>
                                <button 
                                    onClick={() => autoSelectDuplicates("selectAll")}
                                    className="bg-white hover:bg-slate-100 border border-gray-200 px-3 py-1.5 rounded-lg active:scale-95 transition-all text-[11px] font-bold text-rose-600 hover:text-rose-700 shadow-sm flex items-center gap-1 cursor-pointer"
                                >
                                    <i className="fa-solid fa-check-double"></i> Select All
                                </button>
                                <button 
                                    onClick={() => autoSelectDuplicates("clearAll")}
                                    className="bg-white hover:bg-slate-100 border border-gray-200 px-3 py-1.5 rounded-lg active:scale-95 transition-all text-[11px] font-bold text-gray-600 hover:text-gray-805 shadow-sm flex items-center gap-1 cursor-pointer"
                                >
                                    <i className="fa-solid fa-circle-xmark"></i> Clear
                                </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 ml-auto">
                                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        id="duplicateDryRun"
                                        checked={dryRun} 
                                        onChange={(e) => setDryRun(e.target.checked)} 
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                                    />
                                    <span className="text-xs text-gray-600 font-semibold flex items-center gap-1">
                                        <i className="fa-solid fa-flask text-amber-500"></i>
                                        Dry Run
                                    </span>
                                </label>
                                <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                                    <i className="fa-solid fa-square-check text-rose-500"></i>
                                    {selectedFiles.length} selected
                                </span>
                                <button 
                                    onClick={removeSelected} 
                                    className="bg-red-500 hover:bg-red-600 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/20 text-white font-semibold text-xs px-3.5 py-1.5 rounded-xl transition-colors duration-150 flex items-center gap-1.5 shadow-sm"
                                >
                                    <i className="fa-solid fa-trash-can"></i>
                                    Remove Selected
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-4 space-y-4 max-h-96 overflow-y-auto overflow-x-auto">
                        {getSortedDuplicates().length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-6">No duplicate sets match your search filter.</p>
                        ) : getSortedDuplicates().map((dup, index) => (
                            <div key={index} className="border border-gray-150 rounded-xl p-3 bg-slate-50 overflow-x-auto">
                                <p className="text-xs font-mono text-gray-500 mb-2 truncate flex items-center gap-1.5">
                                    <i className="fa-solid fa-hashtag text-gray-400"></i>
                                    Hash: {dup.hash}
                                </p>
                                <div className="space-y-1.5">
                                    {dup.files.map((file, i) => (
                                        <div key={i} className="flex items-center justify-between gap-4 p-1.5 rounded hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    onChange={() => toggleSelection(file.path)}
                                                    checked={selectedFiles.includes(file.path)}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-xs text-gray-700 truncate flex items-center gap-1.5" title={file.path}>
                                                    <i className="fa-solid fa-file text-slate-400 text-[10px]"></i>
                                                    {file.path}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-medium shrink-0">
                                                {file.modifiedAt ? new Date(file.modifiedAt.replace("T", " ")).toLocaleString() : "Unknown date"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Duplicates;
