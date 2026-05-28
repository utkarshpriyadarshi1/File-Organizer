import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";

const TaskContext = createContext();

export const TaskProvider = ({ children }) => {
    const [activeTasks, setActiveTasks] = useState({});
    const [toastQueue, setToastQueue] = useState([]);

    const addToast = (message, type = "info") => {
        const id = Math.random().toString(36).substr(2, 9);
        console.log(`[Toast] Added notification (${type}): "${message}"`);
        setToastQueue(prev => [...prev, { id, message, type }]);
        setTimeout(() => dismissToast(id), 6000);
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
                        taskId: task.id,
                        taskType: task.taskType,
                        status: task.status,
                        progress: 0.0,
                        message: task.summary
                    };
                });
                setActiveTasks(tasksObj);
            })
            .catch(err => console.error("[Sync] Failed to sync active tasks:", err));
    };

    useEffect(() => {
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
                        
                        if (["COMPLETED", "COMPLETED_WITH_FAILURES", "FAILED", "CANCELED"].includes(data.status)) {
                            console.log(`[WebSocket] Task terminated. Cleaning local context trace: ${data.taskId}`);
                            setActiveTasks(prev => {
                                const updated = { ...prev };
                                delete updated[data.taskId];
                                return updated;
                            });
                            addToast(`Task ${data.taskType} ${data.status.replace(/_/g, " ")}: ${data.message}`, data.status.toLowerCase().includes("fail") ? "error" : "success");
                        } else {
                            setActiveTasks(prev => {
                                return {
                                    ...prev,
                                    [data.taskId]: data
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

    return (
        <TaskContext.Provider value={{ activeTasks, toastQueue, cancelTask, cancelTasksBulk, addToast, dismissToast, syncActiveTasks }}>
            {children}
        </TaskContext.Provider>
    );
};

export const useTasks = () => useContext(TaskContext);
