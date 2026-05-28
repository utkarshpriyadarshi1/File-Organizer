import { useState } from "react";
import Organizer from "./Organizer";
import Backup from "./Backup";
import Duplicates from "./Duplicates";
import Logs from "./Logs";
import Tasks from "./Tasks";
import Settings from "./Settings";
import SyncRestore from "./SyncRestore";
import TaskDrawer from "../components/TaskDrawer";
import ToastContainer from "../components/ToastContainer";

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState("dashboard");

    const renderComponent = () => {
        switch (activeTab) {
            case "dashboard":
                return (
                    <div className="space-y-6 max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Organizer />
                            <Backup />
                        </div>
                        <Duplicates />
                        <SyncRestore />
                    </div>
                );
            case "logs":
                return <Logs />;
            case "tasks":
                return <Tasks />;
            case "settings":
                return <Settings />;
            default:
                return (
                    <div className="space-y-6 max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Organizer />
                            <Backup />
                        </div>
                        <Duplicates />
                        <SyncRestore />
                    </div>
                );
        }
    };

    return (
        <div className="h-screen flex flex-col font-sans select-none overflow-hidden bg-slate-50 text-slate-800">
            {/* Header / Navigation Bar */}
            <nav className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-4 flex justify-between items-center shadow-lg">
                <span className="text-xl font-black tracking-tight flex items-center gap-2">
                    <i className="fa-solid fa-server text-sky-400"></i>
                    FBOSS Client
                </span>
                <div className="flex gap-1.5 text-sm font-semibold">
                    <button 
                        onClick={() => setActiveTab("dashboard")} 
                        className={`px-4 py-2 rounded-xl transition-all duration-150 flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20 active:scale-95 ${activeTab === "dashboard" ? "bg-white/20 text-white shadow-inner" : "hover:bg-white/10 text-white/90"}`}
                    >
                        <i className="fa-solid fa-table-columns"></i>
                        Dashboard
                    </button>
                    <button 
                        onClick={() => setActiveTab("logs")} 
                        className={`px-4 py-2 rounded-xl transition-all duration-150 flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20 active:scale-95 ${activeTab === "logs" ? "bg-white/20 text-white shadow-inner" : "hover:bg-white/10 text-white/90"}`}
                    >
                        <i className="fa-solid fa-terminal"></i>
                        System Logs
                    </button>
                    <button 
                        onClick={() => setActiveTab("tasks")} 
                        className={`px-4 py-2 rounded-xl transition-all duration-150 flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20 active:scale-95 ${activeTab === "tasks" ? "bg-white/20 text-white shadow-inner" : "hover:bg-white/10 text-white/90"}`}
                    >
                        <i className="fa-solid fa-list-check"></i>
                        Tasks
                    </button>
                    <button 
                        onClick={() => setActiveTab("settings")} 
                        className={`px-4 py-2 rounded-xl transition-all duration-150 flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20 active:scale-95 ${activeTab === "settings" ? "bg-white/20 text-white shadow-inner" : "hover:bg-white/10 text-white/90"}`}
                    >
                        <i className="fa-solid fa-sliders"></i>
                        Settings
                    </button>
                </div>
            </nav>

            {/* Active Component Area */}
            <div className="flex-grow p-6 overflow-y-auto bg-slate-50">
                {renderComponent()}
            </div>

            {/* Global Widgets */}
            <TaskDrawer />
            <ToastContainer />
        </div>
    );
};

export default Dashboard;
