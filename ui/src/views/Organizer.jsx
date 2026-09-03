import axios from "axios";
import React, { useState, useEffect } from "react";
import { useTasks } from "../services/TaskContext";
import { Input, Button, Checkbox, Space, Typography, Select } from "../components/common";
import { Switch, Radio } from "antd";
import { PageWrapper, PanelCard, FieldLabel } from "../components/wrappers";
import Duplicates from "./Duplicates";
import DiskAnalyzer from "../components/DiskAnalyzer";
import {
    FolderOpenOutlined,
    FolderOutlined,
    ThunderboltOutlined,
    ExportOutlined,
    ImportOutlined,
    CopyOutlined,
    PieChartOutlined,
    ExperimentOutlined
} from "@ant-design/icons";
import appConfig from "../app.config.json";
import EstimatedTimeWidget from "../components/EstimatedTimeWidget";

const { Text } = Typography;

const Organizer = () => {
    const { addToast, selectFolder, syncActiveTasks } = useTasks();
    const [sourceFolder, setSourceFolder] = useState("");
    const [destinationFolder, setDestinationFolder] = useState("");
    const [organizeInPlace, setOrganizeInPlace] = useState(false);
    const [cleanEmptyFolders, setCleanEmptyFolders] = useState(appConfig.behavior.organizerCleanEmptyFoldersDefault);

    // Feature toggles
    // Cleanses state
    const [cleanDuplicates, setCleanDuplicates] = useState(false);
    
    // Analyse state
    const [analyseStrategy, setAnalyseStrategy] = useState("");
    const analyseDiskSpace = analyseStrategy === "diskSpace";
    const analyseFileType = analyseStrategy === "fileType";
    const analyseCalendar = analyseStrategy === "calendar";
    const analysePattern = analyseStrategy === "pattern";

    // Organize state
    const [organizeStrategy, setOrganizeStrategy] = useState("fileType");
    const organizeFileType = organizeStrategy === "fileType";
    const organizeCalendar = organizeStrategy === "calendar";
    const organizePattern = organizeStrategy === "pattern";

    const showDuplicates = cleanDuplicates;
    const showAnalyzer = analyseDiskSpace || analyseFileType || analyseCalendar || analysePattern;
    const showOrganizer = organizeFileType || organizeCalendar || organizePattern || cleanEmptyFolders;
    
    const [duplicatesTask, setDuplicatesTask] = useState(null);
    const [analysisTask, setAnalysisTask] = useState(null);
    const [patternGroups, setPatternGroups] = useState([]);
    const [selectedPatternGroup, setSelectedPatternGroup] = useState("");
    const [localLayoutPattern, setLocalLayoutPattern] = useState("YYYY / MM");

    // Fetch default directory on load
    useEffect(() => {
        axios.get("http://localhost:8080/api/settings/default-path")
            .then(res => {
                if (res.data.defaultPath) {
                    setSourceFolder(res.data.defaultPath);
                }
            })
            .catch(err => console.error("[Organizer] Failed to fetch default path:", err));

        axios.get("http://localhost:8080/api/settings/disk-analyzer-config")
            .then(res => {
                if (res.data.patternGroups) {
                    setPatternGroups(res.data.patternGroups);
                    const defaultGroup = res.data.patternGroups.find(g => g.isDefault);
                    if (defaultGroup) setSelectedPatternGroup(defaultGroup.name);
                    else if (res.data.patternGroups.length > 0) setSelectedPatternGroup(res.data.patternGroups[0].name);
                }
            })
            .catch(err => console.error("[Organizer] Failed to fetch pattern groups:", err));
    }, []);

    const handleSelectFolder = async (setFolder) => {
        console.log("[Organizer] Prompting user to select folder...");
        const selectedFolder = await selectFolder();
        if (selectedFolder) {
            console.log(`[Organizer] Folder selected: "${selectedFolder}"`);
            setFolder(selectedFolder);
        }
    };

    const startSelectedOperations = async (isDryRun) => {
        if (!sourceFolder) {
            addToast("Please select a master directory first.", "warning");
            return;
        }

        const triggeredTasks = [];

        if (cleanDuplicates) {
            try {
                const res = await axios.post("http://localhost:8080/api/duplicates/find", { folderPath: sourceFolder });
                setDuplicatesTask(res.data);
                triggeredTasks.push("Duplicate Scan");
            } catch(e) { console.error(e); }
        }

        if (showAnalyzer) {
            try {
                const res = await axios.post("http://localhost:8080/api/analysis/analyze", { folderPath: sourceFolder, patternGroup: selectedPatternGroup, strategy: analyseStrategy });
                setAnalysisTask(res.data);
                triggeredTasks.push("Disk Analysis");
            } catch(e) { console.error(e); }
        }

        if (showOrganizer) {
            const actualDest = organizeInPlace ? sourceFolder : destinationFolder;
            if (!actualDest) {
                addToast("Please select a destination folder for organization.", "warning");
                return;
            }
            try {
                const res = await axios.post("http://localhost:8080/api/organize", {
                    sourceFolder,
                    destinationFolder: actualDest,
                    dryRun: isDryRun,
                    patternGroup: selectedPatternGroup,
                    layoutPatternOverride: organizeCalendar ? localLayoutPattern : null,
                    cleanEmptyFolders
                });
                triggeredTasks.push(`Organization (${isDryRun ? 'Dry Run' : 'Action'})`);
            } catch(e) { console.error(e); }
        }

        if (triggeredTasks.length > 0) {
            addToast(`Started tasks: ${triggeredTasks.join(", ")}`, "info");
            syncActiveTasks();
        } else {
            addToast("No operations selected to start.", "warning");
        }
    };

    return (
        <PageWrapper style={{ maxWidth: '64rem', margin: '0 auto' }}>
            <div className="space-y-6">
                
                {/* SOURCE DIRECTORY CARD */}
                <PanelCard>
                    <div className="flex flex-col gap-2 p-1">
                        <div className="flex items-center gap-2 mb-1">
                            <FolderOpenOutlined className="text-blue-500" />
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider m-0">Source Directory</h3>
                        </div>
                        <Space.Compact style={{ width: '100%' }}>
                            <Input
                                value={sourceFolder}
                                readOnly
                                placeholder="No directory selected"
                                style={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                                className="bg-slate-50 border-slate-200"
                            />
                            <Button
                                onClick={() => handleSelectFolder(setSourceFolder)}
                                type="default"
                                className="font-bold text-slate-700"
                            >
                                SELECT DIRECTORY
                            </Button>
                        </Space.Compact>
                    </div>
                </PanelCard>

                {/* MIDDLE SECTION: Organize & Cleanse | Analyse Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Organize & Cleanse */}
                    <PanelCard 
                        title={<span className="flex items-center gap-2 text-lg"><FolderOutlined className="text-blue-500" /> Organize & Cleanse</span>}
                    >
                        <div className="space-y-6 mt-4">
                            {/* CATEGORIZATION LOGIC */}
                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Categorization Logic</h4>
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 space-y-4">
                                    <Radio.Group value={organizeStrategy} onChange={(e) => setOrganizeStrategy(e.target.value)} className="flex flex-col gap-4 w-full">
                                        <Radio value="" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            None (Do not organize)
                                        </Radio>
                                        <Radio value="fileType" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            By file type
                                        </Radio>
                                        
                                        <div className="flex flex-col gap-2">
                                            <Radio value="calendar" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                By calendar types (Date Modified)
                                            </Radio>
                                            {organizeCalendar && (
                                                <div className="pl-6 flex items-center gap-2 text-slate-400">
                                                    <span className="text-lg">↳</span>
                                                    <Select
                                                        size="small"
                                                        value={localLayoutPattern}
                                                        onChange={setLocalLayoutPattern}
                                                        options={[
                                                            { label: "YYYY / MM", value: "YYYY / MM" },
                                                            { label: "YYYY / MM / DD", value: "YYYY / MM / DD" },
                                                            { label: "YYYY", value: "YYYY" }
                                                        ]}
                                                        style={{ width: 140 }}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <Radio value="pattern" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                By pattern match
                                            </Radio>
                                            {organizePattern && patternGroups.length > 0 && (
                                                <div className="pl-6 flex items-center gap-2 text-slate-400">
                                                    <span className="text-lg">↳</span>
                                                    <Select
                                                        size="small"
                                                        value={selectedPatternGroup}
                                                        onChange={setSelectedPatternGroup}
                                                        options={patternGroups.map(g => ({ label: g.name, value: g.name }))}
                                                        style={{ width: 140 }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </Radio.Group>
                                </div>
                            </div>

                            {/* CLEANUP ACTIONS */}
                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Cleanup Actions</h4>
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Clean duplicate files</span>
                                        <Switch checked={cleanDuplicates} onChange={setCleanDuplicates} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Remove empty folders</span>
                                        <Switch checked={cleanEmptyFolders} onChange={setCleanEmptyFolders} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </PanelCard>

                    {/* Analyse Metrics */}
                    <PanelCard 
                        title={<span className="flex items-center gap-2 text-lg"><PieChartOutlined className="text-amber-600" /> Analyse Metrics</span>}
                    >
                        <div className="space-y-6 mt-4">
                            {/* METRICS TO CALCULATE */}
                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Metrics to Calculate</h4>
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 space-y-4">
                                    <Radio.Group value={analyseStrategy} onChange={(e) => setAnalyseStrategy(e.target.value)} className="flex flex-col gap-4 w-full">
                                        <Radio value="" className="text-sm font-semibold text-slate-700 dark:text-slate-300 w-full">
                                            None (Do not analyse)
                                        </Radio>
                                        <Radio value="diskSpace" className="text-sm font-semibold text-slate-700 dark:text-slate-300 w-full">
                                            Disk space distribution
                                        </Radio>
                                        <Radio value="fileType" className="text-sm font-semibold text-slate-700 dark:text-slate-300 w-full">
                                            Distribution by file type
                                        </Radio>
                                        <Radio value="calendar" className="text-sm font-semibold text-slate-700 dark:text-slate-300 w-full">
                                            Distribution by calendar types
                                        </Radio>
                                        <div className="flex flex-col gap-2">
                                            <Radio value="pattern" className="text-sm font-semibold text-slate-700 dark:text-slate-300 w-full">
                                                Distribution by pattern
                                            </Radio>
                                            {analysePattern && patternGroups.length > 0 && (
                                                <div className="pl-6 flex items-center gap-2 text-slate-400">
                                                    <span className="text-lg">↳</span>
                                                    <Select
                                                        size="small"
                                                        value={selectedPatternGroup}
                                                        onChange={setSelectedPatternGroup}
                                                        options={patternGroups.map(g => ({ label: g.name, value: g.name }))}
                                                        style={{ width: 140 }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </Radio.Group>
                                </div>
                            </div>
                        </div>
                    </PanelCard>
                </div>

                {/* DESTINATION DIRECTORY CARD */}
                <PanelCard>
                    <div className="flex flex-col gap-2 p-1">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <ExportOutlined className="text-emerald-500" />
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider m-0">Destination Directory</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-500">Organize in-same place</span>
                                <Switch size="small" checked={organizeInPlace} onChange={setOrganizeInPlace} />
                            </div>
                        </div>
                        <Space.Compact style={{ width: '100%' }}>
                            <Input
                                value={organizeInPlace ? sourceFolder : destinationFolder}
                                readOnly
                                disabled={organizeInPlace}
                                placeholder="No directory selected"
                                style={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                                className={`bg-slate-50 border-slate-200 ${organizeInPlace ? 'opacity-50' : ''}`}
                            />
                            <Button
                                onClick={() => handleSelectFolder(setDestinationFolder)}
                                type="default"
                                disabled={organizeInPlace}
                                className="font-bold text-slate-700"
                            >
                                BROWSE
                            </Button>
                        </Space.Compact>
                    </div>
                </PanelCard>

                {/* ACTION BAR */}
                <div className="relative mt-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 rounded-2xl blur-lg transition-all duration-500"></div>
                    <div className="relative flex flex-col md:flex-row items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/50 dark:border-slate-800 p-4 rounded-2xl shadow-lg gap-4">
                        <div className="w-full md:w-1/3">
                            <EstimatedTimeWidget 
                                folderPath={sourceFolder} 
                                operationTypes={[
                                    cleanDuplicates && "DUPLICATES",
                                    showAnalyzer && "DISK_ANALYSIS",
                                    showOrganizer && "ORGANIZE"
                                ].filter(Boolean)} 
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 w-full md:w-auto">
                            <button
                                onClick={() => startSelectedOperations(true)}
                                className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow-amber-500/25 uppercase tracking-wider cursor-pointer"
                            >
                                <span className="absolute inset-0 bg-amber-100/50 dark:bg-amber-800/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></span>
                                <ExperimentOutlined className="relative text-sm group-hover:rotate-12 transition-transform duration-300" />
                                <span className="relative">Dry Run</span>
                            </button>
                            <button
                                onClick={() => startSelectedOperations(false)}
                                className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 border-0 rounded-xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow shadow-blue-500/30 hover:shadow-indigo-500/50 uppercase tracking-wider cursor-pointer"
                            >
                                <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></span>
                                <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                                <ThunderboltOutlined className="relative text-sm group-hover:scale-125 transition-transform duration-300" />
                                <span className="relative">Start Action</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-8 mt-8">
                    {showDuplicates && (
                        <Duplicates targetPath={sourceFolder} externalScanTaskId={duplicatesTask} />
                    )}
                </div>
            </div>
        </PageWrapper>
    );
};

export default Organizer;
