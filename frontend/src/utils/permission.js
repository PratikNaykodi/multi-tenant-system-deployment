export const hasPermission = (user, permission) => {
    if (!user) {
        return false;
    }

    if (!Array.isArray(user.permissions)) {
        return false;
    }

    return user.permissions.includes(
        permission
    );
};