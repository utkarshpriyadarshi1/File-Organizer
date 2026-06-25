import axios from "axios";
import React, { useState, useEffect } from "react";
import { useTasks } from "../services/TaskContext";
import { Card, Input, Button, Space, Typography } from "../components/common";
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
        <Card 
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md rounded-2xl max-w-2xl mx-auto"
            title={
                <div className="flex items-center gap-2 py-1">
                    <SafetyCertificateOutlined className="text-amber-500 text-lg" />
                    <div>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-100 block leading-tight">Backup & Restore</span>
                        <span className="text-[10px] text-slate-450 dark:text-slate-400 font-semibold block mt-0.5">Secure, update, and manage compressed backups of critical directories</span>
                    </div>
                </div>
            }
        >
            <div className="space-y-5">
                <div className="space-y-4">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                            <ImportOutlined style={{ color: '#2563eb' }} />
                            Source Directory
                        </span>
                        <div className="flex gap-2">
                            <Input 
                                value={sourceFolder} 
                                readOnly
                                placeholder="No directory selected"
                                className="bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 flex-grow font-mono font-bold text-slate-700 dark:text-slate-200"
                            />
                            <Button 
                                onClick={() => handleSelectFolder(setSourceFolder)} 
                                icon={<FolderOpenOutlined />}
                                className="h-full border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                            >
                                Select
                            </Button>
                        </div>
                    </div>

                    <div>
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-505 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                            <ExportOutlined style={{ color: '#d97706' }} />
                            Backup Destination
                        </span>
                        <div className="flex gap-2">
                            <Input 
                                value={backupFolder} 
                                readOnly
                                placeholder="No directory selected"
                                className="bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 flex-grow font-mono font-bold text-slate-700 dark:text-slate-200"
                            />
                            <Button 
                                onClick={() => handleSelectFolder(setBackupFolder)} 
                                icon={<FolderOpenOutlined />}
                                className="h-full border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                            >
                                Select
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button 
                        type="primary"
                        onClick={startBackup} 
                        icon={<PlayCircleOutlined />}
                        className="w-full bg-blue-600 hover:bg-blue-750 text-white font-semibold text-xs py-5 rounded-xl shadow-md flex items-center justify-center gap-2 border-0 active:scale-[0.98]"
                    >
                        Start Full Backup
                    </Button>
                    <Button 
                        onClick={updateBackup} 
                        icon={<SyncOutlined />}
                        className="w-full bg-amber-500 hover:bg-amber-600 hover:text-white border-0 text-white font-semibold text-xs py-5 rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                        Update Backup
                    </Button>
                </div>
            </div>
        </Card>
    );
};

export default Backup;
