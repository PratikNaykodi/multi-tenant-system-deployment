// ==================================================
// Socket.IO Client
// ==================================================
//
// The backend URL comes from the Vite environment
// variable.
//
// Local:
// VITE_SOCKET_URL=http://localhost:5000
//
// Production:
// VITE_SOCKET_URL=https://your-backend.onrender.com
//

import {
    io
} from "socket.io-client";

// Get Socket.IO server URL from environment.
const socketUrl =
    import.meta.env.VITE_SOCKET_URL ||
    "http://localhost:5000";

// Create Socket.IO connection.
const socket = io(
    socketUrl,
    {
        autoConnect: true
    }
);

export default socket;