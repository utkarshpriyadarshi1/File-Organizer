import React, { useState, useEffect } from 'react';
import { ConfigProvider, App as AntdApp, theme as antdTheme } from 'antd';
import './App.css';
import Dashboard from "./views/Dashboard";
import { TaskProvider } from "./services/TaskContext";
import { I18nProvider } from "./services/I18nContext";

function App() {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("file_organizer_theme") || "light";
    });

    useEffect(() => {
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
        localStorage.setItem("file_organizer_theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === "light" ? "dark" : "light");
    };

    return (
        <ConfigProvider
            theme={{
                algorithm: theme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
                token: {
                    colorPrimary: '#2563eb', // Beautiful royal blue
                    borderRadius: 12,
                    fontFamily: "Outfit, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                },
            }}
        >
            <AntdApp>
                <I18nProvider>
                    <TaskProvider>
                        <Dashboard theme={theme} toggleTheme={toggleTheme} />
                    </TaskProvider>
                </I18nProvider>
            </AntdApp>
        </ConfigProvider>
    );
}

export default App;
