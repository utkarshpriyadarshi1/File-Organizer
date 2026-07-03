import React, { useState, useEffect } from 'react';
import { ConfigProvider, App as AntdApp, theme as antdTheme } from 'antd';
import './App.css';
import Dashboard from "./views/Dashboard";
import { TaskProvider } from "./services/TaskContext";
import { I18nProvider } from "./services/I18nContext";
import appConfig from "./app.config.json";

function App() {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("file_organizer_theme") || appConfig.ui.defaultTheme;
    });
    
    const [layoutMode, setLayoutMode] = useState(() => {
        return localStorage.getItem("file_organizer_layout") || appConfig.ui.defaultLayout;
    });

    useEffect(() => {
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
        localStorage.setItem("file_organizer_theme", theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem("file_organizer_layout", layoutMode);
    }, [layoutMode]);

    const toggleTheme = () => {
        setTheme(prev => prev === "light" ? "dark" : "light");
    };

    const toggleLayoutMode = () => {
        setLayoutMode(prev => prev === "app" ? "web" : "app");
    };

    return (
        <ConfigProvider
            theme={{
                algorithm: theme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
                token: {
                    colorPrimary: appConfig.ui.primaryColor,
                    borderRadius: 12,
                    fontFamily: "Outfit, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                },
            }}
        >
            <AntdApp>
                <I18nProvider>
                    <TaskProvider>
                        <Dashboard 
                            theme={theme} 
                            toggleTheme={toggleTheme} 
                            layoutMode={layoutMode} 
                            toggleLayoutMode={toggleLayoutMode} 
                        />
                    </TaskProvider>
                </I18nProvider>
            </AntdApp>
        </ConfigProvider>
    );
}

export default App;
