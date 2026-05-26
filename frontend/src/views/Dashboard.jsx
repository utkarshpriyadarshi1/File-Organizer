import { useState } from "react";
import Organizer from "./Organizer";
import Backup from "./Backup";
import Duplicates from "./Duplicates";
import Logs from "./Logs";
import Progress from "./Progress";

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState("organize");

    const renderComponent = () => {
        switch (activeTab) {
            case "organize":
                return <Organizer />;
            case "backup":
                return <Backup />;
            case "duplicates":
                return <Duplicates />;
            case "logs":
                return <Logs />;
            case "progress":
                return <Progress />;
            default:
                return <Organizer />;
        }
    };

    return (
        <div className="h-screen flex flex-col">
            {/* Navigation Bar */}
            <nav className="bg-blue-600 text-white p-4 flex justify-around">
                <button onClick={() => setActiveTab("organize")} className="px-4 py-2">Organize</button>
                <button onClick={() => setActiveTab("backup")} className="px-4 py-2">Backup</button>
                <button onClick={() => setActiveTab("duplicates")} className="px-4 py-2">Remove Duplicates</button>
                <button onClick={() => setActiveTab("logs")} className="px-4 py-2">View Logs</button>
                <button onClick={() => setActiveTab("progress")} className="px-4 py-2">Running Tasks</button>
            </nav>

            {/* Active Component */}
            <div className="flex-grow p-4 bg-gray-100">{renderComponent()}</div>
        </div>
    );
};

export default Dashboard;
