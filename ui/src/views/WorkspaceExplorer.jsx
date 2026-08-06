import React, { useState, useEffect } from "react";
import axios from "axios";
import { useTasks } from "../services/TaskContext";
import { useI18n } from "../services/I18nContext";
import { Card, Input, Button, Tabs, Spin, Space, Typography } from "../components/common";
import { 
    FolderOpenOutlined, 
    SearchOutlined,
    RightOutlined,
    DownOutlined,
    FolderFilled,
    FolderOpenFilled,
    FileImageOutlined,
    FilePdfOutlined,
    FileWordOutlined,
    FileExcelOutlined,
    FileZipOutlined,
    PlaySquareOutlined,
    CustomerServiceOutlined,
    CodeOutlined,
    FileTextOutlined,
    FileOutlined,
    DatabaseOutlined,
    ExperimentOutlined,
    InfoCircleOutlined
} from "@ant-design/icons";
import { Modal, DatePicker, InputNumber, Table } from "antd";
const { Text } = Typography;

const FileIcon = ({ name }) => {
    const ext = name.split(".").pop().toLowerCase();
    let icon = <FileOutlined className="text-slate-450 dark:text-slate-500" />;

    if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) {
        icon = <FileImageOutlined style={{ color: '#3b82f6' }} />;
    } else if (["pdf"].includes(ext)) {
        icon = <FilePdfOutlined style={{ color: '#ef4444' }} />;
    } else if (["doc", "docx", "txt", "rtf", "odt"].includes(ext)) {
        icon = <FileWordOutlined style={{ color: '#6366f1' }} />;
    } else if (["xls", "xlsx", "csv"].includes(ext)) {
        icon = <FileExcelOutlined style={{ color: '#10b981' }} />;
    } else if (["zip", "rar", "tar", "gz", "7z"].includes(ext)) {
        icon = <FileZipOutlined style={{ color: '#f59e0b' }} />;
    } else if (["mp4", "mkv", "avi", "mov"].includes(ext)) {
        icon = <PlaySquareOutlined style={{ color: '#8b5cf6' }} />;
    } else if (["mp3", "wav", "ogg", "flac"].includes(ext)) {
        icon = <CustomerServiceOutlined style={{ color: '#06b6d4' }} />;
    } else if (["js", "jsx", "ts", "tsx", "html", "css", "json", "java", "py", "sh", "bat"].includes(ext)) {
        icon = <CodeOutlined style={{ color: '#14b8a6' }} />;
    } else if (["txt", "md"].includes(ext)) {
        icon = <FileTextOutlined style={{ color: '#64748b' }} />;
    }

    return <span className="shrink-0 flex items-center justify-center w-4 text-center">{icon}</span>;
};

