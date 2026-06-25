import axios from "axios";
import React, { useState, useEffect } from "react";
import { useTasks } from "../services/TaskContext";
import { Card, Input, Button, Select, Checkbox, Space, Badge, Alert, Spin, Typography } from "../components/common";
import { 
    FolderOpenOutlined, 
    FolderMagnifyingGlassIcon,
    CopyOutlined,
    SearchOutlined,
    ClockCircleOutlined,
    DeleteOutlined,
    CheckSquareOutlined,
    ExperimentOutlined,
    FilterOutlined,
    FileTextOutlined,
    HistoryOutlined
} from "@ant-design/icons";

const { Text } = Typography;

const Duplicates = () => {
    const { activeTasks, addToast, selectFolder, syncActiveTasks } = useTasks();
    const [folderPath, setFolderPath] = useState("");
    const [scanTaskId, setScanTaskId] = useState(null);
    const [duplicates, setDuplicates] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [status, setStatus] = useState("");
    const [dupSearch, setDupSearch] = useState("");
    const [dupSort, setDupSort] = useState("countDesc");
    const [skipFolder, setSkipFolder] = useState("");
    const [targetFolder, setTargetFolder] = useState("");
    const [dryRun, setDryRun] = useState(false);

    // Fetch default directory on load
    useEffect(() => {
        axios.get("http://localhost:8080/api/settings/default-path")
            .then(res => {
                if (res.data.defaultPath) {
                    setFolderPath(res.data.defaultPath);
                }
            })
            .catch(err => console.error("[Duplicates] Failed to fetch default path:", err));
    }, []);

    const autoSelectDuplicates = (strategy) => {
        if (strategy === "selectAll") {
            const confirmAll = window.confirm("WARNING: Selecting ALL copies of duplicate files will delete every single copy, leaving zero files. Are you sure you want to proceed?");
            if (!confirmAll) return;
        }

        let toSelect = [];
        duplicates.forEach(group => {
            if (group.files.length <= 1) return;

            const filterEligible = (file) => {
                const pathLower = file.path.toLowerCase();
                if (skipFolder.trim() && pathLower.includes(skipFolder.trim().toLowerCase())) {
                    return false;
                }
                if (targetFolder.trim() && !pathLower.includes(targetFolder.trim().toLowerCase())) {
                    return false;
                }
                return true;
            };

            if (strategy === "selectAll") {
                group.files.forEach(f => {
                    if (filterEligible(f)) {
                        toSelect.push(f.path);
                    }
                });
            } else if (strategy === "clearAll") {
                // Will clear everything since toSelect remains empty
            } else {
                const sorted = [...group.files].sort((a, b) => {
                    const timeA = a.modifiedAt ? new Date(a.modifiedAt).getTime() : 0;
                    const timeB = b.modifiedAt ? new Date(b.modifiedAt).getTime() : 0;
                    return timeA - timeB;
                });

                if (strategy === "keepOldest") {
                    for (let i = 1; i < sorted.length; i++) {
                        if (filterEligible(sorted[i])) {
                            toSelect.push(sorted[i].path);
                        }
                    }
                } else if (strategy === "keepLatest") {
                    for (let i = 0; i < sorted.length - 1; i++) {
                        if (filterEligible(sorted[i])) {
                            toSelect.push(sorted[i].path);
                        }
                    }
                }
            }
        });
        setSelectedFiles(toSelect);
    };

    const getFilteredDuplicates = () => {
        return duplicates.filter(group => {
            if (!dupSearch.trim()) return true;
            return group.files.some(file => file.path.toLowerCase().includes(dupSearch.toLowerCase())) || 
                   group.hash.toLowerCase().includes(dupSearch.toLowerCase());
        });
    };

    const getSortedDuplicates = () => {
        return [...getFilteredDuplicates()].sort((a, b) => {
            if (dupSort === "countDesc") return b.files.length - a.files.length;
            if (dupSort === "countAsc") return a.files.length - b.files.length;
            if (dupSort === "hash") return a.hash.localeCompare(b.hash);
            return 0;
        });
    };

    const handleSelectFolder = async () => {
        console.log("[Duplicates] Prompting user to select target folder...");
        const selectedFolder = await selectFolder();
        if (selectedFolder) {
            console.log(`[Duplicates] Target folder selected: "${selectedFolder}"`);
            setFolderPath(selectedFolder);
        }
    };

    // Monitor scanning progress if scanTaskId is active
    useEffect(() => {
        if (!scanTaskId) return;

        const activeTask = activeTasks[scanTaskId];
        if (activeTask) {
            console.log(`[Duplicates] Scanning progress update for task ${scanTaskId}: ${activeTask.progress.toFixed(0)}%`);
            setStatus(`Scanning for duplicates... ${activeTask.progress.toFixed(0)}%`);
        } else {
            // Task has completed and was removed from activeTasks. Check results
            console.log(`[Duplicates] Duplicate scan task ${scanTaskId} completed. Fetching results...`);
            setStatus("Scan completed! Fetching results...");
            axios.get(`http://localhost:8080/api/tasks/${scanTaskId}/results`)
                .then(res => {
                    console.info(`[Duplicates] Successfully fetched ${res.data.length} duplicate groups for scan task ${scanTaskId}`);
                    setDuplicates(res.data);
                    setStatus("");
                    setScanTaskId(null);
                })
                .catch(err => {
                    console.error(`[Duplicates] Failed to fetch scan results for task ID ${scanTaskId}`, err);
                    setStatus("Failed to fetch results.");
                    setScanTaskId(null);
                });
        }
    }, [activeTasks, scanTaskId]);

    const findDuplicates = async () => {
        console.log(`[Duplicates] Requesting duplicates scan in path: "${folderPath}"`);
        if (!folderPath) {
            console.warn("[Duplicates] Missing target folder path for scan operation.");
            alert("Please select a folder first.");
            return;
        }

        setStatus("Initializing scanning task...");
        setDuplicates([]);
        try {
            const response = await axios.post("http://localhost:8080/api/duplicates/find", { folderPath });
            console.info(`[Duplicates] Duplicate scan task successfully triggered. Server Task ID: ${response.data}`);
            setScanTaskId(response.data);
            addToast("Duplicate scan triggered! Task ID: " + response.data, "info");
            syncActiveTasks();
        } catch (e) {
            console.error("[Duplicates] Failed to trigger duplicate scan task.", e);
            setStatus("Failed to trigger scan.");
        }
    };

    const toggleSelection = (filePath) => {
        console.log(`[Duplicates] Toggling file selection: "${filePath}"`);
        setSelectedFiles(prev => {
            const isSelected = prev.includes(filePath);
            const nextSelection = isSelected ? prev.filter(f => f !== filePath) : [...prev, filePath];
            console.log(`[Duplicates] Active selection count: ${nextSelection.length}`);
            return nextSelection;
        });
    };

    const removeSelected = async () => {
        console.log(`[Duplicates] Preparing duplicate deletion task for files:`, selectedFiles, `Dry Run: ${dryRun}`);
        if (selectedFiles.length === 0) {
            console.warn("[Duplicates] Deletion request rejected because no files are selected.");
            alert("No files selected for deletion.");
            return;
        }

        setStatus(dryRun ? "Simulating duplicate removal..." : "Removing duplicates...");
        try {
            const response = await axios.post("http://localhost:8080/api/duplicates/remove", { filesToDelete: selectedFiles, dryRun });
            console.info(`[Duplicates] Duplicate removal task triggered successfully. Server Task ID: ${response.data}`);
            addToast((dryRun ? "Dry run simulation triggered! " : "Duplicate removal task triggered! ") + "Task ID: " + response.data, "info");
            syncActiveTasks();
            
            // Clean up state locally
            if (!dryRun) {
                setDuplicates(duplicates.map(d => ({ ...d, files: d.files.filter(f => !selectedFiles.includes(f.path)) })));
            }
            setSelectedFiles([]);
            setStatus("");
        } catch (e) {
            console.error("[Duplicates] Failed to run duplicate removal task.", e);
            addToast(dryRun ? "Failed to run dry run simulation." : "Failed to remove duplicates.", "error");
            setStatus("");
        }
    };

    return (
        <div className="space-y-4 max-w-5xl mx-auto">
            <Card 
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md rounded-2xl"
                title={
                    <div className="flex items-center gap-2 py-1">
                        <CopyOutlined className="text-blue-600 text-lg" />
                        <div>
                            <span className="text-sm font-black text-slate-800 dark:text-slate-100 block leading-tight">Duplicate Cleaner</span>
                            <span className="text-[10px] text-slate-450 dark:text-slate-400 font-semibold block mt-0.5">Locate byte-identical duplicate files using MD5 hashes and safely remove them</span>
                        </div>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                            <FilterOutlined style={{ color: '#2563eb' }} />
                            Target Directory
                        </span>
                        <div className="flex gap-2">
                            <Input 
                                value={folderPath} 
                                readOnly
                                placeholder="No directory selected"
                                className="bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 flex-grow font-mono font-bold text-slate-700 dark:text-slate-200"
                            />
                            <Button 
                                onClick={handleSelectFolder} 
                                icon={<FolderOpenOutlined />}
                                className="h-full border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                            >
                                Select Folder
                            </Button>
                        </div>
                    </div>

                    <Button 
                        type="primary"
                        onClick={findDuplicates} 
                        icon={<CopyOutlined />}
                        className="w-full bg-blue-600 hover:bg-blue-750 text-white font-semibold text-xs py-5 rounded-xl shadow-md flex items-center justify-center gap-2 border-0 active:scale-[0.98]"
                    >
                        Scan for Duplicates
                    </Button>
                </div>
            </Card>

            {status && (
                <Alert 
                    message={
                        <span className="flex items-center gap-2 font-bold text-xs text-blue-700 dark:text-blue-300">
                            <Spin size="small" />
                            {status}
                        </span>
                    } 
                    type="info" 
                    className="rounded-xl border border-blue-100 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900/50"
                />
            )}

            {duplicates.length > 0 && (
                <Card 
                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md rounded-2xl text-left"
                    title={
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1">
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm font-black text-slate-800 dark:text-slate-100 block">Duplicate Sets Found</span>
                                <Badge count={duplicates.length} style={{ backgroundColor: '#64748b' }} size="small" />
                            </div>
                            
                            <div className="flex flex-wrap gap-2 text-[10px] font-semibold items-center">
                                <Input 
                                    prefix={<SearchOutlined />}
                                    value={dupSearch}
                                    onChange={(e) => setDupSearch(e.target.value)}
                                    placeholder="Search path/hash..."
                                    className="rounded-lg p-1 text-[10px] w-40 h-7"
                                />
                                <Select 
                                    onChange={(val) => setDupSort(val)}
                                    value={dupSort}
                                    className="h-7 w-36 text-[10px]"
                                    options={[
                                        { value: 'countDesc', label: 'Files: High to Low' },
                                        { value: 'countAsc', label: 'Files: Low to High' },
                                        { value: 'hash', label: 'Hash Alphabetical' },
                                    ]}
                                />
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        {/* Auto-Select and Folder Pattern Controls */}
                        <div className="p-4 bg-slate-50/50 dark:bg-slate-850/30 rounded-xl border border-slate-150 dark:border-slate-800/80 space-y-3">
                            <div className="flex flex-col md:flex-row md:items-center gap-3">
                                <div className="flex-grow flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider block shrink-0 w-24">Skip Folder:</span>
                                    <Input 
                                        value={skipFolder}
                                        onChange={(e) => setSkipFolder(e.target.value)}
                                        placeholder="e.g. KeepThisFolder"
                                        className="h-8 text-xs rounded-lg"
                                    />
                                </div>
                                <div className="flex-grow flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-450 dark:text-slate-505 uppercase tracking-wider block shrink-0 w-24">Target Only:</span>
                                    <Input 
                                        value={targetFolder}
                                        onChange={(e) => setTargetFolder(e.target.value)}
                                        placeholder="e.g. DeleteThisFolder"
                                        className="h-8 text-xs rounded-lg"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800">
                                <Space size={8} className="flex-wrap">
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mr-1 block">Selection Helper:</span>
                                    <Button 
                                        size="small"
                                        onClick={() => autoSelectDuplicates("keepOldest")}
                                        icon={<HistoryOutlined />}
                                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
                                    >
                                        Keep Oldest
                                    </Button>
                                    <Button 
                                        size="small"
                                        onClick={() => autoSelectDuplicates("keepLatest")}
                                        icon={<ClockCircleOutlined />}
                                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
                                    >
                                        Keep Latest
                                    </Button>
                                    <Button 
                                        size="small"
                                        onClick={() => autoSelectDuplicates("selectAll")}
                                        icon={<CheckSquareOutlined />}
                                        danger
                                        className="text-[11px] font-bold rounded-lg shadow-sm"
                                    >
                                        Select All
                                    </Button>
                                    <Button 
                                        size="small"
                                        onClick={() => autoSelectDuplicates("clearAll")}
                                        className="text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
                                    >
                                        Clear Selection
                                    </Button>
                                </Space>

                                <div className="flex flex-wrap items-center gap-4 ml-auto">
                                    <Checkbox 
                                        id="duplicateDryRun"
                                        checked={dryRun} 
                                        onChange={(e) => setDryRun(e.target.checked)} 
                                        className="text-xs text-slate-600 dark:text-slate-400 font-semibold flex items-center cursor-pointer"
                                    >
                                        <span className="flex items-center gap-1">
                                            <ExperimentOutlined style={{ color: '#f59e0b', fontSize: '13px' }} />
                                            Dry Run
                                        </span>
                                    </Checkbox>
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                        <Badge count={selectedFiles.length} showZero style={{ backgroundColor: '#ef4444' }} /> Selected
                                    </span>
                                    <Button 
                                        type="primary"
                                        danger
                                        onClick={removeSelected} 
                                        icon={<DeleteOutlined />}
                                        className="rounded-xl text-xs font-bold px-4 h-8 flex items-center gap-1.5 shadow-sm"
                                    >
                                        Remove Selected
                                    </Button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                            {getSortedDuplicates().length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-6">No duplicate sets match your search filter.</p>
                            ) : getSortedDuplicates().map((dup, index) => (
                                <div key={index} className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/40">
                                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-450 mb-2 truncate flex items-center gap-1.5">
                                        <Text code className="text-[9px] uppercase px-1 rounded bg-slate-200 dark:bg-slate-800 border-0 text-slate-600 dark:text-slate-400 font-black">MD5</Text>
                                        {dup.hash}
                                    </p>
                                    <div className="space-y-1.5">
                                        {dup.files.map((file, i) => (
                                            <div key={i} className="flex items-center justify-between gap-4 p-2 rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Checkbox
                                                        onChange={() => toggleSelection(file.path)}
                                                        checked={selectedFiles.includes(file.path)}
                                                    />
                                                    <span className="text-xs text-slate-700 dark:text-slate-300 truncate flex items-center gap-1.5" title={file.path}>
                                                        <FileTextOutlined style={{ color: '#94a3b8' }} />
                                                        {file.path}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold shrink-0">
                                                    {file.modifiedAt ? new Date(file.modifiedAt.replace("T", " ")).toLocaleString() : "Unknown date"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default Duplicates;
