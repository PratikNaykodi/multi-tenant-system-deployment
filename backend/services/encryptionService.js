import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

const ENCRYPTION_KEY = Buffer.from(
    process.env.ENCRYPTION_KEY,
    "hex"
);

export const encrypt = (text) => {

    if (!text) {
        return null;
    }

    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(
        ALGORITHM,
        ENCRYPTION_KEY,
        iv
    );

    let encrypted = cipher.update(
        text,
        "utf8",
        "hex"
    );

    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return {
        encrypted,
        iv: iv.toString("hex"),
        authTag: authTag.toString("hex")
    };
};

export const decrypt = (
    encrypted,
    iv,
    authTag
) => {
    if (!encrypted || !iv || !authTag) {
        return null;
    }

    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        ENCRYPTION_KEY,
        Buffer.from(iv, "hex")
    );

    decipher.setAuthTag(
        Buffer.from(authTag, "hex")
    );

    let decrypted = decipher.update(
        encrypted,
        "hex",
        "utf8"
    );

    decrypted += decipher.final("utf8");

    return decrypted;
};