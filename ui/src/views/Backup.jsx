import axios from "axios";
import React, { useState, useEffect } from "react";
import { useTasks } from "../services/TaskContext";
import { Card, Input, Button, Space, Typography } from "../components/common";
import { PageWrapper, PanelCard, FieldLabel } from "../components/wrappers";
import { 
    FolderOpenOutlined, 
    PlayCircleOutlined, 
    SyncOutlined,
    SafetyCertificateOutlined,
    ImportOutlined,
    ExportOutlined
} from "@ant-design/icons";

const { Text } = Typography;

const Backup = () => {
    const { addToast, selectFolder, syncActiveTasks } = useTasks();
    const [sourceFolder, setSourceFolder] = useState("");
    const [backupFolder, setBackupFolder] = useState("");

    // Fetch default directory on load
    useEffect(() => {
        axios.get("http://localhost:8080/api/settings/default-path")
            .then(res => {
                if (res.data.defaultPath) {
                    setSourceFolder(res.data.defaultPath);
                }
            })
            .catch(err => console.error("[Backup] Failed to fetch default path:", err));
    }, []);

    const handleSelectFolder = async (setFolder) => {
        console.log("[Backup] Prompting user to select a folder...");
        const selectedFolder = await selectFolder();
        if (selectedFolder) {
            console.log(`[Backup] Folder selected: "${selectedFolder}"`);
            setFolder(selectedFolder);
        }
    };

    const startBackup = async () => {
        console.log(`[Backup] Preparing to start full backup. Source: "${sourceFolder}", Backup Destination: "${backupFolder}"`);
        if (!sourceFolder || !backupFolder) {
            console.warn("[Backup] Missing source or destination folders for full backup operation.");
            alert("Please select both source and backup folders.");
            return;
        }

        try {
            const res = await axios.post("http://localhost:8080/api/backup/create", {
                sourceFolder,
                backupFolder,
            });
            console.info(`[Backup] Full backup task successfully triggered. Server Task ID: ${res.data}`);
            addToast("Backup task triggered! Task ID: " + res.data, "info");
            syncActiveTasks();
        } catch (e) {
            console.error("[Backup] Failed to initiate full backup task.", e);
            addToast("Failed to initiate backup task.", "error");
        }
    };

    const updateBackup = async () => {
        console.log(`[Backup] Preparing to update backup. Source: "${sourceFolder}", Backup Destination: "${backupFolder}"`);
        if (!sourceFolder || !backupFolder) {
            console.warn("[Backup] Missing source or destination folders for backup update operation.");
            alert("Please select both source and backup folders.");
            return;
        }

        try {
            const res = await axios.post("http://localhost:8080/api/backup/update", {
                sourceFolder,
                backupFolder,
            });
            console.info(`[Backup] Backup update task successfully triggered. Server Task ID: ${res.data}`);
            addToast("Backup update task triggered! Task ID: " + res.data, "info");
            syncActiveTasks();
        } catch (e) {
            console.error("[Backup] Failed to initiate backup update task.", e);
            addToast("Failed to initiate backup update task.", "error");
        }
    };

    return (
        <PageWrapper style={{ maxWidth: '42rem' }}>
            <PanelCard 
                title="Backup & Restore"
                subtitle="Secure, update, and manage compressed backups of critical directories"
                icon={<SafetyCertificateOutlined style={{ color: '#f59e0b' }} />}
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
                        <FieldLabel icon={<ExportOutlined style={{ color: '#d97706' }} />}>
                            Backup Destination
                        </FieldLabel>
                        <Space.Compact style={{ width: '100%' }}>
                            <Input 
                                value={backupFolder} 
                                readOnly
                                placeholder="No directory selected"
                                style={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                            />
                            <Button 
                                onClick={() => handleSelectFolder(setBackupFolder)} 
                                icon={<FolderOpenOutlined />}
                                type="default"
                            >
                                Select
                            </Button>
                        </Space.Compact>
                    </div>
                </Space>

                <Space style={{ width: '100%', display: 'flex', gap: '12px' }}>
                    <Button 
                        type="primary"
                        onClick={startBackup} 
                        icon={<PlayCircleOutlined />}
                        style={{ flex: 1, height: '48px', fontWeight: 'bold' }}
                    >
                        Start Full Backup
                    </Button>
                    <Button 
                        onClick={updateBackup} 
                        icon={<SyncOutlined />}
                        style={{ flex: 1, height: '48px', fontWeight: 'bold', backgroundColor: '#f59e0b', color: '#fff', borderColor: '#f59e0b' }}
                    >
                        Update Backup
                    </Button>
                </Space>
            </Space>
            </PanelCard>
        </PageWrapper>
    );
};

export default Backup;
