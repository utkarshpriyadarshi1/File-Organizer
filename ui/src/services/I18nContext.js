import React, { createContext, useContext, useState } from "react";
import { translations } from "../translations";
import appConfig from "../app.config.json";

const I18nContext = createContext();

export const I18nProvider = ({ children }) => {
    const [language, setLanguageState] = useState(() => {
        return localStorage.getItem("file_organizer_language") || appConfig.ui.defaultLanguage;
    });

    const changeLanguage = (lang) => {
        setLanguageState(lang);
        localStorage.setItem("file_organizer_language", lang);
    };

    const t = (key) => {
        const langData = translations[language];
        if (!langData) return key;
        return langData[key] || key;
    };

    return (
        <I18nContext.Provider value={{ language, changeLanguage, t }}>
            {children}
        </I18nContext.Provider>
    );
};

export const useI18n = () => {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error("useI18n must be used within an I18nProvider");
    }
    return context;
};
