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
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Hello Banner */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 rounded-3xl p-6 md:p-8 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-white/10 blur-2xl"></div>
                <div className="absolute -left-16 -bottom-16 w-48 h-48 rounded-full bg-white/5 blur-2xl"></div>
                
                <div className="space-y-2 relative z-10">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight">System Overview & Metrics</h2>
                    <p className="text-sm text-blue-100 font-medium">
                        {isOnline ? "e-abhilekh File Organizer Desktop App is connected and operational." : "Connection lost. Retrying backend server synchronization..."}
                    </p>
                </div>
                
                {isOnline ? (
                    <div className="flex items-center gap-3 relative z-10 shrink-0 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <div className="text-xs">
                            <p className="font-bold text-white uppercase tracking-wider text-[9px]">Server Connection</p>
                            <p className="font-semibold text-emerald-300 mt-0.5">Online & Healthy</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 relative z-10 shrink-0 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-rose-500/30">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                        </span>
                        <div className="text-xs">
                            <p className="font-bold text-white uppercase tracking-wider text-[9px]">Server Connection</p>
                            <p className="font-semibold text-rose-300 mt-0.5">Offline / Disconnected</p>
                        </div>
                    </div>
                )}
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Active Tasks */}
                <div 
                    onClick={() => setActiveTab("tasks")}
                    className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-95 duration-150 flex items-center justify-between group"
                >
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Operations</p>
                        <p className="text-2xl font-black text-gray-800 group-hover:text-blue-600 transition-colors">{stats.activeCount}</p>
                        <p className="text-[10px] text-gray-500 font-semibold">Running background tasks</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all duration-200">
                        <i className={`fa-solid fa-circle-notch ${stats.activeCount > 0 ? "animate-spin" : ""}`}></i>
                    </div>
                </div>

                {/* Sync Profiles */}
                <div 
                    onClick={() => setActiveTab("sync")}
                    className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-95 duration-150 flex items-center justify-between group"
                >
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sync Profiles</p>
                        <p className="text-2xl font-black text-gray-800 group-hover:text-emerald-600 transition-colors">{stats.syncCount}</p>
                        <p className="text-[10px] text-gray-500 font-semibold">Registered folders mirroring</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shadow-inner group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200">
                        <i className="fa-solid fa-arrows-rotate"></i>
                    </div>
                </div>

                {/* Historical Runs */}
                <div 
                    onClick={() => setActiveTab("tasks")}
                    className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-95 duration-150 flex items-center justify-between group"
                >
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Processed Actions</p>
                        <p className="text-2xl font-black text-gray-800 group-hover:text-indigo-600 transition-colors">{stats.historyCount}</p>
                        <p className="text-[10px] text-gray-500 font-semibold">Completed background operations</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200">
                        <i className="fa-solid fa-list-check"></i>
                    </div>
                </div>

                {/* Cache Health */}
                <div 
                    onClick={() => setActiveTab("settings")}
                    className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-95 duration-150 flex items-center justify-between group"
                >
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">System Cache Files</p>
                        <p className="text-2xl font-black text-gray-800 group-hover:text-rose-600 transition-colors">
                            {stats.reportsCache.count + stats.tempCache.count + stats.logsCache.count}
                        </p>
                        <p className="text-[10px] text-gray-500 font-semibold">Diagnostic log and report files</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg shadow-inner group-hover:bg-rose-600 group-hover:text-white transition-all duration-200">
                        <i className="fa-solid fa-fire text-md"></i>
                    </div>
                </div>
            </div>

            {/* Disk Space & File Type Analyzer */}
            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4">
                <div>
                    <h3 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                        <i className="fa-solid fa-chart-pie text-indigo-600 text-lg"></i>
                        Disk Space & File Type Analyzer
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">Crawl and classify files in any local directory to visualize space utilization</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                        type="text" 
                        value={analyzerPath} 
                        readOnly
                        placeholder="Select a folder to analyze..."
                        className="bg-gray-50 text-xs border border-gray-200 rounded-xl p-3 flex-grow focus:outline-none font-medium text-gray-705"
                    />
                    <div className="flex gap-2">
                        <button 
                            onClick={selectAnalyzerFolder} 
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 text-xs font-bold px-4 py-3 rounded-xl transition-all duration-155 flex items-center gap-1.5 shadow-sm border border-gray-200 cursor-pointer"
                        >
                            <i className="fa-solid fa-folder-open"></i>
                            Select Folder
                        </button>
                        <button 
                            onClick={runDirectoryAnalysis}
                            disabled={analysisLoading}
                            className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold px-4 py-3 rounded-xl transition-all duration-155 flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                        >
                            {analysisLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-magnifying-glass-chart"></i>}
                            Analyze Storage
                        </button>
                    </div>
                </div>

                {analysisLoading && (
                    <div className="py-8 flex flex-col items-center justify-center space-y-2">
                        <div className="w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-[10px] text-gray-505 font-semibold">Crawling directory contents and compiling stats...</p>
                    </div>
                )}

                {analysisResult && !analysisLoading && (
                    <div className="mt-4 p-4 bg-slate-50/50 rounded-2xl border border-gray-100 space-y-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-gray-200">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Scanned Path</p>
                                <p className="text-xs font-semibold text-gray-700 font-mono mt-0.5 truncate max-w-md lg:max-w-xl" title={analysisResult.folderPath}>{analysisResult.folderPath}</p>
                            </div>
                            <div className="flex gap-4 shrink-0">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider md:text-right">Total Size</p>
                                    <p className="text-sm font-black text-gray-805 md:text-right">{formatBytes(analysisResult.totalSize)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider md:text-right">Files Count</p>
                                    <p className="text-sm font-black text-gray-805 md:text-right">{analysisResult.totalFiles} files</p>
                                </div>
                            </div>
                        </div>

                        {/* Visual breakdown list */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
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
                                    <div key={catName} className="bg-white p-3.5 rounded-xl border border-gray-150/70 shadow-sm flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl ${bgIconColor} flex items-center justify-center text-lg shrink-0 shadow-inner`}>
                                            <i className={iconClass}></i>
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="flex justify-between items-center text-xs font-bold text-gray-800">
                                                <span>{catName}</span>
                                                <span>{formatBytes(catStats.totalSize)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-gray-400 font-semibold mt-0.5">
                                                <span>{catStats.fileCount} files</span>
                                                <span>{sizePercentage.toFixed(1)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
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

            {/* Middle Section: Cache Controls & Quick Operations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* System cache management */}
                <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-4">
                    <div>
                        <h3 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                            <i className="fa-solid fa-floppy-disk text-slate-500"></i>
                            Diagnostic Cache Management
                        </h3>
                        <p className="text-[11px] text-gray-500 mt-0.5">Optimize system storage by purging temporary and report files</p>
                    </div>

                    <div className="space-y-3">
                        {/* Reports Cache */}
                        <div className="flex justify-between items-center p-3.5 bg-gray-50 border border-gray-100 rounded-xl">
                            <div>
                                <p className="text-xs font-bold text-gray-800">Completed Reports Cache</p>
                                <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                                    {stats.reportsCache.count} files • {stats.reportsCache.size}
                                </p>
                            </div>
                            <button
                                disabled={clearingCache === "reports"}
                                onClick={() => handleClearCache("reports")}
                                className="bg-white hover:bg-red-50 text-red-600 hover:text-red-700 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:border-red-200 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                            >
                                {clearingCache === "reports" ? <i className="fa-solid fa-spinner animate-spin"></i> : "Purge Reports"}
                            </button>
                        </div>

                        {/* Temp cache */}
                        <div className="flex justify-between items-center p-3.5 bg-gray-50 border border-gray-100 rounded-xl">
                            <div>
                                <p className="text-xs font-bold text-gray-800">Temp Decryption Cache</p>
                                <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                                    {stats.tempCache.count} files • {stats.tempCache.size}
                                </p>
                            </div>
                            <button
                                disabled={clearingCache === "temp"}
                                onClick={() => handleClearCache("temp")}
                                className="bg-white hover:bg-red-50 text-red-600 hover:text-red-700 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:border-red-200 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                            >
                                {clearingCache === "temp" ? <i className="fa-solid fa-spinner animate-spin"></i> : "Purge Temp"}
                            </button>
                        </div>

                        {/* Diagnostic logs cache */}
                        <div className="flex justify-between items-center p-3.5 bg-gray-50 border border-gray-100 rounded-xl">
                            <div>
                                <p className="text-xs font-bold text-gray-800">Diagnostic System Logs</p>
                                <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                                    {stats.logsCache.count} files • {stats.logsCache.size}
                                </p>
                            </div>
                            <button
                                disabled={clearingCache === "logs"}
                                onClick={() => handleClearCache("logs")}
                                className="bg-white hover:bg-red-50 text-red-600 hover:text-red-700 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:border-red-200 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                            >
                                {clearingCache === "logs" ? <i className="fa-solid fa-spinner animate-spin"></i> : "Purge Logs"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick Shortcuts */}
                <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-4">
                    <div>
                        <h3 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                            <i className="fa-solid fa-bolt text-amber-500"></i>
                            Quick Shortcuts
                        </h3>
                        <p className="text-[11px] text-gray-500 mt-0.5">Quickly access other modules of the e-Abhilekh app</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setActiveTab("organizer")}
                            className="p-4 bg-slate-50 hover:bg-blue-50 border border-gray-150 hover:border-blue-200 rounded-2xl text-left transition-all active:scale-95 cursor-pointer group"
                        >
                            <i className="fa-solid fa-folder-tree text-blue-600 text-lg mb-2 block group-hover:scale-110 transition-transform"></i>
                            <span className="text-xs font-extrabold text-gray-800 block">File Organizer</span>
                            <span className="text-[9px] text-gray-400 block font-semibold mt-0.5">Reorganize directory tree structure</span>
                        </button>

                        <button 
                            onClick={() => setActiveTab("backup")}
                            className="p-4 bg-slate-50 hover:bg-amber-50 border border-gray-150 hover:border-amber-200 rounded-2xl text-left transition-all active:scale-95 cursor-pointer group"
                        >
                            <i className="fa-solid fa-shield-halved text-amber-500 text-lg mb-2 block group-hover:scale-110 transition-transform"></i>
                            <span className="text-xs font-extrabold text-gray-800 block">Backup & Restore</span>
                            <span className="text-[9px] text-gray-400 block font-semibold mt-0.5">Safeguard directories offline</span>
                        </button>

                        <button 
                            onClick={() => setActiveTab("duplicates")}
                            className="p-4 bg-slate-50 hover:bg-rose-50 border border-gray-150 hover:border-rose-200 rounded-2xl text-left transition-all active:scale-95 cursor-pointer group"
                        >
                            <i className="fa-solid fa-copy text-rose-500 text-lg mb-2 block group-hover:scale-110 transition-transform"></i>
                            <span className="text-xs font-extrabold text-gray-800 block">Duplicate Cleaner</span>
                            <span className="text-[9px] text-gray-400 block font-semibold mt-0.5">Scan and resolve duplicates</span>
                        </button>

                        <button 
                            onClick={() => setActiveTab("sync")}
                            className="p-4 bg-slate-50 hover:bg-emerald-50 border border-gray-150 hover:border-emerald-200 rounded-2xl text-left transition-all active:scale-95 cursor-pointer group"
                        >
                            <i className="fa-solid fa-shuffle text-emerald-500 text-lg mb-2 block group-hover:scale-110 transition-transform"></i>
                            <span className="text-xs font-extrabold text-gray-800 block">Sync Directories</span>
                            <span className="text-[9px] text-gray-400 block font-semibold mt-0.5">Mirror two folder locations</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Recent Completed Runs */}
            <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                            <i className="fa-solid fa-clock-rotate-left text-indigo-500"></i>
                            Recent Completed Runs
                        </h3>
                        <p className="text-[11px] text-gray-500 mt-0.5">Click on any record to view its detailed changes report</p>
                    </div>
                    <button 
                        onClick={() => setActiveTab("tasks")} 
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-100 hover:border-blue-200 px-3.5 py-1.5 rounded-lg active:scale-95 transition-all shadow-inner cursor-pointer"
                    >
                        View Full History
                    </button>
                </div>

                <div className="overflow-x-auto border border-gray-150 rounded-xl">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr className="text-left text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                <th className="px-4 py-2.5">Operation</th>
                                <th className="px-4 py-2.5">Status</th>
                                <th className="px-4 py-2.5">Execution Summary</th>
                                <th className="px-4 py-2.5">Completed Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 text-xs bg-white">
                            {recentLogs.map(task => (
                                <tr 
                                    key={task.id} 
                                    onClick={() => setSelectedTask(task)}
                                    className="hover:bg-slate-50 cursor-pointer active:scale-[0.99] origin-center transition-all duration-150"
                                >
                                    <td className="px-4 py-3 font-semibold text-gray-800 flex items-center min-w-[140px]">
                                        {getTaskIcon(task.taskType)}
                                        {task.taskType}
                                    </td>
                                    <td className="px-4 py-3 min-w-[130px]">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${getStatusColor(task.status)}`}>
                                            <i className={`fa-solid ${task.status === "COMPLETED" ? "fa-circle-check" : task.status === "FAILED" ? "fa-circle-xmark" : "fa-circle-exclamation"}`}></i>
                                            {task.status.replace(/_/g, " ")}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 truncate max-w-xs">{task.summary}</td>
                                    <td className="px-4 py-3 text-gray-500 font-medium min-w-[150px]">
                                        <i className="fa-regular fa-clock text-slate-400 mr-1 text-[10px]"></i>
                                        {task.completedAt ? new Date(task.completedAt).toLocaleString() : "Unknown"}
                                    </td>
                                </tr>
                            ))}
                            {recentLogs.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="text-center py-6 text-gray-400">
                                        <i className="fa-solid fa-folder-open text-2xl mb-1.5 block"></i>
                                        No recent completed operations discovered.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Overview;
