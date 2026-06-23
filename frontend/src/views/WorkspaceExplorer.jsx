import React, { useState, useEffect } from "react";
import axios from "axios";
import { useTasks } from "../services/TaskContext";
import { useI18n } from "../services/I18nContext";

const FileIcon = ({ name }) => {
    const ext = name.split(".").pop().toLowerCase();
    let iconClass = "fa-regular fa-file text-slate-400";

    if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) {
        iconClass = "fa-regular fa-file-image text-blue-500";
    } else if (["pdf"].includes(ext)) {
        iconClass = "fa-regular fa-file-pdf text-rose-500";
    } else if (["doc", "docx", "txt", "rtf", "odt"].includes(ext)) {
        iconClass = "fa-regular fa-file-lines text-indigo-500";
    } else if (["xls", "xlsx", "csv"].includes(ext)) {
        iconClass = "fa-regular fa-file-excel text-emerald-500";
    } else if (["zip", "rar", "tar", "gz", "7z"].includes(ext)) {
        iconClass = "fa-regular fa-file-zipper text-amber-500";
    } else if (["mp4", "mkv", "avi", "mov"].includes(ext)) {
        iconClass = "fa-regular fa-file-video text-violet-500";
    } else if (["mp3", "wav", "ogg", "flac"].includes(ext)) {
        iconClass = "fa-regular fa-file-audio text-cyan-500";
    } else if (["js", "jsx", "ts", "tsx", "html", "css", "json", "java", "py", "sh", "bat"].includes(ext)) {
        iconClass = "fa-regular fa-file-code text-teal-500";
    }

    return <i className={`${iconClass} text-sm shrink-0 w-4 text-center`}></i>;
};

