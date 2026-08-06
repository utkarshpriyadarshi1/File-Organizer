import { useState } from "react";
import axios from "axios";
import { useTasks } from "../services/TaskContext";
import { TaskStatus } from "../enums/SystemTypes";
import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";

const TaskDrawer = () => {
    const { activeTasks, cancelTask } = useTasks();
    const [isOpen, setIsOpen] = useState(false);

    const handlePause = async (taskId, e) => {
        if (e) e.stopPropagation();
        try {
            await axios.post(`http://localhost:8080/api/tasks/${taskId}/pause`);
        } catch (err) {
            console.error(`[TaskDrawer] Failed to pause task ${taskId}`, err);
        }
    };

    const handleResume = async (taskId, e) => {
        if (e) e.stopPropagation();
        try {
            await axios.post(`http://localhost:8080/api/tasks/${taskId}/resume`);
        } catch (err) {
            console.error(`[TaskDrawer] Failed to resume task ${taskId}`, err);
        }
    };

    const tasksList = Object.values(activeTasks);
    if (tasksList.length === 0) return null;

    const visibleTasksList = tasksList.slice(0, 5);

    return (
        <div className="fixed bottom-4 right-4 z-40 max-w-md w-full">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl shadow-lg flex justify-between items-center transition-all duration-200"
            >
                <span className="flex items-center">
                    <span className="relative flex h-3 w-3 mr-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                    </span>
                    Running Operations ({tasksList.length})
                </span>
                <span>{isOpen ? <ArrowDownOutlined /> : <ArrowUpOutlined />}</span>
            </button>

            {/* Tasks List */}
            {isOpen && (
                <div className="mt-2 bg-white/95 border border-gray-200 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md max-h-96 overflow-y-auto transition-all duration-300">
                    <div className="p-4 space-y-4">
                        {visibleTasksList.map(task => (
                            <div key={task.taskId} className="bg-gray-50 border border-gray-100 rounded-xl p-3 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-semibold text-gray-800 text-sm">{task.taskType}</h4>
                                        <p className="text-xs text-gray-500 font-mono truncate max-w-[240px]">{task.taskId}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {task.status === TaskStatus.RUNNING && (
                                            <button
                                                onClick={(e) => handlePause(task.taskId, e)}
                                                className="text-[10px] font-bold text-yellow-600 hover:text-yellow-700 bg-yellow-50 hover:bg-yellow-100 py-1 px-2 rounded-lg transition-colors duration-200"
                                            >
                                                Pause
                                            </button>
                                        )}
                                        {task.status === TaskStatus.PAUSED && (
                                            <button
                                                onClick={(e) => handleResume(task.taskId, e)}
                                                className="text-[10px] font-bold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 py-1 px-2 rounded-lg transition-colors duration-200"
                                            >
                                                Resume
                                            </button>
                                        )}
                                        <button
                                            onClick={() => cancelTask(task.taskId)}
                                            className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 py-1 px-2 rounded-lg transition-colors duration-200"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-gray-600">
                                        <span className="truncate max-w-[280px]">{task.message || "Working..."}</span>
                                        <span className="font-bold">{task.progress.toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${task.status === TaskStatus.PAUSED ? 'bg-yellow-400' : 'bg-blue-600'}`}
                                            style={{ width: `${task.progress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {tasksList.length > 5 && (
                            <div className="text-center text-[10px] text-gray-500 bg-gray-50 border border-gray-100 p-2.5 rounded-xl font-semibold select-none border-dashed">
                                <span>+ {tasksList.length - 5} more running operations. View all under the Tasks tab.</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskDrawer;
