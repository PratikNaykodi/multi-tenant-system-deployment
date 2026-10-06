import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],

    server: {
        host: true,
        port: 5173,

        allowedHosts: [
            "pqr.local",
            "xyz.local",
            "abc.local",
            "bb.local",
            "pratik.local",
            "saurabh",
            "priyanka"
        ]
    }
});