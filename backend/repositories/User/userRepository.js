export const findUserByEmail = (db, email) =>
    db.user.findUnique({
        where: { email },
        include: {
            role: { include: { permissions: { include: { permission: true } } } },
            provider: true,
            patient: true,
        },
    });
    
export const findUserById = (db, id) =>
    db.user.findUnique({
        where: { id: Number(id) },
        include: {
            role: { include: { permissions: { include: { permission: true } } } },
            provider: true,
            patient: true,
        },
    });

export const listUsers = (db) =>
    db.user.findMany({
        orderBy: { id: "desc" },
        include: { role: true, provider: true, patient: true },
    });

export const createUser = (db, data) =>
    db.user.create({
        data,
        include: {
            role: { include: { permissions: { include: { permission: true } } } },
        },
    });

export const updateUser = (db, id, data) =>
    db.user.update({
        where: { id: Number(id) },
        data,
        include: { role: true, provider: true, patient: true },
    });

export const deleteUser = (db, id) =>
    db.user.delete({ where: { id: Number(id) } });
