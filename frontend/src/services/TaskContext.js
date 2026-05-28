import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";

const TaskContext = createContext();

export const TaskProvider = ({ children }) => {
    const [activeTasks, setActiveTasks] = useState({});
    const [toastQueue, setToastQueue] = useState([]);

    const addToast = (message, type = "info") => {
        const id = Math.random().toString(36).substr(2, 9);
        setToastQueue(prev => [...prev, { id, message, type }]);
        setTimeout(() => dismissToast(id), 6000);
    };

    const dismissToast = (id) => {
        setToastQueue(prev => prev.filter(t => t.id !== id));
    };

    const syncActiveTasks = () => {
        axios.get("http://localhost:8080/api/tasks/active")
            .then(res => {
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
            .catch(err => console.error("Failed to sync active tasks:", err));
    };

    useEffect(() => {
        // Handshake sync on mount
        syncActiveTasks();

        let socket;
        const connectWebSocket = () => {
            socket = new WebSocket("ws://localhost:8080/ws/progress");

            socket.onopen = () => {
                console.log("WebSocket connected for progress tracking.");
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.taskId) {
                        setActiveTasks(prev => {
                            const updated = { ...prev };
                            if (["COMPLETED", "COMPLETED_WITH_FAILURES", "FAILED", "CANCELED"].includes(data.status)) {
                                delete updated[data.taskId];
                                addToast(`Task ${data.taskType} ${data.status.replace(/_/g, " ")}: ${data.message}`, data.status.toLowerCase().includes("fail") ? "error" : "success");
                            } else {
                                updated[data.taskId] = data;
                            }
                            return updated;
                        });
                    }
                } catch (e) {
                    console.log("Ad-hoc logs:", event.data);
                }
            };

            socket.onclose = () => {
                console.warn("WebSocket disconnected. Retrying in 5 seconds...");
                setTimeout(connectWebSocket, 5000);
            };
        };

        connectWebSocket();

        return () => {
            if (socket) socket.close();
        };
    }, []);

    const cancelTask = async (taskId) => {
        try {
            await axios.post(`http://localhost:8080/api/tasks/${taskId}/cancel`);
            addToast("Cancellation signaled for task " + taskId, "info");
        } catch (e) {
            addToast("Failed to signal cancellation", "error");
        }
    };

    const cancelTasksBulk = async (taskIds) => {
        try {
            await axios.post("http://localhost:8080/api/tasks/cancel", { taskIds });
            addToast("Bulk cancellation signaled.", "info");
        } catch (e) {
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
