import "dotenv/config";
import pg from "pg";

const { Client } = pg;

// --------------------------------------------------
// Create Tenant Database
// --------------------------------------------------
export const createTenantDatabase = async (databaseName) => {
    // Validate database name
    if (!/^[a-z0-9_]+$/.test(databaseName)) {
        throw new Error("Invalid database name");
    }

    const client = new Client({
        host: process.env.PG_HOST,
        port: process.env.PG_PORT,
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        database: "postgres"
    });

    try {
        await client.connect();

        // --------------------------------------------
        // Check database already exists
        // --------------------------------------------
        const result = await client.query(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            [databaseName]
        );

        if (result.rows.length > 0) {
            throw new Error(
                `Database '${databaseName}' already exists`
            );
        }

        // --------------------------------------------
        // Create database
        // --------------------------------------------
        await client.query(
            `CREATE DATABASE "${databaseName}"`
        );

        console.log(`Database '${databaseName}' created successfully`);

    } finally {
        await client.end();
    }
};

// --------------------------------------------------
// Create Tenant Tables
// --------------------------------------------------
export const createTenantTables = async (databaseName) => {
    const client = new Client({
        host: process.env.PG_HOST,
        port: process.env.PG_PORT,
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        database: databaseName
    });

    try {
        await client.connect();
        console.log(
            `Connected to tenant database: ${databaseName}`
        );

        // =====================================================
        // USERS
        // =====================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                email VARCHAR(255)
                    UNIQUE NOT NULL,
                password VARCHAR(255)
                    NOT NULL,
                role_id INT,
                created_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP
            );
        `);


        // =====================================================
        // EMPLOYEES
        // =====================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS employees (
                id SERIAL PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                email VARCHAR(255)
                    UNIQUE NOT NULL,
                department VARCHAR(100)
                    NOT NULL,
                salary NUMERIC(12, 2)
                    NOT NULL,
                phone TEXT,
                phone_iv TEXT,
                phone_auth_tag TEXT,
                created_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP
            );
        `);


        // =====================================================
        // ROLES
        // =====================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50)
                    UNIQUE NOT NULL,
                created_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP
            );
        `);


        // =====================================================
        // PERMISSIONS
        // =====================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS permissions (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100)
                    UNIQUE NOT NULL,
                created_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP
            );
        `);


        // =====================================================
        // ROLE PERMISSIONS
        // =====================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                role_id INT NOT NULL,
                permission_id INT NOT NULL,
                PRIMARY KEY (
                    role_id,
                    permission_id
                ),
                FOREIGN KEY (role_id)
                    REFERENCES roles(id)
                    ON DELETE CASCADE,
                FOREIGN KEY (permission_id)
                    REFERENCES permissions(id)
                    ON DELETE CASCADE
            );
        `);


        // =====================================================
        // PROVIDERS
        // =====================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS providers (
                id SERIAL PRIMARY KEY,
                user_id INT UNIQUE NOT NULL,
                specialization VARCHAR(150)
                    NOT NULL,
                experience_years INT
                    DEFAULT 0,
                phone TEXT,
                phone_iv TEXT,
                phone_auth_tag TEXT,
                created_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE
            );
        `);


        // =====================================================
        // PATIENTS
        // =====================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS patients (
                id SERIAL PRIMARY KEY,
                user_id INT UNIQUE NOT NULL,
                date_of_birth DATE,
                gender VARCHAR(20),
                phone TEXT,
                phone_iv TEXT,
                phone_auth_tag TEXT,
                address TEXT,
                created_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE
            );
        `);


        // =====================================================
        // APPOINTMENTS
        // =====================================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS appointments (
                id SERIAL PRIMARY KEY,
                provider_id INT NOT NULL,
                patient_id INT NOT NULL,
                appointment_date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                status VARCHAR(30)
                    DEFAULT 'scheduled',
                reason TEXT,
                created_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (provider_id)
                    REFERENCES providers(id)
                    ON DELETE CASCADE,
                FOREIGN KEY (patient_id)
                    REFERENCES patients(id)
                    ON DELETE CASCADE,
                CONSTRAINT appointment_time_check
                    CHECK (
                        end_time > start_time
                    )
            );
        `);


        // =====================================================
        // APPOINTMENT INDEXES
        // =====================================================
        await client.query(`
            CREATE INDEX IF NOT EXISTS
            idx_appointments_provider_date
            ON appointments (
                provider_id,
                appointment_date
            );
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS
            idx_appointments_patient_date
            ON appointments (
                patient_id,
                appointment_date
            );
        `);

        // =====================================================
        // USERS → ROLES FOREIGN KEY
        // =====================================================

        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname =
                        'users_role_id_fkey'
                )
                THEN
                    ALTER TABLE users
                    ADD CONSTRAINT
                        users_role_id_fkey
                    FOREIGN KEY (role_id)
                    REFERENCES roles(id)
                    ON DELETE SET NULL;
                END IF;
            END
            $$;
        `);

        // =====================================================
        // SEED ROLES
        // =====================================================
        await client.query(`
            INSERT INTO roles (name)
            VALUES
                ('admin'),
                ('manager'),
                ('provider'),
                ('patient')

            ON CONFLICT (name)
            DO NOTHING;
        `);

        // =====================================================
        // SEED PERMISSIONS
        // =====================================================
        await client.query(`
            INSERT INTO permissions (name)
            VALUES

                -- User permissions
                ('user.create'),
                ('user.read'),
                ('user.update'),
                ('user.delete'),

                -- Provider permissions
                ('provider.create'),
                ('provider.read'),
                ('provider.update'),
                ('provider.delete'),

                -- Patient permissions
                ('patient.create'),
                ('patient.read'),
                ('patient.update'),
                ('patient.delete'),

                -- Appointment permissions
                ('appointment.create'),
                ('appointment.read'),
                ('appointment.update'),
                ('appointment.delete')

            ON CONFLICT (name)
            DO NOTHING;
        `);

        // =====================================================
        // ADMIN PERMISSIONS
        // =====================================================
        await client.query(`
            INSERT INTO role_permissions (
                role_id,
                permission_id
            )
            SELECT
                r.id,
                p.id
            FROM roles r
            CROSS JOIN permissions p
            WHERE r.name = 'admin'
            ON CONFLICT DO NOTHING;
        `);

        // =====================================================
        // MANAGER PERMISSIONS
        // =====================================================
        await client.query(`
            INSERT INTO role_permissions (
                role_id,
                permission_id
            )
            SELECT
                r.id,
                p.id
            FROM roles r
            JOIN permissions p
                ON p.name IN (
                    'user.create',
                    'user.read',
                    'user.update',
                    'user.delete',
                    'provider.create',
                    'provider.read',
                    'provider.update',

                    'patient.create',
                    'patient.read',
                    'patient.update',

                    'appointment.create',
                    'appointment.read',
                    'appointment.update',
                    'appointment.delete'
                )
            WHERE r.name = 'manager'
            ON CONFLICT DO NOTHING;
        `);

        // =====================================================
        // PROVIDER PERMISSIONS
        // =====================================================
        await client.query(`
            INSERT INTO role_permissions (
                role_id,
                permission_id
            )
            SELECT
                r.id,
                p.id
            FROM roles r
            JOIN permissions p
                ON p.name IN (
                    'provider.read',
                    'provider.update',
                    'patient.read',
                    'appointment.create',
                    'appointment.read',
                    'appointment.update'
                )
            WHERE r.name = 'provider'
            ON CONFLICT DO NOTHING;
        `);

        // =====================================================
        // PATIENT PERMISSIONS
        // =====================================================
        await client.query(`
            INSERT INTO role_permissions (
                role_id,
                permission_id
            )
            SELECT
                r.id,
                p.id
            FROM roles r
            JOIN permissions p
                ON p.name IN (
                    'provider.read',

                    'patient.read',
                    'patient.update',

                    'appointment.create',
                    'appointment.read',
                    'appointment.update'
                )
            WHERE r.name = 'patient'
            ON CONFLICT DO NOTHING;
        `);

        console.log(
            `Tenant tables, roles and permissions created successfully in ${databaseName}`
        );
    } finally {
        await client.end();
    }
};