import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

// Store database connections
const tenantPools = new Map();

// Create or return existing tenant connection
export const getTenantDatabase = (databaseName) => {
    // Check if connection already exists
    if (tenantPools.has(databaseName)) {
        return tenantPools.get(databaseName);
    }

    // Create new connection pool
    const pool = new Pool({
        host: process.env.PG_HOST,
        port: process.env.PG_PORT,
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        database: databaseName,
        max: 10,
        idleTimeoutMillis: 30000
    });

    // Store connection
    tenantPools.set(databaseName, pool);

    console.log(`Tenant connection created: ${databaseName}`);

    return pool;
};