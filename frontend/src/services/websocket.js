const socket = new WebSocket("ws://localhost:8080/ws/progress");

socket.onmessage = (event) => {
    console.log("Progress:", event.data);
};

export const getProgressUpdates = (callback) => {
    socket.onmessage = (event) => callback(event.data);
};
