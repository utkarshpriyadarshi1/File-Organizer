import React, { useState, useEffect } from "react";
import axios from "axios";
import { Modal } from "antd";
import { useTasks } from "../services/TaskContext";
import { Card, Button, Row, Col, Progress, Spin, Typography, Table } from "./common";
import { PieChartOutlined } from "@ant-design/icons";
import { TaskType, TaskStatus } from "../enums/SystemTypes";

const { Text } = Typography;

const formatBytes = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const DiskAnalyzer = ({ targetPath, externalAnalysisTaskId }) => {
    const { addToast, activeTasks, syncActiveTasks } = useTasks();
    const [analysisTaskId, setAnalysisTaskId] = useState(null);
    const [lastCompletedTaskId, setLastCompletedTaskId] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);

    useEffect(() => {
        if (externalAnalysisTaskId) {
            setAnalysisTaskId(externalAnalysisTaskId);
            setLastCompletedTaskId(externalAnalysisTaskId);
            setAnalysisLoading(true);
        }
    }, [externalAnalysisTaskId]);
    
    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [filesData, setFilesData] = useState([]);
    const [filesLoading, setFilesLoading] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });

    const activeTask = analysisTaskId ? activeTasks[analysisTaskId] : null;
    const isRunning = activeTask && (activeTask.status === TaskStatus.RUNNING || activeTask.status === TaskStatus.QUEUED);

    useEffect(() => {
        if (analysisTaskId && activeTask && !isRunning) {
            if (activeTask.status === TaskStatus.COMPLETED) {
                fetchTaskResult(analysisTaskId);
            } else if (activeTask.status === TaskStatus.FAILED) {
                addToast("Disk Analysis failed.", "error");
                setAnalysisLoading(false);
                setAnalysisTaskId(null);
            } else {
                setAnalysisLoading(false);
                setAnalysisTaskId(null);
            }
        }
    }, [activeTask, analysisTaskId, isRunning]);

    // Analysis task is now triggered by Organizer.jsx

    const fetchTaskResult = async (taskId) => {
        try {
            const res = await axios.get(`http://localhost:8080/api/tasks/${taskId}/results`);
            if (res.data && res.data.length > 0) {
                setAnalysisResult(res.data[0]);
            }
        } catch (err) {
            console.error("Failed to fetch task result", err);
            addToast("Failed to fetch results", "error");
        } finally {
            setAnalysisLoading(false);
            setAnalysisTaskId(null);
        }
    };

    const fetchCategoryFiles = async (category, page = 0, size = 50) => {
        if (!lastCompletedTaskId) return;
        setFilesLoading(true);
        try {
            const res = await axios.get(`http://localhost:8080/api/analysis/${lastCompletedTaskId}/files?category=${encodeURIComponent(category)}&page=${page}&size=${size}`);
            setFilesData(res.data.content);
            setPagination({
                current: page + 1,
                pageSize: size,
                total: res.data.totalElements
            });
        } catch (err) {
            console.error("Failed to fetch category files", err);
            addToast("Failed to load category files", "error");
        } finally {
            setFilesLoading(false);
        }
    };

    const handleCategoryClick = (category) => {
        setSelectedCategory(category);
        setModalVisible(true);
        fetchCategoryFiles(category, 0, pagination.pageSize);
    };

    const handleTableChange = (pag) => {
        fetchCategoryFiles(selectedCategory, pag.current - 1, pag.pageSize);
    };

    const columns = [
        {
            title: 'File Path',
            dataIndex: 'filePath',
            key: 'filePath',
            render: (text) => <Text code className="text-xs truncate max-w-lg block" title={text}>{text}</Text>
        },
        {
            title: 'Size',
            dataIndex: 'size',
            key: 'size',
            width: 120,
            render: (val) => <span className="font-semibold text-slate-700">{formatBytes(val)}</span>
        },
        {
            title: 'Modified At',
            dataIndex: 'modifiedAt',
            key: 'modifiedAt',
            width: 160,
            render: (val) => <span className="text-xs text-slate-500">{new Date(val).toLocaleString()}</span>
        }
    ];

    return (
        <div className="space-y-6">
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
                    <p className="text-xs text-slate-500 font-medium">Use the "Dry Run" or "Start Action" buttons above to analyze your disk space. Results will appear here once the scan completes.</p>

                    {(analysisLoading || isRunning) && (
                        <div className="py-8 flex flex-col items-center justify-center space-y-3 bg-slate-50/50 dark:bg-slate-855/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                            {activeTask && activeTask.progress !== undefined ? (
                                <div className="w-full max-w-md px-6 text-center">
                                    <Progress percent={parseFloat(activeTask.progress.toFixed(0))} strokeColor="#4f46e5" />
                                    <p className="text-xs font-semibold text-slate-500 mt-2">{activeTask.summary || "Scanning directory..."}</p>
                                </div>
                            ) : (
                                <>
                                    <Spin />
                                    <p className="text-[10px] text-slate-400 font-bold">Crawling directory contents and compiling stats...</p>
                                </>
                            )}
                        </div>
                    )}

                    {analysisResult && !isRunning && (
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
                                    let iconClass = "fa-solid fa-folder text-slate-500";
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
                                    } else {
                                        const hash = catName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                        const palettes = [
                                            { color: "#3b82f6", icon: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
                                            { color: "#8b5cf6", icon: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/20" },
                                            { color: "#ec4899", icon: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-950/20" },
                                            { color: "#14b8a6", icon: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-950/20" },
                                            { color: "#eab308", icon: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-950/20" },
                                            { color: "#f97316", icon: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/20" }
                                        ];
                                        const p = palettes[hash % palettes.length];
                                        progressColor = p.color;
                                        iconClass = `fa-solid fa-folder-open ${p.icon}`;
                                        bgIconColor = p.bg;
                                    }

                                    return (
                                        <Col xs={24} sm={12} lg={8} key={catName}>
                                            <Card
                                                hoverable
                                                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl cursor-pointer"
                                                bodyStyle={{ padding: '12px 14px' }}
                                                onClick={() => handleCategoryClick(catName)}
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

            <Modal
                title={<div className="font-bold text-slate-800 flex items-center gap-2"><PieChartOutlined /> {selectedCategory} Files</div>}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                width={800}
                bodyStyle={{ padding: 0 }}
            >
                <div className="p-4">
                    <Table 
                        dataSource={filesData} 
                        columns={columns} 
                        rowKey="id"
                        size="small"
                        pagination={pagination}
                        loading={filesLoading}
                        onChange={handleTableChange}
                    />
                </div>
            </Modal>
        </div>
    );
};

export default React.memo(DiskAnalyzer);
