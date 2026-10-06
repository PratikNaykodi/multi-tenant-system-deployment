import bcrypt from "bcrypt";
import { encrypt, decrypt } from "../services/encryptionService.js";

// ==================================================
// HELPER: GET ROLE
// ==================================================
const getRoleById = async (
    db,
    roleId
) => {
    const result = await db.query(
        `
        SELECT
            id,
            name
        FROM roles
        WHERE id = $1
        `,
        [roleId]
    );

    return result.rows[0] || null;
};


// ==================================================
// HELPER: CHECK MANAGER ROLE ACCESS
// ==================================================
//
// Manager can manage only:
//
// provider
// patient
//
// Manager cannot manage:
//
// admin
// manager
//
// ==================================================

const validateManagerRoleAccess = (
    currentUser,
    targetRole
) => {

    if ( currentUser.role !== "manager" ) {
        return true;
    }

    return ( targetRole === "provider" || targetRole === "patient" );
};

// ==================================================
// GET CURRENT USER
// ==================================================
export const getCurrentUser = async (
    req,
    res
) => {
    try {
        const result =
            await req.tenantDb.query(
                `
                SELECT
                    u.id,
                    u.name,
                    u.email,
                    u.role_id,
                    r.name AS role,
                    u.created_at

                FROM users u

                LEFT JOIN roles r
                    ON r.id = u.role_id

                WHERE u.id = $1
                `,
                [req.user.id]
            );

        if (result.rows.length === 0) {

            return res.status(404).json({
                message: "User not found"
            });
        }

        const user = result.rows[0];

        // ------------------------------------------
        // Provider profile
        // ------------------------------------------
        if ( user.role === "provider" ) {
            const providerResult =
                await req.tenantDb.query(
                    `
                    SELECT
                        id,
                        user_id,
                        specialization,
                        experience_years,
                        phone,
                        phone_iv,
                        phone_auth_tag,
                        created_at

                    FROM providers

                    WHERE user_id = $1
                    `,
                    [user.id]
                );

            if ( providerResult.rows.length > 0 ) {
                const provider = providerResult.rows[0];

                provider.phone =
                    decrypt(
                        provider.phone,
                        provider.phone_iv,
                        provider.phone_auth_tag
                    );

                delete provider.phone_iv;
                delete provider.phone_auth_tag;

                user.provider = provider;
            } else {
                user.provider = null;
            }
        } else {
            user.provider = null;
        }

        // ------------------------------------------
        // Patient profile
        // ------------------------------------------
        if ( user.role === "patient" ) {
            const patientResult =
                await req.tenantDb.query(
                    `
                    SELECT
                        id,
                        user_id,
                        date_of_birth,
                        gender,
                        phone,
                        phone_iv,
                        phone_auth_tag,
                        address,
                        created_at

                    FROM patients

                    WHERE user_id = $1
                    `,
                    [user.id]
                );

            if ( patientResult.rows.length > 0 ) {
                const patient = patientResult.rows[0];

                patient.phone =
                    decrypt(
                        patient.phone,
                        patient.phone_iv,
                        patient.phone_auth_tag
                    );

                delete patient.phone_iv;
                delete patient.phone_auth_tag;

                user.patient = patient;
            } else {
                user.patient = null;
            }
        } else {
            user.patient = null;
        }

        return res.json({
            user
        });

    } catch (error) {
        console.error( "Get current user error:", error );

        return res.status(500).json({
            message: "Error getting current user",
            error: error.message
        });
    }
};

