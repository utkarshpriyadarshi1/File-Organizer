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
    QuestionCircleOutlined,
    LineChartOutlined,
    CopyOutlined,
    PieChartOutlined,
    EditOutlined,
    DeleteOutlined,
    CrownOutlined,
    CheckOutlined,
    PictureOutlined,
    VideoCameraOutlined,
    FileTextOutlined
} from "@ant-design/icons";
import { Modal } from "antd";

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
    const [selectedTables, setSelectedTables] = useState([]);

    // Ignore rules states
    const [ignoreRules, setIgnoreRules] = useState([]);
    const [newPattern, setNewPattern] = useState("");
    const [ignoreLoading, setIgnoreLoading] = useState(false);

    // Default scan path state
    const [defaultPath, setDefaultPath] = useState("");



    const [layoutPattern, setLayoutPattern] = useState("");
    const [preferencesLoading, setPreferencesLoading] = useState(false);

    // Performance Config state
    const [performanceConfig, setPerformanceConfig] = useState({ batchSize: 1000 });

    // Disk Analyzer Config state
    const [diskAnalyzerConfig, setDiskAnalyzerConfig] = useState({ patternGroups: [] });
    const [activeGroupIndex, setActiveGroupIndex] = useState(0);
    const [configLoading, setConfigLoading] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newGroupName, setNewGroupName] = useState("");
    const [newPatternInput, setNewPatternInput] = useState("");

    // Telemetry reporting state
    const [isReportModalVisible, setIsReportModalVisible] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);

    const handleGenerateReport = async () => {
        setReportLoading(true);
        try {
            const res = await axios.get("http://localhost:8080/api/telemetry/report");
            setReportData(res.data);
            setIsReportModalVisible(true);
        } catch (err) {
            console.error("Failed to fetch telemetry report", err);
            addToast("Failed to generate report", "error");
        } finally {
            setReportLoading(false);
        }
    };

    const handleCopyReport = () => {
        if (!reportData) return;
        const text = `### App Improvement Statistics\n\n\`\`\`json\n${JSON.stringify(reportData, null, 2)}\n\`\`\``;
        navigator.clipboard.writeText(text).then(() => {
            addToast("Report copied to clipboard", "success");
        });
    };

    const handleOpenGitHub = () => {
        const repoUrl = "https://github.com/utkarshpriyadarshi1/File-Organizer/issues/new";
        window.open(repoUrl, "_blank");
    };

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



    const fetchPerformanceConfig = () => {
        axios.get("http://localhost:8080/api/settings/performance-config")
            .then(res => {
                setPerformanceConfig(res.data);
            })
            .catch(err => {
                console.error("[Settings] Failed to load performance config:", err);
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

    const fetchDiskAnalyzerConfig = () => {
        setConfigLoading(true);
        axios.get("http://localhost:8080/api/settings/disk-analyzer-config")
            .then(res => {
                setDiskAnalyzerConfig(res.data);
                setConfigLoading(false);
            })
            .catch(err => {
                console.error("[Settings] Failed to load disk analyzer config:", err);
                setConfigLoading(false);
            });
    };

    const handleSaveDiskAnalyzerConfig = async () => {
        try {
            await axios.post("http://localhost:8080/api/settings/disk-analyzer-config", diskAnalyzerConfig);
            addToast("Disk analyzer configuration saved.", "success");
        } catch (e) {
            addToast("Failed to save disk analyzer configuration.", "error");
        }
    };

    const handleAddGroup = () => {
        if (!newGroupName.trim()) return;
        const exists = diskAnalyzerConfig.patternGroups?.some(g => g.name.toLowerCase() === newGroupName.toLowerCase());
        if (exists) {
            addToast("Group already exists", "warning");
            return;
        }
        const updated = { ...diskAnalyzerConfig };
        if (!updated.patternGroups) updated.patternGroups = [];
        updated.patternGroups.push({ name: newGroupName.trim(), isDefault: false, categories: [] });
        setDiskAnalyzerConfig(updated);
        setNewGroupName("");
        setActiveGroupIndex(updated.patternGroups.length - 1);
    };

    const handleRemoveGroup = (idx) => {
        const group = diskAnalyzerConfig.patternGroups[idx];
        if (group.isDefault) {
            addToast("Cannot delete default group", "error");
            return;
        }
        const updated = { ...diskAnalyzerConfig };
        updated.patternGroups.splice(idx, 1);
        setDiskAnalyzerConfig(updated);
        setActiveGroupIndex(0);
    };

    const handleAddCategory = () => {
        if (!newCategoryName.trim()) return;
        const updated = { ...diskAnalyzerConfig };
        const group = updated.patternGroups?.[activeGroupIndex];
        if (!group) return;
        
        const exists = group.categories?.some(c => c.name.toLowerCase() === newCategoryName.toLowerCase());
        if (exists) {
            addToast("Category already exists in this group", "warning");
            return;
        }
        if (!group.categories) group.categories = [];
        group.categories.push({ name: newCategoryName.trim(), patterns: [] });
        setDiskAnalyzerConfig(updated);
        setNewCategoryName("");
    };

    const handleRemoveCategory = (catName) => {
        const updated = { ...diskAnalyzerConfig };
        const group = updated.patternGroups?.[activeGroupIndex];
        if (!group || !group.categories) return;
        
        group.categories = group.categories.filter(c => c.name !== catName);
        setDiskAnalyzerConfig(updated);
    };

    const handleAddPattern = (catName, patternString) => {
        if (!patternString.trim()) return;
        const pattern = patternString.trim();
        const updated = { ...diskAnalyzerConfig };
        const group = updated.patternGroups?.[activeGroupIndex];
        if (!group || !group.categories) return;
        
        const cat = group.categories.find(c => c.name === catName);
        if (cat) {
            if (!cat.patterns) cat.patterns = [];
            if (!cat.patterns.includes(pattern)) {
                cat.patterns.push(pattern);
            }
        }
        setDiskAnalyzerConfig(updated);
    };

    const handleRemovePattern = (catName, pattern) => {
        const updated = { ...diskAnalyzerConfig };
        const group = updated.patternGroups?.[activeGroupIndex];
        if (!group || !group.categories) return;
        
        const cat = group.categories.find(c => c.name === catName);
        if (cat && cat.patterns) {
            cat.patterns = cat.patterns.filter(e => e !== pattern);
        }
        setDiskAnalyzerConfig(updated);
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

    const insertToken = (token) => {
        const val = layoutPattern + (layoutPattern.endsWith("/") || layoutPattern === "" ? "" : "/") + token;
        setLayoutPattern(val);
    };

    const generatePreview = (pattern) => {
        if (!pattern) return "/";
        return pattern
            .replace(/{fileType}/g, "image_jpeg")
            .replace(/{extension}/g, "jpg")
            .replace(/{category}/g, "Images")
            .replace(/{yearMonth}/g, "2026-07")
            .replace(/{year}/g, "2026")
            .replace(/{month}/g, "07")
            .replace(/{day}/g, "05")
            .replace(/{quarter}/g, "Q3")
            .replace(/{decade}/g, "2020s")
            .replace(/{alpha}/g, "H")
            .replace(/{sizeCategory}/g, "03_Medium");
    };

    useEffect(() => {
        fetchCacheStats();
        fetchIgnoreRules();
        fetchDefaultPath();
        fetchPreferences();
        fetchDiskAnalyzerConfig();
        fetchPerformanceConfig();
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

    const handleSavePerformanceConfig = async () => {
        try {
            await axios.post("http://localhost:8080/api/settings/performance-config", performanceConfig);
            addToast("Performance configuration saved.", "success");
        } catch (e) {
            addToast("Failed to save performance configuration.", "error");
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

    const handleClearDatabaseTables = async () => {
        if (selectedTables.length === 0) {
            addToast("Please select at least one table to clear.", "warning");
            return;
        }
        console.log(`[Settings] Requesting clear for tables: ${selectedTables}`);
        try {
            await axios.delete(`http://localhost:8080/api/settings/database?tables=${selectedTables.join(",")}`);
            addToast("Selected database tables cleared.", "success");
            setSelectedTables([]);
        } catch (e) {
            console.error(`[Settings] Failed to clear tables`, e);
            addToast("Failed to clear database tables.", "error");
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

                    <div className="space-y-3">
                        <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Available Tokens</span>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { token: "{alpha}", label: "Alpha (A-Z)" },
                                { token: "{sizeCategory}", label: "Size Group" },
                                { token: "{quarter}", label: "Quarter (Q1-Q4)" },
                                { token: "{decade}", label: "Decade" },
                                { token: "{yearMonth}", label: "Year-Month" },
                                { token: "{year}", label: "Year" },
                                { token: "{month}", label: "Month" },
                                { token: "{day}", label: "Day" },
                                { token: "{fileType}", label: "MIME Type" },
                                { token: "{extension}", label: "Extension" },
                                { token: "{category}", label: "Category" }
                            ].map(item => (
                                <Button
                                    key={item.token}
                                    onClick={() => insertToken(item.token)}
                                    className="bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 hover:border-indigo-300 border border-indigo-200 dark:border-indigo-700/50 text-[10px] font-mono font-bold h-7 rounded-lg text-indigo-600 dark:text-indigo-400 active:scale-95 transition-all"
                                >
                                    + {item.token}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-50/50 dark:bg-slate-950/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Live Preview (Holiday_Photo.jpg)</span>
                        <div className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all">
                            <span className="text-blue-500">Output Folder: </span>
                            {generatePreview(layoutPattern)}/Holiday_Photo.jpg
                        </div>
                    </div>
                </div>
            </Card>

            {/* Performance Config Panel */}
            <Card
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md rounded-2xl text-left"
                bodyStyle={{ padding: '20px' }}
                title={
                    <div className="flex items-center gap-2">
                        <LineChartOutlined className="text-orange-500 text-base" />
                        <div>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-100 block leading-tight">Performance Settings</span>
                            <span className="text-[10px] text-slate-450 dark:text-slate-455 font-semibold block mt-0.5">Configure backend processing parameters to optimize for your hardware</span>
                        </div>
                    </div>
                }
            >
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex-grow w-full">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Database Batch Size</label>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2">Controls how many files are processed in memory before writing to the database. Higher values use more RAM but can speed up scanning.</p>
                        <Input
                            type="number"
                            min={50}
                            max={10000}
                            value={performanceConfig.batchSize}
                            onChange={(e) => setPerformanceConfig({ ...performanceConfig, batchSize: parseInt(e.target.value) || 1000 })}
                            className="bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                        />
                    </div>
                    <Button
                        type="primary"
                        onClick={handleSavePerformanceConfig}
                        icon={<SaveOutlined />}
                        className="bg-blue-600 hover:bg-blue-750 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl border-0 shadow-md h-auto mt-4 sm:mt-0 shrink-0"
                    >
                        Save Setting
                    </Button>
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
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl bg-slate-50/40 dark:bg-slate-950/20 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-all duration-150 hover:shadow-sm">
                            <div className="flex items-start gap-3.5 min-w-0 w-full sm:w-auto">
                                <div className={`w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/20 text-purple-500 flex items-center justify-center text-lg shrink-0 shadow-inner`}>
                                    <DatabaseOutlined />
                                </div>
                                <div className="min-w-0 flex-grow">
                                    <p className="text-sm font-black text-slate-800 dark:text-slate-205 m-0">DATABASE RECORDS</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-lg m-0">Select and permanently truncate specific local database tables. This will not delete actual files on your drive.</p>
                                    <div className="mt-3">
                                        <Select
                                            mode="multiple"
                                            placeholder="Select tables to clean..."
                                            value={selectedTables}
                                            onChange={setSelectedTables}
                                            className="w-full sm:w-80 text-xs"
                                            options={[
                                                { value: 'tasks', label: 'Task History Logs' },
                                                { value: 'files', label: 'Organized Files Index' },
                                                { value: 'reversals', label: 'Operation Reversal Logs' },
                                                { value: 'audit', label: 'Audit Events' }
                                            ]}
                                        />
                                    </div>
                                </div>
                            </div>
                            <Popconfirm
                                title="Prune Selected Tables"
                                description="Are you sure you want to permanently delete records from these tables?"
                                onConfirm={handleClearDatabaseTables}
                                okText="Prune"
                                cancelText="Cancel"
                                okButtonProps={{ danger: true, type: 'primary' }}
                                disabled={selectedTables.length === 0}
                            >
                                <Button
                                    danger
                                    disabled={selectedTables.length === 0}
                                    className="rounded-xl text-xs font-black px-4 h-9 flex items-center justify-center shadow-sm shrink-0 self-end sm:self-center mt-2 sm:mt-0"
                                >
                                    Prune Selected Tables
                                </Button>
                            </Popconfirm>
                        </div>

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

    const renderDiskAnalyzerConfig = () => {
        const activeGroup = diskAnalyzerConfig.patternGroups?.[activeGroupIndex];
        return (
            <div className="space-y-6">
                {/* Top Header Card */}
                <Card
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl text-left"
                    bodyStyle={{ padding: '20px 24px' }}
                >
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center text-xl shrink-0">
                                <PieChartOutlined />
                            </div>
                            <div>
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block">Analyse & Organize Groups</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">Customize categories and file patterns for Analyse and Organize features.</span>
                            </div>
                        </div>
                        <Button
                            type="primary"
                            onClick={handleSaveDiskAnalyzerConfig}
                            icon={<SaveOutlined />}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-xl border-0 h-10 shadow-sm shadow-emerald-500/20"
                        >
                            Save Configuration
                        </Button>
                    </div>
                </Card>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Column */}
                    <div className="w-full lg:w-1/3 flex flex-col gap-4 text-left">
                        {/* Groups Card */}
                        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm" bodyStyle={{ padding: '20px' }}>
                            <div className="flex items-center gap-2 mb-4 text-slate-600 dark:text-slate-300">
                                <FolderOutlined className="text-lg" />
                                <span className="text-xs font-bold uppercase tracking-widest">Groups</span>
                            </div>
                            
                            <div className="flex gap-2 mb-6">
                                <Input
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="New Group Name"
                                    className="bg-slate-50 dark:bg-slate-800 text-sm border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-medium"
                                />
                                <Button
                                    type="primary"
                                    onClick={handleAddGroup}
                                    icon={<PlusOutlined />}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg border-0 h-auto px-4"
                                >
                                    Add
                                </Button>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                                {diskAnalyzerConfig.patternGroups?.map((group, idx) => {
                                    const isActive = idx === activeGroupIndex;
                                    return (
                                        <div 
                                            key={idx}
                                            onClick={() => setActiveGroupIndex(idx)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-colors border ${isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                        >
                                            <span className="text-sm font-bold">{group.name}</span>
                                            {!group.isDefault && (
                                                <Popconfirm
                                                    title="Delete group?"
                                                    onConfirm={(e) => { e.stopPropagation(); handleRemoveGroup(idx); }}
                                                >
                                                    <CloseOutlined className={`text-xs ${isActive ? 'text-white hover:text-red-200' : 'text-slate-400 hover:text-red-500'}`} onClick={(e) => e.stopPropagation()} />
                                                </Popconfirm>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>

                        {/* Add New Category Card */}
                        {activeGroup && (
                            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm" bodyStyle={{ padding: '20px' }}>
                                <div className="flex items-center gap-2 mb-4 text-slate-600 dark:text-slate-300">
                                    <AppstoreAddOutlined className="text-lg" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Add New Category</span>
                                </div>
                                
                                <Input
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="New Category Name (e.g. Virtual Machines)"
                                    className="bg-slate-50 dark:bg-slate-800 text-sm border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-medium mb-3 w-full"
                                />
                                <Button
                                    onClick={handleAddCategory}
                                    icon={<PlusOutlined />}
                                    className="w-full text-blue-600 border border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm font-bold rounded-lg h-10"
                                >
                                    Add Category to {activeGroup.name}
                                </Button>
                            </Card>
                        )}
                    </div>

                    {/* Right Column */}
                    <div className="w-full lg:w-2/3 flex flex-col gap-4 text-left">
                        {activeGroup && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4 flex items-center gap-3 text-blue-700 dark:text-blue-300">
                                <FolderOutlined className="text-xl" />
                                <span className="font-medium text-sm">Showing categories for: <strong>{activeGroup.name}</strong></span>
                            </div>
                        )}

                        {configLoading ? (
                            <div className="py-12 flex justify-center"><Spin size="large" /></div>
                        ) : (
                            <div className="space-y-4">
                                {activeGroup?.categories?.map((cat, idx) => {
                                    let Icon = FolderOutlined;
                                    if (cat.name.toLowerCase().includes('image') || cat.name.toLowerCase().includes('picture')) Icon = PictureOutlined;
                                    else if (cat.name.toLowerCase().includes('video') || cat.name.toLowerCase().includes('media')) Icon = VideoCameraOutlined;
                                    else if (cat.name.toLowerCase().includes('doc') || cat.name.toLowerCase().includes('text')) Icon = FileTextOutlined;

                                    return (
                                        <Card key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl overflow-hidden" bodyStyle={{ padding: '0' }}>
                                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                                <div className="flex items-center gap-3 text-slate-800 dark:text-slate-100">
                                                    <Icon className="text-xl text-slate-400 dark:text-slate-500" />
                                                    <h3 className="text-lg font-bold m-0">{cat.name}</h3>
                                                </div>
                                                <Popconfirm
                                                    title="Delete category?"
                                                    onConfirm={() => handleRemoveCategory(cat.name)}
                                                >
                                                    <Button type="text" className="text-slate-400 hover:text-red-500 p-0 w-8 h-8 flex items-center justify-center">
                                                        <DeleteOutlined className="text-lg" />
                                                    </Button>
                                                </Popconfirm>
                                            </div>
                                            
                                            <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20">
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {cat.patterns && cat.patterns.map(pattern => (
                                                        <Tag
                                                            key={pattern}
                                                            closable
                                                            onClose={() => handleRemovePattern(cat.name, pattern)}
                                                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs py-1.5 px-3 rounded-md m-0 flex items-center gap-1 shadow-sm"
                                                            closeIcon={<CloseOutlined className="text-[10px] text-slate-400 hover:text-red-500" />}
                                                        >
                                                            <span className="font-mono">{pattern}</span>
                                                        </Tag>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Input
                                                        id={`pattern-input-${activeGroup.name}-${cat.name}`}
                                                        placeholder="Add pattern (e.g. *.iso)"
                                                        className="text-sm rounded-lg max-w-[240px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                                        onPressEnter={(e) => {
                                                            handleAddPattern(cat.name, e.target.value);
                                                            e.target.value = '';
                                                        }}
                                                    />
                                                    <Button 
                                                        className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg h-[34px] px-4"
                                                        onClick={() => {
                                                            const input = document.getElementById(`pattern-input-${activeGroup.name}-${cat.name}`);
                                                            handleAddPattern(cat.name, input.value);
                                                            input.value = '';
                                                        }}
                                                    >
                                                        Add
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderUpgradeConfig = () => {
        return (
            <div className="flex flex-col items-center justify-center py-10 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mt-4">
                <div className="text-center mb-10 px-4">
                    <h2 className="text-4xl font-extrabold text-slate-800 dark:text-white mb-3 tracking-tight">Unlock the Full Potential</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl mx-auto">Organize files faster, smarter, and with complete flexibility.</p>
                </div>
                
                <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl justify-center px-6">
                    {/* Basic Plan */}
                    <Card className="flex-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm rounded-3xl relative transition-transform hover:-translate-y-1 hover:shadow-md" bodyStyle={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '40px 30px' }}>
                        <div className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Basic Edition</div>
                        <div className="text-5xl font-black text-slate-800 dark:text-white mb-3 tracking-tighter">$0<span className="text-lg font-medium text-slate-400 tracking-normal">/forever</span></div>
                        <div className="text-slate-500 dark:text-slate-400 mb-8 text-sm leading-relaxed min-h-[40px]">Essential tools to keep your files neatly organized.</div>
                        
                        <div className="space-y-4 mb-10 flex-grow">
                            <div className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300"><CheckOutlined className="text-emerald-500 text-lg mr-3" /> Basic File Sorting</div>
                            <div className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300"><CheckOutlined className="text-emerald-500 text-lg mr-3" /> Up to 5 Custom Groups</div>
                            <div className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300"><CheckOutlined className="text-emerald-500 text-lg mr-3" /> Standard Patterns</div>
                            <div className="flex items-center text-sm font-medium text-slate-400 dark:text-slate-600"><CloseOutlined className="text-slate-300 dark:text-slate-700 text-lg mr-3" /> Advanced Deep Analysis</div>
                            <div className="flex items-center text-sm font-medium text-slate-400 dark:text-slate-600"><CloseOutlined className="text-slate-300 dark:text-slate-700 text-lg mr-3" /> Automatic Background Sync</div>
                        </div>
                        
                        <Button size="large" className="w-full rounded-2xl border-2 border-blue-600 text-blue-600 font-semibold h-12" disabled>Current Plan</Button>
                    </Card>
                    
                    {/* Premium Plan */}
                    <Card className="flex-1 bg-gradient-to-b from-blue-50 to-white dark:from-slate-800 dark:to-slate-900 border-2 border-blue-500 shadow-xl shadow-blue-500/10 rounded-3xl relative overflow-visible transition-transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/20" bodyStyle={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '40px 30px' }}>
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md uppercase tracking-wider">MOST POPULAR</div>
                        <div className="text-xl font-bold text-blue-700 dark:text-blue-400 mb-2">Pro Edition</div>
                        <div className="text-5xl font-black text-slate-800 dark:text-white mb-3 tracking-tighter">$29<span className="text-lg font-medium text-slate-400 tracking-normal">/lifetime</span></div>
                        <div className="text-slate-600 dark:text-slate-400 mb-8 text-sm leading-relaxed min-h-[40px]">Advanced features for power users with massive file collections.</div>
                        
                        <div className="space-y-4 mb-10 flex-grow">
                            <div className="flex items-center text-sm font-medium text-slate-800 dark:text-slate-200"><CheckOutlined className="text-blue-600 dark:text-blue-400 text-lg mr-3" /> Unlimited Custom Groups</div>
                            <div className="flex items-center text-sm font-medium text-slate-800 dark:text-slate-200"><CheckOutlined className="text-blue-600 dark:text-blue-400 text-lg mr-3" /> Regex & Advanced Patterns</div>
                            <div className="flex items-center text-sm font-medium text-slate-800 dark:text-slate-200"><CheckOutlined className="text-blue-600 dark:text-blue-400 text-lg mr-3" /> Automatic Background Sync</div>
                            <div className="flex items-center text-sm font-medium text-slate-800 dark:text-slate-200"><CheckOutlined className="text-blue-600 dark:text-blue-400 text-lg mr-3" /> Cloud Storage Integration</div>
                            <div className="flex items-center text-sm font-medium text-slate-800 dark:text-slate-200"><CheckOutlined className="text-blue-600 dark:text-blue-400 text-lg mr-3" /> Priority Support</div>
                        </div>
                        
                        <Button type="primary" size="large" className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-0 font-bold h-12 shadow-md shadow-blue-500/30">Upgrade to Pro</Button>
                    </Card>
                </div>
            </div>
        );
    };

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
            key: 'diskanalyzer',
            label: (
                <span>
                    <PieChartOutlined />
                    Analyse & Organize
                </span>
            ),
            children: renderDiskAnalyzerConfig()
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
        },
        {
            key: 'telemetry',
            label: (
                <span>
                    <LineChartOutlined />
                    {t("dataCollection") || "Data & Reporting"}
                </span>
            ),
            children: (
                <Card
                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md rounded-2xl text-left"
                    bodyStyle={{ padding: '20px' }}
                    title={
                        <div className="flex items-center gap-2">
                            <LineChartOutlined className="text-emerald-600 text-base" />
                            <div>
                                <span className="text-xs font-black text-slate-800 dark:text-slate-100 block leading-tight">Usage Statistics & Improvement</span>
                                <span className="text-[10px] text-slate-450 dark:text-slate-450 font-semibold block mt-0.5">Generate reports to help us improve the app</span>
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                            We value your privacy. You can manually generate an anonymized usage statistics report. Review it, copy it, and share it with us on GitHub if you consent!
                        </p>
                        <Button 
                            type="primary" 
                            loading={reportLoading} 
                            onClick={handleGenerateReport}
                            className="bg-emerald-600 hover:bg-emerald-700 border-0"
                        >
                            Generate Usage Statistics Report
                        </Button>
                    </div>

                    <Modal
                        title="Usage Statistics Report"
                        visible={isReportModalVisible}
                        onCancel={() => setIsReportModalVisible(false)}
                        footer={[
                            <Button key="copy" icon={<CopyOutlined />} onClick={handleCopyReport}>
                                Copy Report
                            </Button>,
                            <Button key="github" type="primary" icon={<GithubOutlined />} onClick={handleOpenGitHub}>
                                Report on GitHub
                            </Button>
                        ]}
                    >
                        <p className="text-xs mb-2">Review the data below before sharing:</p>
                        <pre className="bg-slate-50 dark:bg-slate-800 p-4 rounded text-xs overflow-auto max-h-64">
                            {reportData ? JSON.stringify(reportData, null, 2) : "Loading..."}
                        </pre>
                    </Modal>
                </Card>
            )
        },
        {
            key: 'upgrade',
            label: (
                <span className="text-blue-600 font-semibold flex items-center">
                    <CrownOutlined className="text-lg mr-1" />
                    {t("upgradeToPro") || "Upgrade"}
                </span>
            ),
            children: renderUpgradeConfig()
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
