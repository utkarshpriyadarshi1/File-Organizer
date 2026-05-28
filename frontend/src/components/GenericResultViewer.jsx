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

    // Filter and Sort for DUPLICATE_SCAN
    const getFilteredDuplicates = () => {
        if (!payload) return [];
        return payload.filter(group => {
            if (!resSearch.trim()) return true;
            return group.hash.toLowerCase().includes(resSearch.toLowerCase()) ||
                   group.files.some(f => f.toLowerCase().includes(resSearch.toLowerCase()));
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
                    <div className="space-y-4">
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

                        {sortedDups.length === 0 ? (
                            <p className="text-center text-xs text-gray-500 py-6">No duplicate groups match filters.</p>
                        ) : sortedDups.map((group, idx) => (
                            <div key={idx} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                <p className="text-xs text-gray-500 font-mono mb-2 flex items-center gap-1.5">
                                    <i className="fa-solid fa-hashtag text-gray-400"></i>
                                    <span>Hash: {group.hash}</span>
                                </p>
                                <div className="space-y-1.5">
                                    {group.files.map((file, fIdx) => (
                                        <div key={fIdx} className="flex items-center gap-2">
                                            <input 
                                                type="checkbox"
                                                checked={selectedFiles.includes(file)}
                                                onChange={() => toggleFileSelection(file)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700 truncate max-w-lg flex items-center gap-1.5">
                                                <i className="fa-solid fa-file text-slate-400 text-xs"></i>
                                                {file}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white border border-gray-100 shadow-2xl rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
                            <i className="fa-solid fa-file-waveform"></i>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Task Log Details</h3>
                            <p className="text-xs text-gray-500 font-semibold">{task.taskType} • {task.id}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-slate-100 rounded-lg text-xl font-bold p-2 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-100">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-grow">
                    {task.status === "COMPLETED_WITH_FAILURES" && (
                        <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-950 p-4 rounded-xl mb-4 text-xs flex items-start gap-2.5">
                            <i className="fa-solid fa-circle-exclamation text-amber-500 mt-0.5 text-sm"></i>
                            <div>
                                <h4 className="font-bold mb-1">Reversal Warning: Some operations failed.</h4>
                                <p>You can unlock/free the target files on your system and click <strong>"Retry Failed Operations"</strong> below to re-process them.</p>
                            </div>
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
                        {task.taskType === "ORGANIZE" && (
                            <button 
                                onClick={() => handleReversalAction("REVERT_MOVES")}
                                className="bg-blue-600 hover:bg-blue-700 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-sm"
                            >
                                <i className="fa-solid fa-rotate-left"></i>
                                Undo Selected Moves
                            </button>
                        )}
                        {task.taskType === "BACKUP" && (
                            <button 
                                onClick={() => handleReversalAction("RESTORE_FILES")}
                                className="bg-blue-600 hover:bg-blue-700 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-sm"
                            >
                                <i className="fa-solid fa-cloud-arrow-up"></i>
                                Restore Selected
                            </button>
                        )}
                        {task.status === "COMPLETED_WITH_FAILURES" && (
                            <button 
                                onClick={() => handleReversalAction("RETRY_FAILED")}
                                className="bg-amber-500 hover:bg-amber-600 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-sm"
                            >
                                <i className="fa-solid fa-arrows-rotate"></i>
                                Retry Failed Operations
                            </button>
                        )}
                        <button 
                            onClick={onClose}
                            className="bg-white hover:bg-gray-100 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-200 text-gray-700 border border-gray-200 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-1.5"
                        >
                            <i className="fa-solid fa-xmark"></i>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GenericResultViewer;