// ==================================================
// GET ALL USERS
// ==================================================
//
// Admin: sees all users
//
// Manager: sees Provider + Patient only
//
// Provider / Patient: blocked by permission middleware
//
// Pagination:
// page  = current page number
// limit = number of users per page
//
// ==================================================
export const getUsers = async (req, res) => {
    try {
        // ------------------------------------------
        // Pagination
        // ------------------------------------------
        // Get page number from the request.
        // Example: /api/users?page=2
        //
        // If page is not provided, use page 1.
        const page = Math.max(
            Number(req.query.page) || 1,
            1
        );

        // Get number of users per page.
        // Default is 10 users.
        //
        // Maximum is 100 to prevent a client from
        // requesting too many records at once.
        const limit = Math.min(
            Number(req.query.limit) || 10,
            100
        );

        // Calculate how many records should be skipped.
        //
        // Example:
        // Page 1 -> offset 0
        // Page 2 -> offset 10
        // Page 3 -> offset 20
        const offset = (page - 1) * limit;

        // ------------------------------------------
        // Base User Query
        // ------------------------------------------

        // Get users with their role information.
        //
        // We use LEFT JOIN because a user can still be
        // returned even if role_id is NULL.
        let query = `
            SELECT
                u.id,
                u.name,
                u.email,
                u.role_id,
                r.name AS role,
                u.created_at
            FROM users u
            LEFT JOIN roles r
                ON r.id = u.role_id
        `;

        // Parameters used by the SQL query.
        const params = [];

        // ------------------------------------------
        // Get Logged-In User Role
        // ------------------------------------------

        // Get the role name of the currently logged-in user.
        // We need this because Manager has restricted access.
        const roleResult = await req.tenantDb.query(
            `
            SELECT name
            FROM roles
            WHERE id = $1
            `,
            [req.user.role_id]
        );

        const currentUserRole =
            roleResult.rows[0]?.name;

        // ------------------------------------------
        // Manager Access Restriction
        // ------------------------------------------

        // Manager can only see Provider and Patient users.
        //
        // Admin does not have this restriction and can see
        // all users.
        if (currentUserRole === "manager") {
            query += `
                WHERE r.name IN (
                    'provider',
                    'patient'
                )
            `;
        }

        // ------------------------------------------
        // Get Total User Count
        // ------------------------------------------

        // We need the total number of users to calculate
        // how many pages are available.
        //
        // The same Manager filter must be applied here,
        // otherwise the pagination count will be incorrect.
        let countQuery = `
            SELECT COUNT(*) AS total
            FROM users u
            LEFT JOIN roles r
                ON r.id = u.role_id
        `;

        // Parameters for the count query.
        const countParams = [];

        // Apply the same Manager restriction to COUNT.
        if (currentUserRole === "manager") {
            countQuery += `
                WHERE r.name IN (
                    'provider',
                    'patient'
                )
            `;
        }

        // Execute the total count query.
        const countResult =
            await req.tenantDb.query(
                countQuery,
                countParams
            );

        // PostgreSQL COUNT returns a string,
        // so convert it into a JavaScript number.
        const totalUsers = Number(countResult.rows[0].total);

        // ------------------------------------------
        // Pagination Query
        // ------------------------------------------

        // Sort users by ID in descending order
        // so the newest users appear first.
        //
        // LIMIT controls how many users are returned.
        // OFFSET controls how many users are skipped.
        query += `
            ORDER BY u.id DESC
            LIMIT $1
            OFFSET $2
        `;

        // Add pagination values to the query parameters.
        params.push(
            limit,
            offset
        );

        // Execute the paginated user query.
        const result =
            await req.tenantDb.query(
                query,
                params
            );

        // Store the users returned for the current page.
        const users = result.rows;

        // ------------------------------------------
        // Get Provider Profiles
        // ------------------------------------------

        // Get provider profiles so they can be attached
        // to the corresponding users.
        const providerResult =
            await req.tenantDb.query(
                `
                SELECT
                    p.id,
                    p.user_id,
                    p.specialization,
                    p.experience_years,
                    p.phone,
                    p.phone_iv,
                    p.phone_auth_tag
                FROM providers p
                `
            );

        // Create a Map for quick provider lookup.
        //
        // Key   = user_id
        // Value = provider profile
        const providerMap = new Map();

        providerResult.rows.forEach(
            provider => {
                // Decrypt the phone before sending it
                // to the frontend.
                provider.phone =
                    decrypt(
                        provider.phone,
                        provider.phone_iv,
                        provider.phone_auth_tag
                    );

                // Do not expose encryption information
                // to the frontend.
                delete provider.phone_iv;
                delete provider.phone_auth_tag;

                // Store provider using user_id as the key.
                providerMap.set(
                    provider.user_id,
                    provider
                );
            }
        );

        // ------------------------------------------
        // Get Patient Profiles
        // ------------------------------------------

        // Get patient profiles so they can be attached
        // to the corresponding users.
        const patientResult =
            await req.tenantDb.query(
                `
                SELECT
                    p.id,
                    p.user_id,
                    p.date_of_birth,
                    p.gender,
                    p.phone,
                    p.phone_iv,
                    p.phone_auth_tag,
                    p.address
                FROM patients p
                `
            );

        // Create a Map for quick patient lookup.
        //
        // Key   = user_id
        // Value = patient profile
        const patientMap = new Map();

        patientResult.rows.forEach(
            patient => {
                // Decrypt the phone before sending it
                // to the frontend.
                patient.phone =
                    decrypt(
                        patient.phone,
                        patient.phone_iv,
                        patient.phone_auth_tag
                    );

                // Do not expose encryption information
                // to the frontend.
                delete patient.phone_iv;
                delete patient.phone_auth_tag;

                // Store patient using user_id as the key.
                patientMap.set(
                    patient.user_id,
                    patient
                );
            }
        );

        // ------------------------------------------
        // Attach Profiles
        // ------------------------------------------

        // Add provider and patient profile information
        // to each user returned on the current page.
        const finalUsers =
            users.map(user => {
                return {
                    ...user,

                    provider:
                        providerMap.get(
                            user.id
                        ) || null,

                    patient:
                        patientMap.get(
                            user.id
                        ) || null
                };
            });

        // ------------------------------------------
        // Calculate Total Pages
        // ------------------------------------------

        // Example:
        //
        // totalUsers = 25
        // limit = 10
        //
        // totalPages = 3
        const totalPages = Math.ceil(  totalUsers / limit );

        // ------------------------------------------
        // Response
        // ------------------------------------------

        // Return users for the current page
        // along with pagination information.
        return res.json({
            users: finalUsers,
            pagination: {
                page,
                limit,
                total: totalUsers,
                totalPages
            }
        });

    } catch (error) {
        // Log the error for backend debugging.
        console.error( "Get users error:", error );

        // Return a server error response.
        return res.status(500).json({
            message: "Error getting users",

            error: error.message
        });
    }
};

