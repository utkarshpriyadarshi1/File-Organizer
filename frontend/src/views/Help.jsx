import React from "react";
import { useI18n } from "../services/I18nContext";

const Help = () => {
    const { t } = useI18n();

    // Standard GitHub Issues page for e-abhilekh repo
    const handleOpenGitHub = () => {
        // Since we are in Electron and using context bridge, let's open in external web browser.
        // Electron's shell.openExternal can be triggered if we had it exposed. Since we don't, 
        // a standard window.open or <a> with target="_blank" is the fallback. Electron wraps <a> with target="_blank"
        // and usually opens it in default system browser, or we can use normal window.open.
        window.open("https://github.com/utkarshpriyadarshi1/e-abhilekh/issues", "_blank");
    };

    return (
        <div className="max-w-4xl mx-auto mt-6 space-y-6 text-left">
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

            {/* FAQs Grid */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <i className="fa-solid fa-circle-info text-blue-500"></i>
                    {t("faq")}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-2">
                        <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                            {t("faq1Title")}
                        </h4>
                        <p className="text-xs text-gray-500 font-bold leading-relaxed">{t("faq1Desc")}</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-2">
                        <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                            {t("faq2Title")}
                        </h4>
                        <p className="text-xs text-gray-500 font-bold leading-relaxed">{t("faq2Desc")}</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-2 md:col-span-2">
                        <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></span>
                            {t("faq3Title")}
                        </h4>
                        <p className="text-xs text-gray-500 font-bold leading-relaxed">{t("faq3Desc")}</p>
                    </div>
                </div>
            </div>

            {/* Manual Instructions List */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <i className="fa-solid fa-book-open text-teal-500"></i>
                    {t("userManual")}
                </h3>

                <div className="space-y-3">
                    <div className="flex gap-4 bg-white p-4 rounded-xl border border-gray-150 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 font-bold">
                            1
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-800">{t("fileOrganizer")}</h4>
                            <p className="text-xs text-gray-500 font-semibold mt-1">
                                Navigate to File Organizer from sidebar. Select a source directory to walk. Add tags, details, or sort files. Revert changes via the undo panel if needed.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 bg-white p-4 rounded-xl border border-gray-150 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0 font-bold">
                            2
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-800">{t("backupRestore")}</h4>
                            <p className="text-xs text-gray-500 font-semibold mt-1">
                                Create incrementally updated backup directories. Verify integrity with post-copy hash checks. Restore folders from target ZIPs or historical backups easily.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 bg-white p-4 rounded-xl border border-gray-150 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0 font-bold">
                            3
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-800">{t("duplicateCleaner")}</h4>
                            <p className="text-xs text-gray-500 font-semibold mt-1">
                                Run high-performance duplicate scanners. Compare file sizes and SHA-256 hashes inside your SQLite index, then perform safe cleanups.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Help;
