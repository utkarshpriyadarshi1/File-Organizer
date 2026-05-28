import React, { useEffect, useState } from "react";
import axios from "axios";
import { useTasks } from "../services/TaskContext";

const Settings = () => {
    const { addToast } = useTasks();
    
    // Cache management states
    const [caches, setCaches] = useState([]);
    const [cacheFilter, setCacheFilter] = useState("ALL");
    const [cacheSort, setCacheSort] = useState("sizeDesc");
    const [cacheLoading, setCacheLoading] = useState(false);

    const fetchCacheStats = () => {
        console.log("[Settings] Fetching cache folder statistics...");
        setCacheLoading(true);
        axios.get("http://localhost:8080/api/settings/cache")
            .then(res => {
                console.info("[Settings] Successfully loaded cache stats.", res.data);
                setCaches(res.data);
                setCacheLoading(false);
            })
            .catch(err => {
                console.error("[Settings] Failed to load cache stats:", err);
                setCacheLoading(false);
            });
    };

    useEffect(() => {
        fetchCacheStats();
    }, []);

    const handleCleanCache = async (folderName) => {
        console.log(`[Settings] Requesting folder prune for: "${folderName}"`);
        try {
            const res = await axios.delete(`http://localhost:8080/api/settings/cache?folderName=${folderName}`);
            console.info(`[Settings] Folder prune response: "${res.data}"`);
            addToast(res.data, "success");
            fetchCacheStats();
        } catch (e) {
            console.error(`[Settings] Failed to clear cache folder: "${folderName}"`, e);
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
                        className="border border-gray-200 rounded-lg p-2 bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="ALL">All Categories</option>
                        <option value="reports">Task Reports</option>
                        <option value="temp">Temporary Decryptions</option>
                        <option value="logs">Diagnostic Logs</option>
                    </select>

                    <select 
                        onChange={(e) => setCacheSort(e.target.value)} 
                        value={cacheSort}
                        className="border border-gray-200 rounded-lg p-2 bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                            <div key={c.folderName} className="flex justify-between items-center border border-gray-100 p-4 rounded-xl bg-gray-50 hover:bg-gray-100/50 transition-colors duration-150">
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">Category: {c.folderName.toUpperCase()}/</p>
                                    <p className="text-xs text-gray-500">{c.absolutePath}</p>
                                    <p className="text-xs text-gray-605 font-medium mt-1">
                                        {c.fileCount} files • {(c.totalSizeBytes / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                                <button 
                                    onClick={() => handleCleanCache(c.folderName)}
                                    className="bg-red-500 hover:bg-red-600 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all duration-150 cursor-pointer shadow-sm border border-red-600"
                                >
                                    Clean Folder
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;