// ==================================================
// GET SINGLE USER
// ==================================================
export const getUser = async (
    req,
    res
) => {
    try {
        const { id } = req.params;

        const result =
            await req.tenantDb.query(
                `
                SELECT
                    u.id,
                    u.name,
                    u.email,
                    u.role_id,
                    r.name AS role,
                    u.created_at

                FROM users u

                LEFT JOIN roles r
                    ON r.id = u.role_id

                WHERE u.id = $1
                `,
                [id]
            );

        if ( result.rows.length === 0 ) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const user = result.rows[0];

        // ------------------------------------------
        // Manager can only access Provider/Patient
        // ------------------------------------------
        if (
            req.user.role === "manager" &&
            !validateManagerRoleAccess(
                req.user,
                user.role
            )
        ) {
            return res.status(403).json({
                message: "Manager can only access provider and patient users"
            });
        }

        // ------------------------------------------
        // Provider profile
        // ------------------------------------------
        const providerResult =
            await req.tenantDb.query(
                `
                SELECT
                    id,
                    user_id,
                    specialization,
                    experience_years,
                    phone,
                    phone_iv,
                    phone_auth_tag

                FROM providers
                WHERE user_id = $1
                `,
                [user.id]
            );

        let provider = null;

        if ( providerResult.rows.length > 0 ) {

            provider = providerResult.rows[0];

            provider.phone =
                decrypt(
                    provider.phone,
                    provider.phone_iv,
                    provider.phone_auth_tag
                );
            delete provider.phone_iv;
            delete provider.phone_auth_tag;
        }

        // ------------------------------------------
        // Patient profile
        // ------------------------------------------
        const patientResult =
            await req.tenantDb.query(
                `
                SELECT
                    id,
                    user_id,
                    date_of_birth,
                    gender,
                    phone,
                    phone_iv,
                    phone_auth_tag,
                    address

                FROM patients

                WHERE user_id = $1
                `,
                [user.id]
            );

        let patient = null;

        if ( patientResult.rows.length > 0 ) {
            patient = patientResult.rows[0];

            patient.phone =
                decrypt(
                    patient.phone,
                    patient.phone_iv,
                    patient.phone_auth_tag
                );

            delete patient.phone_iv;
            delete patient.phone_auth_tag;
        }

        return res.json({
            user: {
                ...user,
                provider,
                patient
            }
        });

    } catch (error) {
        console.error( "Get user error:", error );

        return res.status(500).json({
            message: "Error getting user",
            error: error.message
        });
    }
};

