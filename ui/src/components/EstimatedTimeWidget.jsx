import React, { useState } from "react";
import axios from "axios";
import { Button, Spin } from "./common";
import { ClockCircleOutlined, CalculatorOutlined } from "@ant-design/icons";

const EstimatedTimeWidget = ({ folderPath, operationTypes = ["ORGANIZE"] }) => {
    const [loading, setLoading] = useState(false);
    const [estimatedTimeStr, setEstimatedTimeStr] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    const calculateEstimation = (totalFiles, totalSize) => {
        let estimatedMs = 0;
        const sizeInGB = totalSize / (1024 * 1024 * 1024);

        operationTypes.forEach(opType => {
            let msPerFile = 20; // default for organize
            let msPerGB = 500; 

            if (opType === "DUPLICATES") {
                msPerFile = 50;
                msPerGB = 2000;
            } else if (opType === "DISK_ANALYSIS") {
                msPerFile = 5;
                msPerGB = 100;
            }
            
            estimatedMs += (totalFiles * msPerFile) + (sizeInGB * msPerGB);
        });

        const totalSeconds = Math.ceil(estimatedMs / 1000) + 1; // 1s base overhead

        if (totalSeconds < 60) {
            return `~${totalSeconds} seconds`;
        } else if (totalSeconds < 3600) {
            const mins = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
            return `~${mins} min ${secs} sec`;
        } else {
            const hrs = Math.floor(totalSeconds / 3600);
            const mins = Math.floor((totalSeconds % 3600) / 60);
            return `~${hrs} hr ${mins} min`;
        }
    };

    const handleEstimate = async () => {
        if (!folderPath) {
            setErrorMsg("Please select a directory first.");
            return;
        }

        setLoading(true);
        setErrorMsg("");
        setEstimatedTimeStr("");

        try {
            const res = await axios.get(`http://localhost:8080/api/analysis/directory?folderPath=${encodeURIComponent(folderPath)}`);
            const { totalFiles, totalSize } = res.data;
            const timeStr = calculateEstimation(totalFiles, totalSize);
            setEstimatedTimeStr(timeStr);
        } catch (err) {
            console.error("[EstimatedTimeWidget] Failed to fetch analysis for estimation:", err);
            setErrorMsg("Failed to estimate time.");
        } finally {
            setLoading(false);
        }
    };

    // If no path is selected, we can show a disabled state or default text
    return (
        <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-800 backdrop-blur-md">
            <Button 
                onClick={handleEstimate}
                disabled={!folderPath || loading}
                icon={loading ? <Spin size="small" /> : <CalculatorOutlined />}
                className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50 rounded-lg text-xs font-bold px-4 h-8 flex items-center shadow-sm hover:shadow-md transition-all"
            >
                {loading ? "Calculating..." : "Estimate Processing Time"}
            </Button>
            
            <div className="flex-grow flex items-center min-w-0">
                {errorMsg && (
                    <span className="text-xs font-semibold text-red-500 flex items-center gap-1.5 truncate">
                        {errorMsg}
                    </span>
                )}
                
                {!errorMsg && estimatedTimeStr && (
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-md border border-emerald-100 dark:border-emerald-800/50">
                        <ClockCircleOutlined className="text-emerald-500" />
                        {estimatedTimeStr}
                    </span>
                )}
                
                {!errorMsg && !estimatedTimeStr && !loading && (
                    <span className="text-[10px] font-semibold text-slate-400 italic">
                        Click to generate a heuristic time estimation.
                    </span>
                )}
            </div>
        </div>
    );
};

export default EstimatedTimeWidget;
