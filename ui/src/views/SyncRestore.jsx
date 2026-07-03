import axios from "axios";
import React, { useState, useEffect } from "react";
import { useTasks } from "../services/TaskContext";
import { Card, Row, Col, Input, Button, Select, List, Badge, Space, Tag, Typography } from "../components/common";
import { PageWrapper, PanelCard, FieldLabel } from "../components/wrappers";
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
    DeploymentUnitOutlined,
    SwapOutlined,
    ArrowRightOutlined,
    RetweetOutlined
} from "@ant-design/icons";
import appConfig from "../app.config.json";

const { Text, Paragraph } = Typography;

const SyncRestore = () => {
    const { addToast, selectFolder, syncActiveTasks } = useTasks();

    // Sync state
    const [sourceFolder, setSourceFolder] = useState("");
    const [destinationFolder, setDestinationFolder] = useState("");
    const [syncType, setSyncType] = useState(appConfig.behavior.syncDefaultType);
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
        <PageWrapper style={{ maxWidth: '80rem' }}>
            <Row gutter={[16, 16]}>
            {/* Folder Synchronization Panel */}
            <Col xs={24} lg={12}>
                <PanelCard 
                    title="Sync Folders"
                    subtitle="Keep files updated across directories (one-way or two-way mirror)"
                    icon={<SyncOutlined style={{ color: '#2563eb' }} />}
                >
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <div>
                            <FieldLabel icon={<ImportOutlined style={{ color: '#2563eb' }} />}>
                                Source Directory
                            </FieldLabel>
                            <Space.Compact style={{ width: '100%' }}>
                                <Input 
                                    value={sourceFolder} 
                                    readOnly 
                                    placeholder="No source folder selected"
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
                                    placeholder="No destination folder selected"
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
                            <FieldLabel icon={<DeploymentUnitOutlined style={{ color: '#6366f1' }} />}>
                                Sync Type
                            </FieldLabel>
                            <Select 
                                onChange={(val) => setSyncType(val)} 
                                value={syncType}
                                style={{ width: '100%' }}
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
                            style={{ width: '100%', height: '48px', fontWeight: 'bold' }}
                        >
                            Register Sync Job
                        </Button>
                    </Space>

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
                </PanelCard>
            </Col>

            {/* Versioned Restore Panel */}
            <Col xs={24} lg={12}>
                <PanelCard 
                    title="Version Restore"
                    subtitle="Lookup file backups version history and restore to any folder location"
                    icon={<ClockCircleOutlined style={{ color: '#6366f1' }} />}
                >
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <Space.Compact style={{ width: '100%' }}>
                            <Input 
                                value={fileIdToSearch}
                                onChange={(e) => setFileIdToSearch(e.target.value)}
                                placeholder="Enter File Database ID (e.g. 1)"
                                style={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                                onPressEnter={handleSearchVersions}
                            />
                            <Button 
                                type="primary"
                                onClick={handleSearchVersions}
                                icon={<SearchOutlined />}
                            >
                                Search
                            </Button>
                        </Space.Compact>

                        {fileVersions.length > 0 && (
                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                    <Text type="secondary" strong style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Restore Version</Text>
                                    <Space size="small" wrap>
                                        <Select 
                                            onChange={(val) => setVersionsSort(val)}
                                            value={versionsSort}
                                            style={{ width: '130px' }}
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
                                            style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                                        >
                                            Restore Selected
                                        </Button>
                                    </Space>
                                </div>

                                <div style={{ maxHeight: '224px', overflowY: 'auto', border: '1px solid #f0f0f0', padding: '8px', borderRadius: '8px' }}>
                                    <List
                                        dataSource={getSortedVersions()}
                                        renderItem={ver => (
                                            <List.Item
                                                onClick={() => setSelectedVersionId(ver.id)}
                                                style={{
                                                    cursor: 'pointer',
                                                    padding: '8px',
                                                    borderRadius: '8px',
                                                    border: '1px solid transparent',
                                                    backgroundColor: selectedVersionId === ver.id ? '#e6f7ff' : 'transparent',
                                                    borderColor: selectedVersionId === ver.id ? '#91d5ff' : '#f0f0f0',
                                                    marginBottom: '4px'
                                                }}
                                            >
                                                <List.Item.Meta
                                                    avatar={<ClockCircleOutlined style={{ color: selectedVersionId === ver.id ? '#1890ff' : '#bfbfbf' }} />}
                                                    title={<Text strong style={{ fontSize: '12px', color: selectedVersionId === ver.id ? '#096dd9' : 'inherit' }}>Version #{ver.versionNumber}</Text>}
                                                    description={<Text type="secondary" style={{ fontSize: '10px' }} ellipsis={{ tooltip: ver.backupPath }}>{ver.backupPath}</Text>}
                                                />
                                                <div style={{ fontSize: '10px', color: '#8c8c8c' }}>
                                                    <CalendarOutlined style={{ marginRight: '4px' }} />
                                                    {new Date(ver.backedUpAt).toLocaleDateString()}
                                                </div>
                                            </List.Item>
                                        )}
                                    />
                                </div>

                                <div>
                                    <FieldLabel icon={<FolderOpenOutlined style={{ color: '#6366f1' }} />}>
                                        Restore Target Directory Override (Optional)
                                    </FieldLabel>
                                    <Input 
                                        value={targetOverridePath}
                                        onChange={(e) => setTargetOverridePath(e.target.value)}
                                        placeholder="Original path is used if empty"
                                        style={{ fontWeight: 'bold' }}
                                    />
                                </div>
                            </Space>
                        )}
                        
                        {fileVersions.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '3rem 0', border: '1px dashed #d9d9d9', borderRadius: '1rem', marginTop: '1rem' }}>
                                <ClockCircleOutlined style={{ fontSize: '28px', color: '#bfbfbf', marginBottom: '8px' }} />
                                <Text type="secondary" style={{ display: 'block' }}>Enter a File Database ID to view and restore its backup versions.</Text>
                            </div>
                        )}
                    </Space>
                </PanelCard>
            </Col>
        </Row>
        </PageWrapper>
    );
};

export default SyncRestore;
