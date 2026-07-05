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
    ExperimentOutlined,
    ThunderboltOutlined,
    ExportOutlined,
    ImportOutlined,
    CopyOutlined,
    PieChartOutlined
} from "@ant-design/icons";
import appConfig from "../app.config.json";
import TaskHistoryWidget from "../components/TaskHistoryWidget";
import EstimatedTimeWidget from "../components/EstimatedTimeWidget";
import { TaskType } from "../enums/SystemTypes";

const { Text } = Typography;

const Organizer = () => {
    const { addToast, selectFolder, syncActiveTasks } = useTasks();
    const [sourceFolder, setSourceFolder] = useState("");
    const [destinationFolder, setDestinationFolder] = useState("");
    const [organizeInPlace, setOrganizeInPlace] = useState(false);
    const [dryRun, setDryRun] = useState(appConfig.behavior.organizerDryRunDefault);
    const [cleanEmptyFolders, setCleanEmptyFolders] = useState(appConfig.behavior.organizerCleanEmptyFoldersDefault);

    // Feature toggles
    const [enableOrganizer, setEnableOrganizer] = useState(true);
    const [enableDuplicates, setEnableDuplicates] = useState(false);
    const [enableAnalyzer, setEnableAnalyzer] = useState(false);

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

    const startOrganization = async () => {
        const actualDest = organizeInPlace ? sourceFolder : destinationFolder;
        console.log(`[Organizer] Preparing to trigger file organization. Source: "${sourceFolder}", Destination: "${actualDest}", Dry Run: ${dryRun}`);
        if (!sourceFolder || !actualDest) {
            console.warn("[Organizer] Missing source or destination folders for organization operation.");
            alert("Please select both source and destination folders.");
            return;
        }

        try {
            const res = await axios.post("http://localhost:8080/api/organize", {
                sourceFolder,
                destinationFolder: actualDest,
                dryRun
            });
            console.info(`[Organizer] File organization task successfully triggered. Server Task ID: ${res.data}`);
            addToast((dryRun ? "Dry run simulation triggered! " : "Organization task triggered! ") + "Task ID: " + res.data, "info");
            syncActiveTasks();
        } catch (e) {
            console.error("[Organizer] Failed to initiate organization task.", e);
            addToast("Failed to initiate organization task.", "error");
        }
    };

    return (
        <PageWrapper style={{ maxWidth: '60rem', margin: '0 auto' }}>
            <PanelCard
                title="Unified Operations Hub"
                subtitle="Select a master directory and choose which tools to run on it"
                icon={<FolderOpenOutlined style={{ color: '#2563eb' }} />}
            >
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

                    <div className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-50/80 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
                        <Checkbox checked={enableOrganizer} onChange={(e) => setEnableOrganizer(e.target.checked)}>
                            <span className="font-bold text-slate-700 dark:text-slate-200"><FolderOutlined className="mr-2 text-blue-500" />File Organizer</span>
                        </Checkbox>
                        <Checkbox checked={enableDuplicates} onChange={(e) => setEnableDuplicates(e.target.checked)}>
                            <span className="font-bold text-slate-700 dark:text-slate-200"><CopyOutlined className="mr-2 text-rose-500" />Duplicate Cleaner</span>
                        </Checkbox>
                        <Checkbox checked={enableAnalyzer} onChange={(e) => setEnableAnalyzer(e.target.checked)}>
                            <span className="font-bold text-slate-700 dark:text-slate-200"><PieChartOutlined className="mr-2 text-indigo-500" />Disk Space Analyzer</span>
                        </Checkbox>
                    </div>
                </div>
            </PanelCard>

            <div className="space-y-8 mt-8">
                {enableOrganizer && (
                    <PanelCard
                        title="File Organizer"
                        subtitle="Automatically clean, organize, and categorize files in your directories"
                        icon={<FolderOutlined style={{ color: '#2563eb' }} />}
                    >
                        <Space direction="vertical" size="large" style={{ width: '100%' }}>
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

                                <div>
                                    <Checkbox
                                        id="organizeDryRun"
                                        checked={dryRun}
                                        onChange={(e) => setDryRun(e.target.checked)}
                                    >
                                        <Space align="center" size="small">
                                            <ExperimentOutlined style={{ color: '#f59e0b' }} />
                                            <Text strong style={{ fontSize: '12px' }}>Dry Run Simulation (Analyze only, do not write to disk)</Text>
                                        </Space>
                                    </Checkbox>
                                </div>
                                <div>
                                    <Checkbox
                                        id="cleanEmptyFolders"
                                        checked={cleanEmptyFolders}
                                        onChange={(e) => setCleanEmptyFolders(e.target.checked)}
                                    >
                                        <Space align="center" size="small">
                                            <FolderOutlined style={{ color: '#f59e0b' }} />
                                            <Text strong style={{ fontSize: '12px' }}>Delete Empty Folders</Text>
                                        </Space>
                                    </Checkbox>
                                </div>
                            </Space>

                            <EstimatedTimeWidget folderPath={sourceFolder} operationType="ORGANIZE" />

                            <div>
                                <Button
                                    type="primary"
                                    onClick={startOrganization}
                                    icon={<ThunderboltOutlined />}
                                    style={{ width: '100%', height: '48px', fontWeight: 'bold' }}
                                >
                                    Start File Organization
                                </Button>
                            </div>
                        </Space>
                        <div className="mt-6">
                            <TaskHistoryWidget filterTaskType={TaskType.ORGANIZE} />
                        </div>
                    </PanelCard>
                )}

                {enableDuplicates && (
                    <Duplicates targetPath={sourceFolder} />
                )}

                {enableAnalyzer && (
                    <DiskAnalyzer targetPath={sourceFolder} />
                )}
            </div>
        </PageWrapper>
    );
};

export default Organizer;
