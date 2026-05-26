import axios from "axios";
import { useState } from "react";

const Duplicates = () => {
    const [folderPath, setFolderPath] = useState("");
    const [duplicates, setDuplicates] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [status, setStatus] = useState("");

    const selectFolder = async () => {
        const selectedFolder = await window.electron.selectFolder();
        setFolderPath(selectedFolder);
    };

    const findDuplicates = async () => {
        if (!folderPath) {
            alert("Please select a folder first.");
            return;
        }

        setStatus("Scanning for duplicates...");
        const response = await axios.post("http://localhost:8080/api/duplicates/find", { folderPath });
        setDuplicates(response.data);
        setStatus("");
    };

    const toggleSelection = (filePath) => {
        setSelectedFiles(prev =>
            prev.includes(filePath) ? prev.filter(f => f !== filePath) : [...prev, filePath]
        );
    };

    const removeSelected = async () => {
        if (selectedFiles.length === 0) {
            alert("No files selected for deletion.");
            return;
        }

        setStatus("Removing duplicates...");
        await axios.post("http://localhost:8080/api/duplicates/remove", { filesToDelete: selectedFiles });
        setStatus("Duplicates removed successfully.");
        setDuplicates(duplicates.map(d => ({ ...d, files: d.files.filter(f => !selectedFiles.includes(f)) })));
        setSelectedFiles([]);
    };

    return (
        <div className="p-4 bg-gray-200 rounded-lg shadow-md text-center">
            <button onClick={selectFolder} className="bg-green-500 text-white p-2 rounded">
                Select Folder
            </button>
            <p className="mt-2 text-gray-700">{folderPath || "No folder selected"}</p>

            <button onClick={findDuplicates} className="bg-blue-500 text-white p-2 rounded mt-2">
                Scan for Duplicates
            </button>

            {status && <p className="mt-2 text-gray-700">{status}</p>}

            {duplicates.length > 0 && (
                <div className="mt-4 bg-white p-4 rounded shadow">
                    <h3 className="text-lg font-bold">Duplicate Files</h3>
                    {duplicates.map((dup, index) => (
                        <div key={index} className="mt-2 border p-2">
                            <p className="text-gray-600">Hash: {dup.hash}</p>
                            {dup.files.map((file, i) => (
                                <div key={i} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        onChange={() => toggleSelection(file)}
                                        checked={selectedFiles.includes(file)}
                                        className="mr-2"
                                    />
                                    <p className="text-gray-800">{file}</p>
                                </div>
                            ))}
                        </div>
                    ))}
                    <button onClick={removeSelected} className="bg-red-500 text-white p-2 rounded mt-2">
                        Remove Selected
                    </button>
                </div>
            )}
        </div>
    );
};

export default Duplicates;
