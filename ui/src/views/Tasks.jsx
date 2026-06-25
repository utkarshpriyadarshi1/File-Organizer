import { TaskType, TaskStatus } from "../enums/SystemTypes";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useTasks } from "../services/TaskContext";
import GenericResultViewer from "../components/GenericResultViewer";
import { 
    Card, 
    Input, 
    Button, 
    Select, 
    Checkbox, 
    Progress, 
    Table, 
    Tag, 
    Badge, 
    Alert, 
    Spin, 
    Row, 
    Col, 
    Space,
    Typography
} from "antd";
import { 
    FolderOpenOutlined, 
    SafetyCertificateOutlined, 
    CopyOutlined, 
    SyncOutlined, 
    UnorderedListOutlined, 
    CheckCircleOutlined,
    CloseCircleOutlined,
    ClockCircleOutlined,
    SearchOutlined,
    ReloadOutlined,
    StopOutlined,
    InfoCircleOutlined,
    BanOutlined,
    FolderFilled,
    PlayCircleOutlined
} from "@ant-design/icons";

const { Text } = Typography;

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
                return <FolderOpenOutlined style={{ color: '#2563eb', marginRight: '6px' }} />;
            case TaskType.BACKUP:
                return <SafetyCertificateOutlined style={{ color: '#d97706', marginRight: '6px' }} />;
            case TaskType.DUPLICATE_SCAN:
                return <CopyOutlined style={{ color: '#e11d48', marginRight: '6px' }} />;
            case TaskType.SYNC:
                return <SyncOutlined style={{ color: '#0ea5e9', marginRight: '6px' }} />;
            case TaskType.RESTORE:
                return <SyncOutlined style={{ color: '#10b981', marginRight: '6px' }} />;
            default:
                return <UnorderedListOutlined style={{ color: '#64748b', marginRight: '6px' }} />;
        }
    };

    // Status styling mapping
    const getStatusColor = (status) => {
        switch (status) {
            case TaskStatus.COMPLETED:
                return "success";
            case TaskStatus.COMPLETED_WITH_FAILURES:
                return "warning";
            case TaskStatus.FAILED:
                return "error";
            case TaskStatus.CANCELED:
                return "default";
            case TaskStatus.RUNNING:
                return "processing";
            case TaskStatus.QUEUED:
                return "warning";
            default:
                return "default";
        }
    };

    const sortedActive = getSortedActiveTasks();
    const sortedHistory = getSortedHistoryTasks().slice(0, 1000);
    const allActiveVisibleSelected = sortedActive.length > 0 && sortedActive.every(t => selectedTasks.includes(t.id));

    const columns = [
        {
            title: <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operation</span>,
            dataIndex: 'taskType',
            key: 'taskType',
            render: (text) => (
                <span className="font-bold flex items-center text-slate-800 dark:text-slate-200">
                    {getTaskIcon(text)}
                    {text}
                </span>
            )
        },
        {
            title: <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>,
            dataIndex: 'status',
            key: 'status',
            render: (text) => {
                let icon = <InfoCircleOutlined />;
                if (text === TaskStatus.COMPLETED) icon = <CheckCircleOutlined />;
                else if (text === TaskStatus.FAILED) icon = <CloseCircleOutlined />;
                
                return (
                    <Tag icon={icon} color={getStatusColor(text)} className="font-bold uppercase text-[9px] rounded-full px-2 py-0.5 border-0">
                        {text.replace(/_/g, " ")}
                    </Tag>
                );
            }
        },
        {
            title: <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Summary</span>,
            dataIndex: 'summary',
            key: 'summary',
            render: (text, record) => (
                <div className="space-y-1">
                    {record.actionDetails ? (
                        <div className="font-bold text-slate-800 dark:text-slate-205 mb-0.5">{record.actionDetails}</div>
                    ) : (
                        <div className="text-slate-700 dark:text-slate-350">{text}</div>
                    )}
                    {record.sourcePath && (
                        <div className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 flex flex-wrap items-center gap-1.5 font-semibold">
                            <span className="text-slate-400">SRC:</span>
                            <span className="font-mono bg-slate-50 dark:bg-slate-850 px-1.5 py-0.2 rounded border border-slate-150 dark:border-slate-850 inline-block max-w-[200px] truncate" title={record.sourcePath}>{record.sourcePath}</span>
                            {record.destinationPath && (
                                <>
                                    <span className="text-slate-300">➔</span>
                                    <span className="text-slate-400">DEST:</span>
                                    <span className="font-mono bg-slate-50 dark:bg-slate-850 px-1.5 py-0.2 rounded border border-slate-150 dark:border-slate-850 inline-block max-w-[200px] truncate" title={record.destinationPath}>{record.destinationPath}</span>
                                </>
                            )}
                        </div>
                    )}
                    {record.actionDetails && text && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-0.5">{text}</div>
                    )}
                </div>
            )
        },
        {
            title: <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed At</span>,
            dataIndex: 'completedAt',
            key: 'completedAt',
            render: (text) => (
                <span className="text-slate-500 dark:text-slate-500 font-semibold flex items-center gap-1.5 text-xs">
                    <ClockCircleOutlined style={{ fontSize: '10px' }} />
                    {text ? new Date(text).toLocaleString() : "Running..."}
                </span>
            )
        }
    ];

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
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            {/* Active Task Control Center */}
            <Card 
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md rounded-2xl text-left"
                title={
                    <div className="flex justify-between items-center w-full py-1">
                        <div>
                            <span className="text-sm font-black text-slate-800 dark:text-slate-100 block leading-tight">Active Tasks</span>
                            <span className="text-[10px] text-slate-450 dark:text-slate-400 font-semibold block mt-0.5">Manage active or queued background operations</span>
                        </div>
                        <Space size={8}>
                            <Button 
                                onClick={() => {
                                    syncActiveTasks();
                                    fetchHistory();
                                }}
                                icon={<ReloadOutlined />}
                                className="h-8 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95"
                            >
                                Refresh All
                            </Button>
                            {selectedTasks.length > 0 && (
                                <Button 
                                    danger
                                    type="primary"
                                    onClick={handleBulkCancel}
                                    icon={<BanOutlined />}
                                    className="h-8 text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 border-0"
                                >
                                    Cancel Selected ({selectedTasks.length})
                                </Button>
                            )}
                        </Space>
                    </div>
                }
            >
                <div className="space-y-4">
                    {/* Filters and Sorting for Active Tasks */}
                    <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600 bg-slate-50/50 dark:bg-slate-850/30 p-3 rounded-xl border border-slate-150 dark:border-slate-800 justify-between items-center">
                        <div className="flex flex-wrap gap-3 items-center">
                            <span className="text-slate-450 dark:text-slate-500 uppercase text-[9px] tracking-wider font-bold">Filter By:</span>
                            <Select
                                onChange={(val) => setActiveFilter(val)}
                                value={activeFilter}
                                className="w-36 h-7 text-xs"
                                options={[
                                    { value: 'ALL', label: 'All Active' },
                                    { value: 'RUNNING', label: 'Running' },
                                    { value: 'QUEUED', label: 'Queued' },
                                    { value: TaskType.BACKUP, label: 'Backup' },
                                    { value: TaskType.DUPLICATE_SCAN, label: 'Duplicate Check' },
                                    { value: TaskType.ORGANIZE, label: 'Organizer' },
                                    { value: TaskType.SYNC, label: 'Sync' },
                                    { value: TaskType.RESTORE, label: 'Restore' },
                                ]}
                            />
                        </div>

                        <div className="flex flex-wrap gap-3 items-center">
                            <span className="text-slate-450 dark:text-slate-500 uppercase text-[9px] tracking-wider font-bold">Sort By:</span>
                            <Select
                                onChange={(val) => setActiveSort(val)}
                                value={activeSort}
                                className="w-48 h-7 text-xs"
                                options={[
                                    { value: 'timeDesc', label: 'Start Time: New to Old' },
                                    { value: 'timeAsc', label: 'Start Time: Old to New' },
                                    { value: 'type', label: 'Operation Type' },
                                ]}
                            />
                        </div>
                    </div>

                    {/* Active Tasks Queue */}
                    <div className="space-y-3">
                        {sortedActive.length > 0 && (
                            <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-850/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-505 select-none">
                                <Checkbox
                                    checked={allActiveVisibleSelected}
                                    onChange={() => toggleSelectAllActive(sortedActive)}
                                />
                                <span>Select All Visible Active ({sortedActive.length})</span>
                            </div>
                        )}

                        {sortedActive.map(task => (
                            <div
                                key={task.id}
                                className="flex justify-between items-center border border-slate-200 dark:border-slate-800 p-4 rounded-xl bg-slate-50/20 dark:bg-slate-900/10 hover:bg-slate-50 dark:hover:bg-slate-850/40 transition-all hover:shadow-sm duration-150"
                            >
                                <div className="flex items-center gap-3 flex-grow min-w-0">
                                    <Checkbox
                                        checked={selectedTasks.includes(task.id)}
                                        onChange={() => toggleActiveSelection(task.id)}
                                    />
                                    <div className="min-w-0 flex-grow pr-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center text-sm">
                                                {getTaskIcon(task.taskType)}
                                                {task.taskType}
                                            </span>
                                            <Tag color={getStatusColor(task.status)} className="font-bold border-0 uppercase text-[9px] rounded-full px-2 py-0.2">
                                                {task.status}
                                            </Tag>
                                        </div>
                                        {task.actionDetails && (
                                            <p className="text-xs text-slate-800 dark:text-slate-205 font-bold mt-1 m-0">
                                                <PlayCircleOutlined className="mr-1 text-slate-400" />
                                                {task.actionDetails}
                                            </p>
                                        )}
                                        {task.sourcePath && (
                                            <p className="text-[11px] text-slate-600 dark:text-slate-450 mt-1 flex items-center gap-1.5 m-0 font-semibold">
                                                <span className="font-semibold text-slate-400 dark:text-slate-500 text-[9px] uppercase">Src:</span>
                                                <span className="bg-slate-100 dark:bg-slate-850 px-1.5 py-0.2 rounded font-mono truncate max-w-sm inline-block">{task.sourcePath}</span>
                                            </p>
                                        )}
                                        {task.destinationPath && (
                                            <p className="text-[11px] text-slate-600 dark:text-slate-455 mt-0.5 flex items-center gap-1.5 m-0 font-semibold">
                                                <span className="font-semibold text-slate-400 dark:text-slate-500 text-[9px] uppercase">Dest:</span>
                                                <span className="bg-slate-100 dark:bg-slate-850 px-1.5 py-0.2 rounded font-mono truncate max-w-sm inline-block">{task.destinationPath}</span>
                                            </p>
                                        )}
                                        {!task.actionDetails && !task.sourcePath && !task.destinationPath && (
                                            <p className="text-[10px] text-slate-450 font-mono mt-1 truncate m-0">ID: {task.id || task.taskId}</p>
                                        )}
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium italic truncate m-0">{task.summary || task.message || "Working..."}</p>

                                        {/* Real-time Progress Bar */}
                                        {task.progress !== undefined && task.progress !== null && task.progress > 0 && (
                                            <div className="mt-2.5 max-w-md">
                                                <Progress percent={parseFloat(task.progress.toFixed(0))} strokeColor="#2563eb" size="small" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                                    <Tag color="cyan" className="font-bold border-0 text-[10px] px-3 py-0.8 rounded-full">
                                        Started: {new Date(task.createdAt).toLocaleTimeString()}
                                    </Tag>
                                </div>
                            </div>
                        ))}

                        {sortedActive.length === 0 && (
                            <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/40">
                                <CheckCircleOutlined style={{ fontSize: '28px', color: '#94a3b8' }} className="mb-2" />
                                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold m-0">No active background tasks matching filters.</p>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Execution & Notification History */}
            <Card 
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md rounded-2xl text-left"
                title={
                    <div className="py-1">
                        <span className="text-sm font-black text-slate-800 dark:text-slate-100 block leading-tight">Task History</span>
                        <span className="text-[10px] text-slate-450 dark:text-slate-400 font-semibold block mt-0.5">Review historical completed task logs and their results</span>
                    </div>
                }
            >
                <div className="space-y-4">
                    {/* Filters, Sorting, and Searching for History */}
                    <div className="space-y-3 bg-slate-50/50 dark:bg-slate-850/30 p-3.5 rounded-xl border border-slate-150 dark:border-slate-800">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                                prefix={<SearchOutlined />}
                                value={historySearch}
                                onChange={(e) => setHistorySearch(e.target.value)}
                                placeholder="Search by Task Summary or ID..."
                                className="h-9 text-xs rounded-xl flex-grow"
                                allowClear
                            />
                        </div>

                        <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600 justify-between items-center">
                            <div className="flex flex-wrap gap-3 items-center">
                                <span className="text-slate-450 dark:text-slate-550 uppercase text-[9px] tracking-wider font-bold">Filter Type:</span>
                                <Select
                                    onChange={(val) => setHistoryFilterType(val)}
                                    value={historyFilterType}
                                    className="w-32 h-7 text-xs"
                                    options={[
                                        { value: 'ALL', label: 'All Types' },
                                        { value: TaskType.ORGANIZE, label: 'Organizer' },
                                        { value: TaskType.BACKUP, label: 'Backup' },
                                        { value: TaskType.DUPLICATE_SCAN, label: 'Duplicate Check' },
                                        { value: TaskType.SYNC, label: 'Sync' },
                                        { value: TaskType.RESTORE, label: 'Restore' },
                                    ]}
                                />

                                <span className="text-slate-450 dark:text-slate-550 uppercase text-[9px] tracking-wider font-bold ml-2">Status:</span>
                                <Select
                                    onChange={(val) => setHistoryFilterStatus(val)}
                                    value={historyFilterStatus}
                                    className="w-48 h-7 text-xs"
                                    options={[
                                        { value: 'ALL', label: 'All Statuses' },
                                        { value: 'COMPLETED', label: 'Completed' },
                                        { value: 'COMPLETED_WITH_FAILURES', label: 'Completed with Failures' },
                                        { value: 'FAILED', label: 'Failed' },
                                        { value: 'CANCELED', label: 'Canceled' },
                                    ]}
                                />
                            </div>

                            <div className="flex flex-wrap gap-3 items-center">
                                <span className="text-slate-450 dark:text-slate-550 uppercase text-[9px] tracking-wider font-bold">Sort By:</span>
                                <Select
                                    onChange={(val) => setHistorySort(val)}
                                    value={historySort}
                                    className="w-48 h-7 text-xs"
                                    options={[
                                        { value: 'completedDesc', label: 'Date: Newest First' },
                                        { value: 'completedAsc', label: 'Date: Oldest First' },
                                        { value: 'type', label: 'Operation Type' },
                                        { value: 'status', label: 'Status' },
                                    ]}
                                />
                            </div>
                        </div>
                    </div>

                    {getSortedHistoryTasks().length > 1000 && (
                        <Alert 
                            message="Showing top 1000 completed tasks to prevent browser rendering lag. Please use searching or filters above to view other records." 
                            type="warning" 
                            showIcon 
                            className="rounded-xl"
                        />
                    )}

                    {/* History Table */}
                    <Table 
                        columns={columns} 
                        dataSource={sortedHistory} 
                        rowKey="id"
                        pagination={false}
                        size="small"
                        loading={historyLoading}
                        onRow={(record) => ({
                            onClick: () => setSelectedTask(record),
                            className: "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-805/50 transition-colors"
                        })}
                        className="text-xs"
                        locale={{
                            emptyText: (
                                <div className="py-12 text-slate-400">
                                    <FolderOpenOutlined style={{ fontSize: '32px', opacity: 0.5 }} className="mb-2 block mx-auto" />
                                    No historical task executions match filters.
                                </div>
                            )
                        }}
                    />
                </div>
            </Card>
        </div>
    );
};

export default Tasks;
