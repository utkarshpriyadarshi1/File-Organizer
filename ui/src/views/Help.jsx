import React, { useState, useEffect } from "react";
import { useI18n } from "../services/I18nContext";
import { marked } from "marked";
import { Card, Button, Tabs, Spin, Typography } from "antd";
import { 
    QuestionCircleOutlined, 
    BugOutlined, 
    BookOutlined, 
    GithubOutlined, 
    LoadingOutlined, 
    FileInvoiceOutlined
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

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
        window.open("https://github.com/utkarshpriyadarshi1/File-Organizer/issues", "_blank");
    };

    const tabItems = helpGuides.map(guide => ({
        key: guide.name,
        label: (
            <span className="flex items-center gap-2.5 text-xs font-bold capitalize py-1">
                <BookOutlined className="text-blue-500 text-sm" />
                <span>{guide.name.replace(/-/g, " ")}</span>
            </span>
        ),
        children: (
            <div className="p-6 h-[480px] overflow-y-auto bg-white dark:bg-slate-900 select-text markdown-content text-slate-700 dark:text-slate-200">
                <article className="prose prose-sm max-w-none dark:prose-invert">
                    <div 
                        dangerouslySetInnerHTML={{ 
                            __html: marked.parse(guide.content || "") 
                        }} 
                    />
                </article>
            </div>
        )
    }));

    return (
        <div className="max-w-5xl mx-auto space-y-6 text-left">
            {/* Header Title Section */}
            <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 shadow-sm border border-rose-100 dark:border-rose-900/30 shrink-0">
                    <QuestionCircleOutlined className="text-xl" />
                </div>
                <div>
                    <Title level={2} style={{ margin: 0 }} className="text-slate-800 dark:text-slate-100 font-extrabold text-2xl sm:text-3xl">
                        {t("helpTitle") || "Help & Documentation"}
                    </Title>
                    <Text type="secondary" className="text-xs font-bold mt-1 block">
                        {t("helpDesc") || "Learn how to use the system and troubleshoot common issues."}
                    </Text>
                </div>
            </div>

            {/* GitHub Bug Reporting Banner */}
            <Card
                className="bg-gradient-to-r from-rose-500 to-rose-600 border-none shadow-md rounded-2xl text-white relative overflow-hidden"
                styles={{ body: { padding: '24px' } }}
            >
                <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 text-[120px] pointer-events-none text-white">
                    <GithubOutlined />
                </div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                    <div className="space-y-1 text-white">
                        <Title level={4} style={{ margin: 0, color: '#fff' }} className="flex items-center gap-2 font-bold text-white">
                            <BugOutlined />
                            {t("reportBug") || "Report a Bug"}
                        </Title>
                        <Paragraph className="text-xs font-semibold opacity-90 max-w-xl m-0 text-rose-50">
                            {t("reportBugDesc") || "Encountered a problem or have a suggestion? Create an issue on our GitHub repository."}
                        </Paragraph>
                    </div>
                    <Button
                        type="default"
                        onClick={handleOpenGitHub}
                        icon={<GithubOutlined />}
                        className="bg-white hover:bg-slate-50 text-rose-600 hover:text-rose-700 text-xs font-extrabold h-11 px-5 rounded-xl border-none shadow-sm flex items-center gap-2 shrink-0 active:scale-95 transition-all duration-150"
                    >
                        {t("openGitHub") || "Open GitHub"}
                    </Button>
                </div>
            </Card>

            {/* Help Guides Tabs Layout */}
            <Card 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden"
                styles={{ body: { padding: 0 } }}
            >
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
                        <Spin indicator={<LoadingOutlined style={{ fontSize: 28 }} spin />} />
                        <span className="text-xs font-bold text-slate-500">{t("scanningGuides") || "Scanning manuals..."}</span>
                    </div>
                ) : helpGuides.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-450 gap-3">
                        <FileInvoiceOutlined className="text-3xl text-slate-300 dark:text-slate-700" />
                        <span className="text-xs font-bold text-slate-500">{t("noManuals") || "No manuals found."}</span>
                    </div>
                ) : (
                    <Tabs
                        activeKey={activeHelpGuide}
                        onChange={(key) => setActiveHelpGuide(key)}
                        tabPosition="left"
                        items={tabItems}
                        className="help-tabs min-h-[500px]"
                        style={{ border: 'none' }}
                    />
                )}
            </Card>
        </div>
    );
};

export default Help;
