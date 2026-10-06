import prisma from "../config/centralDatabase.js";
import { createTenantDatabase, createTenantTables } from "../services/databaseService.js";
import bcrypt from "bcrypt";

export const createTenant = async (req, res) => {
    try {
        const {
            name,
            domain
        } = req.body;

        // Step 1: Validate input
        if (!name || !domain) {
            return res.status(400).json({
                message: "name and domain are required"
            });
        }

        // Step 2: Generate identifier from domain
        let identifier = domain.toLowerCase()
                                .trim()
                                .replace(/^https?:\/\//, "")
                                .split(".")[0]
                                .replace(/[^a-z0-9_]/g, "");

        if (!identifier) {
            return res.status(400).json({
                message: "Invalid domain"
            });
        }

        // Step 3: Check domain
        const existingDomain =
            await prisma.tenant.findUnique({
                where: {
                    domain: domain
                }
            });

        if (existingDomain) {
            return res.status(409).json({
                message:
                    "Domain already exists"
            });
        }

        // Step 4: Check identifier
        const existingIdentifier =
            await prisma.tenant.findUnique({
                where: {
                    identifier: identifier
                }
            });

        if (existingIdentifier) {
            return res.status(409).json({
                message: "Tenant identifier already exists"
            });
        }

        // Step 5: Generate database name
        const databaseName = `tenant_${identifier}`;

        // Step 6: Create PostgreSQL database
        await createTenantDatabase(databaseName);

        // Step 7: Create tenant tables
        await createTenantTables(databaseName);

        // Step 8: Generate demo admin credentials
        const adminEmail = `admin@${identifier}.com`;
        const adminPassword = `${identifier}@123`;

        // Step 9: Hash password
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Step 10: Connect to tenant database
        const pg = await import("pg");
        const { Client } = pg.default;
        const client =
            new Client({
                host: process.env.PG_HOST,
                port: process.env.PG_PORT,
                user: process.env.PG_USER,
                password: process.env.PG_PASSWORD,
                database: databaseName
            });

        await client.connect();

        try {
            // Find admin role
            const roleResult =
                await client.query(
                    `
                    SELECT id
                    FROM roles
                    WHERE name = 'admin'
                    `
                );

            if (roleResult.rows.length === 0) {
                throw new Error(
                    "Admin role not found"
                );
            }

            const adminRoleId = roleResult.rows[0].id;

            // Create admin user
            await client.query(
                `
                INSERT INTO users
                (
                    name,
                    email,
                    password,
                    role_id
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4
                )
                `,
                [
                    `${name} Admin`,
                    adminEmail,
                    hashedPassword,
                    adminRoleId
                ]
            );
        } finally {
            await client.end();
        }

        // Step 11: Save tenant in central DB
        const tenant = await prisma.tenant.create({
                data: {
                    name: name.trim(),
                    domain: domain.trim(),
                    identifier: identifier,
                    databaseName: databaseName
                }
            });

        // Step 12: Response
        return res.status(201).json({
            message: "Tenant created successfully",
            tenant: {
                id: tenant.id,
                name: tenant.name,
                domain: tenant.domain,
                identifier: tenant.identifier,
                databaseName: tenant.databaseName
            },
            admin: {
                username: adminEmail,
                password: adminPassword
            }
        });
    } catch (error) {
        console.error("Create tenant error:", error);

        return res.status(500).json({
            message: "Error creating tenant",
            error: error.message
        });
    }
};

export const getTenants = async (req, res) => {
    try {
        const tenants = await prisma.tenant.findMany({
            orderBy: {
                id: "asc"
            }
        });

        return res.json({
            tenants: tenants
        });
    } catch (error) {
        console.error("Get tenants error:", error);
        return res.status(500).json({
            message: "Error fetching tenants",
            error: error.message
        });
    }
};