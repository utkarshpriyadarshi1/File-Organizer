import axios from "axios";
import { useState } from "react";

const Backup = () => {
    const [sourceFolder, setSourceFolder] = useState("");
    const [backupFolder, setBackupFolder] = useState("");
    const [status, setStatus] = useState("");

    const selectFolder = async (setFolder) => {
        const selectedFolder = await window.electron.selectFolder();
        setFolder(selectedFolder);
    };

    const startBackup = async () => {
        if (!sourceFolder || !backupFolder) {
            alert("Please select both source and backup folders.");
            return;
        }

        setStatus("Creating backup...");
        const response = await axios.post("http://localhost:8080/api/backup/create", {
            sourceFolder,
            backupFolder,
        });
        setStatus(response.data);
    };

    const updateBackup = async () => {
        if (!sourceFolder || !backupFolder) {
            alert("Please select both source and backup folders.");
            return;
        }

        setStatus("Updating backup...");
        const response = await axios.post("http://localhost:8080/api/backup/update", {
            sourceFolder,
            backupFolder,
        });
        setStatus(response.data);
    };

    return (
        <div className="p-4 bg-gray-200 rounded-lg shadow-md text-center">
            <button onClick={() => selectFolder(setSourceFolder)} className="bg-green-500 text-white p-2 rounded">
                Select Folder to Backup
            </button>
            <p className="mt-2 text-gray-700">{sourceFolder || "No folder selected"}</p>

            <button onClick={() => selectFolder(setBackupFolder)} className="bg-blue-500 text-white p-2 rounded mt-2">
                Select Backup Destination
            </button>
            <p className="mt-2 text-gray-700">{backupFolder || "No folder selected"}</p>

            <button onClick={startBackup} className="bg-purple-500 text-white p-2 rounded mt-2">
                Start Backup
            </button>

            <button onClick={updateBackup} className="bg-yellow-500 text-white p-2 rounded mt-2">
                Update Backup
            </button>

            <p className="mt-2 text-gray-700">{status}</p>
        </div>
    );
};

export default Backup;
