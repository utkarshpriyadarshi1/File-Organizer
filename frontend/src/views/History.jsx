import React, { useEffect, useState } from "react";
import axios from "axios";
import GenericResultViewer from "../components/GenericResultViewer";

const History = () => {
    const [history, setHistory] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);

    const fetchHistory = () => {
        axios.get("http://localhost:8080/api/tasks/history")
            .then(res => {
                // Sort by creation date descending
                const sorted = res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setHistory(sorted);
            })
            .catch(err => console.error("Failed to fetch task history:", err));
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case "COMPLETED":
                return "bg-green-100 text-green-800";
            case "COMPLETED_WITH_FAILURES":
                return "bg-amber-100 text-amber-800";
            case "FAILED":
                return "bg-red-100 text-red-800";
            case "CANCELED":
                return "bg-gray-100 text-gray-800";
            case "RUNNING":
                return "bg-blue-100 text-blue-850 animate-pulse";
            case "QUEUED":
                return "bg-purple-100 text-purple-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow max-w-4xl mx-auto mt-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Execution & Notification History</h2>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Operation</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Summary</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Completed At</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-sm">
                        {history.map(task => (
                            <tr 
                                key={task.id} 
                                onClick={() => setSelectedTask(task)}
                                className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                            >
                                <td className="px-4 py-4 font-semibold text-gray-800">{task.taskType}</td>
                                <td className="px-4 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(task.status)}`}>
                                        {task.status.replace(/_/g, " ")}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-gray-650 truncate max-w-xs">{task.summary}</td>
                                <td className="px-4 py-4 text-gray-500">
                                    {task.completedAt ? new Date(task.completedAt).toLocaleString() : "Running..."}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedTask && (
                <GenericResultViewer 
                    task={selectedTask} 
                    onClose={() => {
                        setSelectedTask(null);
                        fetchHistory();
                    }} 
                />
            )}
        </div>
    );
};

export default History;
