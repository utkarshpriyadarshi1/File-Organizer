import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { FrontendLogger } from "../services/FrontendLogger";
import { Card, Row, Col, Statistic, Input, Select, Button, Tag, Badge, Space, Typography } from "../components/common";
import { 
    CodeOutlined, 
    SearchOutlined,
    DownloadOutlined,
    DeleteOutlined,
    DownOutlined,
    UpOutlined,
    VerticalAlignBottomOutlined,
    ExclamationCircleFilled,
    InfoCircleFilled,
    DeploymentUnitOutlined,
    ConsoleSqlOutlined
} from "@ant-design/icons";

const { Text } = Typography;

const Logs = () => {
    const [logs, setLogs] = useState([]);
    const [dbLogs, setDbLogs] = useState([]);
    const [frontendLogs, setFrontendLogs] = useState([]);
    const consoleContainerRef = useRef(null);
    const consoleEndRef = useRef(null);

    // Filtering and sorting states
    const [levelFilter, setLevelFilter] = useState("ALL");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOrder, setSortOrder] = useState("oldToNew");

    // Interactive states
    const [showScrollBottom, setShowScrollBottom] = useState(false);
    const [expandedLogIndex, setExpandedLogIndex] = useState(null);

    // WebSocket live stream setup
    useEffect(() => {
        const socket = new WebSocket("ws://localhost:8080/ws/progress");
        socket.onmessage = (event) => {
            setLogs((prevLogs) => {
                const nextLogs = [...prevLogs, event.data];
                if (nextLogs.length > 1000) {
                    return nextLogs.slice(nextLogs.length - 1000);
                }
                return nextLogs;
            });
        };
        return () => socket.close();
    }, []);

    // Fetch initial diagnostic logs from database and listen to frontend logs
    useEffect(() => {
        axios.get("http://localhost:8080/api/logs")
            .then(response => {
                setDbLogs(response.data || []);
            })
            .catch(error => console.error("Error fetching logs:", error));

        setFrontendLogs(FrontendLogger.getLogs());
        const unsubscribe = FrontendLogger.subscribe((newLog) => {
            setFrontendLogs((prev) => {
                const next = [...prev, newLog];
                if (next.length > 1000) {
                    return next.slice(next.length - 1000);
                }
                return next;
            });
        });

        return () => unsubscribe();
    }, []);

    // Scroll to bottom when logs append (if sorting is oldToNew)
    useEffect(() => {
        if (sortOrder === "oldToNew" && consoleEndRef.current && !showScrollBottom) {
            consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, dbLogs, frontendLogs, sortOrder, showScrollBottom]);

    const handleScroll = () => {
        if (!consoleContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = consoleContainerRef.current;
        // Show floating jump-to-bottom button if user scrolled up significantly (> 120px)
        const isScrolledUp = scrollHeight - scrollTop - clientHeight > 120;
        setShowScrollBottom(isScrolledUp);
    };

    const scrollToBottom = () => {
        if (consoleEndRef.current) {
            consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
        setShowScrollBottom(false);
    };

    const clearConsole = () => {
        setLogs([]);
        setDbLogs([]);
        setFrontendLogs([]);
        FrontendLogger.clear();
    };

    const downloadLogs = () => {
        const text = filteredAndSortedLogs
            .map(l => `[${l.timestamp}] [${l.level}] [${l.type}] ${l.message}`)
            .join("\n");
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `file-organizer-logs-${new Date().toISOString().substring(0, 10)}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const formatLog = (logText) => {
        if (typeof logText === "string" && logText.startsWith("{")) {
            try {
                const data = JSON.parse(logText);
                if (data.taskId) {
                    const time = new Date().toLocaleTimeString();
                    return {
                        timestamp: time,
                        type: data.taskType || "TASK",
                        level: data.status === "FAILED" ? "ERROR" : "INFO",
                        status: data.status,
                        message: `${data.message} (${data.progress.toFixed(0)}%)`,
                        raw: data
                    };
                }
            } catch (e) { }
        }

        if (typeof logText === "string" && logText.startsWith("[")) {
            const match = logText.match(/^\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.*)$/);
            if (match) {
                let timeStr = match[1];
                try {
                    const dt = new Date(timeStr);
                    if (!isNaN(dt.getTime())) {
                        timeStr = dt.toLocaleTimeString();
                    }
                } catch (e) { }

                const type = match[2];
                const level = type.toUpperCase().includes("ERROR") || type.toUpperCase().includes("FAIL") ? "ERROR" : "INFO";
                return {
                    timestamp: timeStr,
                    type: type,
                    level: level,
                    status: level,
                    message: match[3],
                    raw: logText
                };
            }
        }

        return {
            timestamp: "",
            type: "LOG",
            level: "INFO",
            status: "INFO",
            message: String(logText),
            raw: logText
        };
    };

    const rawCombinedLogs = [...dbLogs.map(formatLog), ...logs.map(formatLog), ...frontendLogs];
    const logTypes = Array.from(new Set(rawCombinedLogs.map(l => l.type).filter(Boolean)));

    const getFilteredLogs = () => {
        return rawCombinedLogs.filter(log => {
            const matchesLevel = levelFilter === "ALL" || log.level === levelFilter;
            const matchesType = typeFilter === "ALL" || log.type === typeFilter;
            const matchesSearch = !searchQuery.trim() ||
                log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.type.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesLevel && matchesType && matchesSearch;
        });
    };

    const getSortedLogs = () => {
        const filtered = getFilteredLogs();
        if (sortOrder === "newToOld") {
            return [...filtered].reverse().slice(0, 1000);
        }
        return filtered.slice(-1000);
    };

    const filteredAndSortedLogs = getSortedLogs();

    // Highlighting matching search terms helper
    const highlightQuery = (text, query) => {
        if (!query.trim()) return text;
        const regex = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, "gi");
        const parts = text.split(regex);
        return parts.map((part, index) =>
            regex.test(part) ? (
                <mark key={index} className="bg-emerald-500/30 text-emerald-250 dark:text-emerald-200 px-0.5 rounded font-bold">
                    {part}
                </mark>
            ) : part
        );
    };

    const errorCount = filteredAndSortedLogs.filter(l => l.level === "ERROR").length;
    const errorRate = ((errorCount / (filteredAndSortedLogs.length || 1)) * 100).toFixed(1);

    return (
        <div className="space-y-6 max-w-6xl mx-auto text-left">
            {/* Metrics cards */}
            <Row gutter={[12, 12]}>
                <Col xs={12} sm={6}>
                    <Card bodyStyle={{ padding: '12px 16px' }} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                        <span className="text-[9px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Visible Entries</span>
                        <Statistic value={filteredAndSortedLogs.length} valueStyle={{ fontSize: '18px', fontWeight: '900', color: 'inherit' }} className="mt-0.5" />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card bodyStyle={{ padding: '12px 16px' }} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                        <span className="text-[9px] font-extrabold text-rose-500 uppercase tracking-wider block">Errors Reported</span>
                        <Statistic value={errorCount} valueStyle={{ fontSize: '18px', fontWeight: '900', color: '#ef4444' }} className="mt-0.5" />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card bodyStyle={{ padding: '12px 16px' }} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                        <span className="text-[9px] font-extrabold text-amber-500 uppercase tracking-wider block">Log Error Rate</span>
                        <Statistic value={errorRate} suffix="%" valueStyle={{ fontSize: '18px', fontWeight: '900', color: '#d97706' }} className="mt-0.5" />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card bodyStyle={{ padding: '12px 16px' }} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                        <span className="text-[9px] font-extrabold text-sky-500 uppercase tracking-wider block">Active Sources</span>
                        <Statistic value={logTypes.length} valueStyle={{ fontSize: '18px', fontWeight: '900', color: '#0284c7' }} className="mt-0.5" />
                    </Card>
                </Col>
            </Row>

            {/* Main Terminal Window */}
            <div className="border border-slate-200 dark:border-slate-900 rounded-2xl bg-white dark:bg-slate-950 shadow-sm dark:shadow-2xl flex flex-col overflow-hidden h-[540px] relative select-none">
                {/* Window Topbar */}
                <div className="bg-slate-50 dark:bg-slate-900 px-5 py-3 flex justify-between items-center border-b border-slate-200 dark:border-slate-950">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs font-bold font-mono">
                        <CodeOutlined className="text-emerald-500 dark:text-emerald-400 animate-pulse" />
                        <span className="tracking-wide text-slate-800 dark:text-slate-200">developer@file-organizer:~</span>
                    </div>
                </div>

                {/* Sub-header Controls */}
                <div className="bg-slate-50/60 dark:bg-slate-900/60 px-5 py-2 flex flex-wrap gap-3 items-center justify-between border-b border-slate-200 dark:border-slate-950 text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                    <div className="flex flex-wrap gap-3 items-center">
                        <Input
                            prefix={<SearchOutlined style={{ fontSize: '9px', color: '#64748b' }} />}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search console..."
                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 rounded-lg w-40 h-7 text-[10px]"
                            allowClear
                        />

                        <div className="flex items-center gap-1">
                            <span className="text-slate-500 text-[8px] uppercase tracking-wider">Level</span>
                            <Select
                                onChange={(val) => setLevelFilter(val)}
                                value={levelFilter}
                                className="h-7 text-[9px] w-24 bg-transparent text-slate-700 dark:text-slate-200"
                                options={[
                                    { value: 'ALL', label: 'All Levels' },
                                    { value: 'INFO', label: 'INFO' },
                                    { value: 'ERROR', label: 'ERROR' },
                                ]}
                            />
                        </div>

                        <div className="flex items-center gap-1">
                            <span className="text-slate-500 text-[8px] uppercase tracking-wider">Source</span>
                            <Select
                                onChange={(val) => setTypeFilter(val)}
                                value={typeFilter}
                                className="h-7 text-[9px] w-28 bg-transparent text-slate-700 dark:text-slate-200"
                                options={[
                                    { value: 'ALL', label: 'All Sources' },
                                    ...logTypes.map(t => ({ value: t, label: t }))
                                ]}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                            <span className="text-slate-500 text-[8px] uppercase tracking-wider">Sort</span>
                            <Select
                                onChange={(val) => setSortOrder(val)}
                                value={sortOrder}
                                className="h-7 text-[9px] w-28 bg-transparent text-slate-700 dark:text-slate-200"
                                options={[
                                    { value: 'oldToNew', label: 'Oldest First' },
                                    { value: 'newToOld', label: 'Newest First' },
                                ]}
                            />
                        </div>

                        {/* Console Actions */}
                        <Space size={6}>
                            <Button
                                size="small"
                                onClick={downloadLogs}
                                disabled={filteredAndSortedLogs.length === 0}
                                icon={<DownloadOutlined style={{ fontSize: '9px' }} />}
                                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[9px] h-7 rounded text-slate-600 dark:text-slate-350 hover:text-slate-800 dark:hover:text-white"
                            >
                                Export
                            </Button>
                            <Button
                                size="small"
                                danger
                                onClick={clearConsole}
                                disabled={filteredAndSortedLogs.length === 0}
                                icon={<DeleteOutlined style={{ fontSize: '9px' }} />}
                                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[9px] h-7 rounded text-slate-600 dark:text-slate-350"
                            >
                                Clear
                            </Button>
                        </Space>
                    </div>
                </div>

                {/* Console Output Screen */}
                <div
                    ref={consoleContainerRef}
                    onScroll={handleScroll}
                    className="flex-grow p-5 overflow-y-auto font-mono text-[11px] space-y-1.5 text-slate-800 dark:text-slate-100 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent text-left bg-white dark:bg-slate-950"
                >
                    {filteredAndSortedLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-700 gap-2">
                            <ConsoleSqlOutlined style={{ fontSize: '24px' }} className="animate-bounce" />
                            <span className="font-bold text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-600">No matching logs streamed</span>
                        </div>
                    ) : (
                        filteredAndSortedLogs.map((log, index) => {
                            const isError = log.level === "ERROR";
                            const isExpanded = expandedLogIndex === index;

                            return (
                                <div
                                    key={index}
                                    onClick={() => setExpandedLogIndex(isExpanded ? null : index)}
                                    className={`flex flex-col hover:bg-slate-50 dark:hover:bg-slate-900/50 p-2 rounded-xl transition-all duration-100 cursor-pointer border ${isExpanded ? "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800" : "border-transparent"}`}
                                >
                                    <div className="flex items-start gap-2.5">
                                        {/* Timestamp */}
                                        {log.timestamp && (
                                            <span className="text-slate-400 dark:text-slate-600 select-none shrink-0 font-semibold">
                                                [{log.timestamp}]
                                            </span>
                                        )}

                                        {/* Severity Badge */}
                                        <span className={`shrink-0 flex items-center gap-1 font-extrabold text-[10px] tracking-wide ${isError ? "text-rose-500 dark:text-rose-450" : "text-emerald-500 dark:text-emerald-400"}`}>
                                            {isError ? (
                                                <ExclamationCircleFilled className="text-rose-500 text-[10px]" />
                                            ) : (
                                                <InfoCircleFilled className="text-emerald-500 dark:text-emerald-400 text-[10px]" />
                                            )}
                                            {log.level}
                                        </span>

                                        {/* Source Type Tag */}
                                        <span className="text-sky-500 dark:text-sky-400 font-bold shrink-0">
                                            [{log.type}]
                                        </span>

                                        {/* Highlighted Log Message */}
                                        <span className="text-slate-700 dark:text-slate-300 break-all select-text font-medium leading-relaxed flex-grow">
                                            {highlightQuery(log.message, searchQuery)}
                                        </span>

                                        {/* Expand indicator icon */}
                                        <span className="text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 p-0.5">
                                            {isExpanded ? <UpOutlined style={{ fontSize: '9px' }} /> : <DownOutlined style={{ fontSize: '9px' }} />}
                                        </span>
                                    </div>

                                    {/* Expand details display */}
                                    {isExpanded && (
                                        <div className="mt-2.5 ml-8 p-3.5 bg-slate-100 dark:bg-slate-950/80 rounded-lg border border-slate-200 dark:border-slate-850 text-[10px] text-slate-600 dark:text-slate-450 select-text leading-relaxed font-mono">
                                            <p className="font-bold text-slate-700 dark:text-slate-550 mb-1.5 border-b border-slate-200 dark:border-slate-900 pb-1 uppercase tracking-wider">Raw Log Event Data:</p>
                                            <pre className="overflow-x-auto whitespace-pre-wrap text-slate-600 dark:text-slate-350 m-0">
                                                {typeof log.raw === "object"
                                                    ? JSON.stringify(log.raw, null, 2)
                                                    : String(log.raw)
                                                }
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                    <div ref={consoleEndRef} />
                </div>

                {/* Floating Scroll To Bottom Button */}
                {showScrollBottom && (
                    <Button
                        type="primary"
                        onClick={scrollToBottom}
                        icon={<VerticalAlignBottomOutlined />}
                        className="absolute bottom-12 right-6 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[10px] font-bold h-9 px-4 rounded-full shadow-lg shadow-blue-500/20 transition-all flex items-center border-0 animate-bounce"
                    >
                        Scroll to Bottom
                    </Button>
                )}

                {/* Terminal Window Footer */}
                <div className="bg-slate-50 dark:bg-slate-900 px-5 py-2.5 border-t border-slate-200 dark:border-slate-950 text-[10px] text-slate-500 font-mono flex justify-between items-center select-none">
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shadow shadow-emerald-400/30"></span>
                        <span className="text-slate-600 dark:text-slate-400 font-bold">Live Streaming Output</span>
                    </span>
                    <span className="font-semibold text-slate-500">Filtered logs count: {filteredAndSortedLogs.length}</span>
                </div>
            </div>
        </div>
    );
};

export default Logs;
