import React, { useState } from "react";
import axios from "axios";
import { Button, Spin } from "./common";
import { CalculatorOutlined } from "@ant-design/icons";
import { useTasks } from "../services/TaskContext";

const EstimatedTimeWidget = ({ folderPath, operationTypes = ["ORGANIZE"] }) => {
    const [loading, setLoading] = useState(false);
    const { addToast } = useTasks();

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
            addToast("Please select a directory first to estimate processing time.", "warning");
            return;
        }

        setLoading(true);

        try {
            const res = await axios.get(`http://localhost:8080/api/analysis/directory?folderPath=${encodeURIComponent(folderPath)}`);
            const { totalFiles, totalSize } = res.data;
            const timeStr = calculateEstimation(totalFiles, totalSize);
            addToast(`Estimated processing time: ${timeStr}`, "info");
        } catch (err) {
            console.error("[EstimatedTimeWidget] Failed to fetch analysis for estimation:", err);
            addToast("Failed to estimate processing time.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button 
            onClick={handleEstimate}
            disabled={!folderPath || loading}
            icon={loading ? <Spin size="small" /> : <CalculatorOutlined />}
            style={{ height: '44px', fontWeight: 'bold', fontSize: '13px' }}
            className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50 rounded-lg px-6 flex items-center shadow-sm hover:shadow-md transition-all uppercase w-full justify-center"
        >
            {loading ? "Calculating..." : "Estimate Time"}
        </Button>
    );
};

export default EstimatedTimeWidget;