const FormatBytes = (bytes) => {
    if (bytes === 0 || !bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const TreeNodeItem = ({ node, depth = 0, onExtractMetadata }) => {
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
                className={`flex items-center justify-between py-1.5 px-3 rounded-lg transition-all duration-150 group font-bold text-xs ${isDir ? "hover:bg-slate-100/60 dark:hover:bg-slate-800/40 cursor-pointer text-slate-800 dark:text-slate-205" : "hover:bg-slate-50/30 dark:hover:bg-slate-900/10 text-slate-600 dark:text-slate-400"}`}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {isDir ? (
                        <>
                            {isOpen ? (
                                <DownOutlined style={{ fontSize: '9px', color: '#94a3b8' }} className="w-3 shrink-0" />
                            ) : (
                                <RightOutlined style={{ fontSize: '9px', color: '#94a3b8' }} className="w-3 shrink-0" />
                            )}
                            {isOpen ? (
                                <FolderOpenFilled style={{ color: '#3b82f6', fontSize: '14px' }} className="shrink-0" />
                            ) : (
                                <FolderFilled style={{ color: '#60a5fa', fontSize: '14px' }} className="shrink-0" />
                            )}
                        </>
                    ) : (
                        <>
                            <span className="w-3 shrink-0"></span>
                            <FileIcon name={node.name} />
                        </>
                    )}
                    <span className="truncate font-semibold tracking-wide text-xs text-slate-700 dark:text-slate-300">{node.name}</span>
                </div>

                {!isDir && (
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 dark:text-slate-500 font-bold shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <span>{FormatBytes(node.size)}</span>
                        {node.modified && (
                            <span className="font-mono text-[9px]">{new Date(node.modified).toLocaleDateString()}</span>
                        )}
                        <Button 
                            type="text" 
                            icon={<InfoCircleOutlined />} 
                            size="small"
                            title="Extract Metadata"
                            onClick={(e) => { e.stopPropagation(); onExtractMetadata(node.path); }}
                            className="text-blue-500 hover:text-blue-700 p-0 m-0"
                        />
                    </div>
                )}
            </div>

            {isDir && isOpen && node.children && node.children.length > 0 && (
                <div className="mt-0.5 space-y-0.5 border-l border-slate-100 dark:border-slate-800 ml-5">
                    {node.children.map((child, index) => (
                        <TreeNodeItem key={child.path + "_" + index} node={child} depth={depth + 1} onExtractMetadata={onExtractMetadata} />
                    ))}
                </div>
            )}

            {isDir && isOpen && (!node.children || node.children.length === 0) && (
                <div 
                    style={{ paddingLeft: `${(depth + 1) * 1.25 + 1.25}rem` }}
                    className="py-1 text-[10px] text-slate-400 dark:text-slate-500 font-semibold italic"
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
    
    // Search state
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchResults, setSearchResults] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchParams, setSearchParams] = useState({
        keyword: "", minSize: null, maxSize: null, startDate: null, endDate: null
    });

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

    const handleExtractMetadata = (filePath) => {
        addToast("Extracting metadata...", "info");
        axios.post(`http://localhost:8080/api/metadata/extract-by-path`, null, { params: { path: filePath } })
            .then(res => {
                addToast("Metadata extracted successfully!", "success");
            })
            .catch(err => {
                addToast("Failed to extract metadata.", "error");
            });
    };

    const executeSearch = () => {
        setSearchLoading(true);
        axios.post(`http://localhost:8080/api/search`, searchParams)
            .then(res => {
                setSearchResults(res.data.content || []);
                setSearchLoading(false);
                setIsSearchOpen(false);
                addToast(`Found ${res.data.totalElements || res.data.content?.length || 0} results.`, "success");
            })
            .catch(err => {
                console.error("[WorkspaceExplorer] Search failed:", err);
                setSearchLoading(false);
                addToast("Search failed.", "error");
            });
    };

    useEffect(() => {
        if (explorerPath && treeData) {
            fetchTree();
        }
    }, [isVirtual]);

    const tabItems = [
        {
            key: 'physical',
            label: (
                <span>
                    <DatabaseOutlined className="mr-1" />
                    {t("physicalExplorer")}
                </span>
            )
        },
        {
            key: 'virtual',
            label: (
                <span>
                    <ExperimentOutlined className="mr-1" />
                    {t("virtualExplorer")}
                </span>
            )
        }
    ];

    return (
        <div className="space-y-4 max-w-4xl mx-auto">
        <Card 
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md rounded-2xl w-full"
            title={
                <div className="flex items-center gap-2 py-1">
                    <DatabaseOutlined className="text-indigo-500 text-lg" />
                    <div>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-100 block leading-tight">Workspace Explorer</span>
                        <span className="text-[10px] text-slate-450 dark:text-slate-400 font-semibold block mt-0.5">Explore physical or virtual preview layouts of your filesystem directories</span>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Directory Selector Panel */}
                <div className="flex flex-col sm:flex-row gap-2">
                    <Input 
                        value={explorerPath} 
                        onChange={(e) => {
                            setExplorerPath(e.target.value);
                            setTreeData(null);
                        }}
                        placeholder="Select a directory to scan"
                        className="bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 flex-grow font-mono font-bold text-slate-705 dark:text-slate-200"
                    />
                    <div className="flex gap-2">
                        <Button 
                            onClick={handleSelectFolder}
                            icon={<FolderOpenOutlined />}
                            className="h-full border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                        >
                            {t("browse")}
                        </Button>
                        <Button 
                            type="primary"
                            onClick={fetchTree}
                            icon={<FolderOpenOutlined />}
                            className="h-full bg-blue-600 hover:bg-blue-750 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0 border-0"
                        >
                            {t("scanFolder")}
                        </Button>
                        <Button 
                            onClick={() => setIsSearchOpen(true)}
                            icon={<SearchOutlined />}
                            className="h-full bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0 border-0"
                        >
                            Search
                        </Button>
                        {searchResults !== null && (
                            <Button onClick={() => setSearchResults(null)} className="h-full bg-slate-500 hover:bg-slate-600 text-white text-xs font-bold px-4 rounded-xl border-0">
                                Clear Search
                            </Button>
                        )}
                    </div>
                </div>

                {/* Mode Selector tabs */}
                <Tabs 
                    activeKey={isVirtual ? 'virtual' : 'physical'}
                    onChange={(key) => setIsVirtual(key === 'virtual')}
                    items={tabItems}
                    className="border-b border-slate-100 dark:border-slate-800"
                />

                {/* Explorer Display Area */}
                <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-150 dark:border-slate-800 min-h-[300px] max-h-[600px] overflow-y-auto">
                    {searchLoading ? (
                        <div className="flex flex-col items-center justify-center h-[280px] text-slate-400 dark:text-slate-500 space-y-3 font-semibold text-xs">
                            <Spin size="medium" />
                            <span>Searching...</span>
                        </div>
                    ) : searchResults !== null ? (
                        <Table 
                            dataSource={searchResults} 
                            rowKey="id"
                            size="small"
                            pagination={{ pageSize: 50 }}
                            columns={[
                                { title: 'Name', dataIndex: 'name', key: 'name' },
                                { title: 'Size', dataIndex: 'size', key: 'size', render: FormatBytes },
                                { title: 'Path', dataIndex: 'path', key: 'path' },
                                { title: 'Actions', key: 'actions', render: (_, r) => (
                                    <Button size="small" icon={<InfoCircleOutlined />} onClick={() => handleExtractMetadata(r.path)}>Extract Metadata</Button>
                                )}
                            ]}
                        />
                    ) : loading ? (
                        <div className="flex flex-col items-center justify-center h-[280px] text-slate-400 dark:text-slate-500 space-y-3 font-semibold text-xs">
                            <Spin size="medium" />
                            <span>Scanning workspace directory...</span>
                        </div>
                    ) : treeData ? (
                        <div className="space-y-1">
                            <TreeNodeItem node={treeData} depth={0} onExtractMetadata={handleExtractMetadata} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[280px] text-slate-400 dark:text-slate-550 space-y-2">
                            <DatabaseOutlined style={{ fontSize: '32px', opacity: 0.5 }} />
                            <span className="text-xs font-bold">No Directory Scanned</span>
                            <span className="text-[10px] font-bold opacity-75">Click "Scan Folder" to generate and display the tree structure.</span>
                        </div>
                    )}
                </div>
            </div>

            <Modal 
                title="Advanced Search" 
                open={isSearchOpen} 
                onOk={executeSearch} 
                onCancel={() => setIsSearchOpen(false)}
                okText="Search"
                confirmLoading={searchLoading}
            >
                <div className="space-y-3 mt-4">
                    <Input 
                        placeholder="Keyword (name, description, title)" 
                        value={searchParams.keyword}
                        onChange={e => setSearchParams({...searchParams, keyword: e.target.value})}
                    />
                    <div className="flex gap-2">
                        <InputNumber 
                            placeholder="Min Size (Bytes)" 
                            className="w-full"
                            value={searchParams.minSize}
                            onChange={v => setSearchParams({...searchParams, minSize: v})}
                        />
                        <InputNumber 
                            placeholder="Max Size (Bytes)" 
                            className="w-full"
                            value={searchParams.maxSize}
                            onChange={v => setSearchParams({...searchParams, maxSize: v})}
                        />
                    </div>
                </div>
            </Modal>
        </Card>
        </div>
    );
};

export default WorkspaceExplorer;
