import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import "dotenv/config";

import authRoutes from "./routes/authRoutes.js";
import tenantRoutes from "./routes/tenantRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";

const app = express();
const server = http.createServer(app);


// =====================================================
// CORS CONFIGURATION
// =====================================================

const allowed = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);


// Check whether frontend origin is allowed
const isAllowedOrigin = (origin) => {

    // Allow requests without Origin
    // Example: Postman / server-to-server
    if (!origin) {
        return true;
    }

    // Exact origins
    if (allowed.includes(origin)) {
        return true;
    }

    // Local development tenant hostnames
    //
    // http://gandhi:5173
    // http://bb:5173
    // http://abc:5173
    //
    const localTenantOrigin =
        /^http:\/\/[a-z0-9-]+:5173$/i.test(origin);

    if (localTenantOrigin) {
        return true;
    }

    // Production tenant subdomains
    //
    // https://gandhi.mytenantdemo.site
    // https://bb.mytenantdemo.site
    //
    const productionTenantOrigin =
        /^https:\/\/[a-z0-9-]+\.mytenantdemo\.site$/i.test(origin);

    if (productionTenantOrigin) {
        return true;
    }

    return false;
};


// =====================================================
// EXPRESS CORS
// =====================================================

app.use(
    cors({
        origin: (origin, callback) => {

            console.log("Request Origin:", origin);

            if (isAllowedOrigin(origin)) {
                return callback(null, true);
            }

            console.log("CORS BLOCKED:", origin);

            return callback(
                new Error(`Not allowed by CORS: ${origin}`)
            );
        },

        credentials: true,

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
        ]
    })
);


// =====================================================
// JSON
// =====================================================

app.use(express.json());


// =====================================================
// SOCKET.IO
// =====================================================

const io = new Server(server, {

    cors: {
        origin: (origin, callback) => {

            console.log("Socket Origin:", origin);

            if (isAllowedOrigin(origin)) {
                return callback(null, true);
            }

            console.log(
                "Socket CORS BLOCKED:",
                origin
            );

            return callback(
                new Error(
                    `Not allowed by Socket.IO CORS: ${origin}`
                )
            );
        },

        methods: [
            "GET",
            "POST"
        ],

        credentials: true
    }
});


// Make Socket.IO available to controllers
app.set("io", io);


// =====================================================
// SOCKET CONNECTION
// =====================================================

io.on("connection", (socket) => {

    console.log(
        "Socket connected:",
        socket.id
    );


    // Provider appointment room
    socket.on(
        "join_provider_room",
        ({ tenantId, providerId }) => {

            if (!tenantId || !providerId) {
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


    // Disconnect
    socket.on("disconnect", () => {

        console.log(
            "Socket disconnected:",
            socket.id
        );
    });
});


// =====================================================
// ROOT API
// =====================================================

app.get("/", (req, res) => {

    res.json({
        message: "Multi-Tenant API is running"
    });
});


// =====================================================
// API ROUTES
// =====================================================

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
    "/api/appointments",
    appointmentRoutes
);

app.use(
    "/api/roles",
    roleRoutes
);


// =====================================================
// ERROR HANDLER
// =====================================================

app.use((error, req, res, next) => {

    console.error(
        "Server Error:",
        error
    );

    if (
        error.message &&
        error.message.includes("CORS")
    ) {
        return res.status(403).json({
            message: error.message
        });
    }

    return res.status(
        error.statusCode || 500
    ).json({
        message:
            error.message ||
            "Internal server error"
    });
});


// =====================================================
// SERVER
// =====================================================

const PORT =
    process.env.PORT || 5000;

server.listen(PORT, () => {

    console.log(
        `Server running on http://localhost:${PORT}`
    );

});