// ==================================================
// CREATE USER
// ==================================================
export const createUser = async (
    req,
    res
) => {
    const client = await req.tenantDb.connect();

    try {
        const {
            name,
            email,
            password,
            role_id,

            // Provider fields
            specialization,
            experience_years,
            provider_phone,

            // Patient fields
            date_of_birth,
            gender,
            patient_phone,
            address
        } = req.body;

        // ------------------------------------------
        // Validation
        // ------------------------------------------
        if (
            !name ||
            !email ||
            !password ||
            !role_id
        ) {
            return res.status(400).json({
                message: "name, email, password and role_id are required"
            });
        }

        const role =
            await getRoleById(
                req.tenantDb,
                role_id
            );

        if (!role) {
            return res.status(400).json({
                message: "Invalid role"
            });

        }

        // ------------------------------------------
        // Manager role restriction
        // ------------------------------------------
        if (
            !validateManagerRoleAccess(
                req.user,
                role.name
            )
        ) {
            return res.status(403).json({
                message:
                    "Manager can create only provider and patient users"
            });

        }

        // ------------------------------------------
        // Check duplicate email
        // ------------------------------------------
        const existingUser =
            await req.tenantDb.query(
                `
                SELECT id
                FROM users
                WHERE LOWER(email) = LOWER($1)
                `,
                [email.trim()]
            );

        if ( existingUser.rows.length > 0 ) {
            return res.status(409).json({
                message: "User with this email already exists"
            });
        }

        // ------------------------------------------
        // Provider validation
        // ------------------------------------------
        if ( role.name === "provider" ) {
            if ( !specialization ) {
                return res.status(400).json({
                    message: "specialization is required for provider"
                });
            }
        }

        // ------------------------------------------
        // Patient validation
        // ------------------------------------------
        if ( role.name === "patient" ) {
            if (
                !date_of_birth ||
                !gender
            ) {
                return res.status(400).json({
                    message: "date_of_birth and gender are required for patient"
                });
            }
        }

        // ------------------------------------------
        // Hash password
        // ------------------------------------------
        const hashedPassword =
            await bcrypt.hash(
                password,
                10
            );

        await client.query("BEGIN");

        // ------------------------------------------
        // Create user
        // ------------------------------------------
        const userResult =
            await client.query(
                `
                INSERT INTO users (
                    name,
                    email,
                    password,
                    role_id
                )

                VALUES (
                    $1,
                    $2,
                    $3,
                    $4
                )

                RETURNING
                    id,
                    name,
                    email,
                    role_id,
                    created_at
                `,
                [
                    name.trim(),
                    email.trim(),
                    hashedPassword,
                    role_id
                ]
            );


        const user = userResult.rows[0];

        // ------------------------------------------
        // Create Provider profile
        // ------------------------------------------
        if ( role.name === "provider" ) {
            const encryptedPhone =
                encrypt(
                    provider_phone
                );


            await client.query(
                `
                INSERT INTO providers (
                    user_id,
                    specialization,
                    experience_years,
                    phone,
                    phone_iv,
                    phone_auth_tag
                )

                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6
                )
                `,
                [
                    user.id,
                    specialization.trim(),
                    experience_years || 0,
                    encryptedPhone?.encrypted || null,
                    encryptedPhone?.iv || null,
                    encryptedPhone?.authTag || null
                ]
            );

        }

        // ------------------------------------------
        // Create Patient profile
        // ------------------------------------------
        if ( role.name === "patient" ) {
            const encryptedPhone =
                encrypt(
                    patient_phone
                );

            await client.query(
                `
                INSERT INTO patients (
                    user_id,
                    date_of_birth,
                    gender,
                    phone,
                    phone_iv,
                    phone_auth_tag,
                    address
                )

                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7
                )
                `,
                [
                    user.id,
                    date_of_birth || null,
                    gender || null,
                    encryptedPhone?.encrypted || null,
                    encryptedPhone?.iv || null,
                    encryptedPhone?.authTag || null,
                    address || null
                ]
            );

        }

        await client.query("COMMIT");

        return res.status(201).json({
            message: "User created successfully",
            user: {
                ...user,
                role: role.name
            }
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error( "Create user error:", error );

        return res.status(500).json({
            message: "Error creating user",
            error: error.message
        });
    } finally {
        client.release();
    }
};

// ==================================================
// UPDATE USER
// ==================================================
export const updateUser = async (
    req,
    res
) => {
    const client = await req.tenantDb.connect();

    try {
        const { id } = req.params;

        const {
            name,
            email,
            password,
            role_id,

            // Provider
            specialization,
            experience_years,
            provider_phone,

            // Patient
            date_of_birth,
            gender,
            patient_phone,
            address
        } = req.body;

        await client.query("BEGIN");

        // ------------------------------------------
        // Get existing user
        // ------------------------------------------
        const existingResult =
            await client.query(
                `
                SELECT
                    u.id,
                    u.name,
                    u.email,
                    u.role_id,
                    r.name AS role

                FROM users u

                INNER JOIN roles r
                    ON r.id = u.role_id

                WHERE u.id = $1
                `,
                [id]
            );
        
            // ------------------------------------------
            // Lock user row
            // ------------------------------------------
            await client.query(
                `
                SELECT id
                FROM users
                WHERE id = $1
                FOR UPDATE
                `,
                [id]
            );

        if (existingResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "User not found"
            });
        }

        const existing = existingResult.rows[0];

        // ------------------------------------------
        // Manager cannot update Admin/Manager
        // ------------------------------------------
        if (
            req.user.role === "manager" &&
            !validateManagerRoleAccess(
                req.user,
                existing.role
            )
        ) {

            await client.query("ROLLBACK");

            return res.status(403).json({
                message: "Manager can update only provider and patient users"
            });
        }

        // ------------------------------------------
        // Manager cannot change Provider/Patient
        // to Admin/Manager
        // ------------------------------------------
        let finalRoleId = role_id || existing.role_id;

        const finalRole =
            await getRoleById(
                client,
                finalRoleId
            );

        if (!finalRole) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                message: "Invalid role"
            });
        }

        if (
            !validateManagerRoleAccess(
                req.user,
                finalRole.name
            )
        ) {
            await client.query("ROLLBACK");

            return res.status(403).json({
                message: "Manager can manage only provider and patient users"
            });
        }

        // ------------------------------------------
        // Manager cannot change another user
        // to admin/manager
        // ------------------------------------------
        if (
            req.user.role === "manager" &&
            (
                finalRole.name === "admin" ||
                finalRole.name === "manager"
            )
        ) {

            await client.query("ROLLBACK");
            return res.status(403).json({
                message: "Manager cannot assign admin or manager role"
            });
        }

        // ------------------------------------------
        // Check duplicate email
        // ------------------------------------------
        if (email) {
            const duplicateResult =
                await client.query(
                    `
                    SELECT id
                    FROM users

                    WHERE LOWER(email) =
                        LOWER($1)

                    AND id != $2
                    `,
                    [
                        email.trim(),
                        id
                    ]
                );

            if ( duplicateResult.rows.length > 0 ) {
                await client.query("ROLLBACK");
                return res.status(409).json({
                    message: "User with this email already exists"
                });
            }
        }

        // ------------------------------------------
        // Update basic user
        // ------------------------------------------
        let updateQuery = `
            UPDATE users
            SET
                name = $1,
                email = $2,
                role_id = $3
        `;

        const updateParams = [
            name?.trim() || existing.name,
            email?.trim() || existing.email,
            finalRoleId
        ];

        if (password) {
            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );

            updateQuery += `,
                password = $4
            `;
            updateParams.push(
                hashedPassword
            );

        }

        updateQuery += `
            WHERE id = $${updateParams.length + 1}
            RETURNING
                id,
                name,
                email,
                role_id,
                created_at
        `;

        updateParams.push(id);

        const userResult =
            await client.query(
                updateQuery,
                updateParams
            );

        const updatedUser = userResult.rows[0];

        // ==================================================
        // ROLE CHANGED
        // ==================================================
        if ( existing.role !== finalRole.name ) {
            // ----------------------------------------------
            // Provider -> Patient/Admin/Manager
            // ----------------------------------------------
            if ( existing.role === "provider" ) {
                await client.query(
                    `
                    DELETE FROM providers
                    WHERE user_id = $1
                    `,
                    [id]
                );

            }

            // ----------------------------------------------
            // Patient -> Provider/Admin/Manager
            // ----------------------------------------------
            if ( existing.role === "patient" ) {
                await client.query(
                    `
                    DELETE FROM patients
                    WHERE user_id = $1
                    `,
                    [id]
                );
            }

            // ----------------------------------------------
            // New Provider profile
            // ----------------------------------------------
            if ( finalRole.name === "provider" ) {
                if ( !specialization ) {
                    await client.query("ROLLBACK");
                    return res.status(400).json({
                        message: "specialization is required for provider"
                    });
                }

                const encryptedPhone =
                    encrypt(
                        provider_phone
                    );

                await client.query(
                    `
                    INSERT INTO providers (
                        user_id,
                        specialization,
                        experience_years,
                        phone,
                        phone_iv,
                        phone_auth_tag
                    )

                    VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6
                    )
                    `,
                    [
                        id,
                        specialization.trim(),
                        experience_years || 0,
                        encryptedPhone?.encrypted || null,
                        encryptedPhone?.iv || null,
                        encryptedPhone?.authTag || null
                    ]
                );

            }

            // ----------------------------------------------
            // New Patient profile
            // ----------------------------------------------
            if ( finalRole.name === "patient" ) {

                if ( !date_of_birth || !gender ) {
                    await client.query("ROLLBACK");

                    return res.status(400).json({
                        message: "date_of_birth and gender are required for patient"
                    });
                }

                const encryptedPhone =
                    encrypt(
                        patient_phone
                    );

                await client.query(
                    `
                    INSERT INTO patients (
                        user_id,
                        date_of_birth,
                        gender,
                        phone,
                        phone_iv,
                        phone_auth_tag,
                        address
                    )

                    VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7
                    )
                    `,
                    [
                        id,
                        date_of_birth,
                        gender,
                        encryptedPhone?.encrypted || null,
                        encryptedPhone?.iv || null,
                        encryptedPhone?.authTag || null,
                        address || null
                    ]
                );
            }
        }

        // ==================================================
        // SAME ROLE: UPDATE PROFILE
        // ==================================================
        else {
            // ----------------------------------------------
            // Provider
            // ----------------------------------------------
            if ( finalRole.name === "provider" ) {

                const existingProvider =
                    await client.query(
                        `
                        SELECT
                            id,
                            phone,
                            phone_iv,
                            phone_auth_tag

                        FROM providers

                        WHERE user_id = $1
                        `,
                        [id]
                    );

                if ( existingProvider.rows.length === 0 ) {
                    if ( !specialization ) {
                        await client.query("ROLLBACK");

                        return res.status(400).json({
                            message: "specialization is required for provider"
                        });
                    }

                    const encryptedPhone =
                        encrypt(
                            provider_phone
                        );

                    await client.query(
                        `
                        INSERT INTO providers (
                            user_id,
                            specialization,
                            experience_years,
                            phone,
                            phone_iv,
                            phone_auth_tag
                        )

                        VALUES (
                            $1,
                            $2,
                            $3,
                            $4,
                            $5,
                            $6
                        )
                        `,
                        [
                            id,
                            specialization.trim(),
                            experience_years || 0,
                            encryptedPhone?.encrypted || null,
                            encryptedPhone?.iv || null,
                            encryptedPhone?.authTag || null
                        ]
                    );
                } else {
                    const provider = existingProvider.rows[0];

                    let phoneData = {
                        encrypted: provider.phone,
                        iv: provider.phone_iv,
                        authTag: provider.phone_auth_tag
                    };

                    if (
                        provider_phone !== undefined &&
                        provider_phone !== ""
                    ) {
                        phoneData =
                            encrypt(
                                provider_phone
                            );
                    }

                    await client.query(
                        `
                        UPDATE providers

                        SET
                            specialization = $1,
                            experience_years = $2,
                            phone = $3,
                            phone_iv = $4,
                            phone_auth_tag = $5

                        WHERE user_id = $6
                        `,
                        [
                            specialization || null,
                            experience_years || 0,
                            phoneData?.encrypted || null,
                            phoneData?.iv || null,
                            phoneData?.authTag || null,
                            id
                        ]
                    );
                }
            }

            // ----------------------------------------------
            // Patient
            // ----------------------------------------------
            if ( finalRole.name === "patient" ) {

                const existingPatient =
                    await client.query(
                        `
                        SELECT
                            id,
                            phone,
                            phone_iv,
                            phone_auth_tag

                        FROM patients

                        WHERE user_id = $1
                        `,
                        [id]
                    );

                if ( existingPatient.rows.length === 0 ) {

                    const encryptedPhone =
                        encrypt(
                            patient_phone
                        );

                    await client.query(
                        `
                        INSERT INTO patients (
                            user_id,
                            date_of_birth,
                            gender,
                            phone,
                            phone_iv,
                            phone_auth_tag,
                            address
                        )

                        VALUES (
                            $1,
                            $2,
                            $3,
                            $4,
                            $5,
                            $6,
                            $7
                        )
                        `,
                        [
                            id,
                            date_of_birth || null,
                            gender || null,
                            encryptedPhone?.encrypted || null,
                            encryptedPhone?.iv || null,
                            encryptedPhone?.authTag || null,
                            address || null
                        ]
                    );
                } else {
                    const patient = existingPatient.rows[0];

                    let phoneData = {
                        encrypted: patient.phone,
                        iv: patient.phone_iv,
                        authTag: patient.phone_auth_tag
                    };

                    if (
                        patient_phone !== undefined &&
                        patient_phone !== ""
                    ) {
                        phoneData =
                            encrypt(
                                patient_phone
                            );
                    }

                    await client.query(
                        `
                        UPDATE patients

                        SET
                            date_of_birth = $1,
                            gender = $2,
                            phone = $3,
                            phone_iv = $4,
                            phone_auth_tag = $5,
                            address = $6

                        WHERE user_id = $7
                        `,
                        [
                            date_of_birth || null,
                            gender || null,
                            phoneData?.encrypted || null,
                            phoneData?.iv || null,
                            phoneData?.authTag || null,
                            address || null,
                            id
                        ]
                    );
                }
            }
        }

        await client.query("COMMIT");

        return res.json({
            message: "User updated successfully",
            user: {
                ...updatedUser,
                role: finalRole.name
            }
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error( "Update user error:", error );

        return res.status(500).json({
            message: "Error updating user",
            error: error.message
        });
    } finally {
        client.release();
    }
};


