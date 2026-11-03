import React, { useState, useEffect, Suspense, lazy, useCallback } from "react";
import apiClient from "../services/apiClient";
import { Layout, Sider, Header, Content, Menu, Button, Badge } from "../components/common";
import { Tooltip } from "antd";
import {
    FolderOpenOutlined,
    DeploymentUnitOutlined,
    CopyOutlined,
    UnorderedListOutlined,
    BellOutlined,
    SettingOutlined,
    QuestionCircleOutlined,
    SunOutlined,
    MoonOutlined,
    HomeOutlined,
    HistoryOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    DashboardOutlined,
    WarningOutlined,
    ReloadOutlined
} from "@ant-design/icons";
import TaskDrawer from "../components/TaskDrawer";
import ErrorBoundary from "../components/ErrorBoundary";
import { useTasks } from "../services/TaskContext";
import { useI18n } from "../services/I18nContext";
import appConfig from "../app.config.json";

// Lazy-loaded views
const Overview = lazy(() => import("./Overview"));
const Organizer = lazy(() => import("./Organizer"));
const Duplicates = lazy(() => import("./Duplicates"));
const Tasks = lazy(() => import("./Tasks"));
const Settings = lazy(() => import("./Settings"));
const Notifications = lazy(() => import("./Notifications"));
const Logs = lazy(() => import("./Logs"));
const Help = lazy(() => import("./Help"));
const WorkspaceExplorer = lazy(() => import("./WorkspaceExplorer"));

