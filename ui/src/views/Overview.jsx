import { TaskType, TaskStatus } from "../enums/SystemTypes";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useTasks } from "../services/TaskContext";
import GenericResultViewer from "../components/GenericResultViewer";
import {
    Card,
    Row,
    Col,
    Input,
    Button,
    Table,
    Tag,
    Progress,
    Spin,
    Badge,
    Typography,
    Statistic
} from "../components/common";
import {
    SyncOutlined,
    FolderOpenOutlined,
    CopyOutlined,
    SafetyCertificateOutlined,
    UnorderedListOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ClockCircleOutlined,
    PieChartOutlined,
    ThunderboltOutlined,
    FireOutlined,
    InfoCircleOutlined
} from "@ant-design/icons";

const { Text } = Typography;

const Overview = ({ setActiveTab }) => {
    const { addToast, selectFolder } = useTasks();
    const [stats, setStats] = useState({
        activeCount: 0,
        syncCount: 0,
        historyCount: 0,
        reportsCache: { size: "0 B", count: 0 },
        tempCache: { size: "0 B", count: 0 },
        logsCache: { size: "0 B", count: 0 }
    });
    const [recentLogs, setRecentLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isOnline, setIsOnline] = useState(true);

    // Storage Analyzer states
    const [analyzerPath, setAnalyzerPath] = useState("");
    const [analysisResult, setAnalysisResult] = useState(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);

    const selectAnalyzerFolder = async () => {
        console.log("[Overview] Prompting user to select folder for analyzer...");
        const selectedFolder = await selectFolder();
        if (selectedFolder) {
            console.log(`[Overview] Analyzer folder selected: "${selectedFolder}"`);
            setAnalyzerPath(selectedFolder);
        }
    };

    const runDirectoryAnalysis = async () => {
        if (!analyzerPath) {
            alert("Please select a directory first.");
            return;
        }
        console.log(`[Overview] Starting analysis on folder: "${analyzerPath}"`);
        setAnalysisLoading(true);
        try {
            const res = await axios.get(`http://localhost:8080/api/analysis/directory?folderPath=${encodeURIComponent(analyzerPath)}`);
            console.info("[Overview] Successfully completed analysis.", res.data);
            setAnalysisResult(res.data);
        } catch (err) {
            console.error("[Overview] Failed to run directory size breakdown:", err);
            addToast("Failed to analyze directory.", "error");
        } finally {
            setAnalysisLoading(false);
        }
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const loadDashboardData = async (isBackground = false) => {
        if (!isBackground) {
            setLoading(true);
        }
        try {
            const [activeRes, historyRes, syncRes, cacheRes] = await Promise.all([
                axios.get("http://localhost:8080/api/tasks/active"),
                axios.get("http://localhost:8080/api/tasks/history"),
                axios.get("http://localhost:8080/api/sync/jobs"),
                axios.get("http://localhost:8080/api/settings/cache")
            ]);

            // Sort and grab top 5 recent tasks
            const sortedHistory = [...historyRes.data].sort((a, b) =>
                new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt)
            );
            setRecentLogs(sortedHistory.slice(0, 5));

            // Map cache directories
            let reports = { size: "0 B", count: 0 };
            let temp = { size: "0 B", count: 0 };
            let logs = { size: "0 B", count: 0 };

            if (Array.isArray(cacheRes.data)) {
                cacheRes.data.forEach(folder => {
                    const mapped = {
                        size: folder.sizeFormatted || `${(folder.totalSize / 1024).toFixed(1)} KB`,
                        count: folder.fileCount
                    };
                    if (folder.folderName === "reports") reports = mapped;
                    if (folder.folderName === "temp") temp = mapped;
                    if (folder.folderName === "logs") logs = mapped;
                });
            }

            setStats({
                activeCount: activeRes.data.length,
                syncCount: syncRes.data.length,
                historyCount: historyRes.data.length,
                reportsCache: reports,
                tempCache: temp,
                logsCache: logs
            });
            setIsOnline(true);
        } catch (e) {
            console.error("[DashboardOverview] Failed to load statistics.", e);
            setIsOnline(false);
        } finally {
            if (!isBackground) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        loadDashboardData();

        axios.get("http://localhost:8080/api/settings/default-path")
            .then(res => {
                if (res.data.defaultPath) {
                    setAnalyzerPath(res.data.defaultPath);
                }
            })
            .catch(err => console.error("[Overview] Failed to fetch default path:", err));

        // Poll every 5 seconds to keep dashboard stats and connection state synchronized
        const interval = setInterval(() => {
            loadDashboardData(true);
        }, 5000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getTaskIcon = (taskType) => {
        switch (taskType) {
            case TaskType.ORGANIZE: return <FolderOpenOutlined style={{ color: '#2563eb', marginRight: '6px' }} />;
            case TaskType.BACKUP: return <SafetyCertificateOutlined style={{ color: '#d97706', marginRight: '6px' }} />;
            case TaskType.DUPLICATE_SCAN: return <CopyOutlined style={{ color: '#e11d48', marginRight: '6px' }} />;
            case TaskType.SYNC: return <SyncOutlined style={{ color: '#0ea5e9', marginRight: '6px' }} />;
            case TaskType.RESTORE: return <SyncOutlined style={{ color: '#10b981', marginRight: '6px' }} />;
            default: return <UnorderedListOutlined style={{ color: '#64748b', marginRight: '6px' }} />;
        }
    };

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
                let color = "processing";
                let icon = <InfoCircleOutlined />;
                if (text === TaskStatus.COMPLETED) {
                    color = "success";
                    icon = <CheckCircleOutlined />;
                } else if (text === TaskStatus.FAILED) {
                    color = "error";
                    icon = <CloseCircleOutlined />;
                } else if (text === TaskStatus.CANCELED) {
                    color = "default";
                    icon = <InfoCircleOutlined />;
                } else if (text === TaskStatus.COMPLETED_WITH_FAILURES) {
                    color = "warning";
                    icon = <InfoCircleOutlined />;
                }
                return (
                    <Tag icon={icon} color={color} className="font-bold uppercase text-[9px] rounded-full px-2 py-0.5 border-0">
                        {text.replace(/_/g, " ")}
                    </Tag>
                );
            }
        },
        {
            title: <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Execution Summary</span>,
            dataIndex: 'summary',
            key: 'summary',
            render: (text) => <span className="text-slate-600 dark:text-slate-400 font-medium">{text}</span>
        },
        {
            title: <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed Time</span>,
            dataIndex: 'completedAt',
            key: 'completedAt',
            render: (text) => (
                <span className="text-slate-500 font-semibold flex items-center gap-1.5 text-xs">
                    <ClockCircleOutlined style={{ fontSize: '10px' }} />
                    {text ? new Date(text).toLocaleString() : "Unknown"}
                </span>
            )
        }
    ];

    if (selectedTask) {
        return (
            <GenericResultViewer
                task={selectedTask}
                onClose={() => {
                    setSelectedTask(null);
                    loadDashboardData();
                }}
            />
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
                <Spin size="large" />
                <p className="text-gray-500 text-xs font-semibold">Synchronizing Dashboard Metrics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto">

            {/* Hero Welcome Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 shadow-2xl shadow-indigo-500/20 p-8 sm:p-10 border border-white/10">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-black/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2 drop-shadow-md">Welcome back!</h1>
                        <p className="text-indigo-50 font-semibold text-sm sm:text-base max-w-lg opacity-90">
                            Your workspace is {isOnline ? "online and connected" : "offline"}. Ready to organize, analyze, and optimize your files today?
                        </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 shadow-inner hover:bg-white/20 transition-colors cursor-default">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
                        <span className="text-white font-bold text-sm tracking-wider uppercase">System Healthy</span>
                    </div>
                </div>
            </div>

            {/* Ant Design KPI Cards Grid */}
            <Row gutter={[24, 24]}>
                <Col xs={24} sm={12}>
                    <Card
                        hoverable
                        onClick={() => setActiveTab("tasks")}
                        className="rounded-3xl border border-white/60 dark:border-slate-700/50 shadow-xl shadow-slate-200/50 dark:shadow-none cursor-pointer bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 group overflow-hidden relative"
                        bodyStyle={{ padding: '28px' }}
                    >
                        <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-500 pointer-events-none"></div>
                        <div className="flex justify-between items-center relative z-10">
                            <div>
                                <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block drop-shadow-sm">Active Operations</span>
                                <Statistic value={stats.activeCount} className="mt-2" valueStyle={{ fontSize: '36px', fontWeight: '900', color: 'inherit', letterSpacing: '-0.03em' }} />
                                <span className="text-xs text-slate-500 font-bold mt-1 block">Currently running tasks</span>
                            </div>
                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/60 dark:to-indigo-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300 ${stats.activeCount > 0 ? "animate-spin" : ""}`}>
                                <SyncOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12}>
                    <Card
                        hoverable
                        onClick={() => setActiveTab("tasks")}
                        className="rounded-3xl border border-white/60 dark:border-slate-700/50 shadow-xl shadow-slate-200/50 dark:shadow-none cursor-pointer bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10 group overflow-hidden relative"
                        bodyStyle={{ padding: '28px' }}
                    >
                        <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-500 pointer-events-none"></div>
                        <div className="flex justify-between items-center relative z-10">
                            <div>
                                <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block drop-shadow-sm">Processed Runs</span>
                                <Statistic value={stats.historyCount} className="mt-2" valueStyle={{ fontSize: '36px', fontWeight: '900', color: 'inherit', letterSpacing: '-0.03em' }} />
                                <span className="text-xs text-slate-500 font-bold mt-1 block">Completed operations</span>
                            </div>
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/60 dark:to-purple-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300">
                                <UnorderedListOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Redesigned Disk Space & File Type Analyzer */}
            <Card
                className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-white/50 dark:border-slate-800/80 shadow-2xl shadow-indigo-500/5 rounded-3xl overflow-hidden"
                title={
                    <div className="flex items-center gap-4 py-2">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-sky-100 dark:from-indigo-900/60 dark:to-sky-900/60 text-indigo-500 flex items-center justify-center text-xl shadow-inner">
                            <PieChartOutlined />
                        </div>
                        <div>
                            <span className="text-base font-black text-slate-800 dark:text-slate-100 block leading-tight tracking-tight">Disk Space & File Type Analyzer</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block mt-1">Crawl and classify files in any local directory to visualize space utilization</span>
                        </div>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                            value={analyzerPath}
                            readOnly
                            placeholder="Select a folder to analyze..."
                            className="bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 flex-grow font-mono font-bold text-slate-700 dark:text-slate-200 hover:border-slate-350"
                        />
                        <div className="flex gap-2">
                            <Button
                                onClick={selectAnalyzerFolder}
                                icon={<FolderOpenOutlined />}
                                className="h-full border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95"
                            >
                                Select Folder
                            </Button>
                            <Button
                                type="primary"
                                onClick={runDirectoryAnalysis}
                                loading={analysisLoading}
                                className="h-full bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-500/10 active:scale-95 border-0"
                            >
                                {analysisLoading ? "Analyzing..." : "Analyze Storage"}
                            </Button>
                        </div>
                    </div>

                    {analysisLoading && (
                        <div className="py-8 flex flex-col items-center justify-center space-y-3 bg-slate-50/50 dark:bg-slate-855/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <Spin />
                            <p className="text-[10px] text-slate-400 font-bold">Crawling directory contents and compiling stats...</p>
                        </div>
                    )}

                    {analysisResult && !analysisLoading && (
                        <div className="p-4 bg-slate-50/50 dark:bg-slate-850/30 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                                <div>
                                    <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Scanned Path</span>
                                    <Text code className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono mt-0.5 truncate max-w-md lg:max-w-2xl block" title={analysisResult.folderPath}>{analysisResult.folderPath}</Text>
                                </div>
                                <div className="flex gap-4 shrink-0">
                                    <div>
                                        <span className="text-[9px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-wider md:text-right block">Total Size</span>
                                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 md:text-right block">{formatBytes(analysisResult.totalSize)}</span>
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-wider md:text-right block">Files Count</span>
                                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 md:text-right block">{analysisResult.totalFiles} files</span>
                                    </div>
                                </div>
                            </div>

                            {/* Visual breakdown list */}
                            <Row gutter={[12, 12]}>
                                {Object.entries(analysisResult.categories).map(([catName, catStats]) => {
                                    const sizePercentage = analysisResult.totalSize > 0
                                        ? ((catStats.totalSize / analysisResult.totalSize) * 100)
                                        : 0;

                                    let progressColor = "#3b82f6";
                                    let iconClass = "fa-solid fa-file text-slate-500";
                                    let bgIconColor = "bg-slate-100 dark:bg-slate-800/40";

                                    if (catName === "Images") {
                                        progressColor = "#f43f5e";
                                        iconClass = "fa-solid fa-image text-rose-500";
                                        bgIconColor = "bg-rose-50 dark:bg-rose-950/20";
                                    } else if (catName === "Media") {
                                        progressColor = "#a855f7";
                                        iconClass = "fa-solid fa-film text-purple-500";
                                        bgIconColor = "bg-purple-50 dark:bg-purple-950/20";
                                    } else if (catName === "Documents") {
                                        progressColor = "#0ea5e9";
                                        iconClass = "fa-solid fa-file-invoice text-sky-500";
                                        bgIconColor = "bg-sky-50 dark:bg-sky-950/20";
                                    } else if (catName === "Archives") {
                                        progressColor = "#f59e0b";
                                        iconClass = "fa-solid fa-file-zipper text-amber-500";
                                        bgIconColor = "bg-amber-50 dark:bg-amber-950/20";
                                    } else if (catName === "Code/Text") {
                                        progressColor = "#10b981";
                                        iconClass = "fa-solid fa-code text-emerald-500";
                                        bgIconColor = "bg-emerald-50 dark:bg-emerald-950/20";
                                    }

                                    return (
                                        <Col xs={24} sm={12} lg={8} key={catName}>
                                            <Card
                                                hoverable
                                                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl"
                                                bodyStyle={{ padding: '12px 14px' }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-xl ${bgIconColor} flex items-center justify-center text-base shrink-0 shadow-inner`}>
                                                        <i className={iconClass}></i>
                                                    </div>
                                                    <div className="flex-grow min-w-0">
                                                        <div className="flex justify-between items-center text-[11px] font-extrabold text-slate-800 dark:text-slate-200">
                                                            <span>{catName}</span>
                                                            <span>{formatBytes(catStats.totalSize)}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[9px] text-slate-400 dark:text-slate-505 font-semibold mt-0.5">
                                                            <span>{catStats.fileCount} files</span>
                                                            <span>{sizePercentage.toFixed(1)}%</span>
                                                        </div>
                                                        <Progress
                                                            percent={parseFloat(sizePercentage.toFixed(1))}
                                                            showInfo={false}
                                                            strokeColor={progressColor}
                                                            size="small"
                                                            style={{ marginTop: '6px' }}
                                                        />
                                                    </div>
                                                </div>
                                            </Card>
                                        </Col>
                                    );
                                })}
                            </Row>
                        </div>
                    )}
                </div>
            </Card>

            {/* Lower Grid: Completed Runs on Left, Quick Shortcuts on Right */}
            <Row gutter={[24, 24]}>
                {/* Recent Completed Runs Table (2/3 width) */}
                <Col xs={24} lg={16}>
                    <Card
                        className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-white/50 dark:border-slate-800/80 shadow-2xl shadow-indigo-500/5 rounded-3xl h-full"
                        title={
                            <div className="flex items-center justify-between w-full py-2">
                                <div>
                                    <span className="text-base font-black text-slate-800 dark:text-slate-100 block leading-tight tracking-tight">Recent Completed Runs</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block mt-1">Click on any record to view its detailed changes report</span>
                                </div>
                                <Button
                                    size="small"
                                    type="link"
                                    onClick={() => setActiveTab("tasks")}
                                    className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2.5 h-7 rounded-lg shadow-inner flex items-center"
                                >
                                    View Full History
                                </Button>
                            </div>
                        }
                    >
                        <Table
                            columns={columns}
                            dataSource={recentLogs}
                            rowKey="id"
                            pagination={false}
                            size="small"
                            onRow={(record) => ({
                                onClick: () => setSelectedTask(record),
                                className: "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                            })}
                            className="text-xs"
                            locale={{
                                emptyText: (
                                    <div className="py-6 text-slate-400">
                                        <i className="fa-solid fa-folder-open text-xl mb-1 block"></i>
                                        No recent completed operations discovered.
                                    </div>
                                )
                            }}
                        />
                    </Card>
                </Col>

                {/* Quick Shortcuts Grid (1/3 width) */}
                <Col xs={24} lg={8}>
                    <Card
                        className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-white/50 dark:border-slate-800/80 shadow-2xl shadow-amber-500/5 rounded-3xl h-full"
                        title={
                            <div className="flex items-center gap-4 py-2">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60 text-amber-500 flex items-center justify-center text-xl shadow-inner">
                                    <ThunderboltOutlined />
                                </div>
                                <div>
                                    <span className="text-base font-black text-slate-800 dark:text-slate-100 block leading-tight tracking-tight">Quick Shortcuts</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block mt-1">Quick access to essential modules</span>
                                </div>
                            </div>
                        }
                    >
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={() => setActiveTab("organizer")}
                                className="p-4 bg-white/50 hover:bg-blue-50 dark:bg-slate-800/30 dark:hover:bg-blue-900/20 border border-white/60 dark:border-slate-700/50 hover:border-blue-200 dark:hover:border-blue-800/50 rounded-2xl text-left transition-all duration-300 active:scale-95 cursor-pointer group flex items-center gap-4 w-full shadow-sm hover:shadow-md"
                            >
                                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-base shrink-0 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-inner">
                                    <FolderOpenOutlined />
                                </div>
                                <div>
                                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">File Organizer</span>
                                    <span className="text-[10px] text-slate-500 block font-semibold mt-0.5">Reorganize directory tree structure</span>
                                </div>
                            </button>

                            <button
                                onClick={() => setActiveTab("backup")}
                                className="p-4 bg-white/50 hover:bg-amber-50 dark:bg-slate-800/30 dark:hover:bg-amber-900/20 border border-white/60 dark:border-slate-700/50 hover:border-amber-200 dark:hover:border-amber-800/50 rounded-2xl text-left transition-all duration-300 active:scale-95 cursor-pointer group flex items-center gap-4 w-full shadow-sm hover:shadow-md"
                            >
                                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center text-base shrink-0 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-inner">
                                    <SafetyCertificateOutlined />
                                </div>
                                <div>
                                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">Backup & Restore</span>
                                    <span className="text-[10px] text-slate-500 block font-semibold mt-0.5">Safeguard directories offline</span>
                                </div>
                            </button>

                            <button
                                onClick={() => setActiveTab("duplicates")}
                                className="p-4 bg-white/50 hover:bg-rose-50 dark:bg-slate-800/30 dark:hover:bg-rose-900/20 border border-white/60 dark:border-slate-700/50 hover:border-rose-200 dark:hover:border-rose-800/50 rounded-2xl text-left transition-all duration-300 active:scale-95 cursor-pointer group flex items-center gap-4 w-full shadow-sm hover:shadow-md"
                            >
                                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center text-base shrink-0 group-hover:scale-110 group-hover:bg-rose-500 group-hover:text-white transition-all duration-300 shadow-inner">
                                    <CopyOutlined />
                                </div>
                                <div>
                                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">Duplicate Cleaner</span>
                                    <span className="text-[10px] text-slate-500 block font-semibold mt-0.5">Scan and resolve duplicate files</span>
                                </div>
                            </button>

                            <button
                                onClick={() => setActiveTab("sync")}
                                className="p-4 bg-white/50 hover:bg-emerald-50 dark:bg-slate-800/30 dark:hover:bg-emerald-900/20 border border-white/60 dark:border-slate-700/50 hover:border-emerald-200 dark:hover:border-emerald-800/50 rounded-2xl text-left transition-all duration-300 active:scale-95 cursor-pointer group flex items-center gap-4 w-full shadow-sm hover:shadow-md"
                            >
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-base shrink-0 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 shadow-inner">
                                    <SyncOutlined />
                                </div>
                                <div>
                                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">Sync Directories</span>
                                    <span className="text-[10px] text-slate-500 block font-semibold mt-0.5">Mirror two folder locations</span>
                                </div>
                            </button>
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Overview;
