import { useState } from "react";
import Organizer from "./Organizer";
import Backup from "./Backup";
import Duplicates from "./Duplicates";
import Logs from "./Logs";
import History from "./History";
import Settings from "./Settings";
import SyncRestore from "./SyncRestore";
import TaskDrawer from "../components/TaskDrawer";
import ToastContainer from "../components/ToastContainer";

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState("organize");

    const renderComponent = () => {
        switch (activeTab) {
            case "organize":
                return <Organizer />;
            case "backup":
                return <Backup />;
            case "duplicates":
                return <Duplicates />;
            case "sync-restore":
                return <SyncRestore />;
            case "logs":
                return <Logs />;
            case "history":
                return <History />;
            case "settings":
                return <Settings />;
            default:
                return <Organizer />;
        }
    };

    return (
        <div className="h-screen flex flex-col font-sans select-none overflow-hidden bg-slate-50 text-slate-800">
            {/* Header / Navigation Bar */}
            <nav className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md">
                <span className="text-xl font-extrabold tracking-tight">FBOSS Client</span>
                <div className="flex gap-1 text-sm font-semibold">
                    <button 
                        onClick={() => setActiveTab("organize")} 
                        className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === "organize" ? "bg-white/20 text-white" : "hover:bg-white/10"}`}
                    >
                        Organize
                    </button>
                    <button 
                        onClick={() => setActiveTab("backup")} 
                        className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === "backup" ? "bg-white/20 text-white" : "hover:bg-white/10"}`}
                    >
                        Backup
                    </button>
                    <button 
                        onClick={() => setActiveTab("sync-restore")} 
                        className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === "sync-restore" ? "bg-white/20 text-white" : "hover:bg-white/10"}`}
                    >
                        Sync & Restore
                    </button>
                    <button 
                        onClick={() => setActiveTab("duplicates")} 
                        className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === "duplicates" ? "bg-white/20 text-white" : "hover:bg-white/10"}`}
                    >
                        Remove Duplicates
                    </button>
                    <button 
                        onClick={() => setActiveTab("logs")} 
                        className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === "logs" ? "bg-white/20 text-white" : "hover:bg-white/10"}`}
                    >
                        System Logs
                    </button>
                    <button 
                        onClick={() => setActiveTab("history")} 
                        className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === "history" ? "bg-white/20 text-white" : "hover:bg-white/10"}`}
                    >
                        Task History
                    </button>
                    <button 
                        onClick={() => setActiveTab("settings")} 
                        className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === "settings" ? "bg-white/20 text-white" : "hover:bg-white/10"}`}
                    >
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
