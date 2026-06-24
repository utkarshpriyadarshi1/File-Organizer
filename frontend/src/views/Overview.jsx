import { TaskType, TaskStatus } from "../enums/SystemTypes";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useTasks } from "../services/TaskContext";
import GenericResultViewer from "../components/GenericResultViewer";

const Overview = ({ setActiveTab }) => {
    const { addToast, selectFolder } = useTasks();
    const [stats, setStats] = useState({
        activeCount: 0,
        syncCount: 0,
        historyCount: 0,
        reportsCache: { size: "0 B", count: 0 },
        tempCache: { size: "0 B", count: 0 },
        logsCache: { size: "0 B", count: 0 }
    });
    const [recentLogs, setRecentLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [clearingCache, setClearingCache] = useState(null);
    const [isOnline, setIsOnline] = useState(true);

    // Storage Analyzer states
    const [analyzerPath, setAnalyzerPath] = useState("");
    const [analysisResult, setAnalysisResult] = useState(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);

    const selectAnalyzerFolder = async () => {
        console.log("[Overview] Prompting user to select folder for analyzer...");
        const selectedFolder = await selectFolder();
        if (selectedFolder) {
            console.log(`[Overview] Analyzer folder selected: "${selectedFolder}"`);
            setAnalyzerPath(selectedFolder);
        }
    };

    const runDirectoryAnalysis = async () => {
        if (!analyzerPath) {
            alert("Please select a directory first.");
            return;
        }
        console.log(`[Overview] Starting analysis on folder: "${analyzerPath}"`);
        setAnalysisLoading(true);
        try {
            const res = await axios.get(`http://localhost:8080/api/analysis/directory?folderPath=${encodeURIComponent(analyzerPath)}`);
            console.info("[Overview] Successfully completed analysis.", res.data);
            setAnalysisResult(res.data);
        } catch (err) {
            console.error("[Overview] Failed to run directory size breakdown:", err);
            addToast("Failed to analyze directory.", "error");
        } finally {
            setAnalysisLoading(false);
        }
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const loadDashboardData = async (isBackground = false) => {
        if (!isBackground) {
            setLoading(true);
        }
        try {
            const [activeRes, historyRes, syncRes, cacheRes] = await Promise.all([
                axios.get("http://localhost:8080/api/tasks/active"),
                axios.get("http://localhost:8080/api/tasks/history"),
                axios.get("http://localhost:8080/api/sync/jobs"),
                axios.get("http://localhost:8080/api/settings/cache")
            ]);

            // Sort and grab top 5 recent tasks
            const sortedHistory = [...historyRes.data].sort((a, b) => 
                new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt)
            );
            setRecentLogs(sortedHistory.slice(0, 5));

            // Map cache directories
            let reports = { size: "0 B", count: 0 };
            let temp = { size: "0 B", count: 0 };
            let logs = { size: "0 B", count: 0 };
            
            if (Array.isArray(cacheRes.data)) {
                cacheRes.data.forEach(folder => {
                    const mapped = { 
                        size: folder.sizeFormatted || `${(folder.totalSize / 1024).toFixed(1)} KB`, 
                        count: folder.fileCount 
                    };
                    if (folder.folderName === "reports") reports = mapped;
                    if (folder.folderName === "temp") temp = mapped;
                    if (folder.folderName === "logs") logs = mapped;
                });
            }

            setStats({
                activeCount: activeRes.data.length,
                syncCount: syncRes.data.length,
                historyCount: historyRes.data.length,
                reportsCache: reports,
                tempCache: temp,
                logsCache: logs
            });
            setIsOnline(true);
        } catch (e) {
            console.error("[DashboardOverview] Failed to load statistics.", e);
            setIsOnline(false);
        } finally {
            if (!isBackground) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        loadDashboardData();
        
        axios.get("http://localhost:8080/api/settings/default-path")
            .then(res => {
                if (res.data.defaultPath) {
                    setAnalyzerPath(res.data.defaultPath);
                }
            })
            .catch(err => console.error("[Overview] Failed to fetch default path:", err));

        // Poll every 5 seconds to keep dashboard stats and connection state synchronized
        const interval = setInterval(() => {
            loadDashboardData(true);
        }, 5000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleClearCache = async (folderName) => {
        setClearingCache(folderName);
        try {
            await axios.delete(`http://localhost:8080/api/settings/cache?folderName=${folderName}`);
            addToast(`Successfully cleared ${folderName} cache.`, "success");
            loadDashboardData();
        } catch (e) {
            console.error(`[DashboardOverview] Failed to purge ${folderName} cache.`, e);
            addToast(`Failed to purge ${folderName} cache.`, "error");
        } finally {
            setClearingCache(null);
        }
    };

    const getTaskIcon = (taskType) => {
        switch (taskType) {
            case TaskType.ORGANIZE: return <i className="fa-solid fa-folder-tree text-blue-500 mr-2"></i>;
            case TaskType.BACKUP: return <i className="fa-solid fa-shield-halved text-amber-500 mr-2"></i>;
            case TaskType.DUPLICATE_SCAN: return <i className="fa-solid fa-copy text-rose-500 mr-2"></i>;
            case TaskType.SYNC: return <i className="fa-solid fa-arrows-rotate text-sky-500 mr-2"></i>;
            case TaskType.RESTORE: return <i className="fa-solid fa-cloud-arrow-up text-emerald-500 mr-2"></i>;
            default: return <i className="fa-solid fa-gears text-gray-500 mr-2"></i>;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case TaskStatus.COMPLETED: return "bg-green-50 text-green-700 border border-green-200";
            case TaskStatus.COMPLETED_WITH_FAILURES: return "bg-amber-50 text-amber-700 border border-amber-200";
            case TaskStatus.FAILED: return "bg-red-50 text-red-700 border border-red-200";
            case TaskStatus.CANCELED: return "bg-gray-50 text-gray-700 border border-gray-200";
            default: return "bg-blue-50 text-blue-700 border border-blue-200";
        }
    };

    if (selectedTask) {
        return (
            <GenericResultViewer 
                task={selectedTask} 
                onClose={() => {
                    setSelectedTask(null);
                    loadDashboardData();
                }} 
            />
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
                <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-500 text-xs font-semibold">Synchronizing Dashboard Metrics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 max-w-6xl mx-auto">
            {/* Redesigned Hello Banner */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-850 rounded-2xl p-4 md:p-5 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-3 border border-indigo-500/10">
                <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-white/10 blur-2xl"></div>
                <div className="absolute -left-16 -bottom-16 w-48 h-48 rounded-full bg-white/5 blur-2xl"></div>
                
                <div className="space-y-1 relative z-10">
                    <span className="text-[10px] uppercase tracking-widest font-black text-indigo-200">System Dashboard</span>
                    <p className="text-xs text-blue-50 font-medium mt-0.5">
                        {isOnline ? "File Organizer Desktop Client is connected and fully operational." : "Connection lost. Retrying backend server synchronization..."}
                    </p>
                </div>
                
                {isOnline ? (
                    <div className="flex items-center gap-3 relative z-10 shrink-0 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 shadow-md">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <div className="text-[10px]">
                            <p className="font-bold text-white uppercase tracking-wider text-[8px] leading-none">Connection</p>
                            <p className="font-semibold text-emerald-300 mt-0.5 leading-none">Online & Healthy</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 relative z-10 shrink-0 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-rose-500/30 shadow-md">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                        </span>
                        <div className="text-[10px]">
                            <p className="font-bold text-white uppercase tracking-wider text-[8px] leading-none">Connection</p>
                            <p className="font-semibold text-rose-300 mt-0.5 leading-none">Offline</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Redesigned KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Active Tasks */}
                <div 
                    onClick={() => setActiveTab("tasks")}
                    className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-blue-200 transition-all duration-300 flex items-center justify-between group active:scale-95"
                >
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Active Operations</p>
                        <p className="text-2xl font-black text-slate-800 group-hover:text-blue-600 transition-colors">{stats.activeCount}</p>
                        <p className="text-[10px] text-slate-500 font-semibold">Running tasks</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-base shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                        <i className={`fa-solid fa-circle-notch ${stats.activeCount > 0 ? "animate-spin" : ""}`}></i>
                    </div>
                </div>

                {/* Sync Profiles */}
                <div 
                    onClick={() => setActiveTab("sync")}
                    className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-emerald-200 transition-all duration-300 flex items-center justify-between group active:scale-95"
                >
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Sync Profiles</p>
                        <p className="text-2xl font-black text-slate-800 group-hover:text-emerald-600 transition-colors">{stats.syncCount}</p>
                        <p className="text-[10px] text-slate-500 font-semibold">Mirror folders</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base shadow-inner group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                        <i className="fa-solid fa-arrows-rotate"></i>
                    </div>
                </div>

                {/* Historical Runs */}
                <div 
                    onClick={() => setActiveTab("tasks")}
                    className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-indigo-200 transition-all duration-300 flex items-center justify-between group active:scale-95"
                >
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Processed Runs</p>
                        <p className="text-2xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{stats.historyCount}</p>
                        <p className="text-[10px] text-slate-500 font-semibold">Completed operations</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-base shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                        <i className="fa-solid fa-list-check"></i>
                    </div>
                </div>

                {/* Cache Health */}
                <div 
                    onClick={() => setActiveTab("settings")}
                    className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-rose-200 transition-all duration-300 flex items-center justify-between group active:scale-95"
                >
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Cache Files</p>
                        <p className="text-2xl font-black text-slate-800 group-hover:text-rose-600 transition-colors">
                            {stats.reportsCache.count + stats.tempCache.count + stats.logsCache.count}
                        </p>
                        <p className="text-[10px] text-slate-500 font-semibold">Diagnostic cache size</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-base shadow-inner group-hover:bg-rose-600 group-hover:text-white transition-all duration-300">
                        <i className="fa-solid fa-fire text-sm"></i>
                    </div>
                </div>
            </div>

            {/* Redesigned Disk Space & File Type Analyzer */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-md space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                    <div>
                        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <i className="fa-solid fa-chart-pie text-indigo-600 text-base"></i>
                            Disk Space & File Type Analyzer
                        </h3>
                        <p className="text-[10px] text-slate-500 font-semibold">Crawl and classify files in any local directory to visualize space utilization</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                        type="text" 
                        value={analyzerPath} 
                        readOnly
                        placeholder="Select a folder to analyze..."
                        className="bg-slate-50 text-xs border border-slate-200 rounded-xl p-2.5 flex-grow focus:outline-none font-mono font-bold text-slate-700"
                    />
                    <div className="flex gap-2">
                        <button 
                            onClick={selectAnalyzerFolder} 
                            className="bg-slate-100 hover:bg-slate-200 text-slate-750 active:scale-95 text-[11px] font-extrabold px-3.5 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-1.5 border border-slate-200 cursor-pointer"
                        >
                            <i className="fa-solid fa-folder-open text-slate-500"></i>
                            Select Folder
                        </button>
                        <button 
                            onClick={runDirectoryAnalysis}
                            disabled={analysisLoading}
                            className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[11px] font-extrabold px-4 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-md shadow-indigo-500/10 cursor-pointer disabled:opacity-50"
                        >
                            {analysisLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-magnifying-glass-chart"></i>}
                            Analyze Storage
                        </button>
                    </div>
                </div>

                {analysisLoading && (
                    <div className="py-6 flex flex-col items-center justify-center space-y-2 bg-slate-50/50 rounded-2xl border border-slate-100">
                        <div className="w-6 h-6 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-[10px] text-slate-550 font-bold">Crawling directory contents and compiling stats...</p>
                    </div>
                )}

                {analysisResult && !analysisLoading && (
                    <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-100/80 space-y-3.5">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-slate-200">
                            <div>
                                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Scanned Path</p>
                                <p className="text-xs font-semibold text-slate-700 font-mono mt-0.5 truncate max-w-md lg:max-w-2xl" title={analysisResult.folderPath}>{analysisResult.folderPath}</p>
                            </div>
                            <div className="flex gap-4 shrink-0">
                                <div>
                                    <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider md:text-right">Total Size</p>
                                    <p className="text-xs font-black text-slate-800 md:text-right">{formatBytes(analysisResult.totalSize)}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider md:text-right">Files Count</p>
                                    <p className="text-xs font-black text-slate-800 md:text-right">{analysisResult.totalFiles} files</p>
                                </div>
                            </div>
                        </div>

                        {/* Visual breakdown list */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-0.5">
                            {Object.entries(analysisResult.categories).map(([catName, catStats]) => {
                                const sizePercentage = analysisResult.totalSize > 0 
                                    ? ((catStats.totalSize / analysisResult.totalSize) * 100) 
                                    : 0;
                                
                                let barColorClass = "bg-blue-500";
                                let iconClass = "fa-solid fa-question text-gray-500";
                                let bgIconColor = "bg-gray-100 text-gray-600";
                                
                                if (catName === "Images") {
                                    barColorClass = "bg-rose-500";
                                    iconClass = "fa-solid fa-image text-rose-500";
                                    bgIconColor = "bg-rose-50";
                                } else if (catName === "Media") {
                                    barColorClass = "bg-purple-500";
                                    iconClass = "fa-solid fa-film text-purple-500";
                                    bgIconColor = "bg-purple-50";
                                } else if (catName === "Documents") {
                                    barColorClass = "bg-sky-500";
                                    iconClass = "fa-solid fa-file-invoice text-sky-500";
                                    bgIconColor = "bg-sky-50";
                                } else if (catName === "Archives") {
                                    barColorClass = "bg-amber-500";
                                    iconClass = "fa-solid fa-file-zipper text-amber-500";
                                    bgIconColor = "bg-amber-50";
                                } else if (catName === "Code/Text") {
                                    barColorClass = "bg-emerald-500";
                                    iconClass = "fa-solid fa-code text-emerald-500";
                                    bgIconColor = "bg-emerald-50";
                                } else {
                                    barColorClass = "bg-slate-400";
                                    iconClass = "fa-solid fa-file text-slate-500";
                                    bgIconColor = "bg-slate-100";
                                }

                                return (
                                    <div key={catName} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 hover:shadow hover:border-slate-200 transition-all duration-200">
                                        <div className={`w-9 h-9 rounded-xl ${bgIconColor} flex items-center justify-center text-base shrink-0 shadow-inner`}>
                                            <i className={iconClass}></i>
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="flex justify-between items-center text-[11px] font-extrabold text-slate-800">
                                                <span>{catName}</span>
                                                <span>{formatBytes(catStats.totalSize)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] text-slate-400 font-semibold mt-0.5">
                                                <span>{catStats.fileCount} files</span>
                                                <span>{sizePercentage.toFixed(1)}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-1 mt-1.5 overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${barColorClass} transition-all duration-500`}
                                                    style={{ width: `${sizePercentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Redesigned Lower Grid: Completed Runs on Left, Quick Shortcuts on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Recent Completed Runs Table (2/3 width) */}
                <div className="lg:col-span-2 bg-white p-4.5 rounded-2xl border border-slate-100 shadow-md space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                <i className="fa-solid fa-clock-rotate-left text-slate-500"></i>
                                Recent Completed Runs
                            </h3>
                            <p className="text-[10px] text-slate-500 font-semibold">Click on any record to view its detailed changes report</p>
                        </div>
                        <button 
                            onClick={() => setActiveTab("tasks")} 
                            className="text-[9px] font-extrabold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-100 hover:border-blue-200 px-2.5 py-1 rounded-lg active:scale-95 transition-all shadow-inner cursor-pointer"
                        >
                            View Full History
                        </button>
                    </div>

                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                                <tr className="text-left text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="px-3.5 py-2.5">Operation</th>
                                    <th className="px-3.5 py-2.5">Status</th>
                                    <th className="px-3.5 py-2.5">Execution Summary</th>
                                    <th className="px-3.5 py-2.5">Completed Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[11px] bg-white">
                                {recentLogs.map(task => (
                                    <tr 
                                        key={task.id} 
                                        onClick={() => setSelectedTask(task)}
                                        className="hover:bg-slate-50/85 cursor-pointer transition-colors duration-150"
                                    >
                                        <td className="px-3.5 py-2.5 font-bold text-slate-850 flex items-center min-w-[140px]">
                                            {getTaskIcon(task.taskType)}
                                            {task.taskType}
                                        </td>
                                        <td className="px-3.5 py-2.5 min-w-[130px]">
                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold ${getStatusColor(task.status)}`}>
                                                <i className={`fa-solid ${task.status === "COMPLETED" ? "fa-circle-check" : task.status === "FAILED" ? "fa-circle-xmark" : task.status === "CANCELED" ? "fa-circle-minus" : "fa-circle-exclamation"}`}></i>
                                                {task.status.replace(/_/g, " ")}
                                            </span>
                                        </td>
                                        <td className="px-3.5 py-2.5 text-slate-600 truncate max-w-xs">{task.summary}</td>
                                        <td className="px-3.5 py-2.5 text-slate-500 font-semibold min-w-[150px]">
                                            <i className="fa-regular fa-clock text-slate-400 mr-1 text-[9px]"></i>
                                            {task.completedAt ? new Date(task.completedAt).toLocaleString() : "Unknown"}
                                        </td>
                                    </tr>
                                ))}
                                {recentLogs.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="text-center py-6 text-slate-400">
                                            <i className="fa-solid fa-folder-open text-xl mb-1 block"></i>
                                            No recent completed operations discovered.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Shortcuts Grid (1/3 width) */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-md space-y-3">
                    <div>
                        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <i className="fa-solid fa-bolt text-amber-500"></i>
                            Quick Shortcuts
                        </h3>
                        <p className="text-[10px] text-slate-500 font-semibold">Quick access to essential application modules</p>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                        <button 
                            onClick={() => setActiveTab("organizer")}
                            className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl text-left transition-all duration-200 active:scale-95 cursor-pointer group flex items-start gap-2.5"
                        >
                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm shrink-0 group-hover:scale-110 transition-transform">
                                <i className="fa-solid fa-folder-tree"></i>
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-slate-800 block">File Organizer</span>
                                <span className="text-[9px] text-slate-450 block font-semibold mt-0.5">Reorganize directory tree structure</span>
                            </div>
                        </button>

                        <button 
                            onClick={() => setActiveTab("backup")}
                            className="p-2.5 bg-slate-50 hover:bg-amber-50 border border-slate-100 hover:border-amber-200 rounded-xl text-left transition-all duration-200 active:scale-95 cursor-pointer group flex items-start gap-2.5"
                        >
                            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-sm shrink-0 group-hover:scale-110 transition-transform">
                                <i className="fa-solid fa-shield-halved"></i>
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-slate-800 block">Backup & Restore</span>
                                <span className="text-[9px] text-slate-450 block font-semibold mt-0.5">Safeguard directories offline</span>
                            </div>
                        </button>

                        <button 
                            onClick={() => setActiveTab("duplicates")}
                            className="p-2.5 bg-slate-50 hover:bg-rose-50 border border-slate-100 hover:border-rose-200 rounded-xl text-left transition-all duration-200 active:scale-95 cursor-pointer group flex items-start gap-2.5"
                        >
                            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center text-sm shrink-0 group-hover:scale-110 transition-transform">
                                <i className="fa-solid fa-copy"></i>
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-slate-800 block">Duplicate Cleaner</span>
                                <span className="text-[9px] text-slate-450 block font-semibold mt-0.5">Scan and resolve duplicate files</span>
                            </div>
                        </button>

                        <button 
                            onClick={() => setActiveTab("sync")}
                            className="p-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 rounded-xl text-left transition-all duration-200 active:scale-95 cursor-pointer group flex items-start gap-2.5"
                        >
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm shrink-0 group-hover:scale-110 transition-transform">
                                <i className="fa-solid fa-shuffle"></i>
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-slate-800 block">Sync Directories</span>
                                <span className="text-[9px] text-slate-450 block font-semibold mt-0.5">Mirror two folder locations</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Overview;
