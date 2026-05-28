import { useEffect, useState, useRef } from "react";
import axios from "axios";

const Logs = () => {
    const [logs, setLogs] = useState([]);
    const [dbLogs, setDbLogs] = useState([]);
    const consoleEndRef = useRef(null);
    const [levelFilter, setLevelFilter] = useState("ALL");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOrder, setSortOrder] = useState("oldToNew");

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

    useEffect(() => {
        axios.get("http://localhost:8080/api/logs")
            .then(response => setDbLogs(response.data))
            .catch(error => console.error("Error fetching logs:", error));
    }, []);

    // Scroll to bottom whenever logs change (only if chronological oldest-to-newest order)
    useEffect(() => {
        if (sortOrder === "oldToNew" && consoleEndRef.current) {
            consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, dbLogs, sortOrder]);

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
                        message: `${data.message} (${data.progress.toFixed(0)}%)`
                    };
                }
            } catch (e) {}
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
                } catch (e) {}
                
                const type = match[2];
                const level = type.toUpperCase().includes("ERROR") || type.toUpperCase().includes("FAIL") ? "ERROR" : "INFO";
                return {
                    timestamp: timeStr,
                    type: type,
                    level: level,
                    status: level,
                    message: match[3]
                };
            }
        }

        return {
            timestamp: "",
            type: "LOG",
            level: "INFO",
            status: "INFO",
            message: String(logText)
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

    return (
        <div className="max-w-5xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden h-[500px]">
            {/* Terminal Top Window Bar */}
            <div className="bg-slate-950 px-4 py-3 flex justify-between items-center border-b border-slate-800 select-none">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold font-mono">
                    <i className="fa-solid fa-terminal text-emerald-400"></i>
                    <span>system_console.log</span>
                </div>
                <div className="w-12"></div>
            </div>

            {/* Terminal Control Sub-header */}
            <div className="bg-slate-950/80 px-4 py-2 flex flex-wrap gap-3 items-center justify-between border-b border-slate-800 select-none text-[10px] font-semibold text-slate-400 font-mono">
                <div className="flex flex-wrap gap-2.5 items-center">
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filter messages..."
                        className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 w-36 text-[10px]"
                    />
                    <select 
                        onChange={(e) => setLevelFilter(e.target.value)}
                        value={levelFilter}
                        className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-[10px]"
                    >
                        <option value="ALL">All Levels</option>
                        <option value="INFO">INFO</option>
                        <option value="ERROR">ERROR</option>
                    </select>
                    <select 
                        onChange={(e) => setTypeFilter(e.target.value)}
                        value={typeFilter}
                        className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-[10px]"
                    >
                        <option value="ALL">All Sources</option>
                        {logTypes.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <select 
                        onChange={(e) => setSortOrder(e.target.value)}
                        value={sortOrder}
                        className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-[10px]"
                    >
                        <option value="oldToNew">Oldest First</option>
                        <option value="newToOld">Newest First</option>
                    </select>
                </div>
            </div>

            {/* Console Screen Output */}
            <div className="flex-grow p-4 overflow-y-auto font-mono text-xs space-y-2 bg-slate-900/95 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                {filteredAndSortedLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                        <i className="fa-solid fa-folder-open text-lg"></i>
                        <span>No logs matching filters.</span>
                    </div>
                ) : (
                    filteredAndSortedLogs.map((log, index) => {
                        const isError = log.level === "ERROR";
                        return (
                            <div key={index} className="flex items-start gap-2 hover:bg-slate-800/40 p-1 rounded transition-colors duration-100">
                                {/* Time */}
                                {log.timestamp && (
                                    <span className="text-slate-500 select-none shrink-0 font-medium">
                                        [{log.timestamp}]
                                    </span>
                                )}
                                
                                {/* Severity Level Badge / Icon */}
                                <span className={`shrink-0 flex items-center gap-1 font-bold ${isError ? "text-rose-400" : "text-emerald-400"}`}>
                                    {isError ? (
                                        <i className="fa-solid fa-triangle-exclamation text-[10px]"></i>
                                    ) : (
                                        <i className="fa-solid fa-circle-info text-[10px]"></i>
                                    )}
                                    {log.level}
                                </span>

                                {/* Type Tag */}
                                <span className="text-sky-400 font-semibold shrink-0">
                                    [{log.type}]
                                </span>

                                {/* Message */}
                                <span className="text-slate-100 break-all select-text font-normal leading-relaxed">
                                    {log.message}
                                </span>
                            </div>
                        );
                    })
                )}
                <div ref={consoleEndRef} />
            </div>

            {/* Terminal Status Footer */}
            <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex justify-between items-center">
                <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live Streaming Active
                </span>
                <span>Total records: {filteredAndSortedLogs.length}</span>
            </div>
        </div>
    );
};

export default Logs;
