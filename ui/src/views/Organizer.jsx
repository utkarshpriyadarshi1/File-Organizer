import axios from "axios";
import React, { useState, useEffect } from "react";
import { useTasks } from "../services/TaskContext";
import { Input, Button, Checkbox, Space, Typography } from "../components/common";
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
    const [analyseDiskSpace, setAnalyseDiskSpace] = useState(false);
    const [analyseFileType, setAnalyseFileType] = useState(false);
    const [analyseCalendar, setAnalyseCalendar] = useState(false);
    const [analysePattern, setAnalysePattern] = useState(false);
    const [analyseCombinations, setAnalyseCombinations] = useState(false);

    // Organize state
    const [organizeDiskSpace, setOrganizeDiskSpace] = useState(false);
    const [organizeFileType, setOrganizeFileType] = useState(true);
    const [organizeCalendar, setOrganizeCalendar] = useState(false);
    const [organizePattern, setOrganizePattern] = useState(false);
    const [organizeCombinations, setOrganizeCombinations] = useState(false);

    const showDuplicates = cleanDuplicates;
    const showAnalyzer = analyseDiskSpace || analyseFileType || analyseCalendar || analysePattern || analyseCombinations;
    const showOrganizer = organizeDiskSpace || organizeFileType || organizeCalendar || organizePattern || organizeCombinations;
    
    const [duplicatesTask, setDuplicatesTask] = useState(null);
    const [analysisTask, setAnalysisTask] = useState(null);

    // Fetch default directory on load
    useEffect(() => {
        axios.get("http://localhost:8080/api/settings/default-path")
            .then(res => {
                if (res.data.defaultPath) {
                    setSourceFolder(res.data.defaultPath);
                }
            })
            .catch(err => console.error("[Organizer] Failed to fetch default path:", err));
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
                const res = await axios.post("http://localhost:8080/api/analysis/analyze", { folderPath: sourceFolder });
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
                    dryRun: isDryRun
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
        <PageWrapper style={{ maxWidth: '60rem', margin: '0 auto' }}>
            <PanelCard>
                <div className="space-y-6">
                    <div>
                        <FieldLabel icon={<ImportOutlined style={{ color: '#2563eb' }} />}>
                            Master Source Directory
                        </FieldLabel>
                        <Space.Compact style={{ width: '100%' }}>
                            <Input
                                value={sourceFolder}
                                readOnly
                                placeholder="No directory selected"
                                style={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                            />
                            <Button
                                onClick={() => handleSelectFolder(setSourceFolder)}
                                icon={<FolderOpenOutlined />}
                                type="default"
                            >
                                Select
                            </Button>
                        </Space.Compact>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-slate-50/80 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
                        <div>
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center"><CopyOutlined className="mr-2 text-rose-500" />1. Cleanses</h3>
                            <Space direction="vertical">
                                <Checkbox checked={cleanDuplicates} onChange={(e) => setCleanDuplicates(e.target.checked)} className="text-sm font-semibold text-slate-700 dark:text-slate-300">Clean duplicate files</Checkbox>
                                <Checkbox checked={cleanEmptyFolders} onChange={(e) => setCleanEmptyFolders(e.target.checked)} className="text-sm font-semibold text-slate-700 dark:text-slate-300">Empty folders</Checkbox>
                            </Space>
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center"><PieChartOutlined className="mr-2 text-indigo-500" />2. Analyse</h3>
                            <Space direction="vertical">
                                <Checkbox checked={analyseDiskSpace} onChange={(e) => setAnalyseDiskSpace(e.target.checked)} className="text-sm font-semibold text-slate-700 dark:text-slate-300">Disk space</Checkbox>
                                <Checkbox checked={analyseFileType} onChange={(e) => setAnalyseFileType(e.target.checked)} className="text-sm font-semibold text-slate-700 dark:text-slate-300">By file type</Checkbox>
                                <Checkbox checked={analyseCalendar} onChange={(e) => setAnalyseCalendar(e.target.checked)} className="text-sm font-semibold text-slate-700 dark:text-slate-300">By calendar types</Checkbox>
                                <Checkbox checked={analysePattern} onChange={(e) => setAnalysePattern(e.target.checked)} className="text-sm font-semibold text-slate-700 dark:text-slate-300">By pattern</Checkbox>
                                <Checkbox checked={analyseCombinations} onChange={(e) => setAnalyseCombinations(e.target.checked)} className="text-sm font-semibold text-slate-700 dark:text-slate-300">Combinations</Checkbox>
                            </Space>
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center"><FolderOutlined className="mr-2 text-blue-500" />3. Organize</h3>
                            <Space direction="vertical">
                                <Checkbox checked={organizeDiskSpace} onChange={(e) => setOrganizeDiskSpace(e.target.checked)} className="text-sm font-semibold text-slate-700 dark:text-slate-300">Disk space</Checkbox>
                                <Checkbox checked={organizeFileType} onChange={(e) => setOrganizeFileType(e.target.checked)} className="text-sm font-semibold text-slate-700 dark:text-slate-300">By file type</Checkbox>
                                <Checkbox checked={organizeCalendar} onChange={(e) => setOrganizeCalendar(e.target.checked)} className="text-sm font-semibold text-slate-700 dark:text-slate-300">By calendar types</Checkbox>
                                <Checkbox checked={organizePattern} onChange={(e) => setOrganizePattern(e.target.checked)} className="text-sm font-semibold text-slate-700 dark:text-slate-300">By pattern</Checkbox>
                                <Checkbox checked={organizeCombinations} onChange={(e) => setOrganizeCombinations(e.target.checked)} className="text-sm font-semibold text-slate-700 dark:text-slate-300">Combinations</Checkbox>
                            </Space>
                        </div>
                    </div>

                    <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-6 space-y-6">
                        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                            <div>
                                <FieldLabel icon={<ExportOutlined style={{ color: '#10b981' }} />}>
                                    Destination Directory
                                </FieldLabel>
                                <Space.Compact style={{ width: '100%' }}>
                                    <Input
                                        value={organizeInPlace ? sourceFolder : destinationFolder}
                                        readOnly
                                        disabled={organizeInPlace}
                                        placeholder="No directory selected"
                                        style={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                                    />
                                    <Button
                                        onClick={() => handleSelectFolder(setDestinationFolder)}
                                        icon={<FolderOpenOutlined />}
                                        type="default"
                                        disabled={organizeInPlace}
                                    >
                                        Select
                                    </Button>
                                </Space.Compact>
                            </div>

                            <div>
                                <Checkbox
                                    id="organizeInPlace"
                                    checked={organizeInPlace}
                                    onChange={(e) => setOrganizeInPlace(e.target.checked)}
                                >
                                    <Space align="center" size="small">
                                        <FolderOpenOutlined style={{ color: '#10b981' }} />
                                        <Text strong style={{ fontSize: '12px' }}>Organize in-place (Same as source folder)</Text>
                                    </Space>
                                </Checkbox>
                            </div>
                        </Space>

                        <div className="flex gap-4 items-center">
                            <div className="flex-1">
                                <EstimatedTimeWidget 
                                    folderPath={sourceFolder} 
                                    operationTypes={[
                                        cleanDuplicates && "DUPLICATES",
                                        showAnalyzer && "DISK_ANALYSIS",
                                        showOrganizer && "ORGANIZE"
                                    ].filter(Boolean)} 
                                />
                            </div>
                            <Button
                                type="default"
                                onClick={() => startSelectedOperations(true)}
                                icon={<ExperimentOutlined />}
                                style={{ height: '58px', fontWeight: 'bold', fontSize: '15px' }}
                                className="bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-300 shadow-sm rounded-xl px-6"
                            >
                                Dry Run (Preview/Report)
                            </Button>
                            <Button
                                type="primary"
                                onClick={() => startSelectedOperations(false)}
                                icon={<ThunderboltOutlined />}
                                style={{ height: '58px', fontWeight: 'bold', fontSize: '15px' }}
                                className="bg-emerald-600 hover:bg-emerald-500 border-none shadow-lg shadow-emerald-600/30 rounded-xl px-6"
                            >
                                Start Action (With Report)
                            </Button>
                        </div>
                    </div>
                </div>
            </PanelCard>

            <div className="space-y-8 mt-8">

                {showDuplicates && (
                    <Duplicates targetPath={sourceFolder} externalScanTaskId={duplicatesTask} />
                )}

                {showAnalyzer && (
                    <DiskAnalyzer targetPath={sourceFolder} externalAnalysisTaskId={analysisTask} />
                )}
            </div>
        </PageWrapper>
    );
};

export default Organizer;
