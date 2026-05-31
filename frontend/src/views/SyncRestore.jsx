import axios from "axios";
import React, { useState, useEffect } from "react";
import { useTasks } from "../services/TaskContext";

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            
            {/* Folder Synchronization Panel */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col justify-between shadow-sm">
                <div>
                    <h3 className="text-xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
                        <i className="fa-solid fa-arrows-rotate text-blue-600"></i>
                        Sync Folders
                    </h3>
                    
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1.5">
                                <i className="fa-solid fa-right-from-bracket text-blue-500"></i>
                                Source Directory
                            </label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={sourceFolder} 
                                    readOnly 
                                    placeholder="No source folder selected"
                                    className="bg-gray-50 text-xs border border-gray-200 rounded-xl p-2.5 flex-grow focus:outline-none font-medium text-gray-700"
                                />
                                <button 
                                    onClick={() => handleSelectFolder(setSourceFolder)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1 shadow-sm"
                                >
                                    <i className="fa-solid fa-folder-open"></i>
                                    Select
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1.5">
                                <i className="fa-solid fa-right-to-bracket text-emerald-500"></i>
                                Destination Directory
                            </label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={destinationFolder} 
                                    readOnly 
                                    placeholder="No destination folder selected"
                                    className="bg-gray-50 text-xs border border-gray-200 rounded-xl p-2.5 flex-grow focus:outline-none font-medium text-gray-700"
                                />
                                <button 
                                    onClick={() => handleSelectFolder(setDestinationFolder)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1 shadow-sm"
                                >
                                    <i className="fa-solid fa-folder-open"></i>
                                    Select
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1.5">
                                <i className="fa-solid fa-circle-nodes text-indigo-500"></i>
                                Sync Type
                            </label>
                            <select 
                                onChange={(e) => setSyncType(e.target.value)} 
                                value={syncType}
                                className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none font-semibold text-gray-700"
                            >
                                <option value="ONE_WAY">One-Way Mirroring</option>
                                <option value="TWO_WAY">Two-Way Synchronization</option>
                            </select>
                        </div>

                        <button 
                            onClick={handleCreateSyncJob}
                            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white font-semibold text-xs py-2.5 rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 shadow-md mt-4"
                        >
                            <i className="fa-solid fa-circle-plus"></i>
                            Register Sync Job
                        </button>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-4 flex-grow flex flex-col min-h-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <h4 className="font-bold text-gray-800 text-sm flex items-center gap-1.5 shrink-0">
                            <i className="fa-solid fa-list-check text-slate-500"></i>
                            Registered Sync Jobs
                        </h4>
                        
                        <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-gray-500 items-center">
                            <input 
                                type="text"
                                value={jobsSearch}
                                onChange={(e) => setJobsSearch(e.target.value)}
                                placeholder="Search jobs..."
                                className="border border-gray-200 rounded-lg p-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 w-24 sm:w-28 text-[10px]"
                            />
                            <select 
                                onChange={(e) => setJobsFilterType(e.target.value)}
                                value={jobsFilterType}
                                className="border border-gray-200 rounded-lg p-1.5 bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 text-[10px]"
                            >
                                <option value="ALL">All Types</option>
                                <option value="ONE_WAY">One-Way</option>
                                <option value="TWO_WAY">Two-Way</option>
                            </select>
                            <select 
                                onChange={(e) => setJobsSort(e.target.value)}
                                value={jobsSort}
                                className="border border-gray-200 rounded-lg p-1.5 bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 text-[10px]"
                            >
                                <option value="name">Name</option>
                                <option value="type">Type</option>
                                <option value="status">Status</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto overflow-x-auto flex-grow">
                        {getSortedJobs().length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-4 bg-gray-50 border border-dashed rounded-xl">No sync jobs matching filters.</p>
                        ) : getSortedJobs().map(job => (
                            <div key={job.id} className="bg-gray-50 border border-gray-150 rounded-xl p-3 flex justify-between items-center text-xs overflow-x-auto">
                                <div>
                                    <p className="font-bold text-gray-800 flex items-center gap-1">
                                        <i className="fa-solid fa-shuffle text-blue-500"></i>
                                        {job.jobName}
                                    </p>
                                    <p className="text-gray-500 truncate max-w-[200px] mt-0.5">{job.sourcePath} ➔ {job.destinationPath}</p>
                                    <p className="text-gray-600 mt-1 font-medium">Type: {job.syncType} • Status: <span className="font-bold text-blue-600">{job.status}</span></p>
                                </div>
                                <button 
                                    onClick={() => handleRunSync(job.id)}
                                    className="bg-green-500 hover:bg-green-600 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500/20 text-white font-bold px-3 py-1.5 rounded-xl transition-all duration-150 flex items-center gap-1 shadow-sm"
                                >
                                    <i className="fa-solid fa-play text-[10px]"></i>
                                    Run
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Versioned Restore Panel */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col justify-between shadow-sm">
                <div>
                    <h3 className="text-xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
                        <i className="fa-solid fa-clock-rotate-left text-indigo-600"></i>
                        Version Restore
                    </h3>
                    
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={fileIdToSearch}
                                onChange={(e) => setFileIdToSearch(e.target.value)}
                                placeholder="Enter File Database ID (e.g. 1)"
                                className="bg-gray-50 text-xs border border-gray-200 rounded-xl p-2.5 flex-grow focus:outline-none font-semibold text-gray-800"
                            />
                            <button 
                                onClick={handleSearchVersions}
                                className="bg-blue-600 hover:bg-blue-700 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-sm"
                            >
                                <i className="fa-solid fa-magnifying-glass"></i>
                                Search
                            </button>
                        </div>

                        {fileVersions.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2.5">
                                    <label className="block text-xs font-bold text-gray-400 uppercase flex items-center gap-1.5">
                                        <i className="fa-solid fa-list text-slate-500"></i>
                                        Select Restore Version
                                    </label>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500">
                                            <span className="text-[9px] uppercase font-bold text-gray-400">Sort:</span>
                                            <select 
                                                onChange={(e) => setVersionsSort(e.target.value)}
                                                value={versionsSort}
                                                className="border border-gray-200 rounded-lg p-1 bg-white text-gray-700 cursor-pointer focus:outline-none text-[10px]"
                                            >
                                                <option value="numberDesc">Version: Newest</option>
                                                <option value="numberAsc">Version: Oldest</option>
                                                <option value="dateDesc">Date: Newest</option>
                                                <option value="dateAsc">Date: Oldest</option>
                                            </select>
                                        </div>
                                        <button 
                                            onClick={handleRestoreVersion}
                                            className="bg-green-500 hover:bg-green-600 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500/20 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg transition-all duration-150 shadow-sm flex items-center gap-1"
                                        >
                                            <i className="fa-solid fa-cloud-arrow-up text-[9px]"></i>
                                            Restore Selected Version
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto overflow-x-auto border border-gray-100 p-2 rounded-xl bg-gray-50">
                                    {getSortedVersions().map(ver => (
                                        <div 
                                            key={ver.id}
                                            onClick={() => setSelectedVersionId(ver.id)}
                                            className={`p-2.5 rounded-lg text-xs cursor-pointer border flex justify-between items-center transition-all overflow-x-auto ${selectedVersionId === ver.id ? "bg-blue-50 border-blue-500 text-blue-900 font-bold" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <i className="fa-solid fa-clock text-slate-400 shrink-0"></i>
                                                <div className="min-w-0">
                                                    <p>Version #{ver.versionNumber}</p>
                                                    <p className="text-[10px] text-gray-500 truncate max-w-[200px] mt-0.5">{ver.backupPath}</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1 shrink-0">
                                                <i className="fa-solid fa-calendar text-[9px]"></i>
                                                {new Date(ver.backedUpAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1.5">
                                        <i className="fa-solid fa-folder-tree text-indigo-500"></i>
                                        Restore Target Directory Override (Optional)
                                    </label>
                                    <input 
                                        type="text"
                                        value={targetOverridePath}
                                        onChange={(e) => setTargetOverridePath(e.target.value)}
                                        placeholder="Original path is used if empty"
                                        className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none text-gray-800 font-semibold"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                {fileVersions.length === 0 && (
                    <div className="text-xs text-gray-400 text-center py-12 border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 bg-slate-50 mt-4">
                        <i className="fa-solid fa-clock-rotate-left text-gray-300 text-3xl"></i>
                        <p>Enter a File Database ID to view and restore its backup versions.</p>
                    </div>
                )}
            </div>

        </div>
    );
};

export default SyncRestore;
