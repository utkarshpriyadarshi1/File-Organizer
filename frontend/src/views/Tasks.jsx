import { TaskType, TaskStatus } from "../enums/SystemTypes";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useTasks } from "../services/TaskContext";
import GenericResultViewer from "../components/GenericResultViewer";

const Tasks = () => {
    const { cancelTasksBulk, activeTasks, syncActiveTasks } = useTasks();
    const activeList = Object.values(activeTasks || {});
    const [selectedTasks, setSelectedTasks] = useState([]);
    const [activeFilter, setActiveFilter] = useState("ALL");
    const [activeSort, setActiveSort] = useState("timeDesc");

    // History tasks states
    const [history, setHistory] = useState([]);
    const [historyFilterType, setHistoryFilterType] = useState("ALL");
    const [historyFilterStatus, setHistoryFilterStatus] = useState("ALL");
    const [historySort, setHistorySort] = useState("completedDesc");
    const [historySearch, setHistorySearch] = useState("");
    const [selectedTask, setSelectedTask] = useState(null);

    // Loading states
    const [historyLoading, setHistoryLoading] = useState(false);



    // Fetch Completed History
    const fetchHistory = () => {
        console.log("[Tasks] Fetching historical background task logs...");
        setHistoryLoading(true);
        axios.get("http://localhost:8080/api/tasks/history")
            .then(res => {
                console.info(`[Tasks] Successfully fetched ${res.data.length} historical records.`);
                setHistory(res.data);
                setHistoryLoading(false);
            })
            .catch(err => {
                console.error("[Tasks] Failed to fetch history:", err);
                setHistoryLoading(false);
            });
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    // Toggle single active task selection
    const toggleActiveSelection = (id) => {
        setSelectedTasks(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    // Toggle all visible active tasks selection
    const toggleSelectAllActive = (visibleTasks) => {
        const visibleIds = visibleTasks.map(t => t.id);
        const allSelected = visibleIds.every(id => selectedTasks.includes(id));
        if (allSelected) {
            // Deselect visible ones
            setSelectedTasks(prev => prev.filter(id => !visibleIds.includes(id)));
        } else {
            // Select all visible ones
            setSelectedTasks(prev => {
                const uniqueIds = new Set([...prev, ...visibleIds]);
                return Array.from(uniqueIds);
            });
        }
    };

    // Bulk force-cancel active tasks
    const handleBulkCancel = async () => {
        if (selectedTasks.length === 0) {
            alert("No tasks selected.");
            return;
        }
        console.log("[Tasks] Bulk cancelling selected tasks:", selectedTasks);
        await cancelTasksBulk(selectedTasks);
        setSelectedTasks([]);
        setTimeout(() => {
            syncActiveTasks();
            fetchHistory();
        }, 1000);
    };

    // Filtered & Sorted Active Tasks
    const getFilteredActiveTasks = () => {
        return activeList.filter(t => {
            if (activeFilter === "ALL") return true;
            if (activeFilter === "RUNNING" || activeFilter === "QUEUED") return t.status === activeFilter;
            return t.taskType === activeFilter;
        });
    };

    const getSortedActiveTasks = () => {
        return [...getFilteredActiveTasks()].sort((a, b) => {
            if (activeSort === "timeDesc") return new Date(b.createdAt) - new Date(a.createdAt);
            if (activeSort === "timeAsc") return new Date(a.createdAt) - new Date(b.createdAt);
            if (activeSort === "type") return a.taskType.localeCompare(b.taskType);
            return 0;
        });
    };

    // Filtered & Sorted History
    const getFilteredHistoryTasks = () => {
        return history.filter(t => {
            const matchesType = historyFilterType === "ALL" || t.taskType === historyFilterType;
            const matchesStatus = historyFilterStatus === "ALL" || t.status === historyFilterStatus;
            const matchesSearch = !historySearch.trim() ||
                (t.summary && t.summary.toLowerCase().includes(historySearch.toLowerCase())) ||
                (t.actionDetails && t.actionDetails.toLowerCase().includes(historySearch.toLowerCase())) ||
                (t.sourcePath && t.sourcePath.toLowerCase().includes(historySearch.toLowerCase())) ||
                (t.destinationPath && t.destinationPath.toLowerCase().includes(historySearch.toLowerCase())) ||
                t.id.toLowerCase().includes(historySearch.toLowerCase());
            return matchesType && matchesStatus && matchesSearch;
        });
    };

    const getSortedHistoryTasks = () => {
        return [...getFilteredHistoryTasks()].sort((a, b) => {
            if (historySort === "completedDesc") {
                return new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt);
            }
            if (historySort === "completedAsc") {
                return new Date(a.completedAt || a.createdAt) - new Date(b.completedAt || b.createdAt);
            }
            if (historySort === "type") return a.taskType.localeCompare(b.taskType);
            if (historySort === "status") return a.status.localeCompare(b.status);
            return 0;
        });
    };

    // Icons mapping for operations
    const getTaskIcon = (taskType) => {
        switch (taskType) {
            case TaskType.ORGANIZE:
                return <i className="fa-solid fa-folder-tree text-blue-500 mr-2"></i>;
            case TaskType.BACKUP:
                return <i className="fa-solid fa-shield-halved text-amber-500 mr-2"></i>;
            case TaskType.DUPLICATE_SCAN:
                return <i className="fa-solid fa-copy text-rose-500 mr-2"></i>;
            case TaskType.SYNC:
                return <i className="fa-solid fa-arrows-rotate text-blue-500 mr-2"></i>;
            case TaskType.RESTORE:
                return <i className="fa-solid fa-cloud-arrow-up text-emerald-500 mr-2"></i>;
            default:
                return <i className="fa-solid fa-gears text-gray-500 mr-2"></i>;
        }
    };

    // Status styling mapping
    const getStatusColor = (status) => {
        switch (status) {
            case TaskStatus.COMPLETED:
                return "bg-green-50 text-green-700 border border-green-200";
            case TaskStatus.COMPLETED_WITH_FAILURES:
                return "bg-amber-50 text-amber-700 border border-amber-200";
            case TaskStatus.FAILED:
                return "bg-red-50 text-red-700 border border-red-200";
            case TaskStatus.CANCELED:
                return "bg-gray-50 text-gray-700 border border-gray-200";
            case TaskStatus.RUNNING:
                return "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse";
            case TaskStatus.QUEUED:
                return "bg-purple-50 text-purple-700 border border-purple-200";
            default:
                return "bg-gray-50 text-gray-700 border border-gray-200";
        }
    };

    const sortedActive = getSortedActiveTasks();
    const sortedHistory = getSortedHistoryTasks().slice(0, 1000);
    const allActiveVisibleSelected = sortedActive.length > 0 && sortedActive.every(t => selectedTasks.includes(t.id));

    if (selectedTask) {
        return (
            <div className="max-w-6xl mx-auto space-y-8 mt-4 pb-12">
                <GenericResultViewer
                    task={selectedTask}
                    onClose={() => {
                        console.log("[Tasks] Navigating backward from task result viewer");
                        setSelectedTask(null);
                        fetchHistory();
                    }}
                />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 mt-4 pb-12">

            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl shadow-inner">
                        <i className="fa-solid fa-list-check"></i>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-800">Tasks</h2>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">Monitor and control your system's background operations</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        syncActiveTasks();
                        fetchHistory();
                    }}
                    className="p-3 bg-gray-50 hover:bg-gray-100 hover:shadow-sm text-gray-600 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-bold active:scale-95 border border-gray-200"
                >
                    <i className="fa-solid fa-arrows-rotate"></i>
                    Refresh All
                </button>
            </div>

            {/* Active Task Control Center */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <i className="fa-solid fa-circle-notch text-blue-500 animate-spin-slow"></i>
                            Active Tasks
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Manage active or queued background operations</p>
                    </div>

                    {selectedTasks.length > 0 && (
                        <button
                            onClick={handleBulkCancel}
                            className="bg-red-500 hover:bg-red-600 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-sm border border-red-600"
                        >
                            <i className="fa-solid fa-ban"></i>
                            Force Cancel Selected ({selectedTasks.length})
                        </button>
                    )}
                </div>

                {/* Filters and Sorting for Active Tasks */}
                <div className="flex flex-wrap gap-4 mb-4 text-xs font-semibold text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100 items-center justify-between">
                    <div className="flex flex-wrap gap-3 items-center">
                        <span className="text-gray-400 uppercase text-[10px] tracking-wider font-bold">Filter By:</span>
                        <select
                            onChange={(e) => setActiveFilter(e.target.value)}
                            value={activeFilter}
                            className="border border-gray-200 rounded-lg p-2 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                        >
                            <option value="ALL">All Active</option>
                            <option value={TaskStatus.RUNNING}>Running</option>
                            <option value={TaskStatus.QUEUED}>Queued</option>
                            <option value={TaskType.BACKUP}>Backup</option>
                            <option value={TaskType.DUPLICATE_SCAN}>Duplicate Check</option>
                            <option value={TaskType.ORGANIZE}>Organizer</option>
                            <option value={TaskType.SYNC}>Sync</option>
                            <option value={TaskType.RESTORE}>Restore</option>
                        </select>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center">
                        <span className="text-gray-400 uppercase text-[10px] tracking-wider font-bold">Sort By:</span>
                        <select
                            onChange={(e) => setActiveSort(e.target.value)}
                            value={activeSort}
                            className="border border-gray-200 rounded-lg p-2 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                        >
                            <option value="timeDesc">Start Time: New to Old</option>
                            <option value="timeAsc">Start Time: Old to New</option>
                            <option value="type">Operation Type</option>
                        </select>
                    </div>
                </div>

                {/* Active Tasks Queue */}
                <div className="space-y-3">
                    {sortedActive.length > 0 && (
                        <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100 text-xs font-semibold text-gray-500 select-none">
                            <input
                                type="checkbox"
                                checked={allActiveVisibleSelected}
                                onChange={() => toggleSelectAllActive(sortedActive)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                            />
                            <span>Select All Visible Active ({sortedActive.length})</span>
                        </div>
                    )}

                    {sortedActive.map(task => (
                        <div
                            key={task.id}
                            className="flex justify-between items-center border border-gray-150 p-4 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-all hover:shadow-sm duration-150"
                        >
                            <div className="flex items-center gap-3 flex-grow min-w-0">
                                <input
                                    type="checkbox"
                                    checked={selectedTasks.includes(task.id)}
                                    onChange={() => toggleActiveSelection(task.id)}
                                    className="rounded border-gray-300 text-red-600 focus:ring-red-500 h-4 w-4 cursor-pointer"
                                />
                                <div className="min-w-0 flex-grow">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-800 flex items-center text-sm">
                                            {getTaskIcon(task.taskType)}
                                            {task.taskType}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(task.status)}`}>
                                            {task.status}
                                        </span>
                                    </div>
                                    {task.actionDetails && (
                                        <p className="text-xs text-gray-800 font-bold mt-1">
                                            <i className="fa-solid fa-play text-gray-405 mr-1.5"></i>
                                            {task.actionDetails}
                                        </p>
                                    )}
                                    {task.sourcePath && (
                                        <p className="text-[11px] text-gray-600 mt-1 flex items-center gap-1">
                                            <span className="font-semibold text-gray-400 text-[10px] uppercase">Src:</span>
                                            <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono truncate">{task.sourcePath}</span>
                                        </p>
                                    )}
                                    {task.destinationPath && (
                                        <p className="text-[11px] text-gray-600 mt-0.5 flex items-center gap-1">
                                            <span className="font-semibold text-gray-400 text-[10px] uppercase">Dest:</span>
                                            <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono truncate">{task.destinationPath}</span>
                                        </p>
                                    )}
                                    {!task.actionDetails && !task.sourcePath && !task.destinationPath && (
                                        <p className="text-[10px] text-gray-400 font-mono mt-1 truncate">ID: {task.id || task.taskId}</p>
                                    )}
                                    <p className="text-xs text-gray-600 mt-1 font-medium italic truncate">{task.summary || task.message || "Working..."}</p>

                                    {/* Real-time Progress Bar */}
                                    {task.progress !== undefined && task.progress !== null && task.progress > 0 && (
                                        <div className="mt-2.5 max-w-md">
                                            <div className="flex justify-between text-[10px] text-gray-505 font-semibold mb-1">
                                                <span>Progress</span>
                                                <span>{task.progress.toFixed(0)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-250 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full transition-all duration-305"
                                                    style={{ width: `${task.progress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                                <span className="text-[10px] bg-sky-50 border border-sky-100 text-sky-800 px-3 py-1 rounded-full font-bold">
                                    Started: {new Date(task.createdAt).toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                    ))}

                    {sortedActive.length === 0 && (
                        <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl bg-gray-50/20">
                            <i className="fa-solid fa-circle-check text-gray-300 text-3xl mb-2"></i>
                            <p className="text-sm text-gray-500 font-medium">No active background tasks matching filters.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Execution & Notification History */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <i className="fa-solid fa-clock-rotate-left text-indigo-500"></i>
                        Task History
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Review historical completed task logs and their results</p>
                </div>

                {/* Filters, Sorting, and Searching for History */}
                <div className="space-y-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Search Query */}
                        <div className="relative flex-grow">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                <i className="fa-solid fa-magnifying-glass text-xs"></i>
                            </span>
                            <input
                                type="text"
                                value={historySearch}
                                onChange={(e) => setHistorySearch(e.target.value)}
                                placeholder="Search by Task Summary or ID..."
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl bg-white text-xs font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            {historySearch && (
                                <button
                                    onClick={() => setHistorySearch("")}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-650"
                                >
                                    <i className="fa-solid fa-circle-xmark text-xs"></i>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs font-semibold text-gray-600 justify-between items-center">
                        <div className="flex flex-wrap gap-3 items-center">
                            <span className="text-gray-400 uppercase text-[10px] tracking-wider font-bold">Filter Type:</span>
                            <select
                                onChange={(e) => setHistoryFilterType(e.target.value)}
                                value={historyFilterType}
                                className="border border-gray-200 rounded-lg p-2 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            >
                                <option value="ALL">All Types</option>
                                <option value={TaskType.ORGANIZE}>Organizer</option>
                                <option value={TaskType.BACKUP}>Backup</option>
                                <option value={TaskType.DUPLICATE_SCAN}>Duplicate Check</option>
                                <option value={TaskType.SYNC}>Sync</option>
                                <option value={TaskType.RESTORE}>Restore</option>
                            </select>

                            <span className="text-gray-400 uppercase text-[10px] tracking-wider font-bold ml-2">Status:</span>
                            <select
                                onChange={(e) => setHistoryFilterStatus(e.target.value)}
                                value={historyFilterStatus}
                                className="border border-gray-200 rounded-lg p-2 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="COMPLETED_WITH_FAILURES">Completed with Failures</option>
                                <option value="FAILED">Failed</option>
                                <option value="CANCELED">Canceled</option>
                            </select>
                        </div>

                        <div className="flex flex-wrap gap-3 items-center">
                            <span className="text-gray-400 uppercase text-[10px] tracking-wider font-bold">Sort By:</span>
                            <select
                                onChange={(e) => setHistorySort(e.target.value)}
                                value={historySort}
                                className="border border-gray-200 rounded-lg p-2 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            >
                                <option value="completedDesc">Date: Newest First</option>
                                <option value="completedAsc">Date: Oldest First</option>
                                <option value="type">Operation Type</option>
                                <option value="status">Status</option>
                            </select>
                        </div>
                    </div>
                </div>

                {getSortedHistoryTasks().length > 1000 && (
                    <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 font-semibold flex items-center gap-2">
                        <i className="fa-solid fa-circle-info text-amber-600 text-sm"></i>
                        <span>Showing top 1000 of {getSortedHistoryTasks().length} completed tasks to prevent browser rendering lag. Please use searching or filters above to view other records.</span>
                    </div>
                )}

                {/* History Table */}
                <div className="overflow-x-auto border border-gray-150 rounded-xl">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                <th className="px-4 py-3">
                                    <i className="fa-solid fa-gears mr-1.5"></i>Operation
                                </th>
                                <th className="px-4 py-3">
                                    <i className="fa-solid fa-circle-question mr-1.5"></i>Status
                                </th>
                                <th className="px-4 py-3">
                                    <i className="fa-solid fa-quote-left mr-1.5"></i>Summary
                                </th>
                                <th className="px-4 py-3">
                                    <i className="fa-solid fa-calendar-days mr-1.5"></i>Completed At
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 text-xs bg-white">
                            {historyLoading ? (
                                <tr>
                                    <td colSpan="4" className="text-center py-8 text-gray-500 font-medium">
                                        <i className="fa-solid fa-circle-notch animate-spin text-lg mr-2"></i>
                                        Loading historical logs...
                                    </td>
                                </tr>
                            ) : sortedHistory.map(task => (
                                <tr
                                    key={task.id}
                                    onClick={() => setSelectedTask(task)}
                                    className="hover:bg-slate-50/80 cursor-pointer transition-colors duration-150 active:scale-[0.99] origin-center"
                                >
                                    <td className="px-4 py-4 font-semibold text-gray-800 flex items-center min-w-[140px]">
                                        {getTaskIcon(task.taskType)}
                                        {task.taskType}
                                    </td>
                                    <td className="px-4 py-4 min-w-[150px]">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${getStatusColor(task.status)}`}>
                                            <i className={`fa-solid ${task.status === "COMPLETED" ? "fa-circle-check" : task.status === "FAILED" ? "fa-circle-xmark" : "fa-circle-exclamation"}`}></i>
                                            {task.status.replace(/_/g, " ")}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-gray-605 max-w-md">
                                        {task.actionDetails ? (
                                            <div className="font-bold text-gray-800 mb-0.5">{task.actionDetails}</div>
                                        ) : (
                                            <div className="text-gray-800">{task.summary}</div>
                                        )}
                                        {task.sourcePath && (
                                            <div className="text-[10px] text-gray-500 mt-1 flex flex-wrap items-center gap-1">
                                                <span className="font-semibold text-gray-400 uppercase text-[9px]">Src:</span>
                                                <span className="font-mono truncate bg-gray-50 px-1 py-0.2 rounded border border-gray-150 inline-block max-w-[200px]" title={task.sourcePath}>{task.sourcePath}</span>
                                                {task.destinationPath && (
                                                    <>
                                                        <i className="fa-solid fa-arrow-right text-gray-300 text-[9px] mx-0.5"></i>
                                                        <span className="font-semibold text-gray-400 uppercase text-[9px]">Dest:</span>
                                                        <span className="font-mono truncate bg-gray-50 px-1 py-0.2 rounded border border-gray-150 inline-block max-w-[200px]" title={task.destinationPath}>{task.destinationPath}</span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        {task.actionDetails && task.summary && (
                                            <div className="text-[10px] text-gray-400 italic mt-0.5">{task.summary}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-gray-500 min-w-[160px]">
                                        <span className="flex items-center gap-1.5 font-medium">
                                            <i className="fa-regular fa-clock text-slate-400 text-xs"></i>
                                            {task.completedAt ? new Date(task.completedAt).toLocaleString() : "Running..."}
                                        </span>
                                    </td>
                                </tr>
                            ))}

                            {!historyLoading && sortedHistory.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="text-center py-12 text-gray-400">
                                        <i className="fa-solid fa-folder-open text-3xl mb-2 block"></i>
                                        No historical task executions match filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default Tasks;
