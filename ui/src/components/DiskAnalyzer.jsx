import React, { useState, useEffect } from "react";
import axios from "axios";
import { useTasks } from "../services/TaskContext";
import { Card, Input, Button, Row, Col, Progress, Spin, Typography } from "./common";
import { FolderOpenOutlined, PieChartOutlined } from "@ant-design/icons";

const { Text } = Typography;

const formatBytes = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const DiskAnalyzer = ({ targetPath }) => {
    const { addToast } = useTasks();
    const [analysisResult, setAnalysisResult] = useState(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);

    const runDirectoryAnalysis = async () => {
        if (!targetPath) {
            alert("Please select a master directory above first.");
            return;
        }
        setAnalysisLoading(true);
        try {
            const res = await axios.get(`http://localhost:8080/api/analysis/directory?folderPath=${encodeURIComponent(targetPath)}`);
            setAnalysisResult(res.data);
        } catch (err) {
            console.error("[DiskAnalyzer] Failed to run directory size breakdown:", err);
            addToast("Failed to analyze directory.", "error");
        } finally {
            setAnalysisLoading(false);
        }
    };

    return (
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
                <div className="flex justify-end">
                    <Button
                        type="primary"
                        onClick={runDirectoryAnalysis}
                        loading={analysisLoading}
                        className="h-full bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold px-6 py-3 rounded-xl flex items-center gap-2 shadow-md shadow-indigo-500/10 active:scale-95 border-0"
                    >
                        {analysisLoading ? "Analyzing..." : "Analyze Storage"}
                    </Button>
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
                            {React.useMemo(() => Object.entries(analysisResult.categories).map(([catName, catStats]) => {
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
                            }), [analysisResult])}
                        </Row>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default React.memo(DiskAnalyzer);
