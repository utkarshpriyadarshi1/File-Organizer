const fs = require('fs');
const path = require('path');

const iconMap = {
    "DashboardOutlined": "fa-solid fa-chart-line",
    "FolderOpenOutlined": "fa-solid fa-folder-open",
    "DeploymentUnitOutlined": "fa-solid fa-network-wired",
    "SafetyCertificateOutlined": "fa-solid fa-shield-halved",
    "CopyOutlined": "fa-solid fa-copy",
    "SyncOutlined": "fa-solid fa-rotate",
    "UnorderedListOutlined": "fa-solid fa-list-ul",
    "BellOutlined": "fa-solid fa-bell",
    "SettingOutlined": "fa-solid fa-gear",
    "QuestionCircleOutlined": "fa-solid fa-circle-question",
    "SunOutlined": "fa-solid fa-sun",
    "MoonOutlined": "fa-solid fa-moon",
    "DesktopOutlined": "fa-solid fa-display",
    "GlobalOutlined": "fa-solid fa-globe",
    "SearchOutlined": "fa-solid fa-magnifying-glass",
    "PlayCircleOutlined": "fa-solid fa-circle-play",
    "CheckCircleOutlined": "fa-solid fa-circle-check",
    "CloseCircleOutlined": "fa-solid fa-circle-xmark",
    "ClockCircleOutlined": "fa-regular fa-clock",
    "ReloadOutlined": "fa-solid fa-rotate-right",
    "StopOutlined": "fa-solid fa-stop",
    "InfoCircleOutlined": "fa-solid fa-circle-info",
    "FolderFilled": "fa-solid fa-folder",
    "ArrowRightOutlined": "fa-solid fa-arrow-right",
    "CloudUploadOutlined": "fa-solid fa-cloud-arrow-up",
    "DeleteOutlined": "fa-solid fa-trash",
    "FileTextOutlined": "fa-solid fa-file-lines",
    "ImportOutlined": "fa-solid fa-file-import",
    "ExportOutlined": "fa-solid fa-file-export",
    "CheckSquareOutlined": "fa-regular fa-square-check",
    "ExperimentOutlined": "fa-solid fa-flask",
    "FilterOutlined": "fa-solid fa-filter",
    "HistoryOutlined": "fa-solid fa-clock-rotate-left",
    "BugOutlined": "fa-solid fa-bug",
    "BookOutlined": "fa-solid fa-book",
    "GithubOutlined": "fa-brands fa-github",
    "LoadingOutlined": "fa-solid fa-circle-notch fa-spin",
    "CodeOutlined": "fa-solid fa-code",
    "DownloadOutlined": "fa-solid fa-download",
    "DownOutlined": "fa-solid fa-chevron-down",
    "UpOutlined": "fa-solid fa-chevron-up",
    "VerticalAlignBottomOutlined": "fa-solid fa-arrow-down-to-line",
    "ExclamationCircleFilled": "fa-solid fa-circle-exclamation",
    "InfoCircleFilled": "fa-solid fa-circle-info",
    "ConsoleSqlOutlined": "fa-solid fa-terminal",
    "CheckCircleFilled": "fa-solid fa-circle-check",
    "CloseCircleFilled": "fa-solid fa-circle-xmark",
    "FolderOutlined": "fa-regular fa-folder",
    "ThunderboltOutlined": "fa-solid fa-bolt",
    "PieChartOutlined": "fa-solid fa-chart-pie",
    "FireOutlined": "fa-solid fa-fire",
    "SlidersOutlined": "fa-solid fa-sliders",
    "DatabaseOutlined": "fa-solid fa-database",
    "SaveOutlined": "fa-solid fa-floppy-disk",
    "PlusOutlined": "fa-solid fa-plus",
    "CloseOutlined": "fa-solid fa-xmark",
    "BranchesOutlined": "fa-solid fa-code-branch",
    "FileProtectOutlined": "fa-solid fa-file-shield",
    "UnlockOutlined": "fa-solid fa-unlock",
    "AppstoreAddOutlined": "fa-solid fa-grid-2-plus",
    "CalendarOutlined": "fa-solid fa-calendar",
    "SwapOutlined": "fa-solid fa-right-left",
    "RetweetOutlined": "fa-solid fa-retweet",
    "RightOutlined": "fa-solid fa-chevron-right",
    "FolderOpenFilled": "fa-solid fa-folder-open",
    "FileImageOutlined": "fa-solid fa-image",
    "FilePdfOutlined": "fa-solid fa-file-pdf",
    "FileWordOutlined": "fa-solid fa-file-word",
    "FileExcelOutlined": "fa-solid fa-file-excel",
    "FileZipOutlined": "fa-solid fa-file-zipper",
    "PlaySquareOutlined": "fa-solid fa-square-caret-right",
    "CustomerServiceOutlined": "fa-solid fa-headset",
    "FileOutlined": "fa-regular fa-file"
};

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./ui/src');

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let hasChanges = false;

    // Remove Ant Design Icons imports
    if (content.match(/import\s+\{([^}]+)\}\s+from\s+['\"]@ant-design\/icons['\"];?/g)) {
        content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['\"]@ant-design\/icons['\"];?\n?/g, '');
        hasChanges = true;
    }

    // Replace <IconName /> or <IconName style={{...}} className="..." spin={true} />
    for (const [antIcon, faIcon] of Object.entries(iconMap)) {
        // Regex to match <AntIcon ... /> or <AntIcon>...</AntIcon>
        // We will look for <AntIcon maybe attributes />
        const regex = new RegExp(`<${antIcon}(\\s+[^>]*)?\\/?>`, 'g');
        content = content.replace(regex, (match, attrs) => {
            hasChanges = true;
            let style = "";
            let cls = "";
            let spin = false;
            
            if (attrs) {
                const styleMatch = attrs.match(/style=\{([^}]+)\}/);
                if (styleMatch) {
                    // Extract style object
                    style = ` style={${styleMatch[1]}}`;
                }
                const clsMatch = attrs.match(/className=[\'\"]([^\'\"]+)[\'\"]/);
                if (clsMatch) {
                    cls = ` ${clsMatch[1]}`;
                }
                if (attrs.includes("spin") || attrs.includes("spin={true}")) {
                    spin = true;
                }
            }
            
            const faClasses = `${faIcon}${spin ? " fa-spin" : ""}${cls}`;
            return `<i className="${faClasses}"${style}></i>`;
        });
    }

    if (hasChanges) {
        fs.writeFileSync(f, content, 'utf8');
        console.log("Updated", f);
    }
});
