import React, { useState, useEffect } from "react";
import { Layout, Menu, Button, Badge } from "../components/common";
import {
    DashboardOutlined,
    FolderOpenOutlined,
    DeploymentUnitOutlined,
    SafetyCertificateOutlined,
    CopyOutlined,
    SyncOutlined,
    UnorderedListOutlined,
    BellOutlined,
    SettingOutlined,
    QuestionCircleOutlined,
    SunOutlined,
    MoonOutlined,
    DesktopOutlined,
    GlobalOutlined,
    HomeOutlined,
    HistoryOutlined
} from "@ant-design/icons";
import Organizer from "./Organizer";
import Tasks from "./Tasks";
import Settings from "./Settings";
import Notifications from "./Notifications";
import Help from "./Help";
import WorkspaceExplorer from "./WorkspaceExplorer";
import TaskDrawer from "../components/TaskDrawer";
import ToastContainer from "../components/ToastContainer";
import { useTasks } from "../services/TaskContext";
import { useI18n } from "../services/I18nContext";
import appConfig from "../app.config.json";

const { Header, Content } = Layout;

const Dashboard = ({ theme, toggleTheme }) => {
    useEffect(() => {
        document.title = `${appConfig.heading} - v${appConfig.version}`;
    }, []);
    const [activeTab, setActiveTab] = useState("organizer");
    const [settingsSubTab, setSettingsSubTab] = useState("general");
    const { unreadCount, activeTasks } = useTasks();
    const { t } = useI18n();
    const activeTasksCount = Object.keys(activeTasks || {}).length;

    const renderComponent = () => {
        switch (activeTab) {
            case "organizer":
                return <Organizer />;
            case "tasks":
                return <Tasks />;
            case "notifications":
                return <Notifications />;
            case "workspaceExplorer":
                return <WorkspaceExplorer />;
            case "settings":
                return <Settings defaultSubTab={settingsSubTab} />;
            default:
                return <Organizer />;
        }
    };

    const menuItems = [
        {
            key: 'operations-grp',
            type: 'group',
            label: <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t("operations")}</span>,
            children: [
                {
                    key: 'organizer',
                    icon: <FolderOpenOutlined style={{ fontSize: '14px' }} />,
                    label: <span className="font-bold text-xs">{t("fileOrganizer")}</span>,
                },
                {
                    key: 'workspaceExplorer',
                    icon: <DeploymentUnitOutlined style={{ fontSize: '14px' }} />,
                    label: <span className="font-bold text-xs">{t("workspaceExplorer")}</span>,
                },
            ]
        },
        {
            key: 'monitoring-grp',
            type: 'group',
            label: <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t("monitoring")}</span>,
            children: [
                {
                    key: 'tasks',
                    icon: <UnorderedListOutlined style={{ fontSize: '14px' }} />,
                    label: (
                        <div className="flex justify-between items-center pr-2 font-bold text-xs">
                            <span>{t("tasks")}</span>
                            {activeTasksCount > 0 && <Badge count={activeTasksCount} size="small" style={{ backgroundColor: '#2563eb' }} />}
                        </div>
                    ),
                },
                {
                    key: 'notifications',
                    icon: <BellOutlined style={{ fontSize: '14px' }} />,
                    label: (
                        <div className="flex justify-between items-center pr-2 font-bold text-xs">
                            <span>{t("notifications")}</span>
                            {unreadCount > 0 && <Badge count={unreadCount} size="small" style={{ backgroundColor: '#f43f5e' }} />}
                        </div>
                    ),
                },
                {
                    key: 'settings',
                    icon: <SettingOutlined style={{ fontSize: '14px' }} />,
                    label: <span className="font-bold text-xs">{t("settings")}</span>,
                },
            ]
        }
    ];

    return (
        <Layout style={{ minHeight: '100vh', overflow: 'hidden' }} className="select-none font-sans">
            <Layout className="bg-slate-50 dark:bg-slate-950">
                <Header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 h-16 flex items-center justify-between px-6 shadow-sm sticky top-0 z-50 transition-colors duration-300">
                    <div 
                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setActiveTab("organizer")}
                    >
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm shadow-md">
                            <i className="fa-solid fa-server"></i>
                        </div>
                        <span className="text-sm font-black tracking-wider text-slate-800 dark:text-slate-100 hidden sm:block">{appConfig.appName}</span>
                        {activeTab !== "organizer" && (
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 ml-2 capitalize">
                                / {t(activeTab) || activeTab}
                            </span>
                        )}
                    </div>

                    {/* Top Right Actions */}
                    <div className="flex items-center gap-3 ml-4">
                        <Button
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-gray-200 dark:border-gray-700 shadow-sm active:scale-95 rounded-xl flex items-center justify-center h-9 px-3"
                            icon={<HomeOutlined style={{ fontSize: '14px', color: '#10b981' }} />}
                            onClick={() => setActiveTab("organizer")}
                            title="Home"
                        >
                            <span className="text-xs font-bold ml-1 hidden sm:inline">Home</span>
                        </Button>
                        <Button
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-gray-200 dark:border-gray-700 shadow-sm active:scale-95 rounded-xl flex items-center justify-center h-9 px-3"
                            icon={<HistoryOutlined style={{ fontSize: '14px', color: '#2563eb' }} />}
                            onClick={() => setActiveTab("tasks")}
                            title="History & Tasks"
                        >
                            <span className="text-xs font-bold ml-1">History</span>
                            {activeTasksCount > 0 && <Badge count={activeTasksCount} size="small" style={{ backgroundColor: '#2563eb', marginLeft: '8px' }} />}
                        </Button>
                        <Button
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-gray-200 dark:border-gray-700 shadow-sm active:scale-95 w-9 h-9 rounded-xl flex items-center justify-center p-0"
                            icon={theme === "dark" ? <SunOutlined style={{ fontSize: '14px', color: '#f59e0b' }} /> : <MoonOutlined style={{ fontSize: '14px', color: '#2563eb' }} />}
                            onClick={toggleTheme}
                        />

                        <Button
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-gray-200 dark:border-gray-700 shadow-sm active:scale-95 w-9 h-9 rounded-xl flex items-center justify-center p-0"
                            icon={<SettingOutlined style={{ fontSize: '14px', color: '#0d9488' }} />}
                            onClick={() => {
                                setSettingsSubTab("general");
                                setActiveTab("settings");
                            }}
                        />
                    </div>
                </Header>

                <Content className="overflow-y-auto bg-slate-50 dark:bg-[#0b0f19]">
                    <div className="p-6" style={{ margin: '0 auto', maxWidth: 'none' }}>
                        {renderComponent()}
                    </div>
                </Content>
            </Layout>
            <TaskDrawer />
            <ToastContainer />
        </Layout>
    );
};

export default Dashboard;
