import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Table, Tag, Button, Spin, Card } from "./common";
import { TaskType, TaskStatus } from "../enums/SystemTypes";
import GenericResultViewer from "./GenericResultViewer";
import {
    FolderOpenOutlined,
    SafetyCertificateOutlined,
    CopyOutlined,
    SyncOutlined,
    UnorderedListOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ClockCircleOutlined,
    InfoCircleOutlined,
    HistoryOutlined
} from "@ant-design/icons";

const TaskHistoryWidget = ({ filterTaskType = "ALL", limit = 10 }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    const fetchHistory = () => {
        setLoading(true);
        axios.get("http://localhost:8080/api/tasks/history")
            .then(res => {
                setHistory(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("[TaskHistoryWidget] Failed to fetch history:", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchHistory();
        const interval = setInterval(() => {
            fetchHistory();
        }, 15000); // refresh every 15s
        return () => clearInterval(interval);
    }, []);

    const filteredHistory = useMemo(() => {
        let filtered = history;
        if (filterTaskType !== "ALL") {
            filtered = history.filter(t => t.taskType === filterTaskType);
        }
        return filtered.sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt)).slice(0, limit);
    }, [history, filterTaskType, limit]);

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

    const getStatusColor = (status) => {
        switch (status) {
            case TaskStatus.COMPLETED: return "success";
            case TaskStatus.COMPLETED_WITH_FAILURES: return "warning";
            case TaskStatus.FAILED: return "error";
            case TaskStatus.CANCELED: return "default";
            case TaskStatus.RUNNING: return "processing";
            case TaskStatus.QUEUED: return "warning";
            default: return "default";
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
                    <div className="font-semibold text-slate-700 dark:text-slate-350">{text || record.actionDetails || "Operation completed."}</div>
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
                    {text ? new Date(text).toLocaleString() : "Unknown"}
                </span>
            )
        },
        {
            title: <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actions</span>,
            key: 'actions',
            render: (_, record) => (
                <Button 
                    size="small"
                    icon={<InfoCircleOutlined />}
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTask(record);
                    }}
                    className="text-[10px] font-bold"
                    title="View Details"
                >
                    View
                </Button>
            )
        }
    ];

    if (selectedTask) {
        return (
            <div className="fixed inset-0 z-[100] bg-white dark:bg-[#0b0f19] overflow-auto">
                <GenericResultViewer
                    task={selectedTask}
                    onClose={() => {
                        setSelectedTask(null);
                        fetchHistory();
                    }}
                />
            </div>
        );
    }

    return (
        <Card
            className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-white/50 dark:border-slate-800/80 shadow-2xl shadow-indigo-500/5 rounded-3xl mt-8"
            title={
                <div className="flex items-center gap-4 py-2">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-sky-100 dark:from-indigo-900/60 dark:to-sky-900/60 text-indigo-500 flex items-center justify-center text-xl shadow-inner">
                        <HistoryOutlined />
                    </div>
                    <div>
                        <span className="text-base font-black text-slate-800 dark:text-slate-100 block leading-tight tracking-tight">Recent History</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block mt-1">View the latest {filterTaskType !== "ALL" ? filterTaskType.toLowerCase() : ""} operations</span>
                    </div>
                </div>
            }
        >
            <Table
                columns={columns}
                dataSource={filteredHistory}
                rowKey="id"
                pagination={false}
                size="small"
                loading={loading}
                className="text-xs"
                locale={{ emptyText: "No recent history found." }}
            />
        </Card>
    );
};

export default TaskHistoryWidget;
