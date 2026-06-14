import React, { useState, useEffect } from "react";
import Overview from "./Overview";
import Organizer from "./Organizer";
import Backup from "./Backup";
import Duplicates from "./Duplicates";
import Logs from "./Logs";
import Tasks from "./Tasks";
import Settings from "./Settings";
import SyncRestore from "./SyncRestore";
import Notifications from "./Notifications";
import Help from "./Help";
import TaskDrawer from "../components/TaskDrawer";
import ToastContainer from "../components/ToastContainer";
import { useTasks } from "../services/TaskContext";
import { useI18n } from "../services/I18nContext";
import appConfig from "../app.config.json";

const Dashboard = () => {
    useEffect(() => {
        document.title = `${appConfig.heading} - v${appConfig.version}`;
    }, []);
    const [activeTab, setActiveTab] = useState("dashboard");
    const { unreadCount, activeTasks } = useTasks();
    const { t } = useI18n();
    const activeTasksCount = Object.keys(activeTasks || {}).length;

    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("e_abhilekh_theme") || "light";
    });

    useEffect(() => {
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
        localStorage.setItem("e_abhilekh_theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === "light" ? "dark" : "light");
    };

    const renderComponent = () => {
        switch (activeTab) {
            case "dashboard":
                return <Overview setActiveTab={setActiveTab} />;
            case "organizer":
                return <Organizer />;
            case "backup":
                return <Backup />;
            case "duplicates":
                return <Duplicates />;
            case "sync":
                return <SyncRestore />;
            case "tasks":
                return <Tasks />;
            case "logs":
                return <Logs />;
            case "notifications":
                return <Notifications />;
            case "settings":
                return <Settings />;
            case "help":
                return <Help />;
            default:
                return <Overview setActiveTab={setActiveTab} />;
        }
    };

    return (
        <div className="h-screen flex font-sans select-none overflow-hidden bg-slate-50 text-slate-800">
            {/* Sidebar Navigation */}
            <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col justify-between shadow-2xl border-r border-slate-800 shrink-0">
                <div>
                    {/* Brand Logo Header */}
                    <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white text-base shadow-lg shadow-blue-500/20">
                            <i className="fa-solid fa-server"></i>
                        </div>
                        <div>
                            <span className="text-sm font-black tracking-wider block text-white">{appConfig.appName}</span>
                            <span className="text-[10px] font-bold text-slate-400 block leading-tight">{appConfig.subtitle}</span>
                        </div>
                    </div>

                    {/* Navigation Items */}
                    <nav className="p-4 space-y-1.5">
                        <p className="px-3 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">{t("operations")}</p>

                        <button
                            onClick={() => setActiveTab("dashboard")}
                            className={`w-full px-3.5 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-3 text-xs font-bold cursor-pointer active:scale-95 ${activeTab === "dashboard" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
                        >
                            <i className="fa-solid fa-table-columns text-[13px] w-4 text-center"></i>
                            {t("dashboardStats")}
                        </button>

                        <button
                            onClick={() => setActiveTab("organizer")}
                            className={`w-full px-3.5 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-3 text-xs font-bold cursor-pointer active:scale-95 ${activeTab === "organizer" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
                        >
                            <i className="fa-solid fa-folder-tree text-[13px] w-4 text-center"></i>
                            {t("fileOrganizer")}
                        </button>

                        <button
                            onClick={() => setActiveTab("backup")}
                            className={`w-full px-3.5 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-3 text-xs font-bold cursor-pointer active:scale-95 ${activeTab === "backup" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
                        >
                            <i className="fa-solid fa-shield-halved text-[13px] w-4 text-center"></i>
                            {t("backupRestore")}
                        </button>

                        <button
                            onClick={() => setActiveTab("duplicates")}
                            className={`w-full px-3.5 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-3 text-xs font-bold cursor-pointer active:scale-95 ${activeTab === "duplicates" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
                        >
                            <i className="fa-solid fa-copy text-[13px] w-4 text-center"></i>
                            {t("duplicateCleaner")}
                        </button>

                        <button
                            onClick={() => setActiveTab("sync")}
                            className={`w-full px-3.5 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-3 text-xs font-bold cursor-pointer active:scale-95 ${activeTab === "sync" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
                        >
                            <i className="fa-solid fa-shuffle text-[13px] w-4 text-center"></i>
                            {t("syncVersioning")}
                        </button>

                        <div className="pt-4 pb-2">
                            <p className="px-3 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">{t("monitoring")}</p>
                        </div>

                        <button
                            onClick={() => setActiveTab("tasks")}
                            className={`w-full px-3.5 py-2.5 rounded-xl transition-all duration-150 flex items-center justify-between text-xs font-bold cursor-pointer active:scale-95 ${activeTab === "tasks" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
                        >
                            <span className="flex items-center gap-3">
                                <i className="fa-solid fa-list-check text-[13px] w-4 text-center"></i>
                                {t("tasks")}
                            </span>
                            {activeTasksCount > 0 && (
                                <span className="bg-blue-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 min-w-[16px] text-center animate-pulse">
                                    {activeTasksCount}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab("logs")}
                            className={`w-full px-3.5 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-3 text-xs font-bold cursor-pointer active:scale-95 ${activeTab === "logs" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
                        >
                            <i className="fa-solid fa-terminal text-[13px] w-4 text-center"></i>
                            {t("systemLogs")}
                        </button>

                        <button
                            onClick={() => setActiveTab("notifications")}
                            className={`w-full px-3.5 py-2.5 rounded-xl transition-all duration-150 flex items-center justify-between text-xs font-bold cursor-pointer active:scale-95 ${activeTab === "notifications" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
                        >
                            <span className="flex items-center gap-3">
                                <i className="fa-solid fa-bell text-[13px] w-4 text-center"></i>
                                {t("notifications")}
                            </span>
                            {unreadCount > 0 && (
                                <span className="bg-rose-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 min-w-[16px] text-center">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab("settings")}
                            className={`w-full px-3.5 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-3 text-xs font-bold cursor-pointer active:scale-95 ${activeTab === "settings" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
                        >
                            <i className="fa-solid fa-sliders text-[13px] w-4 text-center"></i>
                            {t("settings")}
                        </button>
                    </nav>
                </div>

                {/* Sidebar Footer Status Indicator */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-[10px] text-slate-500 flex flex-col gap-1">
                    <div className="flex items-center justify-between font-semibold">
                        <span>{t("status")}:</span>
                        <span className="flex items-center gap-1 text-emerald-400 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            {t("online")}
                        </span>
                    </div>
                    <div className="flex items-center justify-between font-semibold">
                        <span>{t("appVersion")}:</span>
                        <span className="text-slate-400">v{appConfig.version}</span>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-grow flex flex-col overflow-hidden bg-slate-50">
                {/* Top Header Bar */}
                <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0 shadow-sm">
                    <div className="text-sm font-bold text-gray-700 capitalize">
                        {t(activeTab) || activeTab}
                    </div>
                    {/* Top Right Actions */}
                    <div className="flex items-center gap-3">
                        {/* Day/Night theme button */}
                        <button
                            onClick={toggleTheme}
                            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all duration-150 flex items-center justify-center cursor-pointer border border-gray-200 dark:border-gray-750 shadow-sm active:scale-95"
                        >
                            <i className={`fa-solid ${theme === "dark" ? "fa-sun text-amber-500" : "fa-moon text-blue-600"} text-base`}></i>
                        </button>

                        {/* Preferences/Setting button */}
                        <button
                            onClick={() => setActiveTab("settings")}
                            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all duration-150 flex items-center justify-center cursor-pointer border border-gray-200 dark:border-gray-750 shadow-sm active:scale-95"
                        >
                            <i className="fa-solid fa-sliders text-base text-teal-600"></i>
                        </button>

                        {/* console log view button */}
                        <button
                            onClick={() => setActiveTab("logs")}
                            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all duration-150 flex items-center justify-center cursor-pointer border border-gray-200 dark:border-gray-750 shadow-sm active:scale-95"
                        >
                            <i className="fa-solid fa-terminal text-base text-indigo-600"></i>
                        </button>

                        {/* help section button */}
                        <button
                            onClick={() => setActiveTab("help")}
                            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all duration-150 flex items-center justify-center cursor-pointer border border-gray-200 dark:border-gray-750 shadow-sm active:scale-95"
                        >
                            <i className="fa-solid fa-circle-question text-base text-rose-500"></i>
                        </button>
                    </div>
                </header>

                {/* Active Component Area */}
                <div className="flex-grow p-6 overflow-y-auto">
                    {renderComponent()}
                </div>
            </div>

            {/* Global Widgets */}
            <TaskDrawer />
            <ToastContainer />
        </div>
    );
};

export default Dashboard;
