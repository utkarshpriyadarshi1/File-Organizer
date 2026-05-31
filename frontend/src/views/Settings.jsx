import React, { useEffect, useState } from "react";
import axios from "axios";
import { useTasks } from "../services/TaskContext";
import { useI18n } from "../services/I18nContext";

const Settings = () => {
    const { addToast, selectFolder } = useTasks();
    const { language, changeLanguage, t } = useI18n();
    
    // Cache management states
    const [caches, setCaches] = useState([]);
    const [cacheFilter, setCacheFilter] = useState("ALL");
    const [cacheSort, setCacheSort] = useState("sizeDesc");
    const [cacheLoading, setCacheLoading] = useState(false);

    // Ignore rules states
    const [ignoreRules, setIgnoreRules] = useState([]);
    const [newPattern, setNewPattern] = useState("");
    const [ignoreLoading, setIgnoreLoading] = useState(false);

    // Default scan path state
    const [defaultPath, setDefaultPath] = useState("");

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

    const fetchIgnoreRules = () => {
        console.log("[Settings] Fetching ignore rules...");
        setIgnoreLoading(true);
        axios.get("http://localhost:8080/api/settings/ignore-rules")
            .then(res => {
                console.info("[Settings] Successfully loaded ignore rules.", res.data);
                setIgnoreRules(res.data);
                setIgnoreLoading(false);
            })
            .catch(err => {
                console.error("[Settings] Failed to load ignore rules:", err);
                setIgnoreLoading(false);
            });
    };

    const fetchDefaultPath = () => {
        console.log("[Settings] Fetching default scan path...");
        axios.get("http://localhost:8080/api/settings/default-path")
            .then(res => {
                setDefaultPath(res.data.defaultPath || "");
            })
            .catch(err => {
                console.error("[Settings] Failed to fetch default path:", err);
            });
    };

    useEffect(() => {
        fetchCacheStats();
        fetchIgnoreRules();
        fetchDefaultPath();
    }, []);

    const handleSelectDefaultFolder = async () => {
        const selected = await selectFolder(defaultPath);
        if (selected) {
            setDefaultPath(selected);
        }
    };

    const handleSaveDefaultPath = async () => {
        try {
            await axios.post("http://localhost:8080/api/settings/default-path", { path: defaultPath });
            addToast("Default path saved successfully.", "success");
        } catch (err) {
            console.error("[Settings] Failed to save default path:", err);
            addToast("Failed to save default path setting.", "error");
        }
    };

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

    const handleAddIgnoreRule = async (e) => {
        if (e) e.preventDefault();
        const trimmed = newPattern.trim();
        if (!trimmed) return;
        
        console.log(`[Settings] Requesting to add ignore rule pattern: "${trimmed}"`);
        try {
            const res = await axios.post("http://localhost:8080/api/settings/ignore-rules", { pattern: trimmed });
            console.info("[Settings] Add ignore rule response:", res.data);
            addToast(`Added ignore rule pattern: "${trimmed}"`, "success");
            setNewPattern("");
            fetchIgnoreRules();
        } catch (err) {
            console.error(`[Settings] Failed to add ignore rule pattern: "${trimmed}"`, err);
            addToast("Failed to add ignore rule.", "error");
        }
    };

    const handleDeleteIgnoreRule = async (id, pattern) => {
        console.log(`[Settings] Requesting deletion of ignore rule ID ${id} (pattern: "${pattern}")`);
        try {
            await axios.delete(`http://localhost:8080/api/settings/ignore-rules/${id}`);
            console.info(`[Settings] Successfully deleted ignore rule ID ${id}`);
            addToast(`Removed ignore rule pattern.`, "success");
            fetchIgnoreRules();
        } catch (err) {
            console.error(`[Settings] Failed to delete ignore rule ID ${id}`, err);
            addToast("Failed to delete ignore rule.", "error");
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

            {/* Default Scan Path Panel */}
            <div className="bg-white p-6 rounded-2xl shadow border border-gray-150 text-left">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Default Scan Directory</h3>
                <p className="text-xs text-gray-500 mb-4 font-bold">Set the default folder path to automatically pre-populate directory inputs across scanning, backup, and organizer views.</p>

                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={defaultPath} 
                        onChange={(e) => setDefaultPath(e.target.value)}
                        placeholder="No default directory configured"
                        className="bg-gray-50 text-xs border border-gray-200 rounded-xl p-3 flex-grow focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono font-bold text-gray-700"
                    />
                    <button 
                        onClick={handleSelectDefaultFolder}
                        className="bg-slate-100 hover:bg-slate-150 active:scale-95 text-slate-700 text-xs font-bold px-4 py-3 rounded-xl transition-all duration-150 flex items-center gap-1.5 border border-gray-200 cursor-pointer"
                        title="Browse for folder"
                    >
                        <i className="fa-solid fa-folder-open text-blue-550"></i>
                        Browse
                    </button>
                    <button 
                        onClick={handleSaveDefaultPath}
                        className="bg-blue-600 hover:bg-blue-700 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white text-xs font-bold px-5 py-3 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-sm"
                    >
                        <i className="fa-solid fa-floppy-disk"></i>
                        Save Setting
                    </button>
                </div>
            </div>

            {/* Language Preference Panel */}
            <div className="bg-white p-6 rounded-2xl shadow border border-gray-150 text-left">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{t("languagePreference")}</h3>
                <p className="text-xs text-gray-500 mb-4 font-bold">{t("selectLanguage")}</p>

                <div className="flex gap-4">
                    <button 
                        onClick={() => changeLanguage("en")}
                        className={`px-4 py-2.5 rounded-xl transition-all duration-150 text-xs font-bold border cursor-pointer ${language === "en" ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                    >
                        {t("english")} (EN)
                    </button>
                    <button 
                        onClick={() => changeLanguage("es")}
                        className={`px-4 py-2.5 rounded-xl transition-all duration-150 text-xs font-bold border cursor-pointer ${language === "es" ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                    >
                        {t("spanish")} (ES)
                    </button>
                </div>
            </div>

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

            {/* Global Scan Exclusions Panel */}
            <div className="bg-white p-6 rounded-2xl shadow border border-gray-150">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Global Scan Exclusions</h3>
                <p className="text-xs text-gray-500 mb-4">Exclude specific files, folder names, or extension patterns globally from all scans and organizer tasks.</p>

                <form onSubmit={handleAddIgnoreRule} className="flex gap-2 mb-6">
                    <input 
                        type="text" 
                        value={newPattern} 
                        onChange={(e) => setNewPattern(e.target.value)}
                        placeholder="e.g. node_modules, .git, target, *.tmp"
                        className="bg-gray-50 text-xs border border-gray-200 rounded-xl p-3 flex-grow focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-gray-700"
                    />
                    <button 
                        type="submit" 
                        className="bg-blue-600 hover:bg-blue-700 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white text-xs font-bold px-5 py-3 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-sm"
                    >
                        <i className="fa-solid fa-plus"></i>
                        Add Pattern
                    </button>
                </form>

                {ignoreLoading ? (
                    <p className="text-sm text-gray-500">Loading exclusions...</p>
                ) : (
                    <div>
                        {ignoreRules.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-4">No active exclusions. Default rules are applied.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2.5">
                                {ignoreRules.map(rule => (
                                    <div key={rule.id} className="flex items-center gap-2 bg-slate-50 border border-gray-150 hover:bg-slate-100 rounded-xl px-3 py-1.5 transition-colors duration-150">
                                        <span className="text-xs font-mono font-semibold text-slate-700 flex items-center gap-1.5">
                                            <i className="fa-solid fa-ban text-rose-500 text-[10px]"></i>
                                            {rule.pattern}
                                        </span>
                                        <button 
                                            type="button"
                                            onClick={() => handleDeleteIgnoreRule(rule.id, rule.pattern)}
                                            className="text-gray-400 hover:text-rose-500 active:scale-90 transition-colors cursor-pointer focus:outline-none p-0.5"
                                            title="Remove pattern"
                                        >
                                            <i className="fa-solid fa-xmark text-sm"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;
