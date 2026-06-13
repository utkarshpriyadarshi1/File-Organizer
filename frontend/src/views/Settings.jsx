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

    // Registered versions state
    const [registeredVersions, setRegisteredVersions] = useState([]);

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

    const fetchRegisteredVersions = () => {
        console.log("[Settings] Fetching registered versions...");
        axios.get("http://localhost:8080/api/settings/versions")
            .then(res => {
                setRegisteredVersions(res.data || []);
            })
            .catch(err => {
                console.error("[Settings] Failed to fetch registered versions:", err);
            });
    };

    useEffect(() => {
        fetchCacheStats();
        fetchIgnoreRules();
        fetchDefaultPath();
        fetchRegisteredVersions();
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
            <h2 className="text-3xl font-extrabold text-gray-800">{t("settingsHeader")}</h2>

            {/* Default Scan Path Panel */}
            <div className="bg-white p-6 rounded-2xl shadow border border-gray-150 text-left">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{t("defaultScanDir")}</h3>
                <p className="text-xs text-gray-500 mb-4 font-bold">{t("defaultScanDirDesc")}</p>

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
                        {t("browse")}
                    </button>
                    <button 
                        onClick={handleSaveDefaultPath}
                        className="bg-blue-600 hover:bg-blue-700 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white text-xs font-bold px-5 py-3 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-sm"
                    >
                        <i className="fa-solid fa-floppy-disk"></i>
                        {t("saveSetting")}
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
                        onClick={() => changeLanguage("hi")}
                        className={`px-4 py-2.5 rounded-xl transition-all duration-150 text-xs font-bold border cursor-pointer ${language === "hi" ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                    >
                        {t("hindi")} (HI)
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
                <h3 className="text-xl font-bold text-gray-800 mb-2">{t("storageCachePruning")}</h3>
                <p className="text-xs text-gray-500 mb-4">{t("storageCacheDesc")}</p>

                <div className="flex gap-4 mb-4 text-xs font-semibold text-gray-600">
                    <select 
                        onChange={(e) => setCacheFilter(e.target.value)} 
                        value={cacheFilter}
                        className="border border-gray-200 rounded-lg p-2 bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="ALL">{t("allCategories")}</option>
                        <option value="reports">{t("taskReports")}</option>
                        <option value="temp">{t("tempDecryptions")}</option>
                        <option value="logs">{t("diagnosticLogs")}</option>
                    </select>

                    <select 
                        onChange={(e) => setCacheSort(e.target.value)} 
                        value={cacheSort}
                        className="border border-gray-200 rounded-lg p-2 bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="sizeDesc">{t("sizeDesc")}</option>
                        <option value="sizeAsc">{t("sizeAsc")}</option>
                        <option value="name">{t("name")}</option>
                        <option value="fileCount">{t("fileCount")}</option>
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
                                    {t("cleanFolder")}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Global Scan Exclusions Panel */}
            <div className="bg-white p-6 rounded-2xl shadow border border-gray-150">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{t("globalExclusions")}</h3>
                <p className="text-xs text-gray-500 mb-4">{t("globalExclusionsDesc")}</p>

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
                        {t("addPattern")}
                    </button>
                </form>

                {ignoreLoading ? (
                    <p className="text-sm text-gray-500">Loading exclusions...</p>
                ) : (
                    <div>
                        {ignoreRules.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-4">{t("noExclusions")}</p>
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

            {/* Registered App Versions Panel */}
            <div className="bg-white p-6 rounded-2xl shadow border border-gray-150 text-left">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{t("registeredAppVersions")}</h3>
                <p className="text-xs text-gray-500 mb-4 font-bold">{t("registeredVersionsDesc")}</p>

                <div className="space-y-2">
                    {registeredVersions.length === 0 ? (
                        <p className="text-xs text-gray-400 font-semibold">{t("noVersionsRegistered")}</p>
                    ) : (
                        registeredVersions.map(v => (
                            <div key={v.id} className="flex justify-between items-center bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 hover:bg-gray-100/30 transition-colors duration-150">
                                <span className="text-xs font-mono font-bold text-slate-800">
                                    <i className="fa-solid fa-code-commit text-blue-500 mr-2"></i>
                                    v{v.version}
                                </span>
                                <span className="text-[10px] text-gray-400 font-bold">
                                    {t("registeredAt")}: {new Date(v.registeredAt).toLocaleString()}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
