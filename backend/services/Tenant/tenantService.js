import pg from "pg";
import bcrypt from "bcryptjs";
import { getCentralPrisma, getTenantPrisma } from "../../config/prisma.js";
import { buildTenantConnectionString } from "../../config/tenantDatabase.js";

const { Client } = pg;

function idOf(v) {
    return String(v || "")
        .trim()
        .toLowerCase()
        .replace(/\.local$/i, "")
        .replace(/\.mytenantdemo\.site$/i, "")
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

async function createDatabase(name) {
    const c = new Client({
        host: process.env.PG_HOST,
        port: process.env.PG_PORT,
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        database: process.env.PG_ADMIN_DATABASE || "postgres",
    });

    await c.connect();

    try {
        const x = await c.query("SELECT 1 FROM pg_database WHERE datname=$1", [
            name,
        ]);

        if (!x.rows.length) await c.query(`CREATE DATABASE "${name}"`);

    } finally {
        await c.end();
    }

}
async function provision(db) {
    await db.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS roles(id SERIAL PRIMARY KEY,name TEXT NOT NULL UNIQUE);
        CREATE TABLE IF NOT EXISTS permissions(id SERIAL PRIMARY KEY,name TEXT NOT NULL UNIQUE);
        CREATE TABLE IF NOT EXISTS users(id SERIAL PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password TEXT NOT NULL,role_id INTEGER NOT NULL REFERENCES roles(id),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
        CREATE TABLE IF NOT EXISTS role_permissions(role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,PRIMARY KEY(role_id,permission_id));
        CREATE TABLE IF NOT EXISTS providers(id SERIAL PRIMARY KEY,user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,specialization TEXT NOT NULL,experience_years INTEGER NOT NULL DEFAULT 0,phone TEXT,phone_iv TEXT,phone_auth_tag TEXT);
        CREATE TABLE IF NOT EXISTS patients(id SERIAL PRIMARY KEY,user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,date_of_birth DATE,gender TEXT,phone TEXT,phone_iv TEXT,phone_auth_tag TEXT,address TEXT);
        CREATE TABLE IF NOT EXISTS appointments(id SERIAL PRIMARY KEY,provider_id INTEGER NOT NULL REFERENCES providers(id),patient_id INTEGER NOT NULL REFERENCES patients(id),appointment_date DATE NOT NULL,start_time TIME NOT NULL,end_time TIME NOT NULL,status TEXT NOT NULL DEFAULT 'scheduled',reason TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
        CREATE INDEX IF NOT EXISTS appointments_provider_date_idx ON appointments(provider_id,appointment_date);`,
    );

    for (const name of ["admin", "manager", "provider", "patient"])
        await db.role.upsert({ where: { name }, update: {}, create: { name } });

    for (const r of ["user", "provider", "patient", "appointment"])
        for (const a of ["create", "read", "update", "delete"])
            await db.permission.upsert({
                where: { name: `${r}.${a}` },
                update: {},
                create: { name: `${r}.${a}` },
            });

    const roles = await db.role.findMany(),
    perms = await db.permission.findMany();

    const map = {
        admin: perms.map((x) => x.id),
        manager: perms
        .filter((x) =>
                [
                "user.read",
                "provider.read",
                "patient.read",
                "appointment.create",
                "appointment.read",
                "appointment.update",
                "appointment.delete",
            ].includes(x.name),
        )
        .map((x) => x.id),
        provider: perms
        .filter((x) =>
            [
                "provider.read",
                "patient.read",
                "appointment.create",
                "appointment.read",
                "appointment.update",
            ].includes(x.name),
        )
        .map((x) => x.id),
        patient: perms
        .filter((x) =>
                [
                "provider.read",
                "patient.read",
                "appointment.create",
                "appointment.read",
                "appointment.update",
            ].includes(x.name),
        )
        .map((x) => x.id),
    };
    for (const role of roles)
        for (const permissionId of map[role.name] || [])
            await db.rolePermission.upsert({
                where: { roleId_permissionId: { roleId: role.id, permissionId } },
                update: {},
                create: { roleId: role.id, permissionId },
            });
}

export async function createTenant(input) {
    const name = String(input.name || "").trim(),
    identifier = idOf(input.identifier || input.domain);

    if (!name || !identifier)
        throw Object.assign(new Error("name and domain/identifier are required"), {
            statusCode: 400,
        });

    const central = getCentralPrisma();

    if (
        await central.tenant.findFirst({
            where: { OR: [{ identifier }, { domain: input.domain }] },
        })
    )
        throw Object.assign(new Error("Tenant already exists"), {
            statusCode: 409,
        });

    const databaseName = `tenant_${identifier}`;

    await createDatabase(databaseName);

    const db = getTenantPrisma(buildTenantConnectionString(databaseName));

    await provision(db);

    const role = await db.role.findUnique({ where: { name: "admin" } });

    const email = input.adminEmail || `admin@${identifier}.com`,
    password = input.adminPassword || `${identifier}@123`;

    await db.user.create({
        data: {
            name: "Admin",
            email,
            password: await bcrypt.hash(password, 10),
            roleId: role.id,
        },
    });

    const tenant = await central.tenant.create({
        data: {
            name,
            domain: input.domain || `${identifier}.local`,
            identifier,
            databaseName,
        },
    });
    
    return {
        message: "Tenant created successfully",
        tenant,
        admin: { username: email, password },
    };
}
