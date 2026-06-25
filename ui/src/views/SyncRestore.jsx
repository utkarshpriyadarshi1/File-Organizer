import axios from "axios";
import React, { useState, useEffect } from "react";
import { useTasks } from "../services/TaskContext";
import { Card, Row, Col, Input, Button, Select, List, Badge, Space, Tag, Typography } from "antd";
import { 
    FolderOpenOutlined, 
    PlayCircleOutlined, 
    SyncOutlined,
    SearchOutlined,
    ClockCircleOutlined,
    CalendarOutlined,
    CloudUploadOutlined,
    PlusOutlined,
    ImportOutlined,
    ExportOutlined,
    DeploymentUnitOutlined
} from "@ant-design/icons";

const { Text } = Typography;

const SyncRestore = () => {
    const { addToast, selectFolder, syncActiveTasks } = useTasks();

    // Sync state
    const [sourceFolder, setSourceFolder] = useState("");
    const [destinationFolder, setDestinationFolder] = useState("");
    const [syncType, setSyncType] = useState("ONE_WAY");
    const [syncJobs, setSyncJobs] = useState([]);
    const [jobsFilterType, setJobsFilterType] = useState("ALL");
    const [jobsSort, setJobsSort] = useState("name");
    const [jobsSearch, setJobsSearch] = useState("");

    // Restore state
    const [fileIdToSearch, setFileIdToSearch] = useState("");
    const [fileVersions, setFileVersions] = useState([]);
    const [selectedVersionId, setSelectedVersionId] = useState(null);
    const [targetOverridePath, setTargetOverridePath] = useState("");
    const [versionsSort, setVersionsSort] = useState("numberDesc");

    // Filter and Sort sync jobs
    const getFilteredJobs = () => {
        return syncJobs.filter(job => {
            const matchesType = jobsFilterType === "ALL" || job.syncType === jobsFilterType;
            const matchesSearch = !jobsSearch.trim() || 
                job.jobName.toLowerCase().includes(jobsSearch.toLowerCase()) ||
                job.sourcePath.toLowerCase().includes(jobsSearch.toLowerCase()) ||
                job.destinationPath.toLowerCase().includes(jobsSearch.toLowerCase());
            return matchesType && matchesSearch;
        });
    };

    const getSortedJobs = () => {
        return [...getFilteredJobs()].sort((a, b) => {
            if (jobsSort === "name") return a.jobName.localeCompare(b.jobName);
            if (jobsSort === "type") return a.syncType.localeCompare(b.syncType);
            if (jobsSort === "status") return a.status.localeCompare(b.status);
            return 0;
        });
    };

    // Sort versions
    const getSortedVersions = () => {
        return [...fileVersions].sort((a, b) => {
            if (versionsSort === "numberDesc") return b.versionNumber - a.versionNumber;
            if (versionsSort === "numberAsc") return a.versionNumber - b.versionNumber;
            if (versionsSort === "dateDesc") return new Date(b.backedUpAt) - new Date(a.backedUpAt);
            if (versionsSort === "dateAsc") return new Date(a.backedUpAt) - new Date(b.backedUpAt);
            return 0;
        });
    };

    const handleSelectFolder = async (setFolder) => {
        console.log("[SyncRestore] Prompting user to select a folder...");
        const selectedFolder = await selectFolder();
        if (selectedFolder) {
            console.log(`[SyncRestore] Folder selected: "${selectedFolder}"`);
            setFolder(selectedFolder);
        }
    };

    const fetchSyncJobs = () => {
        console.log("[SyncRestore] Fetching all registered sync jobs from server...");
        axios.get("http://localhost:8080/api/sync/jobs")
            .then(res => {
                console.info(`[SyncRestore] Loaded ${res.data.length} registered sync jobs.`);
                setSyncJobs(res.data);
            })
            .catch(err => console.error("[SyncRestore] Failed to load sync jobs:", err));
    };

    useEffect(() => {
        fetchSyncJobs();
        axios.get("http://localhost:8080/api/settings/default-path")
            .then(res => {
                if (res.data.defaultPath) {
                    setSourceFolder(res.data.defaultPath);
                }
            })
            .catch(err => console.error("[SyncRestore] Failed to fetch default path:", err));
    }, []);

    const handleCreateSyncJob = async () => {
        console.log(`[SyncRestore] Creating sync job. Source: "${sourceFolder}", Destination: "${destinationFolder}", Type: ${syncType}`);
        if (!sourceFolder || !destinationFolder) {
            console.warn("[SyncRestore] Missing source or destination folder path for sync job creation.");
            alert("Select source and destination folders first.");
            return;
        }
        try {
            await axios.post("http://localhost:8080/api/sync/create", {
                sourceFolder,
                destinationFolder,
                syncType
            });
            console.info("[SyncRestore] Sync job created successfully.");
            addToast("Synchronization job registered successfully.", "success");
            fetchSyncJobs();
            setSourceFolder("");
            setDestinationFolder("");
        } catch (e) {
            console.error("[SyncRestore] Failed to create sync job.", e);
            addToast("Failed to create sync job.", "error");
        }
    };

    const handleRunSync = async (jobId) => {
        console.log(`[SyncRestore] Triggering sync execution for job ID: ${jobId}`);
        try {
            const res = await axios.post(`http://localhost:8080/api/sync/${jobId}/run`);
            console.info(`[SyncRestore] Sync job ${jobId} triggered. Server Task ID: ${res.data}`);
            addToast("Sync task triggered! Task ID: " + res.data, "info");
            syncActiveTasks();
            fetchSyncJobs();
        } catch (e) {
            console.error(`[SyncRestore] Failed to run sync job ${jobId}`, e);
            addToast("Failed to trigger sync execution.", "error");
        }
    };

    const handleSearchVersions = async () => {
        console.log(`[SyncRestore] Searching backup versions for file DB ID: "${fileIdToSearch}"`);
        if (!fileIdToSearch.trim()) {
            console.warn("[SyncRestore] Missing file DB ID for versions search.");
            alert("Please enter a valid File ID.");
            return;
        }
        try {
            const res = await axios.get(`http://localhost:8080/api/restore/versions/${fileIdToSearch}`);
            console.info(`[SyncRestore] Discovered ${res.data.length} backup versions for file DB ID: ${fileIdToSearch}`);
            setFileVersions(res.data);
            if (res.data.length === 0) {
                addToast("No versions discovered for File ID: " + fileIdToSearch, "info");
            }
        } catch (e) {
            console.error(`[SyncRestore] Failed to load version history for file DB ID: ${fileIdToSearch}`, e);
            addToast("Failed to load version history.", "error");
        }
    };

    const handleRestoreVersion = async () => {
        console.log(`[SyncRestore] Restoring file version ID: ${selectedVersionId}. Target path override: "${targetOverridePath}"`);
        if (!selectedVersionId) {
            console.warn("[SyncRestore] Deletion/Restore rejected because no version is selected.");
            alert("Please select a file version to restore.");
            return;
        }
        try {
            const res = await axios.post(`http://localhost:8080/api/restore/${selectedVersionId}`, {
                targetPathOverride: targetOverridePath
            });
            console.info(`[SyncRestore] File restore task successfully triggered. Server Task ID: ${res.data}`);
            addToast("Restore version task triggered! Task ID: " + res.data, "info");
            syncActiveTasks();
            setSelectedVersionId(null);
            setTargetOverridePath("");
        } catch (e) {
            console.error(`[SyncRestore] Failed to restore version ID: ${selectedVersionId}`, e);
            addToast("Failed to trigger restore version.", "error");
        }
    };

    return (
        <Row gutter={[16, 16]} className="max-w-7xl mx-auto">
            {/* Folder Synchronization Panel */}
            <Col xs={24} lg={12}>
                <Card 
                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md rounded-2xl h-full flex flex-col justify-between"
                    title={
                        <div className="flex items-center gap-2 py-1">
                            <SyncOutlined className="text-blue-600 text-lg" />
                            <div>
                                <span className="text-sm font-black text-slate-800 dark:text-slate-100 block leading-tight">Sync Folders</span>
                                <span className="text-[10px] text-slate-450 dark:text-slate-400 font-semibold block mt-0.5">Keep files updated across directories (one-way or two-way mirror)</span>
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <div>
                            <span className="text-[10px] font-black text-slate-450 dark:text-slate-505 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                                <ImportOutlined style={{ color: '#2563eb' }} />
                                Source Directory
                            </span>
                            <div className="flex gap-2">
                                <Input 
                                    value={sourceFolder} 
                                    readOnly 
                                    placeholder="No source folder selected"
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
                            <span className="text-[10px] font-black text-slate-450 dark:text-slate-505 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                                <ExportOutlined style={{ color: '#10b981' }} />
                                Destination Directory
                            </span>
                            <div className="flex gap-2">
                                <Input 
                                    value={destinationFolder} 
                                    readOnly 
                                    placeholder="No destination folder selected"
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

                        <div>
                            <span className="text-[10px] font-black text-slate-450 dark:text-slate-505 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                                <DeploymentUnitOutlined style={{ color: '#6366f1' }} />
                                Sync Type
                            </span>
                            <Select 
                                onChange={(val) => setSyncType(val)} 
                                value={syncType}
                                className="w-full h-10 text-xs"
                                options={[
                                    { value: 'ONE_WAY', label: 'One-Way Mirroring' },
                                    { value: 'TWO_WAY', label: 'Two-Way Synchronization' },
                                ]}
                            />
                        </div>

                        <Button 
                            type="primary"
                            onClick={handleCreateSyncJob}
                            icon={<PlusOutlined />}
                            className="w-full bg-blue-600 hover:bg-blue-750 text-white font-semibold text-xs py-5 rounded-xl shadow-md flex items-center justify-center gap-2 border-0 active:scale-[0.98]"
                        >
                            Register Sync Job
                        </Button>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                            <span className="font-bold text-slate-800 dark:text-slate-100 text-xs block">Registered Sync Jobs</span>
                            
                            <div className="flex flex-wrap gap-2 text-[10px] font-semibold items-center">
                                <Input 
                                    prefix={<SearchOutlined />}
                                    value={jobsSearch}
                                    onChange={(e) => setJobsSearch(e.target.value)}
                                    placeholder="Search jobs..."
                                    className="rounded-lg text-[10px] w-24 sm:w-28 h-6"
                                />
                                <Select 
                                    onChange={(val) => setJobsFilterType(val)}
                                    value={jobsFilterType}
                                    className="h-6 w-20 text-[9px]"
                                    options={[
                                        { value: 'ALL', label: 'All' },
                                        { value: 'ONE_WAY', label: 'One-Way' },
                                        { value: 'TWO_WAY', label: 'Two-Way' },
                                    ]}
                                />
                                <Select 
                                    onChange={(val) => setJobsSort(val)}
                                    value={jobsSort}
                                    className="h-6 w-20 text-[9px]"
                                    options={[
                                        { value: 'name', label: 'Name' },
                                        { value: 'type', label: 'Type' },
                                        { value: 'status', label: 'Status' },
                                    ]}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {getSortedJobs().length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-6 bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">No sync jobs matching filters.</p>
                            ) : getSortedJobs().map(job => (
                                <div key={job.id} className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex justify-between items-center text-xs gap-3">
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                            <SyncOutlined style={{ color: '#2563eb' }} />
                                            {job.jobName}
                                        </p>
                                        <p className="text-slate-550 dark:text-slate-400 truncate max-w-[220px] mt-0.5" title={`${job.sourcePath} ➔ ${job.destinationPath}`}>
                                            {job.sourcePath} ➔ {job.destinationPath}
                                        </p>
                                        <p className="text-slate-500 dark:text-slate-500 mt-1 font-semibold text-[10px]">
                                            Type: {job.syncType} • Status: <span className="font-bold text-blue-600 dark:text-blue-400">{job.status}</span>
                                        </p>
                                    </div>
                                    <Button 
                                        type="primary"
                                        size="small"
                                        onClick={() => handleRunSync(job.id)}
                                        icon={<PlayCircleOutlined />}
                                        className="bg-emerald-500 hover:bg-emerald-650 border-0 text-white font-bold px-3.5 rounded-lg shadow-sm flex items-center gap-1 active:scale-95 shrink-0"
                                    >
                                        Run
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </Col>

            {/* Versioned Restore Panel */}
            <Col xs={24} lg={12}>
                <Card 
                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md rounded-2xl h-full flex flex-col justify-between"
                    title={
                        <div className="flex items-center gap-2 py-1">
                            <ClockCircleOutlined className="text-indigo-500 text-lg" />
                            <div>
                                <span className="text-sm font-black text-slate-800 dark:text-slate-100 block leading-tight">Version Restore</span>
                                <span className="text-[10px] text-slate-450 dark:text-slate-400 font-semibold block mt-0.5">Lookup file backups version history and restore to any folder location</span>
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Input 
                                value={fileIdToSearch}
                                onChange={(e) => setFileIdToSearch(e.target.value)}
                                placeholder="Enter File Database ID (e.g. 1)"
                                className="bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2 flex-grow font-semibold text-slate-800 dark:text-slate-200"
                                onPressEnter={handleSearchVersions}
                            />
                            <Button 
                                type="primary"
                                onClick={handleSearchVersions}
                                icon={<SearchOutlined />}
                                className="h-full bg-blue-600 hover:bg-blue-750 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95"
                            >
                                Search
                            </Button>
                        </div>

                        {fileVersions.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-2.5">
                                    <span className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Select Restore Version</span>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Select 
                                            onChange={(val) => setVersionsSort(val)}
                                            value={versionsSort}
                                            className="h-7 w-32 text-[9px]"
                                            options={[
                                                { value: 'numberDesc', label: 'Version: Newest' },
                                                { value: 'numberAsc', label: 'Version: Oldest' },
                                                { value: 'dateDesc', label: 'Date: Newest' },
                                                { value: 'dateAsc', label: 'Date: Oldest' },
                                            ]}
                                        />
                                        <Button 
                                            type="primary"
                                            size="small"
                                            onClick={handleRestoreVersion}
                                            icon={<CloudUploadOutlined />}
                                            className="bg-emerald-500 hover:bg-emerald-650 border-0 text-white font-bold text-[10px] h-7 rounded-lg shadow-sm flex items-center gap-1"
                                        >
                                            Restore Selected
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2 max-h-56 overflow-y-auto border border-slate-100 dark:border-slate-800 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/40">
                                    {getSortedVersions().map(ver => (
                                        <div 
                                            key={ver.id}
                                            onClick={() => setSelectedVersionId(ver.id)}
                                            className={`p-2.5 rounded-lg text-xs cursor-pointer border flex justify-between items-center transition-all overflow-x-auto ${selectedVersionId === ver.id ? "bg-blue-50 dark:bg-blue-950/20 border-blue-500 text-blue-900 dark:text-blue-300 font-bold" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <ClockCircleOutlined className="text-slate-400 shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="m-0 text-xs">Version #{ver.versionNumber}</p>
                                                    <p className="text-[9px] text-slate-450 dark:text-slate-400 truncate max-w-[200px] mt-0.5 m-0" title={ver.backupPath}>{ver.backupPath}</p>
                                                </div>
                                            </div>
                                            <span className="text-[9px] text-slate-450 dark:text-slate-400 font-mono flex items-center gap-1 shrink-0">
                                                <CalendarOutlined style={{ fontSize: '9px' }} />
                                                {new Date(ver.backedUpAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <span className="text-[10px] font-black text-slate-450 dark:text-slate-505 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                                        <FolderOpenOutlined style={{ color: '#6366f1' }} />
                                        Restore Target Directory Override (Optional)
                                    </span>
                                    <Input 
                                        value={targetOverridePath}
                                        onChange={(e) => setTargetOverridePath(e.target.value)}
                                        placeholder="Original path is used if empty"
                                        className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-800 dark:text-slate-200 font-semibold"
                                    />
                                </div>
                            </div>
                        )}
                        
                        {fileVersions.length === 0 && (
                            <div className="text-xs text-slate-400 dark:text-slate-500 text-center py-14 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2 bg-slate-50/50 dark:bg-slate-900/40 mt-4">
                                <ClockCircleOutlined style={{ fontSize: '28px', color: '#94a3b8' }} />
                                <p className="m-0">Enter a File Database ID to view and restore its backup versions.</p>
                            </div>
                        )}
                    </div>
                </Card>
            </Col>
        </Row>
    );
};

export default SyncRestore;
