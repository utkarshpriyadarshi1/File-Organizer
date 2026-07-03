import axios from "axios";
import React, { useState, useEffect } from "react";
import { useTasks } from "../services/TaskContext";
import { Card, Input, Button, Checkbox, Space, Typography } from "../components/common";
import { PageWrapper, PanelCard, FieldLabel } from "../components/wrappers";
import {
    FolderOpenOutlined,
    FolderOutlined,
    ExperimentOutlined,
    ThunderboltOutlined,
    ExportOutlined,
    ImportOutlined
} from "@ant-design/icons";
import appConfig from "../app.config.json";

const { Text } = Typography;

const Organizer = () => {
    const { addToast, selectFolder, syncActiveTasks } = useTasks();
    const [sourceFolder, setSourceFolder] = useState("");
    const [destinationFolder, setDestinationFolder] = useState("");
    const [dryRun, setDryRun] = useState(appConfig.behavior.organizerDryRunDefault);
    const [cleanEmptyFolders, setCleanEmptyFolders] = useState(appConfig.behavior.organizerCleanEmptyFoldersDefault);

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
        console.log(`[Organizer] Preparing to trigger file organization. Source: "${sourceFolder}", Destination: "${destinationFolder}", Dry Run: ${dryRun}`);
        if (!sourceFolder || !destinationFolder) {
            console.warn("[Organizer] Missing source or destination folders for organization operation.");
            alert("Please select both source and destination folders.");
            return;
        }

        try {
            const res = await axios.post("http://localhost:8080/api/organize", {
                sourceFolder,
                destinationFolder,
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
        <PageWrapper style={{ maxWidth: '42rem' }}>
        <PanelCard
            title="File Organizer"
            subtitle="Automatically clean, organize, and categorize files in your directories"
            icon={<FolderOutlined style={{ color: '#2563eb' }} />}
        >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>

                    <div>
                        <FieldLabel icon={<ImportOutlined style={{ color: '#2563eb' }} />}>
                            Source Directory
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

                    <div>
                        <FieldLabel icon={<ExportOutlined style={{ color: '#10b981' }} />}>
                            Destination Directory
                        </FieldLabel>
                        <Space.Compact style={{ width: '100%' }}>
                            <Input
                                value={destinationFolder}
                                readOnly
                                placeholder="No directory selected"
                                style={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                            />
                            <Button
                                onClick={() => handleSelectFolder(setDestinationFolder)}
                                icon={<FolderOpenOutlined />}
                                type="default"
                            >
                                Select
                            </Button>
                        </Space.Compact>
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
        </PanelCard>
        </PageWrapper>
    );
};

export default Organizer;