const FormatBytes = (bytes) => {
    if (bytes === 0 || !bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const TreeNodeItem = ({ node, depth = 0 }) => {
    const isDir = node.type === "directory";
    const [isOpen, setIsOpen] = useState(depth === 0); // Open root directory by default

    const toggleOpen = (e) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    return (
        <div className="select-none text-left">
            <div 
                onClick={isDir ? toggleOpen : null}
                style={{ paddingLeft: `${depth * 1.25}rem` }}
                className={`flex items-center justify-between py-1.5 px-3 rounded-lg transition-all duration-150 group font-bold text-xs ${isDir ? "hover:bg-slate-100/80 cursor-pointer text-slate-800" : "hover:bg-slate-50/50 text-slate-600"}`}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {isDir ? (
                        <>
                            <i className={`fa-solid fa-chevron-right text-[10px] text-gray-400 transition-transform duration-150 w-3 shrink-0 ${isOpen ? "rotate-90" : ""}`}></i>
                            <i className={`fa-solid ${isOpen ? "fa-folder-open text-blue-500" : "fa-folder text-blue-450"} text-sm shrink-0`}></i>
                        </>
                    ) : (
                        <>
                            <span className="w-3 shrink-0"></span>
                            <FileIcon name={node.name} />
                        </>
                    )}
                    <span className="truncate font-semibold tracking-wide text-xs">{node.name}</span>
                </div>

                {!isDir && (
                    <div className="flex items-center gap-4 text-[10px] text-gray-400 font-bold shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <span>{FormatBytes(node.size)}</span>
                        {node.modified && (
                            <span className="font-mono text-[9px]">{new Date(node.modified).toLocaleDateString()}</span>
                        )}
                    </div>
                )}
            </div>

            {isDir && isOpen && node.children && node.children.length > 0 && (
                <div className="mt-0.5 space-y-0.5 border-l border-slate-100 ml-5.5">
                    {node.children.map((child, index) => (
                        <TreeNodeItem key={child.path + "_" + index} node={child} depth={depth + 1} />
                    ))}
                </div>
            )}

            {isDir && isOpen && (!node.children || node.children.length === 0) && (
                <div 
                    style={{ paddingLeft: `${(depth + 1) * 1.25 + 1.25}rem` }}
                    className="py-1 text-[10px] text-gray-400 font-semibold italic"
                >
                    Empty folder
                </div>
            )}
        </div>
    );
};

const WorkspaceExplorer = () => {
    const { selectFolder, addToast } = useTasks();
    const { t } = useI18n();

    const [explorerPath, setExplorerPath] = useState("");
    const [isVirtual, setIsVirtual] = useState(false);
    const [treeData, setTreeData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Fetch default directory on load
    useEffect(() => {
        axios.get("http://localhost:8080/api/settings/default-path")
            .then(res => {
                if (res.data.defaultPath) {
                    setExplorerPath(res.data.defaultPath);
                }
            })
            .catch(err => console.error("[WorkspaceExplorer] Failed to fetch default path:", err));
    }, []);

    const handleSelectFolder = async () => {
        const selected = await selectFolder(explorerPath);
        if (selected) {
            setExplorerPath(selected);
            setTreeData(null); // Clear previous data
        }
    };

    const fetchTree = () => {
        if (!explorerPath) {
            addToast("Please select a folder to scan.", "error");
            return;
        }

        setLoading(true);
        console.log(`[WorkspaceExplorer] Fetching tree structure. Path: "${explorerPath}", Virtual: ${isVirtual}`);
        
        axios.get(`http://localhost:8080/api/workspace/explorer`, {
            params: {
                folderPath: explorerPath,
                virtual: isVirtual
            }
        })
        .then(res => {
            setTreeData(res.data);
            setLoading(false);
            addToast("Directory scanned successfully.", "success");
        })
        .catch(err => {
            console.error("[WorkspaceExplorer] Failed to fetch tree:", err);
            setLoading(false);
            addToast(err.response?.data?.message || "Failed to scan folder.", "error");
        });
    };

    useEffect(() => {
        if (explorerPath && treeData) {
            fetchTree();
        }
    }, [isVirtual]);

    return (
        <div className="max-w-4xl mx-auto mt-6 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow border border-gray-150 text-left">
                <h2 className="text-3xl font-extrabold text-gray-800 flex items-center gap-2.5 mb-2">
                    <i className="fa-solid fa-folder-tree text-blue-600"></i>
                    {t("workspaceExplorer")}
                </h2>
                <p className="text-xs text-gray-500 mb-6 font-bold">{t("workspaceExplorerDesc")}</p>

                {/* Directory Selector Panel */}
                <div className="flex flex-col md:flex-row gap-3 mb-6">
                    <div className="flex-grow flex gap-2">
                        <input 
                            type="text" 
                            value={explorerPath} 
                            onChange={(e) => {
                                setExplorerPath(e.target.value);
                                setTreeData(null);
                            }}
                            placeholder="Select a directory to scan"
                            className="bg-gray-50 text-xs border border-gray-200 rounded-xl p-3 flex-grow focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono font-bold text-gray-700"
                        />
                        <button 
                            onClick={handleSelectFolder}
                            className="bg-slate-100 hover:bg-slate-150 active:scale-95 text-slate-700 text-xs font-bold px-4 py-3 rounded-xl transition-all duration-150 flex items-center gap-1.5 border border-gray-200 cursor-pointer"
                            title="Browse for folder"
                        >
                            <i className="fa-solid fa-folder-open text-blue-550"></i>
                            {t("browse")}
                        </button>
                    </div>

                    <button 
                        onClick={fetchTree}
                        className="bg-blue-600 hover:bg-blue-700 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white text-xs font-bold px-6 py-3 rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 shadow-sm"
                    >
                        <i className="fa-solid fa-magnifying-glass"></i>
                        {t("scanFolder")}
                    </button>
                </div>

                {/* Mode Selector tabs */}
                <div className="flex border-b border-gray-150 mb-4 text-xs font-bold">
                    <button
                        onClick={() => setIsVirtual(false)}
                        className={`pb-2.5 px-4 transition-colors cursor-pointer border-b-2 -mb-[2px] ${!isVirtual ? "border-blue-600 text-blue-600 font-extrabold" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                    >
                        <i className="fa-solid fa-hard-drive mr-1.5"></i>
                        {t("physicalExplorer")}
                    </button>
                    <button
                        onClick={() => setIsVirtual(true)}
                        className={`pb-2.5 px-4 transition-colors cursor-pointer border-b-2 -mb-[2px] ${isVirtual ? "border-blue-600 text-blue-600 font-extrabold" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                    >
                        <i className="fa-solid fa-flask mr-1.5"></i>
                        {t("virtualExplorer")}
                    </button>
                </div>

                {/* Explorer Display Area */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-gray-150 min-h-[300px] max-h-[600px] overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-[280px] text-slate-400 space-y-3 font-semibold text-xs animate-pulse">
                            <i className="fa-solid fa-circle-notch fa-spin text-xl text-blue-500"></i>
                            <span>Scanning workspace directory...</span>
                        </div>
                    ) : treeData ? (
                        <div className="space-y-1">
                            <TreeNodeItem node={treeData} depth={0} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[280px] text-slate-400 space-y-2">
                            <i className="fa-solid fa-folder-tree text-3xl opacity-60"></i>
                            <span className="text-xs font-bold">No Directory Scanned</span>
                            <span className="text-[10px] font-bold opacity-75">Click "Scan Folder" to generate and display the tree structure.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorkspaceExplorer;
