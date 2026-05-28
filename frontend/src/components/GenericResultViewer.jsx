import React, { useState, useEffect } from "react";
import axios from "axios";
import { useTasks } from "../services/TaskContext";

const GenericResultViewer = ({ task, onClose }) => {
    const { addToast, syncActiveTasks } = useTasks();
    const [payload, setPayload] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        axios.get(`http://localhost:8080/api/tasks/${task.id}/results`)
            .then(res => {
                setPayload(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load results:", err);
                addToast("Failed to fetch task execution results.", "error");
                setLoading(false);
            });
    }, [task.id, addToast]);

    const toggleFileSelection = (path) => {
        setSelectedFiles(prev =>
            prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
        );
    };

    const handleReversalAction = async (actionType) => {
        try {
            const res = await axios.post(`http://localhost:8080/api/tasks/${task.id}/action`, {
                actionType,
                targetPaths: selectedFiles
            });
            addToast("Reversal triggered successfully! Task ID: " + res.data, "success");
            syncActiveTasks();
            onClose();
        } catch (e) {
            addToast("Reversal action failed.", "error");
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm text-center">
                    <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-2 mx-auto"></div>
                    <p className="text-gray-600 text-sm">Reading task report...</p>
                </div>
            </div>
        );
    }

    // Determine sub-view based on taskType
    const renderSubView = () => {
        if (!payload || payload.length === 0) {
            return <p className="text-gray-500 text-center py-8">No file changes recorded in this run.</p>;
        }

        switch (task.taskType) {
            case "DUPLICATE_SCAN":
                // Payload is group of duplicates
                return (
                    <div className="space-y-4">
                        {payload.map((group, idx) => (
                            <div key={idx} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                <p className="text-xs text-gray-500 font-mono mb-2">Hash: {group.hash}</p>
                                <div className="space-y-1">
                                    {group.files.map((file, fIdx) => (
                                        <div key={fIdx} className="flex items-center gap-2">
                                            <input 
                                                type="checkbox"
                                                checked={selectedFiles.includes(file)}
                                                onChange={() => toggleFileSelection(file)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700 truncate max-w-lg">{file}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case "ORGANIZE":
                return (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Select</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Original Path</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Organized Path</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-xs">
                                {payload.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="px-3 py-2">
                                            <input 
                                                type="checkbox"
                                                checked={selectedFiles.includes(item.organizedPath || item.newPath)}
                                                onChange={() => toggleFileSelection(item.organizedPath || item.newPath)}
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-gray-600 truncate max-w-xs">{item.originalPath || item.oldPath}</td>
                                        <td className="px-3 py-2 text-gray-800 font-medium truncate max-w-xs">{item.organizedPath || item.newPath}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );

            case "BACKUP":
                return (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Select</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source Path</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Backup Path</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-xs">
                                {payload.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="px-3 py-2">
                                            <input 
                                                type="checkbox"
                                                checked={selectedFiles.includes(item.sourcePath || item.path)}
                                                onChange={() => toggleFileSelection(item.sourcePath || item.path)}
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-gray-800 truncate max-w-xs">{item.sourcePath || item.path}</td>
                                        <td className="px-3 py-2 text-gray-500 truncate max-w-xs">{item.backupPath || item.targetPath}</td>
                                        <td className="px-3 py-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.failed ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                                                {item.failed ? "Failed" : "Copied"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );

            default:
                return <pre className="bg-gray-50 p-4 rounded-xl text-xs overflow-auto max-h-64 font-mono">{JSON.stringify(payload, null, 2)}</pre>;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white border border-gray-100 shadow-2xl rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Task Log Details</h3>
                        <p className="text-xs text-gray-500">{task.taskType} • {task.id}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-grow">
                    {task.status === "COMPLETED_WITH_FAILURES" && (
                        <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-900 p-4 rounded-xl mb-4 text-xs">
                            <h4 className="font-bold mb-1">Reversal Warning: Some operations failed.</h4>
                            <p>You can unlock/free the target files on your system and click <strong>"Retry Failed Operations"</strong> below to re-process them.</p>
                        </div>
                    )}
                    {renderSubView()}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-medium">{selectedFiles.length} files selected</span>
                    <div className="flex gap-2">
                        {task.taskType === "ORGANIZE" && (
                            <button 
                                onClick={() => handleReversalAction("REVERT_MOVES")}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors duration-200"
                            >
                                Undo Selected Moves
                            </button>
                        )}
                        {task.taskType === "BACKUP" && (
                            <button 
                                onClick={() => handleReversalAction("RESTORE_FILES")}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors duration-200"
                            >
                                Restore Selected
                            </button>
                        )}
                        {task.status === "COMPLETED_WITH_FAILURES" && (
                            <button 
                                onClick={() => handleReversalAction("RETRY_FAILED")}
                                className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors duration-200"
                            >
                                Retry Failed Operations
                            </button>
                        )}
                        <button 
                            onClick={onClose}
                            className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 font-semibold text-sm px-4 py-2 rounded-xl transition-colors duration-200"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GenericResultViewer;
