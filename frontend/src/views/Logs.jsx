import { useEffect, useState } from "react";
import axios from "axios";

const Logs = () => {
    const [logs, setLogs] = useState([]);
    const [dbLogs, setDbLogs] = useState([]);

    useEffect(() => {
        const socket = new WebSocket("ws://localhost:8080/ws/progress");
        socket.onmessage = (event) => {
            setLogs((prevLogs) => [...prevLogs, event.data]);
        };
        return () => socket.close();
    }, []);

    useEffect(() => {
        axios.get("http://localhost:8080/api/logs")
            .then(response => setDbLogs(response.data))
            .catch(error => console.error("Error fetching logs:", error));
    }, []);

    return (
        <div className="p-4 bg-gray-200 rounded-lg shadow-md">
            <h2 className="text-xl font-bold">Logs & Progress</h2>
            <div className="bg-white p-2 rounded shadow mt-2 h-64 overflow-auto">
                {logs.concat(dbLogs).map((log, index) => (
                    <p key={index} className="text-gray-700">{log}</p>
                ))}
            </div>
        </div>
    );
};

export default Logs;
