// ==================================================
// Load Environment Variables
// ==================================================

import "dotenv/config";

// ==================================================
// Imports
// ==================================================

import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

// ==================================================
// Routes
// ==================================================

import tenantRoutes from "./routes/tenantRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";

// ==================================================
// Express Application
// ==================================================

const app = express();

// Render provides PORT automatically.
// Local development will use port 5000.
const PORT = process.env.PORT || 5000;

// ==================================================
// Allowed Origins
// ==================================================
//
// ALLOWED_ORIGINS can contain multiple origins.
//
// Example:
//
// ALLOWED_ORIGINS=http://localhost:5173,https://my-frontend.onrender.com
//
// Local tenant domains such as:
// http://bb.local:5173
// http://pqr.local:5173
// are also allowed.
//

const allowedOrigins = (
    process.env.ALLOWED_ORIGINS || ""
)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

// ==================================================
// CORS Origin Validation
// ==================================================

const isAllowedOrigin = (origin) => {

    // Allow requests without an Origin header.
    //
    // Example:
    // Postman
    // Server-to-server requests
    if (!origin) {
        return true;
    }

    // Allow configured origins from environment variables.
    if (allowedOrigins.includes(origin)) {
        return true;
    }

    // Allow localhost during local development.
    if (origin === "http://localhost:5173") {
        return true;
    }

    // Allow local tenant domains during development.
    //
    // Example:
    // http://bb.local:5173
    // http://pqr.local:5173
    // http://xyz.local:5173
    try {
        const url = new URL(origin);

        if (
            url.protocol === "http:" &&
            url.hostname.endsWith(".local") &&
            url.port === "5173"
        ) {
            return true;
        }
    } catch (error) {
        return false;
    }

    return false;
};

// ==================================================
// Express CORS
// ==================================================

app.use(
    cors({
        origin: (origin, callback) => {

            if (isAllowedOrigin(origin)) {
                callback(null, true);
                return;
            }

            console.log(
                "CORS blocked origin:",
                origin
            );

            callback(
                new Error("Not allowed by CORS")
            );
        },

        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "x-tenant-id"
        ],

        credentials: true
    })
);

// ==================================================
// JSON Middleware
// ==================================================

app.use(
    express.json()
);

// ==================================================
// HTTP Server
// ==================================================
//
// Socket.IO must use this HTTP server.
//
// Do NOT use app.listen().
//

const server = http.createServer(app);

// ==================================================
// Socket.IO
// ==================================================

const io = new Server(
    server,
    {
        cors: {
            origin: (origin, callback) => {

                if (isAllowedOrigin(origin)) {
                    callback(null, true);
                    return;
                }

                console.log(
                    "Socket.IO CORS blocked:",
                    origin
                );

                callback(
                    new Error(
                        "Not allowed by Socket.IO CORS"
                    )
                );
            },

            methods: [
                "GET",
                "POST"
            ],

            allowedHeaders: [
                "Content-Type",
                "Authorization",
                "x-tenant-id"
            ],

            credentials: true
        }
    }
);

// ==================================================
// Make Socket.IO Available in Controllers
// ==================================================
//
// Controllers can access Socket.IO using:
//
// const io = req.app.get("io");
//

app.set(
    "io",
    io
);

// ==================================================
// Socket.IO Connection
// ==================================================

io.on(
    "connection",
    (socket) => {

        console.log(
            "Socket connected:",
            socket.id
        );

        // ------------------------------------------
        // Join Provider Room
        // ------------------------------------------
        //
        // Example room:
        //
        // tenant_bb_provider_2
        //
        // Only this provider receives appointment
        // notifications.
        //

        socket.on(
            "join_provider_room",
            ({
                tenantId,
                providerId
            }) => {

                if (
                    !tenantId ||
                    !providerId
                ) {
                    console.log(
                        "Invalid provider room data"
                    );

                    return;
                }

                const room =
                    `tenant_${tenantId}_provider_${providerId}`;

                socket.join(room);

                console.log(
                    `Socket ${socket.id} joined ${room}`
                );
            }
        );

        // ------------------------------------------
        // Socket Disconnect
        // ------------------------------------------

        socket.on(
            "disconnect",
            () => {

                console.log(
                    "Socket disconnected:",
                    socket.id
                );
            }
        );
    }
);

// ==================================================
// Root API
// ==================================================

app.get(
    "/",
    (req, res) => {

        res.json({
            message:
                "Multi-Tenant API is running"
        });
    }
);

// ==================================================
// API Routes
// ==================================================

app.use(
    "/api/tenants",
    tenantRoutes
);

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/users",
    userRoutes
);

app.use(
    "/api/employees",
    employeeRoutes
);

app.use(
    "/api/roles",
    roleRoutes
);

app.use(
    "/api/appointments",
    appointmentRoutes
);

// ==================================================
// Start Server
// ==================================================
//
// Render requires the server to listen on:
//     0.0.0.0
//
// PORT comes from:
//     process.env.PORT
//
// Local:
//     http://localhost:5000
//
// Production:
//     Render provides the public URL.
//

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Server running on port ${PORT}`
        );

        console.log(
            "Socket.IO server started"
        );
    }
);