export const getRoles = async (req, res) => {
    try {
        // ------------------------------------------
        // Get logged-in user's role
        // ------------------------------------------
        const userRoleResult =
            await req.tenantDb.query(
                `
                SELECT name
                FROM roles
                WHERE id = $1
                `,
                [req.user.role_id]
            );

        const currentUserRole = userRoleResult.rows[0]?.name;

        console.log( "Logged-in user role:", currentUserRole );

        // ------------------------------------------
        // Get roles for dropdown
        // ------------------------------------------
        let query = `
            SELECT
                id,
                name
            FROM roles
        `;

        // ------------------------------------------
        // Manager can create/manage only
        // Provider + Patient
        // ------------------------------------------
        if ( currentUserRole === "manager" ) {
            query += `
                WHERE name IN (
                    'provider',
                    'patient'
                )
            `;
        }

        // ------------------------------------------
        // Order roles
        // ------------------------------------------
        query += `
            ORDER BY id
        `;

        const result =
            await req.tenantDb.query(
                query
            );

        return res.json({
            roles: result.rows
        });
    } catch (error) {
        console.error("Get roles error:", error );

        return res.status(500).json({
            message: "Error getting roles",
            error: error.message
        });
    }
};