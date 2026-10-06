import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// --------------------------------------------------
// Register User
// --------------------------------------------------
export const registerUser = async (req, res) => {
    try {
        const { name, email, password, role_id } = req.body;

        // ---------------------------------------------
        // Validate required fields
        // ---------------------------------------------
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "name, email and password are required"
            });
        }

        // ---------------------------------------------
        // Validate role_id
        // ---------------------------------------------
        if (role_id !== undefined && role_id !== null) {
            if (!Number.isInteger(Number(role_id))) {
                return res.status(400).json({
                    message: "role_id must be a valid number"
                });
            }
        }

        // ---------------------------------------------
        // Check duplicate email
        // ---------------------------------------------
        const existingUser = await req.tenantDb.query(
            `
            SELECT id
            FROM users
            WHERE email = $1
            `,
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        // ---------------------------------------------
        // Get role
        // ---------------------------------------------
        let role;

        if (role_id !== undefined && role_id !== null) {
            const roleResult = await req.tenantDb.query(
                `
                SELECT
                    id,
                    name
                FROM roles
                WHERE id = $1
                `,
                [Number(role_id)]
            );

            // -----------------------------------------
            // Role does not exist
            // -----------------------------------------
            if (roleResult.rows.length === 0) {
                return res.status(400).json({
                    message: "Invalid role_id"
                });
            }

            role = roleResult.rows[0];
        } else {
            // -----------------------------------------
            // Default role = user
            // -----------------------------------------
            const defaultRole = await req.tenantDb.query(
                `
                SELECT
                    id,
                    name
                FROM roles
                WHERE name = 'user'
                `
            );

            if (defaultRole.rows.length === 0) {
                return res.status(500).json({
                    message: "Default user role not configured"
                });
            }

            role = defaultRole.rows[0];
        }

        // ---------------------------------------------
        // Hash password
        // ---------------------------------------------
        const hashedPassword = await bcrypt.hash(
            password,
            10
        );

        // ---------------------------------------------
        // Create user
        // ---------------------------------------------
        const result = await req.tenantDb.query(
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
            RETURNING
                id,
                name,
                email,
                role_id
            `,
            [
                name,
                email,
                hashedPassword,
                role.id
            ]
        );

        const user = result.rows[0];

        // ---------------------------------------------
        // Response
        // ---------------------------------------------
        return res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role_id: user.role_id,
                role: role.name
            },
            tenant: {
                id: req.tenant.id,
                name: req.tenant.name,
                identifier: req.tenant.identifier
            }
        });

    } catch (error) {
        console.error("Register user error:", error);

        return res.status(500).json({
            message: "Error registering user",
            error: error.message
        });
    }
};

// --------------------------------------------------
// Login User
// --------------------------------------------------
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // ---------------------------------------------
        // Validate input
        // ---------------------------------------------
        if (!email || !password) {
            return res.status(400).json({
                message: "email and password are required"
            });
        }

        // ---------------------------------------------
        // Find user
        // ---------------------------------------------
        const result = await req.tenantDb.query(
            `
            SELECT
                u.id,
                u.name,
                u.email,
                u.password,
                u.role_id,
                r.name AS role
            FROM users u
            LEFT JOIN roles r
                ON r.id = u.role_id
            WHERE u.email = $1
            `,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = result.rows[0];

        // ---------------------------------------------
        // Verify password
        // ---------------------------------------------
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // ---------------------------------------------
        // Create JWT
        // ---------------------------------------------
        const token = jwt.sign(
            {
                userId: user.id,
                tenantId: req.tenant.identifier,
                roleId: user.role_id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        const permissionResult =
            await req.tenantDb.query(
                `
                SELECT p.name
                FROM role_permissions rp

                INNER JOIN permissions p
                    ON p.id = rp.permission_id

                WHERE rp.role_id = $1
                `,
                [user.role_id]
            );

        const permissions =
            permissionResult.rows.map(
                (permission) => permission.name
            );

        // ---------------------------------------------
        // Response
        // ---------------------------------------------
        return res.json({
            message: "Login successful",
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role_id: user.role_id,
                role: user.role,
                permissions: permissions
            },
            tenant: {
                id: req.tenant.id,
                name: req.tenant.name,
                identifier: req.tenant.identifier
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            message: "Login failed",
            error: error.message
        });
    }
};