import React, { useState, useEffect } from "react";
import axios from "axios";
import { useTasks } from "../services/TaskContext";

const GenericResultViewer = ({ task, onClose }) => {
    const { addToast, syncActiveTasks } = useTasks();
    const [payload, setPayload] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [resSearch, setResSearch] = useState("");
    const [resSort, setResSort] = useState("");
    const [resStatusFilter, setResStatusFilter] = useState("ALL");
    const [skipFolder, setSkipFolder] = useState("");
    const [targetFolder, setTargetFolder] = useState("");

    const autoSelectDuplicates = (strategy) => {
        if (strategy === "selectAll") {
            const confirmAll = window.confirm("WARNING: Selecting ALL copies of duplicate files will delete every single copy, leaving zero files. Are you sure you want to proceed?");
            if (!confirmAll) return;
        }

        let toSelect = [];
        payload.forEach(group => {
            if (group.files.length <= 1) return;

            const filterEligible = (file) => {
                const filePath = typeof file === "string" ? file : file.path;
                const pathLower = filePath.toLowerCase();
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
                        const filePath = typeof f === "string" ? f : f.path;
                        toSelect.push(filePath);
                    }
                });
            } else if (strategy === "clearAll") {
                // toSelect remains empty
            } else {
                const sorted = [...group.files].sort((a, b) => {
                    const timeA = (a.modifiedAt ? new Date(a.modifiedAt).getTime() : 0);
                    const timeB = (b.modifiedAt ? new Date(b.modifiedAt).getTime() : 0);
                    return timeA - timeB;
                });

                if (strategy === "keepOldest") {
                    for (let i = 1; i < sorted.length; i++) {
                        if (filterEligible(sorted[i])) {
                            const filePath = typeof sorted[i] === "string" ? sorted[i] : sorted[i].path;
                            toSelect.push(filePath);
                        }
                    }
                } else if (strategy === "keepLatest") {
                    for (let i = 0; i < sorted.length - 1; i++) {
                        if (filterEligible(sorted[i])) {
                            const filePath = typeof sorted[i] === "string" ? sorted[i] : sorted[i].path;
                            toSelect.push(filePath);
                        }
                    }
                }
            }
        });
        setSelectedFiles(toSelect);
    };

    const autoSelectFiles = (action) => {
        if (action === "clearAll") {
            setSelectedFiles([]);
            return;
        }

        let toSelect = [];
        payload.forEach(item => {
            const filePath = task.taskType === "ORGANIZE" 
                ? (item.organizedPath || item.newPath) 
                : (item.sourcePath || item.path);

            if (!filePath) return;

            const pathLower = filePath.toLowerCase();
            if (skipFolder.trim() && pathLower.includes(skipFolder.trim().toLowerCase())) {
                return;
            }
            if (targetFolder.trim() && !pathLower.includes(targetFolder.trim().toLowerCase())) {
                return;
            }
            toSelect.push(filePath);
        });
        setSelectedFiles(toSelect);
    };

    // Filter and Sort for DUPLICATE_SCAN
    const getFilteredDuplicates = () => {
        if (!payload) return [];
        return payload.filter(group => {
            if (!resSearch.trim()) return true;
            return group.hash.toLowerCase().includes(resSearch.toLowerCase()) ||
                   group.files.some(f => {
                       const filePath = typeof f === "string" ? f : f.path;
                       return filePath.toLowerCase().includes(resSearch.toLowerCase());
                   });
        });
    };

    const getSortedDuplicates = () => {
        const activeSort = resSort || "countDesc";
        return [...getFilteredDuplicates()].sort((a, b) => {
            if (activeSort === "countDesc") return b.files.length - a.files.length;
            if (activeSort === "countAsc") return a.files.length - b.files.length;
            if (activeSort === "hash") return a.hash.localeCompare(b.hash);
            return 0;
        });
    };

    // Filter and Sort for ORGANIZE
    const getFilteredOrganize = () => {
        if (!payload) return [];
        return payload.filter(item => {
            const orig = item.originalPath || item.oldPath || "";
            const org = item.organizedPath || item.newPath || "";
            return !resSearch.trim() || 
                orig.toLowerCase().includes(resSearch.toLowerCase()) ||
                org.toLowerCase().includes(resSearch.toLowerCase());
        });
    };

    const getSortedOrganize = () => {
        const activeSort = resSort || "origAsc";
        return [...getFilteredOrganize()].sort((a, b) => {
            const aOrig = a.originalPath || a.oldPath || "";
            const bOrig = b.originalPath || b.oldPath || "";
            const aOrg = a.organizedPath || a.newPath || "";
            const bOrg = b.organizedPath || b.newPath || "";
            if (activeSort === "origAsc") return aOrig.localeCompare(bOrig);
            if (activeSort === "origDesc") return bOrig.localeCompare(aOrig);
            if (activeSort === "destAsc") return aOrg.localeCompare(bOrg);
            if (activeSort === "destDesc") return bOrg.localeCompare(aOrg);
            return 0;
        });
    };

    // Filter and Sort for BACKUP
    const getFilteredBackup = () => {
        if (!payload) return [];
        return payload.filter(item => {
            const src = item.sourcePath || item.path || "";
            const bkp = item.backupPath || item.targetPath || "";
            const matchesSearch = !resSearch.trim() || 
                src.toLowerCase().includes(resSearch.toLowerCase()) ||
                bkp.toLowerCase().includes(resSearch.toLowerCase());
            const matchesStatus = resStatusFilter === "ALL" || 
                (resStatusFilter === "FAILED" ? item.failed : !item.failed);
            return matchesSearch && matchesStatus;
        });
    };

    const getSortedBackup = () => {
        const activeSort = resSort || "srcAsc";
        return [...getFilteredBackup()].sort((a, b) => {
            const aSrc = a.sourcePath || a.path || "";
            const bSrc = b.sourcePath || b.path || "";
            const aBkp = a.backupPath || a.targetPath || "";
            const bBkp = b.backupPath || b.targetPath || "";
            if (activeSort === "srcAsc") return aSrc.localeCompare(bSrc);
            if (activeSort === "srcDesc") return bSrc.localeCompare(aSrc);
            if (activeSort === "bkpAsc") return aBkp.localeCompare(bBkp);
            if (activeSort === "bkpDesc") return bBkp.localeCompare(aBkp);
            if (activeSort === "status") return (a.failed ? 1 : 0) - (b.failed ? 1 : 0);
            return 0;
        });
    };

    useEffect(() => {
        setLoading(true);
        axios.get(`http://localhost:8080/api/tasks/${task.id}/results`)
            .then(res => {
                let data = res.data;
                if (typeof data === "string") {
                    try {
                        data = JSON.parse(data);
                    } catch (e) {
                        console.error("Failed to parse results JSON:", e);
                    }
                }
                setPayload(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load results:", err);
                addToast("Failed to fetch task execution results.", "error");
                setLoading(false);
            });
    }, [task.id, addToast]);

    const toggleFileSelection = (path) => {
        setSelectedFiles(prev =>
            prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
        );
    };

    const handleReversalAction = async (actionType) => {
        try {
            const res = await axios.post(`http://localhost:8080/api/tasks/${task.id}/action`, {
                actionType,
                targetPaths: selectedFiles
            });
            addToast("Reversal triggered successfully! Task ID: " + res.data, "success");
            syncActiveTasks();
            onClose();
        } catch (e) {
            addToast("Reversal action failed.", "error");
        }
    };

    const handleDownloadCsv = () => {
        if (!payload || payload.length === 0) {
            addToast("No data to export.", "warning");
            return;
        }

        let csvContent = "";
        
        if (task.taskType === "DUPLICATE_SCAN") {
            csvContent += "Hash,File Path,Size,Modified At\n";
            payload.forEach(group => {
                group.files.forEach(file => {
                    const filePath = typeof file === "string" ? file : file.path;
                    const size = typeof file === "string" ? "" : (file.size || "");
                    const modified = typeof file === "string" ? "" : (file.modifiedAt || "");
                    csvContent += `"${group.hash}","${filePath}","${size}","${modified}"\n`;
                });
            });
        } else if (task.taskType === "ORGANIZE") {
            csvContent += "Original Path,Organized Path\n";
            payload.forEach(item => {
                const orig = item.originalPath || item.oldPath || "";
                const org = item.organizedPath || item.newPath || "";
                csvContent += `"${orig}","${org}"\n`;
            });
        } else if (task.taskType === "BACKUP" || task.taskType === "SYNC" || task.taskType === "RESTORE") {
            csvContent += "Source Path,Destination Path,Status\n";
            payload.forEach(item => {
                const src = item.sourcePath || item.path || "";
                const dest = item.backupPath || item.targetPath || "";
                const status = item.failed ? "Failed" : "Success";
                csvContent += `"${src}","${dest}","${status}"\n`;
            });
        } else {
            csvContent += "Raw Data\n";
            csvContent += `"${JSON.stringify(payload).replace(/"/g, '""')}"\n`;
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `task_results_${task.id}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm text-center">
                    <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-2 mx-auto"></div>
                    <p className="text-gray-600 text-sm">Reading task report...</p>
                </div>
            </div>
        );
    }

    // Determine sub-view based on taskType
    const renderSubView = () => {
        if (!payload || payload.length === 0) {
            return (
                <div className="text-center py-8">
                    <i className="fa-solid fa-folder-open text-gray-400 text-4xl mb-2"></i>
                    <p className="text-gray-500">No file changes recorded in this run.</p>
                </div>
            );
        }

        switch (task.taskType) {
            case "DUPLICATE_SCAN": {
                const sortedDups = getSortedDuplicates().slice(0, 500);
                return (
                    <div className="space-y-4 text-left">
                        {payload.length > 500 && (
                            <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-2 font-semibold flex items-center gap-2">
                                <i className="fa-solid fa-circle-info text-amber-605 text-sm"></i>
                                <span>Showing top 500 of {payload.length} duplicate groups. Use filters to search for specific paths.</span>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-2 justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100 mb-3">
                            <input 
                                type="text"
                                value={resSearch}
                                onChange={(e) => setResSearch(e.target.value)}
                                placeholder="Search files/hash..."
                                className="border border-gray-200 rounded-lg p-1.5 bg-white text-xs font-semibold text-gray-750 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
                            />
                            <select 
                                onChange={(e) => setResSort(e.target.value)}
                                value={resSort || "countDesc"}
                                className="border border-gray-200 rounded-lg p-1.5 bg-white text-xs font-semibold text-gray-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="countDesc">File Count: High to Low</option>
                                <option value="countAsc">File Count: Low to High</option>
                                <option value="hash">Hash Alphabetical</option>
                            </select>
                        </div>

                        {/* Auto-Select and Folder Pattern Controls */}
                        <div className="p-3 bg-gray-50 border border-gray-150 rounded-xl space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="flex-grow flex items-center gap-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase shrink-0 w-20 flex items-center gap-1">
                                        <i className="fa-solid fa-filter-circle-xmark text-rose-400"></i>
                                        Skip Folder:
                                    </label>
                                    <input 
                                        type="text"
                                        value={skipFolder}
                                        onChange={(e) => setSkipFolder(e.target.value)}
                                        placeholder="e.g. KeepThisFolder"
                                        className="w-full border border-gray-200 rounded-lg p-1.5 bg-white text-gray-755 focus:outline-none focus:ring-1 focus:ring-blue-500 text-[11px] font-medium"
                                    />
                                </div>
                                <div className="flex-grow flex items-center gap-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase shrink-0 w-20 flex items-center gap-1">
                                        <i className="fa-solid fa-filter-circle-dollar text-green-400"></i>
                                        Target Only:
                                    </label>
                                    <input 
                                        type="text"
                                        value={targetFolder}
                                        onChange={(e) => setTargetFolder(e.target.value)}
                                        placeholder="e.g. DeleteThisFolder"
                                        className="w-full border border-gray-200 rounded-lg p-1.5 bg-white text-gray-755 focus:outline-none focus:ring-1 focus:ring-blue-500 text-[11px] font-medium"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dashed border-gray-200">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mr-1">Auto-Select:</span>
                                <button 
                                    onClick={() => autoSelectDuplicates("keepOldest")}
                                    title="Keep Oldest"
                                    className="bg-white hover:bg-slate-100 border border-gray-200 px-2 py-1 rounded-md active:scale-95 transition-all text-[10px] font-bold text-blue-600 hover:text-blue-700 shadow-sm flex items-center justify-center cursor-pointer w-7 h-7"
                                >
                                    <i className="fa-solid fa-clock-rotate-left"></i>
                                </button>
                                <button 
                                    onClick={() => autoSelectDuplicates("keepLatest")}
                                    title="Keep Latest"
                                    className="bg-white hover:bg-slate-100 border border-gray-200 px-2 py-1 rounded-md active:scale-95 transition-all text-[10px] font-bold text-indigo-600 hover:text-indigo-700 shadow-sm flex items-center justify-center cursor-pointer w-7 h-7"
                                >
                                    <i className="fa-solid fa-clock"></i>
                                </button>
                                <button 
                                    onClick={() => autoSelectDuplicates("selectAll")}
                                    title="Select All"
                                    className="bg-white hover:bg-slate-100 border border-gray-200 px-2 py-1 rounded-md active:scale-95 transition-all text-[10px] font-bold text-rose-600 hover:text-rose-700 shadow-sm flex items-center justify-center cursor-pointer w-7 h-7"
                                >
                                    <i className="fa-solid fa-check-double"></i>
                                </button>
                                <button 
                                    onClick={() => autoSelectDuplicates("clearAll")}
                                    title="Clear"
                                    className="bg-white hover:bg-slate-100 border border-gray-200 px-2 py-1 rounded-md active:scale-95 transition-all text-[10px] font-bold text-gray-600 hover:text-gray-805 shadow-sm flex items-center justify-center cursor-pointer w-7 h-7"
                                >
                                    <i className="fa-solid fa-circle-xmark"></i>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 max-h-96 overflow-y-auto overflow-x-auto">
                            {sortedDups.length === 0 ? (
                                <p className="text-center text-xs text-gray-500 py-6">No duplicate groups match filters.</p>
                            ) : sortedDups.map((group, idx) => (
                                <div key={idx} className="bg-gray-50 border border-gray-100 rounded-xl p-3 overflow-x-auto">
                                    <p className="text-xs text-gray-500 font-mono mb-2 flex items-center gap-1.5">
                                        <i className="fa-solid fa-hashtag text-gray-400"></i>
                                        <span>Hash: {group.hash}</span>
                                    </p>
                                    <div className="space-y-1.5">
                                        {group.files.map((file, fIdx) => {
                                            const filePath = typeof file === "string" ? file : file.path;
                                            const fileDate = typeof file === "string" ? null : file.modifiedAt;
                                            return (
                                                <div key={fIdx} className="flex items-center justify-between gap-4 p-1.5 rounded hover:bg-gray-100 transition-colors">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <input 
                                                            type="checkbox"
                                                            checked={selectedFiles.includes(filePath)}
                                                            onChange={() => toggleFileSelection(filePath)}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        />
                                                        <span className="text-xs text-gray-700 truncate flex items-center gap-1.5" title={filePath}>
                                                            <i className="fa-solid fa-file text-slate-400 text-[10px]"></i>
                                                            {filePath}
                                                        </span>
                                                    </div>
                                                    {fileDate && (
                                                        <span className="text-[10px] text-gray-400 font-medium shrink-0">
                                                            {new Date(fileDate.replace("T", " ")).toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }

            case "ORGANIZE": {
                const sortedOrg = getSortedOrganize().slice(0, 1000);
                return (
                    <div className="space-y-4">
                        {payload.length > 1000 && (
                            <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-2 font-semibold flex items-center gap-2">
                                <i className="fa-solid fa-circle-info text-amber-605 text-sm"></i>
                                <span>Showing top 1000 of {payload.length} file changes. Use search filters to narrow down results.</span>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-2 justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100 mb-3">
                            <input 
                                type="text"
                                value={resSearch}
                                onChange={(e) => setResSearch(e.target.value)}
                                placeholder="Search paths..."
                                className="border border-gray-200 rounded-lg p-1.5 bg-white text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
                            />
                            <select 
                                onChange={(e) => setResSort(e.target.value)}
                                value={resSort || "origAsc"}
                                className="border border-gray-200 rounded-lg p-1.5 bg-white text-xs font-semibold text-gray-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="origAsc">Original Path: A to Z</option>
                                <option value="origDesc">Original Path: Z to A</option>
                                <option value="destAsc">Organized Path: A to Z</option>
                                <option value="destDesc">Organized Path: Z to A</option>
                            </select>
                        </div>

                        {/* Auto-Select and Folder Pattern Controls */}
                        <div className="p-3 bg-gray-50 border border-gray-150 rounded-xl space-y-3 text-left mb-3">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="flex-grow flex items-center gap-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase shrink-0 w-20 flex items-center gap-1">
                                        <i className="fa-solid fa-filter-circle-xmark text-rose-400"></i>
                                        Skip Folder:
                                    </label>
                                    <input 
                                        type="text"
                                        value={skipFolder}
                                        onChange={(e) => setSkipFolder(e.target.value)}
                                        placeholder="e.g. KeepThisFolder"
                                        className="w-full border border-gray-200 rounded-lg p-1.5 bg-white text-gray-755 focus:outline-none focus:ring-1 focus:ring-blue-500 text-[11px] font-medium"
                                    />
                                </div>
                                <div className="flex-grow flex items-center gap-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase shrink-0 w-20 flex items-center gap-1">
                                        <i className="fa-solid fa-filter-circle-dollar text-green-400"></i>
                                        Target Only:
                                    </label>
                                    <input 
                                        type="text"
                                        value={targetFolder}
                                        onChange={(e) => setTargetFolder(e.target.value)}
                                        placeholder="e.g. DeleteThisFolder"
                                        className="w-full border border-gray-200 rounded-lg p-1.5 bg-white text-gray-755 focus:outline-none focus:ring-1 focus:ring-blue-500 text-[11px] font-medium"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-dashed border-gray-200">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mr-1">Auto-Select:</span>
                                    <button 
                                        onClick={() => autoSelectFiles("selectAll")}
                                        title="Select All Eligible"
                                        className="bg-white hover:bg-slate-100 border border-gray-200 rounded-md active:scale-95 transition-all text-[10px] font-bold text-blue-600 hover:text-blue-755 shadow-sm flex items-center justify-center cursor-pointer w-7 h-7"
                                    >
                                        <i className="fa-solid fa-check-double"></i>
                                    </button>
                                    <button 
                                        onClick={() => autoSelectFiles("clearAll")}
                                        title="Clear All"
                                        className="bg-white hover:bg-slate-100 border border-gray-200 rounded-md active:scale-95 transition-all text-[10px] font-bold text-gray-600 hover:text-gray-805 shadow-sm flex items-center justify-center cursor-pointer w-7 h-7"
                                    >
                                        <i className="fa-solid fa-circle-xmark"></i>
                                    </button>
                                </div>
                                <button 
                                    onClick={() => handleReversalAction("REVERT_MOVES")}
                                    title="Undo Selected Moves"
                                    className="bg-blue-600 hover:bg-blue-700 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white font-semibold text-xs px-3.5 py-1.5 rounded-xl transition-all duration-150 flex items-center justify-center shadow-sm ml-auto w-8 h-8"
                                >
                                    <i className="fa-solid fa-rotate-left"></i>
                                </button>
                            </div>
                        </div>

                        {sortedOrg.length === 0 ? (
                            <p className="text-center text-xs text-gray-500 py-6">No organized files match filters.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead>
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                                                <i className="fa-solid fa-square-check text-gray-400 mr-1"></i>Select
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                                                <i className="fa-solid fa-file-import text-gray-400 mr-1"></i>Original Path
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                                                <i className="fa-solid fa-folder-tree text-gray-400 mr-1"></i>Organized Path
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 text-xs">
                                        {sortedOrg.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="px-3 py-2">
                                                    <input 
                                                        type="checkbox"
                                                        checked={selectedFiles.includes(item.organizedPath || item.newPath)}
                                                        onChange={() => toggleFileSelection(item.organizedPath || item.newPath)}
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-gray-600 truncate max-w-xs">
                                                    <span className="flex items-center gap-1.5">
                                                        <i className="fa-solid fa-file-arrow-down text-slate-400"></i>
                                                        {item.originalPath || item.oldPath}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-gray-800 font-medium truncate max-w-xs">
                                                    <span className="flex items-center gap-1.5">
                                                        <i className="fa-solid fa-file-circle-check text-emerald-500"></i>
                                                        {item.organizedPath || item.newPath}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );
            }

            case "BACKUP": {
                const sortedBkp = getSortedBackup().slice(0, 1000);
                return (
                    <div className="space-y-4">
                        {payload.length > 1000 && (
                            <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-2 font-semibold flex items-center gap-2">
                                <i className="fa-solid fa-circle-info text-amber-605 text-sm"></i>
                                <span>Showing top 1000 of {payload.length} backup operations. Use filters/statuses to search.</span>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-2 justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100 mb-3">
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    value={resSearch}
                                    onChange={(e) => setResSearch(e.target.value)}
                                    placeholder="Search paths..."
                                    className="border border-gray-200 rounded-lg p-1.5 bg-white text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36 sm:w-44"
                                />
                                <select 
                                    onChange={(e) => setResStatusFilter(e.target.value)}
                                    value={resStatusFilter}
                                    className="border border-gray-200 rounded-lg p-1.5 bg-white text-xs font-semibold text-gray-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="ALL">All Statuses</option>
                                    <option value="SUCCESS">Success</option>
                                    <option value="FAILED">Failed</option>
                                </select>
                            </div>
                            <select 
                                onChange={(e) => setResSort(e.target.value)}
                                value={resSort || "srcAsc"}
                                className="border border-gray-200 rounded-lg p-1.5 bg-white text-xs font-semibold text-gray-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="srcAsc">Source: A to Z</option>
                                <option value="srcDesc">Source: Z to A</option>
                                <option value="bkpAsc">Backup: A to Z</option>
                                <option value="bkpDesc">Backup: Z to A</option>
                                <option value="status">Status</option>
                            </select>
                        </div>

                        {/* Auto-Select and Folder Pattern Controls */}
                        <div className="p-3 bg-gray-50 border border-gray-150 rounded-xl space-y-3 text-left mb-3">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="flex-grow flex items-center gap-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase shrink-0 w-20 flex items-center gap-1">
                                        <i className="fa-solid fa-filter-circle-xmark text-rose-400"></i>
                                        Skip Folder:
                                    </label>
                                    <input 
                                        type="text"
                                        value={skipFolder}
                                        onChange={(e) => setSkipFolder(e.target.value)}
                                        placeholder="e.g. KeepThisFolder"
                                        className="w-full border border-gray-200 rounded-lg p-1.5 bg-white text-gray-755 focus:outline-none focus:ring-1 focus:ring-blue-500 text-[11px] font-medium"
                                    />
                                </div>
                                <div className="flex-grow flex items-center gap-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase shrink-0 w-20 flex items-center gap-1">
                                        <i className="fa-solid fa-filter-circle-dollar text-green-400"></i>
                                        Target Only:
                                    </label>
                                    <input 
                                        type="text"
                                        value={targetFolder}
                                        onChange={(e) => setTargetFolder(e.target.value)}
                                        placeholder="e.g. DeleteThisFolder"
                                        className="w-full border border-gray-200 rounded-lg p-1.5 bg-white text-gray-755 focus:outline-none focus:ring-1 focus:ring-blue-500 text-[11px] font-medium"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-dashed border-gray-200">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mr-1">Auto-Select:</span>
                                    <button 
                                        onClick={() => autoSelectFiles("selectAll")}
                                        className="bg-white hover:bg-slate-100 border border-gray-200 px-3 py-1 rounded-md active:scale-95 transition-all text-[10px] font-bold text-blue-600 hover:text-blue-755 shadow-sm flex items-center gap-1 cursor-pointer"
                                    >
                                        <i className="fa-solid fa-check-double"></i> Select All Eligible
                                    </button>
                                    <button 
                                        onClick={() => autoSelectFiles("clearAll")}
                                        className="bg-white hover:bg-slate-100 border border-gray-200 px-3 py-1 rounded-md active:scale-95 transition-all text-[10px] font-bold text-gray-600 hover:text-gray-805 shadow-sm flex items-center gap-1 cursor-pointer"
                                    >
                                        <i className="fa-solid fa-circle-xmark"></i> Clear
                                    </button>
                                </div>
                                <button 
                                    onClick={() => handleReversalAction("RESTORE_FILES")}
                                    className="bg-blue-600 hover:bg-blue-700 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white font-semibold text-xs px-3.5 py-1.5 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-sm ml-auto"
                                >
                                    <i className="fa-solid fa-cloud-arrow-up"></i>
                                    Restore Selected
                                </button>
                            </div>
                        </div>

                        {sortedBkp.length === 0 ? (
                            <p className="text-center text-xs text-gray-550 py-6">No backed up files match filters.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead>
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                                                <i className="fa-solid fa-square-check text-gray-400 mr-1"></i>Select
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                                                <i className="fa-solid fa-file-lines text-gray-400 mr-1"></i>Source Path
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                                                <i className="fa-solid fa-shield-halved text-gray-400 mr-1"></i>Backup Path
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                                                <i className="fa-solid fa-circle-info text-gray-400 mr-1"></i>Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 text-xs">
                                        {sortedBkp.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="px-3 py-2">
                                                    <input 
                                                        type="checkbox"
                                                        checked={selectedFiles.includes(item.sourcePath || item.path)}
                                                        onChange={() => toggleFileSelection(item.sourcePath || item.path)}
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-gray-800 truncate max-w-xs">
                                                    <span className="flex items-center gap-1.5">
                                                        <i className="fa-solid fa-file text-slate-400"></i>
                                                        {item.sourcePath || item.path}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-gray-500 truncate max-w-xs">
                                                    <span className="flex items-center gap-1.5">
                                                        <i className="fa-solid fa-file-shield text-indigo-400"></i>
                                                        {item.backupPath || item.targetPath}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${item.failed ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                                                        <i className={`fa-solid ${item.failed ? "fa-circle-xmark" : "fa-circle-check"}`}></i>
                                                        {item.failed ? "Failed" : "Copied"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );
            }

            default:
                return (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 overflow-auto max-h-64">
                        <pre className="text-xs font-mono text-slate-700">{JSON.stringify(payload, null, 2)}</pre>
                    </div>
                );
        }
    };

    return (
        <div className="w-full bg-white border border-gray-150 shadow-sm rounded-3xl flex flex-col overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onClose} 
                        className="mr-2 bg-slate-50 hover:bg-slate-100 text-gray-605 text-xs font-bold px-3.5 py-2 rounded-xl border border-gray-200 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                    >
                        <i className="fa-solid fa-arrow-left"></i>
                        Back to Tasks
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg shadow-inner">
                        <i className="fa-solid fa-file-waveform"></i>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">
                            {task.actionDetails || `${task.taskType} Operations`}
                        </h3>
                        {task.sourcePath ? (
                            <p className="text-xs text-gray-500 font-semibold mt-0.5 flex flex-wrap items-center gap-1.5">
                                <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">{task.sourcePath}</span>
                                {task.destinationPath && (
                                    <>
                                        <i className="fa-solid fa-arrow-right text-gray-300 text-[10px]"></i>
                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">{task.destinationPath}</span>
                                    </>
                                )}
                            </p>
                        ) : (
                            <p className="text-xs text-gray-500 font-semibold mt-0.5">Task Type: {task.taskType}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleDownloadCsv}
                        className="bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
                    >
                        <i className="fa-solid fa-file-csv"></i>
                        Export CSV
                    </button>
                </div>
            </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-grow">
                    {task.summary && task.summary.includes("[Dry Run]") && (
                        <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-950 p-4 rounded-xl mb-4 text-xs flex items-center gap-2.5 shadow-sm">
                            <i className="fa-solid fa-circle-exclamation text-amber-500 text-sm"></i>
                            <div>
                                <h4 className="font-bold mb-1">Dry Run Simulation</h4>
                                <p>This operation was executed in simulation mode. No files were deleted, moved, or modified on disk.</p>
                            </div>
                        </div>
                    )}
                    {task.status === "COMPLETED_WITH_FAILURES" && (
                        <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-950 p-4 rounded-xl mb-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-2.5">
                                <i className="fa-solid fa-circle-exclamation text-amber-500 mt-0.5 text-sm"></i>
                                <div>
                                    <h4 className="font-bold mb-1">Reversal Warning: Some operations failed.</h4>
                                    <p>You can unlock/free the target files on your system and retry them.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleReversalAction("RETRY_FAILED")}
                                className="bg-amber-500 hover:bg-amber-600 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-sm shrink-0"
                            >
                                <i className="fa-solid fa-arrows-rotate"></i>
                                Retry Failed Operations
                            </button>
                        </div>
                    )}
                    {renderSubView()}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-semibold flex items-center gap-1.5">
                        <i className="fa-solid fa-square-check text-blue-500"></i>
                        {selectedFiles.length} files selected
                    </span>
                    <div className="flex gap-2">
                        <button 
                            onClick={onClose}
                            className="bg-white hover:bg-gray-100 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-200 text-gray-700 border border-gray-200 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-1.5"
                        >
                            <i className="fa-solid fa-arrow-left"></i>
                            Back to Tasks
                        </button>
                    </div>
                </div>
            </div>
    );
};

export default GenericResultViewer;
