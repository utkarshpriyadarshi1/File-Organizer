import { TaskStatus } from "../enums/SystemTypes";
import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import axios from "axios";
import { App as AntdApp } from "antd";
import FolderSelectorDialog from "../components/FolderSelectorDialog";

const TaskContext = createContext();

export const TaskProvider = ({ children }) => {
    const { modal } = AntdApp.useApp();
    const [activeTasks, setActiveTasks] = useState({});
    const [toastQueue, setToastQueue] = useState([]);
    const [folderSelectorConfig, setFolderSelectorConfig] = useState(null);
    const [notificationsHistory, setNotificationsHistory] = useState(() => {
        try {
            const saved = localStorage.getItem("file_organizer_notifications_history");
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem("file_organizer_notifications_history", JSON.stringify(notificationsHistory));
        } catch (e) {
            console.error("Failed to save notifications to localStorage:", e);
        }
    }, [notificationsHistory]);

    const addNotification = (message, title = "System Update", type = "info", metadata = null) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newNotification = {
            id,
            title,
            message,
            type,
            timestamp: new Date().toISOString(),
            read: false,
            metadata
        };
        setNotificationsHistory(prev => [newNotification, ...prev]);
    };

    const markAllNotificationsAsRead = useCallback(() => {
        setNotificationsHistory(prev => prev.map(n => n.read ? n : { ...n, read: true }));
    }, []);

    const markSingleAsRead = (id) => {
        setNotificationsHistory(prev => prev.map(n => n.id === id && !n.read ? { ...n, read: true } : n));
    };

    const clearAllNotifications = () => {
        setNotificationsHistory([]);
    };

    const removeSingleNotification = (id) => {
        setNotificationsHistory(prev => prev.filter(n => n.id !== id));
    };

    const showFolderSelector = (initialPath = "") => {
        return new Promise((resolve) => {
            setFolderSelectorConfig({
                initialPath,
                onSelect: (selectedPath) => {
                    setFolderSelectorConfig(null);
                    resolve(selectedPath);
                },
                onClose: () => {
                    setFolderSelectorConfig(null);
                    resolve("");
                }
            });
        });
    };

    const selectFolder = (initialPath = "") => {
        return showFolderSelector(initialPath);
    };

    const showAlert = (message, title = "System Notification", type = "info") => {
        addNotification(message, title, type);
        return new Promise((resolve) => {
            const config = {
                title: title,
                content: message,
                okText: "Acknowledge",
                onOk: () => resolve()
            };
            if (type === "success") {
                modal.success(config);
            } else if (type === "error") {
                modal.error(config);
            } else if (type === "warning") {
                modal.warning(config);
            } else {
                modal.info(config);
            }
        });
    };

    const addToast = (message, type = "info", metadata = null) => {
        const id = Math.random().toString(36).substr(2, 9);
        console.log(`[Toast] Added notification (${type}): "${message}"`);
        setToastQueue(prev => [...prev, { id, message, type }]);
        setTimeout(() => dismissToast(id), 6000);

        let title = "System Notification";
        if (metadata && metadata.actionDetails) {
            title = metadata.actionDetails;
        } else if (type === "success") {
            title = "Action Completed";
        } else if (type === "error") {
            title = "Error Occurred";
        } else if (type === "warning") {
            title = "System Warning";
        }
        addNotification(message, title, type, metadata);
    };

    const dismissToast = (id) => {
        console.log(`[Toast] Dismissed notification ID: ${id}`);
        setToastQueue(prev => prev.filter(t => t.id !== id));
    };

    const syncActiveTasks = () => {
        console.log("[Sync] Fetching active background tasks from server...");
        axios.get("http://localhost:8080/api/tasks/active")
            .then(res => {
                console.log(`[Sync] Active tasks synced. Total active: ${res.data.length}`);
                const tasksObj = {};
                res.data.forEach(task => {
                    tasksObj[task.id] = {
                        id: task.id,
                        taskId: task.id,
                        taskType: task.taskType,
                        status: task.status,
                        progress: 0.0,
                        summary: task.summary,
                        message: task.summary,
                        createdAt: task.createdAt,
                        sourcePath: task.sourcePath,
                        destinationPath: task.destinationPath,
                        actionDetails: task.actionDetails
                    };
                });
                setActiveTasks(tasksObj);
            })
            .catch(err => console.error("[Sync] Failed to sync active tasks:", err));
    };

    useEffect(() => {
        const nativeAlert = window.alert;
        window.alert = (message) => {
            console.log(`[Alert Override] Intercepted native alert: "${message}"`);
            let title = "System Alert";
            let type = "warning";
            const msgLower = String(message).toLowerCase();
            if (msgLower.includes("fail") || msgLower.includes("error")) {
                title = "Error Encountered";
                type = "error";
            } else if (msgLower.includes("not available") || msgLower.includes("first") || msgLower.includes("select") || msgLower.includes("no tasks") || msgLower.includes("no files")) {
                title = "Attention Required";
                type = "warning";
            } else if (msgLower.includes("success") || msgLower.includes("completed")) {
                title = "Action Successful";
                type = "success";
            }
            showAlert(message, title, type);
        };

        syncActiveTasks();

        let socket;
        const connectWebSocket = () => {
            socket = new WebSocket("ws://localhost:8080/ws/progress");

            socket.onopen = () => {
                console.log("[WebSocket] Connection established for progress tracking.");
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.taskId) {
                        console.log(`[WebSocket] Task Event: ID=${data.taskId}, Type=${data.taskType}, Status=${data.status}, Progress=${data.progress}%`);
                        
                        if ([TaskStatus.COMPLETED, TaskStatus.COMPLETED_WITH_FAILURES, TaskStatus.FAILED, TaskStatus.CANCELED].includes(data.status)) {
                            console.log(`[WebSocket] Task terminated. Cleaning local context trace: ${data.taskId}`);
                            setActiveTasks(prev => {
                                const updated = { ...prev };
                                delete updated[data.taskId];
                                return updated;
                            });
                            const toastType = data.status === TaskStatus.FAILED 
                                ? "error" 
                                : (data.status === TaskStatus.COMPLETED_WITH_FAILURES ? "warning" : "success");
                            const toastMsg = data.actionDetails 
                                ? `${data.actionDetails} - ${data.status.replace(/_/g, " ")}: ${data.message}`
                                : `Task ${data.taskType} ${data.status.replace(/_/g, " ")}: ${data.message}`;
                            
                            addToast(toastMsg, toastType, {
                                taskId: data.taskId,
                                taskType: data.taskType,
                                sourcePath: data.sourcePath,
                                destinationPath: data.destinationPath,
                                actionDetails: data.actionDetails
                            });
                        } else {
                            setActiveTasks(prev => {
                                const taskData = {
                                    ...data,
                                    id: data.taskId,
                                    summary: data.message,
                                    createdAt: prev[data.taskId]?.createdAt || new Date().toISOString()
                                };
                                return {
                                    ...prev,
                                    [data.taskId]: taskData
                                };
                            });
                        }
                    }
                } catch (e) {
                    console.log("[WebSocket] Ad-hoc logs:", event.data);
                }
            };

            socket.onclose = () => {
                console.warn("[WebSocket] Connection lost. Reconnecting in 5 seconds...");
                setTimeout(connectWebSocket, 5000);
            };
        };

        connectWebSocket();

        return () => {
            if (socket) {
                console.log("[WebSocket] Cleaning socket connection on unmount.");
                socket.close();
            }
            window.alert = nativeAlert;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cancelTask = async (taskId) => {
        console.log(`[TaskControl] Triggering cancellation request for task: ${taskId}`);
        try {
            await axios.post(`http://localhost:8080/api/tasks/${taskId}/cancel`);
            addToast("Cancellation signaled for task " + taskId, "info");
        } catch (e) {
            console.error(`[TaskControl] Failed to cancel task: ${taskId}`, e);
            addToast("Failed to signal cancellation", "error");
        }
    };

    const cancelTasksBulk = async (taskIds) => {
        console.log("[TaskControl] Triggering bulk cancellation request for tasks:", taskIds);
        try {
            await axios.post("http://localhost:8080/api/tasks/cancel", { taskIds });
            addToast("Bulk cancellation signaled.", "info");
        } catch (e) {
            console.error("[TaskControl] Failed to cancel tasks in bulk:", taskIds, e);
            addToast("Failed to signal bulk cancellations", "error");
        }
    };

    const unreadCount = notificationsHistory.filter(n => !n.read).length;

    return (
        <TaskContext.Provider value={{ 
            activeTasks, 
            toastQueue, 
            cancelTask, 
            cancelTasksBulk, 
            addToast, 
            dismissToast, 
            syncActiveTasks, 
            selectFolder,
            notificationsHistory,
            unreadCount,
            markAllNotificationsAsRead,
            markSingleAsRead,
            clearAllNotifications,
            removeSingleNotification
        }}>
            {children}
            <FolderSelectorDialog config={folderSelectorConfig} />
        </TaskContext.Provider>
    );
};

export const useTasks = () => useContext(TaskContext);