// ==================================================
// DELETE USER
// ==================================================

export const deleteUser = async (
    req,
    res
) => {

    try {
        const { id } = req.params;

        // ------------------------------------------
        // Get target user
        // ------------------------------------------
        const targetResult =
            await req.tenantDb.query(
                `
                SELECT
                    u.id,
                    u.role_id,
                    r.name AS role

                FROM users u

                LEFT JOIN roles r
                    ON r.id = u.role_id

                WHERE u.id = $1
                `,
                [id]
            );

        if ( targetResult.rows.length === 0 ) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const target = targetResult.rows[0];

        // ------------------------------------------
        // Manager restriction
        // ------------------------------------------
        if ( req.user.role === "manager" &&
            !validateManagerRoleAccess(
                req.user,
                target.role
            )
        ) {
            return res.status(403).json({
                message: "Manager can delete only provider and patient users"
            });
        }

        // ------------------------------------------
        // Prevent user deleting themselves
        // ------------------------------------------
        if (
            Number(id) ===
            Number(req.user.id)
        ) {
            return res.status(400).json({
                message: "You cannot delete your own account"
            });

        }

        // ------------------------------------------
        // Delete user
        //
        // ON DELETE CASCADE will delete:
        //
        // providers
        // patients
        // ------------------------------------------
        const result =
            await req.tenantDb.query(
                `
                DELETE FROM users

                WHERE id = $1

                RETURNING id
                `,
                [id]
            );

        if ( result.rows.length === 0 ) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.json({
            message: "User deleted successfully"
        });
    } catch (error) {
        console.error( "Delete user error:", error );

        return res.status(500).json({
            message: "Error deleting user",
            error: error.message
        });
    }
};