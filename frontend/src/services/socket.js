import { io } from "socket.io-client";

let socket;

// Create one Socket.IO connection per browser session.
export function connectSocket() {
    if (!socket) {
        socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
            transports: ["polling", "websocket"],
            withCredentials: true,
            autoConnect: true,
        });
    }
    return socket;
}
