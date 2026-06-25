import React, { useState, useEffect } from "react";
import axios from "axios";

const FolderSelectorDialog = ({ config }) => {
    const [currentPath, setCurrentPath] = useState("");
    const [folders, setFolders] = useState([]);
    const [drives, setDrives] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [filterQuery, setFilterQuery] = useState("");
    const [isEditingPath, setIsEditingPath] = useState(false);
    const [manualPath, setManualPath] = useState("");

    const isOpen = !!config;

    // Load folder contents when modal opens or path changes
    useEffect(() => {
        if (!isOpen) return;

        const loadDirectory = async (path) => {
            setLoading(true);
            setError("");
            try {
                const url = `http://localhost:8080/api/analysis/browse${path ? `?path=${encodeURIComponent(path)}` : ""}`;
                const res = await axios.get(url);
                setCurrentPath(res.data.currentPath);
                setManualPath(res.data.currentPath);
                setFolders(res.data.folders || []);
                setDrives(res.data.drives || []);
                if (res.data.error) {
                    setError(res.data.error);
                }
            } catch (err) {
                console.error("[FolderSelector] Failed to load directory:", err);
                setError("Failed to access this directory. It might be protected or unavailable.");
            } finally {
                setLoading(false);
            }
        };

        loadDirectory(config?.initialPath || "");
    }, [isOpen, config?.initialPath]);

    if (!isOpen) return null;

    const { onSelect, onClose } = config;

    const navigateTo = async (path) => {
        setLoading(true);
        setError("");
        setFilterQuery("");
        setIsEditingPath(false);
        try {
            const url = `http://localhost:8080/api/analysis/browse?path=${encodeURIComponent(path)}`;
            const res = await axios.get(url);
            setCurrentPath(res.data.currentPath);
            setManualPath(res.data.currentPath);
            setFolders(res.data.folders || []);
            setDrives(res.data.drives || []);
            if (res.data.error) {
                setError(res.data.error);
            }
        } catch (err) {
            console.error("[FolderSelector] Navigation failed:", err);
            setError("Could not open this directory. Access Denied.");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectCurrent = () => {
        if (onSelect) {
            onSelect(currentPath);
        }
    };

    const filteredFolders = folders.filter(f => 
        f.name === ".." || f.name.toLowerCase().includes(filterQuery.toLowerCase())
    );

    // Clickable breadcrumb path calculation
    const getBreadcrumbs = () => {
        if (!currentPath) return [];
        const isWindows = currentPath.includes(":\\") || currentPath.includes(":/");
        const separator = currentPath.includes("\\") ? "\\" : "/";
        const parts = currentPath.split(separator).filter(Boolean);
        
        let breadcrumbs = [];
        let accumulatedPath = "";
        
        if (!isWindows) {
            breadcrumbs.push({ name: "Root", path: "/" });
            accumulatedPath = "";
        }
        
        parts.forEach((part, index) => {
            if (isWindows && index === 0) {
                accumulatedPath = part + separator;
                breadcrumbs.push({ name: part, path: accumulatedPath });
            } else {
                accumulatedPath = accumulatedPath + (accumulatedPath.endsWith(separator) ? "" : separator) + part;
                breadcrumbs.push({ name: part, path: accumulatedPath });
            }
        });
        
        return breadcrumbs;
    };

    const breadcrumbs = getBreadcrumbs();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur Overlay */}
            <div 
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-[6px] transition-opacity duration-300"
                onClick={onClose}
            ></div>

            {/* Modal Box */}
            <div className="relative bg-white/95 backdrop-blur-xl border border-white/80 rounded-[32px] shadow-[0_32px_80px_rgba(15,23,42,0.18)] max-w-lg w-full flex flex-col max-h-[80vh] overflow-hidden transform transition-all duration-300 scale-100 opacity-100">
                
                {/* Header Section */}
                <div className="p-6 border-b border-gray-100 bg-slate-50/70 space-y-3.5 shrink-0">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center text-xs shadow-inner">
                                <i className="fa-solid fa-folder-open"></i>
                            </span>
                            Choose Folder Location
                        </h3>
                        <button 
                            onClick={onClose}
                            className="w-7 h-7 rounded-full hover:bg-gray-200/60 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-all cursor-pointer text-base font-bold active:scale-90"
                        >
                            &times;
                        </button>
                    </div>

                    {/* Path Browser: Breadcrumbs (Default) or Input (Editing Mode) */}
                    <div className="relative flex items-center bg-white border border-gray-150 rounded-2xl p-3 shadow-sm hover:border-gray-300 transition-colors">
                        <span className="w-5 h-5 rounded bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] shrink-0 mr-2.5">
                            <i className="fa-solid fa-laptop"></i>
                        </span>

                        {isEditingPath ? (
                            <div className="flex items-center w-full min-w-0">
                                <input
                                    type="text"
                                    value={manualPath}
                                    onChange={(e) => setManualPath(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") navigateTo(manualPath);
                                        if (e.key === "Escape") setIsEditingPath(false);
                                    }}
                                    autoFocus
                                    className="text-xs font-mono font-bold text-slate-700 w-full focus:outline-none bg-transparent"
                                    placeholder="Enter path manually..."
                                />
                                <div className="flex gap-2 shrink-0 ml-2">
                                    <button 
                                        onClick={() => navigateTo(manualPath)}
                                        className="text-[10px] font-extrabold text-blue-600 hover:text-blue-700 cursor-pointer uppercase tracking-wider"
                                    >
                                        Go
                                    </button>
                                    <button 
                                        onClick={() => setIsEditingPath(false)}
                                        className="text-[10px] font-extrabold text-slate-400 hover:text-slate-600 cursor-pointer uppercase tracking-wider"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div 
                                className="flex items-center gap-1 overflow-x-auto w-full min-w-0 pr-4 cursor-text py-0.5 select-none scrollbar-none"
                                onClick={() => {
                                    setManualPath(currentPath);
                                    setIsEditingPath(true);
                                }}
                                title="Click to edit path manually"
                            >
                                {breadcrumbs.map((crumb, idx) => (
                                    <React.Fragment key={crumb.path}>
                                        {idx > 0 && <span className="text-[9px] text-gray-300 font-bold shrink-0">/</span>}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigateTo(crumb.path);
                                            }}
                                            className="text-[11px] font-mono font-bold text-slate-600 hover:text-blue-600 hover:underline shrink-0 cursor-pointer rounded px-1 hover:bg-slate-50 transition-colors"
                                        >
                                            {crumb.name}
                                        </button>
                                    </React.Fragment>
                                ))}
                                {breadcrumbs.length === 0 && (
                                    <span className="text-xs text-gray-400 font-medium">Select a path...</span>
                                )}
                            </div>
                        )}
                        {!isEditingPath && (
                            <button
                                onClick={() => setIsEditingPath(true)}
                                className="absolute right-3 text-slate-350 hover:text-slate-500 cursor-pointer transition-colors p-1"
                                title="Edit path string"
                            >
                                <i className="fa-solid fa-pen text-[9px]"></i>
                            </button>
                        )}
                    </div>
                </div>

                {/* Drives Bar */}
                {drives.length > 1 && (
                    <div className="px-6 py-3 bg-slate-50/50 border-b border-gray-100 flex flex-wrap gap-2.5 items-center shrink-0">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Drives</span>
                        <div className="flex flex-wrap gap-1.5">
                            {drives.map(drive => {
                                const isCurrent = currentPath.toLowerCase().startsWith(drive.toLowerCase());
                                return (
                                    <button
                                        key={drive}
                                        onClick={() => navigateTo(drive)}
                                        className={`text-[10px] font-black font-mono px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-sm ${
                                            isCurrent
                                                ? "bg-blue-600 border-blue-600 text-white shadow-blue-500/10"
                                                : "bg-white text-slate-650 border-gray-200 hover:bg-slate-50 hover:border-gray-300"
                                        }`}
                                    >
                                        <i className={`fa-solid fa-hard-drive text-[9px] ${isCurrent ? "text-blue-200" : "text-slate-400"}`}></i>
                                        {drive}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Search / Filter Bar */}
                <div className="px-6 pt-4.5 pb-1.5 shrink-0">
                    <div className="relative flex items-center bg-slate-100/60 border border-slate-200/50 rounded-2xl px-3.5 py-2.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                        <i className="fa-solid fa-magnifying-glass text-slate-400 text-xs mr-2.5"></i>
                        <input 
                            type="text"
                            placeholder="Type to filter folders..."
                            value={filterQuery}
                            onChange={(e) => setFilterQuery(e.target.value)}
                            className="bg-transparent text-xs w-full focus:outline-none font-bold text-slate-700 placeholder-slate-400/80"
                        />
                        {filterQuery && (
                            <button 
                                onClick={() => setFilterQuery("")}
                                className="w-5 h-5 rounded-full hover:bg-gray-200/60 text-gray-400 hover:text-gray-600 text-xs flex items-center justify-center cursor-pointer"
                            >
                                &times;
                            </button>
                        )}
                    </div>
                </div>

                {/* Directory Contents List Container */}
                <div className="flex-grow overflow-y-auto px-6 py-4.5 min-h-[220px] scrollbar-thin">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-3 py-14">
                            <div className="w-9 h-9 border-4 border-blue-600/25 border-t-blue-600 rounded-full animate-spin"></div>
                            <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Loading contents...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Error Alert Banner */}
                            {error && (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-left flex flex-col gap-2.5 shadow-sm animate-shake">
                                    <div className="flex items-start gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-rose-100/80 text-rose-600 flex items-center justify-center text-xs shrink-0 animate-bounce">
                                            <i className="fa-solid fa-triangle-exclamation"></i>
                                        </div>
                                        <div className="space-y-0.5 flex-grow">
                                            <p className="text-[9px] font-black text-rose-800 uppercase tracking-widest">Access Restricted</p>
                                            <p className="text-xs text-rose-700 font-semibold leading-normal">{error}</p>
                                        </div>
                                    </div>
                                    <div className="mt-1 border-t border-rose-100/60 pt-2.5">
                                        <details className="group">
                                            <summary className="text-[10px] font-black text-rose-600 hover:text-rose-700 cursor-pointer list-none flex items-center gap-1.5 select-none transition-colors">
                                                <i className="fa-solid fa-circle-info text-xs text-rose-500"></i> How to resolve access restrictions?
                                                <i className="fa-solid fa-chevron-down text-[8px] transition-transform duration-200 group-open:rotate-180 ml-auto text-rose-400"></i>
                                            </summary>
                                            <div className="mt-2 text-[11px] text-rose-700/90 space-y-2.5 pl-4 list-none font-medium leading-relaxed border-l-2 border-rose-200/50 ml-1.5">
                                                <div>
                                                    <strong className="text-rose-850">• Run as Administrator:</strong>
                                                    <p className="text-[10px] text-rose-600/85 mt-0.5 ml-2">Right-click the application icon and select <em>"Run as administrator"</em>. This grants the scanning server elevated system access to traverse protected directories.</p>
                                                </div>
                                                <div>
                                                    <strong className="text-rose-850">• Grant Folder Permissions:</strong>
                                                    <p className="text-[10px] text-rose-600/85 mt-0.5 ml-2">Right-click the folder in Windows Explorer → <em>Properties</em> → <em>Security</em> tab, and verify that your user account has <em>Read</em> permissions.</p>
                                                </div>
                                                <div>
                                                    <strong className="text-rose-850">• Avoid System-Reserved Paths:</strong>
                                                    <p className="text-[10px] text-rose-600/85 mt-0.5 ml-2">Avoid system root directories or paths like <code>System Volume Information</code>. Instead, select standard user directories (Documents, Downloads, Desktop).</p>
                                                </div>
                                            </div>
                                        </details>
                                    </div>
                                </div>
                            )}

                            {/* Folders List Grid */}
                            <div className="space-y-1">
                                {filteredFolders.map(folder => {
                                    const isParentDir = folder.name === "..";
                                    const isAccessible = folder.accessible !== false;
                                    return (
                                        <button
                                            key={folder.path}
                                            onClick={() => isAccessible ? navigateTo(folder.path) : alert("Access Denied: This folder is system-protected and cannot be opened. To access it, try running the application as Administrator, or choose a different user directory.")}
                                            className={`w-full flex items-center justify-between p-3 rounded-2xl border border-transparent hover:border-slate-100 transition-all text-left group active:scale-[0.99] cursor-pointer ${
                                                isAccessible ? "hover:bg-slate-50" : "opacity-50 cursor-not-allowed hover:bg-rose-50/20"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                {isParentDir ? (
                                                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 border border-slate-200/20 group-hover:scale-105 transition-transform shadow-inner">
                                                        <i className="fa-solid fa-arrow-up-from-bracket text-[11px]"></i>
                                                    </div>
                                                ) : !isAccessible ? (
                                                    <div className="w-9 h-9 rounded-xl bg-rose-55 text-rose-500 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform border border-rose-100/50">
                                                        <i className="fa-solid fa-lock text-xs"></i>
                                                    </div>
                                                ) : (
                                                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all duration-200 group-hover:scale-105 shadow-inner">
                                                        <i className="fa-solid fa-folder text-sm group-hover:animate-pulse"></i>
                                                    </div>
                                                )}
                                                <span className={`text-xs font-extrabold truncate ${
                                                    isParentDir ? "text-slate-450" : !isAccessible ? "text-slate-400 font-semibold" : "text-slate-700"
                                                }`}>
                                                    {isParentDir ? "Parent Directory (..)" : folder.name}
                                                </span>
                                            </div>
                                            {isAccessible && (
                                                <div className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <i className="fa-solid fa-chevron-right text-slate-350 text-[9px] translate-x-0 group-hover:translate-x-0.5 transition-transform shrink-0"></i>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                                
                                {filteredFolders.length === 0 && (
                                    <div className="text-center py-14 text-slate-400 select-none flex flex-col items-center justify-center gap-2">
                                        <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-305 flex items-center justify-center text-xl shadow-inner border border-slate-100">
                                            <i className="fa-solid fa-folder-open"></i>
                                        </div>
                                        <span className="text-xs font-extrabold text-slate-500">No subfolders located</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-5 border-t border-gray-100 bg-slate-50/70 flex gap-2.5 justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="bg-white hover:bg-slate-150 text-slate-700 active:scale-95 text-xs font-bold px-5 py-3 rounded-2xl transition-all shadow-sm border border-gray-250 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSelectCurrent}
                        disabled={loading || !currentPath}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-black px-6 py-3 rounded-2xl transition-all shadow-md shadow-blue-500/15 cursor-pointer disabled:opacity-50"
                    >
                        Select Location
                    </button>
                </div>

            </div>
        </div>
    );
};

export default FolderSelectorDialog;
