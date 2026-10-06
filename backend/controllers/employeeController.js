import { encrypt, decrypt } from "../services/encryptionService.js";

// --------------------------------------------------
// Create Employee
// --------------------------------------------------
export const createEmployee = async (req, res) => {
    try {
        const {
            name,
            email,
            department,
            salary,
            phone
        } = req.body;

        // Validate input
        if (
            !name ||
            !email ||
            !department ||
            salary === undefined
        ) {
            return res.status(400).json({
                message:
                    "name, email, department and salary are required"
            });
        }

        // Check duplicate email
        const existingEmployee = await req.tenantDb.query(
            `
            SELECT id
            FROM employees
            WHERE email = $1
            `,
            [email]
        );

        if (existingEmployee.rows.length > 0) {
            return res.status(409).json({
                message: "Employee email already exists"
            });
        }

        const encryptedPhone = encrypt(phone);
        // Create employee
        const result = await req.tenantDb.query(
            `
            INSERT INTO employees
            (
                name,
                email,
                department,
                salary,
                phone,
                phone_iv,
                phone_auth_tag
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING
                id,
                name,
                email,
                department,
                salary,
                created_at
            `,
            [
                name,
                email,
                department,
                salary,
                encryptedPhone?.encrypted,
                encryptedPhone?.iv,
                encryptedPhone?.authTag
            ]
        );

        return res.status(201).json({
            message: "Employee created successfully",
            employee: result.rows[0]
        });
    } catch (error) {
        console.error("Create employee error:", error);

        return res.status(500).json({
            message: "Error creating employee",
            error: error.message
        });
    }
};

// --------------------------------------------------
// Get All Employees
// --------------------------------------------------
export const getEmployees = async (req, res) => {
    try {
        const result = await req.tenantDb.query(
            `
            SELECT
                id,
                name,
                email,
                department,
                salary,
                phone,
                phone_iv,
                phone_auth_tag,
                created_at
            FROM employees
            ORDER BY id ASC
            `
        );

        const employees = result.rows.map((employee) => {
            return {
                id: employee.id,
                name: employee.name,
                email: employee.email,
                department: employee.department,
                salary: employee.salary,
                phone: decrypt(
                    employee.phone,
                    employee.phone_iv,
                    employee.phone_auth_tag
                ),
                created_at: employee.created_at
            };
        });

        return res.json({
            employees: employees
        });
    } catch (error) {
        console.error("Get employees error:", error);

        return res.status(500).json({
            message: "Error fetching employees",
            error: error.message
        });
    }
};

// Get Employee By ID
export const getEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await req.tenantDb.query(
            `
            SELECT
                id,
                name,
                email,
                department,
                salary,
                phone,
                phone_iv,
                phone_auth_tag,
                created_at
            FROM employees
            WHERE id = $1
            `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Employee not found"
            });
        }

        const employee = result.rows[0];
        return res.json({
            employee: {
                id: employee.id,
                name: employee.name,
                email: employee.email,
                department: employee.department,
                salary: employee.salary,
                phone: decrypt(
                    employee.phone,
                    employee.phone_iv,
                    employee.phone_auth_tag
                ),
                created_at: employee.created_at
            }
        });
    } catch (error) {
        console.error("Get employee error:", error);

        return res.status(500).json({
            message: "Error fetching employee",
            error: error.message
        });
    }
};

// Update Employee
export const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            email,
            department,
            salary,
            phone
        } = req.body;

        if (
            !name ||
            !email ||
            !department ||
            salary === undefined
        ) {
            return res.status(400).json({
                message: "name, email, department and salary are required"
            });
        }

        // Check duplicate email
        const existingEmployee =
            await req.tenantDb.query(
                `
                SELECT id
                FROM employees
                WHERE email = $1
                AND id != $2
                `,
                [
                    email,
                    id
                ]
            );

        if (
            existingEmployee.rows.length > 0
        ) {
            return res.status(409).json({
                message: "Employee email already exists"
            });
        }

        /*
         * Encrypt phone only when
         * phone value is supplied.
         */
        let phoneData = null;

        if (phone !== undefined) {
            if (phone === null || phone === "") {
                phoneData = {
                    encrypted: null,
                    iv: null,
                    authTag: null
                };

            } else {
                const encryptedPhone = encrypt(phone);
                phoneData = { 
                    encrypted: encryptedPhone.encrypted,
                    iv: encryptedPhone.iv,
                    authTag: encryptedPhone.authTag
                };
            }
        }

        let result;

        if (phone !== undefined) {
            result = await req.tenantDb.query(
                `
                UPDATE employees
                SET
                    name = $1,
                    email = $2,
                    department = $3,
                    salary = $4,
                    phone = $5,
                    phone_iv = $6,
                    phone_auth_tag = $7
                WHERE id = $8
                RETURNING
                    id,
                    name,
                    email,
                    department,
                    salary,
                    created_at
                `,
                [
                    name,
                    email,
                    department,
                    salary,
                    phoneData.encrypted,
                    phoneData.iv,
                    phoneData.authTag,
                    id
                ]
            );

        } else {
            /*
             * If phone is not supplied,
             * keep existing encrypted phone.
             */
            result = await req.tenantDb.query(
                `
                UPDATE employees
                SET
                    name = $1,
                    email = $2,
                    department = $3,
                    salary = $4
                WHERE id = $5
                RETURNING
                    id,
                    name,
                    email,
                    department,
                    salary,
                    created_at
                `,
                [
                    name,
                    email,
                    department,
                    salary,
                    id
                ]
            );
        }

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Employee not found"
            });
        }

        return res.json({
            message: "Employee updated successfully",
            employee: result.rows[0]
        });
    } catch (error) {
        console.error("Update employee error:", error);

        return res.status(500).json({
            message: "Error updating employee",
            error: error.message
        });
    }
};

// --------------------------------------------------
// Delete Employee
// --------------------------------------------------
export const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await req.tenantDb.query(
            `
            DELETE FROM employees
            WHERE id = $1
            RETURNING id
            `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Employee not found"
            });
        }

        return res.json({
            message: "Employee deleted successfully"
        });
    } catch (error) {
        console.error("Delete employee error:", error);

        return res.status(500).json({
            message: "Error deleting employee",
            error: error.message
        });
    }
};