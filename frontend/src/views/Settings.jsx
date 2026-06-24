import React, { useEffect, useState } from "react";
import axios from "axios";
import { useTasks } from "../services/TaskContext";
import { useI18n } from "../services/I18nContext";
import Logs from "./Logs";

const Settings = ({ defaultSubTab }) => {
    const { addToast, selectFolder } = useTasks();
    const { language, changeLanguage, t } = useI18n();
    
    // Sub-tab navigation
    const [activeSection, setActiveSection] = useState("general");

    useEffect(() => {
        if (defaultSubTab) {
            setActiveSection(defaultSubTab);
        }
    }, [defaultSubTab]);

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

    // Custom folder layout rule state
    const [layoutPattern, setLayoutPattern] = useState("");
    const [preferencesLoading, setPreferencesLoading] = useState(false);

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

    const fetchPreferences = () => {
        console.log("[Settings] Fetching app preferences...");
        setPreferencesLoading(true);
        axios.get("http://localhost:8080/api/preferences")
            .then(res => {
                setLayoutPattern(res.data.folderLayoutPattern || "{fileType}/{yearMonth}");
                setPreferencesLoading(false);
            })
            .catch(err => {
                console.error("[Settings] Failed to fetch preferences:", err);
                setPreferencesLoading(false);
            });
    };

    const handleSavePreferences = async (pattern) => {
        const targetPattern = pattern || layoutPattern;
        console.log("[Settings] Requesting to save layout preferences:", targetPattern);
        try {
            await axios.post("http://localhost:8080/api/preferences", { folderLayoutPattern: targetPattern });
            addToast("Layout preferences saved successfully.", "success");
            setLayoutPattern(targetPattern);
        } catch (err) {
            console.error("[Settings] Failed to save layout preferences:", err);
            addToast("Failed to save layout preferences.", "error");
        }
    };

    useEffect(() => {
        fetchCacheStats();
        fetchIgnoreRules();
        fetchDefaultPath();
        fetchRegisteredVersions();
        fetchPreferences();
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
        <div className="max-w-4xl mx-auto mt-0 space-y-4 text-left">
            {/* Redesigned Pill-based Settings Tab Menu */}
            <div className="flex bg-slate-100/80 p-1.5 rounded-2xl gap-1.5 shadow-inner max-w-xl border border-slate-200/40">
                <button
                    onClick={() => setActiveSection("general")}
                    className={`px-4.5 py-2.5 text-xs font-black rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer active:scale-95 flex-grow justify-center ${
                        activeSection === "general"
                            ? "bg-white text-blue-600 shadow-md border-b border-slate-100"
                            : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <i className="fa-solid fa-sliders text-[13px]"></i>
                    {t("generalPreferences") || "General Preferences"}
                </button>
                <button
                    onClick={() => setActiveSection("storage")}
                    className={`px-4.5 py-2.5 text-xs font-black rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer active:scale-95 flex-grow justify-center ${
                        activeSection === "storage"
                            ? "bg-white text-blue-600 shadow-md border-b border-slate-100"
                            : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <i className="fa-solid fa-database text-[13px]"></i>
                    {t("storageAndCache") || "Storage & Cache"}
                </button>
                <button
                    onClick={() => setActiveSection("logs")}
                    className={`px-4.5 py-2.5 text-xs font-black rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer active:scale-95 flex-grow justify-center ${
                        activeSection === "logs"
                            ? "bg-white text-blue-600 shadow-md border-b border-slate-100"
                            : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <i className="fa-solid fa-terminal text-[13px]"></i>
                    {t("systemLogs") || "System Logs"}
                </button>
            </div>

            {activeSection === "general" && (
                <div className="space-y-6">
                    {/* Default Scan Path Panel */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-left space-y-4">
                        <div>
                            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                                <i className="fa-solid fa-folder-open text-blue-600"></i>
                                {t("defaultScanDir")}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">{t("defaultScanDirDesc")}</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                            <input 
                                type="text" 
                                value={defaultPath} 
                                onChange={(e) => setDefaultPath(e.target.value)}
                                placeholder="No default directory configured"
                                className="bg-slate-50 text-xs border border-slate-200 rounded-xl p-3 flex-grow focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono font-bold text-slate-700"
                            />
                            <div className="flex gap-2 shrink-0">
                                <button 
                                    onClick={handleSelectDefaultFolder}
                                    className="bg-slate-100 hover:bg-slate-250 active:scale-95 text-slate-750 text-xs font-extrabold px-4 py-3 rounded-xl transition-all duration-150 flex items-center gap-1.5 border border-slate-200 cursor-pointer shadow-sm"
                                    title="Browse for folder"
                                >
                                    <i className="fa-solid fa-search-folder text-slate-500"></i>
                                    {t("browse")}
                                </button>
                                <button 
                                    onClick={handleSaveDefaultPath}
                                    className="bg-blue-600 hover:bg-blue-750 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white text-xs font-extrabold px-5 py-3 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-md shadow-blue-500/10"
                                >
                                    <i className="fa-solid fa-floppy-disk"></i>
                                    {t("saveSetting")}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Language Preference Panel */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-left space-y-4">
                        <div>
                            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                                <i className="fa-solid fa-language text-slate-650 text-lg"></i>
                                {t("languagePreference")}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">{t("selectLanguage")}</p>
                        </div>

                        <div className="flex flex-wrap gap-2.5">
                            {[
                                { code: "en", label: t("english") || "English" },
                                { code: "hi", label: t("hindi") || "Hindi" },
                                { code: "es", label: t("spanish") || "Spanish" },
                                { code: "de", label: t("german") || "German" }
                            ].map(lang => (
                                <button 
                                    key={lang.code}
                                    onClick={() => changeLanguage(lang.code)}
                                    className={`px-4.5 py-2.5 rounded-xl transition-all duration-200 text-xs font-black border cursor-pointer active:scale-95 ${
                                        language === lang.code 
                                            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10" 
                                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                                    }`}
                                >
                                    {lang.label} ({lang.code.toUpperCase()})
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Folder Layout Preference Panel */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-left space-y-4">
                        <div>
                            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                                <i className="fa-solid fa-folder-tree text-teal-600"></i>
                                {t("customLayoutRule")}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">{t("customLayoutRuleDesc")}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input 
                                    type="text" 
                                    value={layoutPattern} 
                                    onChange={(e) => setLayoutPattern(e.target.value)}
                                    placeholder="e.g. {fileType}/{yearMonth}"
                                    className="bg-slate-50 text-xs border border-slate-200 rounded-xl p-3 flex-grow focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono font-bold text-slate-700"
                                />
                                <button 
                                    onClick={() => handleSavePreferences()}
                                    className="bg-blue-600 hover:bg-blue-750 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white text-xs font-extrabold px-5 py-3 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-md shadow-blue-500/10 shrink-0"
                                >
                                    <i className="fa-solid fa-floppy-disk"></i>
                                    {t("saveSetting")}
                                </button>
                            </div>

                            <div className="space-y-2">
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t("layoutPreset")}</span>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        "{fileType}/{yearMonth}",
                                        "{fileType}/{year}/{month}",
                                        "{extension}/{yearMonth}",
                                        "{year}/{fileType}/{extension}"
                                    ].map(preset => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => handleSavePreferences(preset)}
                                            className="bg-slate-50 hover:bg-slate-100 hover:border-slate-300 border border-slate-200 text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-slate-600 active:scale-95"
                                        >
                                            {preset}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Global Exclusions Panel */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                        <div>
                            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                                <i className="fa-solid fa-ban text-rose-500"></i>
                                {t("globalExclusions")}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">{t("globalExclusionsDesc")}</p>
                        </div>

                        <form onSubmit={handleAddIgnoreRule} className="flex flex-col sm:flex-row gap-2">
                            <input 
                                type="text" 
                                value={newPattern} 
                                onChange={(e) => setNewPattern(e.target.value)}
                                placeholder="e.g. node_modules, .git, target, *.tmp"
                                className="bg-slate-50 text-xs border border-slate-200 rounded-xl p-3 flex-grow focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-slate-700"
                            />
                            <button 
                                type="submit" 
                                className="bg-blue-600 hover:bg-blue-750 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white text-xs font-extrabold px-5 py-3 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-md shadow-blue-500/10 shrink-0"
                            >
                                <i className="fa-solid fa-plus"></i>
                                {t("addPattern")}
                            </button>
                        </form>

                        {ignoreLoading ? (
                            <p className="text-xs text-slate-500 font-semibold animate-pulse">Loading exclusions...</p>
                        ) : (
                            <div className="pt-2">
                                {ignoreRules.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-4">{t("noExclusions")}</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {ignoreRules.map(rule => (
                                            <div key={rule.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200/70 hover:bg-slate-100 rounded-xl px-3 py-1.5 transition-colors duration-150 shadow-sm">
                                                <span className="text-xs font-mono font-bold text-slate-700 flex items-center gap-1.5">
                                                    <i className="fa-solid fa-ban text-rose-500 text-[10px]"></i>
                                                    {rule.pattern}
                                                </span>
                                                <button 
                                                    type="button"
                                                    onClick={() => handleDeleteIgnoreRule(rule.id, rule.pattern)}
                                                    className="text-slate-400 hover:text-rose-500 active:scale-90 transition-colors cursor-pointer focus:outline-none p-0.5"
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
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-left space-y-4">
                        <div>
                            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                                <i className="fa-solid fa-code-branch text-indigo-600"></i>
                                {t("registeredAppVersions")}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">{t("registeredVersionsDesc")}</p>
                        </div>

                        <div className="space-y-2">
                            {registeredVersions.length === 0 ? (
                                <p className="text-xs text-slate-400 font-bold">{t("noVersionsRegistered")}</p>
                            ) : (
                                registeredVersions.map(v => (
                                    <div key={v.id} className="flex justify-between items-center bg-slate-50/50 px-4.5 py-3 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all duration-150">
                                        <span className="text-xs font-mono font-bold text-slate-800">
                                            <i className="fa-solid fa-code-commit text-blue-500 mr-2"></i>
                                            v{v.version}
                                        </span>
                                        <span className="text-[10px] text-slate-450 font-bold">
                                            {t("registeredAt")}: {new Date(v.registeredAt).toLocaleString()}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeSection === "storage" && (
                <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-100 text-left space-y-5">
                    <div>
                        <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                            <i className="fa-solid fa-floppy-disk text-indigo-600"></i>
                            {t("storageCachePruning")}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{t("storageCacheDesc")}</p>
                    </div>

                    <div className="flex gap-3 mb-2 text-xs font-bold text-slate-600">
                        <select 
                            onChange={(e) => setCacheFilter(e.target.value)} 
                            value={cacheFilter}
                            className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/10 text-xs font-extrabold text-slate-700"
                        >
                            <option value="ALL">{t("allCategories")}</option>
                            <option value="reports">{t("taskReports")}</option>
                            <option value="temp">{t("tempDecryptions")}</option>
                            <option value="logs">{t("diagnosticLogs")}</option>
                        </select>

                        <select 
                            onChange={(e) => setCacheSort(e.target.value)} 
                            value={cacheSort}
                            className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/10 text-xs font-extrabold text-slate-700"
                        >
                            <option value="sizeDesc">{t("sizeDesc")}</option>
                            <option value="sizeAsc">{t("sizeAsc")}</option>
                            <option value="name">{t("name")}</option>
                            <option value="fileCount">{t("fileCount")}</option>
                        </select>
                    </div>

                    {cacheLoading ? (
                        <div className="py-8 flex flex-col items-center justify-center space-y-2 bg-slate-50/50 rounded-2xl border border-slate-100">
                            <div className="w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
                            <p className="text-xs text-slate-550 font-bold">Scanning AppData storage sizes...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {getSortedCaches().map(c => {
                                let label = c.folderName.toUpperCase();
                                let desc = "Temporary system logs, report metadata, or decryption cache dump files.";
                                let icon = "fa-solid fa-folder text-slate-400";
                                let bgIcon = "bg-slate-100 text-slate-650";
                                
                                if (c.folderName === "reports") {
                                    label = "Completed Reports Cache";
                                    desc = "Completed operations history report dumps, logs breakdown indexes.";
                                    icon = "fa-solid fa-file-shield text-blue-500";
                                    bgIcon = "bg-blue-50";
                                } else if (c.folderName === "temp") {
                                    label = "Temp Decryption Cache";
                                    desc = "Decrypted files cached during sync / copy processes. Highly recommended to prune regularly.";
                                    icon = "fa-solid fa-unlock-keyhole text-amber-500";
                                    bgIcon = "bg-amber-50";
                                } else if (c.folderName === "logs") {
                                    label = "Diagnostic System Logs";
                                    desc = "Application event log reports and debug trace logs stored locally.";
                                    icon = "fa-solid fa-terminal text-indigo-500";
                                    bgIcon = "bg-indigo-50";
                                }

                                const mb = (c.totalSizeBytes / 1024 / 1024).toFixed(2);

                                return (
                                    <div key={c.folderName} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-slate-100 p-5 rounded-2xl bg-slate-50/40 hover:bg-slate-50 transition-all duration-150 hover:shadow-sm">
                                        <div className="flex items-start gap-3.5 min-w-0">
                                            <div className={`w-11 h-11 rounded-xl ${bgIcon} flex items-center justify-center text-lg shrink-0 shadow-inner`}>
                                                <i className={icon}></i>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-slate-800">{label}</p>
                                                <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5" title={c.absolutePath}>{c.absolutePath}</p>
                                                <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed max-w-lg">{desc}</p>
                                                <div className="flex items-center gap-3 mt-2 text-[10px] font-extrabold text-slate-500">
                                                    <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/50">{c.fileCount} files</span>
                                                    <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/50">{mb} MB</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleCleanCache(c.folderName)}
                                            className="bg-red-50 hover:bg-red-500 text-red-600 hover:text-white active:scale-95 text-xs font-black px-4 py-2.5 rounded-xl transition-all duration-150 cursor-pointer shadow-sm border border-red-200 hover:border-red-600 shrink-0 self-end sm:self-center"
                                        >
                                            {t("cleanFolder")}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {activeSection === "logs" && (
                <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-100">
                    <Logs />
                </div>
            )}
        </div>
    );
};

export default Settings;
