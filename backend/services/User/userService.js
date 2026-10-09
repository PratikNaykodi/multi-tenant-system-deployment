import * as repo from "../../repositories/User/userRepository.js";
import { hashPassword } from "../../utils/password.js";

const badRequest = (message) => Object.assign(new Error(message), { statusCode: 400 });
const conflict = (message) => Object.assign(new Error(message), { statusCode: 409 });

export const getUsers = (db) => repo.listUsers(db);

export async function getUser(db, id) {
    const user = await repo.findUserById(db, id);
    if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404 });
    return user;
}

export async function createNewUser(db, input) {
    const name = String(input.name || "").trim();
    const email = String(input.email || "").trim().toLowerCase();
    const roleId = Number(input.role_id);
    
    if (!name || !email || !input.password || !roleId) {
        throw badRequest("Name, email, password and role are required.");
    }
    
    // Validate role-specific data BEFORE creating the user, avoiding orphan users.
    if (roleId === 3 && !String(input.specialization || "").trim()) {
        throw badRequest("Specialization is required for a provider.");
    }
    if (roleId === 4 && (!input.date_of_birth || !input.gender || !input.patient_phone)) {
        throw badRequest("Date of birth, gender and patient phone are required for a patient.");
    }
    
    const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw conflict("This email address is already registered. Please use a different email address.");
    
    try {
        return await db.$transaction(async (tx) => {
            const user = await repo.createUser(tx, {
                name,
                email,
                password: await hashPassword(input.password),
                roleId,
            });
            
            if (roleId === 3) {
                await tx.provider.create({
                    data: {
                        userId: user.id,
                        specialization: String(input.specialization).trim(),
                        experienceYears: Number(input.experience_years || 0),
                        phone: String(input.provider_phone || "").trim() || null,
                    },
                });
            }
            
            if (roleId === 4) {
                await tx.patient.create({
                    data: {
                        userId: user.id,
                        dateOfBirth: input.date_of_birth ? new Date(input.date_of_birth) : null,
                        gender: String(input.gender || "").trim() || null,
                        phone: String(input.patient_phone || "").trim() || null,
                        address: String(input.address || "").trim() || null,
                    },
                });
            }
            
            return repo.findUserById(tx, user.id);
        });
    } catch (error) {
        if (error?.code === "P2002") {
            throw conflict("This email address is already registered. Please use a different email address.");
        }
        throw error;
    }
}

export async function updateExistingUser(db, id, input) {
    const old = await getUser(db, id);
    const roleId = Number(input.role_id || input.roleId || old.roleId);
    const email = input.email === undefined ? undefined : String(input.email).trim().toLowerCase();
    
    if (email) {
        const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
        if (existing && existing.id !== Number(id)) {
            throw conflict("This email address is already registered by another user.");
        }
    }
    
    if (roleId === 3 && !String(input.specialization ?? old.provider?.specialization ?? "").trim()) {
        throw badRequest("Specialization is required for a provider.");
    }
    
    const data = {
        ...(input.name !== undefined && { name: String(input.name).trim() }),
        ...(email !== undefined && { email }),
        roleId,
    };
    if (input.password) data.password = await hashPassword(input.password);
    
    try {
        await db.$transaction(async (tx) => {
            await repo.updateUser(tx, id, data);
            
            if (roleId === 3) {
                await tx.provider.upsert({
                    where: { userId: Number(id) },
                    update: {
                        specialization: String(input.specialization ?? old.provider?.specialization ?? "").trim(),
                        experienceYears: Number(input.experience_years ?? old.provider?.experienceYears ?? 0),
                        phone: String(input.provider_phone ?? old.provider?.phone ?? "").trim() || null,
                    },
                    create: {
                        userId: Number(id),
                        specialization: String(input.specialization ?? old.provider?.specialization ?? "").trim(),
                        experienceYears: Number(input.experience_years ?? old.provider?.experienceYears ?? 0),
                        phone: String(input.provider_phone ?? old.provider?.phone ?? "").trim() || null,
                    },
                });
            }
            
            if (roleId === 4) {
                await tx.patient.upsert({
                    where: { userId: Number(id) },
                    update: {
                        ...(input.date_of_birth !== undefined && { dateOfBirth: input.date_of_birth ? new Date(input.date_of_birth) : null }),
                        ...(input.gender !== undefined && { gender: input.gender || null }),
                        ...(input.patient_phone !== undefined && { phone: input.patient_phone || null }),
                        ...(input.address !== undefined && { address: input.address || null }),
                    },
                    create: {
                        userId: Number(id),
                        dateOfBirth: input.date_of_birth ? new Date(input.date_of_birth) : null,
                        gender: input.gender || null,
                        phone: input.patient_phone || null,
                        address: input.address || null,
                    },
                });
            }
        });
    } catch (error) {
        if (error?.code === "P2002") {
            throw conflict("This email address is already registered by another user.");
        }
        throw error;
    }
    
    return repo.findUserById(db, id);
}

export async function removeUser(db, id) {
    await getUser(db, id);
    await repo.deleteUser(db, id);
    return { message: "User deleted successfully" };
}

export const findUserByEmail = (db, email) => db.user.findUnique({
    where: { email },
    include: { role: { include: { permissions: { include: { permission: true } } } }, provider: true, patient: true },
});
