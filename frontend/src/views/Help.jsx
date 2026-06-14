import React, { useState, useEffect } from "react";
import { useI18n } from "../services/I18nContext";
import { marked } from "marked";

const Help = () => {
    const { t } = useI18n();
    const [helpGuides, setHelpGuides] = useState([]);
    const [activeHelpGuide, setActiveHelpGuide] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (window.electron && window.electron.readHelpFiles) {
            setLoading(true);
            window.electron.readHelpFiles()
                .then(guides => {
                    console.log("Loaded help guides:", guides);
                    setHelpGuides(guides || []);
                    if (guides && guides.length > 0) {
                        setActiveHelpGuide(guides[0].name);
                    }
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to load help files:", err);
                    setLoading(false);
                });
        } else {
            console.warn("Electron readHelpFiles API not available.");
            setLoading(false);
        }
    }, []);

    const handleOpenGitHub = () => {
        window.open("https://github.com/utkarshpriyadarshi1/e-abhilekh/issues", "_blank");
    };

    return (
        <div className="max-w-5xl mx-auto mt-6 space-y-6 text-left">
            {/* Header Title Section */}
            <div className="flex items-center gap-4 border-b border-gray-150 pb-5">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 shadow-sm border border-rose-100">
                    <i className="fa-solid fa-circle-question text-xl"></i>
                </div>
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-800">{t("helpTitle")}</h2>
                    <p className="text-xs text-gray-500 font-bold mt-1">{t("helpDesc")}</p>
                </div>
            </div>

            {/* GitHub Bug Reporting Banner */}
            <div className="bg-gradient-to-r from-rose-500 to-rose-600 p-6 rounded-2xl shadow-md text-white border border-rose-600 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 text-[120px] pointer-events-none">
                    <i className="fa-brands fa-github"></i>
                </div>
                <div className="space-y-1 z-10">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <i className="fa-solid fa-bug"></i>
                        {t("reportBug")}
                    </h3>
                    <p className="text-xs font-semibold opacity-90 max-w-xl">{t("reportBugDesc")}</p>
                </div>
                <button
                    onClick={handleOpenGitHub}
                    className="bg-white hover:bg-slate-50 active:scale-95 text-rose-600 text-xs font-extrabold px-5 py-3 rounded-xl transition-all duration-150 flex items-center gap-2 shadow cursor-pointer border-none z-10 shrink-0"
                >
                    <i className="fa-brands fa-github text-sm"></i>
                    {t("openGitHub")}
                </button>
            </div>

            {/* Help Guides Tabs Layout */}
            <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden flex flex-col md:flex-row h-[500px]">
                {/* Tabs Sidebar */}
                <div className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-gray-150 shrink-0 overflow-y-auto">
                    <div className="p-4 border-b border-gray-150">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Documentation</span>
                    </div>
                    <nav className="p-2 space-y-1">
                        {loading ? (
                            <div className="text-xs text-gray-400 font-bold p-3 animate-pulse">Scanning guides...</div>
                        ) : helpGuides.length === 0 ? (
                            <div className="text-xs text-gray-400 font-bold p-3">No manuals found.</div>
                        ) : (
                            helpGuides.map(guide => (
                                <button
                                    key={guide.name}
                                    onClick={() => setActiveHelpGuide(guide.name)}
                                    className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-2.5 text-xs font-bold cursor-pointer active:scale-95 ${
                                        activeHelpGuide === guide.name
                                            ? "bg-slate-200 text-slate-800 shadow-sm"
                                            : "hover:bg-slate-100 text-slate-505 text-slate-500 hover:text-slate-700"
                                    }`}
                                >
                                    <i className="fa-solid fa-book-open text-sky-500 text-[11px]"></i>
                                    <span className="capitalize">{guide.name.replace(/-/g, " ")}</span>
                                </button>
                            ))
                        )}
                    </nav>
                </div>

                {/* Content Pane */}
                <div className="flex-grow p-6 overflow-y-auto bg-white select-text">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                            <i className="fa-solid fa-rotate animate-spin text-2xl"></i>
                            <span className="text-xs font-bold">Loading User Manual...</span>
                        </div>
                    ) : activeHelpGuide && helpGuides.find(g => g.name === activeHelpGuide) ? (
                        <article className="prose prose-sm max-w-none text-slate-700 leading-relaxed font-sans">
                            <div 
                                dangerouslySetInnerHTML={{ 
                                    __html: marked.parse(helpGuides.find(g => g.name === activeHelpGuide).content || "") 
                                }} 
                            />
                        </article>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                            <i className="fa-solid fa-file-invoice text-3xl"></i>
                            <span className="text-xs font-bold">Select a user manual tab to display instructions.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Help;
