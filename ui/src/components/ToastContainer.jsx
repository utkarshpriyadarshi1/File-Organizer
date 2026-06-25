import React from "react";
import { useTasks } from "../services/TaskContext";

const ToastContainer = () => {
    const { toastQueue, dismissToast } = useTasks();

    if (toastQueue.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
            {toastQueue.map(toast => {
                let bgStyle = "bg-white border-blue-500 text-gray-800";
                if (toast.type === "error") bgStyle = "bg-red-50 border-red-500 text-red-900";
                if (toast.type === "success") bgStyle = "bg-green-50 border-green-500 text-green-900";

                return (
                    <div 
                        key={toast.id}
                        className={`flex justify-between items-start border-l-4 shadow-xl rounded-xl p-4 transition-all duration-300 animate-slide-in ${bgStyle}`}
                    >
                        <div className="flex-grow pr-3">
                            <p className="text-sm font-medium leading-tight">{toast.message}</p>
                        </div>
                        <button 
                            onClick={() => dismissToast(toast.id)}
                            className="text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                            &times;
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default ToastContainer;
