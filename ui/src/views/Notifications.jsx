import React, { useState, useEffect } from "react";
import { useTasks } from "../services/TaskContext";
import axios from "axios";
import { Card, Input, Button, Badge, Spin, Alert, List, Space, Typography, Row, Col } from "antd";
import { 
    BellOutlined,
    SearchOutlined,
    DeleteOutlined,
    CheckCircleFilled,
    CloseCircleFilled,
    ExclamationCircleFilled,
    InfoCircleFilled,
    FileTextOutlined,
    ArrowRightOutlined,
    CheckCircleOutlined
} from "@ant-design/icons";

const { Text } = Typography;

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
                    bg: "bg-emerald-50/30 hover:bg-emerald-50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-950",
                    icon: <CheckCircleFilled style={{ color: '#10b981' }} />,
                    tagColor: "success"
                };
            case "error":
                return {
                    bg: "bg-rose-50/30 hover:bg-rose-50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-950",
                    icon: <CloseCircleFilled style={{ color: '#ef4444' }} />,
                    tagColor: "error"
                };
            case "warning":
                return {
                    bg: "bg-amber-50/30 hover:bg-amber-50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-950",
                    icon: <ExclamationCircleFilled style={{ color: '#f59e0b' }} />,
                    tagColor: "warning"
                };
            default:
                return {
                    bg: "bg-blue-50/30 hover:bg-blue-50 dark:bg-blue-950/10 border-blue-100 dark:border-blue-950",
                    icon: <InfoCircleFilled style={{ color: '#3b82f6' }} />,
                    tagColor: "processing"
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
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            {/* Metrics Grid */}
            <Row gutter={[12, 12]}>
                <Col xs={12} md={5}>
                    <Card bodyStyle={{ padding: '12px' }} className="rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm text-left">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Received</span>
                        <span className="text-lg font-black text-slate-800 dark:text-slate-205 block mt-0.5">{stats.total}</span>
                    </Card>
                </Col>
                <Col xs={12} md={5}>
                    <Card bodyStyle={{ padding: '12px' }} className="rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm text-left">
                        <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-wider block">Success Actions</span>
                        <span className="text-lg font-black text-emerald-600 block mt-0.5">{stats.success}</span>
                    </Card>
                </Col>
                <Col xs={12} md={5}>
                    <Card bodyStyle={{ padding: '12px' }} className="rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm text-left">
                        <span className="text-[9px] font-extrabold text-rose-600 uppercase tracking-wider block">Failures/Errors</span>
                        <span className="text-lg font-black text-rose-650 block mt-0.5">{stats.error}</span>
                    </Card>
                </Col>
                <Col xs={12} md={5}>
                    <Card bodyStyle={{ padding: '12px' }} className="rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm text-left">
                        <span className="text-[9px] font-extrabold text-amber-600 uppercase tracking-wider block">System Warnings</span>
                        <span className="text-lg font-black text-amber-650 block mt-0.5">{stats.warning}</span>
                    </Card>
                </Col>
                <Col xs={24} md={4}>
                    <Card bodyStyle={{ padding: '12px' }} className="rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm text-left h-full">
                        <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider block">Info Updates</span>
                        <span className="text-lg font-black text-blue-650 block mt-0.5">{stats.info}</span>
                    </Card>
                </Col>
            </Row>

            {/* Search and Filters */}
            <Card bodyStyle={{ padding: '12px 16px' }} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between text-left">
                    {/* Search Bar */}
                    <Input 
                        prefix={<SearchOutlined className="text-slate-400 text-xs mr-1" />}
                        placeholder="Search by notification content..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="text-xs rounded-xl w-full md:max-w-md h-9"
                        allowClear
                    />

                    {/* Filter & Actions Wrapper */}
                    <div className="flex flex-wrap gap-2.5 items-center w-full md:w-auto shrink-0 justify-between md:justify-end">
                        {/* Filter Tabs */}
                        <div className="flex gap-1 overflow-x-auto">
                            {["ALL", "INFO", "SUCCESS", "WARNING", "ERROR"].map(type => (
                                <Button
                                    key={type}
                                    size="small"
                                    onClick={() => setFilter(type)}
                                    type={filter === type ? "primary" : "default"}
                                    className={`text-[9px] font-bold h-7 rounded-lg ${filter === type ? "border-0" : "text-slate-500 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"}`}
                                >
                                    {type}
                                </Button>
                            ))}
                        </div>

                        {/* Action button */}
                        <Button
                            danger
                            onClick={clearAllNotifications}
                            disabled={notificationsHistory.length === 0}
                            icon={<DeleteOutlined />}
                            size="small"
                            className="text-[10px] font-bold h-7 rounded-lg flex items-center shadow-sm"
                        >
                            Clear History
                        </Button>
                    </div>
                </div>
            </Card>

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
                            className={`flex flex-col p-4 rounded-2xl border transition-all relative group shadow-sm cursor-pointer ${styles.bg} ${!notification.read ? "ring-1 ring-blue-500/20 shadow-blue-500/5 font-semibold border-blue-200 dark:border-blue-900" : "border-slate-100 dark:border-slate-800/80"}`}
                        >
                            <div className="flex items-start gap-4 w-full">
                                {/* Icon Indicator */}
                                <div className="text-lg shrink-0 mt-0.5">
                                    {styles.icon}
                                </div>

                                {/* Message Content */}
                                <div className="flex-grow min-w-0 pr-6 text-left">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                            {notification.title || "System Message"}
                                        </span>
                                        <Tag color={styles.tagColor} className="font-bold border-0 uppercase text-[8px] rounded-full px-2 py-0.2 m-0">
                                            {notification.type}
                                        </Tag>
                                        {!notification.read && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" title="Unread"></span>
                                        )}
                                        {notification.metadata && (
                                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono font-bold">
                                                (Click to show details)
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed font-semibold break-words m-0">
                                        {notification.message}
                                    </p>
                                </div>

                                {/* Time / Actions */}
                                <div className="flex items-center gap-3 shrink-0 self-center">
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold font-mono">
                                        {formatTimeAgo(notification.timestamp)}
                                    </span>
                                    <Button
                                        size="small"
                                        type="text"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeSingleNotification(notification.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 h-6 w-6 rounded-lg flex items-center justify-center shrink-0"
                                        title="Delete notification"
                                    />
                                </div>
                            </div>

                            {/* Details Drawer */}
                            {isExpanded && (
                                <div className="mt-4 pt-3 border-t border-slate-150 dark:border-slate-800 text-left space-y-3 animate-fade-in w-full text-xs" onClick={(e) => e.stopPropagation()}>
                                    <p className="font-bold text-slate-700 dark:text-slate-300 m-0">Notification Details:</p>
                                    
                                    {/* Task Metadata Info */}
                                    {notification.metadata && (
                                        <div className="bg-slate-50 dark:bg-slate-850/50 p-3 rounded-lg font-mono text-[10px] text-slate-600 dark:text-slate-400 space-y-1">
                                            {notification.metadata.actionDetails && (
                                                <div><span className="font-bold text-slate-400 dark:text-slate-500 mr-1.5">Action:</span> {notification.metadata.actionDetails}</div>
                                            )}
                                            {notification.metadata.sourcePath && (
                                                <div><span className="font-bold text-slate-400 dark:text-slate-500 mr-1.5">Source Path:</span> {notification.metadata.sourcePath}</div>
                                            )}
                                            {notification.metadata.destinationPath && (
                                                <div><span className="font-bold text-slate-400 dark:text-slate-500 mr-1.5">Destination Path:</span> {notification.metadata.destinationPath}</div>
                                            )}
                                            {notification.metadata.taskId && (
                                                <div><span className="font-bold text-slate-400 dark:text-slate-505 mr-1.5">Task ID:</span> {notification.metadata.taskId}</div>
                                            )}
                                            {notification.metadata.taskType && (
                                                <div><span className="font-bold text-slate-400 dark:text-slate-500 mr-1.5">Task Type:</span> {notification.metadata.taskType}</div>
                                            )}
                                        </div>
                                    )}

                                    {/* Detailed Errors Section */}
                                    {taskId && (
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Detailed Execution Errors:</span>
                                            {isLoading ? (
                                                <div className="flex items-center gap-2 py-2 text-slate-500 font-semibold">
                                                    <Spin size="small" />
                                                    <span>Loading execution report...</span>
                                                </div>
                                            ) : (
                                                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                                                    {failures && failures.length > 0 ? (
                                                        failures.map((f, fIdx) => {
                                                            const filePath = f.filePath || f.sourcePath || f.path || f.originalPath || f.oldPath || "Unknown File";
                                                            const errorMsg = f.error || "Operation failed.";
                                                            return (
                                                                <div key={fIdx} className="bg-red-50/30 dark:bg-rose-950/10 border border-red-100 dark:border-rose-950/50 p-2.5 rounded-lg text-[11px] text-red-800 dark:text-red-400 flex flex-col gap-0.5">
                                                                    <span className="font-bold truncate text-[10px]" title={filePath}>{filePath}</span>
                                                                    <span className="text-[10px] text-red-650 dark:text-red-400/80 font-semibold">{errorMsg}</span>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <Alert 
                                                            message="No execution failures found. All items processed successfully."
                                                            type="success"
                                                            showIcon
                                                            className="rounded-lg p-2 text-xs"
                                                        />
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
                    <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl shadow-sm">
                        <BellOutlined style={{ fontSize: '36px', color: '#94a3b8' }} className="mb-2 block mx-auto opacity-60" />
                        <span className="text-sm font-extrabold text-slate-700 dark:text-slate-300 block">All Quiet Here</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-semibold block">No system notifications match the current search criteria.</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
