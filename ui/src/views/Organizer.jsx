import axios from "axios";
import React, { useState, useEffect } from "react";
import { useTasks } from "../services/TaskContext";
import { Card, Input, Button, Checkbox, Space, Typography } from "antd";
import { 
    FolderOpenOutlined, 
    FolderOutlined, 
    ExperimentOutlined, 
    ThunderboltOutlined,
    ExportOutlined,
    ImportOutlined
} from "@ant-design/icons";

const { Text } = Typography;

const Organizer = () => {
    const { addToast, selectFolder, syncActiveTasks } = useTasks();
    const [sourceFolder, setSourceFolder] = useState("");
    const [destinationFolder, setDestinationFolder] = useState("");
    const [dryRun, setDryRun] = useState(false);

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
        <Card 
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md rounded-2xl max-w-2xl mx-auto"
            title={
                <div className="flex items-center gap-2 py-1">
                    <FolderOutlined className="text-blue-600 text-lg" />
                    <div>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-100 block leading-tight">File Organizer</span>
                        <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Automatically clean, organize, and categorize files in your directories</span>
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
                                className="bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 flex-grow font-mono font-bold text-slate-700 dark:text-slate-205"
                            />
                            <Button 
                                onClick={() => handleSelectFolder(setSourceFolder)} 
                                icon={<FolderOpenOutlined />}
                                className="h-full border-slate-200 dark:border-slate-700 hover:border-slate-305 bg-slate-50 dark:bg-slate-800 text-slate-705 dark:text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                            >
                                Select
                            </Button>
                        </div>
                    </div>

                    <div>
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-505 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                            <ExportOutlined style={{ color: '#10b981' }} />
                            Destination Directory
                        </span>
                        <div className="flex gap-2">
                            <Input 
                                value={destinationFolder} 
                                readOnly
                                placeholder="No directory selected"
                                className="bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 flex-grow font-mono font-bold text-slate-700 dark:text-slate-200"
                            />
                            <Button 
                                onClick={() => handleSelectFolder(setDestinationFolder)} 
                                icon={<FolderOpenOutlined />}
                                className="h-full border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                            >
                                Select
                            </Button>
                        </div>
                    </div>

                    <div className="pt-2">
                        <Checkbox 
                            id="organizeDryRun"
                            checked={dryRun} 
                            onChange={(e) => setDryRun(e.target.checked)} 
                            className="text-xs text-slate-655 dark:text-slate-400 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                            <span className="flex items-center gap-1">
                                <ExperimentOutlined style={{ color: '#f59e0b', fontSize: '13px' }} />
                                Dry Run Simulation (Analyze only, do not write to disk)
                            </span>
                        </Checkbox>
                    </div>
                </div>

                <div className="pt-2">
                    <Button 
                        type="primary"
                        onClick={startOrganization} 
                        icon={<ThunderboltOutlined />}
                        className="w-full bg-blue-600 hover:bg-blue-750 text-white font-semibold text-xs py-5 rounded-xl shadow-md flex items-center justify-center gap-2 border-0 active:scale-[0.98]"
                    >
                        Start File Organization
                    </Button>
                </div>
            </div>
        </Card>
    );
};

export default Organizer;
