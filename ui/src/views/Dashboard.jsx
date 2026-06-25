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
    MoonOutlined
} from "@ant-design/icons";
import Overview from "./Overview";
import Organizer from "./Organizer";
import Backup from "./Backup";
import Duplicates from "./Duplicates";
import Tasks from "./Tasks";
import Settings from "./Settings";
import SyncRestore from "./SyncRestore";
import Notifications from "./Notifications";
import Help from "./Help";
import WorkspaceExplorer from "./WorkspaceExplorer";
import TaskDrawer from "../components/TaskDrawer";
import ToastContainer from "../components/ToastContainer";
import { useTasks } from "../services/TaskContext";
import { useI18n } from "../services/I18nContext";
import appConfig from "../app.config.json";

const { Sider, Header, Content } = Layout;

const Dashboard = ({ theme, toggleTheme }) => {
    useEffect(() => {
        document.title = `${appConfig.heading} - v${appConfig.version}`;
    }, []);
    const [activeTab, setActiveTab] = useState("dashboard");
    const [settingsSubTab, setSettingsSubTab] = useState("general");
    const { unreadCount, activeTasks } = useTasks();
    const { t } = useI18n();
    const activeTasksCount = Object.keys(activeTasks || {}).length;

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
            case "notifications":
                return <Notifications />;
            case "workspaceExplorer":
                return <WorkspaceExplorer />;
            case "settings":
                return <Settings defaultSubTab={settingsSubTab} />;
            case "help":
                return <Help />;
            default:
                return <Overview setActiveTab={setActiveTab} />;
        }
    };

    const menuItems = [
        {
            key: 'operations-grp',
            type: 'group',
            label: <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t("operations")}</span>,
            children: [
                {
                    key: 'dashboard',
                    icon: <DashboardOutlined style={{ fontSize: '14px' }} />,
                    label: <span className="font-bold text-xs">{t("dashboardStats")}</span>,
                },
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
                {
                    key: 'backup',
                    icon: <SafetyCertificateOutlined style={{ fontSize: '14px' }} />,
                    label: <span className="font-bold text-xs">{t("backupRestore")}</span>,
                },
                {
                    key: 'duplicates',
                    icon: <CopyOutlined style={{ fontSize: '14px' }} />,
                    label: <span className="font-bold text-xs">{t("duplicateCleaner")}</span>,
                },
                {
                    key: 'sync',
                    icon: <SyncOutlined style={{ fontSize: '14px' }} />,
                    label: <span className="font-bold text-xs">{t("syncVersioning")}</span>,
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
            <Sider
                width={260}
                theme="white"
                style={{
                    boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
                    zIndex: 10,
                }}
                className="bg-slate-900 border-r border-slate-800"
            >
                <div className="flex flex-col h-full justify-between">
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
                        <Menu
                            mode="inline"
                            theme="dark"
                            selectedKeys={[activeTab]}
                            onClick={({ key }) => {
                                if (key === "settings") {
                                    setSettingsSubTab("general");
                                }
                                setActiveTab(key);
                            }}
                            items={menuItems}
                            className="bg-slate-900 border-r-0 mt-4 text-slate-400"
                        />
                    </div>

                    {/* Sidebar Footer Status Indicator */}
                    <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-[10px] text-slate-500 flex flex-col gap-1.5">
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
                </div>
            </Sider>

            <Layout className="bg-slate-50 dark:bg-slate-950">
                <Header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-6 shadow-sm">
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200 capitalize">
                        {t(activeTab) || activeTab}
                    </div>
                    {/* Top Right Actions */}
                    <div className="flex items-center gap-3">
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

                        <Button
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-gray-200 dark:border-gray-700 shadow-sm active:scale-95 w-9 h-9 rounded-xl flex items-center justify-center p-0"
                            icon={<QuestionCircleOutlined style={{ fontSize: '14px', color: '#f43f5e' }} />}
                            onClick={() => setActiveTab("help")}
                        />
                    </div>
                </Header>

                <Content className="p-6 overflow-y-auto bg-slate-50 dark:bg-[#0b0f19]">
                    {renderComponent()}
                </Content>
            </Layout>
            <TaskDrawer />
            <ToastContainer />
        </Layout>
    );
};

export default Dashboard;
