import axios from "axios";
import { useState } from "react";

const Organizer = () => {
    const [sourceFolder, setSourceFolder] = useState("");
    const [destinationFolder, setDestinationFolder] = useState("");
    const [progress, setProgress] = useState("");

    const selectFolder = async (setFolder) => {
        const selectedFolder = await window.electron.selectFolder();
        setFolder(selectedFolder);
    };

    const startOrganization = async () => {
        if (!sourceFolder || !destinationFolder) {
            alert("Please select both source and destination folders.");
            return;
        }

        setProgress("Organizing files...");
        await axios.post("http://localhost:8080/api/organize", {
            sourceFolder,
            destinationFolder,
        });
        setProgress("Organization complete!");
    };

    return (
        <div className="p-4 bg-gray-200 rounded-lg shadow-md text-center">
            <button onClick={() => selectFolder(setSourceFolder)} className="bg-green-500 text-white p-2 rounded">
                Select Folder to Organize
            </button>
            <p className="mt-2 text-gray-700">{sourceFolder || "No folder selected"}</p>

            <button onClick={() => selectFolder(setDestinationFolder)} className="bg-blue-500 text-white p-2 rounded mt-2">
                Select Destination Folder
            </button>
            <p className="mt-2 text-gray-700">{destinationFolder || "No folder selected"}</p>

            <button onClick={startOrganization} className="bg-purple-500 text-white p-2 rounded mt-2">
                Start Organizing
            </button>

            <p className="mt-2 text-gray-700">{progress}</p>
        </div>
    );
};

export default Organizer;
