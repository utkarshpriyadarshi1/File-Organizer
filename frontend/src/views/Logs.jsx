import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

const Logs = () => {
    const [logs, setLogs] = useState([]);
    const [dbLogs, setDbLogs] = useState([]);
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

    // Fetch initial diagnostic logs from database
    useEffect(() => {
        axios.get("http://localhost:8080/api/logs")
            .then(response => {
                setDbLogs(response.data || []);
            })
            .catch(error => console.error("Error fetching logs:", error));
    }, []);

    // Scroll to bottom when logs append (if sorting is oldToNew)
    useEffect(() => {
        if (sortOrder === "oldToNew" && consoleEndRef.current && !showScrollBottom) {
            consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, dbLogs, sortOrder, showScrollBottom]);

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

    const rawCombinedLogs = [...dbLogs, ...logs].map(formatLog);
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
                <mark key={index} className="bg-emerald-500/30 text-emerald-200 px-0.5 rounded font-bold">
                    {part}
                </mark>
            ) : part
        );
    };

    const errorCount = filteredAndSortedLogs.filter(l => l.level === "ERROR").length;
    const errorRate = ((errorCount / (filteredAndSortedLogs.length || 1)) * 100).toFixed(1);

    return (
        <div className="space-y-6 max-w-6xl mx-auto text-left">
            {/* Header section with console stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                        <i className="fa-solid fa-terminal text-blue-600"></i>
                        Logs
                    </h2>
                    <p className="text-xs text-gray-500 font-semibold mt-0.5">Real-time system event logs streaming and historical console diagnostic reporting.</p>
                </div>

                {/* Console actions */}
                <div className="flex gap-2">
                    <button
                        onClick={downloadLogs}
                        disabled={filteredAndSortedLogs.length === 0}
                        className="bg-white hover:bg-gray-50 active:scale-95 text-gray-700 text-xs font-bold px-3.5 py-2 rounded-xl transition-all duration-150 flex items-center gap-1.5 border border-gray-200 cursor-pointer shadow-sm disabled:opacity-50"
                        title="Download active logs text file"
                    >
                        <i className="fa-solid fa-download text-blue-550"></i>
                        Export Logs
                    </button>
                    <button
                        onClick={clearConsole}
                        disabled={filteredAndSortedLogs.length === 0}
                        className="bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-200 active:scale-95 text-gray-700 text-xs font-bold px-3.5 py-2 rounded-xl transition-all duration-150 flex items-center gap-1.5 border border-gray-200 cursor-pointer shadow-sm disabled:opacity-50"
                        title="Clear console view"
                    >
                        <i className="fa-solid fa-trash-can"></i>
                        Clear Screen
                    </button>
                </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-sm">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Visible Entries</p>
                    <p className="text-lg font-black text-gray-800 mt-0.5">{filteredAndSortedLogs.length}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-sm">
                    <p className="text-[9px] font-bold text-rose-500 uppercase tracking-wider">Errors Reported</p>
                    <p className="text-lg font-black text-rose-600 mt-0.5">{errorCount}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-sm">
                    <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Log Error Rate</p>
                    <p className="text-lg font-black text-amber-600 mt-0.5">{errorRate}%</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-sm">
                    <p className="text-[9px] font-bold text-sky-500 uppercase tracking-wider">Active Sources</p>
                    <p className="text-lg font-black text-sky-600 mt-0.5">{logTypes.length}</p>
                </div>
            </div>

            {/* Main Terminal Window */}
            <div className=" border border-gray-150 rounded-xl shadow-2xl flex flex-col overflow-hidden h-[540px] relative select-none">
                {/* Window Topbar */}
                <div className=" px-5 py-3 flex justify-between items-center border-b border-slate-900">

                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold font-mono">
                        <i className="fa-solid fa-terminal text-emerald-450"></i>
                        <span className="tracking-wide text-slate-205">log</span>
                    </div>
                    <div className="w-12"></div>
                </div>

                {/* Sub-header Controls */}
                <div className=" px-5 py-2.5 flex flex-wrap gap-3 items-center justify-between border-b border-slate-900 text-[10px] font-bold text-slate-450 font-mono">
                    <div className="flex flex-wrap gap-2.5 items-center">
                        <div className="relative flex items-center">
                            <i className="fa-solid fa-magnifying-glass absolute left-2 text-[9px] text-slate-500"></i>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search console..."
                                className=" border border-gray-150 rounded-lg pl-6 pr-2.5 py-1 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 w-40 text-[10px] font-bold"
                            />
                        </div>

                        <div className="flex items-center gap-1">
                            <span className="text-slate-500 text-[9px]">Level:</span>
                            <select
                                onChange={(e) => setLevelFilter(e.target.value)}
                                value={levelFilter}
                                className=" border border-gray-150 rounded-lg px-2 py-1 text-slate-305 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-[10px] font-bold"
                            >
                                <option value="ALL">All Levels</option>
                                <option value="INFO">INFO</option>
                                <option value="ERROR">ERROR</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-1">
                            <span className="text-slate-500 text-[9px]">Source:</span>
                            <select
                                onChange={(e) => setTypeFilter(e.target.value)}
                                value={typeFilter}
                                className=" border border-gray-150 rounded-lg px-2 py-1 text-slate-305 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-[10px] font-bold"
                            >
                                <option value="ALL">All Sources</option>
                                {logTypes.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 text-[9px]">Sort:</span>
                        <select
                            onChange={(e) => setSortOrder(e.target.value)}
                            value={sortOrder}
                            className=" border border-gray-150 rounded-lg px-2 py-1 text-slate-305 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-[10px] font-bold"
                        >
                            <option value="oldToNew">Oldest First</option>
                            <option value="newToOld">Newest First</option>
                        </select>
                    </div>
                </div>

                {/* Console Output Screen */}
                <div
                    ref={consoleContainerRef}
                    onScroll={handleScroll}
                    className="flex-grow p-5 overflow-y-auto font-mono text-[11px] space-y-2  text-slate-100 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent text-left"
                >
                    {filteredAndSortedLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
                            <i className="fa-solid fa-ghost text-2xl"></i>
                            <span className="font-bold text-[10px] uppercase tracking-wider">No matching logs streamed</span>
                        </div>
                    ) : (
                        filteredAndSortedLogs.map((log, index) => {
                            const isError = log.level === "ERROR";
                            const isExpanded = expandedLogIndex === index;

                            return (
                                <div
                                    key={index}
                                    onClick={() => setExpandedLogIndex(isExpanded ? null : index)}
                                    className={`flex flex-col hover:/55 p-1.5 rounded transition-all duration-100 cursor-pointer ${isExpanded ? "/40 border border-gray-150/40" : "border border-transparent"}`}
                                >
                                    <div className="flex items-start gap-2.5">
                                        {/* Timestamp */}
                                        {log.timestamp && (
                                            <span className="text-slate-600 select-none shrink-0 font-semibold">
                                                [{log.timestamp}]
                                            </span>
                                        )}

                                        {/* Severity Badge */}
                                        <span className={`shrink-0 flex items-center gap-1 font-extrabold text-[10px] tracking-wide ${isError ? "text-rose-500" : "text-emerald-500"}`}>
                                            {isError ? (
                                                <i className="fa-solid fa-circle-exclamation"></i>
                                            ) : (
                                                <i className="fa-solid fa-circle-info"></i>
                                            )}
                                            {log.level}
                                        </span>

                                        {/* Source Type Tag */}
                                        <span className="text-sky-500 font-bold shrink-0">
                                            [{log.type}]
                                        </span>

                                        {/* Highlighted Log Message */}
                                        <span className="text-slate-200 break-all select-text font-medium leading-relaxed flex-grow">
                                            {highlightQuery(log.message, searchQuery)}
                                        </span>

                                        {/* Expand indicator icon */}
                                        <span className="text-slate-600 hover:text-slate-400 p-0.5">
                                            <i className={`fa-solid ${isExpanded ? "fa-angle-up" : "fa-angle-down"}`}></i>
                                        </span>
                                    </div>

                                    {/* Expand details display */}
                                    {isExpanded && (
                                        <div className="mt-2.5 ml-8 p-3 border border-slate-850 text-[10px] text-slate-400 select-text leading-relaxed font-mono">
                                            <p className="font-bold text-slate-500 mb-1 border-b border-gray-150 pb-1 uppercase tracking-wider">Raw Log Event Data:</p>
                                            <pre className="overflow-x-auto whitespace-pre-wrap">
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
                    <button
                        onClick={scrollToBottom}
                        className="absolute bottom-12 right-6 bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95 text-white text-[10px] font-bold px-3 py-2 rounded-full shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1 border border-blue-500 cursor-pointer animate-bounce"
                    >
                        <i className="fa-solid fa-circle-arrow-down text-xs"></i>
                        Scroll to Bottom
                    </button>
                )}

                {/* Terminal Window Footer */}
                <div className=" px-5 py-2.5 border-t border-slate-900 text-[10px] text-slate-500 font-mono flex justify-between items-center select-none">
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow shadow-emerald-450/30"></span>
                        <span className="text-slate-400 font-bold">Live Streaming Output</span>
                    </span>
                    <span className="font-semibold text-slate-500">Filtered logs count: {filteredAndSortedLogs.length}</span>
                </div>
            </div>
        </div>
    );
};

export default Logs;
