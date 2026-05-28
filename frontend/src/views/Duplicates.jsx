import axios from "axios";
import React, { useState, useEffect } from "react";
import { useTasks } from "../services/TaskContext";

const Duplicates = () => {
    const { activeTasks, addToast, syncActiveTasks } = useTasks();
    const [folderPath, setFolderPath] = useState("");
    const [scanTaskId, setScanTaskId] = useState(null);
    const [duplicates, setDuplicates] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [status, setStatus] = useState("");

    const selectFolder = async () => {
        const selectedFolder = await window.electron.selectFolder();
        setFolderPath(selectedFolder);
    };

    // Monitor scanning progress if scanTaskId is active
    useEffect(() => {
        if (!scanTaskId) return;

        const activeTask = activeTasks[scanTaskId];
        if (activeTask) {
            setStatus(`Scanning for duplicates... ${activeTask.progress.toFixed(0)}%`);
        } else {
            // Task has completed and was removed from activeTasks. Check results
            setStatus("Scan completed! Fetching results...");
            axios.get(`http://localhost:8080/api/tasks/${scanTaskId}/results`)
                .then(res => {
                    setDuplicates(res.data);
                    setStatus("");
                    setScanTaskId(null);
                })
                .catch(err => {
                    console.error(err);
                    setStatus("Failed to fetch results.");
                    setScanTaskId(null);
                });
        }
    }, [activeTasks, scanTaskId]);

    const findDuplicates = async () => {
        if (!folderPath) {
            alert("Please select a folder first.");
            return;
        }

        setStatus("Initializing scanning task...");
        setDuplicates([]);
        try {
            const response = await axios.post("http://localhost:8080/api/duplicates/find", { folderPath });
            setScanTaskId(response.data);
            addToast("Duplicate scan triggered! Task ID: " + response.data, "info");
            syncActiveTasks();
        } catch (e) {
            setStatus("Failed to trigger scan.");
        }
    };

    const toggleSelection = (filePath) => {
        setSelectedFiles(prev =>
            prev.includes(filePath) ? prev.filter(f => f !== filePath) : [...prev, filePath]
        );
    };

    const removeSelected = async () => {
        if (selectedFiles.length === 0) {
            alert("No files selected for deletion.");
            return;
        }

        setStatus("Removing duplicates...");
        try {
            const response = await axios.post("http://localhost:8080/api/duplicates/remove", { filesToDelete: selectedFiles });
            addToast("Duplicate removal task triggered! Task ID: " + response.data, "info");
            syncActiveTasks();
            
            // Clean up state locally
            setDuplicates(duplicates.map(d => ({ ...d, files: d.files.filter(f => !selectedFiles.includes(f)) })));
            setSelectedFiles([]);
            setStatus("");
        } catch (e) {
            addToast("Failed to remove duplicates.", "error");
            setStatus("");
        }
    };

    return (
        <div className="max-w-2xl mx-auto mt-10 bg-white p-6 rounded-2xl shadow border border-gray-100 text-center space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Duplicate Cleaner</h2>
            
            <div className="space-y-3 text-left">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Target Directory</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={folderPath} 
                        readOnly
                        placeholder="No directory selected"
                        className="bg-gray-50 text-xs border border-gray-200 rounded-xl p-3 flex-grow focus:outline-none"
                    />
                    <button 
                        onClick={selectFolder} 
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-3 rounded-xl transition-all duration-200"
                    >
                        Select Folder
                    </button>
                </div>
            </div>

            <button 
                onClick={findDuplicates} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-3 rounded-xl shadow-md transition-all duration-200"
            >
                Scan for Duplicates
            </button>

            {status && (
                <div className="bg-blue-50 border border-blue-100 text-blue-700 text-xs py-3 px-4 rounded-xl">
                    {status}
                </div>
            )}

            {duplicates.length > 0 && (
                <div className="mt-4 text-left border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-850">Duplicate Sets Found</h3>
                        <span className="text-xs text-gray-500 font-semibold">{duplicates.length} duplicate groups</span>
                    </div>
                    
                    <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                        {duplicates.map((dup, index) => (
                            <div key={index} className="border border-gray-150 rounded-xl p-3 bg-slate-50">
                                <p className="text-xs font-mono text-gray-500 mb-2 truncate">Hash: {dup.hash}</p>
                                <div className="space-y-1.5">
                                    {dup.files.map((file, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                onChange={() => toggleSelection(file)}
                                                checked={selectedFiles.includes(file)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-xs text-gray-700 truncate max-w-lg">{file}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-500">{selectedFiles.length} files selected for deletion</span>
                        <button 
                            onClick={removeSelected} 
                            className="bg-red-500 hover:bg-red-600 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors duration-200"
                        >
                            Remove Selected
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Duplicates;
