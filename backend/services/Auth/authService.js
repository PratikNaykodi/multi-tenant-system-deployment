import { findUserByEmail, findUserById } from "../../repositories/User/userRepository.js";
import { comparePassword, hashPassword } from "../../utils/password.js";
import { createToken } from "../../utils/jwt.js";
import { getPermissionNames } from "../authorizationService.js";

export async function loginUser(db, tenant, email, password) {
    const user = await findUserByEmail(db, String(email || "").trim().toLowerCase());

    if (!user || !(await comparePassword(password, user.password))) {
        throw Object.assign(new Error("Invalid email or password"), { statusCode: 401 });
    }
    const permissions = getPermissionNames(user);

    const token = createToken({
        userId: user.id,
        id: user.id,
        tenantId: tenant.identifier,
        roleId: user.roleId,
        role: user.role.name,
        permissions,
    });
    
    return {
        message: "Login successful",
        token,
        user: {
            id: user.id, name: user.name, email: user.email,
            role_id: user.roleId, role: user.role.name, permissions,
            provider: user.provider || null, patient: user.patient || null,
        },
        tenant: { id: tenant.id, name: tenant.name, identifier: tenant.identifier },
    };
}

export async function getCurrentUser(db, userId) {
    if (!userId) throw Object.assign(new Error("Invalid authentication token"), { statusCode: 401 });

    const user = await findUserById(db, userId);

    if (!user) return null;

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.roleId,
        role: user.role?.name || null,
        permissions: getPermissionNames(user),
        provider: user.provider || null,
        patient: user.patient || null,
    };
}

export async function registerUser(db, input) {
    const name = String(input.name || "").trim();
    const email = String(input.email || "").trim().toLowerCase();

    if (!name || !email || !input.password) {
        throw Object.assign(new Error("name, email and password are required"), { statusCode: 400 });
    }

    if (await findUserByEmail(db, email)) {
        throw Object.assign(new Error("Email already registered"), { statusCode: 409 });
    }

    const roleId = Number(input.role_id || 4);
    if (!await db.role.findUnique({ where: { id: roleId } })) {
        throw Object.assign(new Error("Invalid role_id"), { statusCode: 400 });
    }

    return db.user.create({
        data: { name, email, password: await hashPassword(input.password), roleId },
        include: { role: true },
    });
}
