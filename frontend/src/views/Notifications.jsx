import React, { useState, useEffect } from "react";
import { useTasks } from "../services/TaskContext";
import axios from "axios";

const Notifications = () => {
    const { 
        notificationsHistory, 
        markAllNotificationsAsRead, 
        clearAllNotifications, 
        markSingleAsRead,
        removeSingleNotification 
    } = useTasks();

    const [filter, setFilter] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    
    // States for expanding error/notification details
    const [expandedNotifications, setExpandedNotifications] = useState({});
    const [loadingResults, setLoadingResults] = useState({});
    const [taskResults, setTaskResults] = useState({});

    // Mark all notifications as read when opening this section
    useEffect(() => {
        markAllNotificationsAsRead();
    }, [markAllNotificationsAsRead]);

    const filteredNotifications = notificationsHistory.filter(n => {
        const matchesFilter = filter === "ALL" || n.type === filter.toLowerCase();
        const matchesSearch = n.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (n.title && n.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
                              (n.metadata?.actionDetails && n.metadata.actionDetails.toLowerCase().includes(searchQuery.toLowerCase())) ||
                              (n.metadata?.sourcePath && n.metadata.sourcePath.toLowerCase().includes(searchQuery.toLowerCase())) ||
                              (n.metadata?.destinationPath && n.metadata.destinationPath.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesFilter && matchesSearch;
    });

    const getStats = () => {
        const total = notificationsHistory.length;
        const success = notificationsHistory.filter(n => n.type === "success").length;
        const error = notificationsHistory.filter(n => n.type === "error").length;
        const warning = notificationsHistory.filter(n => n.type === "warning").length;
        const info = notificationsHistory.filter(n => n.type === "info").length;
        
        return { total, success, error, warning, info };
    };

    const stats = getStats();

    // Helper to format time difference
    const formatTimeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        
        let interval = Math.floor(seconds / 31536000);
        if (interval >= 1) return interval + "y ago";
        
        interval = Math.floor(seconds / 2592000);
        if (interval >= 1) return interval + "mo ago";
        
        interval = Math.floor(seconds / 86400);
        if (interval >= 1) return interval + "d ago";
        
        interval = Math.floor(seconds / 3600);
        if (interval >= 1) return interval + "h ago";
        
        interval = Math.floor(seconds / 60);
        if (interval >= 1) return interval + "m ago";
        
        return seconds < 5 ? "Just now" : seconds + "s ago";
    };

    const getNotificationStyles = (type) => {
        switch (type) {
            case "success":
                return {
                    bg: "bg-emerald-50/50 hover:bg-emerald-50 border-emerald-100",
                    icon: "fa-solid fa-circle-check text-emerald-500",
                    badge: "bg-emerald-100 text-emerald-800"
                };
            case "error":
                return {
                    bg: "bg-rose-50/50 hover:bg-rose-50 border-rose-100",
                    icon: "fa-solid fa-circle-xmark text-rose-500",
                    badge: "bg-rose-100 text-rose-800"
                };
            case "warning":
                return {
                    bg: "bg-amber-50/50 hover:bg-amber-50 border-amber-100",
                    icon: "fa-solid fa-triangle-exclamation text-amber-500",
                    badge: "bg-amber-100 text-amber-800"
                };
            default:
                return {
                    bg: "bg-blue-50/50 hover:bg-blue-50 border-blue-100",
                    icon: "fa-solid fa-circle-info text-blue-500",
                    badge: "bg-blue-100 text-blue-800"
                };
        }
    };

    const toggleExpand = async (id, metadata) => {
        markSingleAsRead(id);
        
        const isExpanding = !expandedNotifications[id];
        setExpandedNotifications(prev => ({
            ...prev,
            [id]: isExpanding
        }));

        if (isExpanding && metadata?.taskId && !taskResults[metadata.taskId]) {
            setLoadingResults(prev => ({ ...prev, [metadata.taskId]: true }));
            try {
                const res = await axios.get(`http://localhost:8080/api/tasks/${metadata.taskId}/results`);
                let data = res.data;
                if (typeof data === "string") {
                    data = JSON.parse(data);
                }
                
                // Filter only failed items
                const failures = Array.isArray(data) ? data.filter(item => {
                    return item.failed === true || item.error || item.status === "failed";
                }) : [];

                setTaskResults(prev => ({
                    ...prev,
                    [metadata.taskId]: failures
                }));
            } catch (err) {
                console.error("Failed to load details for notification task:", err);
                setTaskResults(prev => ({
                    ...prev,
                    [metadata.taskId]: [{ failed: true, error: "Could not fetch details from the backend server." }]
                }));
            } finally {
                setLoadingResults(prev => ({ ...prev, [metadata.taskId]: false }));
            }
        }
    };

    return (
        <div className="space-y-4 max-w-6xl mx-auto">

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                <div className="bg-white p-3 rounded-xl border border-gray-150 shadow-sm text-left">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total Received</p>
                    <p className="text-lg font-black text-gray-800 mt-0.5">{stats.total}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-150 shadow-sm text-left">
                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Success Actions</p>
                    <p className="text-lg font-black text-emerald-600 mt-0.5">{stats.success}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-150 shadow-sm text-left">
                    <p className="text-[9px] font-bold text-rose-600 uppercase tracking-wider">Failures/Errors</p>
                    <p className="text-lg font-black text-rose-600 mt-0.5">{stats.error}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-150 shadow-sm text-left">
                    <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">System Warnings</p>
                    <p className="text-lg font-black text-amber-600 mt-0.5">{stats.warning}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-150 shadow-sm col-span-2 md:col-span-1 text-left">
                    <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">Info Updates</p>
                    <p className="text-lg font-black text-blue-600 mt-0.5">{stats.info}</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-3 rounded-xl border border-gray-150 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                {/* Search Bar */}
                <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 w-full md:max-w-md">
                    <i className="fa-solid fa-magnifying-glass text-slate-400 text-xs mr-2"></i>
                    <input 
                        type="text"
                        placeholder="Search by notification content..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent text-xs w-full focus:outline-none font-medium text-gray-700 placeholder-gray-400"
                    />
                </div>

                {/* Filter & Actions Wrapper */}
                <div className="flex flex-wrap gap-2.5 items-center w-full md:w-auto shrink-0 justify-between md:justify-end">
                    {/* Filter Tabs */}
                    <div className="flex gap-1.5 overflow-x-auto">
                        {["ALL", "INFO", "SUCCESS", "WARNING", "ERROR"].map(type => (
                            <button
                                key={type}
                                onClick={() => setFilter(type)}
                                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                                    filter === type 
                                        ? "bg-slate-900 text-white border-slate-900 font-extrabold" 
                                        : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                                }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    {/* Action button */}
                    <button
                        onClick={clearAllNotifications}
                        disabled={notificationsHistory.length === 0}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 hover:border-rose-200 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-50 active:scale-95 shrink-0"
                    >
                        <i className="fa-solid fa-trash-can mr-1"></i>
                        Clear History
                    </button>
                </div>
            </div>

            {/* Notifications List */}
            <div className="space-y-3">
                {filteredNotifications.map(notification => {
                    const styles = getNotificationStyles(notification.type);
                    const isExpanded = !!expandedNotifications[notification.id];
                    const taskId = notification.metadata?.taskId;
                    const failures = taskId ? taskResults[taskId] : null;
                    const isLoading = taskId ? loadingResults[taskId] : false;

                    return (
                        <div 
                            key={notification.id}
                            onClick={() => toggleExpand(notification.id, notification.metadata)}
                            className={`flex flex-col p-4 rounded-2xl border transition-all relative group shadow-sm cursor-pointer ${styles.bg} ${!notification.read ? "ring-1 ring-blue-500/20 shadow-blue-500/5 font-semibold" : ""}`}
                        >
                            <div className="flex items-start gap-4 w-full">
                                {/* Icon Indicator */}
                                <div className="text-lg shrink-0 mt-0.5 animate-pulse">
                                    <i className={styles.icon}></i>
                                </div>

                                {/* Message Content */}
                                <div className="flex-grow min-w-0 pr-6 text-left">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-bold text-gray-800">
                                            {notification.title || "System Message"}
                                        </span>
                                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${styles.badge}`}>
                                            {notification.type}
                                        </span>
                                        {!notification.read && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" title="Unread"></span>
                                        )}
                                        {notification.metadata && (
                                            <span className="text-[9px] text-gray-400 font-mono font-bold">
                                                (Click to show details)
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-605 mt-1 leading-relaxed font-semibold break-words">
                                        {notification.message}
                                    </p>
                                </div>

                                {/* Time / Actions */}
                                <div className="flex items-center gap-3 shrink-0 self-center">
                                    <span className="text-[10px] text-gray-400 font-bold font-mono">
                                        {formatTimeAgo(notification.timestamp)}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeSingleNotification(notification.id);
                                        }}
                                        className="text-gray-400 hover:text-rose-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                                        title="Delete notification"
                                    >
                                        <i className="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </div>

                            {/* Details Drawer */}
                            {isExpanded && (
                                <div className="mt-4 pt-3 border-t border-gray-150 text-left space-y-2 animate-fade-in w-full text-xs" onClick={(e) => e.stopPropagation()}>
                                    <p className="font-bold text-gray-700">Notification Details:</p>
                                    
                                    {/* Task Metadata Info */}
                                    {notification.metadata && (
                                        <div className="bg-gray-50 p-2.5 rounded-lg font-mono text-[10px] text-gray-600 space-y-1">
                                            {notification.metadata.actionDetails && (
                                                <div><span className="font-bold">Action:</span> {notification.metadata.actionDetails}</div>
                                            )}
                                            {notification.metadata.sourcePath && (
                                                <div><span className="font-bold">Source Path:</span> {notification.metadata.sourcePath}</div>
                                            )}
                                            {notification.metadata.destinationPath && (
                                                <div><span className="font-bold">Destination Path:</span> {notification.metadata.destinationPath}</div>
                                            )}
                                            {notification.metadata.taskId && (
                                                <div className="text-gray-400"><span className="font-bold">Task ID:</span> {notification.metadata.taskId}</div>
                                            )}
                                            {notification.metadata.taskType && (
                                                <div><span className="font-bold">Task Type:</span> {notification.metadata.taskType}</div>
                                            )}
                                        </div>
                                    )}

                                    {/* Detailed Errors Section */}
                                    {taskId && (
                                        <div className="space-y-1">
                                            <p className="font-bold text-gray-500 text-[10px] uppercase tracking-wider">Detailed Execution Errors:</p>
                                            {isLoading ? (
                                                <div className="flex items-center gap-2 py-2 text-gray-500 font-semibold">
                                                    <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                                                    <span>Loading execution report...</span>
                                                </div>
                                            ) : (
                                                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                                                    {failures && failures.length > 0 ? (
                                                        failures.map((f, fIdx) => {
                                                            const filePath = f.filePath || f.sourcePath || f.path || f.originalPath || f.oldPath || "Unknown File";
                                                            const errorMsg = f.error || "Operation failed.";
                                                            return (
                                                                <div key={fIdx} className="bg-red-50/70 border border-red-100 p-2 rounded-lg text-[11px] text-red-800 flex flex-col gap-0.5">
                                                                    <span className="font-bold truncate text-[10px]" title={filePath}>{filePath}</span>
                                                                    <span className="text-[10px] text-red-600 font-medium">{errorMsg}</span>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="bg-emerald-50/70 border border-emerald-100 p-2.5 rounded-lg text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5">
                                                            <i className="fa-solid fa-circle-check text-emerald-600"></i>
                                                            No execution failures found. All items processed successfully.
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {filteredNotifications.length === 0 && (
                    <div className="text-center py-20 bg-white border border-gray-150 rounded-3xl shadow-sm">
                        <i className="fa-solid fa-bell-slash text-gray-300 text-4xl mb-3 block"></i>
                        <h4 className="text-sm font-extrabold text-gray-700">All Quiet Here</h4>
                        <p className="text-xs text-gray-400 mt-1 font-medium">No system notifications match the current search criteria.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
