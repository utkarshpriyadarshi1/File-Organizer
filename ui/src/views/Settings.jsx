import React, { useEffect, useState } from "react";
import axios from "axios";
import { useTasks } from "../services/TaskContext";
import { useI18n } from "../services/I18nContext";
import Logs from "./Logs";
import Help from "./Help";
import { Card, Input, Button, Tabs, Select, Tag, Popconfirm, Spin, Space, Typography, Row, Col } from "../components/common";
import {
    SlidersOutlined,
    DatabaseOutlined,
    CodeOutlined,
    FolderOpenOutlined,
    SaveOutlined,
    GlobalOutlined,
    StopOutlined,
    PlusOutlined,
    CloseOutlined,
    BranchesOutlined,
    HistoryOutlined,
    FileProtectOutlined,
    UnlockOutlined,
    FolderOutlined,
    AppstoreAddOutlined,
    GithubOutlined,
    QuestionCircleOutlined
} from "@ant-design/icons";

const { Text } = Typography;

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

    const renderGeneralPreferences = () => (
        <Space direction="vertical" size="large" style={{ display: 'flex', width: '100%' }}>
            {/* Default Scan Path Panel */}
            <Card
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md rounded-2xl text-left"
                bodyStyle={{ padding: '20px' }}
                title={
                    <div className="flex items-center gap-2">
                        <FolderOpenOutlined className="text-blue-600 text-base" />
                        <div>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-100 block leading-tight">{t("defaultScanDir")}</span>
                            <span className="text-[10px] text-slate-450 dark:text-slate-450 font-semibold block mt-0.5">{t("defaultScanDirDesc")}</span>
                        </div>
                    </div>
                }
            >
                <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                        value={defaultPath}
                        onChange={(e) => setDefaultPath(e.target.value)}
                        placeholder="No default directory configured"
                        className="bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 flex-grow font-mono font-bold text-slate-700 dark:text-slate-200"
                    />
                    <div className="flex gap-2 shrink-0">
                        <Button
                            onClick={handleSelectDefaultFolder}
                            icon={<FolderOpenOutlined />}
                            className="h-full border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                            title="Browse for folder"
                        >
                            {t("browse")}
                        </Button>
                        <Button
                            type="primary"
                            onClick={handleSaveDefaultPath}
                            icon={<SaveOutlined />}
                            className="h-full bg-blue-600 hover:bg-blue-750 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/10 border-0 active:scale-95 shrink-0"
                        >
                            {t("saveSetting")}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Language Preference Panel */}
            <Card
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md rounded-2xl text-left"
                bodyStyle={{ padding: '20px' }}
                title={
                    <div className="flex items-center gap-2">
                        <GlobalOutlined className="text-teal-600 text-base" />
                        <div>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-100 block leading-tight">{t("languagePreference")}</span>
                            <span className="text-[10px] text-slate-450 dark:text-slate-450 font-semibold block mt-0.5">{t("selectLanguage")}</span>
                        </div>
                    </div>
                }
            >
                <div className="flex flex-wrap gap-2">
                    {[
                        { code: "en", label: t("english") || "English" },
                        { code: "hi", label: t("hindi") || "Hindi" },

                    ].map(lang => (
                        <Button
                            key={lang.code}
                            onClick={() => changeLanguage(lang.code)}
                            type={language === lang.code ? "primary" : "default"}
                            className={`h-9 px-4.5 text-xs font-bold rounded-xl transition-all duration-150 active:scale-95 ${language === lang.code ? "border-0 shadow-md shadow-blue-500/10" : "bg-slate-50 dark:bg-slate-800 border-slate-205 dark:border-slate-700 text-slate-700 dark:text-slate-300"}`}
                        >
                            {lang.label} ({lang.code.toUpperCase()})
                        </Button>
                    ))}
                </div>
            </Card>

            {/* Custom Folder Layout Preference Panel */}
            <Card
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md rounded-2xl text-left"
                bodyStyle={{ padding: '20px' }}
                title={
                    <div className="flex items-center gap-2">
                        <AppstoreAddOutlined className="text-indigo-600 text-base" />
                        <div>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-100 block leading-tight">{t("customLayoutRule")}</span>
                            <span className="text-[10px] text-slate-450 dark:text-slate-455 font-semibold block mt-0.5">{t("customLayoutRuleDesc")}</span>
                        </div>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                            value={layoutPattern}
                            onChange={(e) => setLayoutPattern(e.target.value)}
                            placeholder="e.g. {fileType}/{yearMonth}"
                            className="bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 flex-grow font-mono font-bold text-slate-700 dark:text-slate-200"
                        />
                        <Button
                            type="primary"
                            onClick={() => handleSavePreferences()}
                            icon={<SaveOutlined />}
                            className="h-full bg-blue-600 hover:bg-blue-750 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/10 border-0 active:scale-95 shrink-0"
                        >
                            {t("saveSetting")}
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">{t("layoutPreset")}</span>
                        <div className="flex flex-wrap gap-2">
                            {[
                                "{fileType}/{yearMonth}",
                                "{fileType}/{year}/{month}",
                                "{extension}/{yearMonth}",
                                "{year}/{fileType}/{extension}"
                            ].map(preset => (
                                <Button
                                    key={preset}
                                    onClick={() => handleSavePreferences(preset)}
                                    className="bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 hover:border-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-bold h-7 rounded-lg text-slate-600 dark:text-slate-400 active:scale-95"
                                >
                                    {preset}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Global Exclusions Panel */}
            <Card
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md rounded-2xl text-left"
                bodyStyle={{ padding: '20px' }}
                title={
                    <div className="flex items-center gap-2">
                        <StopOutlined className="text-rose-500 text-base" />
                        <div>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-100 block leading-tight">{t("globalExclusions")}</span>
                            <span className="text-[10px] text-slate-450 dark:text-slate-450 font-semibold block mt-0.5">{t("globalExclusionsDesc")}</span>
                        </div>
                    </div>
                }
            >
                <div className="space-y-4">
                    <form onSubmit={handleAddIgnoreRule} className="flex flex-col sm:flex-row gap-2">
                        <Input
                            value={newPattern}
                            onChange={(e) => setNewPattern(e.target.value)}
                            placeholder="e.g. node_modules, .git, target, *.tmp"
                            className="bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 flex-grow font-bold text-slate-707 dark:text-slate-200"
                        />
                        <Button
                            type="submit"
                            icon={<PlusOutlined />}
                            className="h-full bg-blue-600 hover:bg-blue-750 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/10 border-0 active:scale-95 shrink-0"
                        >
                            {t("addPattern")}
                        </Button>
                    </form>

                    {ignoreLoading ? (
                        <p className="text-xs text-slate-500 font-semibold animate-pulse">Loading exclusions...</p>
                    ) : (
                        <div>
                            {ignoreRules.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-4">{t("noExclusions")}</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {ignoreRules.map(rule => (
                                        <Tag
                                            key={rule.id}
                                            closable
                                            onClose={() => handleDeleteIgnoreRule(rule.id, rule.pattern)}
                                            color="red"
                                            closeIcon={<CloseOutlined style={{ fontSize: '10px' }} />}
                                            className="flex items-center gap-1 bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 rounded-xl px-3 py-1.5 shadow-sm text-xs font-mono font-bold text-slate-700 dark:text-slate-300"
                                        >
                                            <StopOutlined style={{ marginRight: '4px', fontSize: '10px' }} className="text-rose-500" />
                                            {rule.pattern}
                                        </Tag>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>

            {/* Registered App Versions Panel */}
            <Card
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md rounded-2xl text-left"
                bodyStyle={{ padding: '20px' }}
                title={
                    <div className="flex items-center gap-2">
                        <BranchesOutlined className="text-indigo-650 text-base" />
                        <div>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-100 block leading-tight">{t("registeredAppVersions")}</span>
                            <span className="text-[10px] text-slate-450 dark:text-slate-450 font-semibold block mt-0.5">{t("registeredVersionsDesc")}</span>
                        </div>
                    </div>
                }
            >
                <div className="space-y-2">
                    {registeredVersions.length === 0 ? (
                        <p className="text-xs text-slate-400 font-bold">{t("noVersionsRegistered")}</p>
                    ) : (
                        registeredVersions.map(v => (
                            <div key={v.id} className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20 px-4.5 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-all duration-150 text-xs">
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                    <BranchesOutlined style={{ color: '#2563eb' }} className="mr-2" />
                                    v{v.version}
                                </span>
                                <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold">
                                    {t("registeredAt")}: {new Date(v.registeredAt).toLocaleString()}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </Card>
        </Space>
    );

    const renderStorageAndCache = () => (
        <Card
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md rounded-2xl text-left"
            bodyStyle={{ padding: '20px' }}
            title={
                <div className="flex items-center gap-2 py-1">
                    <DatabaseOutlined className="text-indigo-600 text-lg" />
                    <div>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-100 block leading-tight">{t("storageCachePruning")}</span>
                        <span className="text-[10px] text-slate-450 dark:text-slate-400 font-semibold block mt-0.5">{t("storageCacheDesc")}</span>
                    </div>
                </div>
            }
        >
            <Space direction="vertical" size="large" style={{ display: 'flex', width: '100%' }}>
                <div className="flex gap-3 text-xs font-bold text-slate-600">
                    <Select
                        onChange={(val) => setCacheFilter(val)}
                        value={cacheFilter}
                        className="h-9 text-xs w-44"
                        options={[
                            { value: 'ALL', label: t("allCategories") },
                            { value: 'reports', label: t("taskReports") },
                            { value: 'temp', label: t("tempDecryptions") },
                            { value: 'logs', label: t("diagnosticLogs") },
                        ]}
                    />

                    <Select
                        onChange={(val) => setCacheSort(val)}
                        value={cacheSort}
                        className="h-9 text-xs w-44"
                        options={[
                            { value: 'sizeDesc', label: t("sizeDesc") },
                            { value: 'sizeAsc', label: t("sizeAsc") },
                            { value: 'name', label: t("name") },
                            { value: 'fileCount', label: t("fileCount") },
                        ]}
                    />
                </div>

                {cacheLoading ? (
                    <div className="py-8 flex flex-col items-center justify-center space-y-3 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <Spin />
                        <p className="text-xs text-slate-550 dark:text-slate-400 font-bold">Scanning AppData storage sizes...</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {getSortedCaches().map(c => {
                            let label = c.folderName.toUpperCase();
                            let desc = "Temporary system logs, report metadata, or decryption cache dump files.";
                            let icon = <FolderOutlined style={{ color: '#94a3b8' }} />;
                            let bgIcon = "bg-slate-100 dark:bg-slate-800/40 text-slate-655";

                            if (c.folderName === "reports") {
                                label = "Completed Reports Cache";
                                desc = "Completed operations history report dumps, logs breakdown indexes.";
                                icon = <FileProtectOutlined style={{ color: '#2563eb' }} />;
                                bgIcon = "bg-blue-50 dark:bg-blue-950/20";
                            } else if (c.folderName === "temp") {
                                label = "Temp Decryption Cache";
                                desc = "Decrypted files cached during sync / copy processes. Highly recommended to prune regularly.";
                                icon = <UnlockOutlined style={{ color: '#d97706' }} />;
                                bgIcon = "bg-amber-50 dark:bg-amber-950/20";
                            } else if (c.folderName === "logs") {
                                label = "Diagnostic System Logs";
                                desc = "Application event log reports and debug trace logs stored locally.";
                                icon = <CodeOutlined style={{ color: '#6366f1' }} />;
                                bgIcon = "bg-indigo-50 dark:bg-indigo-950/20";
                            }

                            const mb = (c.totalSizeBytes / 1024 / 1024).toFixed(2);

                            return (
                                <div key={c.folderName} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl bg-slate-50/40 dark:bg-slate-950/20 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-all duration-150 hover:shadow-sm">
                                    <div className="flex items-start gap-3.5 min-w-0">
                                        <div className={`w-11 h-11 rounded-xl ${bgIcon} flex items-center justify-center text-lg shrink-0 shadow-inner`}>
                                            {icon}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-slate-800 dark:text-slate-205 m-0">{label}</p>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate mt-0.5 m-0" title={c.absolutePath}>{c.absolutePath}</p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-lg m-0">{desc}</p>
                                            <div className="flex items-center gap-3 mt-2 text-[10px] font-extrabold text-slate-550 dark:text-slate-400">
                                                <span className="bg-slate-105 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-700">{c.fileCount} files</span>
                                                <span className="bg-slate-105 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-700">{mb} MB</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Popconfirm
                                        title="Prune Cache Folder"
                                        description={`Are you sure you want to delete all files in the ${c.folderName} cache?`}
                                        onConfirm={() => handleCleanCache(c.folderName)}
                                        okText="Prune"
                                        cancelText="Cancel"
                                        okButtonProps={{ danger: true, type: 'primary' }}
                                    >
                                        <Button
                                            danger
                                            className="rounded-xl text-xs font-black px-4 h-9 flex items-center justify-center shadow-sm shrink-0 self-end sm:self-center"
                                        >
                                            {t("cleanFolder")}
                                        </Button>
                                    </Popconfirm>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Space>
        </Card>
    );

    const tabItems = [
        {
            key: 'general',
            label: (
                <span>
                    <SlidersOutlined />
                    {t("generalPreferences") || "General Preferences"}
                </span>
            ),
            children: renderGeneralPreferences()
        },
        {
            key: 'storage',
            label: (
                <span>
                    <DatabaseOutlined />
                    {t("storageAndCache") || "Storage & Cache"}
                </span>
            ),
            children: renderStorageAndCache()
        },
        {
            key: 'logs',
            label: (
                <span>
                    <CodeOutlined />
                    {t("systemLogs") || "System Logs"}
                </span>
            ),
            children: (
                <div>
                    <Logs />
                </div>
            )
        }
    ];

    return (
        <Space direction="vertical" size="large" style={{ display: 'flex', width: '100%', maxWidth: '56rem', margin: '0 auto', textAlign: 'left' }}>
            <Tabs
                activeKey={activeSection}
                onChange={(key) => setActiveSection(key)}
                items={tabItems}
                className="bg-transparent border-0"
            />
        </Space>
    );
};

export default Settings;
