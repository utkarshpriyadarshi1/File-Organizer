import React, { useEffect, useState } from "react";
import axios from "axios";
import { useTasks } from "../services/TaskContext";

const Settings = () => {
    const { activeTasks, cancelTasksBulk, addToast } = useTasks();
    
    // Cache management states
    const [caches, setCaches] = useState([]);
    const [cacheFilter, setCacheFilter] = useState("ALL");
    const [cacheSort, setCacheSort] = useState("sizeDesc");
    const [cacheLoading, setCacheLoading] = useState(false);

    // Active tasks states
    const [activeList, setActiveList] = useState([]);
    const [selectedTasks, setSelectedTasks] = useState([]);
    const [taskFilter, setTaskFilter] = useState("ALL");
    const [taskSort, setTaskSort] = useState("timeDesc");

    const fetchCacheStats = () => {
        setCacheLoading(true);
        axios.get("http://localhost:8080/api/settings/cache")
            .then(res => {
                setCaches(res.data);
                setCacheLoading(false);
            })
            .catch(err => {
                console.error("Failed to load cache stats:", err);
                setCacheLoading(false);
            });
    };

    const fetchActiveList = () => {
        axios.get("http://localhost:8080/api/tasks/active")
            .then(res => {
                setActiveList(res.data);
            })
            .catch(err => console.error("Failed to fetch active list:", err));
    };

    useEffect(() => {
        fetchCacheStats();
        fetchActiveList();
        
        // Polling active list every 5 seconds
        const interval = setInterval(fetchActiveList, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleCleanCache = async (folderName) => {
        try {
            const res = await axios.delete(`http://localhost:8080/api/settings/cache?folderName=${folderName}`);
            addToast(res.data, "success");
            fetchCacheStats();
        } catch (e) {
            addToast("Failed to clear cache folder.", "error");
        }
    };

    // Sorting and filtering cache
    const getFilteredCaches = () => {
        return caches.filter(c => cacheFilter === "ALL" || c.folderName === cacheFilter);
    };

    const getSortedCaches = () => {
        return [...getFilteredCaches()].sort((a, b) => {
            if (cacheSort === "sizeDesc") return b.totalSizeBytes - a.totalSizeBytes;
            if (cacheSort === "sizeAsc") return a.totalSizeBytes - b.totalSizeBytes;
            if (cacheSort === "name") return a.folderName.localeCompare(b.folderName);
            if (cacheSort === "fileCount") return b.fileCount - a.fileCount;
            return 0;
        });
    };

    // Active tasks selection
    const toggleTaskSelection = (id) => {
        setSelectedTasks(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    const handleBulkCancel = async () => {
        if (selectedTasks.length === 0) {
            alert("No tasks selected.");
            return;
        }
        await cancelTasksBulk(selectedTasks);
        setSelectedTasks([]);
        setTimeout(fetchActiveList, 1000);
    };

    // Sorting and filtering active tasks
    const getFilteredTasks = () => {
        return activeList.filter(t => taskFilter === "ALL" || t.taskType === taskFilter || t.status === taskFilter);
    };

    const getSortedTasks = () => {
        return [...getFilteredTasks()].sort((a, b) => {
            if (taskSort === "timeDesc") return new Date(b.createdAt) - new Date(a.createdAt);
            if (taskSort === "timeAsc") return new Date(a.createdAt) - new Date(b.createdAt);
            if (taskSort === "type") return a.taskType.localeCompare(b.taskType);
            return 0;
        });
    };

    return (
        <div className="max-w-4xl mx-auto mt-6 space-y-6">
            <h2 className="text-3xl font-extrabold text-gray-800">System Management Settings</h2>

            {/* Cache Management Panel */}
            <div className="bg-white p-6 rounded-2xl shadow border border-gray-150">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Storage & Cache Pruning</h3>
                <p className="text-xs text-gray-500 mb-4">Prune generated logs and decrypted file dumps. Cleanup actions only apply to completed runs.</p>

                <div className="flex gap-4 mb-4 text-xs font-semibold text-gray-600">
                    <select 
                        onChange={(e) => setCacheFilter(e.target.value)} 
                        value={cacheFilter}
                        className="border border-gray-200 rounded-lg p-2"
                    >
                        <option value="ALL">All Categories</option>
                        <option value="reports">Task Reports</option>
                        <option value="temp">Temporary Decryptions</option>
                        <option value="logs">Diagnostic Logs</option>
                    </select>

                    <select 
                        onChange={(e) => setCacheSort(e.target.value)} 
                        value={cacheSort}
                        className="border border-gray-200 rounded-lg p-2"
                    >
                        <option value="sizeDesc">Size: Large to Small</option>
                        <option value="sizeAsc">Size: Small to Large</option>
                        <option value="name">Folder Name</option>
                        <option value="fileCount">File Count</option>
                    </select>
                </div>

                {cacheLoading ? (
                    <p className="text-sm text-gray-500">Scanning AppData sizes...</p>
                ) : (
                    <div className="space-y-3">
                        {getSortedCaches().map(c => (
                            <div key={c.folderName} className="flex justify-between items-center border border-gray-100 p-4 rounded-xl bg-gray-50">
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">Category: {c.folderName.toUpperCase()}/</p>
                                    <p className="text-xs text-gray-500">{c.absolutePath}</p>
                                    <p className="text-xs text-gray-600 font-medium mt-1">
                                        {c.fileCount} files • {(c.totalSizeBytes / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                                <button 
                                    onClick={() => handleCleanCache(c.folderName)}
                                    className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors duration-200"
                                >
                                    Clean Folder
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Active & Pending Task Manager */}
            <div className="bg-white p-6 rounded-2xl shadow border border-gray-150">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Active Task Control Center</h3>
                <p className="text-xs text-gray-500 mb-4">View execution queue stats and select tasks to force-shutdown / abort immediately.</p>

                <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-4 text-xs font-semibold text-gray-600">
                        <select 
                            onChange={(e) => setTaskFilter(e.target.value)} 
                            value={taskFilter}
                            className="border border-gray-200 rounded-lg p-2"
                        >
                            <option value="ALL">All Active</option>
                            <option value="RUNNING">Running</option>
                            <option value="QUEUED">Queued</option>
                            <option value="BACKUP">Backup</option>
                            <option value="DUPLICATE_SCAN">Duplicate Check</option>
                            <option value="ORGANIZE">Organizer</option>
                        </select>

                        <select 
                            onChange={(e) => setTaskSort(e.target.value)} 
                            value={taskSort}
                            className="border border-gray-200 rounded-lg p-2"
                        >
                            <option value="timeDesc">Duration: New to Old</option>
                            <option value="timeAsc">Duration: Old to New</option>
                            <option value="type">Operation Type</option>
                        </select>
                    </div>

                    {selectedTasks.length > 0 && (
                        <button 
                            onClick={handleBulkCancel}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors duration-200"
                        >
                            Force Cancel Selected ({selectedTasks.length})
                        </button>
                    )}
                </div>

                <div className="space-y-3">
                    {getSortedTasks().map(task => (
                        <div key={task.id} className="flex justify-between items-center border border-gray-100 p-4 rounded-xl bg-gray-50">
                            <div className="flex items-center gap-3">
                                <input 
                                    type="checkbox"
                                    checked={selectedTasks.includes(task.id)}
                                    onChange={() => toggleTaskSelection(task.id)}
                                    className="rounded border-gray-300 text-red-600 focus:ring-red-500 h-4 w-4"
                                />
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">{task.taskType}</p>
                                    <p className="text-xs text-gray-500 font-mono">{task.id}</p>
                                    <p className="text-xs text-gray-600 mt-1 font-medium">
                                        Status: <span className="text-blue-600 font-bold">{task.status}</span> • Started: {new Date(task.createdAt).toLocaleTimeString()}
                                    </p>
                                    <p className="text-xs text-gray-500 italic mt-0.5">{task.summary}</p>
                                </div>
                            </div>
                            <span className="text-xs bg-amber-100 text-amber-900 px-3 py-1 rounded-full font-semibold">
                                Live Active
                            </span>
                        </div>
                    ))}

                    {activeList.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-6 border border-dashed rounded-xl">No active or queued tasks on the system.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