const Dashboard = ({ theme, toggleTheme }) => {
    useEffect(() => {
        document.title = `${appConfig.heading} - v${appConfig.version}`;
    }, []);

    const [activeTab, setActiveTab] = useState("overview");
    const [collapsed, setCollapsed] = useState(false);
    const [settingsSubTab, setSettingsSubTab] = useState("general");
    const [serverStatus, setServerStatus] = useState({ online: true, memoryUsedMb: 0, memoryTotalMb: 0, activeTasks: 0 });
    const { unreadCount, activeTasks, wsConnected } = useTasks();
    const { t } = useI18n();
    const activeTasksCount = Object.keys(activeTasks || {}).length;

    // Heartbeat Poll to monitor backend process health
    const checkHeartbeat = useCallback(async () => {
        try {
            const res = await apiClient.get("/telemetry/heartbeat", { timeout: 3000 });
            setServerStatus({ online: true, ...res.data });
        } catch (err) {
            setServerStatus(prev => ({ ...prev, online: false }));
        }
    }, []);

    useEffect(() => {
        checkHeartbeat();
        const interval = setInterval(checkHeartbeat, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [checkHeartbeat]);

    const renderComponent = () => {
        switch (activeTab) {
            case "overview":
                return <Overview setActiveTab={setActiveTab} />;
            case "organizer":
                return <Organizer />;
            case "duplicates":
                return <Duplicates />;
            case "workspaceExplorer":
                return <WorkspaceExplorer />;
            case "tasks":
                return <Tasks />;
            case "notifications":
                return <Notifications />;
            case "logs":
                return <Logs />;
            case "settings":
                return <Settings defaultSubTab={settingsSubTab} />;
            case "help":
                return <Help />;
            default:
                return <Overview setActiveTab={setActiveTab} />;
        }
    };

    const getTabTitle = (tab) => {
        switch (tab) {
            case "overview": return t("overview") || "System Overview";
            case "organizer": return t("fileOrganizer") || "Organizer";
            case "duplicates": return t("duplicates") || "Duplicate Finder";
            case "workspaceExplorer": return t("workspaceExplorer") || "Disk Analyzer";
            case "tasks": return t("tasks") || "Tasks";
            case "notifications": return t("notifications") || "Notifications";
            case "logs": return t("systemLogs") || "System Logs";
            case "settings": return t("settings") || "Settings";
            case "help": return t("help") || "Help & Docs";
            default: return tab;
        }
    };

    const menuItems = [
        {
            key: 'overview',
            icon: <DashboardOutlined style={{ fontSize: '15px' }} />,
            label: <span className="font-semibold text-xs">{t("overview") || "Overview"}</span>,
        },
        {
            key: 'operations-grp',
            type: 'group',
            label: <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t("operations") || "Operations"}</span>,
            children: [
                {
                    key: 'organizer',
                    icon: <FolderOpenOutlined style={{ fontSize: '15px' }} />,
                    label: <span className="font-semibold text-xs">{t("fileOrganizer") || "Organizer"}</span>,
                },
                {
                    key: 'duplicates',
                    icon: <CopyOutlined style={{ fontSize: '15px' }} />,
                    label: <span className="font-semibold text-xs">{t("duplicates") || "Duplicate Finder"}</span>,
                },
                {
                    key: 'workspaceExplorer',
                    icon: <DeploymentUnitOutlined style={{ fontSize: '15px' }} />,
                    label: <span className="font-semibold text-xs">{t("workspaceExplorer") || "Disk Analyzer"}</span>,
                },
            ]
        },
        {
            key: 'monitoring-grp',
            type: 'group',
            label: <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t("monitoring") || "System"}</span>,
            children: [
                {
                    key: 'tasks',
                    icon: <UnorderedListOutlined style={{ fontSize: '15px' }} />,
                    label: (
                        <div className="flex justify-between items-center pr-2 font-semibold text-xs">
                            <span>{t("tasks") || "Tasks"}</span>
                            {activeTasksCount > 0 && <Badge count={activeTasksCount} size="small" style={{ backgroundColor: '#2563eb' }} />}
                        </div>
                    ),
                },
                {
                    key: 'notifications',
                    icon: <BellOutlined style={{ fontSize: '15px' }} />,
                    label: (
                        <div className="flex justify-between items-center pr-2 font-semibold text-xs">
                            <span>{t("notifications") || "Notifications"}</span>
                            {unreadCount > 0 && <Badge count={unreadCount} size="small" style={{ backgroundColor: '#f43f5e' }} />}
                        </div>
                    ),
                },
                {
                    key: 'logs',
                    icon: <HistoryOutlined style={{ fontSize: '15px' }} />,
                    label: <span className="font-semibold text-xs">{t("systemLogs") || "Activity Logs"}</span>,
                },
                {
                    key: 'settings',
                    icon: <SettingOutlined style={{ fontSize: '15px' }} />,
                    label: <span className="font-semibold text-xs">{t("settings") || "Settings"}</span>,
                },
                {
                    key: 'help',
                    icon: <QuestionCircleOutlined style={{ fontSize: '15px' }} />,
                    label: <span className="font-semibold text-xs">{t("help") || "Help & Docs"}</span>,
                },
            ]
        }
    ];

    const isDark = theme === "dark";
    const isDisconnected = !serverStatus.online || !wsConnected;

    return (
        <Layout style={{ minHeight: '100vh', overflow: 'hidden' }} className="select-none font-sans">
            {/* Navigation Sidebar */}
            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={setCollapsed}
                trigger={null}
                width={240}
                collapsedWidth={72}
                theme={isDark ? "dark" : "light"}
                className={`border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-40 select-none shadow-sm flex flex-col justify-between ${
                    isDark ? "bg-slate-900" : "bg-white"
                }`}
            >
                {/* Brand / Logo Top Bar */}
                <div 
                    className="h-16 flex items-center gap-3 px-4 cursor-pointer border-b border-slate-100 dark:border-slate-800/80 transition-opacity hover:opacity-90 overflow-hidden"
                    onClick={() => setActiveTab("overview")}
                    title="Go to Overview"
                >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-base shadow-md shrink-0">
                        <i className="fa-solid fa-folder-tree"></i>
                    </div>
                    {!collapsed && (
                        <div className="flex flex-col min-w-0 transition-opacity duration-300">
                            <span className="text-sm font-black tracking-wide text-slate-800 dark:text-slate-100 truncate">
                                {appConfig.appName}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                v{appConfig.version}
                            </span>
                        </div>
                    )}
                </div>

                {/* Navigation Menu */}
                <div className="flex-1 overflow-y-auto py-2">
                    <Menu
                        theme={isDark ? "dark" : "light"}
                        mode="inline"
                        selectedKeys={[activeTab]}
                        onClick={({ key }) => setActiveTab(key)}
                        items={menuItems}
                        className="border-none font-medium text-xs"
                    />
                </div>

                {/* Sider Footer / Telemetry Pill & Collapse Toggle */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <Tooltip title={serverStatus.online ? `Server Online\nTasks: ${serverStatus.activeTasks}\nMemory: ${serverStatus.memoryUsedMb}MB / ${serverStatus.memoryTotalMb}MB` : "Server Offline - Connection Lost"}>
                        <div 
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 cursor-pointer"
                            onClick={checkHeartbeat}
                        >
                            <span className={`w-2.5 h-2.5 rounded-full ${serverStatus.online ? (wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500') : 'bg-rose-500'}`} />
                            {!collapsed && (
                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                    {serverStatus.online ? (wsConnected ? "Online" : "WS Syncing") : "Offline"}
                                </span>
                            )}
                        </div>
                    </Tooltip>
                    <Button
                        type="text"
                        size="small"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        className="text-slate-500 hover:text-blue-600 dark:text-slate-400"
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    />
                </div>
            </Sider>

            {/* Main Application Area */}
            <Layout className="bg-slate-50 dark:bg-slate-950 flex flex-col flex-1 h-screen overflow-hidden">
                {/* Header Bar */}
                <Header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 h-16 flex items-center justify-between px-6 shadow-sm sticky top-0 z-30 transition-colors duration-300">
                    <div className="flex items-center gap-3">
                        <Button
                            type="text"
                            icon={collapsed ? <MenuUnfoldOutlined style={{ fontSize: '16px' }} /> : <MenuFoldOutlined style={{ fontSize: '16px' }} />}
                            onClick={() => setCollapsed(!collapsed)}
                            className="text-slate-600 dark:text-slate-300 hover:text-blue-600 flex items-center justify-center p-0 w-8 h-8 rounded-lg"
                        />
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {getTabTitle(activeTab)}
                            </span>
                        </div>
                    </div>

                    {/* Top Right Actions */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Button
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-gray-200 dark:border-gray-700 shadow-sm active:scale-95 rounded-xl flex items-center justify-center h-9 px-3"
                            icon={<HomeOutlined style={{ fontSize: '14px', color: '#10b981' }} />}
                            onClick={() => setActiveTab("overview")}
                            title="Go to Overview"
                        >
                            <span className="text-xs font-bold ml-1 hidden sm:inline">Home</span>
                        </Button>
                        <Button
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-gray-200 dark:border-gray-700 shadow-sm active:scale-95 rounded-xl flex items-center justify-center h-9 px-3"
                            icon={<HistoryOutlined style={{ fontSize: '14px', color: '#2563eb' }} />}
                            onClick={() => setActiveTab("tasks")}
                            title="History & Tasks"
                        >
                            <span className="text-xs font-bold ml-1">Tasks</span>
                            {activeTasksCount > 0 && <Badge count={activeTasksCount} size="small" style={{ backgroundColor: '#2563eb', marginLeft: '6px' }} />}
                        </Button>
                        <Button
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-gray-200 dark:border-gray-700 shadow-sm active:scale-95 w-9 h-9 rounded-xl flex items-center justify-center p-0"
                            icon={theme === "dark" ? <SunOutlined style={{ fontSize: '14px', color: '#f59e0b' }} /> : <MoonOutlined style={{ fontSize: '14px', color: '#2563eb' }} />}
                            onClick={toggleTheme}
                            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        />
                        <Button
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-gray-200 dark:border-gray-700 shadow-sm active:scale-95 w-9 h-9 rounded-xl flex items-center justify-center p-0"
                            icon={<SettingOutlined style={{ fontSize: '14px', color: '#0d9488' }} />}
                            onClick={() => {
                                setSettingsSubTab("general");
                                setActiveTab("settings");
                            }}
                            title="Settings"
                        />
                    </div>
                </Header>

                {/* Content View with Suspense & View-Level Error Boundary */}
                <Content className="overflow-y-auto flex-1 bg-slate-50 dark:bg-[#0b0f19]">
                    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full min-h-[500px]">
                        {/* Unobtrusive Network / Connection Warning Banner */}
                        {isDisconnected && (
                            <div className="mb-4 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-400 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-2.5">
                                    <WarningOutlined className="text-amber-600 text-sm" />
                                    <span>
                                        {!serverStatus.online
                                            ? "Backend connection interrupted. Some actions may be temporarily unavailable."
                                            : "Real-time task synchronization is reconnecting..."}
                                    </span>
                                </div>
                                <Button
                                    size="small"
                                    type="text"
                                    icon={<ReloadOutlined />}
                                    className="text-amber-800 dark:text-amber-300 font-bold hover:bg-amber-500/20 rounded-lg text-xs"
                                    onClick={checkHeartbeat}
                                >
                                    Reconnect
                                </Button>
                            </div>
                        )}

                        <ErrorBoundary onReset={() => setActiveTab("overview")}>
                            <Suspense fallback={
                                <div className="flex items-center justify-center w-full h-full py-20">
                                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            }>
                                {renderComponent()}
                            </Suspense>
                        </ErrorBoundary>
                    </div>
                </Content>
            </Layout>

            <TaskDrawer />
        </Layout>
    );
};

export default Dashboard;
