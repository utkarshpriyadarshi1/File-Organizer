import axios from "axios";
import React, { useState, useEffect } from "react";
import { useTasks } from "../services/TaskContext";

const SyncRestore = () => {
    const { addToast, syncActiveTasks } = useTasks();

    // Sync state
    const [sourceFolder, setSourceFolder] = useState("");
    const [destinationFolder, setDestinationFolder] = useState("");
    const [syncType, setSyncType] = useState("ONE_WAY");
    const [syncJobs, setSyncJobs] = useState([]);

    // Restore state
    const [fileIdToSearch, setFileIdToSearch] = useState("");
    const [fileVersions, setFileVersions] = useState([]);
    const [selectedVersionId, setSelectedVersionId] = useState(null);
    const [targetOverridePath, setTargetOverridePath] = useState("");

    const selectFolder = async (setFolder) => {
        const selectedFolder = await window.electron.selectFolder();
        setFolder(selectedFolder);
    };

    const fetchSyncJobs = () => {
        axios.get("http://localhost:8080/api/sync/jobs")
            .then(res => setSyncJobs(res.data))
            .catch(err => console.error("Failed to load sync jobs:", err));
    };

    useEffect(() => {
        fetchSyncJobs();
    }, []);

    const handleCreateSyncJob = async () => {
        if (!sourceFolder || !destinationFolder) {
            alert("Select source and destination folders first.");
            return;
        }
        try {
            await axios.post("http://localhost:8080/api/sync/create", {
                sourceFolder,
                destinationFolder,
                syncType
            });
            addToast("Synchronization job registered successfully.", "success");
            fetchSyncJobs();
            setSourceFolder("");
            setDestinationFolder("");
        } catch (e) {
            addToast("Failed to create sync job.", "error");
        }
    };

    const handleRunSync = async (jobId) => {
        try {
            const res = await axios.post(`http://localhost:8080/api/sync/${jobId}/run`);
            addToast("Sync task triggered! Task ID: " + res.data, "info");
            syncActiveTasks();
            fetchSyncJobs();
        } catch (e) {
            addToast("Failed to trigger sync execution.", "error");
        }
    };

    const handleSearchVersions = async () => {
        if (!fileIdToSearch.trim()) {
            alert("Please enter a valid File ID.");
            return;
        }
        try {
            const res = await axios.get(`http://localhost:8080/api/restore/versions/${fileIdToSearch}`);
            setFileVersions(res.data);
            if (res.data.length === 0) {
                addToast("No versions discovered for File ID: " + fileIdToSearch, "info");
            }
        } catch (e) {
            addToast("Failed to load version history.", "error");
        }
    };

    const handleRestoreVersion = async () => {
        if (!selectedVersionId) {
            alert("Please select a file version to restore.");
            return;
        }
        try {
            const res = await axios.post(`http://localhost:8080/api/restore/${selectedVersionId}`, {
                targetPathOverride: targetOverridePath
            });
            addToast("Restore version task triggered! Task ID: " + res.data, "info");
            syncActiveTasks();
            setSelectedVersionId(null);
            setTargetOverridePath("");
        } catch (e) {
            addToast("Failed to trigger restore version.", "error");
        }
    };

    return (
        <div className="max-w-4xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Folder Synchronization Panel */}
            <div className="bg-white p-6 rounded-2xl shadow border border-gray-150 flex flex-col justify-between">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Sync Folders</h3>
                    
                    <div className="space-y-3 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Source Directory</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={sourceFolder} 
                                    readOnly 
                                    placeholder="No source folder"
                                    className="bg-gray-50 text-xs border border-gray-200 rounded-xl p-2.5 flex-grow focus:outline-none"
                                />
                                <button 
                                    onClick={() => selectFolder(setSourceFolder)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all"
                                >
                                    Select
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Destination Directory</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={destinationFolder} 
                                    readOnly 
                                    placeholder="No destination folder"
                                    className="bg-gray-50 text-xs border border-gray-200 rounded-xl p-2.5 flex-grow focus:outline-none"
                                />
                                <button 
                                    onClick={() => selectFolder(setDestinationFolder)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all"
                                >
                                    Select
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sync Type</label>
                            <select 
                                onChange={(e) => setSyncType(e.target.value)} 
                                value={syncType}
                                className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none"
                            >
                                <option value="ONE_WAY">One-Way Mirroring</option>
                                <option value="TWO_WAY">Two-Way Synchronization</option>
                            </select>
                        </div>

                        <button 
                            onClick={handleCreateSyncJob}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 rounded-xl transition-all"
                        >
                            Register Sync Job
                        </button>
                    </div>
                </div>

                <div className="border-t pt-4">
                    <h4 className="font-bold text-gray-800 text-sm mb-2">Registered Sync Jobs</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {syncJobs.map(job => (
                            <div key={job.id} className="bg-gray-50 border border-gray-150 rounded-xl p-3 flex justify-between items-center text-xs">
                                <div>
                                    <p className="font-bold">{job.jobName}</p>
                                    <p className="text-gray-500 truncate max-w-[200px]">{job.sourcePath} ➔ {job.destinationPath}</p>
                                    <p className="text-gray-600 mt-1 font-medium">Type: {job.syncType} • Status: <span className="font-bold text-blue-600">{job.status}</span></p>
                                </div>
                                <button 
                                    onClick={() => handleRunSync(job.id)}
                                    className="bg-green-500 hover:bg-green-600 text-white font-bold px-3 py-1.5 rounded-xl transition-all"
                                >
                                    Run
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Versioned Restore Panel */}
            <div className="bg-white p-6 rounded-2xl shadow border border-gray-150 flex flex-col justify-between">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Version Restore</h3>
                    
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
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all"
                            >
                                Search
                            </button>
                        </div>

                        {fileVersions.length > 0 && (
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-gray-500 uppercase">Select Restore Version</label>
                                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-100 p-2 rounded-xl bg-gray-50">
                                    {fileVersions.map(ver => (
                                        <div 
                                            key={ver.id}
                                            onClick={() => setSelectedVersionId(ver.id)}
                                            className={`p-2.5 rounded-lg text-xs cursor-pointer border flex justify-between items-center transition-all ${selectedVersionId === ver.id ? "bg-blue-50 border-blue-500 text-blue-900 font-bold" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                                        >
                                            <div>
                                                <p>Version #{ver.versionNumber}</p>
                                                <p className="text-[10px] text-gray-500 truncate max-w-[200px]">{ver.backupPath}</p>
                                            </div>
                                            <span className="text-[10px] text-gray-500 font-mono">
                                                {new Date(ver.backedUpAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Restore Target Directory Override (Optional)</label>
                                    <input 
                                        type="text"
                                        value={targetOverridePath}
                                        onChange={(e) => setTargetOverridePath(e.target.value)}
                                        placeholder="Original path is used if empty"
                                        className="w-full bg-gray-50 text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none text-gray-800 font-semibold"
                                    />
                                </div>

                                <button 
                                    onClick={handleRestoreVersion}
                                    className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold text-xs py-2.5 rounded-xl transition-all shadow-md"
                                >
                                    Restore Selected Version
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                {fileVersions.length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-12 border border-dashed rounded-xl">Enter a File Database ID to view and restore its backup versions.</p>
                )}
            </div>

        </div>
    );
};

export default SyncRestore;
